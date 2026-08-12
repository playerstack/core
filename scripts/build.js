const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findFiles(dir, ext, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (entry.name === 'types') continue; // skip .d.ts declarations folder
      findFiles(fullPath, ext, results);
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

const srcFiles = findFiles('src', '.ts');
const entryPoints = srcFiles.join(' ');

console.log(`Building ${srcFiles.length} files...`);

// ESM
execSync(
  `npx esbuild ${entryPoints} --outdir=dist/esm --format=esm --platform=browser --target=es2020 --sourcemap`,
  { stdio: 'inherit' },
);

// Fix ESM imports: add .js extensions to relative imports (required for strict ESM resolution)
const esmFiles = findFiles('dist/esm', '.js');
for (const file of esmFiles) {
  let content = fs.readFileSync(file, 'utf8');
  // Match: from "./path" or from '../path' (without .js extension)
  content = content.replace(
    /from\s+["'](\.[^"']+)["']/g,
    (match, importPath) => {
      if (importPath.endsWith('.js')) return match;
      return `from "${importPath}.js"`;
    },
  );
  fs.writeFileSync(file, content);
}

// CJS
execSync(
  `npx esbuild ${entryPoints} --outdir=dist/cjs --format=cjs --platform=browser --target=es2020 --sourcemap`,
  { stdio: 'inherit' },
);

// Types
execSync('npx tsc --emitDeclarationOnly --outDir dist/types', { stdio: 'inherit' });
