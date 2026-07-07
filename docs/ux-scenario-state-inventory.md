# UX Scenario State Inventory

This document lists the game states worth capturing in the visual scenario lab. It is not an implementation plan and it is not a pass/fail test suite. The purpose is to define the UI shapes an agent should be able to see in screenshots while iterating on the Terraforming Mars UX.

The important unit is a visual fixture: a reachable or injected game state with enough data to stress one player task, one information surface, or one extension module. A fixture does not need to prove that the game engine is correct. It needs to make the interface show the kind of thing a real player must understand.

## How To Use This Inventory

Each scenario candidate should eventually answer these questions:

- What player task or reading task does this expose?
- Which modules must be enabled?
- Which game phase is it in: setup, early turn, midgame, late game, final generation, or game end?
- Which player perspective matters: active player, waiting player, passed player, opponent, solo player, or spectator/endgame?
- Which UX state matters: idle, selected, expanded, filtered, resized, full-screen, invalid, disabled, confirming, or just-updated?
- Which UI surfaces should be captured: table, action panel, payment panel, map, cards, player dossier, log, side module, or endgame report?
- Which data shape must be forced: dense hand, many played cards, stacked resources, occupied side board, crowded map, many player tags, pending choice, or unusual scoring?

The future scenario runner should make these easy to add as named presets or JSON fixture config. Direct model injection is acceptable for visual fixtures as long as the fixture is clearly marked as synthetic. Engine-driven fast play is better when the screenshot depends on a legal pending input or a complete log trail.

When doing a visual audit, use generated indexes only as navigation. Small UI bugs must be checked in the full-resolution PNG, and suspicious findings from an old or long-running capture should be validated against a current targeted rerun before they are recorded as active issues.

## Coverage Axes

Use these axes before adding a new concrete scenario. If a scenario does not add a new visual shape on at least one axis, it is probably duplicate coverage.

### Game Progression

- Setup before choices: corporations, preludes, CEOs, initial project cards, draft variants.
- Setup after partial choices: one category chosen, others still open.
- First active turn: sparse board, simple actions, low player resources.
- Early generation 2: first production happened, a few played cards, first standard projects available.
- Midgame: many cards, some colonies/tracks/turmoil state, contested milestones and awards.
- Late game: near-complete global parameters, crowded map, large tableaus, high resources.
- Final generation: many players passed, last player still acting, almost-complete awards.
- Game end: final board, VP table, VP chart, player breakdown, module scoring, final log.

### Player Counts And Roles

- Solo player, including solo win/loss pressure.
- 2 players, because the UI can accidentally look balanced only in this small case.
- 4 players, the main target for the user's heavy preset.
- 5 players, because the player rail, awards, logs, and opponent comparison surfaces become dense.
- Active player with one action left this turn.
- Active player choosing between many action categories.
- Waiting player watching another player's turn.
- Passed player who still wants to inspect board, hand, and log.
- Endgame or spectator view with no actionable turn controls.

### Density Levels

- Sparse: beginning of game, few cards, empty boards.
- Normal: a realistic midgame with 6 to 12 played cards per player.
- Dense: 20 or more played cards for one player, 10 or more cards in hand, multiple card resource stacks, nearly full map.
- Extreme: all side modules populated, 4 or 5 players, large log, many tags, many visible icons.

### Pending Input Types

The scenario lab should eventually cover every `PlayerInputModel` shape, because each one can create a different action UI.

- `initialCards`: choosing corporations, preludes, CEOs, and starting project cards.
- `or`: choosing an action family or mutually exclusive sub-action.
- `and`: resolving a bundled sequence of required choices.
- `option`: single confirmable action.
- `projectCard`: choosing a project card to play, with payment options and special resources.
- `card`: selecting one or more cards from a hand, tableau, discard-like list, or blue action list.
- `payment`: allocating megacredits, steel, titanium, heat, microbes, floaters, seeds, and other special payments.
- `colony`: selecting a colony tile to build or trade with.
- `player`: selecting another player.
- `space`: selecting a Mars or Moon board space.
- `amount`: choosing a number.
- `deltaProject`: choosing a Delta Project track step.
- `delegate`: selecting a delegate color.
- `party`: selecting a Turmoil party.
- `productionToLose`: choosing production to pay or lose.
- `aresGlobalParameters`: shifting Ares global parameters.
- `globalEvent`: selecting a Turmoil global event.
- `resource`: selecting a single resource type.
- `resources`: selecting multiple resources.
- `claimedUndergroundToken`: selecting Underworld claimed tokens.

## UX State Coverage

These fixtures are about the interface mode more than the game rules. They answer: what does the player see, what is open, what is selected, and what can they safely do next?

### Turn And Attention Modes

