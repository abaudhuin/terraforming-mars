# Current UI Roast And Prioritized Critique

Date: 2026-07-03

Scope: 16:9 desktop only.

This document is a critique pass, not an implementation plan. It uses the local
visual scenario lab to inspect the current redesigned UI across setup, active
turns, waiting turns, card play/payment, player inspection, extensions, and
endgame.

The short version: the UI is much closer to a playable table than the original
scrolling document, but it is still not a coherent game cockpit. It has several
good pieces - centered Mars board, persistent player rail, action list,
activity rail, card/log/player overlays - but they do not yet behave like one
player-centered decision system. Some screens are strong, some are from an
older app, and some are visibly stitched together.

## Evidence Base

Visual scenario batch:

- Output: `/tmp/tm-roast-visuals-all`
- Viewport: `1600x900`
- Scenarios: all built-in scenario presets from `scripts/visual-scenarios.mjs`
- Screenshots captured: `283`
- Skipped screenshots: `0`
- Page errors: `0`
- Console errors: `0`
- Coverage tags: `140`

Review method:

- Generated a full all-scenario batch with `TM_SCENARIOS=all`.
- Built one contact sheet per scenario in `/tmp/tm-roast-contact-sheets`.
- Visually reviewed all 15 contact sheets, covering all 283 screenshots.
- Opened individual screenshots for states where the contact sheet showed a
  likely issue, including card search/no-results, Turmoil, Moon, Delta,
  Underworld, board variants, five-player density, setup, and endgame.
- Ran a second detail pass with magnified crop sheets in
  `/tmp/tm-roast-detail-sheets`, covering action icons, player rail, top
  chrome, payment rows, card browser controls, milestones/awards, module
  panels, setup sticky headers, and endgame.

Full scenario coverage:

| Scenario | Screenshots |
| --- | ---: |
| `base-action-core` | 18 |
| `ux-turn-modes` | 13 |
| `ux-panel-mechanics` | 24 |
| `ux-cards-filter-matrix` | 15 |
| `primary-heavy-4p` | 41 |
| `module-heavy-4p-no-turmoil` | 33 |
| `primary-heavy-4p-with-turmoil` | 34 |
| `base-2p-action` | 18 |
| `base-5p-rail` | 9 |
| `colonies-venus-pathfinders-3p` | 22 |
| `turmoil-moon-underworld-3p` | 14 |
| `moon-underworld-delta` | 14 |
| `five-player-density` | 11 |
| `board-variants-ma` | 9 |
| `endgame-all-scoring` | 8 |

Representative screenshots used for this critique:

- `base-action-core-1600x900-post-setup-table-active.png`
- `base-action-core-1600x900-post-setup-table-waiting.png`
- `base-action-core-1600x900-post-setup-action-play-card-payment.png`
- `base-action-core-1600x900-post-setup-action-fund-award.png`
- `base-action-core-1600x900-post-setup-action-standard-projects.png`
- `base-action-core-1600x900-post-setup-milestones-awards-open.png`
- `base-action-core-1600x900-setup-initial.png`
- `base-action-core-1600x900-setup-corporation-selected.png`
- `base-action-core-1600x900-setup-scroll-bottom.png`
- `ux-turn-modes-1600x900-post-setup-action-pass-selected.png`
- `ux-cards-filter-matrix-1600x900-post-setup-cards-search-no-results.png`
- `ux-panel-mechanics-1600x900-post-setup-overlay-cards.png`
- `ux-panel-mechanics-1600x900-post-setup-overlay-player-opponent.png`
- `ux-panel-mechanics-1600x900-post-setup-resized-layout.png`
- `primary-heavy-4p-1600x900-post-setup-colonies-open.png`
- `primary-heavy-4p-1600x900-post-setup-pathfinders-open.png`
- `primary-heavy-4p-1600x900-post-setup-overlay-log.png`
- `primary-heavy-4p-with-turmoil-1600x900-post-setup-turmoil-open.png`
- `moon-underworld-delta-1600x900-post-setup-delta-open.png`
- `moon-underworld-delta-1600x900-post-setup-moon-open.png`
- `moon-underworld-delta-1600x900-post-setup-underworld-open.png`
- `board-variants-ma-1600x900-post-setup-milestones-awards-open.png`
- `five-player-density-1600x900-post-setup-table-active.png`
- `endgame-all-scoring-1600x900-post-setup-endgame-results.png`
- `endgame-all-scoring-1600x900-post-setup-endgame-vp-details.png`
- `endgame-all-scoring-1600x900-post-setup-endgame-final-board.png`

## Priority Scale

- `P0`: Blocks confidence or playability. Fix before calling the UI broadly
  usable.
- `P1`: Serious friction. Players can play, but the UI works against them.
- `P2`: Important polish or cohesion. It makes the app feel unfinished or
  harder to learn.
- `P3`: Future improvement or low-frequency concern.

## Information Model

Terraforming Mars is not primarily a dashboard. It is a sequence of decisions
around a shared board, a private hand, a public engine, and visible races. A
good UI needs to answer different questions depending on the moment:

- What is happening now?
- Is it my turn, and how many actions do I have left?
- What are my legal choices?
- What resources, cards, board spaces, and opponents are affected by this
  choice?
- What changed since I last looked?
- What are opponents racing toward?
- What details can I inspect without losing my place?

### Information Depth Levels

Use these levels consistently across the UI.

| Level | Purpose | Example UI |
| --- | --- | --- |
| `L0 Ambient` | Small always-visible signal. | Active turn chip, hand count, passed status, module presence. |
| `L1 Compact` | Persistent scan data for normal play. | Player rail row, resource strip, recent activity summary. |
| `L2 Task` | Full detail needed to complete the current decision. | Action workbench, payment allocator, legal space picker. |
| `L3 Inspect` | Temporary deep view for planning or curiosity. | Player dossier, full cards overlay, full milestones/awards. |
| `L4 Reference` | Long history, rules, charts, admin. | Full log, endgame charts, settings, rule help. |

