// 数据验证工具函数

import toastr from 'toastr';
import { z } from 'zod';

/**
 * 验证并解析数据，如果失败则显示友好的错误提示
 * @param schema Zod schema
 * @param data 要验证的数据
 * @param errorMessage 自定义错误消息
 * @returns 解析后的数据，如果验证失败则返回 null
 */
export function validateAndParse<T>(schema: z.ZodSchema<T>, data: unknown, errorMessage?: string): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formatted = formatZodError(error);
      console.error('数据验证失败:', formatted);

      if (errorMessage) {
        toastr.error(errorMessage);
      } else {
        toastr.error('数据格式错误，请检查控制台');
      }
    } else {
      console.error('未知验证错误:', error);
      toastr.error('验证过程中发生错误');
    }
    return null;
  }
}

/**
 * 安全解析数据，使用默认值而不是抛出错误
 * @param schema Zod schema
 * @param data 要验证的数据
 * @param fallback 验证失败时的默认值
 * @returns 解析后的数据或默认值
 */
export function safeParseWithFallback<T>(schema: z.ZodSchema<T>, data: unknown, fallback: T): T {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  } else {
    console.warn('数据验证失败，使用默认值:', formatZodError(result.error));
    return fallback;
  }
}

/**
 * 格式化 Zod 错误信息为易读的字符串
 * @param error Zod 错误对象
 * @returns 格式化后的错误信息
 */
export function formatZodError(error: z.ZodError): string {
  const issues = error.issues.map(issue => {
    const path = issue.path.join('.');
    return `  - ${path || '根对象'}: ${issue.message}`;
  });

  return `数据验证错误:\n${issues.join('\n')}`;
}

/**
 * 验证 COC7 属性值是否在有效范围内
 * @param value 属性值
 * @returns 是否有效
 */
export function isValidCOC7Attribute(value: number): boolean {
  return value >= 0 && value <= 100;
}

/**
 * 验证百分比值
 * @param value 百分比值
 * @returns 是否有效
 */
export function isValidPercentage(value: number): boolean {
  return value >= 0 && value <= 100;
}

/**
 * 验证 URL 格式
 * @param url URL 字符串
 * @returns 是否为有效 URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证字符串是否非空
 * @param str 字符串
 * @returns 是否非空
 */
export function isNonEmptyString(str: string): boolean {
  return typeof str === 'string' && str.trim().length > 0;
}

/**
 * 清理和规范化角色名称
 * @param name 原始名称
 * @returns 清理后的名称
 */
export function sanitizeCharacterName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * 验证并修正 HP/MP/SAN 值，确保不超过最大值且不小于 0
 * @param current 当前值
 * @param max 最大值
 * @returns 修正后的值
 */
export function clampStat(current: number, max: number): number {
  return Math.max(0, Math.min(current, max));
}

/**
 * 验证技能值是否有效
 * @param skillValue 技能值
 * @returns 是否有效
 */
export function isValidSkillValue(skillValue: number): boolean {
  return skillValue >= 0 && skillValue <= 100;
}

/**
 * 批量验证数据
 * @param validations 验证配置数组
 * @returns 所有验证是否通过
 */
export function validateAll(
  validations: Array<{
    condition: boolean;
    message: string;
  }>,
): boolean {
  for (const validation of validations) {
    if (!validation.condition) {
      toastr.error(validation.message);
      console.error('验证失败:', validation.message);
      return false;
    }
  }
  return true;
}

/**
 * 验证对象是否包含必需的字段
 * @param obj 要验证的对象
 * @param requiredFields 必需字段列表
 * @returns 是否包含所有必需字段
 */
export function hasRequiredFields(obj: Record<string, any>, requiredFields: string[]): boolean {
  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
      console.error(`缺少必需字段: ${field}`);
      return false;
    }
  }
  return true;
}

/**
 * 深度验证对象结构
 * @param obj 要验证的对象
 * @param schema Zod schema
 * @param showToast 是否显示 toast 提示
 * @returns 验证结果
 */
export function deepValidate<T>(
  obj: unknown,
  schema: z.ZodSchema<T>,
  showToast: boolean = true,
): { success: boolean; data?: T; error?: string } {
  const result = schema.safeParse(obj);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const errorMessage = formatZodError(result.error);
    console.error('深度验证失败:', errorMessage);

    if (showToast) {
      toastr.error('数据结构验证失败，请检查控制台');
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * 验证并转换 Map 对象
 * @param obj 可能是 Map 或普通对象
 * @returns Map 对象
 */
export function ensureMap<K, V>(obj: Map<K, V> | Record<string, V>): Map<K, V> {
  if (obj instanceof Map) {
    return obj;
  }
  return new Map(Object.entries(obj) as [K, V][]);
}

/**
 * 验证数组长度
 * @param arr 数组
 * @param min 最小长度
 * @param max 最大长度
 * @returns 是否在有效范围内
 */
export function isValidArrayLength(arr: any[], min: number = 0, max: number = Infinity): boolean {
  return arr.length >= min && arr.length <= max;
}

/**
 * 验证数字是否在指定范围内
 * @param value 数值
 * @param min 最小值
 * @param max 最大值
 * @returns 是否在范围内
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * 尝试解析 JSON 字符串
 * @param jsonString JSON 字符串
 * @param fallback 解析失败时的默认值
 * @returns 解析结果或默认值
 */
export function tryParseJSON<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.warn('JSON 解析失败:', error);
    return fallback;
  }
}
