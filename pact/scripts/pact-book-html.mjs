// pact-book-html.mjs — 把 pact-book 的数据模型渲染成**可正式对外交付的单文件 HTML 规格文档**
//
// 形态定位（与 src/**.md 的分工）：
//   · src/**.md      给 AI 施工：按需求/里程碑切片、聚合上下文，机器好检索。
//   · pact-book.html 给人交付：一份**网页优先的正式规格书**——hero 封面、目录、四大部分、需求索引附录，
//     内容整合传统交付物中 PRD（产品需求）/ SDD（系统设计）/ SPEC（技术规格）的职能，
//     不拆成三份文档，以 R-ID / 锚点全程交叉引用。可直接作为附件发给甲方/分包方。
//
// 网页优先（不是电子化的纸）：sticky 顶栏 + 阅读进度、侧边目录滚动定位、粘性表头、
//   R-ID 悬停预览卡（数据取自附录 DOM，零额外负载）、明暗主题、平滑滚动。
//   打印样式仅作降级保留（Ctrl+P 仍能出可读的成册文档）。
//
// 实现取舍：
//   ① 构建期渲染——markdown 在生成时就转成静态 HTML（node 里加载 vendored marked），
//      产物不含运行时渲染逻辑：禁用 JS 也完整可读，交互全部是渐进增强。
//   ② 单文件、零外部请求——file:// 双击即开，对方不需要装任何东西。
//   ③ 确定性输出——不嵌生成时间戳，同一份 PACT.md 生成的字节完全一致（--check 依赖这一点）。

import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'

const requireCjs = createRequire(import.meta.url)

function loadMarked() {
  const p = new URL('../vendor/marked.min.js', import.meta.url)
  if (!existsSync(p)) throw new Error('缺少 vendor/marked.min.js——渲染章节 markdown 需要它')
  const m = requireCjs('../vendor/marked.min.js')
  const marked = m.marked ?? m
  marked.setOptions({ gfm: true, breaks: false })
  return marked
}

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// 四大部分：P/A/C/T → 正式文档的部编排（整合 PRD / SDD / SPEC 职能，不拆分成三份文档）
const PARTS = [
  ['P', '产品需求', 'PRD', '背景与问题、用户与角色、核心场景、需求清单（R-ID 逐条可验收）、非目标、约束与成功定义。'],
  ['A', '系统设计', 'SDD', '系统边界、模块结构与职责、关键链路、设计原则，以及**含已否决方案**的决策记录（D-ID）。'],
  ['C', '数据与接口规格', 'SPEC', '数据模型、枚举与状态机、不变量、接口契约、错误码、配置、权限与观测约定——精确到实现者不需要再做设计决策。'],
  ['T', '验收与交付', 'ACCEPTANCE', '验收清单（与 R-ID 一一对应）、指标阈值、停工线、交付前置条件与里程碑范围。'],
]

/** 正文里把 R###/D### 变成文内交叉引用（跳过代码块/行内代码/既有链接） */
function crossRef(md, ridSet) {
  const parts = md.split(/(```[\s\S]*?```|`[^`\n]*`|\[[^\]]*\]\([^)]*\))/g)
  return parts.map((seg, i) => {
    if (i % 2 === 1) return seg
    return seg
      .replace(/\bR(\d{3})\b/g, (m0, n) => ridSet.has('R' + n) ? `[${m0}](#req-R${n})` : m0)
      .replace(/\bD(\d{3})\b/g, m0 => `[${m0}](#ch-A5)`)
  }).join('')
}

/** marked 输出的后处理：表格包横向滚动容器 + 短单元格禁断行
 * （CJK 在窄列里会被逐字断行——"功能"竖成两行、"R001"断成两截，很难看） */
