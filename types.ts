
/**
 * Game Status Enumeration
 */
export enum GameStatus {
  MENU = 'MENU',
  CHARACTER_SELECT = 'CHARACTER_SELECT',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export enum GameMode {
  PVP = 'PVP',
  PVE = 'PVE'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export enum AIBehaviorState {
  PATROL = 'PATROL',
  CHASE = 'CHASE',
  FIRE = 'FIRE',
  EVADE = 'EVADE',
  GET_ITEM = 'GET_ITEM'
}

export type ThemeId = 'default' | 'christmas';

export enum Direction {
  UP = 0,
  UP_RIGHT = 1,
  RIGHT = 2,
  DOWN_RIGHT = 3,
  DOWN = 4,
  DOWN_LEFT = 5,
  LEFT = 6,
  UP_LEFT = 7
}

export enum PowerUpType {
  HEAL = 'HEAL',
  DAMAGE = 'DAMAGE',
  RICOCHET = 'RICOCHET',
  SPEED = 'SPEED',
  SIZE = 'SIZE',
  FRAGMENT = 'FRAGMENT',
  SHIELD = 'SHIELD',
  AMMO = 'AMMO'
}

export interface TankConfig {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  icon?: any;
  isBotOnly?: boolean;
  maxHp: number;
  speed: number;
  width: number;
  height: number;
  shootCooldown: number;
  maxAmmo: number;
  reloadTime: number;
  bulletSpeed: number;
  bulletSize: number;
  bulletDamage: number;
  bulletColor?: string;
}

export interface MapConfig {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  backgroundColor: string;
  gridColor: string;
  isOutdoor?: boolean;
  walls: Wall[];
  p1Start: { x: number, y: number, dir: Direction };
  p2Start: { x: number, y: number, dir: Direction };
  botStarts: {
      easy: { x: number, y: number, dir: Direction }[];
      medium: { x: number, y: number, dir: Direction }[];
      hard: { x: number, y: number, dir: Direction }[];
  };
}

export interface Player {
  id: number;
  name: string;
  tankId: string;
  color: string;
  team: number;
  isBot: boolean;
  difficulty?: Difficulty;
  aiState?: {
      currentState: AIBehaviorState;
      stateTimer: number;
      targetId: number | null;
      targetItemId: string | null;
      lastTargetSelectTime: number;
      
      // 路径规划
      path: { x: number, y: number }[];
      currentWaypointIndex: number;
      globalTargetPos: { x: number, y: number } | null;
      lastPathRecalcFrame: number;

      patrolDir: { dx: number, dy: number };
      patrolTarget?: { x: number, y: number } | null;
      evadeDir: { dx: number, dy: number };

      // 道具决策节奏
      lastItemCheckFrame?: number;
      wantsItemUntilFrame?: number;
      
      lastPos: { x: number, y: number };
      stuckTimer: number;
      fireCheckTimer?: number;
      // Fixed: Updated to match return type of updateAI in utils/ai.ts
      lastDecision?: { 
          dx: number; 
          dy: number; 
          wantsToShoot: boolean;
          aimDir?: Direction;
          hasAimLOS?: boolean;
          canHitNow?: boolean;
          shouldHoldForAim?: boolean;
      };
  };
  x: number;
  y: number;
  vx: number; // 水平速度（惯性用）
  vy: number; // 垂直速度（惯性用）
  width: number;
  height: number;
  direction: Direction;
  speed: number;
  recoil: number;
  rotationCooldown: number;
  hp: number;
  maxHp: number;
  hasShield: boolean;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  reloadTimer: number;
  baseReloadTime: number;
  shootCooldown: number;
  baseShootCooldown: number;
  buffDamageTimer: number;
  buffRicochetTimer: number;
  buffSpeedTimer: number;
  buffSizeTimer: number;
  fragments: number;
  score: number;
}

export interface Bullet {
  id: string;
  ownerId: number;
  team: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
  bouncesLeft: number;
  color: string;
  isUltimate?: boolean;
  isDoubleDamage?: boolean;
}

export interface PowerUp {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  width: number;
  height: number;
  spawnTime: number;
  despawnTime: number;
}

export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'spark' | 'smoke' | 'debris' | 'shockwave' | 'muzzle' | 'flash' | 'turret';
  drag?: number;
  rotation?: number;
  vr?: number;
  gravity?: number;
  bounce?: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
}

export interface GameState {
  status: GameStatus;
  winner: number | null;
}

export interface MatchRecord {
  id: string;
  mode: GameMode;
  difficulty?: Difficulty;
  playerCount: number;
  mapId: string;
  winner: number;
  time: number;
  date: number;
  p1Name: string;
  p2Name?: string;
}

export interface GameStats {
  matchHistory: MatchRecord[];
  pveBestTimes: Record<string, Record<string, Record<number, number>>>;
  pveSoloClearsByDiff: Record<string, number>;
  pveDuoClearsByDiff: Record<string, number>;
  pveGlobalBestSolo?: Record<string, number>;
  pveGlobalBestDuo?: Record<string, number>;
  pveSoloClears?: number;
  pveDuoClears?: number;
}

export interface PlayerKeyBindings {
  up: string;
  down: string;
  left: string;
  right: string;
  fire: string;
  reload: string;
}

export interface KeyBindings {
  p1: PlayerKeyBindings;
  p2: PlayerKeyBindings;
}
