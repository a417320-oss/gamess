
import { TankConfig, MapConfig, PowerUpType, Direction, Difficulty, ThemeId, KeyBindings } from './types';
import { Target, Box, ZapOff, Crosshair, ShieldCheck, Ghost, Heart, Zap, CornerUpLeft, ChevronsRight, Maximize, Shield, Layers, Bomb, Cpu, Bot, Skull, Eye, GripVertical, Activity } from 'lucide-react';

export const GAME_VERSION = "1.9.3";

// ==========================================
// TANK VISUAL DEFINITIONS (SVG PATHS)
// ViewBox is effectively -50 to 50 centered
// ==========================================
export const TANK_VISUALS: Record<string, { body: string; treads: string; turret: string; barrel: string; detail?: string }> = {
    assault: {
        treads: "M-35 -40 H-15 V40 H-35 Z M15 -40 H35 V40 H15 Z", // Left & Right Treads
        body: "M-20 -35 H20 V35 H-20 Z", // Main Hull
        barrel: "M-6 -55 H6 V-10 H-6 Z", // Medium Barrel
        turret: "M-14 -15 H14 V15 H-14 Z", // Rect Turret
        detail: "M-8 -8 H8 V8 H-8 Z" // Hatch
    },
    heavy: {
        treads: "M-42 -42 H-22 V42 H-42 Z M22 -42 H42 V42 H22 Z", // Wide Treads
        body: "M-28 -35 H28 L35 0 L28 35 H-28 L-35 0 Z", // Octagon-ish
        barrel: "M-10 -45 H10 V-15 H-10 Z", // Thick Short Barrel
        turret: "M-20 -20 H20 V20 H-20 Z", // Large Turret
        detail: "M-12 -12 H12 V12 H-12 Z"
    },
    scout: {
        treads: "M-25 -20 L-35 30 H-15 Z M25 -20 L35 30 H15 Z", // Angled Wheels/Pods
        body: "M0 -40 L25 35 H-25 Z", // Arrowhead
        barrel: "M-3 -45 H3 V-10 H-3 Z", // Thin Barrel
        turret: "M0 -10 A 12 12 0 0 1 0 14 A 12 12 0 0 1 0 -10", // Round small turret
    },
    sniper: {
        treads: "M-35 -40 H-20 V40 H-35 Z M20 -40 H35 V40 H20 Z", // Stabilizers
        body: "M-20 10 H20 V35 H-20 Z M-20 -35 H20 V-15 H-20 Z M-8 -15 H8 V10 H-8 Z", // U-Shape Frame
        barrel: "M-4 -70 H4 V-10 H-4 Z M-6 -10 H6 V0 H-6 Z", // Long Rifle
        turret: "M-12 -12 H12 V12 H-12 Z", // Small Box
        detail: "M0 -5 L0 5 M-5 0 L5 0" // Crosshair mark
    },
    titan: {
        treads: "M-40 -30 A 10 10 0 0 0 -40 30 V-30 M40 -30 A 10 10 0 0 1 40 30 V-30", // Covered Treads
        body: "M0 -40 A 40 40 0 1 1 -0.1 -40", // Circular Dome
        barrel: "M-12 -45 H12 V-20 H-12 Z", // Stubby Cannon
        turret: "M0 -25 A 25 25 0 1 1 -0.1 -25", // Inner Dome
    },
    phantom: {
        treads: "M-30 10 L-40 35 H-15 Z M30 10 L40 35 H15 Z", // Rear wings/thrusters
        body: "M0 -45 L30 15 L0 40 L-30 15 Z", // Diamond Stealth
        barrel: "M-2 -50 H2 V-10 H-2 Z", // Hidden Barrel
        turret: "M0 -15 L10 5 L0 15 L-10 5 Z", // Small Diamond
    },
    barrage: {
        treads: "M-40 -35 H-25 V35 H-40 Z M25 -35 H40 V35 H25 Z",
        body: "M-25 -20 H25 V20 H-25 Z", // Wide Body
        barrel: "M-14 -40 H-10 V-15 H-14 Z M-4 -40 H0 V-15 H-4 Z M6 -40 H10 V-15 H6 Z", // Multi-barrel (Gatling)
        turret: "M-18 -15 H18 V10 H-18 Z", // Wide Turret
    },
    vector: {
        treads: "M-30 -40 L-30 40 L-20 30 L-20 -30 Z M30 -40 L30 40 L20 30 L20 -30 Z", // Hover Pontoons
        body: "M-10 -20 H10 V20 H-10 Z", // Core
        barrel: "M-2 -55 H2 V-10 H-2 Z M-8 -40 H-6 V-10 H-8 Z M6 -40 H8 V-10 H6 Z", // Railgun Rails
        turret: "M-8 -8 H8 V8 H-8 Z",
        detail: "M0 -4 L4 0 L0 4 L-4 0 Z" // Core Crystal
    },
    // AI Bots
    bot_drone: {
        treads: "M-15 15 L-25 30 L-10 30 Z M15 15 L25 30 L10 30 Z", // Wings
        body: "M0 -25 L20 10 L0 5 L-20 10 Z", // Drone shape
        barrel: "M-2 -30 H2 V-10 H-2 Z",
        turret: "M0 -5 A 5 5 0 1 1 0.1 -5",
    },
    bot_sentinel: {
        treads: "M-35 -30 H-20 V30 H-35 Z M20 -30 H35 V30 H20 Z",
        body: "M-20 -25 H20 V25 H-20 Z",
        barrel: "M-8 -35 H8 V-10 H-8 Z",
        turret: "M-15 -15 H15 V15 H-15 Z",
    },
    bot_destroyer: {
        treads: "M-50 -50 H-30 V50 H-50 Z M30 -50 H50 V50 H30 Z",
        body: "M-30 -40 H30 V40 H-30 Z",
        barrel: "M-15 -60 H15 V-20 H-15 Z",
        turret: "M-25 -25 H25 V25 H-25 Z",
        detail: "M-10 -10 H10 V10 H-10 Z" // Red Eye
    }
};

