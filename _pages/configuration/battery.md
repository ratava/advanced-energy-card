---
title: "Battery Configuration"
permalink: /configuration/battery/
---

The card supports up to 4 independent battery packs. Each battery is configured with its own set of sensors and display options.

> **Note:** In this context, "battery" refers to a battery pack or energy storage system — not an individual cell or module.

## Battery Sensors

Replace `N` with the battery number (1–4).

| Config key | Type | Description |
|---|---|---|
| `sensor_bat{N}_soc` | entity | State of charge (%) |
| `sensor_bat{N}_power` | entity | Combined charge/discharge power (W or kW) |
| `sensor_bat{N}_charge_power` | entity | Charge power only (W or kW) — alternative to combined power |
| `sensor_bat{N}_discharge_power` | entity | Discharge power only (W or kW) — alternative to combined power |
| `sensor_bat{N}_temp` | entity | Battery temperature |
| `sensor_bat{N}_time_until` | entity | Time until full/empty from inverter (overrides calculated value) |
| `sensor_bat{N}_capacity_sensor` | entity | Total battery capacity (kWh) — used for time-until calculation |

## Capacity & Reserve

| Config key | Type | Default | Description |
|---|---|---|---|
| `bat{N}_capacity_manual` | number | — | Manual battery capacity in kWh (if no capacity sensor) |
| `bat{N}_reserve_percentage` | number | — | Reserve SOC % — battery will not discharge below this level |

The capacity sensor should return the **total** battery capacity in kWh (e.g. `33.2`). The card automatically converts kWh to Wh using the entity's `unit_of_measurement` attribute.

## Battery State Display

The battery state (Charging, Discharging, Full, Reserve, Flat) is **automatically calculated** from the SOC and power values — no separate state sensor is needed.

| State | Condition |
|---|---|
| **Full** | SOC ≥ 100% |
| **Flat** | SOC ≤ 0% |
| **Reserve** | SOC ≤ reserve percentage |
| **Charging** | Power > 0 |
| **Discharging** | Power < 0 |

State colors are individually configurable — see [Display & Style](/configuration/display-style/).

## Time Until Full / Empty

When a battery capacity is configured (sensor or manual), the card calculates and displays the estimated time until the battery is full (when charging) or empty (when discharging), accounting for the reserve percentage.

The calculated value is shown unless `sensor_bat{N}_time_until` is configured, in which case that entity's value is displayed instead.

## Power Direction

By default, **positive power = charging** and **negative power = discharging**.

If your inverter reports the opposite convention, enable the invert flag:

```yaml
invert_bat1: true   # for battery 1
invert_bat2: true   # for battery 2
# or for all batteries:
invert_battery: true
```

## Display Options

| Config key | Type | Default | Description |
|---|---|---|---|
| `battery_soc_font_size` | number | 12 | SOC text font size |
| `battery_power_font_size` | number | 10 | Power text font size |
| `battery_state_font_size` | number | 8 | State label font size |
| `battery_time_until_font_size` | number | 8 | Time-until font size |
| `battery_soc_color` | color | `#FFFFFF` | SOC text color |
| `battery_charge_color` | color | `#8000ff` | Charging indicator color |
| `battery_discharge_color` | color | `#ff8000` | Discharging indicator color |
| `battery_state_charging_color` | color | `#8000ff` | "Charging" state label color |
| `battery_state_discharging_color` | color | `#ff8000` | "Discharging" state label color |
| `battery_state_fully_charged_color` | color | `#00ff00` | "Full" state label color |
| `battery_state_reserve_color` | color | `#FF3333` | "Reserve" state label color |
| `battery_state_fully_discharged_color` | color | `#FF3333` | "Flat" state label color |
