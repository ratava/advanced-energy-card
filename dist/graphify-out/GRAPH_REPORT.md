# Graph Report - dist  (2026-06-15)

## Corpus Check
- 18 files · ~172,305 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 355 nodes · 594 edges · 30 communities (16 shown, 14 thin omitted)
- Extraction: 92% EXTRACTED · 7% INFERRED · 1% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f094c0af`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Core Modules & Files|Core Modules & Files]]
- [[_COMMUNITY_Editor Config Builder|Editor Config Builder]]
- [[_COMMUNITY_Editor Form Rendering|Editor Form Rendering]]
- [[_COMMUNITY_Card Render Pipeline|Card Render Pipeline]]
- [[_COMMUNITY_Card Rendering & State|Card Rendering & State]]
- [[_COMMUNITY_Animation Manager Core|Animation Manager Core]]
- [[_COMMUNITY_Popup Overlay Handling|Popup Overlay Handling]]
- [[_COMMUNITY_Fluid Flow Animation|Fluid Flow Animation]]
- [[_COMMUNITY_Config Validation & Migration|Config Validation & Migration]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Headlight Flash Effect|Headlight Flash Effect]]
- [[_COMMUNITY_Battery State Getters|Battery State Getters]]
- [[_COMMUNITY_Night Preview Images|Night Preview Images]]
- [[_COMMUNITY_Grid & House SVG Layers|Grid & House SVG Layers]]
- [[_COMMUNITY_Battery1 Fill SVG Layers|Battery1 Fill SVG Layers]]
- [[_COMMUNITY_Car1 SVG Layers|Car1 SVG Layers]]
- [[_COMMUNITY_Car2 SVG Layers|Car2 SVG Layers]]
- [[_COMMUNITY_Day 2-EV Preview Image|Day 2-EV Preview Image]]
- [[_COMMUNITY_Night 1-EV Preview Image|Night 1-EV Preview Image]]
- [[_COMMUNITY_Background Image Variants|Background Image Variants]]
- [[_COMMUNITY_Overview Daytime Screenshot|Overview Daytime Screenshot]]
- [[_COMMUNITY_Day No-EV Preview Image|Day No-EV Preview Image]]
- [[_COMMUNITY_Footer Cards SVG Group|Footer Cards SVG Group]]
- [[_COMMUNITY_SunMoon Arc SVG|Sun/Moon Arc SVG]]
- [[_COMMUNITY_PV & Solar Forecast SVG|PV & Solar Forecast SVG]]
- [[_COMMUNITY_Rotation Animation Helpers|Rotation Animation Helpers]]
- [[_COMMUNITY_Base House Hologram Asset|Base House Hologram Asset]]
- [[_COMMUNITY_EV Charger Sprite|EV Charger Sprite]]
- [[_COMMUNITY_Orange EV Sprite|Orange EV Sprite]]
- [[_COMMUNITY_Blue EV Wireframe Sprite|Blue EV Wireframe Sprite]]

## God Nodes (most connected - your core abstractions)
1. `AdvancedEnergyCardEditor` - 48 edges
2. `AnimationManager` - 45 edges
3. `AdvancedEnergyCard` - 25 edges
4. `PopupManager` - 22 edges
5. `overview.svg (root SVG, data-profile-id=overview)` - 16 edges
6. `LocalizationManager` - 13 edges
7. `BatteryManager` - 12 edges
8. `ConfigValidator` - 11 edges
9. `EntityStateManager` - 11 edges
10. `SunMoonManager` - 10 edges

## Surprising Connections (you probably didn't know these)
- `AdvancedEnergyCard` --semantically_similar_to--> `SecurityHelpers`  [INFERRED] [semantically similar]
  advanced-energy-card.js → modules/security.js
- `Grid Meter Icon (Sprite Asset)` --conceptually_related_to--> `AdvancedEnergyCard`  [INFERRED]
  grid_meter.png → advanced-energy-card.js
- `AnimationManager` --shares_data_with--> `AdvancedEnergyCard`  [INFERRED]
  modules/animation-manager.js → advanced-energy-card.js
- `Overview Night No EV (Marketing Illustration)` --conceptually_related_to--> `Overview Preview Image Series (day/night x EV count variants)`  [AMBIGUOUS]
  overview_night_no_EV.jpg → overview_night_2_EV.jpg
- `No-EV Card Configuration Variant` --conceptually_related_to--> `Overview Preview Image Series (day/night x EV count variants)`  [AMBIGUOUS]
  overview_night_no_EV.jpg → overview_night_2_EV.jpg

## Import Cycles
- 3-file cycle: `modules/constants.js -> modules/svg-layer-visibility.js -> modules/loader.js -> modules/constants.js`

## Hyperedges (group relationships)
- **Manager delegation architecture: AdvancedEnergyCard constructor wires up five specialized managers** —  [INFERRED 0.85]
- **Phase 3 render pipeline: render -> _renderInternal builds viewState -> _applyViewState applies to DOM via _ensureTemplate/_cacheDomReferences/_updateView/_applyFlowAnimationTargets** —  [INFERRED 0.90]
- **Popup interaction pipeline: SVG click delegation and popup-line activation both funnel into PopupManager via shared _domRefs** —  [INFERRED 0.80]
- **Custom Field Renderer Functions Used by _createCustomForm/_createInitialConfigContent** — modules_card_editor_createdividerfield, modules_card_editor_createcolorpickerfield, modules_card_editor_createdaynightmodefield, modules_card_editor_createradiogroupfield, modules_card_editor_createstandardfield, modules_card_editor_createsvgpickerfield [EXTRACTED 0.95]
- **Profile Resolution and Value Migration Flow** — modules_card_editor_resolveprofiletarget, modules_card_editor_switchprofilevalues, modules_card_editor_getprofilefieldnames, modules_card_editor_handlebackgroundchange, modules_card_editor_resolveactiveprofile, modules_constants_seed_defaults, modules_constants_profile_schemas [INFERRED 0.85]
- **Functions That Trigger Config Change Propagation to Host Card** — modules_card_editor_updatefieldvalue, modules_card_editor_onformvaluechanged, modules_card_editor_debouncedconfigchanged, modules_card_editor_configchanged, modules_card_editor_setconfig [INFERRED 0.85]
- **Fluid Flow Rendering Pipeline** — modules_animation_manager_syncflowanimation, modules_animation_manager_ensurefluidflowoverlay, modules_animation_manager_ensurefluidflowmask, modules_animation_manager_setfluidflowraf, modules_animation_manager_updateflowmotion [INFERRED 0.85]
- **Headlight Flash Animation Lifecycle** — modules_animation_manager_updateheadlightflash, modules_animation_manager_activateheadlightflash, modules_animation_manager_prepareheadlightnode, modules_animation_manager_teardownheadlightflash, modules_animation_manager_resetheadlightnode, modules_animation_manager_ensuregsap [INFERRED 0.85]
- **Rotation Animation (rAF-driven)** — modules_animation_manager_applyrotateanimations, modules_animation_manager_computerotatecenter, modules_animation_manager_parserotatedirection, modules_animation_manager_parserotatespeeddps, modules_animation_manager_teardownrotateanimations [INFERRED 0.85]
- **Tier-1 utility classes re-exported through loader.js** — modules_loader_loader, modules_localization_manager_localizationmanager, modules_security_securityhelpers, modules_constants_svg_layer_config, modules_constants_legacy_car_visibility_keys, modules_constants_legacy_deprecated_keys [EXTRACTED 1.00]
- **Configuration validation/migration pipeline using SecurityHelpers** — modules_config_validator_configvalidator, modules_config_validator_validate, modules_config_validator_securityvalidate, modules_security_securityhelpers, modules_security_validateurl, modules_security_validateconfigvalue, modules_security_sanitizelabelcss [EXTRACTED 1.00]
- **Manager classes consuming EntityStateManager.getStateSafe via card reference** — modules_entity_state_manager_entitystatemanager, modules_entity_state_manager_getstatesafe, modules_battery_manager_batterymanager, modules_battery_manager_getnumericstate, modules_car_manager_carmanager, modules_car_manager_getnumericstate [INFERRED 0.85]
- **Overview Background Image Visibility States (day/night x no-car/1-car/2-car)** — overview_daynocar_image, overview_nightnocar_image, overview_day1car_image, overview_night1car_image, overview_day2car_image, overview_night2car_image [EXTRACTED 0.95]
- **Battery1 Data Card Fields (temp, time-until, power, soc, state) on Battery Card** — overview_battery_card, overview_battery1_temp, overview_battery1_time_until, overview_battery1_power, overview_battery1_soc, overview_battery1_state [EXTRACTED 0.95]
- **Energy Flow Paths (grid-feed, array-inverter1, inverter1-battery1) connecting Grid, PV/Array, Inverter and Battery components** — overview_grid_feed_flow, overview_array_inverter1_flow, overview_inverter1_battery1_flow, overview_grid_card, overview_pv_card, overview_battery1_group [INFERRED 0.85]
- **Daytime Energy Flow Illustration: Solar, Grid, House, and One EV** — overview_day_1_ev_solar_panels, overview_day_1_ev_grid_tower, overview_day_1_ev_house, overview_day_1_ev_ev_vehicle [INFERRED 0.80]
- **Two-EV Home Energy Scene (House, Solar, Grid, 2 EVs)** — overview_day_2_ev_house, overview_day_2_ev_solar_panels, overview_day_2_ev_grid_connection, overview_day_2_ev_white_ev, overview_day_2_ev_blue_ev [EXTRACTED 1.00]
- **Home Energy Setup Depicted (House, Solar, Grid, No EV)** — overview_day_no_ev_house, overview_day_no_ev_solar_array, overview_day_no_ev_grid_connection, overview_day_no_ev_no_ev_configuration [INFERRED 0.85]
- **Home Energy Ecosystem Depicted at Night (Solar, Grid, EV, House Load)** — overview_night_1_ev_house, overview_night_1_ev_solar_panels, overview_night_1_ev_electric_vehicle, overview_night_1_ev_grid_connection [INFERRED 0.85]
- **Nighttime Home Energy Ecosystem (Solar, Grid, 2 EVs)** — overview_night_2_ev_house, overview_night_2_ev_solar_panels, overview_night_2_ev_electric_vehicles, overview_night_2_ev_grid_connection [INFERRED 0.75]
- **Night Scene Without EV: House, Solar, Grid, Sky** — overview_night_no_ev_house, overview_night_no_ev_solar_panels, overview_night_no_ev_grid_connection, overview_night_no_ev_night_scene [EXTRACTED 1.00]

## Communities (30 total, 14 thin omitted)

### Community 0 - "Core Modules & Files"
Cohesion: 0.11
Nodes (26): base-nopool.png - House Energy System 3D Render (No Pool variant), ANIMATION, buildArrowGroupSvg(), buildCarTextTransforms(), buildTextTransform(), CAR_LAYOUTS, CAR_TEXT_BASE, _CARD_BASE_URL (+18 more)

### Community 11 - "Battery State Getters"
Cohesion: 0.50
Nodes (4): Battery1 Fill Bottom (fill-bottom, data-role=battery1-fill-bottom), Battery1 Fill Level (battery1-fill-sentinel/clip, data-role=battery1-fill-level), Battery1 Fill Top (fill-top, data-role=battery1-fill-top), Battery1 Icon Graphic (g3267, inkscape:label=Battery1, g8048 paths)

### Community 12 - "Night Preview Images"
Cohesion: 0.22
Nodes (13): Overview Preview Image Series (day/night x EV count variants), Two Electric Vehicles in Driveway, Power Pole / Grid Connection, Single-Story House with Solar Roof (Night Scene), Overview Night - 2 EVs Preview Image, Starry Night Sky with Milky Way Backdrop, Rooftop Solar Panel Array, Electrical Transmission Tower (Grid Connection) (+5 more)

### Community 13 - "Grid & House SVG Layers"
Cohesion: 0.33
Nodes (9): Array-to-Inverter1 Flow Path (path1, data-flow-key=array-inverter1), Battery1 Group (g9, inkscape:label=battery1), House Card (g17-2-80, inkscape:label=House, rect1-4-4-68 house-load-card), House Load (data-role=house-load + label), Inverter1-to-Battery1 Flow Path (path2, data-flow-key=inverter1-battery1), Popup Anchor (popup-anchor), Popup Car1 Trigger Path (path117, inkscape:label=popup:car1), Popup Car2 Trigger Path (path118, inkscape:label=popup:car2) (+1 more)

### Community 14 - "Battery1 Fill SVG Layers"
Cohesion: 0.33
Nodes (6): Battery1 Power (data-role=battery1-power + label), Battery1 SOC (data-role=battery1-soc + label), Battery1 State (data-role=battery1-state + label), Battery1 Temp (data-role=battery1-temp + label), Battery1 Time Until (data-role=battery1-time-until + label), Battery Card (rect1, inkscape:label=Battery-card)

### Community 15 - "Car1 SVG Layers"
Cohesion: 0.25
Nodes (8): Car 1 Card Group (g17-8, inkscape:label=Car 1, rect1-4-2 car1-card, data-flow-key=car1), Car1 Flow Path (path122, inkscape:label=car1-flow), Car1 Inside Temp (data-role=car1-inside-temp + car1-label), Car1 Outside Temp (data-role=car1-outside-temp + car1-label), Car1 Power (data-role=car1-power + car1-label), Car1 SOC (data-role=car1-soc + car1-label), Car1 State (data-role=car1-state + car1-label), Car1 Temps Group (g53, inkscape:label=Car1 Temps)

### Community 16 - "Car2 SVG Layers"
Cohesion: 0.25
Nodes (8): Car 2 Card Group (g17-8-2, inkscape:label=Car 2, rect1-4-2-8 car2-card, data-flow-key=car2), Car2 Flow Path (path123, inkscape:label=car2-flow), Car2 Inside Temp (data-role=car2-inside-temp + car2-label), Car2 Outside Temp (data-role=car2-outside-temp + car2-label), Car2 Power (data-role=car2-power + car2-label), Car2 SOC (data-role=car2-soc + car2-label), Car2 State (data-role=car2-state + car2-label), Car2 Temps Group (g53-6, inkscape:label=Car2 Temps)

### Community 17 - "Day 2-EV Preview Image"
Cohesion: 0.39
Nodes (8): Blue Electric Vehicle (Driveway), Daytime Setting (Clear Blue Sky), Electrical Transmission Tower (Grid Connection), House with Rooftop Solar Panels, Overview Day - 2 EVs, Rooftop Solar Panel Array, White Electric Vehicle (Driveway), Overview Card Preview Image Series

### Community 18 - "Night 1-EV Preview Image"
Cohesion: 0.32
Nodes (8): Single Electric Vehicle in Driveway, Electrical Transmission Tower (Grid Connection), Single-Story House with Solar Panels (Night Scene), Warmly Illuminated Interior Windows, Overview Night 1 EV Illustration, Nighttime Scene with Starry Sky and Milky Way, Roof-Mounted Solar Panel Array, Overview Preview Image Series (day/night, 0/1/2 EV variants)

### Community 19 - "Background Image Variants"
Cohesion: 0.52
Nodes (7): Base Layer Group (g1, inkscape:label=base), Day 1-Car Background Image (image1-4, overview_day_1_EV.jpg, data-role=day1car), Day 2-Car Background Image (image1-4-0, overview_day_2_EV.jpg, data-role=day2car, default visible), Day No-Car Background Image (image1, overview_day_no_EV.jpg, data-role=daynocar), Night 1-Car Background Image (image1-9-8, overview_night_1_EV.jpg, data-role=night1car), Night 2-Car Background Image (image1-9-8-0, overview_night_2_EV.jpg, data-role=night2car), Night No-Car Background Image (image1-9, overview_night_no_EV.jpg, data-role=nightnocar)

### Community 20 - "Overview Daytime Screenshot"
Cohesion: 0.43
Nodes (7): Overview Profile - Daytime, 1 EV Connected (Screenshot), Daytime Sky Background, Electric Vehicle (Connected EV), Electrical Grid Transmission Tower, House (Single-Story Brick Residence), Rooftop Solar Panel Array, Advanced Energy Card - Overview Profile

### Community 21 - "Day No-EV Preview Image"
Cohesion: 0.43
Nodes (7): Daytime Rural Scene, Electricity Transmission Tower (Grid Connection), Single-Story Brick House with Solar Panels, Overview Day No EV (Marketing Image), No-EV Card Configuration Variant, Rooftop Solar Panel Array, Overview Preview Image Series (day/night, EV count variants)

### Community 22 - "Footer Cards SVG Group"
Cohesion: 0.29
Nodes (7): Footer Card 1 (footer-card1, bg + slot1 + slot2 + labels), Footer Card 2 (footer-card2, bg + slot1 + slot2 + labels), Footer Card 3 (footer-card3, bg + slot1 + slot2 + labels), Footer Card 4 (footer-card4, bg + slot1 + slot2 + labels), Footer Card 5 (footer-card5, bg + slot1 + slot2 + labels), Footer Card 6 (footer-card6, bg + slot1 + slot2 + labels), Footer Cards Group (g2, inkscape:label=Footer Cards)

### Community 23 - "Sun/Moon Arc SVG"
Cohesion: 0.38
Nodes (7): Moon Icon (moon-icon, data-moon-icon=true, display:none default), Sun Icon (sun-icon, data-sun-icon=true), Sun/Moon Arc Path (sun-moon-arc), Sun/Moon Group (g10, inkscape:label=Sun/Moon), Sun/Moon Traveller (sun-moon-traveller, data-flow-key=sun-moon-position), Sunrise Time (sunrise-time + sunrise-time-label), Sunset Time (sunset-time + sunset-time-label)

### Community 24 - "PV & Solar Forecast SVG"
Cohesion: 0.29
Nodes (7): PV Card (g17-2, inkscape:label=PV, rect1-4-4 grid-card), PV Total (data-role=pv-total + Solar Power Total label), Solar Forecast Card (g17-2-0, inkscape:label=Solar Forecast, rect1-4-4-6 solar-forcast-card), Solar Forecast Today (data-role=solar-forecast-today + label), Solar Forecast Tomorrow (data-role=solar-forecast-tomorrow + label), Solar State (data-role=solar-state + label), Weather Forecast Tomorrow (data-role=weather-forecast + label)

### Community 25 - "Rotation Animation Helpers"
Cohesion: 0.50
Nodes (4): Grid Card (g17, rect1-4, inkscape:label=Grid Card / grid-card), Grid Current Power (data-role=grid-current-power + label), Grid Feed Flow Path (path10, data-flow-key=grid-feed), Grid State (data-role=grid-state + label)

## Ambiguous Edges - Review These
- `advanced-energy-card.js` → `base-nopool.png - House Energy System 3D Render (No Pool variant)`  [AMBIGUOUS]
  base-nopool.png · relation: references
- `Overview Day - 2 EVs` → `Overview Card Preview Image Series`  [AMBIGUOUS]
  overview_day_2_EV.jpg · relation: semantically_similar_to
- `No-EV Card Configuration Variant` → `Overview Preview Image Series (day/night, EV count variants)`  [AMBIGUOUS]
  overview_day_no_EV.jpg · relation: conceptually_related_to
- `Overview Night - 2 EVs Preview Image` → `Overview Preview Image Series (day/night x EV count variants)`  [AMBIGUOUS]
  overview_night_2_EV.jpg · relation: conceptually_related_to
- `Overview Preview Image Series (day/night x EV count variants)` → `Overview Night No EV (Marketing Illustration)`  [AMBIGUOUS]
  overview_night_no_EV.jpg · relation: conceptually_related_to
- `Overview Preview Image Series (day/night x EV count variants)` → `No-EV Card Configuration Variant`  [AMBIGUOUS]
  overview_night_no_EV.jpg · relation: conceptually_related_to

## Knowledge Gaps
- **50 isolated node(s):** `DEBUG`, `base-nopool.png - House Energy System 3D Render (No Pool variant)`, `Base House Asset (Hologram House with Solar Panels, Pool, and Appliances)`, `EV Charger Icon Sprite (charger.png)`, `Grid Meter Icon (Sprite Asset)` (+45 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `advanced-energy-card.js` and `base-nopool.png - House Energy System 3D Render (No Pool variant)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Overview Day - 2 EVs` and `Overview Card Preview Image Series`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `No-EV Card Configuration Variant` and `Overview Preview Image Series (day/night, EV count variants)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Overview Night - 2 EVs Preview Image` and `Overview Preview Image Series (day/night x EV count variants)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Overview Preview Image Series (day/night x EV count variants)` and `Overview Night No EV (Marketing Illustration)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Overview Preview Image Series (day/night x EV count variants)` and `No-EV Card Configuration Variant`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `AdvancedEnergyCardEditor` connect `Editor Config Builder` to `Core Modules & Files`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._