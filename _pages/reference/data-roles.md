---
title: "SVG Elements"
permalink: /reference/svg-elements/
---

All XML attributes the card reads from the background SVG file. Elements without a matching attribute are ignored.

**Tech** = used in the default Tech SVG · **Overview** = used in the default Overview SVG · blank = available for custom SVGs only

---

## XML Attribute Reference

### data-role

Tells the card what to display on an SVG element — a text label or a live sensor value.

| XML Attribute | Value |
| --- | --- |
| `data-role="<name>"` | The name of the data role (see tables below) |
| `-label` suffix pattern | Static label elements use `{role}-label` (e.g. `washing-machine-power-label`). The card writes translated strings to these on load. Displayed text comes from either a dedicated label field in the card editor or the static text value set in the SVG. |

### data-style

Controls font, font size, color, and text alignment for an element.

| XML Attribute | Value |
| --- | --- |
| `data-style="config"` | Font, font size, color and text alignment are controlled by the card (used in most cases) |
| `data-style="config-center"` | Label or value is center-aligned and anchored |
| `data-style="config-right"` | Label or value is right-aligned and anchored |

### data-flow-key

Applied to SVG `<path>` elements to create animated energy flow lines. The path must have its stroke paint set (not disabled).

| XML Attribute | Value |
| --- | --- |
| `data-flow-key="<name>"` | The name of the data flow (see table below) |
| `data-flow-dir="reverse"` | Reverses the flow animation direction. Positive linked data values travel in the direction the path was drawn (origin → end). |

### Other XML Attributes

| XML Attribute | Value |
| --- | --- |
| `data-feature="animate"` | Transforms the value display to a monospaced odometer-style animated display |
| `data-action="popup:<type>"` | Set on a closed path — acts as a trigger for the specified popup type |
| `data-role="popup-anchor"` | A small invisible `<rect>` in the SVG that acts as the popup centre point |
| `data-sun-icon` | Inside `sun-moon-traveller` group — shown during daytime (`sun.sun` = `above_horizon`) |
| `data-moon-icon` | Inside `sun-moon-traveller` group — shown at night when `sun_moon_display: 'sun-moon'` |

---

## Notes

- **Visibility mechanism**: `display: none` / `display: visible` — not opacity (except `inverter1`/`inverter2` which use `opacity: 0/1`).
- **Text-only roles**: If a `data-role` text element exists in the SVG, the card writes only the value and color to it. Layout/position stays in the SVG.
- **Battery fill**: Each active battery slot needs three elements: `batteryN-fill-level`, `batteryN-fill-top`, and `batteryN-fill-bottom`.

---

## Background Layers (day / night)

These go on `<g>` elements wrapping the background image layers. Exactly one day variant and one night variant should exist per car-count combination. The card shows the matching one and hides the rest.

| `data-role` | When shown | Tech | Overview |
| --- | --- | --- | --- |
| `daynocar` | Day mode, 0 EVs configured | ✓ | ✓ |
| `day1car` | Day mode, exactly 1 EV configured | ✓ | ✓ |
| `day2car` | Day mode, 2 or more EVs configured | ✓ | ✓ |
| `nightnocar` | Night mode, 0 EVs configured | ✓ | ✓ |
| `night1car` | Night mode, exactly 1 EV configured | ✓ | ✓ |
| `night2car` | Night mode, 2 or more EVs configured | ✓ | ✓ |

> **Day/night is determined by** `day_night_mode` config key: `'day'` (always day), `'night'` (always night), `'auto'` (reads `sun.sun` state — `above_horizon` = day, `below_horizon` = night).

---

## SVG Layer Visibility (whole feature groups)

All data-roles are available to both Tech and Overview. However some menu items have been customised to allow for features specific to that SVG type. All data-roles can still be enabled and disabled in the YAML configuration. Ticks indicate if they are shown or not by default in the menu or SVG.