const wrapTables = html => html
  .replace(/<table>/g, '<div class="tw"><table>').replace(/<\/table>/g, '</table></div>')
  .replace(/<td>((?:<a href="#[^"]+">)?[^<\s]{1,6}(?:<\/a>)?)<\/td>/g, '<td class="nw">$1</td>')

const CSS = `
:root{
  --bg:#faf9f7; --bg-soft:#f2f0ec; --panel:#ffffff;
  --fg:#211d17; --fg-dim:#5f584c; --fg-faint:#948b7d;
  --line:#e5e1d7; --line-soft:#edeae2;
  --accent:#9a5a1e; --accent-strong:#7c4715; --accent-fg:#fff;
  --accent-soft:#f6ecdd; --accent-line:#e3c9a6;
  --star:#a67c0e; --code-bg:#f4f2ec;
  --ok:#1f6b63; --ok-soft:#e3efec; --ok-line:#b7d6d0;
  --warn:#96700a; --warn-soft:#f8f0da; --warn-line:#e1ce97;
  --bad:#a3341f; --bad-soft:#f9e7e2; --bad-line:#e5bdb2;
  --hero-grad:radial-gradient(60rem 28rem at 85% -10%,rgba(154,90,30,.12),transparent 60%),
              radial-gradient(40rem 22rem at 5% 0%,rgba(154,90,30,.06),transparent 55%);
  --shadow:0 1px 2px rgba(35,28,16,.05),0 16px 40px -18px rgba(35,28,16,.25);
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;
  --sans:ui-sans-serif,-apple-system,"Segoe UI",system-ui,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif;
  --content-w:53rem; --side-w:16.5rem; --top-h:3.1rem;
}
:root[data-theme="dark"]{
  --bg:#141210; --bg-soft:#1c1915; --panel:#211d18;
  --fg:#ece7dc; --fg-dim:#b0a695; --fg-faint:#837a6a;
  --line:#373126; --line-soft:#2a251d;
  --accent:#dda668; --accent-strong:#e8b87e; --accent-fg:#2a1a08;
  --accent-soft:#33291a; --accent-line:#59482e;
  --star:#dcb64e; --code-bg:#262119;
  --ok:#6ebbaf; --ok-soft:#16302c; --ok-line:#2c534d;
  --warn:#d7ab45; --warn-soft:#312814; --warn-line:#584a22;
  --bad:#e08a71; --bad-soft:#331e18; --bad-line:#5c3529;
  --hero-grad:radial-gradient(60rem 28rem at 85% -10%,rgba(221,166,104,.10),transparent 60%),
              radial-gradient(40rem 22rem at 5% 0%,rgba(221,166,104,.05),transparent 55%);
  --shadow:0 1px 2px rgba(0,0,0,.4),0 16px 40px -18px rgba(0,0,0,.7);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
/* 顶栏是 sticky，任何锚点跳转都必须给它让出高度。
   注意：avoid 只写在标题上——目录锚点 id 挂在**容器**（section.chp / details.pack / section.apx）上，
   写在容器内标题上的 scroll-margin 根本不会被用到，结果就是标题被顶栏切掉一半。 */
[id]{scroll-margin-top:calc(var(--top-h) + 1rem)}
body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--sans);
  font-size:15px;line-height:1.85;letter-spacing:.01em;
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
  transition:background-color .18s ease,color .18s ease}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline;text-underline-offset:3px}
::selection{background:var(--accent-soft)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}

/* ── sticky 顶栏 + 阅读进度 ── */
.top{position:sticky;top:0;z-index:40;background:color-mix(in srgb,var(--bg) 82%,transparent);
  backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.top-in{max-width:calc(var(--content-w) + var(--side-w) + 5rem);margin:0 auto;height:var(--top-h);
  display:flex;align-items:center;gap:.8rem;padding:0 1.2rem;min-width:0}
.top .tt{font-weight:700;font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.top .tt a{color:var(--fg)}
.top .tt a:hover{text-decoration:none;color:var(--accent)}
.badge{font-family:var(--mono);font-size:.68rem;padding:.14rem .55rem;border-radius:999px;
  border:1px solid var(--line);color:var(--fg-dim);white-space:nowrap}
.badge.frozen{border-color:var(--accent-line);background:var(--accent-soft);color:var(--accent)}
.top .sp{flex:1}
.iconbtn{border:1px solid var(--line);background:transparent;color:var(--fg-dim);cursor:pointer;
  border-radius:8px;padding:.24rem .6rem;font-size:.76rem;font-family:var(--mono);line-height:1.3;
  transition:border-color .12s,color .12s}
.iconbtn:hover{border-color:var(--accent-line);color:var(--fg)}
#bar{position:absolute;left:0;bottom:-1px;height:2px;width:0;background:var(--accent);transition:width .1s linear}

/* ── 布局：侧栏 + 内容 ── */
.wrap{max-width:calc(var(--content-w) + var(--side-w) + 5rem);margin:0 auto;
  display:grid;grid-template-columns:var(--side-w) minmax(0,1fr);gap:2.6rem;padding:0 1.2rem}
@media(max-width:1080px){.wrap{grid-template-columns:minmax(0,1fr)}.side{display:none}}
.side{position:sticky;top:calc(var(--top-h) + 1.2rem);align-self:start;
  max-height:calc(100vh - var(--top-h) - 2.4rem);overflow-y:auto;
  font-size:.75rem;line-height:1.6;padding:.2rem .5rem 1rem 0;scrollbar-width:thin;
  scrollbar-color:var(--line) transparent}
.side .st{font-family:var(--mono);font-size:.64rem;letter-spacing:.14em;color:var(--fg-faint);margin:.8rem 0 .4rem}
.side a{display:block;color:var(--fg-dim);padding:.16rem .55rem;border-radius:7px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background-color .1s,color .1s}
.side a:hover{background:var(--line-soft);color:var(--fg);text-decoration:none}
.side a.part{font-weight:650;color:var(--fg);margin-top:.5rem}
.side a.part .pk{font-family:var(--mono);font-size:.62rem;color:var(--fg-faint);margin-left:.4em;letter-spacing:.06em}
.side a.ch{padding-left:1.3rem}
.side a.on{background:var(--accent-soft);color:var(--accent);font-weight:600;box-shadow:inset 2.5px 0 0 var(--accent)}
.content{min-width:0;padding-bottom:5rem}

/* ── hero 封面区 ── */
.hero{position:relative;padding:3.6rem 0 2.4rem;background-image:var(--hero-grad);
  border-bottom:1px solid var(--line)}
.hero .kicker{font-family:var(--mono);font-size:.74rem;letter-spacing:.32em;color:var(--accent);margin-bottom:.9rem}
.hero h1{font-size:2.3rem;line-height:1.3;margin:0 0 .7rem;letter-spacing:-.022em}
.hero .sub{color:var(--fg-dim);margin:0 0 1.8rem;max-width:38rem}
.stats{display:flex;flex-wrap:wrap;gap:.7rem;margin:0 0 1.5rem}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:.7rem 1.1rem;
  min-width:7.5rem;box-shadow:0 1px 2px rgba(35,28,16,.04)}
.stat .n{font-size:1.25rem;font-weight:700;letter-spacing:-.02em;line-height:1.3}
.stat .l{font-size:.7rem;color:var(--fg-faint);font-family:var(--mono);letter-spacing:.06em}
.meta-line{display:flex;flex-wrap:wrap;gap:.45rem;margin:0 0 1.3rem}
.hero .note{font-size:.76rem;color:var(--fg-faint);line-height:1.8;border-left:2px solid var(--accent-line);
  padding-left:.9rem;max-width:36rem}

/* ── 目录 ── */
.toc-doc{padding:2.2rem 0 1.6rem;border-bottom:1px solid var(--line)}
.toc-doc h2{font-size:1.05rem;margin:0 0 .9rem;letter-spacing:.02em}
.toc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(19rem,1fr));gap:.9rem}
.toc-card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:.9rem 1.05rem;
  transition:border-color .12s,box-shadow .12s}
.toc-card:hover{border-color:var(--accent-line);box-shadow:var(--shadow)}
.toc-card .tp{display:flex;align-items:baseline;gap:.6em;margin-bottom:.35rem}
.toc-card .tp a{font-weight:700;color:var(--fg);font-size:.92rem}
.toc-card .tp .pn{font-family:var(--mono);font-size:.66rem;color:var(--accent);letter-spacing:.12em}
.toc-card ol{list-style:none;margin:0;padding:0;font-size:.8rem}
.toc-card ol li{display:flex;gap:.55em;align-items:baseline;padding:.1rem 0}
.toc-card ol .cn{font-family:var(--mono);font-size:.7rem;color:var(--fg-faint);min-width:2em}
.toc-card ol a{color:var(--fg-dim)}
.toc-card ol a:hover{color:var(--accent)}

/* ── 部与章 ── */
.part{padding:3.4rem 0 .3rem}
.part .pn{font-family:var(--mono);font-size:.74rem;letter-spacing:.3em;color:var(--accent)}
.part h2{font-size:1.7rem;margin:.3rem 0 .6rem;letter-spacing:-.018em;scroll-margin-top:calc(var(--top-h) + .8rem)}
.part .pd{color:var(--fg-dim);max-width:42rem;margin:0;padding-bottom:1.1rem;border-bottom:1px solid var(--line)}
.chp{padding-top:2.4rem}
.chp>h3.ct{font-size:1.2rem;margin:0 0 .9rem;padding-bottom:.45rem;border-bottom:1px solid var(--line-soft);
  scroll-margin-top:calc(var(--top-h) + .8rem)}
.chp>h3.ct .num{font-family:var(--mono);color:var(--accent);margin-right:.7em;font-size:.92em}
.chp>h3.ct .anch{float:right;font-family:var(--mono);font-size:.67rem;color:var(--fg-faint);
  border:1px solid var(--line);border-radius:6px;padding:.12em .55em;margin-top:.35em}

/* ── 章节正文（marked 输出）── */
.bd h2,.bd h3{font-size:1rem;margin:1.7rem 0 .55rem;font-weight:650;scroll-margin-top:calc(var(--top-h) + .8rem)}
.bd h4{font-size:.9rem;margin:1.25rem 0 .4rem;color:var(--fg-dim);font-weight:650}
.bd p{margin:.75rem 0}
.bd ul,.bd ol{padding-left:1.5rem;margin:.6rem 0}
.bd li{margin:.28rem 0}
.bd li::marker{color:var(--fg-faint)}
.bd strong{font-weight:650}
.bd code{font-family:var(--mono);font-size:.85em;background:var(--code-bg);padding:.12em .38em;
  border-radius:5px;border:1px solid var(--line-soft)}
.bd pre{background:var(--code-bg);border:1px solid var(--line);border-radius:10px;padding:.9rem 1.1rem;
  overflow-x:auto;font-size:.8rem;line-height:1.65}
.bd pre code{background:none;border:0;padding:0;font-size:1em}
.bd blockquote{margin:1rem 0;padding:.7rem 1rem;background:var(--bg-soft);
  border-left:3px solid var(--accent-line);border-radius:0 8px 8px 0;color:var(--fg-dim)}
.bd blockquote p{margin:.3rem 0}
.bd blockquote strong{color:var(--fg)}
.bd hr{border:0;border-top:1px solid var(--line);margin:2rem 0}
.bd img{max-width:100%}

/* 表格：网页优势——粘性表头 + 悬停行 + 横向滚动 */
.tw{overflow-x:auto;overflow-y:auto;max-height:82vh;margin:1rem 0;border:1px solid var(--line);
  border-radius:10px;background:var(--panel);box-shadow:0 1px 2px rgba(35,28,16,.04)}
table{border-collapse:collapse;width:100%;font-size:.83rem;line-height:1.6}
th,td{padding:.5rem .8rem;text-align:left;vertical-align:top;border-bottom:1px solid var(--line-soft);
  overflow-wrap:anywhere}
thead th{position:sticky;top:0;z-index:1;background:var(--bg-soft);font-weight:650;font-size:.75rem;
  color:var(--fg-dim);letter-spacing:.05em;white-space:nowrap;border-bottom:1px solid var(--line)}
tbody tr:last-child td{border-bottom:0}
tbody tr{transition:background-color .1s}
tbody tr:hover{background:var(--bg-soft)}
td.nw{white-space:nowrap}
td code{white-space:nowrap}

/* ── 附录 ── */
.apx{padding:3.2rem 0 1rem}
.apx h2{font-size:1.4rem;margin:0 0 .5rem;scroll-margin-top:calc(var(--top-h) + .8rem)}
.apx .pd{color:var(--fg-dim);margin:0 0 1rem;font-size:.86rem}
.apx tr:target td{background:var(--accent-soft)}
.apx tr{scroll-margin-top:calc(var(--top-h) + .8rem)}
.star{color:var(--star)}
.rid{font-family:var(--mono);white-space:nowrap}

/* 图（agent 绘制的 SVG 图源，随明暗主题着色） */
.fig{margin:1.2rem 0;padding:1rem 1rem .6rem;background:var(--panel);border:1px solid var(--line);
  border-radius:12px;box-shadow:0 1px 2px rgba(35,28,16,.04);overflow-x:auto}
.fig svg{display:block;max-width:100%;height:auto;margin:0 auto;font-family:var(--sans)}
.fig figcaption{display:flex;align-items:baseline;gap:.9rem;margin-top:.55rem;
  font-size:.72rem;color:var(--fg-faint)}
.fig .fl{font-family:var(--mono);letter-spacing:.05em;white-space:nowrap}
.fig details{display:inline}
.fig summary{cursor:pointer;color:var(--fg-faint)}
.fig summary:hover{color:var(--accent)}
.fig details[open]{display:block;flex-basis:100%}
.fig details pre{background:var(--code-bg);border:1px solid var(--line-soft);border-radius:8px;
  padding:.7rem .9rem;font-size:.74rem;line-height:1.6;overflow-x:auto;color:var(--fg-dim);
  font-family:var(--mono)}

/* R-ID 悬停预览卡（数据取自附录 DOM） */
#card{position:fixed;z-index:60;max-width:26rem;background:var(--panel);border:1px solid var(--line);
  border-radius:12px;box-shadow:var(--shadow);padding:.75rem 1rem;font-size:.8rem;line-height:1.65;
  display:none;pointer-events:none}
#card .ct{font-family:var(--mono);font-weight:650;color:var(--accent);margin-bottom:.2rem}
#card .cm{color:var(--fg-faint);font-size:.72rem;font-family:var(--mono);margin-top:.35rem}

#toTop{position:fixed;right:1.2rem;bottom:1.2rem;z-index:40;display:none;
  border:1px solid var(--line);background:var(--panel);color:var(--fg-dim);cursor:pointer;
  border-radius:999px;width:2.4rem;height:2.4rem;font-size:1rem;box-shadow:var(--shadow)}
#toTop:hover{color:var(--accent);border-color:var(--accent-line)}

.foot{padding:2.2rem 0 0;margin-top:2.6rem;border-top:1px solid var(--line);
  font-size:.74rem;color:var(--fg-faint);line-height:1.8}

/* ══ 业务流水线 · 人类主视图 ══════════════════════════════════════════════ */
.pipe{padding:2.6rem 0 .4rem}
.pipe .ph{display:flex;align-items:baseline;gap:.8rem;flex-wrap:wrap;margin-bottom:.2rem}
.pipe .ph h2{font-size:1.6rem;margin:0;letter-spacing:-.018em;scroll-margin-top:calc(var(--top-h) + .8rem)}
.pipe .ph .pk{font-family:var(--mono);font-size:.7rem;letter-spacing:.24em;color:var(--accent)}
.pipe .pd{color:var(--fg-dim);margin:.35rem 0 1.1rem;max-width:44rem;font-size:.9rem}

.vbar{display:flex;align-items:center;gap:.65rem;flex-wrap:wrap;margin:0 0 1rem;
  padding:.55rem .8rem;border:1px solid var(--line);border-radius:10px;background:var(--panel);
  font-family:var(--mono);font-size:.73rem;color:var(--fg-dim)}
.vbar .track{flex:1;min-width:90px;height:5px;background:var(--bg-soft);border-radius:999px;overflow:hidden;display:flex}
.vbar .tok{background:var(--ok);height:100%;transition:width .25s ease;width:0}
.vbar .tno{background:var(--warn);height:100%;transition:width .25s ease;width:0}
.vbar button{font-family:var(--mono);font-size:.71rem;border:1px solid var(--line);background:transparent;
  color:var(--fg-dim);border-radius:7px;padding:.24rem .62rem;cursor:pointer;transition:border-color .12s,color .12s}
.vbar button:hover{border-color:var(--accent-line);color:var(--fg)}

.rig{display:grid;grid-template-columns:15.5rem minmax(0,1fr);gap:1.1rem;align-items:start}
@media(max-width:860px){.rig{grid-template-columns:minmax(0,1fr)}}

.flow{display:grid;gap:0;align-content:start}
.fscene{font-family:var(--mono);font-size:.68rem;letter-spacing:.12em;color:var(--fg-faint);
  margin:.9rem 0 .35rem;padding-top:.6rem;border-top:1px solid var(--line-soft)}
.fscene:first-child{margin-top:0;padding-top:0;border-top:0}
.fnode{position:relative;text-align:left;width:100%;font-family:inherit;cursor:pointer;
  border:1px solid var(--line);background:var(--panel);border-radius:10px;padding:.55rem .7rem;
  color:var(--fg);transition:border-color .13s,background-color .13s}
.fnode:hover{border-color:var(--accent-line);background:var(--accent-soft)}
.fnode.on{border-color:var(--accent);background:var(--accent-soft);box-shadow:inset 3px 0 0 var(--accent)}
.fnode .kd{font-family:var(--mono);font-size:.6rem;letter-spacing:.08em;color:var(--fg-faint);
  border:1px solid var(--line);border-radius:4px;padding:0 .3em;margin-right:.4em}
.fnode .nm{font-weight:640;font-size:.87rem}
.fnode .id{font-family:var(--mono);font-size:.65rem;color:var(--fg-faint);display:block;margin-top:.12rem;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fnode .ct{position:absolute;right:.6rem;top:.55rem;font-family:var(--mono);font-size:.66rem;font-weight:640;
  color:var(--accent);background:var(--bg);border:1px solid var(--accent-line);border-radius:999px;
  min-width:1.45rem;text-align:center;padding:0 .28rem}
.fnode.warnnode{border-color:var(--warn-line)}
.fnode.warnnode .ct{color:var(--warn);border-color:var(--warn-line)}
.fnode.holenode{border-color:var(--bad-line)}
.fnode.holenode .ct{color:var(--bad);border-color:var(--bad-line)}
.fedge{display:flex;gap:.4rem;padding:.25rem 0 .25rem .85rem;font-size:.75rem;color:var(--fg-dim);line-height:1.55}
.fedge .ar{font-family:var(--mono);color:var(--fg-faint)}
.fedge.alt{color:var(--warn);padding-left:1.5rem;font-size:.72rem}
.fedge.alt .ar{color:var(--warn-line)}
.fend{padding:.4rem 0 0 .85rem;font-family:var(--mono);font-size:.71rem;color:var(--ok)}

.nlist{border:1px solid var(--line);border-radius:12px;background:var(--panel);overflow:hidden}
.nlist .nh{padding:.75rem .95rem;border-bottom:1px solid var(--line-soft);background:var(--bg-soft)}
.nlist .nt{font-weight:660;font-size:1.02rem}
.nlist .nr{font-family:var(--mono);font-size:.67rem;color:var(--fg-faint);margin-left:.5em}
.nlist .ni{color:var(--fg-dim);font-size:.86rem;margin-top:.22rem;line-height:1.7}
.nlist .nsample{font-size:.79rem;color:var(--fg-faint);margin-top:.4rem;padding-top:.4rem;
  border-top:1px dashed var(--line);line-height:1.65}
.nlist .nsample b{font-family:var(--mono);font-size:.67rem;letter-spacing:.08em;color:var(--accent)}
.grp{border-top:1px solid var(--line-soft)}
.grp .gh{display:flex;align-items:baseline;gap:.5rem;padding:.5rem .95rem .05rem}
.grp .gi{font-family:var(--mono);font-size:.66rem;color:var(--accent);letter-spacing:.1em}
.grp .gt{font-size:.82rem;font-weight:640;color:var(--fg-dim)}
.grp .gb{padding:.05rem .95rem .55rem;display:grid;gap:.3rem}

.it{border:1px solid transparent;border-radius:9px;padding:.4rem .55rem;transition:background-color .12s,border-color .12s}
.it:hover{background:var(--bg-soft)}
.it[data-v="ok"]{background:var(--ok-soft);border-color:var(--ok-line)}
.it[data-v="no"]{background:var(--warn-soft);border-color:var(--warn-line)}
.it.holeit{background:var(--bad-soft);border-color:var(--bad-line)}
.it .tx{font-size:.92rem;line-height:1.78}
.it .tx strong{font-weight:650}
/* 只有带「⚠ 我定的」的句子才把加粗染成待裁定色——那半句正是 AI 替人做的决定 */
.it.hasassume .tx strong{background:var(--warn-soft);border-bottom:1.5px solid var(--warn-line);
  padding:0 .1em;border-radius:2px}
.it.holeit .tx{color:var(--bad)}
.it .mt{display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;margin-top:.28rem}
.it .mt .sp{flex:1}
.it .rr{font-family:var(--mono);font-size:.67rem;color:var(--accent);background:var(--accent-soft);
  border:1px solid var(--accent-line);border-radius:5px;padding:.02rem .34rem}
.it .rr:hover{text-decoration:none;background:var(--accent);color:var(--accent-fg)}
.vb{font-family:var(--mono);font-size:.67rem;border:1px solid var(--line);background:var(--bg);
  color:var(--fg-dim);border-radius:6px;padding:.12rem .52rem;cursor:pointer;transition:all .12s}
.vb:hover{border-color:var(--accent-line);color:var(--fg)}
.vb.ok.on{background:var(--ok-soft);border-color:var(--ok-line);color:var(--ok);font-weight:640}
.vb.no.on{background:var(--warn-soft);border-color:var(--warn-line);color:var(--warn);font-weight:640}
.it .as{margin-top:.3rem;font-size:.81rem;color:var(--warn);display:flex;gap:.4rem;align-items:baseline}
.it .as .ai{font-family:var(--mono);font-size:.65rem;letter-spacing:.07em;white-space:nowrap}
.it .nb{display:none;width:100%;margin-top:.3rem;font-family:var(--sans);font-size:.84rem;
  border:1px solid var(--warn-line);background:var(--bg);color:var(--fg);border-radius:7px;
  padding:.32rem .5rem;resize:vertical;min-height:1.9rem}
.it[data-v="no"] .nb{display:block}
.nempty{padding:.8rem .95rem;color:var(--warn);font-size:.86rem;line-height:1.7}

#vout{margin:1rem 0 0;font-family:var(--mono);font-size:.74rem;line-height:1.7;white-space:pre-wrap;
  color:var(--fg-dim);background:var(--bg-soft);border:1px solid var(--line);border-radius:10px;
  padding:.8rem 1rem;overflow-x:auto;max-height:24rem;overflow-y:auto;display:none}

/* 范围边界（P6 提前呈现：非目标暴露最晚，猜错代价最高）*/
.scope{margin:2.2rem 0 .4rem;border:1px solid var(--warn-line);background:var(--warn-soft);
  border-radius:12px;padding:.9rem 1.1rem}
.scope .st{font-family:var(--mono);font-size:.68rem;letter-spacing:.16em;color:var(--warn);margin-bottom:.45rem}
.scope .sb{font-size:.89rem;line-height:1.8}
.scope .sb ul{margin:.2rem 0;padding-left:1.3rem}
.scope .sb p:first-child{margin-top:0}
.scope .sb p:last-child{margin-bottom:0}

/* 支撑材料分隔 */
.supp{margin:3rem 0 0;padding-top:1.4rem;border-top:2px solid var(--line)}
.supp .sh{font-family:var(--mono);font-size:.7rem;letter-spacing:.2em;color:var(--fg-faint)}
.supp .sd{color:var(--fg-dim);font-size:.86rem;margin:.4rem 0 0;max-width:44rem}
details.pack{margin-top:1rem;border:1px solid var(--line);border-radius:12px;background:var(--panel);overflow:hidden}
details.pack>summary{cursor:pointer;padding:.7rem 1rem;font-weight:650;list-style:none;
  display:flex;align-items:baseline;gap:.7rem;background:var(--bg-soft)}
details.pack>summary::-webkit-details-marker{display:none}
details.pack>summary::before{content:"▸";font-family:var(--mono);color:var(--accent);font-size:.8rem}
details.pack[open]>summary::before{content:"▾"}
details.pack>summary .pn2{font-family:var(--mono);font-size:.66rem;letter-spacing:.14em;color:var(--accent)}
details.pack>summary .pdesc{font-weight:400;font-size:.8rem;color:var(--fg-faint);flex:1}
details.pack .packb{padding:0 1.1rem 1rem;border-top:1px solid var(--line-soft)}

/* ── 打印降级（不是设计目标，但 Ctrl+P 仍可用）── */
@media print{
  body{background:#fff;font-size:10.5pt}
  .top,.side,#toTop,#card{display:none!important}
  .wrap{display:block;max-width:none;padding:0}
  .hero{background:none;padding-top:2rem}
  .part{page-break-before:always}
  .tw{max-height:none;overflow:visible;border-radius:0}
  .tw,.bd pre,.bd blockquote,.chp>h3.ct,.fig{break-inside:avoid}
  thead th{position:static}
  a{color:inherit}
  .apx{page-break-before:always}
  /* 流水线：纸上点不开，全部摊平；裁定控件无意义，隐藏 */
  .rig{display:block}
  .flow{margin-bottom:1rem}
  .nlist{border:0}
  .nlist[hidden]{display:block!important}
  .nlist+.nlist{margin-top:.6rem}
  details.pack[open]>summary~*,details.pack>.packb{display:block!important}
  .vbar,.vb,.nb,#vout{display:none!important}
  .it,.grp,.nlist{break-inside:avoid}
  details.pack{border:0}
  details.pack>summary{background:none;padding-left:0}
  details.pack .packb{padding-left:0;padding-right:0}
  .supp{page-break-before:always}
}
@page{size:A4;margin:16mm 14mm}
`

// 渐进增强：主题切换 / 阅读进度 / 侧栏滚动定位 / R-ID 悬停卡 / 回到顶部。删掉本段即纯静态文档。
const APP = String.raw`
const $=(s,r)=>(r||document).querySelector(s), $$=(s,r)=>[...(r||document).querySelectorAll(s)]
/* 主题 */
const setTheme=t=>{document.documentElement.dataset.theme=t
  try{localStorage.setItem('pact-doc-theme',t)}catch(e){}
  const b=$('#theme'); if(b)b.textContent=t==='dark'?'☾':'☀'}
$('#theme').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark')
try{setTheme(localStorage.getItem('pact-doc-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'))}
catch(e){setTheme('light')}
/* 阅读进度 */
const bar=$('#bar')
addEventListener('scroll',()=>{const h=document.documentElement
  bar.style.width=(h.scrollTop/(h.scrollHeight-h.clientHeight)*100)+'%'
  $('#toTop').style.display=h.scrollTop>800?'block':'none'},{passive:true})
$('#toTop').onclick=()=>scrollTo({top:0,behavior:'smooth'})
/* 侧栏滚动定位 */
const links=$$('.side a[href^="#"]'), map=new Map(links.map(a=>[a.getAttribute('href').slice(1),a]))
const obs=new IntersectionObserver(es=>{for(const e of es){if(!e.isIntersecting)continue
  links.forEach(a=>a.classList.remove('on'));const a=map.get(e.target.id);if(a){a.classList.add('on')
  const r=a.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)a.scrollIntoView({block:'nearest'})}}},
  {rootMargin:'-10% 0px -80% 0px'})
map.forEach((_,id)=>{const t=document.getElementById(id);if(t)obs.observe(t)})
/* R-ID 悬停预览卡：数据直接读附录表行，零额外负载 */
const card=$('#card')
document.addEventListener('mouseover',e=>{
  const a=e.target.closest('a[href^="#req-R"]'); if(!a){card.style.display='none';return}
  const tr=document.getElementById(a.getAttribute('href').slice(1)); if(!tr)return
  const td=tr.children
  card.innerHTML='<div class="ct">'+td[0].textContent.trim()+'</div><div>'+td[1].textContent.trim()+'</div>'+
    '<div class="cm">'+[td[2],td[3],td[4]].map(c=>c.textContent.trim()).filter(x=>x&&x!=='—').join(' · ')+'</div>'
  card.style.display='block'
  const b=a.getBoundingClientRect(),h=card.offsetHeight
  card.style.left=Math.min(b.left,innerWidth-card.offsetWidth-12)+'px'
  card.style.top=(b.bottom+h+12>innerHeight?b.top-h-8:b.bottom+8)+'px'
})
document.addEventListener('mouseout',e=>{if(e.target.closest('a[href^="#req-R"]'))card.style.display='none'})
/* 支撑材料默认折叠：跳向被折叠的章节时先展开，否则侧栏/交叉引用点了没反应 */
const reveal=(id,scroll)=>{const t=id&&document.getElementById(id); if(!t)return
  for(let d=t.closest('details');d;d=d.parentElement&&d.parentElement.closest('details'))d.open=true
  // 直接带 #hash 打开时，目标还在折叠的 details 里、没有布局，浏览器的首次跳转会落空 → 展开后补跳一次
  // 补跳用 auto：html{scroll-behavior:smooth} 会把它变成动画，而带 hash 打开应当直接落位
  if(scroll)requestAnimationFrame(()=>t.scrollIntoView({behavior:'auto'}))}
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]'); if(a)reveal(a.getAttribute('href').slice(1))})
addEventListener('hashchange',()=>reveal(location.hash.slice(1)))
if(location.hash)reveal(location.hash.slice(1),true)

/* ── 业务流水线：节点切换 + 逐句裁定 + 导出 ──
   裁定状态存 localStorage（本文件零后端、零外部请求，不能自动回写真源）；
   导出的是一段可直接粘回对话的结构化文本，由 AI 据此走 /pact-change。 */
;(function(){
  const stack=$('#nstack'), flow=$('#flow'); if(!stack||!flow) return
  const lists=$$('.nlist',stack), items=$$('.it',stack)
  const KEY='pact-verdict:'+(window.PACT_DOC||'doc')
  let V={}; try{V=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){V={}}
  const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(V))}catch(e){}}
  const vOf=id=>(V[id]||{}).v||''

  function show(k){
    let hit=false
    lists.forEach(l=>{const m=l.dataset.k===k; l.hidden=!m; if(m)hit=true})
    if(!hit&&lists.length){lists.forEach((l,i)=>l.hidden=i!==0); k=lists[0].dataset.k}
    $$('.fnode',flow).forEach(b=>b.classList.toggle('on',b.dataset.k===k))
  }
  function paint(it){
    const v=vOf(it.dataset.i)
    it.dataset.v=v
    $$('.vb',it).forEach(b=>b.classList.toggle('on',b.dataset.a===v))
    const nb=$('.nb',it); if(nb) nb.value=(V[it.dataset.i]||{}).n||''
  }
  function stat(){
    let ok=0,no=0
    items.forEach(i=>{const v=vOf(i.dataset.i); if(v==='ok')ok++; else if(v==='no')no++})
    const t=items.length||1
    $('#vok').style.width=(ok/t*100)+'%'; $('#vno').style.width=(no/t*100)+'%'
    $('#vtext').textContent=(ok+no===items.length&&items.length)
      ? ('全部裁定完 · 认了 '+ok+' · 异议 '+no)
      : ('共 '+items.length+' 条 · 未裁定 '+(items.length-ok-no)+' · 认了 '+ok+' · 异议 '+no)
  }
  flow.addEventListener('click',e=>{const b=e.target.closest('.fnode'); if(b)show(b.dataset.k)})
  $$('[data-jump]').forEach(a=>a.addEventListener('click',()=>show(a.getAttribute('data-jump'))))
  stack.addEventListener('click',e=>{
    const b=e.target.closest('.vb'); if(!b) return
    const it=b.closest('.it'), id=it.dataset.i, a=b.dataset.a
    const nv=vOf(id)===a?'':a
    V[id]=V[id]||{}; V[id].v=nv
    if(nv!=='no') delete V[id].n
    if(!nv&&!V[id].n) delete V[id]
    paint(it); persist(); stat()
  })
  stack.addEventListener('input',e=>{
    if(!e.target.classList||!e.target.classList.contains('nb')) return
    const id=e.target.closest('.it').dataset.i
    V[id]=V[id]||{}; V[id].n=e.target.value; persist()
  })
  $('#vreset').addEventListener('click',()=>{
    V={}; persist(); items.forEach(paint); stat(); $('#vout').style.display='none'
  })
  $('#vexport').addEventListener('click',()=>{
    const ok=[],no=[],todo=[],rids={}
    items.forEach(i=>{
      const v=vOf(i.dataset.i)
      const rs=$$('.rr',i).map(a=>a.textContent.trim()).join('/')||'(无R-ID)'
      const nd=(i.closest('.nlist').querySelector('.nt')||{}).textContent||''
      if(v==='ok') ok.push(rs)
      else if(v==='no'){
        no.push('  '+rs+'  @'+nd.trim()+'\n    「'+(((V[i.dataset.i]||{}).n||'').trim()||'(未写原因)')+'」')
        rs.split('/').forEach(r=>{if(/^R\d{3}$/.test(r))rids[r]=1})
      } else todo.push(rs)
    })
    const uniq=a=>[...new Set(a)]
    const el=$('#vout')
    el.textContent='PACT-VERDICT v1 · '+(window.PACT_FILE||'PACT.md')+'\n'
      +'逐句裁定 · 共 '+items.length+' 句 / '+lists.length+' 个节点\n\n'
      +'认了     '+(uniq(ok).join(' ')||'—')+'\n\n'
      +'有异议\n'+(no.length?no.join('\n'):'  —')+'\n\n'
      +'未裁定   '+(uniq(todo).join(' ')||'—')+'\n\n'
      +(no.length
        ? '→ 下一步：/pact-change 处理 '+no.length+' 条异议（涉及 '+Object.keys(rids).sort().join(' ')+'）\n'
          +'  回 P5 改 R-ID → T1 补验收 → 改 C 层契约 → 记 changelog → 同步执行图谱 → 重生成本书'
        : '→ 无异议。')
    el.style.display='block'
    el.scrollIntoView({block:'nearest',behavior:'smooth'})
  })
  items.forEach(paint); stat()
  show(lists.length?lists[0].dataset.k:'')
})()
`

/** 业务流水线 · 人类主视图：左侧节点链 + 右侧该节点的自然语言需求清单
 *  全部节点清单都渲染进 HTML，JS 只负责「只显示当前一个」——
 *  禁用 JS 时它们平铺展开，仍然完整可读；打印同理（见 @media print）。 */
function renderPipeline({ flows, nodes, GROUPS, marked, ridSet }) {
  if (!flows.length || !nodes.length) return { html: '', nav: '' }
  const byKey = new Map(nodes.map(n => [n.key, n]))
  const inline = md => (marked.parseInline ? marked.parseInline(md) : marked.parse(md).replace(/^<p>|<\/p>\s*$/g, ''))
  const anyHole = n => GROUPS.some(([k]) => n.groups[k].some(i => i.hole))

  const nodeBtn = k => {
    const n = byKey.get(k); if (!n) return ''
    const cls = ['fnode', anyHole(n) ? 'holenode' : (n.count ? '' : 'warnnode')].filter(Boolean).join(' ')
    return `<button class="${cls}" data-k="${esc(k)}" type="button">` +
      `<span class="kd">${esc(n.kind)}</span><span class="nm">${esc(n.name)}</span>` +
      (n.ident ? `<span class="id">${esc(n.ident)}</span>` : '') +
      `<span class="ct">${anyHole(n) ? '⛔' : n.count}</span></button>`
  }

  // ── 左栏：按场景顺序铺开主链，回头路单列（退回/驳回/超时最常被漏，必须显式画出）──
  let flow = ''
  for (const f of flows) {
    flow += `<div class="fscene">${esc(f.id)} · ${esc(f.title)}</div>`
    const chain = f.edges.filter(e => !e.alt)
    const seen = new Set()
    if (chain.length) {
      flow += nodeBtn(chain[0].from); seen.add(chain[0].from)
      for (const e of chain) {
        if (e.end) { flow += `<div class="fend">✓ ${esc(e.endText)}</div>`; continue }
        flow += `<div class="fedge"><span class="ar">↓</span><span>${esc(e.by)}</span></div>`
        if (!seen.has(e.to)) { flow += nodeBtn(e.to); seen.add(e.to) }
      }
    } else for (const k of f.nodes) { if (!seen.has(k)) { flow += nodeBtn(k); seen.add(k) } }
    for (const e of f.edges.filter(x => x.alt)) {
      const to = e.end ? e.endText : (byKey.get(e.to)?.name || e.to)
      flow += `<div class="fedge alt"><span class="ar">↳</span><span>${esc(byKey.get(e.from)?.name || e.from)}：${esc(e.by)} → ${esc(to)}</span></div>`
    }
  }

  // ── 右栏：每个节点一份自然语言清单 ──
  let stack = ''
  for (const n of nodes) {
    const f = flows.find(x => x.nodes.includes(n.key))
    let body = ''
    GROUPS.forEach(([k, name]) => {
      const items = n.groups[k]; if (!items.length) return
      // 不给组编号：四组里缺哪组就整组不出现，编号会跳号（01、03），看起来像渲染漏了
      body += `<div class="grp"><div class="gh"><span class="gi">▸</span>` +
        `<span class="gt">${esc(name)}</span></div><div class="gb">`
      for (const it of items) {
        // 只有真带「⚠ 我定的」的句子，加粗才染成待裁定色；否则加粗只是普通强调
        body += `<div class="it${it.hole ? ' holeit' : ''}${it.assume ? ' hasassume' : ''}" data-i="${esc(it.id)}" data-v="">` +
          `<div class="tx">${inline(it.text)}</div>` +
          (it.assume ? `<div class="as"><span class="ai">⚠ 我定的</span><span>${esc(it.assume)}</span></div>` : '') +
          `<div class="mt">` +
          it.rids.map(r => ridSet.has(r) ? `<a class="rr" href="#req-${r}">${r}</a>` : `<span class="rr">${esc(r)}</span>`).join('') +
          `<span class="sp"></span>` +
          `<button class="vb ok" type="button" data-a="ok">认了</button>` +
          `<button class="vb no" type="button" data-a="no">有异议</button></div>` +
          `<textarea class="nb" placeholder="不对在哪？写一句，导出时带走"></textarea></div>`
      }
      body += `</div></div>`
    })
    if (!body) body = `<div class="nempty">这个节点上没有挂任何需求。如果它确实存在于产品里，要么补需求，要么它是野生页面——<b>待人裁定</b>。</div>`
    stack += `<div class="nlist" data-k="${esc(n.key)}">` +
      `<div class="nh"><span class="nt">${esc(n.name)}</span>` +
      `<span class="nr">${esc(n.kind)}${n.ident ? ' · ' + esc(n.ident) : ''}</span>` +
      (n.intro ? `<div class="ni">${esc(n.intro)}</div>` : '') +
      (f && f.sample ? `<div class="nsample"><b>样本</b> ${esc(f.sample)}</div>` : '') +
      `</div>${body}</div>`
  }

  const total = nodes.reduce((a, n) => a + n.count, 0)
  const html = `<section class="pipe" id="pipeline">
  <div class="ph"><span class="pk">PIPELINE</span><h2>业务流水线</h2></div>
  <p class="pd">顺着业务真实的走法看这个系统：左边每个节点是一个<strong>能打开的页面</strong>或<strong>在跑的功能点</strong>，
  点它，右边就是这个节点上的全部需求——用人话写，分成四组。
  每条句子可以直接裁定：读着不对就点「有异议」写一句，最后导出给 AI 走变更。</p>
  <div class="vbar">
    <span id="vtext">共 ${total} 条 · 未裁定 ${total}</span>
    <span class="track"><span class="tok" id="vok"></span><span class="tno" id="vno"></span></span>
    <button type="button" id="vexport">导出裁定结果</button>
    <button type="button" id="vreset">重置</button>
  </div>
  <div class="rig"><nav class="flow" id="flow">${flow}</nav><div id="nstack">${stack}</div></div>
  <pre id="vout"></pre>
</section>`

  const nav = `<div class="st">业务流水线</div>` + nodes.map(n =>
    `<a class="ch" href="#pipeline" data-jump="${esc(n.key)}">${esc(n.name)}</a>`).join('')
  return { html, nav }
}

export function renderHTML({ title, headerMeta, chapters, reqs, milestones, counts, file, figs,
                            flows, nodes, pipelineIssues, GROUPS }) {
  figs = figs || new Map()
  flows = flows || []; nodes = nodes || []; GROUPS = GROUPS || []
  const marked = loadMarked()
  const ridSet = new Set(reqs.map(r => r.id))
  const byPart = p => chapters.filter(c => c.part === p)
  const status = (headerMeta.find(m => /状态/.test(m.k)) || {}).v || ''
  const frozen = /已冻结/.test(status)

  // ── hero 封面区 ──
  const stats = [
    [reqs.length, '需求 R-ID'],
    [counts.decisions, '决策（含已否决）'],
    [counts.invs, '不变量'],
    [milestones.length, '里程碑'],
  ]
  const metaBadges = headerMeta
    .filter(m => !/状态/.test(m.k))
    .map(m => `<span class="badge">${esc(m.k)} · ${esc(m.v)}</span>`).join('')
  const hero = `<header class="hero" id="cover">
  <div class="kicker">产品需求与系统设计规格书</div>
  <h1>${esc(title)}</h1>
  <p class="sub">本文档整合传统交付物中 PRD（产品需求）、SDD（系统设计）与 SPEC（技术规格）的全部内容，
  以统一编号交叉引用，作为本项目唯一的对外规格交付物。</p>
  <div class="stats">${stats.map(([n, l]) => `<div class="stat"><div class="n">${esc(n)}</div><div class="l">${esc(l)}</div></div>`).join('')}</div>
  <div class="meta-line">${status ? `<span class="badge frozen">${esc(status)}</span>` : ''}${metaBadges}</div>
  <p class="note">本文档由规格真源 <code>${esc(file)}</code> 自动生成，与真源逐字对应；
  请勿直接修改本文件——修改真源后重新生成即可。规格冻结后的任何变更均记录于变更记录（changelog）。</p>
</header>`

  // ── 目录（部卡片网格） ──
  const tocCards = PARTS.map(([p, name, en], pi) => {
    const rows = byPart(p).map((c, ci) =>
      `<li><span class="cn">${pi + 1}.${ci + 1}</span><a href="#ch-${c.id}">${esc(c.title)}</a></li>`).join('')
    return `<div class="toc-card"><div class="tp"><span class="pn">${en}</span><a href="#part-${p}">第${'一二三四'[pi]}部分 · ${name}</a></div><ol>${rows}</ol></div>`
  }).join('')
  // 开关与 renderPipeline 保持一致：看节点，不看场景。旧格式 P4 有 `### S1` 会被解析成 flow，
  // 只看 flows 会在目录里挂一张空的流水线卡片。
  const pipeCard = (flows.length && nodes.length) ? `<div class="toc-card"><div class="tp"><span class="pn">PIPELINE</span>
    <a href="#pipeline">业务流水线 · 先看这里</a></div>
    <ol>${nodes.slice(0, 8).map((n, i) => `<li><span class="cn">${String(i + 1).padStart(2, '0')}</span><a href="#pipeline" data-jump="${esc(n.key)}">${esc(n.name)}</a></li>`).join('')}</ol></div>` : ''
  const toc = `<nav class="toc-doc" id="toc"><h2>目录</h2><div class="toc-grid">${pipeCard}${tocCards}
  <div class="toc-card"><div class="tp"><span class="pn">APPENDIX</span><a href="#appendix">附录 · 需求索引（R-ID）</a></div></div></div></nav>`

  // ── 四大部分正文 ──
  const body = PARTS.map(([p, name, en, desc], pi) => {
    const secs = byPart(p).map((c, ci) => {
      let md = c.body.replace(/^##\s+.*(\r?\n)+/, '')          // 去掉与本节标题重复的首行 H2
      let html = wrapTables(marked.parse(crossRef(md, ridSet)))
      // 图占位符 → 内嵌 SVG（agent 绘制的 figures/<id>.svg，src-hash 已在构建侧核对）
      html = html.replace(/<p>@@FIG:([\w.-]+)@@<\/p>/g, (m0, id) => {
        const f = figs.get(id); if (!f) return m0
        const svg = f.svg.replace(/<\?xml[^>]*\?>|<!DOCTYPE[^>]*>|<script[\s\S]*?<\/script>/gi, '')
        return `<figure class="fig" id="fig-${esc(id)}">${svg}
<figcaption><span class="fl">图 ${esc(id)}</span><details><summary>查看文本源（与真源逐字一致）</summary><pre>${esc(f.src)}</pre></details></figcaption></figure>`
      })
      return `<section class="chp" id="ch-${c.id}">
<h3 class="ct"><span class="num">${pi + 1}.${ci + 1}</span>${esc(c.title)}<span class="anch">${c.id}</span></h3>
<div class="bd">${html}</div></section>`
    }).join('\n')
    return `<details class="pack" id="part-${p}"${p === 'P' ? ' open' : ''}>
<summary><span class="pn2">${en}</span>第${'一二三四'[pi]}部分 · ${name}<span class="pdesc">${byPart(p).length} 节</span></summary>
<div class="packb">${secs}</div></details>`
  }).join('\n')

  // ── 业务流水线（人类主视图，置于四层规格之前）──
  const pipe = renderPipeline({ flows, nodes, GROUPS, marked, ridSet })

  // ── 范围边界：P6 非目标提前呈现 ──
  // 非目标是猜错代价最高的一类，因为它**暴露最晚**（一路到验收才会有人问「怎么没这个功能」）。
  // 它在第一部分里排在第六节，人翻不到；这里提到主视图旁边，只提这一节，不搬别的。
  const p6 = chapters.find(c => c.id === 'P6')
  const scope = p6 ? `<section class="scope">
  <div class="st">范围边界 · 明确不做的事（摘自 P6）</div>
  <div class="sb">${wrapTables(marked.parse(crossRef(p6.body.replace(/^##\s+.*(\r?\n)+/, ''), ridSet)))}</div>
</section>` : ''

  const suppHead = `<section class="supp" id="supp">
  <div class="sh">SUPPORTING MATERIAL</div>
  <h2 style="font-size:1.35rem;margin:.35rem 0 0;letter-spacing:-.015em">支撑材料 · 四层完整规格</h2>
  <p class="sd">上面的流水线是这份规格的<strong>视图</strong>，下面才是<strong>全文</strong>——施工方要的精度一分没少，
  只是不再挡在需求方前面。展开任意一部分即可逐节阅读；正文中的 R-ID 可悬停预览、点击跳转。</p>
</section>`

  // ── 附录：R-ID 需求索引 ──
  const apxRows = reqs.map(r =>
    `<tr id="req-${r.id}"><td class="rid">${r.id}${r.star ? ' <span class="star">★</span>' : ''}</td>` +
    `<td>${esc(r.desc)}</td><td>${esc(r.type || '—')}</td><td>${esc(r.prio || '—')}</td>` +
    `<td class="rid">${esc(r.milestone || '未排')}</td></tr>`).join('')
  const appendix = `<section class="apx" id="appendix"><h2>附录 · 需求索引（R-ID）</h2>
<p class="pd">全部需求条目一览。每条的验收方式见 <a href="#ch-T1">4.1 验收清单</a>；★ 为强制项。正文中的 R-ID 引用悬停可预览、点击跳回本表。</p>
<div class="tw"><table><thead><tr><th>R-ID</th><th>需求</th><th>类型</th><th>优先级</th><th>里程碑</th></tr></thead>
<tbody>${apxRows}</tbody></table></div></section>`

  // ── 侧边目录 ──
  const side = `<nav class="side" aria-label="目录"><div class="st">目录</div>
<a href="#cover">封面</a>${pipe.nav}<div class="st">支撑材料</div>${PARTS.map(([p, name, en], pi) =>
    `<a class="part" href="#part-${p}">第${'一二三四'[pi]}部分 · ${name}<span class="pk">${en}</span></a>` +
    byPart(p).map((c, ci) => `<a class="ch" href="#ch-${c.id}">${pi + 1}.${ci + 1} ${esc(c.title)}</a>`).join('')
  ).join('')}<a class="part" href="#appendix">附录 · 需求索引</a></nav>`

  const foot = `<footer class="foot">本规格书为单文件自包含产物：无外部依赖、无网络请求，可直接作为附件分发；需要纸质版直接打印（Ctrl+P）。<br>
  真源：<code>${esc(file)}</code>（含 30 个机器可校验锚点）· 需求 ${reqs.length} · 决策 ${counts.decisions} · 不变量 ${counts.invs} · 里程碑 ${milestones.length}</footer>`

  return `<!doctype html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · 规格书</title>
<style>${CSS}</style>
</head>
<body>
<div class="top"><div class="top-in">
  <div class="tt"><a href="#cover">${esc(title)}</a></div>
  ${frozen ? `<span class="badge frozen">${esc(status)}</span>` : ''}
  <span class="sp"></span>
  <button class="iconbtn" id="theme" title="明暗主题">☀</button>
</div><div id="bar"></div></div>
<div class="wrap">
${side}
<main class="content">
${hero}
${toc}
${pipe.html}
${scope}
${suppHead}
${body}
${appendix}
${foot}
</main>
</div>
<div id="card"></div>
<button id="toTop" title="回到顶部">↑</button>
<script>window.PACT_DOC=${JSON.stringify(title)};window.PACT_FILE=${JSON.stringify(file)};
${APP}</script>
</body>
</html>`
}
