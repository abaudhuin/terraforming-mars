# UX Contract

This is the canonical, permanent acceptance contract for Terraforming Mars UI
work. It was extracted from recurring failures in the project's task history.
The short workflow in [../AGENTS.md](../AGENTS.md) is mandatory; this document
defines what its law identifiers mean.

## Product and interaction laws

### UX-01 — Show truthful interaction state

The UI must never imply intent the player has not expressed. A neutral action
state has no selected action. Switching actions fully deactivates the previous
mode, including map-placement, helper, tentative target, and payment state.

### UX-02 — Preserve spatial memory

Selecting, hovering, confirming, polling, or receiving another player's action
must not move unaffected cards, controls, panels, or the board. Card-strip
bounds and scroll offset stay stable. The action selector stays fixed while its
reserved detail region changes. Confirmation cannot create a new column or
resize the decision surface.

### UX-03 — Keep a visible decision spine

Every decision exposes one coherent path: chosen action, chosen object/target,
remaining requirements, cost or consequence preview, cancel/back, and one clear
commit control. Dynamic guidance belongs in reserved space above or below the
decision content, never as a lateral sibling that moves a card strip.

### UX-04 — Preserve table and strategic context

The board, global parameters, acting player, own economy, and current decision
remain visible whenever they affect the choice. Temporary surfaces must not hide
or compete with required global information.

### UX-05 — The board fits, centers, and remains operable

At each supported viewport and allowed resize, the map is fully visible,
overlays align with the planet, the board is optically centered in available
space, and important content is not clipped. Resize limits cannot create an
unusably small board or command region.

### UX-06 — Let collections scroll, not the game

Only true collections—hands, tableaux, logs, archives, and legitimately dense
module lists—may scroll. Each has one obvious scroll owner and an overflow cue.
The main game surface, action command region, current guidance, resource HUD,
map, and commit controls do not scroll.

### UX-07 — Preserve user-controlled layout across updates

Panel dimensions, collapsed state, scroll position, open inspection, and
relevant tentative context survive polling, another player's action, ordinary
refresh, and generation transition unless the underlying model invalidates
them.

### UX-08 — Cards are stable game objects

Cards use a consistent readable size within a context and show complete bounds.
Selection never moves the row. Hover may magnify visually but cannot affect
layout, scroll roots, payment, or nearby controls. Dense collections use an
explicit horizontal browser or large inspection surface.

### UX-09 — One game fact has one live truth

Rail, dossier, Focus, full log, module panel, and main table must agree about the
same model after server updates. A refresh must not be required to reconcile
tags, resources, active state, or consequences.

### UX-10 — Waiting is planning; history explains consequences

Waiting state retains planning and inspection tools. A resolved action is one
grouped event containing its related card, resources, production, draws, tracks,
tiles, and module effects. Full history may be verbose; persistent Focus stays
concise, readable, and live.

### UX-11 — Every player remains reachable

At normal two-to-five-player density, every player is discoverable, essential
status does not clip, self detail may remain rich, and opponents stay compact
with a one-click dossier. Essential opponent information is never hover-only.

### UX-12 — Open detail from the represented object

Player detail opens from the player, card detail from the card, colony detail
from the colony/module, and event detail from the event. Closing returns to the
exact prior task. Do not add redundant global entry points.

### UX-13 — Modules share one behavioral shell

Colonies, Turmoil, Moon, Pathfinders, Delta, Underworld, and
milestones/awards share board-relative placement, bounded responsive size,
consistent header and close behavior, Escape-to-close, predictable scroll
ownership, reliable hit testing, stable selected-object detail, and preserved
global context.

### UX-14 — Visual treatment communicates role

Status, navigation, filter, selection, hover, keyboard focus, warning, disabled,
destructive, and primary commit states have distinct meanings. Preserve the
board game's icons and physical-object identity; generic decoration cannot
replace meaningful game symbols.

### UX-15 — Prefer concise, placed copy

Copy answers the player's current question. Remove duplicated labels, repeated
helper messages, low-value headings, and prose players will not scan. Errors and
disabled reasons appear beside the control they explain.

### UX-16 — Visible controls are operable

Every visible interactive element is pointer-reachable, center-point
hit-testable, keyboard-focusable, adequately sized, unobscured, and paired with
a discoverable close/cancel route. Temporary panels support Escape. Non-actions
do not show action hover styling.

### UX-17 — Phase-specific tasks use purpose-built composition

Setup and research are comparative decisions, not long forms: constraints,
selection, and remaining money stay pinned without covering options. Production
and generation change explain deltas. Endgame shows winner, score breakdown,
final board, and history in an auditable composition consistent with the main
shell.

## Verification laws

### VERIFY-01 — Inventory states and invariants before editing

List affected neutral, hover/focus, selected, disabled/error, review/payment,
committed/result, waiting/other-seat, polling/reconnect, resize/collapse, and
module-combination states. For each, state what must not move, disappear, reset,
become stale, or become unreachable.

### VERIFY-02 — Verify claims, not artifact existence

Every named case declares the player task, expected state, invariant,
interaction, and manually inspected full-resolution artifact. “Screenshot
created,” “no browser errors,” and automated notes are operational observations,
never visual-quality verdicts.

### VERIFY-03 — Use the smallest relevant named set

Run all Priority-0 goldens for broad shell changes, affected component detail
cases for local changes, the relevant continuous-journey segment for behavior,
and extra module/viewports only when the blast radius reaches them.

### VERIFY-04 — Inspect actual pixels

Open named acceptance images at full resolution. Use original-pixel component
crops for typography, icon alignment, control geometry, and card composition.
Contact sheets are navigation aids only.

### VERIFY-05 — Exercise real transitions and multiple seats

Synthetic fixtures prove density and rare static states; they do not prove
engine reachability, reactive updates, or multiplayer behavior. The continuous
journey covers real setup, a real action and resource delta, seat handoff,
passing, polling without reload, and generation transition.

### VERIFY-06 — Require adversarial role separation

For every player-facing change that claims visual acceptance, an independent
subagent reviews the applicable contract, diff, and named evidence with the
explicit goal of disproving acceptance. It must be allowed to fail the work.
The implementation agent addresses findings and reruns affected evidence.

### VERIFY-07 — Control CSS blast radius

Before adding a global selector or specificity override, enumerate every
consumer, explain why component-local ownership is impossible, capture evidence
for those consumers, and remove superseded rules rather than stacking a final
override.

### VERIFY-08 — Prove build provenance

Before and after capture, the runner verifies the runner source, dirty-tree
fingerprint, local build freshness, base URL, and served client asset hashes in
memory. A mismatch fails capture. The screenshot directory remains PNG-only;
review records, when needed, belong to the external reviewer.

### VERIFY-09 — Preserve scope during acceptance

Once polish verification starts, change only defects against the active
contract. New redesigns, unrelated cleanup, and broad new fixture work form a
separate batch and invalidate previous acceptance evidence.

### VERIFY-10 — Report uncertainty precisely

Completion names the exact cases/invariants, journey segment, manually inspected
viewports, adversarial outcome, and anything unverified. Unit tests do not
replace browser evidence; fixtures do not replace engine flows; automation does
not replace visual judgment.
