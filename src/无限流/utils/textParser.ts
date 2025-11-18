// 文本解析工具 - 用于段落分段

/**
 * 段落数据
 */
export interface Paragraph {
  content: string; // 段落内容
}

/**
 * 判断引号内容是否为真正的对话
 * 对话特征：文本最后有标点符号或省略号
 */
function isDialogueQuote(content: string): boolean {
  // 检查文本最后是否有标点符号（包括省略号 … 和 。。。）
  return /[。！？，、；：……]$|\.{2,}$|…+$/.test(content);
}

/**
 * 清理文本内容，移除代码块和 MVU 命令（仅用于显示）
 *
 * 注意：此函数仅用于准备显示给用户的文本
 * 原始文本（包含代码块和命令）应该在调用此函数前已经被保存
 * 这样可以确保：
 * 1. 用户看到的是干净的文本（无代码块）
 * 2. 系统仍然可以处理原始文本中的命令（如 MVU 解析、NPC 创建等）
 */
export function cleanTextContent(text: string): string {
  let cleaned = text;

  // 第一步：移除代码块和命令（仅用于显示）
  // 移除 YAML 代码块 (```yaml ... ```)
  cleaned = cleaned.replace(/```yaml[\s\S]*?```/gi, '');

  // 移除 JSON 代码块 (```json ... ```)
  cleaned = cleaned.replace(/```json[\s\S]*?```/gi, '');

  // 移除所有代码块 (``` ... ```)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');

  // 移除单行代码块 (`...`)
  cleaned = cleaned.replace(/`[^`]+`/g, '');

  // 移除 {{...}} 格式的 MVU 命令
  cleaned = cleaned.replace(/\{\{[\s\S]*?\}\}/g, '');

  // 移除 HTML 标签
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // 第二步：在真正的对话引号前后添加换行符，使对话独立成段
  // 处理双引号 - 在引号前后添加换行符
  cleaned = cleaned.replace(/([^\n])"([^"]+)"(?!\n)/g, (match, before, content) => {
    console.log('[textParser] 匹配到引号:', match.substring(0, 50));
    console.log('[textParser] 前面字符:', before);
    console.log('[textParser] 对话内容:', content);
    console.log('[textParser] 是否为对话:', isDialogueQuote(content));
    if (isDialogueQuote(content)) {
      const result = `${before}\n"${content}"\n`;
      console.log('[textParser] 替换为:', result.substring(0, 50));
      return result;
    }
    return match;
  });

  // 处理日式引号「」
  cleaned = cleaned.replace(/([^\n])「([^」]+)」(?!\n)/g, (match, before, content) => {
    if (isDialogueQuote(content)) {
      return `${before}\n「${content}」\n`;
    }
    return match;
  });

  // 处理日式书名号『』
  cleaned = cleaned.replace(/([^\n])『([^』]+)』(?!\n)/g, (match, before, content) => {
    if (isDialogueQuote(content)) {
      return `${before}\n『${content}』\n`;
    }
    return match;
  });

  // 移除首尾空白
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * 对单个段落进行长度限制的智能分段
 * @param paragraph 单个段落文本
 * @param maxLength 最大长度
 * @returns 分段后的文本数组
 */
function splitParagraphByLength(paragraph: string, maxLength: number): string[] {
  const result: string[] = [];

  // 如果段落长度小于等于最大长度，直接返回
  if (paragraph.length <= maxLength) {
    result.push(paragraph);
    return result;
  }

  // 智能分段
  let start = 0;
  while (start < paragraph.length) {
    let end = start + maxLength;

    // 如果还没到文本末尾，尝试在标点符号处断句
    if (end < paragraph.length) {
      // 标点符号优先级：句号 > 感叹号/问号 > 逗号/分号 > 空格
      const strongPunctuation = /[。！？.!?]/;
      const weakPunctuation = /[，,、；;]/;
      const space = /\s/;

      let bestBreak = -1;
      let breakType = 0; // 0: 无, 1: 空格, 2: 弱标点, 3: 强标点

      // 在合理范围内寻找最佳断句点
      // 搜索范围：60% - 130% 的理想长度
      const searchStart = Math.max(start + Math.floor(maxLength * 0.6), start + 50);
      const searchEnd = Math.min(end + Math.floor(maxLength * 0.3), paragraph.length);

      for (let i = searchStart; i < searchEnd; i++) {
        if (strongPunctuation.test(paragraph[i]) && breakType < 3) {
          bestBreak = i + 1;
          breakType = 3;
        } else if (weakPunctuation.test(paragraph[i]) && breakType < 2) {
          bestBreak = i + 1;
          breakType = 2;
        } else if (space.test(paragraph[i]) && breakType < 1) {
          bestBreak = i + 1;
          breakType = 1;
        }
      }

      // 如果找到了合适的断句点，使用它
      if (bestBreak > start) {
        end = bestBreak;
      }
    }

    const segment = paragraph.slice(start, end).trim();
    if (segment) {
      result.push(segment);
    }
    start = end;
  }

  return result;
}

/**
 * 根据对话框显示容量智能分段
 * 基于对话框最大高度（33vh）计算合适的字符数
 *
 * 分段策略：
 * 1. 首先按原始文本的换行符分段
 * 2. 对每个段落，如果超过最大长度，再进行智能分段
 *
 * @param text 要分段的文本
 * @returns 分段后的文本数组
 */
export function splitIntoParagraphs(text: string): string[] {
  // 先清理文本
  const cleaned = cleanTextContent(text);

  // 基于对话框最大高度计算合适的字符数
  // 33vh 约等于屏幕高度的1/3，减去padding和其他元素，大约可以显示150-300字符
  const baseLength = 250; // 基础字符数（桌面端）
  const mobileLength = 180; // 移动端字符数

  // 检测是否为移动端
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const maxLength = isMobile ? mobileLength : baseLength;

  // 第一步：按换行符分段
  const naturalParagraphs = cleaned
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // 第二步：对每个段落进行长度限制的智能分段
  const result: string[] = [];
  for (const paragraph of naturalParagraphs) {
    const subParagraphs = splitParagraphByLength(paragraph, maxLength);
    result.push(...subParagraphs);
  }

  return result;
}

/**
 * 将文本解析为段落数组
 * 根据对话框显示容量智能分段
 */
export function parseTextIntoParagraphs(text: string): Paragraph[] {
  const paragraphTexts = splitIntoParagraphs(text);
  return paragraphTexts.map(content => ({ content }));
}