The current UI often jumps from `L1` directly to overloaded `L3`, or leaves a
selected action stuck in a half-formed `L2`. That is the core UX problem.

### Information Categories

| Information | When the player wants it | Importance | Needed level | Related information | Best surface |
| --- | --- | --- | --- | --- | --- |
| Turn ownership and phase | Constantly, especially after refresh or while waiting. | `P0` | `L0-L1` | Action slots, active player, passed status, generation. | Thin top status plus player rail emphasis. |
| Own resources | Every action and planning moment. | `P0` | `L1`, `L2` during payment | Production, discounts, hand affordability, standard projects. | Current-player rail row plus payment/action workbench. |
| Own production | Planning, production phase, card valuation, award races. | `P0` | `L1-L2` | Resource amounts, TR, awards, engine cards. | Current-player rail, dossier detail. |
| TR and VP | Strategic scan, milestone/award timing, endgame planning. | `P1` | `L1-L3` | Global parameter changes, awards, cards, cities/greeneries. | Player rail compact, player dossier, endgame report. |
| Hand | Planning, active turn, waiting turn, research/setup, play-card action. | `P0` | `L1 count`, `L2/L3 card list` | Resources, tags, requirements, payment, board targets. | Bottom planning tray and full card browser. |
| Played cards / engine | Always for self, often for opponents. | `P0` | `L1 summary`, `L2 active cards`, `L3 full tableau` | Blue actions, card resources, tags, discounts, VP, log. | Bottom tray for self, player dossier for opponents. |
| Action choices | Start of own turn and after first action. | `P0` | `L2` | Hand, board, milestones, extensions, resources. | Action workbench, not only a list. |
| Pending input | Any selected action or forced choice. | `P0` | `L2` | Legal options, disabled reasons, confirm/cancel. | Main action workbench with one clear next step. |
| Payment allocation | Playing cards and paid actions. | `P0` | `L2` | Selected card/action, discounts, resources, remaining totals. | Integrated payment workbench next to selected object. |
| Mars board | Constantly. | `P0` | `L1-L2` | Global parameters, tile bonuses, legal spaces, cities, oceans, awards. | Center of table. |
| Global parameters | Constantly and during terraforming/card requirements. | `P0` | `L1-L2` | Board, TR, card requirements, Venus/Moon/Ares tracks. | Attached to board. |
| Legal spaces and placement rules | Space-selecting actions. | `P0` | `L2` | Selected card/project, placement bonuses, owners, oceans/cities. | Directly on board with a local inspector. |
| Recent changes | Waiting, after actions, after refresh, learning the game. | `P0` | `L1-L2` | Log, affected player, affected card, affected board space. | Activity rail plus post-action digest. |
| Full game log | Audit, catch-up, dispute, learning, player filtering. | `P1` | `L3-L4` | Generation, player, card, board space, module. | Full overlay with filters and aggregation. |
| Opponent compact state | Always, especially races and attack targeting. | `P0` | `L1` | Resources, production, tags, passed/active status, hand count. | Player rail. |
| Opponent tags | Card requirements, awards, attacks, tempo evaluation. | `P1` | `L1 summary`, `L3 full` | Played cards, resources, awards, corporations. | Quick expansion and player dossier. |
| Opponent tableau | Planning, checking engines, VP, card actions, tag count. | `P1` | `L3` | Tags, card resources, log filtered by player. | Player dossier. |
| Milestones and awards | Every turn in midgame, while claiming/funding, endgame scoring. | `P0-P1` | `L1 summary`, `L2` during action, `L3` full standings | Player stats, board, tags, VP. | Board-adjacent summary plus full standings overlay. |
| Colonies | When trade/build action exists, when evaluating economy, card effects. | `P1` | `L1 presence`, `L2` during trade/build, `L3` inspect | Fleets, resources, trade income, colony ownership. | Board leaf tied to action workbench. |
| Venus | Card requirements, global progress, Venus actions, endgame. | `P1` | `L1-L2` | Global parameters, TR, awards, cards. | Attached board track and action detail. |
| Turmoil | Delegate actions, policy effects, global events, influence. | `P1` | `L1-L3` | Player influence, parties, upcoming event, log. | Module panel near board, expanded only when relevant. |
| Moon | Moon placement/rates and final board inspection. | `P1` | `L1-L3` | Mars board, Moon rates, cards, scoring. | Board leaf or full board overlay. |
| Ares / Underworld | Space selection and token/hazard decisions. | `P1` | `L2-L3` | Mars spaces, bonuses, hazards, log. | Map-integrated overlays. |
| Pathfinders / Delta | Track decisions and resource steps. | `P1` | `L2-L3` | Selected action/card, player progress, track bonuses. | Docked track panel with clear viewport bounds. |
| Setup choices | Setup phase, drafting, choosing corp/preludes/cards. | `P0` | `L2-L3` | Starting money, corporation, project card cost, game board/settings. | Drafting table, not a scrolling page. |
| Disabled reasons and warnings | Whenever an action/card/space is not legal or risky. | `P0` | `L2` | Requirements, resources, tags, board state. | Inline in task surface with concise explanations. |
| Undo / reset / tools | After action, admin, mistakes. | `P2` | `L0-L4` | Recent action, game settings. | Low-emphasis toolbar/menu, not table foreground. |
| Endgame scoring | Game end and retrospective analysis. | `P1` | `L3-L4` | Board, cards, awards, milestones, charts, player table. | Dedicated scoring report that still matches game UI language. |

