# Fork UI/UX Research

Date: 2026-06-30

This report looks for prior UI and UX work in forks of
[terraforming-mars/terraforming-mars](https://github.com/terraforming-mars/terraforming-mars),
with emphasis on work that could inform a full UI remake.

## Scope And Method

The local repository is `abaudhuin/terraforming-mars`, a fork of
`terraforming-mars/terraforming-mars`.

GitHub repository metadata at the time of review:

- Upstream: `terraforming-mars/terraforming-mars`
- Upstream stars: 929
- Upstream fork count shown by repo metadata: 435
- Accessible forks returned by the REST forks endpoint: 420
- Current fork: `abaudhuin/terraforming-mars`
- Current fork parent/source: `terraforming-mars/terraforming-mars`

Commands used:

```sh
gh api repos/abaudhuin/terraforming-mars
gh api repos/terraforming-mars/terraforming-mars
gh api --paginate 'repos/terraforming-mars/terraforming-mars/forks?per_page=100&sort=oldest'
gh api 'repos/terraforming-mars/terraforming-mars/compare/main...OWNER:BRANCH'
gh api 'repos/OWNER/REPO/branches?per_page=100'
gh api 'repos/OWNER/REPO/commits?sha=BRANCH&per_page=N'
```

The all-fork scan did two things:

1. Ranked all accessible forks by stars and recency.
2. Scanned branch names across the fork network for UI-related terms such as
   `ui`, `ux`, `design`, `style`, `theme`, `color`, `mobile`, `responsive`,
   `vue`, `card`, `topbar`, `sidebar`, `tabs`, `language`, `title`, and
   `variant`.

The branch scan found 208 forks with at least one UI-ish branch name. Many of
those are repeated old branches copied across forks, especially
`UI-PF-tracks`, `card-selection-animation`, `vue3`, `sfc-more-cards-again`,
and `tabs-for-cards`. The most useful signal came from starred forks, explicit
UI-revamp repository names, and recent branches with small, inspectable diffs.

Two forks from the list returned 404 while scanning branches, likely because
the fork listing contains stale or inaccessible repositories.

## Fork Network Summary

Of the 420 accessible forks:

| Star count | Forks |
| --- | ---: |
| 0 | 400 |
| 1 | 15 |
| 2 | 1 |
| 3 | 2 |
| 5 or more | 2 |

The network is very broad but shallow. Only 20 accessible forks had any stars,
and only a smaller subset showed meaningful UI work.

## Most Popular Forks

| Fork | Stars | Default branch | Last push | UI/UX relevance |
| --- | ---: | --- | --- | --- |
| [nwai90/terraforming-mars](https://github.com/nwai90/terraforming-mars) | 9 | `ux_improvements` | 2025-12-05 | Has `ux_improvements` and `flat_ui` branches. Relevant by name, but highly divergent and mixed with content/game changes. |
| [Gugatec/terraforming-mars_deuteranopia-colors](https://github.com/Gugatec/terraforming-mars_deuteranopia-colors) | 5 | `main` | 2026-05-31 | Focused color-accessibility fork. Small and recent. |
| [wjcxymy/my-terraforming-mars](https://github.com/wjcxymy/my-terraforming-mars) | 3 | `diy-dev` | 2025-10-08 | Custom expansion/localization fork with meaningful client-side UX additions. |
| [ssimeonoff/terraforming-mars](https://github.com/ssimeonoff/terraforming-mars) | 3 | `master` | 2020-03-31 | Old `UI-overhaul` and `UI-changes` branches. Mostly historical design reference. |
| [jaingw/terraforming-mars](https://github.com/jaingw/terraforming-mars) | 2 | `master` | 2026-03-17 | Large custom/localized fork; not clearly a UI remake. |
| [kberg/terraforming-mars](https://github.com/kberg/terraforming-mars) | 1 | `main` | 2026-06-28 | Main branch matched upstream in compare; branches include small UI experiments. |
| [TarunTheo13/terraforming-mars](https://github.com/TarunTheo13/terraforming-mars) | 1 | `main` | 2026-06-19 | Branches include page-title, language selector, and card rendering work. |
| [puuj/terraforming-mars](https://github.com/puuj/terraforming-mars) | 1 | `main` | 2026-06-18 | Older branches include `colorized-topbar`, `tabs-for-cards`, and `sidebar`. |
| [pmic0/terraforming-mars](https://github.com/pmic0/terraforming-mars) | 1 | `tfm-as` | 2025-12-16 | Small style/client changes mixed with game variant work. |

## High-Value UI Findings

### 1. Deuteranopia Color Fork

Fork: [Gugatec/terraforming-mars_deuteranopia-colors](https://github.com/Gugatec/terraforming-mars_deuteranopia-colors)

Compared branch: `main`

Diff summary versus upstream `main`:

- Status: diverged
- Ahead by: 3 commits
- Behind by: 144 commits
- Changed files: 10
- UI files: `assets/board_icons.png`, `assets/colony_ship.png`,
  `src/styles/variables.less`

Why it matters:

- This is the cleanest UI-related fork because it has a small blast radius.
- It is explicitly about deuteranopia colors, so it is directly relevant to a
  redesigned color system and player-color accessibility.
- The useful part is probably not the exact asset replacement, but the idea of
  keeping player and board colors centralized in `variables.less`.

Recommendation:

- Treat this as an accessibility research input.
- Pull the palette decisions into any future design-token work, but do not
  merge the fork wholesale.

### 2. `nwai90` UX Branches

Fork: [nwai90/terraforming-mars](https://github.com/nwai90/terraforming-mars)

Relevant branches:

- `ux_improvements`
- `flat_ui`

`ux_improvements` compare summary:

- Status: diverged
- Ahead by: 1563 commits
- Behind by: 6674 commits
- Compare API listed the maximum 300 files, including 194 asset files.
- Recent commit subjects include game/content fixes such as new maps, Prelude 2
  cards, colony behavior, and bot/automa changes.

`flat_ui` compare summary:

- Status: diverged
- Ahead by: 82 commits
- Behind by: 10106 commits
- Changed files: 246
- UI-ish files: 170 assets and 9 style files
- Recent commit subjects were mostly colony/content work, not a modern UI
  redesign.

Why it matters:

- This is the most popular fork and has UI-meaningful branch names.
- The branches are old and very far behind current upstream.
- The useful parts are likely visual styling/assets and historical UX ideas,
  not merge-ready implementation.

Recommendation:

- Inspect visually only if you want inspiration.
- Do not use it as a base for a remake.
- Cherry-pick concepts manually after comparing screenshots or running the old
  branch locally in isolation.

### 3. `wjcxymy` Custom UX Enhancements

Fork: [wjcxymy/my-terraforming-mars](https://github.com/wjcxymy/my-terraforming-mars)

Compared branch: `diy-dev`

Diff summary:

- Status: diverged
- Ahead by: 256 commits
- Behind by: 1027 commits
- Compare API listed the maximum 300 files.
- UI/client files in the first 300: 26 client files, 4 style files, 39 assets.

Notable UI-related files:

- `src/client/components/TMEnhancement.ts`
- `src/client/components/PlayerHome.vue`
- `src/client/components/PreferencesDialog.vue`
- `src/client/components/SelectInitialCards.vue`
- `src/client/components/card/Card.vue`
- `src/client/components/create/CreateGameForm.vue`
- `src/client/components/overview/PlayerInfo.vue`
- `src/client/components/overview/PlayerStatus.vue`
- `src/client/components/overview/PlayerTimer.vue`

Notable commit subjects:

- Integrates `TMEnhancement` and adds a preferences switch for "quick actions".
- Adds countdown timer display for a custom Escape Velocity mode.
- Optimizes Moon expansion corporation UI.

Why it matters:

- This is one of the few forks with substantive client behavior changes rather
  than only CSS.
- It shows a direction for optional UX helpers, quick actions, and timer display.
- It is entangled with localization, custom expansions, rebalance work, and new
  cards.

Recommendation:

- Mine this fork for ideas around optional quick-action overlays and player
  timer UX.
- Avoid direct merge. The implementation is likely too coupled to custom game
  variants.

### 4. Explicit UI Revamp Fork

Fork: [Hietamaki/terraforming-mars-ui-revamp](https://github.com/Hietamaki/terraforming-mars-ui-revamp)

Relevant branch: `ui-upgrade`

Diff summary:

- Status: diverged
- Ahead by: 5 commits
- Behind by: 3113 commits
- Changed files: 8
- UI files:
  - `src/client/components/PlayerHome.vue`
  - `src/client/components/SelectAction.vue`
  - `src/client/utils/PreferencesManager.ts`
  - `src/styles/log.less`
  - `src/styles/player_home.less`
  - `src/styles/preferences.less`

Notable commit subjects:

- Move log next to map, add action bar.
- Add collapse to actions bar.
- Turn actions into dialog paradigm.
- Add `SelectAction`.

Why it matters:

- This is the clearest prior attempt at changing the main game layout and action
  interaction model.
- It directly touches `PlayerHome`, action selection, and log placement, which
  are core remake concerns.
- It is from 2023 and far behind current upstream.

Recommendation:

- This is worth a focused manual read before designing the new play screen.
- The "action bar plus dialog paradigm" should be evaluated as a possible
  direction for reducing the current long-page action area.

### 5. Action Menu V2 And Quick Play

Fork: [jellebosscher/terraforming-mars-kersy](https://github.com/jellebosscher/terraforming-mars-kersy)

Relevant branches:

- `feature/action-menu-v2-and-quick-play`
- `feature/instant-card-play`

Diff summary for `feature/action-menu-v2-and-quick-play`:

- Status: diverged
- Ahead by: 35 commits
- Behind by: 430 commits
- Changed files: 96
- Client files: 14
- Style files: 2
- Server files: 48

Notable commit subject:

- Adds Action menu v2 and Quick play cards features.

The commit text describes:

- `accordion_actions`: two-column action rows on the left, selected content on
  the right, drag-to-reorder rows.
- `fast_ui`: overlay buttons on selected cards for "Quick pay", "Choose how to
  play", and direct "Play card" when possible.
- Preferences toggles for "Action menu v2" and "Quick play cards".

Why it matters:

- This is recent and directly targets repeated player actions.
- It is probably more relevant to UX than older visual-only branches.
- It is mixed with balance and variant changes, so extraction will require care.

Recommendation:

- Treat this as the most actionable interaction-design research after
  `Hietamaki/ui-upgrade`.
- Review the input/payment/card-play flow before remaking action UX.

### 6. Small Recent Interaction Branches

Fork: [dcep93/terraforming-mars](https://github.com/dcep93/terraforming-mars)

Relevant branches:

- `dcep93/mobileCardSelect`
- `dcep93/topBarInlineFlex`
- `dcep93/sortableCards`
- `dcep93/fixDragCard`

Diff summaries:

- `mobileCardSelect`: 11 commits ahead, 1 client file:
  `src/client/components/SelectCard.vue`.
- `topBarInlineFlex`: 2 commits ahead, 1 style file:
  `src/styles/player_home.less`.

Why it matters:

- These are small, focused branches around mobile card selection, drag behavior,
  and top bar layout.
- They are not a remake, but they point at pain points in the current UI.

Recommendation:

- Use these as bug/pain-point evidence for mobile and card-selection workflows.

### 7. Card List, Titles, And Language UX

Fork: [TarunTheo13/terraforming-mars](https://github.com/TarunTheo13/terraforming-mars)

Relevant branches:

- `add-page-title-for-cards-list`
- `build-effect-action-corp-box-and-add-missing-corp-boxes`

Diff summary for `add-page-title-for-cards-list`:

- Ahead by: 4 commits
- Changed files: 5 client files
- Files:
  - `src/client/components/GameEnd.vue`
  - `src/client/components/PlayerHome.vue`
  - `src/client/components/WaitingFor.vue`
  - `src/client/components/cardlist/CardList.vue`
  - `src/client/components/create/CreateGameForm.vue`

Notable commit subjects from the fork also include:

- Add language selector to cards page and wrap filter widgets.
- Add scroll-to-top widget to cards page.
- Measure card titles, milestone names, and award names to fit.

Why it matters:

- These are polish-level improvements for page identity, navigation, language
  selection, and text fitting.
- Text fitting is important because this app supports many locales and long card
  names.

Recommendation:

- A remake should include a deliberate typography and overflow strategy rather
  than relying on per-language CSS hacks.

### 8. Pathfinders Track UI

Fork: [EthanDobbs/terraforming-mars](https://github.com/EthanDobbs/terraforming-mars)

Relevant branch: `UI-PF-tracks`

Diff summary:

- Ahead by: 6 commits
- Changed files: 6
- UI files:
  - `src/client/components/PlayerHome.vue`
  - `src/client/components/pathfinders/PlanetaryTrack.vue`
  - `src/client/components/pathfinders/PlanetaryTracks.vue`
  - `src/client/components/pathfinders/Reward.vue`
  - `src/styles/pathfinders.less`

Notable commit subjects:

- Initial rework.
- Make rewards smaller.
- Colorize the right side of the planetary tracks.

Why it matters:

- This is a focused redesign of a complex expansion widget.
- Similar `UI-PF-tracks` branches appear across many forks, suggesting it was a
  shared experiment or frequently copied branch.

Recommendation:

- Use this as a case study for expansion-specific widget redesign, not as a
  whole-app direction.

### 9. Historical UI Tweaks

Fork: [FreeLikeGNU/terraforming-mars](https://github.com/FreeLikeGNU/terraforming-mars)

Relevant branches:

- `ui-tweaks`
- `magnify-cards-on-hover`
- `magnify-card-descriptions-on-hover`
- `player-name-style`

Notable commit subjects:

- UI color tweaks.
- Layout changes, more compact.
- Magnify cards on hover.
- Added names and colors to overview and game home.

Why it matters:

- These are old, but they identify persistent UX requests: compactness,
  hover-to-inspect cards, and clearer player identity.

Recommendation:

- Treat as historical evidence of user pain, not implementation guidance.

### 10. Old CSS Overhaul

Fork: [ssimeonoff/terraforming-mars](https://github.com/ssimeonoff/terraforming-mars)

Relevant branch: `UI-overhaul`

Diff summary:

- Ahead by: 17 commits
- Behind by: 11800 commits
- Changed files: 20
- UI files:
  - 4 assets
  - 10 style files
  - `src/styles/board.less`
  - `src/styles/cards.less`
  - `src/styles/colonies.less`
  - `src/styles/common.less`
  - `src/styles/globs.less`
  - `src/styles/player_home.less`
  - `src/styles/resources.less`

Why it matters:

- It appears to be a visual CSS pass from a much older architecture.
- It is too far behind current upstream to be practical.

Recommendation:

- Only inspect if you want screenshots or historical visual alternatives.

## Overall Assessment

Some UI/UX work has already happened, but there is no obvious fork that already
contains a modern, complete, current UI remake.

The most useful prior work falls into four categories:

1. Accessibility and palette work:
   [Gugatec/terraforming-mars_deuteranopia-colors](https://github.com/Gugatec/terraforming-mars_deuteranopia-colors)
2. Main play-screen/action interaction experiments:
   [Hietamaki/terraforming-mars-ui-revamp](https://github.com/Hietamaki/terraforming-mars-ui-revamp)
   and
   [jellebosscher/terraforming-mars-kersy](https://github.com/jellebosscher/terraforming-mars-kersy)
3. Focused widget/card/list polish:
   [TarunTheo13/terraforming-mars](https://github.com/TarunTheo13/terraforming-mars),
   [dcep93/terraforming-mars](https://github.com/dcep93/terraforming-mars),
   and
   [EthanDobbs/terraforming-mars](https://github.com/EthanDobbs/terraforming-mars)
4. Historical visual styling experiments:
   [nwai90/terraforming-mars](https://github.com/nwai90/terraforming-mars),
   [ssimeonoff/terraforming-mars](https://github.com/ssimeonoff/terraforming-mars),
   [FreeLikeGNU/terraforming-mars](https://github.com/FreeLikeGNU/terraforming-mars),
   and older `puuj` branches.

## Recommended Next Steps

1. Before designing the new UI, inspect these branches manually:
   - `Hietamaki/terraforming-mars-ui-revamp:ui-upgrade`
   - `jellebosscher/terraforming-mars-kersy:feature/action-menu-v2-and-quick-play`
   - `Gugatec/terraforming-mars_deuteranopia-colors:main`
   - `dcep93/terraforming-mars:dcep93/mobileCardSelect`
   - `EthanDobbs/terraforming-mars:UI-PF-tracks`

2. Use the forks as research, not as a base. Most interesting work is either
   old, highly divergent, or mixed with game rules and custom content.

3. Prioritize design questions that recur across forks:
   - How should actions be surfaced when it is your turn?
   - How should a player play a card quickly while still handling all payment
     edge cases?
   - How should card text, long translated names, and dense iconography fit?
   - How should mobile card selection work?
   - How should player colors remain distinguishable for color-vision
     deficiencies?
   - Should log, map, action prompt, and hand be simultaneous regions instead
     of vertical sections?

4. Preserve the server-authoritative game logic boundary. Forks that attempt UX
   improvements still work by rendering `PlayerViewModel`, submitting
   `InputResponse`, and receiving a fresh model. A full UI remake should keep
   that contract unless there is a deliberate API redesign.
