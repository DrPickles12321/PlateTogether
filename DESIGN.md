---
name: Plate Together
description: The family's meal notebook. Ruled pages a parent writes on, read by the clinician as a tabbed family file.
colors:
  ink: "#23408E"
  ink-hover: "#1A3170"
  ink-light: "#EAEFF9"
  ink-mid: "#A7B7DD"
  highlight: "#FFEE8A"
  highlight-ink: "#5C4600"
  paper: "#FFFFFF"
  desk: "#F2F4F7"
  surface-warm: "#F7F9FC"
  rule: "#D6E0F0"
  rule-strong: "#B9C8E2"
  margin: "#E9B3B3"
  text-dark: "#1D212B"
  text-mid: "#464D5B"
  text-light: "#626A79"
  border: "#E1E6EE"
  border-mid: "#C9D1DD"
  st-okay: "#23408E"
  st-okay-bg: "#EAEFF9"
  st-some: "#7A5200"
  st-some-bg: "#FBF0D6"
  st-refused: "#9C2F1C"
  st-refused-bg: "#F9E3DE"
  st-skipped: "#545B69"
  st-skipped-bg: "#EEF0F3"
typography:
  display:
    fontFamily: "Shantell Sans, Atkinson Hyperlegible Next, ui-sans-serif, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Shantell Sans, Atkinson Hyperlegible Next, ui-sans-serif, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Shantell Sans, Atkinson Hyperlegible Next, ui-sans-serif, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.2
  caption:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  base: "6px"
  sheet: "20px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  margin-phone: "56px"
  margin-desk: "96px"
components:
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "6px 18px"
    height: "44px"
  button-ink-hover:
    backgroundColor: "{colors.ink-hover}"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "8px 14px"
    height: "44px"
  button-urgent:
    backgroundColor: "{colors.st-refused}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "10px 14px"
    height: "48px"
  button-call:
    backgroundColor: "{colors.ink-light}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "10px 14px"
    height: "48px"
  outcome-finished:
    backgroundColor: "{colors.st-okay-bg}"
    textColor: "{colors.st-okay}"
    rounded: "{rounded.base}"
    padding: "6px 12px"
    height: "44px"
  outcome-partly:
    backgroundColor: "{colors.st-some-bg}"
    textColor: "{colors.st-some}"
    rounded: "{rounded.base}"
    padding: "6px 12px"
    height: "44px"
  outcome-refused:
    backgroundColor: "{colors.st-refused-bg}"
    textColor: "{colors.st-refused}"
    rounded: "{rounded.base}"
    padding: "6px 12px"
    height: "44px"
  outcome-skipped:
    backgroundColor: "{colors.st-skipped-bg}"
    textColor: "{colors.st-skipped}"
    rounded: "{rounded.base}"
    padding: "6px 12px"
    height: "44px"
  meal-line:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text-dark}"
    height: "64px"
  hard-moment-card:
    backgroundColor: "{colors.ink-light}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.base}"
    padding: "12px 14px"
  bottom-sheet:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.sheet}"
    padding: "14px 18px"
  tab-strip-parent:
    backgroundColor: "{colors.surface-warm}"
    textColor: "{colors.text-mid}"
    height: "58px"
  tab-strip-parent-active:
    backgroundColor: "{colors.desk}"
    textColor: "{colors.ink}"
  grid-cell-flagged:
    backgroundColor: "{colors.highlight}"
    textColor: "{colors.text-dark}"
    padding: "8px"
---

# Design System: Plate Together

## Overview

**Creative North Star: "The Kitchen-Table Notebook"**

Plate Together is the family's meal notebook. Each day is a ruled page the parent writes on: cool white paper, pale blue rules, one soft rose margin line, graphite text. Meals are lines on that page, not cards in a grid. The parent's own entries and the one main action are written in ballpoint-blue ink. Highlighter yellow appears only where a clinician should look. The voice is calm and plain because the person holding the phone is often stressed, one-handed, at or just after the table, and a teen in recovery may be reading over their shoulder.

The clinician side keeps the same paper and ink but reads as a case folder: a tabbed family file whose week grid is a ruled ledger, with the exceptions (a refusal, or distress at 4 or 5) highlighted so they are seen first. Density rises on the clinician's laptop; the vocabulary, marks and colours do not change.

The system refuses the wellness-tracker default: no emoji tiles, no KPI grids, no gradient buttons, no scores or streaks, no default Inter-on-white. Depth is paper on a desk, not floating cards.

**Key Characteristics:**
- Ruled meal lines with the time written in a rose-ruled margin.
- One ink colour for the parent's words and the primary action.
- Outcomes are pen marks (tick, half circle, cross, dash) always paired with a word.
- A handwriting face for headings and the parent's own words; a legibility-first face for everything else.
- Square-ish 6px corners, hairline rules, shadows only on sheets that slide over the page.
- Highlighter reserved for clinician exceptions.

