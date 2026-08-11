/**
 * 极简代码着色。
 *
 * 创建日期: 2026-08-10
 *
 * 为什么不装 shiki / prism：本包的立身之本是零依赖，为了文档站的代码块拖进一个
 * 几 MB 的高亮器不划算。这里只认四类东西——注释、字符串、标签名、属性名/关键字，
 * 而且**一次扫描**（正则用 alternation 串起来），不做二次替换，因此不会把已经着过色的
 * HTML 再当源码处理（那是手写高亮器最常见的翻车方式：`<span class="...">` 里的引号被当字符串）。
 *
 * 代价：不认识模板字符串里的插值、正则字面量这类边角，本仓的示例代码用不到。
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;'
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>]/g, (ch) => ESCAPES[ch]);
}

/**
 * 顺序即优先级：先匹配到的先着色，后面的分支不会再碰这段文本。
 * 注意：这些正则跑在**已转义**的文本上，所以标签写作 `&lt;div` 而不是 `<div`。
 */
const PATTERN = new RegExp(
  [
    '(&lt;!--[\\s\\S]*?--&gt;)', // 1 HTML 注释
    '(/\\*[\\s\\S]*?\\*/|//[^\\n]*)', // 2 JS 注释
    '(\'[^\'\\n]*\'|"[^"\\n]*"|`[^`]*`)', // 3 字符串
    '(&lt;/?[a-zA-Z][\\w.-]*)', // 4 标签名
    '(\\b(?:const|let|import|from|export|function|return|ref|computed|watch|async|await|new)\\b)', // 5 关键字
    '([\\w:@.-]+)(?==")' // 6 属性名
  ].join('|'),
  'g'
);

export function highlight(source: string): string {
  const escaped = escapeHtml(source);
  return escaped.replace(PATTERN, (match, comment, jsComment, str, tag, keyword, attr) => {
    if (comment || jsComment) return `<i class="tk-comment">${match}</i>`;
    if (str) return `<i class="tk-string">${match}</i>`;
    if (tag) return `<i class="tk-tag">${match}</i>`;
    if (keyword) return `<i class="tk-keyword">${match}</i>`;
    if (attr) return `<i class="tk-attr">${match}</i>`;
    return match;
  });
}
