# UX Redesign Reset: Player Table Direction

Date: 2026-06-30

This is a fresh design-only reset after the failed experimental shell. No UI
implementation is proposed here as code. The purpose of this document is to
rebuild the direction from the player's point of view and set sharper
acceptance criteria before another prototype exists.

Companion document:

- `docs/ux-information-architecture.md` maps gameplay information by player
  importance, persistence, and relationship to actions.

## What Went Wrong In The Prototype

The last prototype made a category error: it treated the game as a dashboard.
Terraforming Mars is not primarily a dashboard. It is a board state with
physical game objects, visual shorthand, and player habits. Flattening those
objects into generic text panels made the UI less playable, not more.

Specific failures to carry forward as constraints:

- Resource icons were removed or reduced to text. That is wrong. The icons for
  MC, steel, titanium, plants, energy, heat, cards, TR, oceans, oxygen,
  temperature, Venus, delegates, colonies, tags, and module resources are part
  of player literacy.
- The map was made one panel among several. That is wrong. The map and its
  adjacent module boards are the table. Other UI should orbit the table.
- Several regions scrolled internally. That is wrong except for true lists such
  as card lists and full log history.
- Modules were separated from map context. That loses information, especially
  for Venus, Turmoil, Colonies, Moon, Ares, Underworld, and Pathfinders.
- Played cards were demoted. That is wrong because played cards are the
  player's engine, action inventory, and identity.
- The log remained a small afterthought. That is wrong because the log is how
  players understand what changed and why.
- The design was not tested deeply enough against real action flows. Rendering
  a page is not the same as playing the game.

## Current UI Evidence

Visual checks were run at 1920x1080 with the current UI restored and the
experimental flag forced off.

Captured states:

- Official expansion Gen 2 action state:
  `/tmp/tm-current-redesign-reset-16x9/01-officialGen2-viewport.png`
- All-module Prelude state:
  `/tmp/tm-current-redesign-reset-16x9/03-allModulesPrelude-viewport.png`

Measured problems in the all-module Prelude state:

- Page height: 4890px.
- Horizontal overflow: yes, about 2089px scroll width on a 1920px viewport.
- Action prompt starts around y=2640px.
- Player overview starts around y=1979px and overflows right.
- Log starts around y=2346px.
- Hand starts around y=3238px.
- Colonies start around y=4115px.

Measured problems in the official Gen 2 state:

- Page height: 3210px.
- Action prompt starts around y=1822px even when it only says it is not your
  turn.
- Log starts around y=1528px.
- Colonies start around y=2435px.

This confirms the main issue: the existing app already has meaningful visual
game objects, but it stacks them into a long document. The redesign should
preserve the iconographic/game-object language and change the spatial model.

## External UX Pattern References

These are not visual directions to copy directly. They are interaction
patterns that help solve the specific Terraforming Mars problems.

- Progressive disclosure: defer secondary/advanced options so the primary task
  stays readable. This is useful for extension actions, card details, and
  module subchoices.
  https://www.nngroup.com/articles/progressive-disclosure/
- Bottom sheets/trays: anchored bottom surfaces can hold contextual controls or
  details while preserving the main canvas. This maps well to hand, tableau,
  and action preparation.
  https://www.nngroup.com/articles/bottom-sheet/
  https://m3.material.io/components/bottom-sheets/overview
- Side sheets/inspectors: secondary detail can live on an edge without taking
  over the main object. This maps well to log detail, selected card detail,
  selected player detail, and module inspection.
  https://m3.material.io/components/side-sheets/guidelines
  https://developer.apple.com/design/human-interface-guidelines/panels
- Action sheets: a contextual action surface should present choices related to
  the thing the player initiated. This is useful after choosing a card, space,
  colony, party, or module.
  https://developer.apple.com/design/human-interface-guidelines/action-sheets
- Command bars/toolbars: frequently used actions related to the current view
  should be grouped logically and can use icon buttons. This helps replace the
  current radio-list action menu for common turn actions.
  https://fluent2.microsoft.design/components/web/react/core/toolbar/usage
- Command palettes: searchable command launchers are useful for expert speed,
  but they should not be the primary action UI because they hide discoverable
  game state.
  https://solomon.io/designing-command-palettes/

The combined lesson: use visible command groups for normal play, contextual
trays/sheets for the selected task, inspectors for details, and progressive
disclosure for extension depth. Do not use one generic nested form for
everything.