## State-by-State Information Priorities

### Setup

Primary question: "What am I choosing, what does it cost, and can I start?"

`P0` information:

- Corporation choices and selected corporation.
- Initial project cards and selected card count.
- Starting money after selected cards.
- Required missing choices.
- Start/ready status.

`P1` information:

- Board/game variant information.
- Milestones and awards for this board.
- Opponent readiness.
- Draft/prelude/CEO choices when enabled.

Current critique:

- Setup is still a scrollable page, not a drafting workspace.
- The sticky summary covers the cards while scrolling.
- The same warning appears in multiple places.
- Board details are at the bottom as an afterthought, even though milestones,
  awards, maps, and variants affect corporation/card choices.

### Active Turn, No Action Selected

Primary question: "What can I do now?"

`P0` information:

- Legal action families.
- Action count remaining.
- Own resources, production, hand count, active card count.
- Board/global state.
- Recent changes from the previous action.

`P1` information:

- Milestone/award races.
- Opponent compact state.
- Extension entry points that matter this turn.

Current critique:

- The left action list is promising, but it is still mostly a launcher.
- Some labels are implementation-ish and not written as player intent.
- The top bar repeats turn/player information without adding action clarity.

### Active Turn, Action Selected

Primary question: "What exact object, target, or amount do I choose next?"

`P0` information:

- Selected action name and stage.
- Legal options and disabled reasons.
- Consequences and costs.
- Confirm/cancel in the same decision area.
- Relevant board/card/module state.

Current critique:

- Some actions get a rich workbench, while others leave a huge empty panel.
- Claim/fund/standard-project/pass do not share one consistent action grammar.
- The UI should not make every action feel like a custom minigame.

### Card Play And Payment

Primary question: "Can I play this card, how should I pay, and what happens?"

`P0` information:

- Selected card.
- Cost after discounts and extra costs.
- Allowed payment resources.
- Current resource availability.
- Remaining total.
- Required targets or follow-up choices.
- Confirm button and disabled reason if blocked.

`P1` information:

- Tags and requirements.
- Resulting production/resource/global changes.
- Related engine discounts or effects.

Current critique:

- The current payment panel is cleaner than earlier versions, but it still
  lives as a payment widget beside cards rather than a full "play this card"
  story.
- Cards, payment, and consequences are visually separate.
- Plus/minus/max controls are consistent enough to use, but their style is not
  fully aligned with the rest of the table.

### Space Selection

Primary question: "Where can I place this, and why?"

`P0` information:

- Legal spaces.
- Selected action/card.
- Placement bonuses and restrictions.
- Confirm/undo/cancel.

`P1` information:

- Neighbor ownership.
- Ocean/city/greenery constraints.
- Ares/Underworld/Moon overlays when enabled.

Current critique:

- The board stays centered, which is good.
- Hover/space detail is not visible enough in captured board-hover evidence.
- Placement context should feel attached to the selected action, not only to
  the board.

### Waiting / Not My Turn

Primary question: "What happened, and how do I prepare?"

`P0` information:

- Who is active.
- What they just did or are deciding.
- Recent changes.
- Own hand and engine for planning.

`P1` information:

- Opponent passed status.
- Current board/module state.
- Likely milestones/awards affected by recent changes.

Current critique:

- The not-my-turn state is better than an empty action form, but it still feels
  like the action panel has gone dead.
- The hand and played-card tray can show cropped cards and footer overlap.
- There is no strong "while you were waiting" digest.

### Player Inspection

Primary question: "What does this player have, and why should I care?"

`P0` information:

- Player identity, corporation, active/passed status.
- Resources and production.
- Tags.
- Played cards.

`P1` information:

- VP/card resources.
- Player-filtered log.
- Module-specific status.

Current critique:

- The full dossier is useful, but it uses space unevenly.
- The resource/tag line can become a long strip with hidden overflow.
- The activity area can be a giant empty box.
- Card rows prioritize card art over scanability.

### Milestones And Awards

Primary question: "Can I claim/fund, and who is winning?"

`P0` information:

- Claimable/fundable status.
- Current player qualification.
- Funded/claimed ownership.
- Standings by player.

`P1` information:

- Costs and VP impact.
- Related stats/tags/cards/board control.

Current critique:

- The board-adjacent compact panel is directionally right.
- The selected action surface is not trustworthy enough. In captured evidence,
  the fund-award action presents a row that reads like a milestone option.
- Scores and player-color chips are not self-explanatory enough.

### Extension Modules

Primary question: "How does this module affect my current choice?"

`P0` information:

- Module-specific legal targets during an action.
- Current module state when relevant.
- Costs, ownership, and track/space outcomes.

`P1` information:

- Full module inspection for planning.
- Module event/history in the log.

Current critique:

- The modules are visible, but they feel pasted over the map.
- Pathfinders/track panels can clip and fight the right activity rail.
- Colonies opens as a visual carousel without enough navigation context.
- Extension UI needs a docking system, not one-off overlay placement.

### Endgame

Primary question: "Who won, where did the points come from, and can I audit it?"

`P0` information:

- Winner.
- Final totals by player.
- VP breakdown by category.
- Final board.
- Player card-scoring details.

`P1` information:

- Charts by generation.
- Module scoring details.
- Final log.

Current critique:

- Endgame is functional but visually from another product.
- It abandons the cockpit style and returns to an older web report.
- The chart and details pages are useful but not organized as a final-game
  review experience.

## UI Visual Roast

These are visual, layout, style, and polish problems. They are not primarily
about game logic or interaction flow.

### P0: Multiple Visual Systems Are Fighting Each Other

Evidence:

- Main table screenshots use the new dark cockpit style.
- Setup still uses older page/form styling.
- Endgame uses a gray report layout.
- The log, cards, old close buttons, yellow action buttons, gray chips,
  purple buttons, player-color slabs, and card art all keep their own visual
  dialects.

Roast:

The UI looks like several UIs negotiated a ceasefire and agreed to share a
screen. The player should feel one table language from setup to final scoring.
Right now, the app changes costumes by feature.

Impact:

- Reduces trust.
- Makes controls less learnable.
- Makes new panels feel bolted on even when they are functionally useful.

### P0: Card Scale And Cropping Are Still Unstable

Evidence:

- `base-action-core-1600x900-post-setup-table-waiting.png`
- `ux-panel-mechanics-1600x900-post-setup-overlay-cards.png`
- `ux-panel-mechanics-1600x900-post-setup-overlay-player-opponent.png`
- `primary-heavy-4p-1600x900-post-setup-cards-search-no-results.png`

Problems:

- Bottom tray card strips crop cards vertically.
- Full overlays use large art-first cards, then hide overflow horizontally.
- Some card rows end with half-visible cards and no strong scroll affordance.
- Card detail is readable only when cards are huge, but huge cards waste too
  much decision space.
- Search/filter states look visually too similar in the scenario matrix. The
  no-results capture still shows a full set of cards, so either the scenario
  action did not apply or the UI does not make the active search/filter state
  visible enough to trust.

Roast:

Cards are the main language of the game, and the UI treats them like posters
that occasionally fit inside their frames. A card should either be a readable
card or a deliberate compact token. Half a card is neither.

### P0: Extension Panels Clip And Collide

Evidence:

- `primary-heavy-4p-1600x900-post-setup-colonies-open.png`
- `primary-heavy-4p-1600x900-post-setup-pathfinders-open.png`
- `primary-heavy-4p-with-turmoil-1600x900-post-setup-turmoil-open.png`
- `moon-underworld-delta-1600x900-post-setup-delta-open.png`
- `moon-underworld-delta-1600x900-post-setup-moon-open.png`
- `moon-underworld-delta-1600x900-post-setup-underworld-open.png`

Problems:

- Pathfinders/tracks panel is visually clipped by surrounding rails and does
  not respect the table frame.
- Colonies appears as a horizontal carousel with cards cut off at the edges.
- Module panels obscure the board without clearly entering a focused module
  mode.
- Turmoil, Moon, Delta, and Underworld all use different visual masses but are
  placed through the same loose overlay idea.
- Moon behaves like a second board and deserves board-level framing; Delta is a
  track selector; Turmoil is a political control panel; Underworld is partly a
  board layer and partly buried in the tools panel. The current visual language
  does not communicate those differences.
- Several module screenshots show an unrelated selected action still active in
  the bottom workbench while the module panel dominates the center.

Roast:

The extension panels currently enter the screen like furniture carried through
the wrong doorway. They are visible, but the room was not designed for them.

### P0: Player Rail Compression Creates Visual Noise

Evidence:

- `five-player-density-1600x900-post-setup-table-active.png`
- `ux-panel-mechanics-1600x900-post-setup-resized-layout.png`
- `base-action-core-1600x900-post-setup-table-active.png`

Problems:

- Resource values, production values, icons, status, hand count, and timers
  are packed into very small horizontal cells.
- In 4-5 player states the rows technically fit but feel crammed.
- The eye button, active/next badge, and timer compete for attention.
- The player-color background is strong enough that it competes with the
  resource icons.

Roast:

The player rail is trying to be a scoreboard, inventory, timer, tag summary,
and button strip all at once. It is compact, but it is compact in the way a
suitcase is compact after someone sits on it.

### P0: The Bottom Tray Has Dead Space And Clipped Content

Evidence:

- `ux-turn-modes-1600x900-post-setup-action-pass-selected.png`
- `base-action-core-1600x900-post-setup-table-waiting.png`

Problems:

- Some actions leave a large empty workbench.
- Waiting mode shows useful hand/played-card content, but the cards can be cut
  off by the tray height.
- Footer/legal text and the tools button can overlap or visually intrude near
  bottom content.

Roast:

The tray sometimes behaves like a stage after the actor left: lots of room,
little purpose, and a few props clipped by the curtain.

### P0: Setup Is Visually Still A Long Form

Evidence:

- `base-action-core-1600x900-setup-initial.png`
- `base-action-core-1600x900-setup-corporation-selected.png`
- `base-action-core-1600x900-setup-scroll-bottom.png`

Problems:

- Sticky setup summary covers cards during scroll.
- Warning text is repeated.
- Huge empty right side while meaningful content is stacked vertically.
- Start button is visually detached from the incomplete choices.
- Board/game details are below the fold.

Roast:

Setup is supposed to feel like drafting your corporation and opening hand. It
currently feels like filling out a form while card art leaks under a sticky
header.

### P1: Top Chrome Is Over-Specified And Under-Useful

Evidence:

- Main table active and waiting screenshots.

Problems:

- `YOUR TURN`, player name, generation, next player, top navigation, and action
  slots compete for the same thin strip.
- Some information is duplicated by the player rail.
- The center of the top bar can be nearly empty in one state and contain action
  slot text in another.

Roast:

The top bar is expensive real estate used for a few labels that mostly repeat
things the table already knows how to say.

### P1: Button And Icon Styling Is Incoherent

Evidence:

- Main table buttons, cards overlay, player dossier, setup, endgame.

Problems:

- Close buttons vary between old `X`, gray square, and other styles.
- Eye buttons, expand buttons, tools, board/cards/players buttons, and action
  buttons do not share one visual grammar.
- Some things that are buttons look like labels; some labels look clickable.
- Hover/focus affordances are not visually obvious in screenshots.