| `data-role` | When shown | Tech | Overview |
| --- | --- | --- | --- |
| `inverter` | Any PV array is configured | ✓ | ✓ |
| `inverter1` | Inverter 1 active (opacity: 1 / 0) | ✓ | |
| `inverter2` | Inverter 2 active (opacity: 1 / 0) | ✓ | |
| `heatpump` | `sensor_heat_pump_consumption` is configured | ✓ | |
| `car1` | `sensor_car_power` or `sensor_car_soc` configured | ✓ | |
| `car1-card` | Same condition as `car1` (data-style="config" card background) | | ✓ |
| `car2` | `sensor_car2_power` or `sensor_car2_soc` configured | ✓ | |
| `car2-card` | Same condition as `car2` (data-style="config" card background) | | ✓ |
| `daily-yield` | `sensor_daily` is configured | | |
| `windmill` | `sensor_windmill_total` is configured | ✓ | |
| `grid-daily` | `show_daily_grid: true` | ✓ | |
| `grid-daily-import` | `show_daily_grid: true` | ✓ | |
| `grid-daily-export` | `show_daily_grid: true` | ✓ | |
| `grid-line-*` | `show_daily_grid: true` (prefix match `grid-line-`) | ✓ | |

---

## Text / Value Roles

Place `<text>` elements with these roles in the SVG. The card writes the value and optionally sets `fill` and `font-size`. Positioning stays in the SVG.

### Title & Daily Yield

| `data-role` | Value written | Tech | Overview |
| --- | --- | --- | --- |
| `title-text` | Card title (`card_title`) | ✓ | |
| `title-bg` | Background rect — fill color set from `title_bg_color` | ✓ | |
| `daily-label` | "Today" / translated label | ✓ | |
| `daily-value` | Daily PV yield value | ✓ | |
| `daily-yield-group` | Wrapper `<g>` — shown/hidden + cursor set | ✓ | |
| `pvDaily` | PV daily badge rect — fill color | ✓ | |

### Solar (PV)

| `data-role` | Value written | Tech | Overview |
| --- | --- | --- | --- |
| `pv-line-0` … `pv-line-N` | Individual PV string values (fill + font-size also set) | ✓ | ✓ |
| `pv2-line-0` … `pv2-line-5` | Individual Array 2 string values (index = `sensor_pv_array2_N` order) | ✓ | ✓ |
| `pv1-total` | Array 1 total power | ✓ | ✓ |
| `pv2-total` | Array 2 total power | ✓ | ✓ |
| `pv-total` | Combined Array 1 + Array 2 total | ✓ | ✓ |

### Battery

| `data-role` | Value written | Tech | Overview |
| --- | --- | --- | --- |
| `battery-power` | Combined: total battery power across all active batteries | | ✓ |
| `battery-state` | Combined: auto-calculated state label | | ✓ |
| `battery-soc` | Combined: average SOC across all active batteries | | ✓ |
| `battery-time-until` | Combined: estimated time until full or flat | | ✓ |
| `battery-temp` | Combined: average battery temperature | | ✓ |
| `battery-fill-level` | Combined: liquid fill level element (clip height driven by SOC) | | ✓ |
| `battery-fill-top` | Combined: liquid fill top wave element | | ✓ |
| `battery-fill-bottom` | Combined: liquid fill bottom element | | ✓ |
| `battery1-power` | Battery 1 power | ✓ | ✓ |
| `battery1-state` | Battery 1 state — auto-calculated: "Charging", "Discharging", "Full", "Reserve", "Flat" | ✓ | ✓ |
| `battery1-soc` | Battery 1 state of charge | ✓ | ✓ |
| `battery1-time-until` | Battery 1 time until full or flat (e.g. "2h 30m") — requires battery capacity config | ✓ | ✓ |
| `battery1-temp` | Battery 1 temperature (`sensor_bat1_temp`) | ✓ | ✓ |
| `battery1-fill-level` | Liquid fill level element (clip height driven by SOC) | ✓ | |
| `battery1-fill-top` | Liquid fill top wave element | ✓ | |
| `battery1-fill-bottom` | Liquid fill bottom element | ✓ | |
| `battery2-power` | Battery 2 power | ✓ | ✓ |
| `battery2-state` | Battery 2 state (auto-calculated) | ✓ | ✓ |
| `battery2-soc` | Battery 2 SOC | ✓ | ✓ |
| `battery2-time-until` | Battery 2 time until full or flat | ✓ | ✓ |
| `battery2-fill-level` | Liquid fill level element (clip height driven by SOC) | ✓ | |
| `battery2-fill-top` | Liquid fill top wave element | ✓ | |
| `battery2-fill-bottom` | Liquid fill bottom element | ✓ | |
| `battery3-power` | Battery 3 power | ✓ | ✓ |
| `battery3-state` | Battery 3 state (auto-calculated) | ✓ | ✓ |
| `battery3-soc` | Battery 3 SOC | ✓ | ✓ |
| `battery3-time-until` | Battery 3 time until full or flat | ✓ | ✓ |
| `battery3-fill-level` | Liquid fill level element (clip height driven by SOC) | ✓ | |
| `battery3-fill-top` | Liquid fill top wave element | ✓ | |
| `battery3-fill-bottom` | Liquid fill bottom element | ✓ | |
| `battery4-power` | Battery 4 power | ✓ | ✓ |
| `battery4-state` | Battery 4 state (auto-calculated) | ✓ | ✓ |
| `battery4-soc` | Battery 4 SOC | ✓ | ✓ |
| `battery4-time-until` | Battery 4 time until full or flat | ✓ | ✓ |
| `battery4-fill-level` | Liquid fill level element (clip height driven by SOC) | ✓ | |
| `battery4-fill-top` | Liquid fill top wave element | ✓ | |
| `battery4-fill-bottom` | Liquid fill bottom element | ✓ | |

