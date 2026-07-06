# UI Architecture And Game Logic Boundary

Date: 2026-06-30

This document maps the current repository architecture with a UI/UX remake in
mind. It focuses on the visual layer, the shared JSON contracts, and the places
where the frontend interacts with server-side game logic.

## Executive Summary

The application is a Vue 3 and TypeScript frontend served by a custom Node HTTP
server. The game engine is server-authoritative. The client renders shared model
objects from `src/common`, submits typed input responses, and receives a fresh
player model after every successful action.

The strongest foundation for a UI remake is the existing contract layer:

- `src/common/models/GameModel.ts`
- `src/common/models/PlayerModel.ts`
- `src/common/models/PlayerInputModel.ts`
- `src/common/inputs/InputResponse.ts`
- `src/server/models/ServerModel.ts`

The hardest parts to remake cleanly are:

- `PlayerHome.vue`, which composes most of the gameplay UI.
- `Board.vue`, which is asset/CSS-position driven.
- `CreateGameForm.vue`, which is very large and stateful.
- The global LESS stylesheet stack in `src/styles`.
- Root-level screen switching and forced re-rendering in `App.vue` and
  `WaitingFor.vue`.

## Stack

Runtime and build:

- Node 22
- TypeScript
- Vue 3, mostly Options API
- Rolldown for default client builds and dev watch
- Oxlint as the OXC-family source lint engine
- LESS
- Spectre CSS imported globally
- Mocha, Vitest, Vue Test Utils, jsdom

Important scripts from `package.json`:

See [Build And Test Workflow](build-test-workflow.md) for the complete local
build, development, lint, test, and visual smoke flow.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Starts the local dev workflow through `scripts/dev.sh`. |
| `npm run dev:server` | Runs the TypeScript server with `tsx watch`. |
| `npm run dev:client` | Runs Rolldown in watch mode. |
| `npm run build` | Runs the fast parallel build orchestrator for static assets, server, card data, and client assets. |
| `npm run make:css` | Compiles `src/styles/common.less` to `build/styles.css` and fast gzip/brotli sidecars. |
| `npm run make:cards` | Exports generated card rendering data. |
| `npm run test:client` | Runs client component tests through Vitest. |
| `npm run lint:oxc` | Runs Oxlint's quiet correctness sweep over `src` and `tests`. |
| `npm run lint:css` | Runs stylelint over LESS and Vue files. |

## Directory Map

| Path | Role |
| --- | --- |
| `src/client/main.ts` | Frontend bootstrap: translations, Vue app, directives, service worker. |
| `src/client/components/App.vue` | Top-level screen selector and route-driven fetches. |
| `src/client/components/PlayerHome.vue` | Main player gameplay screen. |
| `src/client/components/SpectatorHome.vue` | Spectator gameplay screen. |
| `src/client/components/GameBoardView.vue` | Shared board/map/expansion widgets. |
| `src/client/components/Board.vue` | Mars board renderer. |
| `src/client/components/card/*` | Card rendering component tree. |
| `src/client/components/create/CreateGameForm.vue` | New game setup UI. |
| `src/client/components/overview/*` | Player resource/status/overview widgets. |
| `src/client/components/logpanel/*` | Game log rendering. |
| `src/client/components/*Select*.vue` | Typed player input components. |
| `src/client/utils/PreferencesManager.ts` | LocalStorage-backed UI preferences. |
| `src/common` | Shared types, models, enums, paths, inputs, card metadata types. |
| `src/server` | Game engine, cards, boards, routes, persistence, serializers. |
| `src/server/models/ServerModel.ts` | Converts authoritative server objects into client JSON models. |
| `src/server/routes/*` | Custom HTTP handlers. |
| `src/styles` | Global LESS stylesheet stack. |
| `assets` | Static images, fonts, icons, HTML shell, locale bundles. |
| `tests/client` | Vue component tests and client utility tests. |

## Request Routing