## North Star

Make the screen feel like sitting at a digital Terraforming Mars table.

The player should be able to answer these questions without scrolling the main
screen:

1. What is the global board state?
2. Is it my turn?
3. What exact decision is required now?
4. Which game objects does that decision touch?
5. What engine/cards do I and other players have in play?
6. What changed recently?
7. Where can I inspect full details?

## Hard Rules

### Preserve Game Iconography

Resource icons are not decoration. They are language.

Guidelines:

- Use the existing resource and tag icon assets wherever possible.
- Resource summaries must be icon-first with numeric values, not text-first.
- Production should remain paired with resource amount using familiar visual
  treatment, for example amount large and production small/adjacent.
- Cards, tags, delegates, colonies, fleets, TR, VP, and global parameters must
  keep their existing symbolic identity.
- Text labels can supplement icons, but should not replace them in normal play.

### Do Not Scroll The Table

The main 16:9 play surface should not require body scrolling.

Allowed scroll:

- Card list surfaces.
- Full log/history surfaces.
- Search/filter result lists.
- Rule/help/reference lists.

Disallowed scroll:

- Nested dashboard panels for core state.
- A map panel with its own scrollbars during normal play.
- Action panels that hide primary choices below an internal scroll unless the
  content is explicitly a card/list chooser.
- Module boards hidden in a scroll stack.

If something does not fit, the design should use modes, overlays, drawers,
pagination, zoom, or detail inspection instead of stacking.

### Map Is The Center

The Mars map remains the center of gravity. Module boards and action overlays
should attach to it, not compete with it.

Guidelines:

- Mars stays visible by default in almost every game state.
- Select-space actions happen directly on the map with legal-space overlays.
- Global parameter tracks remain attached visually to the map or its immediate
  frame.
- Module boards open around the map as table leaves, overlays, or anchored
  trays.
- The player should never feel that switching to a module means losing the
  main board context.

### Played Cards Are Core State

Played cards are not secondary decoration. They are the engine.

Guidelines:

- Current player's tableau should be visible in compressed form on the main
  surface.
- Active blue-card actions should be discoverable directly from the tableau.
- Opponent played cards should be visible as compact stacks or strips by
  player, with one-click inspection.
- Corporation, CEO, Prelude, active, automated, and event cards need distinct
  grouping.
- Card detail can open as an overlay, but the table should still show where
  the card came from.

### Log Is A Timeline Tool

The log should explain table changes, not just archive text.

Guidelines:

- Keep the existing server log data and the useful typed chips for players,
  cards, spaces, colonies, and resources.
- Preserve clickable log entries that highlight board spaces.
- Always show a compact "recent changes" strip.
- Full log opens as a list drawer or overlay, because full history is a true
  list and may scroll.
- Add modes:
  - Chronological.
  - By player.
  - By generation.
  - By module.
  - Only changes affecting me.
- Aggregate repetitive events while allowing expansion:
  "Module Red: played Jenson-Boyle & Co, gained 2 corruption, kept 0 cards."

## Proposed 16:9 Table Model

Think in layers, not stacked blocks.

### Layer 1: Permanent Table

Always visible:

- Mars map at center-left/center.
- Global parameter frame attached to the map.
- Top resource/status HUD for the current player using icons.
- Small player seats around the table edge.
- Current phase/generation/first-player indicator.
- Recent change strip.

The permanent table should fit in 1920x1080 without body scroll.

### Layer 2: Contextual Action Overlay

When a player must act, an action overlay opens near the object being acted on:

- Selecting a space: overlay near/over the map, legal spaces highlighted.
- Selecting a colony: colony tray opens near the map edge, trade/build options
  shown beside it.
- Sending a delegate: Turmoil board opens as the active surface.
- Playing a card: hand/tableau tray opens at bottom, payment preview beside the
  selected card.
- Choosing Prelude/CEO/corporation: starting package tray opens at bottom or
  right, with step progress.
- Passing: small confirmation near the action menu, with next player preview.

The overlay should not be a generic form. It should be a game-specific task
surface.

### Layer 3: Inspection Overlays

Inspection is voluntary and can cover more screen area:

- Full hand browser.
- Full tableau browser.
- Full player detail.
- Full log timeline.
- Full module board.
- Card detail.

These can use list scrolling where appropriate. They should be easy to close
and should preserve the player's place.