### Load / House

| `data-role` | Value written | Tech | Overview |
| --- | --- | --- | --- |
| `load-power` | Total house load power (single-value mode; hidden when multi-line mode is active) | | |
| `house-load` | House load power — supports odometer animation (combined in overview) | ✓ | ✓ |
| `load-line-0` | Load display line 0 (multi-line mode) | | |
| `load-line-1` | Load display line 1 | | |
| `load-line-2` | Load display line 2 | | |

### Grid

| `data-role` | Value written | Tech | Overview |
| --- | --- | --- | --- |
| `grid-power` | Grid import/export power (single-value mode; hidden when multi-line mode is active) | | |
| `grid-current-power` | Grid current power — supports odometer animation | ✓ | ✓ |
| `grid-daily-import` | Daily grid import total; shown when `show_daily_grid: true` | ✓ | |
| `grid-daily-export` | Daily grid export total; shown when `show_daily_grid: true` | ✓ | |
| `grid-line-0` | Grid display line 0 (multi-line mode) | ✓ | |
| `grid-line-1` | Grid display line 1 | ✓ | |
| `grid-state` | Grid state text (`sensor_grid_state`) | ✓ | ✓ |

### Solar Status & Forecast

| `data-role` | Value written | Tech | Overview |
| --- | --- | --- | --- |
| `solar-state` | Solar/inverter state text (`sensor_solar_state`) — "Producing Power" or "Not Producing" | ✓ | ✓ |
| `solar-forecast-today` | Today's solar forecast (`sensor_solar_forecast_today`) | | ✓ |
| `solar-forecast-tomorrow` | Tomorrow's solar forecast (`sensor_solar_forecast_tomorrow`) | | ✓ |

### Weather

| `data-role` | Value written | Tech | Overview |
| --- | --- | --- | --- |
| `weather-icon` | Weather icon (`sensor_weather_icon`). MDI values (`mdi:...`) render as an `<ha-icon>` via `<foreignObject>`; non-MDI values render as plain text | ✓ | ✓ |
| `weather-forecast` | Weather forecast text (`sensor_weather_forecast`) | ✓ | ✓ |

### Heat Pump / Appliances

| `data-role` | Value written | Tech | Overview |
| --- | --- | --- | --- |
| `heat-pump-power` | Heat pump / AC consumption | ✓ | |
| `hp-power` | Alias for `heat-pump-power` (both are supported) | ✓ | |
| `heat-pump-power-text` | Static label for heat pump (translated) | ✓ | |
| `hot-water-power` | Hot water system consumption | ✓ | |
| `hot-water-power-text` | Static label (translated) | ✓ | |
| `pool-power` | Pool pump consumption | ✓ | |
| `pool-power-text` | Static label (translated) | ✓ | |
| `washing-machine-power` | Washing machine consumption | ✓ | |
| `washing-machine-power-text` | Static label (translated) | ✓ | |
| `dishwasher-power` | Dishwasher consumption | ✓ | |
| `dishwasher-power-text` | Static label (translated) | ✓ | |
| `dryer-power` | Dryer consumption | ✓ | |
| `dryer-power-text` | Static label (translated) | ✓ | |
| `refrigerator-power` | Refrigerator consumption | ✓ | |
| `refrigerator-power-text` | Static label (translated) | ✓ | |
| `freezer-power` | Freezer consumption | ✓ | |
| `freezer-power-text` | Static label (translated) | ✓ | |

### Windmill

| `data-role` | Value written | Tech | Overview |
| --- | --- | --- | --- |
| `windmill-power` | Windmill total power (fill color set from `windmill_text_color`) | ✓ | |

### Sun / Moon Traveller

