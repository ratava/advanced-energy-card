# Advanced Energy Card

![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)  ![Version](https://img.shields.io/badge/version-1.0.23-blue.svg)

Advanced Energy Card repository is [https://github.com/ratava/advanced-energy-card](https://github.com/ratava/advanced-energy-card).

[Advanced Energy Card Background](images/advanced-day.png)

Support Brent - ratava ![Donate Brent Wesley @ratava](https://github.com/user-attachments/assets/b603f494-a142-4bb0-893f-aaafd5d19dfd)

---

## Language Selection

* [English](#english)
* [Italiano](#italiano)
* [Deutsch](#deutsch)
* [Français](#français)
* [Nederlands](#nederlands)
* [Español](#español)

---

## English

### Overview

Advanced Energy Card is a Home Assistant custom Lovelace card that renders animated energy flows, aggregates PV strings and batteries, and surfaces optional EV charging metrics in a cinematic layout. Advanced Energy Card is the heart of what is Lumina Energy Card and is what should have been version 2.0 of Lumina.

### Key Features

* New futuristic house with a completely redesigned graphics system, allowing for more functionality  
* New guided Initial Configuration
* Up to six PV sensors with two arrays supported per string or totalized inputs
* Up to four battery systems with SOC, power, and battery‑level visualization for four batteries. (2 per inverter if using 2 inverters)
* Additional battery information displayed in the battery popup
* Dynamic display of windmill power and up to two EVs with state of charge and power consumption or return
* Animated grid, load, PV, battery, and EV flows with dynamic color based on thresholds and selectable animation styles
* Configurable grid animation threshold (default 100 W) to suppress low‑level import/export chatter
* Adjustable animation speed multiplier (-3× to 3×, default 1×, pause/reverse supported) and per‑flow visibility thresholds
* Daily energy production badge
* Daily import and export totals
* Swimming pool power consumption now shown on the main graphic and can now be hidden if not in use
* Heat pump/AC power and Hot Water System consumption now shown
* Washing Machine, Dryer, Refrigerator, Dishwasher now included in popup
* Load warning/critical color overrides and a configurable low‑SOC threshold for the battery liquid fill
* Font selection, font size, and text color available for all displayed entities
* Update interval slider (0–60 s, default 5 s) with optional real‑time refresh when set to 0
* Popup information displays for House, Solar, Battery, Grid, and Inverter  
* Each has six slots for entities with name overrides and font‑color overrides.
* Popup entries can be clicked to show the HA Entity.
* Many new features coming, with support for more items

### Installation

#### HACS

1. Open HACS in Home Assistant and choose **Frontend**.
2. Use the three-dot menu → **Custom repositories**.
3. Enter `https://github.com/ratava/advanced-energy-card`, pick **Dashboard**, and click **Add**.
4. Locate **Advanced Energy Card** under Frontend and click **Install**.
5. Restart Home Assistant if prompted.

#### Manual Installation

1. Download all files from `dist/` from the [latest release](https://github.com/ratava/advanced-energy-card/releases).
2. Copy the files to `/config/www/community/advanced-energy-card/`.
3. Add the Lovelace resource:

```yaml
lovelace:
  resources:
    - url: /local/community/advanced-energy-card/advanced-energy-card.js
      type: module
```

1. Restart Home Assistant to load the resource.

### Initial Configuration

1. Edit your dashboard and click **Add Card**.
2. Search for **Advanced Energy Card**.
3. Follow the questions in Initial Configuration Menu. It will cover most configurations of the base sensors
4. Many other options have been added including a fully restructured menu

### Options Table

| Option                               | Type    | Default                                                           | Notes                                                                                                                                             |
| ------------------------------------ | ------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `card_title`                         | string  | —                                                                 | Optional header text; blank keeps the title hidden.                                                                                               |
| `title_render_mode`                  | string  | `html`                                                            | How the title is rendered: `html` (recommended) or `svg` (legacy).                                                                                |
| `title_text_color`                   | string  | `#00FFFF`                                                         | Optional override for title text color (hex).                                                                                                     |
| `title_bg_color`                     | string  | `#0080ff`                                                         | Optional override for the title background rectangle (hex).                                                                                       |
| `font_family`                        | string  | `B612`                                                            | Font family for the card text (CSS font-family).                                                                                                  |
| `odometer_font_family`               | string  | `B612 Mono`                                                       | Optional alternate font used by odometer-styled animated numbers; falls back to `font_family` when unset.                                         |
| `background_day`                     | string  | `/local/community/advanced-energy-card/advanced-modern-day.svg`   | Day background (used when `day_night_mode` is `day` or in `auto` during daytime).                                                                 |
| `background_night`                   | string  | `/local/community/advanced-energy-card/advanced-modern-night.svg` | Night background (used when `day_night_mode` is `night` or in `auto` during nighttime).                                                           |
| `language`                           | string  | `en`                                                              | Supported editor languages: `en`, `it`, `de`, `fr`, `nl`, `es`.                                                                                   |
| `display_unit`                       | string  | `kW`                                                              | Display values in `W` or `kW`.                                                                                                                    |
| `update_interval`                    | number  | `5`                                                               | Refresh cadence (0–60 s, step 5; 0 disables throttling).                                                                                          |
| `animation_speed_factor`             | number  | `1`                                                               | Flow animation multiplier (-3–3, 0 pauses, negatives reverse).                                                                                    |
| `animation_style`                    | string  | `dashes`                                                          | Day animation style. Flow motif (`dashes`, `dashes_glow`, `fluid_flow`, `dots`, `arrows`).                                                        |
| `night_animation_style`              | string  | `dashes`                                                          | Night animation style (same options as `animation_style`). When blank/unset, falls back to `animation_style`.                                     |
| `dashes_glow_intensity`              | number  | `1`                                                               | Glow intensity for `dashes_glow` style (0–3).                                                                                                     |
| `flow_stroke_width`                  | number  | `2`                                                               | Stroke width (px) for `dashes`/`dashes_glow`/`dots`/`arrows`.                                                                                     |
| `fluid_flow_stroke_width`            | number  | `3`                                                               | Stroke width (px) for `fluid_flow`.                                                                                                               |
| `fluid_flow_outer_glow`              | boolean | `false`                                                           | Adds an outer glow effect for `fluid_flow`.                                                                                                       |
| `day_night_mode`                     | string  | `day`                                                             | Selects Day/Night: `day`, `night`, or `auto` (auto follows `sun.sun`).                                                                            |
| `night_mode`                         | boolean | `false`                                                           | Legacy boolean night mode (deprecated). Prefer `day_night_mode`.                                                                                  |
| `header_font_size`                   | number  | `16`                                                              | Typography for the header (12–32 px).                                                                                                             |
| `daily_label_font_size`              | number  | `12`                                                              | Typography for the daily label (8–24 px).                                                                                                         |
| `daily_value_font_size`              | number  | `20`                                                              | Typography for the daily total (12–32 px).                                                                                                        |
| `pv_font_size`                       | number  | `12`                                                              | Typography for PV text (12–28 px).                                                                                                                |
| `battery_soc_font_size`              | number  | `8`                                                               | Typography for the SOC label (12–32 px).                                                                                                          |
| `battery_power_font_size`            | number  | `8`                                                               | Typography for the battery wattage (10–28 px).                                                                                                    |
| `load_font_size`                     | number  | `8`                                                               | Typography for the load text (10–28 px).                                                                                                          |
| `inv1_power_font_size`               | number  | `8`                                                               | Font size for the INV 1 power line (10–28 px). Defaults to `load_font_size`.                                                                      |
| `inv2_power_font_size`               | number  | `8`                                                               | Font size for the INV 2 power line (10–28 px). Defaults to `load_font_size`.                                                                      |
| `grid_font_size`                     | number  | `8`                                                               | Typography for the grid text (10–28 px).                                                                                                          |
| `grid_daily_font_size`               | number  | `8`                                                               | Font size for the daily import/export totals (defaults to `grid_font_size`).                                                                      |
| `grid_current_odometer`              | boolean | `true`                                                            | Enables the odometer animation on the live grid value.                                                                                            |
| `grid_current_odometer_duration`     | number  | `950`                                                             | Duration (ms) for the grid odometer animation (50–2000).                                                                                          |
| `heat_pump_font_size`                | number  | `8`                                                               | Typography for the heat pump readout (10–28 px).                                                                                                  |
| `pool_font_size`                     | number  | `8`                                                               | Typography for the pool readout (10–28 px).                                                                                                       |
| `hot_water_font_size`                | number  | `8`                                                               | Typography for the hot water readout (10–28 px).                                                                                                  |
| `washing_machine_font_size`          | number  | `8`                                                               | Typography for the washer label/power (inherits `heat_pump_font_size` when unset).                                                                |
| `dishwasher_font_size`               | number  | `8`                                                               | Typography for the dish washer label/power (10–28 px).                                                                                            |
| `dryer_font_size`                    | number  | `8`                                                               | Typography for the dryer label/power (inherits `heat_pump_font_size` when unset).                                                                 |
| `refrigerator_font_size`             | number  | `8`                                                               | Typography for the refrigerator label/power (inherits `heat_pump_font_size` when unset).                                                          |
| `freezer_font_size`                  | number  | `8`                                                               | Typography for the freezer label/power (inherits `heat_pump_font_size` when unset).                                                               |
| `car_power_font_size`                | number  | `10`                                                              | Typography for Car 1 power (10–28 px).                                                                                                            |
| `car2_power_font_size`               | number  | `10`                                                              | Typography for Car 2 power (10–28 px, falls back to Car 1 value).                                                                                 |
| `car_soc_font_size`                  | number  | `10`                                                              | Typography for Car 1 SOC (8–24 px).                                                                                                               |
| `car2_soc_font_size`                 | number  | `10`                                                              | Typography for Car 2 SOC (8–24 px, falls back to Car 1 value).                                                                                    |
| `car_name_font_size`                 | number  | `10`                                                              | Typography for Car 1 name label (px).                                                                                                             |
| `car2_name_font_size`                | number  | `10`                                                              | Typography for Car 2 name label (px).                                                                                                             |
| `car1_label`                         | string  | —                                                                 | Optional label override for Car 1 (display name).                                                                                                 |
| `car2_label`                         | string  | —                                                                 | Optional label override for Car 2 (display name).                                                                                                 |
| `sensor_pv_total`                    | entity  | —                                                                 | Optional aggregate PV production sensor. Provide either this sensor **or** at least one PV string.                                                |
| `sensor_pv1` .. `sensor_pv6`         | entity  | —                                                                 | PV string sensors for Array 1. When no total is given, at least one string is required and all configured strings are summed to produce PV TOTAL. |
| `sensor_daily`                       | entity  | —                                                                 | Daily production sensor (required).                                                                                                               |
| `sensor_bat1_soc`                    | entity  | —                                                                 | Battery SOC sensor (required only when a battery is displayed).                                                                                   |
| `sensor_bat1_power`                  | entity  | —                                                                 | Combined net power sensor for Battery 1. Provide this or both split sensors below.                                                                |
| `sensor_bat1_charge_power`           | entity  | —                                                                 | Battery 1 charging sensor (positive values, W or kW). Use with `sensor_bat1_discharge_power` when no combined sensor exists.                      |
| `sensor_bat1_discharge_power`        | entity  | —                                                                 | Battery 1 discharging sensor (positive values).                                                                                                   |
| `sensor_bat2_soc`                    | entity  | —                                                                 | Optional Battery 2 SOC sensor.                                                                                                                    |
| `sensor_bat2_power`                  | entity  | —                                                                 | Combined net power sensor for Battery 2. Provide this or both split sensors below.                                                                |
| `sensor_bat2_charge_power`           | entity  | —                                                                 | Battery 2 charging sensor (positive values).                                                                                                      |
| `sensor_bat2_discharge_power`        | entity  | —                                                                 | Battery 2 discharging sensor (positive values).                                                                                                   |
| `sensor_bat3_soc`                    | entity  | —                                                                 | Optional Battery 3 SOC sensor.                                                                                                                    |
| `sensor_bat3_power`                  | entity  | —                                                                 | Combined net power sensor for Battery 3. Provide this or both split sensors below.                                                                |
| `sensor_bat3_charge_power`           | entity  | —                                                                 | Battery 3 charging sensor (positive values).                                                                                                      |
| `sensor_bat3_discharge_power`        | entity  | —                                                                 | Battery 3 discharging sensor (positive values).                                                                                                   |
| `sensor_bat4_soc`                    | entity  | —                                                                 | Optional Battery 4 SOC sensor.                                                                                                                    |
| `sensor_bat4_power`                  | entity  | —                                                                 | Combined net power sensor for Battery 4. Provide this or both split sensors below.                                                                |
| `sensor_bat4_charge_power`           | entity  | —                                                                 | Battery 4 charging sensor (positive values).                                                                                                      |
| `sensor_bat4_discharge_power`        | entity  | —                                                                 | Battery 4 discharging sensor (positive values).                                                                                                   |
| `sensor_home_load`                   | entity  | —                                                                 | Home load/consumption sensor (required).                                                                                                          |
| `sensor_grid_power`                  | entity  | —                                                                 | Net grid sensor (required unless import/export pair supplied).                                                                                    |
| `sensor_grid_import`                 | entity  | —                                                                 | Optional import-only sensor (positive values).                                                                                                    |
| `sensor_grid_export`                 | entity  | —                                                                 | Optional export-only sensor (positive values).                                                                                                    |
| `sensor_grid_import_daily`           | entity  | —                                                                 | Optional cumulative daily grid import sensor.                                                                                                     |
| `sensor_grid_export_daily`           | entity  | —                                                                 | Optional cumulative daily grid export sensor.                                                                                                     |
| `sensor_grid2_power`                 | entity  | —                                                                 | Optional second grid net power sensor.                                                                                                            |
| `sensor_grid2_import`                | entity  | —                                                                 | Optional second grid import-only sensor (positive values).                                                                                        |
| `sensor_grid2_export`                | entity  | —                                                                 | Optional second grid export-only sensor (positive values).                                                                                        |
| `sensor_grid2_import_daily`          | entity  | —                                                                 | Optional cumulative daily import for grid 2.                                                                                                      |
| `sensor_grid2_export_daily`          | entity  | —                                                                 | Optional cumulative daily export for grid 2.                                                                                                      |
| `show_daily_grid`                    | boolean | `false`                                                           | Shows the daily import/export totals above the live grid value.                                                                                   |
| `show_grid_flow_label`               | boolean | `true`                                                            | Prepends “Importing/Exporting” before the grid value.                                                                                             |
| `sensor_heat_pump_consumption`       | entity  | —                                                                 | Heat pump sensor; unlocks the orange flow and swaps the background.                                                                               |
| `sensor_hot_water_consumption`       | entity  | —                                                                 | Hot water heating load sensor (drives the hot water label).                                                                                       |
| `sensor_pool_consumption`            | entity  | —                                                                 | Optional pool consumption sensor; enables the pool branch/label when present.                                                                     |
| `sensor_washing_machine_consumption` | entity  | —                                                                 | Optional washing machine consumption sensor that drives the washer label.                                                                         |
| `sensor_dishwasher_consumption`      | entity  | —                                                                 | Optional dish washer consumption sensor.                                                                                                          |
| `sensor_dryer_consumption`           | entity  | —                                                                 | Optional dryer consumption sensor.                                                                                                                |
| `sensor_refrigerator_consumption`    | entity  | —                                                                 | Optional refrigerator consumption sensor.                                                                                                         |
| `sensor_freezer_consumption`         | entity  | —                                                                 | Optional freezer consumption sensor.                                                                                                              |
| `sensor_windmill_total`              | entity  | —                                                                 | Optional windmill total generation sensor.                                                                                                        |
| `sensor_windmill_daily`              | entity  | —                                                                 | Optional windmill daily generation sensor.                                                                                                        |
| `sensor_car_power`                   | entity  | —                                                                 | Optional Car 1 charging power sensor.                                                                                                             |
| `sensor_car_soc`                     | entity  | —                                                                 | Optional Car 1 SOC sensor.                                                                                                                        |
| `sensor_car2_power`                  | entity  | —                                                                 | Optional Car 2 charging power sensor.                                                                                                             |
| `sensor_car2_soc`                    | entity  | —                                                                 | Optional Car 2 SOC sensor.                                                                                                                        |
| `show_car_soc`                       | boolean | `false`                                                           | Toggle the Car 1 panel (power + SOC).                                                                                                             |
| `show_car2`                          | boolean | `false`                                                           | Toggle the Car 2 panel when sensors exist.                                                                                                        |
| `car_flow_color`                     | string  | `#00FFFF`                                                         | EV flow animation colour.                                                                                                                         |
| `car1_color`                         | string  | `#00FFFF`                                                         | Car 1 power text colour.                                                                                                                          |
| `car2_color`                         | string  | `#00FFFF`                                                         | Car 2 power text colour.                                                                                                                          |
| `car_pct_color`                      | string  | `#00FFFF`                                                         | Car 1 SOC text colour.                                                                                                                            |
| `car2_pct_color`                     | string  | `#00FFFF`                                                         | Car 2 SOC text colour.                                                                                                                            |
| `car1_name_color`                    | string  | `#00FFFF`                                                         | Car 1 name label colour.                                                                                                                          |
| `car2_name_color`                    | string  | `#00FFFF`                                                         | Car 2 name label colour.                                                                                                                          |
| `pv_primary_color`                   | string  | `#0080ff`                                                         | PV 1 flow animation colour.                                                                                                                       |
| `pv_secondary_color`                 | string  | `#80ffff`                                                         | PV 2 flow animation colour.                                                                                                                       |
| `pv_tot_color`                       | string  | `#00FFFF`                                                         | PV TOTAL text/line colour.                                                                                                                        |
| `load_flow_color`                    | string  | `#0080ff`                                                         | Home load flow animation colour.                                                                                                                  |
| `load_text_color`                    | string  | `#FFFFFF`                                                         | Home load text colour when thresholds are inactive.                                                                                               |
| `load_threshold_warning`             | number  | —                                                                 | Load warning threshold (W or kW based on the display unit).                                                                                       |
| `load_warning_color`                 | string  | `#ff8000`                                                         | Load warning colour.                                                                                                                              |
| `load_threshold_critical`            | number  | —                                                                 | Load critical threshold (W or kW based on the display unit).                                                                                      |
| `load_critical_color`                | string  | `#ff0000`                                                         | Load critical colour.                                                                                                                             |
| `battery_soc_color`                  | string  | `#FFFFFF`                                                         | Battery SOC percentage text colour.                                                                                                               |
| `battery_charge_color`               | string  | `#8000ff`                                                         | Battery charge flow colour.                                                                                                                       |
| `battery_discharge_color`            | string  | `#ff8000`                                                         | Battery discharge flow colour.                                                                                                                    |
| `grid_import_color`                  | string  | `#FF3333`                                                         | Grid import flow colour.                                                                                                                          |
| `grid_export_color`                  | string  | `#00ff00`                                                         | Grid export flow colour.                                                                                                                          |
| `grid2_import_color`                 | string  | `#FF3333`                                                         | Grid 2 import flow colour.                                                                                                                        |
| `grid2_export_color`                 | string  | `#00ff00`                                                         | Grid 2 export flow colour.                                                                                                                        |
| `heat_pump_text_color`               | string  | `#FFA500`                                                         | Text colour for the heat pump wattage label.                                                                                                      |
| `pool_flow_color`                    | string  | `#0080ff`                                                         | Pool flow colour.                                                                                                                                 |
| `pool_text_color`                    | string  | `#00FFFF`                                                         | Pool text colour.                                                                                                                                 |
| `hot_water_text_color`               | string  | `#00FFFF`                                                         | Hot water text colour.                                                                                                                            |
| `washing_machine_text_color`         | string  | `#00FFFF`                                                         | Washer text colour (defaults to the load text colour when unset).                                                                                 |
| `dishwasher_text_color`              | string  | `#00FFFF`                                                         | Dish washer text colour (defaults to the load text colour when unset).                                                                            |
| `dryer_text_color`                   | string  | `#00FFFF`                                                         | Dryer text colour (defaults to the load text colour when unset).                                                                                  |
| `refrigerator_text_color`            | string  | `#00FFFF`                                                         | Refrigerator text colour (defaults to the load text colour when unset).                                                                           |
| `freezer_text_color`                 | string  | `#00FFFF`                                                         | Freezer text colour (defaults to the load text colour when unset).                                                                                |
| `freezer_color`                      | string  | `#00FFFF`                                                         | Freezer text colour (same as freezer_text_color).                                                                                                 |
| `windmill_flow_color`                | string  | `#00FFFF`                                                         | Windmill flow colour.                                                                                                                             |
| `windmill_text_color`                | string  | `#00FFFF`                                                         | Windmill text colour.                                                                                                                             |
| `windmill_power_font_size`           | number  | `10`                                                              | Font size for windmill power readout (px).                                                                                                        |
| `battery_fill_high_color`            | string  | `#00ffff`                                                         | Battery liquid fill colour above the low threshold.                                                                                               |
| `battery_fill_low_color`             | string  | `#ff0000`                                                         | Battery liquid fill colour at or below the low threshold.                                                                                         |
| `battery_fill_low_threshold`         | number  | `25`                                                              | SOC percentage that flips to the low fill colour.                                                                                                 |
| `battery_fill_opacity`               | number  | `0.75`                                                            | Opacity for the battery liquid fill (0–1).                                                                                                        |
| `grid_activity_threshold`            | number  | `100`                                                             | Minimum absolute grid power (W) before flows animate.                                                                                             |
| `grid_power_only`                    | boolean | `false`                                                           | Forces a direct grid→house flow (hides inverter/battery flows).                                                                                   |
| `grid_threshold_warning`             | number  | —                                                                 | Trigger warning colour when grid magnitude meets this value.                                                                                      |
| `grid_warning_color`                 | string  | `#ff8000`                                                         | Grid warning colour.                                                                                                                              |
| `grid_threshold_critical`            | number  | —                                                                 | Trigger critical colour when magnitude meets this value.                                                                                          |
| `grid_critical_color`                | string  | `#ff0000`                                                         | Grid critical colour.                                                                                                                             |
| `grid2_threshold_warning`            | number  | —                                                                 | Trigger warning colour when Grid 2 magnitude meets this value.                                                                                    |
| `grid2_warning_color`                | string  | `#ff8000`                                                         | Grid 2 warning colour.                                                                                                                            |
| `grid2_threshold_critical`           | number  | —                                                                 | Trigger critical colour when Grid 2 magnitude meets this value.                                                                                   |
| `grid2_critical_color`               | string  | `#ff0000`                                                         | Grid 2 critical colour.                                                                                                                           |
| `invert_grid`                        | boolean | `false`                                                           | Flip grid polarity if import/export are reversed.                                                                                                 |
| `invert_battery`                     | boolean | `false`                                                           | Flip battery polarity and swap charge/discharge hues.                                                                                             |
| `invert_bat1`                        | boolean | `false`                                                           | Override only Battery 1 polarity when its sensors are reversed.                                                                                   |
| `invert_bat2`                        | boolean | `false`                                                           | Override only Battery 2 polarity when its sensors are reversed.                                                                                   |
| `invert_bat3`                        | boolean | `false`                                                           | Override only Battery 3 polarity when its sensors are reversed.                                                                                   |

> **Battery sensor requirement (EN):** For each battery (`bat1`..`bat4`) supply either the combined `sensor_batX_power` **or** both `sensor_batX_charge_power` and `sensor_batX_discharge_power`. Readings may be in W or kW; the card handles conversions automatically.

### Grid Flow Routing (EN)

The card now selects the grid animation path automatically:

* When a PV total (`sensor_pv_total`) or at least one Array 1 string sensor exists, imports and exports animate along the inverter conduit just like before.
* If `sensor_pv_total` and all Array 1 string slots are left blank, the card assumes you're running directly from the grid: the animation shifts to the house branch, the grid arrow points at the home, and PV-only UI (Daily Yield badge + PV popup) stays hidden.
* When `grid_power_only` is enabled, the card always uses the direct grid→house path and hides inverter/battery flows, even if PV sensors are configured.

The legacy grid→house toggle has been removed, so delete any `grid_flow_mode` entries from your YAML. Detection now happens every render and `grid_activity_threshold` still governs when the animation starts.

### Popups (Editor Options)

The card provides five editable popup groups (PV, House, Battery, Grid, Inverter). Each popup exposes up to six entity slots, optional custom names, per-line colour pickers, and font-size controls.  
The entities specfied in here will not have any conversions done to them other tha the name override if you specify one. This has been done delibertly so it is more flexible.  
It is not only sensors that can be specifed in the popups. Text based entities can be displayed (e.g. alerts). If you have a sensor that needs its units converted. Please use  
a helper to display it.

* PV Popup
  * `sensor_popup_pv_1` .. `sensor_popup_pv_6`: entity selectors for PV popup lines.
  * `sensor_popup_pv_1_name` .. `sensor_popup_pv_6_name`: optional custom names (falls back to entity name).
  * `sensor_popup_pv_1_color` .. `sensor_popup_pv_6_color`: per-line colour pickers (default `#00FFFF`).
  * `sensor_popup_pv_1_font_size` .. `sensor_popup_pv_6_font_size`: per-line font-size (px) (default `12`).
  * Clickable areas are the Daily PV Yield box and the Solar Panels. Click to toggle the PV popup; clicking the popup closes it.
* House Popup
  * `sensor_popup_house_1` .. `sensor_popup_house_6`: entity selectors for House popup lines.
  * `sensor_popup_house_1_name` .. `sensor_popup_house_6_name`: optional custom names.
  * `sensor_popup_house_1_color` .. `sensor_popup_house_6_color`: per-line colour pickers (default `#00FFFF`).
  * `sensor_popup_house_1_font_size` .. `sensor_popup_house_6_font_size`: per-line font-size (px) (default `12`).
  * When configured, the House popup also auto-includes: Heat Pump/AC, Pool, Washing Machine, Dryer, Dish Washer, and Refrigerator (using the popup slot styling).
  * House clickable area is the House; click to toggle the House popup and click the popup to close.
* Battery Popup
  * `sensor_popup_bat_1` .. `sensor_popup_bat_6`: entity selectors for Battery popup lines.
  * `sensor_popup_bat_1_name` .. `sensor_popup_bat_6_name`: optional custom names.
  * `sensor_popup_bat_1_color` .. `sensor_popup_bat_6_color`: per-line colour pickers (default `#00FFFF`).
  * `sensor_popup_bat_1_font_size` .. `sensor_popup_bat_6_font_size`: per-line font-size (px) (default `12`).
  * Battery clickable areads is the battery image. Click to toggle the Battery popup; clicking the popup closes it.
* Grid Popup
  * `sensor_popup_grid_1` .. `sensor_popup_grid_6`: entity selectors for Grid popup lines.
  * `sensor_popup_grid_1_name` .. `sensor_popup_grid_6_name`: optional custom names.
  * `sensor_popup_grid_1_color` .. `sensor_popup_grid_6_color`: per-line colour pickers (default `#00FFFF`).
  * `sensor_popup_grid_1_font_size` .. `sensor_popup_grid_6_font_size`: per-line font-size (px) (default `12`).
  * Grid clickable area is the Grid section; click to toggle the Grid popup and click the popup to close.
* Inverter Popup
  * `sensor_popup_inverter_1` .. `sensor_popup_inverter_6`: entity selectors for Inverter popup lines.
  * `sensor_popup_inverter_1_name` .. `sensor_popup_inverter_6_name`: optional custom names.
  * `sensor_popup_inverter_1_color` .. `sensor_popup_inverter_6_color`: per-line colour pickers (default `#00FFFF`).
  * `sensor_popup_inverter_1_font_size` .. `sensor_popup_inverter_6_font_size`: per-line font-size (px) (default `12`).
  * Inverter clickable area is the Inverter section; click to toggle the Inverter popup and click the popup to close.

### Additional Array 2 & Options (EN)

| Option                                            | Type     | Default   | Notes                                                                                                                                      |
| ------------------------------------------------- | -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `sensor_pv_total_secondary`                       | entity   | —         | Optional second inverter total (PV2). When provided it is added to PV TOT and drives the secondary PV flow.                                |
| `sensor_pv_array2_1` .. `sensor_pv_array2_6`      | entities | —         | Up to six per-string sensors for Array 2. Used for aggregation when no total is provided; per-string values can be shown via the PV popup. |
| `sensor_daily_array2`                             | entity   | —         | Daily production sensor for Array 2; combined daily yield = `sensor_daily` + `sensor_daily_array2`.                                        |
| `sensor_home_load_secondary`                      | entity   | —         | Optional home load sensor tied to inverter 2; required for HOUSE TOT / INV 2 lines when Array 2 is active.                                 |
| `pv_tot_color`                                    | string   | `#00FFFF` | Overrides the PV TOT line/text colour (also affects string inheritance when set).                                                          |
| `house_total_color` / `inv1_color` / `inv2_color` | string   | —         | Per-line colour overrides for HOUSE TOT, INV 1 and INV 2 flows.                                                                            |
| `invert_battery`                                  | boolean  | `false`   | Swaps charge/discharge polarity, colours, and animation direction.                                                                         |

Car colours & fonts: `car1_name_color`, `car2_name_color`, `car1_color`, `car2_color`, `car2_pct_color`, `car_name_font_size`, `car2_name_font_size` — new colour and name-font-size controls for Car 1 and Car 2 (power and SOC font sizes remain available as `car_power_font_size`, `car2_power_font_size`, `car_soc_font_size`, `car2_soc_font_size`).

Notes:

* When Array 2 is active the PV flow mapping is: `pv1` → Array 1 (primary), `pv2` → Array 2 (secondary). The PV TOT line shows the combined production where applicable.
* Individual PV strings are no longer rendered on the main card; use the PV popup (`sensor_popup_pv_1` .. `sensor_popup_pv_6`) to show per-string sensors if desired.

---

## Italiano

### Panoramica

Advanced Energy Card è una card personalizzata Lovelace per Home Assistant che visualizza flussi energetici animati, aggrega stringhe fotovoltaiche e batterie e presenta metriche opzionali per la ricarica dei veicoli elettrici in un layout cinematografico. Advanced Energy Card è il cuore di Lumina Energy Card e rappresenta ciò che avrebbe dovuto essere la versione 2.0 di Lumina.

### Caratteristiche Principali

* Nuova casa futuristica con un sistema grafico completamente ridisegnato, che consente maggiore funzionalità
* Nuova configurazione iniziale guidata
* Fino a sei sensori fotovoltaici con due array supportati per stringa o ingressi totalizzati
* Fino a quattro sistemi di batterie con visualizzazione SOC, potenza e livello della batteria per quattro batterie (2 per inverter se si utilizzano 2 inverter)
* Informazioni aggiuntive sulla batteria visualizzate nel popup della batteria
* Visualizzazione dinamica della potenza della turbina eolica e fino a due veicoli elettrici con stato di carica e consumo o ritorno di potenza
* Flussi animati di rete, carico, fotovoltaico, batteria e veicoli elettrici con colore dinamico basato su soglie e stili di animazione selezionabili
* Soglia di animazione della rete configurabile (predefinita 100 W) per sopprimere le fluttuazioni di importazione/esportazione a basso livello
* Moltiplicatore di velocità di animazione regolabile (da -3× a 3×, predefinito 1×, pausa/inversione supportata) e soglie di visibilità per flusso
* Badge di produzione energetica giornaliera
* Totali di importazione ed esportazione giornalieri
* Il consumo energetico della piscina ora mostrato sul grafico principale e può essere nascosto se non in uso
* Consumo di pompa di calore/climatizzatore e sistema acqua calda ora mostrati
* Lavatrice, asciugatrice, frigorifero, lavastoviglie ora inclusi nel popup
* Override dei colori di avviso/critico del carico e soglia SOC bassa configurabile per il riempimento liquido della batteria
* Selezione del carattere, dimensione del carattere e colore del testo disponibili per tutte le entità visualizzate
* Cursore dell'intervallo di aggiornamento (0-60 s, predefinito 5 s) con aggiornamento in tempo reale opzionale quando impostato su 0
* Popup informativi per Casa, Solare, Batteria, Rete e Inverter
* Ognuno ha sei slot per le entità con override dei nomi e override dei colori dei caratteri
* Le voci dei popup possono essere cliccate per mostrare l'entità HA
* Molte nuove funzionalità in arrivo, con supporto per più elementi

### Installazione

#### HACS

1. Aprire HACS in Home Assistant e scegliere **Frontend**
2. Utilizzare il menu a tre punti → **Repository personalizzati**
3. Inserire `https://github.com/ratava/advanced-energy-card`, selezionare **Dashboard** e fare clic su **Aggiungi**
4. Individuare **Advanced Energy Card** in Frontend e fare clic su **Installa**
5. Riavviare Home Assistant se richiesto

#### Installazione Manuale

1. Scaricare tutti i file da `dist/` dall'[ultima release](https://github.com/ratava/advanced-energy-card/releases)
2. Copiare i file in `/config/www/community/advanced-energy-card/`
3. Aggiungere la risorsa Lovelace:

```yaml
lovelace:
  resources:
    - url: /local/community/advanced-energy-card/advanced-energy-card.js
      type: module
```

1. Riavviare Home Assistant per caricare la risorsa

### Configurazione Iniziale

1. Modificare il dashboard e fare clic su **Aggiungi Card**
2. Cercare **Advanced Energy Card**
3. Seguire le domande nel menu di configurazione iniziale. Coprirà la maggior parte delle configurazioni dei sensori di base
4. Sono state aggiunte molte altre opzioni tra cui un menu completamente ristrutturato

### Tabella Opzioni

| Opzione                              | Tipo    | Predefinito                                                       | Note                                                                                                                                                                                   |
| ------------------------------------ | ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `card_title`                         | string  | —                                                                 | Testo intestazione opzionale; vuoto mantiene il titolo nascosto                                                                                                                        |
| `title_render_mode`                  | string  | `html`                                                            | Come viene visualizzato il titolo: `html` (consigliato) o `svg` (legacy)                                                                                                               |
| `title_text_color`                   | string  | —                                                                 | Override opzionale per il colore del testo del titolo (hex)                                                                                                                            |
| `title_bg_color`                     | string  | —                                                                 | Override opzionale per il rettangolo di sfondo del titolo (hex)                                                                                                                        |
| `font_family`                        | string  | `B612`                                                            | Famiglia di caratteri per il testo della card (CSS font-family)                                                                                                                        |
| `odometer_font_family`               | string  | —                                                                 | Carattere alternativo opzionale utilizzato dai numeri animati in stile odometro; ritorna a `font_family` quando non impostato                                                          |
| `background_day`                     | string  | `/local/community/advanced-energy-card/advanced-modern-day.svg`   | Sfondo diurno (utilizzato quando `day_night_mode` è `day` o in `auto` durante il giorno)                                                                                               |
| `background_night`                   | string  | `/local/community/advanced-energy-card/advanced-modern-night.svg` | Sfondo notturno (utilizzato quando `day_night_mode` è `night` o in `auto` durante la notte)                                                                                            |
| `language`                           | string  | `en`                                                              | Lingue editor supportate: `en`, `it`, `de`, `fr`, `nl`, `es`                                                                                                                           |
| `display_unit`                       | string  | `kW`                                                              | Visualizza valori in `W` o `kW`                                                                                                                                                        |
| `update_interval`                    | number  | `5`                                                               | Cadenza di aggiornamento (0-60 s, passo 5; 0 disabilita la limitazione)                                                                                                                |
| `animation_speed_factor`             | number  | `1`                                                               | Moltiplicatore di animazione del flusso (-3-3, 0 pausa, negativi invertono)                                                                                                            |
| `animation_style`                    | string  | `dashes`                                                          | Stile animazione diurna. Motivo del flusso (`dashes`, `dashes_glow`, `fluid_flow`, `dots`, `arrows`)                                                                                   |
| `night_animation_style`              | string  | `dashes`                                                          | Stile animazione notturna (stesse opzioni di `animation_style`). Quando vuoto/non impostato, ritorna a `animation_style`                                                               |
| `dashes_glow_intensity`              | number  | `1`                                                               | Intensità del bagliore per lo stile `dashes_glow` (0-3)                                                                                                                                |
| `flow_stroke_width`                  | number  | `2`                                                               | Larghezza del tratto (px) per `dashes`/`dashes_glow`/`dots`/`arrows`                                                                                                                   |
| `fluid_flow_stroke_width`            | number  | `3`                                                               | Larghezza del tratto (px) per `fluid_flow`                                                                                                                                             |
| `fluid_flow_outer_glow`              | boolean | `false`                                                           | Aggiunge un effetto bagliore esterno per `fluid_flow`                                                                                                                                  |
| `day_night_mode`                     | string  | `day`                                                             | Seleziona Giorno/Notte: `day`, `night` o `auto` (auto segue `sun.sun`)                                                                                                                 |
| `night_mode`                         | boolean | `false`                                                           | Modalità notturna booleana legacy (deprecato). Preferire `day_night_mode`                                                                                                              |
| `sensor_pv_total`                    | entity  | —                                                                 | Sensore di produzione fotovoltaica aggregato opzionale. Fornire questo sensore **o** almeno una stringa fotovoltaica                                                                   |
| `sensor_pv1` .. `sensor_pv6`         | entity  | —                                                                 | Sensori di stringa fotovoltaica per Array 1. Quando non viene fornito un totale, è richiesta almeno una stringa e tutte le stringhe configurate vengono sommate per produrre PV TOTALE |
| `sensor_daily`                       | entity  | —                                                                 | Sensore di produzione giornaliera (richiesto)                                                                                                                                          |
| `sensor_bat1_soc`                    | entity  | —                                                                 | Sensore SOC batteria (richiesto solo quando viene visualizzata una batteria)                                                                                                           |
| `sensor_bat1_power`                  | entity  | —                                                                 | Sensore di potenza netta combinata per Batteria 1. Fornire questo o entrambi i sensori divisi sotto                                                                                    |
| `sensor_bat1_charge_power`           | entity  | —                                                                 | Sensore di carica Batteria 1 (valori positivi, W o kW). Utilizzare con `sensor_bat1_discharge_power` quando non esiste un sensore combinato                                            |
| `sensor_bat1_discharge_power`        | entity  | —                                                                 | Sensore di scarica Batteria 1 (valori positivi)                                                                                                                                        |
| `sensor_home_load`                   | entity  | —                                                                 | Sensore di carico/consumo domestico (richiesto)                                                                                                                                        |
| `sensor_grid_power`                  | entity  | —                                                                 | Sensore rete netta (richiesto a meno che non venga fornita coppia importazione/esportazione)                                                                                           |
| `sensor_grid_import`                 | entity  | —                                                                 | Sensore solo importazione opzionale (valori positivi)                                                                                                                                  |
| `sensor_grid_export`                 | entity  | —                                                                 | Sensore solo esportazione opzionale (valori positivi)                                                                                                                                  |
| `sensor_grid_import_daily`           | entity  | —                                                                 | Sensore di importazione rete giornaliera cumulativa opzionale                                                                                                                          |
| `sensor_grid_export_daily`           | entity  | —                                                                 | Sensore di esportazione rete giornaliera cumulativa opzionale                                                                                                                          |
| `show_daily_grid`                    | boolean | `false`                                                           | Mostra i totali di importazione/esportazione giornalieri sopra il valore della rete in tempo reale                                                                                     |
| `show_grid_flow_label`               | boolean | `true`                                                            | Antepone "Importazione/Esportazione" prima del valore della rete                                                                                                                       |
| `sensor_heat_pump_consumption`       | entity  | —                                                                 | Sensore pompa di calore; sblocca il flusso arancione e scambia lo sfondo                                                                                                               |
| `sensor_hot_water_consumption`       | entity  | —                                                                 | Sensore carico riscaldamento acqua calda (guida l'etichetta acqua calda)                                                                                                               |
| `sensor_pool_consumption`            | entity  | —                                                                 | Sensore consumo piscina opzionale; abilita il ramo/etichetta piscina quando presente                                                                                                   |
| `sensor_washing_machine_consumption` | entity  | —                                                                 | Sensore consumo lavatrice opzionale che guida l'etichetta lavatrice                                                                                                                    |
| `sensor_dishwasher_consumption`      | entity  | —                                                                 | Sensore consumo lavastoviglie opzionale                                                                                                                                                |
| `sensor_dryer_consumption`           | entity  | —                                                                 | Sensore consumo asciugatrice opzionale                                                                                                                                                 |
| `sensor_refrigerator_consumption`    | entity  | —                                                                 | Sensore consumo frigorifero opzionale                                                                                                                                                  |
| `sensor_freezer_consumption`         | entity  | —                                                                 | Sensore consumo congelatore opzionale                                                                                                                                                  |
| `sensor_windmill_total`              | entity  | —                                                                 | Sensore generazione totale turbina eolica opzionale                                                                                                                                    |
| `sensor_windmill_daily`              | entity  | —                                                                 | Sensore generazione giornaliera turbina eolica opzionale                                                                                                                               |
| `sensor_car_power`                   | entity  | —                                                                 | Sensore potenza di ricarica Auto 1 opzionale                                                                                                                                           |
| `sensor_car_soc`                     | entity  | —                                                                 | Sensore SOC Auto 1 opzionale                                                                                                                                                           |
| `sensor_car2_power`                  | entity  | —                                                                 | Sensore potenza di ricarica Auto 2 opzionale                                                                                                                                           |
| `sensor_car2_soc`                    | entity  | —                                                                 | Sensore SOC Auto 2 opzionale                                                                                                                                                           |
| `show_car_soc`                       | boolean | `false`                                                           | Attiva/disattiva il pannello Auto 1 (potenza + SOC)                                                                                                                                    |
| `show_car2`                          | boolean | `false`                                                           | Attiva/disattiva il pannello Auto 2 quando esistono i sensori                                                                                                                          |
| `grid_activity_threshold`            | number  | `100`                                                             | Potenza minima assoluta della rete (W) prima che i flussi si animino                                                                                                                   |
| `invert_grid`                        | boolean | `false`                                                           | Inverti polarità rete se importazione/esportazione sono invertite                                                                                                                      |
| `invert_battery`                     | boolean | `false`                                                           | Inverti polarità batteria e scambia tonalità carica/scarica                                                                                                                            |

> **Requisito sensore batteria:** Per ogni batteria (`bat1`..`bat4`) fornire `sensor_batX_power` combinato **o** entrambi `sensor_batX_charge_power` e `sensor_batX_discharge_power`. Le letture possono essere in W o kW; la card gestisce automaticamente le conversioni.

---

## Deutsch

### Übersicht

Advanced Energy Card ist eine benutzerdefinierte Lovelace-Karte für Home Assistant, die animierte Energieflüsse rendert, PV-Strings und Batterien aggregiert und optionale Metriken für das Laden von Elektrofahrzeugen in einem kinematografischen Layout darstellt. Advanced Energy Card ist das Herzstück von Lumina Energy Card und hätte Version 2.0 von Lumina sein sollen.

### Hauptmerkmale

* Neues futuristisches Haus mit einem völlig neu gestalteten Grafiksystem, das mehr Funktionalität ermöglicht
* Neue geführte Erstkonfiguration
* Bis zu sechs PV-Sensoren mit zwei Arrays, die pro String oder totalisierten Eingängen unterstützt werden
* Bis zu vier Batteriesysteme mit SOC-, Leistungs- und Batteriestandvisualisierung für vier Batterien (2 pro Wechselrichter bei Verwendung von 2 Wechselrichtern)
* Zusätzliche Batterieinformationen werden im Batterie-Popup angezeigt
* Dynamische Anzeige der Windmühlenleistung und bis zu zwei Elektrofahrzeuge mit Ladezustand und Stromverbrauch oder -rückgabe
* Animierte Netz-, Last-, PV-, Batterie- und EV-Flüsse mit dynamischer Farbe basierend auf Schwellenwerten und auswählbaren Animationsstilen
* Konfigurierbare Netzanimationsschwelle (Standard 100 W) zur Unterdrückung von Import-/Export-Schwankungen auf niedrigem Niveau
* Einstellbarer Animationsgeschwindigkeitsmultiplikator (-3× bis 3×, Standard 1×, Pause/Rückwärts unterstützt) und Sichtbarkeitsschwellen pro Fluss
* Tägliches Energieproduktions-Badge
* Tägliche Import- und Exportgesamtwerte
* Poolstromverbrauch wird jetzt auf der Hauptgrafik angezeigt und kann ausgeblendet werden, wenn er nicht verwendet wird
* Wärmepumpen-/Klimaanlagenleistung und Warmwassersystemverbrauch werden jetzt angezeigt
* Waschmaschine, Trockner, Kühlschrank, Geschirrspüler jetzt im Popup enthalten
* Überschreibungen der Warnung/kritischen Farbe der Last und eine konfigurierbare niedrige SOC-Schwelle für die Batterieflüssigkeitsfüllung
* Schriftauswahl, Schriftgröße und Textfarbe verfügbar für alle angezeigten Entitäten
* Aktualisierungsintervall-Schieberegler (0-60 s, Standard 5 s) mit optionaler Echtzeit-Aktualisierung, wenn auf 0 gesetzt
* Popup-Informationsanzeigen für Haus, Solar, Batterie, Netz und Wechselrichter
* Jedes hat sechs Slots für Entitäten mit Namensüberschreibungen und Schriftfarbenüberschreibungen
* Popup-Einträge können angeklickt werden, um die HA-Entität anzuzeigen
* Viele neue Funktionen kommen, mit Unterstützung für weitere Elemente

### Installation

#### HACS

1. Öffnen Sie HACS in Home Assistant und wählen Sie **Frontend**
2. Verwenden Sie das Drei-Punkte-Menü → **Benutzerdefinierte Repositories**
3. Geben Sie `https://github.com/ratava/advanced-energy-card` ein, wählen Sie **Dashboard** und klicken Sie auf **Hinzufügen**
4. Suchen Sie **Advanced Energy Card** unter Frontend und klicken Sie auf **Installieren**
5. Starten Sie Home Assistant neu, wenn Sie dazu aufgefordert werden

#### Manuelle Installation

1. Laden Sie alle Dateien aus `dist/` vom [neuesten Release](https://github.com/ratava/advanced-energy-card/releases) herunter
2. Kopieren Sie die Dateien nach `/config/www/community/advanced-energy-card/`
3. Fügen Sie die Lovelace-Ressource hinzu:

```yaml
lovelace:
  resources:
    - url: /local/community/advanced-energy-card/advanced-energy-card.js
      type: module
```

1. Starten Sie Home Assistant neu, um die Ressource zu laden

### Erstkonfiguration

1. Bearbeiten Sie Ihr Dashboard und klicken Sie auf **Karte hinzufügen**
2. Suchen Sie nach **Advanced Energy Card**
3. Folgen Sie den Fragen im Menü Erstkonfiguration. Es deckt die meisten Konfigurationen der Basissensoren ab
4. Viele weitere Optionen wurden hinzugefügt, einschließlich eines vollständig umstrukturierten Menüs

### Optionstabelle

| Option                               | Typ     | Standard                                                          | Hinweise                                                                                                                                                                         |
| ------------------------------------ | ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `card_title`                         | string  | —                                                                 | Optionaler Kopfzeilentext; leer hält den Titel verborgen                                                                                                                         |
| `title_render_mode`                  | string  | `html`                                                            | Wie der Titel gerendert wird: `html` (empfohlen) oder `svg` (veraltet)                                                                                                           |
| `title_text_color`                   | string  | —                                                                 | Optionale Überschreibung für Titeltextfarbe (hex)                                                                                                                                |
| `title_bg_color`                     | string  | —                                                                 | Optionale Überschreibung für das Titelhintergrundrechteck (hex)                                                                                                                  |
| `font_family`                        | string  | `B612`                                                            | Schriftfamilie für den Kartentext (CSS font-family)                                                                                                                              |
| `odometer_font_family`               | string  | —                                                                 | Optionale alternative Schrift für Tacho-ähnliche animierte Zahlen; fällt auf `font_family` zurück, wenn nicht gesetzt                                                            |
| `background_day`                     | string  | `/local/community/advanced-energy-card/advanced-modern-day.svg`   | Tageshintergrund (verwendet wenn `day_night_mode` `day` ist oder in `auto` tagsüber)                                                                                             |
| `background_night`                   | string  | `/local/community/advanced-energy-card/advanced-modern-night.svg` | Nachthintergrund (verwendet wenn `day_night_mode` `night` ist oder in `auto` nachts)                                                                                             |
| `language`                           | string  | `en`                                                              | Unterstützte Editor-Sprachen: `en`, `it`, `de`, `fr`, `nl`, `es`                                                                                                                 |
| `display_unit`                       | string  | `kW`                                                              | Werte in `W` oder `kW` anzeigen                                                                                                                                                  |
| `update_interval`                    | number  | `5`                                                               | Aktualisierungsrate (0-60 s, Schritt 5; 0 deaktiviert Drosselung)                                                                                                                |
| `animation_speed_factor`             | number  | `1`                                                               | Flussanimations-Multiplikator (-3-3, 0 pausiert, negative kehren um)                                                                                                             |
| `animation_style`                    | string  | `dashes`                                                          | Tagesanimationsstil. Flussmotiv (`dashes`, `dashes_glow`, `fluid_flow`, `dots`, `arrows`)                                                                                        |
| `night_animation_style`              | string  | `dashes`                                                          | Nachtanimationsstil (gleiche Optionen wie `animation_style`). Wenn leer/nicht gesetzt, fällt auf `animation_style` zurück                                                        |
| `dashes_glow_intensity`              | number  | `1`                                                               | Leuchtintensität für `dashes_glow` Stil (0-3)                                                                                                                                    |
| `flow_stroke_width`                  | number  | `2`                                                               | Strichbreite (px) für `dashes`/`dashes_glow`/`dots`/`arrows`                                                                                                                     |
| `fluid_flow_stroke_width`            | number  | `3`                                                               | Strichbreite (px) für `fluid_flow`                                                                                                                                               |
| `fluid_flow_outer_glow`              | boolean | `false`                                                           | Fügt einen äußeren Leuchteffekt für `fluid_flow` hinzu                                                                                                                           |
| `day_night_mode`                     | string  | `day`                                                             | Wählt Tag/Nacht: `day`, `night` oder `auto` (auto folgt `sun.sun`)                                                                                                               |
| `night_mode`                         | boolean | `false`                                                           | Legacy-Boolean-Nachtmodus (veraltet). Bevorzugen Sie `day_night_mode`                                                                                                            |
| `sensor_pv_total`                    | entity  | —                                                                 | Optionaler aggregierter PV-Produktionssensor. Entweder diesen Sensor **oder** mindestens einen PV-String bereitstellen                                                           |
| `sensor_pv1` .. `sensor_pv6`         | entity  | —                                                                 | PV-String-Sensoren für Array 1. Wenn kein Gesamt angegeben ist, ist mindestens ein String erforderlich und alle konfigurierten Strings werden summiert, um PV GESAMT zu erzeugen |
| `sensor_daily`                       | entity  | —                                                                 | Täglicher Produktionssensor (erforderlich)                                                                                                                                       |
| `sensor_bat1_soc`                    | entity  | —                                                                 | Batterie-SOC-Sensor (nur erforderlich, wenn eine Batterie angezeigt wird)                                                                                                        |
| `sensor_bat1_power`                  | entity  | —                                                                 | Kombinierter Nettoleistungssensor für Batterie 1. Entweder diesen oder beide geteilten Sensoren unten bereitstellen                                                              |
| `sensor_bat1_charge_power`           | entity  | —                                                                 | Batterie 1 Ladesensor (positive Werte, W oder kW). Mit `sensor_bat1_discharge_power` verwenden, wenn kein kombinierter Sensor existiert                                          |
| `sensor_bat1_discharge_power`        | entity  | —                                                                 | Batterie 1 Entladesensor (positive Werte)                                                                                                                                        |
| `sensor_home_load`                   | entity  | —                                                                 | Hauslast-/Verbrauchssensor (erforderlich)                                                                                                                                        |
| `sensor_grid_power`                  | entity  | —                                                                 | Netz-Nettosensor (erforderlich, es sei denn, Import-/Exportpaar wird bereitgestellt)                                                                                             |
| `sensor_grid_import`                 | entity  | —                                                                 | Optionaler Nur-Import-Sensor (positive Werte)                                                                                                                                    |
| `sensor_grid_export`                 | entity  | —                                                                 | Optionaler Nur-Export-Sensor (positive Werte)                                                                                                                                    |
| `sensor_grid_import_daily`           | entity  | —                                                                 | Optionaler kumulativer täglicher Netzimportsensor                                                                                                                                |
| `sensor_grid_export_daily`           | entity  | —                                                                 | Optionaler kumulativer täglicher Netzexportsensor                                                                                                                                |
| `show_daily_grid`                    | boolean | `false`                                                           | Zeigt die täglichen Import-/Exportgesamtwerte über dem Live-Netzwert                                                                                                             |
| `show_grid_flow_label`               | boolean | `true`                                                            | Stellt "Importieren/Exportieren" vor dem Netzwert voran                                                                                                                          |
| `sensor_heat_pump_consumption`       | entity  | —                                                                 | Wärmepumpensensor; entsperrt den orangefarbenen Fluss und tauscht den Hintergrund aus                                                                                            |
| `sensor_hot_water_consumption`       | entity  | —                                                                 | Warmwasser-Heizlastsensor (steuert das Warmwasserlabel)                                                                                                                          |
| `sensor_pool_consumption`            | entity  | —                                                                 | Optionaler Pool-Verbrauchssensor; aktiviert den Pool-Zweig/Label, wenn vorhanden                                                                                                 |
| `sensor_washing_machine_consumption` | entity  | —                                                                 | Optionaler Waschmaschinen-Verbrauchssensor, der das Waschmaschinenlabel steuert                                                                                                  |
| `sensor_dishwasher_consumption`      | entity  | —                                                                 | Optionaler Geschirrspüler-Verbrauchssensor                                                                                                                                       |
| `sensor_dryer_consumption`           | entity  | —                                                                 | Optionaler Trockner-Verbrauchssensor                                                                                                                                             |
| `sensor_refrigerator_consumption`    | entity  | —                                                                 | Optionaler Kühlschrank-Verbrauchssensor                                                                                                                                          |
| `sensor_freezer_consumption`         | entity  | —                                                                 | Optionaler Gefrierschrank-Verbrauchssensor                                                                                                                                       |
| `sensor_windmill_total`              | entity  | —                                                                 | Optionaler Windmühlen-Gesamterzeugungssensor                                                                                                                                     |
| `sensor_windmill_daily`              | entity  | —                                                                 | Optionaler täglicher Windmühlen-Erzeugungssensor                                                                                                                                 |
| `sensor_car_power`                   | entity  | —                                                                 | Optionaler Auto 1 Ladeleistungssensor                                                                                                                                            |
| `sensor_car_soc`                     | entity  | —                                                                 | Optionaler Auto 1 SOC-Sensor                                                                                                                                                     |
| `sensor_car2_power`                  | entity  | —                                                                 | Optionaler Auto 2 Ladeleistungssensor                                                                                                                                            |
| `sensor_car2_soc`                    | entity  | —                                                                 | Optionaler Auto 2 SOC-Sensor                                                                                                                                                     |
| `show_car_soc`                       | boolean | `false`                                                           | Schaltet das Auto 1 Panel um (Leistung + SOC)                                                                                                                                    |
| `show_car2`                          | boolean | `false`                                                           | Schaltet das Auto 2 Panel um, wenn Sensoren vorhanden sind                                                                                                                       |
| `grid_activity_threshold`            | number  | `100`                                                             | Minimale absolute Netzleistung (W), bevor Flüsse animiert werden                                                                                                                 |
| `invert_grid`                        | boolean | `false`                                                           | Netzpolarität umkehren, wenn Import/Export vertauscht sind                                                                                                                       |
| `invert_battery`                     | boolean | `false`                                                           | Batteriepolarität umkehren und Lade-/Entladefarbton tauschen                                                                                                                     |

> **Batteriesensor-Anforderung:** Für jede Batterie (`bat1`..`bat4`) entweder den kombinierten `sensor_batX_power` **oder** beide `sensor_batX_charge_power` und `sensor_batX_discharge_power` bereitstellen. Messwerte können in W oder kW vorliegen; die Karte führt automatisch Konvertierungen durch.

---

## Français

### Vue d'ensemble

Advanced Energy Card est une carte Lovelace personnalisée pour Home Assistant qui rend les flux d'énergie animés, agrège les chaînes PV et les batteries, et présente des métriques optionnelles de recharge de véhicules électriques dans une mise en page cinématographique. Advanced Energy Card est le cœur de Lumina Energy Card et représente ce qui aurait dû être la version 2.0 de Lumina.

### Caractéristiques Principales

* Nouvelle maison futuriste avec un système graphique entièrement repensé, permettant plus de fonctionnalités
* Nouvelle configuration initiale guidée
* Jusqu'à six capteurs PV avec deux panneaux supportés par chaîne ou entrées totalisées
* Jusqu'à quatre systèmes de batteries avec visualisation SOC, puissance et niveau de batterie pour quatre batteries (2 par onduleur si vous utilisez 2 onduleurs)
* Informations supplémentaires sur la batterie affichées dans le popup de la batterie
* Affichage dynamique de la puissance de l'éolienne et jusqu'à deux véhicules électriques avec état de charge et consommation ou retour de puissance
* Flux animés de réseau, charge, PV, batterie et VE avec couleur dynamique basée sur des seuils et styles d'animation sélectionnables
* Seuil d'animation du réseau configurable (par défaut 100 W) pour supprimer les fluctuations d'import/export de bas niveau
* Multiplicateur de vitesse d'animation réglable (-3× à 3×, par défaut 1×, pause/inversion supportée) et seuils de visibilité par flux
* Badge de production d'énergie quotidienne
* Totaux d'importation et d'exportation quotidiens
* Consommation électrique de la piscine maintenant affichée sur le graphique principal et peut être masquée si non utilisée
* Consommation de la pompe à chaleur/climatisation et du système d'eau chaude maintenant affichées
* Lave-linge, sèche-linge, réfrigérateur, lave-vaisselle maintenant inclus dans le popup
* Remplacements de couleur d'avertissement/critique de charge et seuil SOC bas configurable pour le remplissage liquide de la batterie
* Sélection de police, taille de police et couleur de texte disponibles pour toutes les entités affichées
* Curseur d'intervalle de mise à jour (0-60 s, par défaut 5 s) avec actualisation en temps réel optionnelle lorsqu'il est réglé sur 0
* Affichages d'informations popup pour Maison, Solaire, Batterie, Réseau et Onduleur
* Chacun dispose de six emplacements pour les entités avec remplacements de noms et remplacements de couleurs de police
* Les entrées des popups peuvent être cliquées pour afficher l'entité HA
* De nombreuses nouvelles fonctionnalités à venir, avec prise en charge de plus d'éléments

### Installation

#### HACS

1. Ouvrez HACS dans Home Assistant et choisissez **Frontend**
2. Utilisez le menu à trois points → **Dépôts personnalisés**
3. Entrez `https://github.com/ratava/advanced-energy-card`, sélectionnez **Dashboard** et cliquez sur **Ajouter**
4. Localisez **Advanced Energy Card** sous Frontend et cliquez sur **Installer**
5. Redémarrez Home Assistant si demandé

#### Installation Manuelle

1. Téléchargez tous les fichiers de `dist/` depuis la [dernière version](https://github.com/ratava/advanced-energy-card/releases)
2. Copiez les fichiers dans `/config/www/community/advanced-energy-card/`
3. Ajoutez la ressource Lovelace :

```yaml
lovelace:
  resources:
    - url: /local/community/advanced-energy-card/advanced-energy-card.js
      type: module
```

1. Redémarrez Home Assistant pour charger la ressource

### Configuration Initiale

1. Modifiez votre tableau de bord et cliquez sur **Ajouter une carte**
2. Recherchez **Advanced Energy Card**
3. Suivez les questions dans le menu de configuration initiale. Il couvrira la plupart des configurations des capteurs de base
4. De nombreuses autres options ont été ajoutées, y compris un menu entièrement restructuré

### Tableau des Options

| Option                               | Type    | Défaut                                                            | Notes                                                                                                                                                                            |
| ------------------------------------ | ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `card_title`                         | string  | —                                                                 | Texte d'en-tête optionnel ; vide garde le titre masqué                                                                                                                           |
| `title_render_mode`                  | string  | `html`                                                            | Comment le titre est rendu : `html` (recommandé) ou `svg` (ancien)                                                                                                               |
| `title_text_color`                   | string  | —                                                                 | Remplacement optionnel pour la couleur du texte du titre (hex)                                                                                                                   |
| `title_bg_color`                     | string  | —                                                                 | Remplacement optionnel pour le rectangle d'arrière-plan du titre (hex)                                                                                                           |
| `font_family`                        | string  | `B612`                                                            | Famille de polices pour le texte de la carte (CSS font-family)                                                                                                                   |
| `odometer_font_family`               | string  | —                                                                 | Police alternative optionnelle utilisée par les nombres animés de style odomètre ; revient à `font_family` lorsqu'elle n'est pas définie                                         |
| `background_day`                     | string  | `/local/community/advanced-energy-card/advanced-modern-day.svg`   | Arrière-plan de jour (utilisé quand `day_night_mode` est `day` ou en `auto` pendant la journée)                                                                                  |
| `background_night`                   | string  | `/local/community/advanced-energy-card/advanced-modern-night.svg` | Arrière-plan de nuit (utilisé quand `day_night_mode` est `night` ou en `auto` pendant la nuit)                                                                                   |
| `language`                           | string  | `en`                                                              | Langues de l'éditeur prises en charge : `en`, `it`, `de`, `fr`, `nl`, `es`                                                                                                       |
| `display_unit`                       | string  | `kW`                                                              | Afficher les valeurs en `W` ou `kW`                                                                                                                                              |
| `update_interval`                    | number  | `5`                                                               | Cadence de rafraîchissement (0-60 s, pas de 5 ; 0 désactive la limitation)                                                                                                       |
| `animation_speed_factor`             | number  | `1`                                                               | Multiplicateur d'animation de flux (-3-3, 0 met en pause, les négatifs inversent)                                                                                                |
| `animation_style`                    | string  | `dashes`                                                          | Style d'animation de jour. Motif de flux (`dashes`, `dashes_glow`, `fluid_flow`, `dots`, `arrows`)                                                                               |
| `night_animation_style`              | string  | `dashes`                                                          | Style d'animation de nuit (mêmes options que `animation_style`). Quand vide/non défini, revient à `animation_style`                                                              |
| `dashes_glow_intensity`              | number  | `1`                                                               | Intensité de lueur pour le style `dashes_glow` (0-3)                                                                                                                             |
| `flow_stroke_width`                  | number  | `2`                                                               | Largeur de trait (px) pour `dashes`/`dashes_glow`/`dots`/`arrows`                                                                                                                |
| `fluid_flow_stroke_width`            | number  | `3`                                                               | Largeur de trait (px) pour `fluid_flow`                                                                                                                                          |
| `fluid_flow_outer_glow`              | boolean | `false`                                                           | Ajoute un effet de lueur extérieure pour `fluid_flow`                                                                                                                            |
| `day_night_mode`                     | string  | `day`                                                             | Sélectionne Jour/Nuit : `day`, `night` ou `auto` (auto suit `sun.sun`)                                                                                                           |
| `night_mode`                         | boolean | `false`                                                           | Mode nuit booléen ancien (déprécié). Préférez `day_night_mode`                                                                                                                   |
| `sensor_pv_total`                    | entity  | —                                                                 | Capteur de production PV agrégé optionnel. Fournir ce capteur **ou** au moins une chaîne PV                                                                                      |
| `sensor_pv1` .. `sensor_pv6`         | entity  | —                                                                 | Capteurs de chaîne PV pour Panneau 1. Quand aucun total n'est fourni, au moins une chaîne est requise et toutes les chaînes configurées sont additionnées pour produire PV TOTAL |
| `sensor_daily`                       | entity  | —                                                                 | Capteur de production quotidienne (requis)                                                                                                                                       |
| `sensor_bat1_soc`                    | entity  | —                                                                 | Capteur SOC de batterie (requis uniquement lorsqu'une batterie est affichée)                                                                                                     |
| `sensor_bat1_power`                  | entity  | —                                                                 | Capteur de puissance nette combinée pour Batterie 1. Fournir celui-ci ou les deux capteurs divisés ci-dessous                                                                    |
| `sensor_bat1_charge_power`           | entity  | —                                                                 | Capteur de charge Batterie 1 (valeurs positives, W ou kW). Utiliser avec `sensor_bat1_discharge_power` quand aucun capteur combiné n'existe                                      |
| `sensor_bat1_discharge_power`        | entity  | —                                                                 | Capteur de décharge Batterie 1 (valeurs positives)                                                                                                                               |
| `sensor_home_load`                   | entity  | —                                                                 | Capteur de charge/consommation domestique (requis)                                                                                                                               |
| `sensor_grid_power`                  | entity  | —                                                                 | Capteur réseau net (requis sauf si la paire import/export est fournie)                                                                                                           |
| `sensor_grid_import`                 | entity  | —                                                                 | Capteur d'importation uniquement optionnel (valeurs positives)                                                                                                                   |
| `sensor_grid_export`                 | entity  | —                                                                 | Capteur d'exportation uniquement optionnel (valeurs positives)                                                                                                                   |
| `sensor_grid_import_daily`           | entity  | —                                                                 | Capteur d'importation réseau quotidienne cumulative optionnel                                                                                                                    |
| `sensor_grid_export_daily`           | entity  | —                                                                 | Capteur d'exportation réseau quotidienne cumulative optionnel                                                                                                                    |
| `show_daily_grid`                    | boolean | `false`                                                           | Affiche les totaux d'importation/exportation quotidiens au-dessus de la valeur réseau en direct                                                                                  |
| `show_grid_flow_label`               | boolean | `true`                                                            | Préfixe "Importation/Exportation" avant la valeur réseau                                                                                                                         |
| `sensor_heat_pump_consumption`       | entity  | —                                                                 | Capteur de pompe à chaleur ; déverrouille le flux orange et échange l'arrière-plan                                                                                               |
| `sensor_hot_water_consumption`       | entity  | —                                                                 | Capteur de charge de chauffage d'eau chaude (pilote l'étiquette eau chaude)                                                                                                      |
| `sensor_pool_consumption`            | entity  | —                                                                 | Capteur de consommation de piscine optionnel ; active la branche/étiquette piscine lorsque présent                                                                               |
| `sensor_washing_machine_consumption` | entity  | —                                                                 | Capteur de consommation de lave-linge optionnel qui pilote l'étiquette lave-linge                                                                                                |
| `sensor_dishwasher_consumption`      | entity  | —                                                                 | Capteur de consommation de lave-vaisselle optionnel                                                                                                                              |
| `sensor_dryer_consumption`           | entity  | —                                                                 | Capteur de consommation de sèche-linge optionnel                                                                                                                                 |
| `sensor_refrigerator_consumption`    | entity  | —                                                                 | Capteur de consommation de réfrigérateur optionnel                                                                                                                               |
| `sensor_freezer_consumption`         | entity  | —                                                                 | Capteur de consommation de congélateur optionnel                                                                                                                                 |
| `sensor_windmill_total`              | entity  | —                                                                 | Capteur de génération totale d'éolienne optionnel                                                                                                                                |
| `sensor_windmill_daily`              | entity  | —                                                                 | Capteur de génération quotidienne d'éolienne optionnel                                                                                                                           |
| `sensor_car_power`                   | entity  | —                                                                 | Capteur de puissance de charge Voiture 1 optionnel                                                                                                                               |
| `sensor_car_soc`                     | entity  | —                                                                 | Capteur SOC Voiture 1 optionnel                                                                                                                                                  |
| `sensor_car2_power`                  | entity  | —                                                                 | Capteur de puissance de charge Voiture 2 optionnel                                                                                                                               |
| `sensor_car2_soc`                    | entity  | —                                                                 | Capteur SOC Voiture 2 optionnel                                                                                                                                                  |
| `show_car_soc`                       | boolean | `false`                                                           | Bascule le panneau Voiture 1 (puissance + SOC)                                                                                                                                   |
| `show_car2`                          | boolean | `false`                                                           | Bascule le panneau Voiture 2 lorsque les capteurs existent                                                                                                                       |
| `grid_activity_threshold`            | number  | `100`                                                             | Puissance réseau absolue minimale (W) avant que les flux ne s'animent                                                                                                            |
| `invert_grid`                        | boolean | `false`                                                           | Inverser la polarité réseau si import/export sont inversés                                                                                                                       |
| `invert_battery`                     | boolean | `false`                                                           | Inverser la polarité de la batterie et échanger les teintes charge/décharge                                                                                                      |

> **Exigence de capteur de batterie :** Pour chaque batterie (`bat1`..`bat4`) fournir soit le `sensor_batX_power` combiné **ou** à la fois `sensor_batX_charge_power` et `sensor_batX_discharge_power`. Les lectures peuvent être en W ou kW ; la carte gère automatiquement les conversions.

---

## Nederlands

### Overzicht

Advanced Energy Card is een aangepaste Lovelace-kaart voor Home Assistant die geanimeerde energiestromen weergeeft, PV-strings en batterijen aggregeert, en optionele laadmetingen voor elektrische voertuigen presenteert in een filmische lay-out. Advanced Energy Card is het hart van Lumina Energy Card en is wat versie 2.0 van Lumina had moeten zijn.

### Belangrijkste Kenmerken

* Nieuw futuristisch huis met een volledig opnieuw ontworpen grafisch systeem, wat meer functionaliteit mogelijk maakt
* Nieuwe begeleide initiële configuratie
* Tot zes PV-sensoren met twee arrays ondersteund per string of getotaliseerde ingangen
* Tot vier batterijsystemen met SOC-, vermogen- en batterijniveauweergave voor vier batterijen (2 per omvormer bij gebruik van 2 omvormers)
* Aanvullende batterij-informatie weergegeven in de batterij-popup
* Dynamische weergave van windmolenvermogen en tot twee elektrische voertuigen met laadstatus en stroomverbruik of -teruglevering
* Geanimeerde net-, belasting-, PV-, batterij- en EV-stromen met dynamische kleur op basis van drempelwaarden en selecteerbare animatiestijlen
* Configureerbare netanimatiedrempel (standaard 100 W) om laagniveau import-/exportschommelingen te onderdrukken
* Aanpasbare animatiesnelheidsvermenigvuldiger (-3× tot 3×, standaard 1×, pauze/achteruit ondersteund) en zichtbaarheidsdrempels per stroom
* Dagelijkse energieproductiebadge
* Dagelijkse import- en exporttotalen
* Zwembadstroomverbruik nu weergegeven op de hoofdgrafiek en kan worden verborgen indien niet in gebruik
* Warmtepomp/AC-vermogen en warmwatersysteemverbruik nu weergegeven
* Wasmachine, droger, koelkast, vaatwasser nu opgenomen in popup
* Overschrijvingen voor waarschuwing/kritieke kleur van belasting en een configureerbare lage SOC-drempel voor de batterijvloeistofvulling
* Lettertypeselectie, lettergrootte en tekstkleur beschikbaar voor alle weergegeven entiteiten
* Update-intervalschuif (0-60 s, standaard 5 s) met optionele realtime vernieuwing wanneer ingesteld op 0
* Popup-informatiedisplays voor Huis, Zonne-energie, Batterij, Net en Omvormer
* Elk heeft zes slots voor entiteiten met naamsoverschrijvingen en letterkleuroverschrijvingen
* Popup-items kunnen worden aangeklikt om de HA-entiteit te tonen
* Veel nieuwe functies in aantocht, met ondersteuning voor meer items

### Installatie

#### HACS

1. Open HACS in Home Assistant en kies **Frontend**
2. Gebruik het driepuntenmenu → **Aangepaste repositories**
3. Voer `https://github.com/ratava/advanced-energy-card` in, selecteer **Dashboard** en klik op **Toevoegen**
4. Zoek **Advanced Energy Card** onder Frontend en klik op **Installeren**
5. Herstart Home Assistant indien gevraagd

#### Handmatige Installatie

1. Download alle bestanden van `dist/` van de [nieuwste release](https://github.com/ratava/advanced-energy-card/releases)
2. Kopieer de bestanden naar `/config/www/community/advanced-energy-card/`
3. Voeg de Lovelace-resource toe:

```yaml
lovelace:
  resources:
    - url: /local/community/advanced-energy-card/advanced-energy-card.js
      type: module
```

1. Herstart Home Assistant om de resource te laden

### Initiële Configuratie

1. Bewerk uw dashboard en klik op **Kaart toevoegen**
2. Zoek naar **Advanced Energy Card**
3. Volg de vragen in het menu Initiële Configuratie. Het zal de meeste configuraties van de basissensoren dekken
4. Veel andere opties zijn toegevoegd, inclusief een volledig geherstructureerd menu

### Optietabel

| Optie                                | Type    | Standaard                                                         | Opmerkingen                                                                                                                                                                  |
| ------------------------------------ | ------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `card_title`                         | string  | —                                                                 | Optionele koptekst; leeg houdt de titel verborgen                                                                                                                            |
| `title_render_mode`                  | string  | `html`                                                            | Hoe de titel wordt weergegeven: `html` (aanbevolen) of `svg` (verouderd)                                                                                                     |
| `title_text_color`                   | string  | —                                                                 | Optionele overschrijving voor titeltekstkleur (hex)                                                                                                                          |
| `title_bg_color`                     | string  | —                                                                 | Optionele overschrijving voor de titelachtergrondrechthoek (hex)                                                                                                             |
| `font_family`                        | string  | `B612`                                                            | Lettertypefamilie voor de kaarttekst (CSS font-family)                                                                                                                       |
| `odometer_font_family`               | string  | —                                                                 | Optioneel alternatief lettertype gebruikt door kilometerteller-stijl geanimeerde nummers; valt terug op `font_family` wanneer niet ingesteld                                 |
| `background_day`                     | string  | `/local/community/advanced-energy-card/advanced-modern-day.svg`   | Dagachtergrond (gebruikt wanneer `day_night_mode` `day` is of in `auto` overdag)                                                                                             |
| `background_night`                   | string  | `/local/community/advanced-energy-card/advanced-modern-night.svg` | Nachtachtergrond (gebruikt wanneer `day_night_mode` `night` is of in `auto` 's nachts)                                                                                       |
| `language`                           | string  | `en`                                                              | Ondersteunde editortalen: `en`, `it`, `de`, `fr`, `nl`, `es`                                                                                                                 |
| `display_unit`                       | string  | `kW`                                                              | Waarden weergeven in `W` of `kW`                                                                                                                                             |
| `update_interval`                    | number  | `5`                                                               | Vernieuwingsfrequentie (0-60 s, stap 5; 0 schakelt beperking uit)                                                                                                            |
| `animation_speed_factor`             | number  | `1`                                                               | Stroomanimatie-vermenigvuldiger (-3-3, 0 pauzeert, negatieve getallen keren om)                                                                                              |
| `animation_style`                    | string  | `dashes`                                                          | Daganimatiestijl. Stroommotief (`dashes`, `dashes_glow`, `fluid_flow`, `dots`, `arrows`)                                                                                     |
| `night_animation_style`              | string  | `dashes`                                                          | Nachtanimatiestijl (dezelfde opties als `animation_style`). Wanneer leeg/niet ingesteld, valt terug op `animation_style`                                                     |
| `dashes_glow_intensity`              | number  | `1`                                                               | Gloed-intensiteit voor `dashes_glow` stijl (0-3)                                                                                                                             |
| `flow_stroke_width`                  | number  | `2`                                                               | Lijndikte (px) voor `dashes`/`dashes_glow`/`dots`/`arrows`                                                                                                                   |
| `fluid_flow_stroke_width`            | number  | `3`                                                               | Lijndikte (px) voor `fluid_flow`                                                                                                                                             |
| `fluid_flow_outer_glow`              | boolean | `false`                                                           | Voegt een buitenste gloedeffect toe voor `fluid_flow`                                                                                                                        |
| `day_night_mode`                     | string  | `day`                                                             | Selecteert Dag/Nacht: `day`, `night` of `auto` (auto volgt `sun.sun`)                                                                                                        |
| `night_mode`                         | boolean | `false`                                                           | Legacy booleaanse nachtmodus (verouderd). Geef de voorkeur aan `day_night_mode`                                                                                              |
| `sensor_pv_total`                    | string  | —                                                                 | Optionele geaggregeerde PV-productiesensor. Geef deze sensor **of** minstens één PV-string op                                                                                |
| `sensor_pv1` .. `sensor_pv6`         | entity  | —                                                                 | PV-stringsensoren voor Array 1. Wanneer geen totaal wordt gegeven, is minimaal één string vereist en alle geconfigureerde strings worden opgeteld om PV TOTAAL te produceren |
| `sensor_daily`                       | entity  | —                                                                 | Dagelijkse productiesensor (vereist)                                                                                                                                         |
| `sensor_bat1_soc`                    | entity  | —                                                                 | Batterij SOC-sensor (alleen vereist wanneer een batterij wordt weergegeven)                                                                                                  |
| `sensor_bat1_power`                  | entity  | —                                                                 | Gecombineerde nettovermogensensor voor Batterij 1. Geef deze of beide gesplitste sensoren hieronder op                                                                       |
| `sensor_bat1_charge_power`           | entity  | —                                                                 | Batterij 1 oplaadsensor (positieve waarden, W of kW). Gebruik met `sensor_bat1_discharge_power` wanneer geen gecombineerde sensor bestaat                                    |
| `sensor_bat1_discharge_power`        | entity  | —                                                                 | Batterij 1 ontlaadsensor (positieve waarden)                                                                                                                                 |
| `sensor_home_load`                   | entity  | —                                                                 | Huisbelasting-/verbruikssensor (vereist)                                                                                                                                     |
| `sensor_grid_power`                  | entity  | —                                                                 | Netto netsensor (vereist tenzij import/export-paar wordt geleverd)                                                                                                           |
| `sensor_grid_import`                 | entity  | —                                                                 | Optionele alleen-importsensor (positieve waarden)                                                                                                                            |
| `sensor_grid_export`                 | entity  | —                                                                 | Optionele alleen-exportsensor (positieve waarden)                                                                                                                            |
| `sensor_grid_import_daily`           | entity  | —                                                                 | Optionele cumulatieve dagelijkse netimportsensor                                                                                                                             |
| `sensor_grid_export_daily`           | entity  | —                                                                 | Optionele cumulatieve dagelijkse netexportsensor                                                                                                                             |
| `show_daily_grid`                    | boolean | `false`                                                           | Toont de dagelijkse import-/exporttotalen boven de live netwaarde                                                                                                            |
| `show_grid_flow_label`               | boolean | `true`                                                            | Voegt "Importeren/Exporteren" toe voor de netwaarde                                                                                                                          |
| `sensor_heat_pump_consumption`       | entity  | —                                                                 | Warmtepompsensor; ontgrendelt de oranje stroom en wisselt de achtergrond                                                                                                     |
| `sensor_hot_water_consumption`       | entity  | —                                                                 | Warmwaterverwarmingsbelastingsensor (stuurt het warmwaterlabel aan)                                                                                                          |
| `sensor_pool_consumption`            | entity  | —                                                                 | Optionele zwembadverbruikssensor; activeert de zwembadtak/label wanneer aanwezig                                                                                             |
| `sensor_washing_machine_consumption` | entity  | —                                                                 | Optionele wasmachineverbruikssensor die het wasmachinetabel aanstuurt                                                                                                        |
| `sensor_dishwasher_consumption`      | entity  | —                                                                 | Optionele vaatwasserverbruikssensor                                                                                                                                          |
| `sensor_dryer_consumption`           | entity  | —                                                                 | Optionele drogerverbruikssensor                                                                                                                                              |
| `sensor_refrigerator_consumption`    | entity  | —                                                                 | Optionele koelkastverbruikssensor                                                                                                                                            |
| `sensor_freezer_consumption`         | entity  | —                                                                 | Optionele vriezerverbruikssensor                                                                                                                                             |
| `sensor_windmill_total`              | entity  | —                                                                 | Optionele windmolen totale opwekkingssensor                                                                                                                                  |
| `sensor_windmill_daily`              | entity  | —                                                                 | Optionele dagelijkse windmolenopwekkingssensor                                                                                                                               |
| `sensor_car_power`                   | entity  | —                                                                 | Optionele Auto 1 laadvermogensensor                                                                                                                                          |
| `sensor_car_soc`                     | entity  | —                                                                 | Optionele Auto 1 SOC-sensor                                                                                                                                                  |
| `sensor_car2_power`                  | entity  | —                                                                 | Optionele Auto 2 laadvermogensensor                                                                                                                                          |
| `sensor_car2_soc`                    | entity  | —                                                                 | Optionele Auto 2 SOC-sensor                                                                                                                                                  |
| `show_car_soc`                       | boolean | `false`                                                           | Schakelt het Auto 1-paneel in (vermogen + SOC)                                                                                                                               |
| `show_car2`                          | boolean | `false`                                                           | Schakelt het Auto 2-paneel in wanneer sensoren bestaan                                                                                                                       |
| `grid_activity_threshold`            | number  | `100`                                                             | Minimaal absoluut netvermogen (W) voordat stromen animeren                                                                                                                   |
| `invert_grid`                        | boolean | `false`                                                           | Keer netpolariteit om als import/export zijn omgedraaid                                                                                                                      |
| `invert_battery`                     | boolean | `false`                                                           | Keer batterijpolariteit om en wissel laad-/ontlaadtinten                                                                                                                     |

> **Batterijsensorvereiste:** Voor elke batterij (`bat1`..`bat4`) geef de gecombineerde `sensor_batX_power` **of** beide `sensor_batX_charge_power` en `sensor_batX_discharge_power` op. Metingen kunnen in W of kW zijn; de kaart verwerkt automatisch conversies.

---

## Español

### Descripción General

Advanced Energy Card es una tarjeta Lovelace personalizada para Home Assistant que muestra flujos de energía animados, agrega strings fotovoltaicos y baterías, y presenta métricas opcionales de carga de vehículos eléctricos en un diseño cinematográfico. Advanced Energy Card es el corazón de Lumina Energy Card y es lo que debería haber sido la versión 2.0 de Lumina.

### Características Principales

* Nueva casa futurista con un sistema gráfico completamente rediseñado, que permite más funcionalidad
* Nueva configuración inicial guiada
* Hasta seis sensores fotovoltaicos con dos arrays soportados por string o entradas totalizadas
* Hasta cuatro sistemas de batería con visualización de SOC, potencia y nivel de batería para cuatro baterías (2 por inversor si se usan 2 inversores)
* Información adicional de la batería mostrada en la ventana emergente de la batería
* Visualización dinámica de la potencia del molino de viento y hasta dos vehículos eléctricos con estado de carga y consumo o devolución de energía
* Flujos animados de red, carga, fotovoltaica, batería y VE con color dinámico basado en umbrales y estilos de animación seleccionables
* Umbral de animación de red configurable (predeterminado 100 W) para suprimir fluctuaciones de importación/exportación de bajo nivel
* Multiplicador de velocidad de animación ajustable (-3× a 3×, predeterminado 1×, pausa/inversión soportada) y umbrales de visibilidad por flujo
* Distintivo de producción de energía diaria
* Totales de importación y exportación diarios
* Consumo de energía de la piscina ahora mostrado en el gráfico principal y puede ocultarse si no está en uso
* Consumo de bomba de calor/AC y sistema de agua caliente ahora mostrados
* Lavadora, secadora, refrigerador, lavavajillas ahora incluidos en la ventana emergente
* Anulaciones de color de advertencia/crítico de carga y umbral de SOC bajo configurable para el llenado líquido de la batería
* Selección de fuente, tamaño de fuente y color de texto disponibles para todas las entidades mostradas
* Control deslizante de intervalo de actualización (0-60 s, predeterminado 5 s) con actualización en tiempo real opcional cuando se establece en 0
* Pantallas de información emergente para Casa, Solar, Batería, Red e Inversor
* Cada uno tiene seis ranuras para entidades con anulaciones de nombres y anulaciones de colores de fuente
* Las entradas emergentes se pueden hacer clic para mostrar la entidad HA
* Muchas nuevas características próximamente, con soporte para más elementos

### Instalación

#### HACS

1. Abra HACS en Home Assistant y elija **Frontend**
2. Use el menú de tres puntos → **Repositorios personalizados**
3. Ingrese `https://github.com/ratava/advanced-energy-card`, seleccione **Dashboard** y haga clic en **Agregar**
4. Localice **Advanced Energy Card** en Frontend y haga clic en **Instalar**
5. Reinicie Home Assistant si se solicita

#### Instalación Manual

1. Descargue todos los archivos de `dist/` desde la [última versión](https://github.com/ratava/advanced-energy-card/releases)
2. Copie los archivos a `/config/www/community/advanced-energy-card/`
3. Agregue el recurso Lovelace:

```yaml
lovelace:
  resources:
    - url: /local/community/advanced-energy-card/advanced-energy-card.js
      type: module
```

1. Reinicie Home Assistant para cargar el recurso

### Configuración Inicial

1. Edite su panel de control y haga clic en **Agregar tarjeta**
2. Busque **Advanced Energy Card**
3. Siga las preguntas en el menú de Configuración Inicial. Cubrirá la mayoría de las configuraciones de los sensores base
4. Se han agregado muchas otras opciones, incluyendo un menú completamente reestructurado

### Tabla de Opciones

| Opción                               | Tipo    | Predeterminado                                                    | Notas                                                                                                                                                                            |
| ------------------------------------ | ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `card_title`                         | string  | —                                                                 | Texto de encabezado opcional; en blanco mantiene el título oculto                                                                                                                |
| `title_render_mode`                  | string  | `html`                                                            | Cómo se renderiza el título: `html` (recomendado) o `svg` (heredado)                                                                                                             |
| `title_text_color`                   | string  | —                                                                 | Anulación opcional para el color del texto del título (hex)                                                                                                                      |
| `title_bg_color`                     | string  | —                                                                 | Anulación opcional para el rectángulo de fondo del título (hex)                                                                                                                  |
| `font_family`                        | string  | `B612`                                                            | Familia de fuentes para el texto de la tarjeta (CSS font-family)                                                                                                                 |
| `odometer_font_family`               | string  | —                                                                 | Fuente alternativa opcional utilizada por números animados estilo odómetro; vuelve a `font_family` cuando no está configurado                                                    |
| `background_day`                     | string  | `/local/community/advanced-energy-card/advanced-modern-day.svg`   | Fondo de día (usado cuando `day_night_mode` es `day` o en `auto` durante el día)                                                                                                 |
| `background_night`                   | string  | `/local/community/advanced-energy-card/advanced-modern-night.svg` | Fondo de noche (usado cuando `day_night_mode` es `night` o en `auto` durante la noche)                                                                                           |
| `language`                           | string  | `en`                                                              | Idiomas del editor compatibles: `en`, `it`, `de`, `fr`, `nl`, `es`                                                                                                               |
| `display_unit`                       | string  | `kW`                                                              | Mostrar valores en `W` o `kW`                                                                                                                                                    |
| `update_interval`                    | number  | `5`                                                               | Cadencia de actualización (0-60 s, paso 5; 0 desactiva la limitación)                                                                                                            |
| `animation_speed_factor`             | number  | `1`                                                               | Multiplicador de animación de flujo (-3-3, 0 pausa, negativos invierten)                                                                                                         |
| `animation_style`                    | string  | `dashes`                                                          | Estilo de animación diurna. Motivo de flujo (`dashes`, `dashes_glow`, `fluid_flow`, `dots`, `arrows`)                                                                            |
| `night_animation_style`              | string  | `dashes`                                                          | Estilo de animación nocturna (mismas opciones que `animation_style`). Cuando está vacío/no configurado, vuelve a `animation_style`                                               |
| `dashes_glow_intensity`              | number  | `1`                                                               | Intensidad de brillo para el estilo `dashes_glow` (0-3)                                                                                                                          |
| `flow_stroke_width`                  | number  | `2`                                                               | Ancho de trazo (px) para `dashes`/`dashes_glow`/`dots`/`arrows`                                                                                                                  |
| `fluid_flow_stroke_width`            | number  | `3`                                                               | Ancho de trazo (px) para `fluid_flow`                                                                                                                                            |
| `fluid_flow_outer_glow`              | boolean | `false`                                                           | Agrega un efecto de brillo exterior para `fluid_flow`                                                                                                                            |
| `day_night_mode`                     | string  | `day`                                                             | Selecciona Día/Noche: `day`, `night` o `auto` (auto sigue `sun.sun`)                                                                                                             |
| `night_mode`                         | boolean | `false`                                                           | Modo nocturno booleano heredado (obsoleto). Prefiera `day_night_mode`                                                                                                            |
| `sensor_pv_total`                    | entity  | —                                                                 | Sensor de producción fotovoltaica agregado opcional. Proporcione este sensor **o** al menos un string fotovoltaico                                                               |
| `sensor_pv1` .. `sensor_pv6`         | entity  | —                                                                 | Sensores de string fotovoltaico para Array 1. Cuando no se proporciona un total, se requiere al menos un string y todos los strings configurados se suman para producir PV TOTAL |
| `sensor_daily`                       | entity  | —                                                                 | Sensor de producción diaria (requerido)                                                                                                                                          |
| `sensor_bat1_soc`                    | entity  | —                                                                 | Sensor SOC de batería (requerido solo cuando se muestra una batería)                                                                                                             |
| `sensor_bat1_power`                  | entity  | —                                                                 | Sensor de potencia neta combinada para Batería 1. Proporcione este o ambos sensores divididos a continuación                                                                     |
| `sensor_bat1_charge_power`           | entity  | —                                                                 | Sensor de carga Batería 1 (valores positivos, W o kW). Usar con `sensor_bat1_discharge_power` cuando no existe un sensor combinado                                               |
| `sensor_bat1_discharge_power`        | entity  | —                                                                 | Sensor de descarga Batería 1 (valores positivos)                                                                                                                                 |
| `sensor_home_load`                   | entity  | —                                                                 | Sensor de carga/consumo doméstico (requerido)                                                                                                                                    |
| `sensor_grid_power`                  | entity  | —                                                                 | Sensor de red neta (requerido a menos que se proporcione el par de importación/exportación)                                                                                      |
| `sensor_grid_import`                 | entity  | —                                                                 | Sensor de solo importación opcional (valores positivos)                                                                                                                          |
| `sensor_grid_export`                 | entity  | —                                                                 | Sensor de solo exportación opcional (valores positivos)                                                                                                                          |
| `sensor_grid_import_daily`           | entity  | —                                                                 | Sensor de importación de red diaria acumulativa opcional                                                                                                                         |
| `sensor_grid_export_daily`           | entity  | —                                                                 | Sensor de exportación de red diaria acumulativa opcional                                                                                                                         |
| `show_daily_grid`                    | boolean | `false`                                                           | Muestra los totales de importación/exportación diarios sobre el valor de red en vivo                                                                                             |
| `show_grid_flow_label`               | boolean | `true`                                                            | Antepone "Importando/Exportando" antes del valor de red                                                                                                                          |
| `sensor_heat_pump_consumption`       | entity  | —                                                                 | Sensor de bomba de calor; desbloquea el flujo naranja e intercambia el fondo                                                                                                     |
| `sensor_hot_water_consumption`       | entity  | —                                                                 | Sensor de carga de calentamiento de agua caliente (controla la etiqueta de agua caliente)                                                                                        |
| `sensor_pool_consumption`            | entity  | —                                                                 | Sensor de consumo de piscina opcional; habilita la rama/etiqueta de piscina cuando está presente                                                                                 |
| `sensor_washing_machine_consumption` | entity  | —                                                                 | Sensor de consumo de lavadora opcional que controla la etiqueta de lavadora                                                                                                      |
| `sensor_dishwasher_consumption`      | entity  | —                                                                 | Sensor de consumo de lavavajillas opcional                                                                                                                                       |
| `sensor_dryer_consumption`           | entity  | —                                                                 | Sensor de consumo de secadora opcional                                                                                                                                           |
| `sensor_refrigerator_consumption`    | entity  | —                                                                 | Sensor de consumo de refrigerador opcional                                                                                                                                       |
| `sensor_freezer_consumption`         | entity  | —                                                                 | Sensor de consumo de congelador opcional                                                                                                                                         |
| `sensor_windmill_total`              | entity  | —                                                                 | Sensor de generación total de molino de viento opcional                                                                                                                          |
| `sensor_windmill_daily`              | entity  | —                                                                 | Sensor de generación diaria de molino de viento opcional                                                                                                                         |
| `sensor_car_power`                   | entity  | —                                                                 | Sensor de potencia de carga Coche 1 opcional                                                                                                                                     |
| `sensor_car_soc`                     | entity  | —                                                                 | Sensor SOC Coche 1 opcional                                                                                                                                                      |
| `sensor_car2_power`                  | entity  | —                                                                 | Sensor de potencia de carga Coche 2 opcional                                                                                                                                     |
| `sensor_car2_soc`                    | entity  | —                                                                 | Sensor SOC Coche 2 opcional                                                                                                                                                      |
| `show_car_soc`                       | boolean | `false`                                                           | Activa el panel Coche 1 (potencia + SOC)                                                                                                                                         |
| `show_car2`                          | boolean | `false`                                                           | Activa el panel Coche 2 cuando existen sensores                                                                                                                                  |
| `grid_activity_threshold`            | number  | `100`                                                             | Potencia de red absoluta mínima (W) antes de que los flujos se animen                                                                                                            |
| `invert_grid`                        | boolean | `false`                                                           | Invertir polaridad de red si importación/exportación están invertidas                                                                                                            |
| `invert_battery`                     | boolean | `false`                                                           | Invertir polaridad de batería e intercambiar tonos de carga/descarga                                                                                                             |

> **Requisito de sensor de batería:** Para cada batería (`bat1`..`bat4`) proporcione el `sensor_batX_power` combinado **o** ambos `sensor_batX_charge_power` y `sensor_batX_discharge_power`. Las lecturas pueden estar en W o kW; la tarjeta maneja las conversiones automáticamente.
