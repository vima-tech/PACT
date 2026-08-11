const SCRIPT_ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029'
};

/** 将结构化值嵌入 HTML script 时阻断标签闭合与行分隔符逃出。 */
export function serializeForScript(value: unknown, space?: number): string {
  const json = JSON.stringify(value, null, space);
  if (json === undefined) throw new TypeError('不能把 undefined 写入生成代码。');
  return json.replace(/[<>&\u2028\u2029]/g, (character) => SCRIPT_ESCAPES[character]);
}
