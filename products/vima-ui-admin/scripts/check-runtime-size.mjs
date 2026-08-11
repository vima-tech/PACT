import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const budget = JSON.parse(readFileSync(resolve(root, 'test/agent-benchmark/runtime-budget.json'), 'utf8'));
const visited = new Set();

function collect(file) {
  const absolute = resolve(root, file);
  if (visited.has(absolute)) return;
  if (!existsSync(absolute)) throw new Error(`运行时体积检查缺少文件：${file}`);
  visited.add(absolute);
  const code = readFileSync(absolute, 'utf8');
  for (const match of code.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']/g)) {
    collect(resolve(dirname(file), match[1]));
  }
}

collect(budget.entry);
const files = [...visited].sort();
const gzipBytes = files.reduce((total, file) => total + gzipSync(readFileSync(file)).length, 0);
const maximumBytes = Math.floor(budget.baselineGzipBytes * (1 + budget.maximumGrowthRatio));
const growthRatio = gzipBytes / budget.baselineGzipBytes - 1;
const forbidden = ['manifestVersion', 'draft/2020-12', 'Agent 入口', 'recipes/index.json'];
const leaked = forbidden.filter((needle) => files.some((file) => readFileSync(file, 'utf8').includes(needle)));
const report = {
  passed: gzipBytes <= maximumBytes && leaked.length === 0,
  baselineGzipBytes: budget.baselineGzipBytes,
  maximumBytes,
  gzipBytes,
  growthRatio,
  files: files.map((file) => file.slice(root.length + 1)),
  leakedBuildTimeAssets: leaked
};

console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exit(1);
