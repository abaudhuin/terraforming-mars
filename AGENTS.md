# Agent Instructions

Before changing any player-facing UI, read [docs/ux-contract.md](docs/ux-contract.md)
and [docs/visual-test-cases.md](docs/visual-test-cases.md). Treat every applicable
`UX-*` and `VERIFY-*` law as an acceptance requirement, not advice.

## Required UI workflow

1. Inventory the affected neutral, focused, selected, disabled/error,
   review/payment, committed, waiting/other-seat, polled/refreshed, and resized
   states before editing.
   Use [docs/ux-change-inventory-template.md](docs/ux-change-inventory-template.md)
   as the implementation and review plan.
2. State what must not move, disappear, reset, become stale, or become
   unreachable.
3. Keep CSS ownership component-local. A global selector requires an explicit
   consumer inventory and before/after evidence for every matched surface.
4. Run the smallest relevant named visual-test set:
   - broad shell or cross-cutting work: the complete `golden` pass;
   - component work: that area's `detail` cases;
   - interaction, timing, or multiplayer work: the relevant continuous journey.
5. Open every acceptance image at full resolution. Detail crops must also be
   inspected at original pixels. Capture creation, browser cleanliness, and
   automated geometry checks are never visual verdicts.
6. For every player-facing change that claims visual acceptance, give a separate
   subagent the contract, diff, selected case IDs, and exact raw screenshot
   paths with the explicit job of disproving acceptance. The reviewer operates
   outside the screenshot runner. Address findings and rerun affected cases
   before reporting completion.
7. Report exact cases, viewports, invariants, journey segments, adversarial
   outcome, and anything unverified. Never translate screenshot quantity into
   confidence.

For CSS ownership and module boundaries, follow
[docs/css-architecture.md](docs/css-architecture.md). Do not add another
historical “pass” or cascade-tail override when an owning module already exists.

The canonical law definitions and examples are in
[docs/ux-contract.md](docs/ux-contract.md). The case catalog and commands are in
[docs/visual-test-cases.md](docs/visual-test-cases.md).
