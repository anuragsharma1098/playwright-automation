#!/usr/bin/env node
// Chromium/Firefox/WebKit ship for every platform Playwright supports, but the `msedge` channel
// doesn't - Microsoft has never published a Linux ARM64 build of Edge, so `playwright install
// msedge` hard-fails there. That's exactly the container Docker Desktop builds by default on
// Apple Silicon Macs and on native Linux ARM64 hosts, so a plain `npm ci` (this runs as
// `postinstall`) used to break `postCreateCommand` for every dev/Codespace on those machines.
// Skip msedge there instead; `npm run test:edge` stays available everywhere else, and can still
// be added manually with `npx playwright install msedge` should Microsoft ever ship it.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

// Resolve the installed CLI script directly rather than shelling out to the `playwright`
// command - node_modules/.bin's shim format (symlink vs. .cmd/.sh) varies by npm version and
// platform, and this sidesteps all of that. `@playwright/test`'s `exports` field blocks a direct
// require.resolve('@playwright/test/cli.js'), so go via its package.json's `bin` field instead.
const require = createRequire(import.meta.url);
const pkgPath = require.resolve('@playwright/test/package.json');
const { bin } = require(pkgPath);
const cliPath = join(dirname(pkgPath), bin.playwright);

const browsers = ['chromium', 'firefox', 'webkit'];

const edgeUnsupported = process.platform === 'linux' && process.arch === 'arm64';
if (edgeUnsupported) {
  console.warn(
    '[postinstall] Skipping msedge: Microsoft does not publish Microsoft Edge for Linux ARM64 ' +
      '(this host/container). The *-edge projects (npm run test:edge) will not be usable here.'
  );
} else {
  browsers.push('msedge');
}

execFileSync(process.execPath, [cliPath, 'install', ...browsers], { stdio: 'inherit' });
