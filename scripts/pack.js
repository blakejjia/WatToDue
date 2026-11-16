import { readFileSync, mkdirSync, existsSync, rmSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const version = manifest.version || '1.0.0';
const distDir = resolve('dist');
const zipName = `WatToDue-v${version}.zip`;
const zipPath = join(distDir, zipName);

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

if (existsSync(zipPath)) {
  rmSync(zipPath);
}

const files = [
  'manifest.json',
  'index.html',
  'index.js',
  'popup.html',
  'popup.js',
  'src',
  'styles',
  'icons'
];

console.log(`Packaging WatToDue v${version}...`);

if (process.platform === 'win32') {
  const fileList = files.join(', ');
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path ${fileList} -DestinationPath '${zipPath}' -Force"`, {
    stdio: 'inherit',
  });
} else {
  const fileList = files.join(' ');
  execSync(`zip -r "${zipPath}" ${fileList} -x "icons/*.js"`, {
    stdio: 'inherit',
  });
}

const altZipName = `com.jia-yx.wattodo-v${version}.zip`;
copyFileSync(zipPath, join(distDir, altZipName));

console.log(`Successfully packed: dist/${zipName} & dist/${altZipName}`);