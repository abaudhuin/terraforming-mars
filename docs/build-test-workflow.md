# Build And Test Workflow

This project uses Node 22, TypeScript, Vue 3, LESS, and npm scripts as the
canonical developer interface.

## Tooling Roles

- Rolldown is the default client bundler for production builds and client watch
  mode. It handles the browser TypeScript/Vue graph and writes `main.js`,
  `vendors.js`, `sw.js`, and lazy chunks under `build/chunks/`.
- OXC is used through Rolldown for fast JavaScript and TypeScript transforms and
  minification.
- Oxlint is the source lint engine for TypeScript, JavaScript, and Vue files.
- TypeScript 7 RC is the default TypeScript package. Its Go-native `tsc` powers
  server and test project builds.
- Mocha remains the server test runner.
- Vitest runs client component tests against Vue single-file components.

npm remains the expected package manager for repository scripts and lockfile
updates. Bun and Rsbuild/Rspack are not part of the default flow.

## Install

Use Node 22 with npm, then install dependencies from the lockfile:

```bash
npm install
```

## Full Build

```bash
npm run clean
npm run build
```

`npm run build` runs `scripts/build.mjs`, which keeps independent work parallel:

1. `npm run make:css` and `npm run make:json` run at the same time.
2. `npm run build:server` and `npm run make:cards` run at the same time after
   generated JSON exists.
3. `npm run build:client:assets` removes stale client outputs, bundles with
   Rolldown, and writes gzip/brotli sidecars.

Production builds do not emit source maps by default. This keeps the build fast
and avoids spending time compressing large map files. Use
`TM_BUILD_SOURCEMAPS=1 npm run build` when production source maps are worth the
extra time.

JavaScript and CSS outputs get gzip and brotli sidecars. Brotli defaults to
quality `4` for fast local and CI builds; override with `TM_BROTLI_QUALITY=N`
when a release process wants denser precompressed assets.

The standalone `npm run build:client` target still runs generated JSON first, so
it can be used without a preceding full build.

The server build runs TypeScript 7 RC's Go-native `tsc --build
src/tsconfig.json`, then `tsc-alias` rewrites compiled path aliases.

Useful targeted builds:

```bash
npm run build:server
npm run build:client
npm run build:client:bundle
npm run build:client:assets
npm run make:css
npm run make:json
npm run make:static
npm run make:cards
```

## TypeScript Native Compiler

The project uses `typescript@rc`, which provides the Go-native TypeScript 7
compiler as the normal `tsc` binary:

```bash
npm run build:server
npm run build:test
```

The shared `tsconfig.json` uses `moduleResolution: "bundler"` because TypeScript
7 rejects the old `node`/`node10` resolution mode, while switching this CommonJS
server directly to `node16` exposes ESM interop work that should be handled as a
separate module-system migration.

## Local Development

```bash
npm run dev
```

`npm run dev` starts the development workflow in `scripts/dev.sh`:

1. Generate static JSON with `make:json`.
2. Start the server with `tsx watch`.
3. Start Rolldown client watch mode.
4. Watch LESS and generated card rendering data.

Targeted watch commands:

```bash
npm run dev:server
npm run dev:client
npm run watch:less
npm run watch:cards
```

`dev:client` is the Rolldown watcher.

## Linting

```bash
npm run lint
```

`npm run lint` runs Oxlint, i18n audit, and stylelint.

Targeted checks:

```bash
npm run lint:server
npm run lint:oxc
npm run lint:i18n
npm run lint:css
```

`lint:server` delegates to `lint:oxc`. Oxlint is run with `--quiet` so
warning-level migration noise does not flood normal lint output.

## Tests

```bash
npm run test
```

`npm run test` runs both server and client tests.

Targeted test commands:

```bash
npm run test:server
npm run test:client
npm run test:client:watch
npm run test:integration
npm run test:postgresql
npm run build:test
```

Client tests use Vitest with the same Vue SFC and LESS preprocessing conventions
as the Rolldown application build.

Single server test file:

```bash
npx mocha --import=tsx --require tests/testing/setup.ts "tests/cards/base/Algae.spec.ts"
```

Single client test file:

```bash
cross-env NODE_ENV=development vitest run -c vitest.config.mjs tests/client/components/Board.spec.ts
```

## Visual Smoke

Build the app, start the built server, then run the browser smoke test against
that server:

```bash
npm run clean
npm run build
PORT=8092 node build/src/server/server.js
TM_BASE_URL=http://localhost:8092 TM_VISUAL_OUT=/tmp/tm-smoke npm run visual:smoke
```

Stop the server after the smoke run. Visual artifacts should stay outside the
repository unless they are intentionally being reviewed.

The smoke script creates a two-player game through the UI, submits setup for both
players, exercises a first-generation action/pass flow, and verifies that the
game reaches generation 2 without page or console errors.

## Generated Outputs

Generated build outputs belong under `build/` and `src/genfiles/`. Do not commit
them. `npm run clean` removes both directories.

The Rolldown client build owns these generated client files:

- `build/main.js`
- `build/vendors.js`
- `build/sw.js`
- `build/chunks/`
- matching `.gz` and `.br` sidecars

Production source maps are opt-in with `TM_BUILD_SOURCEMAPS=1`.

CSS is still built separately by `make:css` into `build/styles.css`.
