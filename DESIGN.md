---
name: Boosterinio
description: Rank boosting and game goods sold from an arcade cabinet in attract mode.
colors:
  marquee: "#ffd93b"
  p1: "#ff2e88"
  p2: "#2f6bff"
  phosphor: "#5cf2d6"
  phosphor-dim: "#3cae9a"
  crt: "#051315"
  crt-2: "#0a2125"
  bezel: "#050505"
  cab: "#100f0e"
  cab-2: "#181716"
  cab-3: "#201f1d"
  cab-4: "#2f2d2a"
  cab-5: "#403d39"
  ink: "#f5f3ef"
  ink-2: "#b9b5ae"
  ink-3: "#918c85"
  ok: "#3be37a"
  warn: "#ffb547"
  bad: "#ff5a5a"
typography:
  display:
    fontFamily: "'Jersey 10', ui-monospace, monospace"
    fontSize: "3.7rem"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "0.02em"
  headline:
    fontFamily: "'Jersey 10', ui-monospace, monospace"
    fontSize: "3rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.02em"
  title:
    fontFamily: "'Jersey 10', ui-monospace, monospace"
    fontSize: "1.75rem"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "0.02em"
  readout:
    fontFamily: "'Jersey 10', ui-monospace, monospace"
    fontSize: "3.4rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.02em"
    fontFeature: '"tnum"'
  body:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  body-sm:
    fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Silkscreen, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    letterSpacing: "0.04em"
  button:
    fontFamily: "Silkscreen, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    letterSpacing: "0.04em"
rounded:
  badge: "6px"
  chip: "7px"
  control-sm: "9px"
  field: "10px"
  control: "11px"
  tile: "12px"
  control-lg: "13px"
  card: "14px"
  panel: "16px"
  screen: "26px"
spacing:
  control-gap: "8px"
  tile-gap: "12px"
  gutter: "16px"
  gutter-wide: "24px"
  panel: "20px"
  panel-wide: "24px"
  heading: "28px"
  section: "48px"
components:
  button-coin:
    backgroundColor: "{colors.marquee}"
    textColor: "#1d1600"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-coin-lg:
    backgroundColor: "{colors.marquee}"
    textColor: "#1d1600"
    typography: "{typography.button}"
    rounded: "{rounded.control-lg}"
    padding: "0 28px"
    height: "56px"
  button-p2:
    backgroundColor: "{colors.p2}"
    textColor: "#ffffff"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-p1:
    backgroundColor: "{colors.p1}"
    textColor: "#ffffff"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-ghost:
    backgroundColor: "{colors.cab-3}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-sm:
    rounded: "{rounded.control-sm}"
    padding: "0 14px"
    height: "36px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.bad}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  field:
    backgroundColor: "{colors.cab-3}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 14px"
    height: "44px"
  chip:
    backgroundColor: "{colors.cab-3}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
    padding: "0 8px"
    height: "24px"
  panel:
    backgroundColor: "{colors.cab-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
  card:
    backgroundColor: "{colors.cab-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px"
  crt-screen:
    backgroundColor: "{colors.crt}"
    textColor: "{colors.phosphor}"
    rounded: "{rounded.screen}"
    padding: "{spacing.panel-wide}"
  rail-item-active:
    backgroundColor: "{colors.cab-3}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0 12px"
    height: "40px"
  select-tile-active:
    backgroundColor: "{colors.cab-3}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    padding: "8px 2px 6px"
---

# Design System: Boosterinio

## Overview

**Creative North Star: "Attract Mode"**

Boosterinio is an arcade cabinet running its attract screen. The page is the cabinet's black laminate with a visible fleck grain; the header is the backlit marquee; the price is worked out live on a CRT screen; the purchase is a coin dropped into a lit push-button. Every surface is a part of that one machine, so nothing floats on a generic dark page and nothing is decorated for its own sake.