// ==========================================
// THEME CONFIGURATION
// ==========================================
export const THEMES: Record<ThemeId, {
    bgGradient: string;
    panelBg: string;
    panelBorder: string;
    textMain: string;
    textDim: string;
    textAccent: string;
    primaryBtn: string;
    secondaryBtn: string;
    hudBg: string;
}> = {
    default: {
        bgGradient: 'from-slate-900 via-[#0f172a] to-blue-950/40',
        panelBg: 'bg-slate-900/80',
        panelBorder: 'border-slate-700',
        textMain: 'text-white',
        textDim: 'text-slate-400',
        textAccent: 'text-blue-400',
        primaryBtn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20',
        secondaryBtn: 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700',
        hudBg: 'bg-slate-900 border-slate-700',
    },
    christmas: {
        bgGradient: 'from-red-950 via-green-950 to-slate-900',
        panelBg: 'bg-red-950/90',
        panelBorder: 'border-yellow-500/50',
        textMain: 'text-yellow-100',
        textDim: 'text-red-200',
        textAccent: 'text-green-400',
        primaryBtn: 'bg-green-700 hover:bg-green-600 text-white shadow-green-500/20 border-2 border-yellow-500/30',
        secondaryBtn: 'bg-red-900/60 hover:bg-red-800 text-red-100 border-red-700',
        hudBg: 'bg-red-950 border-yellow-600/50',
    }
};

// ==========================================
// CORE ENGINE CONSTANTS
// ==========================================
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const FPS = 60;
export const FIXED_TIMESTEP_MS = 1000 / FPS;

export const BUFF_DURATION = 900; 
export const POWERUP_LIFESPAN = 12000; 
export const MAX_FRAGMENTS = 3;
export const SPAWN_INTERVAL = 4500;
export const MIN_SPAWN_INTERVAL = 1500;
export const SPAWN_SPEED_UP_INTERVAL = 45000; 
export const SPAWN_SPEED_STEP = 1000;

export const DEFAULT_KEYBINDINGS: KeyBindings = {
    p1: {
        up: 'w',
        down: 's',
        left: 'a',
        right: 'd',
        fire: ' ',
        reload: 'r'
    },
    p2: {
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',
        fire: 'Enter',
        reload: '+'
    }
};

// Player Colors
export const PLAYER_COLORS = [
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#84cc16', // Lime
];

export const RESOLUTIONS = [
    { label: "1280 x 720 (HD)", w: 1280, h: 720 },
    { label: "1920 x 1080 (FHD)", w: 1920, h: 1080 },
    { label: "1600 x 900 (HD+)", w: 1600, h: 900 },
    { label: "1366 x 768 (Laptop)", w: 1366, h: 768 },
    { label: "2560 x 1440 (2K)", w: 2560, h: 1440 },
];