Roast:

The interface has buttons from several neighborhoods. Players should not have
to guess which district a control came from to know whether it clicks.

### P1: Activity Log Typography Is Too Wall-Like

Evidence:

- Main activity rail and full log overlay screenshots.

Problems:

- Compact activity text is large enough to crowd but not structured enough to
  scan.
- Repetitive entries create a dense paragraph block.
- Full log overlay has massive empty space but almost no stronger hierarchy
  than the compact rail.

Roast:

The activity log is where table memory should live. Visually, it is still a
receipt.

### P1: Milestones And Awards Are Visually Promising But Not Settled

Evidence:

- `base-action-core-1600x900-post-setup-milestones-awards-open.png`

Problems:

- The panel placement over the board is reasonable, but it still feels like an
  inserted old component.
- Player score chips are tiny and unexplained.
- The panel has a heavy top band and old icon cards that do not fully match
  the new cockpit.

Roast:

This is one of the better ideas, but it needs to graduate from "old component
in a glass box" to a proper race panel.

### P1: Full Overlays Do Not Use Space Deliberately

Evidence:

- Cards overlay, player overlay, log overlay.

Problems:

- Card overlays use horizontal card rows that overflow instead of a clearly
  controlled browser grid/list.
- Player dossier leaves a giant empty activity rectangle in some states.
- The full log overlay is readable but too sparse for the amount of space it
  takes.

Roast:

The overlays are large enough to be powerful, but many behave like small
widgets placed inside a big dark box.

### P2: Background, Borders, And Shadows Add Visual Static

Problems:

- The starry background texture shows through most containers.
- Nested borders stack around table regions, panels, cards, and overlays.
- Strong glows and shadows around selected cards can fight card art.

Impact:

- The UI reads busier than the amount of actual information requires.
- Important highlights have to compete with decorative contrast.

### P2: Endgame Visuals Are Disconnected

Evidence:

- `endgame-all-scoring-1600x900-post-setup-endgame-results.png`
- `endgame-all-scoring-1600x900-post-setup-endgame-vp-details.png`
- `endgame-all-scoring-1600x900-post-setup-endgame-final-board.png`

Problems:

- Endgame uses a different background, typography, table style, and spacing.
- Useful final board and scoring details are presented as a report page, not a
  final table review.
- Charts and player breakdowns feel visually plain compared with the game
  cockpit.

## Detail Pass Addendum

This section records small defects and hidden detail problems found after
magnifying repeated UI zones. These are smaller than the main architectural
issues, but they matter because they make the interface feel unfinished and
less trustworthy.

### Visual Detail Defects

#### P0: Action Icons Are Not A Coherent Icon System

Evidence:

- `/tmp/tm-roast-detail-sheets/action-list-detail.jpg`
- `/tmp/tm-roast-detail-sheets/icon-button-microscopy.jpg`

Problems:

- `Trade with a colony tile` uses a tall white line icon that feels imported
  from another icon set. It nearly touches the icon frame, reads vertically
  cramped, and does not match the colored, chunky resource/action assets.
- The pass icon is a nearly black horizontal mark inside a black square. It is
  technically there but visually close to invisible.
- The red arrow CEO/action icon is also off-family compared with the resource
  icons and looks more like a debug/control symbol than a board-game object.
- The same generic white hand/card icon is reused for multiple unrelated
  actions, including `Play project card`, standard-project-like actions, and
  several generic action-card entries.
- Icon centering is inconsistent: some icons sit optically high, some are too
  small, and the colony icon is too tall.

Why this matters:

The action list is the main "what can I do?" surface. Icons should help the
player distinguish action families at a glance. Right now several icons either
do not communicate their action or actively feel like placeholders.

#### P0: Action Labels Are Too Often Truncated Before Meaning

Evidence:

- `/tmp/tm-roast-detail-sheets/action-list-detail.jpg`

Problems:

- `Convert 8 plants into...`
- `Convert 8 heat into t...`
- `Perform an action fr...`
- `Pass for this generati...`
- `Use CEO once per g...`
- `Pay 10 MC to draw 3 ...`

The list is compact, but it frequently cuts the meaningful part of the action.
The sublabel sometimes helps, but it is tiny and all-caps, so the player must
work harder than they should.

#### P0: Player Rail Micro-Alignment Is Still Rough

Evidence:

- `/tmp/tm-roast-detail-sheets/player-rail-detail.jpg`

Problems:

- Resource production deltas sit very low in their cells and can feel clipped
  at the bottom.
- Resource amount, production, and icon are crowded enough that values touch
  or visually overlap the icon badges in dense rows.
- The white `active` timer pill is out of theme and visually heavier than some
  actual resource state.
- The eye button sits in a tiny floating square that competes with the timer
  and does not align cleanly across rows.
- The small white handle/dot under some player rows looks accidental rather
  than like an intentional resizer or selection affordance.
- Passed/next/active states use small overlaid text that can be hard to read
  against saturated player-color backgrounds.

#### P1: Top Chrome Looks Like Controls Even When It Is Status

Evidence:

- `/tmp/tm-roast-detail-sheets/top-chrome-detail.jpg`

Problems:

- `YOUR TURN` is styled like a primary button even though it is status.
- The red player-name slab is heavier than most actual controls.
- `GEN 5` is visually weak and squeezed after the player name.
- `NEXT` is centered and bright green, drawing attention away from the current
  player/action.
- `BOARD`, `CARDS`, and `PLAYERS` use a small utility-button style that does
  not match the action buttons, overlay buttons, or setup buttons.
- The top bar uses a lot of horizontal space to say very little.

#### P1: Payment Controls Are Better But Still Visually Uneven

Evidence:

- `/tmp/tm-roast-detail-sheets/payment-workbench-detail.jpg`

