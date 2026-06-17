---
title: "House / Load"
permalink: /configuration/house-load/
---

Configure house consumption sensors, load flow styling, and individual appliance monitoring. The two primary home load sensors are available in both profiles. All appliance sub-circuits, flow colors, font sizes, and load thresholds are Tech-only.

## Home Load Sensors

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `sensor_home_load` | entity | **Required.** Total household consumption sensor. | Both |
| `sensor_home_load_secondary` | entity | House load sensor for Inverter 2. Required when using a second inverter (Array 2). | Both |

---

## Tech Profile — Appliance Sub-Circuits

Individual appliance sensors add their readings to the house load breakdown visible in the Tech layout. All are optional.

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `sensor_heat_pump_consumption` | entity | Heat pump / AC energy consumption sensor. | Tech |
| `sensor_hot_water_consumption` | entity | Water heating load sensor. | Tech |
| `sensor_pool_consumption` | entity | Pool pump / heater consumption sensor. | Tech |
| `sensor_washing_machine_consumption` | entity | Washing machine consumption sensor. | Tech |
| `sensor_dishwasher_consumption` | entity | Dishwasher consumption sensor. | Tech |
| `sensor_dryer_consumption` | entity | Dryer consumption sensor. | Tech |
| `sensor_refrigerator_consumption` | entity | Refrigerator consumption sensor. | Tech |
| `sensor_freezer_consumption` | entity | Freezer consumption sensor. | Tech |

### Appliance Labels

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `heat_pump_label` | text | (built-in translation) | Custom label shown next to the heat pump value. Leave blank to use the built-in translation. | Tech |

## Tech Profile — Appliance Colors

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `heat_pump_text_color` | color | `#FFA500` | Color for the heat pump power text. | Tech |
| `hot_water_text_color` | color | `#FFFFFF` | Color for the water heating power text. | Tech |
| `pool_flow_color` | color | `#0080ff` | Color for the pool flow animation. | Tech |
| `pool_text_color` | color | `#FFFFFF` | Color for the pool power text. | Tech |
| `washing_machine_text_color` | color | `#FFFFFF` | Color for the washing machine power text. | Tech |
| `dishwasher_text_color` | color | `#FFFFFF` | Color for the dishwasher power text. | Tech |
| `dryer_text_color` | color | `#FFFFFF` | Color for the dryer power text. | Tech |
| `refrigerator_text_color` | color | `#FFFFFF` | Color for the refrigerator power text. | Tech |
| `freezer_text_color` | color | `#FFFFFF` | Color for the freezer power text. | Tech |

## Tech Profile — Appliance Font Sizes

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `heat_pump_font_size` | text | Font size (px) for heat pump power text. | Tech |
| `hot_water_font_size` | text | Font size (px) for water heating power text. | Tech |
| `pool_font_size` | text | Font size (px) for pool power text. | Tech |
| `washing_machine_font_size` | text | Font size (px) for washing machine power text. | Tech |
| `dishwasher_font_size` | text | Font size (px) for dishwasher power text. | Tech |
| `dryer_font_size` | text | Font size (px) for dryer power text. | Tech |
| `refrigerator_font_size` | text | Font size (px) for refrigerator power text. | Tech |
| `freezer_font_size` | text | Font size (px) for freezer power text. | Tech |

## Tech Profile — Load Flow & Total Colors

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `load_flow_color` | color | — | Color for the house load flow animation line. | Tech |
| `load_text_color` | color | `#FFFFFF` | Color for the house load text (when thresholds are inactive). | Tech |
| `house_total_color` | color | `#00FFFF` | Color for the House Total (`HOUSE TOT`) text/flow. | Tech |
| `load_font_size` | text | — | Font size (px) for the house load value. Also used as the default for INV 1 and INV 2 power lines. | Tech |

## Tech Profile — Load Thresholds

Color thresholds change the load text color when household consumption reaches a configured level. Uses the `display_unit` for comparison.

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `load_threshold_warning` | number | Load text turns `load_warning_color` when magnitude ≥ this value. | Tech |
| `load_warning_color` | color | Color applied at the load warning threshold. | Tech |
| `load_threshold_critical` | number | Load text turns `load_critical_color` when magnitude ≥ this value. | Tech |
| `load_critical_color` | color | Color applied at the load critical threshold. | Tech |
