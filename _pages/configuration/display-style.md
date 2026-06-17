---
title: "Display & Style"
permalink: /configuration/display-style/
---

Display & Style settings control card-wide typography, colors, and visual layout. The available options differ between the **Tech** and **Overview** profiles because each SVG layout uses a different approach to styling.

## Font

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `font_family` | text | sans-serif | CSS `font-family` applied to all SVG text (e.g. `Roboto`, `"Segoe UI"`). | Both |

## Tech Profile — Title & Header

These options control the title bar and the header row of daily production summary values visible in the Tech layout.

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `card_title` | text | — | Title displayed at the top of the card. Leave blank to disable. | Tech |
| `title_text_color` | color | — | Color for the title text. Leave blank to use the SVG default. | Tech |
| `title_bg_color` | color | — | Fill color for the title background (`data-role="title-bg"`). Leave blank to keep SVG styling. | Tech |
| `header_font_size` | text | — | Font size (px) for the daily summary header row. | Tech |
| `daily_label_font_size` | text | — | Font size (px) for daily production/import/export label text. | Tech |
| `daily_value_font_size` | text | — | Font size (px) for daily production/import/export value text. | Tech |

## Tech Profile — Odometer

The odometer feature animates a numeric value with a per-digit rolling effect, like a physical odometer.

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `odometer_font_family` | text | — | Font family for odometer-animated values. Leave blank to reuse `font_family`. A monospace font is recommended (e.g. `"Roboto Mono"`). | Tech |
| `grid_current_odometer` | boolean | false | Animate the Grid Current value with an odometer effect. | Tech |
| `grid_current_odometer_duration` | number | 350 ms | Per-digit animation duration in milliseconds (50–2000 ms). | Tech |

## Overview Profile — Card Styling

The Overview profile uses SVG elements tagged with `data-style="config"` to apply uniform label and value styling across the footer cards and overlay text.

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `card_label_color` | color | — | Default fill color for elements with `data-style="config"` and `data-role="label"`. Leave blank to keep SVG styling. | Overview |
| `card_label_font_size` | text | — | Default font size for config-styled label elements (e.g. `14` or `14px`). | Overview |
| `card_label_css` | text | — | Extra CSS declarations applied to all config-styled label elements (e.g. `font-weight: bold`). Only safe text-styling properties are accepted. | Overview |
| `card_value_color` | color | — | Default fill color for config-styled value text (non-label elements). Leave blank to keep SVG styling. | Overview |
| `card_value_font_size` | text | — | Default font size for config-styled value elements. | Overview |
| `card_value_css` | text | — | Extra CSS declarations applied to all config-styled value elements. | Overview |
| `card_background_color` | color | — | Default fill color for elements with `data-style="config"` and `data-role="card"`. | Overview |

See [Footer Cards](/configuration/footer-cards/) for the Overview-only footer card configuration.
