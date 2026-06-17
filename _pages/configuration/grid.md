---
title: "Grid"
permalink: /configuration/grid/
---

Configure grid import/export sensors for up to 2 inverters, flow colors, and grid state display. The Tech profile adds color thresholds, daily totals display, inverter status text, and inverter temperature sensors.

## Inverter 1 Grid Sensors

Provide either a combined power sensor **or** separate import and export sensors.

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `sensor_grid_power` | entity | Combined grid flow for Inverter 1. Positive = importing, negative = exporting (or inverted if `invert_grid` is enabled). | Both |
| `sensor_grid_import` | entity | Inverter 1 grid import power (positive). Alternative to the combined power sensor. | Both |
| `sensor_grid_export` | entity | Inverter 1 grid export power (positive). Alternative to the combined power sensor. | Both |
| `sensor_grid_import_daily` | entity | Cumulative Inverter 1 grid import for the current day. | Both |
| `sensor_grid_export_daily` | entity | Cumulative Inverter 1 grid export for the current day. | Both |

## Inverter 2 Grid Sensors

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `sensor_grid2_power` | entity | Combined grid flow for Inverter 2. | Both |
| `sensor_grid2_import` | entity | Inverter 2 grid import power (positive). | Both |
| `sensor_grid2_export` | entity | Inverter 2 grid export power (positive). | Both |
| `sensor_grid2_import_daily` | entity | Cumulative Inverter 2 grid import for the current day. | Both |
| `sensor_grid2_export_daily` | entity | Cumulative Inverter 2 grid export for the current day. | Both |

## Flow Colors

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `grid_import_color` | color | — | Inverter 1 import flow color (base color, before thresholds). In Overview: color for power flowing from the grid. | Both |
| `grid_export_color` | color | — | Inverter 1 export flow color (base color, before thresholds). In Overview: color for power flowing to the grid. | Both |
| `inv1_color` | color | `#0080ff` | Color for the flow from Inverter 1 to the house. | Both |
| `grid2_import_color` | color | — | Inverter 2 import flow color. | Tech |
| `grid2_export_color` | color | — | Inverter 2 export flow color. | Tech |
| `inv2_color` | color | `#0080ff` | Color for the flow from Inverter 2 to the house. | Tech |

## Grid State Sensor

An optional sensor that returns descriptive state text (e.g. "Importing", "Exporting", "Floating").

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `sensor_grid_state` | entity | Sensor entity for grid state text. | Both |
| `grid_state_importing_color` | color | Color applied when the grid state is importing. | Both |
| `grid_state_exporting_color` | color | Color applied when the grid state is exporting. | Both |
| `grid_state_floating_color` | color | Color applied when the grid state is floating. | Both |

## Animation & Behaviour

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `grid_activity_threshold` | number | 100 W | Grid flows whose absolute value falls below this wattage are not animated. Prevents jitter from standing loads. | Both |
| `grid_power_only` | boolean | false | Hide inverter/battery flows and draw a direct grid-to-house flow instead. | Both |
| `invert_grid` | boolean | false | Invert grid polarity — enable if your sensors report import/export in the opposite direction. | Both |

---

## Tech Profile — Color Thresholds

Color thresholds change the grid flow color when the import or export magnitude reaches a configured level. Uses the `display_unit` for comparison.

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `grid_threshold_warning` | number | Inverter 1 flow turns `grid_warning_color` when magnitude ≥ this value. | Tech |
| `grid_warning_color` | color | Color applied at the Inverter 1 warning threshold. | Tech |
| `grid_threshold_critical` | number | Inverter 1 flow turns `grid_critical_color` when magnitude ≥ this value. | Tech |
| `grid_critical_color` | color | Color applied at the Inverter 1 critical threshold. | Tech |
| `grid2_threshold_warning` | number | Same as above for Inverter 2. | Tech |
| `grid2_warning_color` | color | Inverter 2 warning threshold color. | Tech |
| `grid2_threshold_critical` | number | Inverter 2 critical threshold. | Tech |
| `grid2_critical_color` | color | Inverter 2 critical threshold color. | Tech |

## Tech Profile — Daily Totals & Labels

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `show_daily_grid` | boolean | false | Show daily import/export totals beneath the current grid flow value. | Tech |
| `show_grid_flow_label` | boolean | false | Prepend an "Importing" / "Exporting" label before the grid value. | Tech |
| `grid_font_size` | text | — | Font size (px) for the current grid flow value. | Tech |
| `grid_daily_font_size` | text | — | Font size (px) for the daily import/export totals (defaults to `grid_font_size`). | Tech |

## Tech Profile — Inverter Status & Temperature

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `inverter1_status_text_color` | color | Color for the Inverter 1 status text (e.g. Charging / Discharging / Importing / Exporting). | Tech |
| `inverter1_status_font_size` | text | Font size (px) for Inverter 1 status text. | Tech |
| `sensor_inverter1_temp` | entity | Temperature sensor for Inverter 1. | Tech |
| `inverter1_temp_color` | color | Color for Inverter 1 temperature text. | Tech |
| `inverter1_temp_font_size` | text | Font size (px) for Inverter 1 temperature text. | Tech |
