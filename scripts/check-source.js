const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? files(fullPath) : entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

for (const file of files(path.join(__dirname, '..', 'src'))) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status);
}
