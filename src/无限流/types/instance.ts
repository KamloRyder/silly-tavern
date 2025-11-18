// 副本相关的 TypeScript 接口定义

import type { Character } from './character';

/**
 * 副本类型
 */
export type InstanceType = '恐怖' | '修仙' | '现代' | '科幻' | '奇幻' | '武侠' | '末日' | '推理' | string; // 允许自定义类型

/**
 * 副本难度
 */
export type InstanceDifficulty = 1 | 2 | 3 | 4 | 5;

/**
 * 道具
 */
export interface Item {
  id: string;
  name: string;
  description: string; // 一句话描述
  type?: string; // 道具类型（如：武器、消耗品、材料等）
  obtainedAt?: number; // 获得时间戳
  fromArea?: string; // 来源区域
}

/**
 * 地图区域详细信息
 */
export interface AreaDetails {
  environment: string; // 环境描述（50-100字）
  atmosphere: string; // 氛围描述（30-50字）
  items: Item[]; // 可获取的道具列表
}

/**
 * 地图区域
 */
export interface Area {
  id: string;
  name: string;
  description: string;
  background?: string; // 该区域的背景图片 URL
  connectedAreas: string[]; // 相邻区域的 ID 列表
  events?: string[]; // 该区域可能触发的事件
  isDiscovered: boolean; // 是否已探索
  isDangerous?: boolean; // 是否为危险区域
  relatedNPCs?: string[]; // 与该区域相关的 NPC ID 列表（用于重要 NPC）
  details?: AreaDetails; // 区域详细信息（首次进入时生成）
}

/**
 * 区域连接
 */
export interface Connection {
  from: string; // 起始区域 ID
  to: string; // 目标区域 ID
  isLocked?: boolean; // 是否锁定
  requirement?: string; // 解锁要求描述
}

/**
 * 地图数据
 */
export interface MapData {
  areas: Map<string, Area>;
  connections: Connection[];
  playerLocation: string; // 玩家当前位置的区域 ID
  startArea: string; // 起始区域 ID
}

/**
 * 副本中的角色信息
 */
export interface CharacterInInstance {
  characterId: string;
  character: Character;
  isImportant: boolean; // 是否为重要 NPC（已弃用，使用 importance 代替）
  importance?: 1 | 2 | 3 | 4 | 5; // NPC 重要程度（1=次要，2=普通，3=重要，4=核心，5=主角）
  source?: 'random' | 'custom-quick' | 'custom-detailed'; // NPC 来源（random=随机生成，custom-quick=一句话创建，custom-detailed=详细创建）
  appearanceCount?: number; // 出场次数
  firstAppearance?: string; // 首次出场的区域或事件
  lastSeen?: string; // 最后出现的区域或事件
}

/**
 * 重要事件
 */
export interface ImportantEvent {
  id: string;
  summary: string; // 事件概括（一句话）
  timestamp: number; // 事件发生时间戳
  location?: string; // 事件发生地点
  involvedCharacters: string[]; // 涉及的角色 ID
  consequences?: string; // 事件后果
}

/**
 * 纪念品
 */
export interface Memento {
  id: string;
  name: string;
  description: string;
  sourceInstance: string; // 来源副本 ID
  obtainedAt: number; // 获得时间戳
  imageUrl?: string; // 纪念品图片 URL
}

/**
 * 副本状态
 */
export type InstanceStatus = 'draft' | 'active' | 'completed';

/**
 * 副本记录
 */
export interface InstanceRecord {
  id: string;
  name: string;
  type: InstanceType;
  difficulty: InstanceDifficulty;
  worldSetting: string; // 世界观与背景描述
  map: MapData; // 副本地图
  characters: CharacterInInstance[]; // 出场人物
  events: ImportantEvent[]; // 重要事件列表
  mementos: Memento[]; // 纪念品列表
  status: InstanceStatus; // 副本状态（draft=草稿，active=进行中，completed=已完成）
  startTime: number; // 副本开始时间戳
  endTime?: number; // 副本结束时间戳
  ending?: string; // 副本结局
  isActive: boolean; // 是否为当前活跃副本（已弃用，使用 status 代替）
  customPrompt?: string; // 用户自定义的副本生成提示词
}

/**
 * 副本生成配置
 */
export interface InstanceGenerationConfig {
  type?: InstanceType; // 副本类型（可选，不指定则随机）
  difficulty?: InstanceDifficulty; // 难度（可选，不指定则随机）
  customPrompt?: string; // 自定义提示词
  areaCount?: number; // 地图区域数量（默认 5-10）
}

/**
 * 背包数据
 */
export interface Inventory {
  items: Item[]; // 道具列表
  maxSlots?: number; // 最大槽位数（可选）
}

/**
 * 场景数据
 */
export interface SceneData {
  background: string; // 背景图片 URL
  sprites: import('./character').SpriteData[]; // 立绘数据
  areaId?: string; // 当前区域 ID
  description?: string; // 场景描述
}