## Revised Screen Layout Sketch

For 1920x1080 desktop:

```text
+----------------------------------------------------------------------------+
| icon resource HUD | phase/gen | global indicators | compact player seats    |
+---------------+----------------------------------------------+-------------+
| module rail   |                                              | recent log  |
| icons only    |                Mars table                    | action hint |
| opens boards  |       + attached global/module layers        | inspector   |
|               |                                              |             |
+---------------+----------------------------------------------+-------------+
| default-open player tray: actions | hand | current tableau | opponent cards |
+----------------------------------------------------------------------------+
```

Important details:

- The map is not inside a decorative card. It is the surface.
- The left module rail should use meaningful module icons, not text buttons.
- The bottom player tray is default-open. This is where actions, hand, and
  played cards live. It may reduce the vertical space of the map, but it keeps
  the player engine visible.
- Card strips inside the tray may scroll horizontally because they are true
  lists. The tray itself should not become a nested vertical scroll region.
- Player seats show enough engine information to inspect opponents without
  opening a huge overview by default.

## Bottom Player Tray

The first redesign sketch underweighted the hand and played cards. That is not
acceptable. A Terraforming Mars player spends most of the game reading their
hand, engine, and opponents' engines.

The bottom tray should be part of the default play surface, not a hidden
secondary view.

### Tray Purpose

The tray answers:

- What can I do right now?
- What cards do I have?
- What engine have I built?
- What engines have other players built?
- What details do I need before confirming?

### Tray Regions

At 1920x1080, the default tray can reserve roughly the lower 30-38% of the
screen. The Mars table shifts upward but stays visible.

Recommended regions:

- Action launcher: visible when it is your turn; compact when waiting.
- Hand strip: playable/selected cards first, with full hand browser available.
- Current tableau strip: corporation, CEO, active cards, automated/prelude
  stack, event archive.
- Opponent engine summaries: compact player strips with played-card category
  counts, corporation, active-card count, and resource-bearing-card badges.
- Detail inspector: selected card/action/payment preview, either in the tray
  or as a side sheet.

### Tray Modes

The tray should not be a stack of panels. It should have modes:

- Turn mode: action launcher plus relevant hand/tableau cards.
- Hand mode: full hand as a horizontal list or paged grid.
- Tableau mode: current player's played cards.
- Opponent mode: selected opponent's played cards.
- Log-linked mode: cards/spaces mentioned by a log entry.

Only the card list area may scroll. Mode changes should be explicit through
tabs, segmented controls, or icon buttons.

### Default Visibility

Default-open should mean:

- Current player's corporation/CEO and active-card row are visible.
- Hand count and first playable cards are visible.
- Opponent engine summaries are visible.
- Full hand/tableau are one action away.

This avoids the old problem where played cards and hand exist thousands of
pixels below the board.

### Desktop Tray Layout Direction

The tray should not be a single "cards area". It should be the player's desk.
For the 16:9 desktop target, the best starting layout is:

```text
+----------------------------------------------------------------------------+
| action board  | hand strip / picker                         | detail rail   |
| turn choices  | played-card strip / selected player engine   | preview/log   |
+----------------------------------------------------------------------------+
```

Guidelines:

- The action board should sit on the left or near-left of the tray because it
  is the beginning-of-turn control surface.
- The hand and tableau should occupy the widest part of the tray because cards
  require reading, comparison, and muscle memory.
- The detail rail should show selected-card text, payment preview, disabled
  reasons, or the log event currently being inspected.
- When the player is choosing a map space, the tray should stay visible but
  compress the card strip if needed. The map receives the main focus.
- When the player opens the full hand/tableau, that is a list overlay. It may
  scroll. Returning from it should preserve the previous action context.

### Tray State Rules

The tray needs state discipline:

- Waiting for other player: action board collapses to turn status and recent
  pending effects; hand/tableau stay available for planning.
- Start of own turn: action board expands by default and shows all legal top
  level actions.
- During action composition: selected action remains pinned, and the card/map/
  module object being selected gets focus.
- After submission: tray returns to planning mode and the recent log marks the
  resolved action.

This makes the tray useful even when it is not the player's turn. Planning is
part of the game, not a secondary admin task.

## Resource HUD Direction

Use the current top bar as the starting language, but reorganize it.

Required items:

- MC, steel, titanium, plants, energy, heat with current amount and production.
- TR and VP.
- Cards in hand/deck/discard where relevant.
- Tags/resources summary available through a toggle or hover/inspection.
- Phase/generation/first-player marker.

Do not replace the icon tiles with text chips. If space is tight, compress the
tile, not the symbol.

## Module Direction

Modules should be table layers.

### Venus

- Venus track remains attached to global parameters.
- Venus actions highlight the Venus track, not a separate menu.

### Colonies

- Colony tray opens as a horizontal table leaf.
- Trade/build actions show ships, cost, target colony, and resulting income in
  one view.
- Colony list may scroll horizontally only if many colonies exist; otherwise it
  should page or fit.

### Turmoil

- Turmoil board opens as an anchored political table leaf.
- Delegate actions highlight legal parties.
- Global events are visible as near/far/current cards, not buried in a module
  panel.

### Moon

- Moon board opens as a secondary map leaf, ideally bottom-left or as a swap
  overlay that keeps Mars visible in miniature.
- Moon global rates remain icon/track based.

### Ares And Underworld

- Ares hazards and Underworld tokens should be map layers, not separate
  informational blocks.
- Layer toggles should live on the map frame.

### Pathfinders And Delta Project

- Planetary tracks and Delta Project should open as compact track overlays.
- They should be near the bottom or side of the table, not below the whole
  board stack.

## Modular Extension Surface System

The redesign must be modular before it is beautiful. Every expansion should
declare where it appears, what actions it adds, and how it is inspected.

The goal is not to make every module equally prominent. The goal is to make the
prominence match the player's decision at that moment.

### Surface Slots

Use these insertion points instead of letting modules create arbitrary stacked
sections:

- Global HUD slot: persistent tracks, global parameters, generation/phase, and
  module-wide counters.
- Map layer slot: overlays attached directly to Mars spaces, such as hazards,
  underground tokens, adjacency markers, and legal-space highlights.
- Module rail slot: compact icon buttons that open a module board or toggle a
  module layer.
- Table leaf slot: a board-like module surface attached around Mars, such as
  Colonies, Turmoil, Moon, Venus, Pathfinders, or Delta Project.
- Bottom tray slot: card-based or player-engine content, including hand,
  tableau, blue actions, setup choices, and module card pools.
- Action command slot: top-level or contextual actions contributed by modules.
- Inspector slot: selected object details, disabled reasons, payment previews,
  and confirm/cancel controls.
- Full overlay slot: large card lists, full log, full tableau, and full module
  board views.
- Log category slot: module-filtered activity in the recent strip and full
  timeline.

If a module cannot identify its slot, that is a design failure to resolve
before implementation.

### Module Placement Matrix

| Module or expansion | Default surface | Action surface | Inspection surface |
| --- | --- | --- | --- |
| Corporate Era / Promo / Community / Star Wars card sets | Card pools only | Hand and play-card flows | Card detail and tableau |
| Prelude / Prelude 2 | Setup card tray and played Prelude stack | Setup stepper | Card detail |
| CEO | Setup card tray and player engine strip | Setup stepper or CEO action group | Card detail and engine strip |
| Venus Next | Global parameter/HUD track | Terraform and Venus action group | Track inspector |
| Colonies | Table leaf near map edge | Trade/build colony command group | Colony board/full overlay |
| Turmoil | Political table leaf | Delegate, party, policy, event command group | Turmoil inspector/full overlay |
| Moon | Secondary board leaf or compact mini-map | Moon build/rate command group | Moon board/full overlay |
| Ares | Mars map layer | Hazard-aware map actions | Map layer inspector |
| Underworld | Mars token layer | Token claim/inspect action group | Token inspector/log link |
| Pathfinders | Track table leaf | Track advancement/bonus command group | Track inspector |
| Delta Project | Compact track table leaf | Step selection command group | Track inspector |

### Variant Placement Notes

Some repository options are variants rather than full board modules. They still
need slots:

- Political Agendas: Turmoil table leaf, policy/event rows, and Turmoil log
  category.
- Ares Extreme: Ares map layer with stronger hazard warnings and inspector
  copy.
- Solar Phase: phase/global HUD slot plus a temporary action command group when
  the phase requires choices.
- Moon standard project variants: same Standard project/Moon command group,
  with variant costs and legality surfaced on the tile.
- Draft variants: setup/research card tray with pick/pass state and player
  ownership shown.
- Modular milestones and awards: milestone/award command group plus a full
  inspection overlay when the set is dense.
