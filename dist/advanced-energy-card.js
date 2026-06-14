/*
 * Advanced Energy Card
 * Custom Home Assistant card for energy flow visualization
 * Version: 1.3.5
 * Tested with Home Assistant 2025.12+
 * 
 * SECURITY FEATURES:
 * - SVG Sanitization: All external SVG content is sanitized before rendering
 * - URL Validation: Background URLs are validated to prevent malicious content loading
 * - Input Validation: Configuration values are validated for type, format, and bounds
 * - XSS Prevention: HTML/SVG text is properly escaped when building templates
 * - Prototype Pollution Protection: Dangerous configuration keys are blocked
 * - Rate Limiting: Resource loading is rate-limited to prevent DoS attacks
 * - Safe DOM Manipulation: textContent is used over innerHTML where possible
 * - Event Handler Security: Event handlers are statically defined, not dynamically constructed
 */


import { SecurityHelpers, ResourceRateLimiter } from './modules/security.js';
import { EntityStateManager } from './modules/entity-state-manager.js';
import { LocalizationManager } from './modules/localization-manager.js';
import { getConfiguredCarCount, applySvgLayerVisibility } from './modules/svg-layer-visibility.js';
import { PopupManager } from './modules/popup-manager.js';
import { BatteryManager } from './modules/battery-manager.js';
import { CarManager } from './modules/car-manager.js';
import { AnimationManager } from './modules/animation-manager.js';
import { SunMoonManager } from './modules/sun-moon-manager.js';
import { ConfigValidator } from './modules/config-validator.js';
import { TextBindingsManager } from './modules/text-bindings.js';
import { RenderManager } from './modules/render-manager.js';
import './modules/card-editor.js';
import {
  _CARD_BASE_URL,
  GEOMETRY, SVG_DIMENSIONS, TEXT_POSITIONS,
  buildTextTransform,
  DEBUG_LAYER_NOSOLAR_ENABLED, DEBUG_LAYER_1ARRAY_ENABLED, DEBUG_LAYER_2ARRAY_ENABLED,
  DEFAULTS, DISABLE_BATTERY_CLIP, DEFAULT_BATTERY_FILL_HIGH_COLOR, DEFAULT_BATTERY_FILL_LOW_COLOR, DEFAULT_BATTERY_LOW_THRESHOLD,
  HEADLIGHT_BLUR_RADIUS_PX,
  DEFAULT_GRID_ACTIVITY_THRESHOLD, GRID_CURRENT_HIDE_DAILY_OFFSET,
  CAR_TEXT_BASE, CAR_LAYOUTS, buildCarTextTransforms,
  BATTERY_TRANSFORM, BATTERY_OFFSET_BASE,
  TEXT_STYLE,
  ANIMATION,
  LEGACY_CAR_VISIBILITY_KEYS, LEGACY_DEPRECATED_KEYS, stripLegacyCarVisibility,
  PV_LINE_SPACING, FLOW_STYLE_DEFAULT,
  buildArrowGroupSvg,
  SEED_DEFAULTS,
  PROFILE_SCHEMAS,
} from './modules/constants.js';
export {
  GEOMETRY,
  SVG_LAYER_CONFIG,
  DEBUG_LAYER_NOSOLAR_ENABLED,
  DEBUG_LAYER_1ARRAY_ENABLED,
  DEBUG_LAYER_2ARRAY_ENABLED,
  LEGACY_CAR_VISIBILITY_KEYS,
  LEGACY_DEPRECATED_KEYS,
} from './modules/constants.js';


// ============================================================
// SECTION 2: POLYFILLS & BROWSER COMPATIBILITY
// ============================================================

// Polyfill CSS.escape for older browsers / HA webviews.
// (Used by existing filter/clip-path code and the odometer feature.)
(() => {
  try {
    const root = (typeof window !== 'undefined') ? window : globalThis;
    if (!root) {
      return;
    }
    if (root.CSS && typeof root.CSS.escape === 'function') {
      return;
    }
    const cssNamespace = root.CSS || (root.CSS = {});
    cssNamespace.escape = (value) => {
      const raw = String(value ?? '');
      let escaped = '';
      for (let i = 0; i < raw.length; i += 1) {
        const char = raw.charAt(i);
        if (/^[a-zA-Z0-9_\-]$/.test(char)) {
          escaped += char;
        } else {
          escaped += `\\${char}`;
        }
      }
      return escaped;
    };
  } catch (e) {
    // ignore
  }
})();



