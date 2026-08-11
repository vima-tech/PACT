#!/usr/bin/env node
// @pact R017,R025
import { spawn } from 'node:child_process';
import { access, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

async function executable(path) {
  try { await access(path); return true; } catch { return false; }
}

async function localMaven() {
  const local = join(homedir(), '.local');
  try {
    const candidates = (await readdir(local)).filter((name) => name.startsWith('apache-maven-')).sort().reverse();
    for (const name of candidates) {
      const path = join(local, name, 'bin', 'mvn');
      if (await executable(path)) return path;
    }
  } catch {}
  return 'mvn';
}

const command = await localMaven();
const child = spawn(command, process.argv.slice(2), { stdio: 'inherit' });
child.on('error', (error) => { console.error(`Maven 启动失败：${error.message}`); process.exitCode = 127; });
child.on('close', (code) => { process.exitCode = code ?? 1; });