The server does not use Express. It uses a custom path-to-handler map in
`src/server/server/requestProcessor.ts`.

Key routes:

| Path | Handler | Purpose |
| --- | --- | --- |
| `/` and page paths | `ServeApp` | Serve the single-page app shell. |
| `/assets/*`, `/chunks/*`, `main.js`, `styles.css` | `ServeAsset` | Serve static built assets. |
| `/api/creategame` | `ApiCreateGame` | Create a game from `NewGameConfig`. |
| `/api/game` | `ApiGame` | Return public game summary. |
| `/api/player` | `ApiPlayer` | Return `PlayerViewModel` for one player. |
| `/api/spectator` | `ApiSpectator` | Return spectator view model. |
| `/player/input` | `PlayerInput` | Process a typed player action. |
| `/api/waitingfor` | `ApiWaitingFor` | Poll for turn/state changes. |
| `/reset` | `Reset` | Undo/reset workflow. |

The shared route constants live in `src/common/app/paths.ts`, which both client
and server import.

## Client Bootstrap And Screen Selection

`src/client/main.ts`:

- Reads the preferred language from `PreferencesManager`.
- Fetches `assets/locales/{lang}.json` when language is not English.
- Creates the Vue app with `App.vue`.
- Registers the i18n plugin and `v-trim-whitespace` directive.
- Registers `PlayerInputFactory` as an async component.
- Registers the service worker when available.

`src/client/components/App.vue` is a lightweight manual router. On mount it
reads the last URL path segment and sets `screen` to one of:

- `start-screen`
- `create-game-form`
- `load`
- `game-home`
- `player-home`
- `spectator-home`
- `the-end`
- `games-overview`
- `cards`
- `admin`
- `login-home`
- `help`

For player and spectator pages, `App.vue` fetches model data:

```text
GET /api/player?id=p...
GET /api/spectator?id=s...
GET /api/game?id=g...
```

The app does not have a centralized client store. Instead, the root component
holds `playerView`, `spectator`, `game`, and `screen`.

## Game Creation Flow

Primary files:

- `src/client/components/create/CreateGameForm.vue`
- `src/common/game/NewGameConfig.ts`
- `src/server/routes/ApiCreateGame.ts`
- `src/server/models/ServerModel.ts`

Flow:

1. `CreateGameForm.vue` manages a large local form model for players,
   expansions, boards, variants, drafting, card filters, and optional clone data.
2. `serializeSettings()` produces a `NewGameConfig`.
3. `createGame()` posts JSON to `/api/creategame`.
4. `ApiCreateGame` validates quota, creates players and IDs, chooses a board,
   constructs `GameOptions`, and creates or clones a game.
5. Server stores the game through `ctx.gameLoader.add(game)`.
6. Server returns `Server.getSimpleGameModel(game)`.
7. Client either redirects single-player games to `/player?id=...` or swaps
   the root screen to `game-home`.

UI remake note:

`CreateGameForm.vue` is a major candidate for decomposition. It currently
combines form layout, option dependencies, serialization, validation, and
navigation.

## Player Turn Flow

Primary files:

- `src/server/routes/ApiPlayer.ts`
- `src/server/models/ServerModel.ts`
- `src/client/components/PlayerHome.vue`
- `src/client/components/WaitingFor.vue`
- `src/client/components/PlayerInputFactory.vue`
- `src/server/routes/PlayerInput.ts`

Flow:

1. Browser opens `/player?id=p...`.
2. `App.vue` calls `GET /api/player?id=p...`.
3. `ApiPlayer` loads the game by player ID and returns
   `Server.getPlayerModel(player)`.
4. `PlayerHome.vue` renders the main gameplay view from `PlayerViewModel`.
5. If the player has a pending action, `WaitingFor.vue` renders
   `PlayerInputFactory`.
6. `PlayerInputFactory` selects an input component based on
   `PlayerInputModel.type`.
