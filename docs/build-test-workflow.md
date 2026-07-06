# Build And Test Workflow

This project uses Node 22, TypeScript, Vue 3, LESS, and npm scripts as the
canonical developer interface.

## Tooling Roles

- Rolldown is the default client bundler for production builds and client watch
  mode. It handles the browser TypeScript/Vue graph and writes `main.js`,
  `vendors.js`, `sw.js`, and lazy chunks under `build/chunks/`.
- OXC is used through Rolldown for fast JavaScript and TypeScript transforms and
  minification.
- Oxlint runs as a fast correctness preflight before the existing ESLint rules.
- Mocha remains the server test runner.
- Vitest runs client component tests against Vue single-file components.

npm remains the expected package manager for repository scripts and lockfile
updates. Bun and Rsbuild/Rspack are not part of the default flow.

## Install

Use Node 22, then install dependencies from the lockfile:

```bash
npm install
```

## Full Build

```bash
npm run clean
npm run build
```

`npm run build` runs:

1. `npm run make:static`
2. `npm run build:server`
3. `npm run build:client`

The client build runs `make:json`, `make:cards`, removes stale client outputs,
bundles with Rolldown, then writes gzip and brotli sidecars for the client
JavaScript outputs.

Useful targeted builds:

```bash
npm run build:server
npm run build:client
npm run make:css
npm run make:json
npm run make:cards
```

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

`npm run lint` runs server linting, i18n audit, Vue type checking, and stylelint.

Targeted checks:

```bash
npm run lint:server
npm run lint:oxc
npm run lint:i18n
npm run lint:client
npm run lint:css
```

`lint:server` first runs `lint:oxc`, then the existing ESLint config. Oxlint is
run with `--quiet` so warning-level migration noise does not flood normal lint
output.

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
- matching `.map`, `.gz`, and `.br` sidecars

CSS is still built separately by `make:css` into `build/styles.css`.
