/**
 * ui-v3 → @vima-tech/ui-admin 提取脚本（一次性，可重跑）
 *
 * 输入：juvenile-guard/apps/admin-web/src/ui-v3
 * 输出：/home/renmk/projects/vima-ui-admin/src
 *
 * 不生成的文件（手写，重跑不会被覆盖）：
 *   src/index.ts        —— 导出面与插件安装
 *   src/layer.ts        —— 弹层服务（上游在 admin-web/src/ui/layer.ts，且要去掉 layui 转发层）
 *   src/floating.ts     —— 浮层视口定位
 *   src/styles/tokens.css —— 冻结主题令牌
 *   src/components/columnSetting.ts、src/components/feedback.ts、src/styles/components.css
 *
 * 注意：已与上游分歧的生成文件（重跑会覆盖回上游的旧实现，见文末告警）：
 *   src/components/overlay.ts、src/styles/ui.css 里的 VDropdown ——
 *   面板由「贴着触发器的 absolute」改成 teleport 到 body 的 fixed 定位。
 *   原实现会被任何 overflow 不是 visible 的祖先裁掉（.vui-card 就是 overflow: hidden），
 *   且 .vui-dropdown.is-open 的 z-index 造成层叠上下文、压不住对话框。
 *   要保留这个修复，请先把改动搬到上游 ui-v3 再重跑。
 *
 * 做四件事：
 *  1. 去掉 `:root[data-ui-theme='v3'] ` 主题闸门（宿主工程的回撤开关，不属于框架）
 *  2. 剥离宿主专属规则（.jg-header-select / .jg-tab-engine / .tab-pane / .layui-*）
 *  3. 命名空间 jg-ui-/jg- → vui-（类名与 CSS 变量同时改，TS 侧一并改）
 *  4. 把顶部 `:root[data-ui-theme='v3'] { --jg-ui-* }` 令牌块摘出来，交给 styles/tokens.css
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
/** 上游 ui-v3 目录，可用 `node scripts/extract-from-ui-v3.mjs <路径>` 覆盖 */
const SRC = resolve(
  process.argv[2] || '/home/renmk/projects/juvenile-guard/apps/admin-web/src/ui-v3'
);
const OUT = join(HERE, '..', 'src');
const SCOPE = ":root[data-ui-theme='v3']";

/** 宿主工程专属选择器：命中即整条规则丢弃 */
const HOST_ONLY = ['.jg-header-select', '.jg-tab-engine', '.tab-pane', '.layui-'];

/**
 * HOST_ONLY 的例外：这条 layui 类名承载的是本库自己的小号按钮尺寸
 * （VButton 的 size 属性拼出 `layui-btn-${size}`），不能当宿主装饰类丢掉。
 */
const CSS_RENAME = { '.layui-btn-sm': '.vui-button-sm' };

/** 命名空间改写：先做定向合并（同义变量归一），再做通用前缀替换 */
function ns(text) {
  return text
    // --jg-ui-primary / --jg-ui-primary-hover 只是宿主主色的别名，归一到一个名字
    .replace(/--jg-ui-primary-hover/g, '--jg-primary-strong')
    .replace(/--jg-ui-primary(?![-\w])/g, '--jg-primary')
    // 语义更名：这几个名字带宿主业务味道
    .replace(/--jg-tab-component-gap/g, '--jg-block-gap')
    // navy-900 在 ui.css 里只用于弹层投影染色，名字带宿主色板味道
    .replace(/--jg-navy-900/g, '--jg-shadow-color')
    .replace(/jg-ui-/g, 'vui-')
    .replace(/jg-/g, 'vui-');
}

/**
 * 标识符改名：Lay* 是 Layui 血统（宿主当年要与 layui-vue 混跑才这么叫），
 * 独立成框架后统一为 V*；内部两处按 name 字符串识别组件的比较一并跟着改。
 * `Layer`/`LayerIndex` 这类不匹配（要求 Lay 后紧跟大写字母）。
 */
function renameIdentifiers(text) {
  return text
    .replace(/\bLay([A-Z])/g, 'V$1')
    .replace(/\bV3_/g, 'VUI_')
    .replace(/\bV3([A-Z])/g, 'Vui$1');
}

/**
 * 去掉 layui 兼容类名。
 *
 * 上游组件同时挂 `vui-*` 与 `layui-*` 两套类名，是为了让 layui-vue 的样式表继续命中——
 * 那是宿主渐进迁移期的需要。本包不带 layui，这些类名在这里只是死重量（62 处）。
 * 注意：宿主若要改用本包，宿主 CSS 里针对 .layui-* 写的规则需要一并改写，见 README「迁移」。
 */
