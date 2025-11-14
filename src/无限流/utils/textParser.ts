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
 * 清理文本内容，移除代码块和 MVU 命令，并在对话后添加换行
 */
export function cleanTextContent(text: string): string {
  let cleaned = text;

  // 第一步：移除代码块和命令（在处理对话之前）
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
 * 将文本分段
 * 以换行符为界限分段，每个换行符后的内容为新段落
 */
export function splitIntoParagraphs(text: string): string[] {
  // 先清理文本
  const cleaned = cleanTextContent(text);

  // 按换行符分段
  const paragraphs = cleaned
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return paragraphs;
}

/**
 * 将文本解析为段落数组
 * 每个段落以换行符分隔
 */
export function parseTextIntoParagraphs(text: string): Paragraph[] {
  const paragraphTexts = splitIntoParagraphs(text);
  return paragraphTexts.map(content => ({ content }));
}
