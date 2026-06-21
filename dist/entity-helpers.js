export function getStateSafe(hass, entity_id) {
  if (!entity_id || !hass.states[entity_id] ||
      hass.states[entity_id].state === 'unavailable' ||
      hass.states[entity_id].state === 'unknown') {
    return 0;
  }

  const stateString = hass.states[entity_id].state;
  let value = parseFloat(stateString);
  const attributes = hass.states[entity_id].attributes || {};
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

export function getEntityName(hass, entity_id) {
  if (!entity_id || !hass.states[entity_id]) {
    return entity_id || 'Unknown';
  }
  return hass.states[entity_id].attributes.friendly_name || entity_id;
}

export function formatPower(watts, use_kw) {
  if (use_kw) {
    return (watts / 1000).toFixed(2) + ' kW';
  }
  return Math.round(watts) + ' W';
}

export function formatEnergy(wattHours, use_kw) {
  const value = Number.isFinite(wattHours) ? wattHours : 0;
  if (use_kw) {
    return (value / 1000).toFixed(2) + ' kWh';
  }
  return Math.round(value) + ' Wh';
}

export function formatPopupValue(hass, _unused, sensorId) {
  if (!sensorId || !hass || !hass.states) {
    return '';
  }
  const resolvedId = typeof sensorId === 'string' ? sensorId.trim() : sensorId;
  if (!resolvedId || !hass.states[resolvedId]) {
    return '';
  }
  const entity = hass.states[resolvedId];
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