- Escape Velocity and timers: compact top HUD/player-seat timing indicators,
  never a central table panel.

### Module Contract

Each module should provide the UI shell with:

- A module icon and compact status indicator.
- The surface slot it owns.
- The `PlayerInputModel.type` values it contributes to or modifies.
- Its top-level action group, if any.
- Its map layers, if any.
- Its log category and related object IDs.
- A fallback full overlay for dense inspection.

This keeps expansion depth without letting the screen turn back into a long
document.

## Action Flow Guidelines

Every server `PlayerInputModel` should map to a player-meaningful surface, but
the UI should not expose the model tree as the interaction design. The current
radio list is bad because it asks the player to parse implementation structure
before they understand their game choices.

The replacement should be a turn command board in the bottom tray.

### Core Action Model

Use a four-stage interaction:

1. Choose intent.
2. Choose object.
3. Review consequences.
4. Confirm.

The player should always know which stage they are in. The server can still
receive the same typed `InputResponse`; the client just presents a better path
to compose that response.

### Turn Command Board

At the beginning of the player's turn, the left side of the bottom tray should
show all top-level legal action families as command tiles. This replaces radio
buttons.

Core command families:

- Play card.
- Use blue action.
- Standard project / terraform.
- Convert plants or heat.
- Claim milestone.
- Fund award.
- Module action.
- Pass.

Each command tile should show:

- A meaningful icon or game symbol.
- Title in player language, not server language.
- Cost or main resource icon when relevant.
- Availability state.
- Disabled reason when unavailable.
- A one-line next step, such as "Choose a card", "Choose a space", or "Choose a
  colony".
- A small count when useful, such as playable cards, unused blue actions, legal
  standard projects, available colonies, or fundable awards.

Unavailable actions may remain visible when they teach the player why they
cannot act. Hide only actions that do not exist in the enabled game, such as
Colony actions when Colonies is disabled.

### Why Command Tiles Instead Of Radio Buttons

Radio buttons imply a small mutually exclusive form choice. Terraforming Mars
turn actions are not that. They are different task launchers with different
objects, costs, and board effects.

Command tiles or compact action cards are better because they can carry:

- Iconography.
- Cost and affordability.
- Counts.
- Disabled explanations.
- Preview of the next required object.
- Module identity.

This is also how the UI can support expansions without hiding them in nested
generic options.

### Action Surfaces By Input Type

Map `PlayerInputModel.type` to surfaces like this:

| Input type | Primary surface | UX direction |
| --- | --- | --- |
| `or` | Command board or action sheet | Show as grouped player intents, not raw nested choices. |
| `and` | Step checklist or combined review | Show required sub-decisions with completion state. |
| `initialCards` | Setup stepper | Corporation, preludes, CEO, project purchase, review. |
| `option` | Confirm command | Use for final commit or simple one-click action. |
| `projectCard` | Hand strip/full hand picker plus payment ledger | Play-card flow with requirement warnings and resource icons. |
| `card` | Card picker | Used for research, blue actions, discards, special effects. |
| `payment` | Ledger | Cost, discounts, steel/titanium/special resources, remaining resources. |
| `space` | Mars map | Legal spaces highlighted on the board itself. |
| `colony` | Colony table leaf | Select colony from the colony surface, not a text list. |
| `delegate` / `party` | Turmoil table leaf | Select party/delegate from the political board. |
| `player` | Player seats | Select opponent/self from seats or compact player cards. |
| `amount` | Stepper/slider/input | Use icons and min/max, defaulting as the model specifies. |
| `productionToLose` | Resource ledger | Show production tracks with loss preview. |
| `aresGlobalParameters` | Global parameter track | Show track shifts on the parameter surface. |
| `globalEvent` | Turmoil event row | Choose from visible event cards. |
| `resource` / `resources` | Resource picker | Icon-first resource selection. |
| `claimedUndergroundToken` | Underworld map layer/inspector | Select tokens from the map/token surface. |
| `deltaProject` | Delta track surface | Select valid step on the track. |

This table should guide component boundaries. It is acceptable for one server
input to appear in several player surfaces, but the player should never need to
know the raw type name.

### Play Card Flow

When the player chooses Play card:

- The hand strip filters or sorts playable cards first.
- Cards show cost, tags, requirements, and affordability using existing visual
  language.