## Colors

A cool notebook palette: white paper on a blue-grey desk, one ballpoint blue, one highlighter yellow, and four muted outcome colours that each travel with a mark and a word.

### Primary
- **Ballpoint Ink** (`ink`): the parent's written entries (food summaries on a meal line), the primary "Log" button, outline buttons ("Need help"), active tab text, links, focus rings, caret and native accent colour. Darkens to **Pressed Ink** (`ink-hover`) on hover of filled buttons.
- **Ink Wash** (`ink-light`) and **Faded Ink** (`ink-mid`): the background and edge of the hard-moment card and the non-urgent call button; `ink-light` is also the hover fill on outline buttons and the active clinician mobile tab.

### Secondary
- **Highlighter** (`highlight`) with **Highlighter Ink** (`highlight-ink`) for text set on it: fills a clinician week-grid cell when a meal was refused or distress was 4 or 5, and the matching legend swatch. Also the text-selection colour.

### Tertiary
Outcome colours. Each is a text/mark colour on its own pale tint.
- **Finished** (`st-okay` on `st-okay-bg`): identical to ink; a finished meal reads as the parent's normal handwriting.
- **Partly** (`st-some` on `st-some-bg`): an umber, also used for portion fractions ("1/2") beside a food.
- **Refused** (`st-refused` on `st-refused-bg`): a brick red, also the solid fill of the "Call 911" button.
- **Skipped** (`st-skipped` on `st-skipped-bg`): a graphite grey.

### Neutral
- **Desk** (`desk`): the page background behind everything, and the open parent tab (cut from the page).
- **Paper** (`paper`): the meal-line section, sheets, cards, the clinician grid.
- **Pale Paper** (`surface-warm`): the parent tab strip, grid header row, sheet close button.
- **Blue Rule** (`rule`) and **Strong Rule** (`rule-strong`): hairlines between meal lines and grid rows; the stronger rule edges sections, tabs and the grid frame.
- **Rose Margin** (`margin`): the single vertical margin line on the Today page (at 56px on phone, 96px on desktop).
- **Graphite** (`text-dark`, `text-mid`, `text-light`): body text, secondary text and meta text. `text-mid` carries "Not written yet", times in the margin and inactive tabs.
- **Hairline** (`border`, `border-mid`): component outlines (unselected choice buttons, nav step buttons, sheet dividers, scrollbar thumb).

### Named Rules
**The One Ink Rule.** Ballpoint blue means "the parent wrote this" or "do this next". It is not decoration and not a second accent.

**The Highlighter Rule.** Yellow highlighter marks clinician exceptions only: refused, or distress 4 or 5. It never appears on a parent screen as emphasis, and a legend always states what it means.

**The Mark And Word Rule.** Colour is never the only signal for an outcome. Every outcome shows its pen mark and its word (Finished, Partly, Refused, Skipped), in every size, on every screen.

## Typography

**Display Font:** Shantell Sans (with Atkinson Hyperlegible Next, ui-sans-serif)
**Body Font:** Atkinson Hyperlegible Next (with ui-sans-serif, system-ui)

**Character:** A friendly marker hand for what a person would write on the page, set against a face designed for low-vision legibility for everything the app says. Body numerals are tabular throughout.

### Hierarchy
- **Display** (Shantell Sans 600, 32px on phone / 34px on desktop, 1.1): the day heading ("Today", "Thursday").
- **Headline** (Shantell Sans 600, 19-20px, 1.25): meal names on a line, clinician section titles, the app wordmark (20px phone, 22px desktop, in ink).
- **Title** (Shantell Sans 500-600, 17-18px): bottom-sheet titles and the hard-moment card's opening line (in ink).
- **Body** (Atkinson 400, 15px, 1.5): sentences, guidance lists, card copy. Food summaries on a meal line are 14px.
- **Label** (Atkinson 700, 14-15px): every button and outcome chip; 16px bold for in-sheet questions.
- **Caption** (Atkinson 500, 12-13px): margin times, tab labels (13px parent, 12px clinician mobile), grid cell text, legends. 12px is the floor.

### Named Rules
**The Own Words Rule.** The handwriting face is for headings and the parent's own words only. Buttons, labels, guidance, clinical wording and numbers stay in Atkinson Hyperlegible Next.

**The 12px Floor Rule.** No text below 12px. Inputs are 16px on viewports up to 768px so iOS does not zoom on focus.

## Layout

Phone first. The parent's Today page is a single column capped at 560px: the handwritten day heading top-left with the "Need help" outline button top-right, day-step buttons below, then the meal section. Each meal line is a three-column grid: the time in a 56px margin, the meal name and what was served, then the outcome chip or the "Skip" / "Log" buttons at the right edge in thumb reach. Lines are at least 64px tall and separated by a 1px blue rule; a rose line runs down the margin. On desktop the margin widens to 96px to hold the time picker.

