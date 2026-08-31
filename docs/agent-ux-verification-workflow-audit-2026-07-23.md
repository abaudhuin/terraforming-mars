# Agent UX Verification Workflow Audit

Date: 2026-07-23

## Executive conclusion

The core problem is not that the agent does too little verification. It is that the
current workflow confuses four different things:

1. a state was generated;
2. the page did not crash;
3. a small set of geometric heuristics passed;
4. the experience is visually coherent and usable.

The current tooling proves the first two reasonably well and parts of the third. It
does not reliably prove the fourth. Large screenshot counts therefore create false
confidence.

More emphatic prompting such as "iterate until you cannot find anything" will not
solve this by itself. The completion gate, repository architecture, scenario
contracts, and review workflow must change.

The highest-leverage changes are:

- stop treating the legacy scenario lab's note count as a visual-quality verdict;
- maintain a small, user-approved golden set of critical screens and transitions;
- verify continuous real play flows, not only isolated synthetic snapshots;
- encode stable UX laws in repository instructions instead of repeating them in
  prompts;
- split large UI batches into independently accepted interaction contracts;
- reduce the `player_table.less` cascade before more broad redesign work;
- use an independent, fresh-context review before calling a large UI batch done.

## Evidence from the project history

### Broad green sweeps were followed immediately by obvious failures

An earlier P0/P1 pass reported:

- 566 screenshots;
- no skipped shots;
- no browser errors;
- no visual notes.

The next user review found, in one screenshot:

- truncated active/pass status;
- unusably truncated cards;
- a useless reorder toggle;
- a useless top Cards button.

Subsequent turns then found card hover reflow, text clipping caused by inherited
`white-space: nowrap`, poor dossier layout, broken log clicks, cropped previews, and
misaligned tag icons.

The latest remediation pass reported:

- 17 scenario families;
- 424 screenshots;
- 175 coverage tags;
- no scenario failures, skips, page errors, or console errors;
- 465 client tests passing.

The next task supplied five screenshots showing duplicated helper messages,
misplaced text, card rows shifting after selection, a pass flow widening
horizontally, and broken text placement. The repair found a shared structural
cause: dynamic helper rows were inserted into many action selectors, but their
styling was scoped to setup, so other action grids placed the text in unintended
columns.

This is the clearest diagnosis: screenshot volume and green summaries are not
correlated strongly enough with player-visible quality.

### The verification loop sometimes works, but only after a specific defect is known

There are good examples in the history:

- a full-resolution crop exposed a player header squeezed to initials after a
  broader scenario run had reported no visual notes;
- computed rectangles found the self-player card was still a row flex container;
- a geometry comparison proved a selected card no longer moved the card strip;
- browser click assertions found that a global log worked while a per-player log
  had no usable history;
- comparing the always-mounted player summary with the newly opened dossier exposed
  stale reactive tag counts;
- an engine-driven solo post-card flow exposed an action panel hidden under the
  passive card desk.

These successes share one property: the expected invariant was explicit and
measured. "Look at many screenshots" was weak; "the card strip's x-position and
width must not change after selection" was strong.

### The same agent authors and approves the change

The historical pattern shows confirmation bias. After implementing a design, the
agent tends to inspect screenshots for whether the intended fix appears, not as a
fresh player trying to disprove the whole screen. It also tends to stop when the
scenario report is green.

The user is currently acting as the independent adversarial reviewer. That is why a
three-minute play session finds issues the implementation task did not.

### Long, broad tasks lose local constraints

Several UI tasks run for tens of minutes, create hundreds of artifacts, touch many
unrelated surfaces, and cross context compaction. A single batch has covered active
turns, waiting, modules, filters, setup, overlays, endgame, accessibility, and
resizing.

This increases the chance that an earlier local rule is forgotten. Examples of
stable rules that should not depend on conversational memory include:

- selecting a card must never move the card row;
- explanatory text must not be placed to the left of cards;
- a confirmation control must not resize its choice surface;
- inspection panels must not hide required global information;
- status, navigation, selection, and commit controls must not share the same visual
  treatment.

## Tooling diagnosis

