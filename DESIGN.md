---
version: alpha
name: Garnet-desktop-design
description: A calm, native-feeling desktop app design system for Garnet. A muted, low-saturation garnet red accent used sparingly against a neutral gray UI, IBM Plex Sans typography at readable UI sizes, hairline borders instead of shadows, and modest corner rounding — built to read as a native desktop application, not a marketing website.

colors:
  primary: "#8C2F3A"
  primary-hover: "#7A2731"
  primary-soft: "#F5E6E8"
  on-primary: "#ffffff"
  ink: "#1E1E1E"
  body: "#6B6B6B"
  mute: "#A3A3A3"
  canvas: "#FFFFFF"
  canvas-soft: "#F5F5F5"
  border: "#E5E5E5"
  border-strong: "#D0D0D0"
  on-dark: "#F0F0F0"
  canvas-dark: "#1E1E1E"
  canvas-soft-dark: "#2A2A2A"
  border-dark: "#3A3A3A"
  glass-light: "rgba(255, 255, 255, 0.72)"
  glass-dark: "rgba(30, 30, 30, 0.72)"

typography:
  title-lg:
    fontFamily: IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 22px
    fontWeight: 600
    lineHeight: 30px
  title-md:
    fontFamily: IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 18px
    fontWeight: 600
    lineHeight: 26px
  title-sm:
    fontFamily: IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 15px
    fontWeight: 600
    lineHeight: 22px
  body:
    fontFamily: IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 21px
  body-strong:
    fontFamily: IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 14px
    fontWeight: 600
    lineHeight: 21px
  body-sm:
    fontFamily: IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 19px
  body-sm-strong:
    fontFamily: IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 13px
    fontWeight: 600
    lineHeight: 19px
  caption:
    fontFamily: IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 12px
    fontWeight: 400
    lineHeight: 17px
  caption-strong:
    fontFamily: IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 12px
    fontWeight: 600
    lineHeight: 17px
  button:
    fontFamily: IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
  mono:
    fontFamily: IBM Plex Mono, ui-monospace, SFMono-Regular, monospace
    fontSize: 13px
    fontWeight: 400
    lineHeight: 19px

rounded:
  none: 0px
  xs: 3px
  sm: 4px
  md: 6px
  lg: 10px
  window: 26px
  full: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
  3xl: 32px

components:
  drag-region:
    height: 38px
    description: "Invisible full-width strip reserved for window dragging where the native title bar used to be."
  sidebar:
    backgroundColor: "{colors.glass-light}"
    borderColor: "{colors.border}"
    rounded: "{rounded.window} 0 0 {rounded.window}"
    flush: "top, left, bottom"
    padding: "36px {spacing.sm} {spacing.sm}"
  sidebar-item:
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs} {spacing.sm}"
  sidebar-item-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    activeIndicator: "{colors.primary}"
    typography: "{typography.body-sm-strong}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs} {spacing.sm}"
  toolbar:
    backgroundColor: "{colors.canvas}"
    borderColor: "{colors.border}"
    padding: "{spacing.xs} {spacing.md}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    borderColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs} {spacing.lg}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.border-strong}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs} {spacing.lg}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs} {spacing.md}"
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.border-strong}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs} {spacing.md}"
  text-input-focus:
    borderColor: "{colors.primary}"
  panel:
    backgroundColor: "{colors.canvas}"
    borderColor: "{colors.border}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  list-row:
    backgroundColor: "{colors.canvas}"
    borderColor: "{colors.border}"
    typography: "{typography.body-sm}"
    padding: "{spacing.sm} {spacing.md}"
  tab:
    textColor: "{colors.body}"
    typography: "{typography.body-sm}"
    padding: "{spacing.xs} {spacing.md}"
  tab-active:
    textColor: "{colors.ink}"
    activeIndicator: "{colors.primary}"
    typography: "{typography.body-sm-strong}"
    padding: "{spacing.xs} {spacing.md}"
  badge:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.body}"
    borderColor: "{colors.border}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xxs} {spacing.sm}"
  status-dot:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.full}"
  divider:
    borderColor: "{colors.border}"
  popover:
    backgroundColor: "{colors.glass-light}"
    borderColor: "{colors.border}"
    rounded: "{rounded.lg}"
    padding: "{spacing.sm}"
  dialog:
    backgroundColor: "{colors.glass-light}"
    borderColor: "{colors.border}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
  tooltip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-dark}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xxs} {spacing.sm}"