Bottom navigation is fixed and pads for the safe-area inset; page content reserves 88px beneath it. The breakpoint between phone and desktop layout is 768px. The desktop header is 60px (52px on phone) inside a 1200px container with 24px (16px) gutters. The clinician week grid is a ruled table with a 760px minimum width that scrolls horizontally inside its frame.

Spacing is small and even: 4, 6, 8, 12, 14, 16px gaps, with 18px horizontal padding inside sheets.

## Elevation & Depth

Flat paper on a desk. Pages, lines, cards and the grid carry no shadow; depth comes from the desk-to-paper tone step and from 1px rules. Shadows exist only on surfaces that slide over the page.

### Shadow Vocabulary
- **Sheet lift** (`box-shadow: 0 -8px 30px rgba(29,33,43,0.18)`): the bottom sheet, over a `rgba(29,33,43,0.35)` backdrop.
- **Modal lift** (`box-shadow: 0 24px 64px rgba(29,33,43,0.22)`): centred dialogs.
- **Toast lift** (`box-shadow: 0 6px 24px rgba(29,33,43,0.12)`): transient confirmations.

### Named Rules
**The Sheets Only Rule.** A shadow means "this is lying on top of the page and will go away". Buttons, chips, cards and lines never carry one.

## Shapes

Square-ish. One radius (6px, `--radius`) covers buttons, chips, cards, inputs, call buttons and the corners of notebook tabs. Bottom sheets round only their top corners (20px). Borders are 1px for rules and frames, 1.5px for outline buttons and inputs, 2px for selected choice buttons. Parent tabs are index tabs: rounded only on the bottom corners, the open tab borderless at the top so it joins the page. Clinician desktop tabs are folder tabs: rounded only on top, the open tab's bottom edge erased into the page.

Icons are drawn line icons on a 24px grid, 1.75px stroke (2.1px when active), round caps and joins, shown at 18-22px. Outcome marks are heavier pen strokes (2.5px; the half circle is a 2px ring with a filled half).

## Components

### Buttons
Plain, written-on-paper controls with weight in the label rather than the surface.
- **Shape:** gently squared (6px), minimum height 44px; call buttons 48px.
- **Ink (primary):** solid ink, white bold 15px label, used for "Log" and "Message your care team". Hover goes to pressed ink.
- **Outline:** white with a 1.5px ink (or faded-ink) border and ink label, an 18px drawn icon leading. "Need help" is this button.
- **Text:** no border or fill; ink and underlined (offset 3px) for navigation like "Back to today", or `text-mid` for "Skip" and "Close".
- **Urgent call:** solid brick red with white label and a phone icon ("Call 911"). The non-urgent call ("Call or text 988") is ink wash with a faded-ink edge.
- **Clinician pill:** the shared clinician button class, 1.5px ink outline, 14px/600, ink-wash hover; the filled variant is solid ink. Its 40px minimum height is drift (see below), not the standard.
- **Focus:** every control gets a 2px ink outline at 2px offset.

### Outcome chip and choice
The signature vocabulary. Stored values `okay / difficult / refused / skipped` display as **Finished / Partly / Refused / Skipped** with **tick / half circle / cross / dash**.
- **On a meal line:** a 44px chip in the outcome's tint with a 1.5px border in the outcome colour, 16px mark plus bold 14px word. Tapping it reopens the log sheet.
- **In the log sheet:** four equal 64px buttons, mark (20px) over word (16px bold) in the outcome colour on white; selected gets the tinted fill and a 2px outcome-colour border, with `aria-pressed`.
- **In the clinician grid:** 14px mark plus bold word at the top of the cell.

### Distress scale
Five equal 52px buttons labelled 1 to 5, bold 17px, with "Calm" and "Very hard" captions at the ends. Selected is solid ink with white text. Optional, saves on tap.

### Meal line
The core unit of the parent's page (see Layout). Empty lines say "Not written yet" in `text-mid`; written lines show what was served in ink. A dashed-border "Same as yesterday" repeat sits under an empty line when yesterday has entries.

### Hard-moment card
Appears in place under a meal that was refused or rated 4-5, settling in with the ink-settle motion. Ink-wash fill, 1px faded-ink border, 6px corners, 12px/14px padding. A handwritten 18px ink line, one 15px body sentence, then: ink "Message your care team", outline "When to get help", text "Close"; below, an emergency sentence and the two call buttons in an auto-fit grid (min 140px columns). It never judges the meal.

