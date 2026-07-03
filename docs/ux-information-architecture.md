# UX Information Architecture: Player Decision Map

Date: 2026-06-30

This document maps Terraforming Mars gameplay information from the player's
point of view. It is a companion to `docs/ux-player-table-redesign.md`.

The goal is to decide what must be persistent, what should appear only during a
decision, what can be temporary inspection, and which information should be
grouped together because players use it together.

This is design analysis only. It does not propose implementation code.

## Source Evidence

Online and repository sources used for this pass:

- Base game rule flow and action list:
  https://terraformingmars.fandom.com/wiki/TM/Rulebook
- Official rulebook index maintained by this repository:
  https://github.com/terraforming-mars/terraforming-mars/wiki/Rulebooks
- Colonies rulebook:
  https://fryxgames.se/wp-content/uploads/2023/07/TM_COLONIES_ENG_RULESi.pdf
- Venus Next rulebook:
  https://fryxgames.se/wp-content/uploads/2023/07/TM_VENUS_ENG_RULESi.pdf
- Prelude rulebook:
  https://cdn.1j1ju.com/medias/6e/a5/22-terraforming-mars-prelude-rulebook.pdf
- Prelude 2 rulebook:
  https://fryxgames.se/wp-content/uploads/2024/09/TM_PRELUDE2_RULES_ENGi.pdf
- Turmoil rulebook:
  https://cdn.1j1ju.com/medias/45/35/b4-terraforming-mars-turmoil-rulebook.pdf
- The Moon wiki:
  https://github.com/terraforming-mars/terraforming-mars/wiki/The-Moon
- Ares wiki:
  https://github.com/terraforming-mars/terraforming-mars/wiki/Ares
- Pathfinders wiki:
  https://github.com/terraforming-mars/terraforming-mars/wiki/Pathfinders
- Delta Project wiki:
  https://github.com/terraforming-mars/terraforming-mars/wiki/Delta-Project
- Local client/server models:
  `src/common/models/PlayerModel.ts`,
  `src/common/models/GameModel.ts`,
  `src/common/models/PlayerInputModel.ts`,
  `src/common/logs/LogMessageData.ts`.

The important rules conclusion: during the action phase, players take one or
two actions, or pass. Those actions include playing cards, standard projects,
claiming milestones, funding awards, using active card actions, converting
plants, and converting heat. Expansions add additional board/action surfaces,
but they still fit into that player rhythm: plan, choose intent, choose target,
pay, resolve, observe consequences.

## Player Mental Model

Terraforming Mars is an engine-building board game with shared races. A player
does not think in terms of forms or server input models. A player thinks:

- Can I afford my plan?
- Which action is best now, and should I take one action or two?
- What race am I advancing: terraforming, milestones, awards, tags, board
  control, economy, or module-specific progress?
- What changed since I last looked?
- What did an opponent just do, and does it affect my plan?
- What are my playable cards and reusable actions?
- Where on the board can I place something?
- What will happen after I click confirm?

The UI should therefore organize around decisions, not around data ownership.

## Information Priority Tiers

### Tier 0: Moment-Critical

Moment-critical information is required to take the current action correctly.
If it is missing, the player cannot safely proceed.

Examples:

- It is my turn / not my turn.
- The exact pending decision.
- Legal top-level action families.
- Current action stage: choose intent, choose object, review, confirm.
- Payment cost and remaining resources.
- Legal target spaces/players/cards/colonies/parties.
- Warnings and disabled reasons.
- Confirm/cancel controls.

UI rule:

- Tier 0 must be visible in the active workbench.
- It can change with context.
- It should not require opening an overlay unless the whole task is naturally a
  list, such as choosing cards from a large hand.

### Tier 1: Always-Relevant Strategic State

Always-relevant state is used repeatedly during planning and while watching the
table. It may not be required for every click, but hiding it makes the game
feel blind.

Examples:

- Mars map and global parameters.
- Own resources and production: MC, steel, titanium, plants, energy, heat.
- Own TR and visible VP summary.
- Generation, phase, first/active player, pass status.
- Own hand count and hand entry point.
- Own played engine, especially active cards and resource-bearing cards.
- Opponent compact resources/production/TR/card counts/tags.
- Available blue action count.
- Recent log / activity feed.
- Milestone and award race status, at least as compact indicators.
- Enabled module status indicators.

UI rule:

- Tier 1 should be persistent in normal play.
- It can be compact, but it should not be buried.
- It should preserve icons and game-object identity.