- Active player's turn, no action selected yet.
- Active player's turn, one action selected but not confirmed.
- Active player's turn after the first action, with the second action still available.
- Active player's turn with no legal action except passing.
- Waiting player's screen while another player is deciding.
- Waiting player's screen immediately after another player completes an action.
- Passed player's screen while the generation continues.
- Player in setup while other players are still choosing.
- Player in research/draft while another player is already waiting.
- Spectator or game-end screen with no active controls.
- Solo-player screen where the urgency is global progress rather than opponent comparison.
- Modal or full-screen overlay open while the underlying turn state remains visible enough to orient the player.

### Feedback And Confirmation States

- Just completed action, with visible feedback in the log and affected surfaces.
- Action that changes resources only.
- Action that changes board state only.
- Action that changes resources, board state, and global parameter in one resolution.
- Confirmation required with confirm button enabled.
- Confirmation blocked with clear disabled state.
- Optional action with skip/pass affordance.
- Warning state before playing a card or confirming a risky action.
- Error or invalid choice state after attempting an impossible action.
- Undo available.
- Undo unavailable.
- Loading or refresh state while the client is waiting for model updates.
- Stale or interrupted state if the client loses sync.

### Action Panel States

- Action menu closed or idle.
- Action menu open with all top-level actions visible.
- Action category selected with its details shown.
- Action category selected where the detail panel needs most of the available width.
- Nested `or` action with several sub-actions.
- Nested `and` action with a sequence of required choices.
- Action with one legal option.
- Action with many legal options.
- Action with legal and disabled options mixed.
- Action with a destructive or irreversible choice.
- Pass action visible but not visually dominant when better actions exist.
- Pass action dominant when the player has nothing meaningful left.
- Action panel while another overlay is open.
- Action panel at default height and after user resizing.

### Payment And Resource Allocation UX

- Payment panel before any resource is allocated.
- Partial payment where confirm is disabled.
- Exact payment where confirm is enabled.
- Overpayment prevented or clearly corrected.
- Max button applied.
- Plus/minus controls at min and max.
- Payment with only megacredits.
- Payment with megacredits plus steel/titanium.
- Payment with heat as a valid resource.
- Payment with card resources or module resources.
- Payment with reserve units.
- Payment with discounts and extra costs visible.
- Payment after changing selected card.
- Payment opened in compact mode and full-width mode.
- Payment with enough resource rows to prove list scrolling, if scrolling is unavoidable.

### Milestones And Awards UX

- Milestones/awards button closed and idle.
- Button hover/focus state, so it reads as clickable.
- Compact panel open over or near the board.
- Full overlay open.
- Milestone available and claimable.
- Milestone unavailable because the player does not qualify.
- Milestone already claimed by another player.
- All milestones claimed.
- Award fundable.
- Award already funded.
- Award unavailable because all awards are funded.
- Award standings collapsed.
- Award standings expanded with all player scores.
- One player clearly winning an award.
- Several players tied or close.
- Random/fan MA with unfamiliar names.
- Board-specific MA set.
- MA panel after a claim/fund action, with the result visible in log and player VP.

### Player Rail And Player Dossier UX

- Compact current-player row.
- Compact opponent row.
- Current player emphasized without clipping badges or names.
- Opponent active-turn emphasis.
- Waiting/passed status visible.
- Player with no tags.
- Player with many tags.
- Player with many resource and production values.
- Compact quick expansion showing tags and important stats.
- Full player dossier opened from the player rail.
- Full player dossier opened from a player name in the log.
- Dossier with the resources/production summary visible.
- Dossier with all tags visible.
- Dossier with hand/played cards for the current player.
- Dossier with played cards only for an opponent.
- Dossier with player-filtered log.
- Dossier with module-specific stats: colonies, fleet, influence, Underworld tokens, Delta state, Moon contributions.
- Dossier tab switch between overview, cards, tags/resources, log, and module sections.
- Dossier for a dense tableau player.
- Dossier close state returning to the same table context.

### Cards, Hand, Tableau, And Filters

- Hand panel closed.
- Hand panel open at default height.
- Hand panel enlarged by user resizing.
- Full cards overlay.
- Current-player hand with no cards.
- Current-player hand with a few cards.
- Current-player hand with many cards.
- Opponent played-card view.
- Current-player played tableau grouped by corporation, prelude, automated, active, and event cards.
- Dense played tableau with many cards and card-resource stacks.
- Card selected for play.
- Multiple cards selected.
- Disabled/unplayable card visible.
- Card with warnings visible.
- Card with requirements visible.
- Card with resources on it.
- Card hover/focus/details state.
- Card search empty.
- Card search with results.
- Card search with no results.
- Filter by playable now.
- Filter by affordable now.
- Filter by card type.
- Filter by tag.
- Filter by cost range.
- Filter by cards with actions.
- Filter by cards with resources.
- Filter by warnings or blocked requirements.
- Filter by module/expansion.
- Sort by cost, name, type, VP, tag relevance, and recently drawn/played.
- Filter state combined with a selected card.
- Filter state preserved after resizing or opening full screen.
- True list scrolling in hand/tableau areas, without nested non-list scroll traps.