function dropLayuiCompat(text) {
  // 例外：按钮尺寸类是真样式（对应 CSS_RENAME），先改名再删其余兼容类
  text = text.replace('`layui-btn-${props.size}`', '`vui-button-${props.size}`');
  // ICON_GLYPHS 的键是图标名而不是兼容类名，先摘前缀，别被下面的删除规则误伤
  let out = text.replace(/'layui-icon-([\w-]+)':/g, "'$1':");
  // 对象里的条件类名整行删
  out = out.replace(/^[ \t]*'layui-[^']*':[^\n]*\n/gm, '');
  // 数组/参数里的类名（含模板字符串拼接的）
  out = out.replace(/'layui-[^']*',?\s*/g, '').replace(/`layui-[^`]*`,?\s*/g, '');
  // 删干净后留下的空壳：`[ 'a', ]` / `classes('a', {\n})`
  out = out.replace(/,\s*\]/g, ']').replace(/,\s*\{\s*\}\s*\)/g, ')').replace(/,\s*\{\s*\}/g, '');
  return out;
}

/**
 * VContainer 的 fluid 属性只用来加 `layui-fluid`——解除的是 layui 那条 max-width。
 * 本库的 .vui-container 本来就是 width:100%，没有可解除的约束，属性留着是空转，删掉。
 */
function dropDeadFluidProp(text) {
  const before = `  props: {
    fluid: { type: [Boolean, String], default: false }
  },
  setup(props, { slots }) {
    const attrs = useAttrs();
    return () =>
      h(
        'main',
        passthroughAttrs(
          attrs,
          classes('vui-container')
        ),
        slots.default?.()
      );`;
  const after = `  setup(_, { slots }) {
    const attrs = useAttrs();
    return () =>
      h('main', passthroughAttrs(attrs, ['vui-container']), slots.default?.());`;
  if (!text.includes('VContainer')) return text;
  if (!text.includes(before)) throw new Error('VContainer 结构与预期不符，dropDeadFluidProp 的锚点失效了');
  return text.replace(before, after);
}

/** VIcon 的 type 是公开 API，不能只删类名了事——见 README「已知取舍」 */
function deLayuiIcon(text) {
  const before = "        {\n          ...passthroughAttrs(attrs, ['vui-icon', props.type]),";
  const after = "        {\n          ...passthroughAttrs(attrs, ['vui-icon', props.type ? `vui-icon-${iconKey(props.type)}` : '']),";
  if (!text.includes('ICON_GLYPHS')) return text;
  if (!text.includes(before)) throw new Error('VIcon 结构与预期不符，deLayuiIcon 的锚点失效了');
  return text
    .replace(before, after)
    .replace('ICON_GLYPHS[props.type]', 'ICON_GLYPHS[iconKey(props.type)]')
    .replace(
      'const ICON_GLYPHS: Record<string, string> = {',
      "/** 兼容上游写法：`home` 与 `layui-icon-home` 都认 */\nfunction iconKey(type: string) {\n  return type.replace(/^layui-icon-/, '');\n}\n\nconst ICON_GLYPHS: Record<string, string> = {"
    );
}

// ---------------------------------------------------------------- CSS
const css = readFileSync(join(SRC, 'ui.css'), 'utf8').replace(/\r\n/g, '\n');

/** 按顶层花括号配对切块，保留注释与 @media / @keyframes 结构 */
function splitBlocks(text) {
  const blocks = [];
  let i = 0;
  let buf = '';
  let depth = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '/' && text[i + 1] === '*' && depth === 0) {
      const end = text.indexOf('*/', i) + 2;
      if (buf.trim()) blocks.push({ type: 'raw', text: buf });
      blocks.push({ type: 'comment', text: text.slice(i, end) });
      buf = '';
      i = end;
      continue;
    }
    buf += ch;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        blocks.push({ type: 'rule', text: buf });
        buf = '';
      }
    }
    i++;
  }
  if (buf.trim()) blocks.push({ type: 'raw', text: buf });
  return blocks;
}

const selectorOf = (rule) => rule.slice(0, rule.indexOf('{'));

