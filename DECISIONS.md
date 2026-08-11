# Decisions

## 2026-08-11 — Complete repository replacement

The old single-file map prototype and personalised avatar photographs were removed. Git history preserves the earlier commits. The replacement uses a dedicated branch and reviewable pull request.

## 2026-08-11 — Fictional compressed geography

The first map is game-scale rather than 1:1. Useful locations sit close together and the player home is a fictional Rosehip Court entrance. No private coordinates or proprietary tiles are used.

## 2026-08-11 — TypeScript, Phaser and Vite

Phaser handles world rendering, physics and camera work. HTML/CSS handles detailed panels and accessible controls. Vite builds a static `/MKG-Game1/` deployment for GitHub Pages.

## 2026-08-11 — Purpose-built location panels

Location panels pause the world and provide large, scrollable touch controls. They are more reliable for the first iPad milestone than building many small playable interiors.

## 2026-08-11 — Action-based time

Walking does not advance time. Work, study, training, social actions and sleep change the clock in exact fixed increments, preventing frame-rate-dependent simulation.

## 2026-08-11 — Manual point allocation

Strength, Intelligence and Charm start at 1, with exactly 10 points to spend and a starting maximum of 8. No dice rolling is included.

## 2026-08-11 — Local versioned saves

Milestone one has no backend. It validates schema 2, keeps the prior valid save as a backup and tests migration from a simulated schema 1. Clearing Safari website data can remove this local save.
