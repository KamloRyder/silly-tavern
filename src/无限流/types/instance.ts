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
  isImportant: boolean; // 是否为重要 NPC
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
  startTime: number; // 副本开始时间戳
  endTime?: number; // 副本结束时间戳
  ending?: string; // 副本结局
  isActive: boolean; // 是否为当前活跃副本
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
 * 场景数据
 */
export interface SceneData {
  background: string; // 背景图片 URL
  sprites: import('./character').SpriteData[]; // 立绘数据
  areaId?: string; // 当前区域 ID
  description?: string; // 场景描述
}