### The legacy scenario lab was a fixture generator, not a visual oracle

The former scenario skill and deleted state inventory explicitly said that the
lab is not a pass/fail suite. Its PNGs are evidence to inspect.

The automatic note collector currently detects a limited set of conditions:

- document or major-surface bounds outside the viewport;
- more than four active scrollable regions;
- overflowing card content in the action panel;
- clipped colony choices;
- workflow buttons outside one command-detail container;
- clipped board paint;
- failed colony wheel movement;
- card hover changing selected scroll roots;
- one overlay state-preservation contract.

It does not detect:

- duplicated or contradictory copy;
- content placed in the wrong grid column;
- optical alignment or inconsistent spacing;
- inappropriate color or control hierarchy;
- text that is technically inside a box but unreadably narrow;
- selection causing a nearby region to recompose unless a targeted comparison was
  written;
- a screen that is technically clickable but cognitively unclear;
- stale data between two representations of the same player;
- transient problems after polling, action submission, generation change, or
  reconnect;
- the interaction target being visually covered unless that exact hit-test is
  scripted;
- whether a synthetic state can occur correctly through the real engine.

Therefore "0 visual notes" means only "none of the implemented heuristics fired."
It must never be reported as "the UI is visually clean."

### Full-resolution review is inconsistent

The skills correctly require inspecting raw PNGs, but broad runs make that
impractical. Reviewing 424 or 566 full-resolution images carefully is not credible
within one implementation task. In practice, the agent reviews a sample, often
downscaled. Small alignment and typography defects disappear in that mode.

The history shows that actual-pixel crops find defects that contact sheets and
whole-screen previews miss.

### Synthetic fixtures and snapshot states miss temporal bugs

Synthetic patches are valuable for density and module coverage, but several real
bugs appeared only through time:

- stale player tags after polling;
- action/workbench mode after playing a card in solo;
- focus grouping after a real sequence of log messages;
- popups, scroll, or sizing changing after another player's action;
- assets served from a stale or different worktree.

A static screenshot cannot prove these contracts.

### Build and server provenance is too easy to get wrong

The history contains multiple cases where:

- an occupied port served a different worktree;
- Vue changes were not in the served bundle although CSS was rebuilt;
- a scenario run observed stale assets;
- a browser path was unavailable and tests were substituted for visual evidence.

Every artifact should identify the exact source it rendered.

## Architecture diagnosis

`src/styles/player_table.less` is currently about 10,746 lines. A large region
disables duplicate-selector linting, and comments describe "final cascade lock"
rules intended to beat later legacy layout. `PlayerHome.vue` is about 1,371 lines.
The current uncommitted batch added roughly 1,100 lines to the table stylesheet.

This architecture encourages the agent to:

1. find the selector that appears to win;
2. add a more specific override near the end;
3. verify the current screenshot;
4. unintentionally change another state governed by the same broad selector.

The history repeatedly contains phrases such as "a later rule resurrected it,"
"specificity issue," "older block still tried to," and "final override." Those are
not isolated mistakes. They are evidence that the cascade is no longer locally
reasoned about.

No amount of screenshot prompting will fully compensate for this. The cost of each
new UI change grows until layout ownership becomes local again.

## Changes to the project setup

### 1. Add a root `AGENTS.md` with stable UX laws

There is no repository `AGENTS.md` today. Add one so every task begins with the same
non-negotiable rules. It should include:

- Do not report screenshot count or zero visual notes as proof of visual quality.
- Any changed interaction must list its neutral, selected, review, committed, and
  refreshed states before editing.
- Selection must not move unaffected cards, labels, or panels.
- Do not put dynamic explanatory text beside a card strip; reserve stable space
  above or below it.
- Do not add broad rules to `player_table.less` without identifying every matched
  state and explaining why component-local ownership is impossible.
- A browser artifact must include commit SHA, dirty-tree fingerprint, port, and
  served bundle build time.
- Visual completion requires full-resolution review of a named critical set and a
  continuous play flow.
- Unverified means unverified. Browser tests may not be silently replaced by unit
  tests.

These rules should be short enough that the agent actually applies them.

