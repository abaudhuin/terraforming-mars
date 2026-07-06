import {access, readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {brotliCompress, constants, gzip} from 'node:zlib';
import {promisify} from 'node:util';

const gzipAsync = promisify(gzip);
const brotliCompressAsync = promisify(brotliCompress);
const brotliQuality = Number(process.env.TM_BROTLI_QUALITY ?? 4);

async function walk(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = await Promise.all(entries.map(async (entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : file;
  }));
  return files.flat();
}

const entryFiles = [
  'build/main.js',
  'build/vendors.js',
  'build/sw.js',
];
const chunkFiles = await walk('build/chunks').catch(() => []);
const candidates = [...entryFiles, ...chunkFiles].filter((file) => file.endsWith('.js'));
const files = [];

for (const file of candidates) {
  try {
    await access(file);
    files.push(file);
  } catch {
    // Some entries, such as an empty service worker, may not emit output.
  }
}

await Promise.all(files.flatMap(async (file) => {
  const contents = await readFile(file);
  const [gz, br] = await Promise.all([
    gzipAsync(contents),
    brotliCompressAsync(contents, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: brotliQuality,
      },
    }),
  ]);
  await Promise.all([
    writeFile(`${file}.gz`, gz),
    writeFile(`${file}.br`, br),
  ]);
}));

console.log(`Compressed ${files.length} client assets.`);
