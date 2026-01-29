
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Zap } from 'lucide-react';
import { Controls } from './components/Controls';
import { GameHUD } from './components/GameHUD';
import { GameStatus, Player, Bullet, Wall, Particle, GameState, Direction, PowerUp, FloatingText, GameMode, Difficulty, ThemeId, MatchRecord, GameStats, AIBehaviorState, KeyBindings } from './types';
import { checkAABB, checkWallCollision, getDistance, checkLineRectCollide } from './utils/gamePhysics';
import { useGameAudio } from './hooks/useGameAudio';
import { updateAI } from './utils/ai';
import { renderGame } from './utils/renderer';
import { 
    CANVAS_WIDTH, CANVAS_HEIGHT, TANK_CLASSES, MAPS, POWER_UP_POOL, POWERUP_LIFESPAN, MAX_FRAGMENTS, TEXT_DICTIONARY, 
    SPAWN_INTERVAL, MIN_SPAWN_INTERVAL, SPAWN_SPEED_UP_INTERVAL, SPAWN_SPEED_STEP, RESOLUTIONS, FIXED_TIMESTEP_MS, AI_CONFIG, COOP_DIFFICULTY_MULT, BUFF_DURATION, THEMES, PLAYER_COLORS, DEFAULT_KEYBINDINGS
} from './constants';

const STATS_STORAGE_KEY = 'tank_battle_stats_v1';
const KEYBINDINGS_STORAGE_KEY = 'tank_battle_keybindings_v1';