7. The input component calls `onsave(out: InputResponse)`.
8. `WaitingFor.vue` posts to `/player/input?id=p...` with:

```json
{
  "runId": "...",
  "type": "...",
  "...": "typed response fields"
}
```

9. `PlayerInput` validates `runId`, calls `player.process(entity)`, and returns
   a fresh `PlayerViewModel`.
10. `WaitingFor.vue` replaces the root `playerView`, increments `playerkey`,
    and forces the root screen back to `player-home`.

The key design point: the client does not execute game rules. It chooses and
submits an input response. The server processes the rule and sends new state.

## Waiting And Refresh Flow

`WaitingFor.vue` handles idle and active turn behavior.

When the player is not currently expected to act:

- It polls `/api/waitingfor?id=...&gameAge=...&undoCount=...`.
- A `GO` response triggers `root.updatePlayer()` and optional notification.
- A `REFRESH` response refreshes player or spectator state.

It also owns:

- Sound notifications.
- Browser notifications.
- Animated document title and experimental favicon turn indicator.
- Optional "Suspend" behavior when `experimental_ui` is enabled.

UI remake note:

This file mixes state polling, notifications, input submission, error handling,
and root view replacement. A redesigned UI would benefit from moving those into
a dedicated client service or composable.

## Main Gameplay Screen

`PlayerHome.vue` composes most of the live game UI:

- `TopBar`
- End-game notice
- `Sidebar`
- `GameBoardView`
- `PlayersOverview`
- `LogPanel`
- `WaitingFor`
- Drafted cards
- Cards in hand through `SortableCards`
- Played cards, split into active, automated, and event groups
- `StackedCards`
- Self-replicating robot cards
- Underworld tokens
- `PlayerSetupView` before initial setup is complete
- Colonies
- Spectator link
- `PurgeWarning`
- `KeyboardShortcuts`

It also owns local preferences for hiding/showing hand, active cards, automated
cards, and events.

Risk for remake:

`PlayerHome.vue` is a composition root and a layout component at the same time.
It is the natural first target for a new shell, but changing it touches almost
every gameplay workflow.

## Board Rendering

Primary files:

- `src/client/components/GameBoardView.vue`
- `src/client/components/Board.vue`
- `src/client/components/BoardSpace.vue`
- `src/client/components/board/BoardSpaceTile.vue`
- `src/styles/board.less`
- `src/styles/board_items_positions.less`
- `src/server/models/ServerModel.ts`
- `src/common/models/SpaceModel.ts`

`ServerModel.getSpaces()` serializes board state into `SpaceModel` objects with:

- `id`
- `x`, `y`
- `spaceType`
- `bonus`
- `tileType`
- `color`
- expansion-specific flags such as `gagarin`, `cathedral`, `nomads`,
  `undergroundResource`, `excavator`, and `coOwner`

`Board.vue` renders:

- Global parameter tracks for oxygen, temperature, Venus, oceans, and Ares.
- Outer colony-style spaces.
- Mars spaces sorted by numeric ID.
- Board-specific SVG labels and lines.

`BoardSpace.vue` renders:

- Tile visual via `BoardSpaceTile`.
- Space label text for special spaces.
- Bonus icons.
- Coordinate overlay when tile view is `coords`.
- Player cubes, Gagarin markers, cathedral/nomad markers, underground tokens,
  and log highlight overlays.

UI remake implications:

- The board is mostly data-driven in terms of space state, but visual placement
  is fixed by CSS classes such as `board-space-{id}`.
- A remake can preserve `SpaceModel` while replacing the board renderer.
- If the new board remains HTML/CSS, the existing coordinate classes may be
  reusable.
- If the new board uses SVG or canvas, `SpaceModel` is still the right input,
  but the coordinate/interaction layer should be redesigned deliberately.

## Card Rendering

Primary files:

- `src/client/components/card/Card.vue`
- `src/client/components/card/*`
- `src/client/cards/ClientCardManifest.ts`
- `src/common/models/CardModel.ts`
- `src/common/cards/CardMetadata.ts`
- `src/common/cards/render/*`
- `src/server/tools/export_card_rendering.ts`

The server sends `CardModel`, which contains runtime state such as:

- Card name
- Calculated cost
- Resources on the card
- Disabled/available state
- Clone tag data

The client then looks up static card definition data through
`getCardOrThrow(card.name)` in `ClientCardManifest`.

`Card.vue` combines:

- Runtime `CardModel`
- Static card metadata
- Card type and module/expansion
- Tags
- Cost and calculated cost
- Requirements
- Resource counters
- Victory points
- Help text
- Preference-driven card height behavior

UI remake implications:

- Card UI is not purely server-rendered data. It relies on client-side card
  manifests and render metadata.
- Any new card component should keep a clear split between runtime card state
  and static card definition data.
- Text overflow and localization are major design constraints.

## Player Input Components

Contract files:

- `src/common/models/PlayerInputModel.ts`
- `src/common/inputs/InputResponse.ts`
- `src/client/components/PlayerInputFactory.vue`
- `src/server/inputs/*`

Current input types include:

- `and`
- `or`
- `amount`
- `card`
- `colony`
- `delegate`
- `globalEvent`
- `initialCards`
- `option`
- `party`
- `payment`
- `player`
- `projectCard`
- `space`
- `productionToLose`
- `aresGlobalParameters`
- `resource`
- `resources`
- `claimedUndergroundToken`
- `deltaProject`

`PlayerInputFactory.vue` maintains a typed registry:

```ts
const inputComponents = {
  'and': AndOptions,
  'or': OrOptions,
  'amount': SelectAmount,
  ...
} satisfies InputComponentRegistry;
```

This is one of the best existing pieces for a UI remake. A new frontend can
keep the same discriminated input model and replace the individual visual
components incrementally.

## Preferences

Primary file: `src/client/utils/PreferencesManager.ts`

Preferences are simple LocalStorage-backed values loaded at startup. They
include:

- `learner_mode`
- `enable_sounds`
- `magnify_cards`
- `hide_hand`
- `hide_top_bar`
- `small_cards`
- `remove_background`
- `hide_active_cards`
- `hide_automated_cards`
- `hide_event_cards`
- `symbol_overlay`
- `animated_title`
- `experimental_ui`
- `lang`

UI remake implications:

- Preferences are global and synchronous.
- Some UI experiments are already gated behind `experimental_ui`.
- A redesign should decide which preferences remain user-facing and which are
  legacy compatibility toggles.

## Styling Architecture

Primary entrypoint: `src/styles/common.less`

`common.less` imports:

- Spectre CSS
- Dialog polyfill CSS
- `variables.less`
- `mixins.less`
- Cards, board, player home, create game, preferences, payments, logs,
  expansions, help, and other feature styles

`rolldown.config.mjs` also injects `variables.less` and `mixins.less` into every
Vue `<style lang="less">` block through the Vue SFC LESS preprocessor's
`additionalData` option.

Current styling characteristics:

- Mostly global LESS selectors.
- Many asset-backed icons and board/card visuals.
- Shared variables exist but do not constitute a complete design-token system.
- Component-scoped styles exist in places, but the main styling model is global.
- Spectre CSS is still part of the baseline.

UI remake implications:

- A full visual remake should probably introduce a stronger token and component
  styling layer.
- The safest migration path is to keep old global styles available while the new
  UI shell is built, then retire imports by area.

## Localization

Localization is loaded client-side:

- English is default.
- Non-English language preference fetches `assets/locales/{lang}.json`.
- Translations are stored on `window._translations`.
- Components use the `v-i18n` directive and `$t`.

UI remake implications:

- Many strings live in templates.
- Long translated card names and UI labels are a real layout constraint.
- A new design should budget space for long labels and right-size text without
  per-language hacks where possible.

