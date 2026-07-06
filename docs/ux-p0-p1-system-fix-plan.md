# Desktop UX P0/P1 System Fix Plan

Date: 2026-07-04

This document turns the previously surfaced P0/P1 findings in
`docs/ux-current-ui-roast-prioritized.md` into the smallest set of system-level
changes that can fix the current desktop experience without rebuilding the game
client. The goal is not to patch every symptom independently. The goal is to
replace the few unstable UI grammars that keep producing the same problems:
duplicated information, cropped controls, nested scroll traps, inconsistent
buttons, and panels that do not match player intent.

Scope: 16:9 and 16:10 desktop only. Mobile is intentionally out of scope.

## Principles

- Keep game semantics untouched. The server input models, legal-action logic,
  card rendering, and existing component contracts stay intact unless a small
  prop/event change removes real UI friction.
- Fix systems, not pixels. If a button, modal, action tile, card strip, or
  player row is inconsistent, define the shared rule once and let the existing
  surfaces inherit it.
- Preserve icon literacy. Resource icons, card colors, tags, player colors, and
  expansion symbols are meaningful gameplay language and must remain visible.
- No non-list nested scroll traps. Lists can scroll. A whole action detail area
  can scroll if it is the one focused surface. Small panels inside other
  scrollable panels should not create competing scrollbars.
- Prefer progressive disclosure by player intent:
  - glance: current turn, player resources, map state, recent activity;
  - focused action: legal actions plus the selected action workspace;
  - review: hand, played cards, full log, player dossier, board/modules.

## Minimal Intervention Set

### 1. Normalize The Cockpit Chrome

Problem pattern:
- P0/P1 screenshots show the top bar wasting vertical space, several controls
  looking unrelated, old "table tools" and log affordances fighting the game
  surfaces, and close/eye/expand buttons using different visual languages.

Change:
- Introduce a small cockpit control grammar in `src/styles/player_table.less`:
  `.tm-control`, `.tm-control--primary`, `.tm-icon-control`, `.tm-panel-chip`,
  `.tm-surface`, and shared hover/focus states.
- Apply it to top tools, modal close buttons, log expand, board expand,
  milestone/award summary, player-eye buttons, card filter pills, and action
  submit buttons.
- Remove purely decorative or duplicate labels from the top bar. Keep compact
  turn state, generation, next player, and review tools.
- Use icon-only or compact icon+text controls where the action is review/open,
  and full text only for irreversible or confirming gameplay actions.

Files:
- `src/client/components/PlayerHome.vue`
- `src/client/components/GameBoardView.vue`
- `src/styles/player_table.less`

Acceptance:
- All review/open controls have the same shape, border, hover, and active state.
- The top bar reads as a thin cockpit strip, not as a legacy page header.
- No "X" text button remains where a close icon is expected.

### 2. Rebuild The Player Rail Around Three Information Levels

Problem pattern:
- The current player rail duplicates the current player, clips status pills,
  exposes hover-only hidden data, uses a misplaced eye button, and compresses
  player cards/details into unusable spaces.

Change:
- Render each player once, with the current player ordered first. Remove the old
  duplicate self card that was useful in the legacy stacked layout but harmful
  in the cockpit rail.
- Keep glance cards compact and stable:
  - name and corporation;
  - active/next/passed status on one line;
  - six resource icons with stock and production;
  - current player gets VP/TR/cards summary.
- Replace hover expansion with explicit controls:
  - the eye icon opens the full player dossier;
  - a compact tags row/chip can appear only for the current player in the rail;
  - all opponent tags belong in the full dossier, not in hover overflow.
- Reorganize the player dossier into three vertical review bands:
  1. economy and tags;
  2. played cards;
  3. filtered activity log.

Files:
- `src/client/components/overview/PlayersOverview.vue`
- `src/client/components/overview/PlayerInfo.vue`
- `src/client/components/PlayerHome.vue`
- `src/styles/player_table.less`

Acceptance:
- No player card is duplicated.
- The eye icon is aligned in the identity row and opens the same dossier as the
  Players tool.
- The active/current status never clips against the screen edge.
- Opponent detail review happens in the full dossier, not in a tiny embedded card
  list.

### 3. Make Actions A Single Workbench, Not A Stack Of Widgets

Problem pattern:
- The action panel still leaks old menu concepts: useless subtitles, duplicate
  "selected action" text, pass/confirm controls in different places, child UIs
  that either over-scroll or appear in small cramped subpanels, and action icons
  that are cropped or out of theme.

Change:
- Keep `OrOptions` as the legal-action selector, but simplify its copy:
  - remove "Selected action" path chrome;
  - remove low-value meta such as "legal space(s)" from primary action tiles;
  - use meta only when it changes player decisions, such as playable card counts.
- Make every action tile follow one contract:
  - icon well;
  - title;
  - optional compact count/status;
  - inline confirm for simple actions.
- For selected child actions, use the full right side of the workbench. The
  child action owns that focused space, so internal scrollbars should collapse
  into one scrollable list/grid where needed.