Light ranks the screen. The cabinet stays dark so its light sources can carry the hierarchy: the yellow coin plate is the brightest object in view and there is only one; the magenta-to-blue marquee plate glows at the top; phosphor readouts glow on the glass; status lamps glow at chip size; everything else is unlit laminate and warm ink. Color is either emitted (plates, phosphor, lamps) or printed (side-art bands, cartridge labels, tier crests), and type follows the same split: pixel faces for what the machine says, Rubik for what a person reads.

The full cabinet (marquee, side-art, CRT glass, instruction card) belongs to the storefront: home, game hubs, the boosting configurator, the marketplace, checkout and the order receipt. Dashboards, seller tools, the booster board and admin are Operate surfaces. They keep the world's type, palette, density and status lamps; the build also gives them the select-screen cursor on the active rail row and lit plates for their actions, but never glass, side-art or title extrusion.

**Key Characteristics:**
- One hot color: marquee yellow marks the single live action on a screen.
- Neutral cabinet-black ground with a visible laminate grain.
- CRT glass (teal-black, scanlines, glare, phosphor glow) holds totals and live readouts.
- Lit push-button plates with emitted glow and a soft drop; no inset lip.
- Three type voices: Jersey 10 display, Silkscreen labels, Rubik reading text.
- Authored pixel art for world signatures: select cursor, coin slot, mode caps, escrow shield, tier crests, the B mark.
- Diagonal side-art in P1 magenta, P2 blue and phosphor cyan frames the attract screen and caps the footer.

## Colors

A neutral cabinet black lit by one yellow coin, two player colors and a phosphor screen.

