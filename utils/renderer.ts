
import { Player, Bullet, Wall, PowerUp, Particle, FloatingText, PowerUpType, Direction } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TANK_CLASSES, MAPS, POWERUP_INFO, MAX_FRAGMENTS, TANK_VISUALS } from '../constants';

// SVG Path Data for PowerUps (Lucide Icons)
const ICON_PATHS: Record<PowerUpType, string> = {
    [PowerUpType.HEAL]: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
    [PowerUpType.DAMAGE]: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    [PowerUpType.RICOCHET]: "M9 14L4 9l5-5 M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11",
    [PowerUpType.SPEED]: "M6 17L11 12L6 7 M13 17L18 12L13 7", 
    [PowerUpType.SIZE]: "M8 3H5a2 2 0 0 0-2 2v3 M21 8V5a2 2 0 0 0-2-2h-3 M3 16v3a2 2 0 0 0 2 2h3 M16 21h3a2 2 0 0 0 2-2v-3",
    [PowerUpType.SHIELD]: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10",
    [PowerUpType.AMMO]: "M2 17L12 22L22 17 M2 12L12 17L22 12 M12 2L2 7L12 12L22 7L12 2",
    [PowerUpType.FRAGMENT]: "M20 13a9 9 0 1 0 -18 0a9 9 0 0 0 18 0 M22 2l-7 7", 
};

const drawPowerUpIcon = (ctx: CanvasRenderingContext2D, type: PowerUpType, color: string) => {
    const pathString = ICON_PATHS[type];
    if (!pathString) return;
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.save(); ctx.scale(0.75, 0.75); ctx.translate(-12, -12); 
    const p = new Path2D(pathString);
    ctx.stroke(p);
    ctx.restore();
};

const drawTank = (ctx: CanvasRenderingContext2D, p: Player) => {
    ctx.save();
    ctx.translate(p.x + p.width/2, p.y + p.height/2);

    // 1. Shield Effect
    if (p.hasShield) { 
        ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 20; ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 3; 
        ctx.beginPath(); ctx.arc(0, 0, p.width * 1.1, 0, Math.PI*2); ctx.stroke(); 
    }

    // 2. Rotate Chassis
    ctx.rotate(p.direction * (Math.PI / 4));
    ctx.shadowColor = p.color; ctx.shadowBlur = 15;

    // 3. Render Tank using SVG Paths from constants
    // The paths are defined for a ~100x100 viewport (-50 to 50). 
    // We scale them to fit the player's actual width/height.
    const visual = TANK_VISUALS[p.tankId] || TANK_VISUALS['assault'];
    
    // Scale factor: The SVGs are approx 100 wide (-50 to 50).
    // If player width is 40, we scale by 40/100 = 0.4
    const scale = p.width / 100;
    ctx.scale(scale, scale);

    // Draw Treads (Darker)
    ctx.fillStyle = '#334155';
    ctx.fill(new Path2D(visual.treads));

    // Draw Body (Player Color)
    ctx.fillStyle = p.color;
    ctx.lineWidth = 2 / scale; // Keep stroke constant width regardless of scale
    ctx.strokeStyle = '#1e293b'; // Slate 800
    ctx.stroke(new Path2D(visual.body));
    ctx.fill(new Path2D(visual.body));

    // 4. Turret Rendering
    // Turret Recoil
    ctx.save();
    // Adjust recoil for scale (recoil is in pixels, we are scaled)
    ctx.translate(0, p.recoil / scale); 

    // Draw Barrel (Dark Grey)
    ctx.fillStyle = '#475569';
    ctx.stroke(new Path2D(visual.barrel));
    ctx.fill(new Path2D(visual.barrel));

    // Draw Turret (Lighter Grey)
    ctx.fillStyle = '#94a3b8';
    ctx.stroke(new Path2D(visual.turret));
    ctx.fill(new Path2D(visual.turret));

    // Draw Detail (Player Color Accent)
    if (visual.detail) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.8;
        ctx.fill(new Path2D(visual.detail));
        ctx.globalAlpha = 1.0;
    }

    ctx.restore(); // End Recoil
    ctx.restore(); // End Player Transform
    
    // 5. Overhead Status Indicators
    // - Reload Bar (Highest level)
    if (p.isReloading) { 
        ctx.fillStyle='#000'; ctx.fillRect(p.x, p.y-28, p.width, 4); 
        ctx.fillStyle='#fb923c'; ctx.fillRect(p.x+1, p.y-27, (p.width-2)*(1-p.reloadTimer/p.baseReloadTime), 2); 
    }
    
    // - Ammo Pips (Middle level) - Hidden for Bots as requested
    if (!p.isReloading && !p.isBot) {
        if (p.maxAmmo <= 30) {
            const pipGap = 1.5;
            const pipWidth = (p.width - (p.maxAmmo - 1) * pipGap) / p.maxAmmo;
            for (let i = 0; i < p.maxAmmo; i++) {
                ctx.fillStyle = i < p.ammo ? '#fde047' : 'rgba(0,0,0,0.4)';
                ctx.fillRect(p.x + i * (pipWidth + pipGap), p.y - 20, pipWidth, 4);
            }
        } else {
            // Very high ammo (like barrage) uses a continuous bar to avoid clutter
            ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(p.x, p.y - 20, p.width, 4);
            ctx.fillStyle='#fde047'; ctx.fillRect(p.x, p.y - 20, p.width * (p.ammo / p.maxAmmo), 4);
        }
    }

    // - HP Bar (Lower level)
    ctx.fillStyle='#000'; ctx.fillRect(p.x, p.y-12, p.width, 6);
    ctx.fillStyle=p.hp/p.maxHp > 0.25 ? '#22c55e' : '#ef4444'; ctx.fillRect(p.x+1, p.y-11, (p.width-2)*(p.hp/p.maxHp), 4);
};