### Board Interaction UX

- Board idle with no selectable spaces.
- Board while selecting a space.
- Legal spaces highlighted.
- Illegal spaces visible but clearly not selectable.
- Space hover or detail popover.
- Selected space before confirmation.
- Newly placed tile after confirmation.
- Board zoomed or full-screen.
- Board with module controls closed.
- Board with one module panel open.
- Board with milestones/awards open.
- Board with side board overlay available.
- Board in 16:9 and 16:10 desktop layouts.
- Board with enough vertical room that critical controls do not cover the planet.

### Log UX

- Compact log closed or minimized.
- Compact log open in normal table play.
- Full-screen log overlay.
- Log filtered by player.
- Log filtered by generation.
- Log filtered by module.
- Log filtered by cards/actions/resources if supported.
- Log immediately after the current player's action.
- Log while waiting for another player.
- Log with unread/new-event emphasis.
- Log with repeated resource events aggregated or visually grouped.
- Log with card, player, and board references clickable.
- Log scrolled to top, middle, and newest event.

### Overlay, Panel, And Layout Mechanics

- No overlay open.
- One overlay open.
- Overlay opened from a compact panel.
- Overlay opened from a player/card/log link.
- Overlay with tabs.
- Overlay with nested detail, such as card details inside a player dossier.
- Overlay close button hover/focus state.
- Escape or outside-click close behavior if supported.
- Panel resized smaller than default.
- Panel resized larger than default.
- Bottom hand/tableau tray hidden, default, and enlarged.
- Activity/log rail hidden, default, and enlarged.
- Only true lists scroll internally.
- No double-scroll state in action/payment/card flows.
- Long labels fit in buttons and tabs.
- Empty states are intentional, not blank dead areas.

### Setup And Draft UX

- Setup overview with all required choice categories visible.
- Setup with one category open.
- Setup with several categories completed.
- Setup with chosen corporation but unchosen preludes.
- Setup with selected and unselected project cards.
- Setup with selected and unselected CEOs.
- Setup ready state.
- Setup waiting-for-others state.
- Draft/research with offered, selected, and rejected cards.
- Draft/research with filters/search active.
- Draft/research confirmation enabled and disabled.

### Extension Panel UX

For each extension panel, capture closed, compact, expanded, and full-screen states when those modes exist.

- Colonies panel with a selected colony tile.
- Colonies panel during build/trade choice.
- Venus panel or track during Venus-related action.
- Turmoil panel during delegate/party/event choice.
- Ares board state during hazard-related action.
- Moon board during Moon tile placement.
- Pathfinders panel during track inspection.
- Underworld map/player-token panel during excavation or token use.
- Delta Project panel during valid-step selection.
- CEO choice/action panel during setup and later use.

## Base Game And Corporate Era

### Board And Global Parameters

- Empty Mars board with oceans, reserved spaces, Noctis, volcanic highlights, and standard bonuses visible.
- Early board with one city, one greenery, one ocean, and one special tile.
- Midgame board with city/greenery adjacency decisions visible.
- Crowded board where tile labels, city ownership, greenery ownership, and ocean tiles compete for space.
- Near-final board with oxygen, temperature, and oceans almost complete.
- Fully terraformed board where the main task is endgame scoring and final placement clarity.
- Board with rotated tiles, co-owned tiles, special markers such as Gagarin/Cathedral/Nomads, and reserved/special spaces.
- Board spaces that are selectable, blocked, highlighted, and not selectable in the same screenshot.

### Player Economy

- Player with low resources and no production.
- Player with high resources in every standard resource.
- Player with negative or reduced productions.
- Player with high steel/titanium value and visible discounts.
- Player with protected resources or protected production.
- Player with high TR but few cards.
- Player with low TR but strong engine and many productions.
- Player with no tags, many tags, and mixed module-specific tags.
- Player who has passed while others are active.
- Player who has one remaining action, two available actions, or no available actions.

### Cards And Engine

- Small hand with obvious playable and unplayable cards.
- Large hand with mixed playable, unplayable, warning, and discounted cards.
- Project card selection with card requirements, card warnings, calculated cost, discounts, and additional costs.
- Payment for a card with steel and titanium choices.
- Payment for a card with special module resources such as seeds, data, asteroids, or reserve units when available.
- Played tableau with corporations, automated green cards, event red cards, active blue cards, and preludes mixed together.
- Dense tableau with 20 or more cards and multiple card sizes.
- Blue card action list where some actions are available and others are already used.
- Cards with resources on them: animals, microbes, floaters, science resources, asteroids, data, seeds, or other module resources.
- Self-Replicating Robots cards with nested cards.
- Disabled card state.
- Cards with `bonusResource`, `cloneTag`, `additionalProjectCosts`, or `standardProjectCanPayWith`.
- Last card played highlighted in a way that the log and player rail can reinforce.

