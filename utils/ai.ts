
import { Player, Wall, PowerUp, Bullet, Direction, AIBehaviorState } from '../types';
import { getDistance, checkLineRectCollide, checkAABB } from './gamePhysics';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TANK_CLASSES } from '../constants';

// --- 常量配置 ---
const GRID_SIZE = 40;
const COL_COUNT = Math.ceil(CANVAS_WIDTH / GRID_SIZE);
const ROW_COUNT = Math.ceil(CANVAS_HEIGHT / GRID_SIZE);
const PATH_RECALC_INTERVAL = 30; // 追击时路径更新频率更高
const REPU_FORCE_DIST = 80;      // AI 坦克间排斥力距离
const CHASE_RANGE = 700;         // 普通追击范围
const FIRE_RANGE = 500;          // 开火范围：进入此范围 AI 尝试攻击
const STUCK_THRESHOLD_FRAMES = 120; // 120 帧静止判定为卡住

const BULLET_THREAT_SCAN_DIST = 650;
const BULLET_THREAT_LOOKAHEAD_FRAMES = 34;
const BULLET_EVADE_TRIGGER_FRAMES = 16;
const BULLET_MICRO_DODGE_FRAMES = 32;
const EVASION_DISTANCE = 210;

const ITEM_CHECK_INTERVAL_FRAMES = 90;
const ITEM_DESIRE_DURATION_FRAMES = 240;
const ITEM_INTEREST_RANGE = 520;

const LOCAL_AVOID_SAMPLE_DIST = 90;
const LOCAL_AVOID_TRIGGER_CLEARANCE = 20;
const LOCAL_AVOID_MIN_CLEARANCE = 12;

const FIRE_SLOT_DISTANCE = 320;
const FIRE_SLOT_REEVAL_FRAMES = 40;
const FIRE_HIT_TOLERANCE_PAD = 3;

type Vec2 = { x: number; y: number };
type Rect = { x: number; y: number; width: number; height: number };
type BulletThreat = {
    bullet: Bullet;
    frames: number;
    kind: 'impact' | 'near';
    closestDist: number;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const normalize = (v: Vec2): Vec2 => {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len < 1e-6) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
};

const centerOfRect = (r: Rect): Vec2 => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

const dirToUnitVector = (dir: Direction): Vec2 => {
    const a = dir * (Math.PI / 4);
    return { x: Math.sin(a), y: -Math.cos(a) };
};

const hasLineOfSight = (ax: number, ay: number, bx: number, by: number, walls: Wall[]): boolean => {
    return !walls.some(w => checkLineRectCollide(ax, ay, bx, by, w.x, w.y, w.width, w.height));
};

const getNearestVisibleEnemy = (bot: Player, enemies: Player[], walls: Wall[], maxRange: number): Player | null => {
    const bx = bot.x + bot.width / 2;
    const by = bot.y + bot.height / 2;

    let best: Player | null = null;
    let bestDist = Infinity;

    for (const e of enemies) {
        if (e.hp <= 0) continue;
        const ex = e.x + e.width / 2;
        const ey = e.y + e.height / 2;
        const d = getDistance(bx, by, ex, ey);
        if (d >= bestDist || d > maxRange) continue;
        if (!hasLineOfSight(bx, by, ex, ey, walls)) continue;
        best = e;
        bestDist = d;
    }

    return best;
};

const pointToRectDistance = (p: Vec2, r: Rect): number => {
    const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.width));
    const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.height));
    return Math.hypot(dx, dy);
};

const expandedWallRect = (w: Wall, expandX: number, expandY: number): Rect => ({
    x: w.x - expandX,
    y: w.y - expandY,
    width: w.width + expandX * 2,
    height: w.height + expandY * 2,
});

const inExpandedBounds = (p: Vec2, expandX: number, expandY: number): boolean => {
    return p.x >= expandX && p.x <= CANVAS_WIDTH - expandX && p.y >= expandY && p.y <= CANVAS_HEIGHT - expandY;
};

const isPointBlockedByWalls = (p: Vec2, walls: Wall[], expandX: number, expandY: number): boolean => {
    for (const w of walls) {
        const r = expandedWallRect(w, expandX, expandY);
        if (p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height) return true;
    }
    return false;
};

const linePointDistance = (p: Vec2, lineOrigin: Vec2, lineDir: Vec2): number => {
    const v = { x: p.x - lineOrigin.x, y: p.y - lineOrigin.y };
    const denom = Math.sqrt(lineDir.x * lineDir.x + lineDir.y * lineDir.y);
    if (denom < 1e-6) return Math.hypot(v.x, v.y);
    return Math.abs(lineDir.x * v.y - lineDir.y * v.x) / denom;
};

