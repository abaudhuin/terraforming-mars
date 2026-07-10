import fs from 'fs';
import path from 'path';
import * as responses from '../server/responses';

import {Context} from './IHandler';
import {BufferCache} from './BufferCache';
import {ContentType} from './ContentType';
import {Handler} from './Handler';
import {isProduction} from '../utils/server';
import {Request} from '../Request';
import {Response} from '../Response';

type Encoding = 'gzip' | 'br';

const DEFAULT_ASSET_CACHE_MAX_AGE_SECONDS = 14400;
const DEFAULT_EDGE_ASSET_CACHE_MAX_AGE_SECONDS = 86400;
const VERSIONED_ASSET_CACHE_MAX_AGE_SECONDS = 31536000;

function isPathInside(root: string, file: string): boolean {
  const relative = path.relative(root, file);
  return relative === '' || (relative.startsWith('..') === false && path.isAbsolute(relative) === false);
}

export class FileAPI {
  public static readonly INSTANCE: FileAPI = new FileAPI();

  protected constructor() {}

  public readFileSync(path: string): Buffer {
    return fs.readFileSync(path);
  }
  public readFile(path: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      fs.readFile(path, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
  public existsSync(path: string): boolean {
    return fs.existsSync(path);
  }
}
export class ServeAsset extends Handler {
  public static readonly INSTANCE: ServeAsset = new ServeAsset();
  private readonly cache = new BufferCache();

  // Public for tests
  public constructor(
    private cacheAgeSeconds: string | number = process.env.ASSET_CACHE_MAX_AGE || DEFAULT_ASSET_CACHE_MAX_AGE_SECONDS,
    // only production caches resources
    private cacheAssets: boolean = isProduction(),
    private fileApi: FileAPI = FileAPI.INSTANCE,
    private edgeCacheAgeSeconds: string | number = process.env.ASSET_EDGE_CACHE_MAX_AGE || DEFAULT_EDGE_ASSET_CACHE_MAX_AGE_SECONDS,
    private versionedCacheAgeSeconds: string | number = process.env.ASSET_VERSIONED_CACHE_MAX_AGE || VERSIONED_ASSET_CACHE_MAX_AGE_SECONDS) {
    super();
    // prime the cache with styles.css and a compressed copy of it styles.css
    const styles = fileApi.readFileSync('build/styles.css');
    this.cache.set('build/styles.css', styles);
    const compressed = fileApi.readFileSync('build/styles.css.gz');
    this.cache.set('build/styles.css.gz', compressed);
    const brotli = fileApi.readFileSync('build/styles.css.br');
    this.cache.set('build/styles.css.br', brotli);
  }

  public override async get(req: Request, res: Response, _ctx: Context): Promise<void> {
    if (req.url === undefined) {
      responses.internalServerError(req, res, new Error('no url on request'));
      return;
    }

    const url = new URL(req.url, 'http://localhost');

    // Remove leading slash. Keep the raw path rather than URL.pathname so
    // traversal attempts like /chunks/../main.js are still visible below.
    const path = req.url.split(/[?#]/, 1)[0].replace(/^\/+/, '');

    const supportedEncodings = this.supportedEncodings(req);
    const toFile: {file?: string, encoding?: Encoding } = this.toFile(path, supportedEncodings);

    if (toFile.file === undefined) {
      return responses.notFound(req, res);
    }

    const file = toFile.file;
    this.setCacheHeaders(res, path, url);

    // asset caching
    const buffer = this.cacheAssets ? this.cache.get(file) : undefined;
    if (buffer !== undefined) {
      res.setHeader('ETag', buffer.hash);
      if (req.headers['if-none-match'] === buffer.hash) {
        responses.notModified(res);
        return;
      }
    }

    const contentType = ContentType.getContentType(file);
    if (contentType !== undefined) {
      res.setHeader('Content-Type', contentType);
    }

    if (toFile.encoding !== undefined) {
      res.setHeader('Content-Encoding', toFile.encoding);
    }

    if (buffer !== undefined) {
      res.setHeader('Content-Length', buffer.buffer.length);
      res.end(buffer.buffer);
      return;
    }

    try {
      const data = await this.fileApi.readFile(file);
      res.setHeader('Content-Length', data.length);
      res.end(data);
      if (this.cacheAssets === true) {
        this.cache.set(file, data);
      }
    } catch (err) {
      console.log(err);
      responses.internalServerError(req, res, 'Cannot serve ' + path);
    }
  }

  private toMainFile(urlPath: string, encodings: Set<Encoding>): { file?: string, encoding?: Encoding } {
    const file = `build/${urlPath}`;

    // Only serve compressed versions in production. Development mode serves
    // uncompressed versions because they can be hot-swapped.
    if (isProduction()) {
      if (encodings.has('br') && this.fileApi.existsSync(file + '.br')) {
        return {file: file + '.br', encoding: 'br'};
      } else if (encodings.has('gzip') && this.fileApi.existsSync(file + '.gz')) {
        return {file: file + '.gz', encoding: 'gzip'};
      }
    }

    // Fallback on uncompressed file if in development or no compressed
    // file exists.
    return {file, encoding: undefined};
  }

  private toServiceWorkerFile(urlPath: string): { file?: string, encoding?: Encoding } {
    return {
      file: `build/${urlPath}`,
    };
  }

  private toFile(urlPath: string, encodings: Set<Encoding>): { file?: string, encoding?: Encoding } {
    switch (urlPath) {
    case 'assets/index.html':
    case 'assets/Prototype.ttf':
    case 'assets/Prototype-ru.ttf':
    case 'assets/Prototype-pl.ttf':
    case 'assets/futureforces.ttf':
      return {file: urlPath};

    case 'styles.css':
      if (encodings.has('br')) {
        return {file: 'build/styles.css.br', encoding: 'br'};
      }
      if (encodings.has('gzip')) {
        return {file: 'build/styles.css.gz', encoding: 'gzip'};
      }
      return {file: 'build/styles.css'};

    case 'main.js':
    case 'main.js.map':
    case 'vendors.js':
    case 'vendors.js.map':
      return this.toMainFile(urlPath, encodings);

    // sw.js is empty. Although not confirmed, it seems sw.js is necessary
    // for mobile notifications. If confirmed that it is not necessary, this
    // can be removed.
    case 'sw.js':
    case '/sw.js':
      return this.toServiceWorkerFile(urlPath);

    case 'favicon.ico':
      return {file: 'assets/favicon.ico'};

    default:
      // Serve JS chunks produced by client-bundler code splitting.
      if (urlPath.startsWith('chunks/')) {
        const chunksRoot = path.resolve('./build/chunks');
        const resolvedFile = path.resolve(path.normalize('build/' + urlPath));
        if (isPathInside(chunksRoot, resolvedFile)) {
          if (urlPath.endsWith('.js') || urlPath.endsWith('.js.map')) {
            return this.toMainFile(urlPath, encodings);
          }
        }
      }

      if (urlPath.startsWith('assets/')) {
        const buildAssetsRoot = path.resolve('./build/assets');
        const resolvedBuildFile = path.resolve(path.normalize('build/' + urlPath));
        if (isPathInside(buildAssetsRoot, resolvedBuildFile) && this.fileApi.existsSync('build/' + urlPath)) {
          return this.toMainFile(urlPath, encodings);
        }
      }

      if (urlPath.endsWith('.png') || urlPath.endsWith('.jpg') || urlPath.endsWith('.json')) {
        const assetsRoot = path.resolve('./assets');
        const resolvedFile = path.resolve(path.normalize(urlPath));

        // Only allow assets inside of assets directory
        if (resolvedFile.startsWith(assetsRoot)) {
          return {file: resolvedFile};
        }
      }
    }

    return {};
  }

  private setCacheHeaders(res: Response, urlPath: string, url: URL): void {
    res.setHeader('Vary', 'Accept-Encoding');

    if (urlPath === 'assets/index.html' || urlPath === 'sw.js' || urlPath === '/sw.js') {
      responses.setNoStoreHeaders(res);
      return;
    }

    if (url.searchParams.has('v')) {
      res.setHeader('Cache-Control', `public, max-age=${this.versionedCacheAgeSeconds}, immutable`);
      return;
    }

    res.setHeader('Cache-Control', `public, max-age=${this.cacheAgeSeconds}, s-maxage=${this.edgeCacheAgeSeconds}`);
  }

  private supportedEncodings(req: Request): Set<Encoding> {
    const result = new Set<Encoding>();
    for (const header of String(req.headers['accept-encoding']).split(',')) {
      const encoding = header.trim().split(';', 1)[0];
      if (encoding === 'br' || encoding === 'gzip') {
        result.add(encoding);
      }
    }
    return result;
  }
}
