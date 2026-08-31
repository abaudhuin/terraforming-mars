# Player-table CSS ownership

`../player_table.less` is the complete public entry point. Application code
imports that file once, after the standalone feature styles in `common.less`.
Do not import an internal file directly.

The source uses two independent structures:

- Directories answer **where a change belongs**.
- `index.less` answers **when that owner enters the cascade**.

This separation keeps ownership obvious without forcing unrelated surfaces into
one file or pretending that the existing cascade can be alphabetized safely.

## Ownership map

| Directory | Owns |
| --- | --- |
| `base/` | Table tokens, root grid, and non-interactive shell primitives |
| `activity/` | Focus, History, activity rows, feedback, and activity motion |
| `controls/` | Reusable buttons, icon and resize controls, focus semantics, panel chrome, and shared card interaction states |
| `shell/` | Cockpit composition, workspace modes, tray/card-desk geometry, utility shell, and supported shell density |
| `rail/` | Player summaries, resources, protection indicators, tags, and rail density |
| `setup/` | Corporation, Prelude, CEO, project-card setup, and setup viewport behavior |
| `actions/` | Workbench shell, command navigation/commit, card selection/payment, colony decisions, and action density |
| `board/` | Board fit, hit-testing, launcher placement, colonies/milestones runtime, and board-relative coordination |
| `modules/` | Expansion-drawer frame/open states and module-specific layouts |
| `overlays/` | Generic modal sizing/operability, player dossier composition, and log previews |

Most files are intentionally a few hundred lines and represent a durable
surface or one substantial state of that surface. Small rules stay with the
nearest owner; there is no file-per-class convention and no `final`,
`compatibility`, or numbered-pass dumping ground.

`controls/card-interactions.less` is the deliberate cross-surface exception. It
owns only card magnification and scroll-stability behavior shared by action
cards, the card desk, setup choices, modal galleries, and activity, dossier,
and log previews. Card geometry and layout remain with each consuming surface.

The larger surfaces are split by responsibility, not chronology:

- `actions/workbench-shell.less`, `command-board.less`,
  `card-selection-and-payment.less`, and `colony-selection.less` have
  non-overlapping decision responsibilities.
- `overlays/modal-sizing.less`, `player-dossier.less`, and `log-previews.less`
  separate generic overlay chrome from dossier and log content.
- `controls/system.less` and `rail/rail.less` are single semantic owners; they
  must not be followed by unconditional “compact,” “chrome,” or “theme”
  override layers.
- Density files are allowed only for a real surface-specific state and stay in
  that surface directory. `index.less` preserves their required cascade
  position without turning `shell/` into a cross-surface bucket.

## Editing contract

1. Find the surface directory first, then change the existing declaration that
   owns the behavior.
2. Remove superseded declarations. Do not append a new “fix,” “pass,” “lock,”
   or “final refinement” merely to win the cascade.
3. Keep geometry with the surface that uses it. Put shared interaction states
   in `controls/` and cross-surface primitives in `base/`.
4. Add a file only when a durable surface or substantial state has enough
   related rules to navigate independently. A selector or small state belongs
   in an existing owner.
5. Treat `index.less` order as an API. Moving an import requires a build and the
   complete golden visual pass, with particular attention to every affected
   surface.
6. Keep `player_table.less` complete. Late table-wide controls belong in its
   manifest, never as a second private import from `common.less`.

The result is deliberately conventional Less: one complete facade, one readable
manifest, coarse surface owners, and no framework migration required.