### 2. Create a small UX contract document

Keep player preferences and interaction laws separate from a dated audit. A
`docs/ux-contract.md` should define:

- layout invariants;
- control roles and visual grammar;
- card-strip behavior;
- panel ownership;
- resize behavior;
- player information consistency;
- focus/history behavior;
- target viewports;
- what "pixel-perfect" means operationally.

This becomes the design source of truth. Prompts can reference it instead of
restating preferences.

### 3. Verify build identity during capture

The screenshot runner should verify in memory:

- git commit;
- dirty-tree fingerprint;
- build timestamp;
- worktree path;
- server PID and port;
- client asset hash.

Any mismatch should fail the run. Screenshot output stays PNG-only; reviewer
findings and acceptance records remain outside the runner.

### 4. Reduce the global CSS cascade before another broad redesign

Do not attempt a complete rewrite. Extract the highest-change contracts first:

- action/workbench shell;
- card choice strip;
- player rail card;
- activity Focus card;
- modal/module shell.

Each should own its layout in a component-scoped class with a documented DOM
contract. Shared tokens can remain global. Remove obsolete rules after each
extraction rather than adding another final override.

Success should be measurable: fewer duplicate selectors, fewer specificity locks,
and a smaller match surface per component.

## Changes to the verification tooling

### 1. Maintain a small canonical golden suite

Create approximately 12–20 deterministic, user-approved reference images rather
than treating hundreds of generated screenshots as equal.

The first golden set should include:

- setup initial and partially selected;
- neutral action menu;
- selected project card before and after payment details;
- pass confirmation;
- solo post-card second action;
- waiting player;
- four/five-player rail;
- two-card Focus compact and expanded;
- player summary and dossier for the same model;
- one module drawer;
- card overlay;
- endgame.

Use stable seeds, fonts, viewport, animation disabling, and masks for genuinely
dynamic fields. Pixel diffs should be a review gate, not automatically accepted.

Broad fixture generation remains useful for discovery, but the golden
suite becomes the regression gate.

### 2. Add interaction-specific invariants

Each scenario should declare what it proves. Examples:

- card-strip `x`, `y`, `width`, and first-card bounds are unchanged after selection;
- no normalized helper message appears twice in the same action surface;
- confirmation appears below/within the decision region and does not create a new
  horizontal column;
- every visible primary button passes `elementFromPoint` hit testing at its center;
- all visible labels have non-zero readable width and no clipped text range;
- opening a module preserves required global values and masks conflicting actions;
- player rail and dossier show equal tag/resource values after a model update;
- polling/reload preserves overlay, scroll, selected inspection, and rail sizes;
- keyboard focus is visible and unobscured;
- controls meet a minimum target size;
- 200% browser zoom remains operable.

Generic heuristics are useful, but targeted contracts catch the actual regressions.

### 3. Add continuous engine-driven journeys

At least one gate must behave like the user's three-minute test:

1. create a game;
2. complete setup;
3. select and deselect cards;
4. play a card and pay;
5. take the second action;
6. inspect Focus and History;
7. switch player seat;
8. open and close a player dossier and module;
9. pass and reach the next generation;
10. verify preserved layout and current data.

Run this at the user's main viewport and once at 1440×900. Capture transition
screens, not only endpoints.

### 4. Produce an evidence manifest

For every named critical screenshot, the agent should record:

- expected player task;
- expected invariant;
- actual result;
- pass/fail;
- full-resolution file;
- whether it was manually inspected;
- whether it came from a real or synthetic state.

A task cannot close with unchecked critical entries.

### 5. Use a fresh-context visual reviewer

For broad UI changes, a second task or agent should receive:

- the UX contract;
- the diff summary;
- the before/after critical screenshots;
- no implementation rationale.

Its role is to find defects, not approve the implementation. Any findings return to
the implementation loop. This removes the user from being the only independent
reviewer.

## Changes to the working method

### Prefer narrow contracts over broad batches

A better sequence for a large remediation is:

1. truthful neutral/selected action state;
2. card selection and payment stability;
3. pass and confirmation;
4. waiting/history;
5. player rail/dossier;
6. module shell;
7. setup;
8. endgame and visual cleanup.

