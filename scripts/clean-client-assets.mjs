import {rm, mkdir} from 'node:fs/promises';

const clientOutputs = [
  'build/index.html',
  'build/main.js',
  'build/main.js.map',
  'build/main.js.gz',
  'build/main.js.br',
  'build/main.js.map.gz',
  'build/main.js.map.br',
  'build/vendors.js',
  'build/vendors.js.map',
  'build/vendors.js.gz',
  'build/vendors.js.br',
  'build/vendors.js.map.gz',
  'build/vendors.js.map.br',
  'build/sw.js',
  'build/sw.js.map',
  'build/sw.js.gz',
  'build/sw.js.br',
  'build/sw.js.map.gz',
  'build/sw.js.map.br',
  'build/chunks',
  'build/assets',
];

await Promise.all(clientOutputs.map((file) => rm(file, {force: true, recursive: true})));
await mkdir('build', {recursive: true});
