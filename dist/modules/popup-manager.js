import { GEOMETRY, LocalizationManager } from './loader.js';

/**
 * Popup Manager
 * Centralizes popup overlay logic for PV, House, Battery, Grid, and Inverter entities
 * Eliminates ~800 lines of duplicate popup handling code
 */
export class PopupManager {
  /**
   * @param {object} card - Reference to the AdvancedEnergyCard instance
   */
  constructor(card) {
    this.card = card;
    this.activePopup = null;
    this.domRefs = null;
    this._listenersAttachedTo = {
      svgRoot: null,
      popupBackdrop: null,
      popupOverlay: null,
      popupLines: null
    };
    this.handleSvgClickBound = this.handleSvgClick.bind(this);
    this.handleLineActivateBound = this.handleLineActivate.bind(this);
    this.handleBackdropClickBound = (event) => {
      try {
        if (event && event.target === this.card._domRefs.popupBackdrop) {
          this.closePopup();
        }
      } catch (e) {
        // ignore
      }
    };
    this.handleOverlayClickBound = (event) => {
      try {
        if (event && typeof event.stopPropagation === 'function') {
          event.stopPropagation();
        }
        this.closePopup();
      } catch (e) {
        // ignore
      }
    };
  }

  /**
   * Initialize DOM references
   * @param {object} refs - DOM references from the card
   */
  setDomRefs(refs) {
    this.domRefs = refs;
  }

