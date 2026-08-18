const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findFiles(dir, ext, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (entry.name === 'declarations') continue; // skip .d.ts declarations folder
      findFiles(fullPath, ext, results);
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

// Esbuild plugin to resolve @alias imports to src/ relative paths
function aliasPlugin(srcRoot) {
  return {
    name: 'alias-resolve',
    setup(build) {
      // Match any import starting with @ that is NOT a scoped npm package (@scope/pkg)
      // Our aliases: @hooks/..., @types/..., @utils/..., @chapters, etc.
      // Scoped npm: @playerstack/core, @testing-library/react
      // Distinction: our aliases resolve to files in src/, npm scopes are in node_modules
      build.onResolve({ filter: /^@(?!playerstack\/)/ }, (args) => {
        // Strip leading @
        const stripped = args.path.slice(1);
        const candidate = path.resolve(srcRoot, stripped);

        // Try exact file, then with extensions
        const extensions = ['.ts', '.tsx', '.js', '.jsx'];
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return { path: candidate };
        }
        for (const ext of extensions) {
          if (fs.existsSync(candidate + ext)) {
            return { path: candidate + ext };
          }
        }
        // Try as directory with index
        for (const ext of extensions) {
          const indexPath = path.join(candidate, 'index' + ext);
          if (fs.existsSync(indexPath)) {
            return { path: indexPath };
          }
        }
        // Not our alias, let esbuild handle normally
        return null;
      });
    },
  };
}

const srcRoot = path.resolve(__dirname, '../src');

const tsFiles = findFiles('src', '.ts');
const tsxFiles = findFiles('src', '.tsx');
const srcFiles = [...tsFiles, ...tsxFiles];
const entryPoints = srcFiles.join(' ');

console.log(`Building ${srcFiles.length} files...`);

// Write a temporary esbuild script that uses the plugin (since CLI can't use plugins)
const buildScript = `
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const srcRoot = path.resolve(__dirname, 'src');

const aliasPlugin = {
  name: 'alias-resolve',
  setup(build) {
    build.onResolve({ filter: /^@/ }, (args) => {
      // Skip npm scoped packages
      if (args.path.startsWith('@playerstack/')) return null;
      let stripped = args.path.slice(1);
      // Map @typings/ to types/ directory
      if (stripped.startsWith('typings/')) {
        stripped = 'types/' + stripped.slice('typings/'.length);
      }
      const candidate = path.resolve(srcRoot, stripped);
      const extensions = ['.ts', '.tsx', '.js', '.jsx'];
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return { path: candidate };
      }
      for (const ext of extensions) {
        if (fs.existsSync(candidate + ext)) {
          return { path: candidate + ext };
        }
      }
      for (const ext of extensions) {
        const indexPath = path.join(candidate, 'index' + ext);
        if (fs.existsSync(indexPath)) {
          return { path: indexPath };
        }
      }
      return null;
    });
  },
};

const entryPoints = ${JSON.stringify(srcFiles)};

async function run() {
  // ESM
  await esbuild.build({
    entryPoints,
    outdir: 'dist/esm',
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    sourcemap: true,
    plugins: [aliasPlugin],
  });

  // CJS
  await esbuild.build({
    entryPoints,
    outdir: 'dist/cjs',
    format: 'cjs',
    platform: 'browser',
    target: 'es2020',
    sourcemap: true,
    plugins: [aliasPlugin],
  });
}

run().then(() => console.log('esbuild done')).catch((e) => { console.error(e); process.exit(1); });
`;

fs.writeFileSync(path.resolve(__dirname, '../_esbuild-run.js'), buildScript);
execSync('node _esbuild-run.js', { stdio: 'inherit' });
fs.unlinkSync(path.resolve(__dirname, '../_esbuild-run.js'));

// Types
execSync('npx tsc --emitDeclarationOnly --outDir dist/types', { stdio: 'inherit' });

