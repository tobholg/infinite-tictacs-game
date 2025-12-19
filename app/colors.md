# CSS That Could Not Be Converted to Tailwind

This document tracks CSS that must remain as traditional CSS due to technical limitations of Tailwind CSS.

## CSS Variables (design-system.css)

All color, spacing, typography, and neon variables in `:root` must remain as CSS because:
- Tailwind references these variables via `var(--color-*)`, `var(--neon-*)`, etc.
- Theme switching relies on data-attribute selectors (`:root.light`, `[data-theme="christmas"]`)
- Variables must be available before Tailwind classes are applied

## Theme System (design-system.css)

### Light Mode (:root.light)
- Overrides all color variables for light backgrounds
- Custom body background gradient
- Adjusted text shadows for headings

### Christmas Theme ([data-theme="christmas"])
- Complete color palette override for festive colors
- Custom ambient gradients
- Symbol glow overrides
- Forces dark mode even when system is light

## Dynamic CSS Variables

### SnowEffect.vue
Snowflake animations require per-element dynamic CSS variables:
- `--duration`: Random fall duration per snowflake
- `--delay`: Random animation delay per snowflake
- `--drift`: Random horizontal movement
- `--flake-opacity`: Random opacity per snowflake

### PlayerTurnBar.vue
Dynamic glow colors based on current player's symbol:
- `--glow-color`: Set via `:style` binding at runtime
- Used in box-shadow for segment glow effects

## Complex Pseudo-Elements

### body::before Grid Overlay
Decorative grid pattern that cannot be Tailwind:
- `::before` pseudo-element on body
- Complex repeating-linear-gradient
- Theme-specific overrides

## Keyframe Animations

### Component-specific animations kept in scoped styles:
- `dropdownSlide` - CharacterPicker dropdown
- `segmentPulse`, `winnerGlow`, `indicatorPulse` - PlayerTurnBar
- `overlayFadeIn`, `popupSlideIn` - GameModeParliament
- `snowfall` - SnowEffect
- `pulse` - ProgressIndicator

### Global animations in design-system.css:
- `gradientShift` - Body background animation
- `cellAppear`, `winningPulse`, `gridPulse` - Game board
- `iconPulse`, `activePlayerPulse` - UI feedback
- `selectedCellPulse` - Mobile touch feedback
- `shine` - Button hover effect

## State-Based Styling

The following use conditional state classes that require CSS:
- `.preset-card.favorite`, `.preset-card.disabled` - GameModeParliament
- `.theme-option.active`, `.animation-option.active`, `.effect-card.active` - Settings popups
- `.picker-button.open`, `.picker-button.disabled` - CharacterPicker
- `.symbol-option.selected`, `.symbol-option.disabled` - CharacterPicker
- `.mute-btn.muted` - SoundSettingsPopup
- Vue transition classes (`modal-fade-*`)

## Slider Thumb Styling

Range input thumb styling (SoundSettingsPopup):
- `::-webkit-slider-thumb`
- `::-moz-range-thumb`

Cannot be done with Tailwind utilities.

## Mobile Touch Support (design-system.css)

- `.board.is-panning` - Disables transitions while panning
- `.cell.cell-selected` - Mobile tap-to-select highlight
- Touch device media query `@media (hover: none) and (pointer: coarse)`

---

## Summary

| Category | Items | Location |
|----------|-------|----------|
| CSS Variables | ~100 color/spacing/shadow vars | design-system.css |
| Theme Overrides | Light mode, Christmas theme | design-system.css |
| Dynamic Variables | SnowEffect, PlayerTurnBar | Component scoped |
| Keyframe Animations | ~15 animations | design-system.css + components |
| State Classes | hover/active/selected states | Component scoped |
| Pseudo-elements | body::before grid overlay | design-system.css |
| Browser-specific | Slider thumbs | SoundSettingsPopup |
| Mobile Touch | Pan states, touch feedback | design-system.css |