### Tier 2: Contextual Strategic State

Contextual state is important when a decision touches that area. It should be
near the action when relevant, but it does not need to be always expanded.

Examples:

- Full hand during play-card/research/setup decisions.
- Full current tableau during blue-action or engine review.
- Colony board during trade/build decisions.
- Turmoil board during delegate/party/global-event decisions.
- Moon board during Moon placement/rate decisions.
- Ares/Underworld layers during map placement decisions.
- Pathfinders/Delta tracks during their action decisions.
- Full milestone/award detail while deciding whether to claim/fund.
- Tags and discounts while evaluating card play.
- Opponent resources when targeting attacks or assessing race timing.

UI rule:

- Tier 2 should open as a table leaf, tray mode, inspector, or list overlay.
- It should be one deliberate action away.
- It should remain close to the related game object.

### Tier 3: Inspect-Only And Curiosity State

Inspect-only state helps planning, learning, or curiosity, but it is not part
of the active click path most of the time.

Examples:

- Full opponent tableau.
- Opponent full VP breakdown.
- Full log history with filters.
- Card archive/discard pile/deck counts.
- Rule text/help for uncommon icons.
- Game settings/options.
- Detailed scoring projection.
- Historical charts by generation.

UI rule:

- Tier 3 can be a modal, side sheet, or full overlay.
- It can scroll if it is a true list.
- It should be easy to close and should preserve the player's current task.

### Tier 4: Meta/Admin State

Meta state is not gameplay state.

Examples:

- Preferences.
- Undo/reset controls.
- Share links.
- Save/load/admin controls.
- Spectator links.
- Bug/debug details.

UI rule:

- Tier 4 should be outside the play surface, in menus or low-emphasis chrome.
- It should never compete with the board, hand, action workbench, or log.

## The Player Turn Loop

### 1. Waiting And Observing

When it is not the player's turn, the main job is to understand what changed
and keep planning.

Critical information:

- Active player.
- Actions they took or are resolving.
- Recent log entries.
- Changes to global parameters, map, module boards, and player resources.
- Own hand and engine for planning.
- Which opponents have passed.

Best UI grouping:

- Center: Mars table remains visible.
- Top/player rail: active player and compact player economy.
- Right rail: recent activity feed with player/color/card/resource chips.
- Bottom tray: planning mode with own hand/tableau available.

Interaction implication:

- Waiting state should not be visually dead. It should be a planning state.
- The recent log matters more while waiting because it replaces table talk and
  physical observation.

### 2. Start Of Own Turn

When the player becomes active, the UI must answer: "What can I do now?"

Critical information:

- Available action count this turn.
- Legal top-level action families.
- Own resources and production.
- Hand/playable card count.
- Available blue action count.
- Convert plants/heat availability.
- Standard project affordability and legality.
- Claimable milestones/fundable awards.
- Module actions that exist in this game.
- Pass, with consequence.

Best UI grouping:

- Bottom-left: turn command board.
- Bottom-center: hand and current tableau.
- Center: map/global state.
- Right/detail: selected command explanation and disabled reasons.

Interaction implication:

- This is the strongest argument against the current radio buttons. The
  beginning of a turn is a dashboard of possibilities, but those possibilities
  are game actions, not form options.

### 3. Choosing The First Action

The player chooses one action family and then the object.

Information needed depends on the family:

| Action family | Needed immediately | Needed nearby |
| --- | --- | --- |
| Play card | Hand, cost, requirements, warnings | Resources, tags, global params, map/module target |
| Blue action | Usable active cards | Resources on cards, used state, target surface |
| Standard project | Cost and project list | Map/track legality, resource result |
| Convert plants | Plant count and legal greenery placement | Oxygen, adjacency, city scoring |
| Convert heat | Heat count | Temperature track, TR gain |
| Claim milestone | Claimable milestones | Opponent race status, tags/cities/tiles/resources |
| Fund award | Fundable awards and cost | Current standings/projection |
| Module action | Module-specific choices | Module board/layer, resource cost, log |
| Pass | Remaining opportunities | Next player/phase/generation effect |

Best UI grouping:

- The selected action pins in the action board.
- The related object surface becomes active.
- The inspector shows consequences before confirmation.

Interaction implication:

- Do not replace the whole action area with a submenu and make the player
  remember how they got there. Pin the chosen action and show the path.

### 4. Choosing A Second Action Or Ending Turn

