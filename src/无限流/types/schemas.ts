// Zod schemas 定义，用于数据验证和规范化

import { z } from 'zod';

// ==================== COC7 属性 Schema ====================
export const COC7AttributesSchema = z.object({
  STR: z.number().min(0).max(100).default(50),
  CON: z.number().min(0).max(100).default(50),
  SIZ: z.number().min(0).max(100).default(50),
  DEX: z.number().min(0).max(100).default(50),
  APP: z.number().min(0).max(100).default(50),
  INT: z.number().min(0).max(100).default(50),
  POW: z.number().min(0).max(100).default(50),
  EDU: z.number().min(0).max(100).default(50),
  LUK: z.number().min(0).max(100).default(50),
});

export type COC7AttributesType = z.infer<typeof COC7AttributesSchema>;

// ==================== 衍生属性 Schema ====================
export const DerivedStatsSchema = z.object({
  HP: z.number().min(0),
  maxHP: z.number().min(0),
  MP: z.number().min(0),
  maxMP: z.number().min(0),
  SAN: z.number().min(0).max(99),
  maxSAN: z.number().min(0).max(99),
  MOV: z.number().min(0),
  DB: z.string(),
  BUILD: z.number(),
});

export type DerivedStatsType = z.infer<typeof DerivedStatsSchema>;

// ==================== 肢体部位 Schema ====================
export const BodyPartDebuffSchema = z.object({
  type: z.string(),
  value: z.number(),
  description: z.string().optional(),
});

export const BodyPartStatusSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    parent: z.string().optional(),
    damage: z.number().min(0).max(100).default(0),
    debuffs: z.array(BodyPartDebuffSchema).default([]),
    children: z.array(BodyPartStatusSchema).optional(),
  }),
);

export type BodyPartStatusType = z.infer<typeof BodyPartStatusSchema>;

// ==================== 技能 Schema ====================
export const SkillSchema = z.object({
  name: z.string(),
  value: z.number().min(0).max(100),
  isOccupational: z.boolean().optional(),
});

// ==================== 物品 Schema ====================
export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  quantity: z.number().min(0).default(1),
  type: z.string().optional(),
});

export type ItemType = z.infer<typeof ItemSchema>;

// ==================== 角色 Schema ====================
export const BaseCharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().optional(),
  occupation: z.string().optional(),
  background: z.string().optional(),
  attributes: COC7AttributesSchema,
  derivedStats: DerivedStatsSchema,
  skills: z.record(z.string(), z.number()).transform(val => new Map(Object.entries(val))),
  bodyParts: z.array(BodyPartStatusSchema).default([]),
  inventory: z.array(ItemSchema).default([]),
  portrait: z.string().optional(),
});

export const PlayerCharacterSchema = BaseCharacterSchema.extend({
  type: z.literal('player'),
});

export const NPCCharacterSchema = BaseCharacterSchema.extend({
  type: z.literal('npc'),
  affection: z.number().min(0).max(100).default(50),
  isImportant: z.boolean().default(false),
  events: z.array(z.string()).default([]),
  relationship: z.string().optional(),
});

export const CharacterSchema = z.union([PlayerCharacterSchema, NPCCharacterSchema]);

export type CharacterType = z.infer<typeof CharacterSchema>;

// ==================== 立绘数据 Schema ====================
export const SpriteDataSchema = z.object({
  characterId: z.string(),
  url: z.string(),
  position: z.enum(['left', 'center', 'right', 'custom']),
  x: z.number().optional(),
  y: z.number().optional(),
  scale: z.number().default(1),
  opacity: z.number().min(0).max(1).default(1),
});

export type SpriteDataType = z.infer<typeof SpriteDataSchema>;

// ==================== 地图相关 Schema ====================
export const AreaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  background: z.string().optional(),
  connectedAreas: z.array(z.string()).default([]),
  events: z.array(z.string()).optional(),
  isDiscovered: z.boolean().default(false),
  isDangerous: z.boolean().optional(),
});

export type AreaType = z.infer<typeof AreaSchema>;

export const ConnectionSchema = z.object({
  from: z.string(),
  to: z.string(),
  isLocked: z.boolean().optional(),
  requirement: z.string().optional(),
});

export const MapDataSchema = z.object({
  areas: z.record(z.string(), AreaSchema).transform(val => new Map(Object.entries(val))),
  connections: z.array(ConnectionSchema).default([]),
  playerLocation: z.string(),
  startArea: z.string(),
});

export type MapDataType = z.infer<typeof MapDataSchema>;

// ==================== 副本相关 Schema ====================
export const CharacterInInstanceSchema = z.object({
  characterId: z.string(),
  character: CharacterSchema,
  isImportant: z.boolean().default(false),
  firstAppearance: z.string().optional(),
  lastSeen: z.string().optional(),
});

export const ImportantEventSchema = z.object({
  id: z.string(),
  summary: z.string(),
  timestamp: z.number(),
  location: z.string().optional(),
  involvedCharacters: z.array(z.string()).default([]),
  consequences: z.string().optional(),
});

