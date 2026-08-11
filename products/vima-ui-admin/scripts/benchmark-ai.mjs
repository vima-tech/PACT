import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPage, createArtifactPlan } from '../dist/agent/index.js';
import { validateTemplate } from '../dist/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const taskFile = resolve(root, 'test/agent-benchmark/tasks.json');
const baselineFile = resolve(root, 'test/agent-benchmark/baseline.json');
const reportFile = resolve(root, 'reports/ai/benchmark.latest.json');
const fixture = JSON.parse(readFileSync(taskFile, 'utf8'));
const baseline = JSON.parse(readFileSync(baselineFile, 'utf8'));

if (!Array.isArray(fixture.tasks) || fixture.tasks.length < 20) {
  throw new Error('冻结基准任务少于 20 个。');
}
if (!fixture.tasks.some((task) => task.set === 'development') || !fixture.tasks.some((task) => task.set === 'holdout')) {
  throw new Error('基准必须同时包含 development 和 holdout 集。');
}

function codesOf(result) {
  return new Set((result.diagnostics ?? []).map((item) => item.code));
}

function runTask(task) {
  const started = performance.now();
  const first = task.kind === 'app'
    ? createArtifactPlan(task.input)
    : task.kind === 'template'
      ? (() => {
          const validation = validateTemplate(task.input, { trustLevel: 'untrusted' });
          return { ok: validation.valid, diagnostics: validation.diagnostics };
        })()
      : buildPage(task.input);
  const second = task.kind === 'app'
    ? createArtifactPlan(task.input)
    : task.kind === 'template'
      ? (() => {
          const validation = validateTemplate(task.input, { trustLevel: 'untrusted' });
          return { ok: validation.valid, diagnostics: validation.diagnostics };
        })()
      : buildPage(task.input);
  const deterministic = JSON.stringify(first) === JSON.stringify(second);
  const expectedCodes = task.expected.codes ?? [];
  const actualCodes = codesOf(first);
  const missingCodes = expectedCodes.filter((code) => !actualCodes.has(code));
  const types = task.expected.types ?? [];
  const serialized = JSON.stringify(first);
  const missingTypes = types.filter((type) => !serialized.includes(`\"type\":\"${type}\"`));
  const expectedFiles = task.expected.files;
  const actualFiles = first.ok && 'plan' in first ? first.plan.files.length : undefined;
  const expectedReadiness = task.expected.readiness;
  const actualReadiness = first.ok && 'plan' in first ? first.plan.readiness : undefined;
  const expectedIntegrations = task.expected.integrations;
  const actualIntegrations = first.ok && 'plan' in first ? first.plan.integrationRequirements.length : undefined;
  const expectationPassed = first.ok === task.expected.ok
    && missingCodes.length === 0
    && missingTypes.length === 0
    && (expectedFiles === undefined || expectedFiles === actualFiles)
    && (expectedReadiness === undefined || expectedReadiness === actualReadiness)
    && (expectedIntegrations === undefined || expectedIntegrations === actualIntegrations);
  return {
    id: task.id,
    set: task.set,
    category: task.category,
    passed: expectationPassed && deterministic,
    expectedOk: task.expected.ok,
    actualOk: first.ok,
    deterministic,
    missingCodes,
    missingTypes,
    expectedFiles: expectedFiles ?? null,
    actualFiles: actualFiles ?? null,
    expectedReadiness: expectedReadiness ?? null,
    actualReadiness: actualReadiness ?? null,
    expectedIntegrations: expectedIntegrations ?? null,
    actualIntegrations: actualIntegrations ?? null,
    diagnostics: first.diagnostics ?? [],
    durationMilliseconds: Number((performance.now() - started).toFixed(3))
  };
}

const tasks = fixture.tasks.map(runTask);
const group = (name) => tasks.filter((task) => task.set === name);
const rate = (items, predicate) => items.length ? predicate(items).length / items.length : 0;
const development = group('development');
const holdout = group('holdout');
const validTasks = tasks.filter((task) => task.expectedOk);
const securityTasks = tasks.filter((task) => task.category === 'security');
const passRate = rate(tasks, (items) => items.filter((item) => item.passed));
const developmentPassRate = rate(development, (items) => items.filter((item) => item.passed));
const holdoutPassRate = rate(holdout, (items) => items.filter((item) => item.passed));
const deterministicRate = rate(tasks, (items) => items.filter((item) => item.deterministic));
const validGenerationRate = rate(validTasks, (items) => items.filter((item) => item.actualOk));
const securityBlockRate = rate(securityTasks, (items) => items.filter((item) => !item.actualOk && item.passed));
const externalMeasured = baseline.externalAgentDelivery.status === 'measured';
const frameworkPassed = passRate === 1 && deterministicRate === 1 && validGenerationRate === 1 && securityBlockRate === 1;
const acceptanceCount = fixture.tasks.reduce((total, task) => total + (task.acceptance?.length ?? 0), 0);

const report = {
  reportVersion: '1',
  fixtureVersion: fixture.version,
  frozenAt: fixture.frozenAt,
  frameworkBenchmark: {
    passed: frameworkPassed,
    capabilityLevel: 'structural-scaffold',
    taskCount: tasks.length,
    developmentCount: development.length,
    holdoutCount: holdout.length,
    expectationPassRate: passRate,
    developmentPassRate,
    holdoutPassRate,
    holdoutGap: Math.abs(developmentPassRate - holdoutPassRate),
    deterministicRate,
    validGenerationRate,
    securityBlockRate
  },
  generatedSystemAcceptance: {
    status: 'not-executable',
    declaredAcceptanceCount: acceptanceCount,
    executableAcceptanceCount: 0,
    blocker: 'GENERATED_SYSTEM_ACCEPTANCE_NOT_EXECUTABLE'
  },
  externalAgentDelivery: {
    status: externalMeasured ? 'measured' : 'baseline-required',
    baseline: baseline.externalAgentDelivery,
    stableReleaseClaimAllowed: externalMeasured,
    protocol: [
      '固定模型版本、温度、工具权限与两轮修复上限。',
      '对 development 和 holdout 分别运行全部任务并保存原始日志。',
      '记录首次构建、两轮内通过、交付耗时和 Token。',
      '使用同一协议重跑改造前版本，再计算中位改善。'
    ]
  },
  releaseGate: {
    frameworkPassed,
    stableAiFirstPassed: false,
    blockers: [
      ...(!externalMeasured ? ['EXTERNAL_AGENT_BASELINE_NOT_MEASURED'] : []),
      'GENERATED_SYSTEM_ACCEPTANCE_NOT_EXECUTABLE'
    ]
  },
  p3: {
    status: 'not-triggered',
    reason: '尚无浏览器侧诊断能显著提升 Agent 修复效率的量化证据。'
  },
  tasks
};

mkdirSync(dirname(reportFile), { recursive: true });
writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(`AI 结构基准：${tasks.filter((task) => task.passed).length}/${tasks.length} 通过，开发集 ${(developmentPassRate * 100).toFixed(1)}%，保留集 ${(holdoutPassRate * 100).toFixed(1)}%；生成系统行为验收尚未自动化。`);
console.log(`报告：${reportFile}`);
if (!frameworkPassed) process.exit(1);
