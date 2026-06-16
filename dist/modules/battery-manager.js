/**
 * Battery Manager
 * Centralizes battery state reading and management for up to 4 batteries
 * Eliminates ~400 lines of duplicated battery logic
 */
export class BatteryManager {
  /**
   * @param {object} card - Reference to the AdvancedEnergyCard instance
   */
  constructor(card) {
    this.card = card;
  }

  /**
   * Get state for a single battery
   * @param {number} index - Battery index (1-4)
   * @param {object} config - Card configuration
   * @returns {object} Battery state object
   */
  getBatteryState(index, config) {
    const socKey = `sensor_bat${index}_soc`;
    const powerKey = `sensor_bat${index}_power`;
    const chargeKey = `sensor_bat${index}_charge_power`;
    const dischargeKey = `sensor_bat${index}_discharge_power`;
    const invertKey = index === 4 ? 'invert_battery' : `invert_bat${index}`;

    const soc = this._getNumericState(config[socKey]);
    const combinedPower = this._getNumericState(config[powerKey]);
    const chargePower = this._getNumericState(config[chargeKey]);
    const dischargePower = this._getNumericState(config[dischargeKey]);
    const invertFlag = Boolean(config[invertKey] || config.invert_battery);

    const hasSoc = soc !== null;
    const hasCombinedPower = combinedPower !== null;
    const hasSplitPower = chargePower !== null && dischargePower !== null;

    let power = null;
    let powerMode = 'none';
    if (hasCombinedPower) {
      power = combinedPower;
      powerMode = 'combined';
    } else if (hasSplitPower) {
      power = chargePower - dischargePower;
      powerMode = 'split';
    }

    if (power !== null && invertFlag) {
      power = power * -1;
    }

    const gridPowerOnly = Boolean(config.grid_power_only);
    const active = hasSoc && power !== null && !gridPowerOnly;

    return {
      index,
      role: `battery${index}`,
      soc,
      power,
      charge: chargePower,
      discharge: dischargePower,
      powerMode,
      visible: active
    };
  }

  /**
   * Get states for all 4 batteries
   * @param {object} config - Card configuration
   * @returns {Array} Array of battery state objects
   */
  getAllBatteryStates(config) {
    return [1, 2, 3, 4].map(index => this.getBatteryState(index, config));
  }

  /**
   * Get only active (visible) batteries
   * @param {Array} batteryStates - Array of battery states
   * @returns {Array} Filtered array of active batteries
   */
  getActiveBatteries(batteryStates) {
    return batteryStates.filter(bat => bat.visible);
  }

  /**
   * Calculate total battery power
   * @param {Array} batteryStates - Array of battery states
   * @returns {number} Total power in watts
   */
  getTotalPower(batteryStates) {
    return this.getActiveBatteries(batteryStates)
      .reduce((acc, bat) => acc + (bat.power || 0), 0);
  }

  /**
   * Calculate average battery SOC
   * @param {Array} batteryStates - Array of battery states
   * @returns {number} Average SOC percentage
   */
  getAverageSOC(batteryStates) {
    const activeBatteries = this.getActiveBatteries(batteryStates);
    if (activeBatteries.length === 0) {
      return 0;
    }
    const totalSoc = activeBatteries.reduce((acc, bat) => acc + (bat.soc || 0), 0);
    return totalSoc / activeBatteries.length;
  }