const predictMostDangerousBullet = (bot: Player, bullets: Bullet[], walls: Wall[]): BulletThreat | null => {
    const botRect: Rect = { x: bot.x, y: bot.y, width: bot.width, height: bot.height };
    const botCenter = centerOfRect(botRect);

    const safetyMargin = Math.max(10, Math.min(bot.width, bot.height) * 0.2);
    const expandedBot: Rect = { x: bot.x - safetyMargin, y: bot.y - safetyMargin, width: bot.width + safetyMargin * 2, height: bot.height + safetyMargin * 2 };

    const expandX = bot.width / 2 + 10;
    const expandY = bot.height / 2 + 10;

    let best: BulletThreat | null = null;

    for (const b of bullets) {
        if (b.team === bot.team) continue;

        const bRect: Rect = { x: b.x, y: b.y, width: b.width, height: b.height };
        const bCenter = centerOfRect(bRect);

        const dx0 = botCenter.x - bCenter.x;
        const dy0 = botCenter.y - bCenter.y;
        const dist0 = Math.hypot(dx0, dy0);
        if (dist0 > BULLET_THREAT_SCAN_DIST) continue;

        const vlen2 = b.vx * b.vx + b.vy * b.vy;
        if (vlen2 < 1e-6) continue;

        const dot = dx0 * b.vx + dy0 * b.vy;
        if (dot <= 0) continue;

        const tClosest = clamp(dot / vlen2, 0, BULLET_THREAT_LOOKAHEAD_FRAMES);
        const bt = Math.floor(tClosest);

        const dangerRadius = (Math.hypot(bot.width, bot.height) + Math.hypot(b.width, b.height)) / 2 + safetyMargin;

        const botPred = { x: botCenter.x + (bot.vx || 0) * tClosest, y: botCenter.y + (bot.vy || 0) * tClosest };
        const bulletPred = { x: bCenter.x + b.vx * tClosest, y: bCenter.y + b.vy * tClosest };
        const closestDist = Math.hypot(botPred.x - bulletPred.x, botPred.y - bulletPred.y);

        const nearMiss = closestDist <= dangerRadius;
        let impactFrames: number | null = null;

        // Confirm AABB collision around closest approach (cheap, small window)
        if (nearMiss) {
            for (let t = Math.max(0, bt - 3); t <= Math.min(BULLET_THREAT_LOOKAHEAD_FRAMES, bt + 3); t++) {
                const predBot: Rect = {
                    x: expandedBot.x + (bot.vx || 0) * t,
                    y: expandedBot.y + (bot.vy || 0) * t,
                    width: expandedBot.width,
                    height: expandedBot.height,
                };
                const predBullet: Rect = { x: b.x + b.vx * t, y: b.y + b.vy * t, width: b.width, height: b.height };
                if (checkAABB(predBot, predBullet)) {
                    impactFrames = t;
                    break;
                }
            }
        }

        if (!nearMiss && impactFrames === null) continue;

        // Ignore threats whose closest/impact point is inside walls (bullet would likely be blocked soon)
        const checkPoint = impactFrames !== null
            ? { x: bCenter.x + b.vx * impactFrames, y: bCenter.y + b.vy * impactFrames }
            : bulletPred;
        if (!inExpandedBounds(checkPoint, expandX, expandY) || isPointBlockedByWalls(checkPoint, walls, expandX, expandY)) {
            continue;
        }

        const frames = impactFrames !== null ? impactFrames : Math.max(0, Math.round(tClosest));
        const candidate: BulletThreat = { bullet: b, frames, kind: impactFrames !== null ? 'impact' : 'near', closestDist };

        if (!best) best = candidate;
        else if (candidate.frames < best.frames) best = candidate;
        else if (candidate.frames === best.frames && candidate.closestDist < best.closestDist) best = candidate;
    }

    return best;
};

const chooseEvasionTarget = (bot: Player, threat: BulletThreat, walls: Wall[], fallbackTarget: Vec2 | null): Vec2 => {
    const botCenter = { x: bot.x + bot.width / 2, y: bot.y + bot.height / 2 };
    const bulletCenter = { x: threat.bullet.x + threat.bullet.width / 2, y: threat.bullet.y + threat.bullet.height / 2 };
    const bulletVel = normalize({ x: threat.bullet.vx, y: threat.bullet.vy });

    const expandX = bot.width / 2 + 10;
    const expandY = bot.height / 2 + 10;

    const away = normalize({ x: botCenter.x - bulletCenter.x, y: botCenter.y - bulletCenter.y });
    const perpA = normalize({ x: -bulletVel.y, y: bulletVel.x });
    const perpB = normalize({ x: bulletVel.y, y: -bulletVel.x });
    const back = normalize({ x: -bulletVel.x, y: -bulletVel.y });

    const candidates: Vec2[] = [
        { x: botCenter.x + perpA.x * EVASION_DISTANCE, y: botCenter.y + perpA.y * EVASION_DISTANCE },
        { x: botCenter.x + perpB.x * EVASION_DISTANCE, y: botCenter.y + perpB.y * EVASION_DISTANCE },
        { x: botCenter.x + back.x * (EVASION_DISTANCE * 0.7), y: botCenter.y + back.y * (EVASION_DISTANCE * 0.7) },
        { x: botCenter.x + away.x * (EVASION_DISTANCE * 0.9), y: botCenter.y + away.y * (EVASION_DISTANCE * 0.9) },
    ];

    const scoreCandidate = (p: Vec2): number => {
        if (!inExpandedBounds(p, expandX, expandY)) return -Infinity;
        if (isPointBlockedByWalls(p, walls, expandX, expandY)) return -Infinity;

        // Prefer points further away from bullet line and walls, and not too far from the bot's previous global target.
        const bulletLineDist = linePointDistance(p, bulletCenter, bulletVel);

        let minWallDist = Infinity;
        for (const w of walls) {
            const r = expandedWallRect(w, expandX, expandY);
            minWallDist = Math.min(minWallDist, pointToRectDistance(p, r));
        }
        const wallScore = Math.min(250, minWallDist);

        const targetPenalty = fallbackTarget ? Math.min(400, getDistance(p.x, p.y, fallbackTarget.x, fallbackTarget.y)) * 0.15 : 0;
        return bulletLineDist * 1.6 + wallScore - targetPenalty;
    };

    let best = candidates[0];
    let bestScore = scoreCandidate(best);
    for (let i = 1; i < candidates.length; i++) {
        const s = scoreCandidate(candidates[i]);
        if (s > bestScore) {
            bestScore = s;
            best = candidates[i];
        }
    }

    return best;
};

