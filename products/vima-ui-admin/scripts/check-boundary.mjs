/**
 * @vima-tech/ui-admin · 边界体检
 *
 * 创建日期: 2026-08-10
 *
 * 这个包能不能被别的工程直接用，取决于四件事，全部在这里机检
 * （外加第 5 项：文档站的示例文件与配置对得上）：
 *  1. 不引用包外模块（没有 `@/`、没有相对路径爬出 src/）
 *  2. 不残留宿主命名空间（jg- / layui / data-ui-theme）
 *  3. 样式里用到的每个 var(--vui-*) 都在 tokens.css 有默认值
 *     —— 缺了不会报错，只是那条样式静默失效，是最难查的一类问题
 *  4. 不写全局样式副作用（裸元素 / * 选择器必须收在 [class*='vui-'] 子树内）
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { collectPublicApi, manifestCoverage } from './collect-public-api.mjs';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const ROOT = join(SRC, '..');
const problems = [];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** 注释里出现宿主名字、示例 import 都是正常的，扫描前先去掉注释 */
const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const files = walk(SRC);
const tsFiles = files.filter((f) => f.endsWith('.ts'));
const cssFiles = files.filter((f) => f.endsWith('.css'));
const rel = (f) => relative(SRC, f);

// ---- 1. 包外引用 ----
for (const file of tsFiles) {
  const text = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const imports = source.statements
    .filter(ts.isImportDeclaration)
    .map((statement) => statement.moduleSpecifier)
    .filter(ts.isStringLiteral)
    .map((specifier) => specifier.text);
  for (const spec of imports) {
    if (spec === 'vue' || spec.startsWith('node:')) continue;
    if (spec.startsWith('./') || spec.startsWith('../')) {
      // 相对路径不许爬出 src/
      const target = join(dirname(file), spec);
      if (!target.startsWith(SRC)) problems.push(`${rel(file)}: 引用了 src/ 之外的 ${spec}`);
      continue;
    }
    problems.push(`${rel(file)}: 引用了包外模块 ${spec}`);
  }
}