// ============================================================
// SVG TEXT BINDING DOCUMENTATION
// ============================================================
// SVG text binding: place <text> elements in the background SVG with matching data-role values.
// JS will only populate text / visibility (positioning stays in the SVG).
//
// Supported roles (initial migration set):
// - title-text                <- viewState.title.text
// - daily-label               <- viewState.daily.label
// - daily-value               <- viewState.daily.value
// - pv-line-0..pv-line-(N)     <- viewState.pv.lines[i].text (also sets fill + font-size)
// - pv1-total                  <- viewState.pv1Total.text (Array 1 total output)
// - pv2-total                  <- viewState.pv2Total.text (Array 2 total output)
// - pv2-line-0..pv2-line-5     <- viewState.pv2Lines[i].text (Array 2 per-string output, index = sensor_pv_array2_N order)
// - pv-total                    <- viewState.pvTotal.text (Array 1 + Array 2 combined total)
// - battery1                   <- viewState.battery1.text (Battery 1 power)
// - battery2                   <- viewState.battery2.text (Battery 2 power)
// - battery3                   <- viewState.battery3.text (Battery 3 power)
// - battery1-soc               <- viewState.battery1Soc.text
// - battery1-power             <- viewState.battery1Power.text
// - battery2-soc               <- viewState.battery2Soc.text
// - battery2-power             <- viewState.battery2Power.text
// - battery3-soc               <- viewState.battery3Soc.text
// - battery3-power             <- viewState.bado you have a er.text
// - battery4-soc               <- viewState.battery4Soc.text
// - battery4-power             <- viewState.battery4Power.text
// - battery1-time-until        <- viewState.batteryText[0].timeUntilText
// - battery2-time-until        <- viewState.batteryText[1].timeUntilText
// - battery3-time-until        <- viewState.batteryText[2].timeUntilText
// - battery4-time-until        <- viewState.batteryText[3].timeUntilText
// - battery-soc               <- viewState.batterySoc.text
// - battery-power             <- viewState.batteryPower.text
// - load-power OR load-line-0..2
// - grid-power OR grid-line-0..1
// - heat-pump-power            <- viewState.heatPump.text (visible when viewState.heatPump.visible)
// - washing-machine-power       <- viewState.washingMachine.text (visible when viewState.washingMachine.visible)
// - dryer-power                 <- viewState.dryer.text (visible when viewState.dryer.visible)
// - refrigerator-power          <- viewState.refrigerator.text (visible when viewState.refrigerator.visible)
// - car1-label OR car1-name / car1-power / car1-soc
// - car2-label OR car2-name / car2-power / car2-soc


// ============================================================
// SECTION 7: MAIN CARD CLASS
// ============================================================

class AdvancedEnergyCard extends HTMLElement {
  
  // ----------------------------------------------------------
  // LIFECYCLE METHODS
  // ----------------------------------------------------------
  
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._lastRender = 0;
    this._forceRender = false;
    this._rootInitialized = false;
    this._domRefs = null;
    this._prevViewState = null;
    this._eventListenerAttached = false;
    this._debugFluidFlow = false;
    this._animationSpeedFactor = 1;
    this._animationStyle = FLOW_STYLE_DEFAULT;
    this._dashGlowIntensity = 1;
    this._fluidFlowOuterGlowEnabled = false;
    this._rotationSpeedFactor = 1;
    this._cardWasHidden = false;
    this._renderCount = 0;
    this._defaults = (typeof AdvancedEnergyCard.getStubConfig === 'function')
      ? { ...AdvancedEnergyCard.getStubConfig(), ...SEED_DEFAULTS.tech }
      : {};
    this._handleEchoAliveClickBound = this._handleEchoAliveClick.bind(this);
    this._echoAliveClickTimeout = null;

    // Initialize feature managers for unified handling
    this._popupManager = new PopupManager(this);
    this._batteryManager = new BatteryManager(this);
    this._carManager = new CarManager(this);
    this._animationManager = new AnimationManager(this);
    this._sunMoonManager = new SunMoonManager(this);
    this._textBindingsManager = new TextBindingsManager(this);
    this._renderManager = new RenderManager(this);