### Core Actions

- Play a project card from hand.
- Select a card to play, then pay, then resolve a board space.
- Sell patents with a small selection and a large selection.
- Standard projects list with all standard projects visible.
- Standard project payment that accepts alternate resources.
- Convert plants to greenery with space selection.
- Convert heat to temperature.
- Claim milestone with none, one, and several available.
- Fund award with first, second, and third award costs.
- Use a blue card action.
- Resolve an action that asks for a resource type.
- Resolve an action that asks for an amount.
- Resolve an action that asks for another player.
- Resolve an action that asks for production to lose.

### Milestones And Awards

- No milestones claimed and no awards funded.
- One milestone claimed, two remaining.
- All milestones claimed.
- First award funded at low cost.
- Multiple awards funded with player standings close enough to matter.
- Awards/milestones with random or fan MA enabled.
- Awards/milestones opened from map context and from a full overlay.
- Endgame award scoring where the standings differ from the midgame expectations.

### Game Log

- Sparse log at game start.
- Dense log after several generations.
- Log with repeated small resource events that should be scannable.
- Log immediately after the active player plays a card, gains resources, places a tile, and changes a global parameter.
- Log while waiting for another player.
- Log filtered to one player.
- Log filtered or visually grouped by generation.
- Log with clickable card names, player names, board spaces, and module events.
- Expanded full log overlay with enough height to read history comfortably.

### Endgame

- Normal multiplayer endgame with all scoring rows visible.
- Tight score endgame where one or two points matter.
- Tie or near tie.
- Solo win.
- Solo loss.
- Endgame with large card VP details.
- Endgame with awards, milestones, city/greenery, and card points all non-zero.
- Endgame with module scoring: Moon, Pathfinders planetary tracks, Underworld negative VP, escape velocity if enabled.
- Final board plus final log in the same review flow.

## Setup And Draft States

### Initial Setup

- Base two-corporation setup with initial project cards.
- Two starting corporations variant with both choices visible.
- Corporate Era corporation choice with extra starting resources.
- Prelude choice with two preludes.
- Prelude 2 choice with more complex preludes.
- CEO choice with multiple CEO cards.
- Heavy setup with corporations, preludes, CEOs, and project cards all waiting at once.
- Setup where one category is chosen and another still needs attention.
- Setup with initial draft variant enabled.
- Setup with prelude draft variant enabled.
- Setup with CEO draft variant enabled.
- Setup with 4 players, where other players are also in setup.
- Setup with 5 players, where waiting status and player readiness matter.

### Research And Draft

- Research phase with a small set of cards.
- Research phase with a large set of cards.
- Draft phase where cards move between offered, kept, and passed groups.
- Player needs to draft while another player needs to research.
- Waiting player after finishing draft.
- Cards with warnings or requirements during draft/research.

## Game Options And Board Variants

These are not extensions, but they change what a player must read or what the UI must reserve space for.

### Board Variants

- Tharsis as the default baseline.
- Hellas and Elysium because their milestones, awards, and special spaces differ from Tharsis.
- Utopia Planitia, Vastitas Borealis Nova, and Terra Cimmeria Nova because they add newer board layouts.
- Arabia Terra, Amazonis Planitia, Terra Cimmeria, Vastitas Borealis, and Hollandia because board-specific spaces and MA sets can change the visual shape.
- Shuffle map enabled, where known board-space mental models are less reliable.
- Board with many labeled special spaces visible.
- Board with milestone/award sets that differ enough to stress compact MA presentation.

### Rule Options With UI Impact

- Random milestones and awards off, limited, and full.
- Fan milestones and awards included.
- Solar phase enabled and disabled.
- Escape Velocity enabled with non-zero endgame penalty.
- Timers shown and hidden.
- Undo enabled with undo count present.
- Show-other-players-VP enabled and disabled.
- Solo TR enabled and disabled.
- Requires Venus track completion enabled and disabled.
- Requires Moon track completion enabled and disabled.

## Colonies

### Colony Tile States

- Colonies module enabled with no colony tiles selected yet, if that state can appear.
- Active colony tile with no colonies.
- Active colony tile with one player colony.
- Active colony tile with multiple player colonies.
- Active colony tile full of colonies.
- Inactive colony tile.
- Colony tile with visitor ship present.
- Colony tile with track at low, middle, and high positions.
- Colony tile where track is at max and rewards are crowded.
- Discarded colony list visible.
- Many colony tiles visible at once.

### Colony Player States

- Player with no colonies.
- Player with one colony.
- Player with many colonies.
- Player with fleet size 1 and a used fleet.
- Player with increased fleet size and multiple fleets.
- Player with `tradesThisGeneration` already used.
- Opponents sharing the same colony tile.

