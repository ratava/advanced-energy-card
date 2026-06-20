import { getConfiguredCarCount } from './svg-layer-visibility.js';

// Capture the card's own script URL at load time so the editor can resolve
// bundled SVG files relative to the card (works for both HACS and manual installs).
export const _CARD_BASE_URL = (() => {
  try {
    const currentSrc = (document.currentScript || {}).src;
    if (currentSrc) return currentSrc.substring(0, currentSrc.lastIndexOf('/') + 1);
    // document.currentScript is always null for <script type="module">, which is how
    // Home Assistant Lovelace resources are registered. Fall back to locating the
    // script tag by its filename.
    const scripts = document.querySelectorAll('script[src*="advanced-energy-card.js"]');
    if (scripts.length) {
      const src = scripts[scripts.length - 1].src;
      if (src) return src.substring(0, src.lastIndexOf('/') + 1);
    }
  } catch (e) {}
  return '';
})();

// ============================================================
// SECTION 1: CONSTANTS & CONFIGURATION
// ============================================================

// Organized constants for geometry, animation, defaults, and debug settings
export const GEOMETRY = {
  BATTERY: { X: 260, Y_BASE: 350, WIDTH: 55, MAX_HEIGHT: 84 },
  SVG: { width: 800, height: 450 },
  TEXT_POSITIONS: {
    solar: { x: 170, y: 310, rotate: -16, skewX: -20, skewY: 0 },
    battery: { x: 245, y: 375, rotate: -25, skewX: -25, skewY: 5 },
    home: { x: 460, y: 245, rotate: 0, skewX: 0, skewY: 0 },
    grid: { x: 580, y: 90, rotate: -8, skewX: -10, skewY: 0 },
    heatPump: { x: 315, y: 225, rotate: -20, skewX: -20, skewY: 33 }
  }
};

// Legacy constants for backward compatibility
export const BATTERY_GEOMETRY = GEOMETRY.BATTERY;
export const SVG_DIMENSIONS = GEOMETRY.SVG;
export const TEXT_POSITIONS = GEOMETRY.TEXT_POSITIONS;

export const buildTextTransform = ({ x, y, rotate, skewX, skewY }) =>
  `translate(${x}, ${y}) rotate(${rotate}) skewX(${skewX}) skewY(${skewY}) translate(-${x}, -${y})`;

export const TEXT_TRANSFORMS = {
  solar: buildTextTransform(TEXT_POSITIONS.solar),
  battery: buildTextTransform(TEXT_POSITIONS.battery),
  home: buildTextTransform(TEXT_POSITIONS.home),
  grid: buildTextTransform(TEXT_POSITIONS.grid),
  heatPump: buildTextTransform(TEXT_POSITIONS.heatPump)
};

// Debug and default configuration constants
export const DEBUG = {
  LAYER_NOSOLAR_ENABLED: false,
  LAYER_1ARRAY_ENABLED: false,
  LAYER_2ARRAY_ENABLED: false,
  HEADLIGHT_LOGGING_ENABLED: false
};

// Legacy debug constants for backward compatibility
export const DEBUG_LAYER_NOSOLAR_ENABLED = DEBUG.LAYER_NOSOLAR_ENABLED;
export const DEBUG_LAYER_1ARRAY_ENABLED = DEBUG.LAYER_1ARRAY_ENABLED;
export const DEBUG_LAYER_2ARRAY_ENABLED = DEBUG.LAYER_2ARRAY_ENABLED;
export const HEADLIGHT_DEBUG_LOGGING_ENABLED = DEBUG.HEADLIGHT_LOGGING_ENABLED;

export const DEFAULTS = {
  BATTERY: {
    FILL_HIGH_COLOR: '#00ffff',
    FILL_LOW_COLOR: '#ff0000',
    LOW_THRESHOLD: 25,
    DISABLE_CLIP: true
  },
  GRID: {
    ACTIVITY_THRESHOLD: 100,
    CURRENT_HIDE_DAILY_OFFSET: 18
  },
  HEADLIGHT: {
    FILTERS_ENABLED: true,
    BLUR_RADIUS_PX: 12,
    SVG_FILTER_ID: 'advanced-headlight-glow'
  }
};

// Legacy default constants for backward compatibility
export const DISABLE_BATTERY_CLIP = DEFAULTS.BATTERY.DISABLE_CLIP;
export const DEFAULT_BATTERY_FILL_HIGH_COLOR = DEFAULTS.BATTERY.FILL_HIGH_COLOR;
export const DEFAULT_BATTERY_FILL_LOW_COLOR = DEFAULTS.BATTERY.FILL_LOW_COLOR;
export const DEFAULT_BATTERY_LOW_THRESHOLD = DEFAULTS.BATTERY.LOW_THRESHOLD;
export const HEADLIGHT_FILTERS_ENABLED = DEFAULTS.HEADLIGHT.FILTERS_ENABLED;
export const HEADLIGHT_BLUR_RADIUS_PX = DEFAULTS.HEADLIGHT.BLUR_RADIUS_PX;
export const HEADLIGHT_SVG_FILTER_ID = DEFAULTS.HEADLIGHT.SVG_FILTER_ID;
export const HEADLIGHT_SVG_FILTER_URL = `url(#${DEFAULTS.HEADLIGHT.SVG_FILTER_ID})`;
export const HEADLIGHT_SVG_FILTER_STD_DEV = Math.max(0.1, DEFAULTS.HEADLIGHT.BLUR_RADIUS_PX);
export const DEFAULT_GRID_ACTIVITY_THRESHOLD = DEFAULTS.GRID.ACTIVITY_THRESHOLD;
export const GRID_CURRENT_HIDE_DAILY_OFFSET = DEFAULTS.GRID.CURRENT_HIDE_DAILY_OFFSET;
// ============================================================
// SECTION 3: CAR & VEHICLE CONFIGURATION
// ============================================================

export const CAR_TEXT_BASE = { x: 590, rotate: 16, skewX: 20, skewY: 0 };
export const CAR_LAYOUTS = {
  single: {
    car1: { x: 590, labelY: 282, powerY: 300, socY: 316, path: 'M 475 329 L 490 335 L 600 285' },
    car2: { x: 590, labelY: 318, powerY: 336, socY: 352, path: 'M 475 341 L 490 347 L 600 310' }
  },
  dual: {
    car1: { x: 580, labelY: 272, powerY: 290, socY: 306, path: 'M 475 329 L 490 335 L 600 285' },
    car2: { x: 639, labelY: 291, powerY: 308, socY: 323, path: 'M 464 320 L 570 357 L 650 310' }
  }
};

export const buildCarTextTransforms = (entry) => {
  const base = { ...CAR_TEXT_BASE };
  if (typeof entry.x === 'number') {
    base.x = entry.x;
  }
  return {
    label: buildTextTransform({ ...base, y: entry.labelY }),
    power: buildTextTransform({ ...base, y: entry.powerY }),
    soc: buildTextTransform({ ...base, y: entry.socY })
  };
};

export const BATTERY_TRANSFORM = `translate(${BATTERY_GEOMETRY.X}, ${BATTERY_GEOMETRY.Y_BASE}) rotate(-6) skewX(-4) skewY(30) translate(-${BATTERY_GEOMETRY.X}, -${BATTERY_GEOMETRY.Y_BASE})`;
export const BATTERY_OFFSET_BASE = BATTERY_GEOMETRY.Y_BASE - BATTERY_GEOMETRY.MAX_HEIGHT;

// ============================================================
// SECTION 4: STYLING & DISPLAY CONSTANTS
// ============================================================

export const TEXT_STYLE = {
  DEFAULT: 'font-weight:bold; font-family: sans-serif; text-anchor:middle; text-shadow: 0 0 5px black;'
};

// Legacy constant for backward compatibility
export const TXT_STYLE = TEXT_STYLE.DEFAULT;
export const ANIMATION = {
  FLOW_ARROW_COUNT: 10,
  MAX_PV_LINES: 7,
  PV_LINE_SPACING: 14,
  FLOW_BASE_LOOP_RATE: 0.0025,
  FLOW_MIN_GLOW_SCALE: 0.2,
  ARROW_SCALE_REFERENCE_STROKE_WIDTH: 3,
  ARROW_BASE_SCALE: 2,
  FLOW_STYLE_DEFAULT: 'dashes',
  FLOW_STYLE_PATTERNS: {
    dashes: { dasharray: '10 10', cycle: 20 },
    dashes_glow: { dasharray: '10 10', cycle: 20 },
    fluid_flow: { dasharray: '30 80', cycle: 130 },
    dots: { dasharray: '2 18', cycle: 20 },
    arrows: { dasharray: null, cycle: 1 },
    electrons: { dasharray: null, cycle: 1 }
  }
};

// Legacy constants for backward compatibility
export const FLOW_ARROW_COUNT = ANIMATION.FLOW_ARROW_COUNT;

// ============================================================
// SECTION 5: UTILITY FUNCTIONS
// ============================================================

// Legacy Configuration Migration
export const LEGACY_CAR_VISIBILITY_KEYS = ['show_car', 'show_car2', 'show_car_2', 'show_car_soc', 'show_car_soc2'];
export const LEGACY_DEPRECATED_KEYS = ['heat_pump_flow_color'];
export const stripLegacyCarVisibility = (config) => {
  if (!config || typeof config !== 'object') {
    return config;
  }
  let sanitized = null;
  LEGACY_CAR_VISIBILITY_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      if (!sanitized) {
        sanitized = { ...config };
      }
      delete sanitized[key];
    }
  });
  return sanitized || config;
};

// ============================================================
// SVG Layer Visibility Configuration
// ============================================================
// Maps configuration options to SVG elements that should be shown/hidden
export const SVG_LAYER_CONFIG = [
  // Base layer - always visible
  {
    layerName: 'Base',
    svgSelector: '[data-layer="Base"]',
    condition: () => true  // Always visible
  },

  // Day/Night background layers (optional)
  // Day backgrounds (car-count aware)
  {
    layerName: 'BackgroundDayNoCar',
    svgSelector: '[data-role="daynocar"]',
    condition: (config) => !Boolean(config.night_mode) && getConfiguredCarCount(config) === 0
  },
  {
    layerName: 'BackgroundDay1Car',
    svgSelector: '[data-role="day1car"]',
    condition: (config) => !Boolean(config.night_mode) && getConfiguredCarCount(config) === 1
  },
  {
    layerName: 'BackgroundDay2Car',
    svgSelector: '[data-role="day2car"]',
    condition: (config) => !Boolean(config.night_mode) && getConfiguredCarCount(config) >= 2
  },
  {
    layerName: 'BackgroundDayLegacy',
    svgSelector: '[data-role="background-day"]',
    condition: (config, svgElement) => {
      if (Boolean(config.night_mode)) return false;
      // Only show legacy background-day if the new day backgrounds don't exist in the SVG.
      const hasNewDayBackground = Boolean(
        svgElement && svgElement.querySelector('[data-role="daynocar"], [data-role="day1car"], [data-role="day2car"]')
      );
      return !hasNewDayBackground;
    }
  },
  {
    layerName: 'BackgroundNightNoCar',
    svgSelector: '[data-role="nightnocar"]',
    condition: (config) => Boolean(config.night_mode) && getConfiguredCarCount(config) === 0
  },
  {
    layerName: 'BackgroundNight1Car',
    svgSelector: '[data-role="night1car"]',
    condition: (config) => Boolean(config.night_mode) && getConfiguredCarCount(config) === 1
  },
  {
    layerName: 'BackgroundNight2Car',
    svgSelector: '[data-role="night2car"]',
    condition: (config) => Boolean(config.night_mode) && getConfiguredCarCount(config) >= 2
  },
  {
    layerName: 'BackgroundNightLegacy',
    svgSelector: '[data-role="background-night"]',
    condition: (config, svgElement) => {
      if (!Boolean(config.night_mode)) return false;
      // Only show legacy background-night if the new night backgrounds don't exist in the SVG.
      const hasNewNightBackground = Boolean(
        svgElement && svgElement.querySelector('[data-role="nightnocar"], [data-role="night1car"], [data-role="night2car"]')
      );
      return !hasNewNightBackground;
    }
  },

  // NoSolar layer - shown when no PV settings configured (grid power only)
  {
    layerName: 'NoSolar',
    svgSelector: '[data-layer="NoSolar"]',
    condition: (config) => {
      // Array 1 is valid if any PV strings are configured OR total sensor is set
      const hasArray1PVStrings = config.sensor_pv1 || config.sensor_pv2 || config.sensor_pv3 ||
                                config.sensor_pv4 || config.sensor_pv5 || config.sensor_pv6;
      const hasArray1Total = config.sensor_pv_total;

      // Array 2 is valid if any Array 2 PV strings are configured OR secondary total sensor is set
      const hasArray2PVStrings = config.sensor_pv_array2_1 || config.sensor_pv_array2_2 || config.sensor_pv_array2_3 ||
                                config.sensor_pv_array2_4 || config.sensor_pv_array2_5 || config.sensor_pv_array2_6;
      const hasArray2Total = config.sensor_pv_total_secondary;

      const hasArray1 = Boolean(hasArray1PVStrings || hasArray1Total);
      const hasArray2 = Boolean(hasArray2PVStrings || hasArray2Total);

      return !hasArray1 && !hasArray2;  // Show when no PV arrays configured
    }
  },

  // Inverter image/icon - shown whenever solar exists (hide for NoSolar)
  {
    layerName: 'Inverter',
    svgSelector: '[data-role="inverter"]',
    condition: (config) => {
      const hasArray1PVStrings = config.sensor_pv1 || config.sensor_pv2 || config.sensor_pv3 ||
                                config.sensor_pv4 || config.sensor_pv5 || config.sensor_pv6;
      const hasArray1Total = config.sensor_pv_total;

      const hasArray2PVStrings = config.sensor_pv_array2_1 || config.sensor_pv_array2_2 || config.sensor_pv_array2_3 ||
                                config.sensor_pv_array2_4 || config.sensor_pv_array2_5 || config.sensor_pv_array2_6;
      const hasArray2Total = config.sensor_pv_total_secondary;

      const hasArray1 = Boolean(hasArray1PVStrings || hasArray1Total);
      const hasArray2 = Boolean(hasArray2PVStrings || hasArray2Total);

      return hasArray1 || hasArray2;  // Show inverter when any PV array exists
    }
  },

  // 1Array layer - shown when Array 1 has valid configuration but Array 2 does not
  {
    layerName: '1Array',
    svgSelector: '[data-layer="1Array"]',
    condition: (config) => {
      // Array 1 is valid if any PV strings are configured OR total sensor is set
      const hasPVStrings = config.sensor_pv1 || config.sensor_pv2 || config.sensor_pv3 ||
                          config.sensor_pv4 || config.sensor_pv5 || config.sensor_pv6;
      const hasTotalSensor = config.sensor_pv_total;
      const hasArray1 = Boolean(hasPVStrings || hasTotalSensor);

      // Array 2 is valid if any Array 2 PV strings are configured OR secondary total sensor is set
      const hasArray2PVStrings = config.sensor_pv_array2_1 || config.sensor_pv_array2_2 || config.sensor_pv_array2_3 ||
                                config.sensor_pv_array2_4 || config.sensor_pv_array2_5 || config.sensor_pv_array2_6;
      const hasArray2Total = config.sensor_pv_total_secondary;
      const hasArray2 = Boolean(hasArray2PVStrings || hasArray2Total);

      return hasArray1 && !hasArray2;  // Show when Array 1 is configured but Array 2 is not
    }
  },

  // 2Array layer - shown when both Array 1 and Array 2 have valid configuration
  {
    layerName: '2Array',
    svgSelector: '[data-layer="2Array"]',
    condition: (config) => {
      // Array 1 is valid if any PV strings are configured OR total sensor is set
      const hasArray1PVStrings = config.sensor_pv1 || config.sensor_pv2 || config.sensor_pv3 ||
                                config.sensor_pv4 || config.sensor_pv5 || config.sensor_pv6;
      const hasArray1Total = config.sensor_pv_total;

      // Array 2 is valid if any Array 2 PV strings are configured OR secondary total sensor is set
      const hasArray2PVStrings = config.sensor_pv_array2_1 || config.sensor_pv_array2_2 || config.sensor_pv_array2_3 ||
                                config.sensor_pv_array2_4 || config.sensor_pv_array2_5 || config.sensor_pv_array2_6;
      const hasArray2Total = config.sensor_pv_total_secondary;

      const hasArray1 = Boolean(hasArray1PVStrings || hasArray1Total);
      const hasArray2 = Boolean(hasArray2PVStrings || hasArray2Total);

      return hasArray1 && hasArray2;  // Show when both arrays are configured
    }
  },

  // Individual elements within layers - show/hide based on specific entity configuration

  // Heat pump object - show when heat pump consumption entity is configured
  {
    configKey: 'heatpump',
    svgSelector: '[data-role="heatpump"]',
    condition: (config) => Boolean(config.sensor_heat_pump_consumption)
  },

  // Car 1 elements - show when car sensors are configured
  {
    configKey: 'car1',
    svgSelector: '[data-role="car1"]',
    condition: (config) => Boolean(config.sensor_car_power || config.sensor_car_soc)
  },

  // Car 1 card element (data-style="config") - show when car1 sensors are configured
  {
    configKey: 'car1_card',
    svgSelector: '[data-role="car1-card"]',
    condition: (config) => Boolean(config.sensor_car_power || config.sensor_car_soc)
  },

  // Car 2 elements - show when car2 sensors are configured
  {
    configKey: 'car2',
    svgSelector: '[data-role="car2"]',
    condition: (config) => Boolean(config.sensor_car2_power || config.sensor_car2_soc)
  },

  // Car 2 card element (data-style="config") - show when car2 sensors are configured
  {
    configKey: 'car2_card',
    svgSelector: '[data-role="car2-card"]',
    condition: (config) => Boolean(config.sensor_car2_power || config.sensor_car2_soc)
  },

  // Daily yield - show when daily sensor is configured
  {
    configKey: 'daily_yield',
    svgSelector: '[data-role="daily-yield"]',
    condition: (config) => Boolean(config.sensor_daily)
  },

  // Grid daily values - show when daily grid sensors are configured
  {
    configKey: 'grid_daily',
    svgSelector: '[data-role="grid-daily"], [data-role="grid-daily-import"], [data-role="grid-daily-export"], [data-role^="grid-line-"]',
    condition: (config) => Boolean(config.show_daily_grid)
  },

  // Windmill generator - show when windmill total sensor is configured
  {
    layerName: 'Windmill',
    svgSelector: '[data-role="windmill"], g[inkscape\\:label="windmill"], g[inkscape\\:label="Windmill"], #layer3',
    condition: (config) => Boolean(config.sensor_windmill_total)
  }
];

// ============================================================
// SECTION 6: FLOW ANIMATION CONFIGURATION (MOVED TO ANIMATION OBJECT ABOVE)
// ============================================================

// Legacy constants for backward compatibility
export const MAX_PV_LINES = ANIMATION.MAX_PV_LINES;
export const PV_LINE_SPACING = ANIMATION.PV_LINE_SPACING;
export const FLOW_STYLE_DEFAULT = ANIMATION.FLOW_STYLE_DEFAULT;
export const FLOW_STYLE_PATTERNS = ANIMATION.FLOW_STYLE_PATTERNS;
export const FLOW_BASE_LOOP_RATE = ANIMATION.FLOW_BASE_LOOP_RATE;
export const FLOW_MIN_GLOW_SCALE = ANIMATION.FLOW_MIN_GLOW_SCALE;
export const ARROW_SCALE_REFERENCE_STROKE_WIDTH = ANIMATION.ARROW_SCALE_REFERENCE_STROKE_WIDTH;
export const ARROW_BASE_SCALE = ANIMATION.ARROW_BASE_SCALE;
// ============================================================
// HELPER FUNCTIONS
// ============================================================

