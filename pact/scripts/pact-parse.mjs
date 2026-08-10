// pact-parse.mjs — PACT.md 解析层（pact-book 与 pact-estimate 共用）
//
// 单一解析器，两处消费：
//   · pact-book.mjs     —— 生成 md 知识库与单文件 HTML
//   · pact-estimate.mjs —— 驱动因子分层法测算工期与成本
//
// **两份解析器必然漂移**，所以抽出来共用。改这里要跑：
//   pact-book.sh --check   （产物须字节级不变，这是本模块的回归信号）

/** 解析一份 PACT.md，返回结构化数据模型 */
export function parsePact(FILE, SRC) {
const LINES = SRC.split('\n')

// ── 通用小工具 ──────────────────────────────────────────────────────────────
const ANCHOR_ORDER = ['P1','P2','P3','P4','P5','P6','P7','P8','A1','A2','A3','A4','A5','A6',
                      'C1','C2','C3','C4','C5','C6','C7','C8','C9','C10','C11','T1','T2','T3','T4','T5']
const PART = { P: ['p', 'Product · 为什么与做什么'], A: ['a', 'Architecture · 怎么搭'],
               C: ['c', 'Contracts · 精确到可以打字'], T: ['t', 'Tests · 做到什么算完成'] }

/** 拆一行 markdown 表格为单元格数组；不是表格行则返回 null */
function cells(line) {
  const t = line.trim()
  if (!t.startsWith('|')) return null
  if (/^\|[\s:|-]+\|$/.test(t)) return null           // 分隔行
  return t.replace(/^\|/, '').replace(/\|$/, '').split('|').map(s => s.trim())
}
/** 去掉 markdown 强调/删除线，供取 ID 用 */
const plain = s => (s || '').replace(/\*\*/g, '').replace(/~~/g, '').replace(/`/g, '').trim()
/** 文件名安全化：mdbook 的 SUMMARY 解析器不接受路径里有空格与半角括号，全部换成连字符 */
const safe = (s, max = 40) => (s || '')
  .replace(/[\/\\:*?"<>|#%{}^~\[\]`$'&+,;=@]/g, '-')   // 文件系统 / URL 危险字符
  .replace(/[()（）【】《》「」]/g, '-')                      // 括号会截断 markdown 链接
  .replace(/\s+/g, '-')                                    // 空格 → 连字符
  .replace(/-{2,}/g, '-').replace(/^-|-$/g, '')             // 收敛连字符
  .slice(0, max).replace(/-$/, '')
/** 展开 "R001–R012、R101、**R217**" 这类 R-ID 集合（含 en/em dash 与波浪号区间） */
function expandRIDs(text) {
  const out = []
  const s = plain(text)
  const re = /R(\d{3})\s*[–—~-]\s*R(\d{3})|R(\d{3})/g
  let m
  while ((m = re.exec(s))) {
    if (m[1] && m[2]) { for (let i = +m[1]; i <= +m[2]; i++) out.push('R' + String(i).padStart(3, '0')) }
    else out.push('R' + m[3])
  }
  return [...new Set(out)]
}

// ── ① 按锚点切章节 ──────────────────────────────────────────────────────────
const anchorAt = []                                   // {id, line}
LINES.forEach((l, i) => { const m = l.match(/^<!--\s*PACT:([A-Z]\d{1,2})\s*-->\s*$/); if (m) anchorAt.push({ id: m[1], line: i }) })
if (!anchorAt.length) { console.error('[FAIL] 未找到任何 <!-- PACT:xx --> 锚点，这不像一份 PACT.md'); process.exit(1) }

const chapters = anchorAt.map((a, idx) => {
  const from = a.line + 1
  const to = idx + 1 < anchorAt.length ? anchorAt[idx + 1].line : LINES.length
  let body = LINES.slice(from, to)
  // 尾部清理：属于下一章的部级大标题与分隔线不带过来
  while (body.length && (body[body.length - 1].trim() === '' || body[body.length - 1].trim() === '---' ||
         /^#\s+第.+部分/.test(body[body.length - 1]) || /^>\s*\*\*精度门槛\*\*/.test(body[body.length - 1]))) body.pop()
  const head = body.find(l => /^##\s+/.test(l)) || ''
  const title = head.replace(/^##\s+/, '').trim() || a.id
  return { id: a.id, part: a.id[0], title, titleShort: title.replace(/^[A-Z]\d{1,2}\s*·\s*/, ''), body: body.join('\n').trim(), from, to }
})
const chById = Object.fromEntries(chapters.map(c => [c.id, c]))
const missingAnchors = ANCHOR_ORDER.filter(a => !chById[a])

// ── ② 解析 P5 的 R-ID ───────────────────────────────────────────────────────
// 列按**表头名**取，不按位置：P5 的列数各项目不同（模板 8 列、feature 档常写 6 列），
// 位置式取值会把「来源」读成「依赖」。表头缺失时退回位置式，保证旧文件仍可解析。
const P5_COLS = [
  ['type',   /类型/],
  ['desc',   /描述|需求/],
  ['accept', /验收/],
  ['prio',   /优先级|优先/],
  ['deps',   /依赖/],
  ['source', /来源|出处/],
  ['assume', /假设/],
]
const P5_FALLBACK = { type: 1, desc: 2, accept: 3, prio: 4, deps: 5, source: 6, assume: 7 }
const reqs = new Map()                                // R### -> {...}
{
  const ch = chById['P5']
  if (ch) {
    let group = '', colOf = null
    for (const line of ch.body.split('\n')) {
      const g = line.match(/^###\s+(.*)$/); if (g) { group = g[1].trim(); continue }
      const c = cells(line); if (!c) continue
      // 表头行：第一格是 R-ID 且没有任何 R### 数据 → 建立列名映射
      if (!/^R\d{3}/.test(plain(c[0])) && /R-?ID/i.test(plain(c[0]))) {
        colOf = {}
        for (const [key, re] of P5_COLS) {
          const i = c.findIndex(h => re.test(plain(h)))
          if (i > 0) colOf[key] = i
        }
        continue
      }
      const id = plain(c[0]).replace(/\s*★.*$/, '').trim()
      if (!/^R\d{3}$/.test(id)) continue
      if (c.length < 4) continue
      const m = colOf && Object.keys(colOf).length ? colOf : P5_FALLBACK
      const at = k => (m[k] == null ? '' : (c[m[k]] || ''))
      reqs.set(id, {
        id, star: /★/.test(c[0]) || /★/.test(at('source')),
        type: at('type'), desc: at('desc'), accept: at('accept'),
        prio: at('prio'), deps: expandRIDs(at('deps')).filter(x => x !== id),
        source: at('source'), assume: at('assume'), group,
        t1method: '', t1criteria: '', t1checker: '', milestone: '',
        dependents: [], mentionedIn: [], decisions: [], sentences: [], nodes: [],
      })
    }
  }
}

// ── ③ 解析 T1 验收 ──────────────────────────────────────────────────────────
{
  const ch = chById['T1']
  if (ch) for (const line of ch.body.split('\n')) {
    const c = cells(line); if (!c || c.length < 3) continue
    let id = plain(c[0]).replace(/\s*★.*$/, '').trim()
    // 子项验收 R131.3 / R131.9 入库汇总 → 归到父 R131（原子化拆分后 T1 逐子项写，父项即被覆盖）
    const sub = id.match(/^(R\d{3})[.\uff0e]/)
    if (sub) id = sub[1]
    if (!/^R\d{3}$/.test(id)) continue
    const r = reqs.get(id); if (!r) continue
    if (r.t1method) continue  // 已被首个子项覆盖，不覆写
    r.t1method = c[1] || ''; r.t1criteria = c[2] || ''; r.t1checker = c[3] || ''
    if (/★/.test(c[0])) r.star = true
  }
}

// ── ④ 解析 A5 决策 D-ID ─────────────────────────────────────────────────────
const decisions = []
{
  const ch = chById['A5']
  if (ch) {
    const ls = ch.body.split('\n')
    let cur = null
    for (const line of ls) {
      const h = line.match(/^#{3,5}\s+(D\d{3})\s*[·:：-]?\s*(.*)$/)
      if (h) { cur = { id: h[1], title: h[2].trim(), body: [], fields: {} }; decisions.push(cur); continue }
      if (!cur) continue
      if (/^#{1,5}\s/.test(line)) { cur = null; continue }
      cur.body.push(line)
      const f = line.match(/^\s*-\s*\*\*(选项|结论|理由|已否决|影响)\*\*\s*[:：]?\s*(.*)$/)
      if (f) cur.fields[f[1]] = f[2].trim()
      else if (cur._last && /^\s{2,}\S/.test(line)) cur.fields[cur._last] = (cur.fields[cur._last] || '') + ' ' + line.trim()
      cur._last = f ? f[1] : cur._last
    }
    for (const d of decisions) { d.text = d.body.join('\n').trim(); delete d.body; delete d._last }
  }
}
// 决策 ↔ 需求 互链（取「影响」字段 + 全文提及）
for (const d of decisions) {
  const ids = new Set([...expandRIDs(d.fields['影响'] || ''), ...expandRIDs(d.text || '')])
  d.reqs = [...ids].filter(x => reqs.has(x))
  for (const rid of d.reqs) reqs.get(rid).decisions.push(d.id)
}

// ── ⑤ 解析 C3 不变量 ────────────────────────────────────────────────────────
const invs = []
{
  const ch = chById['C3']
  if (ch) for (const line of ch.body.split('\n')) {
    const c = cells(line); if (!c || c.length < 2) continue
    const id = plain(c[0])
    if (!/^INV-\d+$/.test(id)) continue
    invs.push({ id, assert: c[1] || '', consequence: c[2] || '', check: c[3] || '' })
  }
}

// ── ⑥ 解析 T5 里程碑 ────────────────────────────────────────────────────────
const milestones = []
{
  const ch = chById['T5']
  if (ch) for (const line of ch.body.split('\n')) {
    const c = cells(line); if (!c || c.length < 2) continue
    const name = plain(c[0])
    const m = name.match(/^(M\d|并行[\s·]*\S*)/)
    if (!m || !/^\|?\s*\**M\d|并行/.test(plain(c[0]))) continue
    if (!/^(M\d|并行)/.test(name)) continue
    const ids = expandRIDs(c[1] || '')
    const id = /^M\d/.test(name) ? name.match(/^M\d/)[0] : '并行'
    milestones.push({ id, name, reqs: ids.filter(x => reqs.has(x)), exit: c[2] || '', excludes: c[3] || '' })
  }
}
for (const ms of milestones) for (const rid of ms.reqs) {
  const r = reqs.get(rid)
  r.milestone = r.milestone ? `${r.milestone}, ${ms.id}` : ms.id
}

// ── ⑦ 解析 P4 → 业务流水线（节点 + 连线 + 自然语言清单）──────────────────────
// 人类主视图的数据来源。节点 = 人真能打开的页面 / 真在跑的功能点；
// 每个节点下四组固定分组的人话句子，句尾反引号挂 R-ID。详见 templates/PACT.md 的 P4 说明。
const GROUPS = [
  ['do',    '能做什么'],
  ['block', '什么情况会被拦住'],
  ['see',   '谁看得到什么'],
  ['auto',  '背后自动发生了什么'],
]
const GROUP_BY_NAME = Object.fromEntries(GROUPS.map(([k, n]) => [n, k]))
const flows = []                                       // 场景（一条主流程）
const nodes = new Map()                                // key -> 节点（跨场景复用同一个 key）
const pipelineIssues = []                              // {kind, at, msg}
{
  /** "报销列表页 `/expense`" → {name, ident, key}；`@x` 前缀 = 无界面功能点 */
  const nodeRef = s => {
    const t = String(s || '').replace(/^\s*[✓√]\s*/, '').trim()
    const m = t.match(/^(.*?)\s*`([^`]+)`\s*$/)
    const name = plain(m ? m[1] : t).trim()
    const ident = m ? m[2].trim() : ''
    return { name, ident, key: ident || name, kind: /^@/.test(ident) ? '功能点' : '页面' }
  }
  // 同一节点在「流程」里带标识写全、在「回头路」里往往只写名字——按名字归并，
  // 否则会生成一个句子数为 0 的影子节点，并误报成「空节点」。
  const byName = new Map()
  const touch = ref => {
    const key = (!ref.ident && byName.has(ref.name)) ? byName.get(ref.name) : ref.key
    if (!nodes.has(key)) nodes.set(key, {
      key, name: ref.name, ident: ref.ident, kind: ref.kind,
      intro: '', groups: Object.fromEntries(GROUPS.map(([k]) => [k, []])), flows: [], order: nodes.size,
    })
    const n = nodes.get(key)
    if (!n.name && ref.name) n.name = ref.name
    if (!n.ident && ref.ident) { n.ident = ref.ident; n.kind = ref.kind }
    if (n.name) byName.set(n.name, key)
    return n
  }
  /** "A --标签--> B --标签--> ✓ 终点" → [{from,to,by,end}] */
  const parseChain = (txt, alt) => {
    const segs = String(txt).split(/\s*--(.*?)-->\s*/)
    const out = []
    for (let i = 0; i + 2 < segs.length; i += 2) {
      const [a, by, b] = [segs[i], segs[i + 1], segs[i + 2]]
      const fromRef = nodeRef(a); if (!fromRef.key) continue
      const from = touch(fromRef)
      if (/^\s*[✓√]/.test(b)) out.push({ from: from.key, to: '', by: plain(by), end: true, endText: plain(b).replace(/^[✓√]\s*/, ''), alt: !!alt })
      else { const to = touch(nodeRef(b)); out.push({ from: from.key, to: to.key, by: plain(by), end: false, alt: !!alt }) }
    }
    return out
  }

  const ch = chById['P4']
  if (ch) {
    let flow = null, node = null, group = null, last = null
    const lines = ch.body.split('\n')
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li]
      const sc = line.match(/^###\s+(S\d+)\s*[·:：-]?\s*(.*)$/)
      if (sc) { flow = { id: sc[1], title: sc[2].trim(), edges: [], nodes: [], sample: '', done: '', order: flows.length }; flows.push(flow); node = null; group = null; continue }
      if (!flow) continue

      const nh = line.match(/^####\s+(.*)$/)
      if (nh) {
        const ref = nodeRef(nh[1]); node = touch(ref); group = null; last = null
        if (!node.flows.includes(flow.id)) node.flows.push(flow.id)
        if (!flow.nodes.includes(node.key)) flow.nodes.push(node.key)
        continue
      }

      if (!node) {                                     // 场景头部的 流程 / 回头路 / 样本 / 完成态
        const f = line.match(/^\s*-\s*\**\s*(流程|回头路|样本|完成态)\s*\**\s*[:：]\s*(.*)$/)
        if (!f) continue
        const [, key, val] = f
        if (key === '流程') flow.edges.push(...parseChain(val, false))
        else if (key === '回头路') val.split(/[；;]/).forEach(seg => { if (seg.trim()) flow.edges.push(...parseChain(seg, true)) })
        else if (key === '样本') flow.sample = plain(val)
        else flow.done = plain(val)
        continue
      }

      if (/^\s*>\s?/.test(line)) { if (!node.intro) node.intro = plain(line.replace(/^\s*>\s?/, '')); continue }
      // 假设行必须先于句子行判定（它同时满足两条缩进列表的形状）
      const as = line.match(/^\s{3,}-\s*⚠?\s*我定的\s*[:：]\s*(.*)$/)
      if (as && last) { last.assume = plain(as[1]); continue }
      const gh = line.match(/^\s*-\s*\**\s*(.+?)\s*\**\s*$/)
      if (gh && GROUP_BY_NAME[plain(gh[1])] && !/^\s{2,}/.test(line)) { group = GROUP_BY_NAME[plain(gh[1])]; last = null; continue }
      const it = line.match(/^\s{1,}-\s+(.*\S)\s*$/)
      if (it && group) {
        const rids = []
        const text = it[1].replace(/`(R\d{3})`/g, (m0, r) => { rids.push(r); return '' }).replace(/\s{2,}/g, ' ').trim()
        if (!text) continue
        const item = {
          id: `s${flow.order}n${node.order}i${node.groups[group].length}`,
          text, rids, group, node: node.key, flow: flow.id, assume: '', hole: /⛔/.test(text),
        }
        node.groups[group].push(item); last = item
        for (const r of rids) { const rq = reqs.get(r); if (rq) { rq.sentences.push(item.id); if (!rq.nodes.includes(node.key)) rq.nodes.push(node.key) } }
        if (!rids.length) pipelineIssues.push({ kind: 'no-rid', at: `${flow.id} / ${node.name}`, msg: `句子未挂 R-ID：${text.slice(0, 28)}…` })
        for (const r of rids) if (!reqs.has(r)) pipelineIssues.push({ kind: 'bad-rid', at: `${flow.id} / ${node.name}`, msg: `句子挂了 P5 里不存在的 ${r}` })
        if (item.hole) pipelineIssues.push({ kind: 'hole', at: `${flow.id} / ${node.name}`, msg: text.replace(/⛔\s*/, '').slice(0, 48) })
      }
    }
  }
}
// 流水线体检：空节点 / 死路 / 够不着的需求
for (const n of nodes.values()) {
  const cnt = GROUPS.reduce((a, [k]) => a + n.groups[k].length, 0)
  n.count = cnt
  if (!cnt) pipelineIssues.push({ kind: 'empty-node', at: n.name, msg: '这个节点上没有挂任何需求——纯展示页？还是野生页面？' })
}
for (const f of flows) for (const k of f.nodes) {
  const out = f.edges.some(e => e.from === k)
  if (!out) pipelineIssues.push({ kind: 'dead-end', at: `${f.id} / ${nodes.get(k)?.name || k}`, msg: '进得去出不来：无出边且未标终点' })
}
// 开关必须看**节点**而不是场景：旧格式 P4 也有 `### S1 · xxx` 标题（会被解析成 flow），
// 但没有 `#### 节点` 块。用 flows.length 当开关会把全部需求误报成「够不着」。
if (nodes.size) for (const r of reqs.values()) {
  if (!r.nodes.length) pipelineIssues.push({ kind: 'uncovered-req', at: r.id, msg: '不出现在任何流程里——野生需求？还是漏了流程？' })
}

// ── ⑧ 反查：依赖倒排 + 章节提及 + 来源 ──────────────────────────────────────
for (const r of reqs.values()) for (const d of r.deps) if (reqs.has(d)) reqs.get(d).dependents.push(r.id)
for (const ch of chapters) {
  if (ch.id === 'P5' || ch.id === 'T1') continue          // 这两章天然全是 R-ID，不算「提及」
  const found = new Set(expandRIDs(ch.body))
  for (const rid of found) if (reqs.has(rid)) reqs.get(rid).mentionedIn.push(ch.id)
}
const sourceIndex = new Map()                              // "SRC-B" -> Set(R-ID)
for (const r of reqs.values()) {
  const tags = plain(r.source).match(/SRC-[A-Z]|冷读|横切|安全|数据铁律|裁定\s*D\d{3}/g) || ['未标注']
  for (const t of new Set(tags.map(x => x.replace(/\s+/g, ' ')))) {
    if (!sourceIndex.has(t)) sourceIndex.set(t, new Set())
    sourceIndex.get(t).add(r.id)
  }
}
return { LINES, chapters, chById, missingAnchors, reqs, decisions, invs, milestones,
         flows, nodes, pipelineIssues, GROUPS,
         sourceIndex, ANCHOR_ORDER, PART, cells, plain, safe, expandRIDs }
}
