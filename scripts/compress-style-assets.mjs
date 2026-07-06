import {readFile, writeFile} from 'node:fs/promises';
import {brotliCompress, constants, gzip} from 'node:zlib';
import {promisify} from 'node:util';

const gzipAsync = promisify(gzip);
const brotliCompressAsync = promisify(brotliCompress);
const brotliQuality = Number(process.env.TM_BROTLI_QUALITY ?? 4);

const contents = await readFile('build/styles.css');
const [gz, br] = await Promise.all([
  gzipAsync(contents),
  brotliCompressAsync(contents, {
    params: {
      [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
      [constants.BROTLI_PARAM_QUALITY]: brotliQuality,
    },
  }),
]);

await Promise.all([
  writeFile('build/styles.css.gz', gz),
  writeFile('build/styles.css.br', br),
]);
