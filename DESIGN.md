---
name: Bat-Signal
description: A corner Bat-Signal that watches Claude Code sessions. This is its default theme, VENGEANCE, a noir case file in The Batman (2022) reds and blacks.
colors:
  abyss: "#000000"
  smoke: "#080808"
  surface: "#13100e"
  raised: "#27150e"
  line: "#31302f"
  blood: "#8b0000"
  signal: "#af0006"
  signal-glow: "rgb(175 0 6 / 45%)"
  signal-hot: "#e3121b"
  brick: "#c9463d"
  clawd: "#d77757"
  bone: "#e8e1d9"
  ash: "#8a817a"
  ink: "#bdb4aa"
  ink-hot: "#ec2a2a"
  ink-soft: "#d4574c"
typography:
  display:
    fontFamily: "Anton, Impact, sans-serif"
    fontSize: "21px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "2.5px"
  headline:
    fontFamily: "Anton, Impact, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "0.6px"
  title:
    fontFamily: "Barlow Semi Condensed, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Barlow Semi Condensed, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Barlow Semi Condensed, Segoe UI, sans-serif"
    fontSize: "10.5px"
    fontWeight: 600
    letterSpacing: "0.14em"
  stamp:
    fontFamily: "Special Elite, Courier New, monospace"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.12em"
  mono:
    fontFamily: "JetBrains Mono, Cascadia Mono, monospace"
    fontSize: "11px"
    fontWeight: 400
  report-body:
    fontFamily: "Special Elite, Courier New, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  stamp: "2px"
  base: "4px"
  sheet: "10px"
  pill: "9px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  gutter: "14px"
  lg: "16px"
  report-margin: "114px"
components:
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.bone}"
    rounded: "{rounded.base}"
    padding: "10px 12px 11px 14px"
  card-hover:
    backgroundColor: "{colors.raised}"
  stamp:
    textColor: "{colors.signal-hot}"
    typography: "{typography.stamp}"
    rounded: "{rounded.stamp}"
    padding: "1px 6px 0"
  stamp-soft:
    textColor: "{colors.brick}"
  stamp-quiet:
    textColor: "{colors.ash}"
  icon-button:
    textColor: "{colors.ash}"
    rounded: "{rounded.base}"
    size: "26px"
  icon-button-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.bone}"
  icon-button-danger-hover:
    backgroundColor: "{colors.blood}"
    textColor: "{colors.bone}"
  chip:
    textColor: "{colors.ash}"
    typography: "{typography.mono}"
    rounded: "{rounded.stamp}"
    padding: "1px 6px"
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.bone}"
    rounded: "{rounded.sheet}"
    padding: "0 16px 20px"
  report-entry:
    textColor: "{colors.ink}"
    typography: "{typography.report-body}"
    padding: "7px 0"
  report-stamp-hot:
    textColor: "{colors.ink-hot}"
  report-stamp-soft:
    textColor: "{colors.ink-soft}"
---

# Design System: Bat-Signal

## Overview

**Creative North Star: "The Noir Case File"**

Bat-Signal is a small, always-on-top window that reads like a detective's case file left out under a red searchlight. Everything sits on pure black. Warm near-blacks show up only as highlights over it, and the reds of The Batman (2022) carry meaning: red is a light that comes on, an ink stamp, a pen mark. It is never decoration. The type mixes three registers: Anton condensed capitals for the masthead, Barlow Semi Condensed for working text, and two machine faces (Special Elite as the typewriter and stamp ink, JetBrains Mono for paths, commands and times).

