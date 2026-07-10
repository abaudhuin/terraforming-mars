# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run build                # Fast full build: parallel CSS/JSON and server/cards, native tsc, Vite client build
npm run build:server         # Native TypeScript compile server only: tsc --build src/tsconfig.json
npm run build:client         # Vite production bundle, then gzip/brotli client assets
npm run build:test           # Native TypeScript compile tests: tsc --build tests/tsconfig.json
npm run lint                 # All lints: Oxlint + i18n audit + stylelint
npm run lint:oxc             # Fast Oxlint correctness preflight over src and tests
npm run lint:server          # Oxlint quiet correctness sweep over src and tests
npm run lint:fix             # Oxlint autofix
```

See `docs/build-test-workflow.md` for the full current build, dev, lint, test,
and visual smoke workflow. TypeScript 7 RC provides the native `tsc` compiler
used by the default server and test project builds. Production source maps are
off by default for speed; use `TM_BUILD_SOURCEMAPS=1 npm run build` only when
debugging production bundles.

### Running Tests

```bash
npm run test                 # All tests (server + client)
npm run test:server          # Vitest server tests (~7000 tests)
npm run test:client          # Vitest client component tests

# Single server test file
vitest run --project server tests/cards/base/Algae.spec.ts

# Single client test file
vitest run --project client tests/client/components/Board.spec.ts
```

### Dev Servers

```bash
npm run dev:server           # Server with hot reload (tsx watch)
npm run dev:client           # Vite client build watch mode
npm run watch:less           # CSS rebuild on change
```

## Architecture

### Three-Layer Structure

- **`src/server/`** - Game engine, card logic, routes, database. Runs on Node.js.
- **`src/client/`** - Vue 3 frontend (Options API, `defineComponent`). Bundled with Vite for app builds.
- **`src/common/`** - Shared types, enums, and models used by both client and server. No runtime logic that depends on either side.

The `@/` import alias maps to `./src/` (configured in tsconfig paths and Vite/Vitest).

### Card System

Cards are the core domain object (~1000 cards across 15 modules). Each card involves:

1. **Card class** (`src/server/cards/<module>/CardName.ts`) - Extends `Card`, defines cost, tags, requirements, behavior, and metadata. Simple cards are purely declarative via the `behavior` property. Complex cards override `play()`, `action()`, `canAct()`, etc.
2. **CardName enum entry** (`src/common/cards/CardName.ts`) - Every card needs an enum value here.
3. **Module manifest** (`src/server/cards/<module>/<Module>CardManifest.ts`) - Registers the card's factory in a `ModuleManifest`. All manifests aggregate in `AllManifests.ts`.
4. **Card renderer** - Defined inline in the card's `metadata.renderData` using the `CardRenderer.builder()` DSL.
5. **Test** (`tests/cards/<module>/CardName.spec.ts`) - Uses `testGame()` and `TestPlayer` helpers.

Card types: `EVENT`, `ACTIVE` (has action), `AUTOMATED`, `PRELUDE`, `CORPORATION`, `CEO`, `STANDARD_PROJECT`, `STANDARD_ACTION`.

### Behavior System

The `Behavior` type (`src/server/behavior/Behavior.ts`) is a declarative DSL for card effects: production changes, resource gains, tile placement, TR changes, etc. Cards set `behavior` (on play) and/or `action` (repeatable) properties. The `BehaviorExecutor` (`src/server/behavior/Executor.ts`) interprets these at runtime. Prefer declarative `behavior` over imperative `play()` overrides when possible.

### Deferred Actions

Player choices and multi-step effects use `DeferredAction` (`src/server/deferredActions/`). Actions are queued via `game.defer(action)` with a `Priority` and resolved in order. The `.andThen()` callback chains follow-up logic after a deferred action resolves.

### Player Inputs

When a player needs to make a choice, the server returns a `PlayerInput` (e.g., `SelectSpace`, `SelectCard`, `OrOptions`). These live in `src/server/inputs/`. The client renders the appropriate UI based on the input type.

### Game Modules (Expansions)

Each expansion has its own directory under `src/server/cards/` and a manifest. Modules: `base`, `corpera` (Corporate Era), `promo`, `venus`, `colonies`, `prelude`, `prelude2`, `turmoil`, `community`, `ares`, `moon`, `pathfinders`, `ceo`, `starwars`, `underworld`. Cross-expansion card compatibility is declared via `compatibility` in `CardFactorySpec`.

### Client Components

Vue 3 with Options API. Components are in `src/client/components/`. The root `App.ts` routes between screens. `PlayerHome.vue` is the main game view. Card rendering components are in `src/client/components/card/`. Styles use Less (`src/styles/`).

### Database

Pluggable backends in `src/server/database/`: `SQLite`, `PostgreSQL`, `LocalFilesystem`. Games are serialized/deserialized through `SerializedGame`/`SerializedPlayer` types. `GameLoader` handles caching and retrieval.

### Testing Patterns

- **`testGame(n, options?)`** - Creates a game with n players, returns `[game, ...players]`. Skips initial card selection by default.
- **`TestPlayer`** - Extends `Player` with test utilities. Use static factories: `TestPlayer.BLUE`, `TestPlayer.RED`, etc.
- Server card tests: instantiate the card, call `canPlay()`/`play()`/`action()`, assert state changes.
- Client tests: use `@vue/test-utils` mount/shallowMount with JSDOM setup from `tests/client/components/setup.ts`.
- Test framework: Mocha + Chai for server tests. Client tests use Vitest with Chai-compatible assertions and Vue Test Utils.

### Internationalization

Custom i18n via `src/client/directives/i18n.ts` with `v-i18n` directive. Translation files in `src/locales/`. Strings are matched by exact text content.

## Style Guide

- Follow the style of the code around the file. If this is a new file, follow the style of the code in the directory.
