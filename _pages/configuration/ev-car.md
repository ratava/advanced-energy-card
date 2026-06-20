---
title: "EV / Car"
permalink: /configuration/ev-car/
---

Configure up to 2 electric vehicles. Core sensors and labels are available in both profiles. The Tech and Overview profiles each have their own colour and styling options.

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

Set a display name for each EV. In the Overview profile, setting `car1_label` or `car2_label` activates the name plate for that vehicle.

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `car1_label` | text | Display name for Car 1. | Both |
| `car2_label` | text | Display name for Car 2. | Both |

---

## Overview Profile

### Flow Colors

The Overview profile uses separate colours for charging and discharging flow states rather than a single fixed flow color.

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `car_charging_color` | color | `#00FF00` | Flow animation color when the EV is charging. | Overview |
| `car_discharging_color` | color | `#FF4444` | Flow animation color when the EV is discharging. | Overview |

### Name Plate

When `car1_label` or `car2_label` is set, a name plate appears on the card for that vehicle. The following keys control its appearance — they apply to both vehicles.

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `car_name_plate_color` | color | `#FFFFFF` | Name plate background color. | Overview |
| `car_name_plate_border_color` | color | `#FFFFFF` | Name plate border color. | Overview |
| `car_name_plate_border_width` | number | `1` | Name plate border width in px. | Overview |
| `car_name_font_color` | color | `#000000` | Text color of the name on the plate. | Overview |
| `car_name_font_size` | number | `18` | Font size (px) of the name on the plate. | Overview |

### Name & Value Colors

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `car1_name_color` | color | `#000000` | Color for the Car 1 name label. | Overview |
| `car2_name_color` | color | `#000000` | Color for the Car 2 name label. | Overview |

### Font Sizes

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `car_power_font_size` | number | `28` | Font size (px) for Car 1 power value. | Overview |
| `car2_power_font_size` | number | `10` | Font size (px) for Car 2 power value. | Overview |
| `car_soc_font_size` | number | `28` | Font size (px) for Car 1 SOC percentage. | Overview |
| `car2_soc_font_size` | number | `28` | Font size (px) for Car 2 SOC percentage. | Overview |

---

## Tech Profile

### Headlight Animation

When `sensor_car_power` is active the Tech layout can flash the car headlights as a visual charging indicator.

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `car_headlight_flash` | boolean | `true` | Flash Car 1 headlights when charging is detected. | Tech |
| `car1_glow_brightness` | number (0–100) | `50` | Brightness of the Car 1 headlight glow when not charging. | Tech |
| `car2_glow_brightness` | number (0–100) | `50` | Brightness of the Car 2 headlight glow when not charging. | Tech |

### Flow & Value Colors

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `car_flow_color` | color | `#00FFFF` | Color for the EV charging flow animation line. | Tech |
| `car1_color` | color | `#00FFFF` | Color for the Car 1 power value text. | Tech |
| `car2_color` | color | `#00FFFF` | Color for the Car 2 power value text. | Tech |
| `car_pct_color` | color | `#00FFFF` | Color for the Car 1 SOC percentage text. | Tech |
| `car2_pct_color` | color | `#00FFFF` | Color for the Car 2 SOC percentage text. | Tech |
| `car1_name_color` | color | `#00FFFF` | Color for the Car 1 name label. | Tech |
| `car2_name_color` | color | `#00FFFF` | Color for the Car 2 name label. | Tech |

### Font Sizes

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `car_power_font_size` | number | `10` | Font size (px) for Car 1 power value. | Tech |
| `car2_power_font_size` | number | `10` | Font size (px) for Car 2 power value. | Tech |
| `car_name_font_size` | number | `10` | Font size (px) for Car 1 name label. | Tech |
| `car2_name_font_size` | number | `10` | Font size (px) for Car 2 name label. | Tech |
| `car_soc_font_size` | number | `10` | Font size (px) for Car 1 SOC percentage. | Tech |
| `car2_soc_font_size` | number | `10` | Font size (px) for Car 2 SOC percentage. | Tech |