// 惯性参数（仅用于 AI）
const ACCELERATION = 0.15; 
const FRICTION = 0.92;      

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.PVP);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.EASY);
  const [pvePlayerCount, setPvePlayerCount] = useState<1 | 2>(1);
  const [p1TankId, setP1TankId] = useState<string>('assault');
  const [p2TankId, setP2TankId] = useState<string>('assault');
  const [mapId, setMapId] = useState<string>('echo_valley');
  const [activeMapId, setActiveMapId] = useState<string>('echo_valley');
  const [isMusicOn, setIsMusicOn] = useState<boolean>(true);
  const [language, setLanguage] = useState<'en' | 'zh'>( 'zh'); 
  const [targetResolution, setTargetResolution] = useState<{w: number, h: number}>(RESOLUTIONS[0]);
  const [theme, setTheme] = useState<ThemeId>('default');
  const [p1ControlScheme, setP1ControlScheme] = useState<'directional' | 'tank'>('directional');
  const [p2ControlScheme, setP2ControlScheme] = useState<'directional' | 'tank'>('directional');
  const [p1Name, setP1Name] = useState<string>("");
  const [p2Name, setP2Name] = useState<string>("");
  const [p1Color, setP1Color] = useState<string>(PLAYER_COLORS[0]); 
  const [p2Color, setP2Color] = useState<string>(PLAYER_COLORS[6]); 
  const [gameState, setGameState] = useState<GameState>({ status: GameStatus.MENU, winner: null });
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [startCountdown, setStartCountdown] = useState<number | null>(null);
  const [ultimateAnnounce, setUltimateAnnounce] = useState<{text: string, subtext: string, color: string} | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [uiPlayers, setUiPlayers] = useState<Player[]>([]);
  const [uiEnemies, setUiEnemies] = useState<Player[]>([]);
  const [gameScale, setGameScale] = useState<number>(1);
  const [keyBindings, setKeyBindings] = useState<KeyBindings>(DEFAULT_KEYBINDINGS);
  
  const playersRef = useRef<Player[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const currentWallsRef = useRef<Wall[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const keysPressed = useRef<Set<string>>(new Set());
  
  const spawnTimerRef = useRef<number>(SPAWN_INTERVAL);
  const currentSpawnIntervalRef = useRef<number>(SPAWN_INTERVAL);
  const nextSpeedUpTimeRef = useRef<number>(SPAWN_SPEED_UP_INTERVAL);
  const frameRef = useRef<number>(0);
  const gameTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const shakeTimerRef = useRef<number>(0);
  const gameOverTimeoutRef = useRef<number | null>(null);
  const ultimateAnnounceTimeoutRef = useRef<number | null>(null);

  const { initAudio, playSound } = useGameAudio(isMusicOn, gameState.status);
  const togglePause = useCallback(() => setIsPaused(prev => !prev), []);
  const toggleMusic = useCallback(() => setIsMusicOn(prev => !prev), []);
  const toggleLanguage = useCallback(() => setLanguage(prev => prev === 'en' ? 'zh' : 'en'), []);
  const toggleP1ControlScheme = useCallback(() => setP1ControlScheme(prev => prev === 'directional' ? 'tank' : 'directional'), []);
  const toggleP2ControlScheme = useCallback(() => setP2ControlScheme(prev => prev === 'directional' ? 'tank' : 'directional'), []);
  const toggleTheme = useCallback(() => setTheme(prev => prev === 'default' ? 'christmas' : 'default'), []);

  // Load Keybindings
  useEffect(() => {
      const stored = localStorage.getItem(KEYBINDINGS_STORAGE_KEY);
      if (stored) {
          try {
              setKeyBindings(JSON.parse(stored));
          } catch (e) {
              console.error("Failed to parse keybindings", e);
          }
      }
  }, []);

  // Save Keybindings when changed
  const handleSetKeyBindings = useCallback((newBindings: KeyBindings) => {
      setKeyBindings(newBindings);
      localStorage.setItem(KEYBINDINGS_STORAGE_KEY, JSON.stringify(newBindings));
  }, []);

  const saveMatchStats = useCallback((winnerTeam: number) => {
    try {
      const stored = localStorage.getItem(STATS_STORAGE_KEY);
      const stats: GameStats = stored ? JSON.parse(stored) : { 
        matchHistory: [], 
        pveBestTimes: {}, 
        pveSoloClearsByDiff: {}, 
        pveDuoClearsByDiff: {},
        pveGlobalBestSolo: {},
        pveGlobalBestDuo: {}
      };

      if (!stats.pveSoloClearsByDiff) stats.pveSoloClearsByDiff = {};
      if (!stats.pveDuoClearsByDiff) stats.pveDuoClearsByDiff = {};
      if (!stats.pveGlobalBestSolo) stats.pveGlobalBestSolo = {};
      if (!stats.pveGlobalBestDuo) stats.pveGlobalBestDuo = {};

      const record: MatchRecord = {
        id: Math.random().toString(36).substr(2, 9),
        mode: gameMode,
        difficulty: gameMode === GameMode.PVE ? difficulty : undefined,
        playerCount: gameMode === GameMode.PVE ? pvePlayerCount : 2,
        mapId: activeMapId,
        winner: winnerTeam,
        time: gameTimeRef.current,
        date: Date.now(),
        p1Name: p1Name || TEXT_DICTIONARY[language].p1,
        p2Name: gameMode === GameMode.PVP || pvePlayerCount === 2 ? (p2Name || TEXT_DICTIONARY[language].p2) : undefined
      };

      stats.matchHistory.unshift(record);
      if (stats.matchHistory.length > 50) stats.matchHistory.pop();

      if (gameMode === GameMode.PVE && winnerTeam === 0) {
        const diffStr = difficulty.toString();
        if (pvePlayerCount === 1) {
          stats.pveSoloClearsByDiff[diffStr] = (stats.pveSoloClearsByDiff[diffStr] || 0) + 1;
          const currentGlobal = stats.pveGlobalBestSolo[diffStr];
          if (!currentGlobal || gameTimeRef.current < currentGlobal) {
            stats.pveGlobalBestSolo[diffStr] = gameTimeRef.current;
          }
        } else {
          stats.pveDuoClearsByDiff[diffStr] = (stats.pveDuoClearsByDiff[diffStr] || 0) + 1;
          const currentGlobal = stats.pveGlobalBestDuo[diffStr];
          if (!currentGlobal || gameTimeRef.current < currentGlobal) {
            stats.pveGlobalBestDuo[diffStr] = gameTimeRef.current;
          }
        }

        if (!stats.pveBestTimes[activeMapId]) stats.pveBestTimes[activeMapId] = {};
        if (!stats.pveBestTimes[activeMapId][diffStr]) stats.pveBestTimes[activeMapId][diffStr] = {};
        const currentBest = stats.pveBestTimes[activeMapId][diffStr][pvePlayerCount];
        if (!currentBest || gameTimeRef.current < currentBest) {
          stats.pveBestTimes[activeMapId][diffStr][pvePlayerCount] = gameTimeRef.current;
        }
      }

      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {
      console.error("Failed to save stats", e);
    }
  }, [gameMode, difficulty, pvePlayerCount, activeMapId, p1Name, p2Name, language]);

  const handleQuit = useCallback(() => {
    setGameState({ status: GameStatus.MENU, winner: null });
    setIsPaused(false);
  }, []);

  const handleGoToSelect = useCallback((mode: GameMode) => {
    setGameMode(mode);
    setGameState({ status: GameStatus.CHARACTER_SELECT, winner: null });
  }, []);

  useEffect(() => {
    if (startCountdown === null) return;
    const timer = window.setTimeout(() => {
        if (startCountdown > 0) setStartCountdown(c => c !== null ? c - 1 : null);
        else setStartCountdown(null);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [startCountdown]);

  useEffect(() => {
    const handleResize = () => {
        const scaleX = window.innerWidth / targetResolution.w;
        const scaleY = window.innerHeight / targetResolution.h;
        setGameScale(Math.min(scaleX, scaleY));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [targetResolution]);

  useEffect(() => {
    const handleInteraction = () => { initAudio(); };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    const down = (e: KeyboardEvent) => { keysPressed.current.add(e.key); if (e.key === 'Escape') togglePause(); };
    const up = (e: KeyboardEvent) => keysPressed.current.delete(e.key);
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { 
        window.removeEventListener('click', handleInteraction); 
        window.removeEventListener('keydown', handleInteraction);
        window.removeEventListener('keydown', down); 
        window.removeEventListener('keyup', up); 
    };
  }, [initAudio, togglePause]);

  const spawnParticle = (x: number, y: number, type: Particle['type'], color: string, count: number = 1, speedMult: number = 1) => {
      for(let i=0; i<count; i++) {
          let vx = (Math.random() - 0.5) * 2 * speedMult;
          let vy = (Math.random() - 0.5) * 2 * speedMult;
          let life = 20 + Math.random() * 20;
          let size = Math.random() * 3 + 1;
          let drag = 0.95;
          if (type === 'spark') { life = 10 + Math.random() * 10; vx *= 3; vy *= 3; size = 2; }
          else if (type === 'smoke') { life = 40 + Math.random() * 20; size = 4 + Math.random() * 4; vx *= 0.5; vy *= 0.5; }
          else if (type === 'muzzle') { life = 5; size = 4; drag = 0.8; }
          else if (type === 'shockwave') { life = 15; size = 1; vx = 0; vy = 0; }
          else if (type === 'flash') { life = 4; size = 40; vx=0; vy=0; }
          else if (type === 'turret') { life = 200; size = 25; drag = 0.98; }
          particlesRef.current.push({ x, y, vx, vy, life, maxLife: life, size, color, type, drag, rotation: Math.random()*Math.PI, vr: (Math.random()-0.5)*0.5, gravity: (type==='turret'||type==='debris')?0.4:0, bounce: 0.5 });
      }
  };

  const spawnFloatingText = (x: number, y: number, text: string, color: string) => {
      floatingTextsRef.current.push({ id: Math.random().toString(36), x, y, text, color, life: 120, maxLife: 120, vy: -0.8 });
  };

  const spawnTankExplosion = (p: Player) => {
      const cx = p.x + p.width/2; const cy = p.y + p.height/2;
      particlesRef.current.push({ x: cx, y: cy, vx: (Math.random() - 0.5) * 12, vy: -15 - Math.random() * 8, life: 200, maxLife: 200, size: p.width * 0.6, color: p.color, type: 'turret', rotation: 0, vr: (Math.random() - 0.5) * 0.4, gravity: 0.4, drag: 0.98, bounce: 0.6 });
      for(let k=0; k<4; k++) spawnParticle(cx, cy, 'debris', p.color, 1, 6);
      spawnParticle(cx, cy, 'shockwave', p.color, 3);
      spawnParticle(cx, cy, 'smoke', '#444', 40, 4);
      spawnParticle(cx, cy, 'spark', p.color, 30, 6);
      spawnParticle(cx, cy, 'flash', '#fff', 1);
  };

  const spawnPowerUp = () => {
    if (powerUpsRef.current.length >= 4) return; 
    for(let i=0; i<50; i++) { 
      const size = 36;
      const x = 50 + Math.random() * (CANVAS_WIDTH - 100);
      const y = 50 + Math.random() * (CANVAS_HEIGHT - 100);
      const candidate = { x, y, width: size, height: size };
      if (checkWallCollision(candidate, currentWallsRef.current)) continue;
      if (playersRef.current.some(p => checkAABB(candidate, p))) continue;
      const type = POWER_UP_POOL[Math.floor(Math.random() * POWER_UP_POOL.length)];
      powerUpsRef.current.push({ id: Math.random().toString(36), x, y, width: size, height: size, type, spawnTime: Date.now(), despawnTime: Date.now() + POWERUP_LIFESPAN });
      spawnParticle(x + size/2, y + size/2, 'smoke', '#fff', 10);
      spawnParticle(x + size/2, y + size/2, 'spark', '#fff', 5);
      break;
    }
  };

  const updatePlayers = () => {
    playersRef.current.forEach(p => {
      if (p.hp <= 0) {
          p.vx *= FRICTION; p.vy *= FRICTION;
          return;
      }
      
      if (p.buffDamageTimer > 0) p.buffDamageTimer--;
      if (p.buffRicochetTimer > 0) p.buffRicochetTimer--;
      if (p.buffSpeedTimer > 0) p.buffSpeedTimer--;
      if (p.buffSizeTimer > 0) p.buffSizeTimer--;
      if (p.shootCooldown > 0) p.shootCooldown--;
      if (p.recoil > 0) p.recoil = Math.max(0, p.recoil - 1);
      if (p.rotationCooldown > 0) p.rotationCooldown--;

      const bindings = p.id === 0 ? keyBindings.p1 : keyBindings.p2;
      
      if (!p.isReloading && (p.ammo <= 0 || (keysPressed.current.has(bindings.reload) && p.ammo < p.maxAmmo))) {
          p.isReloading = true; p.reloadTimer = p.baseReloadTime;
      }
      if (p.isReloading) {
          p.reloadTimer--;
          if (p.reloadTimer <= 0) { p.ammo = p.maxAmmo; p.isReloading = false; }
      }

      let targetDx = 0, targetDy = 0, wantsToShoot = false;
      const speedMult = (p.buffSpeedTimer > 0 ? 1.5 : 1);
      
      if (p.isBot) {
          const opponents = playersRef.current.filter(op => op.team !== p.team), allies = playersRef.current.filter(a => a.team === p.team);
          
          const aiUpdateInterval = 10;
          if (!p.aiState?.lastDecision || (frameRef.current + p.id) % aiUpdateInterval === 0) {
              const aiResult = updateAI(p, allies, opponents, powerUpsRef.current, currentWallsRef.current, bulletsRef.current, frameRef.current);
              if (p.aiState) p.aiState.lastDecision = aiResult;
          }
          
          // Fixed: Fallback object now explicitly includes optional fields to satisfy TypeScript type inference when accessing decision properties
          const decision = p.aiState?.lastDecision || { 
              dx: 0, 
              dy: 0, 
              wantsToShoot: false, 
              aimDir: undefined, 
              canHitNow: undefined, 
              shouldHoldForAim: undefined 
          };
          
          if (decision.shouldHoldForAim) {
              targetDx = 0; targetDy = 0;
          } else if (decision.dx !== 0 || decision.dy !== 0) {
              const targetAngle = Math.atan2(decision.dy, decision.dx);
              let targetDir = (Math.round(targetAngle / (Math.PI / 4)) + 2 + 8) % 8;

              if (p.direction !== targetDir) {
                  if (p.rotationCooldown <= 0) {
                      const diff = (targetDir - p.direction + 8) % 8;
                      if (diff <= 4) p.direction = (p.direction + 1) % 8;
                      else p.direction = (p.direction + 7) % 8;
                      p.rotationCooldown = 8; 
                  }
                  targetDx = 0; targetDy = 0;
              } else {
                  const moveAngle = p.direction * (Math.PI / 4);
                  targetDx = Math.sin(moveAngle) * p.speed * speedMult;
                  targetDy = -Math.cos(moveAngle) * p.speed * speedMult;
              }
          }

          if (decision.aimDir !== undefined && p.direction !== decision.aimDir) {
              if (p.rotationCooldown <= 0) {
                  const diff = (decision.aimDir - p.direction + 8) % 8;
                  if (diff <= 4) p.direction = (p.direction + 1) % 8;
                  else p.direction = (p.direction + 7) % 8;
                  p.rotationCooldown = 8;
              }
          }
          
          wantsToShoot = decision.wantsToShoot && (decision.canHitNow ?? true);
      } else {
          const currentMaxSpeed = p.speed * speedMult, keys = keysPressed.current;
          const scheme = p.id === 0 ? p1ControlScheme : p2ControlScheme;
          const kb = p.id === 0 ? keyBindings.p1 : keyBindings.p2;

          if (scheme === 'tank') {
               let moveFwd = 0, rotateDir = 0;
               if (keys.has(kb.up)) moveFwd = 1; else if (keys.has(kb.down)) moveFwd = -1; 
               if (keys.has(kb.left)) rotateDir = -1; else if (keys.has(kb.right)) rotateDir = 1; 
               if (keys.has(kb.fire)) wantsToShoot = true;
               
               if (rotateDir !== 0) {
                  if (p.rotationCooldown <= 0) { 
                    if (rotateDir === 1) p.direction = (p.direction + 1) % 8; 
                    else p.direction = (p.direction + 7) % 8; 
                    p.rotationCooldown = 6; 
                  }
               }
               if (moveFwd !== 0) { const angle = p.direction * (Math.PI / 4); targetDx = Math.sin(angle) * currentMaxSpeed * moveFwd; targetDy = -Math.cos(angle) * currentMaxSpeed * moveFwd; }
          } else {
               let dxIn = 0, dyIn = 0;
               if (keys.has(kb.up)) dyIn -= 1; if (keys.has(kb.down)) dyIn += 1; 
               if (keys.has(kb.left)) dxIn -= 1; if (keys.has(kb.right)) dxIn += 1; 
               if (keys.has(kb.fire)) wantsToShoot = true;

               if (dxIn !== 0 || dyIn !== 0) {
                    const len = Math.sqrt(dxIn*dxIn + dyIn*dyIn); targetDx = (dxIn / len) * currentMaxSpeed; targetDy = (dyIn / len) * currentMaxSpeed;
                    if (dyIn < 0 && dxIn === 0) p.direction = Direction.UP; 
                    else if (dyIn < 0 && dxIn > 0) p.direction = Direction.UP_RIGHT; 
                    else if (dyIn === 0 && dxIn > 0) p.direction = Direction.RIGHT; 
                    else if (dyIn > 0 && dxIn > 0) p.direction = Direction.DOWN_RIGHT;
                    else if (dyIn > 0 && dxIn === 0) p.direction = Direction.DOWN; 
                    else if (dyIn > 0 && dxIn < 0) p.direction = Direction.DOWN_LEFT; 
                    else if (dyIn === 0 && dxIn < 0) p.direction = Direction.LEFT; 
                    else if (dyIn < 0 && dxIn < 0) p.direction = Direction.UP_LEFT;
               }
          }
      }

      // 物理核心逻辑
      if (p.isBot) {
          // AI 拥有惯性：速度随加速度和摩擦力变化
          p.vx = p.vx * FRICTION + targetDx * ACCELERATION;
          p.vy = p.vy * FRICTION + targetDy * ACCELERATION;
      } else {
          // 人物坦克无惯性：速度直接设为目标速度，松开立即停止，按下立即最大
          p.vx = targetDx;
          p.vy = targetDy;
      }

      const tryMove = (axis: 'x' | 'y', velocity: number) => { 
          if (Math.abs(velocity) < 0.1) return; 
          const next = { ...p, [axis]: p[axis] + velocity }; 
          const hitWall = checkWallCollision(next, currentWallsRef.current), 
                hitPlayer = playersRef.current.some(op => op.id !== p.id && op.hp > 0 && checkAABB(next, op)); 
          if (!hitWall && !hitPlayer) p[axis] += velocity; 
          else {
              if (axis === 'x') p.vx = 0; else p.vy = 0;
              if (p.isBot && p.aiState) p.aiState.stuckTimer += 1;
          }
      };

      tryMove('x', p.vx); 
      tryMove('y', p.vy);
      
      p.x = Math.max(0, Math.min(CANVAS_WIDTH - p.width, p.x)); 
      p.y = Math.max(0, Math.min(CANVAS_HEIGHT - p.height, p.y));

      for (let i = powerUpsRef.current.length - 1; i >= 0; i--) { 
          if (checkAABB(p, powerUpsRef.current[i])) { applyPowerUp(p, powerUpsRef.current[i]); powerUpsRef.current.splice(i, 1); } 
      }

      const hasUltimate = p.fragments >= MAX_FRAGMENTS, canShoot = p.shootCooldown <= 0 && (hasUltimate || (!p.isReloading && p.ammo > 0));
      if (wantsToShoot && canShoot) {
        const isUsingUltimate = hasUltimate; p.shootCooldown = p.baseShootCooldown;
        if (p.isBot && p.difficulty) p.shootCooldown = Math.floor(p.shootCooldown * AI_CONFIG[p.difficulty].shootRateMult);
        p.recoil = 8; playSound('shoot');
        if (isUsingUltimate) p.fragments = 0; else p.ammo--;
        const tank = TANK_CLASSES.find(t => t.id === p.tankId) || TANK_CLASSES[0];
        let bulletSpeed = tank.bulletSpeed * (p.buffSpeedTimer > 0 ? 1.2 : 1) * (isUsingUltimate ? 2.5 : 1);
        if (p.isBot && !isUsingUltimate) bulletSpeed *= 0.8;
        let bulletSize = (p.buffSizeTimer > 0 ? tank.bulletSize * 2.5 : tank.bulletSize);
        if (isUsingUltimate) bulletSize = 65; 
        let baseDamage = isUsingUltimate ? 20 : tank.bulletDamage, bulletDamage = baseDamage * (p.buffDamageTimer > 0 ? 2 : 1);
        const angle = p.direction * (Math.PI / 4), dirX = Math.sin(angle), dirY = -Math.cos(angle), baseOffset = p.width * 0.6 + bulletSize * 0.5;
        let spawnX = (p.x + p.width/2) + (dirX * baseOffset) - bulletSize/2, spawnY = (p.y + p.height/2) + (dirY * baseOffset) - bulletSize/2;
        for (let offset = baseOffset; offset >= p.width * 0.5; offset -= 5) { const cx = (p.x + p.width/2) + (dirX * offset) - bulletSize/2, cy = (p.y + p.height/2) + (dirY * offset) - bulletSize/2; if (!checkWallCollision({ x: cx, y: cy, width: bulletSize, height: bulletSize }, currentWallsRef.current)) { spawnX = cx; spawnY = cy; break; } }
        bulletsRef.current.push({ id: Math.random().toString(36), x: spawnX, y: spawnY, vx: dirX * bulletSpeed, vy: dirY * bulletSpeed, ownerId: p.id, team: p.team, width: bulletSize, height: bulletSize, damage: bulletDamage, bouncesLeft: (p.buffRicochetTimer > 0 || isUsingUltimate) ? 1 : 0, color: isUsingUltimate ? '#ec4899' : p.color, isUltimate: isUsingUltimate, isDoubleDamage: p.buffDamageTimer > 0 });
        const mx = (p.x + p.width/2) + (dirX * p.width * 0.6), my = (p.y + p.height/2) + (dirY * p.width * 0.6);
        spawnParticle(mx, my, 'smoke', '#ccc', 3, 2); spawnParticle(mx, my, 'muzzle', '#ffff00', 1, 0);
        if (isUsingUltimate) { spawnParticle(mx, my, 'shockwave', '#ec4899', 1, 0); shakeTimerRef.current = 8; }
      }
    });
  };

  const updateBullets = () => {
    for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
      const b = bulletsRef.current[i];
      const steps = Math.ceil(Math.max(Math.abs(b.vx), Math.abs(b.vy)) / 5), stepVx = b.vx / steps, stepVy = b.vy / steps;
      let destroyed = false;
      if (!b.isUltimate && frameRef.current % 3 === 0) spawnParticle(b.x + b.width/2, b.y + b.height/2, 'smoke', b.color, 1, 0.2);
      for (let s = 0; s < steps; s++) {
        b.x += stepVx; if (b.isUltimate && s % 2 === 0) spawnParticle(b.x + b.width/2, b.y + b.height/2, 'smoke', b.color, 1, 0.5);
        if (checkWallCollision(b, currentWallsRef.current)) { if (b.bouncesLeft > 0) { b.x -= stepVx; b.vx = -b.vx; b.bouncesLeft--; playSound('hit'); spawnParticle(b.x + (b.vx > 0 ? b.width : 0), b.y + b.height/2, 'spark', b.color, 3); } else destroyed = true; } 
        else if (b.bouncesLeft > 0) { if (b.x < 0) { b.x = 0; b.vx = -b.vx; b.bouncesLeft--; playSound('hit'); } else if (b.x + b.width > CANVAS_WIDTH) { b.x = CANVAS_WIDTH - b.width; b.vx = -b.vx; b.bouncesLeft--; playSound('hit'); } }
        if (!destroyed) {
            b.y += stepVy;
            if (checkWallCollision(b, currentWallsRef.current)) { if (b.bouncesLeft > 0) { b.y -= stepVy; b.vy = -b.vy; b.bouncesLeft--; playSound('hit'); spawnParticle(b.x + b.width/2, b.y + (b.vy > 0 ? b.height : 0), 'spark', b.color, 3); } else destroyed = true; } 
            else if (b.bouncesLeft > 0) { if (b.y < 0) { b.y = 0; b.vy = -b.vy; b.bouncesLeft--; playSound('hit'); } else if (b.y + b.height > CANVAS_HEIGHT) { b.y = CANVAS_HEIGHT - b.height; b.vy = -b.vy; b.bouncesLeft--; playSound('hit'); } }
        }
        if (!destroyed) {
            for (const p of playersRef.current) {
                if (p.hp > 0 && p.team !== b.team && checkAABB(b, p)) {
                    destroyed = true;
                    if (p.hasShield) { p.hasShield = false; playSound('shield_break'); spawnParticle(b.x + b.width/2, b.y + b.height/2, 'shockwave', '#22d3ee', 3, 2); spawnFloatingText(p.x + p.width/2, p.y - 40, TEXT_DICTIONARY[language].shield_broken, "#22d3ee"); break; }
                    p.hp = Math.max(0, p.hp - b.damage); playSound('hurt'); spawnParticle(b.x + b.width/2, b.y + b.height/2, 'spark', b.color, 15, 3);
                    spawnFloatingText(p.x + p.width/2, p.y - 40, `-${b.damage}`, p.color);
                    if (p.hp <= 0) {
                        playSound('explosion'); spawnTankExplosion(p);
                        const aliveTeams = new Set(playersRef.current.filter(pl => pl.hp > 0).map(pl => pl.team));
                        if (aliveTeams.size <= 1 && gameOverTimeoutRef.current === null) {
                            const delay = b.isUltimate ? 3000 : 2000, winningTeam = aliveTeams.has(0) ? 0 : 1;
                            if (gameMode === GameMode.PVE) winningTeam === 0 ? playSound('mission_success') : playSound('mission_fail'); else playSound('win');
                            saveMatchStats(winningTeam);
                            gameOverTimeoutRef.current = window.setTimeout(() => { setGameState(prev => ({ ...prev, status: GameStatus.GAME_OVER, winner: winningTeam })); gameOverTimeoutRef.current = null; }, delay);
                        }
                    } else if (!b.isUltimate) playSound('explosion');
                    break;
                }
            }
        }
        if (destroyed) break;
      }
      if (destroyed || b.x < 0 || b.x > CANVAS_WIDTH || b.y < 0 || b.y > CANVAS_HEIGHT) {
        if (destroyed && b.isUltimate) {
            playSound('ultimate_impact'); shakeTimerRef.current = 50; const cx = b.x + b.width/2, cy = b.y + b.height/2;
            spawnParticle(cx, cy, 'flash', '#fff', 1); spawnParticle(cx, cy, 'shockwave', '#ec4899', 6, 6); spawnParticle(cx, cy, 'debris', '#ec4899', 60, 10); spawnParticle(cx, cy, 'smoke', '#222', 30, 8);
            playersRef.current.forEach(victim => { if (victim.hp > 0 && victim.team !== b.team) { if (getDistance(cx, cy, victim.x + victim.width/2, victim.y + victim.height/2) <= 180) { if (victim.hasShield) { victim.hasShield = false; playSound('shield_break'); spawnFloatingText(victim.x + victim.width/2, victim.y - 40, TEXT_DICTIONARY[language].shield_broken, "#22d3ee"); } else { victim.hp = Math.max(0, victim.hp - 15); spawnFloatingText(victim.x + victim.width/2, victim.y - 30, `-15`, '#ec4899'); playSound('hurt'); if (victim.hp <= 0) { playSound('explosion'); spawnTankExplosion(victim); } } } } });
        } else if (destroyed) spawnParticle(b.x + b.width/2, b.y + b.height/2, 'spark', b.color, 5);
        bulletsRef.current.splice(i, 1);
      }
    }
  };

  const applyPowerUp = (p: Player, pu: PowerUp) => {
    playSound('powerup');
    const dict = TEXT_DICTIONARY[language]; let msg = dict[pu.type] || "POWER UP";
    const info = ((t) => ({ hex: t==='HEAL'?'#22c55e':t==='DAMAGE'?'#a855f7':t==='RICOCHET'?'#3b82f6':t==='SPEED'?'#eab308':t==='SIZE'?'#ef4444':t==='SHIELD'?'#22d3ee':t==='AMMO'?'#fb923c':'#ec4899' }))(pu.type);
    switch (pu.type) {
      case 'HEAL': p.hp = Math.min(p.maxHp, p.hp + 3); break;
      case 'DAMAGE': p.buffDamageTimer = BUFF_DURATION; break;
      case 'RICOCHET': p.buffRicochetTimer = BUFF_DURATION; break;
      case 'SPEED': p.buffSpeedTimer = BUFF_DURATION; break;
      case 'SIZE': p.buffSizeTimer = BUFF_DURATION; break;
      case 'SHIELD': p.hasShield = true; break;
      case 'AMMO': p.ammo = p.maxAmmo; p.isReloading = false; p.reloadTimer = 0; break;
      case 'FRAGMENT':
        if (p.fragments < MAX_FRAGMENTS) {
            p.fragments++; msg = `${p.fragments}/${MAX_FRAGMENTS} ${dict.FRAGMENT}`; 
            if (p.fragments >= MAX_FRAGMENTS) { 
                playSound('ultimate'); if (ultimateAnnounceTimeoutRef.current) clearTimeout(ultimateAnnounceTimeoutRef.current);
                setUltimateAnnounce({ text: dict.ult_ready, subtext: `${p.name} ${dict.ult_charge}`, color: p.color }); 
                ultimateAnnounceTimeoutRef.current = window.setTimeout(() => { setUltimateAnnounce(null); ultimateAnnounceTimeoutRef.current = null; }, 3000);
            }
        } else msg = dict.full_energy;
        break;
    }
    spawnParticle(p.x + p.width/2, p.y + p.height/2, 'spark', info.hex, 20);
    spawnFloatingText(p.x + p.width/2, p.y - 40, msg, info.hex);
  };

  const updateGame = useCallback(() => {
    frameRef.current++; if (shakeTimerRef.current > 0) shakeTimerRef.current--;
    if (gameTimeRef.current >= nextSpeedUpTimeRef.current) {
        nextSpeedUpTimeRef.current += SPAWN_SPEED_UP_INTERVAL;
        if (currentSpawnIntervalRef.current > MIN_SPAWN_INTERVAL) {
             currentSpawnIntervalRef.current = Math.max(MIN_SPAWN_INTERVAL, currentSpawnIntervalRef.current - SPAWN_SPEED_STEP);
             setNotification(TEXT_DICTIONARY[language].supply_speed_up);
             setTimeout(() => setNotification(null), 3000);
             playSound('notification');
        }
    }
    spawnTimerRef.current -= FIXED_TIMESTEP_MS;
    if (spawnTimerRef.current <= 0) { spawnTimerRef.current = currentSpawnIntervalRef.current; spawnPowerUp(); }
    const now = Date.now();
    for (let i = powerUpsRef.current.length - 1; i >= 0; i--) { if (now > powerUpsRef.current[i].despawnTime) { spawnParticle(powerUpsRef.current[i].x + powerUpsRef.current[i].width/2, powerUpsRef.current[i].y + powerUpsRef.current[i].height/2, 'smoke', '#fff', 5); powerUpsRef.current.splice(i, 1); } }
    updatePlayers(); updateBullets();
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i]; if (p.gravity) p.vy += p.gravity; p.x += p.vx; p.y += p.vy;
      if (p.bounce) { if (p.y > CANVAS_HEIGHT - 10) { p.y = CANVAS_HEIGHT - 10; p.vy *= -p.bounce; p.vx *= 0.8; } if (checkWallCollision({x:p.x-p.size/2, y:p.y-p.size/2, width:p.size, height:p.size}, currentWallsRef.current)) { p.y -= p.vy; p.vy *= -p.bounce; p.vx *= 0.8; } }
      if (p.vr) p.rotation = (p.rotation || 0) + p.vr; p.life--; p.vx *= (p.drag || 0.95); p.vy *= (p.drag || 0.95); if (p.life <= 0) particlesRef.current.splice(i, 1);
    }
    for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) { const ft = floatingTextsRef.current[i]; ft.life--; ft.y += ft.vy; if (ft.life <= 0) floatingTextsRef.current.splice(i, 1); }
    setUiPlayers(playersRef.current.filter(p => p.team === 0)); setUiEnemies(playersRef.current.filter(p => p.team === 1));
  }, [gameState.status, playSound, language, startCountdown, isPaused, p1ControlScheme, p2ControlScheme, activeMapId, saveMatchStats, keyBindings]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let animationFrameId: number;
    const render = () => {
      const now = performance.now(); let dt = now - (lastTimeRef.current || now); lastTimeRef.current = now; if (dt > 100) dt = 100; 
      if (gameState.status === GameStatus.PLAYING && !isPaused && (startCountdown === null || startCountdown === 0)) { accumulatorRef.current += dt; while (accumulatorRef.current >= FIXED_TIMESTEP_MS) { updateGame(); accumulatorRef.current -= FIXED_TIMESTEP_MS; gameTimeRef.current += FIXED_TIMESTEP_MS; } }
      renderGame(ctx, { mapId: activeMapId, players: playersRef.current, bullets: bulletsRef.current, powerUps: powerUpsRef.current, particles: particlesRef.current, floatingTexts: floatingTextsRef.current, shakeIntensity: shakeTimerRef.current });
      animationFrameId = requestAnimationFrame(render);
    };
    render(); return () => cancelAnimationFrame(animationFrameId);
  }, [gameState.status, updateGame, startCountdown, isPaused, activeMapId]);

  const createPlayer = (id: number, cfg: any, start: any, name: string, color: string, team: number, isBot: boolean, diff?: Difficulty): Player => {
      let { maxHp, speed } = cfg;
      if (isBot && diff) { const mods = AI_CONFIG[diff]; maxHp = Math.round(maxHp * mods.hpMult); speed *= mods.speedMult; if (pvePlayerCount === 2) maxHp = Math.round(maxHp * COOP_DIFFICULTY_MULT.hp); }
      return { id, name, tankId: cfg.id, x: start.x - cfg.width/2, y: start.y - cfg.height/2, vx: 0, vy: 0, width: cfg.width, height: cfg.height, hp: maxHp, maxHp, speed, direction: start.dir, color, team, isBot, difficulty: diff, ammo: cfg.maxAmmo, maxAmmo: cfg.maxAmmo, reloadTimer: 0, isReloading: false, baseReloadTime: cfg.reloadTime, shootCooldown: 0, baseShootCooldown: cfg.shootCooldown, hasShield: false, recoil: 0, buffDamageTimer: 0, buffRicochetTimer: 0, buffSpeedTimer: 0, buffSizeTimer: 0, fragments: 0, score: 0, rotationCooldown: 0 };
  };

  const handleStartGame = useCallback(() => {
    playSound('select'); initAudio(); setIsPaused(false); setUltimateAnnounce(null); setNotification(null); shakeTimerRef.current = 0;
    if (gameOverTimeoutRef.current) clearTimeout(gameOverTimeoutRef.current);
    if (ultimateAnnounceTimeoutRef.current) clearTimeout(ultimateAnnounceTimeoutRef.current);
    
    const getTank = (id: string) => (TANK_CLASSES.find(t => t.id === id) || TANK_CLASSES[0]);
    const resolveTank = (id: string) => { if (id === 'random') { const available = TANK_CLASSES.filter(t => !t.isBotOnly); return available[Math.floor(Math.random() * available.length)]; } return getTank(id); };
    const resolveMap = (id: string) => id === 'random' ? MAPS[Math.floor(Math.random() * MAPS.length)] : (MAPS.find(m => m.id === id) || MAPS[0]);
    
    const mapCfg = resolveMap(mapId); 
    setActiveMapId(mapCfg.id); 
    currentWallsRef.current = mapCfg.walls; 
    const dict = TEXT_DICTIONARY[language];
    bulletsRef.current = []; particlesRef.current = []; powerUpsRef.current = []; floatingTextsRef.current = []; playersRef.current = [];

    let p1Pos = { ...mapCfg.p1Start };
    let p2Pos = { ...mapCfg.p2Start };
    let enemySpawns = [...mapCfg.botStarts[difficulty.toLowerCase() as keyof typeof mapCfg.botStarts]];

    if (gameMode === GameMode.PVE && pvePlayerCount === 2) {
        // 双人 PVE 时，P2 出生在 P1 附近（左侧），稍微错开位置
        p2Pos = { 
            ...mapCfg.p1Start, 
            y: mapCfg.p1Start.y + 60, 
            dir: mapCfg.p1Start.dir 
        };
        // 稍微调整 P1 位置，避免完全重叠
        p1Pos = {
            ...mapCfg.p1Start,
            y: mapCfg.p1Start.y - 20
        };
        
        // 边界检查，防止出生在墙外
        if (p1Pos.y < 50) { p1Pos.y = 50; p2Pos.y = 110; }
        if (p2Pos.y > CANVAS_HEIGHT - 50) { p2Pos.y = CANVAS_HEIGHT - 50; p1Pos.y = CANVAS_HEIGHT - 110; }
        
        // 敌人位置保持在右侧 (botStarts 默认就是右侧)，无需任何修改
    }

    const p1Cfg = resolveTank(p1TankId); 
    playersRef.current.push(createPlayer(0, p1Cfg, p1Pos, p1Name || dict.p1, p1Color, 0, false));
    
    if (gameMode === GameMode.PVP) { 
        const p2Cfg = resolveTank(p2TankId); 
        playersRef.current.push(createPlayer(1, p2Cfg, p2Pos, p2Name || dict.p2, p2Color, 1, false)); 
    }
    else { 
        if (pvePlayerCount === 2) { 
             const p2Cfg = resolveTank(p2TankId); 
             playersRef.current.push(createPlayer(1, p2Cfg, p2Pos, p2Name || dict.p2, p2Color, 0, false)); 
        }
        
        const spawnEnemy = (idx: number, typeId: string, name: string) => { 
            const sp = enemySpawns[idx % enemySpawns.length]; 
            const cfg = getTank(typeId); 
            playersRef.current.push(createPlayer(2 + idx, cfg, sp, name, '#ef4444', 1, true, difficulty)); 
        };
        if (difficulty === Difficulty.EASY) { spawnEnemy(0, 'bot_drone', 'Drone Alpha'); spawnEnemy(1, 'bot_drone', 'Drone Beta'); }
        else if (difficulty === Difficulty.MEDIUM) { spawnEnemy(0, 'bot_sentinel', 'Sentinel Prime'); spawnEnemy(1, 'bot_drone', 'Drone Alpha'); spawnEnemy(2, 'bot_drone', 'Drone Beta'); }
        else { spawnEnemy(0, 'bot_destroyer', 'THE DESTROYER'); spawnEnemy(1, 'bot_sentinel', 'Sentinel Alpha'); spawnEnemy(2, 'bot_sentinel', 'Sentinel Beta'); spawnEnemy(3, 'bot_drone', 'Drone Scout'); }
    }
    frameRef.current = 0; gameTimeRef.current = 0; accumulatorRef.current = 0; spawnTimerRef.current = SPAWN_INTERVAL; currentSpawnIntervalRef.current = SPAWN_INTERVAL; nextSpeedUpTimeRef.current = SPAWN_SPEED_UP_INTERVAL;
    setGameState({ status: GameStatus.PLAYING, winner: null }); setStartCountdown(3); setUiPlayers(playersRef.current.filter(p => p.team === 0)); setUiEnemies(playersRef.current.filter(p => p.team === 1));
  }, [p1TankId, p2TankId, mapId, p1Name, p2Name, p1Color, p2Color, gameMode, difficulty, pvePlayerCount, language, initAudio, playSound]);

  return (
    <div className="w-full h-screen bg-black flex flex-col select-none overflow-hidden font-sans" onContextMenu={e => e.preventDefault()}>
        {gameState.status === GameStatus.PLAYING && (
            <GameHUD 
                gameMode={gameMode} 
                pvePlayerCount={pvePlayerCount} 
                uiPlayers={uiPlayers} 
                uiEnemies={uiEnemies} 
                gameTime={gameTimeRef.current} 
                activeMap={MAPS.find(m => m.id === activeMapId)} 
                language={language} 
                theme={theme} 
                onSettingsClick={togglePause}
            />
        )}
        <div className="flex-1 relative overflow-hidden bg-slate-950">
            <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
            {gameState.status === GameStatus.PLAYING && (
                <>
                    {startCountdown !== null && (
                        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                            <div className="text-[140px] font-black italic text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.8)] animate-pulse" style={{ WebkitTextStroke: '4px black' }}>
                                {startCountdown > 0 ? startCountdown : TEXT_DICTIONARY[language].fight}
                            </div>
                        </div>
                    )}
                    {ultimateAnnounce && (
                        <div className="absolute top-1/4 left-0 w-full flex flex-col items-center justify-center z-40 pointer-events-none animate-in fade-in zoom-in duration-300">
                             <h2 className="text-6xl font-black italic uppercase tracking-tighter text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.9)] mb-1" style={{ color: ultimateAnnounce.color, WebkitTextStroke: '3px black' }}>{ultimateAnnounce.text}</h2>
                             <div className="text-2xl font-black text-center text-white tracking-[0.4em] animate-pulse" style={{ WebkitTextStroke: '1px black' }}>{ultimateAnnounce.subtext}</div>
                        </div>
                    )}
                    {notification && (
                        <div className="absolute top-10 left-0 w-full flex justify-center z-40 pointer-events-none animate-in slide-in-from-top-10 fade-in duration-500">
                             <div className="text-yellow-400 font-black text-3xl uppercase tracking-wider flex items-center gap-3 drop-shadow-[0_0_15px_rgba(0,0,0,1)]" style={{ WebkitTextStroke: '2px black' }}>
                                 <Zap size={32} fill="currentColor" /> {notification}
                             </div>
                        </div>
                    )}
                </>
            )}
        </div>
        <Controls gameStatus={gameState.status} winner={gameState.winner} tanks={TANK_CLASSES} maps={MAPS} p1TankId={p1TankId} setP1TankId={setP1TankId} p2TankId={p2TankId} setP2TankId={setP2TankId} mapId={mapId} setMapId={setMapId} onStartGame={handleStartGame} onRestart={handleStartGame} onQuit={handleQuit} onGoToSelect={handleGoToSelect} isMusicOn={isMusicOn} toggleMusic={toggleMusic} language={language} toggleLanguage={toggleLanguage} isPaused={isPaused} togglePause={togglePause} p1Name={p1Name} setP1Name={setP1Name} p2Name={p2Name} setP2Name={setP2Name} p1Color={p1Color} setP1Color={setP1Color} p2Color={p2Color} setP2Color={setP2Color} gameMode={gameMode} difficulty={difficulty} setDifficulty={setDifficulty} pvePlayerCount={pvePlayerCount} setPvePlayerCount={setPvePlayerCount} targetResolution={targetResolution} setTargetResolution={setTargetResolution} gameScale={gameScale} p1ControlScheme={p1ControlScheme} toggleP1ControlScheme={toggleP1ControlScheme} p2ControlScheme={p2ControlScheme} toggleP2ControlScheme={toggleP2ControlScheme} theme={theme} toggleTheme={toggleTheme} keyBindings={keyBindings} setKeyBindings={handleSetKeyBindings} />
    </div>
  );
};
export default App;
