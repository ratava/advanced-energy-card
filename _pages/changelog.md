---
title: "Changelog"
permalink: /changelog/
---

## v2.0 — Current

Version 2.0 is a major release introducing a fully modular architecture and significant new features.

### New Features

- **Multi-battery support** — up to 4 independent battery packs with individual SOC, power, temperature, state, and time-until displays
- **Multi-EV support** — up to 2 EV charging stations
- **Overview profile** — new clean summary SVG layout alongside the existing Technical layout
- **Automatic battery state** — Charging / Discharging / Full / Reserve / Flat calculated from SOC and power; no state sensor needed
- **Battery time-until** — estimated time to full or empty calculated from capacity and current power, with kWh unit auto-conversion
- **Windmill generator support**
- **Redesigned configuration editor** — all settings grouped into logical sections with contextual helper text

### Architecture

- Modular JS architecture: `BatteryManager`, `PopupManager`, `TextBindingsManager`, `RenderManager`, and more extracted into independent modules
- Dead legacy code removed (~672 lines)

### Breaking Changes

- `sensor_bat{N}_state` entity sensor removed — battery state is now always calculated automatically