Each batch gets its own golden comparison, interaction invariants, continuous-flow
checkpoint, and commit. Do not begin the next batch while the current one has open
visual findings.

Broad sweeps run after these gates. They are a safety net, not the primary proof.

### Freeze scope during the polish gate

Once behavior is implemented:

- no opportunistic redesigns;
- no new scenario features unless required to expose a missing state;
- no unrelated selector cleanup;
- no deployment from a dirty mixture of unrelated work;
- only defects found by the acceptance gate are changed.

This keeps verification artifacts valid.

### Require a short real-play audit before deployment

Before a large UI deployment, perform a timed five-to-ten-minute play journey from a
fresh game and write down every observed friction before editing again. This is the
closest automated approximation to the user's current review behavior.

### Make completion language precise

Bad:

> 424 screenshots, zero visual notes; the UI is clean.

Good:

> The scenario generator reached 17 fixture families with no browser errors. I
> manually reviewed 14 named critical images against 31 explicit invariants; all
> passed. The continuous two-player journey reached generation 2. Solo reconnect,
> 200% zoom, and full Turmoil interaction remain unverified.

## Recommended prompt template

The user should not need to write a long prompt each time. A compact task prompt can
reference repository rules:

> Implement [specific interaction]. Follow `AGENTS.md` and `docs/ux-contract.md`.
> Before editing, list affected states and invariants. Capture the current critical
> states. Keep the change within this interaction contract. Verify the exact served
> build with targeted unit tests, named golden screenshots, interaction geometry,
> and the relevant segment of the continuous play journey. Inspect every critical
> screenshot at full resolution and record pass/fail in the evidence manifest. Run
> the broad scenario sweep only as a regression net. Do not claim visual success
> from screenshot count, zero browser errors, or zero visual notes. Finish with a
> fresh-context adversarial review and clearly list anything unverified.

For pixel-sensitive tasks, add only the actual design intent:

> Cards must keep identical position and size before and after selection. Put
> changing explanation above or below the strip, never beside it.

The rest belongs in the permanent setup.

## Proposed definition of done for a large UI batch

A batch is done only when:

- the changed interaction contract is documented;
- unit/component tests cover behavior and reactive updates;
- every critical interaction has a before/after invariant;
- the canonical screenshot diff is reviewed, not merely generated;
- all named critical PNGs are inspected at full resolution;
- the continuous real-play journey passes;
- the served build identity matches the intended worktree;
- a fresh-context reviewer finds no blocking issue;
- broad scenarios show no new browser/geometry anomalies;
- known limitations are stated explicitly;
- the CSS change does not add an unexplained global specificity override.

## Suggested order of implementation

### Immediate

1. Add `AGENTS.md`.
2. Create `docs/ux-contract.md`.
3. Stop using "zero visual notes" as a visual pass.
4. Add build provenance to scenario summaries.
5. Define the first 12–20 golden screenshots.
6. Add the card-strip stability and duplicate-copy invariants that would have caught
   the latest regression.

### Next

1. Add the continuous three-minute play journey.
2. Add player-summary/dossier consistency and polling-refresh tests.
3. Add center-point hit testing, text clipping, target size, focus, and zoom checks.
4. Make fresh-context visual review mandatory for broad UI batches.

### Structural

1. Extract the action/workbench and card-strip layout from the global cascade.
2. Extract player rail and Focus layout.
3. Remove superseded duplicate selectors after each extraction.
4. Gate future `player_table.less` growth in review.

## Final assessment

The collaboration can improve meaningfully, but not by asking the same agent to
"look harder" at a larger screenshot pile. The process already demonstrates high
effort. Its weak point is epistemic: it accepts evidence that does not prove the
claim being made.

The durable solution is to turn the user's repeated discoveries into permanent,
measurable contracts; constrain the architectural blast radius; verify temporal
play journeys; and separate implementation from adversarial visual approval. That
should reduce the current cycle from "large batch, green report, user finds ten
issues" to "small contract, explicit evidence, independent challenge, then merge."
