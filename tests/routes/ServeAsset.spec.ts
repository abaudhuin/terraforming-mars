import {expect} from 'chai';
import fs from 'fs';
import {FileAPI, ServeAsset} from '../../src/server/routes/ServeAsset';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {statusCode} from '../../src/common/http/statusCode';
class FileApiMock extends FileAPI {
  public generatedAssets = new Set<string>();
  public counts = {
    readFile: 0,
    readFileSync: 0,
    existsSync: 0,
  };
  public constructor() {
    super();
  }
  public override readFileSync(path: string): Buffer {
    this.counts.readFileSync++;
    return Buffer.from('data: ' + path);
  }
  public override readFile(path: string): Promise<Buffer> {
    this.counts.readFile++;
    return Promise.resolve(Buffer.from('data: ' + path));
  }
  public override existsSync(path: string): boolean {
    this.counts.existsSync++;
    if (path.startsWith('build/assets/')) {
      return this.generatedAssets.has(path);
    }
    return true;
  }
}

describe('ServeAsset', () => {
  let instance: ServeAsset;
  let scaffolding: RouteTestScaffolding;
  let res: MockResponse;
  let fileApi: FileApiMock;
  // The expected state of call counts in most simple cases in this test. This is a template
  // used and overridden below. That makes how individual condition changes these calls.
  const primedCache = {
    readFile: 0,
    readFileSync: 3,
    existsSync: 0,
  };

  const storedNodeEnv = process.env.NODE_ENV;
  beforeEach(() => {
    instance = new ServeAsset(undefined, false);
    scaffolding = new RouteTestScaffolding();
    res = new MockResponse();
    fileApi = new FileApiMock();
  });
  afterEach(() => {
    process.env.NODE_ENV = storedNodeEnv;
  });
  it('bad filename', async () => {
    scaffolding.url = 'goo.goo.gaa.gaa';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.statusCode).eq(statusCode.notFound);
    expect(res.content).eq('Not found');
  });

  it('index.html', async () => {
    scaffolding.url = '/assets/index.html';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content.startsWith('<!DOCTYPE html>'));
    expect(res.headers.get('Cache-Control')).eq('private, no-store, no-cache, must-revalidate, max-age=0, s-maxage=0');
    expect(res.headers.get('Pragma')).eq('no-cache');
  });

  it('styles.css', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/styles.css';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/styles.css');
    expect(res.headers.get('Cache-Control')).eq('public, max-age=14400, s-maxage=86400');
    expect(res.headers.get('Vary')).eq('Accept-Encoding');
  });

  it('versioned styles.css uses a long immutable cache policy', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/styles.css?v=20260706-cache';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/styles.css');
    expect(res.headers.get('Cache-Control')).eq('public, max-age=31536000, immutable');
  });

  it('styles.css.gz', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/styles.css';
    scaffolding.req.headers['accept-encoding'] = 'gzip';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/styles.css.gz');
  });

  it('styles.css.br with compact accept-encoding header', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/styles.css';
    scaffolding.req.headers['accept-encoding'] = 'br,gzip';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/styles.css.br');
    expect(res.headers.get('Content-Encoding')).eq('br');
  });

  it('styles.css: uncached', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    // Primes the cache.
    expect(fileApi.counts).deep.eq(primedCache);

    scaffolding.url = '/styles.css';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);

    expect(res.content).eq('data: build/styles.css');
    expect(fileApi.counts).deep.eq({
      ...primedCache,
      readFile: 1, // Still read.
    });
  });

  it('styles.css.gz: cached', async () => {
    instance = new ServeAsset(undefined, true, fileApi);
    // Primes the cache.
    expect(fileApi.counts).deep.eq(primedCache);

    scaffolding.url = '/styles.css';
    scaffolding.req.headers['accept-encoding'] = 'gzip';
    await scaffolding.get(instance, res);

    expect(res.content).eq('data: build/styles.css.gz');
    expect(fileApi.counts).deep.eq({
      ...primedCache,
      readFile: 0, // Does not change
    });
  });

  it('development main.js', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/main.js';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/main.js');
    expect(fileApi.counts).deep.eq({
      ...primedCache,
      readFile: 1,
      existsSync: 0,
    });
  });

  it('production main.js', async () => {
    process.env.NODE_ENV = 'production';
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/main.js';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/main.js');
    expect(fileApi.counts).deep.eq({
      ...primedCache,
      readFile: 1,
      existsSync: 0,
    });
  });

  it('sw.js', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/sw.js';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/sw.js');
    expect(res.headers.get('Cache-Control')).eq('private, no-store, no-cache, must-revalidate, max-age=0, s-maxage=0');
    expect(fileApi.counts).deep.eq({
      ...primedCache,
      readFile: 1,
      existsSync: 0,
    });
  });

  it('serves static assets with a balanced browser and edge cache policy', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/assets/tiles/city.png';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).contains('data: ');
    expect(res.headers.get('Cache-Control')).eq('public, max-age=14400, s-maxage=86400');
  });

  it('serves generated Vite assets before static assets', async () => {
    fileApi.generatedAssets.add('build/assets/CardList.css');
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/assets/CardList.css';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/assets/CardList.css');
    expect(res.headers.get('Content-Type')).eq('text/css');
  });

  it('returns cache headers and etag on not modified responses', async () => {
    instance = new ServeAsset(undefined, true, fileApi);
    scaffolding.url = '/styles.css?v=20260706-cache';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);

    const etag = res.headers.get('ETag');
    expect(etag).not.undefined;

    const revalidation = new MockResponse();
    const perScaffolding = new RouteTestScaffolding();
    perScaffolding.url = '/styles.css?v=20260706-cache';
    perScaffolding.req.headers['accept-encoding'] = '';
    perScaffolding.req.headers['if-none-match'] = etag!;
    await perScaffolding.get(instance, revalidation);

    expect(revalidation.statusCode).eq(statusCode.notModified);
    expect(revalidation.headers.get('Cache-Control')).eq('public, max-age=31536000, immutable');
    expect(revalidation.headers.get('ETag')).eq(etag);
  });

  it('vendors.js', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/vendors.js';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/vendors.js');
  });

  it('chunk js file', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/chunks/player-home.js';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/chunks/player-home.js');
  });

  it('chunk js.map file', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/chunks/player-home.js.map';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.content).eq('data: build/chunks/player-home.js.map');
  });

  it('rejects path traversal in chunks', async () => {
    instance = new ServeAsset(undefined, false, fileApi);
    scaffolding.url = '/chunks/../main.js';
    scaffolding.req.headers['accept-encoding'] = '';
    await scaffolding.get(instance, res);
    expect(res.statusCode).eq(statusCode.notFound);
  });

  it('serves all script sources referenced in index.html', async () => {
    const html = fs.readFileSync('assets/index.html', 'utf8');
    const srcs = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
    expect(srcs).to.not.be.empty;
    for (const src of srcs) {
      const perRes = new MockResponse();
      const perScaffolding = new RouteTestScaffolding();
      instance = new ServeAsset(undefined, false, fileApi);
      perScaffolding.url = '/' + src;
      perScaffolding.req.headers['accept-encoding'] = '';
      await perScaffolding.get(instance, perRes);
      expect(perRes.statusCode, `${src} should return 200`).eq(statusCode.ok);
    }
  });
});