The rule that a player may take one or two actions changes UX priority. After
the first action, the player must know whether they can or should take another.

Critical information:

- Action one has resolved.
- Resources/global state after action one.
- Remaining action allowance this turn.
- Changed legal actions.
- Recent result log.
- End turn / take another action choice.

Best UI grouping:

- Same command board, with a result strip above it.
- The log highlights the just-resolved action.
- The board or resource HUD animates/marks deltas.

Interaction implication:

- The UI should not snap back to a neutral state without explanation. The
  second-action decision needs visible feedback from the first action.

### 5. Production / Research / Setup

These are not normal action choices. They are structured phase tasks.

Research:

- Player compares drawn cards against economy, tags, requirements, and future
  plan.
- Full card list is necessary.
- Cost to keep and remaining MC must remain pinned.

Setup:

- Player compares corporations, starting money, preludes, CEOs, and initial
  project cards.
- This is a multi-step commitment task.
- Remaining money after card purchase is critical.

Production:

- Usually not a choice, but it is a major feedback moment.
- Players need to see resources produced and cards/actions reset.

Best UI grouping:

- Research/setup: card tray/full overlay with pinned economy ledger.
- Production: recent log plus resource-delta presentation.

## Object Relationship Map

### Hand Is Related To Resources, Tags, Global Parameters, And Targets

Hand cards are not just a list of cards. The player evaluates them through:

- MC and discounts.
- Steel/titanium values.
- Special resources on cards.
- Tags already in tableau.
- Global parameter requirements.
- Board placement availability.
- Opponent resources/production when red effects target players.
- Module requirements such as Venus, Moon alloy costs, colonies, or parties.

Design rule:

- The hand should be visually close to own resources and selected-card
  inspector.
- Playing a card should activate related board/module surfaces.

### Tableau Is Related To Actions, Tags, Production, And Scoring

Played cards are the player's engine.

The tableau answers:

- What recurring actions can I use?
- Which effects modify my next card/action?
- Which tags do I have?
- Which cards hold resources?
- Which cards score points later?
- What did I build recently?

Design rule:

- Current tableau cannot be inspect-only.
- Active cards and resource-bearing cards need persistent priority.
- Full tableau can be an overlay, but a meaningful engine strip must remain on
  the main surface.

### Map Is Related To Terraforming, Placement, Ownership, And Logs

The Mars map answers:

- Which spaces are legal?
- What placement bonuses are available?
- Where are oceans/cities/greeneries/special tiles?
- What adjacency scoring or restrictions matter?
- What changed from the last action?
- Which log event happened where?

Design rule:

- Map placement decisions should happen on the map.
- The log should be able to highlight spaces.
- Ares and Underworld should be layers on this map, not separate text panels.

### Player Overview Is Related To Races And Targeting

Opponents matter in two different ways:

- Fast scan: resources, production, TR, cards, tags, pass/active status.
- Deep inspection: full board, tableau, VP breakdown, recent actions.

Design rule:

- Fast scan is Tier 1 and persistent.
- Deep inspection is Tier 3 and temporary.
- Opponent detail should open from the player seat, not from an unrelated menu.

### Log Is Related To Everything

The log is not chat. It is the table memory.

It answers:

- What just happened?
- Who acted?
- Which card/space/resource/module changed?
- Why did a number move?
- What did I miss while waiting?
- What was the consequence of my own action?

Design rule:

- Recent log is Tier 1.
- Full log is Tier 3.
- Log entries should link to objects: cards, players, spaces, colonies,
  parties, global events, underground tokens, milestones, awards.
- After the current player submits an action, show a short consequence summary
  before the player chooses the next action.

### Module Boards Are Related To Command Groups

Modules add objects and actions. Their UI should follow the same pattern:

- A compact status indicator is persistent.
- The module board/layer opens when the related action or inspection begins.
- The module contributes command tiles only when relevant.
- The module contributes log categories and object links.

Design rule:

- A module should not create an always-open vertical section just because it
  exists.
- A module should become prominent when the player's decision touches it.

## Information Grouping Proposal

### Group A: Table State

Contents:

- Mars map.
- Global parameters: temperature, oxygen, oceans, Venus, Moon rates where
  enabled.
- Generation/phase.
- Module layers that affect placement or global state.
- Milestone/award compact race indicators.

Persistence:

- Always visible.

Primary location:

- Center/top-center.

Why grouped:

- These are shared public board facts. Players constantly relate actions to
  global progress and board geography.

### Group B: Player Economy Strip

