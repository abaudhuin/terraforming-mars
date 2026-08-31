# CSS architecture

The application keeps one compiled stylesheet, but source ownership is split by
stable product surfaces rather than by individual classes.

## Source layers

- `common.less` is the global build manifest and owns only application-wide
  primitives plus ordered imports.
- Existing feature files such as `cards.less`, `turmoil.less`, and
  `colonies.less` own their standalone game objects.
- `player_table.less` is the complete public facade for the composed table
  workspace and is loaded once, after the standalone feature styles.
- `player-table/` owns the table shell and its composed surfaces. Its
  [README](../src/styles/player-table/README.md) is the canonical ownership map.

## Maintenance contract

- Put a rule with the narrowest durable owner that can express it.
- Prefer a component or surface root over a global selector.
- Change the existing declaration and remove superseded behavior instead of
  adding a later override.
- Use coarse modules. Split when a surface has a distinct responsibility and
  enough related rules to navigate independently—not once per component or
  class.
- Use directories for ownership and the manifest for cascade order. Do not
  encode chronology in filenames or create `final`, `fix`, or `compatibility`
  buckets.
- Treat ordered imports as part of the cascade API. Reordering requires a build
  and the complete golden visual pass.
- A public facade must be complete: `common.less` must never reach into an
  internal directory for a late override.

This structure optimizes for fast evolution: contributors have one build
manifest, one table entry point, and an explicit place for each major surface,
while the generated CSS remains compatible with the existing application.
