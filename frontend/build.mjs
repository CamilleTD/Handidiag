// Build de production pour Docker.
// Contournement : sur ce projet, `ng build` écrit bien dist/ puis ne rend pas la main (un
// processus esbuild reste ouvert). On attend la fin de la génération, on vérifie le résultat,
// puis on arrête le processus. À retirer quand `ng build` se terminera de lui-même.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const INDEX = 'dist/handidiag/browser/index.html';
const build = spawn('npx', ['ng', 'build'], {
  shell: true,
  env: { ...process.env, NG_CLI_ANALYTICS: 'false' },
});
let output = '';

const finish = (code) => {
  build.kill();
  process.exit(code);
};

for (const stream of [build.stdout, build.stderr]) {
  stream.on('data', (chunk) => {
    process.stdout.write(chunk);
    output += chunk;
    if (/Output location/.test(output)) setTimeout(() => finish(existsSync(INDEX) ? 0 : 1), 1000);
    else if (/\[ERROR\]|Application bundle generation failed/.test(output))
      setTimeout(() => finish(1), 500);
  });
}
build.on('exit', (code) => process.exit(code ?? 1));
setTimeout(() => finish(1), 10 * 60 * 1000);
