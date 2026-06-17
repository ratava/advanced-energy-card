---
title: "Localization"
permalink: /reference/localization/
---

Advanced Energy Card ships with 6 built-in languages. Switching language changes all editor labels, helper text, and section titles — as well as the state labels displayed on the card itself (e.g. "Charging", "Importing").

## Available Languages

| Code | Language |
|---|---|
| `en` | English |
| `de` | Deutsch (German) |
| `es` | Español (Spanish) |
| `fr` | Français (French) |
| `it` | Italiano (Italian) |
| `nl` | Nederlands (Dutch) |

## Changing the Language

### Via the Editor

Open the card editor and go to **General Settings**. The **Language** dropdown lists all available languages. Select your preferred language and the editor and card will update immediately.

### Via YAML

Add or update the `language` key in the card's YAML configuration:

```yaml
type: custom:advanced-energy-card
language: de
background: /local/community/advanced-energy-card/tech.svg
# ... rest of your config
```

Replace `de` with any of the language codes from the table above.

## What is Translated

- All editor section titles and field labels
- Helper/hint text shown beneath each editor field
- Card state labels rendered in the SVG (e.g. battery state: Charging, Discharging, Full; grid state: Importing, Exporting)
- Initial Configuration wizard text

## What is Not Translated

- Sensor values and units — these come directly from Home Assistant entities
- Custom labels you have entered manually (e.g. `car1_label`, `heat_pump_label`)
- Footer card labels set via `footer_card{N}_slot{S}_label`