The panel is dense and made to be glanced at. It opens at 320x440 and shrinks to 300x360, so every line earns its row and ellipsis beats wrapping. Depth comes from light, not stacked material: red glows, a sodium street-light haze at the bottom, static film grain and rain behind everything. Motion is rationed. Every loop is sampled from one shared 8 fps clock, and the rest are one-off moments (a click ripple, a task flash, Bat-Clawd's hop). No infinite CSS animation exists anywhere.

The approved layout, "files" and the default, presents cases as cards under two tabs. The alternate layout, "The Night Report" (`settings.layout: 'report'`), presents the same world as one typed column on legal paper, with stamps in the margin and a red pen under whatever waits for the user. Both share the header, the signal disc, the stamps, the palette and the mascot.

### Themes

Bat-Signal has many Themes, each one version of Batman (the words are defined in `CONTEXT.md`; the decision is `docs/adr/0001-many-themes-and-the-homage-line.md`; each Theme's research is in `docs/research/themes/`). This file specifies the default Theme, **VENGEANCE**, after The Batman (2022). Its tokens are the front matter above.

**What every Theme shares:** a dark ground; one Alarm color, used for nothing but "something needs you"; light rather than lift; one 8 fps clock for every loop; machine output in mono; the stamp as the signature mark; the density of a 300x360 panel; both layouts; and Bat-Clawd's shape, white eyes, orange jaw and three moods.

**What a Theme swaps:** its palette tokens, its display and stamp faces, its emblem (one path per Theme, reused in the header, the disc, the intro and on Bat-Clawd's chest), the disc's lens, Bat-Clawd's costume, accessories and poses, its Atmosphere, its Voice and its Lexicon.

**Wave rules** (from the wave 1 jury): every identifying mascot detail is at least one grid unit; display and stamp families are unique to each Theme; *dark* and *quiet* mean all clear; stamp words fit the rendered width of PERMISSION in the Theme's own stamp face; no two Signature poses share an outline at 54px; display names are unique and allude to their version of Batman; a collision inside a Theme outranks one between Themes.

**Key Characteristics (VENGEANCE):**
- Pure black ground; warm near-blacks only as raised highlights.
- Red always means something: a light that is on, a stamp, a pen mark, a request. Red is VENGEANCE's Alarm color.
- Typewriter ink stamps, slightly crooked and worn, are the system's signature mark.
- Glows instead of drop shadows; light sources instead of elevation.
- Loops run off one 8 fps clock; everything else animates once.
- Small, dense and glanceable at 300x360.

## Colors

A black-on-black noir palette with one family of reds that work as light and ink, plus one warm orange kept for the mascot.

### Primary
- **Signal Red** (signal): the measured red of the film's title logo. Through the accent: masthead wordmark, focus outlines in the files layout, checked toggles, card hover borders, text selection. Directly, as the alarm: the lit disc's lens and the needs-you counter.
- **Hot Signal** (signal-hot): only for small lit things where Signal Red reads too dark on black: urgent card rules, active tab underline, live status dots, the in-progress task mark, the default stamp ink, the disc's count border.
- **Signal Glow** (signal-glow): the translucent red used for every halo: card hover glow, header count, tab underline, sheet edge, toggle thumb.

### Secondary
- **Dried Blood** (blood): the deep red of things that wait without urgency: waiting-card side rules, alert side rules, the danger hover on Quit, the Night Report margin rule (at 75% opacity), and the thread above the open cape's hem.
- **Brick Ink** (brick): the softer stamp ink for waiting and new-reply items and failed runs.

### Tertiary
- **Clawd Orange** (clawd): Claude Code's own `clawd_body` color. Reserved for Bat-Clawd's body; his shade (#b85f42) and the rest of his suit have their own variables (see Theme variables below).

### Neutral
- **Abyss** (abyss): the page, the case detail and the intro. Everything starts here.
- **Smoke** (smoke): the faint top gradient of the case-detail bar.
- **Surface** (surface): the card body, hover fill for icon buttons and rows, and the toggle track.
- **Raised** (raised): the warm hover tint on cards, and (translucent) on Night Report entries.
- **Line** (line): every 1px rule and border, scrollbar thumb, progress track, unlit status dot.
- **Bone** (bone): primary text, titles, counts on red.
- **Ash** (ash): secondary text, times, case numbers, labels, quiet stamps, idle icons.
- **Typed Ink** (ink, Night Report only): the slightly dimmer bone of typewritten body text, so names and pen-marked actions in Bone stand forward.

### Night Report inks
- **Pen Hot** (ink-hot) and **Pen Soft** (ink-soft): Hot Signal and Brick Ink lifted just enough to reach 4.5:1 on black at stamp size. They ink the hand-drawn pen stroke and the margin stamps by tier. They are scoped to the report and do not replace the approved stamp inks in the files layout.

### Theme variables
Every color the renderer paints is a variable in the Theme's stylesheet, `app/src/renderer/src/styles/themes/<id>.css` (VENGEANCE's is `the-batman-2022.css`), named by role and scoped to `<html data-theme="<id>">`, so a Theme swaps the lot; `app/test/themeColors.test.ts` fails on a color written anywhere else. VENGEANCE sets most roles as aliases of the palette above, so the roles change nothing on screen:
- **Accent** (accent, accent-hot, accent-deep, accent-glow): emphasis that is not an alarm: the wordmarks, focus outlines, selection, checked switches, the slider, card hover border and glow, the tab underline, the progress fill, the sheet's spill and the click ripple. VENGEANCE maps them to Signal Red, Hot Signal, Dried Blood and Signal Glow; another Theme can keep its Alarm color off them.
- **Stamp inks by tier** (stamp-hot, stamp-soft, stamp-quiet): what files-layout stamps read, never an alarm shade directly. VENGEANCE: Hot Signal, Brick Ink, Ash. The Night Report keeps its pen inks.
- **In progress** (in-progress, in-progress-glow): a task being worked on in the files layout: its glyph, its running state, its timeline step. VENGEANCE lights it in Hot Signal; another Theme can keep its Alarm color off running work.
- **Danger** (danger, Dried Blood) for the Quit hover, and **Report rule** (report-rule, Dried Blood at 75%) for the margin rule.
- **Text a step off** (bone-dim #cfc6be for log lines and idle titles, ash-dim #6f6862 for struck-through done tasks).
- **Near-blacks** (surface-deep, frame, header-fade, sheet-top) for gradients and edges, and **Shadow** (shadow) for shadows and scrims.
- **Bat-Clawd** (clawd-shade, clawd-eye, clawd-eye-dim, cowl, cowl-edge, cowl-shine, cape, cape-rim, thread, chest), named after the parts the prototype in #95 draws.
- **The Signal** (glass-shine, glass, disc-rim-inner, disc-rim-outer, lens-core, lens-edge, lens-rim, lens-bat) and the **notice card** (notice-top, notice-foot, notice-hover-top, notice-hover-foot).
- **The Atmosphere** (haze, haze-edge, grain-opacity, rain, searchlight). The rain is drawn on a canvas, which reads --rain at run time and again when the page changes Theme.
- **Faces and shapes a Theme sets** (font-display, font-body, font-type, font-mono, font-report for the night report's body, font-stamp; wordmark-size and wordmark-tracking for the masthead; stamp-tilt, stamp-tilt-slight, stamp-border and stamp-mask for the stamp's shape; disc-lens, the lit disc as one gradient, a recipe rather than colors). A Theme's stylesheet may also carry rules scoped to its own `data-theme` for what a variable can't express (an inverted lens, say).

Translucent variants are `color-mix()` on their token. Every gradient says `in srgb`, because a `color-mix()` inside one would otherwise switch it to Oklab and shift its pixels, and which tokens are mixes is up to each Theme. `app/test/themeContrast.test.ts` holds every Theme's text colors to 4.5:1 on every dark ground they sit on (the page, the panels, the sheet and the notice card), one Theme at a time. VENGEANCE's approved colors that read under it (Signal Red as the wordmark, Hot Signal and Brick Ink as files-layout stamps, the pen inks off black, ash-dim and the decorative chevron) are listed there with their reasons, pending #97; new Themes get no exceptions.

### Named Rules
**The Alarm Color Rule.** Every Theme keeps one Alarm color for "something needs you" and uses it nowhere else: the hottest color in its palette, or a red that suits the palette when nothing in it reads as an alarm. In VENGEANCE the Alarm color is red, which gives the next rule. Bat-Clawd's aura is the one place the Alarm color may wrap the mascot, and only while something needs you or in an iconic moment.

**The Bat-Clawd Costume Rule.** Bat-Clawd wears his version's suit over his body, arms and legs, with the cowl down to his eyes; Clawd's orange shows as his jaw, his eyes stay white, and his cape (or coat) hangs behind his legs. At rest a faint neutral rim lets the cowl and cape read on the Theme's ground, and no suit is so black that it vanishes there. His aura, in the Theme's Alarm color, shows only while something needs the user or in an iconic moment. The model was approved on the prototype in #95.

**The Red Means Something Rule.** A red element is a light that is on, a stamp, a mark or a request. In the files layout a live dot may glow Hot Signal; in the Night Report, where red ink is kept for requests, running work shows in Bone.

**The Pure Black Ground Rule.** In VENGEANCE the page is #000000. Warm near-blacks (Surface, Raised) exist only as highlights laid over it, never as the page itself. Other Themes may set a dark near-black ground of their own; none is ever light.

**The Small Lights Rule.** Hot Signal is for tiny lit pixels and thin rules. Large red areas use Signal Red or Dried Blood.

## Typography

**Display Font:** Anton (with Impact)
**Body Font:** Barlow Semi Condensed 400/500/600 (with Segoe UI)
**Typewriter Font:** Special Elite (with Courier New)
**Mono Font:** JetBrains Mono (with Cascadia Mono)

**Character:** Condensed poster capitals over a narrow working sans, with a typewriter for anything that reads as filed paperwork and a mono for anything the machine said. All fonts are bundled locally through Fontsource.

### Hierarchy
- **Display** (Anton 400, 21px, line-height 1, 2.5px tracking): the BAT-SIGNAL wordmark in Signal Red with a soft red text glow. It drops to 19px with 2px tracking under 330px. The intro uses it at 30px with 8px tracking.
- **Headline** (Anton 400, 19 to 20px, line-height 1.15, 0.5 to 0.6px tracking): case-detail and sheet titles in Bone; the empty-state title at 20px.
- **Title** (Barlow 600, 15px, line-height 1.2): card titles, one line with an ellipsis. Notice cards use 14px.
- **Body** (Barlow 400, 13px, line-height 1.45): base text, Claude's quoted last words (clamped to two lines on cards, six in the log).
- **Label** (Barlow 600, 10.5 to 12px, 0.14 to 0.2em tracking, uppercase): tabs (12px, 0.16em), status, field labels and ruled section titles (10.5px, 0.2em).
- **Stamp** (Special Elite 400, 11px, 0.12em tracking, uppercase): stamps, case numbers (0.08em), log speakers.
- **Mono** (JetBrains Mono 400, 10.5 to 11.5px): times, folders, commands, progress counts, chips. Ages use tabular numerals.
- **Report Body** (Special Elite 400, 12.5px, line-height 1.6): the Night Report column, 12px under 330px. Its dateline name is 15px, 0.14em, uppercase; its section headings are 11px, 0.16em, uppercase, with a typed underline.

### Named Rules
**The Machine Voice Rule.** Anything Claude Code or the shell produced (commands, paths, times, counts) is set in mono, in every Theme. Anything filed by the detective (stamps, case numbers, the report) is set in VENGEANCE's typewriter; other Themes file in their own stamp and report faces.

## Layout

A single column inside a frameless window with a 1px warm border (#1d1714). The 54px header doubles as the title bar and drag region. Under it, the files layout has a tab row (Needs you, Cases) with a 14px gutter and 18px between tabs, then a scroll stage. The case detail and the bottom sheets (task drawer, settings) are layers over the stage, not new windows. Cards stack in a grid with 8px gaps inside 10px padding. Text inside cards sits on a 14px left edge, which leaves room for the colored rule.

The Night Report keeps the tab row and replaces the cards with one typed article per tab. A 114px margin column holds right-aligned stamps and ages, a 1px Dried Blood rule runs down the sheet at the margin, and the words start 12px after it. A double rule (3px double, Line) closes the dateline; entries carry 5px vertical padding.

Responsive behavior follows the panel's own width (container queries on `.app`, not the window), at three steps: under 360px the header title tightens; under 330px the Night Report margin shrinks to 100px with tighter tracking on stamps and headings; under 317px Bat-Clawd steps out before the buttons give up any room. The minimum window is 300x360.

The signal window is transparent, with the 64px disc 16px from its corner. The 300px notice card rides above it on a red beam and flips below or to the right near screen edges.

## Elevation & Depth

The system is lit rather than stacked. Surfaces are flat at rest. Depth comes from red light (glows with no offset, or with a negative spread so they read as light spill), black ambient shadows only where something floats over the desktop (notice card, disc), and a fixed atmosphere behind everything: a sodium-red haze from below, static SVG film grain at 4.5% opacity, and rain.

### Shadow Vocabulary
- **Wordmark glow** (`text-shadow: 0 0 14px rgb(175 0 6 / 35%)`): the masthead.
- **Lift glow** (`box-shadow: 0 6px 18px -8px var(--signal-glow)`): a card on hover, together with a 2px lift.
- **Urgent breath** (`box-shadow: 0 0 16px -2px var(--signal-glow), inset 0 0 12px -6px var(--signal-glow)`): the outline around urgent cards. Its opacity breathes from the shared clock (2.6s period).
- **Stamp glow** (`box-shadow: 0 0 12px var(--signal-glow)`): the needs-you count on the emblem.
- **Sheet spill** (`box-shadow: 0 -12px 34px -12px var(--signal-glow)`): bottom sheets rising from below.
- **Desk float** (`box-shadow: 0 10px 28px rgb(0 0 0 / 80%)`): the notice card over the desktop; urgent notices add `0 0 22px -6px var(--signal-glow)`.

### Named Rules
**The Light Not Lift Rule.** Elevation is shown with red light, not material. Black shadows are reserved for elements floating over the user's desktop.

**The One Clock Rule.** Anything that loops (breathing glow, heartbeat dots, mascot poses, rain) is sampled from the single 8 fps ticker and pauses when the window is hidden. Infinite CSS animations are not allowed.

## Shapes

Corners are barely softened. The base radius is 4px (cards, buttons, rows, alerts, mono fields). Stamps and chips use 2px, and the needs-you count is a 2px rectangle tilted -5 degrees. Only three things are round: bottom sheets (10px top corners), toggles (9px pill), and the signal disc and status dots (circles). Borders are 1px Line almost everywhere; stamps use a 1.5px border in their own ink.

The recurring silhouette is the ink stamp: a boxed typewriter word rotated -2.5 degrees (-1.5 degrees for working and quiet stamps in the report), worn through by a fractal-noise mask. The files layout marks cards with a 3px colored rule on the left edge, 8px from top and bottom, colored by what the case is about. The Night Report uses no side rules. Its forms are the vertical margin rule, a 4px pen bracket that holds an open case, and the hand-drawn red pen stroke.

## Components

### Buttons (icon buttons)
- **Shape:** 26px square, 4px radius, a 16px line icon (1.4 stroke, round caps) in Ash.
- **Hover / Focus:** Bone on Surface over 0.15s; the Quit button turns Bone on Dried Blood. Focus is a 1px Signal Red outline.
- They are the only buttons in the header, and they never shrink: the mascot gives way first.

### Tabs (files layout)
- Uppercase 12px labels at 0.16em in Ash, each with a mono count; selected and hovered labels turn Bone. The active tab carries a 2px Hot Signal underline with a red glow, sitting on the 1px Line rule beneath the row.

### Cards (files layout)
- **Corner Style:** 4px.
- **Background:** a Surface to near-black gradient at 92%; on hover it warms toward Raised and lifts 2px with the lift glow, and the border turns translucent Signal Red. Transitions take 0.18s on the ease-out curve.
- **Border:** 1px Line, plus the 3px left rule: Dried Blood (attention), Ash (stalled), Hot Signal (urgent).
- **Internal Padding:** 10px 12px 11px 14px, 4px between lines.
- **Content:** a top row (stamp or case number, then time or status), the title, a mono detail line, a progress bar (2px track, Blood-to-Hot gradient fill), and the quoted last words with a 1px left rule.
- Urgent cards carry the breathing outline.

### Stamps (signature)
Typewriter caps in a 1.5px box, rotated, at 92% opacity, with a noise mask so the ink looks worn. The ink sets the tier: Hot Signal for permission and error, Brick for waiting and new reply, Ash for stalled. In the Night Report the same stamp sits in the margin and takes the lifted inks: Pen Hot, Pen Soft, Bone for working cases, Ash for quiet ones.

### Chips
- 10px mono in Ash, 1px Line border, 2px radius, 1px 6px padding. They mark agent types and job kinds in case-detail rows.

### Lists (case-detail rows)
- 7px 8px padding, 4px radius, Surface on hover, 1px Signal Red focus outline. Completed text is struck through in a dimmed Ash. A task that has just completed flashes once with Hot Signal at 35% (0.9s).
- Section titles are 10.5px uppercase labels followed by a Line rule that fades out to the right.
- Alerts are boxes with a 3px left rule: Dried Blood on an 8% blood tint, or Hot Signal on a 12% signal tint for permission and error.

### Inputs / Fields
- **Toggles:** a 34x18 pill track on Surface with a Line border. When on, the track turns translucent Dried Blood with a Signal Red border, and the thumb slides 16px and lights up Bone with a red glow. Focus is a Signal Red outline offset 2px.
- **Sliders:** native, with Signal Red as the accent color.
- **Read-only mono fields:** 11.5px mono on Abyss, 1px Line, 4px radius, scrolling past 140px.

### Sheets
Bottom sheets rise over a 62% black backdrop with a 1.5px blur. They have 10px top corners, a warm near-black gradient, a translucent red top edge, the sheet spill glow, a 34x3 grip, and an Anton title.

### Signal Disc and Notice Card (signature)
- **Disc:** 64px. Unlit, it is dark glass with a warm rim. Lit, a red radial lens runs from #ff3b2f through Hot Signal and Signal Red to near-black, with the bat emblem as a shadow in it and a soft halo. The count is an Anton numeral on black in a Hot Signal box.
- **Notice card:** 300px, a warm near-black gradient, 1px Line, a 3px left rule (Ash, or Hot Signal plus a glow when urgent), the desk-float shadow, a stamp, a 14px title and a mono line, carried on a blurred red beam from the disc.

### Bat-Clawd (signature)
What follows is today's VENGEANCE Bat-Clawd. #88 redresses him under the Bat-Clawd Costume Rule: a charcoal suit, the orange jaw, a faint neutral rim in place of the red cowl and cape edges, and the red only as an aura when alarmed.

Claude Code's pixel Clawd in Clawd Orange, wearing a black cowl edged in Signal Red and a black cape with a Signal Red edge. The bat emblem sits on his chest in cowl black, whenever the cape leaves the chest bare (flying, alarmed, on watch); asleep, the wrapped cape covers it. Thrown open, the cape stays black inside, with only a Dried Blood thread running a step above its jagged hem, about a screen pixel wide so it reads apart from the edge at the header's size: small red details, never a red cape. Poses come from the shared clock; a click plays a single 0.7s hop. Every Theme keeps his orange, his white eyes and his three moods, and dresses him in its own cowl, cape, chest symbol and accessories; a Theme may swap any pose for a homage and add a Signature pose on the perch, in the intro and on a click.

### The Night Report (alternate panel layout)
One typed column on black, read top to bottom, under the same Needs you / Cases tabs as the case files. There are no cards and no slide-in screens: a case opens in place.
- **Dateline:** NIGHT REPORT in Bone typewriter caps on the left, the weekday, date and 24-hour time in 11px Ash on the right, on one line (the tabs carry the counts). A double rule closes it.
- **Entries:** a two-column grid, with the margin (stamp, then mono age) right-aligned and the words after the margin rule. Hover tints the entry with Raised at 45%. Focus is a 1px Bone outline inset by 1px. The case name is in Bone, the rest in Typed Ink.
- **Red pen:** a hand-drawn SVG stroke tiled under the action phrase (28x5 tile, `box-decoration-break: clone` so it follows wrapped lines). Pen Hot at 1.5px for blocked work (permission, error), Pen Soft at 1.1px for waiting work (waiting, reply), and no stroke for quiet work (stalled). It is a drawn stroke and not a text underline, so it reads neither as a link nor as a spelling mark.
- **Case paragraphs:** only what a glance needs: the title, the current task and "n of m filed", with a terminal button on the right. Clicking unfolds the case in place (height and opacity over 0.2s), held by an Ash pen bracket in the margin: its requests (stamp and pen), the case number, folder and Claude's last words in quotes (capped at 150 characters, typed out), a labelled Terminal button, then the notes.
- **Notes:** small uppercase group titles (Tasks, Subagents, In the background). Each line has a typed mark, the text and a state: typed checkboxes `[ ]` `[>]` `[x]` `[-]` for tasks, the agent type for subagents, `$` for jobs. Running lines mark in Bone; finished lines are struck through in Ash. A note line opens the existing task drawer.
- **Close:** "End of report." in 11px Ash.

## Do's and Don'ts

### Do:
- **Do** keep VENGEANCE's page pure black (#000000) and use Surface and Raised only as highlights over it; keep every Theme dark.
- **Do** spend each Theme's Alarm color only on "something needs you".
- **Do** spend red only on meaning: a lit light, a stamp, a pen mark, a request. In the Night Report, show running work in Bone.
- **Do** use Hot Signal for small lit details and thin rules, and Signal Red or Dried Blood for anything larger.
- **Do** mark alert tiers with stamp ink: hot for permission and error, brick (or Pen Soft in the report) for waiting and reply, Ash for stalled.
- **Do** set machine output (paths, commands, times, counts) in mono and filed paperwork (stamps, case numbers, the report) in Special Elite.
- **Do** drive every loop from the shared 8 fps clock and keep other motion one-off, on the ease-out curve (cubic-bezier(0.22, 1, 0.36, 1)), within 0.15 to 0.45s, with reduced motion honored.
- **Do** show depth with red glows, keeping black drop shadows for things that float over the desktop.
- **Do** design for 300x360 first: one line per field, an ellipsis over wrapping, and the mascot giving way before the controls.
- **Do** keep the header, the signal disc, Bat-Clawd and the stamps identical across both panel layouts.
- **Do** keep each Theme's bat emblem to its version's symbol (VENGEANCE: The Batman (2022)), one path per Theme drawn once and reused in the header, the disc, the intro and on Bat-Clawd's chest; never redraw it per place.

### Don't:
- **Don't** add infinite CSS animations or blend modes; they keep the compositor awake on a transparent always-on-top window.
- **Don't** use Hot Signal or Signal Red for running or in-progress text in the Night Report; running is news, not a request.
- **Don't** underline Night Report actions with a CSS text underline, straight or wavy; the pen is a drawn stroke.
- **Don't** bring cards, colored side rules or icon tiles into the Night Report; its marks are the margin rule, the stamps, the pen and typed checkboxes. Side rules remain correct in the files layout.
- **Don't** round corners past 4px except on sheets, toggles, the disc and status dots.
