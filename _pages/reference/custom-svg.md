---
title: "Custom SVG Backgrounds"
permalink: /reference/custom-svg/
---

The card's visual layout is entirely driven by an SVG background image. You are not limited to the two supplied layouts — you can create your own SVG and have the card bind live sensor data to it.

## Start From a Supplied SVG

The best starting point is to copy one of the two bundled SVGs rather than building from scratch:

| Base file | Profile activated |
|---|---|
| `tech.svg` | Tech — full per-inverter detail layout |
| `overview.svg` | Overview — combined single-value layout with footer cards |

**Whichever file you copy determines the editor menus you get.** The card detects the profile by reading a `data-profile-id` attribute on the SVG root element (`tech` or `overview`). If you keep that attribute intact in your copy, the card will automatically use the correct menu set. If it is absent or unrecognised, the card will prompt you to choose a profile on first load (see below).

The bundled SVG files are installed alongside the card at:

```
config/www/community/advanced-energy-card/tech.svg
config/www/community/advanced-energy-card/overview.svg
```

Copy whichever you want to customise and give it a new name (e.g. `my-layout.svg`).

## Recommended Editor — Inkscape

[Inkscape](https://inkscape.org) is strongly recommended for editing SVG backgrounds. It is free, cross-platform, and gives you full access to SVG structure and XML attributes without mangling the file.

**Accessing the XML editor:** press **Ctrl+Shift+X** (or **Edit → XML Editor**) to open the XML panel. This is where you will read and set the `data-role`, `data-flow-key`, `data-style`, and other attributes that the card uses to bind sensor data to SVG elements.

> Keep the XML editor open alongside the canvas while you work — selecting any element in the canvas immediately shows its attributes in the XML panel.

For the full list of attributes the card recognises (`data-role`, `data-flow-key`, `data-style`, and others), see [SVG Elements](/reference/svg-elements/).

## Deploying Your Custom SVG

Place your finished SVG in the card's folder on your Home Assistant server:

```
config/www/community/advanced-energy-card/my-layout.svg
```

This folder maps to the `/local/` path in Home Assistant, so the file is accessible at:

```
/local/community/advanced-energy-card/my-layout.svg
```

## Pointing the Card at Your SVG

In the card editor, go to **General Settings** and set the **Background** field to the `/local/` path of your file:

```
/local/community/advanced-energy-card/my-layout.svg
```

## Profile Selection Prompt

If your custom SVG does not carry a recognised `data-profile-id` attribute on its root element, the card cannot determine which editor menus to show. On first load you will see a **"Custom Background Detected"** banner at the top of the editor asking you to choose the profile your layout is based on:

- Choose **Tech** if you copied `tech.svg` or want the full per-inverter detail menus.
- Choose **Overview** if you copied `overview.svg` or want the combined-value and footer card menus.

This choice is saved and will not be asked again unless you change the background path.

> **Tip:** To avoid the prompt entirely, add `data-profile-id="tech"` (or `"overview"`) to the root `<svg>` element of your file using Inkscape's XML editor.