Contents:

- Own MC, steel, titanium, plants, energy, heat.
- Production for each.
- TR and visible VP.
- Card count.
- Blue action count.
- Discounts/steel/titanium values when relevant.

Persistence:

- Always visible.

Primary location:

- Top HUD or top of bottom tray. It must remain icon-first.

Why grouped:

- These are affordability and opportunity facts. Nearly every action asks:
  "Can I pay, and what will I have left?"

### Group C: Player Seats

Contents:

- Each player's name/color/status.
- Active/pass/next indicators.
- Compact resources/production/TR/card count.
- Tags summary.
- Available blue actions count, colonies count, influence, timers when enabled.
- Last card/action marker.

Persistence:

- Always visible in compact form.

Primary location:

- Top or side rail around the board.

Why grouped:

- These are opponent awareness facts. They support race reading and targeting
  without forcing full-board inspection.

### Group D: Action Workbench

Contents:

- Top-level command board.
- Current pending input title.
- Action stage.
- Disabled reasons.
- Selected action path.
- Confirm/cancel.

Persistence:

- Visible when active player must act.
- Collapsed but still available while waiting.

Primary location:

- Bottom-left of default tray.

Why grouped:

- These are moment-critical control facts. They must not be separated from the
  hand/tableau and selected-object details.

### Group E: Card Desk

Contents:

- Hand strip.
- Current tableau strip.
- Playable cards.
- Active cards with unused actions.
- Resource-bearing cards.
- Setup/research card lists.

Persistence:

- Hand/tableau entry always visible.
- Expanded card lists contextual.

Primary location:

- Bottom-center, with full overlay for dense card reading.

Why grouped:

- Terraforming Mars is mostly deciding how to turn cards and resources into
  board/progress advantages. Cards must live beside actions, not below the map.

### Group F: Inspector And Consequence Preview

Contents:

- Selected card text and requirements.
- Payment ledger.
- Target preview.
- Before/after deltas.
- Warnings.
- Log event details.

Persistence:

- Contextual.

Primary location:

- Bottom-right or right side sheet.

Why grouped:

- This is where the player verifies "what exactly will happen if I confirm?"

### Group G: Activity Feed

Contents:

- Last few meaningful events.
- Player/card/resource/space chips.
- Deltas from current action.
- Click targets into full log or board highlights.

Persistence:

- Always visible in compact form.

Primary location:

- Right rail or top-right near player seats.

Why grouped:

- The activity feed is table memory. It helps players follow other turns and
  trust action resolution.

### Group H: Temporary Inspection

Contents:

- Full opponent board.
- Full opponent tableau.
- Full current tableau.
- Full log.
- Full module board.
- Full milestone/award detail.
- Rules/help.

Persistence:

- Temporary overlay/sheet.

Primary location:

- Open from the object being inspected.

Why grouped:

- These are important, but they are not constantly required. They should not
  permanently consume the main play surface.

## Action-To-Information Mapping

### Play A Card

Tier 0:

- Selected card.
- Requirements.
- Cost/payment.
- Any required targets.
- Confirm/cancel.

Tier 1:

- Own resources.
- Own tableau tags/effects.
- Global parameters.
- Board/module state if targeted.

Tier 2:

- Full hand.
- Discounts and special resource options.
- Opponent resources if the card can target them.

UI grouping:

- Command board -> hand/card desk -> inspector ledger -> map/module/player
  target if needed.

### Use A Standard Project

Tier 0:

- Project list.
- Cost.
- Legal target if any.
- Result preview.

Tier 1:

- Own resources.
- Global parameters.
- Mars map.

Tier 2:

- Milestone/award impact.
- Opponent board impact.
- Module track impact for Venus/Moon variants.

UI grouping:

- Command board tile opens standard-project grid; choosing placement projects
  activates map/track.

### Claim A Milestone

Tier 0:

- Claimable milestone.
- Cost.
- Remaining slots.
- Confirm.

Tier 1:

- Own qualifying count.
- Opponent race proximity.

Tier 2:

- Detailed criteria explanation.

UI grouping:

- Compact race indicators persist; full claim view opens as contextual sheet.

### Fund An Award

Tier 0:

- Award name.
- Current funding cost.
- Remaining slots.
- Confirm.

Tier 1:

- Current standings/proxy counts.
- Opponent proximity.

Tier 2:

- Full scoring projection.

UI grouping:

- Compact race indicators persist; full award standings can be temporary.