- Disabled cards remain inspectable with a precise reason.
- Selecting a card opens the detail rail with requirement status and payment
  preview.
- Confirming moves to payment only when payment matters.
- If the card requires a space, colony, player, resource, or other target, that
  object surface becomes active before final confirmation.

The hand should not disappear during this flow. The player often compares the
chosen card against alternatives.

### Blue Action Flow

Blue actions deserve their own command family because they are recurring
engine actions, not generic card selections.

Guidelines:

- Surface unused blue actions at the front of the current tableau strip.
- Show used/unavailable blue actions in the tableau with clear spent state.
- The Blue action command tile should show the count of available actions.
- Selecting it filters the tableau strip to actionable blue cards.
- If the card needs targets or resources, route to the relevant map/module/
  resource surface.

This ties action selection to the player's engine, which is where players
expect it to live.

### Standard Project And Terraform Flow

Standard projects should be an icon grid or command cluster, not a text menu.

Each standard project tile should show:

- Project icon.
- MC cost.
- Immediate global parameter or board effect.
- Legal/illegal state.
- Disabled reason or missing resource.

For actions like greenery, city, ocean, asteroid, Venus, Moon, or module-added
terraforming, selecting the tile should activate the affected board or track.
The map/track becomes the input; the tray becomes the preview and confirmation
surface.

### Module Action Flow

Module actions should be grouped by module but launched from the same command
board. The command family can expand into module cards such as:

- Colonies: trade, build colony.
- Turmoil: send delegate, pay delegate, party/policy/event choices.
- Moon: build road, mine, colony, advance lunar rates.
- Venus: raise Venus or Venus-specific project effects.
- Pathfinders: advance track or take track reward.
- Delta Project: choose valid step.
- Ares: hazard-aware placement or global parameter shifts.
- Underworld: inspect/claim underground tokens.

Selecting a module action opens that module's table leaf or layer. It should
not open a nested generic submenu floating away from the relevant board.

### Pass Flow

Pass is important and dangerous. It should be visible, but visually separated
from productive actions.

Guidelines:

- Keep Pass on the command board, usually at the lower end or separated by a
  divider.
- Show what passing means: remaining actions are skipped, next active player,
  and generation/phase consequence if known.
- Confirm pass through a compact confirmation state, especially when playable
  actions remain.

### Initial Setup Flow

Do not stack all starting content vertically.

Use a setup stepper in the bottom tray/full overlay:

1. Corporation.
2. Preludes.
3. CEO, if enabled.
4. Project card purchase.
5. Review and start.

Each step shows:

- Required count.
- Selected count.
- Remaining money after choices.
- Relevant board/module context.
- Card list as the only scrollable region if needed.

The review step should show the player's initial engine strip before the game
starts, so the transition into the main table is understandable.

### Research Flow

Research is a card purchase task, so it belongs in the card tray.

Show drawn cards as a bottom card list with:

- Cost icon.
- Affordability.
- Buy/skip total.
- Remaining MC.
- Tags and requirement warnings.
- A stable confirm area showing the final purchase set.

### Payment Flow

Payment is a ledger, not a form.

Show:

- Card/action cost.
- Discounts.
- Steel/titanium and special resource contributions using icons.
- Reserved units when relevant.
- Remaining resources.
- Confirm/cancel.

Payment controls should use steppers or icon counters. The player should see
the impact before sending the response.

### Select Space Flow

The map is the input.

- Legal spaces glow.
- Illegal spaces remain visible but are not clickable.
- Hover/focus shows bonuses and constraints.
- Selected space is previewed in the action overlay.
- Confirm is stable and close to the selected object or in the detail rail.
- Related module layers stay visible when they matter, such as Ares hazards or
  Underworld tokens.

## Played Card Direction

Use two levels:

### Always Visible Engine Strip

Current player:

- Corporation and CEO fixed at the left of the strip.
- Active cards visible first because they create actions.
- Automated/Prelude stack next.
- Events as a compact count/archive.
- Resource-bearing cards receive badges.

Opponents:

- Each player seat shows compact played-card categories and engine signals:
  active action count, tags, notable resources, corporation.
- Clicking a player opens their tableau overlay.

### Full Tableau Overlay

The full tableau can scroll because it is a card list.

Features:

- Filter by card type.
- Filter by tag.
- Show active actions available/used.
- Show cards with resources.
- Show recent played cards first option.

## Log Direction

