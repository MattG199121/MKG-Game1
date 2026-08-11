# Shepperton Life RPG

An original, iPad-first urban life RPG set in a compact fictional interpretation of Shepperton, Surrey.

This repository is a complete replacement of the earlier `MKG-Game1` prototype. It uses TypeScript, Phaser 3 and Vite, with no backend or private location data.

## Play

After the replacement is merged to `main`, GitHub Actions tests, builds and deploys the game to:

**https://mattg199121.github.io/MKG-Game1/**

The repository URL is for source code. The Pages URL above launches the game.

## Local development

Requires Node.js 22 or later.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. For a production check:

```bash
npm test
npm run build
npm run preview
```

The production base path is `/MKG-Game1/`, matching GitHub Pages subpath hosting.

## Controls

- Desktop: WASD or arrow keys to move; E or Space to interact; Escape to pause or close a panel.
- iPad and touch devices: on-screen direction pad plus the context-sensitive Interact button.
- Portrait iPad: rotate to landscape when prompted for the intended play layout.

## First playable milestone

- Title, Continue, Settings, Credits and confirmed save reset.
- Manual ten-point character allocation and original procedural character art.
- A bounded village map with camera follow, collision and twelve locations.
- Touch and keyboard movement with normalised diagonal speed.
- Jobs, shifts, training, study, social progression, shops and inventory.
- Validated cash/bank transfers, home sleep and one home upgrade.
- First-day objectives, opening hours, time, health and energy.
- Versioned local save data, backup recovery and simulated schema migration.
- Automated unit tests for the non-rendering game rules.

## Project memory

Read these before changing the project: `PROJECT_STATE.md`, `DECISIONS.md`, `ROADMAP.md` and `ARCHITECTURE.md`.

See `CONTENT_GUIDE.md` to add jobs, items, locations, activities or objectives without scattering balance values through the UI.
