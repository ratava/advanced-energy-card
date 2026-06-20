import { applySvgLayerVisibility } from './svg-layer-visibility.js';

/**
 * Sun/Moon Manager
 * Centralizes auto day/night-mode detection and the sun/moon arc indicator
 */
export class SunMoonManager {
  /**
   * @param {object} card - Reference to the AdvancedEnergyCard instance
   */
  constructor(card) {
    this.card = card;
    this._lastSunState = null;
    this._lastEffectiveNightMode = null;
    this._srOrigLabelText = undefined;
    this._ssOrigLabelText = undefined;
  }

  /**
   * Auto day/night mode should react immediately to sun.sun changes.
   * Home Assistant calls the `hass` setter on state changes, but the card
   * intentionally throttles full renders via update_interval.
   * When the sun flips above/below horizon, re-apply layer visibility right away.
   */
  _checkNightModeChange() {
    const card = this.card;
    const mode = card.config && typeof card.config.day_night_mode === 'string'
      ? card.config.day_night_mode.trim().toLowerCase()
      : '';
    if (mode === 'auto') {
      const sunState = card._hass && card._hass.states && card._hass.states['sun.sun']
        ? card._hass.states['sun.sun'].state
        : null;
      if (sunState && sunState !== this._lastSunState) {
        this._lastSunState = sunState;

        // If the effective day/night flips, trigger a render so animation style can switch immediately.
        try {
          const prevNight = this._lastEffectiveNightMode;
          const nextNight = this._computeEffectiveNightMode(card.config);
          this._lastEffectiveNightMode = nextNight;
          if (prevNight !== null && nextNight !== prevNight) {
            card._forceRender = true;
            window.location.reload();
          }
        } catch (e) {
          // ignore
        }

        // Best-effort: update the already-loaded background SVG layers without a full render.
        if (!card._domRefs) {
          card._renderManager._cacheDomReferences();
        }
        const refs = card._domRefs;
        if (refs && refs.backgroundSvg && refs.backgroundSvg.children && refs.backgroundSvg.children.length > 0) {
          applySvgLayerVisibility(refs.backgroundSvg, this._layerConfigWithEffectiveNight(card.config));
        } else if (card.shadowRoot) {
          const svgElement = card.shadowRoot.querySelector('svg');
          if (svgElement) {
            applySvgLayerVisibility(svgElement, this._layerConfigWithEffectiveNight(card.config));
          }
        }
      }
    }
  }

  _computeEffectiveNightMode(config) {
    const rawMode = config && typeof config.day_night_mode === 'string'
      ? config.day_night_mode.trim().toLowerCase()
      : '';
    if (rawMode === 'day') {
      return false;
    }
    if (rawMode === 'night') {
      return true;
    }
    if (rawMode === 'auto') {
      const sun = this.card._hass && this.card._hass.states ? this.card._hass.states['sun.sun'] : null;
      const sunState = sun && typeof sun.state === 'string' ? sun.state : '';
      if (sunState === 'below_horizon') {
        return true;
      }
      if (sunState === 'above_horizon') {
        return false;
      }
      return false;
    }
    // Legacy fallback: existing configs that only have boolean night_mode.
    return Boolean(config && config.night_mode);
  }

  _layerConfigWithEffectiveNight(config) {
    const base = config || {};
    const night = this._computeEffectiveNightMode(base);
    return { ...base, night_mode: night };
  }

