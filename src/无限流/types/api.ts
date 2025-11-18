// API 配置相关的 TypeScript 接口定义

/**
 * 单个 API 配置
 * 定义连接到 AI 服务的配置参数
 */
export interface APIConfig {
  apiurl: string; // API 地址
  key: string; // API 密钥
  model: string; // 使用的模型名称
  temperature: number; // 温度参数（0-2，控制输出随机性）
  max_tokens: number; // 最大生成 token 数
}

/**
 * 多世界 API 配置
 * 为现实世界、里世界和归所配置独立的 API
 */
export interface MultiAPIConfig {
  realWorld: APIConfig | null; // 现实世界 API 配置（null 表示使用酒馆默认）
  innerWorld: APIConfig | null; // 里世界副本 API 配置（null 表示使用酒馆默认）
  sanctuary: APIConfig | null; // 归所 API 配置（null 表示使用酒馆默认）
}