### Use A Blue Card Action

Tier 0:

- Available unused active cards.
- Cost/target.
- Used state.

Tier 1:

- Current tableau.
- Resources on cards.
- Own resources.

Tier 2:

- Full tableau filtering.

UI grouping:

- Blue action command filters tableau strip to actionable cards.

### Convert Plants

Tier 0:

- Plant count.
- Legal greenery spaces.
- Oxygen/TR result.
- Placement bonus preview.

Tier 1:

- Mars map.
- Own cities/tiles.
- Oxygen track.

Tier 2:

- Opponent city adjacency/scoring impact.

UI grouping:

- Command tile activates map; inspector shows selected-space consequence.

### Convert Heat

Tier 0:

- Heat count.
- Temperature track.
- TR result.

Tier 1:

- Own heat production.
- Temperature bonuses.

UI grouping:

- Simple command tile with confirmation and result preview.

### Colonies Trade Or Build

Tier 0:

- Trade fleet availability.
- Trade cost.
- Target colony.
- Trade income/colony bonus.
- Build colony cost and legal colony spots.

Tier 1:

- Colony tiles and white markers.
- Own colonies/fleet size/trades this generation.
- Relevant resources.

Tier 2:

- Opponent colonies on target colony.
- Future white-marker growth.

UI grouping:

- Module action opens Colony table leaf. The colony tile is the selector.

### Turmoil Delegate Or Event

Tier 0:

- Legal parties/delegates.
- Free vs paid delegate state.
- Current/dominant/ruling party.
- Current and coming global events if relevant.

Tier 1:

- Influence.
- Allied party.
- Policy.
- Opponent delegate positions.

Tier 2:

- Full global event text and historical political changes.

UI grouping:

- Module action opens Turmoil table leaf. Delegate placement happens on the
  political board.

### Moon Action

Tier 0:

- Moon project/card action.
- Alloy cost.
- Legal Moon spaces.
- Rate/TR result.

Tier 1:

- Moon board.
- Moon rates.
- Own steel/titanium/MC.

Tier 2:

- Full Moon board if dense.

UI grouping:

- Moon command opens Moon leaf or mini-board. Alloy cost is shown in payment
  ledger, not hidden in card text.

### Ares / Underworld Map Action

Tier 0:

- Legal Mars spaces.
- Hazard/token state.
- Production loss or token claim preview.

Tier 1:

- Mars map layer.
- Own production/resources.

Tier 2:

- Full token/hazard explanation.

UI grouping:

- These must be map layers. If they are a separate panel, the player loses the
  spatial information they need.

### Pathfinders / Delta Project Track Action

Tier 0:

- Current position.
- Legal next positions.
- Required tags/energy.
- Reward.

Tier 1:

- Own tags.
- Energy resources.
- Other players' positions.

Tier 2:

- Full track explanation.

UI grouping:

- Track leaf with legal steps highlighted and inspector reward preview.

### Pass

Tier 0:

- Pass consequence.
- Remaining possible actions.
- Next player/phase implication.
- Confirm.

Tier 1:

- Current resources/hand/blue actions.
- Players passed/not passed.

UI grouping:

- Separated command tile with confirmation if meaningful actions remain.

## Feedback And Consequence Model

The UI needs two kinds of feedback.

### Immediate Action Preview

Before confirm:

- Show what will be spent.
- Show what will be gained.
- Show what global parameter/track/space/player/card will change.
- Show unresolved choices still required.

This is a Tier 0 inspector responsibility.

### Resolved Action Feedback

After server response:

- Show a compact consequence summary.
- Highlight changed resources/tracks/spaces/cards.
- Add a recent log entry.
- If the player may take a second action, keep the command board open with
  updated legality.

This solves the "what just happened?" problem without forcing the player to
read the full log every time.

## Opponent Information Model

The user example is right: inspecting another player is important, but not
always critical.

### Persistent Opponent Snapshot

Always show:

- Name/color.
- Active/pass status.
- TR and visible VP if allowed by game settings.
- Resources/production in compact icon form.
- Cards in hand count.
- Tags summary.
- Available blue-action count.
- Colonies/influence/module counters where enabled.
- Last action/card.

### Temporary Opponent Board

Open on click:

- Full tableau.
- Resource board.
- Production.
- Tags.
- Played cards by type.
- VP breakdown.
- Recent player-specific log.

This can be a side sheet or full overlay. It can scroll because it is a true
inspection view. It should not be part of the permanent main layout.