Problems:

- The selected-action breadcrumb is very small relative to the decision being
  made.
- White numeric inputs are harsh against the dark table and draw more
  attention than the selected card.
- `MAX`, `+`, and `-` controls have weaker affordance than the yellow confirm
  button.
- `PLAY CARD` and `CONFIRM` are both used for paid actions, creating a small
  but unnecessary vocabulary split.
- Selected-card highlights still create a large empty gold slab below cards.
- Disabled standard-project cards can become too dim to understand quickly.
- Footer/legal text and the `TOOLS` button visually intrude near the bottom
  right of the payment/workbench area.

#### P1: Card Browser Does Not Look Like A Browser

Evidence:

- `/tmp/tm-roast-detail-sheets/card-browser-header-detail.jpg`
- `/tmp/tm-roast-detail-sheets/card-browser-rows-detail.jpg`

Problems:

- The header mostly says `HAND AND PLAYED CARDS`; it does not visibly expose
  search/filter/sort state in the area a player expects controls.
- Filter/search screenshots look almost identical at a detail level.
- The close `X` uses an old square style and does not match the newer icon
  affordances.
- Card rows end with abrupt half-cards on the right edge.
- The first row begins far below the title, leaving a dead band that feels
  like missing controls.
- `Hand` and `Played cards` labels are small compared with the visual weight
  of the cards.

#### P1: Milestone/Award Detail Is Too Tiny For A Race Surface

Evidence:

- `/tmp/tm-roast-detail-sheets/milestones-awards-detail.jpg`

Problems:

- Player score chips are tiny, unlegended, and easy to confuse with
  requirements/costs.
- Fan/variant labels abbreviate into cryptic names such as `T. Collector` and
  `A. Manufacturer`.
- Cost bars use small floating MC icons without enough textual context.
- Extra milestone/award sets can push content toward the bottom edge, making
  the panel feel cropped.
- The race panel still looks like old badge art placed into a new dark frame.

#### P1: Module Buttons Are Cramped And Inconsistent

Evidence:

- `/tmp/tm-roast-detail-sheets/module-panel-detail.jpg`
- `/tmp/tm-roast-detail-sheets/board-module-buttons-detail.jpg`

Problems:

- `COLONIES` includes a tiny subtitle, `TRADE AND BUILD TARGETS`, inside the
  button area. It is too small to read comfortably and makes the button shape
  awkward.
- `TRACKS`, `TURMOIL`, `MOON`, and `DELTA` buttons use small equal-weight
  labels even though their panels have very different importance and size.
- Module buttons sit near board tracks and the milestones button without a
  clear grouping rule.
- Tooltips for colony bonuses float in a separate visual style and can feel
  detached from the hovered object.
- Large module panels have no obvious close/focus affordance in the panel
  itself.

#### P1: Setup Sticky Content Covers The Cards

Evidence:

- `/tmp/tm-roast-detail-sheets/setup-header-detail.jpg`
- `/tmp/tm-roast-detail-sheets/setup-lower-detail.jpg`

Problems:

- During setup scroll states, card tops/bottoms are visibly hidden under the
  sticky summary.
- Orange warnings repeat in the sticky header and page content.
- `Start` is visually detached at the far right and remains in a purple style
  unlike the main table controls.
- Setup progress chips look like small form controls, not game progress.
- The right side of setup remains mostly empty while cards and game details are
  stacked vertically.
- Turn-order player labels truncate into `Scenar...`.
- Game-detail milestone/award cards are very small and visually noisy.

#### P2: Endgame Detail Is Functional But Unpolished

Evidence:

- `/tmp/tm-roast-detail-sheets/endgame-detail.jpg`

Problems:

- Scoring table headers rely heavily on icons without labels.
- Strong player-color rows reduce table readability.
- The VP chart leaves a large empty generation range after the last plotted
  point in the captured scenario.
- Final log is small relative to the space taken by module tracks above it.
- `Download game log` is a plain text link, visually disconnected from the
  rest of the report.
- Navigation buttons use old purple arrow icons and old spacing.

### UX Detail Defects

#### P0: Small Icon Problems Become Decision Problems

The colony trade action is a good example. It is not only an aesthetic issue:
when an icon is cropped, off-theme, and visually weaker than neighboring
actions, the action feels secondary or suspicious. That matters because
Colonies is a full module action, not a minor utility.

#### P0: Tools Popover Mixes Game State, Admin, And Meta State

Evidence:

- `/tmp/tm-roast-detail-sheets/icon-button-microscopy.jpg`
- `moon-underworld-delta-1600x900-post-setup-underworld-open.png`

Problems:

- The tools popover contains player/game values, spectator link, underground
  tokens, and purge warning in one stack.
- `Why?` is visually glued to the purge warning text.
- Underworld tokens appear inside this tools/meta popover even though they are
  module gameplay state.
- The popover can overlap the action workbench, making it feel like a debug
  drawer leaked into the table.

#### P1: Detail Labels Are Often Written For Components, Not Players

Examples:

- `7 ACTION CARD(S)`
- `12/13 PLAYABLE`
- `TRADE AND BUILD TARGETS`
- `CHOOSE 1-12`
- `post-filter` states with no visible explanation

These labels are precise, but they are not always the phrasing a player uses
while deciding. The UI should translate component state into player intent.

#### P1: Active/Inspect Modes Are Not Visually Exclusive

The detail pass confirms this at small scale: a module button can open a large
module panel while the bottom workbench still presents an unrelated selected
action. The more detailed the module panel becomes, the more confusing the
unrelated action confirmation below it feels.

## UX Roast

These are usability, information architecture, interaction, and decision-flow
problems. They are separate from visual polish.

