# Terraforming Mars UX usability and UI coherence audit

Date: 2026-07-23
Scope: current local build, all maintained visual-scenario packs, player-facing usability, information clarity, interaction clarity, visual precision, and cross-surface coherence
Constraint: report only; no application code was changed

## Executive conclusion

The current table has a strong central board, recognizable Terraforming Mars visual language, a useful activity rail, readable project cards, and a promising three-zone structure. It is substantially more coherent than the legacy full-page table. It is not yet consistently usable as a complete game cockpit.

The largest problem is not that information is absent. It is that the interface does not reliably answer the player's next question in the place and moment where that question occurs. At several important stages it exposes many facts but weakens the decision hierarchy:

1. The active-turn surface starts in a selected sub-action instead of a neutral overview, so the UI can imply a decision the player did not make and waste most of the workbench.
2. At four and five players, opponents disappear from the persistent rail at the reference viewport, and the captured “scrolled” state does not provide a clear way to recover them.
3. Module inspection behaves as several unrelated implementations layered over the board. Panels can mask global parameters, show content behind themselves, preserve an unrelated action selection, clip content, or become extremely small on ultrawide screens.
4. Waiting is visually calmer, but it is not yet designed as a first-class planning and catch-up state.
5. Setup, pass, milestone/award, standard-project, card-action, payment, and colony flows use different selection and confirmation grammars. Players must relearn where to look for cost, eligibility, consequence, and commitment.
6. Visual heterogeneity is partly legitimate game identity and partly accidental UI debt. Physical card/module art should remain distinct; shells, buttons, state indicators, focus treatment, spacing, clipping, and confirmation vocabulary should not.

These findings are consistent with recurring public player feedback about digital Terraforming Mars: players want the board and their economy continuously visible, opponents easy to inspect, card information readable without losing place, other players' actions understandable, tile legality previewed, logs useful for catch-up, and avoidable clicks reduced. This is corroboration of player needs, not a claim that those reviewers tested this fork.

The recommended design order is therefore:

1. Make the table truthfully represent current mode and make every player reachable.
2. Standardize the decision grammar and preserve context through every action.
3. Establish one module-panel contract and one overlay contract.
4. Turn waiting and history into a real catch-up/planning loop.
5. Apply a UI-coherence pass only after those interaction contracts are stable.

## Method and evidence limits

### Current-build evidence

- Built the current checkout successfully with `npm run build`.
- Ran all 17 maintained visual-scenario packs at 1440×900.
- Captured 396 screenshots, with 0 capture failures, 0 page errors, and 0 console errors.
- Five Ares hover shots were skipped because the board or module-summary layer intercepted pointer events. Those skips are themselves interaction evidence.
- Ran focused 1920×1200 and 3440×1440 comparisons for the dense primary/all-module tables: 45 additional screenshots, 26 of them from a clean two-viewport all-module run with no skips or errors.
- Total screenshots reviewed in this audit: 441.
- Primary capture: `/tmp/tm-ux-audit-20260723-1440`.
- Wide capture: `/tmp/tm-ux-audit-20260723-wide`.

The visual scenarios use synthetic game data. Synthetic repetition can exaggerate log density, and incomplete synthetic history can distort a chart. Those cases are called out below. Layout, clipping, stacking, visible hierarchy, control semantics, and reachability are valid UI evidence.

### Existing material reviewed

This audit confronted, rather than simply repeated, the existing drafts:

- `docs/visual-test-cases.md`
- `docs/fork-ui-ux-research.md`
- `docs/ux-screenshot-audit-2026-07-07.md`
- `docs/ux-information-architecture.md`
- `docs/ux-current-ui-roast-prioritized.md`
- `docs/ux-p0-p1-system-fix-plan.md`
- `docs/ux-player-table-redesign.md`

The drafts' central information-architecture hypotheses are mostly sound. The fresh scenario run reveals current regressions and interaction contradictions that the earlier screenshot audit did not report.

### Player evidence

No moderated player test of this local build was performed. “Real-player validation” here means triangulation against public player reports from several digital implementations, plus independent inspection from the player's point of view.