## Tests

There is broad client component coverage in `tests/client/components`, including
tests for:

- App screen behavior
- Board and board spaces
- Card rendering components
- Create game form and filters
- Input components
- Player home
- WaitingFor
- Sidebar and top bar
- Player overview widgets
- Expansion widgets

This is valuable for a remake, but many tests are likely coupled to the current
component names and DOM structure. For a large UI rewrite, expect to preserve
model/behavior tests while replacing visual DOM assertions.

## UI Remake Strategy

The safest high-level strategy is to preserve the server-authoritative model and
replace the frontend in layers.

Recommended order:

1. Preserve shared contracts:
   - `GameModel`
   - `PlayerViewModel`
   - `PublicPlayerModel`
   - `PlayerInputModel`
   - `InputResponse`

2. Create a new client-side state/fetch boundary:
   - Fetch player/spectator/game models in one place.
   - Submit `InputResponse` in one place.
   - Poll waiting state in one place.
   - Keep root rendering declarative instead of forcing `screen = 'empty'`.

3. Build a new gameplay shell around existing data:
   - Keep `PlayerHome.vue` as a reference.
   - Recompose board, log, actions, player overview, hand, and tableau into a
     new layout.
   - Keep old input components initially if useful.

4. Replace input components incrementally:
   - Start with `option`, `or`, `payment`, `projectCard`, `card`, and `space`.
   - These are the highest-impact turn interactions.

5. Replace card rendering carefully:
   - Keep `CardModel` plus `ClientCardManifest` split.
   - Build a robust text-fitting and localization strategy.
   - Preserve all resource, tag, requirement, and warning information.

6. Replace board rendering after the shell is stable:
   - Decide HTML/CSS versus SVG/canvas.
   - Keep `SpaceModel` as the renderer input.
   - Add visual regression checks because board state is dense and easy to
     misplace.

7. Decompose create-game last or in parallel:
   - It is important, but less risky to gameplay correctness than player turns.
   - It can become a multi-section settings flow backed by `NewGameConfig`.

## Key Design Questions

- Should the main play screen be a dense dashboard instead of the current long
  vertical document?
- Should actions live in a persistent panel, modal/dialog flow, command palette,
  or selected-card overlay?
- How should the UI expose "what can I do now?" without requiring users to scan
  every card and standard project?
- Should the log be always visible beside the board, collapsible, or searchable?
- How should mobile card selection and payment work?
- How much should card play be optimized for quick play versus explicit payment
  control?
- Should the board remain visually faithful to the physical board, or become a
  more information-dense digital map?
- Which preferences are core features versus compatibility toggles?

## Practical Constraints

- The server is authoritative. Do not duplicate rule execution in the client.
- The client still needs enough card metadata to render cards richly.
- The app supports many expansions and fan modules; UI components need to be
  resilient to optional game sections.
- The board, cards, and player colors depend heavily on assets.
- The app is multiplayer and long-lived; refresh, server restart, and stale
  `runId` handling matter.
- Existing save compatibility is handled server-side, so a UI remake should
  avoid requiring changes to serialized game state unless absolutely necessary.

## Files To Read First For Implementation

For a UI remake spike, start here:

1. `src/client/components/App.vue`
2. `src/client/components/PlayerHome.vue`
3. `src/client/components/WaitingFor.vue`
4. `src/client/components/PlayerInputFactory.vue`
5. `src/common/models/PlayerModel.ts`
6. `src/common/models/GameModel.ts`
7. `src/common/models/PlayerInputModel.ts`
8. `src/common/inputs/InputResponse.ts`
9. `src/server/models/ServerModel.ts`
10. `src/server/routes/PlayerInput.ts`
11. `src/client/components/GameBoardView.vue`
12. `src/client/components/Board.vue`
13. `src/client/components/card/Card.vue`
14. `src/client/components/create/CreateGameForm.vue`
15. `src/styles/common.less`