  /**
   * Attach (and detach stale) DOM event listeners for popup interactions:
   * SVG data-action clicks, backdrop/overlay close clicks, and popup line activation.
   * @param {object} domRefs - Current DOM references from the card
   */
  attachEventListeners(domRefs) {
    if (!this.card.shadowRoot || !domRefs) return;

    // Delegate SVG clicks using data-action="popup:<type>" (pv/house/battery/grid/inverter/car1/car2)
    const svgRoot = domRefs.svgRoot;
    if (this._listenersAttachedTo.svgRoot && this._listenersAttachedTo.svgRoot !== svgRoot) {
      try {
        this._listenersAttachedTo.svgRoot.removeEventListener('click', this.handleSvgClickBound);
      } catch (e) {
        console.warn('Error removing listener:', e);
      }
      this._listenersAttachedTo.svgRoot = null;
    }
    if (svgRoot && this._listenersAttachedTo.svgRoot !== svgRoot) {
      try {
        svgRoot.addEventListener('click', this.handleSvgClickBound);
        this._listenersAttachedTo.svgRoot = svgRoot;
      } catch (e) {
        console.error('Error attaching listener:', e);
      }
    }

    // Close popup when clicking the backdrop (outside) or the popup itself
    const popupBackdrop = domRefs.popupBackdrop;
    if (this._listenersAttachedTo.popupBackdrop && this._listenersAttachedTo.popupBackdrop !== popupBackdrop) {
      try {
        this._listenersAttachedTo.popupBackdrop.removeEventListener('click', this.handleBackdropClickBound);
      } catch (e) {
        // ignore
      }
      this._listenersAttachedTo.popupBackdrop = null;
    }
    if (popupBackdrop && this._listenersAttachedTo.popupBackdrop !== popupBackdrop) {
      try {
        popupBackdrop.addEventListener('click', this.handleBackdropClickBound);
        this._listenersAttachedTo.popupBackdrop = popupBackdrop;
      } catch (e) {
        // ignore
      }
    }

    const popupOverlay = domRefs.popupOverlay;
    if (this._listenersAttachedTo.popupOverlay && this._listenersAttachedTo.popupOverlay !== popupOverlay) {
      try {
        this._listenersAttachedTo.popupOverlay.removeEventListener('click', this.handleOverlayClickBound);
      } catch (e) {
        // ignore
      }
      this._listenersAttachedTo.popupOverlay = null;
    }
    if (popupOverlay && this._listenersAttachedTo.popupOverlay !== popupOverlay) {
      try {
        popupOverlay.addEventListener('click', this.handleOverlayClickBound);
        this._listenersAttachedTo.popupOverlay = popupOverlay;
      } catch (e) {
        // ignore
      }
    }

    const popupLines = domRefs.popupLines;
    if (this._listenersAttachedTo.popupLines && this._listenersAttachedTo.popupLines !== popupLines) {
      try {
        this._listenersAttachedTo.popupLines.removeEventListener('click', this.handleLineActivateBound);
        this._listenersAttachedTo.popupLines.removeEventListener('keydown', this.handleLineActivateBound);
      } catch (e) {
        // ignore
      }
      this._listenersAttachedTo.popupLines = null;
    }
    if (popupLines && this._listenersAttachedTo.popupLines !== popupLines) {
      try {
        popupLines.addEventListener('click', this.handleLineActivateBound);
        popupLines.addEventListener('keydown', this.handleLineActivateBound);
        this._listenersAttachedTo.popupLines = popupLines;
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Handle clicks on SVG elements with data-action="popup:<type>"
   * @param {Event} event - Click event
   */
  handleSvgClick(event) {
    try {
      const target = event && event.target;
      const svgRoot = this.card._domRefs && this.card._domRefs.svgRoot ? this.card._domRefs.svgRoot : null;

      // Some HA/SVG environments don't support Element.closest on SVG nodes reliably.
      // Use composedPath first, then fall back to walking up the DOM tree.
      let actionEl = null;
      if (event && typeof event.composedPath === 'function') {
        const path = event.composedPath();
        if (Array.isArray(path)) {
          actionEl = path.find((n) => n && typeof n.getAttribute === 'function' && n.getAttribute('data-action')) || null;
        }
      }

      if (!actionEl && target) {
        let node = target;
        while (node && node !== svgRoot && node !== this.card.shadowRoot) {
          if (node && typeof node.getAttribute === 'function') {
            const a = node.getAttribute('data-action');
            if (a) {
              actionEl = node;
              break;
            }
          }
          node = node.parentNode;
        }

      }

      if (!actionEl) {
        return;
      }

      const action = actionEl.getAttribute('data-action');
      if (!action || typeof action !== 'string') {
        return;
      }
      const trimmed = action.trim();
      const normalized = trimmed.toLowerCase();
      let type = '';
      if (normalized.startsWith('popup:')) {
        type = trimmed.slice(6).trim().toLowerCase();
      } else if (normalized.startsWith('popup-')) {
        type = trimmed.slice(6).trim().toLowerCase();
      }
      if (!type) {
        return;
      }

      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      // Ensure latest DOM refs before toggling
      if (this.card._domRefs) {
        this.setDomRefs(this.card._domRefs);
      }
      this.togglePopup(type);
    } catch (e) {
      console.error('Error in popup click handler:', e);
    }
  }

  /**
   * Handle click/keydown activation of a popup line to open the entity more-info dialog
   * @param {Event} event - Click or keydown event
   */
  handleLineActivate(event) {
    try {
      if (!event) {
        return;
      }
      const isClick = event.type === 'click';
      const isKeydown = event.type === 'keydown';
      if (!isClick && !(isKeydown && (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar'))) {
        return;
      }

      let lineEl = null;
      if (typeof event.composedPath === 'function') {
        const path = event.composedPath();
        if (Array.isArray(path)) {
          lineEl = path.find((node) => node && node.classList && typeof node.classList.contains === 'function' && node.classList.contains('popup-line')) || null;
        }
      }
      if (!lineEl) {
        const target = event.target;
        if (target && typeof target.closest === 'function') {
          lineEl = target.closest('.popup-line');
        }
      }
      if (!lineEl) {
        return;
      }

      const entityId = (lineEl.dataset && lineEl.dataset.entityId) ? lineEl.dataset.entityId : lineEl.getAttribute('data-entity-id');
      if (!entityId) {
        return;
      }

      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }

      this.openEntityMoreInfo(entityId);
    } catch (error) {
      console.warn('Popup line activation error:', error);
    }
  }

  /**
   * Toggle popup overlay for a specific type
   * @param {string} type - Popup type (pv, house, battery, grid, inverter)
   */
  togglePopup(type) {
    const normalized = typeof type === 'string' ? type.trim().toLowerCase() : '';
    if (!normalized) {
      return;
    }
    const allowed = ['pv', 'house', 'battery', 'grid', 'inverter', 'car1', 'car2'];
    if (!allowed.includes(normalized)) {
      return;
    }

    if (this.activePopup === normalized) {
      this.closePopup();
      return;
    }

    const opened = this.openPopup(normalized);
    if (!opened) {
      this.closePopup();
    }
  }

  /**
   * Open popup overlay for a specific type
   * @param {string} type - Popup type
   * @returns {boolean} True if popup was opened successfully
   */
  openPopup(type) {
    if (!this.domRefs || !this.domRefs.popupBackdrop || !this.domRefs.popupOverlay || !this.domRefs.popupLines) {
      return false;
    }

    const config = this.card._config || this.card.config || {};
    const prefixMap = {
      pv: 'sensor_popup_pv_',
      house: 'sensor_popup_house_',
      battery: 'sensor_popup_bat_',
      grid: 'sensor_popup_grid_',
      inverter: 'sensor_popup_inverter_',
      car1: 'sensor_popup_car1_',
      car2: 'sensor_popup_car2_'
    };
    const prefix = prefixMap[type];
    if (!prefix) {
      return false;
    }

    const lineData = [];
    const usedEntityIds = new Set();

    // Handle special "house" type with auto-detected appliances
    if (type === 'house') {
      this._addHouseAutoEntries(config, lineData, usedEntityIds);
    }

    // Handle special "battery" type with datetime/timeuntil entries
    if (type === 'battery') {
      // Get battery states to check which are configured
      const batteryStates = this.card._batteryManager ?
        this.card._batteryManager.getAllBatteryStates(config) : [];
      this._addBatteryTimeEntries(config, lineData, batteryStates);
    }

    // Handle special "car1"/"car2" types with auto-detected EV sensors and climate controls
    if (type === 'car1' || type === 'car2') {
      const carNumber = type === 'car1' ? 1 : 2;
      this._addCarAutoEntries(config, lineData, usedEntityIds, carNumber);
      this._addCarClimateControl(config, lineData, carNumber);
    }

    // Add manually configured popup entries (1-6)
    this._addConfiguredEntries(config, prefix, lineData, usedEntityIds);

    if (!lineData.length) {
      return false;
    }

    // Render lines
    this._renderPopupLines(lineData, type);

    // Show and position popup
    this._showAndPositionPopup(type, lineData);

    return true;
  }

  /**
   * Add auto-detected house appliance entries
   * @private
   */
  _addHouseAutoEntries(config, lineData, usedEntityIds) {
    const resolveEntityId = (keys) => {
      for (const key of keys) {
        const raw = config[key];
        const candidate = typeof raw === 'string' ? raw.trim() : raw;
        if (candidate) {
          return candidate;
        }
      }
      return '';
    };

    const basePopupFontSize = (() => {
      const parsed = Number(config.sensor_popup_house_1_font_size);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 16;
    })();

    const basePopupColor = (typeof config.sensor_popup_house_1_color === 'string' && config.sensor_popup_house_1_color.trim())
      ? config.sensor_popup_house_1_color.trim()
      : '#80ffff';

    const heatPumpLabel = (typeof config.heat_pump_label === 'string' && config.heat_pump_label.trim())
      ? config.heat_pump_label.trim()
      : 'Heat Pump/AC';

    // Get language for translations
    const lang = (this.card._viewState && typeof this.card._viewState.language === 'string')
      ? this.card._viewState.language
      : 'en';
    const i18n = new LocalizationManager(lang);

    const autoEntries = [
      { keys: ['sensor_heat_pump_consumption'], label: heatPumpLabel, i18nKey: 'heat_pump_full' },
      { keys: ['sensor_pool_consumption', 'sensor_pool_power', 'sensor_pool_load'], label: i18n.t('pool_full') },
      { keys: ['sensor_washing_machine_consumption', 'sensor_washer_consumption', 'sensor_washing_machine_power', 'sensor_washer_power'], label: i18n.t('washing_machine_full') },
      { keys: ['sensor_dryer_consumption', 'sensor_dryer_power'], label: i18n.t('dryer_full') },
      { keys: ['sensor_dishwasher_consumption', 'sensor_dishwasher_power', 'sensor_dish_washer_consumption', 'sensor_dishwasher_load'], label: i18n.t('dishwasher_full') },
      { keys: ['sensor_refrigerator_consumption', 'sensor_refrigerator_power', 'sensor_fridge_consumption', 'sensor_fridge_power'], label: i18n.t('refrigerator_full') },
      { keys: ['sensor_freezer_consumption', 'sensor_freezer_power'], label: i18n.t('freezer_full'), dataRole: 'freezer-power' }
    ];

    autoEntries.forEach((entry) => {
      const entityId = resolveEntityId(entry.keys || []);
      if (!entityId) {
        return;
      }
      const valueText = this.card.formatPopupValue(null, entityId);
      if (!valueText) {
        return;
      }
      lineData.push({
        text: `${entry.label}: ${valueText}`,
        fontSize: basePopupFontSize,
        color: basePopupColor,
        entityId
      });
      usedEntityIds.add(entityId);
    });
  }

  /**
   * Add battery datetime/timeuntil entries to popup
   * @private
   */
  _addBatteryTimeEntries(config, lineData, batteryStates) {
    const lang = (this.card._viewState && typeof this.card._viewState.language === 'string')
      ? this.card._viewState.language
      : 'en';
    const i18n = new LocalizationManager(lang);
    const viewState = this.card._viewState || {};

    // Get datetime/timeuntil values from viewState
    const inv1DateTime = viewState.inv1DateTime?.text || '';
    const inv1TimeUntil = viewState.inv1TimeUntil?.text || '';
    const inv2DateTime = viewState.inv2DateTime?.text || '';
    const inv2TimeUntil = viewState.inv2TimeUntil?.text || '';

    // Detect if 2 inverters are configured (inv2 has data)
    const hasTwoInverters = inv2DateTime || inv2TimeUntil;

    // Get global battery popup styling
    const globalFontSize = Number(config.battery_popup_font_size) || 16;
    const globalColor = config.battery_popup_color || '#00FFFF';

    // Determine which inverter data to use for each battery
    const batteryEntries = [
      { 
        num: 1, 
        datetime: inv1DateTime, 
        timeuntil: inv1TimeUntil, 
        fontSize: globalFontSize, 
        color: globalColor 
      },
      { 
        num: 2, 
        datetime: inv1DateTime, 
        timeuntil: inv1TimeUntil, 
        fontSize: globalFontSize, 
        color: globalColor 
      },
      { 
        num: 3, 
        datetime: hasTwoInverters ? inv2DateTime : inv1DateTime, 
        timeuntil: hasTwoInverters ? inv2TimeUntil : inv1TimeUntil, 
        fontSize: globalFontSize, 
        color: globalColor 
      },
      { 
        num: 4, 
        datetime: hasTwoInverters ? inv2DateTime : inv1DateTime, 
        timeuntil: hasTwoInverters ? inv2TimeUntil : inv1TimeUntil, 
        fontSize: globalFontSize, 
        color: globalColor 
      }
    ];

    // Only process batteries that are configured (visible)
    batteryEntries.forEach((bat) => {
      // Check if this battery is configured
      const batteryState = batteryStates.find(b => b.index === bat.num);
      
      if (!batteryState || !batteryState.visible) {
        return; // Skip unconfigured batteries
      }

      // Check if battery has capacity configured
      const capacityWh = this.card._batteryManager ? 
        this.card._batteryManager.getBatteryCapacity(bat.num, config) : null;
      const hasCapacity = capacityWh !== null && capacityWh > 0;
      // Add battery header
      lineData.push({
        text: i18n.t(`battery_${bat.num}`),
        fontSize: globalFontSize,
        color: '#ffffff',
        isHeader: true,
        isBatteryTime: true
      });

      // Show datetime/timeuntil or "Not configured" if no capacity
      if (!hasCapacity) {
        lineData.push({
          text: i18n.t('not_configured'),
          fontSize: bat.fontSize,
          color: '#ff8c00',
          isBatteryTime: true
        });
      } else {
        // Add datetime on first line
        if (bat.datetime) {
          lineData.push({
            text: `${i18n.t('battery_datetime')} ${bat.datetime}`,
            fontSize: bat.fontSize,
            color: bat.color,
            isBatteryTime: true
          });
        } else {
          lineData.push({
            text: `${i18n.t('battery_datetime')} --`,
            fontSize: bat.fontSize,
            color: bat.color,
            isBatteryTime: true
          });
        }
        
        // Add timeuntil on second line
        if (bat.timeuntil) {
          lineData.push({
            text: `${i18n.t('battery_timeuntil')} ${bat.timeuntil}`,
            fontSize: bat.fontSize,
            color: bat.color,
            isBatteryTime: true
          });
        } else {
          lineData.push({
            text: `${i18n.t('battery_timeuntil')} --`,
            fontSize: bat.fontSize,
            color: bat.color,
            isBatteryTime: true
          });
        }
      }
    });
  }

  /**
   * Add auto-detected EV sensor entries (power, SOC, range, charging state, HVAC, temps)
   * @private
   */
  _addCarAutoEntries(config, lineData, usedEntityIds, carNumber) {
    const suffix = carNumber === 1 ? '' : '2';

    const basePopupFontSize = (() => {
      const parsed = Number(config[`sensor_popup_car${carNumber}_1_font_size`]);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 16;
    })();

    const basePopupColor = (typeof config[`sensor_popup_car${carNumber}_1_color`] === 'string' && config[`sensor_popup_car${carNumber}_1_color`].trim())
      ? config[`sensor_popup_car${carNumber}_1_color`].trim()
      : '#80ffff';

    const lang = (this.card._viewState && typeof this.card._viewState.language === 'string')
      ? this.card._viewState.language
      : 'en';
    const i18n = new LocalizationManager(lang);

    const autoEntries = [
      { key: `sensor_car${suffix}_power`, label: i18n.t('car_power_full') },
      { key: `sensor_car${suffix}_soc`, label: i18n.t('car_soc_full') },
      { key: `sensor_car${suffix}_range`, label: i18n.t('car_range_full') },
      { key: `sensor_car${suffix}_state`, label: i18n.t('car_charging_state_full') },
      { key: `sensor_car${suffix}_hvac_status`, label: i18n.t('car_hvac_status_full') },
      { key: `sensor_car${suffix}_outside_temp`, label: i18n.t('car_outside_temp_full') },
      { key: `sensor_car${suffix}_inside_temp`, label: i18n.t('car_inside_temp_full') },
      { key: `sensor_car${suffix}_ac_temp`, label: i18n.t('car_ac_temp_full') }
    ];

    autoEntries.forEach((entry) => {
      const raw = config[entry.key];
      const entityId = typeof raw === 'string' ? raw.trim() : '';
      if (!entityId) {
        return;
      }
      const valueText = this.card.formatPopupValue(null, entityId);
      if (!valueText) {
        return;
      }
      lineData.push({
        text: `${entry.label}: ${valueText}`,
        fontSize: basePopupFontSize,
        color: basePopupColor,
        entityId
      });
      usedEntityIds.add(entityId);
    });
  }

  /**
   * Add interactive climate control (HVAC mode + temperature) for the car's climate entity
   * @private
   */
  _addCarClimateControl(config, lineData, carNumber) {
    const entityIdRaw = config[`car${carNumber}_climate_entity`];
    const entityId = typeof entityIdRaw === 'string' ? entityIdRaw.trim() : '';
    if (!entityId) {
      return;
    }

    const hass = this.card._hass;
    const entity = hass && hass.states ? hass.states[entityId] : null;
    if (!entity) {
      return;
    }

    const attrs = entity.attributes || {};
    const hvacModes = Array.isArray(attrs.hvac_modes) ? attrs.hvac_modes : [];
    const targetTemp = (typeof attrs.temperature === 'number') ? attrs.temperature : null;
    const currentTemp = (typeof attrs.current_temperature === 'number') ? attrs.current_temperature : null;
    const step = (typeof attrs.target_temp_step === 'number' && attrs.target_temp_step > 0) ? attrs.target_temp_step : 0.5;
    const minTemp = (typeof attrs.min_temp === 'number') ? attrs.min_temp : null;
    const maxTemp = (typeof attrs.max_temp === 'number') ? attrs.max_temp : null;
    const unit = (hass.config && hass.config.unit_system && hass.config.unit_system.temperature) || '°';

    const basePopupFontSize = (() => {
      const parsed = Number(config[`sensor_popup_car${carNumber}_1_font_size`]);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 16;
    })();

    lineData.push({
      isClimateControl: true,
      entityId,
      hvacModes,
      currentMode: entity.state,
      targetTemp,
      currentTemp,
      step,
      minTemp,
      maxTemp,
      unit,
      fontSize: basePopupFontSize
    });
  }

  /**
   * Call a climate domain service for an entity
   * @private
   */
  _callClimateService(service, entityId, data) {
    try {
      const hass = this.card._hass;
      if (!hass || typeof hass.callService !== 'function') {
        return;
      }
      hass.callService('climate', service, { entity_id: entityId, ...data });
    } catch (e) {
      console.warn('Failed to call climate service:', e);
    }
  }

  /**
   * Refresh the popup if it is still open for the given type (used after a control action)
   * @private
   */
  _refreshPopupIfOpen(type) {
    if (this.activePopup === type) {
      this.openPopup(type);
    }
  }

  /**
   * Render an interactive climate control block (HVAC mode buttons + temperature stepper)
   * @private
   */
  _renderClimateControl(line, type) {
    const lang = (this.card._viewState && typeof this.card._viewState.language === 'string')
      ? this.card._viewState.language
      : 'en';
    const i18n = new LocalizationManager(lang);

    const wrapper = document.createElement('div');
    wrapper.className = 'popup-climate-control';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '6px';
    wrapper.style.marginTop = '4px';
    wrapper.style.paddingTop = '6px';
    wrapper.style.borderTop = '1px solid rgba(255, 255, 255, 0.3)';

    const title = document.createElement('div');
    title.className = 'popup-line';
    title.tabIndex = 0;
    title.setAttribute('role', 'button');
    title.dataset.entityId = line.entityId;
    const entityName = this.card.getEntityName(line.entityId);
    const tempLabel = (line.currentTemp !== null && line.currentTemp !== undefined) ? `${line.currentTemp}${line.unit}` : '--';
    title.textContent = `${i18n.t('climate_full')}: ${entityName} (${tempLabel})`;
    title.style.color = '#80ffff';
    title.style.fontSize = 'inherit';
    title.setAttribute('aria-label', title.textContent);
    wrapper.appendChild(title);

    if (line.hvacModes.length) {
      const modeRow = document.createElement('div');
      modeRow.style.display = 'flex';
      modeRow.style.flexWrap = 'wrap';
      modeRow.style.gap = '4px';

      line.hvacModes.forEach((mode) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = i18n.t(`hvac_mode_${mode}`, mode);
        btn.style.flex = '1 1 auto';
        btn.style.padding = '4px 8px';
        btn.style.borderRadius = '6px';
        btn.style.fontSize = 'inherit';
        btn.style.fontFamily = 'inherit';
        btn.style.cursor = 'pointer';
        const isActive = mode === line.currentMode;
        btn.style.border = isActive ? '2px solid #00ffff' : '1px solid rgba(255, 255, 255, 0.4)';
        btn.style.background = isActive ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)';
        btn.style.color = '#ffffff';
        btn.addEventListener('click', (event) => {
          event.stopPropagation();
          this._callClimateService('set_hvac_mode', line.entityId, { hvac_mode: mode });
          setTimeout(() => this._refreshPopupIfOpen(type), 600);
        });
        modeRow.appendChild(btn);
      });

      wrapper.appendChild(modeRow);
    }

    if (line.targetTemp !== null && line.targetTemp !== undefined) {
      const tempRow = document.createElement('div');
      tempRow.style.display = 'flex';
      tempRow.style.alignItems = 'center';
      tempRow.style.justifyContent = 'center';
      tempRow.style.gap = '12px';

      const makeStepButton = (label, delta) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.style.padding = '4px 14px';
        btn.style.borderRadius = '6px';
        btn.style.border = '1px solid rgba(255, 255, 255, 0.4)';
        btn.style.background = 'rgba(255, 255, 255, 0.05)';
        btn.style.color = '#ffffff';
        btn.style.fontSize = 'inherit';
        btn.style.fontFamily = 'inherit';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', (event) => {
          event.stopPropagation();
          let newTemp = line.targetTemp + delta;
          if (line.minTemp !== null) newTemp = Math.max(line.minTemp, newTemp);
          if (line.maxTemp !== null) newTemp = Math.min(line.maxTemp, newTemp);
          newTemp = Math.round(newTemp * 100) / 100;
          this._callClimateService('set_temperature', line.entityId, { temperature: newTemp });
          setTimeout(() => this._refreshPopupIfOpen(type), 600);
        });
        return btn;
      };

      const tempDisplay = document.createElement('div');
      tempDisplay.textContent = `${line.targetTemp}${line.unit}`;
      tempDisplay.style.minWidth = '60px';
      tempDisplay.style.textAlign = 'center';
      tempDisplay.style.fontWeight = 'bold';
      tempDisplay.style.fontSize = 'inherit';
      tempDisplay.style.color = '#ffffff';

      tempRow.appendChild(makeStepButton('−', -line.step));
      tempRow.appendChild(tempDisplay);
      tempRow.appendChild(makeStepButton('+', line.step));
      wrapper.appendChild(tempRow);
    }