// ---- 2. 宿主命名空间残留 ----
/** 唯一允许出现的上游名字：VIcon 兼容 `layui-icon-*` 旧写法的那条正则 */
const ALLOWED = [/type\.replace\(\/\^layui-icon-\//];
for (const file of [...tsFiles, ...cssFiles]) {
  const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
  for (const bad of ['jg-ui-', '--jg-', 'data-ui-theme', 'layui']) {
    lines.forEach((line, i) => {
      if (!line.includes(bad)) return;
      if (ALLOWED.some((re) => re.test(line))) return;
      problems.push(`${rel(file)}:${i + 1}: 残留宿主命名 ${bad}`);
    });
  }
}

// ---- 3. 令牌闭包 ----
const tokensCss = readFileSync(join(SRC, 'styles', 'tokens.css'), 'utf8');
const defined = new Set([...tokensCss.matchAll(/^\s*(--vui-[\w-]+)\s*:/gm)].map((m) => m[1]));
/** 组件在运行时用内联 style 写入的局部变量，不属于主题令牌 */
const RUNTIME_VARS = new Set([
  '--vui-col-span',
  '--vui-row-gutter',
  '--vui-form-label-width',
  '--vui-description-columns',
  '--vui-description-label-width',
  '--vui-table-check-w',
  // 模板系统：几何值由渲染器按节点内联写入，不是主题令牌
  '--vui-tpl-cols',
  '--vui-tpl-row-height',
  '--vui-tpl-gap',
  '--vui-tpl-canvas-width',
  '--vui-tpl-canvas-height',
  '--vui-tpl-col-lg',
  '--vui-tpl-col-md',
  '--vui-tpl-col-sm',
  '--vui-tpl-row-lg',
  '--vui-tpl-row-md',
  '--vui-tpl-row-sm'
]);
/** 令牌闭包与选择器体检覆盖全部样式文件（生成的 ui.css + 手写的 components.css） */
const styleFiles = cssFiles.filter((f) => !f.endsWith('tokens.css') && !f.endsWith('index.css'));
const uiCss = styleFiles.map((f) => stripComments(readFileSync(f, 'utf8'))).join('\n');
const used = new Set([...uiCss.matchAll(/var\((--vui-[\w-]+)/g)].map((m) => m[1]));
for (const name of used) {
  if (!defined.has(name) && !RUNTIME_VARS.has(name)) {
    problems.push(`styles/tokens.css: 缺少默认值 ${name}（ui.css 在用，会静默失效）`);
  }
}
for (const name of defined) {
  if (!used.has(name)) problems.push(`styles/tokens.css: ${name} 定义了但没人用`);
}

// ---- 4. 全局样式副作用 ----
for (const m of uiCss.matchAll(/(^|\n)([^{}@\n][^{}]*)\{/g)) {
  const selectors = m[2].split(',').map((s) => s.trim()).filter(Boolean);
  for (const sel of selectors) {
    if (sel.startsWith('.vui-') || sel.startsWith("[class*='vui-']")) continue;
    if (sel.startsWith('from') || sel.startsWith('to') || /^\d+%$/.test(sel)) continue;
    problems.push(`样式: 选择器逃出组件子树 → ${sel}`);
  }
}

// ---- 5. 文档站示例的完整性 ----
// 配置里引用了但文件不存在 → 页面上会渲染一个红色「示例未找到」；
// 有文件却没人引用 → 死重量，谁也不会发现它坏了。两种都当问题报。
const pagesTs = readFileSync(join(SRC, '..', 'site', 'pages.ts'), 'utf8');
const referenced = new Set([...pagesTs.matchAll(/file: '([\w-]+)'/g)].map((m) => m[1]));
const onDisk = new Set(
  readdirSync(join(SRC, '..', 'site', 'demos'))
    .filter((f) => f.endsWith('.vue'))
    .map((f) => f.slice(0, -4))
);
for (const name of referenced) {
  if (!onDisk.has(name)) problems.push(`site/pages.ts: 引用了不存在的示例 demos/${name}.vue`);
}
for (const name of onDisk) {
  if (!referenced.has(name)) problems.push(`site/demos/${name}.vue: 没有任何页面引用它`);
}

// ---- 6. 类名闭包 ----
/*
 * 组件挂出去的每个 vui-* 类名，样式表里至少要有一条规则命中它。
 *
 * 缺了不会报错，只是那个组件渲染成一个没有任何样式的裸标签——
 * 和第 3 项的令牌缺省一样属于静默失效，而且更难查：VLayout / VHeader / VBody / VSide
 * 四个布局组件曾经整整一版没有样式，<section> 按 display:block 排，
 * 「侧栏 + 内容」渲染成上下堆叠，宿主只当是自己 flex 没写对。
 */
/**
 * 豁免名单：确认过是纯结构钩子的类名——本身不需要样式，
 * 外观全由父级或兄弟类承担。加进来之前请先确认「删掉这个类名，页面长相不变」，
 * 否则就是拿豁免掩盖一个真的样式缺失。
 */
const CLASSLESS_OK = new Map([
  ['vui-select-option', '选项外观写在 .vui-select-popover 的后代选择器里'],
  ['vui-divider-content', '文字的字号字色由 .vui-divider 继承下来'],
  ['vui-upload', '外壳，可见部分是 .vui-upload-trigger 与 .vui-upload-input'],
  ['vui-column-setting-text', '纯文字 span'],
  ['vui-pagination-current', '纯文字 span'],
  ['vui-descriptions', '根节点，网格与边框都在 .vui-descriptions-grid 上'],
  ['vui-tab-content', '内容包裹层，.vui-tab-item / .vui-tab-title 才是外观'],
  ['vui-collapse-item', '分组包裹层，边框在 .vui-collapse、内容在 -title / -content'],
  ['vui-radio-label', '纯文字 span'],
  ['vui-template-container', '模板渲染根节点，外观由渲染出来的组件各自带']
]);
const emitted = new Set();
for (const file of tsFiles) {
  const text = stripComments(readFileSync(file, 'utf8'));
  // 模板字符串里带 ${} 的是运行时拼的（vui-button-${size}），拼出来的结果无法静态求值
  for (const m of text.matchAll(/'(vui-[\w-]+)'/g)) emitted.add(m[1]);
}
for (const name of emitted) {
  if (CLASSLESS_OK.has(name)) continue;

  // 整词匹配：.vui-page 不能被 .vui-pagination 顶掉
  if (!new RegExp(`\\.${name}(?![\\w-])`).test(uiCss)) {
    problems.push(`样式: 组件挂了 .${name} 但没有任何规则命中它（会渲染成裸标签）`);
  }
}

// ---- 7. AI Manifest 与模板契约闭包 ----
const publicApi = collectPublicApi({ root: ROOT });
for (const diagnostic of publicApi.diagnostics) {
  problems.push(`AI Manifest: ${diagnostic.code} ${diagnostic.component || diagnostic.templateType || ''}`.trim());
}
const coverage = manifestCoverage(publicApi.manifest);
if (coverage.componentDescriptions !== coverage.components) {
  problems.push(`AI Manifest: 组件说明覆盖 ${coverage.componentDescriptions}/${coverage.components}，要求 100%`);
}
if (coverage.propDescriptions !== coverage.props) {
  problems.push(`AI Manifest: 属性说明覆盖 ${coverage.propDescriptions}/${coverage.props}，要求 100%`);
}
if (coverage.eventPayloads !== coverage.events) {
  problems.push(`AI Manifest: 事件载荷覆盖 ${coverage.eventPayloads}/${coverage.events}，要求 100%`);
}
if (coverage.slotProps !== coverage.slots) {
  problems.push(`AI Manifest: 插槽参数覆盖 ${coverage.slotProps}/${coverage.slots}，要求 100%`);
}
for (const name of ['VTable', 'VSelect', 'VForm', 'VFormItem', 'VDatePicker']) {
  const component = publicApi.manifest.components.find((item) => item.name === name);
  const undocumented = component?.props.filter((prop) => !prop.description) ?? [];
  if (undocumented.length) {
    problems.push(`AI Manifest: ${name} 属性说明未覆盖 ${undocumented.map((prop) => prop.name).join(', ')}`);
  }
}

if (problems.length) {
  console.error(`边界体检未通过（${problems.length} 项）：`);
  problems.forEach((p) => console.error('  ERROR ' + p));
  process.exit(1);
}
console.log(
  `边界体检通过：${tsFiles.length} 个 TS 文件、${cssFiles.length} 个 CSS 文件、` +
    `${defined.size} 个令牌全部闭包、${emitted.size} 个类名全部有样式命中` +
    `（豁免 ${CLASSLESS_OK.size} 个纯结构钩子）、` +
    `${onDisk.size} 个文档示例与配置一一对应。`
);