  /**
   * Parse a sun time string (ISO timestamp or HH:MM) into a millisecond timestamp for today.
   * Returns null if unparseable.
   * @param {string} stateStr
   * @returns {number|null}
   */
  _parseSunTime(stateStr) {
    if (!stateStr || typeof stateStr !== 'string') return null;
    const s = stateStr.trim();
    if (!s || s === 'unknown' || s === 'unavailable') return null;
    // ISO 8601 (e.g. "2025-07-15T06:45:00+02:00")
    if (s.includes('T') || s.includes('-')) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d.getTime();
    }
    // HH:MM or HH:MM:SS
    const parts = s.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d.getTime();
      }
    }
    return null;
  }

  /**
   * Build the sunMoon view-state slot for the current config/hass.
   * @param {object} config
   * @returns {object}
   */
  _buildSunMoonViewState(config) {
    const card = this.card;
    const sunMoonDisplay = config.sun_moon_display || 'off';
    let sunMoonViewState = { mode: 'off', progress: 0.5, isDaytime: true, sunriseText: '--:--', sunsetText: '--:--', labelColor: '', labelFontSize: '' };
    if (sunMoonDisplay !== 'off') {
      const _sunEntity = card._hass && card._hass.states ? card._hass.states['sun.sun'] : null;
      const _sunriseStr = (_sunEntity && _sunEntity.attributes) ? (_sunEntity.attributes.next_rising || '') : '';
      const _sunsetStr = (_sunEntity && _sunEntity.attributes) ? (_sunEntity.attributes.next_setting || '') : '';
      const _riseMs = this._parseSunTime(_sunriseStr);
      const _setMs = this._parseSunTime(_sunsetStr);
      const _nowMs = Date.now();
      const _DAY_MS = 86400000;
      const _formatHHMM = (ms) => {
        const d = new Date(ms);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      };
      let _progress = 0.5;
      const _isDaytime = _sunEntity ? _sunEntity.state === 'above_horizon' : true;
      let _sunriseText = '--:--';
      let _sunsetText = '--:--';
      if (_riseMs !== null && _setMs !== null) {
        if (_isDaytime) {
          // next_setting = tonight's sunset, next_rising - 24h ≈ today's sunrise
          const _todaySunrise = _riseMs - _DAY_MS;
          const _todaySunset = _setMs;
          _sunriseText = _formatHHMM(_todaySunrise);
          _sunsetText = _formatHHMM(_todaySunset);
          const _daySpan = _todaySunset - _todaySunrise;
          _progress = _daySpan > 0 ? (_nowMs - _todaySunrise) / _daySpan : 0.5;
        } else {
          // next_rising = tomorrow's sunrise, next_setting - 24h ≈ today's sunset
          // Moon travels left→right (sunset to sunrise), so left label = sunset, right = sunrise
          const _todaySunset = _setMs - _DAY_MS;
          const _tomorrowSunrise = _riseMs;
          _sunriseText = _formatHHMM(_todaySunset);    // left position = sunset time
          _sunsetText = _formatHHMM(_tomorrowSunrise); // right position = sunrise time
          const _nightSpan = _tomorrowSunrise - _todaySunset;
          _progress = _nightSpan > 0 ? (_nowMs - _todaySunset) / _nightSpan : 0.5;
        }
        _progress = Math.max(0, Math.min(1, _progress));
      }
      sunMoonViewState = {
        mode: sunMoonDisplay,
        progress: _progress,
        isDaytime: _isDaytime,
        sunriseText: _sunriseText,
        sunsetText: _sunsetText,
        arcColor: config.sun_moon_arc_color || '',
        arcStrokeWidth: config.sun_moon_arc_stroke_width || '',
        labelColor: config.sun_moon_label_color || '',
        labelFontSize: config.sun_moon_label_font_size || '',
        sunriseLabelText: config.sun_moon_sunrise_label || '',
        sunsetLabelText: config.sun_moon_sunset_label || ''
      };
    }
    return sunMoonViewState;
  }

  /**
   * Position the sun or moon icon along the arc path based on current time.
   * @param {object} viewState
   */
  _updateSunMoonPosition(viewState) {
    if (!viewState || !viewState.sunMoon) return;
    const sm = viewState.sunMoon;
    const card = this.card;
    if (!card._domRefs) return;
    const svgRoot = card._domRefs.backgroundSvg || card._domRefs.svgRoot;
    if (!svgRoot) return;

    const traveller = svgRoot.querySelector('[data-role="sun-moon-traveller"]');
    if (!traveller) return;

    if (sm.mode === 'off') {
      traveller.style.display = 'none';
      const srTimeEl = svgRoot.querySelector('[data-role="sunrise-time"]');
      const srLabelEl = svgRoot.querySelector('[data-role="sunrise-time-label"]');
      const ssTimeEl = svgRoot.querySelector('[data-role="sunset-time"]');
      const ssLabelEl = svgRoot.querySelector('[data-role="sunset-time-label"]');
      if (srTimeEl) srTimeEl.style.display = 'none';
      if (srLabelEl) srLabelEl.style.display = 'none';
      if (ssTimeEl) ssTimeEl.style.display = 'none';
      if (ssLabelEl) ssLabelEl.style.display = 'none';
      return;
    }

    // Set icon visibility first — this must happen regardless of arc availability
    const sunIcon = traveller.querySelector('[data-sun-icon]');
    const moonIcon = traveller.querySelector('[data-moon-icon]');
    const shouldShowMoon = !sm.isDaytime && sm.mode === 'sun-moon';
    const shouldShow = sm.isDaytime || shouldShowMoon;

    if (sunIcon) {
      sunIcon.style.display = sm.isDaytime ? 'inline' : 'none';
    }
    if (moonIcon) {
      moonIcon.style.display = shouldShowMoon ? 'inline' : 'none';
    }

    traveller.style.display = shouldShow ? 'inline' : 'none';

    // Arc positioning — requires getTotalLength; skip if not yet available
    const arcPath = svgRoot.querySelector('[data-flow-key="sun-moon-position"]');
    if (arcPath) {
      arcPath.setAttribute('stroke', sm.arcColor || 'none');
      if (sm.arcStrokeWidth) arcPath.setAttribute('stroke-width', sm.arcStrokeWidth);
    }
    if (shouldShow && arcPath && typeof arcPath.getTotalLength === 'function') {
      try {
        const totalLen = arcPath.getTotalLength();
        const pt = arcPath.getPointAtLength(sm.progress * totalLen);
        traveller.setAttribute('transform', `translate(${pt.x},${pt.y})`);
      } catch (e) {
        // SVG DOM not yet in layout — position will update on next render
      }
    }

    const autoLabelColor = sm.isDaytime ? '#FFD700' : '#C8D8FF';
    const labelColor = sm.labelColor || autoLabelColor;
    const srTimeEl = svgRoot.querySelector('[data-role="sunrise-time"]');
    const srLabelEl = svgRoot.querySelector('[data-role="sunrise-time-label"]');
    const ssTimeEl = svgRoot.querySelector('[data-role="sunset-time"]');
    const ssLabelEl = svgRoot.querySelector('[data-role="sunset-time-label"]');
    if (srLabelEl && this._srOrigLabelText === undefined) this._srOrigLabelText = srLabelEl.textContent || 'Sunrise';
    if (ssLabelEl && this._ssOrigLabelText === undefined) this._ssOrigLabelText = ssLabelEl.textContent || 'Sunset';
    const srLabel = sm.sunriseLabelText ? sm.sunriseLabelText : (this._srOrigLabelText || 'Sunrise');
    const ssLabel = sm.sunsetLabelText ? sm.sunsetLabelText : (this._ssOrigLabelText || 'Sunset');
    const _applyLabel = (el, text) => {
      if (!el) return;
      if (text !== undefined) el.textContent = text;
      el.setAttribute('fill', labelColor);
      el.style.fill = labelColor;
      if (sm.labelFontSize) { el.setAttribute('font-size', sm.labelFontSize); el.style.fontSize = sm.labelFontSize + 'px'; }
      el.style.display = 'inline';
    };
    if (sm.isDaytime) {
      _applyLabel(srTimeEl, sm.sunriseText);
      _applyLabel(srLabelEl, srLabel);
      _applyLabel(ssTimeEl, sm.sunsetText);
      _applyLabel(ssLabelEl, ssLabel);
    } else {
      // Moon travels left→right: left=sunset, right=sunrise — swap labels to match
      _applyLabel(srTimeEl, sm.sunriseText);
      _applyLabel(srLabelEl, ssLabel);
      _applyLabel(ssTimeEl, sm.sunsetText);
      _applyLabel(ssLabelEl, srLabel);
    }
  }
}
