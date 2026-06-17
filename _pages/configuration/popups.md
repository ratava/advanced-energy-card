---
title: "Popups"
permalink: /configuration/popups/
---

Tapping an energy node on the card opens a popup overlay with up to 6 custom sensor readings. Both profiles support popups for PV, Battery, Grid, House, and Car. The Tech profile additionally supports Inverter popups and adds per-line color and font size controls to all popups.

Each popup line is configured with a sensor entity and an optional custom name. Replace `{N}` with the line number (1–6).

---

## PV Popup

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `sensor_popup_pv_{N}` | entity | Sensor for PV popup line N. | Both |
| `sensor_popup_pv_{N}_name` | text | Optional custom name for line N. Leave blank to use the entity name. | Both |
| `sensor_popup_pv_{N}_color` | color | Color for popup line N text. Default: `#80ffff`. | Tech |
| `sensor_popup_pv_{N}_font_size` | text | Font size (px) for popup line N. Default: `12`. | Tech |

---

## Battery Popup

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `sensor_popup_bat_{N}` | entity | Sensor for Battery popup line N. | Both |
| `sensor_popup_bat_{N}_name` | text | Optional custom name for line N. Leave blank to use the entity name. | Both |
| `battery_popup_color` | color | Color for all Battery popup line text. Default: `#00FFFF`. | Both |
| `battery_popup_font_size` | text | Font size (px) for Battery popup lines. Default: `16`. | Tech |

---

## Grid Popup

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `sensor_popup_grid_{N}` | entity | Sensor for Grid popup line N. | Both |
| `sensor_popup_grid_{N}_name` | text | Optional custom name for line N. Leave blank to use the entity name. | Both |
| `sensor_popup_grid_{N}_color` | color | Color for popup line N text. Default: `#80ffff`. | Tech |
| `sensor_popup_grid_{N}_font_size` | text | Font size (px) for popup line N. Default: `12`. | Tech |

---

## House Popup

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `sensor_popup_house_{N}` | entity | Sensor for House popup line N. | Both |
| `sensor_popup_house_{N}_name` | text | Optional custom name for line N. Leave blank to use the entity name. | Both |
| `sensor_popup_house_{N}_color` | color | Color for popup line N text. Default: `#80ffff`. | Tech |
| `sensor_popup_house_{N}_font_size` | text | Font size (px) for popup line N. Default: `12`. | Tech |

---

## Car Popup

Each car has its own set of 6 popup lines. Replace `{C}` with the car number (1 or 2) and `{N}` with the line number (1–6).

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `sensor_popup_car{C}_{N}` | entity | Sensor for Car C popup line N. | Both |
| `sensor_popup_car{C}_{N}_name` | text | Optional custom name for line N. Leave blank to use the entity name. | Both |
| `sensor_popup_car{C}_{N}_color` | color | Color for popup line N text. Default: `#80ffff`. | Tech |
| `sensor_popup_car{C}_{N}_font_size` | text | Font size (px) for popup line N. Default: `12`. | Tech |

---

## Inverter Popup

> **Tech profile only.** The Overview layout does not include an Inverter popup.

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `sensor_popup_inverter_{N}` | entity | Sensor for Inverter popup line N. | Tech |
| `sensor_popup_inverter_{N}_name` | text | Optional custom name for line N. Leave blank to use the entity name. | Tech |
| `sensor_popup_inverter_{N}_color` | color | Color for popup line N text. Default: `#80ffff`. | Tech |
| `sensor_popup_inverter_{N}_font_size` | text | Font size (px) for popup line N. Default: `12`. | Tech |

---

## Tips

- All popup sensors accept any HA entity — they are not restricted to power sensors. Use them for temperature, voltage, current, or any other diagnostic value you want at a glance.
- The popup opens on **tap** for touch interfaces, or **click** on desktop.
- Line order in the popup matches the configuration order (line 1 appears at the top).