- Fix pass, sell patents, fund award, claim milestone, and standard project
  selection to use the same primary confirm placement.
- Replace cropped/off-theme action icons with the closest existing board-game
  icon assets inside a centered icon well.

Files:
- `src/client/components/OrOptions.vue`
- `src/client/components/WaitingFor.vue`
- `src/client/components/SelectCard.vue`
- `src/client/components/SelectProjectCardToPlay.vue`
- `src/styles/player_table.less`

Acceptance:
- Selecting an action does not duplicate the same choice on both sides unless
  the right side adds real configuration.
- Pass and sell patents use the same action card grammar as other actions.
- Action labels wrap cleanly instead of truncating important verbs.
- The selected action area has one obvious confirm button at the correct end of
  the interaction.

### 4. Replace Payment With A Compact Ledger

Problem pattern:
- Payment screens duplicate cost/spent/remaining in multiple places, create
  double scrollbars, and bury the meaningful interaction: choosing which
  resources pay the card.

Change:
- Keep the payment engine and `PaymentForm` logic intact.
- Simplify `PaymentForm` presentation:
  - remove dashboard summary cards;
  - show a compact "cost" chip in the payment header;
  - each spendable resource row shows resource icon, label, available amount,
    value rate, stepper, and row subtotal;
  - confirm stays bottom-right inside the payment panel.
- Make the card chooser and payment ledger a two-column workbench for project
  cards. The card chooser scrolls as a list/grid; the payment side does not add
  a second nested scrollbar unless many resource rows require it.

Files:
- `src/client/components/PaymentForm.vue`
- `src/client/components/PaymentUnit.vue`
- `src/client/components/SelectProjectCardToPlay.vue`
- `src/styles/payments.less`
- `src/styles/player_table.less`

Acceptance:
- No cost/spent/remaining dashboard appears.
- No double scrollbar appears in the payment action at 1600x900 or 1440x900.
- Resource icons remain prominent and aligned.
- The confirm action is visually primary and consistently placed.

### 5. Treat Cards As Review Rails, Not Miniature Pages

Problem pattern:
- Hand and played-card areas can show dead header bands, mismatched card
  highlight sizes, too-small cards, and confusing duplicate entry points.

Change:
- Remove the separate hand button from the action heading. Hand review belongs
  in the bottom card tray and card overlay.
- Keep the bottom tray visible when not acting; when acting, let the action
  workbench own the lower area.
- Normalize card sizes:
  - bottom tray: small but readable planning cards;
  - action selection: slightly larger cards for direct choice;
  - overlays/dossiers/log previews: medium cards with matched highlight bounds.
- Card filters use the same pill grammar everywhere. Blue/Green/Event filters
  appear in the player's own card overlay and in player dossiers with identical
  styling.

Files:
- `src/client/components/PlayerHome.vue`
- `src/client/components/SelectCard.vue`
- `src/client/components/logpanel/CardPanel.vue`
- `src/styles/player_table.less`

Acceptance:
- No empty or collapsed-looking bands appear above played cards.
- Highlight boxes and card bounds match.
- Hand review is not duplicated as an isolated action-panel button.
- Played cards and hand are scannable at desktop widths without vertical page
  scrolling.

### 6. Make Log Previews Contextual

Problem pattern:
- Clicking cards in the compact activity rail opens a tiny clipped card pop-up.
  It works better in full log, but is bad in the main cockpit.

Change:
- Compact activity rail:
  - clicking a previewable log row opens a bottom-tray activity detail surface;
  - cards are shown as a horizontal rail there, never as a clipped pop-up.
- Full log overlay:
  - inline preview can remain because there is enough space, but it should use
    the same card sizing and close control grammar.
- Player dossier:
  - filtered log remains a review section below cards.

Files:
- `src/client/components/PlayerHome.vue`
- `src/client/components/logpanel/LogPanel.vue`
- `src/client/components/logpanel/CardPanel.vue`
- `src/styles/player_table.less`

Acceptance:
- No clipped card detail pop-up appears from the compact activity rail.
- Activity detail replaces the bottom tray temporarily when it needs space.
- Full log preview remains usable and visually coherent.

### 7. Dock Extension Surfaces As Board Modules

Problem pattern:
- Milestones/awards, colonies, Turmoil, Moon, Pathfinders, Delta, and Underworld
  compete with the map or hide in tools. Some buttons are not clearly buttons,
  and extension panels do not share a placement contract.

Change:
- Keep board modules attached to the board stage, bottom-first where possible
  because that matches tabletop reference and keeps the planet primary.
- Use a common module summary style for Milestones/Awards and extension modules.
- Keep compact state visible on the board, full state in an expanded overlay or
  fixed panel.
- Move player-owned Underworld tokens out of generic table tools into a small
  player/detail section where they are gameplay state, while table tools remain
  meta/admin.

Files:
- `src/client/components/GameBoardView.vue`
- `src/client/components/PlayerHome.vue`
- `src/styles/player_table.less`

Acceptance:
- Milestones/Awards compact summary is clearly clickable and does not use a
  mismatched black/yellow button state.