Controlled by the `sun_moon_display` config key: `'off'` (hidden), `'sun-only'` (sun icon during the day only), or `'sun-moon'` (sun by day, moon by night). Position is computed from `sun.sun`'s `next_rising`/`next_setting` attributes.

| `data-role` | Purpose | Tech | Overview |
| --- | --- | --- | --- |
| `sun-moon-traveller` | Group element moved along the `sun-moon-position` flow path; `display` toggled based on mode/time of day | | ✓ |
| `sunrise-time` | Sunrise time value (e.g. "06:14") | | ✓ |
| `sunrise-time-text` | Sunrise label (default "Sunrise", overridable via `sun_moon_sunrise_label`) | | ✓ |
| `sunset-time` | Sunset time value (e.g. "18:02") | | ✓ |
| `sunset-time-text` | Sunset label (default "Sunset", overridable via `sun_moon_sunset_label`) | | ✓ |

Inside the `sun-moon-traveller` group, two sub-elements toggle visibility based on time of day:

| Attribute | Shown when |
| --- | --- |
| `data-sun-icon` | Daytime (`sun.sun` = `above_horizon`) |
| `data-moon-icon` | Nighttime and `sun_moon_display: 'sun-moon'` |

### Footer Card Slots (Overview Profile)

The overview profile supports up to 6 footer cards, each with 2 slots. Each slot binds an entity value and a label. The entity is set via `footer_card{N}_slot{S}_entity`; the label defaults to the entity's friendly name but can be overridden with `footer_card{N}_slot{S}_label`.

Each slot writes a **value** role and a **label** role:

| `data-role` | Value written | `data-role` (label) | Label written | Tech | Overview |
| --- | --- | --- | --- | --- | --- |
| `footer-card1-slot1` | Footer card 1, slot 1 | `footer-card1-slot1-label` | Entity name or configured label | | ✓ |
| `footer-card1-slot2` | Footer card 1, slot 2 | `footer-card1-slot2-label` | Entity name or configured label | | ✓ |
| `footer-card2-slot1` | Footer card 2, slot 1 | `footer-card2-slot1-label` | Entity name or configured label | | ✓ |
| `footer-card2-slot2` | Footer card 2, slot 2 | `footer-card2-slot2-label` | Entity name or configured label | | ✓ |
| `footer-card3-slot1` | Footer card 3, slot 1 | `footer-card3-slot1-label` | Entity name or configured label | | ✓ |
| `footer-card3-slot2` | Footer card 3, slot 2 | `footer-card3-slot2-label` | Entity name or configured label | | ✓ |
| `footer-card4-slot1` | Footer card 4, slot 1 | `footer-card4-slot1-label` | Entity name or configured label | | ✓ |
| `footer-card4-slot2` | Footer card 4, slot 2 | `footer-card4-slot2-label` | Entity name or configured label | | ✓ |
| `footer-card5-slot1` | Footer card 5, slot 1 | `footer-card5-slot1-label` | Entity name or configured label | | ✓ |
| `footer-card5-slot2` | Footer card 5, slot 2 | `footer-card5-slot2-label` | Entity name or configured label | | ✓ |
| `footer-card6-slot1` | Footer card 6, slot 1 | `footer-card6-slot1-label` | Entity name or configured label | | ✓ |
| `footer-card6-slot2` | Footer card 6, slot 2 | `footer-card6-slot2-label` | Entity name or configured label | | ✓ |

> Value elements are styled via `card_value_color` / `card_value_font_size`; label elements via `card_label_color` / `card_label_font_size`. A slot is hidden when no entity is configured for it.

### Inverter

| `data-role` | Value written | Tech | Overview |
| --- | --- | --- | --- |
| `inverter1-status` | Inverter 1 status text | ✓ | |
| `inverter1-temp` | Inverter 1 temperature (`sensor_inverter1_temp`) | ✓ | |

### EVs (Cars)

