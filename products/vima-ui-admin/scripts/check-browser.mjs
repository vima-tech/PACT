import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = resolve(root, 'dist-site');
const reportDir = resolve(root, 'reports/ai');
const browserPath = process.env.VIMA_CHROME_PATH || '/usr/bin/google-chrome';
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

if (!existsSync(resolve(siteRoot, 'index.html'))) throw new Error('缺少 dist-site/index.html，请先运行 npm run build:docs。');
if (!existsSync(browserPath)) throw new Error(`未找到 Chrome：${browserPath}，可用 VIMA_CHROME_PATH 指定。`);

const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const target = normalize(resolve(siteRoot, requested));
  if (!target.startsWith(siteRoot)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const content = readFileSync(target);
    response.writeHead(200, { 'Content-Type': mime[extname(target)] || 'application/octet-stream' });
    response.end(content);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const address = server.address();
const url = `http://127.0.0.1:${address.port}/`;
const profile = mkdtempSync(join(tmpdir(), 'vima-chrome-'));
const chrome = spawn(browserPath, [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });
let chromeErrors = '';
chrome.stderr.on('data', (chunk) => { chromeErrors += String(chunk); });

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      for (const handler of this.events.get(message.method) ?? []) handler(message.params);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolveSend, rejectSend) => {
      this.pending.set(id, { resolve: resolveSend, reject: rejectSend });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method, timeout = 15000) {
    return new Promise((resolveEvent, rejectEvent) => {
      const handlers = this.events.get(method) ?? [];
      const timer = setTimeout(() => rejectEvent(new Error(`CDP 事件超时：${method}`)), timeout);
      const handler = (params) => {
        clearTimeout(timer);
        this.events.set(method, handlers.filter((item) => item !== handler));
        resolveEvent(params);
      };
      handlers.push(handler);
      this.events.set(method, handlers);
    });
  }
}

async function connect() {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 100 && !existsSync(portFile); attempt += 1) await delay(50);
  if (!existsSync(portFile)) throw new Error(`Chrome CDP 未启动。${chromeErrors.slice(-500)}`);
  const [port] = readFileSync(portFile, 'utf8').trim().split('\n');
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
  const page = targets.find((target) => target.type === 'page');
  if (!page?.webSocketDebuggerUrl) throw new Error('找不到 Chrome page target。');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener('open', resolveOpen, { once: true });
    socket.addEventListener('error', rejectOpen, { once: true });
  });
  return { client: new CdpClient(socket), socket };
}

async function inspectViewport(client, width, height, name) {
  await client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await client.send('Runtime.evaluate', { expression: 'window.scrollTo(0, 0)' });
  await delay(100);
  const evaluation = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `JSON.stringify((() => {
      const visible = (element) => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      }
      const unnamedButtons = [...document.querySelectorAll('button')].filter((element) => visible(element) && !((element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent || '').trim())).length
      const imagesWithoutAlt = [...document.querySelectorAll('img')].filter((element) => !element.hasAttribute('alt')).length
      const inputsWithoutName = [...document.querySelectorAll('input,select,textarea')].filter((element) => {
        if (!visible(element)) return false
        const id = element.id
        return !(element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || element.getAttribute('placeholder') || (id && document.querySelector('label[for="' + CSS.escape(id) + '"]')))
      }).length
      return {
        title: document.title,
        bodyTextLength: document.body.innerText.trim().length,
        componentCountText: [...document.querySelectorAll('.site-chip')].map((node) => node.textContent).find((text) => text.includes('组件')) || '',
        headingCount: document.querySelectorAll('h1,h2,h3').length,
        navigationCount: document.querySelectorAll('nav').length,
        mainCount: document.querySelectorAll('main').length,
        unnamedButtons,
        imagesWithoutAlt,
        inputsWithoutName,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        viewport: { width: innerWidth, height: innerHeight },
        activeElement: document.activeElement?.tagName || ''
      }
    })())`
  });
  const metrics = JSON.parse(evaluation.result.value);
  const screenshot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(resolve(reportDir, `browser-${name}.png`), Buffer.from(screenshot.data, 'base64'));
  return metrics;
}

let socket;
try {
  mkdirSync(reportDir, { recursive: true });
  const connection = await connect();
  socket = connection.socket;
  const client = connection.client;
  await Promise.all([
    client.send('Page.enable'),
    client.send('Runtime.enable'),
    client.send('Accessibility.enable')
  ]);
  const loaded = client.once('Page.loadEventFired');
  await client.send('Page.navigate', { url });
  await loaded;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const ready = await client.send('Runtime.evaluate', { returnByValue: true, expression: "Boolean(document.querySelector('.site-main') && document.body.innerText.length > 200)" });
    if (ready.result.value) break;
    await delay(50);
  }

  const desktop = await inspectViewport(client, 1440, 1000, 'desktop');
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  const focus = await client.send('Runtime.evaluate', { returnByValue: true, expression: "({ tag: document.activeElement?.tagName || '', body: document.activeElement === document.body })" });
  const mobile = await inspectViewport(client, 390, 844, 'mobile');
  const ax = await client.send('Accessibility.getFullAXTree');
  const unnamedInteractive = ax.nodes.filter((node) => ['button', 'link', 'textbox', 'combobox'].includes(node.role?.value) && !String(node.name?.value || '').trim()).length;
  const problems = [];
  for (const [name, metrics] of Object.entries({ desktop, mobile })) {
    if (metrics.bodyTextLength < 200) problems.push(`${name}: 页面内容未完整渲染`);
    if (metrics.mainCount !== 1) problems.push(`${name}: main 数量为 ${metrics.mainCount}`);
    if (metrics.navigationCount < 1) problems.push(`${name}: 缺少导航`);
    if (metrics.unnamedButtons) problems.push(`${name}: ${metrics.unnamedButtons} 个无名按钮`);
    if (metrics.imagesWithoutAlt) problems.push(`${name}: ${metrics.imagesWithoutAlt} 张图片缺少 alt`);
    if (metrics.inputsWithoutName) problems.push(`${name}: ${metrics.inputsWithoutName} 个表单控件缺少可访问名称`);
    if (metrics.horizontalOverflow) problems.push(`${name}: 页面级水平溢出`);
  }
  if (focus.result.value.body) problems.push('键盘 Tab 后焦点仍留在 body');
  if (unnamedInteractive) problems.push(`可访问性树中有 ${unnamedInteractive} 个无名交互节点`);
  const report = {
    reportVersion: '1',
    passed: problems.length === 0,
    url,
    desktop,
    mobile,
    keyboard: focus.result.value,
    accessibility: { unnamedInteractive },
    screenshots: ['reports/ai/browser-desktop.png', 'reports/ai/browser-mobile.png'],
    diagnostics: problems.map((message) => ({ code: 'BROWSER_CHECK_FAILED', severity: 'error', path: 'site', message }))
  };
  writeFileSync(resolve(reportDir, 'browser.latest.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`浏览器检查${report.passed ? '通过' : '未通过'}：桌面 1440×1000，窄屏 390×844，截图 2 张。`);
  if (!report.passed) {
    problems.forEach((problem) => console.error(`  ERROR ${problem}`));
    process.exitCode = 1;
  }
  await client.send('Browser.close').catch(() => undefined);
} finally {
  socket?.close();
  server.close();
  if (!chrome.killed) chrome.kill('SIGTERM');
  rmSync(profile, { force: true, recursive: true });
}