The new log should use the current `LogPanel` data model but change the
presentation.

### Recent Changes Strip

Always visible, small, non-scrolling:

- Last 3 to 5 meaningful events.
- Group repeated same-player events.
- Use player/card/resource/space chips.
- Clicking an event opens the full log and highlights related board objects.

### Full Timeline Overlay

This is a list, so it may scroll.

Modes:

- Chronological.
- By player.
- By generation.
- By module.
- Affects me.

Example grouped view:

```text
Generation 1
Module Red
  - Played Jenson-Boyle & Co.
  - Gained 2 corruption.
  - Kept 0 project cards.

Module Green
  - Played Splice.
  - Gained 2 MC twice from Splice.

System / Turmoil
  - Greens are in power.
  - Microgravity Health Problems is distant.
```

The full log should preserve:

- Generation tabs.
- Card chips.
- Player chips.
- Space-click highlighting.
- Timestamps on demand.

## Design Testing Before Coding

Before another prototype is implemented, test the design as a clickable
wireframe or static state board. The test should use real game objects from the
current app: real cards, real resource icons, real module surfaces, real player
colors, and real log entries.

### Required Test States

Test at least these 16:9 states:

- All-module initial setup with corporation, Prelude, CEO, and project-card
  purchase.
- Beginning of turn with all major action families visible.
- Play-card flow with an affordable card, an unaffordable card, and a card that
  needs a map target.
- Blue action flow from the player's current tableau.
- Standard project/terraform flow that activates Mars.
- Colonies trade/build action.
- Turmoil delegate or party action.
- Moon or Delta track action.
- Ares or Underworld map-layer action.
- Research buy/skip.
- Pass with other legal actions still available.
- Full hand inspection.
- Full current-player tableau inspection.
- Opponent tableau inspection.
- Full log opened from a recent event and linked back to a board object.

### What To Observe

For each state, answer:

- Can the player see the map?
- Can the player see their hand or at least the hand entry point?
- Can the player see their played engine?
- Can the player identify the required decision?
- Can the player identify legal choices without reading a nested menu?
- Does the relevant module appear near the game object it affects?
- Is the confirm action stable and unambiguous?
- Is any scroll present only because the content is a true list?
- Does the log explain what just happened and link back to affected objects?

If a wireframe fails these questions, do not implement it.

## Validation Before Any Prototype Is Accepted

No future UI prototype should be considered acceptable until it passes these
checks at 1920x1080.

### Visual Checks

- No body scroll in the normal play surface.
- No horizontal overflow.
- Resource icons visible in the HUD.
- Mars map visible in normal action states.
- Start-of-turn command board visible when it is the player's turn.
- Top-level actions visible as player intents, not server radio buttons.
- Disabled actions explain why they are disabled.
- Payment/resource previews preserve icons.
- Current player played cards visible.
- Current player hand visible or directly available in the default tray.
- Opponent played-card summaries visible.
- Recent log visible.
- Full log reachable.
- Module controls visible but not text-heavy.
- Module controls attach to a defined surface slot.

### Play Checks

Run real flows, not static screenshots:

- Base game setup into Gen 2.
- Official modules: Venus, Colonies, Prelude, Prelude 2, Turmoil.
- All repo modules enabled.
- Initial setup with corporation, Prelude, CEO, and project purchase.
- Research buy/skip.
- Pass for generation.
- World Government Terraforming.
- Start-of-turn action selection with all enabled modules.
- Play a card requiring payment and a board target.
- Select Mars space.
- Select colony / trade.
- Send delegate in Turmoil.
- Use a blue-card action.
- Open full log and highlight a space from a log entry.
- Inspect another player's played cards.

### Failure Criteria

Reject the prototype if:

- A primary action starts below the first viewport.
- A core panel scrolls internally when it is not a list.
- Resource icons are replaced with plain labels.
- Modules require losing map context.
- The player cannot see played cards without leaving the main table.
- The player cannot begin a turn without parsing raw radio choices.
- The player cannot inspect hand/tableau while planning an action.
- The log is only a passive text box.

## Next Design Step

Before coding again, produce static wireframes for three real states:

1. All-module initial setup.
2. Gen 2 action phase with official modules.
3. A select-space action with log highlight and played-card context visible.

Each wireframe should use real game objects from the current UI: resource
icons, card art, module boards, player colors, and log chips. Placeholder
dashboard boxes are not acceptable for this project.