| `data-role` | Value written | Tech | Overview |
| --- | --- | --- | --- |
| `car1-name` | Car 1 label / name | ✓ | ✓ |
| `car1-power` | Car 1 charging power | ✓ | ✓ |
| `car1-soc` | Car 1 state of charge | ✓ | ✓ |
| `car1-range` | Car 1 range (`sensor_car_range`) | | ✓ |
| `car1-state` | Car 1 charging state text (`sensor_car_state`) | | ✓ |
| `car1-hvac-status` | Car 1 HVAC/climate status (`sensor_car_hvac_status`) | | ✓ |
| `car1-outside-temp` | Car 1 outside temperature (`sensor_car_outside_temp`) | | ✓ |
| `car1-inside-temp` | Car 1 inside/cabin temperature (`sensor_car_inside_temp`) | | ✓ |
| `car1-ac-temp` | Car 1 AC set temperature (`sensor_car_ac_temp`) | | ✓ |
| `car2-name` | Car 2 label / name | ✓ | ✓ |
| `car2-power` | Car 2 charging power | ✓ | ✓ |
| `car2-soc` | Car 2 state of charge | ✓ | ✓ |
| `car2-range` | Car 2 range (`sensor_car2_range`) | | ✓ |
| `car2-state` | Car 2 charging state text (`sensor_car2_state`) | | ✓ |
| `car2-hvac-status` | Car 2 HVAC/climate status (`sensor_car2_hvac_status`) | | ✓ |
| `car2-outside-temp` | Car 2 outside temperature (`sensor_car2_outside_temp`) | | ✓ |
| `car2-inside-temp` | Car 2 inside/cabin temperature (`sensor_car2_inside_temp`) | | ✓ |
| `car2-ac-temp` | Car 2 AC set temperature (`sensor_car2_ac_temp`) | | ✓ |

---

## Internal / Infrastructure Roles

These are created by the card itself and do not need to be in your SVG.

| `data-role` | Purpose |
| --- | --- |
| `title-overlay` | Invisible click target over the title area |
| `pv-daily-overlay` | Invisible click target over the PV daily badge |
| `echo-alive-container` | Echo Alive iframe wrapper |

---

## data-flow-key — Animated Flow Paths

| `data-flow-key` | Flow | Tech | Overview |
| --- | --- | --- | --- |
| `pv1` | Array 1 → Inverter 1 | ✓ | |
| `pv2` | Array 2 → Inverter 2 (when dual-inverter) | ✓ | |
| `array-inverter` | Combined solar arrays → combined inverter (overview layout) | | ✓ |
| `array-inverter1` | Solar array → Inverter 1 (single-inverter layout) | ✓ | |
| `array-inverter2` | Solar array → Inverter 2 | ✓ | |
| `windmill-inverter1` | Windmill → Inverter 1 | ✓ | |
| `windmill-inverter2` | Windmill → Inverter 2 | ✓ | |
| `load` | Inverter → House (generic) | ✓ | |
| `house-load-inverter1` | Inverter 1 → House load | ✓ | |
| `house-load-inverter2` | Inverter 2 → House load | ✓ | |
| `grid` | Grid ↔ Inverter (generic) | ✓ | |
| `grid_house` | Grid → House (legacy underscore form) | ✓ | |
| `grid-house` | Grid → House | ✓ | |
| `gird-feed` | Grid feed-in / export (also accepts `grid-feed`) | ✓ | ✓ |
| `grid-import-export` | Grid import/export path (also resolves from `inverter1-import-export`) | ✓ | |
| `inverter1-import-export` | Inverter 1 ↔ Grid import/export | ✓ | |
| `inverter1-grid` | Inverter 1 ↔ Grid (resolves from `inverter1-import-export` or `grid-import-export`) | ✓ | |
| `inverter2-import-export` | Inverter 2 ↔ Grid import/export | ✓ | |
| `inverter2-grid` | Inverter 2 ↔ Grid (resolves from `inverter2-import-export`) | ✓ | |
| `car1` | House → EV 1 | ✓ | ✓ |
| `car2` | House → EV 2 | ✓ | ✓ |
| `heatPump` | House → Heat Pump / AC | ✓ | |
| `pool` | House → Pool pump | ✓ | |
| `inverter-battery` | Inverter ↔ Battery (combined overview layout) | | ✓ |
| `inverter1-battery1` | Inverter 1 ↔ Battery 1 | ✓ | |
| `inverter1-battery2` | Inverter 1 ↔ Battery 2 | ✓ | |
| `inverter1-battery3` | Inverter 1 ↔ Battery 3 | ✓ | |
| `inverter1-battery4` | Inverter 1 ↔ Battery 4 | ✓ | |
| `inverter2-battery3` | Inverter 2 ↔ Battery 3 | ✓ | |
| `inverter2-battery4` | Inverter 2 ↔ Battery 4 | ✓ | |
| `sun-moon-position` | Arc `<path>` the `sun-moon-traveller` element is positioned along (stroke styled from `sun_moon_arc_color`/`sun_moon_arc_stroke_width`) | | ✓ |