const nearestPointOnRect = (p: Vec2, r: Rect): Vec2 => ({
    x: clamp(p.x, r.x, r.x + r.width),
    y: clamp(p.y, r.y, r.y + r.height),
});

const getClearanceAtPoint = (p: Vec2, walls: Wall[], expandX: number, expandY: number): number => {
    if (!inExpandedBounds(p, expandX, expandY)) return -Infinity;
    let minDist = Infinity;
    for (const w of walls) {
        const r = expandedWallRect(w, expandX, expandY);
        if (p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height) return -Infinity;
        minDist = Math.min(minDist, pointToRectDistance(p, r));
    }
    return Number.isFinite(minDist) ? minDist : 0;
};

const pickFiringSlot = (bot: Player, enemy: Player, walls: Wall[]): Vec2 | null => {
    const enemyCenter = { x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2 };
    const botCenter = { x: bot.x + bot.width / 2, y: bot.y + bot.height / 2 };

    const expandX = bot.width / 2 + 10;
    const expandY = bot.height / 2 + 10;

    let best: Vec2 | null = null;
    let bestScore = -Infinity;

    for (let dir = 0 as Direction; dir < 8; dir = (dir + 1) as Direction) {
        const v = dirToUnitVector(dir);
        const p: Vec2 = { x: enemyCenter.x - v.x * FIRE_SLOT_DISTANCE, y: enemyCenter.y - v.y * FIRE_SLOT_DISTANCE };

        if (!inExpandedBounds(p, expandX, expandY)) continue;
        if (isPointBlockedByWalls(p, walls, expandX, expandY)) continue;
        if (!hasLineOfSight(p.x, p.y, enemyCenter.x, enemyCenter.y, walls)) continue;

        const distToEnemy = getDistance(p.x, p.y, enemyCenter.x, enemyCenter.y);
        if (distToEnemy > FIRE_RANGE - 10) continue;

        const clearance = getClearanceAtPoint(p, walls, expandX, expandY);
        if (!Number.isFinite(clearance) || clearance === -Infinity) continue;

        const travel = getDistance(botCenter.x, botCenter.y, p.x, p.y);
        const distPenalty = Math.abs(distToEnemy - FIRE_SLOT_DISTANCE) * 0.25;
        const closePenalty = distToEnemy < 190 ? (190 - distToEnemy) * 2.5 : 0;

        const score = Math.min(140, clearance) * 1.25 - travel * 0.14 - distPenalty - closePenalty;
        if (score > bestScore) {
            bestScore = score;
            best = p;
        }
    }

    return best;
};

const pickLocalAvoidanceDirection = (
    bot: Player,
    desired: { dx: number; dy: number },
    goal: Vec2 | null,
    walls: Wall[],
    others: Player[]
): { dx: number; dy: number } => {
    const botCenter = { x: bot.x + bot.width / 2, y: bot.y + bot.height / 2 };
    const expandX = bot.width / 2 + 10;
    const expandY = bot.height / 2 + 10;

    const desiredN = normalize({ x: desired.dx, y: desired.dy });
    const velN = normalize({ x: bot.vx || 0, y: bot.vy || 0 });

    const botRadius = Math.hypot(bot.width, bot.height) / 2;
    const baseDistToGoal = goal ? getDistance(botCenter.x, botCenter.y, goal.x, goal.y) : 0;

    const candidates: Vec2[] = [
        { x: 0, y: -1 }, { x: 0.70710678, y: -0.70710678 }, { x: 1, y: 0 }, { x: 0.70710678, y: 0.70710678 },
        { x: 0, y: 1 }, { x: -0.70710678, y: 0.70710678 }, { x: -1, y: 0 }, { x: -0.70710678, y: -0.70710678 },
    ];

    let best = { dx: desired.dx, dy: desired.dy };
    let bestScore = -Infinity;

    for (const c of candidates) {
        const sample = { x: botCenter.x + c.x * LOCAL_AVOID_SAMPLE_DIST, y: botCenter.y + c.y * LOCAL_AVOID_SAMPLE_DIST };
        const clearance = getClearanceAtPoint(sample, walls, expandX, expandY);
        if (!Number.isFinite(clearance) || clearance === -Infinity) continue;
        if (clearance < LOCAL_AVOID_MIN_CLEARANCE) continue;

        let minSep = Infinity;
        for (const other of others) {
            if (other.id === bot.id || other.hp <= 0) continue;
            const otherCenter = { x: other.x + other.width / 2, y: other.y + other.height / 2 };
            const otherRadius = Math.hypot(other.width, other.height) / 2;
            const d = getDistance(sample.x, sample.y, otherCenter.x, otherCenter.y) - (botRadius + otherRadius);
            minSep = Math.min(minSep, d);
        }

        const sepScore = clamp((minSep - 10) / 80, 0, 1);
        const clearScore = clamp(clearance / 60, 0, 1);
        const alignScore = c.x * desiredN.x + c.y * desiredN.y;
        const velScore = c.x * velN.x + c.y * velN.y;

        const distAfter = goal ? getDistance(sample.x, sample.y, goal.x, goal.y) : baseDistToGoal;
        const progress = goal ? clamp((baseDistToGoal - distAfter) / 80, -1, 1) : 0;

        const score =
            progress * 2.0 +
            alignScore * 1.4 +
            clearScore * 1.7 +
            sepScore * 1.1 +
            velScore * 0.4;

        if (score > bestScore) {
            bestScore = score;
            best = { dx: c.x, dy: c.y };
        }
    }

    return best;
};