const drawBullet = (ctx: CanvasRenderingContext2D, b: Bullet) => {
    ctx.save(); 
    ctx.translate(b.x + b.width/2, b.y + b.height/2);
    if (b.isUltimate) {
         ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI/2);
         ctx.fillStyle = b.color;
         ctx.beginPath(); ctx.arc(0, -b.height/2, b.width/2, Math.PI, 0); ctx.fill();
         ctx.fillRect(-b.width/2, -b.height/2, b.width, b.height);
    } else {
        ctx.beginPath(); ctx.arc(0, 0, b.width/2, 0, Math.PI*2); ctx.fillStyle = b.color; 
        ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
    }
    ctx.restore();
};

const drawParticle = (ctx: CanvasRenderingContext2D, p: Particle) => {
    ctx.save(); 
    ctx.globalAlpha = p.life/p.maxLife; 
    ctx.translate(p.x, p.y);
    if (p.rotation) ctx.rotate(p.rotation);
    ctx.fillStyle=p.color;
    if (p.type === 'debris' || p.type === 'turret') ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
    else { ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI*2); ctx.fill(); }
    ctx.restore();
};

const drawBackground = (ctx: CanvasRenderingContext2D, mapId: string) => {
    const currentMap = MAPS.find(m => m.id === mapId) || MAPS[0];
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = currentMap?.backgroundColor || '#1e293b';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = currentMap?.gridColor || '#334155'; ctx.lineWidth = 1; ctx.globalAlpha = 0.2;
    ctx.beginPath();
    for (let x=0; x<=CANVAS_WIDTH; x+=40) { ctx.moveTo(x,0); ctx.lineTo(x,CANVAS_HEIGHT); }
    for (let y=0; y<=CANVAS_HEIGHT; y+=40) { ctx.moveTo(0,y); ctx.lineTo(CANVAS_WIDTH,y); }
    ctx.stroke(); ctx.globalAlpha = 1.0;
    ctx.fillStyle = currentMap?.gridColor || '#475569';
    currentMap.walls.forEach(w => { ctx.fillRect(w.x, w.y, w.width, w.height); });
};

export const renderGame = (
    ctx: CanvasRenderingContext2D,
    gameState: {
        mapId: string,
        players: Player[],
        bullets: Bullet[],
        powerUps: PowerUp[],
        particles: Particle[],
        floatingTexts: FloatingText[],
        shakeIntensity: number
    }
) => {
    drawBackground(ctx, gameState.mapId);
    ctx.save();
    if (gameState.shakeIntensity > 0) {
        ctx.translate((Math.random()-0.5)*gameState.shakeIntensity*2, (Math.random()-0.5)*gameState.shakeIntensity*2);
    }

    gameState.powerUps.forEach(p => {
        const info = POWERUP_INFO[p.type];
        const hex = info ? info.hex : '#ffffff';
        ctx.save(); ctx.translate(p.x + p.width/2, p.y + p.height/2);
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.strokeStyle = hex; ctx.lineWidth = 2; ctx.stroke();
        drawPowerUpIcon(ctx, p.type, hex);
        ctx.restore();
    });

    gameState.players.forEach(p => { if (p.hp > 0) drawTank(ctx, p); });
    gameState.bullets.forEach(b => drawBullet(ctx, b));
    gameState.particles.forEach(p => drawParticle(ctx, p));

    // Floating Text - Optimized to single plain layer
    gameState.floatingTexts.forEach(ft => {
        ctx.save();
        ctx.translate(ft.x, ft.y);
        ctx.globalAlpha = ft.life > 20 ? 1 : ft.life / 20;
        ctx.font = "900 32px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = ft.color;
        // No stroke, no shadow - as requested
        ctx.fillText(ft.text, 0, 0);
        ctx.restore();
    });

    ctx.restore();
};