/** 去主题闸门。`SCOPE {` 这样的纯令牌块单独返回 tokens */
function dropScope(sel) {
  return sel
    .split(',')
    .map((s) => s.trim().replace(new RegExp(SCOPE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*'), '').trim())
    .filter(Boolean)
    .join(',\n');
}

const kept = [];
const tokenBlocks = [];
let dropped = 0;

function processRule(rule, indent = '') {
  const sel = selectorOf(rule).trim();
  const body = rule.slice(rule.indexOf('{') + 1, rule.lastIndexOf('}'));

  // @media / @supports：递归处理内部规则
  if (sel.startsWith('@media') || sel.startsWith('@supports')) {
    const inner = splitBlocks(body)
      .map((b) => (b.type === 'rule' ? processRule(b.text, '  ') : b.text.trim() ? b.text : ''))
      .filter((s) => s && s.trim())
      .join('\n');
    if (!inner.trim()) return '';
    return `${sel} {\n${inner}\n}`;
  }
  if (sel.startsWith('@keyframes')) return rule.trim();

  // 纯令牌块（`:root[data-ui-theme='v3'] { --jg-ui-*: ... }`）→ 交给 tokens.css
  if (sel === SCOPE) {
    tokenBlocks.push(body);
    return '';
  }

  let renamed = sel;
  for (const [from, to] of Object.entries(CSS_RENAME)) renamed = renamed.split(from).join(to);

  if (renamed === sel && HOST_ONLY.some((h) => sel.includes(h))) {
    dropped++;
    return '';
  }

  let newSel = dropScope(renamed);

  // 原文里 `SCOPE *, SCOPE *::before...` 是靠主题闸门约束住的全局 reset；
  // 去掉闸门后会污染宿主页面，收窄到本库自己的子树内。
  if (newSel.split(',').every((s) => s.trim().startsWith('*'))) {
    newSel = [
      "[class*='vui-']",
      "[class*='vui-'] *",
      "[class*='vui-']::before",
      "[class*='vui-']::after",
      "[class*='vui-'] *::before",
      "[class*='vui-'] *::after"
    ].join(',\n');
  }

  // 同理：裸元素选择器（`input[...]` 这种，原来靠闸门兜住）必须收进组件子树，否则污染宿主页面
  if (newSel.split(',').every((s) => /^[a-z]/i.test(s.trim()))) {
    newSel = newSel
      .split(',')
      .map((s) => `[class*='vui-'] ${s.trim()}`)
      .join(',\n');
  }

  const lines = body
    .split('\n')
    .map((l) => l.replace(/^ {2}/, ''))
    .join('\n')
    .trim();
  const indented = lines
    .split('\n')
    .map((l) => (l.trim() ? `${indent}  ${l}` : l))
    .join('\n');
  return `${indent}${newSel.split('\n').join(`\n${indent}`)} {\n${indented}\n${indent}}`;
}

let first = true;
for (const b of splitBlocks(css)) {
  if (b.type === 'comment') {
    // 原文件首行注释讲的是宿主的主题闸门，框架里没有这个概念
    if (first) {
      first = false;
      continue;
    }
    kept.push(b.text.trim());
  } else if (b.type === 'rule') {
    first = false;
    const out = processRule(b.text);
    if (out) kept.push(out);
  }
}

const header = `/**
 * @vima-tech/ui-admin · 组件样式层
 *
 * 提取自 juvenile-guard/apps/admin-web/src/ui-v3/ui.css（2026-08-10）
 * 变换见 scripts/extract-from-ui-v3.mjs：去主题闸门、去宿主专属规则、命名空间 jg-ui-/jg- → vui-。
 *
 * 令牌只从 styles/tokens.css 取，本文件不定义 :root 变量。
 */
`;

mkdirSync(join(OUT, 'styles'), { recursive: true });
writeFileSync(join(OUT, 'styles', 'ui.css'), header + '\n' + ns(kept.join('\n\n')) + '\n');
// 令牌块不自动落盘：styles/tokens.css 是手写的冻结主题（带语义注释与默认值），
// 上游若新增控件令牌，这里会打印出来提醒人工同步。
console.log('--- 上游令牌块（人工比对 styles/tokens.css）---');
console.log(ns(tokenBlocks.join('\n')).trim());

// ---------------------------------------------------------------- TS
mkdirSync(join(OUT, 'components'), { recursive: true });
const lf = (t) => t.replace(/\r\n/g, '\n');
const tsx = (f) => dropDeadFluidProp(deLayuiIcon(dropLayuiCompat(renameIdentifiers(ns(lf(readFileSync(f, 'utf8')))))));
for (const f of ['context.ts', 'utils.ts']) {
  writeFileSync(join(OUT, f), tsx(join(SRC, f)));
}
for (const f of ['basic.ts', 'form.ts', 'data.ts', 'overlay.ts', 'columnWidth.ts']) {
  writeFileSync(join(OUT, 'components', f), tsx(join(SRC, 'components', f)));
}

console.warn(
  '\n注意：刚被覆盖的文件里有本地修复：VDropdown 的 teleport 定位' +
    '（src/components/overlay.ts + src/styles/ui.css，详见本脚本头部注释）。\n' +
    '  这次重跑已经把它退回上游实现——面板会重新被 .vui-card 的 overflow 裁掉。'
);
console.log(`ui.css: ${kept.length} blocks kept, ${dropped} host-only rules dropped`);
console.log(`token block lines: ${tokenBlocks.join('\n').trim().split('\n').length}`);