const applyWallSteering = (bot: Player, walls: Wall[], moveDir: { dx: number; dy: number }): { dx: number; dy: number } => {
    if (Math.abs(moveDir.dx) < 1e-6 && Math.abs(moveDir.dy) < 1e-6) return moveDir;

    const botCenter = { x: bot.x + bot.width / 2, y: bot.y + bot.height / 2 };
    const dir = normalize({ x: moveDir.dx, y: moveDir.dy });

    const expandX = bot.width / 2 + 10;
    const expandY = bot.height / 2 + 10;

    const lookDist = 85;
    const k = 0.70710678;
    const left = normalize({ x: dir.x * k - dir.y * k, y: dir.x * k + dir.y * k });
    const right = normalize({ x: dir.x * k + dir.y * k, y: -dir.x * k + dir.y * k });

    const forwardP = { x: botCenter.x + dir.x * lookDist, y: botCenter.y + dir.y * lookDist };
    const leftP = { x: botCenter.x + left.x * lookDist, y: botCenter.y + left.y * lookDist };
    const rightP = { x: botCenter.x + right.x * lookDist, y: botCenter.y + right.y * lookDist };

    const clearance = (p: Vec2): number => getClearanceAtPoint(p, walls, expandX, expandY);

    const fC = clearance(forwardP);
    const lC = clearance(leftP);
    const rC = clearance(rightP);

    const adjusted = { dx: moveDir.dx, dy: moveDir.dy };

    if (fC < 22) {
        const side = lC >= rC ? left : right;
        adjusted.dx += side.x * 0.9;
        adjusted.dy += side.y * 0.9;
    }

    const repulseDist = 45;
    for (const w of walls) {
        const r = expandedWallRect(w, expandX, expandY);
        const d = pointToRectDistance(botCenter, r);
        if (d <= 0 || d >= repulseDist) continue;
        const nearest = nearestPointOnRect(botCenter, r);
        const away = normalize({ x: botCenter.x - nearest.x, y: botCenter.y - nearest.y });
        const strength = (1 - d / repulseDist) * 1.2;
        adjusted.dx += away.x * strength;
        adjusted.dy += away.y * strength;
    }

    return adjusted;
};

// --- A* 寻路器 ---
interface Node {
    x: number;
    y: number;
    g: number;
    h: number;
    f: number;
    parent: Node | null;
}

class AStarPathfinder {
    private grid: boolean[][] = [];
    private readonly sqrt2 = Math.SQRT2;
    private clearance: number[][] = [];

    updateGrid(walls: Wall[], tankW: number, tankH: number) {
        this.grid = Array.from({ length: COL_COUNT }, () => Array(ROW_COUNT).fill(true));
        this.clearance = Array.from({ length: COL_COUNT }, () => Array(ROW_COUNT).fill(0));
        const wallExpansionX = tankW / 2 + 10;
        const wallExpansionY = tankH / 2 + 10;

        for (let x = 0; x < COL_COUNT; x++) {
            for (let y = 0; y < ROW_COUNT; y++) {
                const px = x * GRID_SIZE + GRID_SIZE / 2;
                const py = y * GRID_SIZE + GRID_SIZE / 2;
                if (px < wallExpansionX || px > CANVAS_WIDTH - wallExpansionX ||
                    py < wallExpansionY || py > CANVAS_HEIGHT - wallExpansionY) {
                    this.grid[x][y] = false;
                    continue;
                }

                let minDist = Infinity;
                for (const w of walls) {
                    const r = expandedWallRect(w, wallExpansionX, wallExpansionY);
                    if (px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height) {
                        this.grid[x][y] = false;
                        minDist = 0;
                        break;
                    }
                    minDist = Math.min(minDist, pointToRectDistance({ x: px, y: py }, r));
                }
                this.clearance[x][y] = Number.isFinite(minDist) ? minDist : 0;
            }
        }
    }

