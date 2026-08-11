# Project State

## Current milestone

Milestone 1 replacement implementation is complete locally and awaiting GitHub publication.

## Implemented

- Original title, character creation, procedural player and village map.
- Manual ten-point allocation with minimum/maximum enforcement.
- Keyboard and multi-pointer touch movement, normalised diagonal speed, camera follow, world bounds and collisions.
- Twelve interaction locations, opening hours and a locked progression location.
- Data-driven jobs, items, activities, objectives and location definitions.
- Cash, bank balance, validated transfers, buying, inventory and item consumption.
- Work shifts, Strength training, Intelligence study, Charm/reputation activity and progression requirements.
- Home sleep, manual/autosave and one home upgrade.
- Versioned save, backup, validation, reset and simulated schema migration.
- Responsive iPad landscape UI, safe-area padding, large touch targets, focus styles and reduced-motion setting.
- GitHub Actions workflow for PR tests/builds and main-branch Pages deployment.

## Verification status

- Automated tests: 19 passed across four files on 2026-08-11.
- TypeScript: strict typecheck passed on 2026-08-11.
- Production build: Vite build passed on 2026-08-11.
- Pages subpath: built index, CSS and JavaScript returned HTTP 200 at `/MKG-Game1/` in a local static-server check.
- Rendered desktop/iPad viewport check: automated browser execution is pending because the workspace has Playwright but its Chromium download CDN returned an empty archive. No visual check is claimed.
- GitHub PR checks and Pages deployment: pending branch publication/merge.
- Physical iPad Safari acceptance: must be performed by the user after the public Pages deployment.

## Known limitations

- The four raw reference ZIPs were not present in this replacement workspace. `SOURCE_REFERENCE.md` records the supplied factual summaries and non-reuse boundaries, but direct archive reinspection remains pending if the raw files are uploaded.
- Audio settings persist, but milestone one intentionally ships without audio files.
- Travel destinations, loans and recurring interest are future-ready, not presented as working features.
- The map is deliberately fictional and compressed rather than a street-for-street Shepperton reconstruction.

## Immediate next steps

1. Push the replacement branch and open a draft PR.
2. Inspect the GitHub Actions test/build check and fix any failure.
3. Merge when accepted and verify the public Pages URL in a real browser.
4. Perform the physical iPad acceptance check.