---


## Overview

Garnet is a daily-use desktop app, not a campaign site, so the design language is deliberately quiet. The accent color is a muted, low-saturation garnet red (`{colors.primary}`) rather than a billboard red — it nods to the app's name without shouting. It appears only where it needs to: primary actions, the active sidebar item, focus states, status dots. Everything else — window chrome, panels, toolbars — lives in a tight neutral gray scale, the same way native OS chrome does.

Type is IBM Plex Sans at UI sizes (12–22px), not display sizes. There is no hero headline anywhere in this system. The type scale exists to keep long sessions of reading comfortable, so sizes and line-heights are never pushed below a legible floor just to cram in more content — `{typography.body}` (14px / 21px line-height) is the default reading size, and `{typography.caption}` (12px / 17px) is the smallest anything gets.

Depth comes from **hairline borders** (`{colors.border}`, 1px), not shadows. Panels, sidebars, toolbars, and list rows are separated by a thin line, never a drop shadow — the fewer elevation layers a UI has, the more it reads as a native desktop surface instead of a web page. The one exception is floating surfaces (popovers, menus, dialogs), which borrow an Apple-style "liquid glass" treatment: a translucent, blurred background (`{colors.glass-light}` / `{colors.glass-dark}`) plus a hairline border — separation through translucency and blur, not shadow.

Corners are rounded, but modestly (`{rounded.sm}` 4px – `{rounded.lg}` 10px). Nothing in this system is a full pill; heavy rounding reads as a marketing site's CTA, not an app control.

**Key Characteristics:**
- A single accent color, `{colors.primary}` — a desaturated garnet red — used only for primary actions, active/selected states, and focus rings. It is never a large fill.
- Neutral gray chrome (`{colors.canvas}` / `{colors.canvas-soft}` / `{colors.border}`) carries the actual UI surface, the same way native OS window chrome does.
- IBM Plex Sans across the whole system, at UI sizes only. No display/hero type scale.
- Depth via hairline borders, not shadows. The only shadow-free exception to the "no elevation" rule is a translucent glass treatment for floating surfaces (popovers, menus, dialogs) — blur + border, not a cast shadow.
- Modest corner radius (4–10px) everywhere; no pill buttons, no `9999px` shapes except tiny status dots.
- No editorial photography, no full-bleed hero bands. The app is an app shell — a hidden/inset title bar, a floating glass sidebar card, and content — not a page.

## Colors

### Brand & Accent
- **Garnet** (`{colors.primary}` — `#8C2F3A`): The single accent. Reserved for primary buttons, the active sidebar item, tab indicators, focus rings, and status dots. Deliberately desaturated relative to a marketing red so it doesn't fatigue the eye across a full workday.
- **Garnet Hover** (`{colors.primary-hover}` — `#7A2731`): Hover/pressed state for primary-accented controls.
- **Garnet Soft** (`{colors.primary-soft}` — `#F5E6E8`): A near-white tint of the accent, used only as a background for selected/active rows — never as a border or text color.

### Surface
- **Canvas** (`{colors.canvas}` — `#FFFFFF`): Default content background.
- **Canvas Soft** (`{colors.canvas-soft}` — `#F5F5F5`): Sidebar, title bar, and badge background — the same tone shift native OS chrome uses to separate structural regions from content.
- **Border** (`{colors.border}` — `#E5E5E5`): The default hairline used to separate panels, rows, and toolbars. This — not shadow — is the system's primary depth cue.
- **Border Strong** (`{colors.border-strong}` — `#D0D0D0`): Input borders and secondary-button borders, where a hairline needs slightly more presence.

