# Project State

## Current milestone

Milestone 1 is implemented, merged into `main` and deployed to GitHub Pages.

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
- Shepperton Village Hall renamed and redrawn as a cream-and-sage, west-facing hall behind the pavement, with matching entrance interaction and rotated collision footprint.

## Verification status

- Automated tests: 19 passed across four files on 2026-08-11.
- TypeScript: strict typecheck passed on 2026-08-11.
- Production build: Vite build passed on 2026-08-11.
- Pages subpath: built index, CSS and JavaScript returned HTTP 200 at `/MKG-Game1/` in a local static-server check.
- Rendered live-site check: passed in a cloud Chrome browser on 2026-08-11. Title, character creation, complete point allocation, Phaser canvas/HUD, home interaction, manual save, refresh and Continue restoration were exercised successfully.
- Browser console: no application error was observed; extension-originated cloud-browser logging was excluded from the application result.
- GitHub PR check: passed checkout, dependency install, tests and production build on PR #1.
- GitHub Pages deployment: main-branch workflow run 37 completed successfully on 2026-08-11. The public index, CSS and JavaScript return HTTP 200.
- Physical iPad Safari acceptance: must be performed by the user after the public Pages deployment.

## Known limitations

- The four raw reference ZIPs were not present in this replacement workspace. `SOURCE_REFERENCE.md` records the supplied factual summaries and non-reuse boundaries, but direct archive reinspection remains pending if the raw files are uploaded.
- Audio settings persist, but milestone one intentionally ships without audio files.
- Travel destinations, loans and recurring interest are future-ready, not presented as working features.
- The map is deliberately fictional and compressed rather than a street-for-street Shepperton reconstruction.

## Immediate next steps

1. Open the public game on a physical iPad in landscape and report any Safari-specific issue.
2. Upload the four raw reference ZIPs if direct static reinspection is still required.
3. Continue with the NPC/story milestone after iPad acceptance.