export const POWER_UP_POOL = [
  PowerUpType.HEAL, PowerUpType.DAMAGE, PowerUpType.RICOCHET, PowerUpType.SPEED, PowerUpType.SIZE, PowerUpType.SHIELD, PowerUpType.AMMO, PowerUpType.FRAGMENT, PowerUpType.FRAGMENT, PowerUpType.FRAGMENT, PowerUpType.FRAGMENT, PowerUpType.FRAGMENT
];

export const AI_CONFIG = {
    [Difficulty.EASY]: { hpMult: 1.0, damageMult: 1.0, speedMult: 0.55, shootRateMult: 3.0, reactionTime: 30 },
    [Difficulty.MEDIUM]: { hpMult: 1.5, damageMult: 1.3, speedMult: 0.7, shootRateMult: 2.2, reactionTime: 15 },
    [Difficulty.HARD]: { hpMult: 0.8, damageMult: 1.0, speedMult: 0.8, shootRateMult: 1.5, reactionTime: 5 }
};

export const COOP_DIFFICULTY_MULT = { hp: 1.5, damage: 1.2 };

export const TANK_CLASSES: TankConfig[] = [
  { 
    id: 'assault', name: 'Assault', nameZh: '突击手', icon: Target, 
    maxHp: 16, speed: 3.5, width: 40, height: 40, 
    shootCooldown: 12, maxAmmo: 12, reloadTime: 180, 
    bulletSpeed: 9.5, bulletSize: 7, bulletDamage: 2, bulletColor: '#fbbf24', 
    description: 'Balanced stats. The gold standard.', 
    descriptionZh: '属性均衡，标准作战单位。' 
  },
  { 
    id: 'heavy', name: 'Heavy', nameZh: '重装甲', icon: Shield, 
    maxHp: 32, speed: 2.2, width: 52, height: 52, 
    shootCooldown: 35, maxAmmo: 5, reloadTime: 300, 
    bulletSpeed: 8, bulletSize: 14, bulletDamage: 5, bulletColor: '#f97316', 
    description: 'High HP & Damage, very slow.', 
    descriptionZh: '极高血量与单发伤害，机动性差。' 
  },
  { 
    id: 'scout', name: 'Scout', nameZh: '侦察兵', icon: Zap, 
    maxHp: 10, speed: 5.2, width: 30, height: 30, 
    shootCooldown: 5, maxAmmo: 25, reloadTime: 120, 
    bulletSpeed: 11, bulletSize: 4, bulletDamage: 1, bulletColor: '#38bdf8', 
    description: 'Speedster. Low DMG, high fire rate.', 
    descriptionZh: '极速移动，高射速刮痧，身板脆弱。' 
  },
  { 
    id: 'sniper', name: 'Sniper', nameZh: '狙击手', icon: Crosshair, 
    maxHp: 12, speed: 3.0, width: 38, height: 38, 
    shootCooldown: 65, maxAmmo: 3, reloadTime: 240, 
    bulletSpeed: 24, bulletSize: 5, bulletDamage: 7, bulletColor: '#4ade80', 
    description: 'Fast bullets, high damage. Aim carefully.', 
    descriptionZh: '极快弹速，超高伤害，射击间隔长。' 
  },
  { 
    id: 'titan', name: 'Titan', nameZh: '泰坦', icon: ShieldCheck, 
    maxHp: 40, speed: 1.8, width: 58, height: 58, 
    shootCooldown: 50, maxAmmo: 10, reloadTime: 360, 
    bulletSpeed: 5.5, bulletSize: 28, bulletDamage: 4, bulletColor: '#8b5cf6', 
    description: 'Tankiest unit. Chance to ricochet.', 
    descriptionZh: '血量之王。每次受击有30%几率弹开子弹。' 
  },
  { 
    id: 'phantom', name: 'Phantom', nameZh: '幽灵', icon: Ghost, 
    maxHp: 9, speed: 5.5, width: 32, height: 32, 
    shootCooldown: 9, maxAmmo: 8, reloadTime: 150, 
    bulletSpeed: 13, bulletSize: 5, bulletDamage: 3, bulletColor: '#d1d5db', 
    description: 'Fastest unit. High burst, very fragile.', 
    descriptionZh: '全场最快。高爆发刺客，极其脆弱。' 
  },
  { 
    id: 'barrage', name: 'Barrage', nameZh: '弹幕', icon: GripVertical, 
    maxHp: 18, speed: 2.6, width: 46, height: 46, 
    shootCooldown: 4, maxAmmo: 60, reloadTime: 360, 
    bulletSpeed: 8.5, bulletSize: 5, bulletDamage: 1, bulletColor: '#f43f5e', 
    description: 'Suppressing fire. Huge clip, long reload.', 
    descriptionZh: '火力压制。超大弹夹，但装填极慢。' 
  },
  { 
    id: 'vector', name: 'Vector', nameZh: '矢量', icon: Activity, 
    maxHp: 14, speed: 4.2, width: 36, height: 36, 
    shootCooldown: 22, maxAmmo: 6, reloadTime: 160, 
    bulletSpeed: 18, bulletSize: 4, bulletDamage: 3, bulletColor: '#6366f1', 
    description: 'Precision railgun. Fast reload.', 
    descriptionZh: '高精度电磁炮，弹道平直，装填快。' 
  },
  // AI Bots - Adjusted to match new power levels
  { id: 'bot_drone', name: 'Drone', nameZh: '蜂群无人机', icon: Eye, isBotOnly: true, maxHp: 5, speed: 4.5, width: 32, height: 32, shootCooldown: 15, maxAmmo: 20, reloadTime: 100, bulletSpeed: 6, bulletSize: 5, bulletDamage: 1, bulletColor: '#84cc16', description: 'Fragile AI Drone.', descriptionZh: '脆弱的巡逻无人机。' },
  { id: 'bot_sentinel', name: 'Sentinel', nameZh: '重装哨兵', icon: Bot, isBotOnly: true, maxHp: 28, speed: 2.0, width: 44, height: 44, shootCooldown: 18, maxAmmo: 12, reloadTime: 200, bulletSpeed: 7, bulletSize: 9, bulletDamage: 2, bulletColor: '#eab308', description: 'Standard AI Unit.', descriptionZh: '标准战斗单位。' },
  { id: 'bot_destroyer', name: 'Destroyer', nameZh: '末日毁灭者', icon: Skull, isBotOnly: true, maxHp: 80, speed: 1.6, width: 64, height: 64, shootCooldown: 10, maxAmmo: 50, reloadTime: 300, bulletSpeed: 7.5, bulletSize: 32, bulletDamage: 3, bulletColor: '#ef4444', description: 'Elite Boss Unit.', descriptionZh: '精英级BOSS单位。' }
];