### Text
- **Ink** (`{colors.ink}` — `#1E1E1E`): Primary text. Near-black, not pure black, to keep contrast comfortable rather than harsh.
- **Body** (`{colors.body}` — `#6B6B6B`): Secondary text — metadata, inactive tab labels, supporting copy.
- **Mute** (`{colors.mute}` — `#A3A3A3`): Placeholder text and the lowest-priority labels.
- **On Dark** (`{colors.on-dark}` — `#F0F0F0`): Text on `{colors.ink}`-toned surfaces (tooltips).

### Dark Mode
Dark mode swaps the neutral scale, not the accent: `{colors.canvas-dark}` (`#1E1E1E`) replaces canvas, `{colors.canvas-soft-dark}` (`#2A2A2A`) replaces canvas-soft, `{colors.border-dark}` (`#3A3A3A`) replaces border, and `{colors.glass-dark}` replaces the glass surface. `{colors.primary}` stays the same garnet — it already sits at a brightness that works on both light and dark chrome.

### Semantic
No separate semantic palette is defined yet. Destructive/warning/success colors should be added as a small, equally desaturated set when the first destructive action is designed — don't reach for saturated red/green/orange from outside this palette.

## Typography

### Font Family
**IBM Plex Sans** carries the entire system, falling back to the OS system font (`-apple-system` / `Segoe UI`). **IBM Plex Mono** is available for the rare monospace need (file paths, IDs, code).

### Hierarchy

