---
title: "Installation"
permalink: /getting-started/installation/
---

## Requirements

- Home Assistant 2024.1 or later
- [HACS](https://hacs.xyz) installed

## Install via HACS

1. Open HACS in your Home Assistant sidebar
2. Go to **Frontend**
3. Click the **+** button and search for **Advanced Energy Card**
4. Click **Download**
5. Restart Home Assistant (or reload browser resources)

## Manual Install

1. Download `advanced-energy-card.js` from the [latest release](https://github.com/ratava/advanced-energy-card/releases)
2. Copy it to `config/www/community/advanced-energy-card/advanced-energy-card.js`
3. In Home Assistant, go to **Settings → Dashboards → Resources**
4. Add a new JavaScript module resource pointing to `/local/community/advanced-energy-card/advanced-energy-card.js`
5. Reload your browser

## Adding the Card

Once installed, add the card to any Lovelace dashboard:

1. Edit your dashboard
2. Click **Add Card**
3. Search for **Advanced Energy Card**
4. Configure via the visual editor or YAML

## Next Steps

→ [Quick Start](/getting-started/quick-start/) — configure the card for the first time