export const MAPS: MapConfig[] = [
    { id: 'echo_valley', name: 'Echo Valley', nameZh: '回声峡谷', description: 'Two distinct hills with cover.', descriptionZh: '双子高地，掩体丰富。', backgroundColor: '#475569', gridColor: '#64748b', isOutdoor: true, p1Start: { x: 100, y: 360, dir: Direction.RIGHT }, p2Start: { x: 1180, y: 360, dir: Direction.LEFT }, botStarts: { easy: [{ x: 1150, y: 150, dir: Direction.LEFT }, { x: 1150, y: 550, dir: Direction.LEFT }], medium: [{ x: 880, y: 360, dir: Direction.LEFT }, { x: 1150, y: 200, dir: Direction.LEFT }, { x: 1150, y: 520, dir: Direction.LEFT }], hard: [{ x: 880, y: 360, dir: Direction.LEFT }, { x: 850, y: 200, dir: Direction.LEFT }, { x: 850, y: 520, dir: Direction.LEFT }, { x: 1150, y: 360, dir: Direction.LEFT }], }, walls: [ { x: 0, y: 0, width: 1280, height: 14 }, { x: 0, y: 706, width: 1280, height: 14 }, { x: 0, y: 0, width: 14, height: 720 }, { x: 1266, y: 0, width: 14, height: 720 }, { x: 200, y: 180, width: 20, height: 360 }, { x: 200, y: 180, width: 160, height: 20 }, { x: 200, y: 520, width: 160, height: 20 }, { x: 1060, y: 180, width: 20, height: 360 }, { x: 920, y: 180, width: 160, height: 20 }, { x: 920, y: 520, width: 160, height: 20 }, { x: 570, y: 290, width: 140, height: 140 }, ] },
    { id: 'iron_maze', name: 'Iron Labyrinth', nameZh: '钢铁迷宫', description: 'Complex corridors.', descriptionZh: '复杂的巷战走廊。', backgroundColor: '#3f3f46', gridColor: '#52525b', isOutdoor: false, p1Start: { x: 60, y: 60, dir: Direction.RIGHT }, p2Start: { x: 1220, y: 660, dir: Direction.LEFT }, botStarts: { easy: [{ x: 1160, y: 120, dir: Direction.LEFT }, { x: 1160, y: 580, dir: Direction.LEFT }], medium: [{ x: 1160, y: 360, dir: Direction.LEFT }, { x: 960, y: 150, dir: Direction.LEFT }, { x: 960, y: 580, dir: Direction.LEFT }], hard: [{ x: 1160, y: 360, dir: Direction.LEFT }, { x: 960, y: 150, dir: Direction.LEFT }, { x: 960, y: 550, dir: Direction.LEFT }, { x: 1000, y: 360, dir: Direction.LEFT }], }, walls: [ { x: 0, y: 0, width: 1280, height: 14 }, { x: 0, y: 706, width: 1280, height: 14 }, { x: 0, y: 0, width: 14, height: 720 }, { x: 1266, y: 0, width: 14, height: 720 }, { x: 200, y: 100, width: 20, height: 460 }, { x: 400, y: 230, width: 20, height: 330 }, { x: 630, y: 100, width: 20, height: 330 }, { x: 860, y: 230, width: 20, height: 330 }, { x: 1060, y: 100, width: 20, height: 460 }, { x: 400, y: 100, width: 250, height: 20 }, { x: 630, y: 600, width: 250, height: 20 }, ] },
    { id: 'crossroads', name: 'Crossroads', nameZh: '十字路口', description: 'Symmetrical tactical arena.', descriptionZh: '对称的战术竞技场。', backgroundColor: '#44403c', gridColor: '#57534e', isOutdoor: true, p1Start: { x: 100, y: 100, dir: Direction.RIGHT }, p2Start: { x: 1180, y: 620, dir: Direction.LEFT }, botStarts: { easy: [{ x: 1150, y: 100, dir: Direction.LEFT }, { x: 1150, y: 600, dir: Direction.LEFT }], medium: [{ x: 1100, y: 360, dir: Direction.LEFT }, { x: 1020, y: 600, dir: Direction.LEFT }, { x: 1120, y: 150, dir: Direction.LEFT }], hard: [{ x: 1100, y: 360, dir: Direction.LEFT }, { x: 1120, y: 130, dir: Direction.LEFT }, { x: 1120, y: 580, dir: Direction.LEFT }, { x: 1020, y: 360, dir: Direction.LEFT }], }, walls: [ { x: 0, y: 0, width: 1280, height: 14 }, { x: 0, y: 706, width: 1280, height: 14 }, { x: 0, y: 0, width: 14, height: 720 }, { x: 1266, y: 0, width: 14, height: 720 }, { x: 470, y: 350, width: 340, height: 20 }, { x: 630, y: 190, width: 20, height: 340 }, { x: 230, y: 230, width: 100, height: 20 }, { x: 230, y: 470, width: 100, height: 20 }, { x: 950, y: 230, width: 100, height: 20 }, { x: 950, y: 470, width: 100, height: 20 }, ] },
    { id: 'desert_dunes', name: 'Desert Dunes', nameZh: '黄沙荒漠', description: 'Open field with a central hill.', descriptionZh: '开阔地带，中央有沙丘掩体。', backgroundColor: '#78350f', gridColor: '#92400e', isOutdoor: true, p1Start: { x: 100, y: 100, dir: Direction.RIGHT }, p2Start: { x: 1180, y: 620, dir: Direction.LEFT }, botStarts: { easy: [{ x: 1180, y: 150, dir: Direction.LEFT }, { x: 1180, y: 550, dir: Direction.LEFT }], medium: [{ x: 1100, y: 360, dir: Direction.LEFT }, { x: 1100, y: 150, dir: Direction.LEFT }, { x: 1100, y: 550, dir: Direction.LEFT }], hard: [{ x: 1150, y: 360, dir: Direction.LEFT }, { x: 1180, y: 120, dir: Direction.LEFT }, { x: 1180, y: 600, dir: Direction.LEFT }, { x: 950, y: 360, dir: Direction.LEFT }], }, walls: [ { x: 0, y: 0, width: 1280, height: 14 }, { x: 0, y: 706, width: 1280, height: 14 }, { x: 0, y: 0, width: 14, height: 720 }, { x: 1266, y: 0, width: 14, height: 720 }, { x: 440, y: 290, width: 400, height: 140 }, { x: 200, y: 470, width: 50, height: 50 }, { x: 1030, y: 200, width: 50, height: 50 }, ] },
    { id: 'cyber_grid', name: 'Cyber Grid', nameZh: '赛博网格', description: 'Dense cover, close quarters.', descriptionZh: '密集掩体，近战肉搏。', backgroundColor: '#172554', gridColor: '#1e3a8a', isOutdoor: false, p1Start: { x: 60, y: 360, dir: Direction.RIGHT }, p2Start: { x: 1220, y: 360, dir: Direction.LEFT }, botStarts: { easy: [{ x: 1100, y: 250, dir: Direction.LEFT }, { x: 1100, y: 470, dir: Direction.LEFT }], medium: [{ x: 1150, y: 360, dir: Direction.LEFT }, { x: 1100, y: 250, dir: Direction.LEFT }, { x: 1100, y: 470, dir: Direction.LEFT }], hard: [{ x: 1150, y: 360, dir: Direction.LEFT }, { x: 1100, y: 250, dir: Direction.LEFT }, { x: 1100, y: 470, dir: Direction.LEFT }, { x: 950, y: 360, dir: Direction.LEFT }], }, walls: [ { x: 0, y: 0, width: 1280, height: 14 }, { x: 0, y: 706, width: 1280, height: 14 }, { x: 0, y: 0, width: 14, height: 720 }, { x: 1266, y: 0, width: 14, height: 720 }, ...Array.from({ length: 6 }).map((_, i) => ({ x: 200 + i * 160, y: 130, width: 40, height: 40 })), ...Array.from({ length: 6 }).map((_, i) => ({ x: 200 + i * 160, y: 550, width: 40, height: 40 })), ...Array.from({ length: 5 }).map((_, i) => ({ x: 280 + i * 160, y: 340, width: 40, height: 40 })), ] },
    { id: 'the_bridge', name: 'The Bridge', nameZh: '绝命桥', description: 'Two islands connected by a bridge.', descriptionZh: '两座孤岛，一桥相连。', backgroundColor: '#0f172a', gridColor: '#1e293b', isOutdoor: true, p1Start: { x: 100, y: 360, dir: Direction.RIGHT }, p2Start: { x: 1180, y: 360, dir: Direction.LEFT }, botStarts: { easy: [{ x: 1050, y: 360, dir: Direction.LEFT }, { x: 1150, y: 360, dir: Direction.LEFT }], medium: [{ x: 1000, y: 360, dir: Direction.LEFT }, { x: 1100, y: 360, dir: Direction.LEFT }, { x: 1200, y: 360, dir: Direction.LEFT }], hard: [{ x: 1120, y: 360, dir: Direction.LEFT }, { x: 980, y: 360, dir: Direction.LEFT }, { x: 1050, y: 360, dir: Direction.LEFT }, { x: 900, y: 360, dir: Direction.LEFT }], }, walls: [ { x: 0, y: 0, width: 1280, height: 14 }, { x: 0, y: 706, width: 1280, height: 14 }, { x: 0, y: 0, width: 14, height: 720 }, { x: 1266, y: 0, width: 14, height: 720 }, { x: 330, y: 0, width: 620, height: 300 }, { x: 330, y: 420, width: 620, height: 300 }, { x: 320, y: 0, width: 14, height: 300 }, { x: 320, y: 420, width: 14, height: 300 }, { x: 946, y: 0, width: 14, height: 300 }, { x: 946, y: 420, width: 14, height: 300 }, ] }
];

