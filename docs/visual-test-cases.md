# Named Visual Test Cases

The visual system has two static evidence passes plus one engine-driven journey.
It deliberately does not score screenshots or infer visual quality.

## Passes

- `golden/*` is Priority 0. It contains the common application states that must
  remain coherent after broad UI work. It currently has 25 named cases.
- `detail/<area>/*` is component depth. Each case targets one meaningful state
  and writes both a full-table context image and an original-pixel crop of the
  component's visible viewport. Named scrolled states expose off-screen
  collection content.
- `visual:continuous` is a real two-seat engine journey. It verifies transitions,
  polling, real resource deltas, seat handoff, pass, and generation change. Its
  images are transition evidence, not visual approval.

Cases own one representative viewport. `TM_VIEWPORTS` is an explicit diagnostic
override, not a default Cartesian screenshot multiplier.

## Commands

```bash
npm run visual:list
TM_VISUAL_OUT=/tmp/tm-golden npm run visual:golden
TM_VISUAL_OUT=/tmp/tm-colonies TM_TEST_PASS=detail TM_TEST_AREAS=colonies npm run visual:test-cases
TM_VISUAL_OUT=/tmp/tm-one TM_TEST_CASES=detail/colonies/four-occupied-three-ships npm run visual:test-cases
npm run visual:continuous
```

Set `TM_BASE_URL` to the exact running build and `TM_VISUAL_OUT` to an artifact
directory outside the repository. A successful screenshot run writes PNG files
only. Golden cases write a context screenshot. Detail cases write a context
screenshot and an original-pixel crop of the visible component viewport. The
continuous journey writes its named transition screenshots.

The runners verify source/build consistency, required DOM states, browser
errors, and engine assertions in memory and exit nonzero on failure. They do
not write manifests, summaries, provenance records, review packs, verdicts, or
acceptance metadata. Visual review and its findings belong to the independent
reviewer, outside the screenshot runner.

## Priority-0 golden catalog

1. `golden/create/heavy-options`
2. `golden/setup/heavy-initial`
3. `golden/setup/heavy-partial`
4. `golden/research/normal-offer`
5. `golden/table/active-neutral`
6. `golden/table/active-neutral-compact`
7. `golden/table/waiting`
8. `golden/action/project-card-options`
9. `golden/action/payment-exact`
10. `golden/action/pass-direct`
11. `golden/board/crowded-overlay`
12. `golden/cards/dense-overlay`
13. `golden/player/opponent-dossier`
14. `golden/activity/card-and-placement`
15. `golden/colonies/common-open`
16. `golden/milestones-awards/common-open`
17. `golden/venus/common-track`
18. `golden/turmoil/common-open`
19. `golden/ares/common-board`
20. `golden/moon/common-open`
21. `golden/pathfinders/common-open`
22. `golden/underworld/common-open`
23. `golden/delta/common-open`
24. `golden/ceo/common-dossier`
25. `golden/endgame/complete-results` (standard and compact viewports from one
    deterministic game state)

Use `npm run visual:list` as the canonical full detail catalog. Important
Colonies depth states are:

- `detail/colonies/three-empty-no-ships`
- `detail/colonies/four-occupied-three-ships`
- `detail/colonies/full-tile-max-track`
- `detail/colonies/many-tiles-scrolled`
- `detail/colonies/trade-choice-neutral`
- `detail/colonies/trade-choice`
- `detail/colonies/fleets-expanded`

## Detail-depth policy

Detail count follows distinct visual modes, not a fixed quota per area.
Colonies has seven because tile population, track extrema, horizontal overflow,
paired neutral/selected trade geometry, and fleet ownership are independent visual axes. Extensions
with a simpler surface use three lifecycle states: empty/start, representative
midgame, and crowded/used/terminal. Actions need more because every selector
and payment phase is a different decision surface.

The focused state sets are:

| Area | Distinct modes |
| --- | --- |
| Actions | neutral, keyboard focus, project options/selection, partial/exact payment, blue-card options, milestone/award options, standard-project options/selection, sell-patents options, colony trade selection, pass confirmation |
| Cards | dense hand, empty hand, no search results, playable filter, state retained after refresh |
| Setup | initial, partial, real mulligan response with unrelated choices preserved, ready to commit |
| Research | neutral offer, partial purchase selection |
| Colonies | sparse, representative, max/full, scrolled overflow, trade selection, expanded fleets |
| Venus, Turmoil, Ares, Moon, Pathfinders, Underworld, Delta, CEO | three extension-specific lifecycle states each |
| Layout, players, milestones/awards, endgame | the smallest sparse/dense, interaction, or terminal states listed by `visual:list` |
| Board | sparse/dense maps plus live feedback anchored on all four global-parameter locations |
| Activity | text-only, played-plus-drawn, always-on card browser at start, and scrolled multi-card browser |

Add a case only when it exposes a visually different state, ownership mode,
overflow position, commitment phase, or density extreme that an existing image
cannot judge. Do not add screenshots solely to equalize area counts.

Current explicit non-goals: solo-mode and spectator-only composition do not yet
have static acceptance cases. The continuous journey verifies that a spectator
link is created, but not spectator UX. Report both as unverified when a change
can affect them.

## Acceptance

Follow [../AGENTS.md](../AGENTS.md) and the canonical
[UX contract](ux-contract.md). Open every selected image at full resolution,
record findings per case outside the runner, and require an independent
adversarial subagent for every player-facing change that claims visual
acceptance. Screenshot count, absence of console errors, and capture completion
never mean the UI passed.