| Token | Size | Weight | Line Height | Use |
|---|---|---|---|---|
| `{typography.title-lg}` | 22px | 600 | 30px | Window/page-level title (e.g. a settings screen's top heading). Used at most once per screen. |
| `{typography.title-md}` | 18px | 600 | 26px | Panel/section title. |
| `{typography.title-sm}` | 15px | 600 | 22px | Card or list-group title. |
| `{typography.body}` | 14px | 400 | 21px | Default UI text. The reading-comfort floor for this system. |
| `{typography.body-strong}` | 14px | 600 | 21px | Emphasized inline text at body size. |
| `{typography.body-sm}` | 13px | 400 | 19px | Secondary body text — list rows, form labels. |
| `{typography.body-sm-strong}` | 13px | 600 | 19px | Emphasized secondary text — active tab/sidebar labels. |
| `{typography.caption}` | 12px | 400 | 17px | Metadata, timestamps, fine print. Smallest size in the system. |
| `{typography.caption-strong}` | 12px | 600 | 17px | Badge labels. |
| `{typography.button}` | 14px | 500 | 20px | Button label. |
| `{typography.mono}` | 13px | 400 | 19px | Paths, IDs, code fragments. |

### Principles
- **14px / 21px line-height is the default, not a compromise.** Information density comes from layout (tighter component padding, denser lists) — never from shrinking type or line-height past a comfortable reading size. `{typography.caption}` at 12px/17px is the floor; nothing goes smaller.
- **Weight range is 400–600 only.** No 700/800 "shout" weights, no uppercase display type. The calmest weight that still creates enough contrast to establish hierarchy is the right one.
- **One family, two roles.** IBM Plex Sans for everything readable, IBM Plex Mono only for literal technical strings — never for general UI text.

## Layout

### Spacing System
- **Base unit**: 4px.
- **Tokens**: `{spacing.xxs}` 2px · `{spacing.xs}` 4px · `{spacing.sm}` 8px · `{spacing.md}` 12px · `{spacing.lg}` 16px · `{spacing.xl}` 20px · `{spacing.2xl}` 24px · `{spacing.3xl}` 32px.
- **Component padding**: controls (buttons, inputs, list rows) use `{spacing.xs}`–`{spacing.md}` — tight, native-control sizing, not marketing-card padding.
- **Panel padding**: `{spacing.lg}`–`{spacing.xl}` interior padding for panels and dialogs.
- **Outer app padding**: `{spacing.2xl}`–`{spacing.3xl}` is reserved for the outermost app-shell gutters only — it should almost never appear inside a component.

### Grid & Container
- The app is a fixed-chrome shell: a hidden/inset title bar with a draggable strip (top) + a floating glass sidebar card (left) + content area, not a scrolling marketing page.
- Content area uses whatever grid/list layout the screen needs; there is no fixed marketing container width to preserve.

### Whitespace Philosophy
Whitespace is used to group related controls, not to create dramatic pauses between sections. Favor denser, list-like layouts over generously-spaced card grids — but never at the cost of the type-size/line-height floor above.

### Window Sizing
- **Minimum window size**: should stay usable down to roughly 960×640; the sidebar collapses to icon-only before content reflows.
- **Sidebar**: fixed width (~220–260px) when expanded, ~52px when collapsed to icons.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Level 0 — Flat | No border, no shadow. | Default content surface. |
| Level 1 — Hairline | 1px solid `{colors.border}`. | The system's primary depth cue — separates sidebar/toolbar/panels/rows from each other. |
| Level 2 — Glass | Translucent `{colors.glass-light}`/`{colors.glass-dark}` fill + backdrop blur (~16px) + 1px `{colors.border}` hairline. No shadow. | Floating surfaces only: popovers, dropdown menus, dialogs. |

**No drop shadows anywhere in this system**, including on floating surfaces — the glass treatment (translucency + blur + hairline) does the separation work shadows would normally do. Fewer elevation layers keeps the app reading as native chrome rather than a web page; when in doubt, remove a layer rather than add one.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | Title bar, full-width toolbars. |
| `{rounded.xs}` | 3px | Tightest inline chrome (small badges, status pills). |
| `{rounded.sm}` | 4px | Inputs, sidebar items, small badges. |
| `{rounded.md}` | 6px | The system's canonical control radius — buttons, list rows. |
| `{rounded.lg}` | 10px | Panels, popovers, dialogs — the largest radius for ordinary UI surfaces. |
| `{rounded.window}` | 26px | The sidebar card only. Matches the macOS window's own corner curve (measured, not documented by Apple — see note below) so the floating card reads as cut from the same corner as the window itself. |
| `{rounded.full}` | 9999px | Status dots and small circular avatars only — never buttons. |

Nothing in this system uses a pill shape for an interactive control. `{rounded.lg}` (10px) is the ceiling for ordinary UI surfaces; `{rounded.window}` is a deliberate, single-purpose exception, not a second scale to reach for elsewhere.

**On `{rounded.window}`:** Apple doesn't publish an exact corner radius for window chrome — it's an internal WindowServer detail drawn as a continuous ("squircle") curve, not a circular arc, so a CSS `border-radius` can only approximate it. The 26px figure comes from measuring this app's actual window (with `mac.TitleBarHiddenInset()`) at a known 2x scale factor, fitting a circle to the corner curve at multiple points — it is not a generic constant and should be re-measured if the title bar style changes.

## Components

### Buttons

**`button-primary`** — the accented action, used once per view for the primary action.
- Background `{colors.primary}`, text `{colors.on-primary}`, label in `{typography.button}`, padding `{spacing.xs} {spacing.lg}`, shape `{rounded.md}` 6px. Hover uses `{colors.primary-hover}`.

**`button-secondary`** — the default action button.
- Background `{colors.canvas}`, text `{colors.ink}`, 1px `{colors.border-strong}` border, same label/padding/shape as `button-primary`.

**`button-ghost`** — the lowest-emphasis action (toolbar icons, inline actions).
- Transparent background, text `{colors.ink}`, no border, padding `{spacing.xs} {spacing.md}`, shape `{rounded.md}`.

### Panels, Rows & Lists

**`panel`** — the default content container.
- Background `{colors.canvas}`, 1px `{colors.border}` border, padding `{spacing.lg}`, shape `{rounded.lg}` 10px. No shadow.

**`list-row`** — a single row in a list/table.
- Background `{colors.canvas}`, bottom `{colors.border}` hairline, padding `{spacing.sm} {spacing.md}`, text in `{typography.body-sm}`.

### Inputs & Forms

**`text-input`** — the canonical text input.
- Background `{colors.canvas}`, text `{colors.ink}`, 1px `{colors.border-strong}` border, body in `{typography.body-sm}`, padding `{spacing.xs} {spacing.md}`, shape `{rounded.sm}` 4px. Focus swaps the border to `{colors.primary}` — no glow, no shadow.

### Navigation

**`drag-region`** — the native title bar is hidden; window dragging happens over an invisible 38px strip at the top of the window instead (macOS traffic lights float over the left edge of this strip, inset from the corner).

**`sidebar`** — a translucent glass pane, flush with the window, not an inset floating card.
- Background `{colors.glass-light}`/`{colors.glass-dark}` (translucent + blurred), flush against the window's top/left/bottom edges (no margin), 1px `{colors.border}` hairline on the right edge only (the divider from content). Top-left and bottom-left corners use `{rounded.window}` 26px — the *same* origin and radius as the window's own corner, so this curve is the window's corner, not a second one drawn a few pixels inside it. Top-right/bottom-right corners are square (interior edge). Top padding is 36px to clear the traffic lights. The "floating panel" feel comes entirely from the translucency, not from a gap — adding a margin here reintroduces a second, competing corner radius and actually crowds the traffic lights rather than giving them more room (the math doesn't work the way it looks like it should — verify visually before assuming a bigger gap helps).

