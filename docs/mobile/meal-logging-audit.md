# Meal logging on a phone: audit and changes

Run at 375 x 812 against the Firebase emulators (`VITE_USE_EMULATOR=true`) with a throwaway
test parent account and made-up foods. All screenshots use fake data only.

**Scope of this audit:** the Today screen and the Add food sheet at 375px, driven with clicks
(a desktop browser, not a real phone, so no real touch or iOS keyboard testing). I did **not**
audit the Week, Insights, Notes or Account tabs, or any clinician screen.

## Findings (Today screen, before the changes)

| # | Problem | Evidence |
|---|---|---|
| 1 | Logging a meal took about 7 taps: expand the card, open Add food, type a name and add, Done, pick Ok/Hard/No, then rate distress in two rows of dots. | `MobileMealCard` in `src/pages/DailyView.jsx` |
| 2 | The outcome buttons were disabled until a food was added, so a refused meal with nothing eaten could only be recorded as Skip. | `enabled = isSkip ? !hasItems : hasItems` |
| 3 | Repeat meals needed every food re-added one by one. No "same as yesterday" or recent list. | code, no such feature |
| 4 | Bottom sheets rendered underneath the tab bar and the chat button, so the last rating button and the Done button were covered. This also hit the existing Add food sheet. | `screenshots/02-sheet-hidden-before-fix.jpg` |
| 5 | Unknown foods got invented numbers: a fixed 200 to 450 kcal fallback, and an Open Food Facts path that assumed every food is a 150 g serving. | `src/lib/nutritionService.js`, `nutritionApi.js` |
| 6 | Drag and drop exists only in the desktop layout. The mobile layout is tap-based, so no drag-only interaction on a phone. | `DndContext` is only in the non-mobile branch |

## What changed

1. **Three taps.** Each meal card has a **Log** button. Tap 1 opens a sheet, tap 2 is how it went
   (Finished, Partly, Refused) and saves immediately, tap 3 is how hard it was (1 to 5) and closes
   the sheet. It works with no foods added.
   `screenshots/01-today-after.jpg`, `screenshots/03-quick-log-sheet.jpg`
2. **Same as yesterday.** An empty meal shows one button that adds yesterday's foods in one tap.
   `screenshots/04-same-as-yesterday.jpg`
3. **Recent foods.** The expanded card lists the family's most used foods from the last 14 days,
   one tap each. `screenshots/05-recent-foods.jpg`
4. **Sheets and modals** now render on top of the tab bar and chat button (portal to `<body>`).
   `screenshots/06-add-food-sheet.jpg`
5. **No invented nutrition.** Numbers come only from USDA (through the worker) or from what the
   family typed. Otherwise the app says "No data" and offers "Add values". Totals leave out foods
   with no data and say how many were left out. The static food list, the fallback numbers and the
   Open Food Facts path were removed. `screenshots/07-no-data.jpg`

## Decisions that need a clinician or a founder

- **"Partly" is stored as the existing `difficult` status** so trends keep working without a data
  change. Partly eaten and hard to eat are not the same thing. Decide whether to add a real status.
- **Difficulty is stored as the post-meal distress rating** (`distress.post`, 1 to 5).
- **USDA values are per 100 g**, and portions in the app are fractions, not grams. Totals are
  therefore rough. Real serving sizes need a design decision.
- Should parents see calorie numbers at all? See the product direction doc, section 2.

## Not verified

- Real touch input, iOS Safari, or the on-screen keyboard.
- The USDA lookup itself: the worker is not running locally, so every lookup in this audit missed
  and showed "No data". The path that shows real USDA values is covered by unit tests only.
- The Week, Insights, Notes and Account tabs and every clinician screen.
- Accessibility beyond tap-target sizes (buttons are at least 40px tall).