  /**
   * Get combined battery state for all active batteries (used by overview profile SVGs).
   * Returns a synthetic state with role 'battery' driven by aggregated values.
   * SOC: weighted by capacity when ALL active batteries have capacity configured,
   * otherwise falls back to simple average.
   * @param {Array} batteryStates - All battery states from getAllBatteryStates()
   * @param {object} config - Card configuration
   * @returns {object|null} Combined state or null if no batteries are active
   */
  getCombinedBatteryState(batteryStates, config) {
    const active = this.getActiveBatteries(batteryStates);
    if (active.length === 0) return null;

    const combinedPower = active.reduce((sum, b) => sum + (b.power || 0), 0);

    const capacities = active.map(b => this.getBatteryCapacity(b.index, config));
    const allHaveCapacity = capacities.every(c => c !== null && c > 0);

    let combinedSoc;
    if (allHaveCapacity) {
      const totalCapacity = capacities.reduce((s, c) => s + c, 0);
      combinedSoc = active.reduce((s, b, i) => s + (b.soc || 0) * capacities[i], 0) / totalCapacity;
    } else {
      combinedSoc = active.reduce((s, b) => s + (b.soc || 0), 0) / active.length;
    }

    return {
      index: null,
      role: 'battery',
      soc: combinedSoc,
      power: combinedPower,
      visible: true
    };
  }

  /**
   * Calculate combined time-until for all batteries (total energy ÷ total power).
   * Delegates to calculateInverterBatteryTime with all four indices.
   * @param {Array} batteryStates - All battery states
   * @param {object} config - Card configuration
   * @param {object} hass - Home Assistant object
   * @returns {object} Time calculation result
   */
  getCombinedTimeUntil(batteryStates, config, hass) {
    return this.calculateInverterBatteryTime([1, 2, 3, 4], batteryStates, config, hass);
  }

