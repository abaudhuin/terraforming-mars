# Full-Resolution UX Screenshot Audit - 2026-07-07

This audit uses raw screenshots and targeted reruns. Contact sheets were not used as evidence for pixel-level findings.

## Verification Runs

- `/tmp/tm-visual-verify-20260706-ui-fixes`: 148 screenshots, 32 expected forced-shot skips, 0 failures, 0 page errors, 0 console errors.
- `/tmp/tm-visual-verify-20260707-final-spotcheck`: 8 screenshots, 0 skips, 0 failures, 0 page errors, 0 console errors.
- `/tmp/tm-visual-verify-20260707-payment-final`: 1 screenshot, 0 skips, 0 failures, 0 page errors, 0 console errors.
- `/tmp/tm-visual-missing-tail-20260707-final`: 180 screenshots, 0 skips, 0 failures, 0 page errors, 0 console errors.
- `/tmp/tm-visual-verify-20260707-endgame-title-final`: 1 screenshot, 0 skips, 0 failures, 0 page errors, 0 console errors.
- `/tmp/tm-fix-all-20260707-final-blue`: 20 screenshots, 0 skips, 0 failures, 0 page errors, 0 console errors.
- `/tmp/tm-fix-all-20260707-final-cards`: 70 screenshots, 0 skips, 0 failures, 0 page errors, 0 console errors.
- `/tmp/tm-fix-all-20260707-final-global`: 75 screenshots, 0 skips, 0 failures, 0 page errors, 0 console errors.
- `/tmp/tm-fix-all-20260707-final-five-player`: 55 screenshots, 0 skips, 0 failures, 0 page errors, 0 console errors.
- `/tmp/tm-fix-all-20260707-final-overlay-style`: 10 screenshots, 0 skips, 0 failures, 0 page errors, 0 console errors.

## Confirmed And Fixed

### Action Card Clipping

- Issue: Robinson Industries in the blue-card action chooser clipped vertically at 1440x900.
- Fix: corporation cards in the action workbench now use a smaller, corporation-specific scale and footprint.
- Current evidence: `/tmp/tm-visual-verify-20260707-final-spotcheck/action-choice-stack-1440x900-post-setup-action-blue-card.png`.

### Module Panel Framing

- Issue: opened Pathfinders/Turmoil/Delta module panels were hard to read at 900px height and Delta sat too far left on ultrawide screens.
- Fix: open module panels now center inside the board stage, keep a stable scrollbar gutter, cap width, and preserve a sticky panel header.
- Current evidence:
  - `/tmp/tm-visual-verify-20260706-ui-fixes/ux-panel-mechanics-1600x900-post-setup-pathfinders-open.png`
  - `/tmp/tm-visual-verify-20260706-ui-fixes/global-all-modules-wide-density-1600x900-post-setup-turmoil-open.png`
  - `/tmp/tm-visual-missing-tail-20260707-final/moon-underworld-delta-3440x1440-post-setup-delta-open.png`

### Card Filter Coverage

- Issue: card search/filter screenshots were false coverage because the Cards overlay had no matching controls and the runner still returned success.
- Fix: the Cards overlay now has search, playable, affordable, type, tag, warning, cost, and all controls; the scenario preparers now return `false` if the requested control cannot be found.
- Current evidence:
  - `/tmp/tm-visual-verify-20260707-final-spotcheck/ux-cards-filter-matrix-1440x900-post-setup-cards-search-no-results.png`
  - `/tmp/tm-visual-verify-20260707-final-spotcheck/ux-cards-filter-matrix-1440x900-post-setup-cards-filter-playable.png`

### 1440px Payment Layout

- Issue: the play-card payment surface showed a cut third card at 1440x900; after the first fix, the compact payment side clipped the `MAX` buttons.
- Fix: the 1440px acting-state payment layout now fits three full cards and uses compact payment steppers inside the side panel.
- Current evidence: `/tmp/tm-visual-verify-20260707-payment-final/ux-cards-filter-matrix-1440x900-post-setup-action-play-card-payment.png`.

### Ultrawide Endgame Header

- Issue: at 3440x1440, the endgame content stack was centered but the page title was pinned to the far-left edge.
- Fix: the endgame title now uses the same centered max-width as the result stack while reserving space for the navigation controls.
- Current evidence: `/tmp/tm-visual-verify-20260707-endgame-title-final/endgame-all-scoring-3440x1440-post-setup-endgame-results.png`.

### Follow-Up Action Card And Overlay Polish

- Issue: after carrying forward the local action-hand/activity-rail work, the Cards overlay entry point and filter styling regressed, and action-card metrics still found content overflow in Robinson Industries, Pets, Fish, and Moon standard-project cards.
- Fix: the Cards control and overlay filters were restored, modal controls were restyled for the dark overlay, action-card content was compacted for the specific overflowing cards, and the scenario list command no longer requires a running server.
- Current evidence:
  - `/tmp/tm-fix-all-20260707-final-blue/action-choice-stack-1440x900-post-setup-action-blue-card.png`
  - `/tmp/tm-fix-all-20260707-final-cards/ux-cards-filter-matrix-1440x900-post-setup-cards-search-no-results.png`
  - `/tmp/tm-fix-all-20260707-final-global/global-all-modules-wide-density-1440x900-post-setup-action-standard-projects.png`
  - `/tmp/tm-fix-all-20260707-final-five-player/five-player-density-3440x1440-post-setup-player-rail-scrolled.png`

## Dismissed Or Reclassified

- Earlier card-filter screenshots from the long sweep are stale evidence; they were duplicates of the plain Hand overlay before controls existed.
- The earlier network/service-worker console note did not reproduce in current targeted runs.
- Underworld "open" screenshots that show the Tools popover are a scenario naming/coverage clarity quirk, not a current clipping bug.
- Open Pathfinders and Turmoil panels still scroll at 900px height by design; the current issue was the framing/affordance, not inaccessible content.

## Coverage Notes

- The default viewport matrix now includes `1600x900`, `1440x900`, `1920x1080`, `1920x1200`, `2560x1440`, and `3440x1440`.
- The missing tail scenarios were rerun after fixes: `moon-underworld-delta`, `five-player-density`, `board-variants-ma`, and `endgame-all-scoring`.
- No active UI defect remains from the verified screenshots above.
