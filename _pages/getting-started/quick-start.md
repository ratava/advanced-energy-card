---
title: "Quick Start"
permalink: /getting-started/quick-start/
---

This guide gets you to a working card with the minimum required configuration.

## Minimum Required Sensors

Advanced Energy Card needs at least one power sensor to become active. The typical minimum is:

| What | Config key | Example entity |
|---|---|---|
| Solar total power | `sensor_pv_total` | `sensor.inverter_pv_power` |
| Home load | `sensor_house_power` | `sensor.inverter_load_power` |
| Grid power | `sensor_grid_power` | `sensor.inverter_grid_power` |
| Battery SOC | `sensor_bat1_soc` | `sensor.battery_soc` |
| Battery power | `sensor_bat1_power` | `sensor.battery_power` |

## Minimal YAML Config

```yaml
type: custom:advanced-energy-card
sensor_pv_total: sensor.inverter_pv_power
sensor_house_power: sensor.inverter_load_power
sensor_grid_power: sensor.inverter_grid_power
sensor_bat1_soc: sensor.battery_soc
sensor_bat1_power: sensor.battery_power
```

## Using the Visual Editor

The card includes a full visual editor. All configuration options are grouped into sections matching this documentation. Open the editor by clicking the card's pencil icon in the Lovelace UI.

The **Initial Configuration** section at the top of the editor provides a guided checklist for first-time setup.

## Choosing a Profile

Two display profiles are available:

- **Tech** — detailed technical SVG layout showing individual inverter components
- **Overview** — clean summary layout showing combined energy flows

Set the profile with:

```yaml
profile: overview   # or: tech
```

See [Profiles](/reference/profiles/) for full details.

## Next Steps

- [Configuration: Battery](/configuration/battery/) — set up battery monitoring
- [Configuration: Solar/PV](/configuration/solar-pv/) — configure PV arrays
- [Sensors Reference](/reference/sensors/) — full list of every config key
