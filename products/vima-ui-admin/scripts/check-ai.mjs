import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reportFile = resolve(root, 'reports/ai/check.latest.json');
const testFiles = readdirSync(resolve(root, 'test'))
  .filter((name) => name.endsWith('.test.mjs'))
  .sort()
  .map((name) => `test/${name}`);
const stages = [
  { id: 'build-agent-assets', label: '构建独立 Agent 产物', command: 'npm', args: ['run', 'build:lib'] },
  { id: 'spec-template-contracts', label: 'AppSpec、Template 与冻结任务契约', command: 'node', args: ['scripts/benchmark-ai.mjs'] },
  { id: 'recipes', label: '系统 Recipe 结构、示例与确定性', command: 'node', args: ['scripts/check-recipes.mjs'] },
  { id: 'public-api-docs', label: '文档示例与公开符号', command: 'npm', args: ['run', 'check:docs'] },
  { id: 'component-boundary', label: 'Manifest、组件、图标与 Token 闭包', command: 'npm', args: ['run', 'check:boundary'] },
  { id: 'typecheck', label: 'TypeScript 类型检查', command: 'npm', args: ['run', 'typecheck'] },
  { id: 'tests', label: '单元、安全、确定性和真实 SFC 编译', command: 'node', args: ['--test', ...testFiles] },
  { id: 'runtime-size', label: '默认运行时入口体积与 AI 资产隔离', command: 'node', args: ['scripts/check-runtime-size.mjs'] },
  { id: 'docs-build', label: '示例应用与文档站构建', command: 'npm', args: ['run', 'build:docs'] },
  { id: 'browser', label: '桌面/窄屏、键盘、截图与基础可访问性', command: 'node', args: ['scripts/check-browser.mjs'] }
];

const results = [];
let failedStage = null;
for (const stage of stages) {
  const started = performance.now();
  console.log(`\n[check:ai] ${stage.label}`);
  const execution = spawnSync(stage.command, stage.args, {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 20 * 1024 * 1024
  });
  if (execution.stdout) process.stdout.write(execution.stdout);
  if (execution.stderr) process.stderr.write(execution.stderr);
  const passed = execution.status === 0 && !execution.error;
  results.push({
    id: stage.id,
    label: stage.label,
    passed,
    exitCode: execution.status ?? 1,
    durationMilliseconds: Number((performance.now() - started).toFixed(3)),
    diagnostics: passed ? [] : [{
      code: 'AI_CHECK_STAGE_FAILED',
      severity: 'error',
      path: stage.id,
      message: execution.error?.message || `${stage.label}未通过。`,
      suggestion: `单独运行 ${stage.command} ${stage.args.join(' ')} 查看完整输出。`
    }],
    ...(passed ? {} : {
      stdout: execution.stdout?.trim() || '',
      stderr: execution.stderr?.trim() || ''
    })
  });
  if (!passed) {
    failedStage = stage.id;
    break;
  }
}

const report = {
  reportVersion: '1',
  passed: failedStage === null && results.length === stages.length,
  stage: failedStage || 'complete',
  completedStages: results.length,
  totalStages: stages.length,
  diagnostics: results.flatMap((stage) => stage.diagnostics),
  stages: results
};
mkdirSync(dirname(reportFile), { recursive: true });
writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(`\n[check:ai] ${report.passed ? '全部通过' : `停在 ${report.stage}`}`);
console.log(`[check:ai] JSON 报告：${reportFile}`);
if (!report.passed) process.exit(1);
