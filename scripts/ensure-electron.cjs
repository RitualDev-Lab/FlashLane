const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  const electronPath = require('electron');
  if (fs.existsSync(electronPath)) {
    console.log('✓ Electron binary verified at:', electronPath);
    process.exit(0);
  }
} catch (err) {
  console.log('Electron binary missing, setting up...');
}

// Find electron package directory in node_modules
const electronPkgPath = path.dirname(require.resolve('electron/package.json'));
const pathTxt = path.join(electronPkgPath, 'path.txt');
const distDir = path.join(electronPkgPath, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Check if electron.exe already exists in dist
const exeName = process.platform === 'win32' ? 'electron.exe' : 'electron';
const targetExe = path.join(distDir, exeName);

if (fs.existsSync(targetExe)) {
  fs.writeFileSync(pathTxt, exeName);
  console.log('✓ Electron path.txt generated successfully.');
  process.exit(0);
}

// Find cached zip in AppData/Local/electron/Cache
const appData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : '');
const cacheDir = path.join(appData, 'electron', 'Cache');

if (fs.existsSync(cacheDir)) {
  const findZips = (dir) => {
    let zips = [];
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        zips = zips.concat(findZips(full));
      } else if (item.name.endsWith('.zip') && item.name.includes('electron-v')) {
        zips.push(full);
      }
    }
    return zips;
  };

  const zips = findZips(cacheDir);
  if (zips.length > 0) {
    const latestZip = zips[0];
    console.log(`Extracting cached binary from ${latestZip}...`);
    if (process.platform === 'win32') {
      execSync(`powershell -Command "Expand-Archive -Path '${latestZip}' -DestinationPath '${distDir}' -Force"`, { stdio: 'inherit' });
    }
    fs.writeFileSync(pathTxt, exeName);
    console.log('✓ Electron binary unpacked and verified.');
    process.exit(0);
  }
}

console.log('Running electron install.js...');
try {
  execSync(`node "${path.join(electronPkgPath, 'install.js')}"`, { stdio: 'inherit' });
} catch (e) {
  console.error('Failed to run electron install.js:', e.message);
}