### Colony Actions

- Build colony pending input.
- Trade with colony pending input.
- Select colony from several legal and illegal options.
- Trade result log with trade income and colony bonuses.
- Colony action from a card rather than a standard action.
- Colony panel opened as a compact side module and as a large overlay.

### Colony Content Variety

Use representative colonies with different reward icon patterns, not only one tile.

- Luna for megacredits.
- Ceres for steel.
- Titan for floaters.
- Enceladus for microbes.
- Pluto for card draw.
- Io for heat/energy style rewards.
- Ganymede or Europa for plant/ocean style rewards.
- Miranda or other community colonies if enabled.

## Venus Next

- Venus scale at 0, middle, and max.
- Venus scale near a scoring or requirement threshold.
- Alt Venus board enabled.
- Venus global parameter changed this generation.
- Venus track maxed while other global parameters are not.
- Venus-tag cards in hand and tableau.
- Floater cards with zero, one, and many floaters.
- Floater payment or floater spending action.
- Card requirements involving Venus scale.
- Card warning where Venus requirement is not met.
- Endgame where Venus-related card VP is material.

## Prelude And Prelude 2

- Prelude setup with clear chosen/unselected states.
- Prelude 2 setup with more than the base Prelude complexity.
- Prelude cards in tableau after setup.
- Prelude cards that place resources on cards.
- Prelude cards that immediately place tiles.
- Prelude effects visible in the game log.
- Prelude draft variant with card movement.
- Prelude 2 cards that create ongoing or action-like visual states, if present.

## Turmoil

### Turmoil Board

- No delegates placed yet.
- Several parties each with one delegate.
- One party crowded with many delegates.
- Party leader visible.
- Chairman visible.
- Ruling party and dominant party are different.
- Ruling party and dominant party are the same.
- Lobby contains player delegates.
- Reserve contains neutral and player delegates.
- Influence values differ by player.
- Player allied party is visible.

### Events And Agendas

- Distant, coming, and current global events all populated.
- Event deck state where an event is resolving.
- Political agendas extension off.
- Political agendas extension on with agendas visible.
- Policy action unused.
- Policy action used by one player.
- Multiple policy action uses if the agenda extension allows it.
- Remove-negative-global-events option enabled and disabled.

### Turmoil Actions

- Place delegate pending input.
- Select delegate color pending input.
- Select party pending input.
- Select global event pending input.
- Turmoil policy action pending input.
- Generation transition where Turmoil changes ruling party and resolves event.
- Log section showing delegate movement, influence, ruling bonus, and event effects.

## Ares

### Hazard And Map States

- Ares enabled with hazards absent.
- Ares enabled with hazards present.
- Erosion hazards before ocean threshold.
- Erosion hazards after ocean threshold.
- Dust storm hazards before removal threshold.
- Severe erosion visible after temperature threshold.
- Severe dust storm visible after oxygen threshold.
- Hazard removal in progress.
- Normal Mars tiles adjacent to hazard tiles.
- Crowded Ares board where hazard icons compete with owner tiles and bonuses.

### Ares Actions And Counts

- Shift Ares global parameters pending input.
- Tile placement constrained by hazards.
- Hazard removal action.
- Ares milestone counts for Networker/Purifier visible in player detail or MA panel.
- Log after a hazard is placed, removed, or changed by a global parameter.

## The Moon

### Moon Board

- Moon module enabled with empty Moon board.
- Moon board with one road, one mine, and one habitat.
- Moon board midgame with several connected/adjacent placements.
- Moon board crowded late game.
- Moon special spaces and bonuses visible.
- Moon board opened beside Mars context.
- Moon board opened as a large overlay.

### Moon Rates And Scoring

- Habitat, mining, and logistic rates at 0.
- Each rate in the middle.
- One or more rates maxed.
- Player global parameter contributions include Moon steps.
- Endgame with non-zero Moon habitat, mine, and road VP.
- Requires Moon track completion option enabled and disabled.

### Moon Actions

- Place Moon road pending input.
- Place Moon mine pending input.
- Place Moon habitat pending input.
- Play Moon card with reserve units or extra costs.
- Moon action that changes both Moon board and Mars economy.
- Log showing Moon placement and rate movement.

## Pathfinders

### Planetary Tracks

- All tracks at 0.
- One track advanced.
- Several tracks advanced unevenly.
- Earth, Mars, Venus, Jovian, and Moon tracks all populated.
- One track near max.
- Multiple tracks maxed.
- Track reward markers visible.
- Player competition on the same track.

### Pathfinders Actions And Cards

- Pending Delta/track-like or tag-based track movement input if available.
- Cards with `cloneTag`.
- Cards that advance planetary tracks.
- Player tableau with many relevant tags.
- Endgame with planetary track scoring details.
- Pathfinders panel opened compactly and as a large overlay.

## Underworld

