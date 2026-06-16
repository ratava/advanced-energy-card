---
layout: splash
title: "Advanced Energy Card"
permalink: /
header:
  overlay_color: "#1a1a2e"
  overlay_filter: 0.6
  actions:
    - label: "Get Started"
      url: /getting-started/installation/
    - label: "GitHub"
      url: "https://github.com/ratava/advanced-energy-card"
excerpt: "A feature-rich Home Assistant Lovelace card for monitoring your entire energy ecosystem — solar, battery, grid, load, and EV — in a live animated display."

feature_row:
  - title: "Animated Energy Flows"
    excerpt: "Live animated flow lines show energy moving between solar arrays, batteries, grid, house loads, and EVs in real time."
  - title: "Up to 4 Batteries & 2 EVs"
    excerpt: "Monitor multiple battery packs and EV charge sessions simultaneously with per-unit SOC, power, temperature, and time-until displays."
  - title: "Tech & Overview Profiles"
    excerpt: "Switch between a detailed technical SVG layout and a clean overview layout. Both update live from your Home Assistant sensors."
---

{% include feature_row %}

## What is Advanced Energy Card?

Advanced Energy Card is a custom Lovelace card for Home Assistant that gives you a real-time animated view of your home energy system. It is designed around inverter-based solar installations with battery storage, but works for any combination of solar, grid, battery, and load sensors.

Version 2.0 introduces a fully modular architecture, a redesigned configuration editor, multi-battery and multi-EV support, and a new Overview profile alongside the original Technical layout.

## Key Features

- Real-time animated SVG energy flow between all sources and loads
- Solar PV: up to 2 arrays, up to 6 string sensors each, plus windmill support
- Battery: up to 4 packs with SOC, power, temperature, state, time-until, and fill animation
- Grid: import/export with net metering display
- House load with heat pump and pool circuit support
- EV charging: up to 2 cars with session tracking
- 6 built-in languages (English, Italian, German, French, Dutch, Spanish)
- Fully configurable colors, fonts, and display units
- Popup overlays for each energy node
- Custom SVG support via data-role bindings