export const TEXT_DICTIONARY = {
  en: {
    title: "SUPER", subtitle: "TANK BATTLE",
    p1: "Player 1", p2: "Player 2",
    move: "to Move", shoot: "to Shoot",
    enter: "ENTER ARENA", config: "Battle Configuration",
    pvpMode: "PVP DUEL", pveMode: "PVE CHALLENGE",
    setupPve: "PVE SETUP", difficulty: "Difficulty", playerCount: "Players",
    easy: "EASY", medium: "MEDIUM", hard: "HARD",
    onePlayer: "1 Player", twoPlayers: "2 Players",
    random: "RANDOM", randomTank: "RANDOM TANK", randomMap: "RANDOM MAP",
    map: "Select Map", fight: "FIGHT!", win: "VICTORY", newMatch: "NEW MATCH", missionFailed: "MISSION FAILED", retry: "RETRY",
    moveLabel: "MOVE", fireLabel: "FIRE",
    manual: "Collection", stats: "Tank Stats", items: "Supply", ai_stats: "AI Units", close: "Close",
    paused: "GAME PAUSED", resume: "Resume Game", restart: "Restart Match",
    mainMenu: "Main Menu", options: "Options",
    selectMap: "Select Map", enterName: "Enter Name...",
    class: "Class", hp: "HP", speed: "Speed", bulletSpeed: "Bullet Spd",
    reload: "Reload Time", reloadAction: "Reload Clip", bulletSize: "Bullet Size", clip: "Ammo", fireRate: "Fire Rate", damage: "Damage", trait: "Trait", color: "Color", rate: "Rate",
    fullscreen: "Fullscreen", windowed: "Windowed", settings: "Settings", resolution: "Resolution",
    music: "Music", languageSelector: "Language",
    theme: "Theme", themeDefault: "Default (Sci-Fi)", themeChristmas: "Christmas",
    full_energy: "FULL ENERGY", ult_ready: "SUPER WEAPON READY", ult_charge: "SYSTEM ARMED!",
    shield_broken: "SHIELD BROKEN!", ult_fire: "WEAPON LAUNCH!",
    default_p1: "PLAYER 1", default_p2: "PLAYER 2", default_bot: "BOSS UNIT",
    reloading: "RELOADING...",
    vs: "VS", finish: "FINISH", time: "TIME", supply_speed_up: "SUPPLY DROP RATE INCREASED!",
    boss_dominated: "BOSS DOMINATED", mission_complete: "MISSION COMPLETE",
    player_1: "PLAYER 1", player_2: "PLAYER 2",
    ai_intel: "ENEMY INTEL",
    enemy_easy: "2x Drone Swarm",
    enemy_medium: "1x Sentinel + 2x Drones",
    enemy_hard: "1x Destroyer + 2x Sentinels + 1x Drone",
    controlScheme: "Controls", schemeDirectional: "Directional (Standard)", schemeTank: "Tank (WS Move/AD Turn)",
    solo: "Solo", duo: "Duo", fastest: "Fastest Clear",
    customizeControls: "Configure Controls",
    pressKey: "Press Key...",
    bindingTitle: "Key Bindings",
    ricochet_text: "RICOCHET",
    [PowerUpType.HEAL]: "+3 HP",
    [PowerUpType.DAMAGE]: "DOUBLE DAMAGE",
    [PowerUpType.RICOCHET]: "RICOCHET",
    [PowerUpType.SPEED]: "SPEED UP",
    [PowerUpType.SIZE]: "MEGA BULLETS",
    [PowerUpType.SHIELD]: "SHIELD",
    [PowerUpType.FRAGMENT]: "WEAPON PART",
    [PowerUpType.AMMO]: "AMMO REFILLED",
  },
  zh: {
    title: "超级", subtitle: "坦克大战",
    p1: "玩家 1", p2: "玩家 2",
    move: "移动", shoot: "射击",
    enter: "进入战场", config: "战斗配置",
    pvpMode: "玩家对战", pveMode: "人机挑战",
    setupPve: "挑战设置", difficulty: "难度选择", playerCount: "参战人数",
    easy: "简单", medium: "中等", hard: "困难",
    onePlayer: "单人作战", twoPlayers: "双人合作",
    random: "随机", randomTank: "随机坦克", randomMap: "随机地图",
    map: "选择地图", fight: "开始战斗！", win: "获胜", newMatch: "再来一局", missionFailed: "任务失败", retry: "重试挑战",
    moveLabel: "移动", fireLabel: "开火",
    manual: "图鉴", stats: "坦克参数", items: "补给图鉴", ai_stats: "敌方单位", close: "关闭",
    paused: "游戏暂停", resume: "继续游戏", restart: "重新开始",
    mainMenu: "返回主菜单", options: "选项",
    selectMap: "选择地图", enterName: "输入名字...",
    class: "型号", hp: "生命值", speed: "速度", bulletSpeed: "子弹速度",
    reload: "装填时间", reloadAction: "装填弹夹", bulletSize: "炮弹体积", clip: "弹夹容量", fireRate: "射速", damage: "伤害", trait: "特性", color: "颜色", rate: "射速",
    fullscreen: "全屏模式", windowed: "窗口模式", settings: "设置", resolution: "分辨率",
    music: "音乐", languageSelector: "语言",
    theme: "主题", themeDefault: "默认 (科幻)", themeChristmas: "圣诞",
    full_energy: "能量已满", ult_ready: "超级武器就绪", ult_charge: "系统充能完毕！",
    shield_broken: "护盾破碎！", ult_fire: "超级武器发射！",
    default_p1: "玩家 1", default_p2: "玩家 2", default_bot: "敌方 BOSS",
    reloading: "装填中...",
    vs: "对决", finish: "结束", time: "时间", supply_speed_up: "补给刷新速度提升！",
    boss_dominated: "BOSS 统治战场", mission_complete: "任务圆满完成",
    player_1: "玩家 1", player_2: "玩家 2",
    ai_intel: "敌军情报",
    enemy_easy: "2x 蜂群无人机 (高机动)",
    enemy_medium: "1x 重装哨兵 + 2x 无人机",
    enemy_hard: "1x 毁灭者BOSS + 2x 哨兵 + 1x 无人机",
    controlScheme: "操作模式", schemeDirectional: "方向模式 (推荐)", schemeTank: "坦克模式 (WS进退/AD转向)",
    solo: "单人", duo: "双人", fastest: "最快通关",
    customizeControls: "自定义按键",
    pressKey: "请按键...",
    bindingTitle: "按键绑定",
    ricochet_text: "跳弹",
    [PowerUpType.HEAL]: "+3 生命",
    [PowerUpType.DAMAGE]: "双倍伤害",
    [PowerUpType.RICOCHET]: "弹射子弹",
    [PowerUpType.SPEED]: "速度提升",
    [PowerUpType.SIZE]: "巨型炮弹",
    [PowerUpType.SHIELD]: "获得护盾",
    [PowerUpType.FRAGMENT]: "武器碎片",
    [PowerUpType.AMMO]: "弹药补满",
  }
};

