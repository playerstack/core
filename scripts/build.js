const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const srcRoot = path.resolve(__dirname, '../src');
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));

/**
 * Derive entry points from package.json "exports" field.
 * Each subpath export maps to a source file in src/.
 *
 * The "require" path tells us the output location (dist/cjs/<path>.js),
 * from which we infer the source file (src/<path>.ts or src/<path>/index.ts).
 */
function getEntryPoints() {
  const entries = {};

  for (const [subpath, conditions] of Object.entries(pkg.exports)) {
    // Use the CJS output path to derive the source entry
    const cjsOut = conditions.require;
    // Strip "dist/cjs/" prefix and ".js" suffix to get the relative src path
    const relPath = cjsOut.replace('./dist/cjs/', '').replace('.js', '');

    // Find the actual source file
    const extensions = ['.ts', '.tsx'];
    let srcFile = null;

    for (const ext of extensions) {
      const candidate = path.resolve(srcRoot, relPath + ext);
      if (fs.existsSync(candidate)) {
        srcFile = candidate;
        break;
      }
    }

    // Try as directory with index
    if (!srcFile) {
      for (const ext of extensions) {
        const candidate = path.resolve(srcRoot, relPath, 'index' + ext);
        if (fs.existsSync(candidate)) {
          srcFile = candidate;
          break;
        }
      }
    }

    if (!srcFile) {
      console.warn(`Warning: no source file found for export "${subpath}" (expected src/${relPath})`);
      continue;
    }

    // Use the relative output path (without extension) as the entry key
    // so esbuild writes to the correct location in outdir
    entries[relPath] = srcFile;
  }

  return entries;
}

/**
 * Esbuild plugin: resolve @alias imports to absolute paths in src/.
 * Only works with bundle:true (which is what we use).
 */
function aliasPlugin() {
  return {
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

        // Try exact file
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return { path: candidate };
        }
        // Try with extensions
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

        // Not our alias — let esbuild handle
        return null;
      });
    },
  };
}

async function build() {
  const esbuild = require('esbuild');
  const entryPoints = getEntryPoints();
  const entryCount = Object.keys(entryPoints).length;

  console.log(`Building ${entryCount} entry points (bundle mode)...`);

  // ESM — with splitting to share code between entry points
  await esbuild.build({
    entryPoints,
    outdir: 'dist/esm',
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    bundle: true,
    splitting: true,
    sourcemap: true,
    packages: 'external',
    plugins: [aliasPlugin()],
    outExtension: { '.js': '.js' },
  });

  // CJS — no splitting (not supported), build each entry separately
  // to avoid inlining shared code into every file
  for (const [outPath, srcFile] of Object.entries(entryPoints)) {
    await esbuild.build({
      entryPoints: { [outPath]: srcFile },
      outdir: 'dist/cjs',
      format: 'cjs',
      platform: 'browser',
      target: 'es2020',
      bundle: true,
      sourcemap: true,
      packages: 'external',
      plugins: [aliasPlugin()],
      outExtension: { '.js': '.js' },
    });
  }

  console.log('esbuild done');

  // Types
  execSync('npx tsc --emitDeclarationOnly --outDir dist/types', { stdio: 'inherit' });
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