    // Event handler bindings (must be stable so we can detach/reattach across renders)
    this._handleWindowFocusBound = () => {
      if (this._hass && this.config) {
        this._forceRender = true;
        this.render();
      }
    };
    this._handleVisibilityChangeBound = () => {
      if (document.visibilityState === 'visible' && this._hass && this.config) {
        this._forceRender = true;
        this.render();
      }
    };
    this._listenersAttachedTo = {
      echoAliveContainer: null
    };
  }

  _ensureGoogleFont(fontFamily) {
    try {
      if (typeof document === 'undefined' || !document.head) {
        return;
      }

      const raw = (fontFamily === null || fontFamily === undefined) ? '' : String(fontFamily);
      if (!raw.trim()) {
        return;
      }

      // Use the first font in a CSS font-family list.
      const primary = raw.split(',')[0].trim();
      const unquoted = primary.replace(/^['\"]|['\"]$/g, '').trim();
      if (!unquoted) {
        return;
      }

      // Skip generic/system families.
      const generic = new Set([
        'serif',
        'sans-serif',
        'monospace',
        'cursive',
        'fantasy',
        'system-ui',
        'ui-serif',
        'ui-sans-serif',
        'ui-monospace',
        'ui-rounded',
        'emoji',
        'math',
        'fangsong'
      ]);
      if (generic.has(unquoted.toLowerCase())) {
        return;
      }

      // Best-effort Google Fonts CSS2 API. Avoid hardcoding weights so "any" font works.
      const familyParam = encodeURIComponent(unquoted).replace(/%20/g, '+');
      const href = `https://fonts.googleapis.com/css2?family=${familyParam}&display=swap`;

      // Make a stable key for dedupe.
      const key = unquoted.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (!key) {
        return;
      }

      const selector = `link[data-advanced-font="${key}"]`;
      const existing = document.head.querySelector(selector);
      if (existing) {
        return;
      }

      const link = document.createElement('link');
      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('href', href);
      link.dataset.advancedFont = key;
      document.head.appendChild(link);
    } catch (e) {
      // ignore
    }
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    this.config = ConfigValidator.validate(config, this._defaults || {});
    this._forceRender = true;
    this._prevViewState = null;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.config) {
      return;
    }
    if (this._isEditorActive()) {
      this._forceRender = false;
      return;
    }

    // Detect when card becomes visible (tab switch, scroll into view)
    // Force immediate render to eliminate perceived lag
    const isHidden = this.offsetParent === null;
    if (this._cardWasHidden && !isHidden) {
      this._forceRender = true;
    }
    this._cardWasHidden = isHidden;

    this._sunMoonManager._checkNightModeChange();

    const now = Date.now();
    const configuredInterval = Number(this.config.update_interval);
    const intervalSeconds = Number.isFinite(configuredInterval) ? configuredInterval : 30;
    const clampedSeconds = Math.min(Math.max(intervalSeconds, 0), 60);
    const intervalMs = clampedSeconds > 0 ? clampedSeconds * 1000 : 0;
    
    // Allow faster updates for initial renders (first 3 renders use 1 second interval)
    // This eliminates startup lag while still rate-limiting steady state
    const effectiveInterval = (this._renderCount < 3 && intervalMs > 1000) ? 1000 : intervalMs;
    
    if (this._forceRender || !this._lastRender || effectiveInterval === 0 || now - this._lastRender >= effectiveInterval) {
      this.render();
      this._forceRender = false;
      this._renderCount++;
    }
  }

  static async getConfigElement() {
    return document.createElement('advanced-energy-card-editor');
  }

  static getStubConfig() {
    return {
      language: 'en',
      initial_configuration: true,
      card_title: '',
      title_text_color: '#00FFFF',
      title_bg_color: '#0080ff',
      card_label_color: '',
      card_label_font_size: '',
      card_value_color: '',
      card_value_font_size: '',
      card_background_color: '',
      card_label_css: '',
      card_value_css: '',
      font_family: 'B612',
      odometer_font_family: 'B612 Mono',
      background: '/local/community/advanced-energy-card/tech.svg',
      day_night_mode: 'day',
      night_mode: false,
      header_font_size: 16,
      daily_label_font_size: 12,
      daily_value_font_size: 20,
      pv_font_size: 12,
      battery_soc_font_size: 8,
      battery_power_font_size: 8,
      battery_time_until_color: '',
      battery_time_until_font_size: 8,
      sensor_bat1_state: '',
      sensor_bat2_state: '',
      sensor_bat3_state: '',
      sensor_bat4_state: '',
      battery_state_fully_charged_color: '',
      battery_state_charging_color: '',
      battery_state_discharging_color: '',
      battery_state_reserve_color: '',
      battery_state_fully_discharged_color: '',
      battery_state_font_size: 8,
      sensor_grid_state: '',
      grid_state_importing_color: '',
      grid_state_exporting_color: '',
      grid_state_floating_color: '',
      grid_state_font_size: 8,
      sensor_solar_state: '',
      solar_state_producing_color: '',
      solar_state_not_producing_color: '',
      solar_state_font_size: 8,
      sensor_solar_forecast_today: '',
      sensor_solar_forecast_tomorrow: '',
      sensor_weather_icon: '',
      weather_icon_color: '',
      weather_icon_font_size: 8,
      sensor_weather_forecast: '',
      weather_forecast_color: '',
      weather_forecast_font_size: 8,
      sun_moon_display: 'off',
      sun_moon_arc_color: '',
      sun_moon_arc_stroke_width: '',
      sun_moon_label_color: '',
      sun_moon_label_font_size: '',
      sun_moon_sunrise_label: '',
      sun_moon_sunset_label: '',
      sensor_house_consumption_today: '',
      sensor_pv_production_today: '',
      sensor_house_consumption_yesterday: '',
      sensor_pv_production_yesterday: '',
      sensor_today_grid_export: '',
      sensor_today_grid_import: '',
      sensor_weekly_grid_export: '',
      sensor_weekly_grid_import: '',
      sensor_monthly_grid_export: '',
      sensor_monthly_grid_import: '',
      sensor_yearly_grid_export: '',
      sensor_yearly_grid_import: '',
      stat_label_house_consumption_today: '',
      stat_label_pv_production_today: '',
      stat_label_house_consumption_yesterday: '',
      stat_label_pv_production_yesterday: '',
      stat_label_today_grid_export: '',
      stat_label_today_grid_import: '',
      stat_label_weekly_grid_export: '',
      stat_label_weekly_grid_import: '',
      stat_label_monthly_grid_export: '',
      stat_label_monthly_grid_import: '',
      stat_label_yearly_grid_export: '',
      stat_label_yearly_grid_import: '',
      stats_value_color: '',
      stats_value_font_size: 14,
      stats_label_color: '',
      stats_label_font_size: 12,
      inv1_datetime_color: '',
      inv1_datetime_font_size: 8,
      inv1_timeuntil_color: '',
      inv1_timeuntil_font_size: 8,
      inv2_datetime_color: '',
      inv2_datetime_font_size: 8,
      inv2_timeuntil_color: '',
      inv2_timeuntil_font_size: 8,
      load_font_size: 8,
      inv1_power_font_size: 8,
      inv2_power_font_size: 8,
      heat_pump_font_size: 8,
      pool_font_size: 8,
      washing_machine_font_size: 8,
      dishwasher_font_size: 8,
      dryer_font_size: 8,
      refrigerator_font_size: 8,
      freezer_font_size: 8,
      grid_font_size: 8,
      grid_daily_font_size: '8',
      inverter1_status_text_color: '',
      inverter1_status_font_size: 8,
      grid_current_odometer: true,
      grid_current_odometer_duration: 950,
      car_power_font_size: 10,
      car_soc_font_size: 10,
      car2_power_font_size: 10,
      car2_soc_font_size: 10,
      car_name_font_size: 10,
      car2_name_font_size: 10,
      car1_label: '',
      car2_label: '',
      car_headlight_flash: true,
      car1_glow_brightness: 50,
      car2_glow_brightness: 50,
      animation_speed_factor: 1,
      animation_style: 'dashes',
      night_animation_style: 'dashes',
      dashes_glow_intensity: 1,
      flow_stroke_width: 2,
      fluid_flow_stroke_width: 3,
      arrow_scale: 1,
      fluid_flow_outer_glow: false,
      sensor_pv_total: '',
      sensor_pv_total_secondary: '',
      sensor_windmill_total: '',
      sensor_windmill_daily: '',
      sensor_daily: '',
      sensor_daily_array2: '',
      sensor_bat1_soc: '',
      sensor_bat1_power: '',
      sensor_bat1_charge_power: '',
      sensor_bat1_discharge_power: '',
      sensor_bat1_capacity_sensor: '',
      bat1_capacity_manual: '',
      bat1_reserve_percentage: '',
      sensor_bat1_time_until: '',
      sensor_bat2_soc: '',
      sensor_bat2_power: '',
      sensor_bat2_charge_power: '',
      sensor_bat2_discharge_power: '',
      sensor_bat2_capacity_sensor: '',
      bat2_capacity_manual: '',
      bat2_reserve_percentage: '',
      sensor_bat2_time_until: '',
      sensor_bat3_soc: '',
      sensor_bat3_power: '',
      sensor_bat3_charge_power: '',
      sensor_bat3_discharge_power: '',
      sensor_bat3_capacity_sensor: '',
      bat3_capacity_manual: '',
      bat3_reserve_percentage: '',
      sensor_bat3_time_until: '',
      sensor_bat4_soc: '',
      sensor_bat4_power: '',
      sensor_bat4_charge_power: '',
      sensor_bat4_discharge_power: '',
      sensor_bat4_capacity_sensor: '',
      bat4_capacity_manual: '',
      bat4_reserve_percentage: '',
      sensor_bat4_time_until: '',
      sensor_home_load: '',
      sensor_home_load_secondary: '',
      sensor_heat_pump_consumption: '',
      heat_pump_label: 'Heat Pump',
      sensor_hot_water_consumption: '',
      sensor_pool_consumption: '',
      sensor_washing_machine_consumption: '',
      sensor_dishwasher_consumption: '',
      sensor_dryer_consumption: '',
      sensor_refrigerator_consumption: '',
      sensor_freezer_consumption: '',
      sensor_grid_power: '',
      sensor_grid_import: '',
      sensor_grid_export: '',
      sensor_grid_import_daily: '',
      sensor_grid_export_daily: '',
      sensor_grid2_power: '',
      sensor_grid2_import: '',
      sensor_grid2_export: '',
      sensor_grid2_import_daily: '',
      sensor_grid2_export_daily: '',
      sensor_car_power: '',
      sensor_car_soc: '',
      sensor_car_range: '',
      sensor_car_state: '',
      sensor_car_hvac_status: '',
      sensor_car_outside_temp: '',
      sensor_car_inside_temp: '',
      sensor_car_ac_temp: '',
      car1_climate_entity: '',
      sensor_car2_power: '',
      sensor_car2_soc: '',
      sensor_car2_range: '',
      sensor_car2_state: '',
      sensor_car2_hvac_status: '',
      sensor_car2_outside_temp: '',
      sensor_car2_inside_temp: '',
      sensor_car2_ac_temp: '',
      car2_climate_entity: '',
      pv_primary_color: '#0080ff',
      pv_tot_color: '#00FFFF',
      pv_secondary_color: '#80ffff',
      load_flow_color: '#0080ff',
      load_text_color: '#FFFFFF',
      house_total_color: '#00FFFF',
      inv1_color: '#0080ff',
      inv2_color: '#80ffff',
      load_threshold_warning: null,
      load_warning_color: '#ff8000',
      load_threshold_critical: null,
      load_critical_color: '#ff0000',
      battery_soc_color: '#FFFFFF',
      battery_time_until_color: '#FFFFFF',
      battery_time_until_font_size: 8,
      sensor_bat1_state: '',
      sensor_bat2_state: '',
      sensor_bat3_state: '',
      sensor_bat4_state: '',
      battery_state_fully_charged_color: '#00ff00',
      battery_state_charging_color: '#8000ff',
      battery_state_discharging_color: '#ff8000',
      battery_state_reserve_color: '#FF3333',
      battery_state_fully_discharged_color: '#FF3333',
      battery_state_font_size: 8,
      battery_charge_color: '#8000ff',
      battery_discharge_color: '#ff8000',
      grid_import_color: '#FF3333',
      grid_export_color: '#00ff00',
      grid2_import_color: '#FF3333',
      grid2_export_color: '#00ff00',
      car_flow_color: '#00FFFF',
      car1_color: '#00FFFF',
      car2_color: '#00FFFF',
      car1_name_color: '#00FFFF',
      car2_name_color: '#00FFFF',
      car2_pct_color: '#00FFFF',
      car_pct_color: '#00FFFF',
      heat_pump_text_color: '#FFA500',
      pool_flow_color: '#0080ff',
      pool_text_color: '#00FFFF',
      washing_machine_text_color: '#00FFFF',
      dishwasher_text_color: '#00FFFF',
      dryer_text_color: '#00FFFF',
      refrigerator_text_color: '#00FFFF',
      freezer_text_color: '#00FFFF',
      hot_water_text_color: '#00FFFF',
      windmill_flow_color: '#00FFFF',
      windmill_text_color: '#00FFFF',
      invert_battery: false,
      windmill_power_font_size: 10,
      battery_fill_high_color: DEFAULT_BATTERY_FILL_HIGH_COLOR,
      battery_fill_low_color: DEFAULT_BATTERY_FILL_LOW_COLOR,
      battery_fill_low_threshold: DEFAULT_BATTERY_LOW_THRESHOLD,
      battery_fill_opacity: 0.75,
      grid_activity_threshold: DEFAULT_GRID_ACTIVITY_THRESHOLD,
      grid_power_only: false,
      grid_threshold_warning: null,
      grid_warning_color: '#ff8000',
      grid_threshold_critical: null,
      grid_critical_color: '#ff0000',
      grid2_threshold_warning: null,
      grid2_warning_color: '#ff8000',
      grid2_threshold_critical: null,
      grid2_critical_color: '#ff0000',
      show_daily_grid: true,
      show_grid_flow_label: true,
      sensor_grid_state: '',
      grid_state_importing_color: '#FF3333',
      grid_state_exporting_color: '#00ff00',
      grid_state_floating_color: '#FFFFFF',
      grid_state_font_size: 8,
      sensor_solar_state: '',
      solar_state_producing_color: '#00ff00',
      solar_state_not_producing_color: '#FF3333',
      solar_state_font_size: 8,
      sensor_solar_forecast_today: '',
      sensor_solar_forecast_tomorrow: '',
      sensor_weather_icon: '',
      weather_icon_color: '#00FFFF',
      weather_icon_font_size: 8,
      sensor_weather_forecast: '',
      weather_forecast_color: '#00FFFF',
      weather_forecast_font_size: 8,
      sun_moon_display: 'off',
      sun_moon_arc_color: '',
      sun_moon_arc_stroke_width: '',
      sun_moon_label_color: '',
      sun_moon_label_font_size: '',
      sun_moon_sunrise_label: '',
      sun_moon_sunset_label: '',
      sensor_house_consumption_today: '',
      sensor_pv_production_today: '',
      sensor_house_consumption_yesterday: '',
      sensor_pv_production_yesterday: '',
      sensor_today_grid_export: '',
      sensor_today_grid_import: '',
      sensor_weekly_grid_export: '',
      sensor_weekly_grid_import: '',
      sensor_monthly_grid_export: '',
      sensor_monthly_grid_import: '',
      sensor_yearly_grid_export: '',
      sensor_yearly_grid_import: '',
      stat_label_house_consumption_today: 'House Consumption Today',
      stat_label_pv_production_today: 'PV Production Today',
      stat_label_house_consumption_yesterday: 'House Consumption Yesterday',
      stat_label_pv_production_yesterday: 'PV Production Yesterday',
      stat_label_today_grid_export: 'Today Grid Export',
      stat_label_today_grid_import: 'Today Grid Import',
      stat_label_weekly_grid_export: 'Weekly Grid Export',
      stat_label_weekly_grid_import: 'Weekly Grid Import',
      stat_label_monthly_grid_export: 'Monthly Grid Export',
      stat_label_monthly_grid_import: 'Monthly Grid Import',
      stat_label_yearly_grid_export: 'Yearly Grid Export',
      stat_label_yearly_grid_import: 'Yearly Grid Import',
      stats_value_color: '#00FFFF',
      stats_value_font_size: 14,
      stats_label_color: '#FFFFFF',
      stats_label_font_size: 12,
      display_unit: 'kW',
      update_interval: 5,
      invert_grid: false,
      enable_echo_alive: false,

      // Popup entities (PV, House, Battery, Grid, Inverter)
      sensor_popup_pv_1: '',
      sensor_popup_pv_1_name: '',
      sensor_popup_pv_1_color: '#00FFFF',
      sensor_popup_pv_1_font_size: 12,
      sensor_popup_pv_2: '',
      sensor_popup_pv_2_name: '',
      sensor_popup_pv_2_color: '#00FFFF',
      sensor_popup_pv_2_font_size: 12,
      sensor_popup_pv_3: '',
      sensor_popup_pv_3_name: '',
      sensor_popup_pv_3_color: '#00FFFF',
      sensor_popup_pv_3_font_size: 12,
      sensor_popup_pv_4: '',
      sensor_popup_pv_4_name: '',
      sensor_popup_pv_4_color: '#00FFFF',
      sensor_popup_pv_4_font_size: 12,
      sensor_popup_pv_5: '',
      sensor_popup_pv_5_name: '',
      sensor_popup_pv_5_color: '#00FFFF',
      sensor_popup_pv_5_font_size: 12,
      sensor_popup_pv_6: '',
      sensor_popup_pv_6_name: '',
      sensor_popup_pv_6_color: '#00FFFF',
      sensor_popup_pv_6_font_size: 12,

      sensor_popup_house_1: '',
      sensor_popup_house_1_name: '',
      sensor_popup_house_1_color: '#00FFFF',
      sensor_popup_house_1_font_size: 12,
      sensor_popup_house_2: '',
      sensor_popup_house_2_name: '',
      sensor_popup_house_2_color: '#00FFFF',
      sensor_popup_house_2_font_size: 12,
      sensor_popup_house_3: '',
      sensor_popup_house_3_name: '',
      sensor_popup_house_3_color: '#00FFFF',
      sensor_popup_house_3_font_size: 12,
      sensor_popup_house_4: '',
      sensor_popup_house_4_name: '',
      sensor_popup_house_4_color: '#00FFFF',
      sensor_popup_house_4_font_size: 12,
      sensor_popup_house_5: '',
      sensor_popup_house_5_name: '',
      sensor_popup_house_5_color: '#00FFFF',
      sensor_popup_house_5_font_size: 12,
      sensor_popup_house_6: '',
      sensor_popup_house_6_name: '',
      sensor_popup_house_6_color: '#00FFFF',
      sensor_popup_house_6_font_size: 12,
      house_auto_appliance_font_size: 12,
      house_auto_appliance_color: '#00FFFF',

      sensor_popup_car1_1: '',
      sensor_popup_car1_1_name: '',
      sensor_popup_car1_1_color: '#00FFFF',
      sensor_popup_car1_1_font_size: 12,
      sensor_popup_car1_2: '',
      sensor_popup_car1_2_name: '',
      sensor_popup_car1_2_color: '#00FFFF',
      sensor_popup_car1_2_font_size: 12,
      sensor_popup_car1_3: '',
      sensor_popup_car1_3_name: '',
      sensor_popup_car1_3_color: '#00FFFF',
      sensor_popup_car1_3_font_size: 12,
      sensor_popup_car1_4: '',
      sensor_popup_car1_4_name: '',
      sensor_popup_car1_4_color: '#00FFFF',
      sensor_popup_car1_4_font_size: 12,
      sensor_popup_car1_5: '',
      sensor_popup_car1_5_name: '',
      sensor_popup_car1_5_color: '#00FFFF',
      sensor_popup_car1_5_font_size: 12,
      sensor_popup_car1_6: '',
      sensor_popup_car1_6_name: '',
      sensor_popup_car1_6_color: '#00FFFF',
      sensor_popup_car1_6_font_size: 12,

      sensor_popup_car2_1: '',
      sensor_popup_car2_1_name: '',
      sensor_popup_car2_1_color: '#00FFFF',
      sensor_popup_car2_1_font_size: 12,
      sensor_popup_car2_2: '',
      sensor_popup_car2_2_name: '',
      sensor_popup_car2_2_color: '#00FFFF',
      sensor_popup_car2_2_font_size: 12,
      sensor_popup_car2_3: '',
      sensor_popup_car2_3_name: '',
      sensor_popup_car2_3_color: '#00FFFF',
      sensor_popup_car2_3_font_size: 12,
      sensor_popup_car2_4: '',
      sensor_popup_car2_4_name: '',
      sensor_popup_car2_4_color: '#00FFFF',
      sensor_popup_car2_4_font_size: 12,
      sensor_popup_car2_5: '',
      sensor_popup_car2_5_name: '',
      sensor_popup_car2_5_color: '#00FFFF',
      sensor_popup_car2_5_font_size: 12,
      sensor_popup_car2_6: '',
      sensor_popup_car2_6_name: '',
      sensor_popup_car2_6_color: '#00FFFF',
      sensor_popup_car2_6_font_size: 12,

      // Global battery popup styling
      battery_popup_color: '#00FFFF',
      battery_popup_font_size: 16,

      sensor_popup_bat_1: '',
      sensor_popup_bat_1_name: '',
      sensor_popup_bat_1_color: '#00FFFF',
      sensor_popup_bat_1_font_size: 12,
      sensor_popup_bat_2: '',
      sensor_popup_bat_2_name: '',
      sensor_popup_bat_2_color: '#00FFFF',
      sensor_popup_bat_2_font_size: 12,
      sensor_popup_bat_3: '',
      sensor_popup_bat_3_name: '',
      sensor_popup_bat_3_color: '#00FFFF',
      sensor_popup_bat_3_font_size: 12,
      sensor_popup_bat_4: '',
      sensor_popup_bat_4_name: '',
      sensor_popup_bat_4_color: '#00FFFF',
      sensor_popup_bat_4_font_size: 12,
      sensor_popup_bat_5: '',
      sensor_popup_bat_5_name: '',
      sensor_popup_bat_5_color: '#00FFFF',
      sensor_popup_bat_5_font_size: 12,
      sensor_popup_bat_6: '',
      sensor_popup_bat_6_name: '',
      sensor_popup_bat_6_color: '#00FFFF',
      sensor_popup_bat_6_font_size: 12,

      sensor_popup_grid_1: '',
      sensor_popup_grid_1_name: '',
      sensor_popup_grid_1_color: '#00FFFF',
      sensor_popup_grid_1_font_size: 12,
      sensor_popup_grid_2: '',
      sensor_popup_grid_2_name: '',
      sensor_popup_grid_2_color: '#00FFFF',
      sensor_popup_grid_2_font_size: 12,
      sensor_popup_grid_3: '',
      sensor_popup_grid_3_name: '',
      sensor_popup_grid_3_color: '#00FFFF',
      sensor_popup_grid_3_font_size: 12,
      sensor_popup_grid_4: '',
      sensor_popup_grid_4_name: '',
      sensor_popup_grid_4_color: '#00FFFF',
      sensor_popup_grid_4_font_size: 12,
      sensor_popup_grid_5: '',
      sensor_popup_grid_5_name: '',
      sensor_popup_grid_5_color: '#00FFFF',
      sensor_popup_grid_5_font_size: 12,
      sensor_popup_grid_6: '',
      sensor_popup_grid_6_name: '',
      sensor_popup_grid_6_color: '#00FFFF',
      sensor_popup_grid_6_font_size: 12,

      sensor_popup_inverter_1: '',
      sensor_popup_inverter_1_name: '',
      sensor_popup_inverter_1_color: '#00FFFF',
      sensor_popup_inverter_1_font_size: 12,
      sensor_popup_inverter_2: '',
      sensor_popup_inverter_2_name: '',
      sensor_popup_inverter_2_color: '#00FFFF',
      sensor_popup_inverter_2_font_size: 12,
      sensor_popup_inverter_3: '',
      sensor_popup_inverter_3_name: '',
      sensor_popup_inverter_3_color: '#00FFFF',
      sensor_popup_inverter_3_font_size: 12,
      sensor_popup_inverter_4: '',
      sensor_popup_inverter_4_name: '',
      sensor_popup_inverter_4_color: '#00FFFF',
      sensor_popup_inverter_4_font_size: 12,
      sensor_popup_inverter_5: '',
      sensor_popup_inverter_5_name: '',
      sensor_popup_inverter_5_color: '#00FFFF',
      sensor_popup_inverter_5_font_size: 12,
      sensor_popup_inverter_6: '',
      sensor_popup_inverter_6_name: '',
      sensor_popup_inverter_6_color: '#00FFFF',
      sensor_popup_inverter_6_font_size: 12
    };
  }

  _isEditorActive() {
    return Boolean(this.closest('hui-card-preview'));
  }

  connectedCallback() {
    if (typeof super.connectedCallback === 'function') super.connectedCallback();
    window.addEventListener('focus', this._handleWindowFocusBound);
    document.addEventListener('visibilitychange', this._handleVisibilityChangeBound);
    // HA SPA view switching reconnects the element — render immediately
    if (this._hass && this.config) {
      this._forceRender = true;
      this.render();
    }
  }

  disconnectedCallback() {
    if (typeof super.disconnectedCallback === 'function') {
      super.disconnectedCallback();
    }
    window.removeEventListener('focus', this._handleWindowFocusBound);
    document.removeEventListener('visibilitychange', this._handleVisibilityChangeBound);
    this._animationManager.killAllAnimations();
    this._animationManager._teardownRotateAnimations();
    this._animationManager._teardownAllHeadlightAnimations();
    if (this._echoAliveClickTimeout) {
      try {
        clearTimeout(this._echoAliveClickTimeout);
      } catch (e) {
        // ignore
      }
      this._echoAliveClickTimeout = null;
    }
    this._domRefs = null;
    this._prevViewState = null;
    this._eventListenerAttached = false;
    this._rootInitialized = false;
  }

  getStateSafe(entity_id) {
    if (!entity_id || !this._hass.states[entity_id] ||
        this._hass.states[entity_id].state === 'unavailable' ||
        this._hass.states[entity_id].state === 'unknown') {
      return 0;
    }

    const stateString = this._hass.states[entity_id].state;
    let value = parseFloat(stateString);
    const attributes = this._hass.states[entity_id].attributes || {};
    const unitCandidates = [attributes.unit_of_measurement, attributes.native_unit_of_measurement];
    let unit = '';
    for (let i = 0; i < unitCandidates.length; i += 1) {
      if (typeof unitCandidates[i] === 'string' && unitCandidates[i].trim()) {
        unit = unitCandidates[i].trim().toLowerCase();
        break;
      }
    }

    // Some template sensors omit unit metadata but keep the suffix in the state text.
    if (!unit && typeof stateString === 'string') {
      const suffix = stateString.trim().toLowerCase();
      if (suffix.endsWith('kw')) {
        unit = 'kw';
      } else if (suffix.endsWith('kwh')) {
        unit = 'kwh';
      }
    }

    if (unit === 'kw' || unit === 'kwh') {
      value = value * 1000;
    }

    return value;
  }

  getEntityName(entity_id) {
    if (!entity_id || !this._hass.states[entity_id]) {
      return entity_id || 'Unknown';
    }
    return this._hass.states[entity_id].attributes.friendly_name || entity_id;
  }

  formatPower(watts, use_kw) {
    if (use_kw) {
      return (watts / 1000).toFixed(2) + ' kW';
    }
    return Math.round(watts) + ' W';
  }

  formatEnergy(wattHours, use_kw) {
    const value = Number.isFinite(wattHours) ? wattHours : 0;
    if (use_kw) {
      return (value / 1000).toFixed(2) + ' kWh';
    }
    return Math.round(value) + ' Wh';
  }

  formatPopupValue(_unused, sensorId) {
    if (!sensorId || !this._hass || !this._hass.states) {
      return '';
    }
    const resolvedId = typeof sensorId === 'string' ? sensorId.trim() : sensorId;
    if (!resolvedId || !this._hass.states[resolvedId]) {
      return '';
    }
    const entity = this._hass.states[resolvedId];
    const rawState = entity && entity.state !== undefined && entity.state !== null
      ? entity.state.toString().trim()
      : '';
    if (!rawState) {
      return '';
    }
    const lowerState = rawState.toLowerCase();
    if (lowerState === 'unknown' || lowerState === 'unavailable') {
      return '';
    }
    const unit = (entity.attributes && typeof entity.attributes.unit_of_measurement === 'string')
      ? entity.attributes.unit_of_measurement.trim()
      : '';
    return unit ? `${rawState} ${unit}` : rawState;
  }

  // ============================================================
  // PHASE 3: REFACTORED RENDER PIPELINE
  // ============================================================

  /**
   * Main render orchestrator - delegates to helper methods
   * Replaces the original monolithic ~1,100 line render method
   */
  render() {
    if (!this._hass || !this.config) return;
    const config = this._sunMoonManager._layerConfigWithEffectiveNight(this.config);
    this._lastRender = Date.now();
    
    this._renderManager.buildViewState(config);
  }

  /**
   * Apply computed viewState to the DOM
   * @param {object} viewState - Complete view state object
   * @private
   */
  _applyViewState(viewState) {
    this._ensureTemplate(viewState);
    if (!this._domRefs) {
      this._renderManager._cacheDomReferences();
    }
    this._renderManager.updateView(viewState);
    this._animationManager._applyFlowAnimationTargets(viewState.flowDurations, viewState.flows);
    this._animationManager._applyRotateAnimations();
    this._prevViewState = this._snapshotViewState(viewState);
    this._forceRender = false;
  }

  _ensureTemplate(viewState) {
    if (this._rootInitialized) {
      return;
    }
    // Ensure external font is requested (Google Fonts). Uses config.font_family primary name.
    this._ensureGoogleFont(this.config && this.config.font_family);
    this.shadowRoot.innerHTML = this._renderManager.buildTemplate(viewState);
    this._rootInitialized = true;
    this._renderManager._cacheDomReferences();

    // Apply SVG layer visibility based on configuration
    const svgElement = this.shadowRoot.querySelector('svg');
    if (svgElement) {
      applySvgLayerVisibility(svgElement, this._sunMoonManager._layerConfigWithEffectiveNight(this.config));
    }
  }

  _attachEventListeners() {
    if (!this.shadowRoot || !this._domRefs) return;

    // Popup-related click listeners (SVG data-action, backdrop, overlay, lines)
    this._popupManager.attachEventListeners(this._domRefs);

    const echoAliveContainer = this._domRefs ? this._domRefs.echoAliveContainer : null;
    if (this._listenersAttachedTo.echoAliveContainer && this._listenersAttachedTo.echoAliveContainer !== echoAliveContainer) {
      try {
        this._listenersAttachedTo.echoAliveContainer.removeEventListener('click', this._handleEchoAliveClickBound);
      } catch (e) {
        // ignore
      }
      this._listenersAttachedTo.echoAliveContainer = null;
    }
    if (echoAliveContainer && this._listenersAttachedTo.echoAliveContainer !== echoAliveContainer) {
      try {
        echoAliveContainer.addEventListener('click', this._handleEchoAliveClickBound, true);
        this._listenersAttachedTo.echoAliveContainer = echoAliveContainer;
      } catch (e) {
        // ignore
      }
    }
  }

  _handleEchoAliveClick(event) {
    try {
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      const container = (event && event.currentTarget)
        ? event.currentTarget
        : (this._domRefs ? this._domRefs.echoAliveContainer : null);
      if (!container) {
        return;
      }
      if (this._echoAliveClickTimeout) {
        try {
          clearTimeout(this._echoAliveClickTimeout);
        } catch (e) {
          // ignore
        }
        this._echoAliveClickTimeout = null;
      }
      if (typeof container.classList?.add === 'function') {
        container.classList.add('clicked');
      }
      console.log('Echo Alive click detected; keeping Silk browser awake.');
      this._echoAliveClickTimeout = setTimeout(() => {
        try {
          if (typeof container.classList?.remove === 'function') {
            container.classList.remove('clicked');
          }
        } catch (e) {
          // ignore
        } finally {
          this._echoAliveClickTimeout = null;
        }
      }, 500);
    } catch (error) {
      console.warn('Echo alive click handler error:', error);
    }
  }

  _snapshotViewState(viewState) {
    return {
      backgroundImage: viewState.backgroundImage,
      animationStyle: viewState.animationStyle,
      title: { ...viewState.title },
      daily: { ...viewState.daily },
      pv: {
        fontSize: viewState.pv.fontSize,
        lines: viewState.pv.lines.map((line) => ({ ...line }))
      },
      load: { ...viewState.load },
      grid: { ...viewState.grid },
      heatPump: { ...viewState.heatPump },
      pool: viewState.pool ? { ...viewState.pool } : undefined,
      car1: viewState.car1 ? {
        visible: viewState.car1.visible,
        label: { ...viewState.car1.label },
        power: { ...viewState.car1.power },
        soc: { ...viewState.car1.soc }
      } : undefined,
      car2: viewState.car2 ? {
        visible: viewState.car2.visible,
        label: { ...viewState.car2.label },
        power: { ...viewState.car2.power },
        soc: { ...viewState.car2.soc }
      } : undefined,
      flows: Object.fromEntries(Object.entries(viewState.flows).map(([key, value]) => [key, { ...value }])),
      headlightFlash: viewState.headlightFlash ? {
        enabled: Boolean(viewState.headlightFlash.enabled),
        car1: viewState.headlightFlash.car1 ? { ...viewState.headlightFlash.car1 } : undefined,
        car2: viewState.headlightFlash.car2 ? { ...viewState.headlightFlash.car2 } : undefined
      } : undefined
    };
  }

  static get version() {
    return '1.3.5';
  }
}

// if (!customElements.get('advanced-energy-card')) {
//   customElements.define('advanced-energy-card', AdvancedEnergyCard;
// }

if (!customElements.get('advanced-energy-card')) {
  customElements.define('advanced-energy-card', AdvancedEnergyCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'advanced-energy-card',
  name: 'Advanced Energy Card',
  description: 'Advanced energy flow visualization card with support for multiple PV strings and batteries',
  preview: true,
  documentationURL: 'https://github.com/ratava/advanced-energy-card'
});

console.info(
  `%c Advanced Energy Card %c v${AdvancedEnergyCard.version} `,
  'color: white; background: #00FFFF; font-weight: 700;',
  'color: #00FFFF; background: black; font-weight: 700;'
);