**`sidebar-item`** / **`sidebar-item-active`** — navigation entries inside the sidebar.
- Default: text `{colors.ink}`, `{typography.body-sm}`. Active: background `{colors.primary-soft}`, text `{colors.primary}`, `{typography.body-sm-strong}` — a soft tint, not a solid accent fill.

**`tab`** / **`tab-active`** — in-page tab navigation.
- Default: text `{colors.body}`. Active: text `{colors.ink}` plus a `{colors.primary}` underline indicator — the accent appears only as a thin indicator line, never a filled background.

### Overlays

**`popover`** / **`dialog`** — floating surfaces.
- Background `{colors.glass-light}` (translucent, blurred), 1px `{colors.border}` border, shape `{rounded.lg}` 10px. No shadow — separation comes from the glass treatment.

**`tooltip`** — the small hover label.
- Background `{colors.ink}`, text `{colors.on-dark}`, `{typography.caption}`, padding `{spacing.xxs} {spacing.sm}`, shape `{rounded.sm}`.

### Misc

**`badge`** — inline metadata pill.
- Background `{colors.canvas-soft}`, text `{colors.body}`, 1px `{colors.border}` border, label in `{typography.caption-strong}`, padding `{spacing.xxs} {spacing.sm}`, shape `{rounded.sm}` 4px.

**`status-dot`** — a small circular status indicator.
- Background `{colors.primary}` (or a semantic color once defined), shape `{rounded.full}`.

**`divider`** — a 1px hairline used to separate sections.
- 1px solid `{colors.border}`.

## Do's and Don'ts

### Do
- Reserve `{colors.primary}` for primary actions, active/selected states, focus rings, and status indicators — never a large fill.
- Separate panels, rows, and toolbars with a `{colors.border}` hairline. This is the system's depth cue.
- Use the glass treatment (`{colors.glass-light}`/`{colors.glass-dark}` + blur + hairline) for floating surfaces only — popovers, menus, dialogs.
- Keep body text at `{typography.body}` (14px/21px) or larger for anything meant to be read continuously; use layout density, not smaller type, to fit more on screen.
- Keep corner radius in the 4–10px range (`{rounded.sm}`–`{rounded.lg}`).

### Don't
- Don't use `{colors.primary}` as a large background fill — it reads as a marketing CTA, not an app control.
- Don't add a drop shadow to any surface, floating or not. If a floating surface needs separation, reach for the glass treatment, not a shadow.
- Don't round any interactive control into a pill. `{rounded.lg}` (10px) is the largest radius in the system.
- Don't drop type size or line-height below `{typography.caption}` (12px/17px) to fit more content — solve density with layout instead.
- Don't introduce a second saturated accent color; semantic colors (destructive, warning, success), when added, should match this palette's desaturation.
