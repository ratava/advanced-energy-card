---
title: "EV / Car"
permalink: /configuration/ev-car/
---

Configure up to 2 electric vehicles. Core sensors, labels, and name colors are available in both profiles. The Tech profile adds headlight animation, glow effects, SOC text color, body color, and individual font size overrides.

## Car 1 Sensors

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `sensor_car_power` | entity | Car 1 charge / discharge power sensor. | Both |
| `sensor_car_soc` | entity | Car 1 State of Charge (%). | Both |
| `sensor_car_range` | entity | Car 1 range sensor. | Both |
| `sensor_car_state` | entity | Car 1 charging state text sensor (e.g. "Charging", "Idle"). | Both |
| `sensor_car_hvac_status` | entity | Car 1 HVAC / climate status sensor. | Both |
| `sensor_car_outside_temp` | entity | Car 1 outside temperature sensor. | Both |
| `sensor_car_inside_temp` | entity | Car 1 inside / cabin temperature sensor. | Both |
| `sensor_car_ac_temp` | entity | Car 1 AC set-temperature sensor. | Both |
| `car1_climate_entity` | climate entity | Car 1 HVAC climate entity (climate domain only) for HVAC control. | Both |

## Car 2 Sensors

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `sensor_car2_power` | entity | Car 2 charge / discharge power sensor. | Both |
| `sensor_car2_soc` | entity | Car 2 State of Charge (%). | Both |
| `sensor_car2_range` | entity | Car 2 range sensor. | Both |
| `sensor_car2_state` | entity | Car 2 charging state text sensor. | Both |
| `sensor_car2_hvac_status` | entity | Car 2 HVAC / climate status sensor. | Both |
| `sensor_car2_outside_temp` | entity | Car 2 outside temperature sensor. | Both |
| `sensor_car2_inside_temp` | entity | Car 2 inside / cabin temperature sensor. | Both |
| `sensor_car2_ac_temp` | entity | Car 2 AC set-temperature sensor. | Both |
| `car2_climate_entity` | climate entity | Car 2 HVAC climate entity for HVAC control. | Both |

## Labels

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `car1_label` | text | Display name for Car 1 shown on the card. | Both |
| `car2_label` | text | Display name for Car 2 shown on the card. | Both |

## Flow & Name Colors

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `car_flow_color` | color | — | Color for the EV charging flow animation line. | Both |
| `car1_name_color` | color | `#FFFFFF` | Color for the Car 1 name label. | Both |
| `car2_name_color` | color | `#FFFFFF` | Color for the Car 2 name label. | Both |
| `car_name_font_size` | text | — | Font size (px) for the Car 1 name label. | Both |
| `car2_name_font_size` | text | — | Font size (px) for the Car 2 name label. | Both |

---

## Tech Profile — Headlight Animation

When `sensor_car_power` is active the Tech layout can flash the car's headlights as a visual charging indicator.

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `car_headlight_flash` | boolean | false | Flash Car 1 headlights when charging is detected. | Tech |
| `car1_glow_brightness` | number (0–100%) | 50 | Brightness of the Car 1 headlight glow when **not** charging. | Tech |
| `car2_glow_brightness` | number (0–100%) | 50 | Brightness of the Car 2 headlight glow when **not** charging. | Tech |

## Tech Profile — Colors

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `car_pct_color` | color | `#00FFFF` | Color for the Car 1 SOC percentage text. | Tech |
| `car2_pct_color` | color | `#00FFFF` | Color for the Car 2 SOC percentage text. | Tech |
| `car1_color` | color | `#FFFFFF` | Color applied to the Car 1 power value text. | Tech |
| `car2_color` | color | `#FFFFFF` | Color applied to the Car 2 power value text. | Tech |

## Tech Profile — Font Sizes

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `car_power_font_size` | text | Font size (px) for Car 1 power value text. | Tech |
| `car2_power_font_size` | text | Font size (px) for Car 2 power value text. | Tech |
| `car_soc_font_size` | text | Font size (px) for Car 1 SOC percentage text. | Tech |
| `car2_soc_font_size` | text | Font size (px) for Car 2 SOC percentage text. | Tech |