export type ImportantEventType = z.infer<typeof ImportantEventSchema>;

export const InstanceRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  difficulty: z.number().min(1).max(5),
  worldSetting: z.string(),
  map: MapDataSchema,
  characters: z.array(CharacterInInstanceSchema).default([]),
  events: z.array(ImportantEventSchema).default([]),
  startTime: z.number(),
  endTime: z.number().optional(),
  ending: z.string().optional(),
  isActive: z.boolean().default(false),
  customPrompt: z.string().optional(),
});

export type InstanceRecordType = z.infer<typeof InstanceRecordSchema>;

// ==================== 战斗相关 Schema ====================
export const RollResultSchema = z.enum([
  'critical_success',
  'extreme_success',
  'hard_success',
  'success',
  'failure',
  'critical_failure',
]);

export const DiceRollSchema = z.object({
  roll: z.number().min(1).max(100),
  skill: z.number().min(0).max(100),
  result: RollResultSchema,
  skillName: z.string().optional(),
  timestamp: z.number(),
});

export type DiceRollType = z.infer<typeof DiceRollSchema>;

export const StatusEffectSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['buff', 'debuff']),
  description: z.string(),
  duration: z.number(),
  effect: z.object({
    attribute: z.string().optional(),
    modifier: z.number().optional(),
    damagePerRound: z.number().optional(),
  }),
});

export const EnemySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  attributes: COC7AttributesSchema,
  derivedStats: DerivedStatsSchema,
  skills: z.record(z.string(), z.number()).transform(val => new Map(Object.entries(val))),
  bodyParts: z.array(BodyPartStatusSchema).default([]),
  portrait: z.string().optional(),
  attackPattern: z.string().optional(),
  loot: z.array(ItemSchema).optional(),
});

export type EnemyType = z.infer<typeof EnemySchema>;

export const CombatActionSchema = z.object({
  type: z.enum(['attack', 'dodge', 'escape', 'special']),
  actorId: z.string(),
  targetId: z.string().optional(),
  attackType: z.enum(['melee', 'ranged', 'magic', 'special']).optional(),
  skillUsed: z.string().optional(),
  roll: DiceRollSchema.optional(),
  damage: z.number().optional(),
  bodyPartHit: z.string().optional(),
  description: z.string().optional(),
});

export const CombatRoundSchema = z.object({
  roundNumber: z.number(),
  actions: z.array(CombatActionSchema).default([]),
  timestamp: z.number(),
});

export const CombatParticipantSchema = z.object({
  id: z.string(),
  character: CharacterSchema.optional(),
  enemy: EnemySchema.optional(),
  isPlayer: z.boolean(),
  currentHP: z.number(),
  currentMP: z.number(),
  currentSAN: z.number(),
  statusEffects: z.array(StatusEffectSchema).default([]),
  initiative: z.number(),
});

export const CombatStateSchema = z.object({
  id: z.string(),
  participants: z.array(CombatParticipantSchema),
  currentRound: z.number().default(1),
  currentTurn: z.number().default(0),
  status: z.enum(['active', 'victory', 'defeat', 'escaped']),
  rounds: z.array(CombatRoundSchema).default([]),
  startTime: z.number(),
  environment: z.string().optional(),
});

export type CombatStateType = z.infer<typeof CombatStateSchema>;

// ==================== 对话相关 Schema ====================
export const DialogueDataSchema = z.object({
  speaker: z.string(),
  content: z.string(),
  timestamp: z.number(),
  characterId: z.string().optional(),
});

export type DialogueDataType = z.infer<typeof DialogueDataSchema>;

// ==================== 场景数据 Schema ====================
export const SceneDataSchema = z.object({
  background: z.string(),
  sprites: z.array(SpriteDataSchema).default([]),
  areaId: z.string().optional(),
  description: z.string().optional(),
});

export type SceneDataType = z.infer<typeof SceneDataSchema>;

// ==================== MVU 游戏数据 Schema ====================
export const MVUGameDataSchema = z
  .object({
    game: z
      .object({
        currentInstanceId: z.string().optional(),
        currentArea: z.string().optional(),
        mode: z.enum(['main', 'combat', 'sanctuary', 'creation']).default('main'),
      })
      .default(() => ({ mode: 'main' as const })),
    characters: z
      .object({
        player: PlayerCharacterSchema.optional(),
        npcs: z.record(z.string(), NPCCharacterSchema).default({}),
      })
      .default(() => ({ npcs: {} })),
    instances: z.record(z.string(), InstanceRecordSchema).default({}),
    interaction: z
      .object({
        dialogues: z.array(DialogueDataSchema).default([]),
      })
      .default(() => ({ dialogues: [] })),
  })
  .default(() => ({
    game: { mode: 'main' as const },
    characters: { npcs: {} },
    instances: {},
    interaction: { dialogues: [] },
  }));

export type MVUGameDataType = z.infer<typeof MVUGameDataSchema>;