- Module panels open in predictable board-relative positions.
- Gameplay module state is not buried with spectator/purge/admin tools.

### 8. Remove Setup And Endgame Layout Leaks

Problem pattern:
- Setup has sticky content covering cards, repeated warnings, and old stacked
  page rhythm. Endgame remains a legacy visual island.

Change:
- Keep setup's existing interaction order because it is understandable, but make
  the summary/confirm area compact and non-covering.
- Ensure setup card grids have one list scrollbar and no sticky overlay masking
  card tops.
- Give endgame the same cockpit surface styling for panels, buttons, and log
  containers without changing scoring logic.

Files:
- `src/client/components/PlayerSetupView.vue`
- `src/client/components/SelectInitialCards.vue`
- `src/client/components/GameEnd.vue`
- `src/styles/player_table.less`
- `src/styles/common.less`

Acceptance:
- Initial setup can be completed without card tops disappearing under the
  summary bar.
- Endgame looks connected to the new UI instead of reverting to the old page
  stack.

## Implementation Order

1. Add shared cockpit control/surface CSS and apply it to existing controls.
2. Fix player rail rendering and dossier structure.
3. Simplify action workbench copy, icons, confirm placement, and scroll rules.
4. Simplify payment ledger and project-card action layout.
5. Normalize card rails, filters, overlays, and log previews.
6. Normalize module docking and table tools.
7. Clean setup/endgame leaks.
8. Build, run scenario screenshots, inspect, and iterate.

## Verification Plan

Use the scenario lab rather than manual happy-path clicking only.

Build:

```bash
npm run build
```

Run server on an available local port, then capture at least:

```bash
TM_BASE_URL=http://localhost:8081 TM_SCENARIOS=all TM_VIEWPORTS=1600x900,1440x900 npm run visual:scenarios
```

Minimum review targets:

- `base-action-core`: action chooser, payment, standard projects, milestones,
  board hover, compact/full log, own cards, opponent dossier.
- `ux-turn-modes`: active/waiting/pass/post-action states.
- `ux-panel-mechanics`: overlays, resizing, heavy module mix, player rail.
- `ux-cards-filter-matrix`: card scale, filters, action card choice, warnings.
- `base-5p-rail` and `five-player-density`: player rail density.
- `colonies-venus-pathfinders-3p`: colonies/Venus/Pathfinders module docking.
- `turmoil-moon-underworld-3p` and `moon-underworld-delta`: Turmoil, Moon,
  Underworld, Delta module state.
- `board-variants-ma`: unfamiliar milestone/award labels.
- `endgame-all-scoring`: endgame visual continuity.

For each scenario, inspect screenshots for:

- no clipped text, icons, or cards;
- no accidental duplicate UI;
- no nested scrollbar except list/card/log surfaces;
- visible resource icons and player colors;
- clear selected/disabled/hover/active button states;
- board remains primary, with modules docked predictably;
- acting and waiting states both explain what the player can do now.

## Non-Goals

- No mobile responsive redesign in this pass.
- No server-side rules or legality changes.
- No replacement of the card renderer.
- No new design framework dependency unless already present and necessary.
- No attempt to make every expansion perfect beyond the P0/P1 layout and
  discoverability failures identified by the scenario pass.

## Final Continuation Audit

Date: 2026-07-04.

Additional issues found during the final visual pass:

- Action detail card/project choices still wrapped into clipped lower rows at
  1440x900 in payment and standard-project states.
- Setup card selectors reused compact action-list limits, causing corporation
  cards to collide with the next setup section in some module-heavy starts.

Fixes added:

- Action detail card/project choices now render as a single horizontal list with
  full-height readable cards and a payment panel beside them.
- Standard-project choices use the same list pattern instead of stacking into
  a cropped grid.
- Setup card selectors now reserve full card height and rely on page-level
  setup scrolling rather than nested clipped card panes.

Current verification:

- Full scenario lab rerun with all 15 available scenario presets.
- Desktop viewports: `1440x900` and `1600x1000`.
- Screenshots generated: 566.
- Skipped screenshots: 0.
- Scenario failures: 0.
- Browser page errors: 0.
- Browser console errors: 0.
- Visual notes: 0.
- Coverage tags: 140.

Fresh contact sheets from the final pass:

- `/tmp/tm-exhaustive-20260704-current-final-sheets/changed-actions.jpg`
- `/tmp/tm-exhaustive-20260704-current-final-sheets/changed-setup.jpg`
- `/tmp/tm-exhaustive-20260704-current-final-sheets/core-table.jpg`
- `/tmp/tm-exhaustive-20260704-current-final-sheets/overlays.jpg`
- `/tmp/tm-exhaustive-20260704-current-final-sheets/modules-endgame.jpg`

Known residual polish, not treated as P0/P1 in this pass:

- Very dense extension panels such as Turmoil and Pathfinders still rely on
  their native oversized board surfaces inside the module dock.
- The bottom-right tools popover can temporarily cover part of the action
  detail while it is open.
