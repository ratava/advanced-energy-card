---
title: "Footer Cards"
permalink: /configuration/footer-cards/
---

> **Overview profile only.** The Tech layout does not include footer cards.

The Overview layout supports up to **6 footer cards** displayed along the bottom of the card. Each card has two data slots; assign a sensor entity and an optional custom label to each slot.

## Configuration

Replace `N` with the card number (1–6) and `S` with the slot number (1 or 2).

| Config key | Type | Description | Profiles |
|---|---|---|---|
| `footer_card{N}_slot{S}_entity` | entity | Sensor entity to display in this slot. | Overview |
| `footer_card{N}_slot{S}_label` | text | Optional custom label. Leave blank to use the entity's friendly name. | Overview |

## Example

```yaml
footer_card1_slot1_entity: sensor.daily_solar_production
footer_card1_slot1_label: Solar Today
footer_card1_slot2_entity: sensor.daily_grid_import
footer_card1_slot2_label: Grid Import

footer_card2_slot1_entity: sensor.battery_soc
footer_card2_slot1_label: Battery
footer_card2_slot2_entity: sensor.daily_battery_charge
footer_card2_slot2_label: Charged Today
```

## Notes

- Footer cards are displayed left-to-right in card number order.
- A slot with no entity configured is hidden automatically — you do not need to fill all 6 cards or both slots.
- Label and value styling is controlled by the [Display & Style](/configuration/display-style/) `card_label_*` and `card_value_*` options.