### Bottom sheet
The phone's only overlay. White, 20px top corners, a 36 by 4px grab handle, handwritten 17px title with a 32px round close button, 1px dividers above and below the scroll body, a full-width 48px "Done" in the footer. Capped at 85dvh; slides up on a spring (stiffness 380, damping 32); backdrop fades in 0.18s. Escape closes it. The help sheet holds the static warning-signs guidance: "Call 911 now if you see" and "Call your care team today if you see" lists with the call buttons.

### Navigation
- **Parent tab strip (phone):** five index tabs fixed to the bottom (Today, Week, Insights, Notes, Account), 58px tall, word first (13px; 700 when active) with an 18px drawn icon under it. Inactive tabs are white with strong-rule edges on pale paper; the open tab takes the desk colour and drops its top rule so it is cut from the page. No emoji.
- **Clinician file tabs:** on desktop, folder tabs above the page (Overview, Insights, Care plan, Notes), 44px, 15px label with a leading icon, the active tab white with its bottom edge joined to the page. On phone, a white bottom bar with a 3px ink top bar and ink-wash fill on the active tab, 22px icon over a 12px word.
- **Header:** handwritten wordmark in ink, family code on desktop.

### Clinician week grid
A ruled ledger: strong-rule frame, pale-paper sticky header row, white cells of at least 84px with 8px padding and 13px text. A flagged cell (refused, or distress 4 or 5) fills with highlighter and its distress line turns bold highlighter-ink. A legend swatch says "Highlighted: refused, or distress 4 or 5". 44px previous/next buttons step weeks.

### Motion
- **Ink settle:** a newly written line or card fades from 0.35 opacity and a 1.5px blur to sharp over 0.45s on `cubic-bezier(0.16, 1, 0.3, 1)`. The one authored moment.
- **Page change:** opacity 0.6 to 1 over 0.18s, opacity only (a transform would break fixed sheets).
- Both are removed under `prefers-reduced-motion`, and all transitions collapse to 0.01ms.

## Do's and Don'ts

### Do:
- **Do** write meals as ruled lines on a page, with the time in the rose margin and the action at the right edge.
- **Do** show every outcome as its pen mark plus its word (Finished, Partly, Refused, Skipped) in the outcome colour; colour is never the only signal.
- **Do** use ballpoint ink (`ink`) for the parent's own entries and the single primary action on a view.
- **Do** keep every touch target at least 44px tall (48px for call buttons and sheet footers, 64px for outcome choices).
- **Do** keep text at 12px or larger, and inputs at 16px on phones.
- **Do** use drawn line icons from the shared icon set (24px grid, 1.75px stroke), always beside a word or with an accessible name.
- **Do** answer a hard meal in place with the hard-moment card and the care team one tap away.
- **Do** use the 6px radius for every control and card; 20px only for the top corners of bottom sheets.
- **Do** keep a visible 2px ink focus ring on every interactive element.

### Don't:
- **Don't** use emoji or Unicode glyphs as icons, bullets or status markers.
- **Don't** show scores, streaks, percentages, totals or comparisons on parent screens; parents see facts and their clinician's words.
- **Don't** use highlighter yellow for anything except clinician exceptions (refused, or distress 4 or 5), and never without its legend.
- **Don't** set buttons, labels, guidance, clinical wording or numbers in the handwriting face; it is for headings and the parent's own words only.
- **Don't** put shadows on buttons, chips, cards or lines; shadows belong to sheets, modals and toasts.
- **Don't** build emoji tiles, KPI card grids, gradient buttons or purple gradients.
- **Don't** add a second accent colour for emphasis; the outcome colours mean outcomes and nothing else.

## Known Drift

Not part of the system. The build still carries legacy code that was re-tokenized rather than rebuilt. It is listed so it is not copied.

- Most components use inline style objects rather than shared classes; only the clinician pill button, section title, digest and timeline rows are classes. Repeated values (the 44px ink and outline buttons) are duplicated per file.
- Legacy token aliases remain in `src/index.css` (`--coral*` mapped to ink, `--peach*`, `--pink*`, `--mint*`) and are still referenced across older components (Toast, NoteComposer, AddFoodSheet, WeeklyGoals, NutritionFacts). The green `--mint` family has no role in the notebook palette.
- The desktop FoodSidebar and ClinicianNotesSidebar internals, and the clinician Care plan and Notes pages, are re-coloured but keep their old structure, including hover and focus shadows.
- The nutrition subcomponents (FlagChip, MicroBreakdown) still use emoji icons and Tailwind purple/red/yellow chips, and WeeklyGoals shows progress bars; none of these are system patterns.
- Primary-button glows (`0 2px 8px rgba(35,64,142,0.28)`) in AddFoodInput, NutritionalTargets and NutritionFacts, and a glow on the WelcomeModal button, break the Sheets Only Rule.
- Some controls sit under 44px: the clinician pill (40px), the desktop day-step buttons (40px), the meal-detail chips (36px) and the time select (40px).
