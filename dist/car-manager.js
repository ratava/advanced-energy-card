/**
 * Car Manager
 * Centralizes car state reading and view generation for up to 2 cars
 * Eliminates ~200 lines of duplicated car logic
 */
export class CarManager {
  /**
   * @param {object} card - Reference to the AdvancedEnergyCard instance
   */
  constructor(card) {
    this.card = card;
  }

  /**
   * Get state for a single car
   * @param {number} carNumber - Car number (1 or 2)
   * @param {object} config - Card configuration
   * @returns {object} Car state object
   */
  getCarState(carNumber, config) {
    // Handle both new (sensor_car_power) and legacy (car_power) config field names
    const resolveEntityId = (primary, legacy) => {
      if (typeof primary === 'string') {
        const trimmed = primary.trim();
        if (trimmed) return trimmed;
      }
      if (typeof legacy === 'string') {
        const trimmed = legacy.trim();
        if (trimmed) return trimmed;
      }
      return '';
    };

    const isCarOne = carNumber === 1;
    const powerSensorId = isCarOne
      ? resolveEntityId(config.sensor_car_power, config.car_power)
      : resolveEntityId(config.sensor_car2_power, config.car2_power);
    const socSensorId = isCarOne
      ? resolveEntityId(config.sensor_car_soc, config.car_soc)
      : resolveEntityId(config.sensor_car2_soc, config.car2_soc);

    const power = this._getNumericState(powerSensorId);
    const soc = this._getNumericState(socSensorId);
    
    const resolveLabel = (value, fallback) => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) return trimmed;
      }
      return fallback;
    };
    const label = resolveLabel(config[`car${carNumber}_label`], `CAR ${carNumber}`);
    
    const entitiesConfigured = Boolean(powerSensorId || socSensorId);
    const visible = entitiesConfigured;
    const charging = power !== null && power > 10; // CAR_CHARGING_THRESHOLD_W = 10

    return {
      carNumber,
      power: power !== null ? power : 0,
      soc,
      label,
      visible,
      charging,
      powerSensorId,
      socSensorId
    };
  }

  /**
   * Get states for both cars
   * @param {object} config - Card configuration
   * @returns {Array} Array of car state objects
   */
  getAllCarStates(config) {
    return [1, 2].map(carNumber => this.getCarState(carNumber, config));
  }

  /**
   * Get configured car count
   * @param {object} config - Card configuration
   * @returns {number} Number of configured cars (0, 1, or 2)
   */
  getConfiguredCarCount(config) {
    const carStates = this.getAllCarStates(config);
    return carStates.filter(car => car.visible).length;
  }

  /**
   * Build car view state for rendering
   * @param {number} carNumber - Car number (1 or 2)
   * @param {object} carState - Car state object
   * @param {object} config - Card configuration
   * @param {object} layout - Car layout configuration
   * @returns {object} Car view state for rendering
   */
  buildCarView(carNumber, carState, config, layout, transforms, useKw, formatPowerFn, resolveColorFn) {
    if (!carState.visible || !layout) {
      return {
        visible: false,
        label: { text: '', fontSize: 0, fill: '', x: 0, y: 0, transform: '' },
        power: { text: '', fontSize: 0, fill: '', x: 0, y: 0, transform: '' },
        soc: { visible: false, text: '', fontSize: 0, fill: '', x: 0, y: 0, transform: '' },
        range: { text: '', fill: '' },
        state: { text: '', fill: '' },
        hvacStatus: { text: '', fill: '' },
        outsideTemp: { text: '', fill: '' },
        insideTemp: { text: '', fill: '' },
        acTemp: { text: '', fill: '' }
      };
    }

    const isCarOne = carNumber === 1;
    const nameFontSize = config[`car${isCarOne ? '' : '2'}_name_font_size`] || null;
    const powerFontSize = config[`car${isCarOne ? '' : '2'}_power_font_size`] || null;
    const socFontSize = config[`car${isCarOne ? '' : '2'}_soc_font_size`] || null;
    
    const carColor = resolveColorFn(config[`car${carNumber}_color`], '#FFFFFF');
    const nameColor = resolveColorFn(config[`car${carNumber}_name_color`], carColor);
    const socColor = resolveColorFn(
      isCarOne ? config.car_pct_color : config.car2_pct_color,
      isCarOne ? '#00FFFF' : resolveColorFn(config.car_pct_color, '#00FFFF')
    );

    const textX = (typeof layout.x === 'number') ? layout.x : 0;

    // Range (direct sensor binding, e.g. "250 km")
    const rangeSensorId = (typeof config[`sensor_car${isCarOne ? '' : '2'}_range`] === 'string')
      ? config[`sensor_car${isCarOne ? '' : '2'}_range`].trim()
      : '';
    const rangeText = rangeSensorId ? this.card.formatPopupValue(null, rangeSensorId) : '';

    // Charging state (direct sensor binding, color reflects charging vs not)
    const stateSensorId = (typeof config[`sensor_car${isCarOne ? '' : '2'}_state`] === 'string')
      ? config[`sensor_car${isCarOne ? '' : '2'}_state`].trim()
      : '';
    const stateText = stateSensorId ? this.card.formatPopupValue(null, stateSensorId) : '';
    const stateRaw = (stateSensorId && this.card._hass && this.card._hass.states && this.card._hass.states[stateSensorId])
      ? String(this.card._hass.states[stateSensorId].state).toLowerCase()
      : '';
    const stateColor = (stateRaw.includes('charg') && !stateRaw.includes('not')) ? '#00ff00' : carColor;

    // HVAC status (direct sensor binding)
    const hvacStatusSensorId = (typeof config[`sensor_car${isCarOne ? '' : '2'}_hvac_status`] === 'string')
      ? config[`sensor_car${isCarOne ? '' : '2'}_hvac_status`].trim()
      : '';
    const hvacStatusText = hvacStatusSensorId ? this.card.formatPopupValue(null, hvacStatusSensorId) : '';

    // Outside temperature (direct sensor binding)
    const outsideTempSensorId = (typeof config[`sensor_car${isCarOne ? '' : '2'}_outside_temp`] === 'string')
      ? config[`sensor_car${isCarOne ? '' : '2'}_outside_temp`].trim()
      : '';
    const outsideTempText = outsideTempSensorId ? this.card.formatPopupValue(null, outsideTempSensorId) : '';

    // Inside temperature (direct sensor binding)
    const insideTempSensorId = (typeof config[`sensor_car${isCarOne ? '' : '2'}_inside_temp`] === 'string')
      ? config[`sensor_car${isCarOne ? '' : '2'}_inside_temp`].trim()
      : '';
    const insideTempText = insideTempSensorId ? this.card.formatPopupValue(null, insideTempSensorId) : '';

    // AC temperature (direct sensor binding)
    const acTempSensorId = (typeof config[`sensor_car${isCarOne ? '' : '2'}_ac_temp`] === 'string')
      ? config[`sensor_car${isCarOne ? '' : '2'}_ac_temp`].trim()
      : '';
    const acTempText = acTempSensorId ? this.card.formatPopupValue(null, acTempSensorId) : '';

    return {
      visible: true,
      label: {
        text: carState.label,
        fontSize: nameFontSize,
        fill: nameColor,
        x: textX,
        y: layout.labelY,
        transform: transforms.label
      },
      power: {
        text: formatPowerFn(carState.power, useKw),
        fontSize: powerFontSize,
        fill: carColor,
        x: textX,
        y: layout.powerY,
        transform: transforms.power
      },
      soc: {
        visible: carState.soc !== null,
        text: (carState.soc !== null) ? `${Math.round(carState.soc)}%` : '',
        fontSize: socFontSize,
        fill: stateSensorId ? stateColor : socColor,
        x: textX,
        y: layout.socY,
        transform: transforms.soc
      },
      range: {
        text: rangeText,
        fill: carColor
      },
      state: {
        text: stateText,
        fill: stateColor
      },
      hvacStatus: {
        text: hvacStatusText,
        fill: carColor
      },
      outsideTemp: {
        text: outsideTempText,
        fill: carColor
      },
      insideTemp: {
        text: insideTempText,
        fill: carColor
      },
      acTemp: {
        text: acTempText,
        fill: carColor
      }
    };
  }

  /**
   * Helper: Get numeric state from entity ID
   * @private
   */
  _getNumericState(entityId) {
    if (!entityId) {
      return null;
    }
    const raw = this.card.getStateSafe(entityId);
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }
}
