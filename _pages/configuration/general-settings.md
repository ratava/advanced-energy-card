---
title: "General Settings"
permalink: /configuration/general-settings/
---

General Settings control card-wide behaviour — the background SVG, language, display units, animation style, and sun/moon tracking. All options apply to **both** the Tech and Overview profiles.

## Background & Profile

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `background` | text | — | Path to the background SVG (e.g. `/local/community/advanced-energy-card/tech.svg`). The active profile (Tech or Overview) is detected automatically from the SVG's `data-profile-id` attribute. | Both |
| `day_night_mode` | select | Auto | Card appearance mode. **Auto** switches based on `sun.sun` state (above/below horizon). | Both |

## Language & Units

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `language` | select | en | Editor and card language. Available languages: `en`, `de`, `es`, `fr`, `it`, `nl`. | Both |
| `display_unit` | select | kW | Power unit used for all displayed values and threshold comparisons. `W` or `kW`. | Both |

## Updates & Misc

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `update_interval` | number | 0 | Card refresh cadence in seconds (0 = no throttle, updates on every HA state change). | Both |
| `initial_configuration` | boolean | true | Show the Initial Configuration wizard section in the editor. Disable once setup is complete. | Both |
| `enable_echo_alive` | boolean | false | Injects an invisible iframe to keep the Amazon Silk browser alive on Echo Show devices. | Both |

## Animation

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `animation_style` | select | — | Flow animation style used in Day mode. Options include `dashes`, `dashes_glow`, `fluid_flow`, `arrows`, and `none`. | Both |
| `night_animation_style` | select | — | Flow animation style used in Night mode. Leave blank to reuse Day style. | Both |
| `animation_speed_factor` | number | 1× | Animation speed multiplier (−3× to 3×). Set `0` to pause; negatives reverse direction. | Both |
| `dashes_glow_intensity` | number | — | Glow strength for the **Dashes + Glow** style (0 disables glow). | Both |
| `fluid_flow_outer_glow` | boolean | — | Enable the outer haze/glow layer for the **Fluid Flow** animation style. | Both |
| `flow_stroke_width` | number | 3 px | Override the animated flow stroke width for all paths. Leave blank to use SVG defaults. | Both |
| `fluid_flow_stroke_width` | number | 4 px | Base stroke width for the **Fluid Flow** style. Overlay and mask widths are derived from this. | Both |
| `arrow_scale` | number | 1× | Size multiplier for arrows in the **Arrows** style. Arrows already scale with stroke width; increase if still too small. | Both |

## Sun / Moon Tracking

The sun/moon feature overlays a moving icon that tracks the day/night arc. It requires no additional entity — it is driven by the card's built-in day/night calculation.

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `sun_moon_display` | select | Off | Display mode: **Off**, **Sun Only** (daytime sun icon), or **Sun & Moon** (sun by day, moon by night). | Both |
| `sun_moon_arc_color` | color | — | Stroke color for the arc path. Leave blank to hide the arc. | Both |
| `sun_moon_arc_stroke_width` | number | — | Stroke width (px) for the arc path. | Both |
| `sun_moon_sunrise_label` | text | — | Custom text for the sunrise label. Leave blank to use the SVG default. | Both |
| `sun_moon_sunset_label` | text | — | Custom text for the sunset label. Leave blank to use the SVG default. | Both |
| `sun_moon_label_color` | color | — | Color for the sunrise and sunset time labels. Leave blank to use the icon color. | Both |
| `sun_moon_label_font_size` | text | — | Font size (px) for the sunrise/sunset labels. Leave blank for the SVG default. | Both |