export const buildArrowGroupSvg = (key, flowState) => {
  const color = flowState && (flowState.glowColor || flowState.stroke) ? (flowState.glowColor || flowState.stroke) : '#00FFFF';
  const activeOpacity = flowState && flowState.active ? 1 : 0;
  const segments = Array.from({ length: FLOW_ARROW_COUNT }, (_, index) =>
    `<polygon data-arrow-shape="${key}" data-arrow-index="${index}" points="-8,-3 0,0 -8,3" fill="${color}" />`
  ).join('');
  return `<g class="flow-arrow" data-arrow-key="${key}" style="opacity:${activeOpacity};">${segments}</g>`;
};
export const SEED_DEFAULTS = {
  tech: {
    pv_tot_color: "#00FFFF",
    pv_font_size: 12,
    sensor_solar_state: "",
    solar_state_producing_color: "#00ff00",
    solar_state_not_producing_color: "#FF3333",
    solar_state_font_size: 8,
    sensor_pv_total: "",
    sensor_daily: "",
    pv_primary_color: "#0080ff",
    sensor_pv_total_secondary: "",
    sensor_daily_array2: "",
    pv_secondary_color: "#80ffff",
    sensor_windmill_total: "",
    sensor_windmill_daily: "",
    windmill_flow_color: "#00FFFF",
    windmill_text_color: "#00FFFF",
    windmill_power_font_size: 10,
    sensor_bat1_soc: "",
    sensor_bat1_power: "",
    sensor_bat1_charge_power: "",
    sensor_bat1_discharge_power: "",
    sensor_bat1_capacity_sensor: "",
    bat1_capacity_manual: "",
    bat1_reserve_percentage: "",
    sensor_bat1_time_until: "",
    sensor_bat2_soc: "",
    sensor_bat2_power: "",
    sensor_bat2_charge_power: "",
    sensor_bat2_discharge_power: "",
    sensor_bat2_capacity_sensor: "",
    bat2_capacity_manual: "",
    bat2_reserve_percentage: "",
    sensor_bat2_time_until: "",
    sensor_bat3_soc: "",
    sensor_bat3_power: "",
    sensor_bat3_charge_power: "",
    sensor_bat3_discharge_power: "",
    sensor_bat3_capacity_sensor: "",
    bat3_capacity_manual: "",
    bat3_reserve_percentage: "",
    sensor_bat3_time_until: "",
    sensor_bat4_soc: "",
    sensor_bat4_power: "",
    sensor_bat4_charge_power: "",
    sensor_bat4_discharge_power: "",
    sensor_bat4_capacity_sensor: "",
    bat4_capacity_manual: "",
    bat4_reserve_percentage: "",
    sensor_bat4_time_until: "",
    invert_battery: false,
    battery_soc_color: "#FFFFFF",
    battery_charge_color: "#8000ff",
    battery_discharge_color: "#ff8000",
    battery_fill_high_color: "#00ffff",
    battery_fill_low_color: "#ff0000",
    battery_fill_low_threshold: 25,
    battery_fill_opacity: 0.75,
    battery_soc_font_size: 8,
    battery_power_font_size: 8,
    battery_time_until_color: "#FFFFFF",
    battery_time_until_font_size: 8,
    battery_state_font_size: 8,
    inv1_datetime_color: "",
    inv1_datetime_font_size: 8,
    inv1_timeuntil_color: "",
    inv1_timeuntil_font_size: 8,
    inv2_datetime_color: "",
    inv2_datetime_font_size: 8,
    inv2_timeuntil_color: "",
    inv2_timeuntil_font_size: 8,
    sensor_grid_power: "",
    sensor_grid_import: "",
    sensor_grid_export: "",
    sensor_grid_import_daily: "",
    sensor_grid_export_daily: "",
    grid_import_color: "#FF3333",
    grid_export_color: "#00ff00",
    grid_activity_threshold: 100,
    grid_power_only: false,
    grid_threshold_warning: null,
    grid_warning_color: "#ff8000",
    grid_threshold_critical: null,
    grid_critical_color: "#ff0000",
    inv1_color: "#0080ff",
    sensor_grid2_power: "",
    sensor_grid2_import: "",
    sensor_grid2_export: "",
    sensor_grid2_import_daily: "",
    sensor_grid2_export_daily: "",
    grid2_import_color: "#FF3333",
    grid2_export_color: "#00ff00",
    grid2_threshold_warning: null,
    grid2_warning_color: "#ff8000",
    grid2_threshold_critical: null,
    grid2_critical_color: "#ff0000",
    inv2_color: "#80ffff",
    show_daily_grid: true,
    grid_font_size: 8,
    grid_daily_font_size: "8",
    show_grid_flow_label: true,
    sensor_grid_state: "",
    inverter1_status_text_color: "",
    inverter1_status_font_size: 8,
    invert_grid: false,
    sensor_car_power: "",
    sensor_car_soc: "",
    sensor_car_range: "",
    sensor_car_state: "",
    sensor_car_hvac_status: "",
    sensor_car_outside_temp: "",
    sensor_car_inside_temp: "",
    sensor_car_ac_temp: "",
    car1_climate_entity: "",
    sensor_car2_power: "",
    sensor_car2_soc: "",
    sensor_car2_range: "",
    sensor_car2_state: "",
    sensor_car2_hvac_status: "",
    sensor_car2_outside_temp: "",
    sensor_car2_inside_temp: "",
    sensor_car2_ac_temp: "",
    car2_climate_entity: "",
    car1_label: "",
    car2_label: "",
    car_headlight_flash: true,
    car1_glow_brightness: 50,
    car2_glow_brightness: 50,
    car_flow_color: "#00FFFF",
    car_pct_color: "#00FFFF",
    car2_pct_color: "#00FFFF",
    car1_name_color: "#00FFFF",
    car2_name_color: "#00FFFF",
    car1_color: "#00FFFF",
    car2_color: "#00FFFF",
    car_power_font_size: 10,
    car2_power_font_size: 10,
    car_name_font_size: 10,
    car2_name_font_size: 10,
    car_soc_font_size: 10,
    car2_soc_font_size: 10,
    sensor_home_load: "",
    sensor_home_load_secondary: "",
    sensor_heat_pump_consumption: "",
    sensor_hot_water_consumption: "",
    heat_pump_label: "Heat Pump",
    sensor_pool_consumption: "",
    sensor_washing_machine_consumption: "",
    sensor_dishwasher_consumption: "",
    sensor_dryer_consumption: "",
    sensor_refrigerator_consumption: "",
    sensor_freezer_consumption: "",
    heat_pump_text_color: "#FFA500",
    pool_flow_color: "#0080ff",
    pool_text_color: "#00FFFF",
    hot_water_text_color: "#00FFFF",
    washing_machine_text_color: "#00FFFF",
    dishwasher_text_color: "#00FFFF",
    dryer_text_color: "#00FFFF",
    refrigerator_text_color: "#00FFFF",
    freezer_text_color: "#00FFFF",
    load_flow_color: "#0080ff",
    load_text_color: "#FFFFFF",
    house_total_color: "#00FFFF",
    load_threshold_warning: null,
    load_warning_color: "#ff8000",
    load_threshold_critical: null,
    load_critical_color: "#ff0000",
    heat_pump_font_size: 8,
    pool_font_size: 8,
    washing_machine_font_size: 8,
    dishwasher_font_size: 8,
    dryer_font_size: 8,
    refrigerator_font_size: 8,
    freezer_font_size: 8,
    load_font_size: 8,
    sensor_popup_pv_1: "",
    sensor_popup_pv_1_name: "",
    sensor_popup_pv_2: "",
    sensor_popup_pv_2_name: "",
    sensor_popup_pv_3: "",
    sensor_popup_pv_3_name: "",
    sensor_popup_pv_4: "",
    sensor_popup_pv_4_name: "",
    sensor_popup_pv_5: "",
    sensor_popup_pv_5_name: "",
    sensor_popup_pv_6: "",
    sensor_popup_pv_6_name: "",
    sensor_popup_pv_1_color: "#00FFFF",
    sensor_popup_pv_2_color: "#00FFFF",
    sensor_popup_pv_3_color: "#00FFFF",
    sensor_popup_pv_4_color: "#00FFFF",
    sensor_popup_pv_5_color: "#00FFFF",
    sensor_popup_pv_6_color: "#00FFFF",
    sensor_popup_pv_1_font_size: 12,
    sensor_popup_pv_2_font_size: 12,
    sensor_popup_pv_3_font_size: 12,
    sensor_popup_pv_4_font_size: 12,
    sensor_popup_pv_5_font_size: 12,
    sensor_popup_pv_6_font_size: 12,
    sensor_popup_bat_1: "",
    sensor_popup_bat_1_name: "",
    sensor_popup_bat_2: "",
    sensor_popup_bat_2_name: "",
    sensor_popup_bat_3: "",
    sensor_popup_bat_3_name: "",
    sensor_popup_bat_4: "",
    sensor_popup_bat_4_name: "",
    sensor_popup_bat_5: "",
    sensor_popup_bat_5_name: "",
    sensor_popup_bat_6: "",
    sensor_popup_bat_6_name: "",
    battery_popup_color: "#00FFFF",
    battery_popup_font_size: 16,
    sensor_popup_grid_1: "",
    sensor_popup_grid_1_name: "",
    sensor_popup_grid_2: "",
    sensor_popup_grid_2_name: "",
    sensor_popup_grid_3: "",
    sensor_popup_grid_3_name: "",
    sensor_popup_grid_4: "",
    sensor_popup_grid_4_name: "",
    sensor_popup_grid_5: "",
    sensor_popup_grid_5_name: "",
    sensor_popup_grid_6: "",
    sensor_popup_grid_6_name: "",
    sensor_popup_grid_1_color: "#00FFFF",
    sensor_popup_grid_2_color: "#00FFFF",
    sensor_popup_grid_3_color: "#00FFFF",
    sensor_popup_grid_4_color: "#00FFFF",
    sensor_popup_grid_5_color: "#00FFFF",
    sensor_popup_grid_6_color: "#00FFFF",
    sensor_popup_grid_1_font_size: 12,
    sensor_popup_grid_2_font_size: 12,
    sensor_popup_grid_3_font_size: 12,
    sensor_popup_grid_4_font_size: 12,
    sensor_popup_grid_5_font_size: 12,
    sensor_popup_grid_6_font_size: 12,
    sensor_popup_inverter_1: "",
    sensor_popup_inverter_1_name: "",
    sensor_popup_inverter_2: "",
    sensor_popup_inverter_2_name: "",
    sensor_popup_inverter_3: "",
    sensor_popup_inverter_3_name: "",
    sensor_popup_inverter_4: "",
    sensor_popup_inverter_4_name: "",
    sensor_popup_inverter_5: "",
    sensor_popup_inverter_5_name: "",
    sensor_popup_inverter_6: "",
    sensor_popup_inverter_6_name: "",
    sensor_popup_inverter_1_color: "#00FFFF",
    sensor_popup_inverter_2_color: "#00FFFF",
    sensor_popup_inverter_3_color: "#00FFFF",
    sensor_popup_inverter_4_color: "#00FFFF",
    sensor_popup_inverter_5_color: "#00FFFF",
    sensor_popup_inverter_6_color: "#00FFFF",
    sensor_popup_inverter_1_font_size: 12,
    sensor_popup_inverter_2_font_size: 12,
    sensor_popup_inverter_3_font_size: 12,
    sensor_popup_inverter_4_font_size: 12,
    sensor_popup_inverter_5_font_size: 12,
    sensor_popup_inverter_6_font_size: 12,
    sensor_popup_house_1: "",
    sensor_popup_house_1_name: "",
    sensor_popup_house_2: "",
    sensor_popup_house_2_name: "",
    sensor_popup_house_3: "",
    sensor_popup_house_3_name: "",
    sensor_popup_house_4: "",
    sensor_popup_house_4_name: "",
    sensor_popup_house_5: "",
    sensor_popup_house_5_name: "",
    sensor_popup_house_6: "",
    sensor_popup_house_6_name: "",
    sensor_popup_house_1_color: "#00FFFF",
    sensor_popup_house_2_color: "#00FFFF",
    sensor_popup_house_3_color: "#00FFFF",
    sensor_popup_house_4_color: "#00FFFF",
    sensor_popup_house_5_color: "#00FFFF",
    sensor_popup_house_6_color: "#00FFFF",
    sensor_popup_house_1_font_size: 12,
    sensor_popup_house_2_font_size: 12,
    sensor_popup_house_3_font_size: 12,
    sensor_popup_house_4_font_size: 12,
    sensor_popup_house_5_font_size: 12,
    sensor_popup_house_6_font_size: 12,
    sensor_popup_car1_1: "",
    sensor_popup_car1_1_name: "",
    sensor_popup_car1_1_color: "#00FFFF",
    sensor_popup_car1_1_font_size: 12,
    sensor_popup_car1_2: "",
    sensor_popup_car1_2_name: "",
    sensor_popup_car1_2_color: "#00FFFF",
    sensor_popup_car1_2_font_size: 12,
    sensor_popup_car1_3: "",
    sensor_popup_car1_3_name: "",
    sensor_popup_car1_3_color: "#00FFFF",
    sensor_popup_car1_3_font_size: 12,
    sensor_popup_car1_4: "",
    sensor_popup_car1_4_name: "",
    sensor_popup_car1_4_color: "#00FFFF",
    sensor_popup_car1_4_font_size: 12,
    sensor_popup_car1_5: "",
    sensor_popup_car1_5_name: "",
    sensor_popup_car1_5_color: "#00FFFF",
    sensor_popup_car1_5_font_size: 12,
    sensor_popup_car1_6: "",
    sensor_popup_car1_6_name: "",
    sensor_popup_car1_6_color: "#00FFFF",
    sensor_popup_car1_6_font_size: 12,
    sensor_popup_car2_1: "",
    sensor_popup_car2_1_name: "",
    sensor_popup_car2_1_color: "#00FFFF",
    sensor_popup_car2_1_font_size: 12,
    sensor_popup_car2_2: "",
    sensor_popup_car2_2_name: "",
    sensor_popup_car2_2_color: "#00FFFF",
    sensor_popup_car2_2_font_size: 12,
    sensor_popup_car2_3: "",
    sensor_popup_car2_3_name: "",
    sensor_popup_car2_3_color: "#00FFFF",
    sensor_popup_car2_3_font_size: 12,
    sensor_popup_car2_4: "",
    sensor_popup_car2_4_name: "",
    sensor_popup_car2_4_color: "#00FFFF",
    sensor_popup_car2_4_font_size: 12,
    sensor_popup_car2_5: "",
    sensor_popup_car2_5_name: "",
    sensor_popup_car2_5_color: "#00FFFF",
    sensor_popup_car2_5_font_size: 12,
    sensor_popup_car2_6: "",
    sensor_popup_car2_6_name: "",
    sensor_popup_car2_6_color: "#00FFFF",
    sensor_popup_car2_6_font_size: 12,
  },
  overview: {
    pv_tot_color: "#00FFFF",
    pv_font_size: 28,
    sensor_solar_state: "",
    solar_state_producing_color: "#00ff00",
    solar_state_not_producing_color: "#ffff00",
    solar_state_font_size: 28,
    sensor_solar_forecast_today: "",
    sensor_solar_forecast_tomorrow: "",
    sensor_weather_forecast: "",
    sensor_pv_total: "",
    sensor_pv1: "",
    sensor_pv2: "",
    sensor_pv3: "",
    sensor_pv4: "",
    sensor_pv5: "",
    sensor_pv6: "",
    sensor_daily: "",
    pv_primary_color: "#00ff00",
    sensor_pv_total_secondary: "",
    sensor_pv_array2_1: "",
    sensor_pv_array2_2: "",
    sensor_pv_array2_3: "",
    sensor_pv_array2_4: "",
    sensor_pv_array2_5: "",
    sensor_pv_array2_6: "",
    sensor_daily_array2: "",
    pv_secondary_color: "#80ffff",
    battery_soc_font_size: 28,
    battery_power_font_size: 28,
    sensor_bat1_soc: "",
    sensor_bat1_power: "",
    sensor_bat1_charge_power: "",
    sensor_bat1_discharge_power: "",
    sensor_bat1_capacity_sensor: "",
    bat1_capacity_manual: "",
    bat1_reserve_percentage: 5,
    sensor_bat1_time_until: "",
    sensor_battery1_temp: "",
    sensor_bat2_soc: "",
    sensor_bat2_power: "",
    sensor_bat2_charge_power: "",
    sensor_bat2_discharge_power: "",
    sensor_bat2_capacity_sensor: "",
    bat2_capacity_manual: "",
    bat2_reserve_percentage: "",
    sensor_bat2_time_until: "",
    sensor_bat3_soc: "",
    sensor_bat3_power: "",
    sensor_bat3_charge_power: "",
    sensor_bat3_discharge_power: "",
    sensor_bat3_capacity_sensor: "",
    bat3_capacity_manual: "",
    bat3_reserve_percentage: "",
    sensor_bat3_time_until: "",
    sensor_bat4_soc: "",
    sensor_bat4_power: "",
    sensor_bat4_charge_power: "",
    sensor_bat4_discharge_power: "",
    sensor_bat4_capacity_sensor: "",
    bat4_capacity_manual: "",
    bat4_reserve_percentage: "",
    sensor_bat4_time_until: "",
    invert_battery: false,
    battery_charge_color: "#1129df",
    battery_discharge_color: "#ff8000",
    battery_state_fully_charged_color: "#00ff00",
    battery_state_charging_color: "#8000ff",
    battery_state_discharging_color: "#ff8000",
    battery_state_reserve_color: "#FF3333",
    battery_state_fully_discharged_color: "#FF3333",
    sensor_grid_power: "",
    sensor_grid_import: "",
    sensor_grid_export: "",
    sensor_grid_import_daily: "",
    sensor_grid_export_daily: "",
    grid_font_size: 28,
    grid_daily_font_size: 28,
    grid_import_color: "#FF3333",
    grid_export_color: "#00ff00",
    grid_activity_threshold: 100,
    grid_power_only: false,
    inv1_color: "#0080ff",
    sensor_grid2_power: "",
    sensor_grid2_import: "",
    sensor_grid2_export: "",
    sensor_grid2_import_daily: "",
    sensor_grid2_export_daily: "",
    sensor_grid_state: "",
    grid_state_importing_color: "#FF3333",
    grid_state_exporting_color: "#00ff00",
    grid_state_floating_color: "#FFFFFF",
    invert_grid: false,
    sensor_car_power: "",
    sensor_car_soc: "",
    sensor_car_range: "",
    sensor_car_state: "",
    sensor_car_hvac_status: "",
    sensor_car_outside_temp: "",
    sensor_car_inside_temp: "",
    sensor_car_ac_temp: "",
    car1_climate_entity: "",
    sensor_car2_power: "",
    sensor_car2_soc: "",
    sensor_car2_range: "",
    sensor_car2_state: "",
    sensor_car2_hvac_status: "",
    sensor_car2_outside_temp: "",
    sensor_car2_inside_temp: "",
    sensor_car2_ac_temp: "",
    car2_climate_entity: "",
    car1_label: "",
    car2_label: "",
    car_charging_color: "#00FF00",
    car_discharging_color: "#FF4444",
    car1_name_color: "#000000",
    car2_name_color: "#000000",
    car_name_plate_color: '#FFFFFF',
    car_name_plate_border_color: '#FFFFFF',
    car_name_plate_border_width: 1,
    car_name_font_color: '#000000',
    car_name_font_size: 18,
    car_power_font_size: 28,
    car_soc_font_size: 28,
    car2_power_font_size: 10,
    car2_soc_font_size: 28,
    sensor_home_load: "",
    load_font_size: 28,
    sensor_home_load_secondary: "",
    sensor_popup_pv_1: "",
    sensor_popup_pv_1_name: "",
    sensor_popup_pv_2: "",
    sensor_popup_pv_2_name: "",
    sensor_popup_pv_3: "",
    sensor_popup_pv_3_name: "",
    sensor_popup_pv_4: "",
    sensor_popup_pv_4_name: "",
    sensor_popup_pv_5: "",
    sensor_popup_pv_5_name: "",
    sensor_popup_pv_6: "",
    sensor_popup_pv_6_name: "",
    sensor_popup_bat_1: "",
    sensor_popup_bat_1_name: "",
    sensor_popup_bat_2: "",
    sensor_popup_bat_2_name: "",
    sensor_popup_bat_3: "",
    sensor_popup_bat_3_name: "",
    sensor_popup_bat_4: "",
    sensor_popup_bat_4_name: "",
    sensor_popup_bat_5: "",
    sensor_popup_bat_5_name: "",
    sensor_popup_bat_6: "",
    sensor_popup_bat_6_name: "",
    battery_popup_color: "#00FFFF",
    sensor_popup_grid_1: "",
    sensor_popup_grid_1_name: "",
    sensor_popup_grid_2: "",
    sensor_popup_grid_2_name: "",
    sensor_popup_grid_3: "",
    sensor_popup_grid_3_name: "",
    sensor_popup_grid_4: "",
    sensor_popup_grid_4_name: "",
    sensor_popup_grid_5: "",
    sensor_popup_grid_5_name: "",
    sensor_popup_grid_6: "",
    sensor_popup_grid_6_name: "",
    sensor_popup_house_1: "",
    sensor_popup_house_1_name: "",
    sensor_popup_house_2: "",
    sensor_popup_house_2_name: "",
    sensor_popup_house_3: "",
    sensor_popup_house_3_name: "",
    sensor_popup_house_4: "",
    sensor_popup_house_4_name: "",
    sensor_popup_house_5: "",
    sensor_popup_house_5_name: "",
    sensor_popup_house_6: "",
    sensor_popup_house_6_name: "",
    sensor_popup_car1_1: "",
    sensor_popup_car1_1_name: "",
    sensor_popup_car1_2: "",
    sensor_popup_car1_2_name: "",
    sensor_popup_car1_3: "",
    sensor_popup_car1_3_name: "",
    sensor_popup_car1_4: "",
    sensor_popup_car1_4_name: "",
    sensor_popup_car1_5: "",
    sensor_popup_car1_5_name: "",
    sensor_popup_car1_6: "",
    sensor_popup_car1_6_name: "",
    sensor_popup_car2_1: "",
    sensor_popup_car2_1_name: "",
    sensor_popup_car2_2: "",
    sensor_popup_car2_2_name: "",
    sensor_popup_car2_3: "",
    sensor_popup_car2_3_name: "",
    sensor_popup_car2_4: "",
    sensor_popup_car2_4_name: "",
    sensor_popup_car2_5: "",
    sensor_popup_car2_5_name: "",
    sensor_popup_car2_6: "",
    sensor_popup_car2_6_name: "",
    footer_update_interval: 5,
    footer_card1_slot1_entity: "",
    footer_card1_slot1_source: "custom",
    footer_card1_slot1_stat_type: "sum",
    footer_card1_slot1_label: "Solar Today",
    footer_card1_slot2_entity: "",
    footer_card1_slot2_source: "custom",
    footer_card1_slot2_stat_type: "sum",
    footer_card1_slot2_label: "House Today",
    footer_card2_slot1_entity: "",
    footer_card2_slot1_source: "custom",
    footer_card2_slot1_stat_type: "sum",
    footer_card2_slot1_label: "Solar Yesterday",
    footer_card2_slot2_entity: "",
    footer_card2_slot2_source: "custom",
    footer_card2_slot2_stat_type: "sum",
    footer_card2_slot2_label: "House Yesterday",
    footer_card3_slot1_entity: "",
    footer_card3_slot1_source: "custom",
    footer_card3_slot1_stat_type: "sum",
    footer_card3_slot1_label: "Today's Export",
    footer_card3_slot2_entity: "",
    footer_card3_slot2_source: "custom",
    footer_card3_slot2_stat_type: "sum",
    footer_card3_slot2_label: "Today's Import",
    footer_card4_slot1_entity: "",
    footer_card4_slot1_source: "custom",
    footer_card4_slot1_stat_type: "sum",
    footer_card4_slot1_label: "Weekly Export",
    footer_card4_slot2_entity: "",
    footer_card4_slot2_source: "custom",
    footer_card4_slot2_stat_type: "sum",
    footer_card4_slot2_label: "Weekly Import",
    footer_card5_slot1_entity: "",
    footer_card5_slot1_source: "custom",
    footer_card5_slot1_stat_type: "sum",
    footer_card5_slot1_label: "Month Export",
    footer_card5_slot2_entity: "",
    footer_card5_slot2_source: "custom",
    footer_card5_slot2_stat_type: "sum",
    footer_card5_slot2_label: "Month Import",
    footer_card6_slot1_entity: "",
    footer_card6_slot1_source: "custom",
    footer_card6_slot1_stat_type: "sum",
    footer_card6_slot1_label: "Year Export",
    footer_card6_slot2_entity: "",
    footer_card6_slot2_source: "custom",
    footer_card6_slot2_stat_type: "sum",
    footer_card6_slot2_label: "Year Import",
    card_label_color: "#ffffff",
    card_label_font_size: 28,
    card_value_color: "#00ffff",
    card_value_font_size: 28,
    card_background_color: "#000069",
    card_value_css: "",
    card_label_css: "",
    font_family: "Roboto Flex",
  }
};
export const PROFILE_SCHEMAS = {
  tech: {
    profileName: 'Tech',
    buildSchema(ctx) {
      const { define, fields, entitySelector, climateEntitySelector, popupEntitySelector, buildThresholdSelector } = ctx;
      return {
        pvCommon: define([
          { name: 'pv_tot_color', label: fields.pv_tot_color.label, helper: fields.pv_tot_color.helper, selector: { color_picker: {} }, default: '#00FFFF' },
          { name: 'pv_font_size', label: fields.pv_font_size.label, helper: fields.pv_font_size.helper, selector: { text: { mode: 'blur' } } },
        ]),
        array1: define([
          { name: 'sensor_pv_total', label: fields.sensor_pv_total.label, helper: fields.sensor_pv_total.helper, selector: entitySelector },
          { name: 'sensor_pv1', label: fields.sensor_pv1.label, helper: fields.sensor_pv1.helper, selector: entitySelector },
          { name: 'sensor_pv2', label: fields.sensor_pv2.label, helper: fields.sensor_pv2.helper, selector: entitySelector },
          { name: 'sensor_pv3', label: fields.sensor_pv3.label, helper: fields.sensor_pv3.helper, selector: entitySelector },
          { name: 'sensor_pv4', label: fields.sensor_pv4.label, helper: fields.sensor_pv4.helper, selector: entitySelector },
          { name: 'sensor_pv5', label: fields.sensor_pv5.label, helper: fields.sensor_pv5.helper, selector: entitySelector },
          { name: 'sensor_pv6', label: fields.sensor_pv6.label, helper: fields.sensor_pv6.helper, selector: entitySelector },
          { name: 'sensor_daily', label: fields.sensor_daily.label, helper: fields.sensor_daily.helper, selector: entitySelector },
          { name: 'pv_primary_color', label: fields.pv_primary_color.label, helper: fields.pv_primary_color.helper, selector: { color_picker: {} } },
        ]),
        array2: define([
          { name: 'sensor_pv_total_secondary', label: fields.sensor_pv_total_secondary.label, helper: fields.sensor_pv_total_secondary.helper, selector: entitySelector },
          { name: 'sensor_pv_array2_1', label: fields.sensor_pv_array2_1.label, helper: fields.sensor_pv_array2_1.helper, selector: entitySelector },
          { name: 'sensor_pv_array2_2', label: fields.sensor_pv_array2_2.label, helper: fields.sensor_pv_array2_2.helper, selector: entitySelector },
          { name: 'sensor_pv_array2_3', label: fields.sensor_pv_array2_3.label, helper: fields.sensor_pv_array2_3.helper, selector: entitySelector },
          { name: 'sensor_pv_array2_4', label: fields.sensor_pv_array2_4.label, helper: fields.sensor_pv_array2_4.helper, selector: entitySelector },
          { name: 'sensor_pv_array2_5', label: fields.sensor_pv_array2_5.label, helper: fields.sensor_pv_array2_5.helper, selector: entitySelector },
          { name: 'sensor_pv_array2_6', label: fields.sensor_pv_array2_6.label, helper: fields.sensor_pv_array2_6.helper, selector: entitySelector },
          { name: 'sensor_daily_array2', label: fields.sensor_daily_array2.label, helper: fields.sensor_daily_array2.helper, selector: entitySelector },
          { name: 'pv_secondary_color', label: fields.pv_secondary_color.label, helper: fields.pv_secondary_color.helper, selector: { color_picker: {} } },
        ]),
        windmill: define([
          { name: 'sensor_windmill_total', label: fields.sensor_windmill_total.label, helper: fields.sensor_windmill_total.helper, selector: entitySelector },
          { name: 'sensor_windmill_daily', label: fields.sensor_windmill_daily.label, helper: fields.sensor_windmill_daily.helper, selector: entitySelector },
          { name: 'windmill_flow_color', label: fields.windmill_flow_color.label, helper: fields.windmill_flow_color.helper, selector: { color_picker: {} } },
          { name: 'windmill_text_color', label: fields.windmill_text_color.label, helper: fields.windmill_text_color.helper, selector: { color_picker: {} } },
          { name: 'windmill_power_font_size', label: fields.windmill_power_font_size.label, helper: fields.windmill_power_font_size.helper, selector: { text: { mode: 'blur' } } },
        ]),
        battery: define([
          { name: 'sensor_bat1_soc', label: fields.sensor_bat1_soc.label, helper: fields.sensor_bat1_soc.helper, selector: entitySelector },
          { name: 'sensor_bat1_power', label: fields.sensor_bat1_power.label, helper: fields.sensor_bat1_power.helper, selector: entitySelector },
          { name: 'sensor_bat1_charge_power', label: fields.sensor_bat1_charge_power.label, helper: fields.sensor_bat1_charge_power.helper, selector: entitySelector },
          { name: 'sensor_bat1_discharge_power', label: fields.sensor_bat1_discharge_power.label, helper: fields.sensor_bat1_discharge_power.helper, selector: entitySelector },
          { name: 'sensor_bat1_capacity_sensor', label: fields.sensor_bat1_capacity_sensor.label, helper: fields.sensor_bat1_capacity_sensor.helper, selector: entitySelector },
          { name: 'bat1_capacity_manual', label: fields.bat1_capacity_manual.label, helper: fields.bat1_capacity_manual.helper, selector: { text: { mode: 'blur' } } },
          { name: 'bat1_reserve_percentage', label: fields.bat1_reserve_percentage.label, helper: fields.bat1_reserve_percentage.helper, selector: { number: { min: 0, max: 100, step: 1, unit_of_measurement: '%' } } },
          { name: 'sensor_bat1_time_until', label: fields.sensor_bat1_time_until.label, helper: fields.sensor_bat1_time_until.helper, selector: entitySelector },
          { name: 'sensor_battery1_temp', label: fields.sensor_battery1_temp.label, helper: fields.sensor_battery1_temp.helper, selector: entitySelector },
          { name: 'battery1_temp_font_size', label: fields.battery1_temp_font_size.label, helper: fields.battery1_temp_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'battery1_temp_color', label: fields.battery1_temp_color.label, helper: fields.battery1_temp_color.helper, selector: { color_picker: {} } },
          { type: 'divider' },
          { name: 'sensor_bat2_soc', label: fields.sensor_bat2_soc.label, helper: fields.sensor_bat2_soc.helper, selector: entitySelector },
          { name: 'sensor_bat2_power', label: fields.sensor_bat2_power.label, helper: fields.sensor_bat2_power.helper, selector: entitySelector },
          { name: 'sensor_bat2_charge_power', label: fields.sensor_bat2_charge_power.label, helper: fields.sensor_bat2_charge_power.helper, selector: entitySelector },
          { name: 'sensor_bat2_discharge_power', label: fields.sensor_bat2_discharge_power.label, helper: fields.sensor_bat2_discharge_power.helper, selector: entitySelector },
          { name: 'sensor_bat2_capacity_sensor', label: fields.sensor_bat2_capacity_sensor.label, helper: fields.sensor_bat2_capacity_sensor.helper, selector: entitySelector },
          { name: 'bat2_capacity_manual', label: fields.bat2_capacity_manual.label, helper: fields.bat2_capacity_manual.helper, selector: { text: { mode: 'blur' } } },
          { name: 'bat2_reserve_percentage', label: fields.bat2_reserve_percentage.label, helper: fields.bat2_reserve_percentage.helper, selector: { number: { min: 0, max: 100, step: 1, unit_of_measurement: '%' } } },
          { name: 'sensor_bat2_time_until', label: fields.sensor_bat2_time_until.label, helper: fields.sensor_bat2_time_until.helper, selector: entitySelector },
          { type: 'divider' },
          { name: 'sensor_bat3_soc', label: fields.sensor_bat3_soc.label, helper: fields.sensor_bat3_soc.helper, selector: entitySelector },
          { name: 'sensor_bat3_power', label: fields.sensor_bat3_power.label, helper: fields.sensor_bat3_power.helper, selector: entitySelector },
          { name: 'sensor_bat3_charge_power', label: fields.sensor_bat3_charge_power.label, helper: fields.sensor_bat3_charge_power.helper, selector: entitySelector },
          { name: 'sensor_bat3_discharge_power', label: fields.sensor_bat3_discharge_power.label, helper: fields.sensor_bat3_discharge_power.helper, selector: entitySelector },
          { name: 'sensor_bat3_capacity_sensor', label: fields.sensor_bat3_capacity_sensor.label, helper: fields.sensor_bat3_capacity_sensor.helper, selector: entitySelector },
          { name: 'bat3_capacity_manual', label: fields.bat3_capacity_manual.label, helper: fields.bat3_capacity_manual.helper, selector: { text: { mode: 'blur' } } },
          { name: 'bat3_reserve_percentage', label: fields.bat3_reserve_percentage.label, helper: fields.bat3_reserve_percentage.helper, selector: { number: { min: 0, max: 100, step: 1, unit_of_measurement: '%' } } },
          { name: 'sensor_bat3_time_until', label: fields.sensor_bat3_time_until.label, helper: fields.sensor_bat3_time_until.helper, selector: entitySelector },
          { type: 'divider' },
          { name: 'sensor_bat4_soc', label: fields.sensor_bat4_soc.label, helper: fields.sensor_bat4_soc.helper, selector: entitySelector },
          { name: 'sensor_bat4_power', label: fields.sensor_bat4_power.label, helper: fields.sensor_bat4_power.helper, selector: entitySelector },
          { name: 'sensor_bat4_charge_power', label: fields.sensor_bat4_charge_power.label, helper: fields.sensor_bat4_charge_power.helper, selector: entitySelector },
          { name: 'sensor_bat4_discharge_power', label: fields.sensor_bat4_discharge_power.label, helper: fields.sensor_bat4_discharge_power.helper, selector: entitySelector },
          { name: 'sensor_bat4_capacity_sensor', label: fields.sensor_bat4_capacity_sensor.label, helper: fields.sensor_bat4_capacity_sensor.helper, selector: entitySelector },
          { name: 'bat4_capacity_manual', label: fields.bat4_capacity_manual.label, helper: fields.bat4_capacity_manual.helper, selector: { text: { mode: 'blur' } } },
          { name: 'bat4_reserve_percentage', label: fields.bat4_reserve_percentage.label, helper: fields.bat4_reserve_percentage.helper, selector: { number: { min: 0, max: 100, step: 1, unit_of_measurement: '%' } } },
          { name: 'sensor_bat4_time_until', label: fields.sensor_bat4_time_until.label, helper: fields.sensor_bat4_time_until.helper, selector: entitySelector },
          { type: 'divider' },
          { name: 'invert_battery', label: fields.invert_battery.label, helper: fields.invert_battery.helper, selector: { boolean: {} } },
          { name: 'battery_soc_color', label: fields.battery_soc_color.label, helper: fields.battery_soc_color.helper, selector: { color_picker: {} } },
          { name: 'battery_charge_color', label: fields.battery_charge_color.label, helper: fields.battery_charge_color.helper, selector: { color_picker: {} } },
          { name: 'battery_discharge_color', label: fields.battery_discharge_color.label, helper: fields.battery_discharge_color.helper, selector: { color_picker: {} } },
          { name: 'battery_fill_high_color', label: fields.battery_fill_high_color.label, helper: fields.battery_fill_high_color.helper, selector: { color_picker: {} } },
          { name: 'battery_fill_low_color', label: fields.battery_fill_low_color.label, helper: fields.battery_fill_low_color.helper, selector: { color_picker: {} } },
          { name: 'battery_fill_low_threshold', label: fields.battery_fill_low_threshold.label, helper: fields.battery_fill_low_threshold.helper, selector: { number: { min: 0, max: 100, step: 1, unit_of_measurement: '%' } }, default: DEFAULT_BATTERY_LOW_THRESHOLD },
          { name: 'battery_fill_opacity', label: fields.battery_fill_opacity.label, helper: fields.battery_fill_opacity.helper, selector: { number: { min: 0, max: 1, step: 0.05, mode: 'box' } }, default: 1 },
          { name: 'battery_soc_font_size', label: fields.battery_soc_font_size.label, helper: fields.battery_soc_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'battery_power_font_size', label: fields.battery_power_font_size.label, helper: fields.battery_power_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'battery_time_until_color', label: fields.battery_time_until_color.label, helper: fields.battery_time_until_color.helper, selector: { color_picker: {} } },
          { name: 'battery_time_until_font_size', label: fields.battery_time_until_font_size.label, helper: fields.battery_time_until_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'battery_state_font_size', label: fields.battery_state_font_size.label, helper: fields.battery_state_font_size.helper, selector: { text: { mode: 'blur' } } },
          { type: 'divider' },
          { name: 'inv1_datetime_color', label: fields.inv1_datetime_color.label, helper: fields.inv1_datetime_color.helper, selector: { color_picker: {} } },
          { name: 'inv1_datetime_font_size', label: fields.inv1_datetime_font_size.label, helper: fields.inv1_datetime_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'inv1_timeuntil_color', label: fields.inv1_timeuntil_color.label, helper: fields.inv1_timeuntil_color.helper, selector: { color_picker: {} } },
          { name: 'inv1_timeuntil_font_size', label: fields.inv1_timeuntil_font_size.label, helper: fields.inv1_timeuntil_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'inv2_datetime_color', label: fields.inv2_datetime_color.label, helper: fields.inv2_datetime_color.helper, selector: { color_picker: {} } },
          { name: 'inv2_datetime_font_size', label: fields.inv2_datetime_font_size.label, helper: fields.inv2_datetime_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'inv2_timeuntil_color', label: fields.inv2_timeuntil_color.label, helper: fields.inv2_timeuntil_color.helper, selector: { color_picker: {} } },
          { name: 'inv2_timeuntil_font_size', label: fields.inv2_timeuntil_font_size.label, helper: fields.inv2_timeuntil_font_size.helper, selector: { text: { mode: 'blur' } } },
        ]),
        grid: define([
          { name: 'sensor_grid_power', label: fields.sensor_grid_power.label, helper: fields.sensor_grid_power.helper, selector: entitySelector },
          { name: 'sensor_grid_import', label: fields.sensor_grid_import.label, helper: fields.sensor_grid_import.helper, selector: entitySelector },
          { name: 'sensor_grid_export', label: fields.sensor_grid_export.label, helper: fields.sensor_grid_export.helper, selector: entitySelector },
          { name: 'sensor_grid_import_daily', label: fields.sensor_grid_import_daily.label, helper: fields.sensor_grid_import_daily.helper, selector: entitySelector },
          { name: 'sensor_grid_export_daily', label: fields.sensor_grid_export_daily.label, helper: fields.sensor_grid_export_daily.helper, selector: entitySelector },
          { name: 'grid_import_color', label: fields.grid_import_color.label, helper: fields.grid_import_color.helper, selector: { color_picker: {} } },
          { name: 'grid_export_color', label: fields.grid_export_color.label, helper: fields.grid_export_color.helper, selector: { color_picker: {} } },
          { name: 'grid_activity_threshold', label: fields.grid_activity_threshold.label, helper: fields.grid_activity_threshold.helper, selector: { number: { min: 0, max: 100000, step: 10 } }, default: DEFAULT_GRID_ACTIVITY_THRESHOLD },
          { name: 'grid_power_only', label: fields.grid_power_only.label, helper: fields.grid_power_only.helper, selector: { boolean: {} }, default: false },
          { name: 'grid_threshold_warning', label: fields.grid_threshold_warning.label, helper: fields.grid_threshold_warning.helper, selector: buildThresholdSelector(), default: null },
          { name: 'grid_warning_color', label: fields.grid_warning_color.label, helper: fields.grid_warning_color.helper, selector: { color_picker: {} } },
          { name: 'grid_threshold_critical', label: fields.grid_threshold_critical.label, helper: fields.grid_threshold_critical.helper, selector: buildThresholdSelector(), default: null },
          { name: 'grid_critical_color', label: fields.grid_critical_color.label, helper: fields.grid_critical_color.helper, selector: { color_picker: {} } },
          { name: 'inv1_color', label: fields.inv1_color.label, helper: fields.inv1_color.helper, selector: { color_picker: {} }, default: '#0080ff' },
          { type: 'divider' },
          { name: 'sensor_grid2_power', label: fields.sensor_grid2_power.label, helper: fields.sensor_grid2_power.helper, selector: entitySelector },
          { name: 'sensor_grid2_import', label: fields.sensor_grid2_import.label, helper: fields.sensor_grid2_import.helper, selector: entitySelector },
          { name: 'sensor_grid2_export', label: fields.sensor_grid2_export.label, helper: fields.sensor_grid2_export.helper, selector: entitySelector },
          { name: 'sensor_grid2_import_daily', label: fields.sensor_grid2_import_daily.label, helper: fields.sensor_grid2_import_daily.helper, selector: entitySelector },
          { name: 'sensor_grid2_export_daily', label: fields.sensor_grid2_export_daily.label, helper: fields.sensor_grid2_export_daily.helper, selector: entitySelector },
          { name: 'grid2_import_color', label: fields.grid2_import_color.label, helper: fields.grid2_import_color.helper, selector: { color_picker: {} } },
          { name: 'grid2_export_color', label: fields.grid2_export_color.label, helper: fields.grid2_export_color.helper, selector: { color_picker: {} } },
          { name: 'grid2_threshold_warning', label: fields.grid2_threshold_warning.label, helper: fields.grid2_threshold_warning.helper, selector: buildThresholdSelector(), default: null },
          { name: 'grid2_warning_color', label: fields.grid2_warning_color.label, helper: fields.grid2_warning_color.helper, selector: { color_picker: {} } },
          { name: 'grid2_threshold_critical', label: fields.grid2_threshold_critical.label, helper: fields.grid2_threshold_critical.helper, selector: buildThresholdSelector(), default: null },
          { name: 'grid2_critical_color', label: fields.grid2_critical_color.label, helper: fields.grid2_critical_color.helper, selector: { color_picker: {} } },
          { name: 'inv2_color', label: fields.inv2_color.label, helper: fields.inv2_color.helper, selector: { color_picker: {} }, default: '#0080ff' },
          { type: 'divider' },
          { name: 'show_daily_grid', label: fields.show_daily_grid.label, helper: fields.show_daily_grid.helper, selector: { boolean: {} } },
          { name: 'grid_font_size', label: fields.grid_font_size.label, helper: fields.grid_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'grid_daily_font_size', label: fields.grid_daily_font_size.label, helper: fields.grid_daily_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'show_grid_flow_label', label: fields.show_grid_flow_label.label, helper: fields.show_grid_flow_label.helper, selector: { boolean: {} } },
          { name: 'sensor_grid_state', label: fields.sensor_grid_state.label, helper: fields.sensor_grid_state.helper, selector: entitySelector },
          { name: 'inverter1_status_text_color', label: fields.inverter1_status_text_color.label, helper: fields.inverter1_status_text_color.helper, selector: { color_picker: {} } },
          { name: 'inverter1_status_font_size', label: fields.inverter1_status_font_size.label, helper: fields.inverter1_status_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'sensor_inverter1_temp', label: fields.sensor_inverter1_temp.label, helper: fields.sensor_inverter1_temp.helper, selector: entitySelector },
          { name: 'inverter1_temp_font_size', label: fields.inverter1_temp_font_size.label, helper: fields.inverter1_temp_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'inverter1_temp_color', label: fields.inverter1_temp_color.label, helper: fields.inverter1_temp_color.helper, selector: { color_picker: {} } },
          { name: 'invert_grid', label: fields.invert_grid.label, helper: fields.invert_grid.helper, selector: { boolean: {} } },
          { name: 'inv2_color', label: fields.inv2_color.label, helper: fields.inv2_color.helper, selector: { color_picker: {} }, default: '#0080ff' },
        ]),
        car: define([
          { name: 'sensor_car_power', label: fields.sensor_car_power.label, helper: fields.sensor_car_power.helper, selector: entitySelector },
          { name: 'sensor_car_soc', label: fields.sensor_car_soc.label, helper: fields.sensor_car_soc.helper, selector: entitySelector },
          { name: 'car1_climate_entity', label: fields.car1_climate_entity.label, helper: fields.car1_climate_entity.helper, selector: climateEntitySelector },
          { name: 'sensor_car2_power', label: fields.sensor_car2_power.label, helper: fields.sensor_car2_power.helper, selector: entitySelector },
          { name: 'sensor_car2_soc', label: fields.sensor_car2_soc.label, helper: fields.sensor_car2_soc.helper, selector: entitySelector },
          { name: 'car2_climate_entity', label: fields.car2_climate_entity.label, helper: fields.car2_climate_entity.helper, selector: climateEntitySelector },
          { name: 'car1_label', label: fields.car1_label.label, helper: fields.car1_label.helper, selector: { text: { mode: 'blur' } } },
          { name: 'car2_label', label: fields.car2_label.label, helper: fields.car2_label.helper, selector: { text: { mode: 'blur' } } },
          { name: 'car_headlight_flash', label: fields.car_headlight_flash.label, helper: fields.car_headlight_flash.helper, selector: { boolean: {} } },
          { name: 'car1_glow_brightness', label: fields.car1_glow_brightness.label, helper: fields.car1_glow_brightness.helper, selector: { number: { min: 0, max: 100, step: 1, mode: 'box', unit_of_measurement: '%' } }, default: 50 },
          { name: 'car2_glow_brightness', label: fields.car2_glow_brightness.label, helper: fields.car2_glow_brightness.helper, selector: { number: { min: 0, max: 100, step: 1, mode: 'box', unit_of_measurement: '%' } }, default: 50 },
          { name: 'car_flow_color', label: fields.car_flow_color.label, helper: fields.car_flow_color.helper, selector: { color_picker: {} } },
          { name: 'car_pct_color', label: fields.car_pct_color.label, helper: fields.car_pct_color.helper, selector: { color_picker: {} }, default: '#00FFFF' },
          { name: 'car2_pct_color', label: fields.car2_pct_color.label, helper: fields.car2_pct_color.helper, selector: { color_picker: {} }, default: '#00FFFF' },
          { name: 'car1_name_color', label: fields.car1_name_color.label, helper: fields.car1_name_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
          { name: 'car2_name_color', label: fields.car2_name_color.label, helper: fields.car2_name_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
          { name: 'car1_color', label: fields.car1_color.label, helper: fields.car1_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
          { name: 'car2_color', label: fields.car2_color.label, helper: fields.car2_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
          { name: 'car_power_font_size', label: fields.car_power_font_size.label, helper: fields.car_power_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'car2_power_font_size', label: (fields.car2_power_font_size && fields.car2_power_font_size.label) || '', helper: (fields.car2_power_font_size && fields.car2_power_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
          { name: 'car_name_font_size', label: (fields.car_name_font_size && fields.car_name_font_size.label) || '', helper: (fields.car_name_font_size && fields.car_name_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
          { name: 'car2_name_font_size', label: (fields.car2_name_font_size && fields.car2_name_font_size.label) || '', helper: (fields.car2_name_font_size && fields.car2_name_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
          { name: 'car_soc_font_size', label: (fields.car_soc_font_size && fields.car_soc_font_size.label) || '', helper: (fields.car_soc_font_size && fields.car_soc_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
          { name: 'car2_soc_font_size', label: (fields.car2_soc_font_size && fields.car2_soc_font_size.label) || '', helper: (fields.car2_soc_font_size && fields.car2_soc_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        ]),
        other: define([
          { name: 'sensor_home_load', label: fields.sensor_home_load.label, helper: fields.sensor_home_load.helper, selector: entitySelector },
          { name: 'sensor_home_load_secondary', label: fields.sensor_home_load_secondary.label, helper: fields.sensor_home_load_secondary.helper, selector: entitySelector },
          { name: 'sensor_heat_pump_consumption', label: fields.sensor_heat_pump_consumption.label, helper: fields.sensor_heat_pump_consumption.helper, selector: entitySelector },
          { name: 'sensor_hot_water_consumption', label: fields.sensor_hot_water_consumption.label, helper: fields.sensor_hot_water_consumption.helper, selector: entitySelector },
          { name: 'heat_pump_label', label: (fields.heat_pump_label && fields.heat_pump_label.label) || 'Heat Pump/AC Label', helper: (fields.heat_pump_label && fields.heat_pump_label.helper) || 'Optional. Overrides the static label shown next to the heat pump value (data-role="heat-pump-power-text"). If empty, built-in translations are used.', selector: { text: { mode: 'blur' } }, default: '' },
          { name: 'sensor_pool_consumption', label: fields.sensor_pool_consumption.label, helper: fields.sensor_pool_consumption.helper, selector: entitySelector },
          { name: 'sensor_washing_machine_consumption', label: fields.sensor_washing_machine_consumption.label, helper: fields.sensor_washing_machine_consumption.helper, selector: entitySelector },
          { name: 'sensor_dishwasher_consumption', label: fields.sensor_dishwasher_consumption.label, helper: fields.sensor_dishwasher_consumption.helper, selector: entitySelector },
          { name: 'sensor_dryer_consumption', label: fields.sensor_dryer_consumption.label, helper: fields.sensor_dryer_consumption.helper, selector: entitySelector },
          { name: 'sensor_refrigerator_consumption', label: fields.sensor_refrigerator_consumption.label, helper: fields.sensor_refrigerator_consumption.helper, selector: entitySelector },
          { name: 'sensor_freezer_consumption', label: fields.sensor_freezer_consumption.label, helper: fields.sensor_freezer_consumption.helper, selector: entitySelector },
          { name: 'heat_pump_text_color', label: fields.heat_pump_text_color.label, helper: fields.heat_pump_text_color.helper, selector: { color_picker: {} }, default: '#FFA500' },
          { name: 'pool_flow_color', label: fields.pool_flow_color.label, helper: fields.pool_flow_color.helper, selector: { color_picker: {} }, default: '#0080ff' },
          { name: 'pool_text_color', label: fields.pool_text_color.label, helper: fields.pool_text_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
          { name: 'hot_water_text_color', label: fields.hot_water_text_color.label, helper: fields.hot_water_text_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
          { name: 'washing_machine_text_color', label: fields.washing_machine_text_color.label, helper: fields.washing_machine_text_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
          { name: 'dishwasher_text_color', label: fields.dishwasher_text_color.label, helper: fields.dishwasher_text_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
          { name: 'dryer_text_color', label: fields.dryer_text_color.label, helper: fields.dryer_text_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
          { name: 'refrigerator_text_color', label: fields.refrigerator_text_color.label, helper: fields.refrigerator_text_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
          { name: 'freezer_text_color', label: fields.freezer_text_color.label, helper: fields.freezer_text_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
          { name: 'load_flow_color', label: fields.load_flow_color.label, helper: fields.load_flow_color.helper, selector: { color_picker: {} } },
          { name: 'load_text_color', label: fields.load_text_color.label, helper: fields.load_text_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
          { name: 'house_total_color', label: fields.house_total_color.label, helper: fields.house_total_color.helper, selector: { color_picker: {} }, default: '#00FFFF' },
          { name: 'load_threshold_warning', label: fields.load_threshold_warning.label, helper: fields.load_threshold_warning.helper, selector: buildThresholdSelector(), default: null },
          { name: 'load_warning_color', label: fields.load_warning_color.label, helper: fields.load_warning_color.helper, selector: { color_picker: {} } },
          { name: 'load_threshold_critical', label: fields.load_threshold_critical.label, helper: fields.load_threshold_critical.helper, selector: buildThresholdSelector(), default: null },
          { name: 'load_critical_color', label: fields.load_critical_color.label, helper: fields.load_critical_color.helper, selector: { color_picker: {} } },
          { name: 'heat_pump_font_size', label: fields.heat_pump_font_size.label, helper: fields.heat_pump_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'pool_font_size', label: fields.pool_font_size.label, helper: fields.pool_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'hot_water_font_size', label: fields.hot_water_font_size.label, helper: fields.hot_water_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'washing_machine_font_size', label: fields.washing_machine_font_size.label, helper: fields.washing_machine_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'dishwasher_font_size', label: fields.dishwasher_font_size.label, helper: fields.dishwasher_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'dryer_font_size', label: fields.dryer_font_size.label, helper: fields.dryer_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'refrigerator_font_size', label: fields.refrigerator_font_size.label, helper: fields.refrigerator_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'freezer_font_size', label: fields.freezer_font_size.label, helper: fields.freezer_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'load_font_size', label: fields.load_font_size.label, helper: fields.load_font_size.helper, selector: { text: { mode: 'blur' } } },
        ]),
        pvPopup: define([
          { name: 'sensor_popup_pv_1', label: (fields.sensor_popup_pv_1 && fields.sensor_popup_pv_1.label) || '', helper: (fields.sensor_popup_pv_1 && fields.sensor_popup_pv_1.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_pv_1_name', label: (fields.sensor_popup_pv_1_name && fields.sensor_popup_pv_1_name.label) || '', helper: (fields.sensor_popup_pv_1_name && fields.sensor_popup_pv_1_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_pv_2', label: (fields.sensor_popup_pv_2 && fields.sensor_popup_pv_2.label) || '', helper: (fields.sensor_popup_pv_2 && fields.sensor_popup_pv_2.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_pv_2_name', label: (fields.sensor_popup_pv_2_name && fields.sensor_popup_pv_2_name.label) || '', helper: (fields.sensor_popup_pv_2_name && fields.sensor_popup_pv_2_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_pv_3', label: (fields.sensor_popup_pv_3 && fields.sensor_popup_pv_3.label) || '', helper: (fields.sensor_popup_pv_3 && fields.sensor_popup_pv_3.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_pv_3_name', label: (fields.sensor_popup_pv_3_name && fields.sensor_popup_pv_3_name.label) || '', helper: (fields.sensor_popup_pv_3_name && fields.sensor_popup_pv_3_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_pv_4', label: (fields.sensor_popup_pv_4 && fields.sensor_popup_pv_4.label) || '', helper: (fields.sensor_popup_pv_4 && fields.sensor_popup_pv_4.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_pv_4_name', label: (fields.sensor_popup_pv_4_name && fields.sensor_popup_pv_4_name.label) || '', helper: (fields.sensor_popup_pv_4_name && fields.sensor_popup_pv_4_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_pv_5', label: (fields.sensor_popup_pv_5 && fields.sensor_popup_pv_5.label) || '', helper: (fields.sensor_popup_pv_5 && fields.sensor_popup_pv_5.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_pv_5_name', label: (fields.sensor_popup_pv_5_name && fields.sensor_popup_pv_5_name.label) || '', helper: (fields.sensor_popup_pv_5_name && fields.sensor_popup_pv_5_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_pv_6', label: (fields.sensor_popup_pv_6 && fields.sensor_popup_pv_6.label) || '', helper: (fields.sensor_popup_pv_6 && fields.sensor_popup_pv_6.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_pv_6_name', label: (fields.sensor_popup_pv_6_name && fields.sensor_popup_pv_6_name.label) || '', helper: (fields.sensor_popup_pv_6_name && fields.sensor_popup_pv_6_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_pv_1_color', label: (fields.sensor_popup_pv_1_color && fields.sensor_popup_pv_1_color.label) || '', helper: (fields.sensor_popup_pv_1_color && fields.sensor_popup_pv_1_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_pv_2_color', label: (fields.sensor_popup_pv_2_color && fields.sensor_popup_pv_2_color.label) || '', helper: (fields.sensor_popup_pv_2_color && fields.sensor_popup_pv_2_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_pv_3_color', label: (fields.sensor_popup_pv_3_color && fields.sensor_popup_pv_3_color.label) || '', helper: (fields.sensor_popup_pv_3_color && fields.sensor_popup_pv_3_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_pv_4_color', label: (fields.sensor_popup_pv_4_color && fields.sensor_popup_pv_4_color.label) || '', helper: (fields.sensor_popup_pv_4_color && fields.sensor_popup_pv_4_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_pv_5_color', label: (fields.sensor_popup_pv_5_color && fields.sensor_popup_pv_5_color.label) || '', helper: (fields.sensor_popup_pv_5_color && fields.sensor_popup_pv_5_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_pv_6_color', label: (fields.sensor_popup_pv_6_color && fields.sensor_popup_pv_6_color.label) || '', helper: (fields.sensor_popup_pv_6_color && fields.sensor_popup_pv_6_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_pv_1_font_size', label: (fields.sensor_popup_pv_1_font_size && fields.sensor_popup_pv_1_font_size.label) || '', helper: (fields.sensor_popup_pv_1_font_size && fields.sensor_popup_pv_1_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_pv_2_font_size', label: (fields.sensor_popup_pv_2_font_size && fields.sensor_popup_pv_2_font_size.label) || '', helper: (fields.sensor_popup_pv_2_font_size && fields.sensor_popup_pv_2_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_pv_3_font_size', label: (fields.sensor_popup_pv_3_font_size && fields.sensor_popup_pv_3_font_size.label) || '', helper: (fields.sensor_popup_pv_3_font_size && fields.sensor_popup_pv_3_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_pv_4_font_size', label: (fields.sensor_popup_pv_4_font_size && fields.sensor_popup_pv_4_font_size.label) || '', helper: (fields.sensor_popup_pv_4_font_size && fields.sensor_popup_pv_4_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_pv_5_font_size', label: (fields.sensor_popup_pv_5_font_size && fields.sensor_popup_pv_5_font_size.label) || '', helper: (fields.sensor_popup_pv_5_font_size && fields.sensor_popup_pv_5_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_pv_6_font_size', label: (fields.sensor_popup_pv_6_font_size && fields.sensor_popup_pv_6_font_size.label) || '', helper: (fields.sensor_popup_pv_6_font_size && fields.sensor_popup_pv_6_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
        ]),
        batteryPopup: define([
          { name: 'sensor_popup_bat_1', label: (fields.sensor_popup_bat_1 && fields.sensor_popup_bat_1.label) || '', helper: (fields.sensor_popup_bat_1 && fields.sensor_popup_bat_1.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_bat_1_name', label: (fields.sensor_popup_bat_1_name && fields.sensor_popup_bat_1_name.label) || '', helper: (fields.sensor_popup_bat_1_name && fields.sensor_popup_bat_1_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_bat_2', label: (fields.sensor_popup_bat_2 && fields.sensor_popup_bat_2.label) || '', helper: (fields.sensor_popup_bat_2 && fields.sensor_popup_bat_2.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_bat_2_name', label: (fields.sensor_popup_bat_2_name && fields.sensor_popup_bat_2_name.label) || '', helper: (fields.sensor_popup_bat_2_name && fields.sensor_popup_bat_2_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_bat_3', label: (fields.sensor_popup_bat_3 && fields.sensor_popup_bat_3.label) || '', helper: (fields.sensor_popup_bat_3 && fields.sensor_popup_bat_3.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_bat_3_name', label: (fields.sensor_popup_bat_3_name && fields.sensor_popup_bat_3_name.label) || '', helper: (fields.sensor_popup_bat_3_name && fields.sensor_popup_bat_3_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_bat_4', label: (fields.sensor_popup_bat_4 && fields.sensor_popup_bat_4.label) || '', helper: (fields.sensor_popup_bat_4 && fields.sensor_popup_bat_4.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_bat_4_name', label: (fields.sensor_popup_bat_4_name && fields.sensor_popup_bat_4_name.label) || '', helper: (fields.sensor_popup_bat_4_name && fields.sensor_popup_bat_4_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_bat_5', label: (fields.sensor_popup_bat_5 && fields.sensor_popup_bat_5.label) || '', helper: (fields.sensor_popup_bat_5 && fields.sensor_popup_bat_5.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_bat_5_name', label: (fields.sensor_popup_bat_5_name && fields.sensor_popup_bat_5_name.label) || '', helper: (fields.sensor_popup_bat_5_name && fields.sensor_popup_bat_5_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_bat_6', label: (fields.sensor_popup_bat_6 && fields.sensor_popup_bat_6.label) || '', helper: (fields.sensor_popup_bat_6 && fields.sensor_popup_bat_6.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_bat_6_name', label: (fields.sensor_popup_bat_6_name && fields.sensor_popup_bat_6_name.label) || '', helper: (fields.sensor_popup_bat_6_name && fields.sensor_popup_bat_6_name.helper) || '', selector: { text: {} } },
          { name: 'battery_popup_color', label: (fields.battery_popup_color && fields.battery_popup_color.label) || '', helper: (fields.battery_popup_color && fields.battery_popup_color.helper) || '', selector: { color_picker: {} }, default: '#00FFFF' },
          { name: 'battery_popup_font_size', label: (fields.battery_popup_font_size && fields.battery_popup_font_size.label) || '', helper: (fields.battery_popup_font_size && fields.battery_popup_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '16' },
        ]),
        gridPopup: define([
          { name: 'sensor_popup_grid_1', label: (fields.sensor_popup_grid_1 && fields.sensor_popup_grid_1.label) || '', helper: (fields.sensor_popup_grid_1 && fields.sensor_popup_grid_1.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_grid_1_name', label: (fields.sensor_popup_grid_1_name && fields.sensor_popup_grid_1_name.label) || '', helper: (fields.sensor_popup_grid_1_name && fields.sensor_popup_grid_1_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_grid_2', label: (fields.sensor_popup_grid_2 && fields.sensor_popup_grid_2.label) || '', helper: (fields.sensor_popup_grid_2 && fields.sensor_popup_grid_2.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_grid_2_name', label: (fields.sensor_popup_grid_2_name && fields.sensor_popup_grid_2_name.label) || '', helper: (fields.sensor_popup_grid_2_name && fields.sensor_popup_grid_2_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_grid_3', label: (fields.sensor_popup_grid_3 && fields.sensor_popup_grid_3.label) || '', helper: (fields.sensor_popup_grid_3 && fields.sensor_popup_grid_3.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_grid_3_name', label: (fields.sensor_popup_grid_3_name && fields.sensor_popup_grid_3_name.label) || '', helper: (fields.sensor_popup_grid_3_name && fields.sensor_popup_grid_3_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_grid_4', label: (fields.sensor_popup_grid_4 && fields.sensor_popup_grid_4.label) || '', helper: (fields.sensor_popup_grid_4 && fields.sensor_popup_grid_4.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_grid_4_name', label: (fields.sensor_popup_grid_4_name && fields.sensor_popup_grid_4_name.label) || '', helper: (fields.sensor_popup_grid_4_name && fields.sensor_popup_grid_4_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_grid_5', label: (fields.sensor_popup_grid_5 && fields.sensor_popup_grid_5.label) || '', helper: (fields.sensor_popup_grid_5 && fields.sensor_popup_grid_5.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_grid_5_name', label: (fields.sensor_popup_grid_5_name && fields.sensor_popup_grid_5_name.label) || '', helper: (fields.sensor_popup_grid_5_name && fields.sensor_popup_grid_5_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_grid_6', label: (fields.sensor_popup_grid_6 && fields.sensor_popup_grid_6.label) || '', helper: (fields.sensor_popup_grid_6 && fields.sensor_popup_grid_6.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_grid_6_name', label: (fields.sensor_popup_grid_6_name && fields.sensor_popup_grid_6_name.label) || '', helper: (fields.sensor_popup_grid_6_name && fields.sensor_popup_grid_6_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_grid_1_color', label: (fields.sensor_popup_grid_1_color && fields.sensor_popup_grid_1_color.label) || '', helper: (fields.sensor_popup_grid_1_color && fields.sensor_popup_grid_1_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_grid_2_color', label: (fields.sensor_popup_grid_2_color && fields.sensor_popup_grid_2_color.label) || '', helper: (fields.sensor_popup_grid_2_color && fields.sensor_popup_grid_2_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_grid_3_color', label: (fields.sensor_popup_grid_3_color && fields.sensor_popup_grid_3_color.label) || '', helper: (fields.sensor_popup_grid_3_color && fields.sensor_popup_grid_3_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_grid_4_color', label: (fields.sensor_popup_grid_4_color && fields.sensor_popup_grid_4_color.label) || '', helper: (fields.sensor_popup_grid_4_color && fields.sensor_popup_grid_4_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_grid_5_color', label: (fields.sensor_popup_grid_5_color && fields.sensor_popup_grid_5_color.label) || '', helper: (fields.sensor_popup_grid_5_color && fields.sensor_popup_grid_5_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_grid_6_color', label: (fields.sensor_popup_grid_6_color && fields.sensor_popup_grid_6_color.label) || '', helper: (fields.sensor_popup_grid_6_color && fields.sensor_popup_grid_6_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_grid_1_font_size', label: (fields.sensor_popup_grid_1_font_size && fields.sensor_popup_grid_1_font_size.label) || '', helper: (fields.sensor_popup_grid_1_font_size && fields.sensor_popup_grid_1_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_grid_2_font_size', label: (fields.sensor_popup_grid_2_font_size && fields.sensor_popup_grid_2_font_size.label) || '', helper: (fields.sensor_popup_grid_2_font_size && fields.sensor_popup_grid_2_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_grid_3_font_size', label: (fields.sensor_popup_grid_3_font_size && fields.sensor_popup_grid_3_font_size.label) || '', helper: (fields.sensor_popup_grid_3_font_size && fields.sensor_popup_grid_3_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_grid_4_font_size', label: (fields.sensor_popup_grid_4_font_size && fields.sensor_popup_grid_4_font_size.label) || '', helper: (fields.sensor_popup_grid_4_font_size && fields.sensor_popup_grid_4_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_grid_5_font_size', label: (fields.sensor_popup_grid_5_font_size && fields.sensor_popup_grid_5_font_size.label) || '', helper: (fields.sensor_popup_grid_5_font_size && fields.sensor_popup_grid_5_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_grid_6_font_size', label: (fields.sensor_popup_grid_6_font_size && fields.sensor_popup_grid_6_font_size.label) || '', helper: (fields.sensor_popup_grid_6_font_size && fields.sensor_popup_grid_6_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
        ]),
        inverterPopup: define([
          { name: 'sensor_popup_inverter_1', label: (fields.sensor_popup_inverter_1 && fields.sensor_popup_inverter_1.label) || '', helper: (fields.sensor_popup_inverter_1 && fields.sensor_popup_inverter_1.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_inverter_1_name', label: (fields.sensor_popup_inverter_1_name && fields.sensor_popup_inverter_1_name.label) || '', helper: (fields.sensor_popup_inverter_1_name && fields.sensor_popup_inverter_1_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_inverter_2', label: (fields.sensor_popup_inverter_2 && fields.sensor_popup_inverter_2.label) || '', helper: (fields.sensor_popup_inverter_2 && fields.sensor_popup_inverter_2.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_inverter_2_name', label: (fields.sensor_popup_inverter_2_name && fields.sensor_popup_inverter_2_name.label) || '', helper: (fields.sensor_popup_inverter_2_name && fields.sensor_popup_inverter_2_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_inverter_3', label: (fields.sensor_popup_inverter_3 && fields.sensor_popup_inverter_3.label) || '', helper: (fields.sensor_popup_inverter_3 && fields.sensor_popup_inverter_3.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_inverter_3_name', label: (fields.sensor_popup_inverter_3_name && fields.sensor_popup_inverter_3_name.label) || '', helper: (fields.sensor_popup_inverter_3_name && fields.sensor_popup_inverter_3_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_inverter_4', label: (fields.sensor_popup_inverter_4 && fields.sensor_popup_inverter_4.label) || '', helper: (fields.sensor_popup_inverter_4 && fields.sensor_popup_inverter_4.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_inverter_4_name', label: (fields.sensor_popup_inverter_4_name && fields.sensor_popup_inverter_4_name.label) || '', helper: (fields.sensor_popup_inverter_4_name && fields.sensor_popup_inverter_4_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_inverter_5', label: (fields.sensor_popup_inverter_5 && fields.sensor_popup_inverter_5.label) || '', helper: (fields.sensor_popup_inverter_5 && fields.sensor_popup_inverter_5.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_inverter_5_name', label: (fields.sensor_popup_inverter_5_name && fields.sensor_popup_inverter_5_name.label) || '', helper: (fields.sensor_popup_inverter_5_name && fields.sensor_popup_inverter_5_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_inverter_6', label: (fields.sensor_popup_inverter_6 && fields.sensor_popup_inverter_6.label) || '', helper: (fields.sensor_popup_inverter_6 && fields.sensor_popup_inverter_6.label) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_inverter_6_name', label: (fields.sensor_popup_inverter_6_name && fields.sensor_popup_inverter_6_name.label) || '', helper: (fields.sensor_popup_inverter_6_name && fields.sensor_popup_inverter_6_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_inverter_1_color', label: (fields.sensor_popup_inverter_1_color && fields.sensor_popup_inverter_1_color.label) || '', helper: (fields.sensor_popup_inverter_1_color && fields.sensor_popup_inverter_1_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_inverter_2_color', label: (fields.sensor_popup_inverter_2_color && fields.sensor_popup_inverter_2_color.label) || '', helper: (fields.sensor_popup_inverter_2_color && fields.sensor_popup_inverter_2_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_inverter_3_color', label: (fields.sensor_popup_inverter_3_color && fields.sensor_popup_inverter_3_color.label) || '', helper: (fields.sensor_popup_inverter_3_color && fields.sensor_popup_inverter_3_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_inverter_4_color', label: (fields.sensor_popup_inverter_4_color && fields.sensor_popup_inverter_4_color.label) || '', helper: (fields.sensor_popup_inverter_4_color && fields.sensor_popup_inverter_4_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_inverter_5_color', label: (fields.sensor_popup_inverter_5_color && fields.sensor_popup_inverter_5_color.label) || '', helper: (fields.sensor_popup_inverter_5_color && fields.sensor_popup_inverter_5_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_inverter_6_color', label: (fields.sensor_popup_inverter_6_color && fields.sensor_popup_inverter_6_color.label) || '', helper: (fields.sensor_popup_inverter_6_color && fields.sensor_popup_inverter_6_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_inverter_1_font_size', label: (fields.sensor_popup_inverter_1_font_size && fields.sensor_popup_inverter_1_font_size.label) || '', helper: (fields.sensor_popup_inverter_1_font_size && fields.sensor_popup_inverter_1_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_inverter_2_font_size', label: (fields.sensor_popup_inverter_2_font_size && fields.sensor_popup_inverter_2_font_size.label) || '', helper: (fields.sensor_popup_inverter_2_font_size && fields.sensor_popup_inverter_2_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_inverter_3_font_size', label: (fields.sensor_popup_inverter_3_font_size && fields.sensor_popup_inverter_3_font_size.label) || '', helper: (fields.sensor_popup_inverter_3_font_size && fields.sensor_popup_inverter_3_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_inverter_4_font_size', label: (fields.sensor_popup_inverter_4_font_size && fields.sensor_popup_inverter_4_font_size.label) || '', helper: (fields.sensor_popup_inverter_4_font_size && fields.sensor_popup_inverter_4_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_inverter_5_font_size', label: (fields.sensor_popup_inverter_5_font_size && fields.sensor_popup_inverter_5_font_size.label) || '', helper: (fields.sensor_popup_inverter_5_font_size && fields.sensor_popup_inverter_5_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_inverter_6_font_size', label: (fields.sensor_popup_inverter_6_font_size && fields.sensor_popup_inverter_6_font_size.label) || '', helper: (fields.sensor_popup_inverter_6_font_size && fields.sensor_popup_inverter_6_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
        ]),
        housePopup: define([
          { name: 'sensor_popup_house_1', label: (fields.sensor_popup_house_1 && fields.sensor_popup_house_1.label) || '', helper: (fields.sensor_popup_house_1 && fields.sensor_popup_house_1.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_house_1_name', label: (fields.sensor_popup_house_1_name && fields.sensor_popup_house_1_name.label) || '', helper: (fields.sensor_popup_house_1_name && fields.sensor_popup_house_1_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_house_2', label: (fields.sensor_popup_house_2 && fields.sensor_popup_house_2.label) || '', helper: (fields.sensor_popup_house_2 && fields.sensor_popup_house_2.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_house_2_name', label: (fields.sensor_popup_house_2_name && fields.sensor_popup_house_2_name.label) || '', helper: (fields.sensor_popup_house_2_name && fields.sensor_popup_house_2_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_house_3', label: (fields.sensor_popup_house_3 && fields.sensor_popup_house_3.label) || '', helper: (fields.sensor_popup_house_3 && fields.sensor_popup_house_3.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_house_3_name', label: (fields.sensor_popup_house_3_name && fields.sensor_popup_house_3_name.label) || '', helper: (fields.sensor_popup_house_3_name && fields.sensor_popup_house_3_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_house_4', label: (fields.sensor_popup_house_4 && fields.sensor_popup_house_4.label) || '', helper: (fields.sensor_popup_house_4 && fields.sensor_popup_house_4.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_house_4_name', label: (fields.sensor_popup_house_4_name && fields.sensor_popup_house_4_name.label) || '', helper: (fields.sensor_popup_house_4_name && fields.sensor_popup_house_4_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_house_5', label: (fields.sensor_popup_house_5 && fields.sensor_popup_house_5.label) || '', helper: (fields.sensor_popup_house_5 && fields.sensor_popup_house_5.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_house_5_name', label: (fields.sensor_popup_house_5_name && fields.sensor_popup_house_5_name.label) || '', helper: (fields.sensor_popup_house_5_name && fields.sensor_popup_house_5_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_house_6', label: (fields.sensor_popup_house_6 && fields.sensor_popup_house_6.label) || '', helper: (fields.sensor_popup_house_6 && fields.sensor_popup_house_6.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_house_6_name', label: (fields.sensor_popup_house_6_name && fields.sensor_popup_house_6_name.label) || '', helper: (fields.sensor_popup_house_6_name && fields.sensor_popup_house_6_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_house_1_color', label: (fields.sensor_popup_house_1_color && fields.sensor_popup_house_1_color.label) || '', helper: (fields.sensor_popup_house_1_color && fields.sensor_popup_house_1_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_house_2_color', label: (fields.sensor_popup_house_2_color && fields.sensor_popup_house_2_color.label) || '', helper: (fields.sensor_popup_house_2_color && fields.sensor_popup_house_2_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_house_3_color', label: (fields.sensor_popup_house_3_color && fields.sensor_popup_house_3_color.label) || '', helper: (fields.sensor_popup_house_3_color && fields.sensor_popup_house_3_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_house_4_color', label: (fields.sensor_popup_house_4_color && fields.sensor_popup_house_4_color.label) || '', helper: (fields.sensor_popup_house_4_color && fields.sensor_popup_house_4_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_house_5_color', label: (fields.sensor_popup_house_5_color && fields.sensor_popup_house_5_color.label) || '', helper: (fields.sensor_popup_house_5_color && fields.sensor_popup_house_5_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_house_6_color', label: (fields.sensor_popup_house_6_color && fields.sensor_popup_house_6_color.label) || '', helper: (fields.sensor_popup_house_6_color && fields.sensor_popup_house_6_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_house_1_font_size', label: (fields.sensor_popup_house_1_font_size && fields.sensor_popup_house_1_font_size.label) || '', helper: (fields.sensor_popup_house_1_font_size && fields.sensor_popup_house_1_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_house_2_font_size', label: (fields.sensor_popup_house_2_font_size && fields.sensor_popup_house_2_font_size.label) || '', helper: (fields.sensor_popup_house_2_font_size && fields.sensor_popup_house_2_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_house_3_font_size', label: (fields.sensor_popup_house_3_font_size && fields.sensor_popup_house_3_font_size.label) || '', helper: (fields.sensor_popup_house_3_font_size && fields.sensor_popup_house_3_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_house_4_font_size', label: (fields.sensor_popup_house_4_font_size && fields.sensor_popup_house_4_font_size.label) || '', helper: (fields.sensor_popup_house_4_font_size && fields.sensor_popup_house_4_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_house_5_font_size', label: (fields.sensor_popup_house_5_font_size && fields.sensor_popup_house_5_font_size.label) || '', helper: (fields.sensor_popup_house_5_font_size && fields.sensor_popup_house_5_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_house_6_font_size', label: (fields.sensor_popup_house_6_font_size && fields.sensor_popup_house_6_font_size.label) || '', helper: (fields.sensor_popup_house_6_font_size && fields.sensor_popup_house_6_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
        ]),
        carPopup: define([
          { name: 'sensor_popup_car1_1', label: (fields.sensor_popup_car1_1 && fields.sensor_popup_car1_1.label) || '', helper: (fields.sensor_popup_car1_1 && fields.sensor_popup_car1_1.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car1_1_name', label: (fields.sensor_popup_car1_1_name && fields.sensor_popup_car1_1_name.label) || '', helper: (fields.sensor_popup_car1_1_name && fields.sensor_popup_car1_1_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car1_1_color', label: (fields.sensor_popup_car1_1_color && fields.sensor_popup_car1_1_color.label) || '', helper: (fields.sensor_popup_car1_1_color && fields.sensor_popup_car1_1_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_car1_1_font_size', label: (fields.sensor_popup_car1_1_font_size && fields.sensor_popup_car1_1_font_size.label) || '', helper: (fields.sensor_popup_car1_1_font_size && fields.sensor_popup_car1_1_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_car1_2', label: (fields.sensor_popup_car1_2 && fields.sensor_popup_car1_2.label) || '', helper: (fields.sensor_popup_car1_2 && fields.sensor_popup_car1_2.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car1_2_name', label: (fields.sensor_popup_car1_2_name && fields.sensor_popup_car1_2_name.label) || '', helper: (fields.sensor_popup_car1_2_name && fields.sensor_popup_car1_2_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car1_2_color', label: (fields.sensor_popup_car1_2_color && fields.sensor_popup_car1_2_color.label) || '', helper: (fields.sensor_popup_car1_2_color && fields.sensor_popup_car1_2_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_car1_2_font_size', label: (fields.sensor_popup_car1_2_font_size && fields.sensor_popup_car1_2_font_size.label) || '', helper: (fields.sensor_popup_car1_2_font_size && fields.sensor_popup_car1_2_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_car1_3', label: (fields.sensor_popup_car1_3 && fields.sensor_popup_car1_3.label) || '', helper: (fields.sensor_popup_car1_3 && fields.sensor_popup_car1_3.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car1_3_name', label: (fields.sensor_popup_car1_3_name && fields.sensor_popup_car1_3_name.label) || '', helper: (fields.sensor_popup_car1_3_name && fields.sensor_popup_car1_3_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car1_3_color', label: (fields.sensor_popup_car1_3_color && fields.sensor_popup_car1_3_color.label) || '', helper: (fields.sensor_popup_car1_3_color && fields.sensor_popup_car1_3_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_car1_3_font_size', label: (fields.sensor_popup_car1_3_font_size && fields.sensor_popup_car1_3_font_size.label) || '', helper: (fields.sensor_popup_car1_3_font_size && fields.sensor_popup_car1_3_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_car1_4', label: (fields.sensor_popup_car1_4 && fields.sensor_popup_car1_4.label) || '', helper: (fields.sensor_popup_car1_4 && fields.sensor_popup_car1_4.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car1_4_name', label: (fields.sensor_popup_car1_4_name && fields.sensor_popup_car1_4_name.label) || '', helper: (fields.sensor_popup_car1_4_name && fields.sensor_popup_car1_4_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car1_4_color', label: (fields.sensor_popup_car1_4_color && fields.sensor_popup_car1_4_color.label) || '', helper: (fields.sensor_popup_car1_4_color && fields.sensor_popup_car1_4_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_car1_4_font_size', label: (fields.sensor_popup_car1_4_font_size && fields.sensor_popup_car1_4_font_size.label) || '', helper: (fields.sensor_popup_car1_4_font_size && fields.sensor_popup_car1_4_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_car1_5', label: (fields.sensor_popup_car1_5 && fields.sensor_popup_car1_5.label) || '', helper: (fields.sensor_popup_car1_5 && fields.sensor_popup_car1_5.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car1_5_name', label: (fields.sensor_popup_car1_5_name && fields.sensor_popup_car1_5_name.label) || '', helper: (fields.sensor_popup_car1_5_name && fields.sensor_popup_car1_5_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car1_5_color', label: (fields.sensor_popup_car1_5_color && fields.sensor_popup_car1_5_color.label) || '', helper: (fields.sensor_popup_car1_5_color && fields.sensor_popup_car1_5_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_car1_5_font_size', label: (fields.sensor_popup_car1_5_font_size && fields.sensor_popup_car1_5_font_size.label) || '', helper: (fields.sensor_popup_car1_5_font_size && fields.sensor_popup_car1_5_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_car1_6', label: (fields.sensor_popup_car1_6 && fields.sensor_popup_car1_6.label) || '', helper: (fields.sensor_popup_car1_6 && fields.sensor_popup_car1_6.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car1_6_name', label: (fields.sensor_popup_car1_6_name && fields.sensor_popup_car1_6_name.label) || '', helper: (fields.sensor_popup_car1_6_name && fields.sensor_popup_car1_6_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car1_6_color', label: (fields.sensor_popup_car1_6_color && fields.sensor_popup_car1_6_color.label) || '', helper: (fields.sensor_popup_car1_6_color && fields.sensor_popup_car1_6_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_car1_6_font_size', label: (fields.sensor_popup_car1_6_font_size && fields.sensor_popup_car1_6_font_size.label) || '', helper: (fields.sensor_popup_car1_6_font_size && fields.sensor_popup_car1_6_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { type: 'divider' },
          { name: 'sensor_popup_car2_1', label: (fields.sensor_popup_car2_1 && fields.sensor_popup_car2_1.label) || '', helper: (fields.sensor_popup_car2_1 && fields.sensor_popup_car2_1.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car2_1_name', label: (fields.sensor_popup_car2_1_name && fields.sensor_popup_car2_1_name.label) || '', helper: (fields.sensor_popup_car2_1_name && fields.sensor_popup_car2_1_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car2_1_color', label: (fields.sensor_popup_car2_1_color && fields.sensor_popup_car2_1_color.label) || '', helper: (fields.sensor_popup_car2_1_color && fields.sensor_popup_car2_1_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_car2_1_font_size', label: (fields.sensor_popup_car2_1_font_size && fields.sensor_popup_car2_1_font_size.label) || '', helper: (fields.sensor_popup_car2_1_font_size && fields.sensor_popup_car2_1_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_car2_2', label: (fields.sensor_popup_car2_2 && fields.sensor_popup_car2_2.label) || '', helper: (fields.sensor_popup_car2_2 && fields.sensor_popup_car2_2.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car2_2_name', label: (fields.sensor_popup_car2_2_name && fields.sensor_popup_car2_2_name.label) || '', helper: (fields.sensor_popup_car2_2_name && fields.sensor_popup_car2_2_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car2_2_color', label: (fields.sensor_popup_car2_2_color && fields.sensor_popup_car2_2_color.label) || '', helper: (fields.sensor_popup_car2_2_color && fields.sensor_popup_car2_2_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_car2_2_font_size', label: (fields.sensor_popup_car2_2_font_size && fields.sensor_popup_car2_2_font_size.label) || '', helper: (fields.sensor_popup_car2_2_font_size && fields.sensor_popup_car2_2_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_car2_3', label: (fields.sensor_popup_car2_3 && fields.sensor_popup_car2_3.label) || '', helper: (fields.sensor_popup_car2_3 && fields.sensor_popup_car2_3.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car2_3_name', label: (fields.sensor_popup_car2_3_name && fields.sensor_popup_car2_3_name.label) || '', helper: (fields.sensor_popup_car2_3_name && fields.sensor_popup_car2_3_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car2_3_color', label: (fields.sensor_popup_car2_3_color && fields.sensor_popup_car2_3_color.label) || '', helper: (fields.sensor_popup_car2_3_color && fields.sensor_popup_car2_3_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_car2_3_font_size', label: (fields.sensor_popup_car2_3_font_size && fields.sensor_popup_car2_3_font_size.label) || '', helper: (fields.sensor_popup_car2_3_font_size && fields.sensor_popup_car2_3_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_car2_4', label: (fields.sensor_popup_car2_4 && fields.sensor_popup_car2_4.label) || '', helper: (fields.sensor_popup_car2_4 && fields.sensor_popup_car2_4.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car2_4_name', label: (fields.sensor_popup_car2_4_name && fields.sensor_popup_car2_4_name.label) || '', helper: (fields.sensor_popup_car2_4_name && fields.sensor_popup_car2_4_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car2_4_color', label: (fields.sensor_popup_car2_4_color && fields.sensor_popup_car2_4_color.label) || '', helper: (fields.sensor_popup_car2_4_color && fields.sensor_popup_car2_4_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_car2_4_font_size', label: (fields.sensor_popup_car2_4_font_size && fields.sensor_popup_car2_4_font_size.label) || '', helper: (fields.sensor_popup_car2_4_font_size && fields.sensor_popup_car2_4_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_car2_5', label: (fields.sensor_popup_car2_5 && fields.sensor_popup_car2_5.label) || '', helper: (fields.sensor_popup_car2_5 && fields.sensor_popup_car2_5.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car2_5_name', label: (fields.sensor_popup_car2_5_name && fields.sensor_popup_car2_5_name.label) || '', helper: (fields.sensor_popup_car2_5_name && fields.sensor_popup_car2_5_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car2_5_color', label: (fields.sensor_popup_car2_5_color && fields.sensor_popup_car2_5_color.label) || '', helper: (fields.sensor_popup_car2_5_color && fields.sensor_popup_car2_5_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_car2_5_font_size', label: (fields.sensor_popup_car2_5_font_size && fields.sensor_popup_car2_5_font_size.label) || '', helper: (fields.sensor_popup_car2_5_font_size && fields.sensor_popup_car2_5_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
          { name: 'sensor_popup_car2_6', label: (fields.sensor_popup_car2_6 && fields.sensor_popup_car2_6.label) || '', helper: (fields.sensor_popup_car2_6 && fields.sensor_popup_car2_6.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car2_6_name', label: (fields.sensor_popup_car2_6_name && fields.sensor_popup_car2_6_name.label) || '', helper: (fields.sensor_popup_car2_6_name && fields.sensor_popup_car2_6_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car2_6_color', label: (fields.sensor_popup_car2_6_color && fields.sensor_popup_car2_6_color.label) || '', helper: (fields.sensor_popup_car2_6_color && fields.sensor_popup_car2_6_color.helper) || '', selector: { color_picker: {} }, default: '#80ffff' },
          { name: 'sensor_popup_car2_6_font_size', label: (fields.sensor_popup_car2_6_font_size && fields.sensor_popup_car2_6_font_size.label) || '', helper: (fields.sensor_popup_car2_6_font_size && fields.sensor_popup_car2_6_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '12' },
        ]),
        displayStyle: define([
          { name: 'card_title', label: fields.card_title.label, helper: fields.card_title.helper, selector: { text: { mode: 'blur' } } },
          { name: 'title_text_color', label: (fields.title_text_color && fields.title_text_color.label) || 'Title Text Color', helper: (fields.title_text_color && fields.title_text_color.helper) || '', selector: { color_picker: {} }, default: '' },
          { name: 'title_bg_color', label: (fields.title_bg_color && fields.title_bg_color.label) || 'Title Background Color', helper: (fields.title_bg_color && fields.title_bg_color.helper) || '', selector: { color_picker: {} }, default: '' },
          { name: 'font_family', label: (fields.font_family && fields.font_family.label) || 'Font Family', helper: (fields.font_family && fields.font_family.helper) || '', selector: { text: { mode: 'blur' } }, default: 'sans-serif' },
          { name: 'odometer_font_family', label: (fields.odometer_font_family && fields.odometer_font_family.label) || 'Odometer Font Family (Monospace)', helper: (fields.odometer_font_family && fields.odometer_font_family.helper) || '', selector: { text: { mode: 'blur' } }, default: '' },
          { name: 'grid_current_odometer', label: fields.grid_current_odometer.label, helper: fields.grid_current_odometer.helper, selector: { boolean: {} }, default: false },
          { name: 'grid_current_odometer_duration', label: fields.grid_current_odometer_duration.label, helper: fields.grid_current_odometer_duration.helper, selector: { number: { min: 50, max: 2000, step: 50, mode: 'box', unit_of_measurement: 'ms' } }, default: 350 },
          { name: 'header_font_size', label: fields.header_font_size.label, helper: fields.header_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'daily_label_font_size', label: fields.daily_label_font_size.label, helper: fields.daily_label_font_size.helper, selector: { text: { mode: 'blur' } } },
          { name: 'daily_value_font_size', label: fields.daily_value_font_size.label, helper: fields.daily_value_font_size.helper, selector: { text: { mode: 'blur' } } },
        ]),
      };
    },
    buildSections(editor, sections, schemaDefs) {
      return [
        { id: 'pvCommon', title: sections.pvCommon.title, helper: sections.pvCommon.helper, schema: schemaDefs.pvCommon, defaultOpen: false },
        { id: 'array1', title: sections.array1.title, helper: sections.array1.helper, schema: schemaDefs.array1, defaultOpen: false },
        { id: 'array2', title: sections.array2.title, helper: sections.array2.helper, renderContent: () => {
          const wrapper = document.createElement('div');
          wrapper.appendChild(editor._createForm(schemaDefs.array2));
          return wrapper;
        }, defaultOpen: false },
        { id: 'windmill', title: sections.windmill.title, helper: sections.windmill.helper, schema: schemaDefs.windmill, defaultOpen: false },
        { id: 'battery', title: sections.battery.title, helper: sections.battery.helper, schema: schemaDefs.battery, defaultOpen: false },
        { id: 'grid', title: sections.grid.title, helper: sections.grid.helper, schema: schemaDefs.grid, defaultOpen: false },
        { id: 'car', title: sections.car.title, helper: sections.car.helper, schema: schemaDefs.car, defaultOpen: false },
        { id: 'other', title: sections.other.title, helper: sections.other.helper, schema: schemaDefs.other, defaultOpen: false },
        { id: 'pvPopup', title: sections.pvPopup.title, helper: sections.pvPopup.helper, schema: schemaDefs.pvPopup, defaultOpen: false },
        { id: 'batteryPopup', title: sections.batteryPopup.title, helper: sections.batteryPopup.helper, schema: schemaDefs.batteryPopup, defaultOpen: false },
        { id: 'gridPopup', title: sections.gridPopup.title, helper: sections.gridPopup.helper, schema: schemaDefs.gridPopup, defaultOpen: false },
        { id: 'inverterPopup', title: sections.inverterPopup.title, helper: sections.inverterPopup.helper, schema: schemaDefs.inverterPopup, defaultOpen: false },
        { id: 'housePopup', title: sections.housePopup.title, helper: sections.housePopup.helper, schema: schemaDefs.housePopup, defaultOpen: false },
        { id: 'carPopup', title: sections.carPopup.title, helper: sections.carPopup.helper, schema: schemaDefs.carPopup, defaultOpen: false },
      ];
    }
  },
  overview: {
    profileName: 'Overview',
    buildSchema(ctx) {
      const { define, fields, entitySelector, climateEntitySelector, popupEntitySelector, buildThresholdSelector } = ctx;
      const sourceOptions = [
        { value: 'auto_today', label: 'Auto - Today' },
        { value: 'auto_yesterday', label: 'Auto - Yesterday' },
        { value: 'auto_this_week', label: 'Auto - This Week' },
        { value: 'auto_last_week', label: 'Auto - Last Week' },
        { value: 'auto_this_month', label: 'Auto - This Month' },
        { value: 'auto_last_month', label: 'Auto - Last Month' },
        { value: 'auto_this_year', label: 'Auto - This Year' },
        { value: 'auto_last_year', label: 'Auto - Last Year' },
        { value: 'custom', label: 'Custom Entity' },
      ];
      const statTypeOptions = [
        { value: 'sum', label: 'Sum (Total)' },
        { value: 'mean', label: 'Mean (Average)' },
        { value: 'difference', label: 'Difference (End − Start)' },
      ];
      return {
        pvCommon: define([
          { name: 'pv_tot_color', label: fields.pv_tot_color.label, helper: fields.pv_tot_color.helper, selector: { color_picker: {} }, default: '#00FFFF' },
          { name: 'pv_font_size', label: fields.pv_font_size.label, helper: fields.pv_font_size.helper, selector: { text: { mode: 'blur' } } },
          { type: 'divider' },
          { name: 'sensor_solar_state', label: fields.sensor_solar_state.label, helper: fields.sensor_solar_state.helper, selector: entitySelector },
          { name: 'solar_state_producing_color', label: fields.solar_state_producing_color.label, helper: fields.solar_state_producing_color.helper, selector: { color_picker: {} } },
          { name: 'solar_state_not_producing_color', label: fields.solar_state_not_producing_color.label, helper: fields.solar_state_not_producing_color.helper, selector: { color_picker: {} } },
          { name: 'solar_state_font_size', label: fields.solar_state_font_size.label, helper: fields.solar_state_font_size.helper, selector: { text: { mode: 'blur' } } },
          { type: 'divider' },
          { name: 'sensor_solar_forecast_today', label: fields.sensor_solar_forecast_today.label, helper: fields.sensor_solar_forecast_today.helper, selector: entitySelector },
          { name: 'sensor_solar_forecast_tomorrow', label: fields.sensor_solar_forecast_tomorrow.label, helper: fields.sensor_solar_forecast_tomorrow.helper, selector: entitySelector },
          { name: 'sensor_weather_forecast', label: fields.sensor_weather_forecast.label, helper: fields.sensor_weather_forecast.helper, selector: entitySelector },
        ]),
        array1: define([
          { name: 'sensor_pv_total', label: fields.sensor_pv_total.label, helper: fields.sensor_pv_total.helper, selector: entitySelector },
          { name: 'sensor_pv1', label: fields.sensor_pv1.label, helper: fields.sensor_pv1.helper, selector: entitySelector },
          { name: 'sensor_pv2', label: fields.sensor_pv2.label, helper: fields.sensor_pv2.helper, selector: entitySelector },
          { name: 'sensor_pv3', label: fields.sensor_pv3.label, helper: fields.sensor_pv3.helper, selector: entitySelector },
          { name: 'sensor_pv4', label: fields.sensor_pv4.label, helper: fields.sensor_pv4.helper, selector: entitySelector },
          { name: 'sensor_pv5', label: fields.sensor_pv5.label, helper: fields.sensor_pv5.helper, selector: entitySelector },
          { name: 'sensor_pv6', label: fields.sensor_pv6.label, helper: fields.sensor_pv6.helper, selector: entitySelector },
          { name: 'sensor_daily', label: fields.sensor_daily.label, helper: fields.sensor_daily.helper, selector: entitySelector },
          { name: 'pv_primary_color', label: fields.pv_primary_color.label, helper: fields.pv_primary_color.helper, selector: { color_picker: {} } },
        ]),
        array2: define([
          { name: 'sensor_pv_total_secondary', label: fields.sensor_pv_total_secondary.label, helper: fields.sensor_pv_total_secondary.helper, selector: entitySelector },
          { name: 'sensor_pv_array2_1', label: fields.sensor_pv_array2_1.label, helper: fields.sensor_pv_array2_1.helper, selector: entitySelector },
          { name: 'sensor_pv_array2_2', label: fields.sensor_pv_array2_2.label, helper: fields.sensor_pv_array2_2.helper, selector: entitySelector },
          { name: 'sensor_pv_array2_3', label: fields.sensor_pv_array2_3.label, helper: fields.sensor_pv_array2_3.helper, selector: entitySelector },
          { name: 'sensor_pv_array2_4', label: fields.sensor_pv_array2_4.label, helper: fields.sensor_pv_array2_4.helper, selector: entitySelector },
          { name: 'sensor_pv_array2_5', label: fields.sensor_pv_array2_5.label, helper: fields.sensor_pv_array2_5.helper, selector: entitySelector },
          { name: 'sensor_pv_array2_6', label: fields.sensor_pv_array2_6.label, helper: fields.sensor_pv_array2_6.helper, selector: entitySelector },
          { name: 'sensor_daily_array2', label: fields.sensor_daily_array2.label, helper: fields.sensor_daily_array2.helper, selector: entitySelector },
          { name: 'pv_secondary_color', label: fields.pv_secondary_color.label, helper: fields.pv_secondary_color.helper, selector: { color_picker: {} } },
        ]),
        battery: define([
          { name: 'sensor_bat1_soc', label: fields.sensor_bat1_soc.label, helper: fields.sensor_bat1_soc.helper, selector: entitySelector },
          { name: 'sensor_bat1_power', label: fields.sensor_bat1_power.label, helper: fields.sensor_bat1_power.helper, selector: entitySelector },
          { name: 'sensor_bat1_charge_power', label: fields.sensor_bat1_charge_power.label, helper: fields.sensor_bat1_charge_power.helper, selector: entitySelector },
          { name: 'sensor_bat1_discharge_power', label: fields.sensor_bat1_discharge_power.label, helper: fields.sensor_bat1_discharge_power.helper, selector: entitySelector },
          { name: 'sensor_bat1_capacity_sensor', label: fields.sensor_bat1_capacity_sensor.label, helper: fields.sensor_bat1_capacity_sensor.helper, selector: entitySelector },
          { name: 'bat1_capacity_manual', label: fields.bat1_capacity_manual.label, helper: fields.bat1_capacity_manual.helper, selector: { text: { mode: 'blur' } } },
          { name: 'bat1_reserve_percentage', label: fields.bat1_reserve_percentage.label, helper: fields.bat1_reserve_percentage.helper, selector: { number: { min: 0, max: 100, step: 1, unit_of_measurement: '%' } } },
          { name: 'sensor_bat1_time_until', label: fields.sensor_bat1_time_until.label, helper: fields.sensor_bat1_time_until.helper, selector: entitySelector },
          { name: 'sensor_battery1_temp', label: fields.sensor_battery1_temp.label, helper: fields.sensor_battery1_temp.helper, selector: entitySelector },
          { type: 'divider' },
          { name: 'sensor_bat2_soc', label: fields.sensor_bat2_soc.label, helper: fields.sensor_bat2_soc.helper, selector: entitySelector },
          { name: 'sensor_bat2_power', label: fields.sensor_bat2_power.label, helper: fields.sensor_bat2_power.helper, selector: entitySelector },
          { name: 'sensor_bat2_charge_power', label: fields.sensor_bat2_charge_power.label, helper: fields.sensor_bat2_charge_power.helper, selector: entitySelector },
          { name: 'sensor_bat2_discharge_power', label: fields.sensor_bat2_discharge_power.label, helper: fields.sensor_bat2_discharge_power.helper, selector: entitySelector },
          { name: 'sensor_bat2_capacity_sensor', label: fields.sensor_bat2_capacity_sensor.label, helper: fields.sensor_bat2_capacity_sensor.helper, selector: entitySelector },
          { name: 'bat2_capacity_manual', label: fields.bat2_capacity_manual.label, helper: fields.bat2_capacity_manual.helper, selector: { text: { mode: 'blur' } } },
          { name: 'bat2_reserve_percentage', label: fields.bat2_reserve_percentage.label, helper: fields.bat2_reserve_percentage.helper, selector: { number: { min: 0, max: 100, step: 1, unit_of_measurement: '%' } } },
          { name: 'sensor_bat2_time_until', label: fields.sensor_bat2_time_until.label, helper: fields.sensor_bat2_time_until.helper, selector: entitySelector },
          { type: 'divider' },
          { name: 'sensor_bat3_soc', label: fields.sensor_bat3_soc.label, helper: fields.sensor_bat3_soc.helper, selector: entitySelector },
          { name: 'sensor_bat3_power', label: fields.sensor_bat3_power.label, helper: fields.sensor_bat3_power.helper, selector: entitySelector },
          { name: 'sensor_bat3_charge_power', label: fields.sensor_bat3_charge_power.label, helper: fields.sensor_bat3_charge_power.helper, selector: entitySelector },
          { name: 'sensor_bat3_discharge_power', label: fields.sensor_bat3_discharge_power.label, helper: fields.sensor_bat3_discharge_power.helper, selector: entitySelector },
          { name: 'sensor_bat3_capacity_sensor', label: fields.sensor_bat3_capacity_sensor.label, helper: fields.sensor_bat3_capacity_sensor.helper, selector: entitySelector },
          { name: 'bat3_capacity_manual', label: fields.bat3_capacity_manual.label, helper: fields.bat3_capacity_manual.helper, selector: { text: { mode: 'blur' } } },
          { name: 'bat3_reserve_percentage', label: fields.bat3_reserve_percentage.label, helper: fields.bat3_reserve_percentage.helper, selector: { number: { min: 0, max: 100, step: 1, unit_of_measurement: '%' } } },
          { name: 'sensor_bat3_time_until', label: fields.sensor_bat3_time_until.label, helper: fields.sensor_bat3_time_until.helper, selector: entitySelector },
          { type: 'divider' },
          { name: 'sensor_bat4_soc', label: fields.sensor_bat4_soc.label, helper: fields.sensor_bat4_soc.helper, selector: entitySelector },
          { name: 'sensor_bat4_power', label: fields.sensor_bat4_power.label, helper: fields.sensor_bat4_power.helper, selector: entitySelector },
          { name: 'sensor_bat4_charge_power', label: fields.sensor_bat4_charge_power.label, helper: fields.sensor_bat4_charge_power.helper, selector: entitySelector },
          { name: 'sensor_bat4_discharge_power', label: fields.sensor_bat4_discharge_power.label, helper: fields.sensor_bat4_discharge_power.helper, selector: entitySelector },
          { name: 'sensor_bat4_capacity_sensor', label: fields.sensor_bat4_capacity_sensor.label, helper: fields.sensor_bat4_capacity_sensor.helper, selector: entitySelector },
          { name: 'bat4_capacity_manual', label: fields.bat4_capacity_manual.label, helper: fields.bat4_capacity_manual.helper, selector: { text: { mode: 'blur' } } },
          { name: 'bat4_reserve_percentage', label: fields.bat4_reserve_percentage.label, helper: fields.bat4_reserve_percentage.helper, selector: { number: { min: 0, max: 100, step: 1, unit_of_measurement: '%' } } },
          { name: 'sensor_bat4_time_until', label: fields.sensor_bat4_time_until.label, helper: fields.sensor_bat4_time_until.helper, selector: entitySelector },
          { type: 'divider' },
          { name: 'invert_battery', label: fields.invert_battery.label, helper: fields.invert_battery.helper, selector: { boolean: {} } },
          { name: 'battery_charge_color', label: fields.battery_charge_color.label, helper: fields.battery_charge_color.helper, selector: { color_picker: {} } },
          { name: 'battery_discharge_color', label: fields.battery_discharge_color.label, helper: fields.battery_discharge_color.helper, selector: { color_picker: {} } },
          { name: 'battery_state_fully_charged_color', label: fields.battery_state_fully_charged_color.label, helper: fields.battery_state_fully_charged_color.helper, selector: { color_picker: {} } },
          { name: 'battery_state_charging_color', label: fields.battery_state_charging_color.label, helper: fields.battery_state_charging_color.helper, selector: { color_picker: {} } },
          { name: 'battery_state_discharging_color', label: fields.battery_state_discharging_color.label, helper: fields.battery_state_discharging_color.helper, selector: { color_picker: {} } },
          { name: 'battery_state_reserve_color', label: fields.battery_state_reserve_color.label, helper: fields.battery_state_reserve_color.helper, selector: { color_picker: {} } },
          { name: 'battery_state_fully_discharged_color', label: fields.battery_state_fully_discharged_color.label, helper: fields.battery_state_fully_discharged_color.helper, selector: { color_picker: {} } },
        ]),
        grid: define([
          { name: 'sensor_grid_power', label: fields.sensor_grid_power.label, helper: fields.sensor_grid_power.helper, selector: entitySelector },
          { name: 'sensor_grid_import', label: fields.sensor_grid_import.label, helper: fields.sensor_grid_import.helper, selector: entitySelector },
          { name: 'sensor_grid_export', label: fields.sensor_grid_export.label, helper: fields.sensor_grid_export.helper, selector: entitySelector },
          { name: 'sensor_grid_import_daily', label: fields.sensor_grid_import_daily.label, helper: fields.sensor_grid_import_daily.helper, selector: entitySelector },
          { name: 'sensor_grid_export_daily', label: fields.sensor_grid_export_daily.label, helper: fields.sensor_grid_export_daily.helper, selector: entitySelector },
          { name: 'grid_import_color', label: fields.grid_import_color.label, helper: fields.grid_import_color.helper, selector: { color_picker: {} } },
          { name: 'grid_export_color', label: fields.grid_export_color.label, helper: fields.grid_export_color.helper, selector: { color_picker: {} } },
          { name: 'grid_activity_threshold', label: fields.grid_activity_threshold.label, helper: fields.grid_activity_threshold.helper, selector: { number: { min: 0, max: 100000, step: 10 } }, default: DEFAULT_GRID_ACTIVITY_THRESHOLD },
          { name: 'grid_power_only', label: fields.grid_power_only.label, helper: fields.grid_power_only.helper, selector: { boolean: {} }, default: false },
          { name: 'inv1_color', label: fields.inv1_color.label, helper: fields.inv1_color.helper, selector: { color_picker: {} }, default: '#0080ff' },
          { name: 'sensor_grid2_power', label: fields.sensor_grid2_power.label, helper: fields.sensor_grid2_power.helper, selector: entitySelector },
          { name: 'sensor_grid2_import', label: fields.sensor_grid2_import.label, helper: fields.sensor_grid2_import.helper, selector: entitySelector },
          { name: 'sensor_grid2_export', label: fields.sensor_grid2_export.label, helper: fields.sensor_grid2_export.helper, selector: entitySelector },
          { name: 'sensor_grid2_import_daily', label: fields.sensor_grid2_import_daily.label, helper: fields.sensor_grid2_import_daily.helper, selector: entitySelector },
          { name: 'sensor_grid2_export_daily', label: fields.sensor_grid2_export_daily.label, helper: fields.sensor_grid2_export_daily.helper, selector: entitySelector },
          { name: 'sensor_grid_state', label: fields.sensor_grid_state.label, helper: fields.sensor_grid_state.helper, selector: entitySelector },
          { name: 'grid_state_importing_color', label: fields.grid_state_importing_color.label, helper: fields.grid_state_importing_color.helper, selector: { color_picker: {} } },
          { name: 'grid_state_exporting_color', label: fields.grid_state_exporting_color.label, helper: fields.grid_state_exporting_color.helper, selector: { color_picker: {} } },
          { name: 'grid_state_floating_color', label: fields.grid_state_floating_color.label, helper: fields.grid_state_floating_color.helper, selector: { color_picker: {} } },
          { name: 'invert_grid', label: fields.invert_grid.label, helper: fields.invert_grid.helper, selector: { boolean: {} } },
        ]),
        car: define([
          { name: 'sensor_car_power', label: fields.sensor_car_power.label, helper: fields.sensor_car_power.helper, selector: entitySelector },
          { name: 'sensor_car_soc', label: fields.sensor_car_soc.label, helper: fields.sensor_car_soc.helper, selector: entitySelector },
          { name: 'sensor_car_range', label: fields.sensor_car_range.label, helper: fields.sensor_car_range.helper, selector: entitySelector },
          { name: 'sensor_car_hvac_status', label: fields.sensor_car_hvac_status.label, helper: fields.sensor_car_hvac_status.helper, selector: entitySelector },
          { name: 'sensor_car_outside_temp', label: fields.sensor_car_outside_temp.label, helper: fields.sensor_car_outside_temp.helper, selector: entitySelector },
          { name: 'sensor_car_inside_temp', label: fields.sensor_car_inside_temp.label, helper: fields.sensor_car_inside_temp.helper, selector: entitySelector },
          { name: 'sensor_car_ac_temp', label: fields.sensor_car_ac_temp.label, helper: fields.sensor_car_ac_temp.helper, selector: entitySelector },
          { name: 'car1_climate_entity', label: fields.car1_climate_entity.label, helper: fields.car1_climate_entity.helper, selector: climateEntitySelector },
          { name: 'car1_label', label: fields.car1_label.label, helper: fields.car1_label.helper, selector: { text: { mode: 'blur' } } },
          { type: 'divider' },
          { name: 'sensor_car2_power', label: fields.sensor_car2_power.label, helper: fields.sensor_car2_power.helper, selector: entitySelector },
          { name: 'sensor_car2_soc', label: fields.sensor_car2_soc.label, helper: fields.sensor_car2_soc.helper, selector: entitySelector },
          { name: 'sensor_car2_range', label: fields.sensor_car2_range.label, helper: fields.sensor_car2_range.helper, selector: entitySelector },
          { name: 'sensor_car2_hvac_status', label: fields.sensor_car2_hvac_status.label, helper: fields.sensor_car2_hvac_status.helper, selector: entitySelector },
          { name: 'sensor_car2_outside_temp', label: fields.sensor_car2_outside_temp.label, helper: fields.sensor_car2_outside_temp.helper, selector: entitySelector },
          { name: 'sensor_car2_inside_temp', label: fields.sensor_car2_inside_temp.label, helper: fields.sensor_car2_inside_temp.helper, selector: entitySelector },
          { name: 'sensor_car2_ac_temp', label: fields.sensor_car2_ac_temp.label, helper: fields.sensor_car2_ac_temp.helper, selector: entitySelector },
          { name: 'car2_climate_entity', label: fields.car2_climate_entity.label, helper: fields.car2_climate_entity.helper, selector: climateEntitySelector },
          { name: 'car2_label', label: fields.car2_label.label, helper: fields.car2_label.helper, selector: { text: { mode: 'blur' } } },
          { type: 'divider' },
          { name: 'car_charging_color', label: (fields.car_charging_color && fields.car_charging_color.label) || '', helper: (fields.car_charging_color && fields.car_charging_color.helper) || '', selector: { color_picker: {} } },
          { name: 'car_discharging_color', label: (fields.car_discharging_color && fields.car_discharging_color.label) || '', helper: (fields.car_discharging_color && fields.car_discharging_color.helper) || '', selector: { color_picker: {} } },
          { name: 'car1_name_color', label: fields.car1_name_color.label, helper: fields.car1_name_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
          { name: 'car2_name_color', label: fields.car2_name_color.label, helper: fields.car2_name_color.helper, selector: { color_picker: {} }, default: '#FFFFFF' },
          { name: 'car_name_plate_color', label: (fields.car_name_plate_color && fields.car_name_plate_color.label) || '', helper: (fields.car_name_plate_color && fields.car_name_plate_color.helper) || '', selector: { color_picker: {} } },
          { name: 'car_name_plate_border_color', label: (fields.car_name_plate_border_color && fields.car_name_plate_border_color.label) || '', helper: (fields.car_name_plate_border_color && fields.car_name_plate_border_color.helper) || '', selector: { color_picker: {} } },
          { name: 'car_name_plate_border_width', label: (fields.car_name_plate_border_width && fields.car_name_plate_border_width.label) || '', helper: (fields.car_name_plate_border_width && fields.car_name_plate_border_width.helper) || '', selector: { text: { mode: 'blur' } } },
          { name: 'car_name_font_color', label: (fields.car_name_font_color && fields.car_name_font_color.label) || '', helper: (fields.car_name_font_color && fields.car_name_font_color.helper) || '', selector: { color_picker: {} } },
          { name: 'car_name_font_size', label: (fields.car_name_font_size && fields.car_name_font_size.label) || '', helper: (fields.car_name_font_size && fields.car_name_font_size.helper) || '', selector: { text: { mode: 'blur' } } },
        ]),
        other: define([
          { name: 'sensor_home_load', label: fields.sensor_home_load.label, helper: fields.sensor_home_load.helper, selector: entitySelector },
          { name: 'sensor_home_load_secondary', label: fields.sensor_home_load_secondary.label, helper: fields.sensor_home_load_secondary.helper, selector: entitySelector },
        ]),
        pvPopup: define([
          { name: 'sensor_popup_pv_1', label: (fields.sensor_popup_pv_1 && fields.sensor_popup_pv_1.label) || '', helper: (fields.sensor_popup_pv_1 && fields.sensor_popup_pv_1.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_pv_1_name', label: (fields.sensor_popup_pv_1_name && fields.sensor_popup_pv_1_name.label) || '', helper: (fields.sensor_popup_pv_1_name && fields.sensor_popup_pv_1_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_pv_2', label: (fields.sensor_popup_pv_2 && fields.sensor_popup_pv_2.label) || '', helper: (fields.sensor_popup_pv_2 && fields.sensor_popup_pv_2.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_pv_2_name', label: (fields.sensor_popup_pv_2_name && fields.sensor_popup_pv_2_name.label) || '', helper: (fields.sensor_popup_pv_2_name && fields.sensor_popup_pv_2_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_pv_3', label: (fields.sensor_popup_pv_3 && fields.sensor_popup_pv_3.label) || '', helper: (fields.sensor_popup_pv_3 && fields.sensor_popup_pv_3.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_pv_3_name', label: (fields.sensor_popup_pv_3_name && fields.sensor_popup_pv_3_name.label) || '', helper: (fields.sensor_popup_pv_3_name && fields.sensor_popup_pv_3_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_pv_4', label: (fields.sensor_popup_pv_4 && fields.sensor_popup_pv_4.label) || '', helper: (fields.sensor_popup_pv_4 && fields.sensor_popup_pv_4.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_pv_4_name', label: (fields.sensor_popup_pv_4_name && fields.sensor_popup_pv_4_name.label) || '', helper: (fields.sensor_popup_pv_4_name && fields.sensor_popup_pv_4_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_pv_5', label: (fields.sensor_popup_pv_5 && fields.sensor_popup_pv_5.label) || '', helper: (fields.sensor_popup_pv_5 && fields.sensor_popup_pv_5.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_pv_5_name', label: (fields.sensor_popup_pv_5_name && fields.sensor_popup_pv_5_name.label) || '', helper: (fields.sensor_popup_pv_5_name && fields.sensor_popup_pv_5_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_pv_6', label: (fields.sensor_popup_pv_6 && fields.sensor_popup_pv_6.label) || '', helper: (fields.sensor_popup_pv_6 && fields.sensor_popup_pv_6.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_pv_6_name', label: (fields.sensor_popup_pv_6_name && fields.sensor_popup_pv_6_name.label) || '', helper: (fields.sensor_popup_pv_6_name && fields.sensor_popup_pv_6_name.helper) || '', selector: { text: {} } },
        ]),
        batteryPopup: define([
          { name: 'sensor_popup_bat_1', label: (fields.sensor_popup_bat_1 && fields.sensor_popup_bat_1.label) || '', helper: (fields.sensor_popup_bat_1 && fields.sensor_popup_bat_1.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_bat_1_name', label: (fields.sensor_popup_bat_1_name && fields.sensor_popup_bat_1_name.label) || '', helper: (fields.sensor_popup_bat_1_name && fields.sensor_popup_bat_1_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_bat_2', label: (fields.sensor_popup_bat_2 && fields.sensor_popup_bat_2.label) || '', helper: (fields.sensor_popup_bat_2 && fields.sensor_popup_bat_2.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_bat_2_name', label: (fields.sensor_popup_bat_2_name && fields.sensor_popup_bat_2_name.label) || '', helper: (fields.sensor_popup_bat_2_name && fields.sensor_popup_bat_2_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_bat_3', label: (fields.sensor_popup_bat_3 && fields.sensor_popup_bat_3.label) || '', helper: (fields.sensor_popup_bat_3 && fields.sensor_popup_bat_3.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_bat_3_name', label: (fields.sensor_popup_bat_3_name && fields.sensor_popup_bat_3_name.label) || '', helper: (fields.sensor_popup_bat_3_name && fields.sensor_popup_bat_3_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_bat_4', label: (fields.sensor_popup_bat_4 && fields.sensor_popup_bat_4.label) || '', helper: (fields.sensor_popup_bat_4 && fields.sensor_popup_bat_4.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_bat_4_name', label: (fields.sensor_popup_bat_4_name && fields.sensor_popup_bat_4_name.label) || '', helper: (fields.sensor_popup_bat_4_name && fields.sensor_popup_bat_4_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_bat_5', label: (fields.sensor_popup_bat_5 && fields.sensor_popup_bat_5.label) || '', helper: (fields.sensor_popup_bat_5 && fields.sensor_popup_bat_5.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_bat_5_name', label: (fields.sensor_popup_bat_5_name && fields.sensor_popup_bat_5_name.label) || '', helper: (fields.sensor_popup_bat_5_name && fields.sensor_popup_bat_5_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_bat_6', label: (fields.sensor_popup_bat_6 && fields.sensor_popup_bat_6.label) || '', helper: (fields.sensor_popup_bat_6 && fields.sensor_popup_bat_6.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_bat_6_name', label: (fields.sensor_popup_bat_6_name && fields.sensor_popup_bat_6_name.label) || '', helper: (fields.sensor_popup_bat_6_name && fields.sensor_popup_bat_6_name.helper) || '', selector: { text: {} } },
          { name: 'battery_popup_color', label: (fields.battery_popup_color && fields.battery_popup_color.label) || '', helper: (fields.battery_popup_color && fields.battery_popup_color.helper) || '', selector: { color_picker: {} }, default: '#00FFFF' },
        ]),
        gridPopup: define([
          { name: 'sensor_popup_grid_1', label: (fields.sensor_popup_grid_1 && fields.sensor_popup_grid_1.label) || '', helper: (fields.sensor_popup_grid_1 && fields.sensor_popup_grid_1.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_grid_1_name', label: (fields.sensor_popup_grid_1_name && fields.sensor_popup_grid_1_name.label) || '', helper: (fields.sensor_popup_grid_1_name && fields.sensor_popup_grid_1_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_grid_2', label: (fields.sensor_popup_grid_2 && fields.sensor_popup_grid_2.label) || '', helper: (fields.sensor_popup_grid_2 && fields.sensor_popup_grid_2.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_grid_2_name', label: (fields.sensor_popup_grid_2_name && fields.sensor_popup_grid_2_name.label) || '', helper: (fields.sensor_popup_grid_2_name && fields.sensor_popup_grid_2_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_grid_3', label: (fields.sensor_popup_grid_3 && fields.sensor_popup_grid_3.label) || '', helper: (fields.sensor_popup_grid_3 && fields.sensor_popup_grid_3.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_grid_3_name', label: (fields.sensor_popup_grid_3_name && fields.sensor_popup_grid_3_name.label) || '', helper: (fields.sensor_popup_grid_3_name && fields.sensor_popup_grid_3_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_grid_4', label: (fields.sensor_popup_grid_4 && fields.sensor_popup_grid_4.label) || '', helper: (fields.sensor_popup_grid_4 && fields.sensor_popup_grid_4.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_grid_4_name', label: (fields.sensor_popup_grid_4_name && fields.sensor_popup_grid_4_name.label) || '', helper: (fields.sensor_popup_grid_4_name && fields.sensor_popup_grid_4_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_grid_5', label: (fields.sensor_popup_grid_5 && fields.sensor_popup_grid_5.label) || '', helper: (fields.sensor_popup_grid_5 && fields.sensor_popup_grid_5.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_grid_5_name', label: (fields.sensor_popup_grid_5_name && fields.sensor_popup_grid_5_name.label) || '', helper: (fields.sensor_popup_grid_5_name && fields.sensor_popup_grid_5_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_grid_6', label: (fields.sensor_popup_grid_6 && fields.sensor_popup_grid_6.label) || '', helper: (fields.sensor_popup_grid_6 && fields.sensor_popup_grid_6.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_grid_6_name', label: (fields.sensor_popup_grid_6_name && fields.sensor_popup_grid_6_name.label) || '', helper: (fields.sensor_popup_grid_6_name && fields.sensor_popup_grid_6_name.helper) || '', selector: { text: {} } },
        ]),
        housePopup: define([
          { name: 'sensor_popup_house_1', label: (fields.sensor_popup_house_1 && fields.sensor_popup_house_1.label) || '', helper: (fields.sensor_popup_house_1 && fields.sensor_popup_house_1.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_house_1_name', label: (fields.sensor_popup_house_1_name && fields.sensor_popup_house_1_name.label) || '', helper: (fields.sensor_popup_house_1_name && fields.sensor_popup_house_1_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_house_2', label: (fields.sensor_popup_house_2 && fields.sensor_popup_house_2.label) || '', helper: (fields.sensor_popup_house_2 && fields.sensor_popup_house_2.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_house_2_name', label: (fields.sensor_popup_house_2_name && fields.sensor_popup_house_2_name.label) || '', helper: (fields.sensor_popup_house_2_name && fields.sensor_popup_house_2_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_house_3', label: (fields.sensor_popup_house_3 && fields.sensor_popup_house_3.label) || '', helper: (fields.sensor_popup_house_3 && fields.sensor_popup_house_3.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_house_3_name', label: (fields.sensor_popup_house_3_name && fields.sensor_popup_house_3_name.label) || '', helper: (fields.sensor_popup_house_3_name && fields.sensor_popup_house_3_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_house_4', label: (fields.sensor_popup_house_4 && fields.sensor_popup_house_4.label) || '', helper: (fields.sensor_popup_house_4 && fields.sensor_popup_house_4.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_house_4_name', label: (fields.sensor_popup_house_4_name && fields.sensor_popup_house_4_name.label) || '', helper: (fields.sensor_popup_house_4_name && fields.sensor_popup_house_4_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_house_5', label: (fields.sensor_popup_house_5 && fields.sensor_popup_house_5.label) || '', helper: (fields.sensor_popup_house_5 && fields.sensor_popup_house_5.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_house_5_name', label: (fields.sensor_popup_house_5_name && fields.sensor_popup_house_5_name.label) || '', helper: (fields.sensor_popup_house_5_name && fields.sensor_popup_house_5_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_house_6', label: (fields.sensor_popup_house_6 && fields.sensor_popup_house_6.label) || '', helper: (fields.sensor_popup_house_6 && fields.sensor_popup_house_6.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_house_6_name', label: (fields.sensor_popup_house_6_name && fields.sensor_popup_house_6_name.label) || '', helper: (fields.sensor_popup_house_6_name && fields.sensor_popup_house_6_name.helper) || '', selector: { text: {} } },
        ]),
        carPopup: define([
          { name: 'sensor_popup_car1_1', label: (fields.sensor_popup_car1_1 && fields.sensor_popup_car1_1.label) || '', helper: (fields.sensor_popup_car1_1 && fields.sensor_popup_car1_1.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car1_1_name', label: (fields.sensor_popup_car1_1_name && fields.sensor_popup_car1_1_name.label) || '', helper: (fields.sensor_popup_car1_1_name && fields.sensor_popup_car1_1_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car1_2', label: (fields.sensor_popup_car1_2 && fields.sensor_popup_car1_2.label) || '', helper: (fields.sensor_popup_car1_2 && fields.sensor_popup_car1_2.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car1_2_name', label: (fields.sensor_popup_car1_2_name && fields.sensor_popup_car1_2_name.label) || '', helper: (fields.sensor_popup_car1_2_name && fields.sensor_popup_car1_2_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car1_3', label: (fields.sensor_popup_car1_3 && fields.sensor_popup_car1_3.label) || '', helper: (fields.sensor_popup_car1_3 && fields.sensor_popup_car1_3.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car1_3_name', label: (fields.sensor_popup_car1_3_name && fields.sensor_popup_car1_3_name.label) || '', helper: (fields.sensor_popup_car1_3_name && fields.sensor_popup_car1_3_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car1_4', label: (fields.sensor_popup_car1_4 && fields.sensor_popup_car1_4.label) || '', helper: (fields.sensor_popup_car1_4 && fields.sensor_popup_car1_4.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car1_4_name', label: (fields.sensor_popup_car1_4_name && fields.sensor_popup_car1_4_name.label) || '', helper: (fields.sensor_popup_car1_4_name && fields.sensor_popup_car1_4_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car1_5', label: (fields.sensor_popup_car1_5 && fields.sensor_popup_car1_5.label) || '', helper: (fields.sensor_popup_car1_5 && fields.sensor_popup_car1_5.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car1_5_name', label: (fields.sensor_popup_car1_5_name && fields.sensor_popup_car1_5_name.label) || '', helper: (fields.sensor_popup_car1_5_name && fields.sensor_popup_car1_5_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car1_6', label: (fields.sensor_popup_car1_6 && fields.sensor_popup_car1_6.label) || '', helper: (fields.sensor_popup_car1_6 && fields.sensor_popup_car1_6.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car1_6_name', label: (fields.sensor_popup_car1_6_name && fields.sensor_popup_car1_6_name.label) || '', helper: (fields.sensor_popup_car1_6_name && fields.sensor_popup_car1_6_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car2_1', label: (fields.sensor_popup_car2_1 && fields.sensor_popup_car2_1.label) || '', helper: (fields.sensor_popup_car2_1 && fields.sensor_popup_car2_1.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car2_1_name', label: (fields.sensor_popup_car2_1_name && fields.sensor_popup_car2_1_name.label) || '', helper: (fields.sensor_popup_car2_1_name && fields.sensor_popup_car2_1_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car2_2', label: (fields.sensor_popup_car2_2 && fields.sensor_popup_car2_2.label) || '', helper: (fields.sensor_popup_car2_2 && fields.sensor_popup_car2_2.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car2_2_name', label: (fields.sensor_popup_car2_2_name && fields.sensor_popup_car2_2_name.label) || '', helper: (fields.sensor_popup_car2_2_name && fields.sensor_popup_car2_2_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car2_3', label: (fields.sensor_popup_car2_3 && fields.sensor_popup_car2_3.label) || '', helper: (fields.sensor_popup_car2_3 && fields.sensor_popup_car2_3.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car2_3_name', label: (fields.sensor_popup_car2_3_name && fields.sensor_popup_car2_3_name.label) || '', helper: (fields.sensor_popup_car2_3_name && fields.sensor_popup_car2_3_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car2_4', label: (fields.sensor_popup_car2_4 && fields.sensor_popup_car2_4.label) || '', helper: (fields.sensor_popup_car2_4 && fields.sensor_popup_car2_4.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car2_4_name', label: (fields.sensor_popup_car2_4_name && fields.sensor_popup_car2_4_name.label) || '', helper: (fields.sensor_popup_car2_4_name && fields.sensor_popup_car2_4_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car2_5', label: (fields.sensor_popup_car2_5 && fields.sensor_popup_car2_5.label) || '', helper: (fields.sensor_popup_car2_5 && fields.sensor_popup_car2_5.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car2_5_name', label: (fields.sensor_popup_car2_5_name && fields.sensor_popup_car2_5_name.label) || '', helper: (fields.sensor_popup_car2_5_name && fields.sensor_popup_car2_5_name.helper) || '', selector: { text: {} } },
          { name: 'sensor_popup_car2_6', label: (fields.sensor_popup_car2_6 && fields.sensor_popup_car2_6.label) || '', helper: (fields.sensor_popup_car2_6 && fields.sensor_popup_car2_6.helper) || '', selector: popupEntitySelector },
          { name: 'sensor_popup_car2_6_name', label: (fields.sensor_popup_car2_6_name && fields.sensor_popup_car2_6_name.label) || '', helper: (fields.sensor_popup_car2_6_name && fields.sensor_popup_car2_6_name.helper) || '', selector: { text: {} } },
        ]),
        footer: define([
          { name: 'footer_update_interval', label: fields.footer_update_interval.label, helper: fields.footer_update_interval.helper, selector: { number: { min: 1, max: 60, step: 1, mode: 'box', unit_of_measurement: 'min' } } },
          { type: 'divider' },
          { name: 'footer_card1_slot1_source', label: fields.footer_card1_slot1_source.label, helper: fields.footer_card1_slot1_source.helper, selector: { select: { options: sourceOptions, mode: 'dropdown' } } },
          { name: 'footer_card1_slot1_entity', label: fields.footer_card1_slot1_entity.label, helper: fields.footer_card1_slot1_entity.helper, selector: entitySelector },
          { name: 'footer_card1_slot1_stat_type', label: fields.footer_card1_slot1_stat_type.label, helper: fields.footer_card1_slot1_stat_type.helper, selector: { select: { options: statTypeOptions, mode: 'dropdown' } } },
          { name: 'footer_card1_slot1_label', label: fields.footer_card1_slot1_label.label, helper: fields.footer_card1_slot1_label.helper, selector: { text: { mode: 'blur' } } },
          { name: 'footer_card1_slot2_source', label: fields.footer_card1_slot2_source.label, helper: fields.footer_card1_slot2_source.helper, selector: { select: { options: sourceOptions, mode: 'dropdown' } } },
          { name: 'footer_card1_slot2_entity', label: fields.footer_card1_slot2_entity.label, helper: fields.footer_card1_slot2_entity.helper, selector: entitySelector },
          { name: 'footer_card1_slot2_stat_type', label: fields.footer_card1_slot2_stat_type.label, helper: fields.footer_card1_slot2_stat_type.helper, selector: { select: { options: statTypeOptions, mode: 'dropdown' } } },
          { name: 'footer_card1_slot2_label', label: fields.footer_card1_slot2_label.label, helper: fields.footer_card1_slot2_label.helper, selector: { text: { mode: 'blur' } } },
          { type: 'divider' },
          { name: 'footer_card2_slot1_source', label: fields.footer_card2_slot1_source.label, helper: fields.footer_card2_slot1_source.helper, selector: { select: { options: sourceOptions, mode: 'dropdown' } } },
          { name: 'footer_card2_slot1_entity', label: fields.footer_card2_slot1_entity.label, helper: fields.footer_card2_slot1_entity.helper, selector: entitySelector },
          { name: 'footer_card2_slot1_stat_type', label: fields.footer_card2_slot1_stat_type.label, helper: fields.footer_card2_slot1_stat_type.helper, selector: { select: { options: statTypeOptions, mode: 'dropdown' } } },
          { name: 'footer_card2_slot1_label', label: fields.footer_card2_slot1_label.label, helper: fields.footer_card2_slot1_label.helper, selector: { text: { mode: 'blur' } } },
          { name: 'footer_card2_slot2_source', label: fields.footer_card2_slot2_source.label, helper: fields.footer_card2_slot2_source.helper, selector: { select: { options: sourceOptions, mode: 'dropdown' } } },
          { name: 'footer_card2_slot2_entity', label: fields.footer_card2_slot2_entity.label, helper: fields.footer_card2_slot2_entity.helper, selector: entitySelector },
          { name: 'footer_card2_slot2_stat_type', label: fields.footer_card2_slot2_stat_type.label, helper: fields.footer_card2_slot2_stat_type.helper, selector: { select: { options: statTypeOptions, mode: 'dropdown' } } },
          { name: 'footer_card2_slot2_label', label: fields.footer_card2_slot2_label.label, helper: fields.footer_card2_slot2_label.helper, selector: { text: { mode: 'blur' } } },
          { type: 'divider' },
          { name: 'footer_card3_slot1_source', label: fields.footer_card3_slot1_source.label, helper: fields.footer_card3_slot1_source.helper, selector: { select: { options: sourceOptions, mode: 'dropdown' } } },
          { name: 'footer_card3_slot1_entity', label: fields.footer_card3_slot1_entity.label, helper: fields.footer_card3_slot1_entity.helper, selector: entitySelector },
          { name: 'footer_card3_slot1_stat_type', label: fields.footer_card3_slot1_stat_type.label, helper: fields.footer_card3_slot1_stat_type.helper, selector: { select: { options: statTypeOptions, mode: 'dropdown' } } },
          { name: 'footer_card3_slot1_label', label: fields.footer_card3_slot1_label.label, helper: fields.footer_card3_slot1_label.helper, selector: { text: { mode: 'blur' } } },
          { name: 'footer_card3_slot2_source', label: fields.footer_card3_slot2_source.label, helper: fields.footer_card3_slot2_source.helper, selector: { select: { options: sourceOptions, mode: 'dropdown' } } },
          { name: 'footer_card3_slot2_entity', label: fields.footer_card3_slot2_entity.label, helper: fields.footer_card3_slot2_entity.helper, selector: entitySelector },
          { name: 'footer_card3_slot2_stat_type', label: fields.footer_card3_slot2_stat_type.label, helper: fields.footer_card3_slot2_stat_type.helper, selector: { select: { options: statTypeOptions, mode: 'dropdown' } } },
          { name: 'footer_card3_slot2_label', label: fields.footer_card3_slot2_label.label, helper: fields.footer_card3_slot2_label.helper, selector: { text: { mode: 'blur' } } },
          { type: 'divider' },
          { name: 'footer_card4_slot1_source', label: fields.footer_card4_slot1_source.label, helper: fields.footer_card4_slot1_source.helper, selector: { select: { options: sourceOptions, mode: 'dropdown' } } },
          { name: 'footer_card4_slot1_entity', label: fields.footer_card4_slot1_entity.label, helper: fields.footer_card4_slot1_entity.helper, selector: entitySelector },
          { name: 'footer_card4_slot1_stat_type', label: fields.footer_card4_slot1_stat_type.label, helper: fields.footer_card4_slot1_stat_type.helper, selector: { select: { options: statTypeOptions, mode: 'dropdown' } } },
          { name: 'footer_card4_slot1_label', label: fields.footer_card4_slot1_label.label, helper: fields.footer_card4_slot1_label.helper, selector: { text: { mode: 'blur' } } },
          { name: 'footer_card4_slot2_source', label: fields.footer_card4_slot2_source.label, helper: fields.footer_card4_slot2_source.helper, selector: { select: { options: sourceOptions, mode: 'dropdown' } } },
          { name: 'footer_card4_slot2_entity', label: fields.footer_card4_slot2_entity.label, helper: fields.footer_card4_slot2_entity.helper, selector: entitySelector },
          { name: 'footer_card4_slot2_stat_type', label: fields.footer_card4_slot2_stat_type.label, helper: fields.footer_card4_slot2_stat_type.helper, selector: { select: { options: statTypeOptions, mode: 'dropdown' } } },
          { name: 'footer_card4_slot2_label', label: fields.footer_card4_slot2_label.label, helper: fields.footer_card4_slot2_label.helper, selector: { text: { mode: 'blur' } } },
          { type: 'divider' },
          { name: 'footer_card5_slot1_source', label: fields.footer_card5_slot1_source.label, helper: fields.footer_card5_slot1_source.helper, selector: { select: { options: sourceOptions, mode: 'dropdown' } } },
          { name: 'footer_card5_slot1_entity', label: fields.footer_card5_slot1_entity.label, helper: fields.footer_card5_slot1_entity.helper, selector: entitySelector },
          { name: 'footer_card5_slot1_stat_type', label: fields.footer_card5_slot1_stat_type.label, helper: fields.footer_card5_slot1_stat_type.helper, selector: { select: { options: statTypeOptions, mode: 'dropdown' } } },
          { name: 'footer_card5_slot1_label', label: fields.footer_card5_slot1_label.label, helper: fields.footer_card5_slot1_label.helper, selector: { text: { mode: 'blur' } } },
          { name: 'footer_card5_slot2_source', label: fields.footer_card5_slot2_source.label, helper: fields.footer_card5_slot2_source.helper, selector: { select: { options: sourceOptions, mode: 'dropdown' } } },
          { name: 'footer_card5_slot2_entity', label: fields.footer_card5_slot2_entity.label, helper: fields.footer_card5_slot2_entity.helper, selector: entitySelector },
          { name: 'footer_card5_slot2_stat_type', label: fields.footer_card5_slot2_stat_type.label, helper: fields.footer_card5_slot2_stat_type.helper, selector: { select: { options: statTypeOptions, mode: 'dropdown' } } },
          { name: 'footer_card5_slot2_label', label: fields.footer_card5_slot2_label.label, helper: fields.footer_card5_slot2_label.helper, selector: { text: { mode: 'blur' } } },
          { type: 'divider' },
          { name: 'footer_card6_slot1_source', label: fields.footer_card6_slot1_source.label, helper: fields.footer_card6_slot1_source.helper, selector: { select: { options: sourceOptions, mode: 'dropdown' } } },
          { name: 'footer_card6_slot1_entity', label: fields.footer_card6_slot1_entity.label, helper: fields.footer_card6_slot1_entity.helper, selector: entitySelector },
          { name: 'footer_card6_slot1_stat_type', label: fields.footer_card6_slot1_stat_type.label, helper: fields.footer_card6_slot1_stat_type.helper, selector: { select: { options: statTypeOptions, mode: 'dropdown' } } },
          { name: 'footer_card6_slot1_label', label: fields.footer_card6_slot1_label.label, helper: fields.footer_card6_slot1_label.helper, selector: { text: { mode: 'blur' } } },
          { name: 'footer_card6_slot2_source', label: fields.footer_card6_slot2_source.label, helper: fields.footer_card6_slot2_source.helper, selector: { select: { options: sourceOptions, mode: 'dropdown' } } },
          { name: 'footer_card6_slot2_entity', label: fields.footer_card6_slot2_entity.label, helper: fields.footer_card6_slot2_entity.helper, selector: entitySelector },
          { name: 'footer_card6_slot2_stat_type', label: fields.footer_card6_slot2_stat_type.label, helper: fields.footer_card6_slot2_stat_type.helper, selector: { select: { options: statTypeOptions, mode: 'dropdown' } } },
          { name: 'footer_card6_slot2_label', label: fields.footer_card6_slot2_label.label, helper: fields.footer_card6_slot2_label.helper, selector: { text: { mode: 'blur' } } },
        ]),
        displayStyle: define([
          { name: 'card_label_color', label: (fields.card_label_color && fields.card_label_color.label) || 'Card Label Color', helper: (fields.card_label_color && fields.card_label_color.helper) || '', selector: { color_picker: {} }, default: '' },
          { name: 'card_label_font_size', label: (fields.card_label_font_size && fields.card_label_font_size.label) || 'Card Label Font Size', helper: (fields.card_label_font_size && fields.card_label_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '' },
          { name: 'card_value_css', label: (fields.card_value_css && fields.card_value_css.label) || 'Additional Value CSS', helper: (fields.card_value_css && fields.card_value_css.helper) || '', selector: { text: { mode: 'blur' } }, default: '' },
          { name: 'card_value_color', label: (fields.card_value_color && fields.card_value_color.label) || 'Card Value Color', helper: (fields.card_value_color && fields.card_value_color.helper) || '', selector: { color_picker: {} }, default: '' },
          { name: 'card_value_font_size', label: (fields.card_value_font_size && fields.card_value_font_size.label) || 'Card Value Font Size', helper: (fields.card_value_font_size && fields.card_value_font_size.helper) || '', selector: { text: { mode: 'blur' } }, default: '' },
          { name: 'card_background_color', label: (fields.card_background_color && fields.card_background_color.label) || 'Card Background Color', helper: (fields.card_background_color && fields.card_background_color.helper) || '', selector: { color_picker: {} }, default: '' },
          { name: 'card_label_css', label: (fields.card_label_css && fields.card_label_css.label) || 'Additional Label CSS', helper: (fields.card_label_css && fields.card_label_css.helper) || '', selector: { text: { mode: 'blur' } }, default: '' },
          { name: 'font_family', label: (fields.font_family && fields.font_family.label) || 'Font Family', helper: (fields.font_family && fields.font_family.helper) || '', selector: { text: { mode: 'blur' } }, default: 'sans-serif' },
        ]),
      };
    },
    buildSections(editor, sections, schemaDefs) {
      return [
        { id: 'pvCommon', title: sections.pvCommon.title, helper: sections.pvCommon.helper, schema: schemaDefs.pvCommon, defaultOpen: false },
        { id: 'array1', title: sections.array1.title, helper: sections.array1.helper, schema: schemaDefs.array1, defaultOpen: false },
        { id: 'array2', title: sections.array2.title, helper: sections.array2.helper, renderContent: () => {
          const wrapper = document.createElement('div');
          wrapper.appendChild(editor._createForm(schemaDefs.array2));
          return wrapper;
        }, defaultOpen: false },
        { id: 'battery', title: sections.battery.title, helper: sections.battery.helper, schema: schemaDefs.battery, defaultOpen: false },
        { id: 'grid', title: sections.grid.title, helper: sections.grid.helper, schema: schemaDefs.grid, defaultOpen: false },
        { id: 'car', title: sections.car.title, helper: sections.car.helper, schema: schemaDefs.car, defaultOpen: false },
        { id: 'other', title: sections.other.title, helper: sections.other.helper, schema: schemaDefs.other, defaultOpen: false },
        { id: 'pvPopup', title: sections.pvPopup.title, helper: sections.pvPopup.helper, schema: schemaDefs.pvPopup, defaultOpen: false },
        { id: 'batteryPopup', title: sections.batteryPopup.title, helper: sections.batteryPopup.helper, schema: schemaDefs.batteryPopup, defaultOpen: false },
        { id: 'gridPopup', title: sections.gridPopup.title, helper: sections.gridPopup.helper, schema: schemaDefs.gridPopup, defaultOpen: false },
        { id: 'housePopup', title: sections.housePopup.title, helper: sections.housePopup.helper, schema: schemaDefs.housePopup, defaultOpen: false },
        { id: 'carPopup', title: sections.carPopup.title, helper: sections.carPopup.helper, schema: schemaDefs.carPopup, defaultOpen: false },
        { id: 'footer', title: sections.footer.title, helper: sections.footer.helper, schema: schemaDefs.footer, defaultOpen: false },
      ];
    }
  }
};

// Keys that always live at the top level of the YAML config (never inside _profiles).
// Used by: migration, editor write routing, and the render-path merge.
export const GENERAL_CONFIG_KEYS = new Set([
  'background', 'day_night_mode', 'night_mode', 'language', 'display_unit',
  'update_interval', 'initial_configuration', 'enable_echo_alive',
  'animation_speed_factor', 'animation_style', 'night_animation_style',
  'dashes_glow_intensity', 'flow_stroke_width', 'fluid_flow_stroke_width',
  'arrow_scale',
  'sun_moon_display', 'sun_moon_arc_color', 'sun_moon_arc_stroke_width',
  'sun_moon_sunrise_label', 'sun_moon_sunset_label', 'sun_moon_label_color',
  'sun_moon_label_font_size',
  'electron_spread', 'electron_spacing', 'electron_spacing_variance',
  'electron_size', 'electron_size_variance',
  'electron_pulse', 'electron_pulse_rate',
  'electron_power_min', 'electron_power_max',
  'electron_speed_min', 'electron_speed_max',
]);