### Primary
- **Coin-Door Yellow** (#ffd93b): the live action, and only the live action. On the coin plate it is the middle stop of a radial face (#fff1a6 at the top, through #ffd93b, to #e9b900) with near-black coin ink (#1d1600) and a yellow glow. The same yellow marks the keyboard skip link while it holds focus and the button in transactional email; both are the live action of their moment.

### Secondary
- **Player-One Magenta** (#ff2e88): P1 and the select cursor. The pixel triangle and corner brackets on the current pick, the P1 tag, queue counts in rails (on a 15% magenta badge), sequence numerals, list markers, the instruction card's header band, text selection, the first side-art band and the start of the marquee plate.
- **Player-Two Blue** (#2f6bff): P2 and the choice already made. The secondary lit plate, selected divisions, segments, pages and filter pills, the GOAL cursor and tag, the staff-message tint, range inputs. Small blue text on laminate is lifted to a lighter tint (#86a8ff), because the base blue reads near 4.2:1 on cabinet black.

### Tertiary
- **Phosphor Cyan** (#5cf2d6): the screen's light. Totals and readout numerals (with a glow halo), links, the focus ring, the text caret, checkbox accents, the select chevron, the active rail icon, the info lamp and the third side-art band.
- **Dim Phosphor** (#3cae9a): legends on the glass (TOTAL, STAGE TIME, YOUR RANK, GOAL), detail text inside score lines, the border of a focused field.
- **CRT Glass** (#051315, centre #0a2125, edge #020a0b): the screen's teal-black, laid as a radial gradient inside a 10px **Bezel Black** (#050505) frame.

Text on glass uses phosphor-tinted inks that are literal values in the build, not theme tokens: values and titles #d8fff7, score-line labels #a9d9d0, intro copy #b9dcd5, captions and readout legends #9fcfc6.

### Neutral
- **Cabinet Black** (#100f0e): the page ground and browser theme color, under a laminate grain (a 180px fractal-noise tile of warm-white flecks at 8.5% alpha) that stays visible.
- **Laminate** (#181716): panel and card faces, toasts.
- **Raised Laminate** (#201f1d): fields, chips, segmented tracks, hovered rows, the active rail row, selected tiles.
- **Seam** (#2f2d2a): every 1px border and divider, table header rules, the CRT's outer ring.
- **Lit Seam** (#403d39): hover borders, the unranked crest, scrollbar hover.
- **Warm Ink** (#f5f3ef): headings and primary text.
- **Faded Ink** (#b9b5ae): body copy, form labels, secondary text.
- **Ghost Ink** (#918c85): meta, captions, breadcrumbs, table heads, inactive icons, zero counts.

### Status Lamps
- **Lamp Green** (#3be37a): completed, approved, live, free extras, all clear.
- **Lamp Amber** (#ffb547): waiting on a person (delivered, in review, open ticket, work waiting), warnings, internal staff notes.
- **Lamp Red** (#ff5a5a): disputed, rejected, suspended, errors, danger plates, alarming queue counts.

Info lamps use phosphor, muted lamps use ghost ink, and role lamps use P1 and P2.

### Named Rules
**The One Coin Rule.** Marquee yellow is the coin door's light, and a screen has one coin: the single live action (Insert coin · Buy boost, Pay, Confirm order, Save). Repeated or per-row actions (Claim order, Post update, Apply) take a P2 plate or a ghost plate. UI chrome never turns yellow: no yellow chip, lamp, border, link, band or highlight. Content keeps its own color (a Gold or Challenger crest, a game's label color) because it is printed content, not chrome.

**The Printed-Not-Lit Rule.** Side-art is printed in P1 magenta, P2 blue and phosphor cyan, in that order, on near-black. It is never yellow and never carries content.

**The Glass Holds The Total Rule.** A total, fee schedule or live figure the visitor has to trust is set on CRT glass as a phosphor display numeral with tabular figures: the configurator readout, the checkout and order receipts, the seller fee table. Catalog prices on cards and dashboard figures stay on laminate as display numerals in warm ink, or in a lamp color when the figure is a status (P1 for work waiting, red for alarms, phosphor for earnings).

## Typography

**Display Font:** Jersey 10 (with ui-monospace, monospace)
**Body Font:** Rubik (with ui-sans-serif, system-ui, sans-serif)
**Label/Mono Font:** Silkscreen (with ui-monospace, monospace)

**Character:** Jersey 10 is the marquee and the scoreboard: tall, condensed pixel capitals that make a price look like a score. Silkscreen is the legend printed on the cabinet's plates and lamps. Rubik's soft humanist forms carry every sentence, so the trust copy (escrow, approvals, support) never has to be deciphered.

### Hierarchy
- **Display** (400; 2.6rem, 3.3rem from 640px, 3.7rem from 1280px; line-height 0.92; 0.02em; uppercase): the page's h1, carrying the title extrusion. The sell page runs the same role from 3.4rem to 4.5rem.
- **Headline** (400; 2.4rem, 3rem from 640px; line-height 1; uppercase): section heads, dashboard and admin page titles (2.6rem to 3rem), the instruction card title (2.2rem to 2.6rem).
- **Title** (400; 1.75rem; line-height 0.92; uppercase): configurator panel titles. Empty-state titles run 1.875rem in faded ink; long-form h2 runs 2rem.
- **Readout** (400; 3.4rem; line-height 1; tabular figures): the configurator total in phosphor with its halo. The receipt total is 2.8rem, the coin bar 2rem, fee rows 1.6rem to 3rem. On laminate the same face sets listing prices (1.9rem), stat values (2.25rem) and counts.
- **Body** (Rubik 400; 1rem; line-height 1.625, long-form 1.7): all reading text, in faded ink at 62 to 70ch. Rubik 500 for nav links, card titles, FAQ questions and form labels; 600 for h3 and strong.
- **Small** (Rubik 400; 0.8125rem): hints, captions, breadcrumbs, meta and score-line labels.
- **Label** (Silkscreen 400; 0.6875rem; 0.04em; uppercase): chips, readout legends, table heads (0.05em), rail and footer group titles, order numbers. Plates set Silkscreen at 0.8125rem (0.75rem small, 0.9375rem large). The floor is 0.625rem: 1P/2P cap legends, admin group titles, badge counts.

### Named Rules
**The Machine Speaks In Pixels Rule.** Jersey 10 and Silkscreen are the cabinet talking: titles, numbers, plates, lamps, column heads, readout legends. Anything read as a sentence, any form value and any table body text is Rubik.

**The One Extrusion Rule.** The stepped P1-then-P2 extrusion belongs to the page's display h1 (and the unlit wordmark), once per screen. Section heads, panel titles and numerals stay flat.

**The No Kicker Rule.** Headings stand alone. No small uppercase label sits above a heading to introduce it; pixel labels name data (TOTAL, YOUR RANK, GOAL, column heads). Ordinals on a real sequence (Stage 1 to 4, approval steps 1 to 3) are content, set as P1 display numerals.

## Layout

The storefront sits in a centred 1320px container with 16px gutters (24px from 640px); admin content runs to 1400px with 32px gutters from 1024px. Sections stack on a 48px rhythm, section heads sit 28px above their content, and the footer opens 96px below the last section.

The attract screen is the home fold: one CRT spanning the container, framed by side-art columns (52px from 1024px, 72px from 1280px) that collapse into 20px bands above and below the screen on smaller viewports. Inside the glass, rank selection runs left and a 380px readout column runs right from 1024px; below that the readout stacks under the controls and a sticky coin bar carries the total. The full configurator page pairs a controls column with a 400px readout that sticks 96px from the top. The game select grid sits inside its own CRT at 2, 3, 4 and 6 columns; listing cards run 1, 2 and 4 across; category counters 2, 3 and 5.

The marquee header is 70px and sticky; its nav folds into a menu below 1280px and the wordmark drops below 460px, leaving the B on its plate. Operate surfaces use a 220px rail (dashboard, seller tools) or a full-height 252px rail under a 56px sticky top bar (admin); below 1024px the rails become a scrolling tab strip or a toggled sheet. Controls are 44px tall by default (36px small, 56px large); rail rows are 40px (36px in admin).

## Elevation & Depth

Depth is built the way a cabinet is built: light sources on top, glass recessed into a bezel, laminate panels raised on long soft drops. Every shadow is blurred and negatively spread; glow is kept for things that emit light.

### Shadow Vocabulary
- **Raised laminate** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.05), 0 24px 48px -28px rgb(0 0 0 / 0.85)`): panels, menus and forms, over a face with a 2.5% white top sheen.
- **Recessed glass** (`box-shadow: 0 0 0 1px #2f2d2a, inset 0 0 60px rgb(0 0 0 / 0.75), inset 0 0 18px rgb(92 242 214 / 0.06), 0 40px 80px -40px rgb(0 0 0 / 0.9)`): the CRT, with 1px phosphor scanlines at 3.5% every 3px and a 155° glare (white at 5.5%, gone by 32%).
- **Lit plate** (`box-shadow: 0 0 0 1px rgb(0 0 0 / 0.6), inset 0 1px 0 rgb(255 255 255 / 0.7), 0 0 22px -2px rgb(255 217 59 / 0.55), 0 10px 22px -10px rgb(0 0 0 / 0.8)`): the coin; hover widens the glow to `0 0 34px 2px` at 70%. P1 and P2 plates share the structure with their own glow (`0 0 20px -4px` at 60%, hover `0 0 28px 0` at 70%).
- **Unlit plate** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.06), 0 8px 16px -10px rgb(0 0 0 / 0.8)`): ghost plates.
- **Marquee bloom** (`box-shadow: 0 0 0 2px #050505, 0 0 0 3px rgb(255 255 255 / 0.08), 0 0 26px 3px rgb(255 46 136 / 0.6), 0 0 70px 16px rgb(255 46 136 / 0.22), inset 0 1px 0 rgb(255 255 255 / 0.55), inset 0 -6px 14px rgb(40 0 30 / 0.35)`): the logo plate only; its magenta light spills 220px down the page.
- **Phosphor halo** (`text-shadow: 0 0 10px rgb(92 242 214 / 0.45), 0 0 1px rgb(92 242 214 / 0.9)`): numerals on glass.
- **Focus** (`outline: 2px solid #5cf2d6; outline-offset: 2px`): every focusable element. Fields instead shift to a dim-phosphor border with a `0 0 0 3px rgb(92 242 214 / 0.16)` ring.

### Named Rules
**The Emitted Light Rule.** Glow means a light source: the coin and the other lit plates, the marquee plate, phosphor on glass, a status lamp, a pressed mode cap. Cards, borders and headings never glow.

**The Soft Drop Rule.** Objects cast long, blurred, negatively spread shadows (0 24px 48px -28px on panels). No panel, card or button takes a hard offset box-shadow; hard offsets live only inside type (the title extrusion, cartridge monograms).

## Shapes

Corners are softened rectangles whose radius grows with the object, so a chip and a screen read as parts of one machine. Borders are 1px seams in #2f2d2a; frames are heavier and black: a 10px bezel around the CRT, a 6px frame around the instruction card with an inset 1px rule at 15% white. Pixel art is the exception to rounding: it is drawn on an integer grid, rendered with crisp edges and scaled by whole pixels.

Side-art runs at -58° in a repeating 74px cycle (18px magenta, 8px gap, 18px blue, 8px gap, 6px phosphor, 16px gap) on #0b0a09. A softer 46px cycle at -62° and 45 to 55% alpha tops profile headers as a 6px strip.

### Named Rules
**The Radius Tracks Size Rule.** The bigger the object, the rounder the corner: 6px badge, 7px chip, 9px small plate, 10px field, 11px plate, 12px tile, 13px large plate, 14px card, 16px panel, 26px screen. Nested parts step down by their inset (an 11px track holds 8px segments).

## Components

### Buttons
Illuminated arcade plates: a translucent face lit from behind, sitting in a dark bezel.
- **Shape:** gently rounded plates (11px; 9px small; 13px large), 44px tall (36px small, 56px large), 20px side padding, Silkscreen caps at 0.8125rem with 0.04em tracking, an 8px icon gap.
- **Coin (primary):** radial yellow face, coin ink (#1d1600), lit-plate glow. The Insert coin plate carries the pixel coin-slot sprite at its left. One per screen.
- **P2 and P1:** radial faces (#8fb1ff to #2f6bff to #1f55e0; #ff8cc0 to #ff2e88 to #d81770), white legends, glow in their own color. P2 is the secondary lit action and the selected state; P1 appears only as P2's partner in a two-way choice.
- **Ghost (unlit):** a #262422 to #201f1d face with a 1px seam; hover lifts the seam to #403d39 and the face to #2c2a27 to #23211f. Navigation, filters, steppers, unselected choices, the menu button.
- **Danger:** transparent face, red legend, 1px red seam at 45%; hover adds a 10% red wash.
- **Link:** phosphor text with no plate, underlined on hover.
- **Hover / Press / Disabled:** hover widens the glow (lit) or the seam (ghost) over 160ms; press drops the plate 1px and lifts brightness 12% over 120ms on the expo ease-out; disabled plates fall to 45% opacity. Toggles (division, page, filter, segment) switch from ghost to P2 when chosen.

**The Lit Plate Rule.** A button is a translucent plate lit from behind: gradient face, a 1px dark bezel ring, a 1px top sheen, glow in its own color, a soft drop. No inset bottom lip and no hard offset shadow, on buttons or on selected segments and pills. Press is a 1px drop with a 12% brightness lift.

### Chips (status lamps)
- **Style:** 24px rectangles (7px), raised-laminate face, 1px seam, Silkscreen 0.6875rem caps in faded ink. A 6px square lamp leads the legend in the tone color, with a 6px glow of the same color.
- **Tones:** ok green, warn amber, bad red, info phosphor, muted ghost ink, P1 magenta, P2 light blue (#86a8ff). The plain variant drops the lamp for tags (payment methods, server and category). Over imagery the face turns black at 70 to 75%.

### Cards / Containers
- **Panel (raised laminate):** 16px corners, laminate face with a 2.5% top sheen, 1px seam, the raised-laminate shadow, 20px padding (24px from 640px). Configurator sections, header menus, offer cards.
- **Card (flat laminate):** 14px corners, laminate face, 1px seam, no shadow, 16 to 20px padding. Listing cards, stat tiles, tables, admin sections, empty states. Linked cards lift 2px and light their seam on hover. Listing cards show a 16:10 cover (or a 68px band in the game's color), lamp chips over it, Rubik title and attributes, the seller's avatar with 12px pixel stars (phosphor earned, #403d39 not), and the price as a display numeral.
- **CRT screen:** 26px corners, a 10px bezel, radial glass, scanlines and glare between the glass and its content; 20 to 24px padding (32px for standalone messages such as 404 and errors). Fee tables on glass run Silkscreen legends into dotted phosphor leaders and phosphor numerals.
- **Instruction card:** a printed card under plexiglass. 10px corners in the 6px black frame, an inset 1px rule, a P1 header band carrying the headline in white, P1 pixel-cursor bullets before Silkscreen rule titles, four pixel screws, a 118° plexi glare.
- **Accordion:** native disclosure rows between 1px seams; questions in Rubik 1.0625rem 500, a stroke chevron that turns 180° over 200ms, answers in faded ink at 70ch.

### Inputs / Fields
- **Style:** 44px minimum height, raised-laminate face, 1px seam, 10px corners, Rubik 0.9375rem, faded-ink placeholder, phosphor caret. Labels sit 6px above in Rubik 0.8125rem 500 faded ink; hints and errors sit 6px below at 0.8125rem.
- **Focus:** the seam turns dim phosphor and a 3px phosphor ring at 16% appears over 140ms; no outline.
- **Error / Disabled:** an invalid field takes a red seam at 70% with a red message below.
- **Select:** the native arrow is replaced by a 12×8 pixel chevron in phosphor.
- **Segmented:** a raised-laminate track (11px, 4px inset) of 36px segments (8px); the chosen segment fills P2 with a white legend.
- **Checks and ranges:** checkboxes take phosphor and ranges take P2; a chosen add-on row tints phosphor at 6% behind a dim-phosphor seam.

### Navigation
- **Marquee header:** a 70px sticky cabinet top (#1a1816 fading to #100f0e, with a magenta wash at the left) where the lit marquee plate holds the B mark and the wordmark. Nav links in Rubik 0.9375rem 500 move from faded to warm ink on hover while the P1 pixel cursor slides in from the left. Sign in is a text link; Create account is a small ghost plate. Below 1280px a ghost menu plate opens a raised panel of 44px rows.
- **Rails:** 40px rows (36px in admin), 10px corners (9px in admin), faded ink with ghost-ink stroke icons. The active row takes the raised-laminate face, warm ink, a phosphor icon and the P1 pixel cursor in its left gutter. Queue counts sit in P1 display numerals on a 15% magenta badge; group titles in Silkscreen 0.625 to 0.6875rem ghost ink.
- **Tabs:** 36px link tabs with 9px corners; the current tab is a #2f2d2a face with warm ink, the rest faded ink with a raised-laminate hover.
- **Breadcrumbs:** Rubik 0.8125rem ghost ink with slash separators; the current page in faded ink.
- **Footer:** a 28px side-art band caps a #0b0a09 ground; Silkscreen column titles over Rubik 0.875rem links; payment methods as plain chips.

### Select-Screen Cursor
The world's pointer. Corner brackets (14px, 3px stroke, set 5px outside the item) slide 3px into place and fade in over 120 to 160ms on hover, focus and the chosen state. Their color comes from the player: P1 magenta for the current pick, game cartridges and listing cards; P2 blue for the goal, coaches and packages. The 5×5 pixel triangle marks hovered nav links, the active rail row, house-rule titles and market counters. In the tier picker, Boosterinio's own pixel crests sit on 12px tiles (5 across, 10 from 1280px) with the P1 or GOAL tag above the chosen tile; unreachable tiers drop to 25%.

### Score Readout
The configurator's CRT readout: start and goal crests (64px) joined by a pixel dashed arrow; itemized score lines in #a9d9d0 with values in #d8fff7 that flash phosphor at 20% for 900ms when they change; the TOTAL numeral rolling to its new value over 520ms on an exponential ease-out; a stage-time estimate; the 1P SOLO and 2P DUO mode caps; the coin plate; the escrow note beside the pixel shield. Below 1024px a sticky coin bar (14px, #071718 face, phosphor ring at 12%) pins the total and a compact coin to the bottom of the controls column. It scrolls away with that column before the full readout arrives, so one coin is lit in view.

### Mode Caps
Round arcade buttons drawn on a 12×12 pixel grid: dark rim, colored dome, highlight up-left, shade down-right, 44px across with a Silkscreen 1P or 2P legend. The chosen cap drops 1px, loses its highlight and lights with a 10px glow in its player color; the other sits at 55% opacity and half saturation.

### Game Cartridge
A 14px card whose 4:3 label is the game's own color fading into cabinet black at 160°, under a scanline overlay at 25%, with the short name in white display type (2.6rem to 3rem) on a hard 2px black drop. Games with boosting carry a phosphor lamp chip. Hover lifts the cartridge 4px and lights its seam. A licensed cover image may fill the label.

## Do's and Don'ts

### Do:
- **Do** light exactly one coin plate per screen (marquee yellow, #1d1600 legend, the coin-slot sprite on Insert coin) and keep it the brightest object in view.
- **Do** set totals, fees and live figures on CRT glass as phosphor display numerals with tabular figures, labelled in dim-phosphor Silkscreen.
- **Do** use the P2 plate for selected states and repeated actions; pair P1 and P2 plates only for a two-way choice (Apply to sell / Apply to boost, Solo / Duo).
- **Do** mark the hovered or chosen item with the select-screen cursor: corner brackets or the pixel triangle, P1 magenta for the current pick and P2 blue for the goal.
- **Do** draw world signatures as integer-grid pixel art with crisp edges (cursor, coin slot, mode caps, shield, tier crests, the B mark) and keep 16 to 20px stroke icons for utility controls.
- **Do** keep reading copy in Rubik at 62 to 70ch in faded ink on laminate.
- **Do** let a changed number move visibly (score lines flash for 900ms, totals roll for 520ms) and still every animation and transition under reduced motion.
- **Do** give Operate surfaces (dashboard, seller tools, booster board, admin) the world's type, palette, density, status lamps, rail cursor and plates, with dense tables under Silkscreen column heads.

### Don't:
- **Don't** put marquee yellow on chrome other than the live action: no yellow chip or lamp, border, link, side-art band, badge or highlight.
- **Don't** light two coin plates on one screen; the second action is a P2 or ghost plate.
- **Don't** set a kicker or eyebrow label above a heading.
- **Don't** give plates, segments or pills an inset bottom lip, and don't give any panel, card or button a hard offset box-shadow.
- **Don't** bring CRT glass, scanlines, side-art or title extrusion into dashboards, seller tools, the booster board or admin.
- **Don't** set sentences, form values or table body text in a pixel face, or set any pixel label below 10px (0.625rem).
- **Don't** use typed glyphs as icons (text arrows, stars, check marks); use a stroke icon or authored pixel art.
- **Don't** lead with orange or add a second hot accent; warn amber is a status lamp, not a brand color.
- **Don't** fall back to the category default: champion splash art as atmosphere, a flat untextured dark page, or icon-card feature grids. A game is its cartridge: label color, pixel monogram, or a licensed cover on the label.