### Underground Board Tokens

- Underworld enabled with hidden underground tokens.
- Revealed underground tokens on several spaces.
- Token with an excavator color.
- Several excavated spaces owned by different players.
- Underground token on a valuable or contested Mars space.
- Crowded map where underground token, tile owner, and standard bonus all need to be readable.

### Player Underworld State

- Player with corruption 0.
- Player with low corruption.
- Player with high corruption.
- Player with no claimed tokens.
- Player with several claimed tokens.
- Claimed token active and inactive states.
- Claimed token protected by shelter.
- Active temporary bonus visible.
- Negative VP visible in player detail and endgame.

### Underworld Actions

- Claim underground token pending input.
- Select claimed underground token pending input.
- Excavate or identify action from card or standard action.
- Action using a temporary requirement modifier token.
- Log showing corruption gain, token claim, token use, and underground reveal.

### Token Variety

The fixture set should include tokens that render differently.

- Nothing.
- Card draw.
- Corruption.
- Steel/titanium/plant/energy/heat rewards.
- Production rewards.
- Ocean placement.
- TR.
- Tag tokens.
- Place 6 MC token.
- Requirement modifier tokens for ocean, oxygen, and temperature.
- Any-resource token.

## Delta Project

- Delta Project enabled with all players at start.
- One player leading a track.
- Multiple players tied.
- Player with `jovianBonus` false and true.
- Valid step selection pending input.
- Delta board opened as a side surface and as an endgame scoring surface.
- Endgame where Delta Project changes ranking.

## CEOs

- CEO setup with multiple CEO cards.
- CEO draft variant.
- CEO card in hand before use.
- CEO card played or revealed.
- CEO action unused.
- CEO action used.
- CEO action that asks for a card, resource, amount, player, or board space.
- Player detail showing CEO state alongside corporation and preludes.
- Log after CEO action.

## Promo, Community, Fan, And Star Wars Content

These modules mostly add cards, corporations, milestones, awards, and occasional special resources. They still need visual coverage because they can create unexpected card text, icons, and action shapes.

- Promo cards mixed into a normal hand.
- Promo corporation with unusual starting resources or tags.
- Community corporations visible in setup.
- Community cards with unusual requirements, actions, or card resources.
- Community colonies if available.
- Fan milestones and awards enabled.
- Random milestones and awards with fan MA enabled.
- Star Wars corporations/cards in setup, hand, and tableau.
- Star Wars card names and icons in logs and card overlays.
- Dense mixed-module hand where card styling remains consistent across official and fan content.

## Cross-Module Stress States

These are the most important fixtures for UX iteration because they reveal whether the layout is modular or only works for one feature at a time.

- User's primary 4-player preset: Corporate Era, Prelude, Prelude 2, Venus Next, Colonies, Promo, Community, Ares, Pathfinders, CEOs, two starting corporations, no Turmoil.
- Same primary preset in setup with all choice categories visible.
- Same primary preset in early generation 2.
- Same primary preset in midgame with dense hand, dense tableau, occupied colonies, Venus progress, Pathfinders progress, and Ares hazards.
- Same primary preset in late game with crowded Mars board and many player tags.
- Heavy 4-player preset with Turmoil added.
- Heavy 4-player preset with Moon and Underworld added.
- 5-player all-module density state.
- 2-player small state to ensure the design does not look empty or overbuilt.
- Waiting-player view for a heavy state.
- Passed-player view for a heavy state.
- Opponent dossier for a player with a huge tableau.
- Player dossier for the active player with hand, played cards, tags, resources, productions, VP, colonies, Turmoil influence, Underworld tokens, and module-specific stats.
- Full log overlay in a heavy state.
- Full card overlay in a heavy state.
- Full board overlay with Mars plus side boards available.
- Resized layout with bottom cards area larger than default.
- Resized layout with log/activity area larger than default.
- 16:9 desktop target.
- 16:10 desktop target, because the user actively tests there.

## Module Panel And Overlay States

Each module should have at least two captures when applicable: compact in-table context and large overlay context.

- Mars board compact and large.
- Cards/engine compact and large.
- Player rail compact, quick expanded, and full player dossier.
- Game log compact and large.
- Milestones/awards compact and large.
- Colonies compact and large.
- Venus track compact and large if alt board is enabled.
- Turmoil compact and large.
- Moon compact and large.
- Pathfinders compact and large.
- Delta Project compact and large.
- Underworld map/detail compact and large.
- Tools/settings compact, only if player-facing during a game.

## Priority Tiers

### Tier 0: Must Exist Before Major UX Work

