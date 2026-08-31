# UX Change Inventory

Copy this file outside the repository for a UI change and complete it before
editing. Use it to select named cases and brief the independent reviewer; it is
not an input to the screenshot runner.

## Change

- Player-facing goal:
- Components/selectors owned by the change:
- CSS consumers:
- Explicit non-goals:

## States

For every applicable state, name the expected state and invariant.

| State | Expected state | Must not move/disappear/reset/stale/block |
| --- | --- | --- |
| Neutral | | |
| Hover/focus | | |
| Selected | | |
| Disabled/error | | |
| Review/payment | | |
| Committed/result | | |
| Waiting/other seat | | |
| Poll/refetch/reconnect | | |
| Resize/collapse | | |
| Relevant module combination | | |

## Named evidence

- Priority-0 goldens:
- Component detail cases:
- Continuous journey segment:
- Additional viewport and blast-radius reason:

## Acceptance questions

- What would make the interaction state untruthful?
- Which exact bounds and scroll offsets must remain stable?
- Which controls must remain visible and operable?
- Which facts must agree across table, rail, dossier, Focus, and module panels?
- What should the adversarial reviewer try hardest to disprove?