    findPath(start: { x: number, y: number }, end: { x: number, y: number }): { x: number, y: number }[] {
        const startX = Math.floor(start.x / GRID_SIZE);
        const startY = Math.floor(start.y / GRID_SIZE);
        const endX = Math.floor(end.x / GRID_SIZE);
        const endY = Math.floor(end.y / GRID_SIZE);

        if (startX < 0 || startX >= COL_COUNT || startY < 0 || startY >= ROW_COUNT) return [];
        let targetX = Math.max(0, Math.min(COL_COUNT - 1, endX));
        let targetY = Math.max(0, Math.min(ROW_COUNT - 1, endY));

        const openList: Node[] = [];
        const closedSet = new Set<string>();
        const startNode: Node = { x: startX, y: startY, g: 0, h: this.heuristic(startX, startY, targetX, targetY), f: 0, parent: null };
        startNode.f = startNode.g + startNode.h;
        openList.push(startNode);

        while (openList.length > 0) {
            openList.sort((a, b) => a.f - b.f);
            const current = openList.shift()!;
            if (current.x === targetX && current.y === targetY) return this.reconstructPath(current);
            closedSet.add(`${current.x},${current.y}`);

            const neighbors = [
                { x: 0, y: -1, cost: 1 }, { x: 0, y: 1, cost: 1 }, { x: -1, y: 0, cost: 1 }, { x: 1, y: 0, cost: 1 },
                { x: -1, y: -1, cost: this.sqrt2 }, { x: 1, y: -1, cost: this.sqrt2 }, { x: -1, y: 1, cost: this.sqrt2 }, { x: 1, y: 1, cost: this.sqrt2 },
            ];
            for (const n of neighbors) {
                const nx = current.x + n.x, ny = current.y + n.y;
                if (nx < 0 || nx >= COL_COUNT || ny < 0 || ny >= ROW_COUNT) continue;
                if (n.x !== 0 && n.y !== 0) {
                    if (!this.grid[current.x + n.x][current.y] || !this.grid[current.x][current.y + n.y]) continue;
                }
                if (!this.grid[nx][ny] || closedSet.has(`${nx},${ny}`)) continue;
                const clearance = this.clearance[nx]?.[ny] ?? 0;
                const wallPenalty = Math.max(0, (60 - clearance) / 60) * 2.5;
                const g = current.g + n.cost + wallPenalty, h = this.heuristic(nx, ny, targetX, targetY), f = g + h;
                const existing = openList.find(o => o.x === nx && o.y === ny);
                if (existing) { if (g < existing.g) { existing.g = g; existing.f = f; existing.parent = current; } }
                else openList.push({ x: nx, y: ny, g, h, f, parent: current });
            }
        }
        return [];
    }

    private heuristic(x1: number, y1: number, x2: number, y2: number) {
        const dx = Math.abs(x1 - x2);
        const dy = Math.abs(y1 - y2);
        const min = Math.min(dx, dy);
        const max = Math.max(dx, dy);
        return (max - min) + min * this.sqrt2;
    }
    private reconstructPath(node: Node): { x: number, y: number }[] {
        const path = []; let curr: Node | null = node;
        while (curr) { path.push({ x: curr.x * GRID_SIZE + GRID_SIZE / 2, y: curr.y * GRID_SIZE + GRID_SIZE / 2 }); curr = curr.parent; }
        return path.reverse();
    }
}

const pathfinder = new AStarPathfinder();

