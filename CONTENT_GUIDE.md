# Content Guide

Most gameplay content is defined in `src/core/content.ts`. Keep IDs lower-case, stable and unique. Never use a display name as a save key.

## Add a location

1. Add a `LocationDefinition` to `LOCATIONS`, including opening hours when relevant.
2. Add a building or landmark and interaction point in `src/game/worldData.ts`.
3. Use an existing location kind so the panel gets a consistent identity.
4. If the location needs a new action type, add a focused engine command and tests before wiring the button.

## Add a job

Add a `JobDefinition` to `JOBS`: stable ID, location, requirements, shift hours/duration, pay and energy cost. Make sure advertised pay equals the amount granted. Tests should cover any new requirement type.

## Add an item

Add an `ItemDefinition` to `ITEMS`. State a price, stack limit, whether it is consumable and every selling location. Consumable effects are applied through the clamped item-use command. Permanent items need an explicit gameplay check before their description promises a benefit.

## Add an activity

Add an `ActivityDefinition` to `ACTIVITIES` with all money, time and energy costs visible in data. Attribute gains and reputation gains are applied once per successful transaction.

## Add an objective

Append an `ObjectiveDefinition` to `OBJECTIVES` and emit its event from the relevant engine command. Objectives progress in order; unrelated events are ignored.

## Balance checklist

- Entry-level work must remain reachable at a new-game state.
- A player should be able to test an unlock without hours of grinding.
- Do not create negative prices, zero-time work or repeatable resale profit.
- Check opening hours against shift duration and the recovery loop.
- Add or update Vitest coverage for every new rule.