    this.domRefs.popupLines.appendChild(wrapper);
  }

  /**
   * Add manually configured popup entries
   * @private
   */
  _addConfiguredEntries(config, prefix, lineData, usedEntityIds) {
    // Check if this is battery popup to use global styling
    const isBatteryPopup = prefix === 'sensor_popup_bat_';
    const globalColor = isBatteryPopup ? (config.battery_popup_color || '#00FFFF') : null;
    const globalFontSize = isBatteryPopup ? (Number(config.battery_popup_font_size) || 16) : null;

    for (let i = 1; i <= 6; i++) {
      const entityKey = `${prefix}${i}`;
      const nameKey = `${entityKey}_name`;
      const fontKey = `${entityKey}_font_size`;
      const colorKey = `${entityKey}_color`;

      const entityIdRaw = config[entityKey];
      const entityId = typeof entityIdRaw === 'string' ? entityIdRaw.trim() : entityIdRaw;
      if (!entityId || usedEntityIds.has(entityId)) {
        continue;
      }

      const valueText = this.card.formatPopupValue(null, entityId);
      if (!valueText) {
        continue;
      }

      const nameOverride = config[nameKey];
      const name = (typeof nameOverride === 'string' && nameOverride.trim())
        ? nameOverride.trim()
        : this.card.getEntityName(entityId);

      // Use global settings for battery popup, per-entity for others
      const fontSize = isBatteryPopup ? globalFontSize : (Number(config[fontKey]) || 16);
      const color = isBatteryPopup ? globalColor : ((typeof config[colorKey] === 'string' && config[colorKey]) ? config[colorKey] : '#80ffff');

      lineData.push({
        text: `${name}: ${valueText}`,
        fontSize,
        color,
        entityId
      });
      usedEntityIds.add(entityId);
    }
  }

  /**
   * Render popup lines in the DOM
   * @private
   */
  _renderPopupLines(lineData, type) {
    this.domRefs.popupLines.innerHTML = '';

    // Check if this is a battery popup with two-column layout
    const isBatteryPopup = type === 'battery';
    const hasBatteryTime = lineData.some(line => line.isBatteryTime);

    if (isBatteryPopup && hasBatteryTime) {
      // Two-column layout for battery popup
      const container = document.createElement('div');
      container.style.display = 'grid';
      container.style.gridTemplateColumns = '1.2fr 1fr';
      container.style.gap = '16px';
      container.style.width = '100%';

      const leftColumn = document.createElement('div');
      leftColumn.style.display = 'flex';
      leftColumn.style.flexDirection = 'column';
      leftColumn.style.gap = '4px';

      const rightColumn = document.createElement('div');
      rightColumn.style.display = 'flex';
      rightColumn.style.flexDirection = 'column';
      rightColumn.style.gap = '4px';

      // Populate columns
      lineData.forEach((line) => {
        const div = document.createElement('div');
        
        if (line.isHeader) {
          div.className = 'popup-header';
          div.style.fontWeight = 'bold';
          div.style.marginTop = line.isSensorHeader ? '8px' : '0';
          div.style.marginBottom = '4px';
          div.style.borderBottom = '1px solid rgba(255, 255, 255, 0.3)';
          div.style.paddingBottom = '4px';
        } else {
          div.className = 'popup-line';
          div.tabIndex = 0;
          div.setAttribute('role', 'button');
          div.setAttribute('aria-label', line.text);
          if (line.entityId) {
            div.dataset.entityId = line.entityId;
          }
        }

        div.textContent = line.text;
        div.style.color = line.color;

        // Add to appropriate column
        if (line.isBatteryTime) {
          leftColumn.appendChild(div);
        } else {
          rightColumn.appendChild(div);
        }
      });

      container.appendChild(leftColumn);
      container.appendChild(rightColumn);
      this.domRefs.popupLines.appendChild(container);
    } else {
      // Single-column layout for other popups
      lineData.forEach((line) => {
        if (line.isClimateControl) {
          this._renderClimateControl(line, type);
          return;
        }
        const div = document.createElement('div');
        div.className = 'popup-line';
        div.textContent = line.text;
        div.style.color = line.color;
        if (line.entityId) {
          div.dataset.entityId = line.entityId;
        }
        div.tabIndex = 0;
        div.setAttribute('role', 'button');
        div.setAttribute('aria-label', line.text);
        this.domRefs.popupLines.appendChild(div);
      });
    }
  }

  /**
   * Show and position the popup overlay
   * @private
   */
  _showAndPositionPopup(type, lineData) {
    const refs = this.domRefs;
    refs.popupBackdrop.style.display = 'block';
    refs.popupOverlay.style.display = 'block';
    refs.popupOverlay.style.visibility = 'hidden';

    // Apply SVG->px scaling for font sizes and sizing constraints
    let scaleX = 1;
    const svgEl = refs.svgRoot;
    if (svgEl && typeof svgEl.getBoundingClientRect === 'function') {
      const svgBox = svgEl.getBoundingClientRect();
      if (svgBox && svgBox.width > 0) {
        scaleX = svgBox.width / GEOMETRY.SVG.width;
      }
    }

    const paddingX = Math.max(8, 20 * scaleX);
    const paddingY = Math.max(8, 20 * scaleX);
    refs.popupOverlay.style.padding = `${paddingY}px ${paddingX}px`;
    
    // Battery popup needs more width for two-column layout
    if (type === 'battery') {
      refs.popupOverlay.style.minWidth = `${Math.max(0, 480 * scaleX)}px`;
      refs.popupOverlay.style.maxWidth = `${Math.max(0, 800 * scaleX)}px`;
    } else {
      refs.popupOverlay.style.minWidth = `${Math.max(0, 240 * scaleX)}px`;
      refs.popupOverlay.style.maxWidth = `${Math.max(0, 540 * scaleX)}px`;
    }

    const children = Array.from(refs.popupLines.children);
    children.forEach((child, idx) => {
      const base = lineData[idx] && Number.isFinite(lineData[idx].fontSize) ? lineData[idx].fontSize : 16;
      child.style.fontSize = `${Math.max(8, base * scaleX)}px`;
    });

    this.activePopup = type;
    this.card._activePopup = type; // Sync with card's state
    this.syncPopupPosition();
    refs.popupOverlay.style.visibility = 'visible';

    // Re-sync after layout/fonts settle
    requestAnimationFrame(() => {
      this.syncPopupPosition();
    });
    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
      document.fonts.ready.then(() => {
        this.syncPopupPosition();
      }).catch(() => {
        // ignore
      });
    }
  }

  /**
   * Close the popup overlay
   */
  closePopup() {
    if (!this.domRefs) {
      return;
    }
    const refs = this.domRefs;
    if (refs.popupOverlay) {
      refs.popupOverlay.style.display = 'none';
    }
    if (refs.popupBackdrop) {
      refs.popupBackdrop.style.display = 'none';
    }
    this.activePopup = null;
    this.card._activePopup = null; // Sync with card's state
  }

  /**
   * Sync popup position to anchor point
   */
  syncPopupPosition() {
    try {
      const refs = this.domRefs;
      if (!refs || !refs.popupOverlay || refs.popupOverlay.style.display === 'none') {
        return;
      }
      const svgRoot = refs.svgRoot;
      const cardEl = refs.card;
      if (!svgRoot || !cardEl) {
        return;
      }

      const anchor = svgRoot.querySelector('[data-role="popup-anchor"]');
      if (!anchor || typeof anchor.getBoundingClientRect !== 'function') {
        // Fallback: center of card
        refs.popupOverlay.style.left = '50%';
        refs.popupOverlay.style.top = '50%';
        refs.popupOverlay.style.transform = 'translate(-50%, -50%)';
        return;
      }

      const anchorBox = anchor.getBoundingClientRect();
      const cardBox = cardEl.getBoundingClientRect();
      if (!anchorBox || !cardBox || anchorBox.width <= 0 || anchorBox.height <= 0) {
        return;
      }

      const centerX = (anchorBox.left - cardBox.left) + anchorBox.width / 2;
      const centerY = (anchorBox.top - cardBox.top) + anchorBox.height / 2;

      refs.popupOverlay.style.left = `${centerX}px`;
      refs.popupOverlay.style.top = `${centerY}px`;
      refs.popupOverlay.style.transform = 'translate(-50%, -50%)';
    } catch (e) {
      // ignore
    }
  }

  /**
   * Open Home Assistant more-info dialog for entity
   * @param {string} entityId - Entity ID to show details for
   */
  openEntityMoreInfo(entityId) {
    try {
      if (!entityId) {
        return;
      }
      const moreInfoEvent = new CustomEvent('hass-more-info', {
        bubbles: true,
        composed: true,
        detail: { entityId }
      });
      this.card.dispatchEvent(moreInfoEvent);
    } catch (error) {
      console.warn('Failed to open entity dialog:', error);
    }
  }
}