  /**
   * Get average temperature across all batteries that have temp sensors configured.
   * Returns the numeric average (rounded to 1dp) and the unit from the first sensor,
   * or null if no temp sensors are configured/available.
   * @param {object} config - Card configuration
   * @returns {{ value: number, unit: string }|null}
   */
  getCombinedTempAverage(config) {
    const samples = [];
    let unit = '';
    for (let i = 1; i <= 4; i++) {
      const sensorId = typeof config[`sensor_battery${i}_temp`] === 'string'
        ? config[`sensor_battery${i}_temp`].trim()
        : '';
      if (!sensorId) continue;
      const raw = this.card.getStateSafe(sensorId);
      if (!Number.isFinite(raw)) continue;
      samples.push(raw);
      if (!unit && this.card._hass && this.card._hass.states && this.card._hass.states[sensorId]) {
        unit = this.card._hass.states[sensorId].attributes.unit_of_measurement || '';
      }
    }
    if (samples.length === 0) return null;
    const avg = samples.reduce((s, t) => s + t, 0) / samples.length;
    return { value: Math.round(avg * 10) / 10, unit };
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

  /**
   * Get usable battery capacity in Wh (accounting for reserve percentage)
   * @param {number} index - Battery index (1-4)
   * @param {object} config - Card configuration
   * @returns {number|null} Usable capacity in Wh, or null if not configured
   */
  getBatteryCapacity(index, config) {
    const capacitySensorKey = `sensor_bat${index}_capacity_sensor`;
    const capacityManualKey = `bat${index}_capacity_manual`;
    const reserveKey = `bat${index}_reserve_percentage`;

    // Try sensor first — use getStateSafe so kWh units are auto-converted to Wh
    const capacitySensorId = config[capacitySensorKey];
    let capacityWh = capacitySensorId ? this.card.getStateSafe(capacitySensorId) || null : null;

    // Fallback to manual entry
    if (capacityWh === null) {
      const manualValue = config[capacityManualKey];
      if (manualValue !== undefined && manualValue !== null && manualValue !== '') {
        const num = Number(manualValue);
        if (Number.isFinite(num) && num > 0) {
          capacityWh = num;
          // Convert from kWh to Wh if display_unit is kW
          const display_unit = config.display_unit || 'W';
          if (display_unit.toUpperCase() === 'KW') {
            capacityWh = capacityWh * 1000;
          }
        }
      }
    }

    if (capacityWh === null || capacityWh <= 0) {
      return null;
    }

    // Apply reserve percentage if configured
    const reservePercent = config[reserveKey];
    if (reservePercent !== undefined && reservePercent !== null && reservePercent !== '') {
      const reserve = Number(reservePercent);
      if (Number.isFinite(reserve) && reserve > 0 && reserve <= 100) {
        // Reduce usable capacity by reserve percentage
        capacityWh = capacityWh * (1 - reserve / 100);
      }
    }

    return capacityWh;
  }

  /**
   * Calculate time until battery full or empty for an inverter
   * @param {Array} batteryIndices - Array of battery indices for this inverter
   * @param {Array} batteryStates - All battery states
   * @param {object} config - Card configuration
   * @param {object} hass - Home Assistant object
   * @returns {object} Time calculation result
   */
  calculateInverterBatteryTime(batteryIndices, batteryStates, config, hass) {
    // Filter batteries for this inverter
    const inverterBatteries = batteryStates.filter(bat => 
      batteryIndices.includes(bat.index) && bat.visible
    );

    if (inverterBatteries.length === 0) {
      return {
        datetime: null,
        timeUntil: null,
        hoursUntil: null,
        minutesUntil: null,
        direction: 'none' // 'charging', 'discharging', or 'none'
      };
    }

    // Calculate total capacity and current energy
    let totalCapacityWh = 0;
    let totalCurrentEnergyWh = 0;
    let totalPowerW = 0;
    let hasCapacity = false;

    for (const bat of inverterBatteries) {
      const capacityWh = this.getBatteryCapacity(bat.index, config);
      if (capacityWh !== null && capacityWh > 0) {
        hasCapacity = true;
        totalCapacityWh += capacityWh;
        
        // Calculate current energy based on SOC
        if (bat.soc !== null && Number.isFinite(bat.soc)) {
          totalCurrentEnergyWh += capacityWh * (bat.soc / 100);
        }
      }
      
      // Sum power (positive = charging, negative = discharging)
      if (bat.power !== null && Number.isFinite(bat.power)) {
        totalPowerW += bat.power;
      }
    }

    // Can't calculate without capacity or if no power flow
    if (!hasCapacity || totalCapacityWh <= 0 || Math.abs(totalPowerW) < 10) {
      return {
        datetime: null,
        timeUntil: null,
        hoursUntil: null,
        minutesUntil: null,
        direction: 'none'
      };
    }

    // Calculate time based on direction
    let hoursToTarget = 0;
    let direction = 'none';

    if (totalPowerW > 0) {
      // Charging: time to full (100% of usable capacity)
      direction = 'charging';
      const energyNeededWh = totalCapacityWh - totalCurrentEnergyWh;
      if (energyNeededWh > 0) {
        hoursToTarget = energyNeededWh / totalPowerW;
      }
    } else if (totalPowerW < 0) {
      // Discharging: time to empty (0% of usable capacity)
      direction = 'discharging';
      const energyAvailableWh = totalCurrentEnergyWh;
      if (energyAvailableWh > 0) {
        hoursToTarget = energyAvailableWh / Math.abs(totalPowerW);
      }
    }

    if (hoursToTarget <= 0 || !Number.isFinite(hoursToTarget)) {
      return {
        datetime: null,
        timeUntil: null,
        hoursUntil: 0,
        minutesUntil: 0,
        direction
      };
    }

    // Calculate target datetime using Home Assistant timezone
    const now = new Date();
    const targetMs = now.getTime() + (hoursToTarget * 3600 * 1000);
    const targetDate = new Date(targetMs);

    // Format datetime string (locale-aware format: date + time without seconds)
    const dateStr = targetDate.toLocaleDateString();
    const timeStr = targetDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const datetimeStr = `${dateStr} - ${timeStr}`;

    // Calculate hours and minutes until target
    const totalMinutes = Math.round(hoursToTarget * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    // Format time until string
    const timeUntilStr = hours > 0 
      ? `${hours}h ${minutes}m`
      : `${minutes}m`;

    return {
      datetime: datetimeStr,
      timeUntil: timeUntilStr,
      hoursUntil: hours,
      minutesUntil: minutes,
      direction,
      targetDate
    };
  }
}