## Proposed Screen Persistence Rules

| Information | Priority | Persistence | Default surface |
| --- | --- | --- | --- |
| Mars map | Tier 1 | Always | Center table |
| Global parameters | Tier 1 | Always | Map/top HUD |
| Own resources/production | Tier 1 | Always | Icon HUD |
| Active player/turn state | Tier 0/1 | Always | Player rail/action board |
| Current pending decision | Tier 0 | When acting | Action workbench |
| Top-level actions | Tier 0 | Own turn | Command board |
| Hand entry/current playable cards | Tier 1/2 | Always/contextual | Bottom card desk |
| Current tableau engine strip | Tier 1 | Always | Bottom card desk |
| Full hand | Tier 2 | Contextual | Tray mode/full overlay |
| Full current tableau | Tier 2/3 | Contextual | Tray mode/full overlay |
| Opponent compact state | Tier 1 | Always | Player seats |
| Opponent full board | Tier 3 | Temporary | Side sheet/full overlay |
| Recent log | Tier 1 | Always | Activity rail |
| Full log | Tier 3 | Temporary | Full overlay |
| Milestone/award compact race | Tier 1 | Always compact | Map/table HUD |
| Milestone/award details | Tier 2/3 | Contextual | Sheet/overlay |
| Colony board | Tier 2 | Contextual/pinnable | Table leaf |
| Turmoil board | Tier 2 | Contextual/pinnable | Table leaf |
| Moon board | Tier 2 | Contextual/pinnable | Table leaf |
| Ares/Underworld layers | Tier 2 | Contextual | Map layer |
| Pathfinders/Delta tracks | Tier 2 | Contextual/pinnable | Table leaf |
| Rules/help/settings | Tier 3/4 | Temporary | Menu/overlay |

## Navigation Principles

### 1. Open From The Object

If the player wants another player's board, click the player seat.
If the player wants a colony, click the colony module icon or command.
If the player wants a card detail, click the card.
If the player wants a log detail, click the log event.

Do not create a global menu of unrelated destinations as the primary path.

### 2. Keep The Decision Spine Visible

During an action, keep visible:

- The chosen action.
- The chosen object, if any.
- Remaining required choices.
- Confirm/cancel.

The player should never feel dropped into a subform.

### 3. Use Temporary Surfaces For Curiosity

Full opponent boards, full logs, and full scoring breakdowns are useful, but
they are not the current action. Let them cover a large part of the screen
temporarily, then close cleanly back to the same game state.

### 4. Let Lists Scroll, Not The Game

Scroll is acceptable for:

- Full hand.
- Full tableau.
- Full log.
- Full card archive.
- Dense module history.

Scroll is not acceptable for:

- Main game surface.
- Action workbench.
- Resource HUD.
- Map.
- Confirm controls.
- Current decision explanation.

### 5. Use Icons As Game Language

The resource and module symbols are not decoration. They are the player's
reading system. Preserve icons for:

- Resources and production.
- Tags.
- Global parameters.
- Card types.
- Module identities.
- Colonies/delegates/fleets/tokens/tracks.

Text can clarify. Text should not replace the game symbols.

## Design Consequences For The Next Prototype

The next prototype should not begin by drawing panels. It should begin by
proving these relationships:

1. The player can start a turn and immediately understand all legal top-level
   action families.
2. The player can inspect their hand and engine without losing the board.
3. The player can play a card and see cost, requirements, target, and result in
   one coherent path.
4. The player can watch an opponent act and understand the consequence through
   recent log plus object highlights.
5. The player can inspect an opponent deeply, then close that inspection and
   return to the same planning state.
6. A module action opens the related board/layer, not a generic nested menu.
7. No non-list surface scrolls.

## Recommended First Wireframe States

Use these wireframes to validate the information architecture:

1. Waiting for another player while they play a card that changes oxygen and
   places a tile.
2. Own turn start with two actions available and all official modules enabled.
3. Play-card flow with payment, tags, requirement warning, and map target.
4. Second-action choice after the first action changed resources/global state.
5. Opponent inspection opened from a player seat.
6. Colonies trade action opened from command board.
7. Turmoil delegate action opened from command board.
8. Ares/Underworld map placement with layer consequences visible.

Each wireframe should label information by tier. If Tier 0 is not visible, the
wireframe fails. If Tier 1 is absent from normal play, the wireframe probably
fails. If Tier 3 is permanently taking space from Tier 0 or Tier 1, the
wireframe fails.
