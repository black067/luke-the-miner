/* ============================================================
   TYPES.TS — Shared type definitions for 星环矿工 MVP
   ============================================================ */

export interface QualityDef { name: string; color: string; weight: number; affixCount: number; hasMechanic: boolean; }
export type QualityKey = 'common' | 'rare' | 'epic' | 'legend' | 'mythic';
export interface BaseModule { id: string; name: string; icon: string; type: string; quality: string; desc: string; priceBtc?: number; mechanic?: string; qty?: number; atk?: number; magazine?: number; dmgMult?: number; durability?: number; extraSlots?: number; scatterAngle?: number; fireInterval?: number; carryMax?: number; effect?: string; value?: number; buffId?: string; slot?: string; [key: string]: unknown; }
export interface WeaponModule extends BaseModule { type: 'weapon'; atk: number; scatterAngle: number; fireInterval: number; }
export interface BallModule extends BaseModule { type: 'ball'; magazine: number; dmgMult: number; durability: number; }
export interface StorageModule extends BaseModule { type: 'storage'; extraSlots: number; }
export interface AccessoryModule extends BaseModule { type: 'accessory'; mechanic: string; }
export type EquipModule = WeaponModule | BallModule | StorageModule | AccessoryModule;
export interface ItemDef extends BaseModule { type: 'consumable' | 'item'; carryMax: number; }
export interface MaterialDef extends BaseModule { type: 'material'; }
export interface OreDef { id: string; name: string; icon: string; price: number; desc: string; }
export interface BuffDef { name: string; icon: string; duration: number; stackMode: 'longest' | 'strongest' | 'coexist'; desc: string; }
export interface UpgradeCost { materials?: Array<{ id: string; qty: number }>; btc?: number; cash?: number; }
export interface UpgradeEffect { hp?: number; fuel?: number; speed?: number; cargo?: number; accSlot?: number; special?: string; }
export interface UpgradeNode { id: string; label: string; cost: UpgradeCost; effect: UpgradeEffect; req: string | null; desc?: string; }
export interface UpgradeBranch { name: string; icon: string; description: string; nodes: UpgradeNode[]; }
export type EnemyBehavior = 'hover' | 'zigzag' | 'static' | 'dive' | 'boss' | 'chase' | 'drift' | 'orbital';
export type EnemyShape = 'diamond' | 'hexagon' | 'circle' | 'square' | 'rect';
export interface EnemyDef { id: string; name: string; icon: string; hp: number; dmg: number; speed: number; w: number; h: number; behavior: EnemyBehavior; desc: string; mechanic?: string; shape: EnemyShape; fillColor: string; detailColor: string; strokeColor?: string; flashColor?: string; showHpBar?: boolean; }
export interface WaveGroup { type: string; count: number; interval: number; }
export interface WaveDef { index: number; name: string; boss?: boolean; enemies: WaveGroup[]; }
export interface AreaDef { id: string; name: string; difficulty: string; difficultyStars: number; locked: boolean; specialResource: string; resourceGoal: number; waves: number; desc: string; }
export interface MailDef { id: string; from: string; subject: string; body: string; read?: boolean; }
export interface ShopRef { ref: string; type: string; }
export interface UgOrder { id: string; want: string; wantMatId: string; wantQty: number; rewardCash: number; desc: string; }
export interface MechanicDef { name: string; desc: string; allowedSlots: string[]; }
export interface AffixDef { id: string; name: string; min: number; max: number; step: number; format: string; }
export interface CombatConstants { VW: number; VH: number; WALL_MARGIN: number; SHIP_W: number; SHIP_H: number; SHIP_Y: number; SHIP_BASE_HP: number; SHIP_BASE_FUEL: number; SHIP_SPEED: number; SHIP_INVINCIBLE_S: number; SHIP_ENTRY_TIME: number; PB_RADIUS: number; PB_SPEED: number; PB_SPEED_MULT: number; PB_SPEED_CAP: number; PB_DURABILITY_DEFAULT: number; PB_FIRE_INTERVAL_DEFAULT: number; ENEMY_W: number; ENEMY_H: number; BOSS_W: number; BOSS_H: number; FUEL_DRAIN: number; FUEL_MOVE_DRAIN: number; FUEL_DROP_THRESHOLD: number; FUEL_DROP_FLOOR: number; FUEL_DROP_CHANCE_BASIC: number; FUEL_MAX_BLOCKS: number; FUEL_RESTORE: number; FUEL_BLOCK_RADIUS: number; FUEL_GHOST_SPEED: number; CARGO_BASE_SIZE: number; QUICK_BAR_SLOTS: number; DEBT_RATIO: number; COMBO_TIMEOUT: number; COMBO_THRESHOLDS: number[]; COMBO_MULTIPLIERS: number[]; COMBO_COLORS: string[]; SCATTER_DEFAULT: number; SHAKE_HIT: number; SHAKE_DAMAGE: number; SHAKE_BOSS: number; SHAKE_LASER: number; SHAKE_NO_AMMO: number; }
export interface GameData { QUALITY: Record<QualityKey, QualityDef>; WEAPONS: WeaponModule[]; BALLS: BallModule[]; STORAGES: StorageModule[]; ACCESSORY_POOL: AccessoryModule[]; AFFIX_POOL: AffixDef[]; ITEMS: ItemDef[]; MATERIALS: MaterialDef[]; ORES: OreDef[]; BUFFS: Record<string, BuffDef>; UPGRADES: Record<string, UpgradeBranch>; ENEMIES: Record<string, EnemyDef>; WAVES: WaveDef[]; AREAS: AreaDef[]; MAILS: MailDef[]; SHOP_ITEMS: ShopRef[]; UG_SHOP_ITEMS: ShopRef[]; UG_ORDERS: UgOrder[]; MECHANICS: Record<string, MechanicDef>; COMBAT: CombatConstants; }
export interface QuickBarSlot { itemId: string | null; qty: number; }
export interface Equipment { weapon: WeaponModule | null; ball: BallModule | null; storage: StorageModule | null; accessories: (AccessoryModule | null)[]; }
export interface Unlocks { radioRepaired: boolean; undergroundVisible: boolean; areas: Record<string, boolean>; }
export interface GameSettings { masterVolume: number; bgmVolume: number; sfxVolume: number; crtFilter: number; uiScale: number; language: string; clippyAgent: string; shakeIntensity: number; }
export interface AudioState { sfxCache: { randomFactor: number; }; }
export interface WarehouseItem extends BaseModule { qty: number; priceBtc?: number; carryMax?: number; }
export interface GameStateObj { screen: string; settingsReturn: string; isNewGame: boolean; debt: number; bitcoin: number; cash: number; selectedArea: string; combatResult: string | null; firstCombat: boolean; equipment: Equipment; quickBar: QuickBarSlot[]; warehouse: WarehouseItem[]; upgrades: Set<string>; unlocks: Unlocks; mailsRead: Record<string, boolean>; settings: GameSettings; audio: AudioState; }
export interface CombatShip { x: number; y: number; hp: number; fuel: number; invincibleTimer: number; cannonAngle: number; entryTimer: number; thrustX: number; thrustY: number; godMode: boolean; }
export interface Pinball { x: number; y: number; vx: number; vy: number; durability: number; speedMult: number; }
export interface CombatEnemy { x: number; y: number; vx: number; vy: number; hp: number; maxHp: number; w: number; h: number; def: EnemyDef; isBoss: boolean; behavior: EnemyBehavior; mechanic: string | null; shieldCount: number; splitChildren: boolean; laserTimer: number; phase: number; flashTimer: number; }
export interface FuelBlock { x: number; y: number; vx: number; vy: number; state: 'solid' | 'ghost' | 'collected'; }
export interface CombatBuff { id: string; timer: number; value: number; }
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }
export interface DmgNumber { x: number; y: number; text: string; life: number; color: string | null; }
export interface SpawnEntry { type: string; def: EnemyDef; interval: number; }
export interface CombatWave { index: number; name: string; spawnQueue: SpawnEntry[]; spawnTimer: number; bossSpawned: boolean; allSpawned: boolean; }
export interface CombatStats { killed: number; hits: number; shots: number; oreValue: number; resourceCollected: number; hpLost?: number; time?: number; cargo: unknown[]; fuelDepleted?: boolean; }
export interface CombatPreview { p1: { x: number; y: number } | null; p2: { x: number; y: number } | null; targetHit: number; }
export interface LaserBeam { x: number; y: number; dirX: number; dirY: number; life: number; warnDuration: number; fired: boolean; dmg: number; owner: CombatEnemy | null; }
export interface CombatState { state: 'idle' | 'playing' | 'paused' | 'victory' | 'defeat' | 'breakdown' | 'evacuate'; areaId: string; ship: CombatShip; pinballs: Pinball[]; ammo: number; fireCooldown: number; enemies: CombatEnemy[]; fuelBlocks: FuelBlock[]; buffs: CombatBuff[]; wave: CombatWave; particles: Particle[]; dmgNumbers: DmgNumber[]; laserBeams: LaserBeam[]; combatToast: { msg: string; life: number }; ammoShake: number; mouse: { x: number; y: number }; mouseDown: boolean; stats: CombatStats; shakeTimer: number; shakeMagnitude: number; preview: CombatPreview; keys: Record<string, boolean>; _startTime: number; _hudBtns: unknown[]; _hoveredBtn: unknown; _tutorialShown: boolean; comboCount: number; comboTimer: number; comboActive: boolean; }
export type CombatResult = 'victory' | 'defeat' | 'breakdown' | 'evacuate';
export interface WhSelection { source: 'warehouse' | 'quickbar' | 'equip'; index?: number; slot?: number; slotKey?: string; }
export interface UgPositions { [key: string]: Array<{ x: number; y: number }>; }
export interface UgSelection { key: string; idx: number; node: UpgradeNode; pos: { x: number; y: number }; }
export interface ResolvedShopItem extends BaseModule { slotType?: string | null; }
export interface CombatCanvasGlobals { VW: number; VH: number; WALL: { left: number; right: number; top: number; bottom: number }; COMBAT_DATA: CombatConstants; C: CombatState; preview: CombatPreview; getGunPos(): { x: number; y: number }; }