export const POWERUP_INFO = {
    [PowerUpType.HEAL]: { 
        icon: Heart, hex: "#22c55e", color: "text-green-500", 
        labelEn: "Repair Orb", labelZh: "修复光球", 
        descEn: "Restores 3 HP immediately.", descZh: "立即恢复 3 点生命值。" 
    },
    [PowerUpType.DAMAGE]: { 
        icon: Zap, hex: "#a855f7", color: "text-purple-500", 
        labelEn: "Damage Amp", labelZh: "增伤模块", 
        descEn: "Bullets deal 2x damage (15s).", descZh: "子弹造成双倍伤害 (15秒)。" 
    },
    [PowerUpType.RICOCHET]: { 
        icon: CornerUpLeft, hex: "#3b82f6", color: "text-blue-500", 
        labelEn: "Ricochet Tech", labelZh: "弹射装置", 
        descEn: "Bullets bounce off walls once (15s).", descZh: "子弹击中墙壁时会反弹一次 (15秒)。" 
    },
    [PowerUpType.SPEED]: { 
        icon: ChevronsRight, hex: "#eab308", color: "text-yellow-500", 
        labelEn: "Turbo Engine", labelZh: "涡轮引擎", 
        descEn: "Movement speed increased by 50% (15s).", descZh: "移动速度增加 50% (15秒)。" 
    },
    [PowerUpType.SIZE]: { 
        icon: Maximize, hex: "#ef4444", color: "text-red-500", 
        labelEn: "Mega Core", labelZh: "巨型核心", 
        descEn: "Bullet size doubled (15s), easier to hit.", descZh: "炮弹体积翻倍 (15秒)，更容易命中敌人。" 
    },
    [PowerUpType.SHIELD]: { 
        icon: Shield, hex: "#22d3ee", color: "text-cyan-400", 
        labelEn: "Energy Shield", labelZh: "能量护盾", 
        descEn: "Blocks the next instance of damage completely (15s).", descZh: "完全免疫下一次受到的伤害 (15秒)。" 
    },
    [PowerUpType.AMMO]: { 
        icon: Layers, hex: "#fb923c", color: "text-orange-400", 
        labelEn: "Ammo Box", labelZh: "弹药补给", 
        descEn: "Instantly refills your ammo clip.", descZh: "立即填满当前的弹夹。" 
    },
    [PowerUpType.FRAGMENT]: { 
        icon: Bomb, hex: "#ec4899", color: "text-pink-500", 
        labelEn: "Super Weapon", labelZh: "超级武器", 
        descEn: "Collect 3 to unlock Super Weapon (20 DMG + Blast).", descZh: "收集 3 个解锁超级武器 (20伤害+范围爆炸)。" 
    },
};
