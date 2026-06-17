---
title: "Battery Configuration"
permalink: /configuration/battery/
---

The card supports up to 4 independent battery packs. Core sensors and state colors are available in both profiles. The Tech profile adds fill animation, per-battery temperature display, font size overrides, and inverter-level battery timing fields.

> **Note:** "Battery" here means a battery pack or energy storage system — not an individual cell or module.

## How Profiles Handle Multiple Batteries

The two profiles treat multiple batteries very differently:

**Tech profile** — each battery is displayed individually. Battery 1 through 4 each have their own SOC readout, power value, fill animation, and state label rendered in the SVG at separate positions.

**Overview profile** — all configured batteries are **combined into a single value** for display. The card sums the power readings from batteries 1–4 to produce one combined power figure, and averages (or combines) the SOC values into one overall SOC shown on the card. You still configure each battery's sensors individually (so the card knows what to read), but the SVG only shows one battery element representing the whole bank.

## Battery Sensors

Replace `N` with the battery number (1–4).

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `sensor_bat{N}_soc` | entity | State of Charge (%). In Overview, SOC is combined across all batteries for the card display. | Both |
| `sensor_bat{N}_power` | entity | Combined charge/discharge power (W or kW). Provide this **or** separate charge/discharge sensors to activate the battery. In Overview, power is combined across all batteries. | Both |
| `sensor_bat{N}_charge_power` | entity | Charge-only power sensor — alternative to the combined power sensor. | Both |
| `sensor_bat{N}_discharge_power` | entity | Discharge-only power sensor — alternative to the combined power sensor. | Both |
| `sensor_bat{N}_capacity_sensor` | entity | Battery usable capacity (Wh or kWh). Used with the reserve percentage to calculate effective capacity and time-until estimates. | Both |
| `sensor_bat{N}_time_until` | entity | Optional HA entity providing time-until-full/flat as text. When set, overrides the calculated value. | Both |
| `sensor_battery{N}_temp` | entity | Battery temperature sensor. | Both |

## Capacity & Reserve

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `bat{N}_capacity_manual` | number | Manual battery usable capacity in the configured display unit (Wh or kWh). Ignored if a capacity sensor is provided. | Both |
| `bat{N}_reserve_percentage` | number (0–100%) | Reserve SOC — the battery will not discharge below this level. Reduces effective usable capacity shown. | Both |

The capacity sensor should report **usable** capacity. The card converts automatically using the entity's `unit_of_measurement` attribute.

## Battery State

Battery state (Charging, Discharging, Full, Reserve, Flat) is **automatically calculated** from SOC and power values — no separate state sensor is needed.

| State | Condition |
|---|---|
| **Full** | SOC ≥ 100% |
| **Flat** | SOC ≤ 0% |
| **Reserve** | SOC ≤ reserve percentage |
| **Charging** | Power > 0 |
| **Discharging** | Power < 0 |

## Power Direction

By default, **positive power = charging** and **negative power = discharging**. If your inverter reports the opposite polarity, use the invert flags.

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `invert_battery` | boolean | Invert polarity for all batteries simultaneously. | Both |

> For per-battery inversion, use `invert_bat1`, `invert_bat2`, etc. (YAML-only, not in the editor).

## Flow Colors & State Colors

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `battery_charge_color` | color | — | Color for the charging flow animation. In Overview: color for flow toward the Battery Card. | Both |
| `battery_discharge_color` | color | — | Color for the discharging flow animation. In Overview: color for flow from the Battery Card. | Both |
| `battery_state_fully_charged_color` | color | `#00ff00` | State label color when battery is Full. | Both |
| `battery_state_charging_color` | color | `#8000ff` | State label color when battery is Charging. | Both |
| `battery_state_discharging_color` | color | `#ff8000` | State label color when battery is Discharging. | Both |
| `battery_state_reserve_color` | color | `#FF3333` | State label color when battery is at Reserve. | Both |
| `battery_state_fully_discharged_color` | color | `#FF3333` | State label color when battery is Flat. | Both |

---

## Tech Profile — Battery Fill Animation

The Tech layout renders an animated liquid-fill inside the battery icon. The fill color shifts when the SOC crosses a configurable threshold.

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `battery_fill_high_color` | color | `#00ffff` | Fill color when SOC is above the low threshold. | Tech |
| `battery_fill_low_color` | color | `#ff0000` | Fill color when SOC is at or below the low threshold. | Tech |
| `battery_fill_low_threshold` | number (%) | 25 | SOC percentage at which the fill switches to the low color. | Tech |
| `battery_fill_opacity` | number (0–1) | 1 | Opacity of the battery fill layer. | Tech |

## Tech Profile — Text Colors & Font Sizes

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `battery_soc_color` | color | `#FFFFFF` | Color for the SOC percentage text. | Tech |
| `battery_soc_font_size` | text | — | Font size (px) for the SOC percentage text. | Tech |
| `battery_power_font_size` | text | — | Font size (px) for the power text. | Tech |
| `battery_state_font_size` | text | — | Font size (px) for the state label (Charging / Discharging / etc.). | Tech |
| `battery_time_until_color` | color | — | Color for the time-until-full/flat text. | Tech |
| `battery_time_until_font_size` | text | — | Font size (px) for the time-until text. | Tech |

## Tech Profile — Per-Battery Temperature Display

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `battery1_temp_color` | color | Color applied to Battery 1 temperature text. | Tech |
| `battery1_temp_font_size` | text | Font size (px) for Battery 1 temperature text. | Tech |

> Temperature color and font size for batteries 2–4 follow the same pattern but are currently not separately configurable in the editor — they share the Battery 1 settings.

## Tech Profile — Inverter Battery Timing Display

The Tech layout can show per-inverter battery datetime and time-until information alongside each inverter's battery section.

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `inv1_datetime_color` | color | Color for Inverter 1 battery datetime text. | Tech |
| `inv1_datetime_font_size` | text | Font size (px) for Inverter 1 battery datetime. | Tech |
| `inv1_timeuntil_color` | color | Color for Inverter 1 battery time-until text. | Tech |
| `inv1_timeuntil_font_size` | text | Font size (px) for Inverter 1 battery time-until. | Tech |
| `inv2_datetime_color` | color | Color for Inverter 2 battery datetime text. | Tech |
| `inv2_datetime_font_size` | text | Font size (px) for Inverter 2 battery datetime. | Tech |
| `inv2_timeuntil_color` | color | Color for Inverter 2 battery time-until text. | Tech |
| `inv2_timeuntil_font_size` | text | Font size (px) for Inverter 2 battery time-until. | Tech |

## Time Until Full / Empty

When battery capacity is configured (via sensor or manual entry), the card calculates estimated time until full (charging) or empty (discharging), accounting for the reserve percentage.

The calculated value is displayed unless `sensor_bat{N}_time_until` is set, in which case that entity's value is shown instead.

State colors are individually configurable above. See also [Display & Style](/configuration/display-style/) for global font settings.
