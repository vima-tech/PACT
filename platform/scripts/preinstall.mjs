#!/usr/bin/env node
// @pact R029,R039,R042
const nodeMajor = Number(process.versions.node.split('.')[0]);
const npmMatch = /(?:^|\s)npm\/(\d+)(?:\.|\s|$)/.exec(process.env.npm_config_user_agent || '');
if (!['linux', 'darwin'].includes(process.platform) || nodeMajor < 20 || !npmMatch || Number(npmMatch[1]) < 10) {
  process.stderr.write('PACT requires Linux/macOS, Node.js >=20 and npm >=10.\n');
  process.exitCode = 4;
}