- Steam reviewers repeatedly ask to keep resources, tags, cards, and victory-point information visible; to watch opponents' actions in real time; to preview legal placements; to avoid losing position in card lists; and to reduce confirmation/click overhead. They also mention keyboard shortcuts and clearer readiness confirmation. [Steam player reviews](https://steamcommunity.com/app/800270/negativereviews/?browsefilter=toprated&p=1)
- A setup complaint specifically describes the frustration of choosing a corporation before seeing the other starting information together. [Reddit setup discussion](https://www.reddit.com/r/TerraformingMarsGame/comments/1lij6sn)
- Players note that milestone/award judgment depends on production and resources, so hiding opponent state makes strategic decisions unreasonable rather than merely harder. [Reddit opponent-information discussion](https://www.reddit.com/r/boardgames/comments/m6smf1)
- Players praise being able to observe opponents' turns and flag card-text fit as important. [Reddit digital-edition discussion](https://www.reddit.com/r/boardgames/comments/c008yu)
- Reviews of digital versions repeatedly identify missing tooltips, no undo, weak endgame detail, and clunky logs, while praising automation and preservation of the board game's visual identity. [Stately Play review](https://statelyplay.com/2018/10/16/review-terraforming-mars/) and [Ars Technica review](https://arstechnica.com/gaming/2018/11/review-super-hot-board-game-terraforming-mars-goes-digital/)
- Current mobile reviews show that compact presentation can be learned, but asynchronous notifications, result recovery, and history remain important failure points. [Google Play reviews](https://play.google.com/store/apps/details?id=com.asmodeedigital.terraformingmars)

This evidence does not prove a particular solution. It does validate the underlying needs: persistent orientation, visible opponents, readable cards, understandable consequences, low-friction actions, recovery, and catch-up.

## Part I — What a player needs, by stage

The useful unit is not “which panels exist?” but “what question is the player trying to answer now?” A good table supports four levels at once:

- **Orient:** Whose turn is it, what phase/generation is this, what just changed, and what ends the game?
- **Assess:** What do I own, what can opponents threaten, and how close are milestones, awards, and global/module tracks?
- **Decide:** What are my legal options, their costs, targets, effects, and opportunity costs?
- **Commit and recover:** What will happen, is this irreversible, did it succeed, and can I understand or undo an error?

### 1. Setup and opening hand

The player needs to compare corporations, preludes, project cards, starting money, module rules, and map context as one opening decision. They also need progress, selection constraints, an immediately explained disabled Start state, and confidence that they can revise any earlier choice.

The mental loop is comparative, not linear: corporation changes card affordability; cards change corporation value; preludes change both. A long form that makes the player scroll between mutually dependent choices works against the decision.

### 2. Start of a turn

Before selecting an action, the player needs a neutral overview:

- what changed since their last turn;
- how many actions they may take;
- their current resources and productions;
- global parameters and module tracks near thresholds;
- opponents' actionable threats;
- legal action families, with unavailable families explained rather than silently absent.

The player does not yet need a milestone candidate, payment widget, or module sub-board to own the workbench. Selection should follow intent.

### 3. Choosing and resolving an action

Every action should answer the same sequence even when its content differs:

1. **Choose an action family.**
2. **Choose an object or target.**
3. **Review cost, legality, and consequence.**
4. **Commit with a specific verb.**
5. **Receive visible confirmation and see changed values.**

The board and own economy should remain visible whenever they are decision inputs. Opponent state, milestone/award standings, colony tracks, Turmoil policy, or other module context should be one inspection away without destroying the pending choice.

### 4. Waiting for others

Waiting is not an empty or disabled turn. The player wants to:

- understand the latest opponent action;
- compare what changed against their plan;
- inspect cards, players, board, milestones/awards, and modules;
- prepare their next action;
- know who is acting and whether the game is progressing;
- resume exactly where they were when their turn begins.

This is especially important in asynchronous play. A log alone is not a catch-up experience; the player needs a concise delta connected to affected objects.

### 5. Generation transition and production

The player needs an explicit explanation of income/production changes, new first player, research/draft obligations, threshold events, and any module phase. Numbers should visibly transition, not simply be replaced. This is the main bridge between tactical actions and strategic planning.

### 6. Late game

The player needs end-condition forecasting: remaining global steps, likely remaining turns, card/global/module points, milestone/award standings, and opponents' visible scoring engines. The interface should surface irreversible decisions and “this may end the game” consequences.

### 7. Final scoring and review

The player wants confidence in the result, not only a winner banner. They need category-by-category arithmetic, tie-break explanation, links from scoring categories to relevant cards/tiles, final board access, and a durable result/history view after the game.

### Player types the interface must support

- **New player:** needs plain-language labels, legal-option guidance, tooltips, and consequences without requiring symbol fluency.
- **Experienced player:** needs density, fast scanning, fewer clicks, stable spatial memory, and shortcuts.
- **Returning asynchronous player:** needs a delta since last visit and durable state restoration.
- **Five-player participant:** needs every opponent reachable without trading away the board or action context.
- **Module-heavy player:** needs rule/state/action boundaries between modules, and global values never obscured.
- **Spectator or finished player:** needs board, history, standings, and final state without active-turn controls pretending to be relevant.

## Part II — Scenario and UX audit

### Coverage verdict

The scenario suite is broad enough to reveal important table, overlay, density, module, and endgame defects. It is not yet broad enough to certify the full game experience.

| Covered well | Covered only superficially | Important missing coverage |
|---|---|---|
| Setup selections and scrolling; active/waiting table; 2/4/5-player density; hand filters/search/no-results; common action families; player/card/log overlays; core modules; board variants; resizing; endgame | Several module shots prove panels open, not that a decision can be completed; hover shots often look identical; “action idle” is already preselected; “player rail scrolled” does not demonstrate recovery of hidden players; board+M&A named shot does not visibly show M&A | Solo; research/draft; production/generation transition; no-legal-action state; partial/exact/overpayment and special payments; complete legal/illegal/selected space flow; disabled reasons; errors/retry/loading/stale/disconnect; undo; keyboard focus; 200% zoom; localization/long labels; color-vision checks; spectator midgame; actual module action and resolution flows |

Scenario tags and successful screenshots prove that a script reached a named state. They do not prove that the intended information is visible or the interaction is usable. The five failed Ares hovers are the clearest example: the page loaded without errors, but another layer intercepted the pointer.

### A. Setup — good progress, still not a comparative decision surface

Evidence: `base-action-core-1440x900-setup-initial`, `...-setup-corporation-selected`, `...-setup-scroll-bottom`, and equivalent heavy-module states.

What works:

- The sticky setup summary and progress chips make completion state easier to understand.
- Cards and corporations preserve the board game's visual identity.
- The final Start action remains findable after scrolling.

Problems:

- The selected corporation physically overlaps the next section heading in the captured state.
- The same “no project cards” warning appears both in the sticky summary and lower content, increasing anxiety without adding guidance.
- Player names truncate in the turn-order context.
- Dependent decisions are stacked vertically; the player cannot compare corporation, preludes, and projects as a single loadout.
- The large unused right side suggests layout space exists but is not allocated to comparison or rule/context help.
- Board and module context fall below the fold.
- “YOUR TURN” is shown during setup, where “Choose starting setup” would be more truthful.

Assessment: **High usability issue.** The setup can be completed, but it creates memory and scrolling work at the first and most comparison-heavy decision.

### B. Neutral turn state — currently not neutral

Evidence: most `...-post-setup-table-active` and `...-post-setup-action-idle` captures.

The workbench opens with “Claim a milestone” selected and “Terraformer” preselected. This is not a harmless highlight: it tells the player the system has entered a milestone decision, leaves a large empty confirmation stage, and makes the current mode ambiguous. Source inspection of `src/client/components/OrOptions.vue` confirms the first option is initialized as selected when no explicit initial option exists; this is not only synthetic fixture data.

The central board is strong here: it remains the most immediately understandable surface and preserves global spatial context. The surrounding cockpit, however, fails to establish a clean “review, then choose” moment.

Assessment: **Critical interaction issue.** The UI must not imply player intent before the player acts.

### C. Player rail and opponent awareness — strategically incomplete at common density

Evidence: 4-player and 5-player `table-active`, `table-waiting`, `player-rail-scrolled`, and `overlay-player-opponent` captures.

- At 1440×900, a four-player table shows the current player and only two opponents; the fourth is absent from the persistent rail.
- At five players, only the current player and two opponents are persistently visible; players four and five are absent.
- The “player-rail-scrolled” capture does not visibly expose the missing players or a meaningful scroll affordance.
- The activity stream can mention Scenario 5 while the left rail does not show that player, creating a direct contradiction.
- When visible, opponent economy rows are useful but extremely compact; names, timers, resource counts, productions, and eye controls compete at small sizes.

The player overlay is a helpful fallback and supports one-click dossier inspection, including economy, tags, cards, and player log. It should supplement a trustworthy rail, not compensate for opponents becoming undiscoverable.

Assessment: **Critical strategic-usability issue.** Public player feedback strongly validates the need because awards, milestones, attacks, and timing depend on opponent information.

### D. Waiting state — visually calmer, functionally underdeveloped

Evidence: `...-post-setup-table-waiting` across base, primary-heavy, and all-module scenarios.

What works:

- The hand remains available rather than replacing the table with a waiting message.
- The activity rail and board remain visible.

What is missing:

- No concise “since your last turn” digest.
- No explicit planning mode or saved candidate action.
- No strong statement of who is acting, what the player may still inspect, or what will happen when control returns.
- The bottom hand clips cards and can show a partial card without a strong horizontal-scroll cue.
- There is no clear change linkage from activity text to the affected player, card, tile, or track.

Assessment: **High usability issue**, particularly for asynchronous play.

### E. Action grammar — individually workable, collectively inconsistent

#### Pass

Evidence: `ux-turn-modes-1440x900-post-setup-action-pass-selected`.

The surface shows two action slots, an almost empty workbench, and a small Pass control. It does not clearly explain that passing is irreversible for the generation, what opportunities remain, or why a player might choose it. The pass icon is almost black and visually disappears.

Assessment: **Critical confirmation issue** because the consequence is unusually large.

#### Play card and payment

Evidence: `...-action-play-card-payment` at 1440×900, 1920×1200, and 3440×1440.

Strengths:

- The selected card is readable.
- The payment ledger exposes available resources, exchange rate, amount, maximum, and total.
- The wide state can display many card candidates.

Problems:

- At 1440×900 only roughly two and a half cards are visible; the payment panel covers the remaining horizontal capacity without a strong continuation cue.
- The payment panel lacks a concise post-action consequence preview.
- The vocabulary switches to “PLAY CARD,” while other structurally similar flows say “CONFIRM,” “TAKE ACTION,” “CLAIM,” “FUND,” or “TRADE.”
- The ultrawide state fits many cards by making the entire cockpit visually tiny; additional width improves quantity more than legibility.

Assessment: **Medium-high**. The ledger is one of the better action surfaces and should become a template for other flows.

#### Standard projects

Evidence: `base-action-core-1440x900-post-setup-action-standard-projects`.

Power Plant is preselected and 11 M€ is already assigned before explicit player intent. Only the first few projects are visible although more are playable. “CONFIRM” does not name the consequence, and target-dependent projects do not transition into a strongly framed board-selection mode.

Assessment: **High**, for the same false-intent reason as the neutral table plus weak target framing.

#### Milestones and awards

Evidence: active-table auto-selection and M&A panel captures.

The action list preselects a milestone. The separate M&A panel can be cropped to milestones while awards sit below; the award action itself presents names and a generic Fund control without enough nearby cost, funded state, standings, qualification, or predicted scoring context.

Assessment: **High strategic-usability issue**. It forces mental joins between the action workbench, board button, opponent rail, and module-like panel.

#### Blue-card actions

Evidence: `action-choice-stack-1440x900-post-setup-action-blue-card`.

The corporation/card edge is clipped, the chosen effect is comparatively small, “TAKE ACTION” sits far from the selection, and most of the workbench is empty. The label says what control class is being used, not the effect that will occur.

Assessment: **Medium-high**.

#### Colony trade

Evidence: colony-action states and Colonies inspection panel.

The payment/fleet/colony elements are more coherent than several other actions, but the flow lacks a plain instruction such as “Choose a colony,” preselects the first payment option, and relies on small symbols. Hover captures are visually indistinguishable, so current coverage does not establish hover feedback or target clarity.

Assessment: **Medium**.

### F. Cards overlay — strong search, ambiguous control semantics

Evidence: the 18-state `ux-cards-filter-matrix` pack plus dense overlay captures.

What works:

- Search updates the count.
- No-results gives a clear “NO CARDS MATCH” response.
- Project cards remain readable and retain useful visual identity.
- The overlay preserves the underlying table as context.

Problems:

- PLAYABLE, AFFORDABLE, and WARNING filter the set, while TYPE, TAG, and COST reorder it. All use the same pill component and active gold treatment.
- ALL is a reset but looks like another category filter.
- Identical styling makes “what changed?” unnecessarily hard to learn.
- Lower rows clip at the modal boundary without a strong scroll cue; the automated refresh state found five active scrollable regions, suggesting competing scroll ownership.
- On 3440×1440 the modal remains a relatively small fixed island with very small cards and large unused screen area.

Assessment: **Medium-high information-architecture issue.** Search itself is a clear success.

### G. Log and activity — activity is promising; full history is not yet a catch-up tool

Evidence: `overlay-log`, activity Focus/History, and player-log tabs.

The right activity rail is useful because it preserves recent context next to the board and shows a related card. The full log, by contrast, is a large gray sheet of repetitive text with generation buttons, little event hierarchy, weak linkage to affected game objects, and large dead areas. Synthetic fixtures exaggerate repetition, but not the structural absence of grouping and linkage.

The player dossier's log tab can become a narrow wrapping column with uneven empty space. A player can retrieve facts, but cannot quickly answer “what changed since I last acted?”

Assessment: **High** for asynchronous and returning players; **medium** for synchronous play.

### H. Module panels — the largest source of interaction and visual fragmentation

Evidence: Colonies, Pathfinders, Turmoil, Moon, Delta, Underworld, Ares, and all-module states at 1440×900, 1920×1200, and 3440×1440.

Cross-module defects:

- Opening a module does not establish a single exclusive mode. The unrelated selected milestone remains active underneath.
- Panel content is not consistently masked; M&A or other module labels can remain visible through/behind the active panel.
- Panel sizing differs radically. Some panels fill the stage and clip; others become a tiny centered artifact on ultrawide screens.
- Close control, title-bar density, internal scrolling, legends, and selection feedback are not governed by one panel contract.
- Module buttons can cover oxygen, ocean, temperature, and Ares readouts in the dense table.
- The activity rail can collapse into a very narrow strip when a module opens, changing the surrounding layout without a clear reason.

Per-module observations:

- **Colonies:** at 1440×900 the last colony is partial and horizontal continuation lacks a clear cue. At 3440×1440 all colonies fit, but the panel and text become very small rather than using the width for legibility.
- **Pathfinders:** the lower row clips; unrelated labels remain visible behind it.
- **Turmoil:** a bright white/brown physical-board style is inserted into a dark shell; its lower parties clip at 1440×900. On ultrawide, the whole panel becomes a small central rectangle. The physical art itself is legitimate; the shell, scaling, and clipping are the incoherence.
- **Moon:** it uses much less of the available stage than its information density warrants and leaves large empty regions.
- **Delta:** it fits, but its symbols, rewards, and state are cryptic without a nearby legend or explanatory focus state.
- **Underworld:** the named “open” state exposes the Tools popover rather than a dedicated gameplay surface. Tokens/corruption, spectator link, purge warning, and a cramped “hours. Why?” string mix unrelated system and game concerns.
- **Ares:** five independent scenario attempts could locate the hazard indicator but could not hover it because the board or module-summary layer intercepted pointer input.

Assessment: **Critical system-coherence issue.** Module art may be heterogeneous; module interaction behavior must not be.

### I. Resizing and responsive use of space

Evidence: `resized-layout` captures and 1920/3440 comparisons.

- The supported resize affordance can create a tiny board, clipped player rows, a truncated action list, and a huge empty workbench.
- At 3440×1440 the principal board, rail text, controls, and module content remain small while dead space expands.
- Extra width sometimes increases the number of cards/colonies visible, but not their comfortable reading size or the clarity of the hierarchy.
- The resize handle/scroll affordances are extremely subtle, so players may not understand either the cause or the recovery path.

Assessment: **High layout-system issue.** This is not a request to scale everything uniformly; it is a need for bounded readable sizes and intentional distribution of surplus space.

### J. Endgame — clear winner, incomplete auditability and polish

Evidence: `endgame-all-scoring` results, VP details, charts, and final-board states.

What works:

- Winner and total-score table are immediately understandable.
- Category breakdown and final board are available.
- The darker results styling is more coherent with the current shell than legacy results pages.

Problems:

- Two missing-glyph squares appear in the score-table header.
- Player rows are highly saturated and names are underlined, creating a mixed visual grammar.
- The chart spans generations 1–12 while the fixture contains activity only through generation 4, producing a large dead plot. This may be a fixture/history mismatch, but the chart should scale to actual data.
- VP details start as a long page without persistent winner/total context or links back to relevant sources.
- Final board begins with an orphan “Generation” label before “Final situation.”
- Purple back-arrow controls are visually legacy and unrelated to the current button system.

Assessment: **Medium-high**. The result is understandable but not yet pixel-clean or fully auditable.

## Part III — UI precision and coherence audit

### Preserve meaningful heterogeneity

The following differences carry game meaning and should not be flattened into a generic dashboard:

- project-card colors and physical card proportions;
- player colors;
- corporation art;
- resource and tag iconography;
- the physical-board identity of Mars and expansion boards;
- module-specific thematic color and illustration.

Homogeneity should apply to behavior and framing, not erase the board game's identity.

### Remove accidental heterogeneity

#### 1. Control-state color is overloaded

Gold can mean current turn, selected option, active filter, hovered border, panel title, or primary confirmation. The filled “YOUR TURN” chip looks actionable even though it is status. State needs a stable grammar: status, selection, focus, hover, warning, disabled, and primary action should not all compete for the same accent.

#### 2. Similar decisions use different verbs and placement

CLAIM, FUND, PASS, TAKE ACTION, PLAY CARD, CONFIRM, and TRADE can all be valid verbs, but their placement, review information, and commitment strength differ. Use specific verbs, then standardize their location and pre-commit summary. Generic CONFIRM should be avoided when a concrete action exists.

#### 3. Similar-looking pills do different jobs

Cards filters, sort controls, reset, status chips, and sometimes navigation share compact rounded rectangles. The result is visual consistency without semantic consistency. Filters should show inclusion state; sorts should show key and direction; reset should read as a reset.

#### 4. Legacy surface styles remain visible

The plain full-log sheet, white generation buttons, purple result back arrows, bright orange setup warning slabs, physical M&A badges, and differing close-button hover colors come from visibly different systems. Some are content art; several are shell/control debt.

#### 5. Icon quality and meaning vary

The hand/action glyph is reused broadly, the pass symbol nearly disappears, and rocket/CEO/back-arrow styles do not belong to one icon family. Icon-only controls often lack an immediately visible text equivalent or tooltip evidence.

#### 6. Typography falls below comfortable scan size

Resource metadata, productions, timers, activity details, module labels, and ultrawide content frequently render around a visually tiny scale. Long names truncate without a clear expansion mechanism. Capitalization also varies among physical art, UI labels, and action verbs.

#### 7. Spacing and clipping expose implementation boundaries

Examples include the setup corporation/heading collision, partial opponent rail, partial hand card, partial colony, clipped Turmoil parties, cropped action list, content behind module panels, and orphan result labels. These are precision defects, not matters of taste.

#### 8. Scroll and resize affordances are too hidden

Partial content is often the only cue that more exists. Thin internal boundaries, hidden scrollbars, multiple active scroll regions, and a subtle resize line make input ownership hard to predict.

#### 9. Focus and target clarity are not proven

The suite does not cover keyboard focus, and hover states often appear indistinguishable. WCAG 2.2 expects visible focus and a minimum target size of 24×24 CSS pixels in most cases; several compact icon controls warrant direct measurement and keyboard testing. [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) and [W3C focus-appearance guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)

### Proposed UI contract

Every non-physical UI surface should share:

- one spacing scale and minimum readable type scale;
- one corner/border/shadow system;
- one title bar and close/back pattern;
- one status-chip grammar;
- one filter grammar and a distinct sort grammar;
- one selected/hovered/focused/disabled/error grammar;
- one persistent location for the primary commit action;
- one explicit overflow cue and predictable scroll owner;
- one module-panel frame with bounded responsive sizing and reliable masking;
- one action frame: instruction, choices, review/consequence, commit, result.

This contract should wrap the physical game content rather than restyle it.

## Prioritized findings

| Priority | Finding | Why it matters | Primary evidence |
|---|---|---|---|
| P0 | Table begins with an action/option already selected | Falsely represents player intent and corrupts mode clarity | Most active/idle table states |
| P0 | Not all opponents are persistently reachable at 4p/5p | Removes strategically necessary information | 4p/5p active, waiting, and rail-scrolled states |
| P0 | Module buttons/panels mask globals, leak underlying content, and preserve unrelated action mode | Creates contradictory state and can hide game-critical values | All-module active plus module-open states |
| P0 | Ares hazard hover target is intercepted in five scenarios | A visible information target is not pointer-reachable | Five skipped `ares-hazards` shots |
| P0 | Pass lacks prominent irreversible-consequence framing | A low-information click can end all actions for a generation | `ux-turn-modes ... action-pass-selected` |
| P1 | Setup is a scrolling form rather than a comparative loadout | Increases memory load and produces visible overlap/duplicate-warning defects | setup initial/selected/bottom states |
| P1 | Waiting has no delta/catch-up/planning model | Wastes opponent time and weakens async play | waiting states and full log |
| P1 | Action families do not share a choose-review-commit grammar | Raises learning cost and makes irreversible state hard to judge | pass, standard projects, card, blue-card, colony, M&A |
| P1 | Resize/ultrawide behavior creates tiny content and dead space | More screen does not create more usable information | 1920/3440 and resized states |
| P1 | Module panel sizing, overflow, masking, and close behavior are inconsistent | Each expansion feels like a different application | Colonies, Pathfinders, Turmoil, Moon, Delta, Underworld |
| P1 | M&A decisions lack integrated standings/cost/consequence | Forces strategic mental joins across surfaces | action and M&A panel states |
| P1 | History is not organized around player catch-up questions | Makes asynchronous recovery slow and error-prone | activity/full log/player log |
| P2 | Cards mix filters, sorting, and reset under identical pills | Makes state changes harder to predict | cards filter matrix |
| P2 | Scroll/continuation cues are weak | Partial cards, colonies, actions, and players look like clipping | multiple 1440 states |
| P2 | Endgame contains missing glyphs and legacy controls | Reduces polish and confidence in scoring | endgame result/detail/final-board states |
| P2 | Icon, typography, and status treatments are heterogeneous | Slows scanning and makes controls/status harder to distinguish | cross-scenario visual comparison |

P0 here means “resolve before treating the redesigned cockpit as interaction-complete,” not necessarily “the server cannot run.”

## Recommended redesign sequence

### 1. Establish truthful modes

- Default to no action and no sub-option selected.
- Define explicit modes: setup, waiting, turn overview, choosing action, choosing target, reviewing payment/consequence, committed/resolving, inspecting overlay, finished/spectating.
- A temporary inspection surface must not silently change or visually compete with the pending action.

### 2. Make orientation persistent

- Guarantee reachability of every player at every supported player count.
- Keep phase/generation, acting player, own economy, global parameters, end conditions, and module thresholds visible or one stable reveal away.
- Separate status from controls visually.

### 3. Standardize all actions

- Use the same four-part frame: instruction, choices, review, specific commit verb.
- Do not preselect consequential options.
- Explain disabled choices inline.
- Show cost and projected delta before commitment.
- Give pass and other irreversible actions a consequence-specific confirmation.
- Provide success feedback anchored to changed values.

### 4. Turn waiting/history into a loop

- Summarize changes since the player's prior turn.
- Link event entries to player, card, tile, track, or module.
- Preserve inspected overlay, scroll position, and tentative plan when the turn changes.
- Distinguish live activity from full audit history.

### 5. Unify module framing

- One responsive container, title bar, close action, backdrop/masking rule, overflow rule, and selected-object detail region.
- Never cover global parameters with module launch controls.
- Give each module a plain-language current state, available decisions, threshold/reward explanation, and direct route into its action.
- Retain thematic boards inside the common frame.

### 6. Apply visual-system cleanup

- Inventory every button, pill, icon-only target, modal title bar, warning, back/close control, scrollbar, and resize handle.
- Replace accidental variants with the shared contract.
- Fix collisions, bleed-through, partial rows, missing glyphs, and orphan labels at every reference viewport.
- Measure rather than eyeball target size, focus visibility, contrast, text truncation, and zoom behavior.

## Acceptance checklist for a future scenario audit

A future “all clear” should require visible evidence, not only screenshot generation:

### Orientation

- [ ] No action or option is selected before player input.
- [ ] All players are reachable at 2–5 players without losing the pending action.
- [ ] Acting player, generation/phase, own economy, global parameters, and end condition are unambiguous.
- [ ] Opening a module never hides required global information.

### Decision flows

- [ ] Every action demonstrates neutral, hovered/focused, selected, disabled-with-reason, review, committed, and result states.
- [ ] Payment covers insufficient, partial, exact, excess, max, special resource, and cancellation/recovery cases.
- [ ] Space selection covers legal, illegal-with-reason, selected, and resolved states.
- [ ] Pass clearly states its irreversible effect.
- [ ] No consequential choice is preselected.

### Temporal states

- [ ] Waiting shows a meaningful latest-change and since-last-turn digest.
- [ ] Generation transition visibly explains production/research/first-player/module changes.
- [ ] Async refresh and reconnect restore mode, overlay, and scroll position.
- [ ] Completed games remain inspectable with durable result and history.

### Density and accessibility

- [ ] 1440×900, 1920×1200, and 3440×1440 each use space intentionally without tiny or clipped primary content.
- [ ] Browser zoom at 200% remains operable.
- [ ] Keyboard-only flows expose visible, unobscured focus.
- [ ] Icon-only controls meet target-size and accessible-name requirements.
- [ ] Long player/card/module labels and a localization expansion case do not collide.
- [ ] Meaning does not depend on player color alone.

### Visual coherence

- [ ] Status, navigation, selection, filter, sort, warning, and commit controls are visually distinct by role.
- [ ] All overlays and module panels use the same behavioral shell.
- [ ] Physical game art remains thematic but never determines shell behavior.
- [ ] No overlap, bleed-through, partial row without an overflow cue, missing glyph, or legacy navigation control remains.

## Final confidence statement

Confidence is high in the structural findings because they recur across many independent scenarios and survive viewport comparison. Confidence is also high that the core player-needs model is truthful: the same needs recur across public player feedback, board-game decision logic, and the observed interface failures.

Confidence is lower for accessibility compliance, error recovery, generation transitions, solo play, spectator play, and complete module interactions because the present scenario suite does not exercise them. The correct conclusion is not that those areas pass; it is that they remain unverified. A short moderated test with new, experienced, asynchronous, and module-heavy players should follow the scenario fixes, using task success, wrong-action rate, time-to-orient, inspection count, and recovery behavior rather than preference questions alone.