### P0: The UI Does Not Always Declare One Primary Task

Evidence:

- Active turn idle: action list plus selected action plus board plus log.
- Pass selected: left action expands but the main workbench is largely empty.
- Standard projects: action detail needs scroll/space while board remains
  unchanged.

Problem:

The UI should clearly answer, "What am I doing now?" In many states it answers
"Here are several panels; decide which one matters."

Why it matters:

Terraforming Mars decisions are already complex. The UI should reduce the
number of things the player has to mentally join. When the selected action is
weakly represented, players lose confidence before confirming.

### P0: Action Grammar Is Inconsistent

Evidence:

- `action-play-card-payment` has a rich card/payment workbench.
- `action-pass-selected` leaves dead space.
- `action-fund-award` shows an option row that reads like a milestone.
- `action-standard-projects` has its own card-like project list and payment.

Problem:

Each action family currently has different rules for where the options appear,
where confirm appears, how selected state is represented, and whether the
right side is used.

Why it matters:

Players should learn one pattern:

1. Pick intent.
2. Pick object/target/amount.
3. Review cost/consequence.
4. Confirm.

The current UI teaches a different mini-pattern for each action.

### P0: Related Information Is Still Too Often Separated

Examples:

- Playing a card requires joining hand, selected card, payment, board targets,
  resource rail, and consequences.
- Claiming/funding milestones and awards requires joining the M&A panel, player
  stats, action detail, and VP impact.
- Extension actions require joining the action list with a side module board
  that may be visually independent.

Problem:

The redesign improves layout but does not always group information by player
decision.

Why it matters:

Players do not ask "which component owns this data?" They ask "what do I need
to decide this action?"

### P0: Waiting Mode Is Not Yet A Real Planning Mode

Evidence:

- `base-action-core-1600x900-post-setup-table-waiting.png`

Problem:

The waiting screen shows "Not your turn" and then exposes hand/played cards,
but it does not present a strong catch-up or planning story. It should say:

- Who is acting.
- What just changed.
- What I can prepare.
- Which of my likely next actions are now affected.

Why it matters:

In asynchronous/digital Terraforming Mars, waiting is where players read the
table and plan. A weak waiting state makes the game feel slower and more
opaque.

### P0: The Player Rail Is Dense But Not Yet Strategically Scannable

Evidence:

- 4-player and 5-player table screenshots.

Problem:

The rail includes the right categories, but it does not yet create clean
levels:

- Base compact: identity, status, core economy.
- Quick expansion: tags and race-relevant stats.
- Full dossier: cards, logs, modules, VP.

Instead, compact rows try to show too much in too little space.

Why it matters:

Opponent state is not optional. Awards, attacks, tag requirements, board
control, and tempo all depend on it.

### P0: Card Browsing Is Art-First, Not Decision-First

Evidence:

- Cards overlay and card tray screenshots.
- Card filter/search matrix screenshots across `ux-cards-filter-matrix`,
  `primary-heavy-4p`, and `colonies-venus-pathfinders-3p`.

Problem:

Large card art is useful for reading one card. It is not sufficient for
choosing among 10-20 cards. Players also need:

- Cost.
- Type.
- Tags.
- Requirements.
- Playable/affordable state.
- Warnings.
- Expected consequences.
- Sorting/filtering that remains visible and understandable.

Why it matters:

The hand is one of the core strategic surfaces. If it behaves like a horizontal
gallery, players must visually parse every card instead of scanning options.

Additional full-sweep finding:

The filter/search captures are not visually self-validating. In particular,
`cards-search-no-results` still appears to show normal card rows. Even if the
underlying fixture is the culprit, the UI has the same player-facing failure:
there is no obvious "these are the active filters, these are the results, and
this is why nothing changed" feedback loop.

### P0: Milestone/Award Action State Is Not Trustworthy Enough

Evidence:

- `base-action-core-1600x900-post-setup-action-fund-award.png`
- `base-action-core-1600x900-post-setup-milestones-awards-open.png`

Problem:

The overview panel shows relevant race data, but the action detail does not
make it clear enough which awards are legal/funded/unavailable and why. The
captured fund-award state appears to show `Terraformer`, which belongs to
milestones, not awards.

Why it matters:

Claiming/funding is a high-impact irreversible decision. The UI must be
boringly trustworthy here.

### P0: Extension Modules Lack A Shared Docking And Decision Model

Evidence:

- Colonies open.
- Pathfinders open.
- Resized all-module layout.
- Turmoil open.
- Moon open.
- Delta open.
- Underworld open.

Problem:

Extensions are currently displayed as overlays or board appendages, but not as
consistent task surfaces. They need rules:

- Where does a module live when idle?
- Where does it dock during a related action?
- How does it expand for inspection?
- How does it avoid covering unrelated task information?
- How do modules behave when several are enabled?

Why it matters:

The original scrolling UI was bad, but it had one advantage: extension content
could simply stack. The new table must replace stacking with a modular spatial
contract.

Additional full-sweep finding:

Module inspection and active actions can contradict each other. Several module
screens show a large module surface in the center while the bottom workbench is
still focused on an unrelated action such as claiming a milestone. The player
is then looking at two different UI intentions: "inspect this module" and
"confirm this unrelated action." That makes the table feel modal without
actually entering a clean mode.

### P1: The Log Records Events But Does Not Yet Explain The Turn

Evidence:

- Activity rail and full log overlay.

Problem:

The log is mostly chronological text. It does not yet offer enough player
tools:

- Group by player.
- Group by generation.
- Collapse repeated events.
- Show "changes affecting me."
- Show last-action digest.
- Link each event to affected board/card/player objects in a clear way.

Why it matters:

The log is how digital players replace table observation. It should be a
timeline tool, not just archive text.