- Primary 4-player heavy preset in setup, active turn, waiting turn, and midgame.
- Active turn idle state, selected-action state, and post-action feedback state.
- Waiting-player and passed-player table states.
- Base 2-player play-card payment.
- Payment allocation before, partial, exact, and special-resource states.
- Base 5-player player rail density.
- Compact player rail, quick expansion, and full player dossier.
- Dense hand and dense tableau.
- Hand/tableau filters for playable, affordable, tag, card type, search, and no-results states.
- Player dossier for active player and opponent.
- Full log overlay with dense history.
- Compact log and player-filtered log.
- Mars board crowded enough to judge tile readability.
- Milestones and awards with claimed/funded state.
- Milestones/awards closed, compact-open, and full-overlay states.
- Endgame scoring with multiple non-zero categories.

### Tier 1: Extension Core Coverage

- Colonies with occupied colony tile, visitor ship, full colony tile, and used fleets.
- Venus with mid/max Venus scale and floater cards.
- Turmoil with delegates, ruling/dominant party, events, and policy state.
- Ares with hazards and hazard removal.
- Moon with all three Moon tile/rate types.
- Pathfinders with all planetary tracks populated.
- Underworld with revealed tokens, claimed tokens, active bonuses, and corruption.
- Delta Project with lead/tie and valid-step input.
- CEOs with setup and used/unused CEO action.

### Tier 2: Action Input Coverage

- One scenario per `PlayerInputModel` type.
- Complex nested `or` and `and` actions.
- Card selection with min/max and select-all.
- Payment with many payment sources.
- Space selection with legal and illegal spaces visible.
- Production loss selection.
- Resource and multi-resource selection.
- Action selected with enabled, disabled, invalid, warning, optional-skip, and confirmation states.
- Overlay/panel resize states for actions, cards, board, player dossier, and log.
- Search/filter/sort states on card-heavy surfaces.

### Tier 3: Rare Or High-Density Edge Coverage

- All modules on with 5 players.
- Very dense logs.
- Huge opponent tableau.
- Fan milestones/awards and random MA.
- Star Wars content mixed into heavy card states.
- Synthetic endgame with every module scoring category non-zero.
- Extreme resource values and productions.
- Unusual card states: disabled, warnings, reserve units, cloned tag, self-replicating robots.
- Long labels, unfamiliar fan content, empty states, no-result filters, and nested overlay detail states.

## Suggested Future Fixture Packs

These are named packs to consider when the inventory becomes implementation work.

### `base-action-core`

Purpose: Make sure the core turn loop and payment/action UI is readable.

Modules: Base plus Corporate Era.

States:

- Early active turn.
- Play-card selection.
- Payment allocation.
- Standard project.
- Convert plants/heat.
- Milestone/award.
- Waiting player.

### `ux-turn-modes`

Purpose: Capture what the same game feels like when the player's attention and permissions change.

Modules: Base plus Corporate Era.

States:

- My turn, no action selected.
- My turn, action selected.
- My turn, action just resolved.
- My turn, only pass is meaningful.
- Not my turn.
- Passed for generation.
- Waiting after setup/draft.

### `ux-panel-mechanics`

Purpose: Verify that opening, expanding, resizing, and closing major surfaces works as a coherent desktop layout.

Modules: Primary heavy 4-player preset.

States:

- Board compact and full-screen.
- Cards tray hidden, default, enlarged, and full-screen.
- Log compact and full-screen.
- Player rail compact, quick expanded, and full dossier.
- Milestones/awards compact and full overlay.
- One extension panel compact and full overlay.
- 16:9 and 16:10 captures.

### `ux-cards-filter-matrix`

Purpose: Stress the hand/tableau tools that players use to decide what to play.

Modules: Primary heavy 4-player preset with enough mixed card types.

States:

- No filter.
- Search with results.
- Search with no results.
- Playable filter.
- Affordable filter.
- Type filter.
- Tag filter.
- Warning/blocked filter.
- Cards with actions/resources filter.
- Dense played tableau with grouping/sorting.

### `primary-heavy-4p`

Purpose: Match the user's main manual test setup.

Modules: Corporate Era, Promo, Venus Next, Colonies, Prelude, Prelude 2, Community, Ares, Pathfinders, CEOs. No Turmoil.

States:

- Setup with all choice groups.
- Early generation 2.
- Midgame dense hand/tableau.
- Colonies occupied.
- Venus and Pathfinders advanced.
- Ares hazards visible.
- Player dossier and log overlays.

### `primary-heavy-4p-with-turmoil`

Purpose: Test whether Turmoil can be added without breaking the heavy layout.

Modules: Same as `primary-heavy-4p`, plus Turmoil.

States:

- Turmoil board with delegates/events.
- Policy action state.
- Player influence/allied party visible.
- Generation transition log.

### `moon-underworld-delta`

Purpose: Stress side boards and extra player scoring data.

Modules: Moon, Underworld, Delta Project, Corporate Era.

States:

- Moon board midgame.
- Underworld revealed tokens and corruption.
- Delta lead/tie.
- Endgame with all module scoring visible.

### `five-player-density`

