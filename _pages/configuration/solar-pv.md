---
title: "Solar / PV"
permalink: /configuration/solar-pv/
---

Configure up to 2 solar PV arrays with up to 6 string sensors each, plus an optional windmill generator. The core array sensors are available in both profiles; the windmill and several display options are Tech-only.

## How Profiles Handle Multiple Arrays

**Tech profile** — Array 1 (Inverter 1) and Array 2 (Inverter 2) are shown as separate flows in the SVG. Each inverter has its own animated line and its own daily production figure displayed independently.

**Overview profile** — production from both arrays is **combined into a single PV total** for the card display. The card adds Array 1 and Array 2 power together and shows one combined figure. You still configure each array's sensors individually so the card knows what to read, but the SVG renders a single solar production value.

## Common PV Settings

These options appear at the top of the Solar/PV section in both profiles.

| Config key | Type | Default | Description | Profiles |
|---|---|---|---|---|
| `pv_tot_color` | color | `#00FFFF` | Color applied to the combined PV total text line. | Both |
| `pv_font_size` | text | — | Font size (px) for PV power text. | Both |

### Overview-only: Solar State & Forecast

The Overview profile includes additional sensors for solar production state, forecasting, and weather.

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `sensor_solar_state` | entity | Sensor reporting solar state text: `Producing Power` or `Not Producing`. | Overview |
| `solar_state_producing_color` | color | Color when solar state is "Producing Power". | Overview |
| `solar_state_not_producing_color` | color | Color when solar state is "Not Producing". | Overview |
| `solar_state_font_size` | text | Font size (px) for the solar state text. | Overview |
| `sensor_solar_forecast_today` | entity | Sensor for today's solar energy forecast. | Overview |
| `sensor_solar_forecast_tomorrow` | entity | Sensor for tomorrow's solar energy forecast. | Overview |
| `sensor_weather_forecast` | entity | Sensor for weather forecast text. | Overview |

---

## Solar/PV Array 1

At least one of the following must be configured for the card to display solar data: either a combined total sensor, or one or more individual string sensors.

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `sensor_pv_total` | entity | Optional aggregate production sensor shown as the combined Array 1 total. | Both |
| `sensor_pv1` | entity | Array 1 — PV string 1. | Both |
| `sensor_pv2` | entity | Array 1 — PV string 2. | Both |
| `sensor_pv3` | entity | Array 1 — PV string 3. | Both |
| `sensor_pv4` | entity | Array 1 — PV string 4. | Both |
| `sensor_pv5` | entity | Array 1 — PV string 5. | Both |
| `sensor_pv6` | entity | Array 1 — PV string 6. | Both |
| `sensor_daily` | entity | Daily production total for Array 1. | Both |
| `pv_primary_color` | color | Color for the Array 1 flow animation line. | Both |

---

## Solar/PV Array 2

Array 2 activates when a secondary PV total sensor or at least one Array 2 string sensor is configured. You must also set `sensor_home_load_secondary` (Home Load, Inverter 2) for the second inverter to become active.

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `sensor_pv_total_secondary` | entity | Optional aggregate production sensor for Inverter 2. Added to the Array 1 total when provided. | Both |
| `sensor_pv_array2_1` | entity | Array 2 — PV string 1. | Both |
| `sensor_pv_array2_2` | entity | Array 2 — PV string 2. | Both |
| `sensor_pv_array2_3` | entity | Array 2 — PV string 3. | Both |
| `sensor_pv_array2_4` | entity | Array 2 — PV string 4. | Both |
| `sensor_pv_array2_5` | entity | Array 2 — PV string 5. | Both |
| `sensor_pv_array2_6` | entity | Array 2 — PV string 6. | Both |
| `sensor_daily_array2` | entity | Daily production total for Array 2. | Both |
| `pv_secondary_color` | color | Color for the Array 2 flow animation line. | Both |

---

## Windmill

> **Tech profile only.** The Overview layout does not include a windmill element.

The windmill section activates the windmill SVG group when a power sensor is configured.

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `sensor_windmill_total` | entity | Power sensor for the windmill generator (W or kW). Configuring this sensor shows the windmill SVG group. | Tech |
| `sensor_windmill_daily` | entity | Optional sensor for daily windmill energy production. | Tech |
| `windmill_flow_color` | color | Color for the windmill flow animation. | Tech |
| `windmill_text_color` | color | Color for the windmill power text. | Tech |
| `windmill_power_font_size` | text | Font size (px) for the windmill power text. | Tech |
