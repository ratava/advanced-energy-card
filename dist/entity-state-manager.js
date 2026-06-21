/**
 * Entity State Manager
 * Centralizes Home Assistant entity state reading with consistent error handling
 * Eliminates ~300 lines of duplicated entity reading patterns
 */
export class EntityStateManager {
  /**
   * @param {object} hass - Home Assistant connection object
   */
  constructor(hass) {
    this.hass = hass;
  }

  /**
   * Safely get entity state with fallback
   * @param {string} entityId - Entity ID to read
   * @param {number} fallback - Fallback value if entity unavailable
   * @returns {number} Entity state as number
   */
  getStateSafe(entityId, fallback = 0) {
    if (!entityId || !this.hass || !this.hass.states) {
      return fallback;
    }
    
    const entity = this.hass.states[entityId];
    if (!entity) {
      return fallback;
    }

    const state = parseFloat(entity.state);
    return isNaN(state) ? fallback : state;
  }

  /**
   * Check if entity is available
   * @param {string} entityId - Entity ID to check
   * @returns {boolean} True if entity exists and is not unavailable
   */
  isAvailable(entityId) {
    if (!entityId || !this.hass || !this.hass.states) {
      return false;
    }
    
    const entity = this.hass.states[entityId];
    return entity && entity.state !== 'unavailable' && entity.state !== 'unknown';
  }

  /**
   * Format power value with unit
   * @param {number} value - Power value in watts
   * @param {boolean} useKw - Use kilowatts instead of watts
   * @returns {string} Formatted power string
   */
  formatPower(value, useKw = false) {
    if (value === null || value === undefined || isNaN(value)) {
      return '0 W';
    }

    const absValue = Math.abs(value);
    if (useKw || absValue >= 1000) {
      return `${(value / 1000).toFixed(2)} kW`;
    }
    
    return `${Math.round(value)} W`;
  }

  /**
   * Format energy value with unit
   * @param {number} value - Energy value in Wh
   * @param {boolean} useKwh - Use kilowatt-hours instead of watt-hours
   * @returns {string} Formatted energy string
   */
  formatEnergy(value, useKwh = false) {
    if (value === null || value === undefined || isNaN(value)) {
      return '0 Wh';
    }

    const absValue = Math.abs(value);
    if (useKwh || absValue >= 1000) {
      return `${(value / 1000).toFixed(2)} kWh`;
    }
    
    return `${Math.round(value)} Wh`;
  }

  /**
   * Read a group of numbered sensors (e.g., pv1, pv2, pv3)
   * @param {object} config - Configuration object containing sensor IDs
   * @param {string} sensorPrefix - Prefix for sensor keys (e.g., 'pv' for pv1, pv2, etc.)
   * @param {number} count - Number of sensors in the group
   * @returns {Array<number>} Array of sensor values
   */
  readSensorGroup(config, sensorPrefix, count) {
    const values = [];
    for (let i = 1; i <= count; i++) {
      const sensorKey = `${sensorPrefix}${i}`;
      const entityId = config[sensorKey];
      values.push(this.getStateSafe(entityId, 0));
    }
    return values;
  }

  /**
   * Get entity attribute safely
   * @param {string} entityId - Entity ID
   * @param {string} attributeName - Attribute name
   * @param {*} fallback - Fallback value
   * @returns {*} Attribute value or fallback
   */
  getAttribute(entityId, attributeName, fallback = null) {
    if (!entityId || !this.hass || !this.hass.states) {
      return fallback;
    }
    
    const entity = this.hass.states[entityId];
    if (!entity || !entity.attributes) {
      return fallback;
    }
    
    const value = entity.attributes[attributeName];
    return value !== undefined ? value : fallback;
  }
}
