import { SEED_DEFAULTS, PROFILE_SCHEMAS, _CARD_BASE_URL, stripLegacyCarVisibility } from './constants.js';
import { ConfigValidator } from './config-validator.js';

/**
 * Advanced Energy Card Editor
 * Lovelace card configuration UI (custom element: advanced-energy-card-editor)
 */
export class AdvancedEnergyCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._rendered = false;
    this._isEditing = false;
    this._pendingConfigChange = false;
    const cardClass = customElements.get('advanced-energy-card');
    this._defaults = (cardClass && typeof cardClass.getStubConfig === 'function')
      ? { ...cardClass.getStubConfig(), ...SEED_DEFAULTS.tech }
      : {};
    this._strings = this._buildStrings();
    this._sectionOpenState = {};
    this._sectionCache = new Map();
    this._svgFiles = null;
    this._svgFilesFetched = false;
    this._svgProfileInfoCache = new Map();
    this._activeProfileId = 'tech';
    this._activeSnapshotKey = 'tech';
    this._pendingProfileBasis = null;
    this._pendingSwitchFrom = null;

    // Avoid losing focus while typing: HA may rebuild the editor when it receives
    // a debounced config-changed event. We therefore defer dispatching config-changed
    // until the user finishes interacting (focus leaves the editor).
    this.shadowRoot.addEventListener('focusin', () => {
      this._isEditing = true;
    }, true);
    this.shadowRoot.addEventListener('focusout', (ev) => {
      const next = ev.relatedTarget;
      const stillInside = next && this.shadowRoot && this.shadowRoot.contains(next);
      if (stillInside) {
        return;
      }
      this._isEditing = false;
      if (this._pendingConfigChange && this._config) {
        this._pendingConfigChange = false;
        this.configChanged(this._config);
      }
    }, true);
  }

  _buildStrings() {
    return {
      en: {
        sections: {
          general: { title: 'General Settings', helper: 'Card metadata, background, language, and update cadence.' },
          initialConfig: { title: 'Initial Configuration', helper: 'First-time setup checklist and starter options.' },
          displayStyle: { title: 'Display Style', helper: 'Shared colors, fonts, and CSS applied to card labels and values.' },
          pvCommon: { title: 'Solar/PV Common', helper: 'Common Solar/PV settings shared across arrays.' },
          array1: { title: 'Solar/PV Array 1', helper: 'Choose the PV, battery, grid, load, and EV entities used by the card. Either the PV total sensor or your PV string arrays need to be specified as a minimum.' },
          array2: { title: 'Solar/PV Array 2', helper: 'If PV Total Sensor (Inverter 2) is set or the PV String values are provided, Array 2 will become active and enable the second inverter. You must also enable Daily Production Sensor (Array 2) and Home Load (Inverter 2).' },
          windmill: { title: 'Windmill', helper: 'Configure windmill generator sensors and display styling.' },
          battery: { title: 'Battery', helper: 'Configure battery entities.' },
          grid: { title: 'Grid', helper: 'Configure grid entities.' },
          car: { title: 'Car', helper: 'Configure EV entities.' },
          other: { title: 'House', helper: 'Additional sensors and advanced toggles.' },
          pvPopup: { title: 'PV Popup', helper: 'Configure entities for the PV popup display.' },
          housePopup: { title: 'House Popup', helper: 'Configure entities for the house popup display.' },
          carPopup: { title: 'Car Popup', helper: 'Configure auto-detected EV sensors, climate controls, and extra entities for the car (EV) popups.' },
          batteryPopup: { title: 'Battery Popup', helper: 'Configure battery popup display.' },
          gridPopup: { title: 'Grid Popup', helper: 'Configure entities for the grid popup display.' },
          inverterPopup: { title: 'Inverter Popup', helper: 'Configure entities for the inverter popup display.' },
          colors: { title: 'Color & Thresholds', helper: 'Configure grid thresholds and accent colours for flows and EV display.' },
          typography: { title: 'Typography', helper: 'Fine tune the font sizes used across the card.' },
          stats: { title: 'Stats', helper: 'Configure energy stats display sensors and labels.' },
          footer: { title: 'Footer Cards', helper: 'Configure up to 6 footer cards. Each card has two slots; assign a sensor and an optional custom label to each slot.' },
          about: { title: 'About', helper: 'Credits, version, and helpful links.' }
        },
        fields: {
          card_title: { label: 'Card Title', helper: 'Title displayed at the top of the card. Leave blank to disable.' },
          title_text_color: { label: 'Title Text Color', helper: 'Overrides the fill color for [data-role="title-text"]. Leave blank to keep the SVG styling.' },
          title_bg_color: { label: 'Title Background Color', helper: 'Overrides the fill color for [data-role="title-bg"]. Leave blank to keep the SVG styling.' },
          card_label_color: { label: 'Card Label Color', helper: 'Default fill color for SVG elements with data-style="config" and data-role="label". Leave blank to keep SVG styling.' },
          card_label_font_size: { label: 'Card Label Font Size', helper: 'Default font size for SVG elements with data-style="config" and data-role="label" (e.g. 14 or 14px).' },
          card_value_color: { label: 'Card Value Color', helper: 'Default fill color for SVG elements with data-style="config", "config-center", or "config-right" that are not labels (i.e. value text). Leave blank to keep SVG styling.' },
          card_value_font_size: { label: 'Card Value Font Size', helper: 'Default font size for SVG elements with data-style="config", "config-center", or "config-right" that are not labels (e.g. 14 or 14px).' },
          card_background_color: { label: 'Card Background Color', helper: 'Default fill color for SVG elements with data-style="config" and data-role="card". Leave blank to keep SVG styling.' },
          card_label_css: { label: 'Additional Label CSS', helper: 'Extra CSS declarations applied to all config-styled label elements (e.g. font-weight: bold; letter-spacing: 0.05em). Only safe text-styling properties are accepted.' },
          card_value_css: { label: 'Additional Value CSS', helper: 'Extra CSS declarations applied to all config-styled value elements (e.g. font-weight: bold; letter-spacing: 0.05em). Only safe text-styling properties are accepted.' },
          font_family: { label: 'Font Family', helper: 'CSS font-family used for all SVG text (e.g., sans-serif, Roboto, "Segoe UI").' },
          odometer_font_family: { label: 'Odometer Font Family (Monospace)', helper: 'Font family used only for odometer-animated values. Leave blank to reuse Font Family. Tip: pick a monospace variant (e.g., "Roboto Mono" or "Space Mono").' },
          background: { label: 'Background', helper: 'Path to the background SVG (e.g., /local/community/advanced-energy-card/tech.svg). Day/night appearance is controlled by the SVG itself via Day/Night Mode below.' },
          night_mode: { label: 'Day/Night Mode', helper: 'Select Day, Night, or Auto. Auto uses sun.sun: above_horizon = Day, below_horizon = Night.' },
          language: { label: 'Language', helper: 'Choose the editor language.' },
          display_unit: { label: 'Display Unit', helper: 'Unit used when formatting power values.' },
          update_interval: { label: 'Update Interval', helper: 'Refresh cadence for card updates (0 disables throttling).' },
          initial_configuration: { label: 'Initial Configuration', helper: 'Show the Initial Configuration section in the editor.' },
          initial_has_pv: { label: 'Do you have Solar/PV Power?', helper: 'Select Yes if you have solar production to configure.' },
          initial_inverters: { label: 'How many inverters do you have?', helper: 'Shown only when Solar/PV is enabled.' },
          initial_has_battery: { label: 'Do you have Battery storage?', helper: '' },
          initial_battery_count: { label: 'How many Batteries do you have? Maximum 4', helper: '' },
          initial_has_grid: { label: 'Do you have Grid supplied electricity?', helper: '' },
          initial_can_export: { label: 'Can you export excess electricity to the grid?', helper: '' },
          initial_has_windmill: { label: 'Do you have a Windmill?', helper: '' },
          initial_has_ev: { label: 'Do you have Electric Vehicles/EV\'s?', helper: '' },
          initial_ev_count: { label: 'How many do you have?', helper: '' },
          initial_config_items_title: { label: 'Required configuration items', helper: '' },
          initial_config_items_helper: { label: 'These items become relevant based on your answers above.', helper: '' },
          initial_config_items_empty: { label: 'No items to show yet.', helper: '' },
          initial_config_complete_helper: { label: 'This completes the last required minimum configuration. Once clicking on the Complete button, please review all menus to check for additional items and popup configurations. This initial configuration can be re-enabled in the General menu.', helper: '' },
          initial_config_complete_button: { label: 'Complete', helper: '' },
          array_helper_text: { label: 'Each Array must have at minimum a combined Solar/PV total sensor which is the total power output of that Array or individual string values which are added together to get the total power output of the array. Daily production can be supplied and can be shown in a Daily production card.', helper: '' },
          animation_speed_factor: { label: 'Animation Speed Factor', helper: 'Adjust animation speed multiplier (-3x to 3x). Set 0 to pause; negatives reverse direction.' },
          animation_style: { label: 'Day Animation Style', helper: 'Flow animation style used when the card is in Day mode.' },
          night_animation_style: { label: 'Night Animation Style', helper: 'Flow animation style used when the card is in Night mode. Leave blank to use the Day style.' },
          dashes_glow_intensity: { label: 'Dash Glow Intensity', helper: 'Controls glow strength for "Dashes + Glow" (0 disables glow).' },
          fluid_flow_outer_glow: { label: 'Fluid Flow Outer Glow', helper: 'Enable the extra outer haze/glow layer for animation_style: fluid_flow.' },
          flow_stroke_width: { label: 'Flow Stroke Width (px)', helper: 'Optional override for the animated flow stroke width (no SVG edits). Leave blank to keep SVG defaults.' },
          fluid_flow_stroke_width: { label: 'Fluid Flow Stroke Width (px)', helper: 'Base stroke width for animation_style: fluid_flow. Overlay/mask widths are derived from this (default 5).' },
          arrow_scale: { label: 'Arrow Scale', helper: 'Extra size multiplier for the arrows in the "Arrows" animation style. Arrows already scale automatically with Flow Stroke Width; increase if still too small, decrease if too large.' },
          sensor_pv_total: { label: 'PV Total Sensor', helper: 'Optional aggregate production sensor displayed as the combined line.' },
          sensor_pv_total_secondary: { label: 'PV Total Sensor (Inverter 2)', helper: 'Optional second inverter total; added to the PV total when provided.' },
          sensor_windmill_total: { label: 'Windmill Total', helper: 'Power sensor for the windmill generator (W). When not configured the windmill SVG group is hidden.' },
          sensor_windmill_daily: { label: 'Daily Windmill Production', helper: 'Optional sensor reporting daily windmill production totals.' },
          sensor_pv1: { label: 'PV String 1 (Array 1)', helper: 'Array 1 solar production sensor for string 1.' },
          sensor_pv2: { label: 'PV String 2 (Array 1)', helper: 'Array 1 solar production sensor for string 2.' },
          sensor_pv3: { label: 'PV String 3 (Array 1)', helper: 'Array 1 solar production sensor for string 3.' },
          sensor_pv4: { label: 'PV String 4 (Array 1)', helper: 'Array 1 solar production sensor for string 4.' },
          sensor_pv5: { label: 'PV String 5 (Array 1)', helper: 'Array 1 solar production sensor for string 5.' },
          sensor_pv6: { label: 'PV String 6 (Array 1)', helper: 'Array 1 solar production sensor for string 6.' },
          sensor_pv_array2_1: { label: 'PV String 1 (Array 2)', helper: 'Array 2 solar production sensor for string 1.' },
          sensor_pv_array2_2: { label: 'PV String 2 (Array 2)', helper: 'Array 2 solar production sensor for string 2.' },
          sensor_pv_array2_3: { label: 'PV String 3 (Array 2)', helper: 'Array 2 solar production sensor for string 3.' },
          sensor_pv_array2_4: { label: 'PV String 4 (Array 2)', helper: 'Array 2 solar production sensor for string 4.' },
          sensor_pv_array2_5: { label: 'PV String 5 (Array 2)', helper: 'Array 2 solar production sensor for string 5.' },
          sensor_pv_array2_6: { label: 'PV String 6 (Array 2)', helper: 'Array 2 solar production sensor for string 6.' },
          sensor_daily: { label: 'Daily Production Sensor', helper: 'Sensor reporting daily production totals. Either the PV total sensor or your PV string arrays need to be specified as a minimum.' },
          sensor_daily_array2: { label: 'Daily Production Sensor (Array 2)', helper: 'Sensor reporting daily production totals for Array 2.' },
          sensor_bat1_soc: { label: 'Battery 1 SOC', helper: 'State of Charge sensor for Battery 1 (percentage).' },
          sensor_bat1_power: { label: 'Battery 1 Power', helper: 'Provide this combined power sensor or both charge/discharge sensors so Battery 1 becomes active.', helperByProfile: { overview: 'Provide the combined power sensor for all batteries.' } },
          sensor_bat1_charge_power: { label: 'Battery 1 Charge Power', helper: 'Sensor for Battery 1 charging power.' },
          sensor_bat1_discharge_power: { label: 'Battery 1 Discharge Power', helper: 'Sensor for Battery 1 discharging power.' },
          sensor_bat1_capacity_sensor: { label: 'Battery 1 Usable Capacity Sensor', helper: 'Optional sensor entity reporting Battery 1 usable capacity in Wh or kWh. Used with reserve percentage to calculate effective capacity.' },
          bat1_capacity_manual: { label: 'Battery 1 Usable Capacity (Manual)', helper: 'Alternative manual entry for Battery 1 usable capacity. Enter value in the units specified by your display_unit setting (Wh or kWh). Ignored if capacity sensor is provided.' },
          bat1_reserve_percentage: { label: 'Battery 1 Reserve Percentage', helper: 'Optional reserve percentage for Battery 1 (0-100). Some systems maintain a reserve to preserve battery health. This reduces the effective usable capacity displayed.' },
          sensor_battery1_temp: { label: 'Battery 1 Temperature Sensor', helper: 'Temperature sensor for Battery 1 (linked to data-role="battery1-temp").' },
          battery1_temp_font_size: { label: 'Battery 1 Temp Font Size (px)', helper: 'Font size for Battery 1 temperature text. Default 8' },
          battery1_temp_color: { label: 'Battery 1 Temp Text Color', helper: 'Color applied to the Battery 1 temperature text.' },
          sensor_bat1_time_until: { label: 'Battery 1 Time Until Sensor', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_bat2_soc: { label: 'Battery 2 SOC', helper: 'State of Charge sensor for Battery 2 (percentage).' },
          sensor_bat2_power: { label: 'Battery 2 Power', helper: 'Provide this combined power sensor or both charge/discharge sensors so Battery 2 becomes active.' },
          sensor_bat2_charge_power: { label: 'Battery 2 Charge Power', helper: 'Sensor for Battery 2 charging power.' },
          sensor_bat2_discharge_power: { label: 'Battery 2 Discharge Power', helper: 'Sensor for Battery 2 discharging power.' },
          sensor_bat2_capacity_sensor: { label: 'Battery 2 Usable Capacity Sensor', helper: 'Optional sensor entity reporting Battery 2 usable capacity in Wh or kWh. Used with reserve percentage to calculate effective capacity.' },
          bat2_capacity_manual: { label: 'Battery 2 Usable Capacity (Manual)', helper: 'Alternative manual entry for Battery 2 usable capacity. Enter value in the units specified by your display_unit setting (Wh or kWh). Ignored if capacity sensor is provided.' },
          bat2_reserve_percentage: { label: 'Battery 2 Reserve Percentage', helper: 'Optional reserve percentage for Battery 2 (0-100). Some systems maintain a reserve to preserve battery health. This reduces the effective usable capacity displayed.' },
          sensor_bat2_time_until: { label: 'Battery 2 Time Until Sensor', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_bat3_soc: { label: 'Battery 3 SOC', helper: 'State of Charge sensor for Battery 3 (percentage).' },
          sensor_bat3_power: { label: 'Battery 3 Power', helper: 'Provide this combined power sensor or both charge/discharge sensors so Battery 3 becomes active.' },
          sensor_bat3_charge_power: { label: 'Battery 3 Charge Power', helper: 'Sensor for Battery 3 charging power.' },
          sensor_bat3_discharge_power: { label: 'Battery 3 Discharge Power' },
          sensor_bat3_capacity_sensor: { label: 'Battery 3 Usable Capacity Sensor', helper: 'Optional sensor entity reporting Battery 3 usable capacity in Wh or kWh. Used with reserve percentage to calculate effective capacity.' },
          bat3_capacity_manual: { label: 'Battery 3 Usable Capacity (Manual)', helper: 'Alternative manual entry for Battery 3 usable capacity. Enter value in the units specified by your display_unit setting (Wh or kWh). Ignored if capacity sensor is provided.' },
          bat3_reserve_percentage: { label: 'Battery 3 Reserve Percentage', helper: 'Optional reserve percentage for Battery 3 (0-100). Some systems maintain a reserve to preserve battery health. This reduces the effective usable capacity displayed.' },
          sensor_bat3_time_until: { label: 'Battery 3 Time Until Sensor', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_bat4_soc: { label: 'Battery 4 SOC', helper: 'State of Charge sensor for Battery 4 (percentage).' },
          sensor_bat4_power: { label: 'Battery 4 Power', helper: 'Provide this combined power sensor or both charge/discharge sensors so Battery 4 becomes active.' },
          sensor_bat4_charge_power: { label: 'Battery 4 Charge Power', helper: 'Sensor for Battery 4 charging power.' },
          sensor_bat4_discharge_power: { label: 'Battery 4 Discharge Power', helper: 'Sensor for Battery 4 discharging power.' },
          sensor_bat4_capacity_sensor: { label: 'Battery 4 Usable Capacity Sensor', helper: 'Optional sensor entity reporting Battery 4 usable capacity in Wh or kWh. Used with reserve percentage to calculate effective capacity.' },
          bat4_capacity_manual: { label: 'Battery 4 Usable Capacity (Manual)', helper: 'Alternative manual entry for Battery 4 usable capacity. Enter value in the units specified by your display_unit setting (Wh or kWh). Ignored if capacity sensor is provided.' },
          bat4_reserve_percentage: { label: 'Battery 4 Reserve Percentage', helper: 'Optional reserve percentage for Battery 4 (0-100). Some systems maintain a reserve to preserve battery health. This reduces the effective usable capacity displayed.' },
          sensor_bat4_time_until: { label: 'Battery 4 Time Until Sensor', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_home_load: { label: 'Home Load/Consumption (Required)', helper: 'Total household consumption sensor.' },
          sensor_home_load_secondary: { label: 'Home Load (Inverter 2)', helper: 'Optional house load sensor for the second inverter.' },
          sensor_heat_pump_consumption: { label: 'Heat Pump Consumption', helper: 'Sensor for heat pump energy consumption.' },
          sensor_hot_water_consumption: { label: 'Water Heating', helper: 'Sensor for Hot Water Heating Load.' },
          sensor_pool_consumption: { label: 'Pool', helper: 'Sensor for pool power/consumption.' },
          sensor_washing_machine_consumption: { label: 'Washing Machine', helper: 'Sensor for washing machine power/consumption.' },
          sensor_dishwasher_consumption: { label: 'Dish Washer', helper: 'Sensor for Dish Washer Load.' },
          sensor_dryer_consumption: { label: 'Dryer', helper: 'Sensor for dryer power/consumption.' },
          sensor_refrigerator_consumption: { label: 'Refrigerator', helper: 'Sensor for refrigerator power/consumption.' },
          sensor_freezer_consumption: { label: 'Freezer', helper: 'Sensor for freezer power/consumption.' },
          hot_water_text_color: { label: 'Water Heating Text Color', helper: 'Color applied to the hot water power text.' },
          dishwasher_text_color: { label: 'Dish Washer Text Color', helper: 'Color applied to the dish washer power text.' },
          hot_water_font_size: { label: 'Water Heating Font Size (px)', helper: 'Default 8' },
          dishwasher_font_size: { label: 'Dish Washer Font Size (px)', helper: 'Default 8' },
          sensor_grid_power: { label: 'Grid Inverter 1 Power', helper: 'Positive/negative grid flow sensor for inverter 1. Specify either this sensor or both Grid Inverter 1 Import Sensor and Grid Inverter 1 Export Sensor.' },
          sensor_grid_import: { label: 'Grid Inverter 1 Import Sensor', helper: 'Optional entity reporting inverter 1 grid import (positive) power.' },
          sensor_grid_export: { label: 'Grid Inverter 1 Export Sensor', helper: 'Optional entity reporting inverter 1 grid export (positive) power.' },
          sensor_grid_import_daily: { label: 'Daily Grid Inverter 1 Import Sensor', helper: 'Optional entity reporting cumulative inverter 1 grid import for the current day.' },
          sensor_grid_export_daily: { label: 'Daily Grid Inverter 1 Export Sensor', helper: 'Optional entity reporting cumulative inverter 1 grid export for the current day.' },
          sensor_grid2_power: { label: 'Grid Inverter 2 Power', helper: 'Positive/negative grid flow sensor for inverter 2. Specify either this sensor or both Grid Inverter 2 Import Sensor and Grid Inverter 2 Export Sensor.' },
          sensor_grid2_import: { label: 'Grid Inverter 2 Import Sensor', helper: 'Optional entity reporting inverter 2 grid import (positive) power.' },
          sensor_grid2_export: { label: 'Grid Inverter 2 Export Sensor', helper: 'Optional entity reporting inverter 2 grid export (positive) power.' },
          sensor_grid2_import_daily: { label: 'Daily Grid Inverter 2 Import Sensor', helper: 'Optional entity reporting cumulative inverter 2 grid import for the current day.' },
          sensor_grid2_export_daily: { label: 'Daily Grid Inverter 2 Export Sensor', helper: 'Optional entity reporting cumulative inverter 2 grid export for the current day.' },
          show_daily_grid: { label: 'Show Daily Grid Values', helper: 'Show the daily import/export totals under the current grid flow when enabled.' },
          grid_daily_font_size: { label: 'Daily Grid Font Size (px)', helper: 'Optional override for daily grid import/export text. Defaults to Grid Font Size.' },
          grid_current_odometer: { label: 'Odometer: Grid Current', helper: 'Animate Grid Current with a per-digit rolling effect.' },
          grid_current_odometer_duration: { label: 'Odometer Duration (ms)', helper: 'Animation duration in milliseconds. Default 350.' },
          show_grid_flow_label: { label: 'Show Grid Import/Export Name', helper: 'Prepend the importing/exporting label before the grid value when enabled.' },
          sensor_grid_state: { label: 'Grid State Sensor', helper: 'Sensor entity for grid state text (linked to data-role="grid-state").' },
          grid_state_importing_color: { label: 'Grid State Importing Color', helper: 'Color when grid state is importing.' },
          grid_state_exporting_color: { label: 'Grid State Exporting Color', helper: 'Color when grid state is exporting.' },
          grid_state_floating_color: { label: 'Grid State Floating Color', helper: 'Color when grid state is floating.' },
          grid_state_font_size: { label: 'Grid State Font Size (px)', helper: 'Default 8' },
          sensor_solar_state: { label: 'Solar State Sensor', helper: 'Sensor entity for solar state text (linked to data-role="solar-state"). Returns "Producing Power" or "Not Producing".' },
          solar_state_producing_color: { label: 'Solar State Producing Color', helper: 'Color when solar state is Producing Power.' },
          solar_state_not_producing_color: { label: 'Solar State Not Producing Color', helper: 'Color when solar state is Not Producing.' },
          solar_state_font_size: { label: 'Solar State Font Size (px)', helper: 'Default 8' },
          sensor_solar_forecast_today: { label: 'Solar Forecast Today Sensor', helper: 'Sensor entity for today\'s solar energy forecast (linked to data-role="solar-forecast-today").' },
          sensor_solar_forecast_tomorrow: { label: 'Solar Forecast Tomorrow Sensor', helper: 'Sensor entity for tomorrow\'s solar energy forecast (linked to data-role="solar-forecast-tomorrow").' },
          sensor_weather_icon: { label: 'Weather Icon Sensor', helper: 'Sensor entity for weather icon text (linked to data-role="weather-icon").' },
          weather_icon_color: { label: 'Weather Icon Color', helper: 'Color applied to the weather icon text.' },
          weather_icon_font_size: { label: 'Weather Icon Font Size (px)', helper: 'Default 8' },
          sensor_weather_forecast: { label: 'Weather Forecast Sensor', helper: 'Sensor entity for weather forecast text (linked to data-role="weather-forecast").' },
          weather_forecast_color: { label: 'Weather Forecast Color', helper: 'Color applied to the weather forecast text.' },
          weather_forecast_font_size: { label: 'Weather Forecast Font Size (px)', helper: 'Default 8' },
          sun_moon_display: { label: 'Sun/Moon Display', helper: 'Show a sun or moon tracking the day/night cycle. Off = hidden, Sun Only = daytime sun, Sun & Moon = sun by day, moon by night.' },
          sun_moon_arc_color: { label: 'Arc Path Color', helper: 'Stroke color for the sun/moon arc path. Leave blank for none (invisible).' },
          sun_moon_arc_stroke_width: { label: 'Arc Path Stroke Width', helper: 'Stroke width (px) for the sun/moon arc path.' },
          sun_moon_label_color: { label: 'Sunrise/Sunset Label Color', helper: 'Color for the sunrise and sunset time labels. Leave blank to use the sun/moon icon color.' },
          sun_moon_label_font_size: { label: 'Sunrise/Sunset Label Font Size', helper: 'Font size (px) for the sunrise and sunset time and label text. Leave blank for default.' },
          sun_moon_sunrise_label: { label: 'Sunrise Label Text', helper: 'Custom text for the sunrise label. Leave blank to use SVG default.' },
          sun_moon_sunset_label: { label: 'Sunset Label Text', helper: 'Custom text for the sunset label. Leave blank to use SVG default.' },
          stats_value_color: { label: 'Stats Value Color', helper: 'Color applied to all stat values.' },
          stats_value_font_size: { label: 'Stats Value Font Size (px)', helper: 'Font size for all stat values. Default 14' },
          stats_label_color: { label: 'Stats Label Color', helper: 'Color applied to all stat labels.' },
          stats_label_font_size: { label: 'Stats Label Font Size (px)', helper: 'Font size for all stat labels. Default 12' },
          inverter1_status_text_color: { label: 'Inverter Status Text Color', helper: 'Color applied to the inverter status text (Charging/Discharging/Importing/Exporting).' },
          inverter1_status_font_size: { label: 'Inverter Status Font Size (px)', helper: 'Font size for inverter status text. Default 8' },
          sensor_inverter1_temp: { label: 'Inverter 1 Temperature Sensor', helper: 'Temperature sensor for Inverter 1 (linked to data-role="inverter1-temp").' },
          inverter1_temp_font_size: { label: 'Inverter 1 Temp Font Size (px)', helper: 'Font size for Inverter 1 temperature text. Default 8' },
          inverter1_temp_color: { label: 'Inverter 1 Temp Text Color', helper: 'Color applied to the Inverter 1 temperature text.' },
          enable_echo_alive: { label: 'Enable Echo Alive', helper: 'Enables an invisible iframe to keep the Silk browser open on Echo Show. The button will be positioned in a corner of the card.' },
          pv_tot_color: { label: 'PV Total Color', helper: 'Colour applied to the PV TOTAL text line.' },
          pv_primary_color: { label: 'PV 1 Flow Color', helper: 'Colour used for the primary PV animation line.' },
          pv_secondary_color: { label: 'PV 2 Flow Color', helper: 'Colour used for the secondary PV animation line when available.' },
          load_flow_color: { label: 'Load Flow Color', helper: 'Colour applied to the home load animation line.' },
          load_text_color: { label: 'Load Text Color', helper: 'Colour applied to the home load text when thresholds are inactive.' },
          house_total_color: { label: 'House Total Color', helper: 'Colour applied to the HOUSE TOT text/flow.' },
          inv1_color: { label: 'Inverter 1 to House Color', helper: 'Color applied to the flow from Inverter 1 to the house.' },
          inv2_color: { label: 'Inverter 2 to House Color', helper: 'Color applied to the flow from Inverter 2 to the house.' },
          load_threshold_warning: { label: 'Load Warning Threshold', helper: 'Change load color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          load_warning_color: { label: 'Load Warning Color', helper: 'Hex or CSS color applied at the load warning threshold.' },
          load_threshold_critical: { label: 'Load Critical Threshold', helper: 'Change load color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          load_critical_color: { label: 'Load Critical Color', helper: 'Hex or CSS color applied at the load critical threshold.' },
          battery_soc_color: { label: 'Battery SOC Color', helper: 'Hex color applied to the battery SOC percentage text.' },
          battery_charge_color: { label: 'Battery Charge Flow Color', helper: 'Colour used when energy is flowing into the battery.' },
          battery_discharge_color: { label: 'Battery Discharge Flow Color', helper: 'Colour used when energy is flowing from the battery.' },
          grid_import_color: { label: 'Inverter 1 Grid Import Flow Color', helper: 'Base colour before thresholds when inverter 1 is importing from the grid.' },
          grid_export_color: { label: 'Inverter 1 Grid Export Flow Color', helper: 'Base colour before thresholds when inverter 1 is exporting to the grid.' },
          grid2_import_color: { label: 'Inverter 2 Grid Import Flow Color', helper: 'Base colour before thresholds when inverter 2 is importing from the grid.' },
          grid2_export_color: { label: 'Inverter 2 Grid Export Flow Color', helper: 'Base colour before thresholds when inverter 2 is exporting to the grid.' },
          car_flow_color: { label: 'EV Flow Color', helper: 'Colour applied to the electric vehicle animation line.' },
          battery_fill_high_color: { label: 'Battery Fill (Normal) Color', helper: 'Liquid fill colour when the battery SOC is above the low threshold.' },
          battery_fill_low_color: { label: 'Battery Fill (Low) Color', helper: 'Liquid fill colour when the battery SOC is at or below the low threshold.' },
          battery_fill_low_threshold: { label: 'Battery Low Fill Threshold (%)', helper: 'Use the low fill colour when SOC is at or below this percentage.' },
          battery_fill_opacity: { label: 'Battery Fill Opacity', helper: 'Opacity for the battery fill level (0-1).' },
          grid_activity_threshold: { label: 'Grid Animation Threshold (W)', helper: 'Ignore grid flows whose absolute value is below this wattage before animating.' },
          grid_power_only: { label: 'Grid Power Only', helper: 'Hide inverter/battery flows and show a direct grid-to-house flow.' },
          grid_threshold_warning: { label: 'Inverter 1 Grid Warning Threshold', helper: 'Change inverter 1 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid_warning_color: { label: 'Inverter 1 Grid Warning Color', helper: 'Hex or CSS color applied at the inverter 1 warning threshold.' },
          grid_threshold_critical: { label: 'Inverter 1 Grid Critical Threshold', helper: 'Change inverter 1 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid_critical_color: { label: 'Inverter 1 Grid Critical Color', helper: 'Hex or CSS color applied at the inverter 1 critical threshold.' },
          grid2_threshold_warning: { label: 'Inverter 2 Grid Warning Threshold', helper: 'Change inverter 2 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid2_warning_color: { label: 'Inverter 2 Grid Warning Color', helper: 'Hex or CSS color applied at the inverter 2 warning threshold.' },
          grid2_threshold_critical: { label: 'Inverter 2 Grid Critical Threshold', helper: 'Change inverter 2 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid2_critical_color: { label: 'Inverter 2 Grid Critical Color', helper: 'Hex or CSS color applied at the inverter 2 critical threshold.' },
          invert_grid: { label: 'Invert Grid Values', helper: 'Enable if import/export polarity is reversed.' },
          invert_battery: { label: 'Invert Battery Values', helper: 'Enable if charge/discharge polarity is reversed.' },
          invert_bat1: { label: 'Invert Battery 1 Values', helper: 'Enable if Battery 1 charge/discharge polarity is reversed.' },
          invert_bat2: { label: 'Invert Battery 2 Values', helper: 'Enable if Battery 2 charge/discharge polarity is reversed.' },
          invert_bat3: { label: 'Invert Battery 3 Values', helper: 'Enable if Battery 3 charge/discharge polarity is reversed.' },
          sensor_car_power: { label: 'Car 1 Power Sensor', helper: 'Sensor for EV charge/discharge power.' },
          sensor_car_soc: { label: 'Car 1 SOC Sensor', helper: 'State of Charge sensor for EV 1 (percentage).' },
          sensor_car_range: { label: 'Car 1 Range Sensor', helper: 'Sensor entity for EV 1 range (linked to data-role="car1-range").' },
          sensor_car_state: { label: 'Car 1 Charging State Sensor', helper: 'Sensor entity for EV 1 charging state text (linked to data-role="car1-state").' },
          sensor_car_hvac_status: { label: 'Car 1 HVAC Status Sensor', helper: 'Sensor entity for EV 1 HVAC/climate status (linked to data-role="car1-hvac-status").' },
          sensor_car_outside_temp: { label: 'Car 1 Outside Temperature Sensor', helper: 'Sensor entity for EV 1 outside temperature (linked to data-role="car1-outside-temp").' },
          sensor_car_inside_temp: { label: 'Car 1 Inside Temperature Sensor', helper: 'Sensor entity for EV 1 inside/cabin temperature (linked to data-role="car1-inside-temp").' },
          sensor_car_ac_temp: { label: 'Car 1 AC Temperature Sensor', helper: 'Sensor entity for EV 1 AC set temperature (linked to data-role="car1-ac-temp").' },
          car1_climate_entity: { label: 'Car 1 HVAC Climate Entity', helper: 'Climate entity for EV 1 HVAC control (climate domain only).' },
          car_soc: { label: 'Car SOC', helper: 'Sensor for EV battery SOC (percentage).' },
          car_charger_power: { label: 'Car Charger Power', helper: 'Sensor for EV charger power.' },
          car1_label: { label: 'Car 1 Label', helper: 'Text displayed next to the first EV values.' },
          sensor_car2_power: { label: 'Car 2 Power Sensor', helper: 'Sensor for EV 2 charge/discharge power.' },
          car2_power: { label: 'Car 2 Power', helper: 'Sensor for EV 2 charge/discharge power.' },
          sensor_car2_soc: { label: 'Car 2 SOC Sensor', helper: 'State of Charge sensor for EV 2 (percentage).' },
          sensor_car2_range: { label: 'Car 2 Range Sensor', helper: 'Sensor entity for EV 2 range (linked to data-role="car2-range").' },
          sensor_car2_state: { label: 'Car 2 Charging State Sensor', helper: 'Sensor entity for EV 2 charging state text (linked to data-role="car2-state").' },
          sensor_car2_hvac_status: { label: 'Car 2 HVAC Status Sensor', helper: 'Sensor entity for EV 2 HVAC/climate status (linked to data-role="car2-hvac-status").' },
          sensor_car2_outside_temp: { label: 'Car 2 Outside Temperature Sensor', helper: 'Sensor entity for EV 2 outside temperature (linked to data-role="car2-outside-temp").' },
          sensor_car2_inside_temp: { label: 'Car 2 Inside Temperature Sensor', helper: 'Sensor entity for EV 2 inside/cabin temperature (linked to data-role="car2-inside-temp").' },
          sensor_car2_ac_temp: { label: 'Car 2 AC Temperature Sensor', helper: 'Sensor entity for EV 2 AC set temperature (linked to data-role="car2-ac-temp").' },
          car2_climate_entity: { label: 'Car 2 HVAC Climate Entity', helper: 'Climate entity for EV 2 HVAC control (climate domain only).' },
          car2_soc: { label: 'Car 2 SOC', helper: 'Sensor for EV 2 battery SOC (percentage).' },
          car2_charger_power: { label: 'Car 2 Charger Power', helper: 'Sensor for EV 2 charger power.' },
          car2_label: { label: 'Car 2 Label', helper: 'Text displayed next to the second EV values.' },
          car_headlight_flash: { label: 'Headlight Flash While Charging', helper: 'Enable to flash the EV headlights whenever charging is detected.' },
          car1_glow_brightness: { label: 'Car Glow Effect', helper: 'Percentage the car flow effects show while not charging.' },
          car2_glow_brightness: { label: 'Car Glow Effect', helper: 'Percentage the car flow effects show while not charging.' },
          car_pct_color: { label: 'Car SOC Color', helper: 'Hex color for EV SOC text (e.g., #00FFFF).' },
          car2_pct_color: { label: 'Car 2 SOC Color', helper: 'Hex color for second EV SOC text (falls back to Car SOC Color).' },
          car1_name_color: { label: 'Car 1 Name Color', helper: 'Color applied to the Car 1 name label.' },
          car2_name_color: { label: 'Car 2 Name Color', helper: 'Color applied to the Car 2 name label.' },
          car1_color: { label: 'Car 1 Color', helper: 'Color applied to Car 1 power value.' },
          car2_color: { label: 'Car 2 Color', helper: 'Color applied to Car 2 power value.' },
          heat_pump_label: { label: 'Heat Pump Label', helper: 'Custom label for the heat pump/AC line (defaults to "Heat Pump/AC").' },
          heat_pump_text_color: { label: 'Heat Pump Text Color', helper: 'Color applied to the heat pump power text.' },
          pool_flow_color: { label: 'Pool Flow Color', helper: 'Color applied to the pool flow animation.' },
          pool_text_color: { label: 'Pool Text Color', helper: 'Color applied to the pool power text.' },
          washing_machine_text_color: { label: 'Washing Machine Text Color', helper: 'Color applied to the washing machine power text.' },
          dryer_text_color: { label: 'Dryer Text Color', helper: 'Color applied to the dryer power text.' },
          refrigerator_text_color: { label: 'Refrigerator Text Color', helper: 'Color applied to the refrigerator power text.' },
          freezer_text_color: { label: 'Freezer Text Color', helper: 'Color applied to the freezer power text.' },
          windmill_flow_color: { label: 'Windmill Flow Color', helper: 'Color applied to the windmill flow (data-flow-key="windmill-inverter1" / "windmill-inverter2").' },
          windmill_text_color: { label: 'Windmill Text Color', helper: 'Color applied to the windmill power text' },
          header_font_size: { label: 'Header Font Size (px)', helper: 'Default 8' },
          daily_label_font_size: { label: 'Daily Label Font Size (px)', helper: 'Default 8' },
          daily_value_font_size: { label: 'Daily Value Font Size (px)', helper: 'Default 20' },
          pv_font_size: { label: 'PV Text Font Size (px)', helper: 'Default 8' },
          windmill_power_font_size: { label: 'Windmill Power Font Size (px)', helper: 'Default 8' },
          battery_soc_font_size: { label: 'Battery SOC Font Size (px)', helper: 'Default 20' },
          battery_time_until_color: { label: 'Battery Time Until Color', helper: 'Hex color applied to the time until full/flat text.' },
          battery_time_until_font_size: { label: 'Battery Time Until Font Size (px)', helper: 'Default 8' },
          sensor_bat1_state: { label: 'Battery 1 State Sensor', helper: 'Sensor entity for battery 1 state text (linked to data-role="battery1-state").' },
          sensor_bat2_state: { label: 'Battery 2 State Sensor', helper: 'Sensor entity for battery 2 state text (linked to data-role="battery2-state").' },
          sensor_bat3_state: { label: 'Battery 3 State Sensor', helper: 'Sensor entity for battery 3 state text (linked to data-role="battery3-state").' },
          sensor_bat4_state: { label: 'Battery 4 State Sensor', helper: 'Sensor entity for battery 4 state text (linked to data-role="battery4-state").' },
          battery_state_fully_charged_color: { label: 'Battery State: Fully Charged Color', helper: 'Color when battery state is Fully Charged.' },
          battery_state_charging_color: { label: 'Battery State: Charging Color', helper: 'Color when battery state is Charging.' },
          battery_state_discharging_color: { label: 'Battery State: Discharging Color', helper: 'Color when battery state is Discharging.' },
          battery_state_reserve_color: { label: 'Battery State: Reserve Color', helper: 'Color when battery state is Reserve.' },
          battery_state_fully_discharged_color: { label: 'Battery State: Fully Discharged Color', helper: 'Color when battery state is Fully Discharged.' },
          battery_state_font_size: { label: 'Battery State Font Size (px)', helper: 'Default 8' },
          battery_power_font_size: { label: 'Battery Power Font Size (px)', helper: 'Default 8' },
          inv1_datetime_color: { label: 'Inverter 1 DateTime Color', helper: 'Color for Inverter 1 battery datetime display' },
          inv1_datetime_font_size: { label: 'Inverter 1 DateTime Font Size (px)', helper: 'Font size for Inverter 1 battery datetime. Default 8' },
          inv1_timeuntil_color: { label: 'Inverter 1 Time Until Color', helper: 'Color for Inverter 1 battery time until display' },
          inv1_timeuntil_font_size: { label: 'Inverter 1 Time Until Font Size (px)', helper: 'Font size for Inverter 1 battery time until. Default 8' },
          inv2_datetime_color: { label: 'Inverter 2 DateTime Color', helper: 'Color for Inverter 2 battery datetime display' },
          inv2_datetime_font_size: { label: 'Inverter 2 DateTime Font Size (px)', helper: 'Font size for Inverter 2 battery datetime. Default 8' },
          inv2_timeuntil_color: { label: 'Inverter 2 Time Until Color', helper: 'Color for Inverter 2 battery time until display' },
          inv2_timeuntil_font_size: { label: 'Inverter 2 Time Until Font Size (px)', helper: 'Font size for Inverter 2 battery time until. Default 8' },
          load_font_size: { label: 'Load Font Size (px)', helper: 'Default 8' },
          inv1_power_font_size: { label: 'INV 1 Power Font Size (px)', helper: 'Font size for the INV 1 power line. Default uses Load Font Size.' },
          inv2_power_font_size: { label: 'INV 2 Power Font Size (px)', helper: 'Font size for the INV 2 power line. Default uses Load Font Size.' },
          heat_pump_font_size: { label: 'Heat Pump Font Size (px)', helper: 'Default 8' },
          pool_font_size: { label: 'Pool Font Size (px)', helper: 'Default 8' },
          washing_machine_font_size: { label: 'Washing Machine Font Size (px)', helper: 'Default 8' },
          dryer_font_size: { label: 'Dryer Font Size (px)', helper: 'Default 8' },
          refrigerator_font_size: { label: 'Refrigerator Font Size (px)', helper: 'Default 8' },
          freezer_font_size: { label: 'Freezer Font Size (px)', helper: 'Default 8' },
          grid_font_size: { label: 'Grid Font Size (px)', helper: 'Default 8' },
          car_power_font_size: { label: 'Car Power Font Size (px)', helper: 'Default 8' },
          car2_power_font_size: { label: 'Car 2 Power Font Size (px)', helper: 'Default 8' },
          car_name_font_size: { label: 'Car Name Font Size (px)', helper: 'Default 8' },
          car2_name_font_size: { label: 'Car 2 Name Font Size (px)', helper: 'Default 8' },
          car_soc_font_size: { label: 'Car SOC Font Size (px)', helper: 'Default 8' },
          car2_soc_font_size: { label: 'Car 2 SOC Font Size (px)', helper: 'Default 8' },
          sensor_popup_pv_1: { label: 'PV Popup 1', helper: 'Entity for PV popup line 1.' },
          sensor_popup_pv_2: { label: 'PV Popup 2', helper: 'Entity for PV popup line 2.' },
          sensor_popup_pv_3: { label: 'PV Popup 3', helper: 'Entity for PV popup line 3.' },
          sensor_popup_pv_4: { label: 'PV Popup 4', helper: 'Entity for PV popup line 4.' },
          sensor_popup_pv_5: { label: 'PV Popup 5', helper: 'Entity for PV popup line 5.' },
          sensor_popup_pv_6: { label: 'PV Popup 6', helper: 'Entity for PV popup line 6.' },
          sensor_popup_pv_1_name: { label: 'PV Popup 1 Name', helper: 'Optional custom name for PV popup line 1. Leave blank to use entity name.' },
          sensor_popup_pv_2_name: { label: 'PV Popup 2 Name', helper: 'Optional custom name for PV popup line 2. Leave blank to use entity name.' },
          sensor_popup_pv_3_name: { label: 'PV Popup 3 Name', helper: 'Optional custom name for PV popup line 3. Leave blank to use entity name.' },
          sensor_popup_pv_4_name: { label: 'PV Popup 4 Name', helper: 'Optional custom name for PV popup line 4. Leave blank to use entity name.' },
          sensor_popup_pv_5_name: { label: 'PV Popup 5 Name', helper: 'Optional custom name for PV popup line 5. Leave blank to use entity name.' },
          sensor_popup_pv_6_name: { label: 'PV Popup 6 Name', helper: 'Optional custom name for PV popup line 6. Leave blank to use entity name.' },
          sensor_popup_pv_1_color: { label: 'PV Popup 1 Color', helper: 'Color for PV popup line 1 text.' },
          sensor_popup_pv_2_color: { label: 'PV Popup 2 Color', helper: 'Color for PV popup line 2 text.' },
          sensor_popup_pv_3_color: { label: 'PV Popup 3 Color', helper: 'Color for PV popup line 3 text.' },
          sensor_popup_pv_4_color: { label: 'PV Popup 4 Color', helper: 'Color for PV popup line 4 text.' },
          sensor_popup_pv_5_color: { label: 'PV Popup 5 Color', helper: 'Color for PV popup line 5 text.' },
          sensor_popup_pv_6_color: { label: 'PV Popup 6 Color', helper: 'Color for PV popup line 6 text.' },
          sensor_popup_pv_1_font_size: { label: 'PV Popup 1 Font Size (px)', helper: 'Font size for PV popup line 1. Default 8' },
          sensor_popup_pv_2_font_size: { label: 'PV Popup 2 Font Size (px)', helper: 'Font size for PV popup line 2. Default 8' },
          sensor_popup_pv_3_font_size: { label: 'PV Popup 3 Font Size (px)', helper: 'Font size for PV popup line 3. Default 8' },
          sensor_popup_pv_4_font_size: { label: 'PV Popup 4 Font Size (px)', helper: 'Font size for PV popup line 4. Default 8' },
          sensor_popup_pv_5_font_size: { label: 'PV Popup 5 Font Size (px)', helper: 'Font size for PV popup line 5. Default 8' },
          sensor_popup_pv_6_font_size: { label: 'PV Popup 6 Font Size (px)', helper: 'Font size for PV popup line 6. Default 8' },
          sensor_popup_house_1: { label: 'House Popup 1', helper: 'Entity for house popup line 1.' },
          sensor_popup_house_1_name: { label: 'House Popup 1 Name', helper: 'Optional custom name for house popup line 1. Leave blank to use entity name.' },
          sensor_popup_house_1_color: { label: 'House Popup 1 Color', helper: 'Color for house popup line 1 text.' },
          sensor_popup_house_1_font_size: { label: 'House Popup 1 Font Size (px)', helper: 'Font size for house popup line 1. Default 8' },
          sensor_popup_house_2: { label: 'House Popup 2', helper: 'Entity for house popup line 2.' },
          sensor_popup_house_2_name: { label: 'House Popup 2 Name', helper: 'Optional custom name for house popup line 2. Leave blank to use entity name.' },
          sensor_popup_house_2_color: { label: 'House Popup 2 Color', helper: 'Color for house popup line 2 text.' },
          sensor_popup_house_2_font_size: { label: 'House Popup 2 Font Size (px)', helper: 'Font size for house popup line 2. Default 8' },
          sensor_popup_house_3: { label: 'House Popup 3', helper: 'Entity for house popup line 3.' },
          sensor_popup_house_3_name: { label: 'House Popup 3 Name', helper: 'Optional custom name for house popup line 3. Leave blank to use entity name.' },
          sensor_popup_house_3_color: { label: 'House Popup 3 Color', helper: 'Color for house popup line 3 text.' },
          sensor_popup_house_3_font_size: { label: 'House Popup 3 Font Size (px)', helper: 'Font size for house popup line 3. Default 8' },
          sensor_popup_house_4: { label: 'House Popup 4', helper: 'Entity for house popup line 4.' },
          sensor_popup_house_4_name: { label: 'House Popup 4 Name', helper: 'Optional custom name for house popup line 4. Leave blank to use entity name.' },
          sensor_popup_house_4_color: { label: 'House Popup 4 Color', helper: 'Color for house popup line 4 text.' },
          sensor_popup_house_4_font_size: { label: 'House Popup 4 Font Size (px)', helper: 'Font size for house popup line 4. Default 8' },
          sensor_popup_house_5: { label: 'House Popup 5', helper: 'Entity for house popup line 5.' },
          sensor_popup_house_5_name: { label: 'House Popup 5 Name', helper: 'Optional custom name for house popup line 5. Leave blank to use entity name.' },
          sensor_popup_house_5_color: { label: 'House Popup 5 Color', helper: 'Color for house popup line 5 text.' },
          sensor_popup_house_5_font_size: { label: 'House Popup 5 Font Size (px)', helper: 'Font size for house popup line 5. Default 8' },
          sensor_popup_house_6: { label: 'House Popup 6', helper: 'Entity for house popup line 6.' },
          sensor_popup_house_6_name: { label: 'House Popup 6 Name', helper: 'Optional custom name for house popup line 6. Leave blank to use entity name.' },
          sensor_popup_house_6_color: { label: 'House Popup 6 Color', helper: 'Color for house popup line 6 text.' },
          sensor_popup_house_6_font_size: { label: 'House Popup 6 Font Size (px)', helper: 'Font size for house popup line 6. Default 8' },
          sensor_popup_car1_1: { label: 'Car 1 Popup 1', helper: 'Entity for car 1 popup line 1.' },
          sensor_popup_car1_1_name: { label: 'Car 1 Popup 1 Name', helper: 'Optional custom name for car 1 popup line 1. Leave blank to use entity name.' },
          sensor_popup_car1_1_color: { label: 'Car 1 Popup 1 Color', helper: 'Color for car 1 popup line 1 text.' },
          sensor_popup_car1_1_font_size: { label: 'Car 1 Popup 1 Font Size (px)', helper: 'Font size for car 1 popup line 1. Default 12' },
          sensor_popup_car1_2: { label: 'Car 1 Popup 2', helper: 'Entity for car 1 popup line 2.' },
          sensor_popup_car1_2_name: { label: 'Car 1 Popup 2 Name', helper: 'Optional custom name for car 1 popup line 2. Leave blank to use entity name.' },
          sensor_popup_car1_2_color: { label: 'Car 1 Popup 2 Color', helper: 'Color for car 1 popup line 2 text.' },
          sensor_popup_car1_2_font_size: { label: 'Car 1 Popup 2 Font Size (px)', helper: 'Font size for car 1 popup line 2. Default 12' },
          sensor_popup_car1_3: { label: 'Car 1 Popup 3', helper: 'Entity for car 1 popup line 3.' },
          sensor_popup_car1_3_name: { label: 'Car 1 Popup 3 Name', helper: 'Optional custom name for car 1 popup line 3. Leave blank to use entity name.' },
          sensor_popup_car1_3_color: { label: 'Car 1 Popup 3 Color', helper: 'Color for car 1 popup line 3 text.' },
          sensor_popup_car1_3_font_size: { label: 'Car 1 Popup 3 Font Size (px)', helper: 'Font size for car 1 popup line 3. Default 12' },
          sensor_popup_car1_4: { label: 'Car 1 Popup 4', helper: 'Entity for car 1 popup line 4.' },
          sensor_popup_car1_4_name: { label: 'Car 1 Popup 4 Name', helper: 'Optional custom name for car 1 popup line 4. Leave blank to use entity name.' },
          sensor_popup_car1_4_color: { label: 'Car 1 Popup 4 Color', helper: 'Color for car 1 popup line 4 text.' },
          sensor_popup_car1_4_font_size: { label: 'Car 1 Popup 4 Font Size (px)', helper: 'Font size for car 1 popup line 4. Default 12' },
          sensor_popup_car1_5: { label: 'Car 1 Popup 5', helper: 'Entity for car 1 popup line 5.' },
          sensor_popup_car1_5_name: { label: 'Car 1 Popup 5 Name', helper: 'Optional custom name for car 1 popup line 5. Leave blank to use entity name.' },
          sensor_popup_car1_5_color: { label: 'Car 1 Popup 5 Color', helper: 'Color for car 1 popup line 5 text.' },
          sensor_popup_car1_5_font_size: { label: 'Car 1 Popup 5 Font Size (px)', helper: 'Font size for car 1 popup line 5. Default 12' },
          sensor_popup_car1_6: { label: 'Car 1 Popup 6', helper: 'Entity for car 1 popup line 6.' },
          sensor_popup_car1_6_name: { label: 'Car 1 Popup 6 Name', helper: 'Optional custom name for car 1 popup line 6. Leave blank to use entity name.' },
          sensor_popup_car1_6_color: { label: 'Car 1 Popup 6 Color', helper: 'Color for car 1 popup line 6 text.' },
          sensor_popup_car1_6_font_size: { label: 'Car 1 Popup 6 Font Size (px)', helper: 'Font size for car 1 popup line 6. Default 12' },
          sensor_popup_car2_1: { label: 'Car 2 Popup 1', helper: 'Entity for car 2 popup line 1.' },
          sensor_popup_car2_1_name: { label: 'Car 2 Popup 1 Name', helper: 'Optional custom name for car 2 popup line 1. Leave blank to use entity name.' },
          sensor_popup_car2_1_color: { label: 'Car 2 Popup 1 Color', helper: 'Color for car 2 popup line 1 text.' },
          sensor_popup_car2_1_font_size: { label: 'Car 2 Popup 1 Font Size (px)', helper: 'Font size for car 2 popup line 1. Default 12' },
          sensor_popup_car2_2: { label: 'Car 2 Popup 2', helper: 'Entity for car 2 popup line 2.' },
          sensor_popup_car2_2_name: { label: 'Car 2 Popup 2 Name', helper: 'Optional custom name for car 2 popup line 2. Leave blank to use entity name.' },
          sensor_popup_car2_2_color: { label: 'Car 2 Popup 2 Color', helper: 'Color for car 2 popup line 2 text.' },
          sensor_popup_car2_2_font_size: { label: 'Car 2 Popup 2 Font Size (px)', helper: 'Font size for car 2 popup line 2. Default 12' },
          sensor_popup_car2_3: { label: 'Car 2 Popup 3', helper: 'Entity for car 2 popup line 3.' },
          sensor_popup_car2_3_name: { label: 'Car 2 Popup 3 Name', helper: 'Optional custom name for car 2 popup line 3. Leave blank to use entity name.' },
          sensor_popup_car2_3_color: { label: 'Car 2 Popup 3 Color', helper: 'Color for car 2 popup line 3 text.' },
          sensor_popup_car2_3_font_size: { label: 'Car 2 Popup 3 Font Size (px)', helper: 'Font size for car 2 popup line 3. Default 12' },
          sensor_popup_car2_4: { label: 'Car 2 Popup 4', helper: 'Entity for car 2 popup line 4.' },
          sensor_popup_car2_4_name: { label: 'Car 2 Popup 4 Name', helper: 'Optional custom name for car 2 popup line 4. Leave blank to use entity name.' },
          sensor_popup_car2_4_color: { label: 'Car 2 Popup 4 Color', helper: 'Color for car 2 popup line 4 text.' },
          sensor_popup_car2_4_font_size: { label: 'Car 2 Popup 4 Font Size (px)', helper: 'Font size for car 2 popup line 4. Default 12' },
          sensor_popup_car2_5: { label: 'Car 2 Popup 5', helper: 'Entity for car 2 popup line 5.' },
          sensor_popup_car2_5_name: { label: 'Car 2 Popup 5 Name', helper: 'Optional custom name for car 2 popup line 5. Leave blank to use entity name.' },
          sensor_popup_car2_5_color: { label: 'Car 2 Popup 5 Color', helper: 'Color for car 2 popup line 5 text.' },
          sensor_popup_car2_5_font_size: { label: 'Car 2 Popup 5 Font Size (px)', helper: 'Font size for car 2 popup line 5. Default 12' },
          sensor_popup_car2_6: { label: 'Car 2 Popup 6', helper: 'Entity for car 2 popup line 6.' },
          sensor_popup_car2_6_name: { label: 'Car 2 Popup 6 Name', helper: 'Optional custom name for car 2 popup line 6. Leave blank to use entity name.' },
          sensor_popup_car2_6_color: { label: 'Car 2 Popup 6 Color', helper: 'Color for car 2 popup line 6 text.' },
          sensor_popup_car2_6_font_size: { label: 'Car 2 Popup 6 Font Size (px)', helper: 'Font size for car 2 popup line 6. Default 12' },
          battery_popup_color: { label: 'Battery Popup Text Color', helper: 'Global color for all battery popup text (datetime, timeuntil, and custom sensors). Default #00FFFF' },
          battery_popup_font_size: { label: 'Battery Popup Font Size (px)', helper: 'Global font size for all battery popup text. Default 16' },
          sensor_popup_bat_1: { label: 'Battery Popup 1', helper: 'Entity for battery popup line 1.' },
          sensor_popup_bat_1_name: { label: 'Battery Popup 1 Name', helper: 'Optional custom name for battery popup line 1. Leave blank to use entity name.' },
          sensor_popup_bat_2: { label: 'Battery Popup 2', helper: 'Entity for battery popup line 2.' },
          sensor_popup_bat_2_name: { label: 'Battery Popup 2 Name', helper: 'Optional custom name for battery popup line 2. Leave blank to use entity name.' },
          sensor_popup_bat_3: { label: 'Battery Popup 3', helper: 'Entity for battery popup line 3.' },
          sensor_popup_bat_3_name: { label: 'Battery Popup 3 Name', helper: 'Optional custom name for battery popup line 3. Leave blank to use entity name.' },
          sensor_popup_bat_4: { label: 'Battery Popup 4', helper: 'Entity for battery popup line 4.' },
          sensor_popup_bat_4_name: { label: 'Battery Popup 4 Name', helper: 'Optional custom name for battery popup line 4. Leave blank to use entity name.' },
          sensor_popup_bat_5: { label: 'Battery Popup 5', helper: 'Entity for battery popup line 5.' },
          sensor_popup_bat_5_name: { label: 'Battery Popup 5 Name', helper: 'Optional custom name for battery popup line 5. Leave blank to use entity name.' },
          sensor_popup_bat_6: { label: 'Battery Popup 6', helper: 'Entity for battery popup line 6.' },
          sensor_popup_bat_6_name: { label: 'Battery Popup 6 Name', helper: 'Optional custom name for battery popup line 6. Leave blank to use entity name.' },
          sensor_popup_grid_1: { label: 'Grid Popup 1', helper: 'Entity for grid popup line 1.' },
          sensor_popup_grid_1_name: { label: 'Grid Popup 1 Name', helper: 'Optional custom name for grid popup line 1. Leave blank to use entity name.' },
          sensor_popup_grid_1_color: { label: 'Grid Popup 1 Color', helper: 'Color for grid popup line 1 text.' },
          sensor_popup_grid_1_font_size: { label: 'Grid Popup 1 Font Size (px)', helper: 'Font size for grid popup line 1. Default 8' },
          sensor_popup_grid_2: { label: 'Grid Popup 2', helper: 'Entity for grid popup line 2.' },
          sensor_popup_grid_2_name: { label: 'Grid Popup 2 Name', helper: 'Optional custom name for grid popup line 2. Leave blank to use entity name.' },
          sensor_popup_grid_2_color: { label: 'Grid Popup 2 Color', helper: 'Color for grid popup line 2 text.' },
          sensor_popup_grid_2_font_size: { label: 'Grid Popup 2 Font Size (px)', helper: 'Font size for grid popup line 2. Default 8' },
          sensor_popup_grid_3: { label: 'Grid Popup 3', helper: 'Entity for grid popup line 3.' },
          sensor_popup_grid_3_name: { label: 'Grid Popup 3 Name', helper: 'Optional custom name for grid popup line 3. Leave blank to use entity name.' },
          sensor_popup_grid_3_color: { label: 'Grid Popup 3 Color', helper: 'Color for grid popup line 3 text.' },
          sensor_popup_grid_3_font_size: { label: 'Grid Popup 3 Font Size (px)', helper: 'Font size for grid popup line 3. Default 8' },
          sensor_popup_grid_4: { label: 'Grid Popup 4', helper: 'Entity for grid popup line 4.' },
          sensor_popup_grid_4_name: { label: 'Grid Popup 4 Name', helper: 'Optional custom name for grid popup line 4. Leave blank to use entity name.' },
          sensor_popup_grid_4_color: { label: 'Grid Popup 4 Color', helper: 'Color for grid popup line 4 text.' },
          sensor_popup_grid_4_font_size: { label: 'Grid Popup 4 Font Size (px)', helper: 'Font size for grid popup line 4. Default 8' },
          sensor_popup_grid_5: { label: 'Grid Popup 5', helper: 'Entity for grid popup line 5.' },
          sensor_popup_grid_5_name: { label: 'Grid Popup 5 Name', helper: 'Optional custom name for grid popup line 5. Leave blank to use entity name.' },
          sensor_popup_grid_5_color: { label: 'Grid Popup 5 Color', helper: 'Color for grid popup line 5 text.' },
          sensor_popup_grid_5_font_size: { label: 'Grid Popup 5 Font Size (px)', helper: 'Font size for grid popup line 5. Default 8' },
          sensor_popup_grid_6: { label: 'Grid Popup 6', helper: 'Entity for grid popup line 6.' },
          sensor_popup_grid_6_name: { label: 'Grid Popup 6 Name', helper: 'Optional custom name for grid popup line 6. Leave blank to use entity name.' },
          sensor_popup_grid_6_color: { label: 'Grid Popup 6 Color', helper: 'Color for grid popup line 6 text.' },
          sensor_popup_grid_6_font_size: { label: 'Grid Popup 6 Font Size (px)', helper: 'Font size for grid popup line 6. Default 8' },
          sensor_popup_inverter_1: { label: 'Inverter Popup 1', helper: 'Entity for inverter popup line 1.' },
          sensor_popup_inverter_1_name: { label: 'Inverter Popup 1 Name', helper: 'Optional custom name for inverter popup line 1. Leave blank to use entity name.' },
          sensor_popup_inverter_1_color: { label: 'Inverter Popup 1 Color', helper: 'Color for inverter popup line 1 text.' },
          sensor_popup_inverter_1_font_size: { label: 'Inverter Popup 1 Font Size (px)', helper: 'Font size for inverter popup line 1. Default 8' },
          sensor_popup_inverter_2: { label: 'Inverter Popup 2', helper: 'Entity for inverter popup line 2.' },
          sensor_popup_inverter_2_name: { label: 'Inverter Popup 2 Name', helper: 'Optional custom name for inverter popup line 2. Leave blank to use entity name.' },
          sensor_popup_inverter_2_color: { label: 'Inverter Popup 2 Color', helper: 'Color for inverter popup line 2 text.' },
          sensor_popup_inverter_2_font_size: { label: 'Inverter Popup 2 Font Size (px)', helper: 'Font size for inverter popup line 2. Default 8' },
          sensor_popup_inverter_3: { label: 'Inverter Popup 3', helper: 'Entity for inverter popup line 3.' },
          sensor_popup_inverter_3_name: { label: 'Inverter Popup 3 Name', helper: 'Optional custom name for inverter popup line 3. Leave blank to use entity name.' },
          sensor_popup_inverter_3_color: { label: 'Inverter Popup 3 Color', helper: 'Color for inverter popup line 3 text.' },
          sensor_popup_inverter_3_font_size: { label: 'Inverter Popup 3 Font Size (px)', helper: 'Font size for inverter popup line 3. Default 8' },
          sensor_popup_inverter_4: { label: 'Inverter Popup 4', helper: 'Entity for inverter popup line 4.' },
          sensor_popup_inverter_4_name: { label: 'Inverter Popup 4 Name', helper: 'Optional custom name for inverter popup line 4. Leave blank to use entity name.' },
          sensor_popup_inverter_4_color: { label: 'Inverter Popup 4 Color', helper: 'Color for inverter popup line 4 text.' },
          sensor_popup_inverter_4_font_size: { label: 'Inverter Popup 4 Font Size (px)', helper: 'Font size for inverter popup line 4. Default 8' },
          sensor_popup_inverter_5: { label: 'Inverter Popup 5', helper: 'Entity for inverter popup line 5.' },
          sensor_popup_inverter_5_name: { label: 'Inverter Popup 5 Name', helper: 'Optional custom name for inverter popup line 5. Leave blank to use entity name.' },
          sensor_popup_inverter_5_color: { label: 'Inverter Popup 5 Color', helper: 'Color for inverter popup line 5 text.' },
          sensor_popup_inverter_5_font_size: { label: 'Inverter Popup 5 Font Size (px)', helper: 'Font size for inverter popup line 5. Default 8' },
          sensor_popup_inverter_6: { label: 'Inverter Popup 6', helper: 'Entity for inverter popup line 6.' },
          sensor_popup_inverter_6_name: { label: 'Inverter Popup 6 Name', helper: 'Optional custom name for inverter popup line 6. Leave blank to use entity name.' },
          sensor_popup_inverter_6_color: { label: 'Inverter Popup 6 Color', helper: 'Color for inverter popup line 6 text.' },
          sensor_popup_inverter_6_font_size: { label: 'Inverter Popup 6 Font Size (px)', helper: 'Font size for inverter popup line 6. Default 8' },
          footer_card1_slot1_entity: { label: 'Footer Card 1 Slot 1 Sensor', helper: 'Entity shown in footer card 1, slot 1' },
          footer_card1_slot1_label: { label: 'Footer Card 1 Slot 1 Label', helper: 'Optional custom label for footer card 1, slot 1. If empty, the entity friendly name is used' },
          footer_card1_slot2_entity: { label: 'Footer Card 1 Slot 2 Sensor', helper: 'Entity shown in footer card 1, slot 2' },
          footer_card1_slot2_label: { label: 'Footer Card 1 Slot 2 Label', helper: 'Optional custom label for footer card 1, slot 2. If empty, the entity friendly name is used' },
          footer_card2_slot1_entity: { label: 'Footer Card 2 Slot 1 Sensor', helper: 'Entity shown in footer card 2, slot 1' },
          footer_card2_slot1_label: { label: 'Footer Card 2 Slot 1 Label', helper: 'Optional custom label for footer card 2, slot 1. If empty, the entity friendly name is used' },
          footer_card2_slot2_entity: { label: 'Footer Card 2 Slot 2 Sensor', helper: 'Entity shown in footer card 2, slot 2' },
          footer_card2_slot2_label: { label: 'Footer Card 2 Slot 2 Label', helper: 'Optional custom label for footer card 2, slot 2. If empty, the entity friendly name is used' },
          footer_card3_slot1_entity: { label: 'Footer Card 3 Slot 1 Sensor', helper: 'Entity shown in footer card 3, slot 1' },
          footer_card3_slot1_label: { label: 'Footer Card 3 Slot 1 Label', helper: 'Optional custom label for footer card 3, slot 1. If empty, the entity friendly name is used' },
          footer_card3_slot2_entity: { label: 'Footer Card 3 Slot 2 Sensor', helper: 'Entity shown in footer card 3, slot 2' },
          footer_card3_slot2_label: { label: 'Footer Card 3 Slot 2 Label', helper: 'Optional custom label for footer card 3, slot 2. If empty, the entity friendly name is used' },
          footer_card4_slot1_entity: { label: 'Footer Card 4 Slot 1 Sensor', helper: 'Entity shown in footer card 4, slot 1' },
          footer_card4_slot1_label: { label: 'Footer Card 4 Slot 1 Label', helper: 'Optional custom label for footer card 4, slot 1. If empty, the entity friendly name is used' },
          footer_card4_slot2_entity: { label: 'Footer Card 4 Slot 2 Sensor', helper: 'Entity shown in footer card 4, slot 2' },
          footer_card4_slot2_label: { label: 'Footer Card 4 Slot 2 Label', helper: 'Optional custom label for footer card 4, slot 2. If empty, the entity friendly name is used' },
          footer_card5_slot1_entity: { label: 'Footer Card 5 Slot 1 Sensor', helper: 'Entity shown in footer card 5, slot 1' },
          footer_card5_slot1_label: { label: 'Footer Card 5 Slot 1 Label', helper: 'Optional custom label for footer card 5, slot 1. If empty, the entity friendly name is used' },
          footer_card5_slot2_entity: { label: 'Footer Card 5 Slot 2 Sensor', helper: 'Entity shown in footer card 5, slot 2' },
          footer_card5_slot2_label: { label: 'Footer Card 5 Slot 2 Label', helper: 'Optional custom label for footer card 5, slot 2. If empty, the entity friendly name is used' },
          footer_card6_slot1_entity: { label: 'Footer Card 6 Slot 1 Sensor', helper: 'Entity shown in footer card 6, slot 1' },
          footer_card6_slot1_label: { label: 'Footer Card 6 Slot 1 Label', helper: 'Optional custom label for footer card 6, slot 1. If empty, the entity friendly name is used' },
          footer_card6_slot2_entity: { label: 'Footer Card 6 Slot 2 Sensor', helper: 'Entity shown in footer card 6, slot 2' },
          footer_card6_slot2_label: { label: 'Footer Card 6 Slot 2 Label', helper: 'Optional custom label for footer card 6, slot 2. If empty, the entity friendly name is used' }
        },
        options: {
          languages: [
            { value: 'en', label: 'English' },
            { value: 'it', label: 'Italiano' },
            { value: 'de', label: 'Deutsch' },
            { value: 'fr', label: 'Français' },
            { value: 'nl', label: 'Nederlands' },
            { value: 'es', label: 'Español' }
          ],
          display_units: [
            { value: 'W', label: 'Watts (W)' },
            { value: 'kW', label: 'Kilowatts (kW)' }
          ],
          animation_styles: [
            { value: 'dashes', label: 'Dashes (default)' },
            { value: 'dashes_glow', label: 'Dashes + Glow' },
            { value: 'fluid_flow', label: 'Fluid Flow' },
            { value: 'dots', label: 'Dots' },
            { value: 'arrows', label: 'Arrows' }
          ],
          initial_yes: 'Yes',
          initial_no: 'No',
          initial_inverters_1: '1',
          initial_inverters_2: '2',
          initial_batteries_1: '1',
          initial_batteries_2: '2',
          initial_batteries_3: '3',
          initial_batteries_4: '4',
          initial_evs_1: '1',
          initial_evs_2: '2'
        },
        view: {
          daily: 'DAILY YIELD', pv_tot: 'PV TOTAL', car1: 'CAR 1', car2: 'CAR 2', importing: 'IMPORTING', exporting: 'EXPORTING', charging: 'CHARGING', discharging: 'DISCHARGING', standby: 'STANDBY'
        }
      },
      it: {
        sections: {
          general: { title: 'Impostazioni generali', helper: 'Metadati della scheda, sfondo, lingua e intervallo di aggiornamento.' },
          initialConfig: { title: 'Configurazione iniziale', helper: 'Checklist per l\'avvio e opzioni iniziali.' },
          pvCommon: { title: 'Solare/PV (Comuni)', helper: 'Impostazioni comuni per Solare/PV condivise tra gli array.' },
          array1: { title: 'Array Solare/PV 1', helper: 'Scegli le entità PV, batteria, rete, carico e veicoli elettrici utilizzate dalla scheda. È necessario specificare almeno il sensore totale PV o gli array di stringhe PV.' },
          array2: { title: 'Array Solare/PV 2', helper: 'Se è impostato il sensore PV Total (Inverter 2) o sono fornite le stringhe PV, l\'Array 2 diventerà attivo e abiliterà il secondo inverter. È inoltre necessario abilitare il sensore di produzione giornaliera (Array 2) e il carico domestico (Inverter 2).' },
          windmill: { title: 'Mulino a vento', helper: 'Configura i sensori del generatore eolico e lo stile di visualizzazione.' },
          battery: { title: 'Batteria', helper: 'Configura le entità della batteria.' },
          grid: { title: 'Rete', helper: 'Configura le entità di rete.' },
          car: { title: 'Auto', helper: 'Configura le entità dei veicoli elettrici.' },
          other: { title: 'Casa', helper: 'Sensori aggiuntivi e opzioni avanzate.' },
          pvPopup: { title: 'Popup PV', helper: 'Configura le entità per la visualizzazione popup del PV.' },
          housePopup: { title: 'Popup Casa', helper: 'Configura le entità per il popup della casa.' },
          carPopup: { title: 'Popup Auto', helper: 'Configure auto-detected EV sensors, climate controls, and extra entities for the car (EV) popups.' },
          batteryPopup: { title: 'Popup Batteria', helper: 'Configura la visualizzazione popup della batteria.' },
          gridPopup: { title: 'Popup Rete', helper: 'Configura le entità per il popup della rete.' },
          inverterPopup: { title: 'Popup Inverter', helper: 'Configura le entità per il popup dell\'inverter.' },
          colors: { title: 'Colori & Soglie', helper: 'Configura soglie di rete e colori di accento per i flussi e la visualizzazione EV.' },
          typography: { title: 'Tipografia', helper: 'Regola le dimensioni dei font usati nella scheda.' },
          stats: { title: 'Statistiche', helper: 'Configura sensori e etichette per le statistiche energetiche.' },
          about: { title: 'Informazioni', helper: 'Crediti, versione e link utili.' }
        },
        fields: {
          card_title: { label: 'Titolo della scheda', helper: 'Titolo mostrato in cima alla scheda. Lascia vuoto per disabilitare.' },
          title_text_color: { label: 'Colore testo titolo', helper: 'Sovrascrive il colore di riempimento per [data-role="title-text"]. Lascia vuoto per mantenere lo stile SVG.' },
          title_bg_color: { label: 'Colore sfondo titolo', helper: 'Sovrascrive il colore di riempimento per [data-role="title-bg"]. Lascia vuoto per mantenere lo stile SVG.' },
          card_label_color: { label: 'Colore etichetta card', helper: 'Colore di riempimento predefinito per elementi SVG con data-style="config" e data-role="label".' },
          card_label_font_size: { label: 'Dimensione font etichetta card', helper: 'Dimensione font predefinita per elementi SVG con data-style="config" e data-role="label".' },
          card_background_color: { label: 'Colore sfondo card', helper: 'Colore di riempimento predefinito per elementi SVG con data-style="config" e data-role="card".' },
          card_label_css: { label: 'CSS etichetta aggiuntivo', helper: 'Dichiarazioni CSS aggiuntive applicate agli elementi SVG con data-style="config" e data-role="label".' },
          font_family: { label: 'Famiglia di font', helper: 'CSS font-family usato per tutto il testo SVG (es. sans-serif, Roboto, "Segoe UI").' },
          odometer_font_family: { label: 'Font odometro (Monospace)', helper: 'Font usato solo per i valori animati tipo odometro. Lascia vuoto per riutilizzare la famiglia di font. Suggerimento: scegli una variante monospace.' },
          background: { label: 'Sfondo', helper: 'Percorso al file SVG di sfondo (es. /local/community/advanced-energy-card/tech.svg).' },
          night_mode: { label: 'Modalità Giorno/Notte', helper: 'Seleziona Giorno, Notte o Auto. Auto usa sun.sun: above_horizon = Giorno, below_horizon = Notte.' },
          language: { label: 'Lingua', helper: 'Scegli la lingua dell\'editor.' },
          display_unit: { label: 'Unità di visualizzazione', helper: 'Unità usata per formattare i valori di potenza.' },
          update_interval: { label: 'Intervallo aggiornamento', helper: 'Cadenza di aggiornamento della scheda (0 disabilita il throttling).' },
          initial_configuration: { label: 'Configurazione iniziale', helper: 'Mostra la sezione di configurazione iniziale nell\'editor.' },
          initial_has_pv: { label: 'Hai impianto solare/PV?', helper: 'Seleziona Sì se hai produzione solare da configurare.' },
          initial_inverters: { label: 'Quanti inverter hai?', helper: 'Mostrato solo quando Solare/PV è abilitato.' },
          initial_has_battery: { label: 'Hai accumulo a batteria?', helper: '' },
          initial_battery_count: { label: 'Quante batterie hai? Massimo 4', helper: '' },
          initial_has_grid: { label: 'Hai elettricità fornita dalla rete?', helper: '' },
          initial_can_export: { label: 'Puoi esportare l\'energia in eccesso alla rete?', helper: '' },
          initial_has_windmill: { label: 'Hai un mulino a vento?', helper: '' },
          initial_has_ev: { label: 'Hai veicoli elettrici (EV)?', helper: '' },
          initial_ev_count: { label: 'Quanti ne hai?', helper: '' },
          initial_config_items_title: { label: 'Elementi di configurazione richiesti', helper: '' },
          initial_config_items_helper: { label: 'Questi elementi diventano rilevanti in base alle risposte precedenti.', helper: '' },
          initial_config_items_empty: { label: 'Nessun elemento da mostrare al momento.', helper: '' },
          initial_config_complete_helper: { label: 'Questo completa la configurazione minima richiesta. Dopo aver cliccato su Completa, controlla tutti i menu per elementi aggiuntivi e le configurazioni popup. Questa configurazione iniziale può essere riattivata nel menu Generale.', helper: '' },
          initial_config_complete_button: { label: 'Completa', helper: '' },
          array_helper_text: { label: 'Ogni Array deve avere almeno un sensore totale Solar/PV combinato o valori di stringa individuali che vengono sommati per ottenere la produzione totale dell\'array. La produzione giornaliera può essere fornita e mostrata in una scheda Produzione Giornaliera.', helper: '' },
          animation_speed_factor: { label: 'Fattore velocità animazione', helper: 'Regola il moltiplicatore della velocità di animazione (-3x a 3x). Imposta 0 per mettere in pausa; valori negativi invertono la direzione.' },
          animation_style: { label: 'Stile animazione giorno', helper: 'Stile di animazione del flusso usato in modalità Giorno.' },
          night_animation_style: { label: 'Stile animazione notte', helper: 'Stile di animazione del flusso usato in modalità Notte. Lascia vuoto per usare lo stile Giorno.' },
          dashes_glow_intensity: { label: 'Intensità bagliore tratteggi', helper: 'Controlla la forza del bagliore per "Tratteggi + Bagliore" (0 disabilita).' },
          fluid_flow_outer_glow: { label: 'Bagliore esterno Fluid Flow', helper: 'Abilita lo strato extra di alone/bagliore per animation_style: fluid_flow.' },
          flow_stroke_width: { label: 'Spessore tratto flusso (px)', helper: 'Sovrascrittura opzionale per lo spessore del tratto animato (senza modifiche SVG). Lascia vuoto per i valori predefiniti SVG.' },
          fluid_flow_stroke_width: { label: 'Spessore tratto Fluid Flow (px)', helper: 'Spessore base per animation_style: fluid_flow. Gli overlay/maschere sono derivati da questo (default 5).' },
          arrow_scale: { label: 'Scala Frecce', helper: 'Moltiplicatore di dimensione extra per le frecce nello stile di animazione "Frecce". Le frecce si adattano già automaticamente allo Spessore tratto flusso; aumenta se sono ancora troppo piccole, diminuisci se troppo grandi.' },
          sensor_pv_total: { label: 'Sensore PV Totale', helper: 'Sensore aggregato opzionale mostrato come linea combinata.' },
          sensor_pv_total_secondary: { label: 'Sensore PV Totale (Inverter 2)', helper: 'Totale opzionale del secondo inverter; viene aggiunto al PV totale se fornito.' },
          sensor_windmill_total: { label: 'Totale mulino a vento', helper: 'Sensore di potenza per il generatore eolico (W). Se non configurato, il gruppo SVG del mulino a vento è nascosto.' },
          sensor_windmill_daily: { label: 'Produzione giornaliera mulino', helper: 'Sensore opzionale che riporta la produzione giornaliera del mulino.' },
          sensor_pv1: { label: 'Stringa PV 1 (Array 1)', helper: 'Sensore di produzione solare Array 1 per la stringa 1.' },
          sensor_pv2: { label: 'Stringa PV 2 (Array 1)', helper: 'Sensore di produzione solare Array 1 per la stringa 2.' },
          sensor_pv3: { label: 'Stringa PV 3 (Array 1)', helper: 'Sensore di produzione solare Array 1 per la stringa 3.' },
          sensor_pv4: { label: 'Stringa PV 4 (Array 1)', helper: 'Sensore di produzione solare Array 1 per la stringa 4.' },
          sensor_pv5: { label: 'Stringa PV 5 (Array 1)', helper: 'Sensore di produzione solare Array 1 per la stringa 5.' },
          sensor_pv6: { label: 'Stringa PV 6 (Array 1)', helper: 'Sensore di produzione solare Array 1 per la stringa 6.' },
          sensor_pv_array2_1: { label: 'Stringa PV 1 (Array 2)', helper: 'Sensore di produzione solare Array 2 per la stringa 1.' },
          sensor_pv_array2_2: { label: 'Stringa PV 2 (Array 2)', helper: 'Sensore di produzione solare Array 2 per la stringa 2.' },
          sensor_pv_array2_3: { label: 'Stringa PV 3 (Array 2)', helper: 'Sensore di produzione solare Array 2 per la stringa 3.' },
          sensor_pv_array2_4: { label: 'Stringa PV 4 (Array 2)', helper: 'Sensore di produzione solare Array 2 per la stringa 4.' },
          sensor_pv_array2_5: { label: 'Stringa PV 5 (Array 2)', helper: 'Sensore di produzione solare Array 2 per la stringa 5.' },
          sensor_pv_array2_6: { label: 'Stringa PV 6 (Array 2)', helper: 'Sensore di produzione solare Array 2 per la stringa 6.' },
          sensor_daily: { label: 'Sensore produzione giornaliera', helper: 'Sensore che riporta i totali di produzione giornaliera. È richiesto il sensore PV totale o le stringhe PV.' },
          sensor_daily_array2: { label: 'Sensore produzione giornaliera (Array 2)', helper: 'Sensore che riporta i totali giornalieri per l\'Array 2.' },
          sensor_bat1_soc: { label: 'SOC Batteria 1', helper: 'Sensore Stato di Carica per la Batteria 1 (percentuale).' },
          sensor_bat1_power: { label: 'Potenza Batteria 1', helper: 'Fornire questo sensore di potenza combinato o i sensori di carica/scarica affinché la Batteria 1 diventi attiva.' },
          sensor_bat1_charge_power: { label: 'Potenza carica Batteria 1', helper: 'Sensore per la potenza in carica della Batteria 1.' },
          sensor_bat1_discharge_power: { label: 'Potenza scarica Batteria 1', helper: 'Sensore per la potenza in scarica della Batteria 1.' },
          sensor_bat1_capacity_sensor: { label: 'Sensore capacità utilizzabile Batteria 1', helper: 'Sensore opzionale che riporta la capacità utilizzabile della Batteria 1 in Wh o kWh. Utilizzato con la percentuale di riserva per calcolare la capacità effettiva.' },
          bat1_capacity_manual: { label: 'Capacità utilizzabile Batteria 1 (Manuale)', helper: 'Inserimento manuale alternativo per la capacità utilizzabile della Batteria 1. Inserire il valore nelle unità specificate dall\'impostazione display_unit (Wh o kWh). Ignorato se viene fornito il sensore di capacità.' },
          bat1_reserve_percentage: { label: 'Percentuale riserva Batteria 1', helper: 'Percentuale di riserva opzionale per la Batteria 1 (0-100). Alcuni sistemi mantengono una riserva per preservare la salute della batteria. Questo riduce la capacità utilizzabile effettiva visualizzata.' },
          sensor_bat1_time_until: { label: 'Sensore Tempo Rimanente Batteria 1', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_bat2_soc: { label: 'SOC Batteria 2', helper: 'Sensore Stato di Carica per la Batteria 2 (percentuale).' },
          sensor_bat2_power: { label: 'Potenza Batteria 2', helper: 'Fornire questo sensore di potenza combinato o i sensori di carica/scarica affinché la Batteria 2 diventi attiva.' },
          sensor_bat2_charge_power: { label: 'Potenza carica Batteria 2', helper: 'Sensore per la potenza in carica della Batteria 2.' },
          sensor_bat2_discharge_power: { label: 'Potenza scarica Batteria 2', helper: 'Sensore per la potenza in scarica della Batteria 2.' },
          sensor_bat2_capacity_sensor: { label: 'Sensore capacità utilizzabile Batteria 2', helper: 'Sensore opzionale che riporta la capacità utilizzabile della Batteria 2 in Wh o kWh. Utilizzato con la percentuale di riserva per calcolare la capacità effettiva.' },
          bat2_capacity_manual: { label: 'Capacità utilizzabile Batteria 2 (Manuale)', helper: 'Inserimento manuale alternativo per la capacità utilizzabile della Batteria 2. Inserire il valore nelle unità specificate dall\'impostazione display_unit (Wh o kWh). Ignorato se viene fornito il sensore di capacità.' },
          bat2_reserve_percentage: { label: 'Percentuale riserva Batteria 2', helper: 'Percentuale di riserva opzionale per la Batteria 2 (0-100). Alcuni sistemi mantengono una riserva per preservare la salute della batteria. Questo riduce la capacità utilizzabile effettiva visualizzata.' },
          sensor_bat2_time_until: { label: 'Sensore Tempo Rimanente Batteria 2', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_bat3_soc: { label: 'SOC Batteria 3', helper: 'Sensore Stato di Carica per la Batteria 3 (percentuale).' },
          sensor_bat3_power: { label: 'Potenza Batteria 3', helper: 'Fornire questo sensore di potenza combinato o i sensori di carica/scarica affinché la Batteria 3 diventi attiva.' },
          sensor_bat3_charge_power: { label: 'Potenza carica Batteria 3', helper: 'Sensore per la potenza in carica della Batteria 3.' },
          sensor_bat3_discharge_power: { label: 'Potenza scarica Batteria 3', helper: '' },
          sensor_bat3_capacity_sensor: { label: 'Sensore capacità utilizzabile Batteria 3', helper: 'Sensore opzionale che riporta la capacità utilizzabile della Batteria 3 in Wh o kWh. Utilizzato con la percentuale di riserva per calcolare la capacità effettiva.' },
          bat3_capacity_manual: { label: 'Capacità utilizzabile Batteria 3 (Manuale)', helper: 'Inserimento manuale alternativo per la capacità utilizzabile della Batteria 3. Inserire il valore nelle unità specificate dall\'impostazione display_unit (Wh o kWh). Ignorato se viene fornito il sensore di capacità.' },
          bat3_reserve_percentage: { label: 'Percentuale riserva Batteria 3', helper: 'Percentuale di riserva opzionale per la Batteria 3 (0-100). Alcuni sistemi mantengono una riserva per preservare la salute della batteria. Questo riduce la capacità utilizzabile effettiva visualizzata.' },
          sensor_bat3_time_until: { label: 'Sensore Tempo Rimanente Batteria 3', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_bat4_soc: { label: 'SOC Batteria 4', helper: 'Sensore Stato di Carica per la Batteria 4 (percentuale).' },
          sensor_bat4_power: { label: 'Potenza Batteria 4', helper: 'Fornire questo sensore di potenza combinato o i sensori di carica/scarica affinché la Batteria 4 diventi attiva.' },
          sensor_bat4_charge_power: { label: 'Potenza carica Batteria 4', helper: 'Sensore per la potenza in carica della Batteria 4.' },
          sensor_bat4_discharge_power: { label: 'Potenza scarica Batteria 4', helper: 'Sensore per la potenza in scarica della Batteria 4.' },
          sensor_bat4_capacity_sensor: { label: 'Sensore capacità utilizzabile Batteria 4', helper: 'Sensore opzionale che riporta la capacità utilizzabile della Batteria 4 in Wh o kWh. Utilizzato con la percentuale di riserva per calcolare la capacità effettiva.' },
          bat4_capacity_manual: { label: 'Capacità utilizzabile Batteria 4 (Manuale)', helper: 'Inserimento manuale alternativo per la capacità utilizzabile della Batteria 4. Inserire il valore nelle unità specificate dall\'impostazione display_unit (Wh o kWh). Ignorato se viene fornito il sensore di capacità.' },
          bat4_reserve_percentage: { label: 'Percentuale riserva Batteria 4', helper: 'Percentuale di riserva opzionale per la Batteria 4 (0-100). Alcuni sistemi mantengono una riserva per preservare la salute della batteria. Questo riduce la capacità utilizzabile effettiva visualizzata.' },
          sensor_bat4_time_until: { label: 'Sensore Tempo Rimanente Batteria 4', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_home_load: { label: 'Consumo domestico (obbligatorio)', helper: 'Sensore del consumo totale della casa.' },
          sensor_home_load_secondary: { label: 'Consumo domestico (Inverter 2)', helper: 'Sensore carico casa opzionale per il secondo inverter.' },
          sensor_heat_pump_consumption: { label: 'Consumo pompa di calore', helper: 'Sensore per il consumo energetico della pompa di calore.' },
          sensor_hot_water_consumption: { label: 'Riscaldamento acqua', helper: 'Sensore per il carico di riscaldamento dell\'acqua calda.' },
          sensor_pool_consumption: { label: 'Piscina', helper: 'Sensore per il consumo/energia della piscina.' },
          sensor_washing_machine_consumption: { label: 'Lavatrice', helper: 'Sensore per il consumo energetico della lavatrice.' },
          sensor_dishwasher_consumption: { label: 'Lavastoviglie', helper: 'Sensore per il consumo della lavastoviglie.' },
          sensor_dryer_consumption: { label: 'Asciugatrice', helper: 'Sensore per il consumo dell\'asciugatrice.' },
          sensor_refrigerator_consumption: { label: 'Frigorifero', helper: 'Sensore per il consumo del frigorifero.' },
          sensor_freezer_consumption: { label: 'Congelatore', helper: 'Sensore per il consumo del congelatore.' },
          hot_water_text_color: { label: 'Colore testo riscaldamento acqua', helper: 'Colore applicato al testo della potenza dell\'acqua calda.' },
          dishwasher_text_color: { label: 'Colore testo lavastoviglie', helper: 'Colore applicato al testo della potenza della lavastoviglie.' },
          hot_water_font_size: { label: 'Dimensione font riscaldamento acqua (px)', helper: 'Default 8' },
          dishwasher_font_size: { label: 'Dimensione font lavastoviglie (px)', helper: 'Default 8' },
          sensor_grid_power: { label: 'Potenza rete Inverter 1', helper: 'Sensore di flusso rete positivo/negativo per inverter 1. Specifica questo sensore o entrambi Import ed Export.' },
          sensor_grid_import: { label: 'Sensore import rete Inverter 1', helper: 'Entità opzionale che riporta l\'import (positivo) dell\'inverter 1.' },
          sensor_grid_export: { label: 'Sensore export rete Inverter 1', helper: 'Entità opzionale che riporta l\'export (positivo) dell\'inverter 1.' },
          sensor_grid_import_daily: { label: 'Sensore import giornaliero Inverter 1', helper: 'Entità opzionale che riporta l\'import cumulativo dell\'inverter 1 per il giorno corrente.' },
          sensor_grid_export_daily: { label: 'Sensore export giornaliero Inverter 1', helper: 'Entità opzionale che riporta l\'export cumulativo dell\'inverter 1 per il giorno corrente.' },
          sensor_grid2_power: { label: 'Potenza rete Inverter 2', helper: 'Sensore di flusso rete positivo/negativo per inverter 2. Specifica questo sensore o entrambi Import ed Export.' },
          sensor_grid2_import: { label: 'Sensore import rete Inverter 2', helper: 'Entità opzionale che riporta l\'import (positivo) dell\'inverter 2.' },
          sensor_grid2_export: { label: 'Sensore export rete Inverter 2', helper: 'Entità opzionale che riporta l\'export (positivo) dell\'inverter 2.' },
          sensor_grid2_import_daily: { label: 'Sensore import giornaliero Inverter 2', helper: 'Entità opzionale che riporta l\'import cumulativo dell\'inverter 2 per il giorno corrente.' },
          sensor_grid2_export_daily: { label: 'Sensore export giornaliero Inverter 2', helper: 'Entità opzionale che riporta l\'export cumulativo dell\'inverter 2 per il giorno corrente.' },
          show_daily_grid: { label: 'Mostra valori grid giornalieri', helper: 'Mostra i totali giornalieri di import/export sotto il flusso di rete corrente quando abilitato.' },
          grid_daily_font_size: { label: 'Dimensione font Grid Giornaliero (px)', helper: 'Sovrascrittura opzionale per il testo import/export giornaliero. Default: Grid Font Size.' },
          grid_current_odometer: { label: 'Odometer: Corrente rete', helper: 'Anima la corrente di rete con un effetto di rotazione per cifra.' },
          grid_current_odometer_duration: { label: 'Durata odometro (ms)', helper: 'Durata dell\'animazione in millisecondi. Default 350.' },
          show_grid_flow_label: { label: 'Mostra nome Import/Export rete', helper: 'Prependi la label importing/exporting prima del valore di rete quando abilitato.' },
          sensor_grid_state: { label: 'Sensore Stato Rete', helper: 'Entità sensore per il testo dello stato della rete (collegato a data-role="grid-state").' },
          grid_state_importing_color: { label: 'Colore Importazione Rete', helper: 'Colore quando lo stato della rete è importazione.' },
          grid_state_exporting_color: { label: 'Colore Esportazione Rete', helper: 'Colore quando lo stato della rete è esportazione.' },
          grid_state_floating_color: { label: 'Colore Fluttuazione Rete', helper: 'Colore quando lo stato della rete è fluttuazione.' },
          grid_state_font_size: { label: 'Dimensione Font Stato Rete (px)', helper: 'Default 8' },
          sensor_solar_state: { label: 'Sensore Stato Solare', helper: 'Entità sensore per il testo dello stato solare (collegato a data-role="solar-state"). Restituisce "Producing Power" o "Not Producing".' },
          solar_state_producing_color: { label: 'Colore Solare in Produzione', helper: 'Colore quando lo stato solare è in produzione.' },
          solar_state_not_producing_color: { label: 'Colore Solare Non in Produzione', helper: 'Colore quando lo stato solare non è in produzione.' },
          solar_state_font_size: { label: 'Dimensione Font Stato Solare (px)', helper: 'Default 8' },
          sensor_solar_forecast_today: { label: 'Sensore Previsione Solare Oggi', helper: 'Entità sensore per la previsione solare di oggi (collegato a data-role="solar-forecast-today").' },
          sensor_solar_forecast_tomorrow: { label: 'Sensore Previsione Solare Domani', helper: 'Entità sensore per la previsione solare di domani (collegato a data-role="solar-forecast-tomorrow").' },
          sensor_weather_icon: { label: 'Sensore Icona Meteo', helper: 'Entità sensore per l\'icona meteo (collegato a data-role="weather-icon").' },
          weather_icon_color: { label: 'Colore Icona Meteo', helper: 'Colore applicato al testo dell\'icona meteo.' },
          weather_icon_font_size: { label: 'Dimensione Font Icona Meteo (px)', helper: 'Default 8' },
          sensor_weather_forecast: { label: 'Sensore Previsione Meteo', helper: 'Entità sensore per la previsione meteo (collegato a data-role="weather-forecast").' },
          weather_forecast_color: { label: 'Colore Previsione Meteo', helper: 'Colore applicato al testo della previsione meteo.' },
          weather_forecast_font_size: { label: 'Dimensione Font Previsione Meteo (px)', helper: 'Default 8' },
          sun_moon_display: { label: 'Visualizzazione Sole/Luna', helper: 'Mostra un sole o una luna che segue il ciclo giorno/notte. Off = nascosto, Solo Sole = sole di giorno, Sole e Luna = sole di giorno, luna di notte.' },
          sun_moon_arc_color: { label: 'Colore Arco', helper: 'Colore del tratto per il percorso arco sole/luna. Lasciare vuoto per nessuno (invisibile).' },
          sun_moon_arc_stroke_width: { label: 'Larghezza Tratto Arco', helper: 'Larghezza del tratto (px) per il percorso arco sole/luna.' },
          sun_moon_label_color: { label: 'Colore Etichetta Alba/Tramonto', helper: 'Colore per le etichette orario alba e tramonto. Lasciare vuoto per usare il colore dell\'icona sole/luna.' },
          sun_moon_label_font_size: { label: 'Dimensione Font Etichetta Alba/Tramonto', helper: 'Dimensione font (px) per il testo alba e tramonto. Lasciare vuoto per il valore predefinito.' },
          sun_moon_sunrise_label: { label: 'Testo Etichetta Alba', helper: 'Testo personalizzato per l\'etichetta alba. Lascia vuoto per usare il default SVG.' },
          sun_moon_sunset_label: { label: 'Testo Etichetta Tramonto', helper: 'Testo personalizzato per l\'etichetta tramonto. Lascia vuoto per usare il default SVG.' },
          stats_value_color: { label: 'Colore Valore Statistiche', helper: 'Colore applicato ai valori delle statistiche.' },
          stats_value_font_size: { label: 'Dimensione Font Valore Statistiche (px)', helper: 'Dimensione font per i valori. Default 14' },
          stats_label_color: { label: 'Colore Etichetta Statistiche', helper: 'Colore applicato alle etichette delle statistiche.' },
          stats_label_font_size: { label: 'Dimensione Font Etichetta Statistiche (px)', helper: 'Dimensione font per le etichette. Default 12' },
          inverter1_status_text_color: { label: 'Colore testo Stato Inverter', helper: 'Colore applicato al testo dello stato inverter (Ricarica/Scarica/Importazione/Esportazione).' },
          inverter1_status_font_size: { label: 'Dimensione font Stato Inverter (px)', helper: 'Dimensione font per il testo dello stato inverter. Default 8' },
          enable_echo_alive: { label: 'Abilita Echo Alive', helper: 'Abilita un iframe invisibile per mantenere il browser Silk aperto su Echo Show. Il pulsante sarà posizionato in un angolo della scheda.' },
          pv_tot_color: { label: 'Colore PV Totale', helper: 'Colore applicato alla linea di testo PV TOTAL.' },
          pv_primary_color: { label: 'Colore flusso PV 1', helper: 'Colore usato per la linea di animazione primaria del PV.' },
          pv_secondary_color: { label: 'Colore flusso PV 2', helper: 'Colore usato per la linea di animazione secondaria del PV quando disponibile.' },
          load_flow_color: { label: 'Colore flusso carico', helper: 'Colore applicato alla linea di animazione del carico domestico.' },
          load_text_color: { label: 'Colore testo carico', helper: 'Colore applicato al testo del carico quando le soglie sono inattive.' },
          house_total_color: { label: 'Colore totale casa', helper: 'Colore applicato al testo/flow HOUSE TOT.' },
          inv1_color: { label: 'Colore Inverter 1 ? Casa', helper: 'Colore applicato al flusso dall\'Inverter 1 verso la casa.' },
          inv2_color: { label: 'Colore Inverter 2 ? Casa', helper: 'Colore applicato al flusso dall\'Inverter 2 verso la casa.' },
          load_threshold_warning: { label: 'Soglia avviso carico', helper: 'Cambia il colore del carico quando la magnitudine è uguale o superiore a questo valore. Usa l\'unità di visualizzazione selezionata.' },
          load_warning_color: { label: 'Colore avviso carico', helper: 'Colore hex o CSS applicato alla soglia di avviso del carico.' },
          load_threshold_critical: { label: 'Soglia critica carico', helper: 'Cambia il colore del carico quando la magnitudine è uguale o superiore a questo valore. Usa l\'unità di visualizzazione selezionata.' },
          load_critical_color: { label: 'Colore critico carico', helper: 'Colore hex o CSS applicato alla soglia critica del carico.' },
          battery_soc_color: { label: 'Colore SOC batteria', helper: 'Colore hex applicato al testo percentuale SOC batteria.' },
          battery_charge_color: { label: 'Colore flusso carica batteria', helper: 'Colore usato quando l\'energia fluisce nella batteria.' },
          battery_discharge_color: { label: 'Colore flusso scarica batteria', helper: 'Colore usato quando l\'energia fluisce dalla batteria.' },
          grid_import_color: { label: 'Colore import rete Inverter 1', helper: 'Colore base prima delle soglie quando l\'inverter 1 importa dalla rete.' },
          grid_export_color: { label: 'Colore export rete Inverter 1', helper: 'Colore base prima delle soglie quando l\'inverter 1 esporta in rete.' },
          grid2_import_color: { label: 'Colore import rete Inverter 2', helper: 'Colore base prima delle soglie quando l\'inverter 2 importa dalla rete.' },
          grid2_export_color: { label: 'Colore export rete Inverter 2', helper: 'Colore base prima delle soglie quando l\'inverter 2 esporta in rete.' },
          car_flow_color: { label: 'Colore flusso EV', helper: 'Colore applicato alla linea di animazione del veicolo elettrico.' },
          battery_fill_high_color: { label: 'Colore riempimento batteria (Normale)', helper: 'Colore di riempimento liquido quando il SOC è sopra la soglia bassa.' },
          battery_fill_low_color: { label: 'Colore riempimento batteria (Basso)', helper: 'Colore di riempimento liquido quando il SOC è al di sotto o uguale alla soglia bassa.' },
          battery_fill_low_threshold: { label: 'Soglia riempimento batteria bassa (%)', helper: 'Usa il colore basso di riempimento quando il SOC è a o sotto questa percentuale.' },
          battery_fill_opacity: { label: 'Opacità riempimento batteria', helper: 'Opacità per il livello di riempimento della batteria (0-1).' },
          grid_activity_threshold: { label: 'Soglia animazione rete (W)', helper: 'Ignora i flussi di rete il cui valore assoluto è inferiore a questa potenza prima di animare.' },
          grid_power_only: { label: 'Solo potenza rete', helper: 'Nascondi i flussi inverter/batteria e mostra un flusso diretto rete?casa.' },
          grid_threshold_warning: { label: 'Soglia avviso rete Inverter 1', helper: 'Cambia il colore della rete inverter 1 quando la magnitudine è uguale o superiore a questo valore. Usa l\'unità di visualizzazione selezionata.' },
          grid_warning_color: { label: 'Colore avviso rete Inverter 1', helper: 'Colore hex o CSS applicato alla soglia di avviso dell\'inverter 1.' },
          grid_threshold_critical: { label: 'Soglia critica rete Inverter 1', helper: 'Cambia il colore della rete inverter 1 quando la magnitudine è uguale o superiore a questo valore. Usa l\'unità di visualizzazione selezionata.' },
          grid_critical_color: { label: 'Colore critico rete Inverter 1', helper: 'Colore hex o CSS applicato alla soglia critica dell\'inverter 1.' },
          grid2_threshold_warning: { label: 'Soglia avviso rete Inverter 2', helper: 'Cambia il colore della rete inverter 2 quando la magnitudine è uguale o superiore a questo valore. Usa l\'unità di visualizzazione selezionata.' },
          grid2_warning_color: { label: 'Colore avviso rete Inverter 2', helper: 'Colore hex o CSS applicato alla soglia di avviso dell\'inverter 2.' },
          grid2_threshold_critical: { label: 'Soglia critica rete Inverter 2', helper: 'Cambia il colore della rete inverter 2 quando la magnitudine è uguale o superiore a questo valore. Usa l\'unità di visualizzazione selezionata.' },
          grid2_critical_color: { label: 'Colore critico rete Inverter 2', helper: 'Colore hex o CSS applicato alla soglia critica dell\'inverter 2.' },
          invert_grid: { label: 'Inverti valori rete', helper: 'Abilita se la polarità import/export è invertita.' },
          invert_battery: { label: 'Inverti valori batteria', helper: 'Abilita se la polarità carica/scarica è invertita.' },
          invert_bat1: { label: 'Inverti valori Batteria 1', helper: 'Abilita se la polarità carica/scarica della Batteria 1 è invertita.' },
          invert_bat2: { label: 'Inverti valori Batteria 2', helper: 'Abilita se la polarità carica/scarica della Batteria 2 è invertita.' },
          invert_bat3: { label: 'Inverti valori Batteria 3', helper: 'Abilita se la polarità carica/scarica della Batteria 3 è invertita.' },
          sensor_car_power: { label: 'Sensore potenza Auto 1', helper: 'Sensore per la potenza di carica/scarica del veicolo elettrico.' },
          sensor_car_soc: { label: 'Sensore SOC Auto 1', helper: 'Sensore Stato di Carica per EV 1 (percentuale).' },
          sensor_car_range: { label: 'Sensore Autonomia Auto 1', helper: 'Entità sensore per l\'autonomia EV 1 (collegato a data-role="car1-range").' },
          sensor_car_state: { label: 'Sensore Stato Ricarica Auto 1', helper: 'Entità sensore per il testo dello stato di ricarica EV 1 (collegato a data-role="car1-state").' },
          sensor_car_hvac_status: { label: 'Sensore Stato HVAC Auto 1', helper: 'Entità sensore per lo stato HVAC/climatizzazione EV 1 (collegato a data-role="car1-hvac-status").' },
          sensor_car_outside_temp: { label: 'Sensore Temperatura Esterna Auto 1', helper: 'Entità sensore per la temperatura esterna EV 1 (collegato a data-role="car1-outside-temp").' },
          sensor_car_inside_temp: { label: 'Sensore Temperatura Interna Auto 1', helper: 'Entità sensore per la temperatura dell\'abitacolo EV 1 (collegato a data-role="car1-inside-temp").' },
          sensor_car_ac_temp: { label: 'Sensore Temperatura Climatizzatore Auto 1', helper: 'Entità sensore per la temperatura impostata del climatizzatore EV 1 (collegato a data-role="car1-ac-temp").' },
          car1_climate_entity: { label: 'Entità Climatizzazione HVAC Auto 1', helper: 'Entità climate per il controllo HVAC dell\'EV 1 (solo dominio climate).' },
          car_soc: { label: 'SOC Auto', helper: 'Sensore per il SOC della batteria dell\'EV (percentuale).' },
          car_charger_power: { label: 'Potenza caricatore Auto', helper: 'Sensore per la potenza del caricatore EV.' },
          car1_label: { label: 'Etichetta Auto 1', helper: 'Testo mostrato accanto ai valori del primo EV.' },
          sensor_car2_power: { label: 'Sensore potenza Auto 2', helper: 'Sensore per la potenza di carica/scarica del secondo EV.' },
          car2_power: { label: 'Potenza Auto 2', helper: 'Sensore per la potenza di carica/scarica del secondo EV.' },
          sensor_car2_soc: { label: 'Sensore SOC Auto 2', helper: 'Sensore Stato di Carica per EV 2 (percentuale).' },
          sensor_car2_range: { label: 'Sensore Autonomia Auto 2', helper: 'Entità sensore per l\'autonomia EV 2 (collegato a data-role="car2-range").' },
          sensor_car2_state: { label: 'Sensore Stato Ricarica Auto 2', helper: 'Entità sensore per il testo dello stato di ricarica EV 2 (collegato a data-role="car2-state").' },
          sensor_car2_hvac_status: { label: 'Sensore Stato HVAC Auto 2', helper: 'Entità sensore per lo stato HVAC/climatizzazione EV 2 (collegato a data-role="car2-hvac-status").' },
          sensor_car2_outside_temp: { label: 'Sensore Temperatura Esterna Auto 2', helper: 'Entità sensore per la temperatura esterna EV 2 (collegato a data-role="car2-outside-temp").' },
          sensor_car2_inside_temp: { label: 'Sensore Temperatura Interna Auto 2', helper: 'Entità sensore per la temperatura dell\'abitacolo EV 2 (collegato a data-role="car2-inside-temp").' },
          sensor_car2_ac_temp: { label: 'Sensore Temperatura Climatizzatore Auto 2', helper: 'Entità sensore per la temperatura impostata del climatizzatore EV 2 (collegato a data-role="car2-ac-temp").' },
          car2_climate_entity: { label: 'Entità Climatizzazione HVAC Auto 2', helper: 'Entità climate per il controllo HVAC dell\'EV 2 (solo dominio climate).' },
          car2_soc: { label: 'SOC Auto 2', helper: 'Sensore per il SOC dell\'EV 2 (percentuale).' },
          car2_charger_power: { label: 'Potenza caricatore Auto 2', helper: 'Sensore per la potenza del caricatore EV 2.' },
          car2_label: { label: 'Etichetta Auto 2', helper: 'Testo mostrato accanto ai valori del secondo EV.' },
          car_headlight_flash: { label: 'Flash fari durante la ricarica', helper: 'Abilita per far lampeggiare i fari dell\'EV quando la ricarica è rilevata.' },
          car1_glow_brightness: { label: 'Effetto glow Auto 1', helper: 'Percentuale dell\'effetto glow quando non si sta caricando.' },
          car2_glow_brightness: { label: 'Effetto glow Auto 2', helper: 'Percentuale dell\'effetto glow quando non si sta caricando.' },
          car_pct_color: { label: 'Colore SOC Auto', helper: 'Colore hex per il testo SOC EV (es. #00FFFF).' },
          car2_pct_color: { label: 'Colore SOC Auto 2', helper: 'Colore hex per il testo SOC del secondo EV (usa fallback se vuoto).' },
          car1_name_color: { label: 'Colore nome Auto 1', helper: 'Colore applicato all\'etichetta del nome Auto 1.' },
          car2_name_color: { label: 'Colore nome Auto 2', helper: 'Colore applicato all\'etichetta del nome Auto 2.' },
          car1_color: { label: 'Colore Auto 1', helper: 'Colore applicato al valore di potenza Auto 1.' },
          car2_color: { label: 'Colore Auto 2', helper: 'Colore applicato al valore di potenza Auto 2.' },
          heat_pump_label: { label: 'Etichetta pompa di calore', helper: 'Etichetta personalizzata per la linea pompa di calore/AC (default "Heat Pump/AC").' },
          heat_pump_text_color: { label: 'Colore testo pompa di calore', helper: 'Colore applicato al testo della potenza della pompa di calore.' },
          pool_flow_color: { label: 'Colore flusso piscina', helper: 'Colore applicato all\'animazione del flusso della piscina.' },
          pool_text_color: { label: 'Colore testo piscina', helper: 'Colore applicato al testo della potenza della piscina.' },
          washing_machine_text_color: { label: 'Colore testo lavatrice', helper: 'Colore applicato al testo della potenza della lavatrice.' },
          dryer_text_color: { label: 'Colore testo asciugatrice', helper: 'Colore applicato al testo della potenza dell\'asciugatrice.' },
          refrigerator_text_color: { label: 'Colore testo frigorifero', helper: 'Colore applicato al testo della potenza del frigorifero.' },
          freezer_text_color: { label: 'Colore testo congelatore', helper: 'Colore applicato al testo della potenza del congelatore.' },
          windmill_flow_color: { label: 'Colore flusso mulino', helper: 'Colore applicato al flusso del mulino a vento (data-flow-key="windmill-inverter1" / "windmill-inverter2").' },
          windmill_text_color: { label: 'Colore testo mulino', helper: 'Colore applicato al testo della potenza del mulino' },
          header_font_size: { label: 'Dimensione font header (px)', helper: 'Default 8' },
          daily_label_font_size: { label: 'Dimensione font etichetta giornaliera (px)', helper: 'Default 8' },
          daily_value_font_size: { label: 'Dimensione font valore giornaliero (px)', helper: 'Default 20' },
          pv_font_size: { label: 'Dimensione font PV (px)', helper: 'Default 8' },
          windmill_power_font_size: { label: 'Dimensione font potenza mulino (px)', helper: 'Default 8' },
          battery_soc_font_size: { label: 'Dimensione font SOC batteria (px)', helper: 'Default 20' },
          battery_time_until_color: { label: 'Colore Tempo Rimanente Batteria', helper: 'Colore hex applicato al testo del tempo rimanente alla carica/scarica.' },
          battery_time_until_font_size: { label: 'Dimensione Font Tempo Rimanente (px)', helper: 'Default 8' },
          sensor_bat1_state: { label: 'Sensore Stato Batteria 1', helper: 'Entità sensore per il testo dello stato della batteria 1 (collegato a data-role="battery1-state").' },
          sensor_bat2_state: { label: 'Sensore Stato Batteria 2', helper: 'Entità sensore per il testo dello stato della batteria 2 (collegato a data-role="battery2-state").' },
          sensor_bat3_state: { label: 'Sensore Stato Batteria 3', helper: 'Entità sensore per il testo dello stato della batteria 3 (collegato a data-role="battery3-state").' },
          sensor_bat4_state: { label: 'Sensore Stato Batteria 4', helper: 'Entità sensore per il testo dello stato della batteria 4 (collegato a data-role="battery4-state").' },
          battery_state_fully_charged_color: { label: 'Stato Batteria: Completamente Carica', helper: 'Colore quando lo stato della batteria è Completamente Carica.' },
          battery_state_charging_color: { label: 'Stato Batteria: In Carica', helper: 'Colore quando lo stato della batteria è In Carica.' },
          battery_state_discharging_color: { label: 'Stato Batteria: In Scarica', helper: 'Colore quando lo stato della batteria è In Scarica.' },
          battery_state_reserve_color: { label: 'Stato Batteria: Riserva', helper: 'Colore quando lo stato della batteria è Riserva.' },
          battery_state_fully_discharged_color: { label: 'Stato Batteria: Completamente Scarica', helper: 'Colore quando lo stato della batteria è Completamente Scarica.' },
          battery_state_font_size: { label: 'Dimensione Font Stato Batteria (px)', helper: 'Default 8' },
          battery_power_font_size: { label: 'Dimensione font potenza batteria (px)', helper: 'Default 8' },
          inv1_datetime_color: { label: 'Colore DateTime Inverter 1', helper: 'Colore per la visualizzazione datetime batteria Inverter 1' },
          inv1_datetime_font_size: { label: 'Dimensione font DateTime Inverter 1 (px)', helper: 'Dimensione carattere per datetime batteria Inverter 1. Default 8' },
          inv1_timeuntil_color: { label: 'Colore Tempo Fino a Inverter 1', helper: 'Colore per la visualizzazione tempo fino a batteria Inverter 1' },
          inv1_timeuntil_font_size: { label: 'Dimensione font Tempo Fino a Inverter 1 (px)', helper: 'Dimensione carattere per tempo fino a batteria Inverter 1. Default 8' },
          inv2_datetime_color: { label: 'Colore DateTime Inverter 2', helper: 'Colore per la visualizzazione datetime batteria Inverter 2' },
          inv2_datetime_font_size: { label: 'Dimensione font DateTime Inverter 2 (px)', helper: 'Dimensione carattere per datetime batteria Inverter 2. Default 8' },
          inv2_timeuntil_color: { label: 'Colore Tempo Fino a Inverter 2', helper: 'Colore per la visualizzazione tempo fino a batteria Inverter 2' },
          inv2_timeuntil_font_size: { label: 'Dimensione font Tempo Fino a Inverter 2 (px)', helper: 'Dimensione carattere per tempo fino a batteria Inverter 2. Default 8' },
          load_font_size: { label: 'Dimensione font carico (px)', helper: 'Default 8' },
          inv1_power_font_size: { label: 'Dimensione font potenza INV 1 (px)', helper: 'Dimensione font per la linea di potenza INV 1. Di default usa Load Font Size.' },
          inv2_power_font_size: { label: 'Dimensione font potenza INV 2 (px)', helper: 'Dimensione font per la linea di potenza INV 2. Di default usa Load Font Size.' },
          heat_pump_font_size: { label: 'Dimensione font pompa di calore (px)', helper: 'Default 8' },
          pool_font_size: { label: 'Dimensione font piscina (px)', helper: 'Default 8' },
          washing_machine_font_size: { label: 'Dimensione font lavatrice (px)', helper: 'Default 8' },
          dryer_font_size: { label: 'Dimensione font asciugatrice (px)', helper: 'Default 8' },
          refrigerator_font_size: { label: 'Dimensione font frigorifero (px)', helper: 'Default 8' },
          freezer_font_size: { label: 'Dimensione font congelatore (px)', helper: 'Default 8' },
          grid_font_size: { label: 'Dimensione font rete (px)', helper: 'Default 8' },
          car_power_font_size: { label: 'Dimensione font potenza auto (px)', helper: 'Default 8' },
          car2_power_font_size: { label: 'Dimensione font potenza auto 2 (px)', helper: 'Default 8' },
          car_name_font_size: { label: 'Dimensione font nome auto (px)', helper: 'Default 8' },
          car2_name_font_size: { label: 'Dimensione font nome auto 2 (px)', helper: 'Default 8' },
          car_soc_font_size: { label: 'Dimensione font SOC auto (px)', helper: 'Default 8' },
          car2_soc_font_size: { label: 'Dimensione font SOC auto 2 (px)', helper: 'Default 8' },
          sensor_popup_pv_1: { label: 'Popup PV 1', helper: 'Entiteit voor PV-popup regel 1.' },
          sensor_popup_pv_2: { label: 'Popup PV 2', helper: 'Entiteit voor PV-popup regel 2.' },
          sensor_popup_pv_3: { label: 'Popup PV 3', helper: 'Entiteit voor PV-popup regel 3.' },
          sensor_popup_pv_4: { label: 'Popup PV 4', helper: 'Entiteit voor PV-popup regel 4.' },
          sensor_popup_pv_5: { label: 'Popup PV 5', helper: 'Entiteit voor PV-popup regel 5.' },
          sensor_popup_pv_6: { label: 'Popup PV 6', helper: 'Entiteit voor PV-popup regel 6.' },
          sensor_popup_pv_1_name: { label: 'Naam Popup PV 1', helper: 'Optionele aangepaste naam voor PV-popup regel 1. Laat leeg om entiteitsnaam te gebruiken.' },
          sensor_popup_pv_2_name: { label: 'Naam Popup PV 2', helper: 'Optionele aangepaste naam voor PV-popup regel 2. Laat leeg om entiteitsnaam te gebruiken.' },
          sensor_popup_pv_3_name: { label: 'Naam Popup PV 3', helper: 'Optionele aangepaste naam voor PV-popup regel 3. Laat leeg om entiteitsnaam te gebruiken.' },
          sensor_popup_pv_4_name: { label: 'Naam Popup PV 4', helper: 'Optionele aangepaste naam voor PV-popup regel 4. Laat leeg om entiteitsnaam te gebruiken.' },
          sensor_popup_pv_5_name: { label: 'Naam Popup PV 5', helper: 'Optionele aangepaste naam voor PV-popup regel 5. Laat leeg om entiteitsnaam te gebruiken.' },
          sensor_popup_pv_6_name: { label: 'Naam Popup PV 6', helper: 'Optionele aangepaste naam voor PV-popup regel 6. Laat leeg om entiteitsnaam te gebruiken.' },
          sensor_popup_pv_1_color: { label: 'Kleur Popup PV 1', helper: 'Kleur voor PV-popup regel 1 tekst.' },
          sensor_popup_pv_2_color: { label: 'Kleur Popup PV 2', helper: 'Kleur voor PV-popup regel 2 tekst.' },
          sensor_popup_pv_3_color: { label: 'Kleur Popup PV 3', helper: 'Kleur voor PV-popup regel 3 tekst.' },
          sensor_popup_pv_4_color: { label: 'Kleur Popup PV 4', helper: 'Kleur voor PV-popup regel 4 tekst.' },
          sensor_popup_pv_5_color: { label: 'Kleur Popup PV 5', helper: 'Kleur voor PV-popup regel 5 tekst.' },
          sensor_popup_pv_6_color: { label: 'Kleur Popup PV 6', helper: 'Kleur voor PV-popup regel 6 tekst.' },
          sensor_popup_pv_1_font_size: { label: 'Lettergrootte Popup PV 1 (px)', helper: 'Lettergrootte voor PV-popup regel 1. Standaard 8' },
          sensor_popup_pv_2_font_size: { label: 'Lettergrootte Popup PV 2 (px)', helper: 'Lettergrootte voor PV-popup regel 2. Standaard 8' },
          sensor_popup_pv_3_font_size: { label: 'Lettergrootte Popup PV 3 (px)', helper: 'Lettergrootte voor PV-popup regel 3. Standaard 8' },
          sensor_popup_pv_4_font_size: { label: 'Lettergrootte Popup PV 4 (px)', helper: 'Lettergrootte voor PV-popup regel 4. Standaard 8' },
          sensor_popup_pv_5_font_size: { label: 'Lettergrootte Popup PV 5 (px)', helper: 'Lettergrootte voor PV-popup regel 5. Standaard 8' },
          sensor_popup_pv_6_font_size: { label: 'Lettergrootte Popup PV 6 (px)', helper: 'Lettergrootte voor PV-popup regel 6. Standaard 8' }
        },
        options: {
          languages: [
            { value: 'en', label: 'English' },
            { value: 'it', label: 'Italiano' },
            { value: 'de', label: 'Deutsch' },
            { value: 'fr', label: 'Français' },
            { value: 'nl', label: 'Nederlands' },
            { value: 'es', label: 'Español' }
          ],
          display_units: [
            { value: 'W', label: 'Watts (W)' },
            { value: 'kW', label: 'Kilowatts (kW)' }
          ],
          animation_styles: [
            { value: 'dashes', label: 'Dashes (default)' },
            { value: 'dashes_glow', label: 'Dashes + Glow' },
            { value: 'fluid_flow', label: 'Fluid Flow' },
            { value: 'dots', label: 'Dots' },
            { value: 'arrows', label: 'Arrows' }
          ],
          initial_yes: 'Yes',
          initial_no: 'No',
          initial_inverters_1: '1',
          initial_inverters_2: '2',
          initial_batteries_1: '1',
          initial_batteries_2: '2',
          initial_batteries_3: '3',
          initial_batteries_4: '4',
          initial_evs_1: '1',
          initial_evs_2: '2'
        },
        view: {
          daily: 'DAILY YIELD', pv_tot: 'PV TOTAL', car1: 'CAR 1', car2: 'CAR 2', importing: 'IMPORTING', exporting: 'EXPORTING', charging: 'RICARICA', discharging: 'SCARICA', standby: 'STANDBY'
        }
      },
      note: {
      },
      de: {
        sections: {
          general: { title: 'General Settings', helper: 'Karte metadata, background, language, and update cadence.' },
          initialConfig: { title: 'Erstkonfiguration', helper: 'First-time setup checklist and starter options.' },
          pvCommon: { title: 'Solar/PV Common', helper: 'Common Solar/PV settings shared across arrays.' },
          array1: { title: 'Solar/PV Array 1', helper: 'Wähle the PV, battery, grid, load, and EV entities used by the card. Either the PV total sensor or your PV string arrays need to be specified as a minimum.' },
          array2: { title: 'Solar/PV Array 2', helper: 'If PV-Gesamtsensor (Wechselrichter 2) is set or the PV String values are provided, Array 2 will become active and enable the second inverter. You must also enable Täglich Ertrag Sensor (Array 2) and Home Load (Wechselrichter 2).' },
          windmill: { title: 'Windrad', helper: 'Konfiguriere windmill generator sensors and display styling.' },
          battery: { title: 'Batterie', helper: 'Konfiguriere battery entities.' },
          grid: { title: 'Netz', helper: 'Konfiguriere grid entities.' },
          car: { title: 'Auto', helper: 'Konfiguriere EV entities.' },
          other: { title: 'Haus', helper: 'Additional sensors and advanced toggles.' },
          pvPopup: { title: 'PV Popup', helper: 'Konfiguriere entities for the PV popup display.' },
          housePopup: { title: 'Haus Popup', helper: 'Konfiguriere entities for the house popup display.' },
          carPopup: { title: 'Auto Popup', helper: 'Configure auto-detected EV sensors, climate controls, and extra entities for the car (EV) popups.' },
          batteryPopup: { title: 'Batterie Popup', helper: 'Konfiguriere battery popup display.' },
          gridPopup: { title: 'Netz Popup', helper: 'Konfiguriere entities for the grid popup display.' },
          inverterPopup: { title: 'Wechselrichter Popup', helper: 'Konfiguriere entities for the inverter popup display.' },
          colors: { title: 'Farbe & Thresholds', helper: 'Konfiguriere grid thresholds and accent colours for flows and EV display.' },
          typography: { title: 'Typography', helper: 'Fine tune the font sizes used across the card.' },
          stats: { title: 'Statistiken', helper: 'Konfiguriere Energie-Statistik-Sensoren und Beschriftungen.' },
          about: { title: 'About', helper: 'Credits, version, and helpful links.' }
        },
        fields: {
          card_title: { label: 'Kartentitel', helper: 'Titel displayed at the top of the card. Leer lassen to disable.' },
          title_text_color: { label: 'Titel Textfarbe', helper: 'Overrides the fill color for [data-role="title-text"]. Leer lassen to keep the SVG styling.' },
          title_bg_color: { label: 'Titel Hintergrundfarbe', helper: 'Overrides the fill color for [data-role="title-bg"]. Leer lassen to keep the SVG styling.' },
          card_label_color: { label: 'Karten-Beschriftungsfarbe', helper: 'Standardfarbe für SVG-Elemente mit data-style="config" und data-role="label".' },
          card_label_font_size: { label: 'Karten-Beschriftungsgröße', helper: 'Standardschriftgröße für SVG-Elemente mit data-style="config" und data-role="label".' },
          card_background_color: { label: 'Karten-Hintergrundfarbe', helper: 'Standardfarbe für SVG-Elemente mit data-style="config" und data-role="card".' },
          card_label_css: { label: 'Zusatz-Label-CSS', helper: 'Zusätzliche CSS-Deklarationen für SVG-Elemente mit data-style="config" und data-role="label".' },
          font_family: { label: 'Schriftfamilie', helper: 'CSS font-family used for all SVG text (e.g., sans-serif, Roboto, "Segoe UI").' },
          odometer_font_family: { label: 'Odometer Schriftfamilie (Monospace)', helper: 'Font family used only for odometer-animated values. Leer lassen to reuse Schriftfamilie. Tip: pick a monospace variant (e.g., "Roboto Mono" or "Space Mono").' },
          background: { label: 'Hintergrund', helper: 'Pfad zur Hintergrund-SVG (z. B. /local/community/advanced-energy-card/tech.svg).' },
          night_mode: { label: 'Tag/Nacht-Modus', helper: 'Wähle Day, Night, or Auto. Auto uses sun.sun: above_horizon = Day, below_horizon = Night.' },
          language: { label: 'Sprache', helper: 'Wähle the editor language.' },
          display_unit: { label: 'Anzeigeeinheit', helper: 'Unit used when formatting power values.' },
          update_interval: { label: 'Aktualisierungsintervall', helper: 'Refresh cadence for card updates (0 disables throttling).' },
          initial_configuration: { label: 'Erstkonfiguration', helper: 'Show the Erstkonfiguration section in the editor.' },
          initial_has_pv: { label: 'Do you have Solar/PV Leistung?', helper: 'Wähle Yes if you have solar production to configure.' },
          initial_inverters: { label: 'How many inverters do you have?', helper: 'Shown only when Solar/PV is enabled.' },
          initial_has_battery: { label: 'Do you have Batterie storage?', helper: '' },
          initial_battery_count: { label: 'How many Batteries do you have? Maximum 4', helper: '' },
          initial_has_grid: { label: 'Do you have Netz supplied electricity?', helper: '' },
          initial_can_export: { label: 'Can you export excess electricity to the grid?', helper: '' },
          initial_has_windmill: { label: 'Do you have a Windrad?', helper: '' },
          initial_has_ev: { label: 'Do you have Electric Vehicles/EV\'s?', helper: '' },
          initial_ev_count: { label: 'How many do you have?', helper: '' },
          initial_config_items_title: { label: 'Erforderlich configuration items', helper: '' },
          initial_config_items_helper: { label: 'These items become relevant based on your answers above.', helper: '' },
          initial_config_items_empty: { label: 'No items to show yet.', helper: '' },
          initial_config_complete_helper: { label: 'This completes the last required minimum configuration. Once clicking on the Complete button, please review all menus to check for additional items and popup configurations. This initial configuration can be re-enabled in the General menu.', helper: '' },
          initial_config_complete_button: { label: 'Complete', helper: '' },
          array_helper_text: { label: 'Each Array must have at minimum a combined Solar/PV total sensor which is the total power output of that Array or individual string values which are added together to get the total power output of the array. Täglich production can be supplied and can be shown in a Täglich production card.', helper: '' },
          animation_speed_factor: { label: 'Animationsgeschwindigkeitsfaktor', helper: 'Adjust animation speed multiplier (-3x to 3x). Set 0 to pause; negatives reverse direction.' },
          animation_style: { label: 'Animationsstil (Tag)', helper: 'Flow animation style used when the card is in Day mode.' },
          night_animation_style: { label: 'Animationsstil (Nacht)', helper: 'Flow animation style used when the card is in Night mode. Leer lassen to use the Day style.' },
          dashes_glow_intensity: { label: 'Leuchtintensität (Striche)', helper: 'Controls glow strength for "Dashes + Glow" (0 disables glow).' },
          fluid_flow_outer_glow: { label: 'Äußeres Leuchten (Fließend)', helper: 'Aktivieren the extra outer haze/glow layer for animation_style: fluid_flow.' },
          flow_stroke_width: { label: 'Flow Stroke Width ((px))', helper: 'Optional override for the animated flow stroke width (no SVG edits). Leer lassen to keep SVG defaults.' },
          fluid_flow_stroke_width: { label: 'Fluid Flow Stroke Width ((px))', helper: 'Base stroke width for animation_style: fluid_flow. Overlay/mask widths are derived from this (default 5).' },
          arrow_scale: { label: 'Pfeilskalierung', helper: 'Extra size multiplier for the arrows in the "Arrows" animation style. Arrows already scale automatically with Flow Stroke Width; increase if still too small, decrease if too large.' },
          sensor_pv_total: { label: 'PV-Gesamtsensor', helper: 'Optional aggregate production sensor displayed as the combined line.' },
          sensor_pv_total_secondary: { label: 'PV-Gesamtsensor (Wechselrichter 2)', helper: 'Optional second inverter total; added to the PV total when provided.' },
          sensor_windmill_total: { label: 'Windrad Total', helper: 'Leistung sensor for the windmill generator (W). When not configured the windmill SVG group is hidden.' },
          sensor_windmill_daily: { label: 'Täglich Windrad Ertrag', helper: 'Optional sensor reporting daily windmill production totals.' },
          sensor_pv1: { label: 'PV String 1 (Array 1)', helper: 'Array 1 solar production sensor for string 1.' },
          sensor_pv2: { label: 'PV String 2 (Array 1)', helper: 'Array 1 solar production sensor for string 2.' },
          sensor_pv3: { label: 'PV String 3 (Array 1)', helper: 'Array 1 solar production sensor for string 3.' },
          sensor_pv4: { label: 'PV String 4 (Array 1)', helper: 'Array 1 solar production sensor for string 4.' },
          sensor_pv5: { label: 'PV String 5 (Array 1)', helper: 'Array 1 solar production sensor for string 5.' },
          sensor_pv6: { label: 'PV String 6 (Array 1)', helper: 'Array 1 solar production sensor for string 6.' },
          sensor_pv_array2_1: { label: 'PV String 1 (Array 2)', helper: 'Array 2 solar production sensor for string 1.' },
          sensor_pv_array2_2: { label: 'PV String 2 (Array 2)', helper: 'Array 2 solar production sensor for string 2.' },
          sensor_pv_array2_3: { label: 'PV String 3 (Array 2)', helper: 'Array 2 solar production sensor for string 3.' },
          sensor_pv_array2_4: { label: 'PV String 4 (Array 2)', helper: 'Array 2 solar production sensor for string 4.' },
          sensor_pv_array2_5: { label: 'PV String 5 (Array 2)', helper: 'Array 2 solar production sensor for string 5.' },
          sensor_pv_array2_6: { label: 'PV String 6 (Array 2)', helper: 'Array 2 solar production sensor for string 6.' },
          sensor_daily: { label: 'Täglich Ertrag Sensor', helper: 'Sensor reporting daily production totals. Either the PV total sensor or your PV string arrays need to be specified as a minimum.' },
          sensor_daily_array2: { label: 'Täglich Ertrag Sensor (Array 2)', helper: 'Sensor reporting daily production totals for Array 2.' },
          sensor_bat1_soc: { label: 'Batterie 1 SOC', helper: 'Ladezustand sensor for Batterie 1 (percentage).' },
          sensor_bat1_power: { label: 'Batterie 1 Leistung', helper: 'Provide this combined power sensor or both charge/discharge sensors so Batterie 1 becomes active.' },
          sensor_bat1_charge_power: { label: 'Batterie 1 Laden Leistung', helper: 'Sensor for Batterie 1 charging power.' },
          sensor_bat1_discharge_power: { label: 'Batterie 1 Entladen Leistung', helper: 'Sensor for Batterie 1 discharging power.' },
          sensor_bat1_capacity_sensor: { label: 'Batterie 1 Nutzbare Kapazität Sensor', helper: 'Optionaler Sensor, der die nutzbare Kapazität von Batterie 1 in Wh oder kWh meldet. Wird mit dem Reserveprozentsatz verwendet, um die effektive Kapazität zu berechnen.' },
          bat1_capacity_manual: { label: 'Batterie 1 Nutzbare Kapazität (Manuell)', helper: 'Alternative manuelle Eingabe für die nutzbare Kapazität von Batterie 1. Geben Sie den Wert in den durch Ihre display_unit-Einstellung festgelegten Einheiten (Wh oder kWh) ein. Wird ignoriert, wenn ein Kapazitätssensor bereitgestellt wird.' },
          bat1_reserve_percentage: { label: 'Batterie 1 Reserveprozentsatz', helper: 'Optionaler Reserveprozentsatz für Batterie 1 (0-100). Einige Systeme halten eine Reserve, um die Batteriegesundheit zu erhalten. Dies reduziert die angezeigte effektive nutzbare Kapazität.' },
          sensor_bat1_time_until: { label: 'Batterie 1 Zeit Bis Voll/Leer Sensor', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_bat2_soc: { label: 'Batterie 2 SOC', helper: 'Ladezustand sensor for Batterie 2 (percentage).' },
          sensor_bat2_power: { label: 'Batterie 2 Leistung', helper: 'Provide this combined power sensor or both charge/discharge sensors so Batterie 2 becomes active.' },
          sensor_bat2_charge_power: { label: 'Batterie 2 Laden Leistung', helper: 'Sensor for Batterie 2 charging power.' },
          sensor_bat2_discharge_power: { label: 'Batterie 2 Entladen Leistung', helper: 'Sensor for Batterie 2 discharging power.' },
          sensor_bat2_capacity_sensor: { label: 'Batterie 2 Nutzbare Kapazität Sensor', helper: 'Optionaler Sensor, der die nutzbare Kapazität von Batterie 2 in Wh oder kWh meldet. Wird mit dem Reserveprozentsatz verwendet, um die effektive Kapazität zu berechnen.' },
          bat2_capacity_manual: { label: 'Batterie 2 Nutzbare Kapazität (Manuell)', helper: 'Alternative manuelle Eingabe für die nutzbare Kapazität von Batterie 2. Geben Sie den Wert in den durch Ihre display_unit-Einstellung festgelegten Einheiten (Wh oder kWh) ein. Wird ignoriert, wenn ein Kapazitätssensor bereitgestellt wird.' },
          bat2_reserve_percentage: { label: 'Batterie 2 Reserveprozentsatz', helper: 'Optionaler Reserveprozentsatz für Batterie 2 (0-100). Einige Systeme halten eine Reserve, um die Batteriegesundheit zu erhalten. Dies reduziert die angezeigte effektive nutzbare Kapazität.' },
          sensor_bat2_time_until: { label: 'Batterie 2 Zeit Bis Voll/Leer Sensor', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_bat3_soc: { label: 'Batterie 3 SOC', helper: 'Ladezustand sensor for Batterie 3 (percentage).' },
          sensor_bat3_power: { label: 'Batterie 3 Leistung', helper: 'Provide this combined power sensor or both charge/discharge sensors so Batterie 3 becomes active.' },
          sensor_bat3_charge_power: { label: 'Batterie 3 Laden Leistung', helper: 'Sensor for Batterie 3 charging power.' },
          sensor_bat3_discharge_power: { label: 'Batterie 3 Entladen Leistung' },
          sensor_bat3_capacity_sensor: { label: 'Batterie 3 Nutzbare Kapazität Sensor', helper: 'Optionaler Sensor, der die nutzbare Kapazität von Batterie 3 in Wh oder kWh meldet. Wird mit dem Reserveprozentsatz verwendet, um die effektive Kapazität zu berechnen.' },
          bat3_capacity_manual: { label: 'Batterie 3 Nutzbare Kapazität (Manuell)', helper: 'Alternative manuelle Eingabe für die nutzbare Kapazität von Batterie 3. Geben Sie den Wert in den durch Ihre display_unit-Einstellung festgelegten Einheiten (Wh oder kWh) ein. Wird ignoriert, wenn ein Kapazitätssensor bereitgestellt wird.' },
          bat3_reserve_percentage: { label: 'Batterie 3 Reserveprozentsatz', helper: 'Optionaler Reserveprozentsatz für Batterie 3 (0-100). Einige Systeme halten eine Reserve, um die Batteriegesundheit zu erhalten. Dies reduziert die angezeigte effektive nutzbare Kapazität.' },
          sensor_bat3_time_until: { label: 'Batterie 3 Zeit Bis Voll/Leer Sensor', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_bat4_soc: { label: 'Batterie 4 SOC', helper: 'Ladezustand sensor for Batterie 4 (percentage).' },
          sensor_bat4_power: { label: 'Batterie 4 Leistung', helper: 'Provide this combined power sensor or both charge/discharge sensors so Batterie 4 becomes active.' },
          sensor_bat4_charge_power: { label: 'Batterie 4 Laden Leistung', helper: 'Sensor for Batterie 4 charging power.' },
          sensor_bat4_discharge_power: { label: 'Batterie 4 Entladen Leistung', helper: 'Sensor for Batterie 4 discharging power.' },
          sensor_bat4_capacity_sensor: { label: 'Batterie 4 Nutzbare Kapazität Sensor', helper: 'Optionaler Sensor, der die nutzbare Kapazität von Batterie 4 in Wh oder kWh meldet. Wird mit dem Reserveprozentsatz verwendet, um die effektive Kapazität zu berechnen.' },
          bat4_capacity_manual: { label: 'Batterie 4 Nutzbare Kapazität (Manuell)', helper: 'Alternative manuelle Eingabe für die nutzbare Kapazität von Batterie 4. Geben Sie den Wert in den durch Ihre display_unit-Einstellung festgelegten Einheiten (Wh oder kWh) ein. Wird ignoriert, wenn ein Kapazitätssensor bereitgestellt wird.' },
          bat4_reserve_percentage: { label: 'Batterie 4 Reserveprozentsatz', helper: 'Optionaler Reserveprozentsatz für Batterie 4 (0-100). Einige Systeme halten eine Reserve, um die Batteriegesundheit zu erhalten. Dies reduziert die angezeigte effektive nutzbare Kapazität.' },
          sensor_bat4_time_until: { label: 'Batterie 4 Zeit Bis Voll/Leer Sensor', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_home_load: { label: 'Home Load/Consumption (Erforderlich)', helper: 'Total household consumption sensor.' },
          sensor_home_load_secondary: { label: 'Home Load (Wechselrichter 2)', helper: 'Optional house load sensor for the second inverter.' },
          sensor_heat_pump_consumption: { label: 'Heat Pump Consumption', helper: 'Sensor for heat pump energy consumption.' },
          sensor_hot_water_consumption: { label: 'Water Heating', helper: 'Sensor for Hot Water Heating Load.' },
          sensor_pool_consumption: { label: 'Pool', helper: 'Sensor for pool power/consumption.' },
          sensor_washing_machine_consumption: { label: 'Washing Machine', helper: 'Sensor for washing machine power/consumption.' },
          sensor_dishwasher_consumption: { label: 'Dish Washer', helper: 'Sensor for Dish Washer Load.' },
          sensor_dryer_consumption: { label: 'Dryer', helper: 'Sensor for dryer power/consumption.' },
          sensor_refrigerator_consumption: { label: 'Refrigerator', helper: 'Sensor for refrigerator power/consumption.' },
          sensor_freezer_consumption: { label: 'Freezer', helper: 'Sensor for freezer power/consumption.' },
          hot_water_text_color: { label: 'Water Heating Textfarbe', helper: 'Farbe applied to the hot water power text.' },
          dishwasher_text_color: { label: 'Dish Washer Textfarbe', helper: 'Farbe applied to the dish washer power text.' },
          hot_water_font_size: { label: 'Water Heating Font Size ((px))', helper: 'Standard 8' },
          dishwasher_font_size: { label: 'Dish Washer Font Size ((px))', helper: 'Standard 8' },
          sensor_grid_power: { label: 'Netz Wechselrichter 1 Leistung', helper: 'Positive/negative grid flow sensor for inverter 1. Specify either this sensor or both Netz Wechselrichter 1 Import Sensor and Netz Wechselrichter 1 Export Sensor.' },
          sensor_grid_import: { label: 'Netz Wechselrichter 1 Import Sensor', helper: 'Optional entity reporting inverter 1 grid import (positive) power.' },
          sensor_grid_export: { label: 'Netz Wechselrichter 1 Export Sensor', helper: 'Optional entity reporting inverter 1 grid export (positive) power.' },
          sensor_grid_import_daily: { label: 'Täglich Netz Wechselrichter 1 Import Sensor', helper: 'Optional entity reporting cumulative inverter 1 grid import for the current day.' },
          sensor_grid_export_daily: { label: 'Täglich Netz Wechselrichter 1 Export Sensor', helper: 'Optional entity reporting cumulative inverter 1 grid export for the current day.' },
          sensor_grid2_power: { label: 'Netz Wechselrichter 2 Leistung', helper: 'Positive/negative grid flow sensor for inverter 2. Specify either this sensor or both Netz Wechselrichter 2 Import Sensor and Netz Wechselrichter 2 Export Sensor.' },
          sensor_grid2_import: { label: 'Netz Wechselrichter 2 Import Sensor', helper: 'Optional entity reporting inverter 2 grid import (positive) power.' },
          sensor_grid2_export: { label: 'Netz Wechselrichter 2 Export Sensor', helper: 'Optional entity reporting inverter 2 grid export (positive) power.' },
          sensor_grid2_import_daily: { label: 'Täglich Netz Wechselrichter 2 Import Sensor', helper: 'Optional entity reporting cumulative inverter 2 grid import for the current day.' },
          sensor_grid2_export_daily: { label: 'Täglich Netz Wechselrichter 2 Export Sensor', helper: 'Optional entity reporting cumulative inverter 2 grid export for the current day.' },
          show_daily_grid: { label: 'Show Täglich Netz Values', helper: 'Show the daily import/export totals under the current grid flow when enabled.' },
          grid_daily_font_size: { label: 'Täglich Netz Font Size ((px))', helper: 'Optional override for daily grid import/export text. Standards to Netz Font Size.' },
          grid_current_odometer: { label: 'Odometer: Netz Current', helper: 'Animate Netz Current with a per-digit rolling effect.' },
          grid_current_odometer_duration: { label: 'Odometer Dauer ((ms))', helper: 'Animation duration in milliseconds. Standard 350.' },
          show_grid_flow_label: { label: 'Show Netz Import/Export Name', helper: 'Prepend the importing/exporting label before the grid value when enabled.' },
          sensor_grid_state: { label: 'Netz Status Sensor', helper: 'Sensor-Entität für den Netz-Status-Text (verknüpft mit data-role="grid-state").' },
          grid_state_importing_color: { label: 'Netz Import Farbe', helper: 'Farbe wenn der Netz-Status Import ist.' },
          grid_state_exporting_color: { label: 'Netz Export Farbe', helper: 'Farbe wenn der Netz-Status Export ist.' },
          grid_state_floating_color: { label: 'Netz Floating Farbe', helper: 'Farbe wenn der Netz-Status Floating ist.' },
          grid_state_font_size: { label: 'Netz Status Font Size (px)', helper: 'Standard 8' },
          sensor_solar_state: { label: 'Solar Status Sensor', helper: 'Sensor-Entität für den Solar-Status-Text (verknüpft mit data-role="solar-state"). Gibt "Producing Power" oder "Not Producing" zurück.' },
          solar_state_producing_color: { label: 'Solar Status Produziert Farbe', helper: 'Farbe wenn der Solar-Status produzierend ist.' },
          solar_state_not_producing_color: { label: 'Solar Status Nicht Produziert Farbe', helper: 'Farbe wenn der Solar-Status nicht produzierend ist.' },
          solar_state_font_size: { label: 'Solar Status Font Size (px)', helper: 'Standard 8' },
          sensor_solar_forecast_today: { label: 'Solar Prognose Heute Sensor', helper: 'Sensor-Entität für die heutige Solarprognose (verknüpft mit data-role="solar-forecast-today").' },
          sensor_solar_forecast_tomorrow: { label: 'Solar Prognose Morgen Sensor', helper: 'Sensor-Entität für die morgige Solarprognose (verknüpft mit data-role="solar-forecast-tomorrow").' },
          sensor_weather_icon: { label: 'Wetter Icon Sensor', helper: 'Sensor-Entität für Wetter-Icon-Text (verknüpft mit data-role="weather-icon").' },
          weather_icon_color: { label: 'Wetter Icon Farbe', helper: 'Farbe für den Wetter-Icon-Text.' },
          weather_icon_font_size: { label: 'Wetter Icon Schriftgröße (px)', helper: 'Standard 8' },
          sensor_weather_forecast: { label: 'Wettervorhersage Sensor', helper: 'Sensor-Entität für Wettervorhersage-Text (verknüpft mit data-role="weather-forecast").' },
          weather_forecast_color: { label: 'Wettervorhersage Farbe', helper: 'Farbe für den Wettervorhersage-Text.' },
          weather_forecast_font_size: { label: 'Wettervorhersage Schriftgröße (px)', helper: 'Standard 8' },
          sun_moon_display: { label: 'Sonne/Mond Anzeige', helper: 'Zeigt eine Sonne oder einen Mond, die den Tag/Nacht-Zyklus verfolgen. Aus = verborgen, Nur Sonne = Sonne tagsüber, Sonne & Mond = Sonne tagsüber, Mond nachts.' },
          sun_moon_arc_color: { label: 'Bogenfarbe', helper: 'Strichfarbe für den Sonne/Mond-Bogenpfad. Leer lassen für keine (unsichtbar).' },
          sun_moon_arc_stroke_width: { label: 'Bogenlinienbreite', helper: 'Linienbreite (px) für den Sonne/Mond-Bogenpfad.' },
          sun_moon_label_color: { label: 'Sonnenaufgang/Sonnenuntergang Beschriftungsfarbe', helper: 'Farbe für die Aufgangs- und Untergangszeit-Beschriftungen. Leer lassen für Sonne/Mond-Symbolfarbe.' },
          sun_moon_label_font_size: { label: 'Schriftgröße Aufgang/Untergang Beschriftung', helper: 'Schriftgröße (px) für den Aufgangs- und Untergangstext. Leer lassen für Standard.' },
          sun_moon_sunrise_label: { label: 'Sonnenaufgang Beschriftungstext', helper: 'Benutzerdefinierter Text für die Sonnenaufgangsbezeichnung. Leer lassen für SVG-Standard.' },
          sun_moon_sunset_label: { label: 'Sonnenuntergang Beschriftungstext', helper: 'Benutzerdefinierter Text für die Sonnenuntergangsbezeichnung. Leer lassen für SVG-Standard.' },
          stats_value_color: { label: 'Stats Value Color', helper: 'Color applied to all stat values.' },
          stats_value_font_size: { label: 'Stats Value Font Size (px)', helper: 'Font size for all stat values. Default 14' },
          stats_label_color: { label: 'Stats Label Color', helper: 'Color applied to all stat labels.' },
          stats_label_font_size: { label: 'Stats Label Font Size (px)', helper: 'Font size for all stat labels. Default 12' },
          inverter1_status_text_color: { label: 'Wechselrichter Status Text Farbe', helper: 'Farbe für den Wechselrichter-Statustext (Laden/Entladen/Importieren/Exportieren).' },
          inverter1_status_font_size: { label: 'Wechselrichter Status Schriftgröße (px)', helper: 'Schriftgröße für Wechselrichter-Statustext. Standard 8' },
          enable_echo_alive: { label: 'Aktivieren Echo Alive', helper: 'Aktivierens an invisible iframe to keep the Silk browser open on Echo Show. The button will be positioned in a corner of the card.' },
          pv_tot_color: { label: 'PV Total Farbe', helper: 'Colour applied to the PV TOTAL text line.' },
          pv_primary_color: { label: 'PV 1 Flow Farbe', helper: 'Colour used for the primary PV animation line.' },
          pv_secondary_color: { label: 'PV 2 Flow Farbe', helper: 'Colour used for the secondary PV animation line when available.' },
          load_flow_color: { label: 'Load Flow Farbe', helper: 'Colour applied to the home load animation line.' },
          load_text_color: { label: 'Load Textfarbe', helper: 'Colour applied to the home load text when thresholds are inactive.' },
          house_total_color: { label: 'Haus Total Farbe', helper: 'Colour applied to the HOUSE TOT text/flow.' },
          inv1_color: { label: 'Wechselrichter 1 to Haus Farbe', helper: 'Farbe applied to the flow from Wechselrichter 1 to the house.' },
          inv2_color: { label: 'Wechselrichter 2 to Haus Farbe', helper: 'Farbe applied to the flow from Wechselrichter 2 to the house.' },
          load_threshold_warning: { label: 'Load Warning Schwellenwert', helper: 'Change load color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          load_warning_color: { label: 'Load Warning Farbe', helper: 'Hex or CSS color applied at the load warning threshold.' },
          load_threshold_critical: { label: 'Load Critical Schwellenwert', helper: 'Change load color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          load_critical_color: { label: 'Load Critical Farbe', helper: 'Hex or CSS color applied at the load critical threshold.' },
          battery_soc_color: { label: 'Batterie SOC Farbe', helper: 'Hex color applied to the battery SOC percentage text.' },
          battery_charge_color: { label: 'Batterie Laden Flow Farbe', helper: 'Colour used when energy is flowing into the battery.' },
          battery_discharge_color: { label: 'Batterie Entladen Flow Farbe', helper: 'Colour used when energy is flowing from the battery.' },
          grid_import_color: { label: 'Wechselrichter 1 Netz Import Flow Farbe', helper: 'Base colour before thresholds when inverter 1 is importing from the grid.' },
          grid_export_color: { label: 'Wechselrichter 1 Netz Export Flow Farbe', helper: 'Base colour before thresholds when inverter 1 is exporting to the grid.' },
          grid2_import_color: { label: 'Wechselrichter 2 Netz Import Flow Farbe', helper: 'Base colour before thresholds when inverter 2 is importing from the grid.' },
          grid2_export_color: { label: 'Wechselrichter 2 Netz Export Flow Farbe', helper: 'Base colour before thresholds when inverter 2 is exporting to the grid.' },
          car_flow_color: { label: 'EV Flow Farbe', helper: 'Colour applied to the electric vehicle animation line.' },
          battery_fill_high_color: { label: 'Batterie Fill (Normal) Farbe', helper: 'Liquid fill colour when the battery SOC is above the low threshold.' },
          battery_fill_low_color: { label: 'Batterie Fill (Low) Farbe', helper: 'Liquid fill colour when the battery SOC is at or below the low threshold.' },
          battery_fill_low_threshold: { label: 'Batterie Low Fill Schwellenwert (%)', helper: 'Use the low fill colour when SOC is at or below this percentage.' },
          battery_fill_opacity: { label: 'Batterie Fill Opacity', helper: 'Opacity for the battery fill level (0-1).' },
          grid_activity_threshold: { label: 'Netz Animation Schwellenwert (W)', helper: 'Ignore grid flows whose absolute value is below this wattage before animating.' },
          grid_power_only: { label: 'Netz Leistung Only', helper: 'Hide inverter/battery flows and show a direct grid-to-house flow.' },
          grid_threshold_warning: { label: 'Wechselrichter 1 Netz Warning Schwellenwert', helper: 'Change inverter 1 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid_warning_color: { label: 'Wechselrichter 1 Netz Warning Farbe', helper: 'Hex or CSS color applied at the inverter 1 warning threshold.' },
          grid_threshold_critical: { label: 'Wechselrichter 1 Netz Critical Schwellenwert', helper: 'Change inverter 1 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid_critical_color: { label: 'Wechselrichter 1 Netz Critical Farbe', helper: 'Hex or CSS color applied at the inverter 1 critical threshold.' },
          grid2_threshold_warning: { label: 'Wechselrichter 2 Netz Warning Schwellenwert', helper: 'Change inverter 2 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid2_warning_color: { label: 'Wechselrichter 2 Netz Warning Farbe', helper: 'Hex or CSS color applied at the inverter 2 warning threshold.' },
          grid2_threshold_critical: { label: 'Wechselrichter 2 Netz Critical Schwellenwert', helper: 'Change inverter 2 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid2_critical_color: { label: 'Wechselrichter 2 Netz Critical Farbe', helper: 'Hex or CSS color applied at the inverter 2 critical threshold.' },
          invert_grid: { label: 'Invert Netz Values', helper: 'Aktivieren if import/export polarity is reversed.' },
          invert_battery: { label: 'Invert Batterie Values', helper: 'Aktivieren if charge/discharge polarity is reversed.' },
          invert_bat1: { label: 'Invert Batterie 1 Values', helper: 'Aktivieren if Batterie 1 charge/discharge polarity is reversed.' },
          invert_bat2: { label: 'Invert Batterie 2 Values', helper: 'Aktivieren if Batterie 2 charge/discharge polarity is reversed.' },
          invert_bat3: { label: 'Invert Batterie 3 Values', helper: 'Aktivieren if Batterie 3 charge/discharge polarity is reversed.' },
          sensor_car_power: { label: 'Auto 1 Leistung Sensor', helper: 'Sensor for EV charge/discharge power.' },
          sensor_car_soc: { label: 'Auto 1 SOC Sensor', helper: 'Ladezustand sensor for EV 1 (percentage).' },
          sensor_car_range: { label: 'Auto 1 Reichweite Sensor', helper: 'Sensor-Entität für die Reichweite von EV 1 (verknüpft mit data-role="car1-range").' },
          sensor_car_state: { label: 'Auto 1 Ladezustand-Text Sensor', helper: 'Sensor-Entität für den Ladezustand-Text von EV 1 (verknüpft mit data-role="car1-state").' },
          sensor_car_hvac_status: { label: 'Auto 1 Klimaanlagen-Status Sensor', helper: 'Sensor-Entität für den Klimaanlagen-/HVAC-Status von EV 1 (verknüpft mit data-role="car1-hvac-status").' },
          sensor_car_outside_temp: { label: 'Auto 1 Außentemperatur Sensor', helper: 'Sensor-Entität für die Außentemperatur von EV 1 (verknüpft mit data-role="car1-outside-temp").' },
          sensor_car_inside_temp: { label: 'Auto 1 Innentemperatur Sensor', helper: 'Sensor-Entität für die Innenraumtemperatur von EV 1 (verknüpft mit data-role="car1-inside-temp").' },
          sensor_car_ac_temp: { label: 'Auto 1 Klimaanlagen-Temperatur Sensor', helper: 'Sensor-Entität für die eingestellte Klimaanlagen-Temperatur von EV 1 (verknüpft mit data-role="car1-ac-temp").' },
          car1_climate_entity: { label: 'Auto 1 HVAC Climate-Entität', helper: 'Climate-Entität für die HVAC-Steuerung von EV 1 (nur climate-Domäne).' },
          car_soc: { label: 'Auto SOC', helper: 'Sensor for EV battery SOC (percentage).' },
          car_charger_power: { label: 'Auto Charger Leistung', helper: 'Sensor for EV charger power.' },
          car1_label: { label: 'Auto 1 Bezeichnung', helper: 'Text displayed next to the first EV values.' },
          sensor_car2_power: { label: 'Auto 2 Leistung Sensor', helper: 'Sensor for EV 2 charge/discharge power.' },
          car2_power: { label: 'Auto 2 Leistung', helper: 'Sensor for EV 2 charge/discharge power.' },
          sensor_car2_soc: { label: 'Auto 2 SOC Sensor', helper: 'Ladezustand sensor for EV 2 (percentage).' },
          sensor_car2_range: { label: 'Auto 2 Reichweite Sensor', helper: 'Sensor-Entität für die Reichweite von EV 2 (verknüpft mit data-role="car2-range").' },
          sensor_car2_state: { label: 'Auto 2 Ladezustand-Text Sensor', helper: 'Sensor-Entität für den Ladezustand-Text von EV 2 (verknüpft mit data-role="car2-state").' },
          sensor_car2_hvac_status: { label: 'Auto 2 Klimaanlagen-Status Sensor', helper: 'Sensor-Entität für den Klimaanlagen-/HVAC-Status von EV 2 (verknüpft mit data-role="car2-hvac-status").' },
          sensor_car2_outside_temp: { label: 'Auto 2 Außentemperatur Sensor', helper: 'Sensor-Entität für die Außentemperatur von EV 2 (verknüpft mit data-role="car2-outside-temp").' },
          sensor_car2_inside_temp: { label: 'Auto 2 Innentemperatur Sensor', helper: 'Sensor-Entität für die Innenraumtemperatur von EV 2 (verknüpft mit data-role="car2-inside-temp").' },
          sensor_car2_ac_temp: { label: 'Auto 2 Klimaanlagen-Temperatur Sensor', helper: 'Sensor-Entität für die eingestellte Klimaanlagen-Temperatur von EV 2 (verknüpft mit data-role="car2-ac-temp").' },
          car2_climate_entity: { label: 'Auto 2 HVAC Climate-Entität', helper: 'Climate-Entität für die HVAC-Steuerung von EV 2 (nur climate-Domäne).' },
          car2_soc: { label: 'Auto 2 SOC', helper: 'Sensor for EV 2 battery SOC (percentage).' },
          car2_charger_power: { label: 'Auto 2 Charger Leistung', helper: 'Sensor for EV 2 charger power.' },
          car2_label: { label: 'Auto 2 Bezeichnung', helper: 'Text displayed next to the second EV values.' },
          car_headlight_flash: { label: 'Headlight Flash While Charging', helper: 'Aktivieren to flash the EV headlights whenever charging is detected.' },
          car1_glow_brightness: { label: 'Auto Glow Effect', helper: 'Percentage the car flow effects show while not charging.' },
          car2_glow_brightness: { label: 'Auto Glow Effect', helper: 'Percentage the car flow effects show while not charging.' },
          car_pct_color: { label: 'Auto SOC Farbe', helper: 'Hex color for EV SOC text (e.g., #00FFFF).' },
          car2_pct_color: { label: 'Auto 2 SOC Farbe', helper: 'Hex color for second EV SOC text (falls back to Auto SOC Farbe).' },
          car1_name_color: { label: 'Auto 1 Name Farbe', helper: 'Farbe applied to the Auto 1 name label.' },
          car2_name_color: { label: 'Auto 2 Name Farbe', helper: 'Farbe applied to the Auto 2 name label.' },
          car1_color: { label: 'Auto 1 Farbe', helper: 'Farbe applied to Auto 1 power value.' },
          car2_color: { label: 'Auto 2 Farbe', helper: 'Farbe applied to Auto 2 power value.' },
          heat_pump_label: { label: 'Heat Pump Bezeichnung', helper: 'Custom label for the heat pump/AC line (defaults to "Heat Pump/AC").' },
          heat_pump_text_color: { label: 'Heat Pump Textfarbe', helper: 'Farbe applied to the heat pump power text.' },
          pool_flow_color: { label: 'Pool Flow Farbe', helper: 'Farbe applied to the pool flow animation.' },
          pool_text_color: { label: 'Pool Textfarbe', helper: 'Farbe applied to the pool power text.' },
          washing_machine_text_color: { label: 'Washing Machine Textfarbe', helper: 'Farbe applied to the washing machine power text.' },
          dryer_text_color: { label: 'Dryer Textfarbe', helper: 'Farbe applied to the dryer power text.' },
          refrigerator_text_color: { label: 'Refrigerator Textfarbe', helper: 'Farbe applied to the refrigerator power text.' },
          freezer_color: { label: 'Gefrierschrank Textfarbe', helper: 'Farbe applied to the freezer power text.' },
          windmill_flow_color: { label: 'Windrad Flow Farbe', helper: 'Farbe applied to the windmill flow (data-flow-key="windmill-inverter1" / "windmill-inverter2").' },
          windmill_text_color: { label: 'Windrad Textfarbe', helper: 'Farbe für den Windrad-Leistungstext.' },
          header_font_size: { label: 'Header Font Size ((px))', helper: 'Standard 8' },
          daily_label_font_size: { label: 'Täglich Bezeichnung Font Size ((px))', helper: 'Standard 8' },
          daily_value_font_size: { label: 'Täglich Value Font Size ((px))', helper: 'Standard 20' },
          pv_font_size: { label: 'PV Text Font Size ((px))', helper: 'Standard 8' },
          windmill_power_font_size: { label: 'Windrad Leistung Font Size ((px))', helper: 'Standard 8' },
          battery_soc_font_size: { label: 'Batterie SOC Font Size ((px))', helper: 'Standard 20' },
          battery_time_until_color: { label: 'Batterie Zeit bis Voll/Leer Farbe', helper: 'Hex-Farbe für den Text der verbleibenden Zeit.' },
          battery_time_until_font_size: { label: 'Batterie Zeit bis Voll/Leer Font Size (px)', helper: 'Standard 8' },
          sensor_bat1_state: { label: 'Batterie 1 Status Sensor', helper: 'Sensor-Entität für den Batterie-1-Status-Text (verknüpft mit data-role="battery1-state").' },
          sensor_bat2_state: { label: 'Batterie 2 Status Sensor', helper: 'Sensor-Entität für den Batterie-2-Status-Text (verknüpft mit data-role="battery2-state").' },
          sensor_bat3_state: { label: 'Batterie 3 Status Sensor', helper: 'Sensor-Entität für den Batterie-3-Status-Text (verknüpft mit data-role="battery3-state").' },
          sensor_bat4_state: { label: 'Batterie 4 Status Sensor', helper: 'Sensor-Entität für den Batterie-4-Status-Text (verknüpft mit data-role="battery4-state").' },
          battery_state_fully_charged_color: { label: 'Batterie: Voll Geladen Farbe', helper: 'Farbe wenn der Batterie-Status Voll Geladen ist.' },
          battery_state_charging_color: { label: 'Batterie: Laden Farbe', helper: 'Farbe wenn der Batterie-Status Laden ist.' },
          battery_state_discharging_color: { label: 'Batterie: Entladen Farbe', helper: 'Farbe wenn der Batterie-Status Entladen ist.' },
          battery_state_reserve_color: { label: 'Batterie: Reserve Farbe', helper: 'Farbe wenn der Batterie-Status Reserve ist.' },
          battery_state_fully_discharged_color: { label: 'Batterie: Vollständig Entladen Farbe', helper: 'Farbe wenn der Batterie-Status Vollständig Entladen ist.' },
          battery_state_font_size: { label: 'Batterie Status Font Size (px)', helper: 'Standard 8' },
          battery_power_font_size: { label: 'Batterie Leistung Font Size ((px))', helper: 'Standard 8' },
          inv1_datetime_color: { label: 'Wechselrichter 1 DateTime Farbe', helper: 'Farbe für Wechselrichter 1 Batterie DateTime-Anzeige' },
          inv1_datetime_font_size: { label: 'Wechselrichter 1 DateTime Font Size (px)', helper: 'Schriftgröße für Wechselrichter 1 Batterie DateTime. Standard 8' },
          inv1_timeuntil_color: { label: 'Wechselrichter 1 Zeit Bis Farbe', helper: 'Farbe für Wechselrichter 1 Batterie Zeit Bis-Anzeige' },
          inv1_timeuntil_font_size: { label: 'Wechselrichter 1 Zeit Bis Font Size (px)', helper: 'Schriftgröße für Wechselrichter 1 Batterie Zeit Bis. Standard 8' },
          inv2_datetime_color: { label: 'Wechselrichter 2 DateTime Farbe', helper: 'Farbe für Wechselrichter 2 Batterie DateTime-Anzeige' },
          inv2_datetime_font_size: { label: 'Wechselrichter 2 DateTime Font Size (px)', helper: 'Schriftgröße für Wechselrichter 2 Batterie DateTime. Standard 8' },
          inv2_timeuntil_color: { label: 'Wechselrichter 2 Zeit Bis Farbe', helper: 'Farbe für Wechselrichter 2 Batterie Zeit Bis-Anzeige' },
          inv2_timeuntil_font_size: { label: 'Wechselrichter 2 Zeit Bis Font Size (px)', helper: 'Schriftgröße für Wechselrichter 2 Batterie Zeit Bis. Standard 8' },
          load_font_size: { label: 'Load Font Size ((px))', helper: 'Standard 8' },
          inv1_power_font_size: { label: 'INV 1 Leistung Font Size ((px))', helper: 'Font size for the INV 1 power line. Standard uses Load Font Size.' },
          inv2_power_font_size: { label: 'INV 2 Leistung Font Size ((px))', helper: 'Font size for the INV 2 power line. Standard uses Load Font Size.' },
          heat_pump_font_size: { label: 'Heat Pump Font Size ((px))', helper: 'Standard 8' },
          pool_font_size: { label: 'Pool Font Size ((px))', helper: 'Standard 8' },
          washing_machine_font_size: { label: 'Washing Machine Font Size ((px))', helper: 'Standard 8' },
          dryer_font_size: { label: 'Dryer Font Size ((px))', helper: 'Standard 8' },
          refrigerator_font_size: { label: 'Refrigerator Font Size ((px))', helper: 'Standard 8' },
          freezer_font_size: { label: 'Freezer Font Size ((px))', helper: 'Standard 8' },
          grid_font_size: { label: 'Netz Font Size ((px))', helper: 'Standard 8' },
          car_power_font_size: { label: 'Auto Leistung Font Size ((px))', helper: 'Standard 8' },
          car2_power_font_size: { label: 'Auto 2 Leistung Font Size ((px))', helper: 'Standard 8' },
          car_name_font_size: { label: 'Auto Name Font Size ((px))', helper: 'Standard 8' },
          car2_name_font_size: { label: 'Auto 2 Name Font Size ((px))', helper: 'Standard 8' },
          car_soc_font_size: { label: 'Auto SOC Font Size ((px))', helper: 'Standard 8' },
          car2_soc_font_size: { label: 'Auto 2 SOC Font Size ((px))', helper: 'Standard 8' },
          sensor_popup_pv_1: { label: 'PV Popup 1', helper: 'Entity for PV popup line 1.' },
          sensor_popup_pv_2: { label: 'PV Popup 2', helper: 'Entity for PV popup line 2.' },
          sensor_popup_pv_3: { label: 'PV Popup 3', helper: 'Entity for PV popup line 3.' },
          sensor_popup_pv_4: { label: 'PV Popup 4', helper: 'Entity for PV popup line 4.' },
          sensor_popup_pv_5: { label: 'PV Popup 5', helper: 'Entity for PV popup line 5.' },
          sensor_popup_pv_6: { label: 'PV Popup 6', helper: 'Entity for PV popup line 6.' },
          sensor_popup_pv_1_name: { label: 'PV Popup 1 Name', helper: 'Optional custom name for PV popup line 1. Leer lassen to use entity name.' },
          sensor_popup_pv_2_name: { label: 'PV Popup 2 Name', helper: 'Optional custom name for PV popup line 2. Leer lassen to use entity name.' },
          sensor_popup_pv_3_name: { label: 'PV Popup 3 Name', helper: 'Optional custom name for PV popup line 3. Leer lassen to use entity name.' },
          sensor_popup_pv_4_name: { label: 'PV Popup 4 Name', helper: 'Optional custom name for PV popup line 4. Leer lassen to use entity name.' },
          sensor_popup_pv_5_name: { label: 'PV Popup 5 Name', helper: 'Optional custom name for PV popup line 5. Leer lassen to use entity name.' },
          sensor_popup_pv_6_name: { label: 'PV Popup 6 Name', helper: 'Optional custom name for PV popup line 6. Leer lassen to use entity name.' },
          sensor_popup_pv_1_color: { label: 'PV Popup 1 Farbe', helper: 'Farbe for PV popup line 1 text.' },
          sensor_popup_pv_2_color: { label: 'PV Popup 2 Farbe', helper: 'Farbe for PV popup line 2 text.' },
          sensor_popup_pv_3_color: { label: 'PV Popup 3 Farbe', helper: 'Farbe for PV popup line 3 text.' },
          sensor_popup_pv_4_color: { label: 'PV Popup 4 Farbe', helper: 'Farbe for PV popup line 4 text.' },
          sensor_popup_pv_5_color: { label: 'PV Popup 5 Farbe', helper: 'Farbe for PV popup line 5 text.' },
          sensor_popup_pv_6_color: { label: 'PV Popup 6 Farbe', helper: 'Farbe for PV popup line 6 text.' },
          sensor_popup_pv_1_font_size: { label: 'PV Popup 1 Font Size ((px))', helper: 'Font size for PV popup line 1. Standard 8' },
          sensor_popup_pv_2_font_size: { label: 'PV Popup 2 Font Size ((px))', helper: 'Font size for PV popup line 2. Standard 8' },
          sensor_popup_pv_3_font_size: { label: 'PV Popup 3 Font Size ((px))', helper: 'Font size for PV popup line 3. Standard 8' },
          sensor_popup_pv_4_font_size: { label: 'PV Popup 4 Font Size ((px))', helper: 'Font size for PV popup line 4. Standard 8' },
          sensor_popup_pv_5_font_size: { label: 'PV Popup 5 Font Size ((px))', helper: 'Font size for PV popup line 5. Standard 8' },
          sensor_popup_pv_6_font_size: { label: 'PV Popup 6 Font Size ((px))', helper: 'Font size for PV popup line 6. Standard 8' },
          sensor_popup_house_1: { label: 'Haus Popup 1', helper: 'Entity for house popup line 1.' },
          sensor_popup_house_1_name: { label: 'Haus Popup 1 Name', helper: 'Optional custom name for house popup line 1. Leer lassen to use entity name.' },
          sensor_popup_house_1_color: { label: 'Haus Popup 1 Farbe', helper: 'Farbe for house popup line 1 text.' },
          sensor_popup_house_1_font_size: { label: 'Haus Popup 1 Font Size ((px))', helper: 'Font size for house popup line 1. Standard 8' },
          sensor_popup_house_2: { label: 'Haus Popup 2', helper: 'Entity for house popup line 2.' },
          sensor_popup_house_2_name: { label: 'Haus Popup 2 Name', helper: 'Optional custom name for house popup line 2. Leer lassen to use entity name.' },
          sensor_popup_house_2_color: { label: 'Haus Popup 2 Farbe', helper: 'Farbe for house popup line 2 text.' },
          sensor_popup_house_2_font_size: { label: 'Haus Popup 2 Font Size ((px))', helper: 'Font size for house popup line 2. Standard 8' },
          sensor_popup_house_3: { label: 'Haus Popup 3', helper: 'Entity for house popup line 3.' },
          sensor_popup_house_3_name: { label: 'Haus Popup 3 Name', helper: 'Optional custom name for house popup line 3. Leer lassen to use entity name.' },
          sensor_popup_house_3_color: { label: 'Haus Popup 3 Farbe', helper: 'Farbe for house popup line 3 text.' },
          sensor_popup_house_3_font_size: { label: 'Haus Popup 3 Font Size ((px))', helper: 'Font size for house popup line 3. Standard 8' },
          sensor_popup_house_4: { label: 'Haus Popup 4', helper: 'Entity for house popup line 4.' },
          sensor_popup_house_4_name: { label: 'Haus Popup 4 Name', helper: 'Optional custom name for house popup line 4. Leer lassen to use entity name.' },
          sensor_popup_house_4_color: { label: 'Haus Popup 4 Farbe', helper: 'Farbe for house popup line 4 text.' },
          sensor_popup_house_4_font_size: { label: 'Haus Popup 4 Font Size ((px))', helper: 'Font size for house popup line 4. Standard 8' },
          sensor_popup_house_5: { label: 'Haus Popup 5', helper: 'Entity for house popup line 5.' },
          sensor_popup_house_5_name: { label: 'Haus Popup 5 Name', helper: 'Optional custom name for house popup line 5. Leer lassen to use entity name.' },
          sensor_popup_house_5_color: { label: 'Haus Popup 5 Farbe', helper: 'Farbe for house popup line 5 text.' },
          sensor_popup_house_5_font_size: { label: 'Haus Popup 5 Font Size ((px))', helper: 'Font size for house popup line 5. Standard 8' },
          sensor_popup_house_6: { label: 'Haus Popup 6', helper: 'Entity for house popup line 6.' },
          sensor_popup_house_6_name: { label: 'Haus Popup 6 Name', helper: 'Optional custom name for house popup line 6. Leer lassen to use entity name.' },
          sensor_popup_house_6_color: { label: 'Haus Popup 6 Farbe', helper: 'Farbe for house popup line 6 text.' },
          sensor_popup_house_6_font_size: { label: 'Haus Popup 6 Font Size ((px))', helper: 'Font size for house popup line 6. Standard 8' },
          battery_popup_color: { label: 'Batterie Popup Textfarbe', helper: 'Globale Farbe für allen Batterie-Popup-Text (Datum/Zeit, Zeitbis und benutzerdefinierte Sensoren). Standard #00FFFF' },
          battery_popup_font_size: { label: 'Batterie Popup Schriftgröße (px)', helper: 'Globale Schriftgröße für allen Batterie-Popup-Text. Standard 16' },
          sensor_popup_bat_1: { label: 'Batterie Popup 1', helper: 'Entity for battery popup line 1.' },
          sensor_popup_bat_1_name: { label: 'Batterie Popup 1 Name', helper: 'Optional custom name for battery popup line 1. Leer lassen to use entity name.' },
          sensor_popup_bat_2: { label: 'Batterie Popup 2', helper: 'Entity for battery popup line 2.' },
          sensor_popup_bat_2_name: { label: 'Batterie Popup 2 Name', helper: 'Optional custom name for battery popup line 2. Leer lassen to use entity name.' },
          sensor_popup_bat_3: { label: 'Batterie Popup 3', helper: 'Entity for battery popup line 3.' },
          sensor_popup_bat_3_name: { label: 'Batterie Popup 3 Name', helper: 'Optional custom name for battery popup line 3. Leer lassen to use entity name.' },
          sensor_popup_bat_4: { label: 'Batterie Popup 4', helper: 'Entity for battery popup line 4.' },
          sensor_popup_bat_4_name: { label: 'Batterie Popup 4 Name', helper: 'Optional custom name for battery popup line 4. Leer lassen to use entity name.' },
          sensor_popup_bat_5: { label: 'Batterie Popup 5', helper: 'Entity for battery popup line 5.' },
          sensor_popup_bat_5_name: { label: 'Batterie Popup 5 Name', helper: 'Optional custom name for battery popup line 5. Leer lassen to use entity name.' },
          sensor_popup_bat_6: { label: 'Batterie Popup 6', helper: 'Entity for battery popup line 6.' },
          sensor_popup_bat_6_name: { label: 'Batterie Popup 6 Name', helper: 'Optional custom name for battery popup line 6. Leer lassen to use entity name.' },
          sensor_popup_grid_1: { label: 'Netz Popup 1', helper: 'Entity for grid popup line 1.' },
          sensor_popup_grid_1_name: { label: 'Netz Popup 1 Name', helper: 'Optional custom name for grid popup line 1. Leer lassen to use entity name.' },
          sensor_popup_grid_1_color: { label: 'Netz Popup 1 Farbe', helper: 'Farbe for grid popup line 1 text.' },
          sensor_popup_grid_1_font_size: { label: 'Netz Popup 1 Font Size ((px))', helper: 'Font size for grid popup line 1. Standard 8' },
          sensor_popup_grid_2: { label: 'Netz Popup 2', helper: 'Entity for grid popup line 2.' },
          sensor_popup_grid_2_name: { label: 'Netz Popup 2 Name', helper: 'Optional custom name for grid popup line 2. Leer lassen to use entity name.' },
          sensor_popup_grid_2_color: { label: 'Netz Popup 2 Farbe', helper: 'Farbe for grid popup line 2 text.' },
          sensor_popup_grid_2_font_size: { label: 'Netz Popup 2 Font Size ((px))', helper: 'Font size for grid popup line 2. Standard 8' },
          sensor_popup_grid_3: { label: 'Netz Popup 3', helper: 'Entity for grid popup line 3.' },
          sensor_popup_grid_3_name: { label: 'Netz Popup 3 Name', helper: 'Optional custom name for grid popup line 3. Leer lassen to use entity name.' },
          sensor_popup_grid_3_color: { label: 'Netz Popup 3 Farbe', helper: 'Farbe for grid popup line 3 text.' },
          sensor_popup_grid_3_font_size: { label: 'Netz Popup 3 Font Size ((px))', helper: 'Font size for grid popup line 3. Standard 8' },
          sensor_popup_grid_4: { label: 'Netz Popup 4', helper: 'Entity for grid popup line 4.' },
          sensor_popup_grid_4_name: { label: 'Netz Popup 4 Name', helper: 'Optional custom name for grid popup line 4. Leer lassen to use entity name.' },
          sensor_popup_grid_4_color: { label: 'Netz Popup 4 Farbe', helper: 'Farbe for grid popup line 4 text.' },
          sensor_popup_grid_4_font_size: { label: 'Netz Popup 4 Font Size ((px))', helper: 'Font size for grid popup line 4. Standard 8' },
          sensor_popup_grid_5: { label: 'Netz Popup 5', helper: 'Entity for grid popup line 5.' },
          sensor_popup_grid_5_name: { label: 'Netz Popup 5 Name', helper: 'Optional custom name for grid popup line 5. Leer lassen to use entity name.' },
          sensor_popup_grid_5_color: { label: 'Netz Popup 5 Farbe', helper: 'Farbe for grid popup line 5 text.' },
          sensor_popup_grid_5_font_size: { label: 'Netz Popup 5 Font Size ((px))', helper: 'Font size for grid popup line 5. Standard 8' },
          sensor_popup_grid_6: { label: 'Netz Popup 6', helper: 'Entity for grid popup line 6.' },
          sensor_popup_grid_6_name: { label: 'Netz Popup 6 Name', helper: 'Optional custom name for grid popup line 6. Leer lassen to use entity name.' },
          sensor_popup_grid_6_color: { label: 'Netz Popup 6 Farbe', helper: 'Farbe for grid popup line 6 text.' },
          sensor_popup_grid_6_font_size: { label: 'Netz Popup 6 Font Size ((px))', helper: 'Font size for grid popup line 6. Standard 8' },
          sensor_popup_inverter_1: { label: 'Wechselrichter Popup 1', helper: 'Entity for inverter popup line 1.' },
          sensor_popup_inverter_1_name: { label: 'Wechselrichter Popup 1 Name', helper: 'Optional custom name for inverter popup line 1. Leer lassen to use entity name.' },
          sensor_popup_inverter_1_color: { label: 'Wechselrichter Popup 1 Farbe', helper: 'Farbe for inverter popup line 1 text.' },
          sensor_popup_inverter_1_font_size: { label: 'Wechselrichter Popup 1 Font Size ((px))', helper: 'Font size for inverter popup line 1. Standard 8' },
          sensor_popup_inverter_2: { label: 'Wechselrichter Popup 2', helper: 'Entity for inverter popup line 2.' },
          sensor_popup_inverter_2_name: { label: 'Wechselrichter Popup 2 Name', helper: 'Optional custom name for inverter popup line 2. Leer lassen to use entity name.' },
          sensor_popup_inverter_2_color: { label: 'Wechselrichter Popup 2 Farbe', helper: 'Farbe for inverter popup line 2 text.' },
          sensor_popup_inverter_2_font_size: { label: 'Wechselrichter Popup 2 Font Size ((px))', helper: 'Font size for inverter popup line 2. Standard 8' },
          sensor_popup_inverter_3: { label: 'Wechselrichter Popup 3', helper: 'Entity for inverter popup line 3.' },
          sensor_popup_inverter_3_name: { label: 'Wechselrichter Popup 3 Name', helper: 'Optional custom name for inverter popup line 3. Leer lassen to use entity name.' },
          sensor_popup_inverter_3_color: { label: 'Wechselrichter Popup 3 Farbe', helper: 'Farbe for inverter popup line 3 text.' },
          sensor_popup_inverter_3_font_size: { label: 'Wechselrichter Popup 3 Font Size ((px))', helper: 'Font size for inverter popup line 3. Standard 8' },
          sensor_popup_inverter_4: { label: 'Wechselrichter Popup 4', helper: 'Entity for inverter popup line 4.' },
          sensor_popup_inverter_4_name: { label: 'Wechselrichter Popup 4 Name', helper: 'Optional custom name for inverter popup line 4. Leer lassen to use entity name.' },
          sensor_popup_inverter_4_color: { label: 'Wechselrichter Popup 4 Farbe', helper: 'Farbe for inverter popup line 4 text.' },
          sensor_popup_inverter_4_font_size: { label: 'Wechselrichter Popup 4 Font Size ((px))', helper: 'Font size for inverter popup line 4. Standard 8' },
          sensor_popup_inverter_5: { label: 'Wechselrichter Popup 5', helper: 'Entity for inverter popup line 5.' },
          sensor_popup_inverter_5_name: { label: 'Wechselrichter Popup 5 Name', helper: 'Optional custom name for inverter popup line 5. Leer lassen to use entity name.' },
          sensor_popup_inverter_5_color: { label: 'Wechselrichter Popup 5 Farbe', helper: 'Farbe for inverter popup line 5 text.' },
          sensor_popup_inverter_5_font_size: { label: 'Wechselrichter Popup 5 Font Size ((px))', helper: 'Font size for inverter popup line 5. Standard 8' },
          sensor_popup_inverter_6: { label: 'Wechselrichter Popup 6', helper: 'Entity for inverter popup line 6.' },
          sensor_popup_inverter_6_name: { label: 'Wechselrichter Popup 6 Name', helper: 'Optional custom name for inverter popup line 6. Leer lassen to use entity name.' },
          sensor_popup_inverter_6_color: { label: 'Wechselrichter Popup 6 Farbe', helper: 'Farbe for inverter popup line 6 text.' },
          sensor_popup_inverter_6_font_size: { label: 'Wechselrichter Popup 6 Font Size ((px))', helper: 'Font size for inverter popup line 6. Standard 8' }
        },
        options: {
          languages: [
            { value: 'en', label: 'Englisch' },
            { value: 'it', label: 'Italienisch' },
            { value: 'de', label: 'Deutsch' },
            { value: 'fr', label: 'Französisch' },
            { value: 'nl', label: 'Niederländisch' },
            { value: 'es', label: 'Spanisch' }
          ],
          display_units: [
            { value: 'W', label: 'Watt (W)' },
            { value: 'kW', label: 'Kilowatt (kW)' }
          ],
          animation_styles: [
            { value: 'dashes', label: 'Striche (Standard)' },
            { value: 'dashes_glow', label: 'Striche + Leuchten' },
            { value: 'fluid_flow', label: 'Fließend' },
            { value: 'dots', label: 'Punkte' },
            { value: 'arrows', label: 'Pfeile' }
          ],
          initial_yes: 'Ja',
          initial_no: 'Nein',
          initial_inverters_1: '1',
          initial_inverters_2: '2',
          initial_batteries_1: '1',
          initial_batteries_2: '2',
          initial_batteries_3: '3',
          initial_batteries_4: '4',
          initial_evs_1: '1',
          initial_evs_2: '2'
        },
        view: {
          daily: 'TAGESERTRAG', pv_tot: 'PV GESAMT', car1: 'AUTO 1', car2: 'AUTO 2', importing: 'IMPORT', exporting: 'EXPORT', charging: 'LADEN', discharging: 'ENTLADEN', standby: 'BEREITSCHAFT'
        }
      },
      fr: {
        sections: {
          general: { title: 'General Settings', helper: 'carte metadata, background, language, and update cadence.' },
          initialConfig: { title: 'Configuration initiale', helper: 'First-time setup checklist and starter options.' },
          pvCommon: { title: 'Solar/PV Common', helper: 'Common Solar/PV settings shared across arrays.' },
          array1: { title: 'Solar/PV Array 1', helper: 'Choisissez the PV, battery, grid, load, and VE entities used by the card. Either the PV total sensor or your PV string arrays need to be specified as a minimum.' },
          array2: { title: 'Solar/PV Array 2', helper: 'If Capteur PV total (Onduleur 2) is set or the PV String values are provided, Array 2 will become active and enable the second inverter. You must also enable Journalier production capteur (Array 2) and Home Load (Onduleur 2).' },
          windmill: { title: 'Éolienne', helper: 'Configurez windmill generator sensors and display styling.' },
          battery: { title: 'Batterie', helper: 'Configurez battery entities.' },
          grid: { title: 'Réseau', helper: 'Configurez grid entities.' },
          car: { title: 'Voiture', helper: 'Configurez VE entities.' },
          other: { title: 'Maison', helper: 'Additional sensors and advanced toggles.' },
          pvPopup: { title: 'PV Popup', helper: 'Configurez entities for the PV popup display.' },
          housePopup: { title: 'Maison Popup', helper: 'Configurez entities for the house popup display.' },
          carPopup: { title: 'Voiture Popup', helper: 'Configure auto-detected EV sensors, climate controls, and extra entities for the car (EV) popups.' },
          batteryPopup: { title: 'Batterie Popup', helper: 'Configurez battery popup display.' },
          gridPopup: { title: 'Réseau Popup', helper: 'Configurez entities for the grid popup display.' },
          inverterPopup: { title: 'Onduleur Popup', helper: 'Configurez entities for the inverter popup display.' },
          colors: { title: 'Couleur & Thresholds', helper: 'Configurez grid thresholds and accent colours for flows and VE display.' },
          typography: { title: 'Typography', helper: 'Fine tune the font sizes used across the card.' },
          stats: { title: 'Stats', helper: 'Configurez les capteurs et labels de statistiques.' },
          about: { title: 'About', helper: 'Credits, version, and helpful links.' }
        },
        fields: {
          card_title: { label: 'Titre de la carte', helper: 'Titre displayed at the top of the card. Laissez vide to disable.' },
          title_text_color: { label: 'Titre Couleur du texte', helper: 'Overrides the fill color for [data-role="title-text"]. Laissez vide to keep the SVG styling.' },
          title_bg_color: { label: 'Titre Couleur d’arrière-plan', helper: 'Overrides the fill color for [data-role="title-bg"]. Laissez vide to keep the SVG styling.' },
          card_label_color: { label: 'Couleur Étiquette', helper: 'Couleur de remplissage par défaut pour les SVG avec data-style="config" et data-role="label".' },
          card_label_font_size: { label: 'Taille police étiquette', helper: 'Taille de police par défaut pour les SVG avec data-style="config" et data-role="label".' },
          card_background_color: { label: 'Couleur fond carte', helper: 'Couleur de remplissage par défaut pour les SVG avec data-style="config" et data-role="card".' },
          card_label_css: { label: 'CSS Étiquet. suppl.', helper: 'Déclarations CSS supplémentaires pour les SVG avec data-style="config" et data-role="label".' },
          font_family: { label: 'Police', helper: 'CSS font-family used for all SVG text (e.g., sans-serif, Roboto, "Segoe UI").' },
          odometer_font_family: { label: 'Odomètre Police (Monospace)', helper: 'Font family used only for odometer-animated values. Laissez vide to reuse Police. Tip: pick a monospace variant (e.g., "Roboto Mono" or "Space Mono").' },
          background: { label: 'Arrière-plan', helper: "Chemin vers le fichier SVG d'arrière-plan (ex. /local/community/advanced-energy-card/tech.svg)." },
          night_mode: { label: 'Mode jour/nuit', helper: 'Sélectionnez Day, Night, or Auto. Auto uses sun.sun: above_horizon = Day, below_horizon = Night.' },
          language: { label: 'Langue', helper: 'Choisissez the editor language.' },
          display_unit: { label: 'Unité d’affichage', helper: 'Unit used when formatting power values.' },
          update_interval: { label: 'Intervalle de mise à jour', helper: 'Refresh cadence for card updates (0 disables throttling).' },
          initial_configuration: { label: 'Configuration initiale', helper: 'Show the Configuration initiale section in the editor.' },
          initial_has_pv: { label: 'Do you have Solar/PV puissance?', helper: 'Sélectionnez Yes if you have solar production to configure.' },
          initial_inverters: { label: 'How many inverters do you have?', helper: 'Shown only when Solar/PV is enabled.' },
          initial_has_battery: { label: 'Do you have Batterie storage?', helper: '' },
          initial_battery_count: { label: 'How many Batteries do you have? Maximum 4', helper: '' },
          initial_has_grid: { label: 'Do you have Réseau supplied electricity?', helper: '' },
          initial_can_export: { label: 'Can you export excess electricity to the grid?', helper: '' },
          initial_has_windmill: { label: 'Do you have a Éolienne?', helper: '' },
          initial_has_ev: { label: 'Do you have Electric Vehicles/VE\'s?', helper: '' },
          initial_ev_count: { label: 'How many do you have?', helper: '' },
          initial_config_items_title: { label: 'Requis configuration items', helper: '' },
          initial_config_items_helper: { label: 'These items become relevant based on your answers above.', helper: '' },
          initial_config_items_empty: { label: 'No items to show yet.', helper: '' },
          initial_config_complete_helper: { label: 'This completes the last required minimum configuration. Once clicking on the Complete button, please review all menus to check for additional items and popup configurations. This initial configuration can be re-enabled in the General menu.', helper: '' },
          initial_config_complete_button: { label: 'Complete', helper: '' },
          array_helper_text: { label: 'Each Array must have at minimum a combined Solar/PV total sensor which is the total power output of that Array or individual string values which are added together to get the total power output of the array. Journalier production can be supplied and can be shown in a Journalier production card.', helper: '' },
          animation_speed_factor: { label: 'Facteur de vitesse d’animation', helper: 'Adjust animation speed multiplier (-3x to 3x). Set 0 to pause; negatives reverse direction.' },
          animation_style: { label: 'Style d’animation (jour)', helper: 'Flow animation style used when the card is in Day mode.' },
          night_animation_style: { label: 'Style d’animation (nuit)', helper: 'Flow animation style used when the card is in Night mode. Laissez vide to use the Day style.' },
          dashes_glow_intensity: { label: 'Intensité de lueur (tirets)', helper: 'Controls glow strength for "Dashes + Glow" (0 disables glow).' },
          fluid_flow_outer_glow: { label: 'Lueur externe (flux fluide)', helper: 'Activer the extra outer haze/glow layer for animation_style: fluid_flow.' },
          flow_stroke_width: { label: 'Flow Stroke Width (px)', helper: 'Optionnel override for the animated flow stroke width (no SVG edits). Laissez vide to keep SVG defaults.' },
          fluid_flow_stroke_width: { label: 'Fluid Flow Stroke Width (px)', helper: 'Base stroke width for animation_style: fluid_flow. Overlay/mask widths are derived from this (default 5).' },
          arrow_scale: { label: 'Échelle des flèches', helper: 'Extra size multiplier for the arrows in the "Arrows" animation style. Arrows already scale automatically with Flow Stroke Width; increase if still too small, decrease if too large.' },
          sensor_pv_total: { label: 'Capteur PV total', helper: 'Optionnel aggregate production sensor displayed as the combined line.' },
          sensor_pv_total_secondary: { label: 'Capteur PV total (Onduleur 2)', helper: 'Optionnel second inverter total; added to the PV total when provided.' },
          sensor_windmill_total: { label: 'Éolienne Total', helper: 'puissance sensor for the windmill generator (W). When not configured the windmill SVG group is hidden.' },
          sensor_windmill_daily: { label: 'Journalier Éolienne production', helper: 'Optionnel sensor reporting daily windmill production totals.' },
          sensor_pv1: { label: 'PV String 1 (Array 1)', helper: 'Array 1 solar production sensor for string 1.' },
          sensor_pv2: { label: 'PV String 2 (Array 1)', helper: 'Array 1 solar production sensor for string 2.' },
          sensor_pv3: { label: 'PV String 3 (Array 1)', helper: 'Array 1 solar production sensor for string 3.' },
          sensor_pv4: { label: 'PV String 4 (Array 1)', helper: 'Array 1 solar production sensor for string 4.' },
          sensor_pv5: { label: 'PV String 5 (Array 1)', helper: 'Array 1 solar production sensor for string 5.' },
          sensor_pv6: { label: 'PV String 6 (Array 1)', helper: 'Array 1 solar production sensor for string 6.' },
          sensor_pv_array2_1: { label: 'PV String 1 (Array 2)', helper: 'Array 2 solar production sensor for string 1.' },
          sensor_pv_array2_2: { label: 'PV String 2 (Array 2)', helper: 'Array 2 solar production sensor for string 2.' },
          sensor_pv_array2_3: { label: 'PV String 3 (Array 2)', helper: 'Array 2 solar production sensor for string 3.' },
          sensor_pv_array2_4: { label: 'PV String 4 (Array 2)', helper: 'Array 2 solar production sensor for string 4.' },
          sensor_pv_array2_5: { label: 'PV String 5 (Array 2)', helper: 'Array 2 solar production sensor for string 5.' },
          sensor_pv_array2_6: { label: 'PV String 6 (Array 2)', helper: 'Array 2 solar production sensor for string 6.' },
          sensor_daily: { label: 'Journalier production capteur', helper: 'capteur reporting daily production totals. Either the PV total sensor or your PV string arrays need to be specified as a minimum.' },
          sensor_daily_array2: { label: 'Journalier production capteur (Array 2)', helper: 'capteur reporting daily production totals for Array 2.' },
          sensor_bat1_soc: { label: 'Batterie 1 SOC', helper: 'État de charge sensor for Batterie 1 (percentage).' },
          sensor_bat1_power: { label: 'Batterie 1 puissance', helper: 'Provide this combined power sensor or both charge/discharge sensors so Batterie 1 becomes active.' },
          sensor_bat1_charge_power: { label: 'Batterie 1 charge puissance', helper: 'capteur for Batterie 1 charging power.' },
          sensor_bat1_discharge_power: { label: 'Batterie 1 décharge puissance', helper: 'capteur for Batterie 1 discharging power.' },
          sensor_bat1_capacity_sensor: { label: 'Batterie 1 Capteur capacité utilisable', helper: 'Capteur optionnel rapportant la capacité utilisable de Batterie 1 en Wh ou kWh. Utilisé avec le pourcentage de réserve pour calculer la capacité effective.' },
          bat1_capacity_manual: { label: 'Batterie 1 Capacité utilisable (Manuel)', helper: 'Saisie manuelle alternative pour la capacité utilisable de Batterie 1. Entrez la valeur dans les unités spécifiées par votre paramètre display_unit (Wh ou kWh). Ignoré si un capteur de capacité est fourni.' },
          bat1_reserve_percentage: { label: 'Batterie 1 Pourcentage de réserve', helper: 'Pourcentage de réserve optionnel pour Batterie 1 (0-100). Certains systèmes maintiennent une réserve pour préserver la santé de la batterie. Cela réduit la capacité utilisable effective affichée.' },
          sensor_bat1_time_until: { label: 'Capteur Temps Restant Batterie 1', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_bat2_soc: { label: 'Batterie 2 SOC', helper: 'État de charge sensor for Batterie 2 (percentage).' },
          sensor_bat2_power: { label: 'Batterie 2 puissance', helper: 'Provide this combined power sensor or both charge/discharge sensors so Batterie 2 becomes active.' },
          sensor_bat2_charge_power: { label: 'Batterie 2 charge puissance', helper: 'capteur for Batterie 2 charging power.' },
          sensor_bat2_discharge_power: { label: 'Batterie 2 décharge puissance', helper: 'capteur for Batterie 2 discharging power.' },
          sensor_bat2_capacity_sensor: { label: 'Batterie 2 Capteur capacité utilisable', helper: 'Capteur optionnel rapportant la capacité utilisable de Batterie 2 en Wh ou kWh. Utilisé avec le pourcentage de réserve pour calculer la capacité effective.' },
          bat2_capacity_manual: { label: 'Batterie 2 Capacité utilisable (Manuel)', helper: 'Saisie manuelle alternative pour la capacité utilisable de Batterie 2. Entrez la valeur dans les unités spécifiées par votre paramètre display_unit (Wh ou kWh). Ignoré si un capteur de capacité est fourni.' },
          bat2_reserve_percentage: { label: 'Batterie 2 Pourcentage de réserve', helper: 'Pourcentage de réserve optionnel pour Batterie 2 (0-100). Certains systèmes maintiennent une réserve pour préserver la santé de la batterie. Cela réduit la capacité utilisable effective affichée.' },
          sensor_bat2_time_until: { label: 'Capteur Temps Restant Batterie 2', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_bat3_soc: { label: 'Batterie 3 SOC', helper: 'État de charge sensor for Batterie 3 (percentage).' },
          sensor_bat3_power: { label: 'Batterie 3 puissance', helper: 'Provide this combined power sensor or both charge/discharge sensors so Batterie 3 becomes active.' },
          sensor_bat3_charge_power: { label: 'Batterie 3 charge puissance', helper: 'capteur for Batterie 3 charging power.' },
          sensor_bat3_discharge_power: { label: 'Batterie 3 décharge puissance' },
          sensor_bat3_capacity_sensor: { label: 'Batterie 3 Capteur capacité utilisable', helper: 'Capteur optionnel rapportant la capacité utilisable de Batterie 3 en Wh ou kWh. Utilisé avec le pourcentage de réserve pour calculer la capacité effective.' },
          bat3_capacity_manual: { label: 'Batterie 3 Capacité utilisable (Manuel)', helper: 'Saisie manuelle alternative pour la capacité utilisable de Batterie 3. Entrez la valeur dans les unités spécifiées par votre paramètre display_unit (Wh ou kWh). Ignoré si un capteur de capacité est fourni.' },
          bat3_reserve_percentage: { label: 'Batterie 3 Pourcentage de réserve', helper: 'Pourcentage de réserve optionnel pour Batterie 3 (0-100). Certains systèmes maintiennent une réserve pour préserver la santé de la batterie. Cela réduit la capacité utilisable effective affichée.' },
          sensor_bat3_time_until: { label: 'Capteur Temps Restant Batterie 3', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_bat4_soc: { label: 'Batterie 4 SOC', helper: 'État de charge sensor for Batterie 4 (percentage).' },
          sensor_bat4_power: { label: 'Batterie 4 puissance', helper: 'Provide this combined power sensor or both charge/discharge sensors so Batterie 4 becomes active.' },
          sensor_bat4_charge_power: { label: 'Batterie 4 charge puissance', helper: 'capteur for Batterie 4 charging power.' },
          sensor_bat4_discharge_power: { label: 'Batterie 4 décharge puissance', helper: 'capteur for Batterie 4 discharging power.' },
          sensor_bat4_capacity_sensor: { label: 'Batterie 4 Capteur capacité utilisable', helper: 'Capteur optionnel rapportant la capacité utilisable de Batterie 4 en Wh ou kWh. Utilisé avec le pourcentage de réserve pour calculer la capacité effective.' },
          bat4_capacity_manual: { label: 'Batterie 4 Capacité utilisable (Manuel)', helper: 'Saisie manuelle alternative pour la capacité utilisable de Batterie 4. Entrez la valeur dans les unités spécifiées par votre paramètre display_unit (Wh ou kWh). Ignoré si un capteur de capacité est fourni.' },
          bat4_reserve_percentage: { label: 'Batterie 4 Pourcentage de réserve', helper: 'Pourcentage de réserve optionnel pour Batterie 4 (0-100). Certains systèmes maintiennent une réserve pour préserver la santé de la batterie. Cela réduit la capacité utilisable effective affichée.' },
          sensor_bat4_time_until: { label: 'Capteur Temps Restant Batterie 4', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_home_load: { label: 'Home Load/Consumption (Requis)', helper: 'Total household consumption sensor.' },
          sensor_home_load_secondary: { label: 'Home Load (Onduleur 2)', helper: 'Optionnel house load sensor for the second inverter.' },
          sensor_heat_pump_consumption: { label: 'Heat Pump Consumption', helper: 'capteur for heat pump energy consumption.' },
          sensor_hot_water_consumption: { label: 'Water Heating', helper: 'capteur for Hot Water Heating Load.' },
          sensor_pool_consumption: { label: 'Pool', helper: 'capteur for pool power/consumption.' },
          sensor_washing_machine_consumption: { label: 'Washing Machine', helper: 'capteur for washing machine power/consumption.' },
          sensor_dishwasher_consumption: { label: 'Dish Washer', helper: 'capteur for Dish Washer Load.' },
          sensor_dryer_consumption: { label: 'Dryer', helper: 'capteur for dryer power/consumption.' },
          sensor_refrigerator_consumption: { label: 'Refrigerator', helper: 'capteur for refrigerator power/consumption.' },
          sensor_freezer_consumption: { label: 'Congélateur', helper: 'capteur for freezer power/consumption.' },
          hot_water_text_color: { label: 'Water Heating Couleur du texte', helper: 'Couleur applied to the hot water power text.' },
          dishwasher_text_color: { label: 'Dish Washer Couleur du texte', helper: 'Couleur applied to the dish washer power text.' },
          hot_water_font_size: { label: 'Water Heating Font Size (px)', helper: 'Par défaut 8' },
          dishwasher_font_size: { label: 'Dish Washer Font Size (px)', helper: 'Par défaut 8' },
          sensor_grid_power: { label: 'Réseau Onduleur 1 puissance', helper: 'Positive/negative grid flow sensor for inverter 1. Specify either this sensor or both Réseau Onduleur 1 Import capteur and Réseau Onduleur 1 Export capteur.' },
          sensor_grid_import: { label: 'Réseau Onduleur 1 Import capteur', helper: 'Optionnel entity reporting inverter 1 grid import (positive) power.' },
          sensor_grid_export: { label: 'Réseau Onduleur 1 Export capteur', helper: 'Optionnel entity reporting inverter 1 grid export (positive) power.' },
          sensor_grid_import_daily: { label: 'Journalier Réseau Onduleur 1 Import capteur', helper: 'Optionnel entity reporting cumulative inverter 1 grid import for the current day.' },
          sensor_grid_export_daily: { label: 'Journalier Réseau Onduleur 1 Export capteur', helper: 'Optionnel entity reporting cumulative inverter 1 grid export for the current day.' },
          sensor_grid2_power: { label: 'Réseau Onduleur 2 puissance', helper: 'Positive/negative grid flow sensor for inverter 2. Specify either this sensor or both Réseau Onduleur 2 Import capteur and Réseau Onduleur 2 Export capteur.' },
          sensor_grid2_import: { label: 'Réseau Onduleur 2 Import capteur', helper: 'Optionnel entity reporting inverter 2 grid import (positive) power.' },
          sensor_grid2_export: { label: 'Réseau Onduleur 2 Export capteur', helper: 'Optionnel entity reporting inverter 2 grid export (positive) power.' },
          sensor_grid2_import_daily: { label: 'Journalier Réseau Onduleur 2 Import capteur', helper: 'Optionnel entity reporting cumulative inverter 2 grid import for the current day.' },
          sensor_grid2_export_daily: { label: 'Journalier Réseau Onduleur 2 Export capteur', helper: 'Optionnel entity reporting cumulative inverter 2 grid export for the current day.' },
          show_daily_grid: { label: 'Show Journalier Réseau Values', helper: 'Show the daily import/export totals under the current grid flow when enabled.' },
          grid_daily_font_size: { label: 'Journalier Réseau Font Size (px)', helper: 'Optionnel override for daily grid import/export text. Par défauts to Réseau Font Size.' },
          grid_current_odometer: { label: 'Odomètre: Réseau Current', helper: 'Animate Réseau Current with a per-digit rolling effect.' },
          grid_current_odometer_duration: { label: 'Odomètre Durée (ms)', helper: 'Animation duration in milliseconds. Par défaut 350.' },
          show_grid_flow_label: { label: 'Show Réseau Import/Export Nom', helper: 'Prepend the importing/exporting label before the grid value when enabled.' },
          sensor_grid_state: { label: 'Capteur État Réseau', helper: 'Entité capteur pour le texte d\'état du réseau (lié à data-role="grid-state").' },
          grid_state_importing_color: { label: 'Couleur Import Réseau', helper: 'Couleur quand l\'état du réseau est importation.' },
          grid_state_exporting_color: { label: 'Couleur Export Réseau', helper: 'Couleur quand l\'état du réseau est exportation.' },
          grid_state_floating_color: { label: 'Couleur Floating Réseau', helper: 'Couleur quand l\'état du réseau est floating.' },
          grid_state_font_size: { label: 'Taille Police État Réseau (px)', helper: 'Par défaut 8' },
          sensor_solar_state: { label: 'Capteur État Solaire', helper: 'Entité capteur pour le texte d\'\u00e9tat solaire (lié à data-role="solar-state"). Retourne "Producing Power" ou "Not Producing".' },
          solar_state_producing_color: { label: 'Couleur Solaire En Production', helper: 'Couleur quand l\'\u00e9tat solaire est en production.' },
          solar_state_not_producing_color: { label: 'Couleur Solaire Hors Production', helper: 'Couleur quand l\'\u00e9tat solaire n\'est pas en production.' },
          solar_state_font_size: { label: 'Taille Police État Solaire (px)', helper: 'Par défaut 8' },
          sensor_solar_forecast_today: { label: 'Capteur Prévision Solaire Aujourd\'hui', helper: 'Entité capteur pour la prévision solaire d\'aujourd\'hui (lié à data-role="solar-forecast-today").' },
          sensor_solar_forecast_tomorrow: { label: 'Capteur Prévision Solaire Demain', helper: 'Entité capteur pour la prévision solaire de demain (lié à data-role="solar-forecast-tomorrow").' },
          sensor_weather_icon: { label: 'Capteur Icône Météo', helper: 'Entité capteur pour l\'icône météo (lié à data-role="weather-icon").' },
          weather_icon_color: { label: 'Couleur Icône Météo', helper: 'Couleur appliquée au texte de l\'icône météo.' },
          weather_icon_font_size: { label: 'Taille Police Icône Météo (px)', helper: 'Par défaut 8' },
          sensor_weather_forecast: { label: 'Capteur Prévision Météo', helper: 'Entité capteur pour la prévision météo (lié à data-role="weather-forecast").' },
          weather_forecast_color: { label: 'Couleur Prévision Météo', helper: 'Couleur appliquée au texte de la prévision météo.' },
          weather_forecast_font_size: { label: 'Taille Police Prévision Météo (px)', helper: 'Par défaut 8' },
          sun_moon_display: { label: 'Affichage Soleil/Lune', helper: 'Affiche un soleil ou une lune suivant le cycle jour/nuit. Désactivé = caché, Soleil uniquement = soleil le jour, Soleil & Lune = soleil le jour, lune la nuit.' },
          sun_moon_arc_color: { label: 'Couleur de l\'Arc', helper: 'Couleur du trait pour le chemin en arc soleil/lune. Laisser vide pour aucun (invisible).' },
          sun_moon_arc_stroke_width: { label: 'Largeur du Trait de l\'Arc', helper: 'Largeur du trait (px) pour le chemin en arc soleil/lune.' },
          sun_moon_label_color: { label: 'Couleur des Étiquettes Lever/Coucher', helper: 'Couleur pour les étiquettes d\'heure du lever et du coucher. Laisser vide pour utiliser la couleur de l\'icône.' },
          sun_moon_label_font_size: { label: 'Taille de Police Étiquette Lever/Coucher', helper: 'Taille de police (px) pour le texte lever et coucher. Laisser vide pour la valeur par défaut.' },
          sun_moon_sunrise_label: { label: 'Texte Étiquette Lever du Soleil', helper: 'Texte personnalisé pour l\'étiquette lever. Laisser vide pour utiliser le défaut SVG.' },
          sun_moon_sunset_label: { label: 'Texte Étiquette Coucher du Soleil', helper: 'Texte personnalisé pour l\'étiquette coucher. Laisser vide pour utiliser le défaut SVG.' },
          stats_value_color: { label: 'Stats Value Color', helper: 'Color applied to all stat values.' },
          stats_value_font_size: { label: 'Stats Value Font Size (px)', helper: 'Font size for all stat values. Default 14' },
          stats_label_color: { label: 'Stats Label Color', helper: 'Color applied to all stat labels.' },
          stats_label_font_size: { label: 'Stats Label Font Size (px)', helper: 'Font size for all stat labels. Default 12' },
          inverter1_status_text_color: { label: 'Couleur Texte État Onduleur', helper: 'Couleur appliquée au texte d\'état de l\'onduleur (Charge/Décharge/Importation/Exportation).' },
          inverter1_status_font_size: { label: 'Taille Police État Onduleur (px)', helper: 'Taille de police pour le texte d\'état de l\'onduleur. Défaut 8' },
          enable_echo_alive: { label: 'Activer Echo Alive', helper: 'Activers an invisible iframe to keep the Silk browser open on Echo Show. The button will be positioned in a corner of the card.' },
          pv_tot_color: { label: 'PV Total Couleur', helper: 'Colour applied to the PV TOTAL text line.' },
          pv_primary_color: { label: 'PV 1 Flow Couleur', helper: 'Colour used for the primary PV animation line.' },
          pv_secondary_color: { label: 'PV 2 Flow Couleur', helper: 'Colour used for the secondary PV animation line when available.' },
          load_flow_color: { label: 'Load Flow Couleur', helper: 'Colour applied to the home load animation line.' },
          load_text_color: { label: 'Load Couleur du texte', helper: 'Colour applied to the home load text when thresholds are inactive.' },
          house_total_color: { label: 'Maison Total Couleur', helper: 'Colour applied to the HOUSE TOT text/flow.' },
          inv1_color: { label: 'Onduleur 1 to Maison Couleur', helper: 'Couleur applied to the flow from Onduleur 1 to the house.' },
          inv2_color: { label: 'Onduleur 2 to Maison Couleur', helper: 'Couleur applied to the flow from Onduleur 2 to the house.' },
          load_threshold_warning: { label: 'Load Warning Seuil', helper: 'Change load color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          load_warning_color: { label: 'Load Warning Couleur', helper: 'Hex or CSS color applied at the load warning threshold.' },
          load_threshold_critical: { label: 'Load Critical Seuil', helper: 'Change load color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          load_critical_color: { label: 'Load Critical Couleur', helper: 'Hex or CSS color applied at the load critical threshold.' },
          battery_soc_color: { label: 'Batterie SOC Couleur', helper: 'Hex color applied to the battery SOC percentage text.' },
          battery_charge_color: { label: 'Batterie charge Flow Couleur', helper: 'Colour used when energy is flowing into the battery.' },
          battery_discharge_color: { label: 'Batterie décharge Flow Couleur', helper: 'Colour used when energy is flowing from the battery.' },
          grid_import_color: { label: 'Onduleur 1 Réseau Import Flow Couleur', helper: 'Base colour before thresholds when inverter 1 is importing from the grid.' },
          grid_export_color: { label: 'Onduleur 1 Réseau Export Flow Couleur', helper: 'Base colour before thresholds when inverter 1 is exporting to the grid.' },
          grid2_import_color: { label: 'Onduleur 2 Réseau Import Flow Couleur', helper: 'Base colour before thresholds when inverter 2 is importing from the grid.' },
          grid2_export_color: { label: 'Onduleur 2 Réseau Export Flow Couleur', helper: 'Base colour before thresholds when inverter 2 is exporting to the grid.' },
          car_flow_color: { label: 'VE Flow Couleur', helper: 'Colour applied to the electric vehicle animation line.' },
          battery_fill_high_color: { label: 'Batterie Fill (Normal) Couleur', helper: 'Liquid fill colour when the battery SOC is above the low threshold.' },
          battery_fill_low_color: { label: 'Batterie Fill (Low) Couleur', helper: 'Liquid fill colour when the battery SOC is at or below the low threshold.' },
          battery_fill_low_threshold: { label: 'Batterie Low Fill Seuil (%)', helper: 'Use the low fill colour when SOC is at or below this percentage.' },
          battery_fill_opacity: { label: 'Batterie Fill Opacity', helper: 'Opacity for the battery fill level (0-1).' },
          grid_activity_threshold: { label: 'Réseau Animation Seuil (W)', helper: 'Ignore grid flows whose absolute value is below this wattage before animating.' },
          grid_power_only: { label: 'Réseau puissance Only', helper: 'Hide inverter/battery flows and show a direct grid-to-house flow.' },
          grid_threshold_warning: { label: 'Onduleur 1 Réseau Warning Seuil', helper: 'Change inverter 1 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid_warning_color: { label: 'Onduleur 1 Réseau Warning Couleur', helper: 'Hex or CSS color applied at the inverter 1 warning threshold.' },
          grid_threshold_critical: { label: 'Onduleur 1 Réseau Critical Seuil', helper: 'Change inverter 1 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid_critical_color: { label: 'Onduleur 1 Réseau Critical Couleur', helper: 'Hex or CSS color applied at the inverter 1 critical threshold.' },
          grid2_threshold_warning: { label: 'Onduleur 2 Réseau Warning Seuil', helper: 'Change inverter 2 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid2_warning_color: { label: 'Onduleur 2 Réseau Warning Couleur', helper: 'Hex or CSS color applied at the inverter 2 warning threshold.' },
          grid2_threshold_critical: { label: 'Onduleur 2 Réseau Critical Seuil', helper: 'Change inverter 2 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid2_critical_color: { label: 'Onduleur 2 Réseau Critical Couleur', helper: 'Hex or CSS color applied at the inverter 2 critical threshold.' },
          invert_grid: { label: 'Invert Réseau Values', helper: 'Activer if import/export polarity is reversed.' },
          invert_battery: { label: 'Invert Batterie Values', helper: 'Activer if charge/discharge polarity is reversed.' },
          invert_bat1: { label: 'Invert Batterie 1 Values', helper: 'Activer if Batterie 1 charge/discharge polarity is reversed.' },
          invert_bat2: { label: 'Invert Batterie 2 Values', helper: 'Activer if Batterie 2 charge/discharge polarity is reversed.' },
          invert_bat3: { label: 'Invert Batterie 3 Values', helper: 'Activer if Batterie 3 charge/discharge polarity is reversed.' },
          sensor_car_power: { label: 'Voiture 1 puissance capteur', helper: 'capteur for VE charge/discharge power.' },
          sensor_car_soc: { label: 'Voiture 1 SOC capteur', helper: 'État de charge sensor for VE 1 (percentage).' },
          sensor_car_range: { label: 'Voiture 1 Autonomie capteur', helper: 'Entité capteur pour l\'autonomie du VE 1 (lié à data-role="car1-range").' },
          sensor_car_state: { label: 'Voiture 1 État de Charge capteur', helper: 'Entité capteur pour le texte d\'état de charge du VE 1 (lié à data-role="car1-state").' },
          sensor_car_hvac_status: { label: 'Voiture 1 État Climatisation capteur', helper: 'Entité capteur pour l\'état HVAC/climatisation du VE 1 (lié à data-role="car1-hvac-status").' },
          sensor_car_outside_temp: { label: 'Voiture 1 Température Extérieure capteur', helper: 'Entité capteur pour la température extérieure du VE 1 (lié à data-role="car1-outside-temp").' },
          sensor_car_inside_temp: { label: 'Voiture 1 Température Intérieure capteur', helper: 'Entité capteur pour la température intérieure/habitacle du VE 1 (lié à data-role="car1-inside-temp").' },
          sensor_car_ac_temp: { label: 'Voiture 1 Température Climatisation capteur', helper: 'Entité capteur pour la température de consigne de climatisation du VE 1 (lié à data-role="car1-ac-temp").' },
          car1_climate_entity: { label: 'Voiture 1 Entité Climatisation HVAC', helper: 'Entité climate pour le contrôle HVAC du VE 1 (domaine climate uniquement).' },
          car_soc: { label: 'Voiture SOC', helper: 'capteur for VE battery SOC (percentage).' },
          car_charger_power: { label: 'Voiture Charger puissance', helper: 'capteur for VE charger power.' },
          car1_label: { label: 'Voiture 1 Libellé', helper: 'Text displayed next to the first VE values.' },
          sensor_car2_power: { label: 'Voiture 2 puissance capteur', helper: 'capteur for VE 2 charge/discharge power.' },
          car2_power: { label: 'Voiture 2 puissance', helper: 'capteur for VE 2 charge/discharge power.' },
          sensor_car2_soc: { label: 'Voiture 2 SOC capteur', helper: 'État de charge sensor for VE 2 (percentage).' },
          sensor_car2_range: { label: 'Voiture 2 Autonomie capteur', helper: 'Entité capteur pour l\'autonomie du VE 2 (lié à data-role="car2-range").' },
          sensor_car2_state: { label: 'Voiture 2 État de Charge capteur', helper: 'Entité capteur pour le texte d\'état de charge du VE 2 (lié à data-role="car2-state").' },
          sensor_car2_hvac_status: { label: 'Voiture 2 État Climatisation capteur', helper: 'Entité capteur pour l\'état HVAC/climatisation du VE 2 (lié à data-role="car2-hvac-status").' },
          sensor_car2_outside_temp: { label: 'Voiture 2 Température Extérieure capteur', helper: 'Entité capteur pour la température extérieure du VE 2 (lié à data-role="car2-outside-temp").' },
          sensor_car2_inside_temp: { label: 'Voiture 2 Température Intérieure capteur', helper: 'Entité capteur pour la température intérieure/habitacle du VE 2 (lié à data-role="car2-inside-temp").' },
          sensor_car2_ac_temp: { label: 'Voiture 2 Température Climatisation capteur', helper: 'Entité capteur pour la température de consigne de climatisation du VE 2 (lié à data-role="car2-ac-temp").' },
          car2_climate_entity: { label: 'Voiture 2 Entité Climatisation HVAC', helper: 'Entité climate pour le contrôle HVAC du VE 2 (domaine climate uniquement).' },
          car2_soc: { label: 'Voiture 2 SOC', helper: 'capteur for VE 2 battery SOC (percentage).' },
          car2_charger_power: { label: 'Voiture 2 Charger puissance', helper: 'capteur for VE 2 charger power.' },
          car2_label: { label: 'Voiture 2 Libellé', helper: 'Text displayed next to the second VE values.' },
          car_headlight_flash: { label: 'Headlight Flash While Charging', helper: 'Activer to flash the VE headlights whenever charging is detected.' },
          car1_glow_brightness: { label: 'Voiture Glow Effect', helper: 'Percentage the car flow effects show while not charging.' },
          car2_glow_brightness: { label: 'Voiture Glow Effect', helper: 'Percentage the car flow effects show while not charging.' },
          car_pct_color: { label: 'Voiture SOC Couleur', helper: 'Hex color for VE SOC text (e.g., #00FFFF).' },
          car2_pct_color: { label: 'Voiture 2 SOC Couleur', helper: 'Hex color for second VE SOC text (falls back to Voiture SOC Couleur).' },
          car1_name_color: { label: 'Voiture 1 Nom Couleur', helper: 'Couleur applied to the Voiture 1 name label.' },
          car2_name_color: { label: 'Voiture 2 Nom Couleur', helper: 'Couleur applied to the Voiture 2 name label.' },
          car1_color: { label: 'Voiture 1 Couleur', helper: 'Couleur applied to Voiture 1 power value.' },
          car2_color: { label: 'Voiture 2 Couleur', helper: 'Couleur applied to Voiture 2 power value.' },
          heat_pump_label: { label: 'Heat Pump Libellé', helper: 'Custom label for the heat pump/AC line (defaults to "Heat Pump/AC").' },
          heat_pump_text_color: { label: 'Heat Pump Couleur du texte', helper: 'Couleur applied to the heat pump power text.' },
          pool_flow_color: { label: 'Pool Flow Couleur', helper: 'Couleur applied to the pool flow animation.' },
          pool_text_color: { label: 'Pool Couleur du texte', helper: 'Couleur applied to the pool power text.' },
          washing_machine_text_color: { label: 'Washing Machine Couleur du texte', helper: 'Couleur applied to the washing machine power text.' },
          dryer_text_color: { label: 'Dryer Couleur du texte', helper: 'Couleur applied to the dryer power text.' },
          refrigerator_text_color: { label: 'Refrigerator Couleur du texte', helper: 'Couleur applied to the refrigerator power text.' },
          freezer_text_color: { label: 'Congélateur Couleur du texte', helper: 'Couleur applied to the freezer power text.' },
          windmill_flow_color: { label: 'Éolienne Flow Couleur', helper: 'Couleur applied to the windmill flow (data-flow-key="windmill-inverter1" / "windmill-inverter2").' },
          windmill_text_color: { label: 'Éolienne Couleur du texte', helper: 'Couleur appliquée au texte de puissance de l\'éolienne.' },
          header_font_size: { label: 'Header Font Size (px)', helper: 'Par défaut 8' },
          daily_label_font_size: { label: 'Journalier Libellé Font Size (px)', helper: 'Par défaut 8' },
          daily_value_font_size: { label: 'Journalier Value Font Size (px)', helper: 'Par défaut 20' },
          pv_font_size: { label: 'PV Text Font Size (px)', helper: 'Par défaut 8' },
          windmill_power_font_size: { label: 'Éolienne puissance Font Size (px)', helper: 'Par défaut 8' },
          battery_soc_font_size: { label: 'Batterie SOC Font Size (px)', helper: 'Par défaut 20' },
          battery_time_until_color: { label: 'Couleur Temps Restant Batterie', helper: 'Couleur hex appliquée au texte du temps restant avant plein/vide.' },
          battery_time_until_font_size: { label: 'Taille Police Temps Restant (px)', helper: 'Par défaut 8' },
          sensor_bat1_state: { label: 'Capteur État Batterie 1', helper: 'Entité capteur pour le texte d\'état de la batterie 1 (lié à data-role="battery1-state").' },
          sensor_bat2_state: { label: 'Capteur État Batterie 2', helper: 'Entité capteur pour le texte d\'état de la batterie 2 (lié à data-role="battery2-state").' },
          sensor_bat3_state: { label: 'Capteur État Batterie 3', helper: 'Entité capteur pour le texte d\'état de la batterie 3 (lié à data-role="battery3-state").' },
          sensor_bat4_state: { label: 'Capteur État Batterie 4', helper: 'Entité capteur pour le texte d\'état de la batterie 4 (lié à data-role="battery4-state").' },
          battery_state_fully_charged_color: { label: 'Batterie: Couleur Complètement Chargée', helper: 'Couleur quand l\'état de la batterie est Complètement Chargée.' },
          battery_state_charging_color: { label: 'Batterie: Couleur En Charge', helper: 'Couleur quand l\'état de la batterie est En Charge.' },
          battery_state_discharging_color: { label: 'Batterie: Couleur En Décharge', helper: 'Couleur quand l\'état de la batterie est En Décharge.' },
          battery_state_reserve_color: { label: 'Batterie: Couleur Réserve', helper: 'Couleur quand l\'état de la batterie est Réserve.' },
          battery_state_fully_discharged_color: { label: 'Batterie: Couleur Complètement Déchargée', helper: 'Couleur quand l\'état de la batterie est Complètement Déchargée.' },
          battery_state_font_size: { label: 'Taille Police État Batterie (px)', helper: 'Par défaut 8' },
          battery_power_font_size: { label: 'Batterie puissance Font Size (px)', helper: 'Par défaut 8' },
          inv1_datetime_color: { label: 'Couleur DateTime Onduleur 1', helper: 'Couleur pour l\'affichage datetime de la batterie Onduleur 1' },
          inv1_datetime_font_size: { label: 'Taille Font DateTime Onduleur 1 (px)', helper: 'Taille de police pour datetime batterie Onduleur 1. Par défaut 8' },
          inv1_timeuntil_color: { label: 'Couleur Temps Jusqu\'à Onduleur 1', helper: 'Couleur pour l\'affichage temps jusqu\'à de la batterie Onduleur 1' },
          inv1_timeuntil_font_size: { label: 'Taille Font Temps Jusqu\'à Onduleur 1 (px)', helper: 'Taille de police pour temps jusqu\'à batterie Onduleur 1. Par défaut 8' },
          inv2_datetime_color: { label: 'Couleur DateTime Onduleur 2', helper: 'Couleur pour l\'affichage datetime de la batterie Onduleur 2' },
          inv2_datetime_font_size: { label: 'Taille Font DateTime Onduleur 2 (px)', helper: 'Taille de police pour datetime batterie Onduleur 2. Par défaut 8' },
          inv2_timeuntil_color: { label: 'Couleur Temps Jusqu\'à Onduleur 2', helper: 'Couleur pour l\'affichage temps jusqu\'à de la batterie Onduleur 2' },
          inv2_timeuntil_font_size: { label: 'Taille Font Temps Jusqu\'à Onduleur 2 (px)', helper: 'Taille de police pour temps jusqu\'à batterie Onduleur 2. Par défaut 8' },
          load_font_size: { label: 'Load Font Size (px)', helper: 'Par défaut 8' },
          inv1_power_font_size: { label: 'INV 1 puissance Font Size (px)', helper: 'Font size for the INV 1 power line. Par défaut uses Load Font Size.' },
          inv2_power_font_size: { label: 'INV 2 puissance Font Size (px)', helper: 'Font size for the INV 2 power line. Par défaut uses Load Font Size.' },
          heat_pump_font_size: { label: 'Heat Pump Font Size (px)', helper: 'Par défaut 8' },
          pool_font_size: { label: 'Pool Font Size (px)', helper: 'Par défaut 8' },
          washing_machine_font_size: { label: 'Washing Machine Font Size (px)', helper: 'Par défaut 8' },
          dryer_font_size: { label: 'Dryer Font Size (px)', helper: 'Par défaut 8' },
          refrigerator_font_size: { label: 'Refrigerator Font Size (px)', helper: 'Par défaut 8' },
          freezer_font_size: { label: 'Freezer Font Size (px)', helper: 'Par défaut 8' },
          grid_font_size: { label: 'Réseau Font Size (px)', helper: 'Par défaut 8' },
          car_power_font_size: { label: 'Voiture puissance Font Size (px)', helper: 'Par défaut 8' },
          car2_power_font_size: { label: 'Voiture 2 puissance Font Size (px)', helper: 'Par défaut 8' },
          car_name_font_size: { label: 'Voiture Nom Font Size (px)', helper: 'Par défaut 8' },
          car2_name_font_size: { label: 'Voiture 2 Nom Font Size (px)', helper: 'Par défaut 8' },
          car_soc_font_size: { label: 'Voiture SOC Font Size (px)', helper: 'Par défaut 8' },
          car2_soc_font_size: { label: 'Voiture 2 SOC Font Size (px)', helper: 'Par défaut 8' },
          sensor_popup_pv_1: { label: 'PV Popup 1', helper: 'Entity for PV popup line 1.' },
          sensor_popup_pv_2: { label: 'PV Popup 2', helper: 'Entity for PV popup line 2.' },
          sensor_popup_pv_3: { label: 'PV Popup 3', helper: 'Entity for PV popup line 3.' },
          sensor_popup_pv_4: { label: 'PV Popup 4', helper: 'Entity for PV popup line 4.' },
          sensor_popup_pv_5: { label: 'PV Popup 5', helper: 'Entity for PV popup line 5.' },
          sensor_popup_pv_6: { label: 'PV Popup 6', helper: 'Entity for PV popup line 6.' },
          sensor_popup_pv_1_name: { label: 'PV Popup 1 Nom', helper: 'Optionnel custom name for PV popup line 1. Laissez vide to use entity name.' },
          sensor_popup_pv_2_name: { label: 'PV Popup 2 Nom', helper: 'Optionnel custom name for PV popup line 2. Laissez vide to use entity name.' },
          sensor_popup_pv_3_name: { label: 'PV Popup 3 Nom', helper: 'Optionnel custom name for PV popup line 3. Laissez vide to use entity name.' },
          sensor_popup_pv_4_name: { label: 'PV Popup 4 Nom', helper: 'Optionnel custom name for PV popup line 4. Laissez vide to use entity name.' },
          sensor_popup_pv_5_name: { label: 'PV Popup 5 Nom', helper: 'Optionnel custom name for PV popup line 5. Laissez vide to use entity name.' },
          sensor_popup_pv_6_name: { label: 'PV Popup 6 Nom', helper: 'Optionnel custom name for PV popup line 6. Laissez vide to use entity name.' },
          sensor_popup_pv_1_color: { label: 'PV Popup 1 Couleur', helper: 'Couleur for PV popup line 1 text.' },
          sensor_popup_pv_2_color: { label: 'PV Popup 2 Couleur', helper: 'Couleur for PV popup line 2 text.' },
          sensor_popup_pv_3_color: { label: 'PV Popup 3 Couleur', helper: 'Couleur for PV popup line 3 text.' },
          sensor_popup_pv_4_color: { label: 'PV Popup 4 Couleur', helper: 'Couleur for PV popup line 4 text.' },
          sensor_popup_pv_5_color: { label: 'PV Popup 5 Couleur', helper: 'Couleur for PV popup line 5 text.' },
          sensor_popup_pv_6_color: { label: 'PV Popup 6 Couleur', helper: 'Couleur for PV popup line 6 text.' },
          sensor_popup_pv_1_font_size: { label: 'PV Popup 1 Font Size (px)', helper: 'Font size for PV popup line 1. Par défaut 8' },
          sensor_popup_pv_2_font_size: { label: 'PV Popup 2 Font Size (px)', helper: 'Font size for PV popup line 2. Par défaut 8' },
          sensor_popup_pv_3_font_size: { label: 'PV Popup 3 Font Size (px)', helper: 'Font size for PV popup line 3. Par défaut 8' },
          sensor_popup_pv_4_font_size: { label: 'PV Popup 4 Font Size (px)', helper: 'Font size for PV popup line 4. Par défaut 8' },
          sensor_popup_pv_5_font_size: { label: 'PV Popup 5 Font Size (px)', helper: 'Font size for PV popup line 5. Par défaut 8' },
          sensor_popup_pv_6_font_size: { label: 'PV Popup 6 Font Size (px)', helper: 'Font size for PV popup line 6. Par défaut 8' },
          sensor_popup_house_1: { label: 'Maison Popup 1', helper: 'Entity for house popup line 1.' },
          sensor_popup_house_1_name: { label: 'Maison Popup 1 Nom', helper: 'Optionnel custom name for house popup line 1. Laissez vide to use entity name.' },
          sensor_popup_house_1_color: { label: 'Maison Popup 1 Couleur', helper: 'Couleur for house popup line 1 text.' },
          sensor_popup_house_1_font_size: { label: 'Maison Popup 1 Font Size (px)', helper: 'Font size for house popup line 1. Par défaut 8' },
          sensor_popup_house_2: { label: 'Maison Popup 2', helper: 'Entity for house popup line 2.' },
          sensor_popup_house_2_name: { label: 'Maison Popup 2 Nom', helper: 'Optionnel custom name for house popup line 2. Laissez vide to use entity name.' },
          sensor_popup_house_2_color: { label: 'Maison Popup 2 Couleur', helper: 'Couleur for house popup line 2 text.' },
          sensor_popup_house_2_font_size: { label: 'Maison Popup 2 Font Size (px)', helper: 'Font size for house popup line 2. Par défaut 8' },
          sensor_popup_house_3: { label: 'Maison Popup 3', helper: 'Entity for house popup line 3.' },
          sensor_popup_house_3_name: { label: 'Maison Popup 3 Nom', helper: 'Optionnel custom name for house popup line 3. Laissez vide to use entity name.' },
          sensor_popup_house_3_color: { label: 'Maison Popup 3 Couleur', helper: 'Couleur for house popup line 3 text.' },
          sensor_popup_house_3_font_size: { label: 'Maison Popup 3 Font Size (px)', helper: 'Font size for house popup line 3. Par défaut 8' },
          sensor_popup_house_4: { label: 'Maison Popup 4', helper: 'Entity for house popup line 4.' },
          sensor_popup_house_4_name: { label: 'Maison Popup 4 Nom', helper: 'Optionnel custom name for house popup line 4. Laissez vide to use entity name.' },
          sensor_popup_house_4_color: { label: 'Maison Popup 4 Couleur', helper: 'Couleur for house popup line 4 text.' },
          sensor_popup_house_4_font_size: { label: 'Maison Popup 4 Font Size (px)', helper: 'Font size for house popup line 4. Par défaut 8' },
          sensor_popup_house_5: { label: 'Maison Popup 5', helper: 'Entity for house popup line 5.' },
          sensor_popup_house_5_name: { label: 'Maison Popup 5 Nom', helper: 'Optionnel custom name for house popup line 5. Laissez vide to use entity name.' },
          sensor_popup_house_5_color: { label: 'Maison Popup 5 Couleur', helper: 'Couleur for house popup line 5 text.' },
          sensor_popup_house_5_font_size: { label: 'Maison Popup 5 Font Size (px)', helper: 'Font size for house popup line 5. Par défaut 8' },
          sensor_popup_house_6: { label: 'Maison Popup 6', helper: 'Entity for house popup line 6.' },
          sensor_popup_house_6_name: { label: 'Maison Popup 6 Nom', helper: 'Optionnel custom name for house popup line 6. Laissez vide to use entity name.' },
          sensor_popup_house_6_color: { label: 'Maison Popup 6 Couleur', helper: 'Couleur for house popup line 6 text.' },
          sensor_popup_house_6_font_size: { label: 'Maison Popup 6 Font Size (px)', helper: 'Font size for house popup line 6. Par défaut 8' },
          battery_popup_color: { label: 'Couleur texte popup batterie', helper: 'Couleur globale pour tout le texte popup batterie (date/heure, temps restant et capteurs personnalisés). Défaut #00FFFF' },
          battery_popup_font_size: { label: 'Taille police popup batterie (px)', helper: 'Taille police globale pour tout le texte popup batterie. Défaut 16' },
          sensor_popup_bat_1: { label: 'Batterie Popup 1', helper: 'Entity for battery popup line 1.' },
          sensor_popup_bat_1_name: { label: 'Batterie Popup 1 Nom', helper: 'Optionnel custom name for battery popup line 1. Laissez vide to use entity name.' },
          sensor_popup_bat_2: { label: 'Batterie Popup 2', helper: 'Entity for battery popup line 2.' },
          sensor_popup_bat_2_name: { label: 'Batterie Popup 2 Nom', helper: 'Optionnel custom name for battery popup line 2. Laissez vide to use entity name.' },
          sensor_popup_bat_3: { label: 'Batterie Popup 3', helper: 'Entity for battery popup line 3.' },
          sensor_popup_bat_3_name: { label: 'Batterie Popup 3 Nom', helper: 'Optionnel custom name for battery popup line 3. Laissez vide to use entity name.' },
          sensor_popup_bat_4: { label: 'Batterie Popup 4', helper: 'Entity for battery popup line 4.' },
          sensor_popup_bat_4_name: { label: 'Batterie Popup 4 Nom', helper: 'Optionnel custom name for battery popup line 4. Laissez vide to use entity name.' },
          sensor_popup_bat_5: { label: 'Batterie Popup 5', helper: 'Entity for battery popup line 5.' },
          sensor_popup_bat_5_name: { label: 'Batterie Popup 5 Nom', helper: 'Optionnel custom name for battery popup line 5. Laissez vide to use entity name.' },
          sensor_popup_bat_6: { label: 'Batterie Popup 6', helper: 'Entity for battery popup line 6.' },
          sensor_popup_bat_6_name: { label: 'Batterie Popup 6 Nom', helper: 'Optionnel custom name for battery popup line 6. Laissez vide to use entity name.' },
          sensor_popup_grid_1: { label: 'Réseau Popup 1', helper: 'Entity for grid popup line 1.' },
          sensor_popup_grid_1_name: { label: 'Réseau Popup 1 Nom', helper: 'Optionnel custom name for grid popup line 1. Laissez vide to use entity name.' },
          sensor_popup_grid_1_color: { label: 'Réseau Popup 1 Couleur', helper: 'Couleur for grid popup line 1 text.' },
          sensor_popup_grid_1_font_size: { label: 'Réseau Popup 1 Font Size (px)', helper: 'Font size for grid popup line 1. Par défaut 8' },
          sensor_popup_grid_2: { label: 'Réseau Popup 2', helper: 'Entity for grid popup line 2.' },
          sensor_popup_grid_2_name: { label: 'Réseau Popup 2 Nom', helper: 'Optionnel custom name for grid popup line 2. Laissez vide to use entity name.' },
          sensor_popup_grid_2_color: { label: 'Réseau Popup 2 Couleur', helper: 'Couleur for grid popup line 2 text.' },
          sensor_popup_grid_2_font_size: { label: 'Réseau Popup 2 Font Size (px)', helper: 'Font size for grid popup line 2. Par défaut 8' },
          sensor_popup_grid_3: { label: 'Réseau Popup 3', helper: 'Entity for grid popup line 3.' },
          sensor_popup_grid_3_name: { label: 'Réseau Popup 3 Nom', helper: 'Optionnel custom name for grid popup line 3. Laissez vide to use entity name.' },
          sensor_popup_grid_3_color: { label: 'Réseau Popup 3 Couleur', helper: 'Couleur for grid popup line 3 text.' },
          sensor_popup_grid_3_font_size: { label: 'Réseau Popup 3 Font Size (px)', helper: 'Font size for grid popup line 3. Par défaut 8' },
          sensor_popup_grid_4: { label: 'Réseau Popup 4', helper: 'Entity for grid popup line 4.' },
          sensor_popup_grid_4_name: { label: 'Réseau Popup 4 Nom', helper: 'Optionnel custom name for grid popup line 4. Laissez vide to use entity name.' },
          sensor_popup_grid_4_color: { label: 'Réseau Popup 4 Couleur', helper: 'Couleur for grid popup line 4 text.' },
          sensor_popup_grid_4_font_size: { label: 'Réseau Popup 4 Font Size (px)', helper: 'Font size for grid popup line 4. Par défaut 8' },
          sensor_popup_grid_5: { label: 'Réseau Popup 5', helper: 'Entity for grid popup line 5.' },
          sensor_popup_grid_5_name: { label: 'Réseau Popup 5 Nom', helper: 'Optionnel custom name for grid popup line 5. Laissez vide to use entity name.' },
          sensor_popup_grid_5_color: { label: 'Réseau Popup 5 Couleur', helper: 'Couleur for grid popup line 5 text.' },
          sensor_popup_grid_5_font_size: { label: 'Réseau Popup 5 Font Size (px)', helper: 'Font size for grid popup line 5. Par défaut 8' },
          sensor_popup_grid_6: { label: 'Réseau Popup 6', helper: 'Entity for grid popup line 6.' },
          sensor_popup_grid_6_name: { label: 'Réseau Popup 6 Nom', helper: 'Optionnel custom name for grid popup line 6. Laissez vide to use entity name.' },
          sensor_popup_grid_6_color: { label: 'Réseau Popup 6 Couleur', helper: 'Couleur for grid popup line 6 text.' },
          sensor_popup_grid_6_font_size: { label: 'Réseau Popup 6 Font Size (px)', helper: 'Font size for grid popup line 6. Par défaut 8' },
          sensor_popup_inverter_1: { label: 'Onduleur Popup 1', helper: 'Entity for inverter popup line 1.' },
          sensor_popup_inverter_1_name: { label: 'Onduleur Popup 1 Nom', helper: 'Optionnel custom name for inverter popup line 1. Laissez vide to use entity name.' },
          sensor_popup_inverter_1_color: { label: 'Onduleur Popup 1 Couleur', helper: 'Couleur for inverter popup line 1 text.' },
          sensor_popup_inverter_1_font_size: { label: 'Onduleur Popup 1 Font Size (px)', helper: 'Font size for inverter popup line 1. Par défaut 8' },
          sensor_popup_inverter_2: { label: 'Onduleur Popup 2', helper: 'Entity for inverter popup line 2.' },
          sensor_popup_inverter_2_name: { label: 'Onduleur Popup 2 Nom', helper: 'Optionnel custom name for inverter popup line 2. Laissez vide to use entity name.' },
          sensor_popup_inverter_2_color: { label: 'Onduleur Popup 2 Couleur', helper: 'Couleur for inverter popup line 2 text.' },
          sensor_popup_inverter_2_font_size: { label: 'Onduleur Popup 2 Font Size (px)', helper: 'Font size for inverter popup line 2. Par défaut 8' },
          sensor_popup_inverter_3: { label: 'Onduleur Popup 3', helper: 'Entity for inverter popup line 3.' },
          sensor_popup_inverter_3_name: { label: 'Onduleur Popup 3 Nom', helper: 'Optionnel custom name for inverter popup line 3. Laissez vide to use entity name.' },
          sensor_popup_inverter_3_color: { label: 'Onduleur Popup 3 Couleur', helper: 'Couleur for inverter popup line 3 text.' },
          sensor_popup_inverter_3_font_size: { label: 'Onduleur Popup 3 Font Size (px)', helper: 'Font size for inverter popup line 3. Par défaut 8' },
          sensor_popup_inverter_4: { label: 'Onduleur Popup 4', helper: 'Entity for inverter popup line 4.' },
          sensor_popup_inverter_4_name: { label: 'Onduleur Popup 4 Nom', helper: 'Optionnel custom name for inverter popup line 4. Laissez vide to use entity name.' },
          sensor_popup_inverter_4_color: { label: 'Onduleur Popup 4 Couleur', helper: 'Couleur for inverter popup line 4 text.' },
          sensor_popup_inverter_4_font_size: { label: 'Onduleur Popup 4 Font Size (px)', helper: 'Font size for inverter popup line 4. Par défaut 8' },
          sensor_popup_inverter_5: { label: 'Onduleur Popup 5', helper: 'Entity for inverter popup line 5.' },
          sensor_popup_inverter_5_name: { label: 'Onduleur Popup 5 Nom', helper: 'Optionnel custom name for inverter popup line 5. Laissez vide to use entity name.' },
          sensor_popup_inverter_5_color: { label: 'Onduleur Popup 5 Couleur', helper: 'Couleur for inverter popup line 5 text.' },
          sensor_popup_inverter_5_font_size: { label: 'Onduleur Popup 5 Font Size (px)', helper: 'Font size for inverter popup line 5. Par défaut 8' },
          sensor_popup_inverter_6: { label: 'Onduleur Popup 6', helper: 'Entity for inverter popup line 6.' },
          sensor_popup_inverter_6_name: { label: 'Onduleur Popup 6 Nom', helper: 'Optionnel custom name for inverter popup line 6. Laissez vide to use entity name.' },
          sensor_popup_inverter_6_color: { label: 'Onduleur Popup 6 Couleur', helper: 'Couleur for inverter popup line 6 text.' },
          sensor_popup_inverter_6_font_size: { label: 'Onduleur Popup 6 Font Size (px)', helper: 'Font size for inverter popup line 6. Par défaut 8' }
        },
        options: {
          languages: [
            { value: 'en', label: 'Anglais' },
            { value: 'it', label: 'Italien' },
            { value: 'de', label: 'Allemand' },
            { value: 'fr', label: 'Français' },
            { value: 'nl', label: 'Néerlandais' },
            { value: 'es', label: 'Espagnol' }
          ],
          display_units: [
            { value: 'W', label: 'Watts (W)' },
            { value: 'kW', label: 'Kilowatts (kW)' }
          ],
          animation_styles: [
            { value: 'dashes', label: 'Tirets (par défaut)' },
            { value: 'dashes_glow', label: 'Tirets + Lueur' },
            { value: 'fluid_flow', label: 'Flux fluide' },
            { value: 'dots', label: 'Points' },
            { value: 'arrows', label: 'Flèches' }
          ],
          initial_yes: 'Oui',
          initial_no: 'Non',
          initial_inverters_1: '1',
          initial_inverters_2: '2',
          initial_batteries_1: '1',
          initial_batteries_2: '2',
          initial_batteries_3: '3',
          initial_batteries_4: '4',
          initial_evs_1: '1',
          initial_evs_2: '2'
        },
        view: {
          daily: 'PRODUCTION JOURNALIÈRE', pv_tot: 'PV TOTAL', car1: 'VOITURE 1', car2: 'VOITURE 2', importing: 'IMPORTATION', exporting: 'EXPORTATION', charging: 'CHARGE', discharging: 'DÉCHARGE', standby: 'VEILLE'
        }
      },
      nl: {
        sections: {
          general: { title: 'General Settings', helper: 'kaart metadata, background, language, and update cadence.' },
          initialConfig: { title: 'Initiële configuratie', helper: 'First-time setup checklist and starter options.' },
          pvCommon: { title: 'Solar/PV Common', helper: 'Common Solar/PV settings shared across arrays.' },
          array1: { title: 'Solar/PV Array 1', helper: 'Kies the PV, battery, grid, load, and EV entities used by the card. Either the PV total sensor or your PV string arrays need to be specified as a minimum.' },
          array2: { title: 'Solar/PV Array 2', helper: 'If PV-totaalsensor (Omvormer 2) is set or the PV String values are provided, Array 2 will become active and enable the second inverter. You must also enable Dagelijks opbrengst sensor (Array 2) and Home Load (Omvormer 2).' },
          windmill: { title: 'Windmolen', helper: 'Configureer windmill generator sensors and display styling.' },
          battery: { title: 'Batterij', helper: 'Configureer battery entities.' },
          grid: { title: 'Net', helper: 'Configureer grid entities.' },
          car: { title: 'Auto', helper: 'Configureer EV entities.' },
          other: { title: 'Huis', helper: 'Additional sensors and advanced toggles.' },
          pvPopup: { title: 'PV Popup', helper: 'Configureer entities for the PV popup display.' },
          housePopup: { title: 'Huis Popup', helper: 'Configureer entities for the house popup display.' },
          carPopup: { title: 'Auto Popup', helper: 'Configure auto-detected EV sensors, climate controls, and extra entities for the car (EV) popups.' },
          batteryPopup: { title: 'Batterij Popup', helper: 'Configureer battery popup display.' },
          gridPopup: { title: 'Net Popup', helper: 'Configureer entities for the grid popup display.' },
          inverterPopup: { title: 'Omvormer Popup', helper: 'Configureer entities for the inverter popup display.' },
          colors: { title: 'Kleur & Thresholds', helper: 'Configureer grid thresholds and accent colours for flows and EV display.' },
          typography: { title: 'Typography', helper: 'Fine tune the font sizes used across the card.' },
          stats: { title: 'Statistieken', helper: 'Configureer energie-statistieken sensoren en labels.' },
          about: { title: 'About', helper: 'Credits, version, and helpful links.' }
        },
        fields: {
          card_title: { label: 'Kaarttitel', helper: 'Titel displayed at the top of the card. Leeg laten to disable.' },
          title_text_color: { label: 'Titel Tekstkleur', helper: 'Overrides the fill color for [data-role="title-text"]. Leeg laten to keep the SVG styling.' },
          title_bg_color: { label: 'Titel Achtergrondkleur', helper: 'Overrides the fill color for [data-role="title-bg"]. Leeg laten to keep the SVG styling.' },
          card_label_color: { label: 'Kaart Label Kleur', helper: 'Standaard vulkleur voor SVG-elementen met data-style="config" en data-role="label".' },
          card_label_font_size: { label: 'Kaart Label Lettergrootte', helper: 'Standaard lettergrootte voor SVG-elementen met data-style="config" en data-role="label".' },
          card_background_color: { label: 'Kaart Achtergrondkleur', helper: 'Standaard vulkleur voor SVG-elementen met data-style="config" en data-role="card".' },
          card_label_css: { label: 'Extra Label CSS', helper: 'Extra CSS-declaraties voor SVG-elementen met data-style="config" en data-role="label".' },
          font_family: { label: 'Lettertype', helper: 'CSS font-family used for all SVG text (e.g., sans-serif, Roboto, "Segoe UI").' },
          odometer_font_family: { label: 'Odometer Lettertype (Monospace)', helper: 'Font family used only for odometer-animated values. Leeg laten to reuse Lettertype. Tip: pick a monospace variant (e.g., "Roboto Mono" or "Space Mono").' },
          background: { label: 'Achtergrond', helper: 'Pad naar de achtergrond-SVG (bijv. /local/community/advanced-energy-card/tech.svg).' },
          night_mode: { label: 'Dag/nacht-modus', helper: 'Selecteer Day, Night, or Auto. Auto uses sun.sun: above_horizon = Day, below_horizon = Night.' },
          language: { label: 'Taal', helper: 'Kies the editor language.' },
          display_unit: { label: 'Weergave-eenheid', helper: 'Unit used when formatting power values.' },
          update_interval: { label: 'Update-interval', helper: 'Refresh cadence for card updates (0 disables throttling).' },
          initial_configuration: { label: 'Initiële configuratie', helper: 'Show the Initiële configuratie section in the editor.' },
          initial_has_pv: { label: 'Do you have Solar/PV vermogen?', helper: 'Selecteer Yes if you have solar production to configure.' },
          initial_inverters: { label: 'How many inverters do you have?', helper: 'Shown only when Solar/PV is enabled.' },
          initial_has_battery: { label: 'Do you have Batterij storage?', helper: '' },
          initial_battery_count: { label: 'How many Batteries do you have? Maximum 4', helper: '' },
          initial_has_grid: { label: 'Do you have Net supplied electricity?', helper: '' },
          initial_can_export: { label: 'Can you export excess electricity to the grid?', helper: '' },
          initial_has_windmill: { label: 'Do you have a Windmolen?', helper: '' },
          initial_has_ev: { label: 'Do you have Electric Vehicles/EV\'s?', helper: '' },
          initial_ev_count: { label: 'How many do you have?', helper: '' },
          initial_config_items_title: { label: 'Vereist configuration items', helper: '' },
          initial_config_items_helper: { label: 'These items become relevant based on your answers above.', helper: '' },
          initial_config_items_empty: { label: 'No items to show yet.', helper: '' },
          initial_config_complete_helper: { label: 'This completes the last required minimum configuration. Once clicking on the Complete button, please review all menus to check for additional items and popup configurations. This initial configuration can be re-enabled in the General menu.', helper: '' },
          initial_config_complete_button: { label: 'Complete', helper: '' },
          array_helper_text: { label: 'Each Array must have at minimum a combined Solar/PV total sensor which is the total power output of that Array or individual string values which are added together to get the total power output of the array. Dagelijks production can be supplied and can be shown in a Dagelijks production card.', helper: '' },
          animation_speed_factor: { label: 'Animatiesnelheidsfactor', helper: 'Adjust animation speed multiplier (-3x to 3x). Set 0 to pause; negatives reverse direction.' },
          animation_style: { label: 'Animatiestijl (dag)', helper: 'Flow animation style used when the card is in Day mode.' },
          night_animation_style: { label: 'Animatiestijl (nacht)', helper: 'Flow animation style used when the card is in Night mode. Leeg laten to use the Day style.' },
          dashes_glow_intensity: { label: 'Gloei-intensiteit (streepjes)', helper: 'Controls glow strength for "Dashes + Glow" (0 disables glow).' },
          fluid_flow_outer_glow: { label: 'Buitenste gloed (vloeiend)', helper: 'Inschakelen the extra outer haze/glow layer for animation_style: fluid_flow.' },
          flow_stroke_width: { label: 'Flow Stroke Width (px)', helper: 'Optioneel override for the animated flow stroke width (no SVG edits). Leeg laten to keep SVG defaults.' },
          fluid_flow_stroke_width: { label: 'Fluid Flow Stroke Width (px)', helper: 'Base stroke width for animation_style: fluid_flow. Overlay/mask widths are derived from this (default 5).' },
          arrow_scale: { label: 'Pijlschaal', helper: 'Extra size multiplier for the arrows in the "Arrows" animation style. Arrows already scale automatically with Flow Stroke Width; increase if still too small, decrease if too large.' },
          sensor_pv_total: { label: 'PV-totaalsensor', helper: 'Optioneel aggregate production sensor displayed as the combined line.' },
          sensor_pv_total_secondary: { label: 'PV-totaalsensor (Omvormer 2)', helper: 'Optioneel second inverter total; added to the PV total when provided.' },
          sensor_windmill_total: { label: 'Windmolen Total', helper: 'vermogen sensor for the windmill generator (W). When not configured the windmill SVG group is hidden.' },
          sensor_windmill_daily: { label: 'Dagelijks Windmolen opbrengst', helper: 'Optioneel sensor reporting daily windmill production totals.' },
          sensor_pv1: { label: 'PV String 1 (Array 1)', helper: 'Array 1 solar production sensor for string 1.' },
          sensor_pv2: { label: 'PV String 2 (Array 1)', helper: 'Array 1 solar production sensor for string 2.' },
          sensor_pv3: { label: 'PV String 3 (Array 1)', helper: 'Array 1 solar production sensor for string 3.' },
          sensor_pv4: { label: 'PV String 4 (Array 1)', helper: 'Array 1 solar production sensor for string 4.' },
          sensor_pv5: { label: 'PV String 5 (Array 1)', helper: 'Array 1 solar production sensor for string 5.' },
          sensor_pv6: { label: 'PV String 6 (Array 1)', helper: 'Array 1 solar production sensor for string 6.' },
          sensor_pv_array2_1: { label: 'PV String 1 (Array 2)', helper: 'Array 2 solar production sensor for string 1.' },
          sensor_pv_array2_2: { label: 'PV String 2 (Array 2)', helper: 'Array 2 solar production sensor for string 2.' },
          sensor_pv_array2_3: { label: 'PV String 3 (Array 2)', helper: 'Array 2 solar production sensor for string 3.' },
          sensor_pv_array2_4: { label: 'PV String 4 (Array 2)', helper: 'Array 2 solar production sensor for string 4.' },
          sensor_pv_array2_5: { label: 'PV String 5 (Array 2)', helper: 'Array 2 solar production sensor for string 5.' },
          sensor_pv_array2_6: { label: 'PV String 6 (Array 2)', helper: 'Array 2 solar production sensor for string 6.' },
          sensor_daily: { label: 'Dagelijks opbrengst sensor', helper: 'sensor reporting daily production totals. Either the PV total sensor or your PV string arrays need to be specified as a minimum.' },
          sensor_daily_array2: { label: 'Dagelijks opbrengst sensor (Array 2)', helper: 'sensor reporting daily production totals for Array 2.' },
          sensor_bat1_soc: { label: 'Batterij 1 SOC', helper: 'Laadstatus sensor for Batterij 1 (percentage).' },
          sensor_bat1_power: { label: 'Batterij 1 vermogen', helper: 'Provide this combined power sensor or both charge/discharge sensors so Batterij 1 becomes active.' },
          sensor_bat1_charge_power: { label: 'Batterij 1 laden vermogen', helper: 'sensor for Batterij 1 charging power.' },
          sensor_bat1_discharge_power: { label: 'Batterij 1 ontladen vermogen', helper: 'sensor for Batterij 1 discharging power.' },
          sensor_bat1_capacity_sensor: { label: 'Batterij 1 Bruikbare capaciteit sensor', helper: 'Optionele sensor die de bruikbare capaciteit van Batterij 1 in Wh of kWh rapporteert. Gebruikt met reservepercentage om de effectieve capaciteit te berekenen.' },
          bat1_capacity_manual: { label: 'Batterij 1 Bruikbare capaciteit (Handmatig)', helper: 'Alternatieve handmatige invoer voor de bruikbare capaciteit van Batterij 1. Voer de waarde in de eenheden gespecificeerd door uw display_unit instelling (Wh of kWh) in. Wordt genegeerd als capaciteitssensor is opgegeven.' },
          bat1_reserve_percentage: { label: 'Batterij 1 Reserve percentage', helper: 'Optioneel reservepercentage voor Batterij 1 (0-100). Sommige systemen houden een reserve aan om de batterijgezondheid te behouden. Dit vermindert de weergegeven effectieve bruikbare capaciteit.' },
          sensor_bat1_time_until: { label: 'Batterij 1 Tijd tot Vol/Leeg Sensor', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_bat2_soc: { label: 'Batterij 2 SOC', helper: 'Laadstatus sensor for Batterij 2 (percentage).' },
          sensor_bat2_power: { label: 'Batterij 2 vermogen', helper: 'Provide this combined power sensor or both charge/discharge sensors so Batterij 2 becomes active.' },
          sensor_bat2_charge_power: { label: 'Batterij 2 laden vermogen', helper: 'sensor for Batterij 2 charging power.' },
          sensor_bat2_discharge_power: { label: 'Batterij 2 ontladen vermogen', helper: 'sensor for Batterij 2 discharging power.' },
          sensor_bat2_capacity_sensor: { label: 'Batterij 2 Bruikbare capaciteit sensor', helper: 'Optionele sensor die de bruikbare capaciteit van Batterij 2 in Wh of kWh rapporteert. Gebruikt met reservepercentage om de effectieve capaciteit te berekenen.' },
          bat2_capacity_manual: { label: 'Batterij 2 Bruikbare capaciteit (Handmatig)', helper: 'Alternatieve handmatige invoer voor de bruikbare capaciteit van Batterij 2. Voer de waarde in de eenheden gespecificeerd door uw display_unit instelling (Wh of kWh) in. Wordt genegeerd als capaciteitssensor is opgegeven.' },
          bat2_reserve_percentage: { label: 'Batterij 2 Reserve percentage', helper: 'Optioneel reservepercentage voor Batterij 2 (0-100). Sommige systemen houden een reserve aan om de batterijgezondheid te behouden. Dit vermindert de weergegeven effectieve bruikbare capaciteit.' },
          sensor_bat2_time_until: { label: 'Batterij 2 Tijd tot Vol/Leeg Sensor', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_bat3_soc: { label: 'Batterij 3 SOC', helper: 'Laadstatus sensor for Batterij 3 (percentage).' },
          sensor_bat3_power: { label: 'Batterij 3 vermogen', helper: 'Provide this combined power sensor or both charge/discharge sensors so Batterij 3 becomes active.' },
          sensor_bat3_charge_power: { label: 'Batterij 3 laden vermogen', helper: 'sensor for Batterij 3 charging power.' },
          sensor_bat3_discharge_power: { label: 'Batterij 3 ontladen vermogen' },
          sensor_bat3_capacity_sensor: { label: 'Batterij 3 Bruikbare capaciteit sensor', helper: 'Optionele sensor die de bruikbare capaciteit van Batterij 3 in Wh of kWh rapporteert. Gebruikt met reservepercentage om de effectieve capaciteit te berekenen.' },
          bat3_capacity_manual: { label: 'Batterij 3 Bruikbare capaciteit (Handmatig)', helper: 'Alternatieve handmatige invoer voor de bruikbare capaciteit van Batterij 3. Voer de waarde in de eenheden gespecificeerd door uw display_unit instelling (Wh of kWh) in. Wordt genegeerd als capaciteitssensor is opgegeven.' },
          bat3_reserve_percentage: { label: 'Batterij 3 Reserve percentage', helper: 'Optioneel reservepercentage voor Batterij 3 (0-100). Sommige systemen houden een reserve aan om de batterijgezondheid te behouden. Dit vermindert de weergegeven effectieve bruikbare capaciteit.' },
          sensor_bat3_time_until: { label: 'Batterij 3 Tijd tot Vol/Leeg Sensor', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_bat4_soc: { label: 'Batterij 4 SOC', helper: 'Laadstatus sensor for Batterij 4 (percentage).' },
          sensor_bat4_power: { label: 'Batterij 4 vermogen', helper: 'Provide this combined power sensor or both charge/discharge sensors so Batterij 4 becomes active.' },
          sensor_bat4_charge_power: { label: 'Batterij 4 laden vermogen', helper: 'sensor for Batterij 4 charging power.' },
          sensor_bat4_discharge_power: { label: 'Batterij 4 ontladen vermogen', helper: 'sensor for Batterij 4 discharging power.' },
          sensor_bat4_capacity_sensor: { label: 'Batterij 4 Bruikbare capaciteit sensor', helper: 'Optionele sensor die de bruikbare capaciteit van Batterij 4 in Wh of kWh rapporteert. Gebruikt met reservepercentage om de effectieve capaciteit te berekenen.' },
          bat4_capacity_manual: { label: 'Batterij 4 Bruikbare capaciteit (Handmatig)', helper: 'Alternatieve handmatige invoer voor de bruikbare capaciteit van Batterij 4. Voer de waarde in de eenheden gespecificeerd door uw display_unit instelling (Wh of kWh) in. Wordt genegeerd als capaciteitssensor is opgegeven.' },
          bat4_reserve_percentage: { label: 'Batterij 4 Reserve percentage', helper: 'Optioneel reservepercentage voor Batterij 4 (0-100). Sommige systemen houden een reserve aan om de batterijgezondheid te behouden. Dit vermindert de weergegeven effectieve bruikbare capaciteit.' },
          sensor_bat4_time_until: { label: 'Batterij 4 Tijd tot Vol/Leeg Sensor', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_home_load: { label: 'Home Load/Consumption (Vereist)', helper: 'Total household consumption sensor.' },
          sensor_home_load_secondary: { label: 'Home Load (Omvormer 2)', helper: 'Optioneel house load sensor for the second inverter.' },
          sensor_heat_pump_consumption: { label: 'Heat Pump Consumption', helper: 'sensor for heat pump energy consumption.' },
          sensor_hot_water_consumption: { label: 'Water Heating', helper: 'sensor for Hot Water Heating Load.' },
          sensor_pool_consumption: { label: 'Pool', helper: 'sensor for pool power/consumption.' },
          sensor_washing_machine_consumption: { label: 'Washing Machine', helper: 'sensor for washing machine power/consumption.' },
          sensor_dishwasher_consumption: { label: 'Dish Washer', helper: 'sensor for Dish Washer Load.' },
          sensor_dryer_consumption: { label: 'Dryer', helper: 'sensor for dryer power/consumption.' },
          sensor_refrigerator_consumption: { label: 'Refrigerator', helper: 'sensor for refrigerator power/consumption.' },
          sensor_freezer_consumption: { label: 'Vriezer', helper: 'sensor for freezer power/consumption.' },
          hot_water_text_color: { label: 'Water Heating Tekstkleur', helper: 'Kleur applied to the hot water power text.' },
          dishwasher_text_color: { label: 'Dish Washer Tekstkleur', helper: 'Kleur applied to the dish washer power text.' },
          hot_water_font_size: { label: 'Water Heating Font Size (px)', helper: 'Standaard 8' },
          dishwasher_font_size: { label: 'Dish Washer Font Size (px)', helper: 'Standaard 8' },
          sensor_grid_power: { label: 'Net Omvormer 1 vermogen', helper: 'Positive/negative grid flow sensor for inverter 1. Specify either this sensor or both Net Omvormer 1 Import sensor and Net Omvormer 1 Export sensor.' },
          sensor_grid_import: { label: 'Net Omvormer 1 Import sensor', helper: 'Optioneel entity reporting inverter 1 grid import (positive) power.' },
          sensor_grid_export: { label: 'Net Omvormer 1 Export sensor', helper: 'Optioneel entity reporting inverter 1 grid export (positive) power.' },
          sensor_grid_import_daily: { label: 'Dagelijks Net Omvormer 1 Import sensor', helper: 'Optioneel entity reporting cumulative inverter 1 grid import for the current day.' },
          sensor_grid_export_daily: { label: 'Dagelijks Net Omvormer 1 Export sensor', helper: 'Optioneel entity reporting cumulative inverter 1 grid export for the current day.' },
          sensor_grid2_power: { label: 'Net Omvormer 2 vermogen', helper: 'Positive/negative grid flow sensor for inverter 2. Specify either this sensor or both Net Omvormer 2 Import sensor and Net Omvormer 2 Export sensor.' },
          sensor_grid2_import: { label: 'Net Omvormer 2 Import sensor', helper: 'Optioneel entity reporting inverter 2 grid import (positive) power.' },
          sensor_grid2_export: { label: 'Net Omvormer 2 Export sensor', helper: 'Optioneel entity reporting inverter 2 grid export (positive) power.' },
          sensor_grid2_import_daily: { label: 'Dagelijks Net Omvormer 2 Import sensor', helper: 'Optioneel entity reporting cumulative inverter 2 grid import for the current day.' },
          sensor_grid2_export_daily: { label: 'Dagelijks Net Omvormer 2 Export sensor', helper: 'Optioneel entity reporting cumulative inverter 2 grid export for the current day.' },
          show_daily_grid: { label: 'Show Dagelijks Net Values', helper: 'Show the daily import/export totals under the current grid flow when enabled.' },
          grid_daily_font_size: { label: 'Dagelijks Net Font Size (px)', helper: 'Optioneel override for daily grid import/export text. Standaards to Net Font Size.' },
          grid_current_odometer: { label: 'Odometer: Net Current', helper: 'Animate Net Current with a per-digit rolling effect.' },
          grid_current_odometer_duration: { label: 'Odometer Duur (ms)', helper: 'Animation duration in milliseconds. Standaard 350.' },
          show_grid_flow_label: { label: 'Show Net Import/Export Naam', helper: 'Prepend the importing/exporting label before the grid value when enabled.' },
          sensor_grid_state: { label: 'Net Status Sensor', helper: 'Sensor entiteit voor net status tekst (gekoppeld aan data-role="grid-state").' },
          grid_state_importing_color: { label: 'Net Import Kleur', helper: 'Kleur wanneer de netstatus importeren is.' },
          grid_state_exporting_color: { label: 'Net Export Kleur', helper: 'Kleur wanneer de netstatus exporteren is.' },
          grid_state_floating_color: { label: 'Net Floating Kleur', helper: 'Kleur wanneer de netstatus floating is.' },
          grid_state_font_size: { label: 'Net Status Font Size (px)', helper: 'Standaard 8' },
          sensor_solar_state: { label: 'Zonne-energie Status Sensor', helper: 'Sensor entiteit voor zonne-energie status tekst (gekoppeld aan data-role="solar-state"). Geeft "Producing Power" of "Not Producing" terug.' },
          solar_state_producing_color: { label: 'Zonne-energie Status Produceert Kleur', helper: 'Kleur wanneer de zonne-energie status produceert.' },
          solar_state_not_producing_color: { label: 'Zonne-energie Status Niet Produceert Kleur', helper: 'Kleur wanneer de zonne-energie status niet produceert.' },
          solar_state_font_size: { label: 'Zonne-energie Status Font Size (px)', helper: 'Standaard 8' },
          sensor_solar_forecast_today: { label: 'Zonne-energie Prognose Vandaag Sensor', helper: 'Sensor entiteit voor de zonne-energie prognose van vandaag (gekoppeld aan data-role="solar-forecast-today").' },
          sensor_solar_forecast_tomorrow: { label: 'Zonne-energie Prognose Morgen Sensor', helper: 'Sensor entiteit voor de zonne-energie prognose van morgen (gekoppeld aan data-role="solar-forecast-tomorrow").' },
          sensor_weather_icon: { label: 'Weer Icoon Sensor', helper: 'Sensor entiteit voor weer icoon tekst (gekoppeld aan data-role="weather-icon").' },
          weather_icon_color: { label: 'Weer Icoon Kleur', helper: 'Kleur toegepast op de weer icoon tekst.' },
          weather_icon_font_size: { label: 'Weer Icoon Lettergrootte (px)', helper: 'Standaard 8' },
          sensor_weather_forecast: { label: 'Weersverwachting Sensor', helper: 'Sensor entiteit voor weersverwachting tekst (gekoppeld aan data-role="weather-forecast").' },
          weather_forecast_color: { label: 'Weersverwachting Kleur', helper: 'Kleur toegepast op de weersverwachting tekst.' },
          weather_forecast_font_size: { label: 'Weersverwachting Lettergrootte (px)', helper: 'Standaard 8' },
          sun_moon_display: { label: 'Zon/Maan Weergave', helper: 'Toont een zon of maan die de dag/nacht cyclus bijhoudt. Uit = verborgen, Alleen Zon = zon overdag, Zon & Maan = zon overdag, maan \'s nachts.' },
          sun_moon_arc_color: { label: 'Boogkleur', helper: 'Lijnkleur voor het zon/maan boogpad. Leeg laten voor geen (onzichtbaar).' },
          sun_moon_arc_stroke_width: { label: 'Boogpadslijkbreedte', helper: 'Lijnbreedte (px) voor het zon/maan boogpad.' },
          sun_moon_label_color: { label: 'Zonsopgang/Zonsondergang Label Kleur', helper: 'Kleur voor de zonsopgang- en zonsondergangstijdlabels. Leeg laten voor zon/maan-icoonkleur.' },
          sun_moon_label_font_size: { label: 'Lettergrootte Zonsopgang/Zonsondergang Label', helper: 'Lettergrootte (px) voor de zonsopgang- en zonsondergangstekst. Leeg laten voor standaard.' },
          sun_moon_sunrise_label: { label: 'Zonsopgang Label Tekst', helper: 'Aangepaste tekst voor het zonsopgang label. Leeg laten voor SVG standaard.' },
          sun_moon_sunset_label: { label: 'Zonsondergang Label Tekst', helper: 'Aangepaste tekst voor het zonsondergang label. Leeg laten voor SVG standaard.' },
          stats_value_color: { label: 'Stats Value Color', helper: 'Color applied to all stat values.' },
          stats_value_font_size: { label: 'Stats Value Font Size (px)', helper: 'Font size for all stat values. Default 14' },
          stats_label_color: { label: 'Stats Label Color', helper: 'Color applied to all stat labels.' },
          stats_label_font_size: { label: 'Stats Label Font Size (px)', helper: 'Font size for all stat labels. Default 12' },
          inverter1_status_text_color: { label: 'Omvormer Status Tekstkleur', helper: 'Kleur toegepast op de omvormer statustekst (Opladen/Ontladen/Importeren/Exporteren).' },
          inverter1_status_font_size: { label: 'Omvormer Status Lettergrootte (px)', helper: 'Lettergrootte voor omvormer statustekst. Standaard 8' },
          enable_echo_alive: { label: 'Inschakelen Echo Alive', helper: 'Inschakelens an invisible iframe to keep the Silk browser open on Echo Show. The button will be positioned in a corner of the card.' },
          pv_tot_color: { label: 'PV Total Kleur', helper: 'Colour applied to the PV TOTAL text line.' },
          pv_primary_color: { label: 'PV 1 Flow Kleur', helper: 'Colour used for the primary PV animation line.' },
          pv_secondary_color: { label: 'PV 2 Flow Kleur', helper: 'Colour used for the secondary PV animation line when available.' },
          load_flow_color: { label: 'Load Flow Kleur', helper: 'Colour applied to the home load animation line.' },
          load_text_color: { label: 'Load Tekstkleur', helper: 'Colour applied to the home load text when thresholds are inactive.' },
          house_total_color: { label: 'Huis Total Kleur', helper: 'Colour applied to the HOUSE TOT text/flow.' },
          inv1_color: { label: 'Omvormer 1 to Huis Kleur', helper: 'Kleur applied to the flow from Omvormer 1 to the house.' },
          inv2_color: { label: 'Omvormer 2 to Huis Kleur', helper: 'Kleur applied to the flow from Omvormer 2 to the house.' },
          load_threshold_warning: { label: 'Load Warning Drempel', helper: 'Change load color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          load_warning_color: { label: 'Load Warning Kleur', helper: 'Hex or CSS color applied at the load warning threshold.' },
          load_threshold_critical: { label: 'Load Critical Drempel', helper: 'Change load color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          load_critical_color: { label: 'Load Critical Kleur', helper: 'Hex or CSS color applied at the load critical threshold.' },
          battery_soc_color: { label: 'Batterij SOC Kleur', helper: 'Hex color applied to the battery SOC percentage text.' },
          battery_charge_color: { label: 'Batterij laden Flow Kleur', helper: 'Colour used when energy is flowing into the battery.' },
          battery_discharge_color: { label: 'Batterij ontladen Flow Kleur', helper: 'Colour used when energy is flowing from the battery.' },
          grid_import_color: { label: 'Omvormer 1 Net Import Flow Kleur', helper: 'Base colour before thresholds when inverter 1 is importing from the grid.' },
          grid_export_color: { label: 'Omvormer 1 Net Export Flow Kleur', helper: 'Base colour before thresholds when inverter 1 is exporting to the grid.' },
          grid2_import_color: { label: 'Omvormer 2 Net Import Flow Kleur', helper: 'Base colour before thresholds when inverter 2 is importing from the grid.' },
          grid2_export_color: { label: 'Omvormer 2 Net Export Flow Kleur', helper: 'Base colour before thresholds when inverter 2 is exporting to the grid.' },
          car_flow_color: { label: 'EV Flow Kleur', helper: 'Colour applied to the electric vehicle animation line.' },
          battery_fill_high_color: { label: 'Batterij Fill (Normal) Kleur', helper: 'Liquid fill colour when the battery SOC is above the low threshold.' },
          battery_fill_low_color: { label: 'Batterij Fill (Low) Kleur', helper: 'Liquid fill colour when the battery SOC is at or below the low threshold.' },
          battery_fill_low_threshold: { label: 'Batterij Low Fill Drempel (%)', helper: 'Use the low fill colour when SOC is at or below this percentage.' },
          battery_fill_opacity: { label: 'Batterij Fill Opacity', helper: 'Opacity for the battery fill level (0-1).' },
          grid_activity_threshold: { label: 'Net Animation Drempel (W)', helper: 'Ignore grid flows whose absolute value is below this wattage before animating.' },
          grid_power_only: { label: 'Net vermogen Only', helper: 'Hide inverter/battery flows and show a direct grid-to-house flow.' },
          grid_threshold_warning: { label: 'Omvormer 1 Net Warning Drempel', helper: 'Change inverter 1 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid_warning_color: { label: 'Omvormer 1 Net Warning Kleur', helper: 'Hex or CSS color applied at the inverter 1 warning threshold.' },
          grid_threshold_critical: { label: 'Omvormer 1 Net Critical Drempel', helper: 'Change inverter 1 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid_critical_color: { label: 'Omvormer 1 Net Critical Kleur', helper: 'Hex or CSS color applied at the inverter 1 critical threshold.' },
          grid2_threshold_warning: { label: 'Omvormer 2 Net Warning Drempel', helper: 'Change inverter 2 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid2_warning_color: { label: 'Omvormer 2 Net Warning Kleur', helper: 'Hex or CSS color applied at the inverter 2 warning threshold.' },
          grid2_threshold_critical: { label: 'Omvormer 2 Net Critical Drempel', helper: 'Change inverter 2 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid2_critical_color: { label: 'Omvormer 2 Net Critical Kleur', helper: 'Hex or CSS color applied at the inverter 2 critical threshold.' },
          invert_grid: { label: 'Invert Net Values', helper: 'Inschakelen if import/export polarity is reversed.' },
          invert_battery: { label: 'Invert Batterij Values', helper: 'Inschakelen if charge/discharge polarity is reversed.' },
          invert_bat1: { label: 'Invert Batterij 1 Values', helper: 'Inschakelen if Batterij 1 charge/discharge polarity is reversed.' },
          invert_bat2: { label: 'Invert Batterij 2 Values', helper: 'Inschakelen if Batterij 2 charge/discharge polarity is reversed.' },
          invert_bat3: { label: 'Invert Batterij 3 Values', helper: 'Inschakelen if Batterij 3 charge/discharge polarity is reversed.' },
          sensor_car_power: { label: 'Auto 1 vermogen sensor', helper: 'sensor for EV charge/discharge power.' },
          sensor_car_soc: { label: 'Auto 1 SOC sensor', helper: 'Laadstatus sensor for EV 1 (percentage).' },
          sensor_car_range: { label: 'Auto 1 Bereik sensor', helper: 'Sensor entiteit voor het bereik van EV 1 (gekoppeld aan data-role="car1-range").' },
          sensor_car_state: { label: 'Auto 1 Laadstatus-tekst sensor', helper: 'Sensor entiteit voor de laadstatus tekst van EV 1 (gekoppeld aan data-role="car1-state").' },
          sensor_car_hvac_status: { label: 'Auto 1 HVAC-status sensor', helper: 'Sensor entiteit voor de HVAC/klimaat status van EV 1 (gekoppeld aan data-role="car1-hvac-status").' },
          sensor_car_outside_temp: { label: 'Auto 1 Buitentemperatuur sensor', helper: 'Sensor entiteit voor de buitentemperatuur van EV 1 (gekoppeld aan data-role="car1-outside-temp").' },
          sensor_car_inside_temp: { label: 'Auto 1 Binnentemperatuur sensor', helper: 'Sensor entiteit voor de binnen-/cabinetemperatuur van EV 1 (gekoppeld aan data-role="car1-inside-temp").' },
          sensor_car_ac_temp: { label: 'Auto 1 Airco-temperatuur sensor', helper: 'Sensor entiteit voor de ingestelde airco-temperatuur van EV 1 (gekoppeld aan data-role="car1-ac-temp").' },
          car1_climate_entity: { label: 'Auto 1 HVAC Climate-entiteit', helper: 'Climate-entiteit voor de HVAC-besturing van EV 1 (alleen climate-domein).' },
          car_soc: { label: 'Auto SOC', helper: 'sensor for EV battery SOC (percentage).' },
          car_charger_power: { label: 'Auto Charger vermogen', helper: 'sensor for EV charger power.' },
          car1_label: { label: 'Auto 1 Label', helper: 'Text displayed next to the first EV values.' },
          sensor_car2_power: { label: 'Auto 2 vermogen sensor', helper: 'sensor for EV 2 charge/discharge power.' },
          car2_power: { label: 'Auto 2 vermogen', helper: 'sensor for EV 2 charge/discharge power.' },
          sensor_car2_soc: { label: 'Auto 2 SOC sensor', helper: 'Laadstatus sensor for EV 2 (percentage).' },
          sensor_car2_range: { label: 'Auto 2 Bereik sensor', helper: 'Sensor entiteit voor het bereik van EV 2 (gekoppeld aan data-role="car2-range").' },
          sensor_car2_state: { label: 'Auto 2 Laadstatus-tekst sensor', helper: 'Sensor entiteit voor de laadstatus tekst van EV 2 (gekoppeld aan data-role="car2-state").' },
          sensor_car2_hvac_status: { label: 'Auto 2 HVAC-status sensor', helper: 'Sensor entiteit voor de HVAC/klimaat status van EV 2 (gekoppeld aan data-role="car2-hvac-status").' },
          sensor_car2_outside_temp: { label: 'Auto 2 Buitentemperatuur sensor', helper: 'Sensor entiteit voor de buitentemperatuur van EV 2 (gekoppeld aan data-role="car2-outside-temp").' },
          sensor_car2_inside_temp: { label: 'Auto 2 Binnentemperatuur sensor', helper: 'Sensor entiteit voor de binnen-/cabinetemperatuur van EV 2 (gekoppeld aan data-role="car2-inside-temp").' },
          sensor_car2_ac_temp: { label: 'Auto 2 Airco-temperatuur sensor', helper: 'Sensor entiteit voor de ingestelde airco-temperatuur van EV 2 (gekoppeld aan data-role="car2-ac-temp").' },
          car2_climate_entity: { label: 'Auto 2 HVAC Climate-entiteit', helper: 'Climate-entiteit voor de HVAC-besturing van EV 2 (alleen climate-domein).' },
          car2_soc: { label: 'Auto 2 SOC', helper: 'sensor for EV 2 battery SOC (percentage).' },
          car2_charger_power: { label: 'Auto 2 Charger vermogen', helper: 'sensor for EV 2 charger power.' },
          car2_label: { label: 'Auto 2 Label', helper: 'Text displayed next to the second EV values.' },
          car_headlight_flash: { label: 'Headlight Flash While Charging', helper: 'Inschakelen to flash the EV headlights whenever charging is detected.' },
          car1_glow_brightness: { label: 'Auto Glow Effect', helper: 'Percentage the car flow effects show while not charging.' },
          car2_glow_brightness: { label: 'Auto Glow Effect', helper: 'Percentage the car flow effects show while not charging.' },
          car_pct_color: { label: 'Auto SOC Kleur', helper: 'Hex color for EV SOC text (e.g., #00FFFF).' },
          car2_pct_color: { label: 'Auto 2 SOC Kleur', helper: 'Hex color for second EV SOC text (falls back to Auto SOC Kleur).' },
          car1_name_color: { label: 'Auto 1 Naam Kleur', helper: 'Kleur applied to the Auto 1 name label.' },
          car2_name_color: { label: 'Auto 2 Naam Kleur', helper: 'Kleur applied to the Auto 2 name label.' },
          car1_color: { label: 'Auto 1 Kleur', helper: 'Kleur applied to Auto 1 power value.' },
          car2_color: { label: 'Auto 2 Kleur', helper: 'Kleur applied to Auto 2 power value.' },
          heat_pump_label: { label: 'Heat Pump Label', helper: 'Custom label for the heat pump/AC line (defaults to "Heat Pump/AC").' },
          heat_pump_text_color: { label: 'Heat Pump Tekstkleur', helper: 'Kleur applied to the heat pump power text.' },
          pool_flow_color: { label: 'Pool Flow Kleur', helper: 'Kleur applied to the pool flow animation.' },
          pool_text_color: { label: 'Pool Tekstkleur', helper: 'Kleur applied to the pool power text.' },
          washing_machine_text_color: { label: 'Washing Machine Tekstkleur', helper: 'Kleur applied to the washing machine power text.' },
          dryer_text_color: { label: 'Dryer Tekstkleur', helper: 'Kleur applied to the dryer power text.' },
          refrigerator_text_color: { label: 'Refrigerator Tekstkleur', helper: 'Kleur applied to the refrigerator power text.' },
          freezer_text_color: { label: 'Vriezer Tekstkleur', helper: 'Kleur applied to the freezer power text.' },
          windmill_flow_color: { label: 'Windmolen Flow Kleur', helper: 'Kleur applied to the windmill flow (data-flow-key="windmill-inverter1" / "windmill-inverter2").' },
          windmill_text_color: { label: 'Windmolen Tekstkleur', helper: 'Kleur toegepast op de vermogenstekst van de windmolen.' },
          header_font_size: { label: 'Header Font Size (px)', helper: 'Standaard 8' },
          daily_label_font_size: { label: 'Dagelijks Label Font Size (px)', helper: 'Standaard 8' },
          daily_value_font_size: { label: 'Dagelijks Value Font Size (px)', helper: 'Standaard 20' },
          pv_font_size: { label: 'PV Text Font Size (px)', helper: 'Standaard 8' },
          windmill_power_font_size: { label: 'Windmolen vermogen Font Size (px)', helper: 'Standaard 8' },
          battery_soc_font_size: { label: 'Batterij SOC Font Size (px)', helper: 'Standaard 20' },
          battery_time_until_color: { label: 'Batterij Tijd Tot Vol/Leeg Kleur', helper: 'Hex kleur toegepast op de tekst van de resterende tijd.' },
          battery_time_until_font_size: { label: 'Batterij Tijd Tot Vol/Leeg Font Size (px)', helper: 'Standaard 8' },
          sensor_bat1_state: { label: 'Batterij 1 Status Sensor', helper: 'Sensor entiteit voor batterij 1 status tekst (gekoppeld aan data-role="battery1-state").' },
          sensor_bat2_state: { label: 'Batterij 2 Status Sensor', helper: 'Sensor entiteit voor batterij 2 status tekst (gekoppeld aan data-role="battery2-state").' },
          sensor_bat3_state: { label: 'Batterij 3 Status Sensor', helper: 'Sensor entiteit voor batterij 3 status tekst (gekoppeld aan data-role="battery3-state").' },
          sensor_bat4_state: { label: 'Batterij 4 Status Sensor', helper: 'Sensor entiteit voor batterij 4 status tekst (gekoppeld aan data-role="battery4-state").' },
          battery_state_fully_charged_color: { label: 'Batterij: Volledig Opgeladen Kleur', helper: 'Kleur wanneer de batterijstatus Volledig Opgeladen is.' },
          battery_state_charging_color: { label: 'Batterij: Opladen Kleur', helper: 'Kleur wanneer de batterijstatus Opladen is.' },
          battery_state_discharging_color: { label: 'Batterij: Ontladen Kleur', helper: 'Kleur wanneer de batterijstatus Ontladen is.' },
          battery_state_reserve_color: { label: 'Batterij: Reserve Kleur', helper: 'Kleur wanneer de batterijstatus Reserve is.' },
          battery_state_fully_discharged_color: { label: 'Batterij: Volledig Ontladen Kleur', helper: 'Kleur wanneer de batterijstatus Volledig Ontladen is.' },
          battery_state_font_size: { label: 'Batterij Status Font Size (px)', helper: 'Standaard 8' },
          battery_power_font_size: { label: 'Batterij vermogen Font Size (px)', helper: 'Standaard 8' },
          inv1_datetime_color: { label: 'Omvormer 1 DateTime Kleur', helper: 'Kleur voor Omvormer 1 batterij datetime weergave' },
          inv1_datetime_font_size: { label: 'Omvormer 1 DateTime Font Size (px)', helper: 'Lettergrootte voor Omvormer 1 batterij datetime. Standaard 8' },
          inv1_timeuntil_color: { label: 'Omvormer 1 Tijd Tot Kleur', helper: 'Kleur voor Omvormer 1 batterij tijd tot weergave' },
          inv1_timeuntil_font_size: { label: 'Omvormer 1 Tijd Tot Font Size (px)', helper: 'Lettergrootte voor Omvormer 1 batterij tijd tot. Standaard 8' },
          inv2_datetime_color: { label: 'Omvormer 2 DateTime Kleur', helper: 'Kleur voor Omvormer 2 batterij datetime weergave' },
          inv2_datetime_font_size: { label: 'Omvormer 2 DateTime Font Size (px)', helper: 'Lettergrootte voor Omvormer 2 batterij datetime. Standaard 8' },
          inv2_timeuntil_color: { label: 'Omvormer 2 Tijd Tot Kleur', helper: 'Kleur voor Omvormer 2 batterij tijd tot weergave' },
          inv2_timeuntil_font_size: { label: 'Omvormer 2 Tijd Tot Font Size (px)', helper: 'Lettergrootte voor Omvormer 2 batterij tijd tot. Standaard 8' },
          load_font_size: { label: 'Load Font Size (px)', helper: 'Standaard 8' },
          inv1_power_font_size: { label: 'INV 1 vermogen Font Size (px)', helper: 'Font size for the INV 1 power line. Standaard uses Load Font Size.' },
          inv2_power_font_size: { label: 'INV 2 vermogen Font Size (px)', helper: 'Font size for the INV 2 power line. Standaard uses Load Font Size.' },
          heat_pump_font_size: { label: 'Heat Pump Font Size (px)', helper: 'Standaard 8' },
          pool_font_size: { label: 'Pool Font Size (px)', helper: 'Standaard 8' },
          washing_machine_font_size: { label: 'Washing Machine Font Size (px)', helper: 'Standaard 8' },
          dryer_font_size: { label: 'Dryer Font Size (px)', helper: 'Standaard 8' },
          refrigerator_font_size: { label: 'Refrigerator Font Size (px)', helper: 'Standaard 8' },
          freezer_font_size: { label: 'Freezer Font Size (px)', helper: 'Standaard 8' },
          grid_font_size: { label: 'Net Font Size (px)', helper: 'Standaard 8' },
          car_power_font_size: { label: 'Auto vermogen Font Size (px)', helper: 'Standaard 8' },
          car2_power_font_size: { label: 'Auto 2 vermogen Font Size (px)', helper: 'Standaard 8' },
          car_name_font_size: { label: 'Auto Naam Font Size (px)', helper: 'Standaard 8' },
          car2_name_font_size: { label: 'Auto 2 Naam Font Size (px)', helper: 'Standaard 8' },
          car_soc_font_size: { label: 'Auto SOC Font Size (px)', helper: 'Standaard 8' },
          car2_soc_font_size: { label: 'Auto 2 SOC Font Size (px)', helper: 'Standaard 8' },
          sensor_popup_pv_1: { label: 'PV Popup 1', helper: 'Entity for PV popup line 1.' },
          sensor_popup_pv_2: { label: 'PV Popup 2', helper: 'Entity for PV popup line 2.' },
          sensor_popup_pv_3: { label: 'PV Popup 3', helper: 'Entity for PV popup line 3.' },
          sensor_popup_pv_4: { label: 'PV Popup 4', helper: 'Entity for PV popup line 4.' },
          sensor_popup_pv_5: { label: 'PV Popup 5', helper: 'Entity for PV popup line 5.' },
          sensor_popup_pv_6: { label: 'PV Popup 6', helper: 'Entity for PV popup line 6.' },
          sensor_popup_pv_1_name: { label: 'PV Popup 1 Naam', helper: 'Optioneel custom name for PV popup line 1. Leeg laten to use entity name.' },
          sensor_popup_pv_2_name: { label: 'PV Popup 2 Naam', helper: 'Optioneel custom name for PV popup line 2. Leeg laten to use entity name.' },
          sensor_popup_pv_3_name: { label: 'PV Popup 3 Naam', helper: 'Optioneel custom name for PV popup line 3. Leeg laten to use entity name.' },
          sensor_popup_pv_4_name: { label: 'PV Popup 4 Naam', helper: 'Optioneel custom name for PV popup line 4. Leeg laten to use entity name.' },
          sensor_popup_pv_5_name: { label: 'PV Popup 5 Naam', helper: 'Optioneel custom name for PV popup line 5. Leeg laten to use entity name.' },
          sensor_popup_pv_6_name: { label: 'PV Popup 6 Naam', helper: 'Optioneel custom name for PV popup line 6. Leeg laten to use entity name.' },
          sensor_popup_pv_1_color: { label: 'PV Popup 1 Kleur', helper: 'Kleur for PV popup line 1 text.' },
          sensor_popup_pv_2_color: { label: 'PV Popup 2 Kleur', helper: 'Kleur for PV popup line 2 text.' },
          sensor_popup_pv_3_color: { label: 'PV Popup 3 Kleur', helper: 'Kleur for PV popup line 3 text.' },
          sensor_popup_pv_4_color: { label: 'PV Popup 4 Kleur', helper: 'Kleur for PV popup line 4 text.' },
          sensor_popup_pv_5_color: { label: 'PV Popup 5 Kleur', helper: 'Kleur for PV popup line 5 text.' },
          sensor_popup_pv_6_color: { label: 'PV Popup 6 Kleur', helper: 'Kleur for PV popup line 6 text.' },
          sensor_popup_pv_1_font_size: { label: 'PV Popup 1 Font Size (px)', helper: 'Font size for PV popup line 1. Standaard 8' },
          sensor_popup_pv_2_font_size: { label: 'PV Popup 2 Font Size (px)', helper: 'Font size for PV popup line 2. Standaard 8' },
          sensor_popup_pv_3_font_size: { label: 'PV Popup 3 Font Size (px)', helper: 'Font size for PV popup line 3. Standaard 8' },
          sensor_popup_pv_4_font_size: { label: 'PV Popup 4 Font Size (px)', helper: 'Font size for PV popup line 4. Standaard 8' },
          sensor_popup_pv_5_font_size: { label: 'PV Popup 5 Font Size (px)', helper: 'Font size for PV popup line 5. Standaard 8' },
          sensor_popup_pv_6_font_size: { label: 'PV Popup 6 Font Size (px)', helper: 'Font size for PV popup line 6. Standaard 8' },
          sensor_popup_house_1: { label: 'Huis Popup 1', helper: 'Entity for house popup line 1.' },
          sensor_popup_house_1_name: { label: 'Huis Popup 1 Naam', helper: 'Optioneel custom name for house popup line 1. Leeg laten to use entity name.' },
          sensor_popup_house_1_color: { label: 'Huis Popup 1 Kleur', helper: 'Kleur for house popup line 1 text.' },
          sensor_popup_house_1_font_size: { label: 'Huis Popup 1 Font Size (px)', helper: 'Font size for house popup line 1. Standaard 8' },
          sensor_popup_house_2: { label: 'Huis Popup 2', helper: 'Entity for house popup line 2.' },
          sensor_popup_house_2_name: { label: 'Huis Popup 2 Naam', helper: 'Optioneel custom name for house popup line 2. Leeg laten to use entity name.' },
          sensor_popup_house_2_color: { label: 'Huis Popup 2 Kleur', helper: 'Kleur for house popup line 2 text.' },
          sensor_popup_house_2_font_size: { label: 'Huis Popup 2 Font Size (px)', helper: 'Font size for house popup line 2. Standaard 8' },
          sensor_popup_house_3: { label: 'Huis Popup 3', helper: 'Entity for house popup line 3.' },
          sensor_popup_house_3_name: { label: 'Huis Popup 3 Naam', helper: 'Optioneel custom name for house popup line 3. Leeg laten to use entity name.' },
          sensor_popup_house_3_color: { label: 'Huis Popup 3 Kleur', helper: 'Kleur for house popup line 3 text.' },
          sensor_popup_house_3_font_size: { label: 'Huis Popup 3 Font Size (px)', helper: 'Font size for house popup line 3. Standaard 8' },
          sensor_popup_house_4: { label: 'Huis Popup 4', helper: 'Entity for house popup line 4.' },
          sensor_popup_house_4_name: { label: 'Huis Popup 4 Naam', helper: 'Optioneel custom name for house popup line 4. Leeg laten to use entity name.' },
          sensor_popup_house_4_color: { label: 'Huis Popup 4 Kleur', helper: 'Kleur for house popup line 4 text.' },
          sensor_popup_house_4_font_size: { label: 'Huis Popup 4 Font Size (px)', helper: 'Font size for house popup line 4. Standaard 8' },
          sensor_popup_house_5: { label: 'Huis Popup 5', helper: 'Entity for house popup line 5.' },
          sensor_popup_house_5_name: { label: 'Huis Popup 5 Naam', helper: 'Optioneel custom name for house popup line 5. Leeg laten to use entity name.' },
          sensor_popup_house_5_color: { label: 'Huis Popup 5 Kleur', helper: 'Kleur for house popup line 5 text.' },
          sensor_popup_house_5_font_size: { label: 'Huis Popup 5 Font Size (px)', helper: 'Font size for house popup line 5. Standaard 8' },
          sensor_popup_house_6: { label: 'Huis Popup 6', helper: 'Entity for house popup line 6.' },
          sensor_popup_house_6_name: { label: 'Huis Popup 6 Naam', helper: 'Optioneel custom name for house popup line 6. Leeg laten to use entity name.' },
          sensor_popup_house_6_color: { label: 'Huis Popup 6 Kleur', helper: 'Kleur for house popup line 6 text.' },
          sensor_popup_house_6_font_size: { label: 'Huis Popup 6 Font Size (px)', helper: 'Font size for house popup line 6. Standaard 8' },
          battery_popup_color: { label: 'Batterij Popup Tekstkleur', helper: 'Globale kleur voor alle batterij popup tekst (datum/tijd, tijd tot en aangepaste sensoren). Standaard #00FFFF' },
          battery_popup_font_size: { label: 'Batterij Popup Lettergrootte (px)', helper: 'Globale lettergrootte voor alle batterij popup tekst. Standaard 16' },
          sensor_popup_bat_1: { label: 'Batterij Popup 1', helper: 'Entity for battery popup line 1.' },
          sensor_popup_bat_1_name: { label: 'Batterij Popup 1 Naam', helper: 'Optioneel custom name for battery popup line 1. Leeg laten to use entity name.' },
          sensor_popup_bat_2: { label: 'Batterij Popup 2', helper: 'Entity for battery popup line 2.' },
          sensor_popup_bat_2_name: { label: 'Batterij Popup 2 Naam', helper: 'Optioneel custom name for battery popup line 2. Leeg laten to use entity name.' },
          sensor_popup_bat_3: { label: 'Batterij Popup 3', helper: 'Entity for battery popup line 3.' },
          sensor_popup_bat_3_name: { label: 'Batterij Popup 3 Naam', helper: 'Optioneel custom name for battery popup line 3. Leeg laten to use entity name.' },
          sensor_popup_bat_4: { label: 'Batterij Popup 4', helper: 'Entity for battery popup line 4.' },
          sensor_popup_bat_4_name: { label: 'Batterij Popup 4 Naam', helper: 'Optioneel custom name for battery popup line 4. Leeg laten to use entity name.' },
          sensor_popup_bat_5: { label: 'Batterij Popup 5', helper: 'Entity for battery popup line 5.' },
          sensor_popup_bat_5_name: { label: 'Batterij Popup 5 Naam', helper: 'Optioneel custom name for battery popup line 5. Leeg laten to use entity name.' },
          sensor_popup_bat_6: { label: 'Batterij Popup 6', helper: 'Entity for battery popup line 6.' },
          sensor_popup_bat_6_name: { label: 'Batterij Popup 6 Naam', helper: 'Optioneel custom name for battery popup line 6. Leeg laten to use entity name.' },
          sensor_popup_grid_1: { label: 'Net Popup 1', helper: 'Entity for grid popup line 1.' },
          sensor_popup_grid_1_name: { label: 'Net Popup 1 Naam', helper: 'Optioneel custom name for grid popup line 1. Leeg laten to use entity name.' },
          sensor_popup_grid_1_color: { label: 'Net Popup 1 Kleur', helper: 'Kleur for grid popup line 1 text.' },
          sensor_popup_grid_1_font_size: { label: 'Net Popup 1 Font Size (px)', helper: 'Font size for grid popup line 1. Standaard 8' },
          sensor_popup_grid_2: { label: 'Net Popup 2', helper: 'Entity for grid popup line 2.' },
          sensor_popup_grid_2_name: { label: 'Net Popup 2 Naam', helper: 'Optioneel custom name for grid popup line 2. Leeg laten to use entity name.' },
          sensor_popup_grid_2_color: { label: 'Net Popup 2 Kleur', helper: 'Kleur for grid popup line 2 text.' },
          sensor_popup_grid_2_font_size: { label: 'Net Popup 2 Font Size (px)', helper: 'Font size for grid popup line 2. Standaard 8' },
          sensor_popup_grid_3: { label: 'Net Popup 3', helper: 'Entity for grid popup line 3.' },
          sensor_popup_grid_3_name: { label: 'Net Popup 3 Naam', helper: 'Optioneel custom name for grid popup line 3. Leeg laten to use entity name.' },
          sensor_popup_grid_3_color: { label: 'Net Popup 3 Kleur', helper: 'Kleur for grid popup line 3 text.' },
          sensor_popup_grid_3_font_size: { label: 'Net Popup 3 Font Size (px)', helper: 'Font size for grid popup line 3. Standaard 8' },
          sensor_popup_grid_4: { label: 'Net Popup 4', helper: 'Entity for grid popup line 4.' },
          sensor_popup_grid_4_name: { label: 'Net Popup 4 Naam', helper: 'Optioneel custom name for grid popup line 4. Leeg laten to use entity name.' },
          sensor_popup_grid_4_color: { label: 'Net Popup 4 Kleur', helper: 'Kleur for grid popup line 4 text.' },
          sensor_popup_grid_4_font_size: { label: 'Net Popup 4 Font Size (px)', helper: 'Font size for grid popup line 4. Standaard 8' },
          sensor_popup_grid_5: { label: 'Net Popup 5', helper: 'Entity for grid popup line 5.' },
          sensor_popup_grid_5_name: { label: 'Net Popup 5 Naam', helper: 'Optioneel custom name for grid popup line 5. Leeg laten to use entity name.' },
          sensor_popup_grid_5_color: { label: 'Net Popup 5 Kleur', helper: 'Kleur for grid popup line 5 text.' },
          sensor_popup_grid_5_font_size: { label: 'Net Popup 5 Font Size (px)', helper: 'Font size for grid popup line 5. Standaard 8' },
          sensor_popup_grid_6: { label: 'Net Popup 6', helper: 'Entity for grid popup line 6.' },
          sensor_popup_grid_6_name: { label: 'Net Popup 6 Naam', helper: 'Optioneel custom name for grid popup line 6. Leeg laten to use entity name.' },
          sensor_popup_grid_6_color: { label: 'Net Popup 6 Kleur', helper: 'Kleur for grid popup line 6 text.' },
          sensor_popup_grid_6_font_size: { label: 'Net Popup 6 Font Size (px)', helper: 'Font size for grid popup line 6. Standaard 8' },
          sensor_popup_inverter_1: { label: 'Omvormer Popup 1', helper: 'Entity for inverter popup line 1.' },
          sensor_popup_inverter_1_name: { label: 'Omvormer Popup 1 Naam', helper: 'Optioneel custom name for inverter popup line 1. Leeg laten to use entity name.' },
          sensor_popup_inverter_1_color: { label: 'Omvormer Popup 1 Kleur', helper: 'Kleur for inverter popup line 1 text.' },
          sensor_popup_inverter_1_font_size: { label: 'Omvormer Popup 1 Font Size (px)', helper: 'Font size for inverter popup line 1. Standaard 8' },
          sensor_popup_inverter_2: { label: 'Omvormer Popup 2', helper: 'Entity for inverter popup line 2.' },
          sensor_popup_inverter_2_name: { label: 'Omvormer Popup 2 Naam', helper: 'Optioneel custom name for inverter popup line 2. Leeg laten to use entity name.' },
          sensor_popup_inverter_2_color: { label: 'Omvormer Popup 2 Kleur', helper: 'Kleur for inverter popup line 2 text.' },
          sensor_popup_inverter_2_font_size: { label: 'Omvormer Popup 2 Font Size (px)', helper: 'Font size for inverter popup line 2. Standaard 8' },
          sensor_popup_inverter_3: { label: 'Omvormer Popup 3', helper: 'Entity for inverter popup line 3.' },
          sensor_popup_inverter_3_name: { label: 'Omvormer Popup 3 Naam', helper: 'Optioneel custom name for inverter popup line 3. Leeg laten to use entity name.' },
          sensor_popup_inverter_3_color: { label: 'Omvormer Popup 3 Kleur', helper: 'Kleur for inverter popup line 3 text.' },
          sensor_popup_inverter_3_font_size: { label: 'Omvormer Popup 3 Font Size (px)', helper: 'Font size for inverter popup line 3. Standaard 8' },
          sensor_popup_inverter_4: { label: 'Omvormer Popup 4', helper: 'Entity for inverter popup line 4.' },
          sensor_popup_inverter_4_name: { label: 'Omvormer Popup 4 Naam', helper: 'Optioneel custom name for inverter popup line 4. Leeg laten to use entity name.' },
          sensor_popup_inverter_4_color: { label: 'Omvormer Popup 4 Kleur', helper: 'Kleur for inverter popup line 4 text.' },
          sensor_popup_inverter_4_font_size: { label: 'Omvormer Popup 4 Font Size (px)', helper: 'Font size for inverter popup line 4. Standaard 8' },
          sensor_popup_inverter_5: { label: 'Omvormer Popup 5', helper: 'Entity for inverter popup line 5.' },
          sensor_popup_inverter_5_name: { label: 'Omvormer Popup 5 Naam', helper: 'Optioneel custom name for inverter popup line 5. Leeg laten to use entity name.' },
          sensor_popup_inverter_5_color: { label: 'Omvormer Popup 5 Kleur', helper: 'Kleur for inverter popup line 5 text.' },
          sensor_popup_inverter_5_font_size: { label: 'Omvormer Popup 5 Font Size (px)', helper: 'Font size for inverter popup line 5. Standaard 8' },
          sensor_popup_inverter_6: { label: 'Omvormer Popup 6', helper: 'Entity for inverter popup line 6.' },
          sensor_popup_inverter_6_name: { label: 'Omvormer Popup 6 Naam', helper: 'Optioneel custom name for inverter popup line 6. Leeg laten to use entity name.' },
          sensor_popup_inverter_6_color: { label: 'Omvormer Popup 6 Kleur', helper: 'Kleur for inverter popup line 6 text.' },
          sensor_popup_inverter_6_font_size: { label: 'Omvormer Popup 6 Font Size (px)', helper: 'Font size for inverter popup line 6. Standaard 8' }
        },
        options: {
          languages: [
            { value: 'en', label: 'Engels' },
            { value: 'it', label: 'Italiaans' },
            { value: 'de', label: 'Duits' },
            { value: 'fr', label: 'Frans' },
            { value: 'nl', label: 'Nederlands' },
            { value: 'es', label: 'Spaans' }
          ],
          display_units: [
            { value: 'W', label: 'Watt (W)' },
            { value: 'kW', label: 'Kilowatt (kW)' }
          ],
          animation_styles: [
            { value: 'dashes', label: 'Streepjes (standaard)' },
            { value: 'dashes_glow', label: 'Streepjes + gloed' },
            { value: 'fluid_flow', label: 'Vloeiende stroom' },
            { value: 'dots', label: 'Punten' },
            { value: 'arrows', label: 'Pijlen' }
          ],
          initial_yes: 'Ja',
          initial_no: 'Nee',
          initial_inverters_1: '1',
          initial_inverters_2: '2',
          initial_batteries_1: '1',
          initial_batteries_2: '2',
          initial_batteries_3: '3',
          initial_batteries_4: '4',
          initial_evs_1: '1',
          initial_evs_2: '2'
        },
        view: {
          daily: 'DAGOPBRENGST', pv_tot: 'PV TOTAAL', car1: 'AUTO 1', car2: 'AUTO 2', importing: 'IMPORT', exporting: 'EXPORT', charging: 'OPLA DEN', discharging: 'ONTLADEN'
        }
      },
      es: {
        sections: {
          general: { title: 'General Settings', helper: 'tarjeta metadata, background, language, and update cadence.' },
          initialConfig: { title: 'Configuración inicial', helper: 'First-time setup checklist and starter options.' },
          pvCommon: { title: 'Solar/PV Common', helper: 'Common Solar/PV settings shared across arrays.' },
          array1: { title: 'Solar/PV Array 1', helper: 'Elige the PV, battery, grid, load, and VE entities used by the card. Either the PV total sensor or your PV string arrays need to be specified as a minimum.' },
          array2: { title: 'Solar/PV Array 2', helper: 'If sensor PV total (Inversor 2) is set or the PV String values are provided, Array 2 will become active and enable the second inverter. You must also enable Diario producción sensor (Array 2) and Home Load (Inversor 2).' },
          windmill: { title: 'Aerogenerador', helper: 'Configura windmill generator sensors and display styling.' },
          battery: { title: 'Batería', helper: 'Configura battery entities.' },
          grid: { title: 'Red', helper: 'Configura grid entities.' },
          car: { title: 'Coche', helper: 'Configura VE entities.' },
          other: { title: 'Casa', helper: 'Additional sensors and advanced toggles.' },
          pvPopup: { title: 'PV Popup', helper: 'Configura entities for the PV popup display.' },
          housePopup: { title: 'Casa Popup', helper: 'Configura entities for the house popup display.' },
          carPopup: { title: 'Coche Popup', helper: 'Configure auto-detected EV sensors, climate controls, and extra entities for the car (EV) popups.' },
          batteryPopup: { title: 'Batería Popup', helper: 'Configura battery popup display.' },
          gridPopup: { title: 'Red Popup', helper: 'Configura entities for the grid popup display.' },
          inverterPopup: { title: 'Inversor Popup', helper: 'Configura entities for the inverter popup display.' },
          colors: { title: 'Color & Thresholds', helper: 'Configura grid thresholds and accent colours for flows and VE display.' },
          typography: { title: 'Typography', helper: 'Fine tune the font sizes used across the card.' },
          stats: { title: 'Stats', helper: 'Configure sensores y etiquetas de estadisticas de energia.' },
          about: { title: 'About', helper: 'Credits, version, and helpful links.' }
        },
        fields: {
          card_title: { label: 'Título de la tarjeta', helper: 'Título displayed at the top of the card. Deja en blanco to disable.' },
          title_text_color: { label: 'Título Color del texto', helper: 'Overrides the fill color for [data-role="title-text"]. Deja en blanco to keep the SVG styling.' },
          title_bg_color: { label: 'Título Color de fondo', helper: 'Overrides the fill color for [data-role="title-bg"]. Deja en blanco to keep the SVG styling.' },
          card_label_color: { label: 'Color Etiqueta Tarjeta', helper: 'Color de relleno predeterminado para elementos SVG con data-style="config" y data-role="label".' },
          card_label_font_size: { label: 'Tamaño Fuente Etiqueta Tarjeta', helper: 'Tamaño de fuente predeterminado para elementos SVG con data-style="config" y data-role="label".' },
          card_background_color: { label: 'Color Fondo Tarjeta', helper: 'Color de relleno predeterminado para elementos SVG con data-style="config" y data-role="card".' },
          card_label_css: { label: 'CSS etiqueta adicional', helper: 'Declaraciones CSS adicionales aplicadas a elementos SVG con data-style="config" y data-role="label".' },
          font_family: { label: 'Familia tipográfica', helper: 'CSS font-family used for all SVG text (e.g., sans-serif, Roboto, "Segoe UI").' },
          odometer_font_family: { label: 'Odómetro Familia tipográfica (Monospace)', helper: 'Font family used only for odometer-animated values. Deja en blanco to reuse Familia tipográfica. Tip: pick a monospace variant (e.g., "Roboto Mono" or "Space Mono").' },
          background: { label: 'Fondo', helper: 'Ruta al archivo SVG de fondo (p. ej. /local/community/advanced-energy-card/tech.svg).' },
          night_mode: { label: 'Modo día/noche', helper: 'Selecciona Day, Night, or Auto. Auto uses sun.sun: above_horizon = Day, below_horizon = Night.' },
          language: { label: 'Idioma', helper: 'Elige the editor language.' },
          display_unit: { label: 'Unidad de visualización', helper: 'Unit used when formatting power values.' },
          update_interval: { label: 'Intervalo de actualización', helper: 'Refresh cadence for card updates (0 disables throttling).' },
          initial_configuration: { label: 'Configuración inicial', helper: 'Show the Configuración inicial section in the editor.' },
          initial_has_pv: { label: 'Do you have Solar/PV potencia?', helper: 'Selecciona Yes if you have solar production to configure.' },
          initial_inverters: { label: 'How many inverters do you have?', helper: 'Shown only when Solar/PV is enabled.' },
          initial_has_battery: { label: 'Do you have Batería storage?', helper: '' },
          initial_battery_count: { label: 'How many Batteries do you have? Maximum 4', helper: '' },
          initial_has_grid: { label: 'Do you have Red supplied electricity?', helper: '' },
          initial_can_export: { label: 'Can you export excess electricity to the grid?', helper: '' },
          initial_has_windmill: { label: 'Do you have a Aerogenerador?', helper: '' },
          initial_has_ev: { label: 'Do you have Electric Vehicles/VE\'s?', helper: '' },
          initial_ev_count: { label: 'How many do you have?', helper: '' },
          initial_config_items_title: { label: 'Requerido configuration items', helper: '' },
          initial_config_items_helper: { label: 'These items become relevant based on your answers above.', helper: '' },
          initial_config_items_empty: { label: 'No items to show yet.', helper: '' },
          initial_config_complete_helper: { label: 'This completes the last required minimum configuration. Once clicking on the Complete button, please review all menus to check for additional items and popup configurations. This initial configuration can be re-enabled in the General menu.', helper: '' },
          initial_config_complete_button: { label: 'Complete', helper: '' },
          array_helper_text: { label: 'Each Array must have at minimum a combined Solar/PV total sensor which is the total power output of that Array or individual string values which are added together to get the total power output of the array. Diario production can be supplied and can be shown in a Diario production card.', helper: '' },
          animation_speed_factor: { label: 'Factor de velocidad de animación', helper: 'Adjust animation speed multiplier (-3x to 3x). Set 0 to pause; negatives reverse direction.' },
          animation_style: { label: 'Estilo de animación (día)', helper: 'Flow animation style used when the card is in Day mode.' },
          night_animation_style: { label: 'Estilo de animación (noche)', helper: 'Flow animation style used when the card is in Night mode. Deja en blanco to use the Day style.' },
          dashes_glow_intensity: { label: 'Intensidad del brillo (guiones)', helper: 'Controls glow strength for "Dashes + Glow" (0 disables glow).' },
          fluid_flow_outer_glow: { label: 'Brillo exterior (flujo fluido)', helper: 'Habilitar the extra outer haze/glow layer for animation_style: fluid_flow.' },
          flow_stroke_width: { label: 'Flow Stroke Width (px)', helper: 'Opcional override for the animated flow stroke width (no SVG edits). Deja en blanco to keep SVG defaults.' },
          fluid_flow_stroke_width: { label: 'Fluid Flow Stroke Width (px)', helper: 'Base stroke width for animation_style: fluid_flow. Overlay/mask widths are derived from this (default 5).' },
          arrow_scale: { label: 'Escala de flechas', helper: 'Extra size multiplier for the arrows in the "Arrows" animation style. Arrows already scale automatically with Flow Stroke Width; increase if still too small, decrease if too large.' },
          sensor_pv_total: { label: 'sensor PV total', helper: 'Opcional aggregate production sensor displayed as the combined line.' },
          sensor_pv_total_secondary: { label: 'sensor PV total (Inversor 2)', helper: 'Opcional second inverter total; added to the PV total when provided.' },
          sensor_windmill_total: { label: 'Aerogenerador Total', helper: 'potencia sensor for the windmill generator (W). When not configured the windmill SVG group is hidden.' },
          sensor_windmill_daily: { label: 'Diario Aerogenerador producción', helper: 'Opcional sensor reporting daily windmill production totals.' },
          sensor_pv1: { label: 'PV String 1 (Array 1)', helper: 'Array 1 solar production sensor for string 1.' },
          sensor_pv2: { label: 'PV String 2 (Array 1)', helper: 'Array 1 solar production sensor for string 2.' },
          sensor_pv3: { label: 'PV String 3 (Array 1)', helper: 'Array 1 solar production sensor for string 3.' },
          sensor_pv4: { label: 'PV String 4 (Array 1)', helper: 'Array 1 solar production sensor for string 4.' },
          sensor_pv5: { label: 'PV String 5 (Array 1)', helper: 'Array 1 solar production sensor for string 5.' },
          sensor_pv6: { label: 'PV String 6 (Array 1)', helper: 'Array 1 solar production sensor for string 6.' },
          sensor_pv_array2_1: { label: 'PV String 1 (Array 2)', helper: 'Array 2 solar production sensor for string 1.' },
          sensor_pv_array2_2: { label: 'PV String 2 (Array 2)', helper: 'Array 2 solar production sensor for string 2.' },
          sensor_pv_array2_3: { label: 'PV String 3 (Array 2)', helper: 'Array 2 solar production sensor for string 3.' },
          sensor_pv_array2_4: { label: 'PV String 4 (Array 2)', helper: 'Array 2 solar production sensor for string 4.' },
          sensor_pv_array2_5: { label: 'PV String 5 (Array 2)', helper: 'Array 2 solar production sensor for string 5.' },
          sensor_pv_array2_6: { label: 'PV String 6 (Array 2)', helper: 'Array 2 solar production sensor for string 6.' },
          sensor_daily: { label: 'Diario producción sensor', helper: 'sensor reporting daily production totals. Either the PV total sensor or your PV string arrays need to be specified as a minimum.' },
          sensor_daily_array2: { label: 'Diario producción sensor (Array 2)', helper: 'sensor reporting daily production totals for Array 2.' },
          sensor_bat1_soc: { label: 'Batería 1 SOC', helper: 'Estado de carga sensor for Batería 1 (percentage).' },
          sensor_bat1_power: { label: 'Batería 1 potencia', helper: 'Provide this combined power sensor or both charge/discharge sensors so Batería 1 becomes active.' },
          sensor_bat1_charge_power: { label: 'Batería 1 carga potencia', helper: 'sensor for Batería 1 charging power.' },
          sensor_bat1_discharge_power: { label: 'Batería 1 descarga potencia', helper: 'sensor for Batería 1 discharging power.' },
          sensor_bat1_capacity_sensor: { label: 'Batería 1 Sensor capacidad utilizable', helper: 'Sensor opcional que informa la capacidad utilizable de Batería 1 en Wh o kWh. Se usa con el porcentaje de reserva para calcular la capacidad efectiva.' },
          bat1_capacity_manual: { label: 'Batería 1 Capacidad utilizable (Manual)', helper: 'Entrada manual alternativa para la capacidad utilizable de Batería 1. Ingrese el valor en las unidades especificadas por su configuración display_unit (Wh o kWh). Se ignora si se proporciona un sensor de capacidad.' },
          bat1_reserve_percentage: { label: 'Batería 1 Porcentaje de reserva', helper: 'Porcentaje de reserva opcional para Batería 1 (0-100). Algunos sistemas mantienen una reserva para preservar la salud de la batería. Esto reduce la capacidad utilizable efectiva mostrada.' },
          sensor_bat1_time_until: { label: 'Sensor Tiempo Restante Batería 1', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_bat2_soc: { label: 'Batería 2 SOC', helper: 'Estado de carga sensor for Batería 2 (percentage).' },
          sensor_bat2_power: { label: 'Batería 2 potencia', helper: 'Provide this combined power sensor or both charge/discharge sensors so Batería 2 becomes active.' },
          sensor_bat2_charge_power: { label: 'Batería 2 carga potencia', helper: 'sensor for Batería 2 charging power.' },
          sensor_bat2_discharge_power: { label: 'Batería 2 descarga potencia', helper: 'sensor for Batería 2 discharging power.' },
          sensor_bat2_capacity_sensor: { label: 'Batería 2 Sensor capacidad utilizable', helper: 'Sensor opcional que informa la capacidad utilizable de Batería 2 en Wh o kWh. Se usa con el porcentaje de reserva para calcular la capacidad efectiva.' },
          bat2_capacity_manual: { label: 'Batería 2 Capacidad utilizable (Manual)', helper: 'Entrada manual alternativa para la capacidad utilizable de Batería 2. Ingrese el valor en las unidades especificadas por su configuración display_unit (Wh o kWh). Se ignora si se proporciona un sensor de capacidad.' },
          bat2_reserve_percentage: { label: 'Batería 2 Porcentaje de reserva', helper: 'Porcentaje de reserva opcional para Batería 2 (0-100). Algunos sistemas mantienen una reserva para preservar la salud de la batería. Esto reduce la capacidad utilizable efectiva mostrada.' },
          sensor_bat2_time_until: { label: 'Sensor Tiempo Restante Batería 2', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_bat3_soc: { label: 'Batería 3 SOC', helper: 'Estado de carga sensor for Batería 3 (percentage).' },
          sensor_bat3_power: { label: 'Batería 3 potencia', helper: 'Provide this combined power sensor or both charge/discharge sensors so Batería 3 becomes active.' },
          sensor_bat3_charge_power: { label: 'Batería 3 carga potencia', helper: 'sensor for Batería 3 charging power.' },
          sensor_bat3_discharge_power: { label: 'Batería 3 descarga potencia' },
          sensor_bat3_capacity_sensor: { label: 'Batería 3 Sensor capacidad utilizable', helper: 'Sensor opcional que informa la capacidad utilizable de Batería 3 en Wh o kWh. Se usa con el porcentaje de reserva para calcular la capacidad efectiva.' },
          bat3_capacity_manual: { label: 'Batería 3 Capacidad utilizable (Manual)', helper: 'Entrada manual alternativa para la capacidad utilizable de Batería 3. Ingrese el valor en las unidades especificadas por su configuración display_unit (Wh o kWh). Se ignora si se proporciona un sensor de capacidad.' },
          bat3_reserve_percentage: { label: 'Batería 3 Porcentaje de reserva', helper: 'Porcentaje de reserva opcional para Batería 3 (0-100). Algunos sistemas mantienen una reserva para preservar la salud de la batería. Esto reduce la capacidad utilizable efectiva mostrada.' },
          sensor_bat3_time_until: { label: 'Sensor Tiempo Restante Batería 3', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_bat4_soc: { label: 'Batería 4 SOC', helper: 'Estado de carga sensor for Batería 4 (percentage).' },
          sensor_bat4_power: { label: 'Batería 4 potencia', helper: 'Provide this combined power sensor or both charge/discharge sensors so Batería 4 becomes active.' },
          sensor_bat4_charge_power: { label: 'Batería 4 carga potencia', helper: 'sensor for Batería 4 charging power.' },
          sensor_bat4_discharge_power: { label: 'Batería 4 descarga potencia', helper: 'sensor for Batería 4 discharging power.' },
          sensor_bat4_capacity_sensor: { label: 'Batería 4 Sensor capacidad utilizable', helper: 'Sensor opcional que informa la capacidad utilizable de Batería 4 en Wh o kWh. Se usa con el porcentaje de reserva para calcular la capacidad efectiva.' },
          bat4_capacity_manual: { label: 'Batería 4 Capacidad utilizable (Manual)', helper: 'Entrada manual alternativa para la capacidad utilizable de Batería 4. Ingrese el valor en las unidades especificadas por su configuración display_unit (Wh o kWh). Se ignora si se proporciona un sensor de capacidad.' },
          bat4_reserve_percentage: { label: 'Batería 4 Porcentaje de reserva', helper: 'Porcentaje de reserva opcional para Batería 4 (0-100). Algunos sistemas mantienen una reserva para preservar la salud de la batería. Esto reduce la capacidad utilizable efectiva mostrada.' },
          sensor_bat4_time_until: { label: 'Sensor Tiempo Restante Batería 4', helper: 'Optional: HA entity providing time-until-full/flat as text. When set, overrides the calculated value.' },
          sensor_home_load: { label: 'Home Load/Consumption (Requerido)', helper: 'Total household consumption sensor.' },
          sensor_home_load_secondary: { label: 'Home Load (Inversor 2)', helper: 'Opcional house load sensor for the second inverter.' },
          sensor_heat_pump_consumption: { label: 'Heat Pump Consumption', helper: 'sensor for heat pump energy consumption.' },
          sensor_hot_water_consumption: { label: 'Water Heating', helper: 'sensor for Hot Water Heating Load.' },
          sensor_pool_consumption: { label: 'Pool', helper: 'sensor for pool power/consumption.' },
          sensor_washing_machine_consumption: { label: 'Washing Machine', helper: 'sensor for washing machine power/consumption.' },
          sensor_dishwasher_consumption: { label: 'Dish Washer', helper: 'sensor for Dish Washer Load.' },
          sensor_dryer_consumption: { label: 'Dryer', helper: 'sensor for dryer power/consumption.' },
          sensor_refrigerator_consumption: { label: 'Refrigerator', helper: 'sensor for refrigerator power/consumption.' },
          sensor_freezer_consumption: { label: 'Congelador', helper: 'sensor for freezer power/consumption.' },
          hot_water_text_color: { label: 'Water Heating Color del texto', helper: 'Color applied to the hot water power text.' },
          dishwasher_text_color: { label: 'Dish Washer Color del texto', helper: 'Color applied to the dish washer power text.' },
          hot_water_font_size: { label: 'Water Heating Font Size (px)', helper: 'Predeterminado 8' },
          dishwasher_font_size: { label: 'Dish Washer Font Size (px)', helper: 'Predeterminado 8' },
          sensor_grid_power: { label: 'Red Inversor 1 potencia', helper: 'Positive/negative grid flow sensor for inverter 1. Specify either this sensor or both Red Inversor 1 Import sensor and Red Inversor 1 Export sensor.' },
          sensor_grid_import: { label: 'Red Inversor 1 Import sensor', helper: 'Opcional entity reporting inverter 1 grid import (positive) power.' },
          sensor_grid_export: { label: 'Red Inversor 1 Export sensor', helper: 'Opcional entity reporting inverter 1 grid export (positive) power.' },
          sensor_grid_import_daily: { label: 'Diario Red Inversor 1 Import sensor', helper: 'Opcional entity reporting cumulative inverter 1 grid import for the current day.' },
          sensor_grid_export_daily: { label: 'Diario Red Inversor 1 Export sensor', helper: 'Opcional entity reporting cumulative inverter 1 grid export for the current day.' },
          sensor_grid2_power: { label: 'Red Inversor 2 potencia', helper: 'Positive/negative grid flow sensor for inverter 2. Specify either this sensor or both Red Inversor 2 Import sensor and Red Inversor 2 Export sensor.' },
          sensor_grid2_import: { label: 'Red Inversor 2 Import sensor', helper: 'Opcional entity reporting inverter 2 grid import (positive) power.' },
          sensor_grid2_export: { label: 'Red Inversor 2 Export sensor', helper: 'Opcional entity reporting inverter 2 grid export (positive) power.' },
          sensor_grid2_import_daily: { label: 'Diario Red Inversor 2 Import sensor', helper: 'Opcional entity reporting cumulative inverter 2 grid import for the current day.' },
          sensor_grid2_export_daily: { label: 'Diario Red Inversor 2 Export sensor', helper: 'Opcional entity reporting cumulative inverter 2 grid export for the current day.' },
          show_daily_grid: { label: 'Show Diario Red Values', helper: 'Show the daily import/export totals under the current grid flow when enabled.' },
          grid_daily_font_size: { label: 'Diario Red Font Size (px)', helper: 'Opcional override for daily grid import/export text. Predeterminados to Red Font Size.' },
          grid_current_odometer: { label: 'Odómetro: Red Current', helper: 'Animate Red Current with a per-digit rolling effect.' },
          grid_current_odometer_duration: { label: 'Odómetro Duración (ms)', helper: 'Animation duration in milliseconds. Predeterminado 350.' },
          show_grid_flow_label: { label: 'Show Red Import/Export Nombre', helper: 'Prepend the importing/exporting label before the grid value when enabled.' },
          sensor_grid_state: { label: 'Sensor Estado Red', helper: 'Entidad sensor para el texto del estado de la red (vinculado a data-role="grid-state").' },
          grid_state_importing_color: { label: 'Color Importación Red', helper: 'Color cuando el estado de la red es importación.' },
          grid_state_exporting_color: { label: 'Color Exportación Red', helper: 'Color cuando el estado de la red es exportación.' },
          grid_state_floating_color: { label: 'Color Flotación Red', helper: 'Color cuando el estado de la red es flotación.' },
          grid_state_font_size: { label: 'Tamaño Fuente Estado Red (px)', helper: 'Predeterminado 8' },
          sensor_solar_state: { label: 'Sensor Estado Solar', helper: 'Entidad sensor para el texto del estado solar (vinculado a data-role="solar-state"). Devuelve "Producing Power" o "Not Producing".' },
          solar_state_producing_color: { label: 'Color Solar Produciendo', helper: 'Color cuando el estado solar está produciendo.' },
          solar_state_not_producing_color: { label: 'Color Solar Sin Producción', helper: 'Color cuando el estado solar no está produciendo.' },
          solar_state_font_size: { label: 'Tamaño Fuente Estado Solar (px)', helper: 'Predeterminado 8' },
          sensor_solar_forecast_today: { label: 'Sensor Previsión Solar Hoy', helper: 'Entidad sensor para la previsión solar de hoy (vinculado a data-role="solar-forecast-today").' },
          sensor_solar_forecast_tomorrow: { label: 'Sensor Previsión Solar Mañana', helper: 'Entidad sensor para la previsión solar de mañana (vinculado a data-role="solar-forecast-tomorrow").' },
          sensor_weather_icon: { label: 'Sensor Icono Meteorológico', helper: 'Entidad sensor para el icono meteorológico (vinculado a data-role="weather-icon").' },
          weather_icon_color: { label: 'Color Icono Meteorológico', helper: 'Color aplicado al texto del icono meteorológico.' },
          weather_icon_font_size: { label: 'Tamaño Fuente Icono Meteorológico (px)', helper: 'Predeterminado 8' },
          sensor_weather_forecast: { label: 'Sensor Pronóstico Meteorológico', helper: 'Entidad sensor para el pronóstico meteorológico (vinculado a data-role="weather-forecast").' },
          weather_forecast_color: { label: 'Color Pronóstico Meteorológico', helper: 'Color aplicado al texto del pronóstico meteorológico.' },
          weather_forecast_font_size: { label: 'Tamaño Fuente Pronóstico Meteorológico (px)', helper: 'Predeterminado 8' },
          sun_moon_display: { label: 'Visualización Sol/Luna', helper: 'Muestra un sol o una luna que sigue el ciclo día/noche. Desactivado = oculto, Solo Sol = sol de día, Sol y Luna = sol de día, luna de noche.' },
          sun_moon_arc_color: { label: 'Color del Arco', helper: 'Color del trazo para el camino de arco sol/luna. Dejar en blanco para ninguno (invisible).' },
          sun_moon_arc_stroke_width: { label: 'Ancho del Trazo del Arco', helper: 'Ancho del trazo (px) para el camino de arco sol/luna.' },
          sun_moon_label_color: { label: 'Color de Etiqueta Amanecer/Atardecer', helper: 'Color para las etiquetas de hora de amanecer y atardecer. Dejar en blanco para usar el color del icono.' },
          sun_moon_label_font_size: { label: 'Tamaño de Fuente Etiqueta Amanecer/Atardecer', helper: 'Tamaño de fuente (px) para el texto de amanecer y atardecer. Dejar en blanco para el valor predeterminado.' },
          sun_moon_sunrise_label: { label: 'Texto Etiqueta Amanecer', helper: 'Texto personalizado para la etiqueta de amanecer. Dejar en blanco para usar el predeterminado SVG.' },
          sun_moon_sunset_label: { label: 'Texto Etiqueta Atardecer', helper: 'Texto personalizado para la etiqueta de atardecer. Dejar en blanco para usar el predeterminado SVG.' },
          stats_value_color: { label: 'Stats Value Color', helper: 'Color applied to all stat values.' },
          stats_value_font_size: { label: 'Stats Value Font Size (px)', helper: 'Font size for all stat values. Default 14' },
          stats_label_color: { label: 'Stats Label Color', helper: 'Color applied to all stat labels.' },
          stats_label_font_size: { label: 'Stats Label Font Size (px)', helper: 'Font size for all stat labels. Default 12' },
          inverter1_status_text_color: { label: 'Color Texto Estado Inversor', helper: 'Color aplicado al texto del estado del inversor (Cargando/Descargando/Importando/Exportando).' },
          inverter1_status_font_size: { label: 'Tamaño Fuente Estado Inversor (px)', helper: 'Tamaño de fuente para texto de estado del inversor. Predeterminado 8' },
          enable_echo_alive: { label: 'Habilitar Echo Alive', helper: 'Habilitars an invisible iframe to keep the Silk browser open on Echo Show. The button will be positioned in a corner of the card.' },
          pv_tot_color: { label: 'PV Total Color', helper: 'Colour applied to the PV TOTAL text line.' },
          pv_primary_color: { label: 'PV 1 Flow Color', helper: 'Colour used for the primary PV animation line.' },
          pv_secondary_color: { label: 'PV 2 Flow Color', helper: 'Colour used for the secondary PV animation line when available.' },
          load_flow_color: { label: 'Load Flow Color', helper: 'Colour applied to the home load animation line.' },
          load_text_color: { label: 'Load Color del texto', helper: 'Colour applied to the home load text when thresholds are inactive.' },
          house_total_color: { label: 'Casa Total Color', helper: 'Colour applied to the HOUSE TOT text/flow.' },
          inv1_color: { label: 'Inversor 1 to Casa Color', helper: 'Color applied to the flow from Inversor 1 to the house.' },
          inv2_color: { label: 'Inversor 2 to Casa Color', helper: 'Color applied to the flow from Inversor 2 to the house.' },
          load_threshold_warning: { label: 'Load Warning Umbral', helper: 'Change load color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          load_warning_color: { label: 'Load Warning Color', helper: 'Hex or CSS color applied at the load warning threshold.' },
          load_threshold_critical: { label: 'Load Critical Umbral', helper: 'Change load color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          load_critical_color: { label: 'Load Critical Color', helper: 'Hex or CSS color applied at the load critical threshold.' },
          battery_soc_color: { label: 'Batería SOC Color', helper: 'Hex color applied to the battery SOC percentage text.' },
          battery_charge_color: { label: 'Batería carga Flow Color', helper: 'Colour used when energy is flowing into the battery.' },
          battery_discharge_color: { label: 'Batería descarga Flow Color', helper: 'Colour used when energy is flowing from the battery.' },
          grid_import_color: { label: 'Inversor 1 Red Import Flow Color', helper: 'Base colour before thresholds when inverter 1 is importing from the grid.' },
          grid_export_color: { label: 'Inversor 1 Red Export Flow Color', helper: 'Base colour before thresholds when inverter 1 is exporting to the grid.' },
          grid2_import_color: { label: 'Inversor 2 Red Import Flow Color', helper: 'Base colour before thresholds when inverter 2 is importing from the grid.' },
          grid2_export_color: { label: 'Inversor 2 Red Export Flow Color', helper: 'Base colour before thresholds when inverter 2 is exporting to the grid.' },
          car_flow_color: { label: 'VE Flow Color', helper: 'Colour applied to the electric vehicle animation line.' },
          battery_fill_high_color: { label: 'Batería Fill (Normal) Color', helper: 'Liquid fill colour when the battery SOC is above the low threshold.' },
          battery_fill_low_color: { label: 'Batería Fill (Low) Color', helper: 'Liquid fill colour when the battery SOC is at or below the low threshold.' },
          battery_fill_low_threshold: { label: 'Batería Low Fill Umbral (%)', helper: 'Use the low fill colour when SOC is at or below this percentage.' },
          battery_fill_opacity: { label: 'Batería Fill Opacity', helper: 'Opacity for the battery fill level (0-1).' },
          grid_activity_threshold: { label: 'Red Animation Umbral (W)', helper: 'Ignore grid flows whose absolute value is below this wattage before animating.' },
          grid_power_only: { label: 'Red potencia Only', helper: 'Hide inverter/battery flows and show a direct grid-to-house flow.' },
          grid_threshold_warning: { label: 'Inversor 1 Red Warning Umbral', helper: 'Change inverter 1 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid_warning_color: { label: 'Inversor 1 Red Warning Color', helper: 'Hex or CSS color applied at the inverter 1 warning threshold.' },
          grid_threshold_critical: { label: 'Inversor 1 Red Critical Umbral', helper: 'Change inverter 1 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid_critical_color: { label: 'Inversor 1 Red Critical Color', helper: 'Hex or CSS color applied at the inverter 1 critical threshold.' },
          grid2_threshold_warning: { label: 'Inversor 2 Red Warning Umbral', helper: 'Change inverter 2 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid2_warning_color: { label: 'Inversor 2 Red Warning Color', helper: 'Hex or CSS color applied at the inverter 2 warning threshold.' },
          grid2_threshold_critical: { label: 'Inversor 2 Red Critical Umbral', helper: 'Change inverter 2 grid color when magnitude equals or exceeds this value. Uses the selected display unit.' },
          grid2_critical_color: { label: 'Inversor 2 Red Critical Color', helper: 'Hex or CSS color applied at the inverter 2 critical threshold.' },
          invert_grid: { label: 'Invert Red Values', helper: 'Habilitar if import/export polarity is reversed.' },
          invert_battery: { label: 'Invert Batería Values', helper: 'Habilitar if charge/discharge polarity is reversed.' },
          invert_bat1: { label: 'Invert Batería 1 Values', helper: 'Habilitar if Batería 1 charge/discharge polarity is reversed.' },
          invert_bat2: { label: 'Invert Batería 2 Values', helper: 'Habilitar if Batería 2 charge/discharge polarity is reversed.' },
          invert_bat3: { label: 'Invert Batería 3 Values', helper: 'Habilitar if Batería 3 charge/discharge polarity is reversed.' },
          sensor_car_power: { label: 'Coche 1 potencia sensor', helper: 'sensor for VE charge/discharge power.' },
          sensor_car_soc: { label: 'Coche 1 SOC sensor', helper: 'Estado de carga sensor for VE 1 (percentage).' },
          sensor_car_range: { label: 'Sensor Autonomía Coche 1', helper: 'Entidad sensor para la autonomía del VE 1 (vinculado a data-role="car1-range").' },
          sensor_car_state: { label: 'Sensor Estado de Carga Coche 1', helper: 'Entidad sensor para el texto del estado de carga del VE 1 (vinculado a data-role="car1-state").' },
          sensor_car_hvac_status: { label: 'Sensor Estado HVAC Coche 1', helper: 'Entidad sensor para el estado HVAC/climatización del VE 1 (vinculado a data-role="car1-hvac-status").' },
          sensor_car_outside_temp: { label: 'Sensor Temperatura Exterior Coche 1', helper: 'Entidad sensor para la temperatura exterior del VE 1 (vinculado a data-role="car1-outside-temp").' },
          sensor_car_inside_temp: { label: 'Sensor Temperatura Interior Coche 1', helper: 'Entidad sensor para la temperatura interior/habitáculo del VE 1 (vinculado a data-role="car1-inside-temp").' },
          sensor_car_ac_temp: { label: 'Sensor Temperatura Climatización Coche 1', helper: 'Entidad sensor para la temperatura de consigna de climatización del VE 1 (vinculado a data-role="car1-ac-temp").' },
          car1_climate_entity: { label: 'Entidad Climatización HVAC Coche 1', helper: 'Entidad climate para el control HVAC del VE 1 (solo dominio climate).' },
          car_soc: { label: 'Coche SOC', helper: 'sensor for VE battery SOC (percentage).' },
          car_charger_power: { label: 'Coche Charger potencia', helper: 'sensor for VE charger power.' },
          car1_label: { label: 'Coche 1 Etiqueta', helper: 'Text displayed next to the first VE values.' },
          sensor_car2_power: { label: 'Coche 2 potencia sensor', helper: 'sensor for VE 2 charge/discharge power.' },
          car2_power: { label: 'Coche 2 potencia', helper: 'sensor for VE 2 charge/discharge power.' },
          sensor_car2_soc: { label: 'Coche 2 SOC sensor', helper: 'Estado de carga sensor for VE 2 (percentage).' },
          sensor_car2_range: { label: 'Sensor Autonomía Coche 2', helper: 'Entidad sensor para la autonomía del VE 2 (vinculado a data-role="car2-range").' },
          sensor_car2_state: { label: 'Sensor Estado de Carga Coche 2', helper: 'Entidad sensor para el texto del estado de carga del VE 2 (vinculado a data-role="car2-state").' },
          sensor_car2_hvac_status: { label: 'Sensor Estado HVAC Coche 2', helper: 'Entidad sensor para el estado HVAC/climatización del VE 2 (vinculado a data-role="car2-hvac-status").' },
          sensor_car2_outside_temp: { label: 'Sensor Temperatura Exterior Coche 2', helper: 'Entidad sensor para la temperatura exterior del VE 2 (vinculado a data-role="car2-outside-temp").' },
          sensor_car2_inside_temp: { label: 'Sensor Temperatura Interior Coche 2', helper: 'Entidad sensor para la temperatura interior/habitáculo del VE 2 (vinculado a data-role="car2-inside-temp").' },
          sensor_car2_ac_temp: { label: 'Sensor Temperatura Climatización Coche 2', helper: 'Entidad sensor para la temperatura de consigna de climatización del VE 2 (vinculado a data-role="car2-ac-temp").' },
          car2_climate_entity: { label: 'Entidad Climatización HVAC Coche 2', helper: 'Entidad climate para el control HVAC del VE 2 (solo dominio climate).' },
          car2_soc: { label: 'Coche 2 SOC', helper: 'sensor for VE 2 battery SOC (percentage).' },
          car2_charger_power: { label: 'Coche 2 Charger potencia', helper: 'sensor for VE 2 charger power.' },
          car2_label: { label: 'Coche 2 Etiqueta', helper: 'Text displayed next to the second VE values.' },
          car_headlight_flash: { label: 'Headlight Flash While Charging', helper: 'Habilitar to flash the VE headlights whenever charging is detected.' },
          car1_glow_brightness: { label: 'Coche Glow Effect', helper: 'Percentage the car flow effects show while not charging.' },
          car2_glow_brightness: { label: 'Coche Glow Effect', helper: 'Percentage the car flow effects show while not charging.' },
          car_pct_color: { label: 'Coche SOC Color', helper: 'Hex color for VE SOC text (e.g., #00FFFF).' },
          car2_pct_color: { label: 'Coche 2 SOC Color', helper: 'Hex color for second VE SOC text (falls back to Coche SOC Color).' },
          car1_name_color: { label: 'Coche 1 Nombre Color', helper: 'Color applied to the Coche 1 name label.' },
          car2_name_color: { label: 'Coche 2 Nombre Color', helper: 'Color applied to the Coche 2 name label.' },
          car1_color: { label: 'Coche 1 Color', helper: 'Color applied to Coche 1 power value.' },
          car2_color: { label: 'Coche 2 Color', helper: 'Color applied to Coche 2 power value.' },
          heat_pump_label: { label: 'Heat Pump Etiqueta', helper: 'Custom label for the heat pump/AC line (defaults to "Heat Pump/AC").' },
          heat_pump_text_color: { label: 'Heat Pump Color del texto', helper: 'Color applied to the heat pump power text.' },
          pool_flow_color: { label: 'Pool Flow Color', helper: 'Color applied to the pool flow animation.' },
          pool_text_color: { label: 'Pool Color del texto', helper: 'Color applied to the pool power text.' },
          washing_machine_text_color: { label: 'Washing Machine Color del texto', helper: 'Color applied to the washing machine power text.' },
          dryer_text_color: { label: 'Dryer Color del texto', helper: 'Color applied to the dryer power text.' },
          refrigerator_text_color: { label: 'Refrigerator Color del texto', helper: 'Color applied to the refrigerator power text.' },
          freezer_text_color: { label: 'Congelador Color del texto', helper: 'Color applied to the freezer power text.' },
          windmill_flow_color: { label: 'Aerogenerador Flow Color', helper: 'Color applied to the windmill flow (data-flow-key="windmill-inverter1" / "windmill-inverter2").' },
          windmill_text_color: { label: 'Aerogenerador Color del texto', helper: 'Color aplicado al texto de potencia del aerogenerador.' },
          header_font_size: { label: 'Header Font Size (px)', helper: 'Predeterminado 8' },
          daily_label_font_size: { label: 'Diario Etiqueta Font Size (px)', helper: 'Predeterminado 8' },
          daily_value_font_size: { label: 'Diario Value Font Size (px)', helper: 'Predeterminado 20' },
          pv_font_size: { label: 'PV Text Font Size (px)', helper: 'Predeterminado 8' },
          windmill_power_font_size: { label: 'Aerogenerador potencia Font Size (px)', helper: 'Predeterminado 8' },
          battery_soc_font_size: { label: 'Batería SOC Font Size (px)', helper: 'Predeterminado 20' },
          battery_time_until_color: { label: 'Color Tiempo Restante Batería', helper: 'Color hex aplicado al texto del tiempo hasta carga/descarga completa.' },
          battery_time_until_font_size: { label: 'Tamaño Fuente Tiempo Restante (px)', helper: 'Predeterminado 8' },
          sensor_bat1_state: { label: 'Sensor Estado Batería 1', helper: 'Entidad sensor para el texto del estado de la batería 1 (vinculado a data-role="battery1-state").' },
          sensor_bat2_state: { label: 'Sensor Estado Batería 2', helper: 'Entidad sensor para el texto del estado de la batería 2 (vinculado a data-role="battery2-state").' },
          sensor_bat3_state: { label: 'Sensor Estado Batería 3', helper: 'Entidad sensor para el texto del estado de la batería 3 (vinculado a data-role="battery3-state").' },
          sensor_bat4_state: { label: 'Sensor Estado Batería 4', helper: 'Entidad sensor para el texto del estado de la batería 4 (vinculado a data-role="battery4-state").' },
          battery_state_fully_charged_color: { label: 'Batería: Color Carga Completa', helper: 'Color cuando el estado de la batería es Carga Completa.' },
          battery_state_charging_color: { label: 'Batería: Color Cargando', helper: 'Color cuando el estado de la batería es Cargando.' },
          battery_state_discharging_color: { label: 'Batería: Color Descargando', helper: 'Color cuando el estado de la batería es Descargando.' },
          battery_state_reserve_color: { label: 'Batería: Color Reserva', helper: 'Color cuando el estado de la batería es Reserva.' },
          battery_state_fully_discharged_color: { label: 'Batería: Color Totalmente Descargada', helper: 'Color cuando el estado de la batería es Totalmente Descargada.' },
          battery_state_font_size: { label: 'Tamaño Fuente Estado Batería (px)', helper: 'Predeterminado 8' },
          battery_power_font_size: { label: 'Batería potencia Font Size (px)', helper: 'Predeterminado 8' },
          inv1_datetime_color: { label: 'Color DateTime Inversor 1', helper: 'Color para la visualización datetime de batería Inversor 1' },
          inv1_datetime_font_size: { label: 'Tamaño Font DateTime Inversor 1 (px)', helper: 'Tamaño de fuente para datetime batería Inversor 1. Predeterminado 8' },
          inv1_timeuntil_color: { label: 'Color Tiempo Hasta Inversor 1', helper: 'Color para la visualización tiempo hasta de batería Inversor 1' },
          inv1_timeuntil_font_size: { label: 'Tamaño Font Tiempo Hasta Inversor 1 (px)', helper: 'Tamaño de fuente para tiempo hasta batería Inversor 1. Predeterminado 8' },
          inv2_datetime_color: { label: 'Color DateTime Inversor 2', helper: 'Color para la visualización datetime de batería Inversor 2' },
          inv2_datetime_font_size: { label: 'Tamaño Font DateTime Inversor 2 (px)', helper: 'Tamaño de fuente para datetime batería Inversor 2. Predeterminado 8' },
          inv2_timeuntil_color: { label: 'Color Tiempo Hasta Inversor 2', helper: 'Color para la visualización tiempo hasta de batería Inversor 2' },
          inv2_timeuntil_font_size: { label: 'Tamaño Font Tiempo Hasta Inversor 2 (px)', helper: 'Tamaño de fuente para tiempo hasta batería Inversor 2. Predeterminado 8' },
          load_font_size: { label: 'Load Font Size (px)', helper: 'Predeterminado 8' },
          inv1_power_font_size: { label: 'INV 1 potencia Font Size (px)', helper: 'Font size for the INV 1 power line. Predeterminado uses Load Font Size.' },
          inv2_power_font_size: { label: 'INV 2 potencia Font Size (px)', helper: 'Font size for the INV 2 power line. Predeterminado uses Load Font Size.' },
          heat_pump_font_size: { label: 'Heat Pump Font Size (px)', helper: 'Predeterminado 8' },
          pool_font_size: { label: 'Pool Font Size (px)', helper: 'Predeterminado 8' },
          washing_machine_font_size: { label: 'Washing Machine Font Size (px)', helper: 'Predeterminado 8' },
          dryer_font_size: { label: 'Dryer Font Size (px)', helper: 'Predeterminado 8' },
          refrigerator_font_size: { label: 'Refrigerator Font Size (px)', helper: 'Predeterminado 8' },
          freezer_font_size: { label: 'Freezer Font Size (px)', helper: 'Predeterminado 8' },
          grid_font_size: { label: 'Red Font Size (px)', helper: 'Predeterminado 8' },
          car_power_font_size: { label: 'Coche potencia Font Size (px)', helper: 'Predeterminado 8' },
          car2_power_font_size: { label: 'Coche 2 potencia Font Size (px)', helper: 'Predeterminado 8' },
          car_name_font_size: { label: 'Coche Nombre Font Size (px)', helper: 'Predeterminado 8' },
          car2_name_font_size: { label: 'Coche 2 Nombre Font Size (px)', helper: 'Predeterminado 8' },
          car_soc_font_size: { label: 'Coche SOC Font Size (px)', helper: 'Predeterminado 8' },
          car2_soc_font_size: { label: 'Coche 2 SOC Font Size (px)', helper: 'Predeterminado 8' },
          sensor_popup_pv_1: { label: 'PV Popup 1', helper: 'Entity for PV popup line 1.' },
          sensor_popup_pv_2: { label: 'PV Popup 2', helper: 'Entity for PV popup line 2.' },
          sensor_popup_pv_3: { label: 'PV Popup 3', helper: 'Entity for PV popup line 3.' },
          sensor_popup_pv_4: { label: 'PV Popup 4', helper: 'Entity for PV popup line 4.' },
          sensor_popup_pv_5: { label: 'PV Popup 5', helper: 'Entity for PV popup line 5.' },
          sensor_popup_pv_6: { label: 'PV Popup 6', helper: 'Entity for PV popup line 6.' },
          sensor_popup_pv_1_name: { label: 'PV Popup 1 Nombre', helper: 'Opcional custom name for PV popup line 1. Deja en blanco to use entity name.' },
          sensor_popup_pv_2_name: { label: 'PV Popup 2 Nombre', helper: 'Opcional custom name for PV popup line 2. Deja en blanco to use entity name.' },
          sensor_popup_pv_3_name: { label: 'PV Popup 3 Nombre', helper: 'Opcional custom name for PV popup line 3. Deja en blanco to use entity name.' },
          sensor_popup_pv_4_name: { label: 'PV Popup 4 Nombre', helper: 'Opcional custom name for PV popup line 4. Deja en blanco to use entity name.' },
          sensor_popup_pv_5_name: { label: 'PV Popup 5 Nombre', helper: 'Opcional custom name for PV popup line 5. Deja en blanco to use entity name.' },
          sensor_popup_pv_6_name: { label: 'PV Popup 6 Nombre', helper: 'Opcional custom name for PV popup line 6. Deja en blanco to use entity name.' },
          sensor_popup_pv_1_color: { label: 'PV Popup 1 Color', helper: 'Color for PV popup line 1 text.' },
          sensor_popup_pv_2_color: { label: 'PV Popup 2 Color', helper: 'Color for PV popup line 2 text.' },
          sensor_popup_pv_3_color: { label: 'PV Popup 3 Color', helper: 'Color for PV popup line 3 text.' },
          sensor_popup_pv_4_color: { label: 'PV Popup 4 Color', helper: 'Color for PV popup line 4 text.' },
          sensor_popup_pv_5_color: { label: 'PV Popup 5 Color', helper: 'Color for PV popup line 5 text.' },
          sensor_popup_pv_6_color: { label: 'PV Popup 6 Color', helper: 'Color for PV popup line 6 text.' },
          sensor_popup_pv_1_font_size: { label: 'PV Popup 1 Font Size (px)', helper: 'Font size for PV popup line 1. Predeterminado 8' },
          sensor_popup_pv_2_font_size: { label: 'PV Popup 2 Font Size (px)', helper: 'Font size for PV popup line 2. Predeterminado 8' },
          sensor_popup_pv_3_font_size: { label: 'PV Popup 3 Font Size (px)', helper: 'Font size for PV popup line 3. Predeterminado 8' },
          sensor_popup_pv_4_font_size: { label: 'PV Popup 4 Font Size (px)', helper: 'Font size for PV popup line 4. Predeterminado 8' },
          sensor_popup_pv_5_font_size: { label: 'PV Popup 5 Font Size (px)', helper: 'Font size for PV popup line 5. Predeterminado 8' },
          sensor_popup_pv_6_font_size: { label: 'PV Popup 6 Font Size (px)', helper: 'Font size for PV popup line 6. Predeterminado 8' },
          sensor_popup_house_1: { label: 'Casa Popup 1', helper: 'Entity for house popup line 1.' },
          sensor_popup_house_1_name: { label: 'Casa Popup 1 Nombre', helper: 'Opcional custom name for house popup line 1. Deja en blanco to use entity name.' },
          sensor_popup_house_1_color: { label: 'Casa Popup 1 Color', helper: 'Color for house popup line 1 text.' },
          sensor_popup_house_1_font_size: { label: 'Casa Popup 1 Font Size (px)', helper: 'Font size for house popup line 1. Predeterminado 8' },
          sensor_popup_house_2: { label: 'Casa Popup 2', helper: 'Entity for house popup line 2.' },
          sensor_popup_house_2_name: { label: 'Casa Popup 2 Nombre', helper: 'Opcional custom name for house popup line 2. Deja en blanco to use entity name.' },
          sensor_popup_house_2_color: { label: 'Casa Popup 2 Color', helper: 'Color for house popup line 2 text.' },
          sensor_popup_house_2_font_size: { label: 'Casa Popup 2 Font Size (px)', helper: 'Font size for house popup line 2. Predeterminado 8' },
          sensor_popup_house_3: { label: 'Casa Popup 3', helper: 'Entity for house popup line 3.' },
          sensor_popup_house_3_name: { label: 'Casa Popup 3 Nombre', helper: 'Opcional custom name for house popup line 3. Deja en blanco to use entity name.' },
          sensor_popup_house_3_color: { label: 'Casa Popup 3 Color', helper: 'Color for house popup line 3 text.' },
          sensor_popup_house_3_font_size: { label: 'Casa Popup 3 Font Size (px)', helper: 'Font size for house popup line 3. Predeterminado 8' },
          sensor_popup_house_4: { label: 'Casa Popup 4', helper: 'Entity for house popup line 4.' },
          sensor_popup_house_4_name: { label: 'Casa Popup 4 Nombre', helper: 'Opcional custom name for house popup line 4. Deja en blanco to use entity name.' },
          sensor_popup_house_4_color: { label: 'Casa Popup 4 Color', helper: 'Color for house popup line 4 text.' },
          sensor_popup_house_4_font_size: { label: 'Casa Popup 4 Font Size (px)', helper: 'Font size for house popup line 4. Predeterminado 8' },
          sensor_popup_house_5: { label: 'Casa Popup 5', helper: 'Entity for house popup line 5.' },
          sensor_popup_house_5_name: { label: 'Casa Popup 5 Nombre', helper: 'Opcional custom name for house popup line 5. Deja en blanco to use entity name.' },
          sensor_popup_house_5_color: { label: 'Casa Popup 5 Color', helper: 'Color for house popup line 5 text.' },
          sensor_popup_house_5_font_size: { label: 'Casa Popup 5 Font Size (px)', helper: 'Font size for house popup line 5. Predeterminado 8' },
          sensor_popup_house_6: { label: 'Casa Popup 6', helper: 'Entity for house popup line 6.' },
          sensor_popup_house_6_name: { label: 'Casa Popup 6 Nombre', helper: 'Opcional custom name for house popup line 6. Deja en blanco to use entity name.' },
          sensor_popup_house_6_color: { label: 'Casa Popup 6 Color', helper: 'Color for house popup line 6 text.' },
          sensor_popup_house_6_font_size: { label: 'Casa Popup 6 Font Size (px)', helper: 'Font size for house popup line 6. Predeterminado 8' },
          battery_popup_color: { label: 'Color texto popup batería', helper: 'Color global para todo el texto popup batería (fecha/hora, tiempo hasta y sensores personalizados). Predeterminado #00FFFF' },
          battery_popup_font_size: { label: 'Tamaño fuente popup batería (px)', helper: 'Tamaño fuente global para todo el texto popup batería. Predeterminado 16' },
          sensor_popup_bat_1: { label: 'Batería Popup 1', helper: 'Entity for battery popup line 1.' },
          sensor_popup_bat_1_name: { label: 'Batería Popup 1 Nombre', helper: 'Opcional custom name for battery popup line 1. Deja en blanco to use entity name.' },
          sensor_popup_bat_2: { label: 'Batería Popup 2', helper: 'Entity for battery popup line 2.' },
          sensor_popup_bat_2_name: { label: 'Batería Popup 2 Nombre', helper: 'Opcional custom name for battery popup line 2. Deja en blanco to use entity name.' },
          sensor_popup_bat_3: { label: 'Batería Popup 3', helper: 'Entity for battery popup line 3.' },
          sensor_popup_bat_3_name: { label: 'Batería Popup 3 Nombre', helper: 'Opcional custom name for battery popup line 3. Deja en blanco to use entity name.' },
          sensor_popup_bat_4: { label: 'Batería Popup 4', helper: 'Entity for battery popup line 4.' },
          sensor_popup_bat_4_name: { label: 'Batería Popup 4 Nombre', helper: 'Opcional custom name for battery popup line 4. Deja en blanco to use entity name.' },
          sensor_popup_bat_5: { label: 'Batería Popup 5', helper: 'Entity for battery popup line 5.' },
          sensor_popup_bat_5_name: { label: 'Batería Popup 5 Nombre', helper: 'Opcional custom name for battery popup line 5. Deja en blanco to use entity name.' },
          sensor_popup_bat_6: { label: 'Batería Popup 6', helper: 'Entity for battery popup line 6.' },
          sensor_popup_bat_6_name: { label: 'Batería Popup 6 Nombre', helper: 'Opcional custom name for battery popup line 6. Deja en blanco to use entity name.' },
          sensor_popup_grid_1: { label: 'Red Popup 1', helper: 'Entity for grid popup line 1.' },
          sensor_popup_grid_1_name: { label: 'Red Popup 1 Nombre', helper: 'Opcional custom name for grid popup line 1. Deja en blanco to use entity name.' },
          sensor_popup_grid_1_color: { label: 'Red Popup 1 Color', helper: 'Color for grid popup line 1 text.' },
          sensor_popup_grid_1_font_size: { label: 'Red Popup 1 Font Size (px)', helper: 'Font size for grid popup line 1. Predeterminado 8' },
          sensor_popup_grid_2: { label: 'Red Popup 2', helper: 'Entity for grid popup line 2.' },
          sensor_popup_grid_2_name: { label: 'Red Popup 2 Nombre', helper: 'Opcional custom name for grid popup line 2. Deja en blanco to use entity name.' },
          sensor_popup_grid_2_color: { label: 'Red Popup 2 Color', helper: 'Color for grid popup line 2 text.' },
          sensor_popup_grid_2_font_size: { label: 'Red Popup 2 Font Size (px)', helper: 'Font size for grid popup line 2. Predeterminado 8' },
          sensor_popup_grid_3: { label: 'Red Popup 3', helper: 'Entity for grid popup line 3.' },
          sensor_popup_grid_3_name: { label: 'Red Popup 3 Nombre', helper: 'Opcional custom name for grid popup line 3. Deja en blanco to use entity name.' },
          sensor_popup_grid_3_color: { label: 'Red Popup 3 Color', helper: 'Color for grid popup line 3 text.' },
          sensor_popup_grid_3_font_size: { label: 'Red Popup 3 Font Size (px)', helper: 'Font size for grid popup line 3. Predeterminado 8' },
          sensor_popup_grid_4: { label: 'Red Popup 4', helper: 'Entity for grid popup line 4.' },
          sensor_popup_grid_4_name: { label: 'Red Popup 4 Nombre', helper: 'Opcional custom name for grid popup line 4. Deja en blanco to use entity name.' },
          sensor_popup_grid_4_color: { label: 'Red Popup 4 Color', helper: 'Color for grid popup line 4 text.' },
          sensor_popup_grid_4_font_size: { label: 'Red Popup 4 Font Size (px)', helper: 'Font size for grid popup line 4. Predeterminado 8' },
          sensor_popup_grid_5: { label: 'Red Popup 5', helper: 'Entity for grid popup line 5.' },
          sensor_popup_grid_5_name: { label: 'Red Popup 5 Nombre', helper: 'Opcional custom name for grid popup line 5. Deja en blanco to use entity name.' },
          sensor_popup_grid_5_color: { label: 'Red Popup 5 Color', helper: 'Color for grid popup line 5 text.' },
          sensor_popup_grid_5_font_size: { label: 'Red Popup 5 Font Size (px)', helper: 'Font size for grid popup line 5. Predeterminado 8' },
          sensor_popup_grid_6: { label: 'Red Popup 6', helper: 'Entity for grid popup line 6.' },
          sensor_popup_grid_6_name: { label: 'Red Popup 6 Nombre', helper: 'Opcional custom name for grid popup line 6. Deja en blanco to use entity name.' },
          sensor_popup_grid_6_color: { label: 'Red Popup 6 Color', helper: 'Color for grid popup line 6 text.' },
          sensor_popup_grid_6_font_size: { label: 'Red Popup 6 Font Size (px)', helper: 'Font size for grid popup line 6. Predeterminado 8' },
          sensor_popup_inverter_1: { label: 'Inversor Popup 1', helper: 'Entity for inverter popup line 1.' },
          sensor_popup_inverter_1_name: { label: 'Inversor Popup 1 Nombre', helper: 'Opcional custom name for inverter popup line 1. Deja en blanco to use entity name.' },
          sensor_popup_inverter_1_color: { label: 'Inversor Popup 1 Color', helper: 'Color for inverter popup line 1 text.' },
          sensor_popup_inverter_1_font_size: { label: 'Inversor Popup 1 Font Size (px)', helper: 'Font size for inverter popup line 1. Predeterminado 8' },
          sensor_popup_inverter_2: { label: 'Inversor Popup 2', helper: 'Entity for inverter popup line 2.' },
          sensor_popup_inverter_2_name: { label: 'Inversor Popup 2 Nombre', helper: 'Opcional custom name for inverter popup line 2. Deja en blanco to use entity name.' },
          sensor_popup_inverter_2_color: { label: 'Inversor Popup 2 Color', helper: 'Color for inverter popup line 2 text.' },
          sensor_popup_inverter_2_font_size: { label: 'Inversor Popup 2 Font Size (px)', helper: 'Font size for inverter popup line 2. Predeterminado 8' },
          sensor_popup_inverter_3: { label: 'Inversor Popup 3', helper: 'Entity for inverter popup line 3.' },
          sensor_popup_inverter_3_name: { label: 'Inversor Popup 3 Nombre', helper: 'Opcional custom name for inverter popup line 3. Deja en blanco to use entity name.' },
          sensor_popup_inverter_3_color: { label: 'Inversor Popup 3 Color', helper: 'Color for inverter popup line 3 text.' },
          sensor_popup_inverter_3_font_size: { label: 'Inversor Popup 3 Font Size (px)', helper: 'Font size for inverter popup line 3. Predeterminado 8' },
          sensor_popup_inverter_4: { label: 'Inversor Popup 4', helper: 'Entity for inverter popup line 4.' },
          sensor_popup_inverter_4_name: { label: 'Inversor Popup 4 Nombre', helper: 'Opcional custom name for inverter popup line 4. Deja en blanco to use entity name.' },
          sensor_popup_inverter_4_color: { label: 'Inversor Popup 4 Color', helper: 'Color for inverter popup line 4 text.' },
          sensor_popup_inverter_4_font_size: { label: 'Inversor Popup 4 Font Size (px)', helper: 'Font size for inverter popup line 4. Predeterminado 8' },
          sensor_popup_inverter_5: { label: 'Inversor Popup 5', helper: 'Entity for inverter popup line 5.' },
          sensor_popup_inverter_5_name: { label: 'Inversor Popup 5 Nombre', helper: 'Opcional custom name for inverter popup line 5. Deja en blanco to use entity name.' },
          sensor_popup_inverter_5_color: { label: 'Inversor Popup 5 Color', helper: 'Color for inverter popup line 5 text.' },
          sensor_popup_inverter_5_font_size: { label: 'Inversor Popup 5 Font Size (px)', helper: 'Font size for inverter popup line 5. Predeterminado 8' },
          sensor_popup_inverter_6: { label: 'Inversor Popup 6', helper: 'Entity for inverter popup line 6.' },
          sensor_popup_inverter_6_name: { label: 'Inversor Popup 6 Nombre', helper: 'Opcional custom name for inverter popup line 6. Deja en blanco to use entity name.' },
          sensor_popup_inverter_6_color: { label: 'Inversor Popup 6 Color', helper: 'Color for inverter popup line 6 text.' },
          sensor_popup_inverter_6_font_size: { label: 'Inversor Popup 6 Font Size (px)', helper: 'Font size for inverter popup line 6. Predeterminado 8' }
        },
        options: {
          languages: [
            { value: 'en', label: 'Inglés' },
            { value: 'it', label: 'Italiano' },
            { value: 'de', label: 'Alemán' },
            { value: 'fr', label: 'Francés' },
            { value: 'nl', label: 'Neerlandés' },
            { value: 'es', label: 'Español' }
          ],
          display_units: [
            { value: 'W', label: 'Vatios (W)' },
            { value: 'kW', label: 'Kilovatios (kW)' }
          ],
          animation_styles: [
            { value: 'dashes', label: 'Guiones (predeterminado)' },
            { value: 'dashes_glow', label: 'Guiones + brillo' },
            { value: 'fluid_flow', label: 'Flujo fluido' },
            { value: 'dots', label: 'Puntos' },
            { value: 'arrows', label: 'Flechas' }
          ],
          initial_yes: 'Sí',
          initial_no: 'No',
          initial_inverters_1: '1',
          initial_inverters_2: '2',
          initial_batteries_1: '1',
          initial_batteries_2: '2',
          initial_batteries_3: '3',
          initial_batteries_4: '4',
          initial_evs_1: '1',
          initial_evs_2: '2'
        },
        view: {
          daily: 'PRODUCCIÓN DIARIA', pv_tot: 'PV TOTAL', car1: 'COCHE 1', car2: 'COCHE 2', importing: 'IMPORTANDO', exporting: 'EXPORTANDO', charging: 'CARGANDO', discharging: 'DESCARGANDO', standby: 'ESPERA'
        }
      }
    };
  }

  _currentLanguage() {
    const candidate = (this._config && this._config.language) || this._defaults.language || 'en';
    if (candidate && this._strings[candidate]) {
      return candidate;
    }
    return 'en';
  }

  _getLocaleStrings() {
    const lang = this._currentLanguage();
    const base = this._strings.en || {};
    const selected = this._strings[lang] || {};
    // Merge top-level sections, fields, and options so missing entries fall back to English
    const merged = {
      sections: { ...(base.sections || {}), ...(selected.sections || {}) },
      fields: { ...(base.fields || {}), ...(selected.fields || {}) },
      options: { ...(base.options || {}), ...(selected.options || {}) }
    };

    // Resolve profile-specific helper text: an entry may define
    // helperByProfile: { <profileId>: '...' } to override its default `helper`
    // when that profile's editor menu is active. A translation that omits
    // helperByProfile falls back to the English entry's, so adding the override
    // once to the `en` entry applies to all languages until translated.
    const profileId = this._getActiveProfileId();
    const resolveHelpers = (selectedGroup, baseGroup) => {
      Object.keys(selectedGroup).forEach((key) => {
        const entry = selectedGroup[key];
        const helperByProfile = (entry && entry.helperByProfile) || (baseGroup[key] && baseGroup[key].helperByProfile);
        const override = helperByProfile && helperByProfile[profileId];
        if (override) {
          selectedGroup[key] = { ...entry, helper: override };
        }
      });
    };
    resolveHelpers(merged.sections, base.sections || {});
    resolveHelpers(merged.fields, base.fields || {});

    return merged;
  }

  _createOptionDefs(localeStrings) {
    return {
      language: this._getAvailableLanguageOptions(localeStrings),
      display_unit: localeStrings.options.display_units,
      animation_style: localeStrings.options.animation_styles
    };
  }

  _getAvailableLanguageOptions(localeStrings) {
    const displayLang = this._currentLanguage();
    const keys = this._strings ? Object.keys(this._strings) : [];
    const codes = Array.from(new Set(keys)).filter(k => typeof k === 'string' && k.length === 2);

    const options = codes.map((lang) => {
      let label = null;
      // Fallback to built-in options block if available
      if (localeStrings && localeStrings.options && Array.isArray(localeStrings.options.languages)) {
        label = (localeStrings.options.languages.find((o) => o.value === lang) || {}).label;
      }
      return { value: lang, label: label || lang };
    });
    // Ensure English is always present and first
    const hasEn = options.find(o => o.value === 'en');
    if (!hasEn) options.unshift({ value: 'en', label: 'English' });
    else options.sort((a, b) => (a.value === 'en' ? -1 : (b.value === 'en' ? 1 : a.value.localeCompare(b.value))));
    return options;
  }

  _createSchemaDefs(localeStrings, optionDefs) {
    const entitySelector = { entity: {} };
    const climateEntitySelector = { entity: { domain: 'climate' } };
    const popupEntitySelector = { entity: {} };
    const fields = localeStrings.fields;
    const define = (entries) => entries.map((entry) => {
      const result = { ...entry };
      if (entry.name && this._defaults[entry.name] !== undefined && result.default === undefined) {
        result.default = this._defaults[entry.name];
      }
      return result;
    });
    const configWithDefaults = this._configWithDefaults();
    const displayUnitValue = (configWithDefaults.display_unit || 'kW').toUpperCase();
    const buildThresholdSelector = () => (
      displayUnitValue === 'KW'
        ? { number: { min: 0, max: 100, step: 0.05, unit_of_measurement: 'kW' } }
        : { number: { min: 0, max: 100000, step: 50, unit_of_measurement: 'W' } }
    );

    const profileId = this._getActiveProfileId();
    const profile = PROFILE_SCHEMAS[profileId] || PROFILE_SCHEMAS.tech;
    const profileSchema = profile.buildSchema({ define, fields, entitySelector, climateEntitySelector, popupEntitySelector, buildThresholdSelector });

    return {
      general: define([
        { name: 'background', label: fields.background.label, helper: fields.background.helper, selector: { text: { mode: 'blur' } }, default: '' },
        { name: 'day_night_mode', label: fields.night_mode.label, helper: fields.night_mode.helper, selector: { select: { options: [
          { value: 'day', label: 'Day' },
          { value: 'night', label: 'Night' },
          { value: 'auto', label: 'Auto' }
        ] } } },
        { name: 'language', label: fields.language.label, helper: fields.language.helper, selector: { select: { options: optionDefs.language } } },
        { name: 'display_unit', label: fields.display_unit.label, helper: fields.display_unit.helper, selector: { select: { options: optionDefs.display_unit } } },
        { name: 'update_interval', label: fields.update_interval.label, helper: fields.update_interval.helper, selector: { number: { min: 0, max: 60, step: 5, mode: 'slider', unit_of_measurement: 's' } } },
        { name: 'initial_configuration', label: fields.initial_configuration.label, helper: fields.initial_configuration.helper, selector: { boolean: {} }, default: true },
        { name: 'enable_echo_alive', label: (fields.enable_echo_alive && fields.enable_echo_alive.label) || 'Enable Echo Alive', helper: (fields.enable_echo_alive && fields.enable_echo_alive.helper) || 'Enables an invisible iframe to keep the Silk browser open on Echo Show.', selector: { boolean: {} }, default: false },
        { name: 'animation_speed_factor', label: fields.animation_speed_factor.label, helper: fields.animation_speed_factor.helper, selector: { number: { min: -3, max: 3, step: 0.25, mode: 'slider', unit_of_measurement: 'x' } } },
        { name: 'animation_style', label: fields.animation_style.label, helper: fields.animation_style.helper, selector: { select: { options: optionDefs.animation_style } } },
        { name: 'night_animation_style', label: fields.night_animation_style.label, helper: fields.night_animation_style.helper, selector: { select: { options: optionDefs.animation_style } } },
        { name: 'dashes_glow_intensity', label: fields.dashes_glow_intensity.label, helper: fields.dashes_glow_intensity.helper, selector: { number: { min: 0, max: 3, step: 0.1, mode: 'slider' } } },
        { name: 'flow_stroke_width', label: fields.flow_stroke_width.label, helper: fields.flow_stroke_width.helper, selector: { number: { min: 0.5, max: 30, step: 0.5, mode: 'slider', unit_of_measurement: 'px' } }, default: 3 },
        { name: 'fluid_flow_stroke_width', label: fields.fluid_flow_stroke_width.label, helper: fields.fluid_flow_stroke_width.helper, selector: { number: { min: 0.5, max: 30, step: 0.5, mode: 'slider', unit_of_measurement: 'px' } }, default: 4 },
        { name: 'arrow_scale', label: fields.arrow_scale.label, helper: fields.arrow_scale.helper, selector: { number: { min: 0.5, max: 5, step: 0.25, mode: 'slider', unit_of_measurement: 'x' } }, default: 1 },
        { type: 'divider' },
        { name: 'sun_moon_display', label: (fields.sun_moon_display && fields.sun_moon_display.label) || 'Sun/Moon Display', helper: (fields.sun_moon_display && fields.sun_moon_display.helper) || '', selector: { select: { options: [
          { value: 'off', label: 'Off' },
          { value: 'sun-only', label: 'Sun Only' },
          { value: 'sun-moon', label: 'Sun & Moon' }
        ] } }, default: 'off' },
        { name: 'sun_moon_arc_color', label: (fields.sun_moon_arc_color && fields.sun_moon_arc_color.label) || 'Arc Path Color', helper: (fields.sun_moon_arc_color && fields.sun_moon_arc_color.helper) || '', selector: { color_picker: {} } },
        { name: 'sun_moon_arc_stroke_width', label: (fields.sun_moon_arc_stroke_width && fields.sun_moon_arc_stroke_width.label) || 'Arc Path Stroke Width', helper: (fields.sun_moon_arc_stroke_width && fields.sun_moon_arc_stroke_width.helper) || '', selector: { number: { min: 0.5, max: 30, step: 0.5, mode: 'slider', unit_of_measurement: 'px' } } },
        { name: 'sun_moon_sunrise_label', label: (fields.sun_moon_sunrise_label && fields.sun_moon_sunrise_label.label) || 'Sunrise Label Text', helper: (fields.sun_moon_sunrise_label && fields.sun_moon_sunrise_label.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sun_moon_sunset_label', label: (fields.sun_moon_sunset_label && fields.sun_moon_sunset_label.label) || 'Sunset Label Text', helper: (fields.sun_moon_sunset_label && fields.sun_moon_sunset_label.helper) || '', selector: { text: { mode: 'blur' } } },
        { name: 'sun_moon_label_color', label: (fields.sun_moon_label_color && fields.sun_moon_label_color.label) || 'Sunrise/Sunset Label Color', helper: (fields.sun_moon_label_color && fields.sun_moon_label_color.helper) || '', selector: { color_picker: {} } },
        { name: 'sun_moon_label_font_size', label: (fields.sun_moon_label_font_size && fields.sun_moon_label_font_size.label) || 'Sunrise/Sunset Label Font Size', helper: (fields.sun_moon_label_font_size && fields.sun_moon_label_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
      ]),
      initialConfig: define([]),
      displayStyle: define([]),
      ...profileSchema
    };
  }

  _getActiveProfileId() {
    return this._activeProfileId || 'tech';
  }

  _createSectionDefs(localeStrings, schemaDefs) {
    const sections = localeStrings.sections;
    const profileId = this._getActiveProfileId();
    const profile = PROFILE_SCHEMAS[profileId] || PROFILE_SCHEMAS.tech;
    const result = [];
    if (this._pendingProfileBasis) {
      result.push({ id: 'profileBasis', title: 'Custom Background Detected', helper: 'This background image isn\'t one of the built-in layouts. Choose which built-in layout it\'s based on so the right settings menu is shown.', schema: null, defaultOpen: true, renderContent: () => this._createProfileBasisContent() });
    }
    result.push(
      { id: 'initialConfig', title: sections.initialConfig.title, helper: sections.initialConfig.helper, schema: null, defaultOpen: true, renderContent: () => this._createInitialConfigContent(localeStrings, schemaDefs) },
      ...profile.buildSections(this, sections, schemaDefs),
      { id: 'displayStyle', title: sections.displayStyle.title, helper: sections.displayStyle.helper, schema: schemaDefs.displayStyle, defaultOpen: false },
      { id: 'general', title: sections.general.title, helper: sections.general.helper, schema: schemaDefs.general, defaultOpen: false },
      { id: 'about', title: sections.about.title, helper: sections.about.helper, schema: null, defaultOpen: false, renderContent: () => this._createAboutContent() }
    );
    return result;
  }

  _configWithDefaults() {
    const merged = { ...this._defaults, ...this._config };

    const rawMode = merged.day_night_mode;
    const normalized = typeof rawMode === 'string' ? rawMode.trim().toLowerCase() : '';
    if (normalized !== 'day' && normalized !== 'night' && normalized !== 'auto') {
      if (typeof merged.night_mode === 'boolean') {
        merged.day_night_mode = merged.night_mode ? 'night' : 'day';
      } else {
        merged.day_night_mode = 'day';
      }
    }
    return merged;
  }

  setConfig(config) {
    let migrated = ConfigValidator._consolidateBackground(config);
    migrated = ConfigValidator._migrateBackgroundFilenames(migrated);
    const sanitized = stripLegacyCarVisibility(migrated);
    const normalized = ConfigValidator._initProfileStorage(sanitized);
    this._config = { ...normalized };
    this._rendered = false;
    this.render();
    this._resolveActiveProfile();

    // Persist any migrations (background consolidation, profile storage init, etc.)
    // back into the dashboard config.
    try {
      if (JSON.stringify(config) !== JSON.stringify(this._config)) {
        this.configChanged(this._config);
      }
    } catch (e) {
      // ignore
    }
  }

  get value() {
    return this._config;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._svgFilesFetched) {
      this._svgFilesFetched = true;
      this._fetchSvgManifest();
    }
    if (!this._config || this._rendered) {
      return;
    }
    this.render();
  }

  get _effectiveBaseUrl() {
    if (_CARD_BASE_URL) return _CARD_BASE_URL;
    const configPath = this._config && this._config.background;
    if (typeof configPath === 'string' && configPath.includes('/')) {
      return configPath.substring(0, configPath.lastIndexOf('/') + 1);
    }
    return '';
  }

  _svgProfileNameFromFilename(file) {
    const base = file.replace(/\.svg$/i, '');
    return base.split(/[-_]+/).filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  _normalizeSvgManifestEntry(entry) {
    if (typeof entry === 'string') {
      const file = entry.trim();
      if (!file.endsWith('.svg')) return null;
      return { file, profileName: this._svgProfileNameFromFilename(file), profileId: null };
    }
    if (entry && typeof entry === 'object' && typeof entry.file === 'string') {
      const file = entry.file.trim();
      if (!file.endsWith('.svg')) return null;
      const profileName = (typeof entry.profileName === 'string' && entry.profileName.trim())
        ? entry.profileName.trim()
        : this._svgProfileNameFromFilename(file);
      const profileId = (typeof entry.profileId === 'string' && entry.profileId.trim())
        ? entry.profileId.trim()
        : null;
      return { file, profileName, profileId };
    }
    return null;
  }

  _fetchSvgManifest() {
    // Built-in SVGs used as a fallback list when no svg-manifest.json is deployed
    const builtIn = [
      { file: 'tech.svg', profileName: 'Tech', profileId: 'tech' },
      { file: 'overview.svg', profileName: 'Overview', profileId: 'overview' },
    ];
    this._svgFiles = builtIn;

    // svg-manifest.json, if deployed alongside the card, is authoritative for the picker list
    const baseUrl = this._effectiveBaseUrl;
    if (!baseUrl) return;
    fetch(`${baseUrl}svg-manifest.json`)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then(entries => {
        if (!Array.isArray(entries)) return;
        const valid = entries.map(entry => this._normalizeSvgManifestEntry(entry)).filter(Boolean);
        if (valid.length > 0) {
          this._svgFiles = valid;
          if (this._rendered && !this._isEditing) {
            this._rendered = false;
            this.render();
          }
        }
      })
      .catch(() => {});
  }

  // Fetches and parses a background SVG to read its root data-profile-id attribute.
  // Results are cached by URL so a given background is only fetched once.
  fetchSvgProfileInfo(svgUrl) {
    if (!svgUrl) return Promise.resolve({ profileId: null });
    if (this._svgProfileInfoCache.has(svgUrl)) {
      return Promise.resolve(this._svgProfileInfoCache.get(svgUrl));
    }
    return fetch(svgUrl)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.text(); })
      .then(text => {
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        const root = doc.documentElement;
        const profileId = (root && root.getAttribute('data-profile-id')) || null;
        const info = { profileId };
        this._svgProfileInfoCache.set(svgUrl, info);
        return info;
      })
      .catch(() => {
        const info = { profileId: null };
        this._svgProfileInfoCache.set(svgUrl, info);
        return info;
      });
  }

  // Derives a stable id for a custom (non-built-in) background, used as a key into
  // _profile_basis when the SVG itself has no/unrecognized data-profile-id.
  _sanitizeBackgroundFilename(url) {
    const file = (typeof url === 'string' && url.includes('/')) ? url.split('/').pop() : (url || '');
    const base = file.replace(/\.svg$/i, '').trim();
    return `custom:${base.replace(/[^a-zA-Z0-9_-]/g, '_') || 'unknown'}`;
  }

  // Returns the set of profile-scoped field names (across all 15 sections) for the
  // given profile id, used to snapshot/restore/seed values on a profile switch.
  _getProfileFieldNames(profileId) {
    const profile = PROFILE_SCHEMAS[profileId] || PROFILE_SCHEMAS.tech;
    const ctx = {
      define: (entries) => entries,
      fields: new Proxy({}, { get: () => ({}) }),
      entitySelector: { entity: {} },
      climateEntitySelector: { entity: { domain: 'climate' } },
      popupEntitySelector: { entity: {} },
      buildThresholdSelector: () => ({ number: {} }),
    };
    const schema = profile.buildSchema(ctx);
    const names = new Set();
    Object.values(schema).forEach((fieldDefs) => {
      (fieldDefs || []).forEach((f) => { if (f && f.name) names.add(f.name); });
    });
    return names;
  }

  // Resolves which PROFILE_SCHEMAS entry should drive the editor menu for a given
  // background, by introspecting its data-profile-id.
  // Known built-in profiles are used directly; unrecognized/custom SVGs fall back
  // to a remembered _profile_basis choice, or prompt the user to pick one.
  // Returns { schemaProfileId, snapshotKey, pendingBasis }.
  _resolveProfileTarget(info, svgUrl) {
    const knownProfiles = this._svgFiles || [
      { file: 'tech.svg', profileName: 'Tech', profileId: 'tech' },
      { file: 'overview.svg', profileName: 'Overview', profileId: 'overview' },
    ];
    const knownIds = new Set(knownProfiles.map((f) => f.profileId).filter(Boolean));

    if (info.profileId && knownIds.has(info.profileId) && PROFILE_SCHEMAS[info.profileId]) {
      return { schemaProfileId: info.profileId, snapshotKey: info.profileId, pendingBasis: null };
    }

    const customId = info.profileId || this._sanitizeBackgroundFilename(svgUrl);
    const basis = (this._config && this._config._profile_basis) ? this._config._profile_basis[customId] : undefined;
    if (basis && PROFILE_SCHEMAS[basis]) {
      return { schemaProfileId: basis, snapshotKey: customId, pendingBasis: null };
    }
    return { schemaProfileId: 'tech', snapshotKey: customId, pendingBasis: customId };
  }

  // Moves profile-scoped values from one profile "slot" to another: snapshots the
  // outgoing profile's current top-level values into _profiles[fromSnapshotKey],
  // then populates top-level with the incoming profile's remembered snapshot
  // (_profiles[toSnapshotKey]) or, on first activation, SEED_DEFAULTS[toProfileId]
  // (keeping current values for any field shared between the two profiles).
  _switchProfileValues(fromProfileId, fromSnapshotKey, toProfileId, toSnapshotKey) {
    const config = { ...this._config };
    const profiles = { ...(config._profiles || {}) };

    if (fromProfileId === toProfileId && fromSnapshotKey === toSnapshotKey) {
      config._profiles = profiles;
      this._config = config;
      return;
    }

    const fromFields = this._getProfileFieldNames(fromProfileId);
    const toFields = this._getProfileFieldNames(toProfileId);

    const snapshot = {};
    fromFields.forEach((name) => {
      if (Object.prototype.hasOwnProperty.call(config, name)) {
        snapshot[name] = config[name];
      }
    });
    profiles[fromSnapshotKey] = snapshot;
    fromFields.forEach((name) => { delete config[name]; });

    let restoreSource = profiles[toSnapshotKey];
    if (!restoreSource) {
      restoreSource = { ...(SEED_DEFAULTS[toProfileId] || {}) };
      toFields.forEach((name) => {
        if (fromFields.has(name) && Object.prototype.hasOwnProperty.call(snapshot, name)) {
          restoreSource[name] = snapshot[name];
        }
      });
    }
    toFields.forEach((name) => {
      if (Object.prototype.hasOwnProperty.call(restoreSource, name)) {
        config[name] = restoreSource[name];
      }
    });

    config._profiles = profiles;
    this._config = config;
  }

  // Invoked when the user changes `background`. Saves the outgoing profile's values
  // into _profiles, then resolves the new background's profile and restores its
  // remembered snapshot or seeds it from SEED_DEFAULTS. Custom/unrecognized SVGs with
  // no remembered basis defer the value switch until the "based on" picker is answered.
  _handleBackgroundChange() {
    const newUrl = this._configWithDefaults().background;
    const fromProfileId = this._activeProfileId || 'tech';
    const fromSnapshotKey = this._activeSnapshotKey || fromProfileId;

    this.fetchSvgProfileInfo(newUrl).then((info) => {
      // Ignore stale results if the background changed again before this resolved.
      if (this._configWithDefaults().background !== newUrl) {
        return;
      }

      const target = this._resolveProfileTarget(info, newUrl);

      if (target.pendingBasis) {
        this._pendingSwitchFrom = { profileId: fromProfileId, snapshotKey: fromSnapshotKey };
      } else {
        this._switchProfileValues(fromProfileId, fromSnapshotKey, target.schemaProfileId, target.snapshotKey);
        this._pendingSwitchFrom = null;
      }

      this._activeProfileId = target.schemaProfileId;
      this._activeSnapshotKey = target.snapshotKey;
      this._pendingProfileBasis = target.pendingBasis;

      this._rendered = false;
      this.render();
      this._debouncedConfigChanged(this._config, true);
    });
  }

  // Resolves which PROFILE_SCHEMAS entry should drive the editor menu for the
  // currently selected background, by introspecting its data-profile-id. Unlike
  // _handleBackgroundChange, this never moves/seeds values - it only updates the
  // bookkeeping used to pick the menu, treating current top-level values as already
  // belonging to whichever profile is resolved.
  _resolveActiveProfile() {
    const background = this._configWithDefaults().background;
    this.fetchSvgProfileInfo(background).then((info) => {
      // Ignore stale results if the background changed again before this resolved.
      if (this._configWithDefaults().background !== background) {
        return;
      }

      const target = this._resolveProfileTarget(info, background);

      const changed = this._activeProfileId !== target.schemaProfileId
        || this._activeSnapshotKey !== target.snapshotKey
        || this._pendingProfileBasis !== target.pendingBasis;
      this._activeProfileId = target.schemaProfileId;
      this._activeSnapshotKey = target.snapshotKey;
      this._pendingProfileBasis = target.pendingBasis;
      if (changed && this._rendered && !this._isEditing) {
        this._rendered = false;
        this.render();
      }
    });
  }

  // Renders the "based on" picker shown when a custom background's layout family
  // hasn't been chosen yet. Selecting an option records it in _profile_basis so
  // re-selecting the same background later doesn't re-prompt.
  _createProfileBasisContent() {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '4px';

    const knownProfiles = (this._svgFiles || [
      { file: 'tech.svg', profileName: 'Tech', profileId: 'tech' },
      { file: 'overview.svg', profileName: 'Overview', profileId: 'overview' },
    ]).filter((f) => f.profileId && PROFILE_SCHEMAS[f.profileId]);

    const radioName = `profile-basis-${Math.random().toString(36).slice(2)}`;
    knownProfiles.forEach((profileEntry) => {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '8px';
      label.style.padding = '4px 0';
      label.style.cursor = 'pointer';
      label.style.color = 'var(--primary-text-color)';
      label.style.fontSize = '0.95em';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = radioName;
      radio.value = profileEntry.profileId;
      radio.style.accentColor = 'var(--primary-color)';
      radio.style.cursor = 'pointer';
      radio.addEventListener('change', () => {
        if (!radio.checked || !this._pendingProfileBasis) return;
        const customId = this._pendingProfileBasis;
        const chosenBasis = profileEntry.profileId;

        const from = this._pendingSwitchFrom || { profileId: chosenBasis, snapshotKey: customId };
        this._switchProfileValues(from.profileId, from.snapshotKey, chosenBasis, customId);

        const newConfig = { ...this._config };
        newConfig._profile_basis = { ...(newConfig._profile_basis || {}), [customId]: chosenBasis };
        this._config = newConfig;
        this._activeProfileId = chosenBasis;
        this._activeSnapshotKey = customId;
        this._pendingProfileBasis = null;
        this._pendingSwitchFrom = null;
        this._rendered = false;
        this.render();
        this._debouncedConfigChanged(newConfig, true);
      });
      label.appendChild(radio);

      const span = document.createElement('span');
      span.textContent = profileEntry.profileName;
      label.appendChild(span);

      container.appendChild(label);
    });

    return container;
  }

  configChanged(newConfig) {
    const event = new Event('config-changed', {
      bubbles: true,
      composed: true,
    });
    event.detail = { config: newConfig };
    this.dispatchEvent(event);
  }

  _debouncedConfigChanged(newConfig, immediate = false) {
    this._config = newConfig;
    if (this._configChangeTimer) {
      clearTimeout(this._configChangeTimer);
      this._configChangeTimer = null;
    }
    if (immediate) {
      this.configChanged(newConfig);
      return;
    }
    const delay = 800;
    this._configChangeTimer = setTimeout(() => {
      // If the user is still editing (focused inside the editor), defer the
      // config-changed event to prevent focus loss.
      if (this._isEditing) {
        this._pendingConfigChange = true;
        this._configChangeTimer = null;
        return;
      }
      this.configChanged(this._config);
      this._configChangeTimer = null;
    }, delay);
  }

  _createSection(sectionDef) {
    const { id, title, helper, schema, defaultOpen, renderContent } = sectionDef;
    const section = document.createElement('details');
    section.className = 'section';
    const storedState = id && Object.prototype.hasOwnProperty.call(this._sectionOpenState, id)
      ? this._sectionOpenState[id]
      : undefined;
    const isOpen = storedState !== undefined ? storedState : Boolean(defaultOpen);
    section.open = isOpen;
    if (id) {
      section.dataset.sectionId = id;
    }

    const summary = document.createElement('summary');
    summary.className = 'section-summary';
    summary.textContent = title;
    section.appendChild(summary);

    const content = document.createElement('div');
    content.className = 'section-content';

    if (helper) {
      const helperEl = document.createElement('div');
      helperEl.className = 'section-helper';
      helperEl.textContent = helper;
      content.appendChild(helperEl);
    }

    // Defer building the (potentially expensive) ha-form/custom content until the
    // section is first expanded, since most sections default to collapsed.
    let built = false;
    const buildBody = () => {
      if (built) return;
      built = true;
      if (Array.isArray(schema) && schema.length > 0) {
        content.appendChild(this._createForm(schema));
      } else if (typeof renderContent === 'function') {
        const custom = renderContent();
        if (custom) {
          content.appendChild(custom);
        }
      }
    };
    if (isOpen) {
      buildBody();
    }

    section.appendChild(content);
    section.addEventListener('toggle', () => {
      if (section.open) {
        buildBody();
      }
      if (id) {
        this._sectionOpenState = { ...this._sectionOpenState, [id]: section.open };
      }
    });
    return section;
  }

  _createAboutContent() {
    const container = document.createElement('div');
    container.className = 'about-content';

    const title = document.createElement('div');
    title.className = 'about-title';
    title.textContent = 'Advanced Energy Card';
    container.appendChild(title);

    const version = document.createElement('div');
    version.className = 'about-version';
    const cardClass = customElements.get('advanced-energy-card');
    version.textContent = `Version ${cardClass && cardClass.version ? cardClass.version : 'Unknown'}`;
    container.appendChild(version);

    const links = document.createElement('div');
    links.className = 'about-links';

    const repoLabel = document.createElement('span');
    repoLabel.className = 'about-label';
    repoLabel.textContent = 'Repository:';
    links.appendChild(repoLabel);

    const repoLink = document.createElement('a');
    repoLink.href = 'https://github.com/ratava/advanced-energy-card';
    repoLink.target = '_blank';
    repoLink.rel = 'noopener noreferrer';
    repoLink.textContent = 'Repository';
    links.appendChild(repoLink);

    const devs = document.createElement('div');
    devs.className = 'about-developers';

    const devLabel = document.createElement('span');
    devLabel.className = 'about-label';
    devLabel.textContent = 'Developers:';
    devs.appendChild(devLabel);

    const brentLink = document.createElement('a');
    brentLink.href = 'https://github.com/ratava';
    brentLink.target = '_blank';
    brentLink.rel = 'noopener noreferrer';
    brentLink.textContent = 'Brent Wesley';

    devs.appendChild(brentLink);

    container.appendChild(links);
    container.appendChild(devs);

    return container;
  }

  _createForm(schema) {
    const hasColorFields = schema.some(field => field.selector && field.selector.color_picker);
    // Force custom rendering when language is present so we can use a native dropdown
    const hasLanguageField = schema.some(field => field.name === 'language');
    const hasDividerField = schema.some(field => field.type === 'divider');
    
    if (hasColorFields || hasLanguageField || hasDividerField) {
      return this._createCustomForm(schema);
    }
    
    const form = document.createElement('ha-form');
    form.hass = this._hass;
    form.data = this._configWithDefaults(); // codeql[js/xss-through-dom] ha-form is HA's Lit form component; .data uses property bindings (auto-escaped), not innerHTML
    form.schema = schema;
    form.computeLabel = (field) => field.label || field.name;
    form.computeHelper = (field) => field.helper;
    form.addEventListener('value-changed', (ev) => {
      // Many HA controls bubble `value-changed` from an inner component.
      // Also, on clear (X), some components update `ha-form` data *after* the event.
      // Run once in a microtask and once on the next frame to read authoritative `form.data`.
      ev.stopPropagation();
      const raw = ev.detail ? ev.detail.value : undefined;
      const syntheticEv = { stopPropagation() {}, detail: { value: raw } };
      // Apply once synchronously so any immediate focusout commit uses the latest config.
      this._onFormValueChanged(syntheticEv, schema, form);
      queueMicrotask(() => {
        this._onFormValueChanged(syntheticEv, schema, form);
      });
      const schedule = typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (cb) => setTimeout(cb, 0);
      schedule(() => {
        this._onFormValueChanged(syntheticEv, schema, form);
      });
    });
    // Apply config immediately when any inner input loses focus
    form.addEventListener('focusout', (ev) => {
      // Ensure the event originated from inside this form
      if (!form.contains(ev.target)) return;
      const next = ev.relatedTarget;
      if (next && form.contains(next)) return;
      this._debouncedConfigChanged(this._config, true);
    });
    return form;
  }

  _createCustomForm(schema) {
    const container = document.createElement('div');
    container.className = 'custom-form';
    const data = this._configWithDefaults();

    schema.forEach(field => {
      if (field && field.type === 'divider') {
        container.appendChild(this._createDividerField());
      } else if (field.name === 'day_night_mode') {
        const value = (data[field.name] !== undefined && data[field.name] !== null) ? data[field.name] : field.default;
        container.appendChild(this._createDayNightModeField(field, value));
      } else if (field.selector && field.selector.color_picker) {
        const value = (data[field.name] !== undefined && data[field.name] !== null) ? data[field.name] : field.default;
        container.appendChild(this._createColorPickerField(field, value || ''));
      } else {
        const value = (data[field.name] !== undefined && data[field.name] !== null) ? data[field.name] : field.default;
        container.appendChild(this._createStandardField(field, value));
      }
    });

    return container;
  }

  _createDividerField() {
    const divider = document.createElement('div');
    divider.setAttribute('role', 'separator');
    divider.style.display = 'block';
    divider.style.width = '100%';
    divider.style.minWidth = '100%';
    divider.style.borderTop = '2px solid var(--divider-color, #ccc)';
    divider.style.height = '0';
    divider.style.margin = '1em 0';
    divider.style.boxShadow = 'none';
    divider.style.alignSelf = 'stretch';
    return divider;
  }

  
  _createColorPickerField(field, value) {
    const wrapper = document.createElement('div');
    wrapper.className = 'color-field-wrapper';

    const label = document.createElement('label');
    label.className = 'color-field-label';
    label.textContent = field.label || field.name;
    wrapper.appendChild(label);

    if (field.helper) {
      const helper = document.createElement('div');
      helper.className = 'color-field-helper';
      helper.textContent = field.helper;
      wrapper.appendChild(helper);
    }

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'color-input-wrapper';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = 'color-text-input';
    textInput.value = value || '';
    textInput.placeholder = '#RRGGBB or CSS color';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'color-picker-input';
    colorInput.value = this._normalizeColorForPicker(value);

    textInput.addEventListener('input', (e) => {
      const color = e.target.value;
      const normalized = this._normalizeColorForPicker(color);
      if (normalized) {
        colorInput.value = normalized;
      }
      this._updateFieldValue(field.name, color);
    });

    colorInput.addEventListener('input', (e) => {
      textInput.value = e.target.value;
      this._updateFieldValue(field.name, e.target.value);
    });

    // Commit only when leaving the whole color field (prevents focus loss when
    // switching between the swatch and the text input).
    wrapper.addEventListener('focusout', (ev) => {
      if (!wrapper.contains(ev.target)) return;
      const next = ev.relatedTarget;
      if (next && wrapper.contains(next)) return;
      this._debouncedConfigChanged(this._config, true);
    });

    inputWrapper.appendChild(colorInput);
    inputWrapper.appendChild(textInput);
    wrapper.appendChild(inputWrapper);

    return wrapper;
  }

  _createDayNightModeField(field, value) {
    const wrapper = document.createElement('div');
    wrapper.className = 'standard-field-wrapper';

    const label = document.createElement('label');
    label.textContent = field.label || field.name;
    wrapper.appendChild(label);

    if (field.helper) {
      const helper = document.createElement('div');
      helper.className = 'field-helper';
      helper.textContent = field.helper;
      wrapper.appendChild(helper);
    }

    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    const current = (normalized === 'day' || normalized === 'night' || normalized === 'auto') ? normalized : 'day';

    const group = document.createElement('div');
    group.className = 'radio-group';
    const groupName = 'advanced_day_night_mode';

    const options = [
      { value: 'day', label: 'Day' },
      { value: 'night', label: 'Night' },
      { value: 'auto', label: 'Auto' }
    ];

    options.forEach((opt) => {
      const optionLabel = document.createElement('label');
      optionLabel.className = 'radio-option';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = groupName;
      input.value = opt.value;
      input.checked = opt.value === current;

      const text = document.createElement('span');
      text.textContent = opt.label;

      input.addEventListener('change', () => {
        if (!input.checked) return;
        const newValue = input.value;
        const nextConfig = { ...(this._config || {}), day_night_mode: newValue };
        this._config = nextConfig;
        this._debouncedConfigChanged(nextConfig, true);
      });

      optionLabel.appendChild(input);
      optionLabel.appendChild(text);
      group.appendChild(optionLabel);
    });

    wrapper.appendChild(group);
    return wrapper;
  }

  _createRadioGroupField(field, value, options) {
    const wrapper = document.createElement('div');
    wrapper.className = 'standard-field-wrapper';

    const label = document.createElement('label');
    label.textContent = field.label || field.name;
    wrapper.appendChild(label);

    if (field.helper) {
      const helper = document.createElement('div');
      helper.className = 'field-helper';
      helper.textContent = field.helper;
      wrapper.appendChild(helper);
    }

    const current = value !== undefined && value !== null ? String(value) : '';
    const group = document.createElement('div');
    group.className = 'radio-group';
    const groupName = `advanced_${field.name}`;

    (options || []).forEach((opt) => {
      const optionLabel = document.createElement('label');
      optionLabel.className = 'radio-option';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = groupName;
      input.value = opt.value;
      input.checked = String(opt.value) === current;

      const text = document.createElement('span');
      text.textContent = opt.label;

      input.addEventListener('change', () => {
        if (!input.checked) return;
        this._updateFieldValue(field.name, input.value, true);
      });

      optionLabel.appendChild(input);
      optionLabel.appendChild(text);
      group.appendChild(optionLabel);
    });

    wrapper.appendChild(group);
    return wrapper;
  }

  _createInitialConfigContent(localeStrings, schemaDefs) {
    const container = document.createElement('div');
    container.className = 'custom-form';

    const fields = (localeStrings && localeStrings.fields) || {};
    const options = (localeStrings && localeStrings.options) || {};
    const data = this._configWithDefaults();

    const languageField = this._findFieldSchema(schemaDefs, 'language');
    if (languageField) {
      const value = data[languageField.name] !== undefined && data[languageField.name] !== null
        ? data[languageField.name]
        : languageField.default;
      container.appendChild(this._createStandardField(languageField, value));
    }

    const yesLabel = options.initial_yes || 'Yes';
    const noLabel = options.initial_no || 'No';
    const inverter1Label = options.initial_inverters_1 || '1';
    const inverter2Label = options.initial_inverters_2 || '2';
    const ev1Label = options.initial_evs_1 || '1';
    const ev2Label = options.initial_evs_2 || '2';

    const hasPvField = {
      name: 'initial_has_pv',
      label: (fields.initial_has_pv && fields.initial_has_pv.label) || 'Do you have Solar/PV Power?',
      helper: (fields.initial_has_pv && fields.initial_has_pv.helper) || ''
    };
    const hasPvValue = data.initial_has_pv !== undefined && data.initial_has_pv !== null ? String(data.initial_has_pv) : '';
    const hasBatteryValue = data.initial_has_battery !== undefined && data.initial_has_battery !== null
      ? String(data.initial_has_battery)
      : '';
    const batteryCountValue = data.initial_battery_count !== undefined && data.initial_battery_count !== null
      ? String(data.initial_battery_count)
      : '';
    container.appendChild(this._createRadioGroupField(hasPvField, hasPvValue, [
      { value: 'yes', label: yesLabel },
      { value: 'no', label: noLabel }
    ]));

    if (hasPvValue === 'yes') {
      const inverterField = {
        name: 'initial_inverters',
        label: (fields.initial_inverters && fields.initial_inverters.label) || 'How many inverters do you have?',
        helper: (fields.initial_inverters && fields.initial_inverters.helper) || ''
      };
      const inverterValue = data.initial_inverters !== undefined && data.initial_inverters !== null ? String(data.initial_inverters) : '';
      container.appendChild(this._createRadioGroupField(inverterField, inverterValue, [
        { value: '1', label: inverter1Label },
        { value: '2', label: inverter2Label }
      ]));

      const hasBatteryField = {
        name: 'initial_has_battery',
        label: (fields.initial_has_battery && fields.initial_has_battery.label) || 'Do you have Battery storage?',
        helper: (fields.initial_has_battery && fields.initial_has_battery.helper) || ''
      };
      container.appendChild(this._createRadioGroupField(hasBatteryField, hasBatteryValue, [
        { value: 'yes', label: yesLabel },
        { value: 'no', label: noLabel }
      ]));

      if (hasBatteryValue === 'yes') {
        const dualInverterHelper = (fields.initial_battery_dual_inverter_helper && fields.initial_battery_dual_inverter_helper.label)
          || 'As you have 2 Inverters selected, a minimum of 2 batteries is required. Batteries 1 and 2 will be allocated to Inverter 1 and Batteries 3 and 4 will be allocated to Inverter 2';
        const baseBatteryHelper = (fields.initial_battery_count && fields.initial_battery_count.helper) || '';
        const batteryHelper = inverterValue === '2'
          ? [baseBatteryHelper, dualInverterHelper].filter(Boolean).join(' ')
          : baseBatteryHelper;

        const batteryCountField = {
          name: 'initial_battery_count',
          label: (fields.initial_battery_count && fields.initial_battery_count.label) || 'How many Batteries do you have? Maximum 4',
          helper: batteryHelper
        };
        container.appendChild(this._createRadioGroupField(batteryCountField, batteryCountValue, [
          { value: '1', label: options.initial_batteries_1 || '1' },
          { value: '2', label: options.initial_batteries_2 || '2' },
          { value: '3', label: options.initial_batteries_3 || '3' },
          { value: '4', label: options.initial_batteries_4 || '4' }
        ]));
      }
    }

    const hasGridField = {
      name: 'initial_has_grid',
      label: (fields.initial_has_grid && fields.initial_has_grid.label) || 'Do you have Grid supplied electricity?',
      helper: (fields.initial_has_grid && fields.initial_has_grid.helper) || ''
    };
    const hasGridValue = data.initial_has_grid !== undefined && data.initial_has_grid !== null
      ? String(data.initial_has_grid)
      : '';
    let canExportValue = '';
    container.appendChild(this._createRadioGroupField(hasGridField, hasGridValue, [
      { value: 'yes', label: yesLabel },
      { value: 'no', label: noLabel }
    ]));

    if (hasGridValue === 'yes') {
      const canExportField = {
        name: 'initial_can_export',
        label: (fields.initial_can_export && fields.initial_can_export.label) || 'Can you export excess electricity to the grid?',
        helper: (fields.initial_can_export && fields.initial_can_export.helper) || ''
      };
      canExportValue = data.initial_can_export !== undefined && data.initial_can_export !== null
        ? String(data.initial_can_export)
        : '';
      container.appendChild(this._createRadioGroupField(canExportField, canExportValue, [
        { value: 'yes', label: yesLabel },
        { value: 'no', label: noLabel }
      ]));
    }

    const hasWindmillField = {
      name: 'initial_has_windmill',
      label: (fields.initial_has_windmill && fields.initial_has_windmill.label) || 'Do you have a Windmill?',
      helper: (fields.initial_has_windmill && fields.initial_has_windmill.helper) || ''
    };
    const hasWindmillValue = data.initial_has_windmill !== undefined && data.initial_has_windmill !== null
      ? String(data.initial_has_windmill)
      : '';
    container.appendChild(this._createRadioGroupField(hasWindmillField, hasWindmillValue, [
      { value: 'yes', label: yesLabel },
      { value: 'no', label: noLabel }
    ]));

    const hasEvField = {
      name: 'initial_has_ev',
      label: (fields.initial_has_ev && fields.initial_has_ev.label) || "Do you have Electric Vehicles/EV's?",
      helper: (fields.initial_has_ev && fields.initial_has_ev.helper) || ''
    };
    const hasEvValue = data.initial_has_ev !== undefined && data.initial_has_ev !== null
      ? String(data.initial_has_ev)
      : '';
    const evCountValue = data.initial_ev_count !== undefined && data.initial_ev_count !== null
      ? String(data.initial_ev_count)
      : '';
    container.appendChild(this._createRadioGroupField(hasEvField, hasEvValue, [
      { value: 'yes', label: yesLabel },
      { value: 'no', label: noLabel }
    ]));

    if (hasEvValue === 'yes') {
      const evCountField = {
        name: 'initial_ev_count',
        label: (fields.initial_ev_count && fields.initial_ev_count.label) || 'How many do you have?',
        helper: (fields.initial_ev_count && fields.initial_ev_count.helper) || ''
      };
      container.appendChild(this._createRadioGroupField(evCountField, evCountValue, [
        { value: '1', label: ev1Label },
        { value: '2', label: ev2Label }
      ]));
    }

    const inverterValue = data.initial_inverters !== undefined && data.initial_inverters !== null ? String(data.initial_inverters) : '';
    const itemsTitle = (fields.initial_config_items_title && fields.initial_config_items_title.label) || 'Required configuration items';
    const itemsHelper = (fields.initial_config_items_helper && fields.initial_config_items_helper.helper) || 'These items become relevant based on your answers above.';
    const emptyLabel = (fields.initial_config_items_empty && fields.initial_config_items_empty.label) || 'No items to show yet.';

    const itemsWrapper = document.createElement('div');
    itemsWrapper.className = 'standard-field-wrapper';

    const itemsLabel = document.createElement('label');
    itemsLabel.textContent = itemsTitle;
    itemsWrapper.appendChild(itemsLabel);

    if (itemsHelper) {
      const helper = document.createElement('div');
      helper.className = 'field-helper';
      helper.textContent = itemsHelper;
      itemsWrapper.appendChild(helper);
    }

    const itemsList = document.createElement('div');
    itemsList.className = 'initial-config-items';

    const items = this._getInitialConfigItems(localeStrings).filter((item) => {
      if (!item || typeof item.when !== 'function') {
        return true;
      }
      return item.when({ hasPvValue, inverterValue, hasBatteryValue, batteryCountValue, hasGridValue, canExportValue, hasWindmillValue, hasEvValue, evCountValue });
    });

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'initial-config-item empty';
      empty.textContent = emptyLabel;
      itemsList.appendChild(empty);
    } else {
      items.forEach((item) => {
        if (item && item.type === 'helper') {
          const row = document.createElement('div');
          row.className = 'initial-config-item helper';
          row.textContent = item.label || item.id || '';
          itemsList.appendChild(row);
          return;
        }

        const fieldSchema = this._findFieldSchema(schemaDefs, item && item.id ? item.id : '');
        if (fieldSchema) {
          const value = data[fieldSchema.name] !== undefined && data[fieldSchema.name] !== null
            ? data[fieldSchema.name]
            : fieldSchema.default;
          itemsList.appendChild(this._createStandardField(fieldSchema, value));
        } else {
          const row = document.createElement('div');
          row.className = 'initial-config-item';
          row.textContent = item.label || item.id || '';
          itemsList.appendChild(row);
        }
      });
    }

    itemsWrapper.appendChild(itemsList);

    const completionHelperText = (fields.initial_config_complete_helper && fields.initial_config_complete_helper.label)
      || 'This completes the last required minimum configuration. Once clicking on the Complete button, please review all menus to check for additional items and popup configurations. This initial configuration can be re-enabled in the General menu.';
    const completionButtonLabel = (fields.initial_config_complete_button && fields.initial_config_complete_button.label)
      || 'Complete';

    if (completionHelperText) {
      const completionHelper = document.createElement('div');
      completionHelper.className = 'field-helper';
      completionHelper.textContent = completionHelperText;
      itemsWrapper.appendChild(completionHelper);
    }

    const completeButton = document.createElement('button');
    completeButton.type = 'button';
    completeButton.className = 'initial-config-complete-button';
    completeButton.textContent = completionButtonLabel;
    completeButton.addEventListener('click', () => {
      this._updateFieldValue('initial_configuration', false, true);
    });
    itemsWrapper.appendChild(completeButton);
    container.appendChild(itemsWrapper);

    return container;
  }

  _findFieldSchema(schemaDefs, fieldName) {
    if (!schemaDefs || !fieldName) {
      return null;
    }
    const groups = Object.values(schemaDefs).filter((group) => Array.isArray(group));
    for (let i = 0; i < groups.length; i += 1) {
      const match = groups[i].find((field) => field && field.name === fieldName);
      if (match) {
        return match;
      }
    }
    return null;
  }

  _getInitialConfigItems(localeStrings) {
    const fields = (localeStrings && localeStrings.fields) || {};

    const helperText = (fields.array_helper_text && fields.array_helper_text.label) || 'Each Array must have at minimum a combined Solar/PV total sensor which is the total power output of that Array or individual string values which are added together to get the total power output of the array. Daily production can be supplied and can be shown in a Daily production card.';

    const array1Items = [
      { id: 'array1_helper', type: 'helper', label: helperText },
      { id: 'sensor_pv_total', label: (fields.sensor_pv_total && fields.sensor_pv_total.label) || 'PV Total Sensor' },
      { id: 'sensor_pv1', label: (fields.sensor_pv1 && fields.sensor_pv1.label) || 'PV String 1 (Array 1)' },
      { id: 'sensor_pv2', label: (fields.sensor_pv2 && fields.sensor_pv2.label) || 'PV String 2 (Array 1)' },
      { id: 'sensor_pv3', label: (fields.sensor_pv3 && fields.sensor_pv3.label) || 'PV String 3 (Array 1)' },
      { id: 'sensor_pv4', label: (fields.sensor_pv4 && fields.sensor_pv4.label) || 'PV String 4 (Array 1)' },
      { id: 'sensor_pv5', label: (fields.sensor_pv5 && fields.sensor_pv5.label) || 'PV String 5 (Array 1)' },
      { id: 'sensor_pv6', label: (fields.sensor_pv6 && fields.sensor_pv6.label) || 'PV String 6 (Array 1)' },
      { id: 'sensor_daily', label: (fields.sensor_daily && fields.sensor_daily.label) || 'Daily Production Sensor' }
    ];

    const array2Items = [
      { id: 'array2_helper', type: 'helper', label: helperText },
      { id: 'sensor_pv_total_secondary', label: (fields.sensor_pv_total_secondary && fields.sensor_pv_total_secondary.label) || 'PV Total Sensor (Inverter 2)' },
      { id: 'sensor_pv_array2_1', label: (fields.sensor_pv_array2_1 && fields.sensor_pv_array2_1.label) || 'PV String 1 (Array 2)' },
      { id: 'sensor_pv_array2_2', label: (fields.sensor_pv_array2_2 && fields.sensor_pv_array2_2.label) || 'PV String 2 (Array 2)' },
      { id: 'sensor_pv_array2_3', label: (fields.sensor_pv_array2_3 && fields.sensor_pv_array2_3.label) || 'PV String 3 (Array 2)' },
      { id: 'sensor_pv_array2_4', label: (fields.sensor_pv_array2_4 && fields.sensor_pv_array2_4.label) || 'PV String 4 (Array 2)' },
      { id: 'sensor_pv_array2_5', label: (fields.sensor_pv_array2_5 && fields.sensor_pv_array2_5.label) || 'PV String 5 (Array 2)' },
      { id: 'sensor_pv_array2_6', label: (fields.sensor_pv_array2_6 && fields.sensor_pv_array2_6.label) || 'PV String 6 (Array 2)' },
      { id: 'sensor_daily_array2', label: (fields.sensor_daily_array2 && fields.sensor_daily_array2.label) || 'Daily Production Sensor (Array 2)' }
    ];

    const batteryItems = [
      { id: 'sensor_bat1_soc', label: (fields.sensor_bat1_soc && fields.sensor_bat1_soc.label) || 'Battery 1 SOC' },
      { id: 'sensor_bat1_power', label: (fields.sensor_bat1_power && fields.sensor_bat1_power.label) || 'Battery 1 Power' },
      { id: 'sensor_bat1_charge_power', label: (fields.sensor_bat1_charge_power && fields.sensor_bat1_charge_power.label) || 'Battery 1 Charge Power' },
      { id: 'sensor_bat1_discharge_power', label: (fields.sensor_bat1_discharge_power && fields.sensor_bat1_discharge_power.label) || 'Battery 1 Discharge Power' },
      { id: 'sensor_bat2_soc', label: (fields.sensor_bat2_soc && fields.sensor_bat2_soc.label) || 'Battery 2 SOC' },
      { id: 'sensor_bat2_power', label: (fields.sensor_bat2_power && fields.sensor_bat2_power.label) || 'Battery 2 Power' },
      { id: 'sensor_bat2_charge_power', label: (fields.sensor_bat2_charge_power && fields.sensor_bat2_charge_power.label) || 'Battery 2 Charge Power' },
      { id: 'sensor_bat2_discharge_power', label: (fields.sensor_bat2_discharge_power && fields.sensor_bat2_discharge_power.label) || 'Battery 2 Discharge Power' },
      { id: 'sensor_bat3_soc', label: (fields.sensor_bat3_soc && fields.sensor_bat3_soc.label) || 'Battery 3 SOC' },
      { id: 'sensor_bat3_power', label: (fields.sensor_bat3_power && fields.sensor_bat3_power.label) || 'Battery 3 Power' },
      { id: 'sensor_bat3_charge_power', label: (fields.sensor_bat3_charge_power && fields.sensor_bat3_charge_power.label) || 'Battery 3 Charge Power' },
      { id: 'sensor_bat3_discharge_power', label: (fields.sensor_bat3_discharge_power && fields.sensor_bat3_discharge_power.label) || 'Battery 3 Discharge Power' },
      { id: 'sensor_bat4_soc', label: (fields.sensor_bat4_soc && fields.sensor_bat4_soc.label) || 'Battery 4 SOC' },
      { id: 'sensor_bat4_power', label: (fields.sensor_bat4_power && fields.sensor_bat4_power.label) || 'Battery 4 Power' },
      { id: 'sensor_bat4_charge_power', label: (fields.sensor_bat4_charge_power && fields.sensor_bat4_charge_power.label) || 'Battery 4 Charge Power' },
      { id: 'sensor_bat4_discharge_power', label: (fields.sensor_bat4_discharge_power && fields.sensor_bat4_discharge_power.label) || 'Battery 4 Discharge Power' },
      { id: 'sensor_bat1_time_until', label: (fields.sensor_bat1_time_until && fields.sensor_bat1_time_until.label) || 'Battery 1 Time Until Sensor' },
      { id: 'sensor_bat2_time_until', label: (fields.sensor_bat2_time_until && fields.sensor_bat2_time_until.label) || 'Battery 2 Time Until Sensor' },
      { id: 'sensor_bat3_time_until', label: (fields.sensor_bat3_time_until && fields.sensor_bat3_time_until.label) || 'Battery 3 Time Until Sensor' },
      { id: 'sensor_bat4_time_until', label: (fields.sensor_bat4_time_until && fields.sensor_bat4_time_until.label) || 'Battery 4 Time Until Sensor' },
      { id: 'sensor_bat1_state', label: (fields.sensor_bat1_state && fields.sensor_bat1_state.label) || 'Battery 1 State Sensor' },
      { id: 'sensor_bat2_state', label: (fields.sensor_bat2_state && fields.sensor_bat2_state.label) || 'Battery 2 State Sensor' },
      { id: 'sensor_bat3_state', label: (fields.sensor_bat3_state && fields.sensor_bat3_state.label) || 'Battery 3 State Sensor' },
      { id: 'sensor_bat4_state', label: (fields.sensor_bat4_state && fields.sensor_bat4_state.label) || 'Battery 4 State Sensor' }
    ];

    const gridItems = [
      { id: 'sensor_grid_power', label: (fields.sensor_grid_power && fields.sensor_grid_power.label) || 'Grid Inverter 1 Power' },
      { id: 'sensor_grid_import', label: (fields.sensor_grid_import && fields.sensor_grid_import.label) || 'Grid Inverter 1 Import Sensor' },
      { id: 'sensor_grid_export', label: (fields.sensor_grid_export && fields.sensor_grid_export.label) || 'Grid Inverter 1 Export Sensor' },
      { id: 'sensor_grid_import_daily', label: (fields.sensor_grid_import_daily && fields.sensor_grid_import_daily.label) || 'Daily Grid Inverter 1 Import Sensor' },
      { id: 'sensor_grid_export_daily', label: (fields.sensor_grid_export_daily && fields.sensor_grid_export_daily.label) || 'Daily Grid Inverter 1 Export Sensor' },
      { id: 'sensor_grid_state', label: (fields.sensor_grid_state && fields.sensor_grid_state.label) || 'Grid State Sensor' }
    ];

    const grid2Items = [
      { id: 'sensor_grid2_power', label: (fields.sensor_grid2_power && fields.sensor_grid2_power.label) || 'Grid Inverter 2 Power' },
      { id: 'sensor_grid2_import', label: (fields.sensor_grid2_import && fields.sensor_grid2_import.label) || 'Grid Inverter 2 Import Sensor' },
      { id: 'sensor_grid2_export', label: (fields.sensor_grid2_export && fields.sensor_grid2_export.label) || 'Grid Inverter 2 Export Sensor' },
      { id: 'sensor_grid2_import_daily', label: (fields.sensor_grid2_import_daily && fields.sensor_grid2_import_daily.label) || 'Daily Grid Inverter 2 Import Sensor' },
      { id: 'sensor_grid2_export_daily', label: (fields.sensor_grid2_export_daily && fields.sensor_grid2_export_daily.label) || 'Daily Grid Inverter 2 Export Sensor' }
    ];

    const windmillItems = [
      { id: 'sensor_windmill_total', label: (fields.sensor_windmill_total && fields.sensor_windmill_total.label) || 'Windmill Total' },
      { id: 'sensor_windmill_daily', label: (fields.sensor_windmill_daily && fields.sensor_windmill_daily.label) || 'Daily Windmill Production' }
    ];

    const evItems = [
      { id: 'sensor_car_power', label: (fields.sensor_car_power && fields.sensor_car_power.label) || 'Car 1 Power' },
      { id: 'sensor_car_soc', label: (fields.sensor_car_soc && fields.sensor_car_soc.label) || 'Car 1 SOC' },
      { id: 'sensor_car_range', label: (fields.sensor_car_range && fields.sensor_car_range.label) || 'Car 1 Range Sensor' },
      { id: 'sensor_car_state', label: (fields.sensor_car_state && fields.sensor_car_state.label) || 'Car 1 Charging State Sensor' },
      { id: 'sensor_car_hvac_status', label: (fields.sensor_car_hvac_status && fields.sensor_car_hvac_status.label) || 'Car 1 HVAC Status Sensor' },
      { id: 'sensor_car_outside_temp', label: (fields.sensor_car_outside_temp && fields.sensor_car_outside_temp.label) || 'Car 1 Outside Temperature Sensor' },
      { id: 'sensor_car_inside_temp', label: (fields.sensor_car_inside_temp && fields.sensor_car_inside_temp.label) || 'Car 1 Inside Temperature Sensor' },
      { id: 'sensor_car_ac_temp', label: (fields.sensor_car_ac_temp && fields.sensor_car_ac_temp.label) || 'Car 1 AC Temperature Sensor' },
      { id: 'car1_climate_entity', label: (fields.car1_climate_entity && fields.car1_climate_entity.label) || 'Car 1 HVAC Climate Entity' },
      { id: 'car1_label', label: (fields.car1_label && fields.car1_label.label) || 'Car 1 Label' },
      { id: 'sensor_car2_power', label: (fields.sensor_car2_power && fields.sensor_car2_power.label) || 'Car 2 Power' },
      { id: 'sensor_car2_soc', label: (fields.sensor_car2_soc && fields.sensor_car2_soc.label) || 'Car 2 SOC' },
      { id: 'sensor_car2_range', label: (fields.sensor_car2_range && fields.sensor_car2_range.label) || 'Car 2 Range Sensor' },
      { id: 'sensor_car2_state', label: (fields.sensor_car2_state && fields.sensor_car2_state.label) || 'Car 2 Charging State Sensor' },
      { id: 'sensor_car2_hvac_status', label: (fields.sensor_car2_hvac_status && fields.sensor_car2_hvac_status.label) || 'Car 2 HVAC Status Sensor' },
      { id: 'sensor_car2_outside_temp', label: (fields.sensor_car2_outside_temp && fields.sensor_car2_outside_temp.label) || 'Car 2 Outside Temperature Sensor' },
      { id: 'sensor_car2_inside_temp', label: (fields.sensor_car2_inside_temp && fields.sensor_car2_inside_temp.label) || 'Car 2 Inside Temperature Sensor' },
      { id: 'sensor_car2_ac_temp', label: (fields.sensor_car2_ac_temp && fields.sensor_car2_ac_temp.label) || 'Car 2 AC Temperature Sensor' },
      { id: 'car2_climate_entity', label: (fields.car2_climate_entity && fields.car2_climate_entity.label) || 'Car 2 HVAC Climate Entity' },
      { id: 'car2_label', label: (fields.car2_label && fields.car2_label.label) || 'Car 2 Label' }
    ];

    const homeLoadItems = [
      { id: 'sensor_home_load', label: (fields.sensor_home_load && fields.sensor_home_load.label) || 'Home Load/Consumption (Required)' },
      { id: 'sensor_home_load_secondary', label: (fields.sensor_home_load_secondary && fields.sensor_home_load_secondary.label) || 'Home Load (Inverter 2)' }
    ];

    const batteryWhen = (minCount) => ({ hasBatteryValue, batteryCountValue }) => {
      if (hasBatteryValue !== 'yes') return false;
      const count = Number(batteryCountValue || 0);
      return Number.isFinite(count) && count >= minCount;
    };

    return [
      ...array1Items.map((item) => ({
        ...item,
        when: ({ hasPvValue, inverterValue }) => hasPvValue === 'yes' && (inverterValue === '1' || inverterValue === '2')
      })),
      ...array2Items.map((item) => ({
        ...item,
        when: ({ hasPvValue, inverterValue }) => hasPvValue === 'yes' && inverterValue === '2'
      })),
      ...batteryItems.map((item) => {
        let minCount = 1;
        if (item.id && item.id.startsWith('sensor_bat2_')) minCount = 2;
        if (item.id && item.id.startsWith('sensor_bat3_')) minCount = 3;
        if (item.id && item.id.startsWith('sensor_bat4_')) minCount = 4;
        return {
          ...item,
          when: batteryWhen(minCount)
        };
      }),
      ...gridItems.map((item) => ({
        ...item,
        when: ({ hasGridValue, inverterValue, canExportValue }) => {
          if (hasGridValue !== 'yes') return false;
          if (!(inverterValue === '1' || inverterValue === '2')) return false;
          if (item.id && item.id.includes('export') && canExportValue === 'no') return false;
          return true;
        }
      })),
      ...grid2Items.map((item) => ({
        ...item,
        when: ({ hasGridValue, inverterValue, canExportValue }) => {
          if (hasGridValue !== 'yes') return false;
          if (inverterValue !== '2') return false;
          if (item.id && item.id.includes('export') && canExportValue === 'no') return false;
          return true;
        }
      })),
      ...windmillItems.map((item) => ({
        ...item,
        when: ({ hasWindmillValue }) => hasWindmillValue === 'yes'
      })),
      ...evItems.map((item) => {
        let minCount = 1;
        if (item.id && (item.id.includes('car2') || item.id.startsWith('sensor_car2_'))) {
          minCount = 2;
        }
        return {
          ...item,
          when: ({ hasEvValue, evCountValue }) => {
            if (hasEvValue !== 'yes') return false;
            const count = Number(evCountValue || 0);
            return Number.isFinite(count) && count >= minCount;
          }
        };
      }),
      ...homeLoadItems.map((item) => ({
        ...item,
        when: ({ inverterValue }) => {
          if (item.id === 'sensor_home_load') return true;
          return inverterValue === '2';
        }
      }))
    ];
  }

  _createStandardField(field, value) {
    const wrapper = document.createElement('div');
    wrapper.className = 'standard-field-wrapper';

    const label = document.createElement('label');
    label.textContent = field.label || field.name;
    wrapper.appendChild(label);

    if (field.helper) {
      const helper = document.createElement('div');
      helper.className = 'field-helper';
      helper.textContent = field.helper;
      wrapper.appendChild(helper);
    }

    const form = document.createElement('ha-form');
    form.hass = this._hass;
    // ha-selector-number throws on a `null` value (HA core bug), so treat
    // `null` (our "no threshold set" sentinel) as "unset" here.
    const formValue = (field.selector && field.selector.number && value === null) ? undefined : value;
    form.data = { [field.name]: formValue };
    form.schema = [field];
    form.computeLabel = () => '';
    form.computeHelper = () => '';
    form.addEventListener('value-changed', (ev) => {
      if (ev.target !== form) {
        return;
      }
      const newValue = ev.detail.value[field.name];
      const isEntitySelector = Boolean(field.selector && field.selector.entity);
      this._updateFieldValue(field.name, newValue, isEntitySelector);
    });
    // When an inner input loses focus, apply the config immediately
    form.addEventListener('focusout', (ev) => {
      if (!form.contains(ev.target)) return;
      const next = ev.relatedTarget;
      if (next && form.contains(next)) return;
      this._debouncedConfigChanged(this._config, true);
    });

    // Render the language field as a native dropdown to support very long lists
    if (field.name === 'language') {
      const select = document.createElement('select');
      select.style.padding = '8px';
      select.style.border = '1px solid var(--divider-color)';
      select.style.borderRadius = '4px';
      select.style.background = 'var(--card-background-color)';
      select.style.color = 'var(--primary-text-color)';
      const localeStrings = this._getLocaleStrings();
      const opts = this._getAvailableLanguageOptions(localeStrings);
      opts.forEach((o) => {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.label || o.value;
        select.appendChild(opt);
      });
      select.value = value || (this._defaults && this._defaults.language) || 'en';
      select.addEventListener('change', (e) => {
        this._updateFieldValue(field.name, e.target.value);
        this._debouncedConfigChanged(this._config, true);
      });
      select.addEventListener('blur', () => this._debouncedConfigChanged(this._config, true));
      wrapper.appendChild(select);
    } else if (field.name === 'background' && this._svgFiles && this._svgFiles.length > 0) {
      wrapper.appendChild(this._createSvgPickerField(field, value));
    } else {
      wrapper.appendChild(form);
    }
    return wrapper;
  }

  _createSvgPickerField(field, value) {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '4px';

    const baseUrl = this._effectiveBaseUrl;
    const files = this._svgFiles || [];
    const radioName = `svg-picker-${field.name}-${Math.random().toString(36).slice(2)}`;

    // Determine which option is currently active
    const currentFilename = value && value.includes('/') ? value.split('/').pop() : (value || '');
    const matchingFile = files.find(f => f.file === currentFilename);
    const isOther = Boolean(value && !matchingFile);

    const radioStyle = (label) => {
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '8px';
      label.style.padding = '4px 0';
      label.style.cursor = 'pointer';
      label.style.color = 'var(--primary-text-color)';
      label.style.fontSize = '0.95em';
    };

    const makeRadio = (val, labelText, checked) => {
      const label = document.createElement('label');
      radioStyle(label);
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = radioName;
      radio.value = val;
      radio.checked = checked;
      radio.style.accentColor = 'var(--primary-color)';
      radio.style.cursor = 'pointer';
      label.appendChild(radio);
      const span = document.createElement('span');
      span.textContent = labelText;
      label.appendChild(span);
      return { label, radio };
    };

    const radios = [];

    files.forEach(f => {
      const { label, radio } = makeRadio(f.file, f.profileName, !isOther && matchingFile === f);
      container.appendChild(label);
      radios.push(radio);
    });

    const { label: otherLabel, radio: otherRadio } = makeRadio('__other__', 'Other', isOther);
    container.appendChild(otherLabel);
    radios.push(otherRadio);

    // Custom path text input — only visible when "Other" is selected
    const customInput = document.createElement('input');
    customInput.type = 'text';
    customInput.value = isOther ? (value || '') : '';
    customInput.placeholder = '/local/community/advanced-energy-card/my-background.svg';
    customInput.style.display = isOther ? 'block' : 'none';
    customInput.style.padding = '8px 12px';
    customInput.style.border = '1px solid var(--divider-color)';
    customInput.style.borderRadius = '4px';
    customInput.style.background = 'var(--card-background-color)';
    customInput.style.color = 'var(--primary-text-color)';
    customInput.style.fontSize = '0.95em';
    customInput.style.width = '100%';
    customInput.style.boxSizing = 'border-box';
    customInput.style.marginTop = '4px';
    container.appendChild(customInput);

    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        if (radio.value === '__other__') {
          customInput.style.display = 'block';
          customInput.focus();
        } else {
          customInput.style.display = 'none';
          const configValue = radio.value ? `${baseUrl}${radio.value}` : '';
          this._updateFieldValue(field.name, configValue, true);
        }
      });
    });

    customInput.addEventListener('change', (e) => {
      this._updateFieldValue(field.name, e.target.value, true);
    });
    customInput.addEventListener('blur', (e) => {
      this._updateFieldValue(field.name, e.target.value, true);
    });

    return container;
  }

  _normalizeColorForPicker(color) {
    if (!color) return '#000000';
    if (color.startsWith('#')) {
      const hex = color.length === 7 ? color : '#000000';
      return hex;
    }
    const tempDiv = document.createElement('div');
    tempDiv.style.color = color;
    document.body.appendChild(tempDiv);
    const computed = window.getComputedStyle(tempDiv).color;
    document.body.removeChild(tempDiv);
    
    const match = computed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return '#000000';
  }

  _updateFieldValue(fieldName, value, immediate = false) {
    if (!this._config) {
      this._config = {};
    }
    const newConfig = { ...this._config };
    if (value === '' || value === null || value === undefined) {
      delete newConfig[fieldName];
    } else {
      newConfig[fieldName] = value;
    }
    if (fieldName === 'initial_has_pv' && String(value) !== 'yes') {
      delete newConfig.initial_inverters;
    }
    if (fieldName === 'initial_has_battery' && String(value) !== 'yes') {
      delete newConfig.initial_battery_count;
    }
    if (fieldName === 'initial_has_grid' && String(value) !== 'yes') {
      delete newConfig.initial_can_export;
    }
    if (fieldName === 'initial_has_ev' && String(value) !== 'yes') {
      delete newConfig.initial_ev_count;
    }
    this._config = newConfig;
    if (fieldName === 'initial_configuration' || fieldName === 'initial_has_pv' || fieldName === 'initial_inverters' || fieldName === 'initial_has_battery' || fieldName === 'initial_battery_count' || fieldName === 'initial_has_grid' || fieldName === 'initial_has_windmill' || fieldName === 'initial_has_ev' || fieldName === 'initial_ev_count' || fieldName === 'language') {
      this.render();
    }
    if (fieldName === 'background') {
      this._handleBackgroundChange();
    }
    this._debouncedConfigChanged(newConfig, Boolean(immediate));
  }

  _onFormValueChanged(ev, schema, formEl) {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    const rawValue = ev.detail ? ev.detail.value : undefined;
    const formData = (formEl && formEl.data && typeof formEl.data === 'object') ? formEl.data : undefined;
    // Some HA selectors emit partial `value-changed` payloads (e.g., only the field
    // that changed), and on clear (X) the event can fire before `ha-form` updates
    // `form.data`. Merge so payload overrides form data when present.
    const rawObj = (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) ? rawValue : undefined;
    const rawKeys = rawObj ? Object.keys(rawObj) : [];
    // Entity selector changes are not "typing" and can be safely dispatched immediately.
    // IMPORTANT: ha-form often emits the *entire* form data on any change, so we must
    // only force-immediate when one of the battery entity selector fields actually changed.
    const normalizeEntityId = (v) => {
      if (v === undefined || v === null) return '';
      return typeof v === 'string' ? v.trim() : String(v);
    };
    const entitySelectorKeys = Array.isArray(schema)
      ? schema
        .filter((f) => f && f.name && f.selector && f.selector.entity)
        .map((f) => f.name)
      : [];
    const forceImmediate = Boolean(rawObj) && entitySelectorKeys.some((k) => {
      if (!Object.prototype.hasOwnProperty.call(rawObj, k)) {
        return false;
      }
      const prev = this._config ? normalizeEntityId(this._config[k]) : '';
      const next = normalizeEntityId(rawObj[k]);
      return next !== prev;
    });
    const value = (formData && rawObj)
      ? { ...formData, ...rawObj }
      : (formData || rawValue);
    if (!value || typeof value !== 'object') {
      return;
    }

    const prevDisplayUnit = (this._config && this._config.display_unit ? this._config.display_unit : this._defaults.display_unit || 'kW').toUpperCase();
    const newConfig = { ...this._config };
    schema.forEach((field) => {
      if (!field.name) {
        return;
      }
      const fieldValue = value[field.name];
      const defaultVal = field.default !== undefined ? field.default : this._defaults[field.name];
      if (
        fieldValue === '' ||
        fieldValue === null ||
        fieldValue === undefined ||
        (defaultVal !== undefined && fieldValue === defaultVal)
      ) {
        delete newConfig[field.name];
      } else {
        newConfig[field.name] = fieldValue;
      }
    });

    const nextDisplayUnit = (newConfig.display_unit || prevDisplayUnit).toUpperCase();
    if (nextDisplayUnit !== prevDisplayUnit) {
      this._convertThresholdValues(newConfig, prevDisplayUnit, nextDisplayUnit);
    }

    this._config = newConfig;
    this._debouncedConfigChanged(newConfig, forceImmediate || nextDisplayUnit !== prevDisplayUnit);
    // Only re-render the editor when the display unit changed because that
    // affects selector definitions (W vs kW). Re-rendering on every input
    // causes the active input to be recreated and loses focus while typing.
    if (nextDisplayUnit !== prevDisplayUnit) {
      this._rendered = false;
      this.render();
    }
  }

  _convertThresholdValues(config, fromUnit, toUnit) {
    const normalizeUnit = (unit) => (unit || 'kW').toUpperCase();
    const sourceUnit = normalizeUnit(fromUnit);
    const targetUnit = normalizeUnit(toUnit);
    if (sourceUnit === targetUnit) {
      return;
    }

    let factor = null;
    if (sourceUnit === 'W' && targetUnit === 'KW') {
      factor = 1 / 1000;
    } else if (sourceUnit === 'KW' && targetUnit === 'W') {
      factor = 1000;
    }
    if (factor === null) {
      return;
    }

    const fieldsToConvert = [
      'load_threshold_warning',
      'load_threshold_critical',
      'grid_threshold_warning',
      'grid_threshold_critical',
      'grid2_threshold_warning',
      'grid2_threshold_critical'
    ];
    fieldsToConvert.forEach((name) => {
      const hasOwn = Object.prototype.hasOwnProperty.call(config, name);
      const currentValue = hasOwn ? config[name] : (this._config ? this._config[name] : undefined);
      if (currentValue === undefined || currentValue === null || currentValue === '') {
        if (hasOwn) {
          config[name] = currentValue;
        }
        return;
      }
      const numeric = Number(currentValue);
      if (!Number.isFinite(numeric)) {
        return;
      }
      const converted = numeric * factor;
      const precision = factor < 1 ? 3 : 0;
      const rounded = precision > 0 ? Number(converted.toFixed(precision)) : Math.round(converted);
      config[name] = rounded;
    });
  }

  // Computes a key capturing everything that affects a given section's structure/content.
  // If a section's key is unchanged since the last build, its previously-built DOM node is
  // reused instead of rebuilding the (potentially expensive) ha-form/custom-form content.
  _computeSectionVersionKey(sectionId, configWithDefaults) {
    const base = [
      this._getActiveProfileId(),
      this._activeSnapshotKey || '',
      configWithDefaults.language || '',
      (configWithDefaults.display_unit || 'kW').toUpperCase(),
    ];
    if (sectionId === 'initialConfig') {
      base.push(
        configWithDefaults.initial_has_pv,
        configWithDefaults.initial_inverters,
        configWithDefaults.initial_has_battery,
        configWithDefaults.initial_battery_count,
        configWithDefaults.initial_has_grid,
        configWithDefaults.initial_has_windmill,
        configWithDefaults.initial_has_ev,
        configWithDefaults.initial_ev_count
      );
    }
    return JSON.stringify(base);
  }

  _buildConfigContent() {
    const container = document.createElement('div');
    container.className = 'card-config';

    const localeStrings = this._getLocaleStrings();
    const optionDefs = this._createOptionDefs(localeStrings);
    const schemaDefs = this._createSchemaDefs(localeStrings, optionDefs);
    const configWithDefaults = this._configWithDefaults();
    const showInitialConfig = configWithDefaults.initial_configuration !== false;
    const sections = this._createSectionDefs(localeStrings, schemaDefs)
      .filter((section) => section.id !== 'initialConfig' || showInitialConfig);

    const newCache = new Map();
    sections.forEach((section) => {
      let element;
      if (section.id === 'profileBasis') {
        // Depends on the async-fetched _svgFiles list; rare/edge-case, always rebuild.
        element = this._createSection(section);
      } else {
        const versionKey = this._computeSectionVersionKey(section.id, configWithDefaults);
        const cached = this._sectionCache.get(section.id);
        element = (cached && cached.versionKey === versionKey)
          ? cached.element
          : this._createSection(section);
        newCache.set(section.id, { versionKey, element });
      }
      container.appendChild(element);
    });
    this._sectionCache = newCache;

    return container;
  }

  render() {
    if (!this._hass || !this._config) {
      return;
    }

    this.shadowRoot.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
      }
      details.section {
        border: 1px solid var(--divider-color);
        border-radius: 10px;
        background: var(--ha-card-background, var(--card-background-color, #fff));
        overflow: hidden;
      }
      details.section:not(:first-of-type) {
        margin-top: 4px;
      }
      .section-summary {
        font-weight: bold;
        font-size: 1.05em;
        padding: 12px 16px;
        color: var(--primary-color);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        list-style: none;
      }
      .section-summary::-webkit-details-marker {
        display: none;
      }
      .section-summary::after {
        content: '>';
        font-size: 0.9em;
        transform: rotate(90deg);
        transition: transform 0.2s ease;
      }
      details.section[open] .section-summary::after {
        transform: rotate(270deg);
      }
      .section-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 0 16px 16px;
      }
      .section-helper {
        font-size: 0.9em;
        color: var(--secondary-text-color);
      }
      ha-form {
        width: 100%;
      }
      .custom-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .color-field-wrapper,
      .standard-field-wrapper {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .color-field-label {
        font-weight: 500;
        font-size: 0.95em;
        color: var(--primary-text-color);
      }
      .color-field-helper,
      .field-helper {
        font-size: 0.85em;
        color: var(--secondary-text-color);
      }
      .initial-config-items {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 6px;
      }
      .initial-config-item {
        padding: 6px 10px;
        border: 1px solid var(--divider-color);
        border-radius: 6px;
        background: var(--card-background-color);
        font-size: 0.95em;
      }
      .initial-config-item.helper {
        border-style: dashed;
        background: transparent;
        color: var(--secondary-text-color);
        font-style: italic;
      }
      .initial-config-item.empty {
        color: var(--secondary-text-color);
        font-style: italic;
      }
      .initial-config-complete-button {
        font-size: 2em;
        padding-top: 1em;
        padding-bottom: 1em;
      }
      .radio-group {
        display: flex;
        flex-direction: row;
        gap: 16px;
        align-items: center;
        flex-wrap: wrap;
      }
      .radio-option {
        display: inline-flex;
        gap: 8px;
        align-items: center;
        cursor: pointer;
        color: var(--primary-text-color);
        user-select: none;
      }
      .radio-option input[type="radio"] {
        accent-color: var(--primary-color);
      }
      .color-input-wrapper {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .color-picker-input {
        width: 48px;
        height: 32px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        cursor: pointer;
        padding: 2px;
      }
      .color-text-input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        background: var(--card-background-color);
        color: var(--primary-text-color);
        font-size: 0.95em;
      }
      .color-text-input:focus {
        outline: none;
        border-color: var(--primary-color);
      }
      .about-content {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 0.95em;
      }
      .about-title {
        font-weight: 600;
        font-size: 1.05em;
      }
      .about-version {
        color: var(--secondary-text-color);
      }
      .about-links,
      .about-developers {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .about-label {
        font-weight: 500;
      }
      .about-separator {
        font-weight: 400;
      }
      .about-links a,
      .about-developers a {
        color: var(--primary-color);
        text-decoration: none;
      }
      .about-links a:hover,
      .about-developers a:hover {
        text-decoration: underline;
      }
    `;

    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(this._buildConfigContent());
    this._rendered = true;
  }
}

if (!customElements.get('advanced-energy-card-editor')) {
  customElements.define('advanced-energy-card-editor', AdvancedEnergyCardEditor);
}
