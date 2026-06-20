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
import { STUB_CONFIG } from './modules/stub-config.js';
import { getStateSafe, getEntityName, formatPower, formatEnergy, formatPopupValue } from './modules/entity-helpers.js';
import { ensureGoogleFont } from './modules/font-loader.js';
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
  GENERAL_CONFIG_KEYS,
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
    this._defaults = (() => {
      const stub = (typeof AdvancedEnergyCard.getStubConfig === 'function')
        ? AdvancedEnergyCard.getStubConfig()
        : {};
      const general = {};
      for (const k of GENERAL_CONFIG_KEYS) {
        if (k in stub) general[k] = stub[k];
      }
      return general;
    })();
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
    this._footerStatsCache = {};
    this._footerStatsTimer = null;
  }

  _ensureGoogleFont(fontFamily) {
    ensureGoogleFont(fontFamily);
  }

  setConfig(rawConfig) {
    if (!rawConfig) {
      throw new Error('Invalid configuration');
    }

    // Validate + migrate to Option A structured format (general keys at top level,
    // profile keys always inside _profiles[snapshotKey])
    const validated = ConfigValidator.validate(rawConfig, {});
    this._fullConfig = validated;

    // Build flat merged view for the render path:
    //   general defaults < profile defaults < profile values < user general settings
    const profileId = this._resolveProfileIdSync(validated);
    const snapshotKey = this._resolveSnapshotKeySync(validated, profileId);
    const profileValues = (validated._profiles && validated._profiles[snapshotKey]) || {};
    const profileDefaults = SEED_DEFAULTS[profileId] || {};

    this.config = {
      ...this._defaults,
      ...profileDefaults,
      ...profileValues,
      ...this._extractGeneral(validated),
    };

    this._forceRender = true;
    this._prevViewState = null;
    this._footerStatsCache = {};
    if (this._hass) this._startFooterStatsPolling();
  }

  _resolveProfileIdSync(config) {
    const bg = (config.background || '').trim();
    if (bg.endsWith('/overview.svg') || bg === 'overview.svg') return 'overview';
    return 'tech';
  }

  _resolveSnapshotKeySync(config, profileId) {
    const bg = (config.background || '').trim();
    const builtinFile = profileId + '.svg';
    if (!bg || bg.endsWith('/' + builtinFile) || bg === builtinFile) return profileId;
    const filename = bg.split('/').pop()
      .replace(/\.svg$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/^_+|_+$/g, '') || 'unknown';
    return `${profileId}-${filename}`;
  }

  _extractGeneral(config) {
    const out = {};
    for (const k of GENERAL_CONFIG_KEYS) {
      if (k in config) out[k] = config[k];
    }
    return out;
  }

  _hasAutoFooterSlots() {
    if (!this.config) return false;
    for (let c = 1; c <= 6; c++) {
      for (let s = 1; s <= 2; s++) {
        if ((this.config[`footer_card${c}_slot${s}_source`] || 'custom') !== 'custom') return true;
      }
    }
    return false;
  }

  _startFooterStatsPolling() {
    if (this._footerStatsTimer) {
      clearInterval(this._footerStatsTimer);
      this._footerStatsTimer = null;
    }
    if (!this._hasAutoFooterSlots()) return;
    const intervalMinutes = Math.max(1, parseInt(this.config.footer_update_interval || 5, 10));
    this._fetchFooterStats();
    this._footerStatsTimer = setInterval(() => this._fetchFooterStats(), intervalMinutes * 60 * 1000);
  }

  _computeStatTimeRange(source) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const dow = todayStart.getDay();
    const daysToMonday = dow === 0 ? 6 : dow - 1;
    const thisWeekStart = new Date(todayStart.getTime() - daysToMonday * 86400000);
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 86400000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    switch (source) {
      case 'auto_today':      return { start: todayStart, end: now, period: 'day' };
      case 'auto_yesterday':  return { start: yesterdayStart, end: todayStart, period: 'day' };
      case 'auto_this_week':  return { start: thisWeekStart, end: now, period: 'week' };
      case 'auto_last_week':  return { start: lastWeekStart, end: thisWeekStart, period: 'week' };
      case 'auto_this_month': return { start: thisMonthStart, end: now, period: 'month' };
      case 'auto_last_month': return { start: lastMonthStart, end: thisMonthStart, period: 'month' };
      case 'auto_this_year':  return { start: thisYearStart, end: now, period: 'month' };
      case 'auto_last_year':  return { start: lastYearStart, end: thisYearStart, period: 'month' };
      default: return null;
    }
  }

  _formatStatValue(value, entityId) {
    const state = this._hass && this._hass.states && this._hass.states[entityId];
    const unit = (state && state.attributes && state.attributes.unit_of_measurement) || '';
    if (!isFinite(value)) return '';
    const rounded = Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(2);
    return unit ? `${rounded} ${unit}` : rounded;
  }

  async _fetchFooterStats() {
    if (!this._hass || !this.config) return;
    const slots = [];
    for (let c = 1; c <= 6; c++) {
      for (let s = 1; s <= 2; s++) {
        const source = this.config[`footer_card${c}_slot${s}_source`] || 'custom';
        if (source === 'custom') continue;
        const entity = (this.config[`footer_card${c}_slot${s}_entity`] || '').trim();
        if (!entity) continue;
        const statType = this.config[`footer_card${c}_slot${s}_stat_type`] || 'sum';
        const range = this._computeStatTimeRange(source);
        if (!range) continue;
        slots.push({ key: `${c}-${s}`, entity, statType, range });
      }
    }
    if (!slots.length) return;
    const newCache = { ...this._footerStatsCache };
    for (const slot of slots) {
      try {
        // For difference mode, hourly buckets are needed so we have multiple state
        // readings to subtract. Weekly/monthly periods return a single bucket whose
        // `sum` is the cumulative total since recording started — not the period delta.
        const period = slot.statType === 'difference' ? 'hour' : slot.range.period;
        const result = await this._hass.connection.sendMessagePromise({
          type: 'recorder/statistics_during_period',
          start_time: slot.range.start.toISOString(),
          end_time: slot.range.end.toISOString(),
          statistic_ids: [slot.entity],
          period,
          units: {},
          types: ['sum', 'mean', 'state'],
        });
        const buckets = (result && result[slot.entity]) || [];
        if (!buckets.length) { newCache[slot.key] = ''; continue; }
        let displayValue;
        if (slot.statType === 'sum') {
          const total = buckets.reduce((acc, b) => acc + (b.sum || 0), 0);
          displayValue = this._formatStatValue(total, slot.entity);
        } else if (slot.statType === 'difference') {
          // last.state − first.state across the hourly readings
          const valid = buckets.filter(b => b.state !== null && b.state !== undefined && isFinite(Number(b.state)));
          if (valid.length >= 2) {
            displayValue = this._formatStatValue(Number(valid[valid.length - 1].state) - Number(valid[0].state), slot.entity);
          } else {
            displayValue = '';
          }
        } else {
          const avg = buckets.reduce((acc, b) => acc + (b.mean || 0), 0) / buckets.length;
          displayValue = this._formatStatValue(avg, slot.entity);
        }
        newCache[slot.key] = displayValue;
      } catch (_) {
        // leave prior cached value on error
      }
    }
    this._footerStatsCache = newCache;
    this._forceRender = true;
    this.render();
  }

  set hass(hass) {
    const firstHass = !this._hass;
    this._hass = hass;
    if (!this.config) {
      return;
    }
    if (firstHass) this._startFooterStatsPolling();
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
    return STUB_CONFIG;
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
    if (this._footerStatsTimer) {
      clearInterval(this._footerStatsTimer);
      this._footerStatsTimer = null;
    }
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

  getStateSafe(entity_id) { return getStateSafe(this._hass, entity_id); }

  getEntityName(entity_id) { return getEntityName(this._hass, entity_id); }

  formatPower(watts, use_kw) { return formatPower(watts, use_kw); }

  formatEnergy(wattHours, use_kw) { return formatEnergy(wattHours, use_kw); }

  formatPopupValue(_unused, sensorId) { return formatPopupValue(this._hass, _unused, sensorId); }

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
    this._prevViewState = this._renderManager._snapshotViewState(viewState);
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

  static get version() {
    return '2.0.0';
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