Purpose: Keep the player rail, opponent views, awards, and log honest.

Modules: Base plus a moderate set of card modules.

States:

- 5 players active/waiting/pass mix.
- Compact player overview.
- Quick tag/resources expansion.
- Full opponent dossier.
- Dense log with player filter.

### `endgame-all-scoring`

Purpose: Make the final review UI useful.

Modules: Heavy mix including Moon, Pathfinders, Underworld, Colonies, Venus, Turmoil.

States:

- Final board.
- Final player VP table.
- VP chart.
- Per-player VP details.
- Final log.
- Module scoring rows non-zero.

## Current Encoded Coverage

The inventory above is now represented by built-in fixture packs in
`scripts/visual-scenarios.mjs`. These fixtures are for UX/UI validation only:
they create legal games where convenient, then apply clearly synthetic visual
patches to force dense hands, tableaus, resources, logs, boards, side modules,
and endgame scoring. They are not rule checks.

Use `TM_LIST_SCENARIOS=1 node scripts/visual-scenarios.mjs` to list the current
catalog. The important baked packs are:

- `base-action-core`: core active/waiting table, action, payment, board hover,
  milestone/award, log, cards, and player dossier surfaces.
- `ux-turn-modes`: active, waiting, pass-oriented, selected-action, overlay-open,
  and feedback/log attention states.
- `ux-panel-mechanics`: the primary heavy desktop layout with opened panels,
  overlays, bottom-tray resizing, activity resizing, player dossier, cards, log,
  board, milestones/awards, Colonies, Venus, Ares, Pathfinders, and CEOs.
- `ux-cards-filter-matrix`: dense hand/tableau, card search, no-result search,
  playable/affordable/type/tag/warning filters, sort, selected card, and payment.
- `primary-heavy-4p`: the user's main four-player preset without Turmoil:
  Corporate Era, Prelude, Prelude 2, Venus Next, Colonies, Promo, community
  cards, Ares, Pathfinders, CEOs, two starting corporations.
- `primary-heavy-4p-with-turmoil`: the same heavy preset with Turmoil delegates,
  parties, global events, policy/influence, and the same primary module surfaces.
- `global-all-modules-wide-density`: five-player, all-module desktop stress
  fixture with dense synthetic player state and the full core/panel/card/module
  shot set for large and ultrawide screen checks.
- `colonies-venus-pathfinders-3p`: occupied colony tiles, visitor ships, colony
  track, Venus track, Pathfinders planetary tracks, cards, log, player, and board
  overlays.
- `moon-underworld-delta`: Moon board/rates, Underworld board/player tokens,
  corruption, Delta Project lead/tie state, Turmoil, player dossier, log, cards,
  milestones/awards, and resized layout.
- `five-player-density` and `base-5p-rail`: compact player rail, waiting/active
  contrast, player dossier, log, and milestone/award density with five players.
- `board-variants-ma`: alternate board, shuffled map, fan/random
  milestones/awards, board hover, board overlay, and MA overlay state.
- `endgame-all-scoring`: synthetic final review with VP table, VP details,
  charts, final Mars/Moon board, final log, and module scoring categories.

The runner now records coverage tags in `summary.json` and `index.md` so an
agent can find screenshots by surface or module. A skipped shot is expected only
when an agent manually forces `TM_SHOTS` across scenarios that do not contain
that module; built-in default shot lists should produce no skipped shots.

Useful focused runs:

```bash
TM_BASE_URL=http://localhost:8081 \
TM_VISUAL_OUT=/tmp/tm-primary \
TM_SCENARIOS=primary-heavy-4p \
TM_VIEWPORTS=1600x900,1440x900,1920x1080,1920x1200,2560x1440,3440x1440 \
node scripts/visual-scenarios.mjs
```

```bash
TM_BASE_URL=http://localhost:8081 \
TM_VISUAL_OUT=/tmp/tm-moon-underworld \
TM_SCENARIOS=moon-underworld-delta \
TM_CAPTURE_SETUP=0 \
TM_VIEWPORTS=1600x900 \
node scripts/visual-scenarios.mjs
```

## Open Design Questions For Implementation

- Should advanced visual fixtures be saved-game fixtures, synthetic model injection, or deterministic fast-play scripts?
- How much invalid-but-visually-useful state is acceptable if it is clearly labeled synthetic?
- Should module fixtures live in repo config JSON, skill references, or both?
- Which screenshots should be considered mandatory for every fixture pack?
- Should the scenario manifest include a human-written "why this exists" note for every shot?
- Should fixtures include 16:10 captures now, even though the main target remains 16:9 desktop?

## Non-Goals

- Exhaustively proving every card rule.
- Replacing engine tests.
- Producing automatic visual pass/fail judgments.
- Capturing mobile layouts before the desktop UX stabilizes.
- Keeping every future fixture legally reachable through normal play if model injection provides a clearer visual state.