export const updateAI = (
    bot: Player, 
    allies: Player[],
    opponents: Player[], 
    powerUps: PowerUp[], 
    walls: Wall[], 
    bullets: Bullet[], 
    frameCount: number
): { dx: number, dy: number, wantsToShoot: boolean, aimDir?: Direction, hasAimLOS?: boolean, canHitNow?: boolean, shouldHoldForAim?: boolean } => {
    
    if (!bot.aiState) {
        bot.aiState = { 
            currentState: AIBehaviorState.PATROL, 
            stateTimer: 0, targetId: null, targetItemId: null, lastTargetSelectTime: 0,
            path: [], currentWaypointIndex: 0, globalTargetPos: null, lastPathRecalcFrame: 0,
            patrolDir: { dx: 1, dy: 0 }, patrolTarget: null, evadeDir: { dx: 0, dy: 0 },
            lastPos: { x: bot.x, y: bot.y }, stuckTimer: 0,
            lastItemCheckFrame: 0,
            wantsItemUntilFrame: 0
        };
    }

    const state = bot.aiState;
    state.stateTimer++;

    // 1. 目标搜索
    const botCenter = { x: bot.x + bot.width / 2, y: bot.y + bot.height / 2 };
    const aliveEnemies = opponents.filter(o => o.hp > 0);
    const nearestEnemyAny = aliveEnemies.length > 0
        ? aliveEnemies.reduce((prev, curr) =>
            getDistance(botCenter.x, botCenter.y, curr.x + curr.width / 2, curr.y + curr.height / 2) <
            getDistance(botCenter.x, botCenter.y, prev.x + prev.width / 2, prev.y + prev.height / 2)
                ? curr
                : prev)
        : null;

    const distToEnemyAny = nearestEnemyAny
        ? getDistance(botCenter.x, botCenter.y, nearestEnemyAny.x + nearestEnemyAny.width / 2, nearestEnemyAny.y + nearestEnemyAny.height / 2)
        : Infinity;
    
    // 毁灭者坦克 (Destroyer) 拥有全图追击范围
    const effectiveChaseRange = bot.tankId === 'bot_destroyer' ? Infinity : CHASE_RANGE;

    const nearestEnemy = getNearestVisibleEnemy(bot, aliveEnemies, walls, effectiveChaseRange);
    const distToEnemy = nearestEnemy
        ? getDistance(botCenter.x, botCenter.y, nearestEnemy.x + nearestEnemy.width / 2, nearestEnemy.y + nearestEnemy.height / 2)
        : Infinity;

    const bulletThreat = predictMostDangerousBullet(bot, bullets, walls);
    const severeThreat = bulletThreat && bulletThreat.frames <= BULLET_EVADE_TRIGGER_FRAMES ? bulletThreat : null;
    const microThreat = !severeThreat && bulletThreat && bulletThreat.frames <= BULLET_MICRO_DODGE_FRAMES ? bulletThreat : null;

    // 道具检测
    const nearestItemAny = powerUps.length > 0
        ? powerUps.reduce((prev, curr) => getDistance(bot.x, bot.y, curr.x, curr.y) < getDistance(bot.x, bot.y, prev.x, prev.y) ? curr : prev)
        : null;

    const nowFrame = frameCount;
    const wantsItemActive = (state.wantsItemUntilFrame ?? 0) > nowFrame;
    const canCheckItem = nowFrame - (state.lastItemCheckFrame ?? 0) >= ITEM_CHECK_INTERVAL_FRAMES;

    if (canCheckItem) {
        state.lastItemCheckFrame = nowFrame;
        if (state.currentState !== AIBehaviorState.GET_ITEM && nearestItemAny) {
            const distItem = getDistance(bot.x, bot.y, nearestItemAny.x, nearestItemAny.y);
            if (distItem < ITEM_INTEREST_RANGE) {
                let prob = 0.22;
                const hpRatio = bot.maxHp > 0 ? bot.hp / bot.maxHp : 1;
                if (hpRatio < 0.55) prob += 0.18;
                if (!bot.hasShield) prob += 0.06;
                if (bot.ammo <= Math.max(1, Math.floor(bot.maxAmmo * 0.33))) prob += 0.12;
                if (distToEnemyAny < FIRE_RANGE + 80) prob -= 0.18;
                prob = clamp(prob, 0.05, 0.6);

                if (Math.random() < prob) {
                    state.wantsItemUntilFrame = nowFrame + ITEM_DESIRE_DURATION_FRAMES;
                    state.targetItemId = nearestItemAny.id;
                }
            }
        }
    }

    const targetItem = state.targetItemId ? powerUps.find(pu => pu.id === state.targetItemId) : null;
    const nearestItem = targetItem || nearestItemAny;

    // 2. 状态机决策
    let nextTargetPos: { x: number, y: number } | null = null;
    let newBehavior = state.currentState;

    const pickReachablePatrolTarget = (): { x: number, y: number } | null => {
        pathfinder.updateGrid(walls, bot.width, bot.height);
        const expandX = bot.width / 2 + 10;
        const expandY = bot.height / 2 + 10;

        for (let attempt = 0; attempt < 60; attempt++) {
            const candidate = {
                x: 100 + Math.random() * (CANVAS_WIDTH - 200),
                y: 100 + Math.random() * (CANVAS_HEIGHT - 200),
            };
            if (!inExpandedBounds(candidate, expandX, expandY)) continue;
            if (isPointBlockedByWalls(candidate, walls, expandX, expandY)) continue;
            if (getDistance(botCenter.x, botCenter.y, candidate.x, candidate.y) < 220) continue;

            const rawPath = pathfinder.findPath(botCenter, candidate);
            if (rawPath.length < 2) continue;

            state.patrolTarget = candidate;
            state.path = smoothPath(rawPath, bot, walls);
            state.currentWaypointIndex = 0;
            state.globalTargetPos = candidate;
            state.lastPathRecalcFrame = frameCount;
            state.stuckTimer = 0;
            return candidate;
        }

        return null;
    };

    const distToItem = nearestItem ? getDistance(botCenter.x, botCenter.y, nearestItem.x + nearestItem.width / 2, nearestItem.y + nearestItem.height / 2) : Infinity;
    const shouldLootNow = nearestItem && (state.wantsItemUntilFrame ?? 0) > nowFrame && distToItem < ITEM_INTEREST_RANGE && distToEnemyAny > (FIRE_RANGE + 80) && !nearestEnemy;

    const prevState = state.currentState;
    const transition = () => {
    if (severeThreat) {
        newBehavior = AIBehaviorState.EVADE;
        const fallback = state.globalTargetPos ? { x: state.globalTargetPos.x, y: state.globalTargetPos.y } : null;
        const evadePos = chooseEvasionTarget(bot, severeThreat, walls, fallback);
        nextTargetPos = evadePos;
        state.targetId = null;
        state.targetItemId = null;
        state.wantsItemUntilFrame = 0;
    } else if (shouldLootNow) {
        newBehavior = AIBehaviorState.GET_ITEM;
        state.targetId = null;
        nextTargetPos = { x: nearestItem.x + nearestItem.width / 2, y: nearestItem.y + nearestItem.height / 2 };
    } else if (nearestEnemy) {
        // 进入追击/攻击范围 (毁灭者坦克始终满足此条件只要有活着的敌人)
        state.targetId = nearestEnemy.id;
        if (distToEnemy < FIRE_RANGE) {
            newBehavior = AIBehaviorState.FIRE;
            const enemyCenter = { x: nearestEnemy.x + nearestEnemy.width / 2, y: nearestEnemy.y + nearestEnemy.height / 2 };
            const expandX = bot.width / 2 + 10;
            const expandY = bot.height / 2 + 10;

            const existing = state.patrolTarget;
            const existingValid =
                !!existing &&
                inExpandedBounds(existing, expandX, expandY) &&
                !isPointBlockedByWalls(existing, walls, expandX, expandY) &&
                hasLineOfSight(existing.x, existing.y, enemyCenter.x, enemyCenter.y, walls);
            const farFromExisting = existing ? getDistance(botCenter.x, botCenter.y, existing.x, existing.y) > 80 : true;

            if (state.currentState !== AIBehaviorState.FIRE || !existingValid || state.stuckTimer >= 3 || (farFromExisting && state.stateTimer % FIRE_SLOT_REEVAL_FRAMES === 0)) {
                const slot = pickFiringSlot(bot, nearestEnemy, walls);
                if (slot) state.patrolTarget = slot;
                else {
                    const angle = Math.atan2(bot.y - nearestEnemy.y, bot.x - nearestEnemy.x) + (Math.random() - 0.5) * 1.2;
                    state.patrolTarget = { x: nearestEnemy.x + Math.cos(angle) * 300, y: nearestEnemy.y + Math.sin(angle) * 300 };
                }
            }
            nextTargetPos = state.patrolTarget;
        } else {
            newBehavior = AIBehaviorState.CHASE;
            nextTargetPos = { x: nearestEnemy.x + nearestEnemy.width / 2, y: nearestEnemy.y + nearestEnemy.height / 2 };
        }
    } else if (nearestItem && (state.wantsItemUntilFrame ?? 0) > nowFrame && distToItem < 420) {
        newBehavior = AIBehaviorState.GET_ITEM;
        state.targetId = null;
        nextTargetPos = { x: nearestItem.x + nearestItem.width / 2, y: nearestItem.y + nearestItem.height / 2 };
    } else {
        newBehavior = AIBehaviorState.PATROL;
        state.targetId = null;
        const enteringPatrol = state.currentState !== AIBehaviorState.PATROL;
        if (enteringPatrol) state.patrolTarget = null;
        const reachedPatrolTarget = state.patrolTarget && getDistance(botCenter.x, botCenter.y, state.patrolTarget.x, state.patrolTarget.y) < 60;
        const isStuck = state.stuckTimer >= (STUCK_THRESHOLD_FRAMES / 10);

        if (!state.patrolTarget || reachedPatrolTarget || isStuck) {
            pickReachablePatrolTarget();
        }
        nextTargetPos = state.patrolTarget;
    }

    };

    transition();
    if (newBehavior !== prevState) state.stateTimer = 0;

    // 3. 寻路控制
    const shouldRecalc = !state.globalTargetPos || 
                         (nextTargetPos && getDistance(state.globalTargetPos.x, state.globalTargetPos.y, nextTargetPos.x, nextTargetPos.y) > 80) ||
                         (frameCount - state.lastPathRecalcFrame > PATH_RECALC_INTERVAL) ||
                         (state.stuckTimer >= (STUCK_THRESHOLD_FRAMES / 10) && frameCount - state.lastPathRecalcFrame > 6);

    if (shouldRecalc && nextTargetPos) {
        pathfinder.updateGrid(walls, bot.width, bot.height);
        const rawPath = pathfinder.findPath(botCenter, nextTargetPos);
        state.path = smoothPath(rawPath, bot, walls);
        state.currentWaypointIndex = 0;
        state.globalTargetPos = nextTargetPos;
        state.lastPathRecalcFrame = frameCount;
    }

    // 4. 计算移动方向向量
    let moveDir = { dx: 0, dy: 0 };
    if (state.path.length > 0 && state.currentWaypointIndex < state.path.length) {
        const wp = state.path[state.currentWaypointIndex];
        const dx = wp.x - (bot.x + bot.width/2);
        const dy = wp.y - (bot.y + bot.height/2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 30) state.currentWaypointIndex++;
        else { moveDir.dx = dx / dist; moveDir.dy = dy / dist; }
    }
    if ((moveDir.dx === 0 && moveDir.dy === 0) && nextTargetPos) {
        const dx = nextTargetPos.x - (bot.x + bot.width / 2);
        const dy = nextTargetPos.y - (bot.y + bot.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1e-6) { moveDir.dx = dx / dist; moveDir.dy = dy / dist; }
    }

    // 局部避障（坦克-坦克排斥）
    [...allies, ...opponents].forEach(other => {
        if (other.id === bot.id || other.hp <= 0) return;
        const d = getDistance(bot.x, bot.y, other.x, other.y);
        if (d > 1e-6 && d < REPU_FORCE_DIST) {
            const force = (1 - d / REPU_FORCE_DIST) * 1.5;
            moveDir.dx += (bot.x - other.x) / d * force;
            moveDir.dy += (bot.y - other.y) / d * force;
        }
    });

    // 子弹微闪避（非强制 EVADE 时，轻量修正移动方向）
    if (microThreat) {
        const b = microThreat.bullet;
        const bulletDir = normalize({ x: b.vx, y: b.vy });
        const perp = normalize({ x: -bulletDir.y, y: bulletDir.x });
        const botCenter = { x: bot.x + bot.width / 2, y: bot.y + bot.height / 2 };
        const bulletCenter = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
        const side = (perp.x * (botCenter.x - bulletCenter.x) + perp.y * (botCenter.y - bulletCenter.y)) >= 0 ? 1 : -1;
        const weight = clamp((BULLET_MICRO_DODGE_FRAMES - microThreat.frames) / BULLET_MICRO_DODGE_FRAMES, 0.2, 1.15);
        moveDir.dx += perp.x * side * weight;
        moveDir.dy += perp.y * side * weight;
    }

    const beforeWall = { dx: moveDir.dx, dy: moveDir.dy };
    moveDir = applyWallSteering(bot, walls, moveDir);

    const expandX = bot.width / 2 + 10;
    const expandY = bot.height / 2 + 10;
    const dirN = normalize({ x: moveDir.dx, y: moveDir.dy });
    const forwardP = { x: botCenter.x + dirN.x * 85, y: botCenter.y + dirN.y * 85 };
    const forwardClear = getClearanceAtPoint(forwardP, walls, expandX, expandY);
    const wallTurnedHard = (beforeWall.dx * moveDir.dx + beforeWall.dy * moveDir.dy) < 0.2;

    // 当路线前方很“紧”、或者发生强烈转向修正、或者有卡住趋势时，做一次局部方向搜索
    if (forwardClear < LOCAL_AVOID_TRIGGER_CLEARANCE || wallTurnedHard || state.stuckTimer >= 2) {
        const goal: Vec2 | null =
            state.path.length > 0 && state.currentWaypointIndex < state.path.length
                ? state.path[Math.min(state.currentWaypointIndex + 1, state.path.length - 1)]
                : (nextTargetPos ? { x: nextTargetPos.x, y: nextTargetPos.y } : null);
        const picked = pickLocalAvoidanceDirection(bot, moveDir, goal, walls, [...allies, ...opponents]);
        moveDir = applyWallSteering(bot, walls, picked);
    }

    const speedLen = Math.sqrt(moveDir.dx**2 + moveDir.dy**2);
    if (speedLen > 0.1) { moveDir.dx /= speedLen; moveDir.dy /= speedLen; } else { moveDir = { dx: 0, dy: 0 }; }

    // 5. 开火判定
    let wantsToShoot = false;
    let aimDir: Direction | undefined = undefined;
    let hasAimLOS = false;
    let canHitNow = false;
    let shouldHoldForAim = false;

    if (nearestEnemy && distToEnemy < FIRE_RANGE) {
        const bx = bot.x + bot.width/2, by = bot.y + bot.height/2;
        const enemyCx = nearestEnemy.x + nearestEnemy.width / 2;
        const enemyCy = nearestEnemy.y + nearestEnemy.height / 2;

        const tx = clamp(enemyCx, 0, CANVAS_WIDTH);
        const ty = clamp(enemyCy, 0, CANVAS_HEIGHT);

        if (hasLineOfSight(bx, by, tx, ty, walls)) {
            hasAimLOS = true;
            wantsToShoot = true;
            
            const targetAngle = Math.atan2(enemyCy - by, enemyCx - bx);
            aimDir = (Math.round(targetAngle / (Math.PI / 4)) + 2 + 8) % 8 as Direction;
            
            const tank = TANK_CLASSES.find(t => t.id === bot.tankId);
            const bulletSize = (tank?.bulletSize ?? 6) * (bot.buffSizeTimer > 0 ? 2.5 : 1);

            const shootV = dirToUnitVector(bot.direction);
            const relX = tx - bx;
            const relY = ty - by;
            const dot = relX * shootV.x + relY * shootV.y;
            const cross = Math.abs(relX * shootV.y - relY * shootV.x);
            const enemyRadius = Math.min(nearestEnemy.width, nearestEnemy.height) / 2;
            const tol = enemyRadius + bulletSize / 2 + FIRE_HIT_TOLERANCE_PAD;

            if (dot > 0 && cross <= tol) {
                canHitNow = true;
            } else if (distToEnemy < 280) {
                // If enemy is close, stop and aim
                shouldHoldForAim = true;
            }
        }
    }

    // 6. 卡死检测
    if (newBehavior === AIBehaviorState.FIRE && wantsToShoot && !microThreat) {
        // moveDir = { dx: 0, dy: 0 }; // Controlled by shouldHoldForAim now
    }

    if (frameCount % 10 === 0) {
        const dMoved = getDistance(bot.x, bot.y, state.lastPos.x, state.lastPos.y);
        if (dMoved < 3) state.stuckTimer++;
        else state.stuckTimer = 0;
        state.lastPos = { x: bot.x, y: bot.y };
    }

    state.currentState = newBehavior;
    return { dx: moveDir.dx, dy: moveDir.dy, wantsToShoot, aimDir, hasAimLOS, canHitNow, shouldHoldForAim };
};

const isSegmentClear = (a: Vec2, b: Vec2, walls: Wall[], expandX: number, expandY: number): boolean => {
    if (!inExpandedBounds(a, expandX, expandY) || !inExpandedBounds(b, expandX, expandY)) return false;
    for (const w of walls) {
        const r = expandedWallRect(w, expandX, expandY);
        if (checkLineRectCollide(a.x, a.y, b.x, b.y, r.x, r.y, r.width, r.height)) return false;
    }
    return true;
};

const smoothPath = (path: Vec2[], bot: Player, walls: Wall[]): Vec2[] => {
    if (path.length <= 2) return path;

    const expandX = bot.width / 2 + 10;
    const expandY = bot.height / 2 + 10;

    const smoothed: Vec2[] = [];
    let i = 0;
    smoothed.push(path[0]);

    while (i < path.length - 1) {
        let bestJ = i + 1;
        for (let j = path.length - 1; j > i + 1; j--) {
            if (isSegmentClear(path[i], path[j], walls, expandX, expandY)) {
                bestJ = j;
                break;
            }
        }
        smoothed.push(path[bestJ]);
        i = bestJ;
    }

    return smoothed;
};