### P1: Top Navigation Opens Silos Instead Of Contextual Views

Evidence:

- `BOARD`, `CARDS`, `PLAYERS` buttons.

Problem:

These buttons are useful escape hatches, but they can encourage mode switching
away from the current decision. A player playing a card should not need to
open a separate cards overlay to understand their current card decision.

Why it matters:

The UI should keep related info near the task, then allow deeper inspection.
Top navigation should be secondary, not the primary way to recover missing
context.

### P1: Setup Does Not Support Parallel Mental Work

Problem:

During setup, players compare corporations, starting money, initial hand,
preludes/CEOs, board milestones/awards, and game variants. The current page
forces this into a vertical scroll.

Better mental model:

- Left: requirements/progress/start readiness.
- Center: current choice set.
- Right or bottom: selected package summary and board/MA context.
- Persistent cost/start-money calculation.

Why it matters:

Setup teaches the player the game before the first turn. A poor setup surface
makes the rest of the UI feel less trustworthy.

### P1: Full Player Dossier Is Useful But Not Yet Organized Around Questions

Evidence:

- `ux-panel-mechanics-1600x900-post-setup-overlay-player-opponent.png`

Problem:

The dossier shows many relevant things, but the questions are not strongly
separated:

- What do they have right now?
- What tags/races are they threatening?
- What cards are driving their engine?
- What did they recently do?

Why it matters:

The player dossier should be the answer to "tell me about this player." It is
close, but it currently feels more like several components stacked in a modal.

### P1: Resizing Helps But Can Produce Awkward Layouts

Evidence:

- `ux-panel-mechanics-1600x900-post-setup-resized-layout.png`

Problem:

Resizing the board/log/action regions can improve the board view, but it also
creates risk of clipped logs, cramped rails, and bottom content overlap.

Why it matters:

Resizable UI is only a win if each supported size is intentionally designed.
Otherwise it lets users create broken states.

### P1: Endgame Is Not A Continuation Of The Game

Problem:

The final scoring screen should feel like the table resolving into a scoring
review. Instead, it becomes a separate report page.

Why it matters:

Endgame is the emotional payoff. It should make the result inspectable,
auditable, and connected to the board/cards/actions that produced it.

### P2: Empty States And No-Result States Need Work

Evidence:

- Dossier activity area.
- Full log overlay.
- Cards search/no-result scenario evidence.

Problem:

Some empty regions look like missing content, not intentional empty states.
Search/no-result and log-empty states should say what is absent and how to
recover.

### P2: Meta Tools And Legal Text Intrude On Game Space

Problem:

Footer/legal text and the tools button can visually compete with bottom tray
content. Admin/meta affordances should be available, but not in the path of
core play.

## Prioritized Recommendations

This is not implementation detail. It is the order of design debt that should
be addressed.

### P0 Recommendations

1. Define a single action-workbench grammar for every action.
   Every action should use the same conceptual sequence: intent, object/target,
   review, confirm. Even if the visual content changes, the player should know
   where to look.

2. Stabilize card presentation into deliberate modes.
   Use compact tokens/metadata for scanning, readable cards for inspection, and
   never show cropped half-cards as normal UI.

3. Make card browser state explicit.
   Search, filters, sort, result count, no-results, and active constraints must
   be visible enough that screenshots prove the state changed. A player should
   never wonder whether a filter did nothing or failed to apply.

4. Create a module docking contract.
   Extensions need consistent idle, task, and inspect states. Colonies,
   Pathfinders, Venus, Turmoil, Moon, Ares, and Underworld cannot each invent
   their own placement behavior.

5. Prevent conflicting center/task modes.
   If a large module, board, player, log, or card surface is open, the action
   workbench must either integrate with it or step back visually. Do not show a
   dominant module inspector and an unrelated action confirmation as equal
   active tasks.

6. Rebuild waiting as planning mode.
   The waiting player should see active player, recent meaningful changes,
   own hand/engine, and table state without a dead action panel.

7. Make milestone/award actions trustworthy.
   Claim/fund actions must clearly separate milestone from award, legal from
   unavailable, current score from threshold, and consequence from status.

8. Make player information three-tiered.
   Compact rail, quick stats/tags, full dossier. Do not force the compact rail
   to carry every detail.

### P1 Recommendations

1. Replace setup scrolling with a drafting layout.
   Setup should be a workspace for comparing choices, not a long document.

2. Upgrade the activity log into a timeline tool.
   Add grouping, filters, and a last-action digest. Keep full chronological
   history as a true list.

3. Normalize the visual system.
   Use one button system, one close/expand/icon grammar, one overlay grammar,
   and one typographic hierarchy.

4. Redesign card browser around decisions.
   Hand and tableau views need metadata, filters, sorting, and readable detail
   without becoming horizontal poster galleries.

5. Bring endgame into the same product language.
   Keep the scoring data, but present it as final table review.

### P2 Recommendations

1. Reduce decorative visual static.
   Make borders, shadows, background texture, and glows quieter so game icons
   and action highlights carry the screen.

2. Make resize states intentional.
   Define minimum and maximum sizes per region and test each supported state.

3. Improve empty/no-result states.
   Empty panels should communicate that nothing is there, not look broken.

4. Push tools/legal/admin affordances out of the play path.
   Keep them accessible but visually secondary.

## Final Roast

The current UI is no longer just a stacked page, which is real progress. But
it is still too often a collection of individually reasonable panels instead
of one intelligent table. Terraforming Mars asks players to connect resources,
cards, board spaces, opponents, races, and logs. The UI's job is to make those
connections visible at the moment they matter.

Right now, the player can usually find the information, but the UI often makes
them assemble the meaning themselves. That is the difference between a playable
interface and a good game interface.
