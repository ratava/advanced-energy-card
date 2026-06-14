import {
  CAR_LAYOUTS, TEXT_POSITIONS, TEXT_TRANSFORMS, buildCarTextTransforms,
  DEFAULT_GRID_ACTIVITY_THRESHOLD, MAX_PV_LINES, PV_LINE_SPACING,
  DEFAULT_BATTERY_FILL_HIGH_COLOR, DEFAULT_BATTERY_FILL_LOW_COLOR, DEFAULT_BATTERY_LOW_THRESHOLD,
  FLOW_STYLE_DEFAULT, BATTERY_GEOMETRY, TXT_STYLE,
  HEADLIGHT_SVG_FILTER_ID, HEADLIGHT_SVG_FILTER_STD_DEV, FLOW_ARROW_COUNT,
} from './constants.js';
import { applySvgLayerVisibility, getConfiguredCarCount } from './svg-layer-visibility.js';
import { LocalizationManager } from './localization-manager.js';
import { SecurityHelpers, ResourceRateLimiter } from './security.js';

/**
 * Render Manager
 * Owns the card's render pipeline: builds the viewState object from config/hass
 * (sensor reads, calculations, formatting) and applies a viewState to the DOM.
 */
export class RenderManager {
  constructor(card) {
    this.card = card;
  }

  buildTemplate(viewState) {
    const batX = BATTERY_GEOMETRY.X;
    const batteryPath = `M ${batX - 20} 5 Q ${batX} 0 ${batX + 20} 5 T ${batX + 60} 5 T ${batX + 100} 5 T ${batX + 140} 5 V 150 H ${batX - 20} Z`;
    const car1Display = viewState.car1.visible ? 'inline' : 'none';
    const car1SocDisplay = viewState.car1.soc.visible ? 'inline' : 'none';
    const car2Display = viewState.car2.visible ? 'inline' : 'none';
    const car2SocDisplay = viewState.car2.soc.visible ? 'inline' : 'none';
    const pvLineElements = viewState.pv.lines.map((line, index) => {
      const display = line.visible ? 'inline' : 'none';
      return `<text data-role="pv-line-${index}" x="${TEXT_POSITIONS.solar.x}" y="${line.y}" transform="${TEXT_TRANSFORMS.solar}" fill="${line.fill}" font-size="${viewState.pv.fontSize}" style="${TXT_STYLE}; display:${display};">${line.text}</text>`;
    }).join('');
    const dailyDisplay = viewState.daily && viewState.daily.visible ? 'inline' : 'none';
    const dailyCursor = viewState.daily && viewState.daily.visible ? 'pointer' : 'default';
    const enableEchoAlive = Boolean(this.card.config && this.card.config.enable_echo_alive);
    const echoAliveIframe = enableEchoAlive ? `
        <div class="echo-alive-container" data-role="echo-alive-container">
          <iframe
            class="echo-alive-iframe"
            src="https://Giorgio866.github.io/Alive-echo/?v=6"
            title="Echo Alive"
            data-role="echo-alive-iframe">
          </iframe>
        </div>
      ` : '';

    return `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        :host { display: block; }
        ha-card { position: relative; height: 100%; overflow: hidden; background: transparent; border: none; box-shadow: none; }
        .track-path { stroke: #555555; stroke-width: 2px; fill: none; opacity: 0; }
        .flow-path { stroke-linecap: round; stroke-width: 3px; fill: none; opacity: 0; transition: opacity 0.35s ease; filter: none; }
        .flow-arrow { pointer-events: none; opacity: 0; transition: opacity 0.35s ease; }
        @keyframes pulse-cyan { 0% { filter: drop-shadow(0 0 2px #00FFFF); } 50% { filter: drop-shadow(0 0 10px #00FFFF); } 100% { filter: drop-shadow(0 0 2px #00FFFF); } }
        @keyframes advanced-fluid-flow { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -30; } }
        .alive-box { animation: pulse-cyan 3s infinite ease-in-out; stroke: #00FFFF; stroke-width: 2px; fill: #001428; }
        .alive-text { fill: #00FFFF; }
        @keyframes wave-slide { 0% { transform: translateX(0); } 100% { transform: translateX(-80px); } }
        .liquid-shape { animation: wave-slide 2s linear infinite; }
        @keyframes advanced-car-effect-car1 {
          0% { opacity: calc(var(--car-effect-opacity, 0.8) * 0.3); }
          50% { opacity: var(--car-effect-opacity, 0.8); }
          100% { opacity: calc(var(--car-effect-opacity, 0.8) * 0.3); }
        }
        @keyframes advanced-car-effect-car2 {
          0% { opacity: calc(var(--car-effect-opacity, 0.8) * 0.3); }
          50% { opacity: var(--car-effect-opacity, 0.8); }
          100% { opacity: calc(var(--car-effect-opacity, 0.8) * 0.3); }
        }
        .title-text { fill: #00FFFF; font-weight: 900; font-family: 'Orbitron', sans-serif; text-anchor: middle; letter-spacing: 3px; text-transform: uppercase; }
        /* Editor helpers */
        .editor-divider {
          display: block;
          width: 100%;
          min-width: 100%;
          background-color: var(--divider-color, #ccc) !important;
          height: 2px !important;
          margin: 1em 0;
          box-shadow: none;
          align-self: stretch;
        }
        /* Visual header for Array 2: use a dedicated class so no styles are inherited */
        .array2-header { display: block; }
        .array2-visual-header {
          font-weight: bold !important;
          font-size: 1.05em !important;
          padding: 12px 16px !important;
          color: var(--primary-color) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          cursor: default !important;
          list-style: none !important;
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
        }
        .array2-visual-header + .field-helper { margin: 0 0 12px 16px; color: var(--secondary-text-color); font-size: 0.9em; }
        /* Ensure no disclosure marker/caret appears on the visual header */
        .array2-visual-header::after,
        .array2-visual-header::marker,
        .array2-visual-header::-webkit-details-marker { content: '' !important; display: none !important; }
        .title-overlay {
          position: absolute;
          left: 0;
          top: 0;
          display: none;
          align-items: center;
          justify-content: center;
          text-align: center;
          pointer-events: none;
          box-sizing: border-box;
          white-space: nowrap;
          overflow: hidden;
          border-radius: 5px;
          box-shadow: inset 0 0 6px currentColor, 0 0 2px currentColor, 0 0 8px currentColor;
          text-shadow: 0 0 6px currentColor;
        }

        .popup-backdrop {
          position: absolute;
          inset: 0;
          display: none;
          pointer-events: auto;
          background: transparent;
        }

        .popup-overlay {
          position: absolute;
          left: 0;
          top: 0;
          display: none;
          box-sizing: border-box;
          background: #001428;
          border: 2px solid #00FFFF;
          border-radius: 10px;
          box-shadow: inset 0 0 8px #00FFFF, 0 0 3px #00FFFF, 0 0 9px #00FFFF;
          cursor: pointer;
        }

        .popup-lines {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        /* Clickable entity rows inside popup overlay */
        .popup-line {
          font-family: sans-serif;
          white-space: nowrap;
          line-height: 1.25;
          cursor: pointer;
          user-select: none;
          padding: 2px 6px;
          border-radius: 4px;
          outline: none;
          transition: background 0.15s ease, box-shadow 0.15s ease;
        }
        .popup-line:hover,
        .popup-line:focus-visible {
          background: rgba(0, 255, 255, 0.15);
          box-shadow: 0 0 6px rgba(0, 255, 255, 0.4);
        }

        /* Header rows inside popup overlay */
        .popup-header {
          font-family: sans-serif;
          white-space: nowrap;
          line-height: 1.25;
          user-select: none;
          padding: 4px 6px;
          outline: none;
          font-weight: bold;
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
          margin-top: 8px;
          margin-bottom: 4px;
        }

        /* Echo Alive iframe styles - Small transparent hotspot bottom-left */
        .echo-alive-container {
          position: absolute;
          bottom: 8px;
          left: 8px;
          width: 10px;
          height: 10px;
          z-index: 9999;
          pointer-events: auto;
          border-radius: 2px;
          background: rgba(0, 255, 255, 0.3);
          border: none;
          box-shadow: none;
          transition: all 0.2s ease, opacity 0.3s ease;
          overflow: hidden;
        }
        .echo-alive-container:hover {
          background: rgba(0, 255, 255, 0.5);
        }
        .echo-alive-container.clicked {
          background: rgba(0, 255, 255, 1) !important;
          box-shadow: 0 0 8px rgba(0, 255, 255, 1) !important;
          transform: scale(1.5);
          animation: echoAlivePulse 0.5s ease;
        }
        @keyframes echoAlivePulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.8); }
          100% { transform: scale(1.5); }
        }
        .echo-alive-iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: transparent;
          pointer-events: auto;
          opacity: 1;
        }
        .echo-alive-container ha-icon-button,
        .echo-alive-container button,
        .echo-alive-container .icon-button,
        .echo-alive-container [class*="icon-button"],
        .echo-alive-container [class*="button"],
        .echo-alive-container [role="button"],
        .echo-alive-container * {
          display: none !important;
          visibility: hidden !important;
        }
      </style>
      <ha-card>
        <svg viewBox="0 0 800 450" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="width: 100%; height: 100%;">
          <defs>
            <clipPath id="battery-clip"><rect x="${BATTERY_GEOMETRY.X}" y="${BATTERY_GEOMETRY.Y_BASE - BATTERY_GEOMETRY.MAX_HEIGHT}" width="${BATTERY_GEOMETRY.WIDTH}" height="${BATTERY_GEOMETRY.MAX_HEIGHT}" rx="2" /></clipPath>
            <filter id="${HEADLIGHT_SVG_FILTER_ID}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation="${HEADLIGHT_SVG_FILTER_STD_DEV}" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g data-role="background-svg"></g>

          <!--
          ${viewState.title && viewState.title.text ? `
          <rect x="290" y="10" width="220" height="32" rx="6" ry="6" fill="rgba(0, 20, 40, 0.85)" stroke="#00FFFF" stroke-width="1.5"/>
          <text data-role="title-text" x="400" y="32" class="title-text" font-size="${viewState.title.fontSize}">${viewState.title.text}</text>
          ` : ''}
          -->

          <!--
          <g data-role="daily-yield-group" transform="translate(600, 370)" style="cursor:${dailyCursor}; display:${dailyDisplay};">
            <rect x="0" y="0" width="180" height="60" rx="10" ry="10" class="alive-box" />
            <text data-role="daily-label" x="90" y="23" class="alive-text" style="font-family: sans-serif; text-anchor:middle; font-size:${viewState.daily.labelSize}px; font-weight:normal; letter-spacing: 1px;">${viewState.daily.label}</text>
            <text data-role="daily-value" x="90" y="50" class="alive-text" style="font-family: sans-serif; text-anchor:middle; font-size:${viewState.daily.valueSize}px; font-weight:bold;">${viewState.daily.value}</text>
          </g>
          -->

          <!-- Old PV power and string values - commented out for SVG transition -->
          <!-- ${pvLineElements} -->

          <!-- Old house consumption - commented out for SVG transition -->
          <!--
          <text data-role="load-power" x="${TEXT_POSITIONS.home.x}" y="${TEXT_POSITIONS.home.y}" transform="${TEXT_TRANSFORMS.home}" fill="${viewState.load.fill}" font-size="${viewState.load.fontSize}" style="${TXT_STYLE}">${viewState.load.text || ''}</text>
          <text data-role="load-line-0" x="${TEXT_POSITIONS.home.x}" y="${TEXT_POSITIONS.home.y}" transform="${TEXT_TRANSFORMS.home}" fill="${(viewState.load.lines && viewState.load.lines[0] && viewState.load.lines[0].fill) || viewState.load.fill}" font-size="${viewState.load.fontSize}" style="${TXT_STYLE}; display:none;"></text>
          <text data-role="load-line-1" x="${TEXT_POSITIONS.home.x}" y="${TEXT_POSITIONS.home.y}" transform="${TEXT_TRANSFORMS.home}" fill="${(viewState.load.lines && viewState.load.lines[1] && viewState.load.lines[1].fill) || viewState.load.fill}" font-size="${viewState.load.fontSize}" style="${TXT_STYLE}; display:none;"></text>
          <text data-role="load-line-2" x="${TEXT_POSITIONS.home.x}" y="${TEXT_POSITIONS.home.y}" transform="${TEXT_TRANSFORMS.home}" fill="${(viewState.load.lines && viewState.load.lines[2] && viewState.load.lines[2].fill) || viewState.load.fill}" font-size="${viewState.load.fontSize}" style="${TXT_STYLE}; display:none;"></text>
          -->
          <!--
          <text data-role="heat-pump-power" x="${TEXT_POSITIONS.heatPump.x}" y="${TEXT_POSITIONS.heatPump.y}" transform="${TEXT_TRANSFORMS.heatPump}" fill="${viewState.heatPump.fill}" font-size="${viewState.heatPump.fontSize}" style="${TXT_STYLE}; display:${viewState.heatPump.visible ? 'inline' : 'none'};">${viewState.heatPump.text}</text>
          <text data-role="grid-power" x="${TEXT_POSITIONS.grid.x}" y="${TEXT_POSITIONS.grid.y}" transform="${TEXT_TRANSFORMS.grid}" fill="${viewState.grid.fill}" font-size="${viewState.grid.fontSize}" style="${TXT_STYLE}">${viewState.grid.text}</text>

          <text data-role="grid-line-0" x="${TEXT_POSITIONS.grid.x}" y="${TEXT_POSITIONS.grid.y}" transform="${TEXT_TRANSFORMS.grid}" fill="${(viewState.grid.lines && viewState.grid.lines[0] && viewState.grid.lines[0].fill) || viewState.grid.fill}" font-size="${viewState.grid.fontSize}" style="${TXT_STYLE}; display:none;"></text>
          <text data-role="grid-line-1" x="${TEXT_POSITIONS.grid.x}" y="${TEXT_POSITIONS.grid.y}" transform="${TEXT_TRANSFORMS.grid}" fill="${(viewState.grid.lines && viewState.grid.lines[1] && viewState.grid.lines[1].fill) || viewState.grid.fill}" font-size="${viewState.grid.fontSize}" style="${TXT_STYLE}; display:none;"></text>

          <text data-role="car1-label" x="${viewState.car1.label.x}" y="${viewState.car1.label.y}" transform="${viewState.car1.label.transform}" fill="${viewState.car1.label.fill}" font-size="${viewState.car1.label.fontSize}" style="${TXT_STYLE}; display:${car1Display};">${viewState.car1.label.text}</text>
          <text data-role="car1-power" x="${viewState.car1.power.x}" y="${viewState.car1.power.y}" transform="${viewState.car1.power.transform}" fill="${viewState.car1.power.fill}" font-size="${viewState.car1.power.fontSize}" style="${TXT_STYLE}; display:${car1Display};">${viewState.car1.power.text}</text>
          <text data-role="car1-soc" x="${viewState.car1.soc.x}" y="${viewState.car1.soc.y}" transform="${viewState.car1.soc.transform}" fill="${viewState.car1.soc.fill}" font-size="${viewState.car1.soc.fontSize}" style="${TXT_STYLE}; display:${car1SocDisplay};">${viewState.car1.soc.text}</text>

          <text data-role="car2-label" x="${viewState.car2.label.x}" y="${viewState.car2.label.y}" transform="${viewState.car2.label.transform}" fill="${viewState.car2.label.fill}" font-size="${viewState.car2.label.fontSize}" style="${TXT_STYLE}; display:${car2Display};">${viewState.car2.label.text}</text>
          <text data-role="car2-power" x="${viewState.car2.power.x}" y="${viewState.car2.power.y}" transform="${viewState.car2.power.transform}" fill="${viewState.car2.power.fill}" font-size="${viewState.car2.power.fontSize}" style="${TXT_STYLE}; display:${car2Display};">${viewState.car2.power.text}</text>
          <text data-role="car2-soc" x="${viewState.car2.soc.x}" y="${viewState.car2.soc.y}" transform="${viewState.car2.soc.transform}" fill="${viewState.car2.soc.fill}" font-size="${viewState.car2.soc.fontSize}" style="${TXT_STYLE}; display:${car2SocDisplay};">${viewState.car2.soc.text}</text>
          -->

          <g data-role="pv-popup" style="display:none; cursor:pointer;">
            <rect x="300" y="200" width="200" height="120" rx="10" ry="10" class="alive-box" />
            <text data-role="pv-popup-line-0" x="400" y="225" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="pv-popup-line-1" x="400" y="240" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="pv-popup-line-2" x="400" y="255" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="pv-popup-line-3" x="400" y="270" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="pv-popup-line-4" x="400" y="285" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="pv-popup-line-5" x="400" y="300" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
          </g>

          <g data-role="battery-popup" style="display:none; cursor:pointer;">
            <rect x="300" y="200" width="200" height="120" rx="10" ry="10" class="alive-box" />
            <text data-role="battery-popup-line-0" x="400" y="225" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="battery-popup-line-1" x="400" y="240" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="battery-popup-line-2" x="400" y="255" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="battery-popup-line-3" x="400" y="270" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="battery-popup-line-4" x="400" y="285" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="battery-popup-line-5" x="400" y="300" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
          </g>

          <g data-role="house-popup" style="display:none; cursor:pointer;">
            <rect x="300" y="200" width="200" height="120" rx="10" ry="10" class="alive-box" />
            <text data-role="house-popup-line-0" x="400" y="225" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="house-popup-line-1" x="400" y="240" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="house-popup-line-2" x="400" y="255" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="house-popup-line-3" x="400" y="270" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="house-popup-line-4" x="400" y="285" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="house-popup-line-5" x="400" y="300" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
          </g>

          <g data-role="grid-popup" style="display:none; cursor:pointer;">
            <rect x="300" y="200" width="200" height="120" rx="10" ry="10" class="alive-box" />
            <text data-role="grid-popup-line-0" x="400" y="225" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="grid-popup-line-1" x="400" y="240" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="grid-popup-line-2" x="400" y="255" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="grid-popup-line-3" x="400" y="270" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="grid-popup-line-4" x="400" y="285" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="grid-popup-line-5" x="400" y="300" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
          </g>

          <g data-role="inverter-popup" style="display:none; cursor:pointer;">
            <rect x="300" y="200" width="200" height="120" rx="10" ry="10" class="alive-box" />
            <text data-role="inverter-popup-line-0" x="400" y="225" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="inverter-popup-line-1" x="400" y="240" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="inverter-popup-line-2" x="400" y="255" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="inverter-popup-line-3" x="400" y="270" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="inverter-popup-line-4" x="400" y="285" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
            <text data-role="inverter-popup-line-5" x="400" y="300" fill="#FFFFFF" font-size="16" font-family="sans-serif" text-anchor="middle" style="display:none;"></text>
          </g>

        </svg>
        <div class="title-overlay" data-role="title-overlay"></div>
        <div class="title-overlay" data-role="pv-daily-overlay"></div>
        <div class="popup-backdrop" data-role="popup-backdrop">
          <div class="popup-overlay" data-role="popup-overlay">
            <div class="popup-lines" data-role="popup-lines"></div>
          </div>
        </div>
        ${echoAliveIframe}
      </ha-card>
    `;
  }


  buildViewState(config) {
    // ============================================================
    // SECTION 1: SENSOR READING
    // Read all sensor values from Home Assistant
    // ============================================================
    
    // PV sensors
    const pvStringIds = [
      config.sensor_pv1, config.sensor_pv2, config.sensor_pv3,
      config.sensor_pv4, config.sensor_pv5, config.sensor_pv6
    ].filter((sensorId) => sensorId && sensorId !== '');

    const pvStringValues = pvStringIds.map((sensorId) => this.card.getStateSafe(sensorId));
    const pvTotalFromStrings = pvStringValues.reduce((acc, value) => acc + value, 0);

    const pvArray2Ids = [
      config.sensor_pv_array2_1, config.sensor_pv_array2_2, config.sensor_pv_array2_3,
      config.sensor_pv_array2_4, config.sensor_pv_array2_5, config.sensor_pv_array2_6
    ].filter((sensorId) => sensorId && sensorId !== '');
    const pvArray2Values = pvArray2Ids.map((sensorId) => this.card.getStateSafe(sensorId));
    const pvArray2TotalFromStrings = pvArray2Values.reduce((acc, value) => acc + value, 0);

    const pv_primary_w = config.sensor_pv_total ? this.card.getStateSafe(config.sensor_pv_total) : pvTotalFromStrings;
    const pv_secondary_w = config.sensor_pv_total_secondary ? this.card.getStateSafe(config.sensor_pv_total_secondary) : pvArray2TotalFromStrings;
    const total_pv_w = pv_primary_w + pv_secondary_w;

    // Appliance sensors
    const heatPumpSensorId = typeof config.sensor_heat_pump_consumption === 'string'
      ? config.sensor_heat_pump_consumption.trim()
      : (config.sensor_heat_pump_consumption || null);
    const hasHeatPumpSensor = Boolean(heatPumpSensorId);
    const heat_pump_w = hasHeatPumpSensor ? this.card.getStateSafe(heatPumpSensorId) : 0;

    const hotWaterSensorId = typeof config.sensor_hot_water_consumption === 'string'
      ? config.sensor_hot_water_consumption.trim()
      : (config.sensor_hot_water_consumption || null);
    const hasHotWaterSensor = Boolean(hotWaterSensorId);
    const hot_water_w = hasHotWaterSensor ? this.card.getStateSafe(hotWaterSensorId) : 0;

    const poolSensorId = typeof config.sensor_pool_consumption === 'string'
      ? config.sensor_pool_consumption.trim()
      : (config.sensor_pool_consumption || null);
    const hasPoolSensor = Boolean(poolSensorId);
    const pool_w = hasPoolSensor ? this.card.getStateSafe(poolSensorId) : 0;

    const washingMachineSensorId = typeof config.sensor_washing_machine_consumption === 'string'
      ? config.sensor_washing_machine_consumption.trim()
      : (config.sensor_washing_machine_consumption || null);
    const hasWashingMachineSensor = Boolean(washingMachineSensorId);
    const washing_machine_w = hasWashingMachineSensor ? this.card.getStateSafe(washingMachineSensorId) : 0;

    const dishwasherSensorId = typeof config.sensor_dishwasher_consumption === 'string'
      ? config.sensor_dishwasher_consumption.trim()
      : (config.sensor_dishwasher_consumption || null);
    const hasDishwasherSensor = Boolean(dishwasherSensorId);
    const dishwasher_w = hasDishwasherSensor ? this.card.getStateSafe(dishwasherSensorId) : 0;

    const dryerSensorId = typeof config.sensor_dryer_consumption === 'string'
      ? config.sensor_dryer_consumption.trim()
      : (config.sensor_dryer_consumption || null);
    const hasDryerSensor = Boolean(dryerSensorId);
    const dryer_w = hasDryerSensor ? this.card.getStateSafe(dryerSensorId) : 0;

    const refrigeratorSensorId = typeof config.sensor_refrigerator_consumption === 'string'
      ? config.sensor_refrigerator_consumption.trim()
      : (config.sensor_refrigerator_consumption || null);
    const hasRefrigeratorSensor = Boolean(refrigeratorSensorId);
    const refrigerator_w = hasRefrigeratorSensor ? this.card.getStateSafe(refrigeratorSensorId) : 0;

    const freezerSensorId = typeof config.sensor_freezer_consumption === 'string'
      ? config.sensor_freezer_consumption.trim()
      : (config.sensor_freezer_consumption || null);
    const hasFreezerSensor = Boolean(freezerSensorId);
    const freezer_w = hasFreezerSensor ? this.card.getStateSafe(freezerSensorId) : 0;

    // Utility functions for sensor reading
    const resolveEntityId = (value) => (typeof value === 'string' ? value.trim() : '');
    const isEntityAvailable = (entityId) => {
      if (!entityId || !this.card._hass || !this.card._hass.states || !this.card._hass.states[entityId]) {
        return false;
      }
      const state = this.card._hass.states[entityId].state;
      return state !== 'unavailable' && state !== 'unknown';
    };
    const getNumericState = (entityId) => {
      const id = (typeof entityId === 'string') ? entityId.trim() : '';
      if (!id || !isEntityAvailable(id)) {
        return null;
      }
      const raw = this.card.getStateSafe(id);
      const num = Number(raw);
      return Number.isFinite(num) ? num : null;
    };
    const gridPowerOnly = Boolean(config.grid_power_only);
    
    // Battery states (using BatteryManager)
    const batteryStates = this.card._batteryManager.getAllBatteryStates(config);
    const activeBatteries = this.card._batteryManager.getActiveBatteries(batteryStates);
    const total_bat_w = this.card._batteryManager.getTotalPower(batteryStates);
    const avg_soc = this.card._batteryManager.getAverageSOC(batteryStates);
    const activeSocCount = activeBatteries.length;

    // Battery time calculations (inverter 1: batteries 1-2, inverter 2: batteries 3-4)
    const inv1BatteryTime = this.card._batteryManager.calculateInverterBatteryTime([1, 2], batteryStates, config, this.card._hass);
    const inv2BatteryTime = this.card._batteryManager.calculateInverterBatteryTime([3, 4], batteryStates, config, this.card._hass);

    // Get other sensors
    const toNumber = (value) => {
      if (value === undefined || value === null || value === '') {
        return null;
      }
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };

    // Grid can be driven by one or two inverters.
    // Inverter 1 uses the existing sensor_grid_* keys.
    // Inverter 2 uses sensor_grid2_*.
    let gridNet = 0;
    let gridMagnitude = 0;
    let gridDirection = 1;
    let gridActive = false;
    let gridImportDaily = 0;
    let gridExportDaily = 0;

    let grid1Net = 0;
    let grid1Import = 0;
    let grid1Export = 0;
    let grid1ImportDaily = 0;
    let grid1ExportDaily = 0;
    let grid1Direction = 1;
    let grid1Magnitude = 0;
    let grid1Active = false;
    const hasCombinedGrid1 = Boolean(config.sensor_grid_power);

    let grid2Net = 0;
    let grid2Import = 0;
    let grid2Export = 0;
    let grid2ImportDaily = 0;
    let grid2ExportDaily = 0;
    let grid2Direction = 1;
    let grid2Magnitude = 0;
    let grid2Active = false;
    const hasCombinedGrid2 = Boolean(config.sensor_grid2_power);
    const hasAnyGrid2 = Boolean(config.sensor_grid2_power || config.sensor_grid2_import || config.sensor_grid2_export);

    const display_unit = config.display_unit || 'W';
    const use_kw = display_unit.toUpperCase() === 'KW';
    const gridActivityThreshold = (() => {
      const raw = config.grid_activity_threshold;
      if (raw === undefined || raw === null || raw === '') {
        return DEFAULT_GRID_ACTIVITY_THRESHOLD;
      }
      const num = Number(raw);
      if (!Number.isFinite(num)) {
        return DEFAULT_GRID_ACTIVITY_THRESHOLD;
      }
      return Math.min(Math.max(num, 0), 100000);
    })();

    if (config.sensor_grid_import_daily) {
      const raw = this.card.getStateSafe(config.sensor_grid_import_daily);
      grid1ImportDaily = Number.isFinite(Number(raw)) ? Number(raw) : 0;
    }
    if (config.sensor_grid_export_daily) {
      const raw = this.card.getStateSafe(config.sensor_grid_export_daily);
      grid1ExportDaily = Number.isFinite(Number(raw)) ? Number(raw) : 0;
    }
    if (config.sensor_grid2_import_daily) {
      const raw = this.card.getStateSafe(config.sensor_grid2_import_daily);
      grid2ImportDaily = Number.isFinite(Number(raw)) ? Number(raw) : 0;
    }
    if (config.sensor_grid2_export_daily) {
      const raw = this.card.getStateSafe(config.sensor_grid2_export_daily);
      grid2ExportDaily = Number.isFinite(Number(raw)) ? Number(raw) : 0;
    }

    // Inverter 1 grid
    if (hasCombinedGrid1) {
      const grid_raw = this.card.getStateSafe(config.sensor_grid_power);
      const gridAdjusted = config.invert_grid ? (grid_raw * -1) : grid_raw;
      const thresholdedNet = Math.abs(gridAdjusted) < gridActivityThreshold ? 0 : gridAdjusted;
      grid1Net = thresholdedNet;
      grid1Magnitude = Math.abs(grid1Net);
      if (!Number.isFinite(grid1Magnitude)) {
        grid1Magnitude = 0;
      }
      grid1Direction = grid1Net > 0 ? 1 : (grid1Net < 0 ? -1 : 1);
      grid1Active = gridActivityThreshold === 0
        ? grid1Magnitude > 0
        : grid1Magnitude >= gridActivityThreshold;
    } else {
      if (config.sensor_grid_import) {
        grid1Import = this.card.getStateSafe(config.sensor_grid_import);
        if (Math.abs(grid1Import) < gridActivityThreshold) {
          grid1Import = 0;
        }
      }
      if (config.sensor_grid_export) {
        grid1Export = this.card.getStateSafe(config.sensor_grid_export);
        if (Math.abs(grid1Export) < gridActivityThreshold) {
          grid1Export = 0;
        }
      }
      grid1Net = grid1Import - grid1Export;
      if (config.invert_grid) {
        grid1Net *= -1;
        const temp = grid1Import;
        grid1Import = grid1Export;
        grid1Export = temp;
      }
      if (Math.abs(grid1Net) < gridActivityThreshold) {
        grid1Net = 0;
      }
      grid1Magnitude = Math.abs(grid1Net);
      if (!Number.isFinite(grid1Magnitude)) {
        grid1Magnitude = 0;
      }
      const preferredDirection = grid1Import >= grid1Export ? 1 : -1;
      grid1Direction = grid1Net > 0 ? 1 : (grid1Net < 0 ? -1 : preferredDirection);
      grid1Active = gridActivityThreshold === 0
        ? grid1Magnitude > 0
        : grid1Magnitude >= gridActivityThreshold;
    }

    // Inverter 2 grid (optional)
    if (hasAnyGrid2) {
      if (hasCombinedGrid2) {
        const grid_raw = this.card.getStateSafe(config.sensor_grid2_power);
        const gridAdjusted = config.invert_grid ? (grid_raw * -1) : grid_raw;
        const thresholdedNet = Math.abs(gridAdjusted) < gridActivityThreshold ? 0 : gridAdjusted;
        grid2Net = thresholdedNet;
        grid2Magnitude = Math.abs(grid2Net);
        if (!Number.isFinite(grid2Magnitude)) {
          grid2Magnitude = 0;
        }
        grid2Direction = grid2Net > 0 ? 1 : (grid2Net < 0 ? -1 : 1);
        grid2Active = gridActivityThreshold === 0
          ? grid2Magnitude > 0
          : grid2Magnitude >= gridActivityThreshold;
      } else {
        if (config.sensor_grid2_import) {
          grid2Import = this.card.getStateSafe(config.sensor_grid2_import);
          if (Math.abs(grid2Import) < gridActivityThreshold) {
            grid2Import = 0;
          }
        }
        if (config.sensor_grid2_export) {
          grid2Export = this.card.getStateSafe(config.sensor_grid2_export);
          if (Math.abs(grid2Export) < gridActivityThreshold) {
            grid2Export = 0;
          }
        }
        grid2Net = grid2Import - grid2Export;
        if (config.invert_grid) {
          grid2Net *= -1;
          const temp = grid2Import;
          grid2Import = grid2Export;
          grid2Export = temp;
        }
        if (Math.abs(grid2Net) < gridActivityThreshold) {
          grid2Net = 0;
        }
        grid2Magnitude = Math.abs(grid2Net);
        if (!Number.isFinite(grid2Magnitude)) {
          grid2Magnitude = 0;
        }
        const preferredDirection = grid2Import >= grid2Export ? 1 : -1;
        grid2Direction = grid2Net > 0 ? 1 : (grid2Net < 0 ? -1 : preferredDirection);
        grid2Active = gridActivityThreshold === 0
          ? grid2Magnitude > 0
          : grid2Magnitude >= gridActivityThreshold;
      }
    }

    // Totals for the existing grid display
    gridNet = grid1Net + grid2Net;
    if (Math.abs(gridNet) < gridActivityThreshold) {
      gridNet = 0;
    }
    gridMagnitude = Math.abs(gridNet);
    if (!Number.isFinite(gridMagnitude)) {
      gridMagnitude = 0;
    }
    const fallbackDirection = (grid1Magnitude >= grid2Magnitude) ? grid1Direction : grid2Direction;
    gridDirection = gridNet > 0 ? 1 : (gridNet < 0 ? -1 : (fallbackDirection || 1));
    gridActive = gridActivityThreshold === 0
      ? gridMagnitude > 0
      : gridMagnitude >= gridActivityThreshold;
    gridImportDaily = grid1ImportDaily + grid2ImportDaily;
    gridExportDaily = grid1ExportDaily + grid2ExportDaily;

    const thresholdMultiplier = use_kw ? 1000 : 1;
    const gridWarningThresholdRaw = toNumber(config.grid_threshold_warning);
    const gridCriticalThresholdRaw = toNumber(config.grid_threshold_critical);
    const gridWarningThreshold = gridWarningThresholdRaw !== null ? gridWarningThresholdRaw * thresholdMultiplier : null;
    const gridCriticalThreshold = gridCriticalThresholdRaw !== null ? gridCriticalThresholdRaw * thresholdMultiplier : null;
    const gridWarningColor = typeof config.grid_warning_color === 'string' && config.grid_warning_color ? config.grid_warning_color : null;
    const gridCriticalColor = typeof config.grid_critical_color === 'string' && config.grid_critical_color ? config.grid_critical_color : null;

    const grid2WarningThresholdRaw = toNumber(config.grid2_threshold_warning);
    const grid2CriticalThresholdRaw = toNumber(config.grid2_threshold_critical);
    const grid2WarningThreshold = grid2WarningThresholdRaw !== null ? grid2WarningThresholdRaw * thresholdMultiplier : null;
    const grid2CriticalThreshold = grid2CriticalThresholdRaw !== null ? grid2CriticalThresholdRaw * thresholdMultiplier : null;
    const grid2WarningColor = typeof config.grid2_warning_color === 'string' && config.grid2_warning_color ? config.grid2_warning_color : null;
    const grid2CriticalColor = typeof config.grid2_critical_color === 'string' && config.grid2_critical_color ? config.grid2_critical_color : null;
    const loadWarningThresholdRaw = toNumber(config.load_threshold_warning);
    const loadCriticalThresholdRaw = toNumber(config.load_threshold_critical);
    const loadWarningThreshold = loadWarningThresholdRaw !== null ? loadWarningThresholdRaw * thresholdMultiplier : null;
    const loadCriticalThreshold = loadCriticalThresholdRaw !== null ? loadCriticalThresholdRaw * thresholdMultiplier : null;
    const loadWarningColor = typeof config.load_warning_color === 'string' && config.load_warning_color ? config.load_warning_color : null;
    const loadCriticalColor = typeof config.load_critical_color === 'string' && config.load_critical_color ? config.load_critical_color : null;
    const gridDirectionSign = gridDirection >= 0 ? 1 : -1;
    const belowGridActivityThreshold = gridActivityThreshold > 0 && !gridActive;
    const load = this.card.getStateSafe(config.sensor_home_load);
    const loadSecondary = config.sensor_home_load_secondary ? this.card.getStateSafe(config.sensor_home_load_secondary) : 0;
    const houseTotalLoad = (Number.isFinite(load) ? load : 0) + (Number.isFinite(loadSecondary) ? loadSecondary : 0);
    const loadValue = Number.isFinite(load) ? load : 0;
    const daily1 = config.sensor_daily ? this.card.getStateSafe(config.sensor_daily) : 0;
    const daily2 = config.sensor_daily_array2 ? this.card.getStateSafe(config.sensor_daily_array2) : 0;
    const total_daily_kwh = ((daily1 + daily2) / 1000).toFixed(1);

    // EV Cars
    // Car states (using CarManager)
    const car1State = this.card._carManager.getCarState(1, config);
    const car2State = this.card._carManager.getCarState(2, config);
    const showCar1 = car1State.visible;
    const showCar2 = car2State.visible;
    const resolveLabel = (value, fallback) => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          return trimmed;
        }
      }
      return fallback;
    };
    const car1Label = car1State.label;
    const car2Label = car2State.label;
    const car1PowerValue = car1State.power;
    const car1SocValue = car1State.soc;
    const car2PowerValue = car2State.power;
    const car2SocValue = car2State.soc;
    const carLayoutKey = showCar2 ? 'dual' : 'single';
    const carLayout = CAR_LAYOUTS[carLayoutKey];
    const car1Transforms = buildCarTextTransforms(carLayout.car1);
    const car2Transforms = buildCarTextTransforms(carLayout.car2);

    // PV Popup
    const popupPvSensorIds = [
      config.sensor_popup_pv_1,
      config.sensor_popup_pv_2,
      config.sensor_popup_pv_3,
      config.sensor_popup_pv_4,
      config.sensor_popup_pv_5,
      config.sensor_popup_pv_6
    ];
    const popupPvValues = popupPvSensorIds.map((sensorId) => this.card.formatPopupValue(null, sensorId));

    // PV Popup names
    const popupPvNames = [
      config.sensor_popup_pv_1_name && config.sensor_popup_pv_1_name.trim() ? config.sensor_popup_pv_1_name.trim() : this.card.getEntityName(config.sensor_popup_pv_1),
      config.sensor_popup_pv_2_name && config.sensor_popup_pv_2_name.trim() ? config.sensor_popup_pv_2_name.trim() : this.card.getEntityName(config.sensor_popup_pv_2),
      config.sensor_popup_pv_3_name && config.sensor_popup_pv_3_name.trim() ? config.sensor_popup_pv_3_name.trim() : this.card.getEntityName(config.sensor_popup_pv_3),
      config.sensor_popup_pv_4_name && config.sensor_popup_pv_4_name.trim() ? config.sensor_popup_pv_4_name.trim() : this.card.getEntityName(config.sensor_popup_pv_4),
      config.sensor_popup_pv_5_name && config.sensor_popup_pv_5_name.trim() ? config.sensor_popup_pv_5_name.trim() : this.card.getEntityName(config.sensor_popup_pv_5),
      config.sensor_popup_pv_6_name && config.sensor_popup_pv_6_name.trim() ? config.sensor_popup_pv_6_name.trim() : this.card.getEntityName(config.sensor_popup_pv_6)
    ];

    // House Popup
    const popupHouseSensorIds = [
      config.sensor_popup_house_1,
      config.sensor_popup_house_2,
      config.sensor_popup_house_3,
      config.sensor_popup_house_4,
      config.sensor_popup_house_5,
      config.sensor_popup_house_6
    ];
    const popupHouseValues = popupHouseSensorIds.map((sensorId) => this.card.formatPopupValue(null, sensorId));

    // House Popup names
    const popupHouseNames = [
      config.sensor_popup_house_1_name && config.sensor_popup_house_1_name.trim() ? config.sensor_popup_house_1_name.trim() : this.card.getEntityName(config.sensor_popup_house_1),
      config.sensor_popup_house_2_name && config.sensor_popup_house_2_name.trim() ? config.sensor_popup_house_2_name.trim() : this.card.getEntityName(config.sensor_popup_house_2),
      config.sensor_popup_house_3_name && config.sensor_popup_house_3_name.trim() ? config.sensor_popup_house_3_name.trim() : this.card.getEntityName(config.sensor_popup_house_3),
      config.sensor_popup_house_4_name && config.sensor_popup_house_4_name.trim() ? config.sensor_popup_house_4_name.trim() : this.card.getEntityName(config.sensor_popup_house_4),
      config.sensor_popup_house_5_name && config.sensor_popup_house_5_name.trim() ? config.sensor_popup_house_5_name.trim() : this.card.getEntityName(config.sensor_popup_house_5),
      config.sensor_popup_house_6_name && config.sensor_popup_house_6_name.trim() ? config.sensor_popup_house_6_name.trim() : this.card.getEntityName(config.sensor_popup_house_6)
    ];

    // ============================================================
    // SECTION 2: STATE COMPUTATION
    // Process sensor data and compute derived values
    // ============================================================
    
    // Display settings
    const bg_img = (typeof config.background === 'string' && config.background.trim())
      ? config.background.trim()
      : '/local/community/advanced-energy-card/tech.svg';
    const title_text = (typeof config.card_title === 'string' && config.card_title.trim()) ? config.card_title.trim() : null;
    const title_text_color = (typeof config.title_text_color === 'string' && config.title_text_color.trim()) ? config.title_text_color.trim() : '';
    const title_bg_color = (typeof config.title_bg_color === 'string' && config.title_bg_color.trim()) ? config.title_bg_color.trim() : '';
    const card_label_color = (typeof config.card_label_color === 'string' && config.card_label_color.trim()) ? config.card_label_color.trim() : '';
    const card_label_font_size = (typeof config.card_label_font_size === 'string' && config.card_label_font_size.trim()) ? config.card_label_font_size.trim() : '';
    const card_value_color = (typeof config.card_value_color === 'string' && config.card_value_color.trim()) ? config.card_value_color.trim() : '';
    const card_value_font_size = (typeof config.card_value_font_size === 'string' && config.card_value_font_size.trim()) ? config.card_value_font_size.trim() : '';
    const card_background_color = (typeof config.card_background_color === 'string' && config.card_background_color.trim()) ? config.card_background_color.trim() : '';
    const card_label_css = SecurityHelpers.sanitizeLabelCss((typeof config.card_label_css === 'string') ? config.card_label_css : '');
    const card_value_css = SecurityHelpers.sanitizeLabelCss((typeof config.card_value_css === 'string') ? config.card_value_css : '');
    const font_family = (typeof config.font_family === 'string' && config.font_family.trim()) ? config.font_family.trim() : 'sans-serif';
    const odometer_font_family = (typeof config.odometer_font_family === 'string' && config.odometer_font_family.trim())
      ? config.odometer_font_family.trim()
      : font_family;
    // Best-effort: load the configured font(s) from Google Fonts (external is fine).
    this.card._ensureGoogleFont(font_family);
    if (odometer_font_family && odometer_font_family !== font_family) {
      this.card._ensureGoogleFont(odometer_font_family);
    }

    const resolveColor = (value, fallback) => {
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
      return fallback;
    };

    const clampValue = (value, min, max, fallback) => {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        return fallback;
      }
      return Math.min(Math.max(num, min), max);
    };

    const header_font_size = clampValue(config.header_font_size, 4, 32, 16);
    const daily_label_font_size = clampValue(config.daily_label_font_size, 4, 24, 12);
    const daily_value_font_size = clampValue(config.daily_value_font_size, 4, 32, 20);
    const pv_font_size = clampValue(config.pv_font_size, 4, 28, 16);
    const windmill_power_font_size = clampValue(config.windmill_power_font_size, 4, 28, 16);
    const battery_soc_font_size = clampValue(config.battery_soc_font_size, 4, 32, 20);
    const battery_power_font_size = clampValue(config.battery_power_font_size, 4, 28, 14);
    const battery_time_until_font_size = clampValue(config.battery_time_until_font_size, 4, 32, 8);
    const load_font_size = clampValue(config.load_font_size, 4, 28, 15);
    const inv1_power_font_size = clampValue(
      config.inv1_power_font_size !== undefined ? config.inv1_power_font_size : config.load_font_size,
      4,
      28,
      load_font_size
    );
    const inv2_power_font_size = clampValue(
      config.inv2_power_font_size !== undefined ? config.inv2_power_font_size : config.load_font_size,
      4,
      28,
      load_font_size
    );
    const heat_pump_font_size = clampValue(config.heat_pump_font_size, 4, 28, 16);
    const hot_water_font_size = clampValue(config.hot_water_font_size, 4, 28, 8);
    const pool_font_size = clampValue(
      config.pool_font_size !== undefined ? config.pool_font_size : config.heat_pump_font_size,
      4,
      28,
      heat_pump_font_size
    );
    const washing_machine_font_size = clampValue(
      config.washing_machine_font_size !== undefined ? config.washing_machine_font_size : config.heat_pump_font_size,
      4,
      28,
      heat_pump_font_size
    );
    const dishwasher_font_size = clampValue(config.dishwasher_font_size, 4, 28, 8);
    const dryer_font_size = clampValue(
      config.dryer_font_size !== undefined ? config.dryer_font_size : config.heat_pump_font_size,
      4,
      28,
      heat_pump_font_size
    );
    const refrigerator_font_size = clampValue(
      config.refrigerator_font_size !== undefined ? config.refrigerator_font_size : config.heat_pump_font_size,
      4,
      28,
      heat_pump_font_size
    );
    const freezer_font_size = clampValue(
      config.freezer_font_size !== undefined ? config.freezer_font_size : config.heat_pump_font_size,
      4,
      28,
      heat_pump_font_size
    );
    const grid_font_size = clampValue(config.grid_font_size, 4, 28, 15);
    const grid_daily_font_size = clampValue(config.grid_daily_font_size, 4, 28, grid_font_size);
    // Overview profile no longer exposes this toggle in its editor, so a stale/default
    // `true` value must not enable the odometer animation on the overview house-load.
    const isOverviewProfile = /overview\.svg$/i.test(bg_img);
    const grid_current_odometer = !isOverviewProfile && config.grid_current_odometer === true;
    const grid_current_odometer_duration = clampValue(config.grid_current_odometer_duration, 50, 2000, 350);
    const car_power_font_size = clampValue(config.car_power_font_size, 4, 28, 15);
    const car_soc_font_size = clampValue(config.car_soc_font_size, 4, 24, 12);
    const car2_power_font_size = clampValue(config.car2_power_font_size !== undefined ? config.car2_power_font_size : config.car_power_font_size, 4, 28, car_power_font_size);
    const car2_soc_font_size = clampValue(config.car2_soc_font_size !== undefined ? config.car2_soc_font_size : config.car_soc_font_size, 4, 24, car_soc_font_size);
    const car_name_font_size = clampValue(config.car_name_font_size !== undefined ? config.car_name_font_size : config.car_power_font_size, 4, 28, car_power_font_size);
    const car2_name_font_size = clampValue(config.car2_name_font_size !== undefined ? config.car2_name_font_size : (config.car2_power_font_size !== undefined ? config.car2_power_font_size : config.car_power_font_size), 4, 28, car2_power_font_size);
    const animation_speed_factor = clampValue(config.animation_speed_factor, -3, 3, 1);
    this.card._animationSpeedFactor = animation_speed_factor;
    this.card._rotationSpeedFactor = animation_speed_factor;
    const dayAnimationStyle = this.card._animationManager._normalizeAnimationStyle(config.animation_style);
    const nightAnimationStyle = (() => {
      const raw = (typeof config.night_animation_style === 'string') ? config.night_animation_style.trim() : '';
      if (!raw) return dayAnimationStyle;
      return this.card._animationManager._normalizeAnimationStyle(raw);
    })();
    const animation_style = Boolean(config.night_mode) ? nightAnimationStyle : dayAnimationStyle;
    this.card._animationStyle = animation_style;

    // Debugging: logs fluid_flow mask + animator lifecycle into the browser console.
    // Enable with YAML: debug_fluid_flow: true
    this.card._debugFluidFlow = Boolean(config.debug_fluid_flow);

    // Flow stroke width overrides (no SVG editing required).
    // - flow_stroke_width: applies to non-fluid flow styles (dashes/dots/etc)
    // - fluid_flow_stroke_width: base width for animation_style: fluid_flow
    //   (overlay + mask widths are derived from this base).
    const flow_stroke_width = (() => {
      const raw = toNumber(config.flow_stroke_width);
      if (raw === null) return null;
      const v = Number(raw);
      if (!Number.isFinite(v)) return null;
      return Math.min(Math.max(v, 0.5), 30);
    })();
    const fluid_flow_stroke_width = (() => {
      const raw = toNumber(config.fluid_flow_stroke_width);
      if (raw === null) return null;
      const v = Number(raw);
      if (!Number.isFinite(v)) return null;
      return Math.min(Math.max(v, 0.5), 30);
    })();
    this.card._flowStrokeWidthPx = flow_stroke_width;
    this.card._fluidFlowStrokeWidthPx = fluid_flow_stroke_width;

    // User-adjustable multiplier on top of the automatic stroke-width-based arrow scale
    // (see ARROW_SCALE_REFERENCE_STROKE_WIDTH in animation-manager.js).
    this.card._arrowScaleFactor = clampValue(config.arrow_scale, 0.5, 5, 1);

    // Controls the extra glow strength when animation_style is dashes_glow.
    // 0 disables glow even if dashes_glow is selected.
    const dashes_glow_intensity = clampValue(config.dashes_glow_intensity, 0, 3, 1);
    this.card._dashGlowIntensity = dashes_glow_intensity;

    // Controls the extra outer haze/glow layer for animation_style: fluid_flow.
    this.card._fluidFlowOuterGlowEnabled = Boolean(config.fluid_flow_outer_glow);

    // Language
    const lang = config.language || 'en';
    // Prefer locale strings (external or built-in) when available
    let label_daily = null;
    let label_pv_tot = null;
    let label_importing = null;
    let label_exporting = null;
    try {
      const localeStrings = (typeof this.card._getLocaleStrings === 'function') ? this.card._getLocaleStrings() : null;
      if (localeStrings && localeStrings.view) {
        label_daily = localeStrings.view.daily || null;
        label_pv_tot = localeStrings.view.pv_tot || null;
        label_importing = localeStrings.view.importing || null;
        label_exporting = localeStrings.view.exporting || null;
      }
    } catch (e) {
      // ignore
    }
    // Fallback to LocalizationManager if locales don't provide values
    if (!label_daily) {
      const i18n = new LocalizationManager(lang);
      label_daily = i18n.t('daily_yield');
    }
    if (!label_pv_tot) {
      const i18n = new LocalizationManager(lang);
      label_pv_tot = i18n.t('pv_tot');
    }
    if (!label_exporting) {
      const i18n = new LocalizationManager(lang);
      label_exporting = i18n.t('exporting');
    }

    // 3D coordinates

    const C_CYAN = '#00FFFF';
    const C_BLUE = '#0088FF';
    const C_WHITE = '#FFFFFF';
    const C_RED = '#FF3333';
    const pvPrimaryColor = resolveColor(config.pv_primary_color, C_CYAN);
    const pvTotColor = resolveColor(config.pv_tot_color, pvPrimaryColor);
    const pvSecondaryColor = resolveColor(config.pv_secondary_color, C_BLUE);
    const loadFlowColor = resolveColor(config.load_flow_color, C_CYAN);
    const loadTextBaseColor = resolveColor(config.load_text_color, C_WHITE);
    const gridImportColor = resolveColor(config.grid_import_color, C_RED);
    const gridExportColor = resolveColor(config.grid_export_color, C_CYAN);
    const grid2ImportColor = resolveColor(config.grid2_import_color, gridImportColor);
    const grid2ExportColor = resolveColor(config.grid2_export_color, gridExportColor);
    const carFlowColor = resolveColor(config.car_flow_color, C_CYAN);
    const heatPumpTextColor = resolveColor(config.heat_pump_text_color, '#FFA500');
    const heatPumpFlowColor = heatPumpTextColor;
    const windmillFlowColor = resolveColor(config.windmill_flow_color, C_CYAN);
    const windmillTextColor = resolveColor(config.windmill_text_color, C_WHITE);
    const loadMagnitude = Math.abs(loadValue);
    const effectiveLoadFlowColor = (() => {
      if (loadCriticalColor && loadCriticalThreshold !== null && loadMagnitude >= loadCriticalThreshold) {
        return loadCriticalColor;
      }
      if (loadWarningColor && loadWarningThreshold !== null && loadMagnitude >= loadWarningThreshold) {
        return loadWarningColor;
      }
      return loadFlowColor;
    })();
    const effectiveLoadTextColor = (() => {
      if (loadCriticalColor && loadCriticalThreshold !== null && loadMagnitude >= loadCriticalThreshold) {
        return loadCriticalColor;
      }
      if (loadWarningColor && loadWarningThreshold !== null && loadMagnitude >= loadWarningThreshold) {
        return loadWarningColor;
      }
      return loadTextBaseColor;
    })();

    const poolFlowColor = resolveColor(config.pool_flow_color, effectiveLoadFlowColor);
    const poolTextColor = resolveColor(config.pool_text_color, effectiveLoadTextColor);
    const hotWaterTextColor = resolveColor(config.hot_water_text_color, effectiveLoadTextColor);
    const washingMachineTextColor = resolveColor(config.washing_machine_text_color, effectiveLoadTextColor);
    const dishwasherTextColor = resolveColor(config.dishwasher_text_color, effectiveLoadTextColor);
    const dryerTextColor = resolveColor(config.dryer_text_color, effectiveLoadTextColor);
    const refrigeratorTextColor = resolveColor(config.refrigerator_text_color, effectiveLoadTextColor);
    const freezerTextColor = resolveColor(config.freezer_text_color, effectiveLoadTextColor);
    const batteryChargeColor = resolveColor(config.battery_charge_color, C_CYAN);
    const batteryDischargeColor = resolveColor(config.battery_discharge_color, C_WHITE);
    const batterySocColor = resolveColor(config.battery_soc_color, C_WHITE);
    const batteryTimeUntilColor = resolveColor(config.battery_time_until_color, C_WHITE);
    const invertBattery = false;
    const bat_col = C_CYAN;
    const batteryDirectionSign = 1;

    // Windmill
    const windmillTotalId = (typeof config.sensor_windmill_total === 'string') ? config.sensor_windmill_total.trim() : '';
    const windmillTotalAvailable = Boolean(windmillTotalId) && isEntityAvailable(windmillTotalId);
    const windmillTotalRaw = windmillTotalAvailable ? this.card.getStateSafe(windmillTotalId) : 0;
    const windmillTotalW = Number.isFinite(windmillTotalRaw) ? windmillTotalRaw : 0;
    const windmillSpin = windmillTotalAvailable && windmillTotalW > 0;
    const windmillFlowActive = windmillTotalAvailable && windmillTotalW > 10;

    // Inverter 1 Temperature
    const inverter1TempSensorId = (typeof config.sensor_inverter1_temp === 'string') ? config.sensor_inverter1_temp.trim() : '';
    const hasInverter1TempSensor = Boolean(inverter1TempSensorId);
    const inverter1TempValue = hasInverter1TempSensor ? this.card.formatPopupValue(null, inverter1TempSensorId) : '';
    const inverter1TempColor = resolveColor(config.inverter1_temp_color, C_WHITE);
    const inverter1TempFontSize = clampValue(config.inverter1_temp_font_size, 4, 28, 8);

    // Battery 1 Temperature
    const battery1TempSensorId = (typeof config.sensor_battery1_temp === 'string') ? config.sensor_battery1_temp.trim() : '';
    const hasBattery1TempSensor = Boolean(battery1TempSensorId);
    const battery1TempValue = hasBattery1TempSensor ? this.card.formatPopupValue(null, battery1TempSensorId) : '';
    const battery1TempColor = resolveColor(config.battery1_temp_color, C_WHITE);
    const battery1TempFontSize = clampValue(config.battery1_temp_font_size, 4, 28, 8);

    // Battery State (shared per-state colors and font for all 4 batteries)
    const batteryStateFullyChargedColor = resolveColor(config.battery_state_fully_charged_color, '#00ff00');
    const batteryStateChargingColor = resolveColor(config.battery_state_charging_color, '#8000ff');
    const batteryStateDischargingColor = resolveColor(config.battery_state_discharging_color, '#ff8000');
    const batteryStateReserveColor = resolveColor(config.battery_state_reserve_color, '#FF3333');
    const batteryStateFullyDischargedColor = resolveColor(config.battery_state_fully_discharged_color, '#FF3333');
    const batteryStateFontSize = clampValue(config.battery_state_font_size, 4, 28, 8);

    // Grid State
    const gridStateSensorId = (typeof config.sensor_grid_state === 'string') ? config.sensor_grid_state.trim() : '';
    const hasGridStateSensor = Boolean(gridStateSensorId);
    const gridStateValue = hasGridStateSensor ? this.card.formatPopupValue(null, gridStateSensorId) : '';
    const gridStateImportingColor = resolveColor(config.grid_state_importing_color, '#FF3333');
    const gridStateExportingColor = resolveColor(config.grid_state_exporting_color, '#00ff00');
    const gridStateFloatingColor = resolveColor(config.grid_state_floating_color, C_WHITE);
    const gridStateFontSize = clampValue(config.grid_state_font_size, 4, 28, 8);
    const _gridStateRaw = hasGridStateSensor && this.card._hass && this.card._hass.states && this.card._hass.states[gridStateSensorId]
      ? String(this.card._hass.states[gridStateSensorId].state).toLowerCase()
      : '';
    const gridStateColor = _gridStateRaw.includes('export') ? gridStateExportingColor
      : _gridStateRaw.includes('float') ? gridStateFloatingColor
      : gridStateImportingColor;

    // Solar State
    const solarStateSensorId = (typeof config.sensor_solar_state === 'string') ? config.sensor_solar_state.trim() : '';
    const hasSolarStateSensor = Boolean(solarStateSensorId);
    const solarStateValue = hasSolarStateSensor ? this.card.formatPopupValue(null, solarStateSensorId) : '';
    const solarStateProducingColor = resolveColor(config.solar_state_producing_color, '#00ff00');
    const solarStateNotProducingColor = resolveColor(config.solar_state_not_producing_color, '#FF3333');
    const solarStateFontSize = clampValue(config.solar_state_font_size, 4, 28, 8);
    const _solarStateRaw = hasSolarStateSensor && this.card._hass && this.card._hass.states && this.card._hass.states[solarStateSensorId]
      ? String(this.card._hass.states[solarStateSensorId].state).toLowerCase()
      : '';
    const solarStateColor = _solarStateRaw.includes('not') ? solarStateNotProducingColor : solarStateProducingColor;

    // Solar Forecast Today
    const solarForecastTodaySensorId = (typeof config.sensor_solar_forecast_today === 'string') ? config.sensor_solar_forecast_today.trim() : '';
    const hasSolarForecastToday = Boolean(solarForecastTodaySensorId);
    const solarForecastTodayValue = hasSolarForecastToday ? this.card.formatPopupValue(null, solarForecastTodaySensorId) : '';

    // Solar Forecast Tomorrow
    const solarForecastTomorrowSensorId = (typeof config.sensor_solar_forecast_tomorrow === 'string') ? config.sensor_solar_forecast_tomorrow.trim() : '';
    const hasSolarForecastTomorrow = Boolean(solarForecastTomorrowSensorId);
    const solarForecastTomorrowValue = hasSolarForecastTomorrow ? this.card.formatPopupValue(null, solarForecastTomorrowSensorId) : '';

    // Weather Icon
    const weatherIconSensorId = (typeof config.sensor_weather_icon === 'string') ? config.sensor_weather_icon.trim() : '';
    const hasWeatherIcon = Boolean(weatherIconSensorId);
    const weatherIconValue = hasWeatherIcon ? this.card.formatPopupValue(null, weatherIconSensorId) : '';
    const weatherIconColor = resolveColor(config.weather_icon_color, '#00FFFF');
    const weatherIconFontSize = clampValue(config.weather_icon_font_size, 4, 72, 8);

    // Weather Forecast
    const weatherForecastSensorId = (typeof config.sensor_weather_forecast === 'string') ? config.sensor_weather_forecast.trim() : '';
    const hasWeatherForecast = Boolean(weatherForecastSensorId);
    const weatherForecastValue = hasWeatherForecast ? this.card.formatPopupValue(null, weatherForecastSensorId) : '';
    const weatherForecastColor = resolveColor(config.weather_forecast_color, '#00FFFF');
    const weatherForecastFontSize = clampValue(config.weather_forecast_font_size, 4, 72, 8);

    // Stats Section
    const statsValueColor = resolveColor(config.stats_value_color, '#00FFFF');
    const statsValueFontSize = clampValue(config.stats_value_font_size, 4, 72, 14);
    const statsLabelColor = resolveColor(config.stats_label_color, '#FFFFFF');
    const statsLabelFontSize = clampValue(config.stats_label_font_size, 4, 72, 12);
    const _statsDefs = [
      { role: 'house-consumption-today', cfgKey: 'sensor_house_consumption_today', defaultLabel: 'House Consumption Today', labelCfgKey: 'stat_label_house_consumption_today' },
      { role: 'pv-production-today', cfgKey: 'sensor_pv_production_today', defaultLabel: 'PV Production Today', labelCfgKey: 'stat_label_pv_production_today' },
      { role: 'house-consumption-yesterday', cfgKey: 'sensor_house_consumption_yesterday', defaultLabel: 'House Consumption Yesterday', labelCfgKey: 'stat_label_house_consumption_yesterday' },
      { role: 'pv-production-yesterday', cfgKey: 'sensor_pv_production_yesterday', defaultLabel: 'PV Production Yesterday', labelCfgKey: 'stat_label_pv_production_yesterday' },
      { role: 'today-grid-export', cfgKey: 'sensor_today_grid_export', defaultLabel: 'Today Grid Export', labelCfgKey: 'stat_label_today_grid_export' },
      { role: 'today-grid-import', cfgKey: 'sensor_today_grid_import', defaultLabel: 'Today Grid Import', labelCfgKey: 'stat_label_today_grid_import' },
      { role: 'weekly-grid-export', cfgKey: 'sensor_weekly_grid_export', defaultLabel: 'Weekly Grid Export', labelCfgKey: 'stat_label_weekly_grid_export' },
      { role: 'weekly-grid-import', cfgKey: 'sensor_weekly_grid_import', defaultLabel: 'Weekly Grid Import', labelCfgKey: 'stat_label_weekly_grid_import' },
      { role: 'monthly-grid-export', cfgKey: 'sensor_monthly_grid_export', defaultLabel: 'Monthly Grid Export', labelCfgKey: 'stat_label_monthly_grid_export' },
      { role: 'monthly-grid-import', cfgKey: 'sensor_monthly_grid_import', defaultLabel: 'Monthly Grid Import', labelCfgKey: 'stat_label_monthly_grid_import' },
      { role: 'yearly-grid-export', cfgKey: 'sensor_yearly_grid_export', defaultLabel: 'Yearly Grid Export', labelCfgKey: 'stat_label_yearly_grid_export' },
      { role: 'yearly-grid-import', cfgKey: 'sensor_yearly_grid_import', defaultLabel: 'Yearly Grid Import', labelCfgKey: 'stat_label_yearly_grid_import' },
    ];
    const statsData = _statsDefs.map((def) => {
      const sensorId = (typeof config[def.cfgKey] === 'string') ? config[def.cfgKey].trim() : '';
      const hasSensor = Boolean(sensorId);
      const value = hasSensor ? this.card.formatPopupValue(null, sensorId) : '';
      const label = (typeof config[def.labelCfgKey] === 'string' && config[def.labelCfgKey].trim()) ? config[def.labelCfgKey].trim() : def.defaultLabel;
      return {
        role: def.role,
        value: { text: value, fontSize: statsValueFontSize, fill: statsValueColor, visible: hasSensor && Boolean(value) },
        label: { text: label, fontSize: statsLabelFontSize, fill: statsLabelColor, visible: hasSensor },
      };
    });

    // Footer cards (overview.svg): 6 cards x 2 slots, each with an optional sensor
    // and optional custom label. No dedicated colors/sizes - the value (*-slotN)
    // is styled via card_value_color/card_value_font_size and the label (*-slotN-label)
    // via card_label_color/card_label_font_size, both applied by applyBaselineConfigStyles.
    const _footerDefs = [];
    for (let c = 1; c <= 6; c++) {
      for (let s = 1; s <= 2; s++) {
        _footerDefs.push({
          role: `footer-card${c}-slot${s}`,
          entityCfgKey: `footer_card${c}_slot${s}_entity`,
          labelCfgKey: `footer_card${c}_slot${s}_label`,
        });
      }
    }
    const footerData = _footerDefs.map((def) => {
      const sensorId = (typeof config[def.entityCfgKey] === 'string') ? config[def.entityCfgKey].trim() : '';
      const hasSensor = Boolean(sensorId);
      const value = hasSensor ? this.card.formatPopupValue(null, sensorId) : '';
      const customLabel = (typeof config[def.labelCfgKey] === 'string' && config[def.labelCfgKey].trim()) ? config[def.labelCfgKey].trim() : '';
      const label = customLabel || (hasSensor ? this.card.getEntityName(sensorId) : '');
      return {
        role: def.role,
        value: { text: value, visible: hasSensor && Boolean(value) },
        label: { text: label, visible: hasSensor },
      };
    });

    const computeEffectiveGridColor = (directionSign, magnitude, importColor, exportColor, warningThreshold, criticalThreshold, warningColor, criticalColor) => {
      const baseColor = (directionSign >= 0 ? importColor : exportColor);
      // Export is always the base export color; thresholds apply only for import.
      if (directionSign < 0) {
        return exportColor;
      }
      if (criticalColor && criticalThreshold !== null && magnitude >= criticalThreshold) {
        return criticalColor;
      }
      if (warningColor && warningThreshold !== null && magnitude >= warningThreshold) {
        return warningColor;
      }
      return baseColor;
    };

    const effectiveGridColor = computeEffectiveGridColor(
      gridDirectionSign,
      gridMagnitude,
      gridImportColor,
      gridExportColor,
      gridWarningThreshold,
      gridCriticalThreshold,
      gridWarningColor,
      gridCriticalColor
    );
    const effectiveGrid1Color = computeEffectiveGridColor(
      grid1Direction,
      grid1Magnitude,
      gridImportColor,
      gridExportColor,
      gridWarningThreshold,
      gridCriticalThreshold,
      gridWarningColor,
      gridCriticalColor
    );
    const effectiveGrid2Color = computeEffectiveGridColor(
      grid2Direction,
      grid2Magnitude,
      grid2ImportColor,
      grid2ExportColor,
      grid2WarningThreshold,
      grid2CriticalThreshold,
      grid2WarningColor,
      grid2CriticalColor
    );
    const gridAnimationDirection = -gridDirectionSign;
    const gridImportExportDirection = -gridDirectionSign;
    const gridHouseDirection = gridDirectionSign;
    const inverter1ImportExportDirection = grid1Direction;
    const inverter2ImportExportDirection = -grid2Direction;
    const show_double_flow = (pv_primary_w > 10 && pv_secondary_w > 10);
    const pvLinesRaw = [];
    // If Array 2 is producing, show totals only: PV TOTAL, Array 1 total, Array 2 total
    if (pv_secondary_w > 10) {
      pvLinesRaw.push({ key: 'pv-total', text: `${label_pv_tot}: ${this.card.formatPower(total_pv_w, use_kw)}`, fill: pvTotColor });
      pvLinesRaw.push({ key: 'pv-primary-total', text: `Array 1: ${this.card.formatPower(pv_primary_w, use_kw)}`, fill: pvPrimaryColor });
      pvLinesRaw.push({ key: 'pv-secondary-total', text: `Array 2: ${this.card.formatPower(pv_secondary_w, use_kw)}`, fill: pvSecondaryColor });
    } else if (pvStringValues.length > 1) {
      pvLinesRaw.push({ key: 'pv-total', text: `${label_pv_tot}: ${this.card.formatPower(total_pv_w, use_kw)}`, fill: pvTotColor });
    } else {
      pvLinesRaw.push({ key: 'pv-total', text: this.card.formatPower(total_pv_w, use_kw), fill: pvTotColor });
    }

    const lineCount = Math.min(pvLinesRaw.length, MAX_PV_LINES);
    const baseY = TEXT_POSITIONS.solar.y - ((lineCount > 0 ? lineCount - 1 : 0) * PV_LINE_SPACING) / 2;
    const pvLines = Array.from({ length: MAX_PV_LINES }, (_, index) => {
      if (index < lineCount) {
        const line = pvLinesRaw[index];
        return { ...line, y: baseY + index * PV_LINE_SPACING, visible: true };
      }
      return {
        key: `pv-placeholder-${index}`,
        text: '',
        fill: C_CYAN,
        y: baseY + index * PV_LINE_SPACING,
        visible: false
      };
    });

    const showDailyGrid = Boolean(config.show_daily_grid);
    const hasGridDailyImport = Boolean(
      (config.sensor_grid_import_daily && Number.isFinite(grid1ImportDaily))
      || (config.sensor_grid2_import_daily && Number.isFinite(grid2ImportDaily))
    );
    const hasGridDailyExport = Boolean(
      (config.sensor_grid_export_daily && Number.isFinite(grid1ExportDaily))
      || (config.sensor_grid2_export_daily && Number.isFinite(grid2ExportDaily))
    );
    const gridDailyImportVisible = showDailyGrid && hasGridDailyImport;
    const gridDailyExportVisible = showDailyGrid && hasGridDailyExport;

    // Build optional grid daily lines (import/export cumulative values)
    // Back-compat for SVGs that define grid-line-0 / grid-line-1.
    let gridLines = [];
    if (showDailyGrid) {
      const gridLinesRaw = [];
      if (hasGridDailyImport && Number.isFinite(gridImportDaily)) {
        gridLinesRaw.push({ key: 'grid-import-daily', text: this.card.formatEnergy(gridImportDaily, use_kw), fill: gridImportColor });
      }
      if (hasGridDailyExport && Number.isFinite(gridExportDaily)) {
        gridLinesRaw.push({ key: 'grid-export-daily', text: this.card.formatEnergy(gridExportDaily, use_kw), fill: gridExportColor });
      }
      const gridLineCount = Math.min(gridLinesRaw.length, 2);
      if (gridLineCount > 0) {
        const gridBaseY = TEXT_POSITIONS.grid.y + 18;
        gridLines = gridLinesRaw.slice(0, gridLineCount).map((line, index) => ({
          ...line,
          fontSize: grid_daily_font_size,
          y: gridBaseY + index * (grid_daily_font_size + 4),
          visible: true
        }));
      }
    }

    // Build load display lines when Inverter 2 home load is configured.
    // This is purely a UI/layout toggle and should not depend on PV production being > 0.
    const houseFill = resolveColor(config.house_total_color, C_CYAN);
    const inv1Fill = resolveColor(config.inv1_color, pvPrimaryColor);
    const inv2Fill = resolveColor(config.inv2_color, pvSecondaryColor);
    const hasSecondaryLoadSensor = Boolean(typeof config.sensor_home_load_secondary === 'string' && config.sensor_home_load_secondary.trim());
    const loadLines = hasSecondaryLoadSensor ? [
      { key: 'house-total', text: `HOUSE TOT: ${this.card.formatPower(houseTotalLoad, use_kw)}`, fill: houseFill, visible: true },
      { key: 'inv1-total', text: `${this.card.formatPower(loadValue, use_kw)}`, fill: inv1Fill, fontSize: inv1_power_font_size, visible: true },
      { key: 'inv2-total', text: `${this.card.formatPower(loadSecondary, use_kw)}`, fill: inv2Fill, fontSize: inv2_power_font_size, visible: true }
    ] : null;
      //here
      
    const loadY = hasSecondaryLoadSensor ? (TEXT_POSITIONS.home.y - 28) : TEXT_POSITIONS.home.y;

    const pvTotalId = resolveEntityId(config.sensor_pv_total);
    const pvTotal2Id = resolveEntityId(config.sensor_pv_total_secondary);
    const hasPvConfigured = Boolean(pvTotalId || pvTotal2Id)
      || (Array.isArray(pvStringIds) && pvStringIds.length > 0)
      || (Array.isArray(pvArray2Ids) && pvArray2Ids.length > 0);
    const hasValidArray1Production = Boolean(pvTotalId && isEntityAvailable(pvTotalId))
      || (Array.isArray(pvStringIds) && pvStringIds.some((sensorId) => {
        const id = resolveEntityId(sensorId);
        return Boolean(id && isEntityAvailable(id));
      }));
    const hasValidArray2Production = Boolean(pvTotal2Id && isEntityAvailable(pvTotal2Id))
      || (Array.isArray(pvArray2Ids) && pvArray2Ids.some((sensorId) => {
        const id = resolveEntityId(sensorId);
        return Boolean(id && isEntityAvailable(id));
      }));
    const hasPrimarySolar = Boolean(hasValidArray1Production || hasValidArray2Production);
    const inverter2ConfiguredForPv = Boolean(config.sensor_grid2_power)
      || (Boolean(config.sensor_grid2_import) && Boolean(config.sensor_grid2_export));
    const useHouseGridPath = gridPowerOnly || !hasPrimarySolar;
    const pvUiEnabled = hasPrimarySolar;
    const gridActiveForGrid = !useHouseGridPath && gridActive;
    const gridActiveForHouse = useHouseGridPath && (gridPowerOnly ? true : gridActive);
    const inverterGridFlowsEnabled = !useHouseGridPath;

    const car1Direction = car1PowerValue > 0 ? 1 : (car1PowerValue < 0 ? -1 : 1);
    const car2Direction = car2PowerValue > 0 ? 1 : (car2PowerValue < 0 ? -1 : 1);
    const car1Charging = car1State.charging;
    const car2Charging = car2State.charging;

    this.card._animationManager._logHeadlightDebug('power snapshot', {
      car1PowerW: car1PowerValue,
      car2PowerW: car2PowerValue,
      car1Charging,
      car2Charging
    });

    const inverter1Configured = !gridPowerOnly && (Boolean(config.sensor_grid_power)
      || (Boolean(config.sensor_grid_import) && Boolean(config.sensor_grid_export))
      || Boolean(config.sensor_windmill_total));
    const inverter2Configured = !gridPowerOnly && (Boolean(config.sensor_grid2_power)
      || (Boolean(config.sensor_grid2_import) && Boolean(config.sensor_grid2_export)));
    const inverter2Active = inverter2Configured;

    const batteryFlowStates = batteryStates.map((bat) => {
      const powerValue = Number.isFinite(bat.power) ? bat.power : 0;
      const magnitude = Math.abs(powerValue);
      const direction = powerValue >= 0 ? 1 : -1;
      const color = direction >= 0 ? batteryChargeColor : batteryDischargeColor;
      const inverter1BatteryAllowed = !(inverter2Active && bat.index >= 3);
      return {
        key: `inverter1-battery${bat.index}`,
        stroke: color,
        glowColor: color,
        active: Boolean(inverter1BatteryAllowed && bat.visible && magnitude > 10),
        direction
      };
    });
    const inverter2BatteryFlowStates = batteryStates
      .filter((bat) => bat.index >= 3)
      .map((bat) => {
        const powerValue = Number.isFinite(bat.power) ? bat.power : 0;
        const magnitude = Math.abs(powerValue);
        const direction = powerValue >= 0 ? 1 : -1;
        const color = direction >= 0 ? batteryChargeColor : batteryDischargeColor;
        return {
          key: `inverter2-battery${bat.index}`,
          stroke: color,
          glowColor: color,
          active: Boolean(inverter2Active && bat.visible && magnitude > 10),
          direction
        };
      });

    const flows = {
      // Keep Array 1 visible even when Array 2 is generating so both flows animate together.
      pv1: { stroke: pvPrimaryColor, glowColor: pvPrimaryColor, active: pv_primary_w > 0 },
      pv2: { stroke: pvSecondaryColor, glowColor: pvSecondaryColor, active: inverter2ConfiguredForPv && pv_secondary_w > 0 },
      'array-inverter1': { stroke: pvPrimaryColor, glowColor: pvPrimaryColor, active: inverter1Configured && !inverter2Active && total_pv_w > 0 },
      'array-inverter2': { stroke: pvSecondaryColor, glowColor: pvSecondaryColor, active: inverter2Configured && total_pv_w > 0 },
      'windmill-inverter1': { stroke: windmillFlowColor, glowColor: windmillFlowColor, active: windmillFlowActive, direction: 1 },
      'windmill-inverter2': { stroke: windmillFlowColor, glowColor: windmillFlowColor, active: inverter2Active && windmillFlowActive, direction: 1, forceHidden: !inverter2Active },
      load: { stroke: effectiveLoadFlowColor, glowColor: effectiveLoadFlowColor, active: loadMagnitude > 10, direction: 1 },
      'house-load-inverter1': { stroke: effectiveLoadFlowColor, glowColor: effectiveLoadFlowColor, active: !gridPowerOnly && loadMagnitude > 10, direction: 1 },
      'house-load-inverter2': { stroke: effectiveLoadFlowColor, glowColor: effectiveLoadFlowColor, active: !gridPowerOnly && inverter2Active && loadMagnitude > 10, direction: 1 },
      grid: { stroke: effectiveGridColor, glowColor: effectiveGridColor, active: gridActiveForGrid, direction: gridAnimationDirection },
      // House-only grid flow when no PV entities exist. Uses load thresholds/colors.
      grid_house: { stroke: effectiveLoadFlowColor, glowColor: effectiveLoadFlowColor, active: gridActiveForHouse && (gridPowerOnly ? true : loadMagnitude > 10), direction: gridHouseDirection },
      'grid-house': { stroke: effectiveLoadFlowColor, glowColor: effectiveLoadFlowColor, active: gridActiveForHouse && (gridPowerOnly ? true : loadMagnitude > 10), direction: gridHouseDirection },

      // New optional alias flow key used by some SVGs.
      // Mirrors grid-house when running in grid-only mode, otherwise mirrors inverter1-grid.
      'grid-feed': inverterGridFlowsEnabled
        ? { stroke: effectiveGrid1Color, glowColor: effectiveGrid1Color, active: inverterGridFlowsEnabled && grid1Active, direction: gridHouseDirection }
        : { stroke: effectiveLoadFlowColor, glowColor: effectiveLoadFlowColor, active: gridActiveForHouse && (gridPowerOnly ? true : loadMagnitude > 10), direction: gridHouseDirection },

      // New per-inverter bidirectional grid flows.
      'inverter1-import-export': { stroke: effectiveGrid1Color, glowColor: effectiveGrid1Color, active: inverterGridFlowsEnabled && grid1Active, direction: inverter1ImportExportDirection },
      'inverter2-import-export': { stroke: effectiveGrid2Color, glowColor: effectiveGrid2Color, active: inverterGridFlowsEnabled && grid2Active, direction: inverter2ImportExportDirection },
      // Alias keys used by some SVGs.
      'inverter1-grid': { stroke: effectiveGrid1Color, glowColor: effectiveGrid1Color, active: inverterGridFlowsEnabled && grid1Active, direction: inverter1ImportExportDirection },
      'inverter2-grid': { stroke: effectiveGrid2Color, glowColor: effectiveGrid2Color, active: inverterGridFlowsEnabled && grid2Active, direction: inverter2ImportExportDirection },
      // Back-compat for older SVGs.
      'grid-import-export': { stroke: effectiveGrid1Color, glowColor: effectiveGrid1Color, active: inverterGridFlowsEnabled && grid1Active, direction: inverter1ImportExportDirection },
      car1: { stroke: carFlowColor, glowColor: carFlowColor, active: showCar1 && Math.abs(car1PowerValue) > 10, direction: car1Direction },
      car2: { stroke: carFlowColor, glowColor: carFlowColor, active: showCar2 && Math.abs(car2PowerValue) > 10, direction: car2Direction },
      heatPump: { stroke: heatPumpFlowColor, glowColor: heatPumpFlowColor, active: hasHeatPumpSensor && heat_pump_w > 10, direction: 1 },
      pool: { stroke: poolFlowColor, glowColor: poolFlowColor, active: hasPoolSensor && Math.abs(pool_w) > 10, direction: 1 },
      ...Object.fromEntries(batteryFlowStates.map((state) => [state.key, {
        stroke: state.stroke,
        glowColor: state.glowColor,
        active: state.active,
        direction: state.direction
      }])),
      ...Object.fromEntries(inverter2BatteryFlowStates.map((state) => [state.key, {
        stroke: state.stroke,
        glowColor: state.glowColor,
        active: state.active,
        direction: state.direction
      }]))
    };

    flows.pv1.direction = 1;
    flows.pv2.direction = 1;
    flows['windmill-inverter1'].direction = 1;
    flows['windmill-inverter2'].direction = 1;
    flows.heatPump.direction = 1;
    flows.pool.direction = 1;

    const flowDurations = Object.fromEntries(
      Object.entries(flows).map(([key, state]) => [key, state.active ? 1 : 0])
    );

    const batteryText = batteryStates.map((bat) => {
      const socText = (bat.visible && Number.isFinite(bat.soc)) ? `${Math.round(bat.soc)}%` : '';
      const powerText = (bat.visible && Number.isFinite(bat.power)) ? this.card.formatPower(bat.power, use_kw) : '';
      const powerColor = (Number.isFinite(bat.power) && bat.power < 0) ? batteryDischargeColor : batteryChargeColor;
      let timeUntilText = '';
      if (bat.visible) {
        const timeUntilSensorId = (typeof config[`sensor_bat${bat.index}_time_until`] === 'string')
          ? config[`sensor_bat${bat.index}_time_until`].trim()
          : '';
        if (timeUntilSensorId) {
          const raw = this.card.formatPopupValue(null, timeUntilSensorId);
          timeUntilText = raw || '';
        } else {
          const batTime = this.card._batteryManager.calculateInverterBatteryTime([bat.index], batteryStates, config, this.card._hass);
          if (batTime.timeUntil) {
            timeUntilText = batTime.timeUntil;
          }
        }
      }
      let stateText = '';
      let stateColor = batteryStateChargingColor;
      if (bat.visible) {
        const stateSensorId = (typeof config[`sensor_bat${bat.index}_state`] === 'string')
          ? config[`sensor_bat${bat.index}_state`].trim()
          : '';
        if (stateSensorId) {
          const raw = this.card.formatPopupValue(null, stateSensorId);
          stateText = (raw !== null && raw !== undefined) ? String(raw) : '';
          const _batStateRaw = (this.card._hass && this.card._hass.states && this.card._hass.states[stateSensorId])
            ? String(this.card._hass.states[stateSensorId].state).toLowerCase()
            : stateText.toLowerCase();
          stateColor = (_batStateRaw.includes('fully') && _batStateRaw.includes('charg'))
            ? batteryStateFullyChargedColor
            : (_batStateRaw.includes('fully') && _batStateRaw.includes('disch'))
            ? batteryStateFullyDischargedColor
            : _batStateRaw.includes('reserve')
            ? batteryStateReserveColor
            : _batStateRaw.includes('disch')
            ? batteryStateDischargingColor
            : batteryStateChargingColor;
        }
      }
      return {
        index: bat.index,
        visible: bat.visible,
        socText,
        powerText,
        socColor: batterySocColor,
        powerColor,
        socFontSize: battery_soc_font_size,
        powerFontSize: battery_power_font_size,
        timeUntilText,
        timeUntilColor: batteryTimeUntilColor,
        timeUntilFontSize: battery_time_until_font_size,
        stateText,
        stateColor,
        stateFontSize: batteryStateFontSize
      };
    });

    // Build car views (using CarManager)
    const car1View = this.card._carManager.buildCarView(1, car1State, config, carLayout.car1, car1Transforms, use_kw, this.card.formatPower.bind(this.card), resolveColor);
    const car2View = this.card._carManager.buildCarView(2, car2State, config, carLayout.car2, car2Transforms, use_kw, this.card.formatPower.bind(this.card), resolveColor);
    const headlightFlashState = {
      enabled: Boolean(config.car_headlight_flash),
      car1: { visible: showCar1, charging: car1Charging },
      car2: { visible: showCar2, charging: car2Charging }
    };
    const showGridFlowLabel = config.show_grid_flow_label !== false;
    const gridValueText = this.card.formatPower(Math.abs(gridNet), use_kw);
    const gridCurrentValueText = gridValueText;
    const gridText = (() => {
      if (!showGridFlowLabel) {
        return gridValueText;
      }
      if (gridNet > 0) {
        return `${label_importing} ${gridValueText}`;
      }
      if (gridNet < 0) {
        return `${label_exporting} ${gridValueText}`;
      }
      return gridValueText;
    })();

    // Battery time display styling
    const inv1DatetimeColor = resolveColor(config.inv1_datetime_color, '#FFFFFF');
    const inv1DatetimeFontSize = clampValue(config.inv1_datetime_font_size, 4, 32, 8);
    const inv1TimeuntilColor = resolveColor(config.inv1_timeuntil_color, '#FFFFFF');
    const inv1TimeuntilFontSize = clampValue(config.inv1_timeuntil_font_size, 4, 32, 8);
    const inv2DatetimeColor = resolveColor(config.inv2_datetime_color, '#FFFFFF');
    const inv2DatetimeFontSize = clampValue(config.inv2_datetime_font_size, 4, 32, 8);
    const inv2TimeuntilColor = resolveColor(config.inv2_timeuntil_color, '#FFFFFF');
    const inv2TimeuntilFontSize = clampValue(config.inv2_timeuntil_font_size, 4, 32, 8);

    // ============================================================
    // SECTION 3: VIEW STATE CONSTRUCTION
    // Build the viewState object for rendering
    // ============================================================

    const sunMoonViewState = this.card._sunMoonManager._buildSunMoonViewState(config);

    const viewState = {
      language: lang,
      backgroundImage: bg_img,
      fontFamily: font_family,
      odometerFontFamily: odometer_font_family,
      animationStyle: animation_style,
      title: { text: title_text, fontSize: header_font_size, fill: title_text_color },
      titleBg: { fill: title_bg_color },
      daily: { label: label_daily, value: `${total_daily_kwh} kWh`, labelSize: daily_label_font_size, valueSize: daily_value_font_size, visible: pvUiEnabled },
      pvDaily: {
        text: `${total_daily_kwh} kWh`,
        fontSize: daily_value_font_size,
        fill: title_text_color,
        bgFill: title_bg_color,
        visible: pvUiEnabled && Boolean(config.sensor_daily || config.sensor_daily_array2)
      },
      pv: { fontSize: pv_font_size, lines: pvLines },
      pv1Total: { text: this.card.formatPower(pv_primary_w, use_kw), fontSize: pv_font_size, fill: pvTotColor, visible: pvUiEnabled },
      pv2Total: { text: this.card.formatPower(pv_secondary_w, use_kw), fontSize: pv_font_size, fill: pvTotColor, visible: pv_secondary_w > 10 },
      pv2Lines: pvArray2Ids.map((sensorId, i) => ({ text: this.card.formatPower(pvArray2Values[i], use_kw), fontSize: pv_font_size, fill: pvTotColor, visible: pvArray2Values[i] > 0 })),
      pvTotal: { text: this.card.formatPower(total_pv_w, use_kw), fontSize: pv_font_size, fill: pvTotColor, visible: hasPvConfigured },
      windmillPower: { text: windmillTotalAvailable ? this.card.formatPower(windmillTotalW, use_kw) : '', fontSize: windmill_power_font_size, fill: windmillTextColor, visible: Boolean(windmillTotalId) },
      inverter1Temp: { text: inverter1TempValue, fontSize: inverter1TempFontSize, fill: inverter1TempColor, visible: hasInverter1TempSensor },
      battery1Temp: { text: battery1TempValue, fontSize: battery1TempFontSize, fill: battery1TempColor, visible: hasBattery1TempSensor },
      gridState: { text: gridStateValue, fontSize: gridStateFontSize, fill: gridStateColor, visible: hasGridStateSensor },
      solarState: { text: solarStateValue, fontSize: solarStateFontSize, fill: solarStateColor, visible: hasSolarStateSensor },
      solarForecastToday: { text: solarForecastTodayValue, visible: hasSolarForecastToday && Boolean(solarForecastTodayValue) },
      solarForecastTomorrow: { text: solarForecastTomorrowValue, visible: hasSolarForecastTomorrow && Boolean(solarForecastTomorrowValue) },
      weatherIcon: { text: weatherIconValue, fontSize: weatherIconFontSize, fill: weatherIconColor, visible: hasWeatherIcon && Boolean(weatherIconValue) },
      weatherForecast: { text: weatherForecastValue, fontSize: weatherForecastFontSize, fill: weatherForecastColor, visible: hasWeatherForecast && Boolean(weatherForecastValue) },
      statsData: statsData,
      footerData: footerData,
      load: (loadLines && loadLines.length) ? { lines: loadLines, y: loadY, fontSize: load_font_size, fill: effectiveLoadTextColor } : { text: this.card.formatPower(loadValue, use_kw), fontSize: load_font_size, fill: effectiveLoadTextColor },
      houseLoad: { text: this.card.formatPower(loadValue, use_kw), fontSize: load_font_size, fill: effectiveLoadFlowColor, visible: true, odometer: grid_current_odometer, odometerDuration: grid_current_odometer_duration },
      grid: { text: gridText, fontSize: grid_font_size, fill: effectiveGridColor, lines: gridLines },
      gridCurrentPower: { text: gridCurrentValueText, fontSize: grid_font_size, fill: effectiveGridColor, odometer: grid_current_odometer, odometerDuration: grid_current_odometer_duration },
      gridDailyImport: {
        text: gridDailyImportVisible ? this.card.formatEnergy(gridImportDaily, use_kw) : '',
        fontSize: grid_daily_font_size,
        fill: gridImportColor,
        visible: gridDailyImportVisible,
        odometer: grid_current_odometer,
        odometerDuration: grid_current_odometer_duration
      },
      gridDailyExport: {
        text: gridDailyExportVisible ? this.card.formatEnergy(gridExportDaily, use_kw) : '',
        fontSize: grid_daily_font_size,
        fill: gridExportColor,
        visible: gridDailyExportVisible,
        odometer: grid_current_odometer,
        odometerDuration: grid_current_odometer_duration
      },
      heatPump: {
        text: hasHeatPumpSensor ? this.card.formatPower(heat_pump_w, use_kw) : '',
        fontSize: heat_pump_font_size,
        fill: heatPumpTextColor,
        visible: hasHeatPumpSensor
      },
      hotWater: {
        text: hasHotWaterSensor ? this.card.formatPower(hot_water_w, use_kw) : '',
        fontSize: hot_water_font_size,
        fill: hotWaterTextColor,
        visible: hasHotWaterSensor
      },
      pool: {
        text: hasPoolSensor ? this.card.formatPower(pool_w, use_kw) : '',
        fontSize: pool_font_size,
        fill: poolTextColor,
        visible: hasPoolSensor
      },
      washingMachine: {
        text: hasWashingMachineSensor ? this.card.formatPower(washing_machine_w, use_kw) : '',
        fontSize: washing_machine_font_size,
        fill: washingMachineTextColor,
        visible: hasWashingMachineSensor
      },
      dishwasher: {
        text: hasDishwasherSensor ? this.card.formatPower(dishwasher_w, use_kw) : '',
        fontSize: dishwasher_font_size,
        fill: dishwasherTextColor,
        visible: hasDishwasherSensor
      },
      dryer: {
        text: hasDryerSensor ? this.card.formatPower(dryer_w, use_kw) : '',
        fontSize: dryer_font_size,
        fill: dryerTextColor,
        visible: hasDryerSensor
      },
      refrigerator: {
        text: hasRefrigeratorSensor ? this.card.formatPower(refrigerator_w, use_kw) : '',
        fontSize: refrigerator_font_size,
        fill: refrigeratorTextColor,
        visible: hasRefrigeratorSensor
      },
      freezer: {
        text: hasFreezerSensor ? this.card.formatPower(freezer_w, use_kw) : '',
        fontSize: freezer_font_size,
        fill: freezerTextColor,
        visible: hasFreezerSensor
      },
      car1: car1View,
      car2: car2View,
      popup: {
        lines: popupPvValues.map((valueText, i) => (valueText ? `${popupPvNames[i]}: ${valueText}` : '')),
        hasContent: popupPvValues.some((valueText) => Boolean(valueText))
      },
      batteries: batteryStates,
      inv1DateTime: { text: inv1BatteryTime.datetime, fontSize: inv1DatetimeFontSize, fill: inv1DatetimeColor },
      inv1TimeUntil: { text: inv1BatteryTime.timeUntil, fontSize: inv1TimeuntilFontSize, fill: inv1TimeuntilColor },
      inv2DateTime: { text: inv2BatteryTime.datetime, fontSize: inv2DatetimeFontSize, fill: inv2DatetimeColor },
      inv2TimeUntil: { text: inv2BatteryTime.timeUntil, fontSize: inv2TimeuntilFontSize, fill: inv2TimeuntilColor },
      pvUiEnabled,
      gridPowerOnly,
      showDailyGrid,
      flows,
      flowDurations,
      batteryText,
      windmillSpin,
      headlightFlash: headlightFlashState,
      sunMoon: sunMoonViewState,
      configStyles: { cardBg: card_background_color, labelColor: card_label_color, labelFontSize: card_label_font_size, labelFontFamily: font_family, labelCss: card_label_css, valueColor: card_value_color, valueFontSize: card_value_font_size, valueCss: card_value_css }
    };

    // ============================================================
    // SECTION 4: RENDERING
    // Apply viewState to DOM
    // ============================================================

    this.card._viewState = viewState; // Store for popup access
    this.card._applyViewState(viewState);
  }

  updateView(viewState) {
    if (!this.card._domRefs) {
      this._cacheDomReferences();
    }
    const refs = this.card._domRefs;
    if (!refs) {
      return;
    }

    const prev = this.card._prevViewState || {};
    const animationStyle = viewState.animationStyle || FLOW_STYLE_DEFAULT;
    const useArrowsGlobally = animationStyle === 'arrows';
    const styleChanged = prev.animationStyle !== viewState.animationStyle;

    if (refs.backgroundSvg && prev.backgroundImage !== viewState.backgroundImage) {
      // Fetch and insert SVG content for dynamic layer control
      const resolveBackgroundUrl = (rawUrl) => {
        const value = (rawUrl === null || rawUrl === undefined) ? '' : String(rawUrl).trim();
        if (!value) return value;
        if (/^https?:\/\//i.test(value)) return value;
        const path = value.startsWith('/') ? value : `/${value}`;
        try {
          if (this.card._hass && typeof this.card._hass.hassUrl === 'function') {
            return this.card._hass.hassUrl(path);
          }
        } catch (e) {
          // ignore
        }
        return path;
      };

      const backgroundUrl = resolveBackgroundUrl(viewState.backgroundImage);
      
      // Validate URL before fetching
      const urlValidation = SecurityHelpers.validateUrl(backgroundUrl);
      if (!urlValidation.valid) {
        console.error('Invalid background URL:', urlValidation.error, backgroundUrl);
        return;
      }
      
      // Rate limiting to prevent resource exhaustion
      const rateLimitKey = `bg-svg-${backgroundUrl}`;
      if (!ResourceRateLimiter.checkLimit(rateLimitKey, 5, 30000)) {
        console.warn('Background SVG load rate limit exceeded for:', backgroundUrl);
        return;
      }
      
      fetch(urlValidation.sanitized)
        .then(response => {
          if (!response || !response.ok) {
            const status = response ? `${response.status} ${response.statusText}` : 'No response';
            throw new Error(`HTTP error loading background SVG: ${status}`);
          }
          return response.text();
        })
        .then(svgText => {
          // Sanitize SVG content before parsing to prevent XSS
          const sanitizedSvg = SecurityHelpers.sanitizeSvg(svgText);
          if (!sanitizedSvg) {
            throw new Error('SVG sanitization failed or produced empty result');
          }
          
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(sanitizedSvg, 'image/svg+xml');
          
          // Check for parsing errors
          const parserError = svgDoc.querySelector('parsererror');
          if (parserError) {
            throw new Error(`SVG parsing error: ${parserError.textContent}`);
          }
          
          const svgElement = svgDoc.documentElement;
          if (!svgElement || svgElement.tagName.toLowerCase() !== 'svg') {
            throw new Error('Invalid SVG: root element is not <svg>');
          }
          
          // Clear existing content
          refs.backgroundSvg.innerHTML = '';
          // Import the entire <svg> element so its viewBox/preserveAspectRatio are preserved.
          // Appending only children discards the background SVG root sizing and often breaks scaling.
          const importedSvg = document.importNode(svgElement, true);
          try {
            if (importedSvg && importedSvg.tagName && importedSvg.tagName.toLowerCase() === 'svg') {
              importedSvg.setAttribute('x', '0');
              importedSvg.setAttribute('y', '0');
              importedSvg.setAttribute('width', '100%');
              importedSvg.setAttribute('height', '100%');
              // Stretch the background to the available viewport.
              // This preserves all internal relative positioning (paths/text stay aligned)
              // while allowing non-uniform scaling when the display aspect ratio differs.
              importedSvg.setAttribute('preserveAspectRatio', 'none');
              // Avoid fixed pixel sizing from the source file taking precedence.
              importedSvg.style.width = '100%';
              importedSvg.style.height = '100%';
              importedSvg.style.display = 'block';

              // Support relative <image> references (e.g. href="nightnocar.webp") so the
              // SVG can be edited in Inkscape while still loading correctly in Home Assistant.
              // When the background SVG is inlined into the dashboard DOM, relative URLs would
              // otherwise resolve against the dashboard URL, not the original SVG file URL.
              try {
                const XLINK_NS = 'http://www.w3.org/1999/xlink';
                const baseUrl = new URL(backgroundUrl, window.location.href);
                const getHref = (el) => (
                  el.getAttribute('href') ||
                  el.getAttribute('xlink:href') ||
                  el.getAttributeNS(XLINK_NS, 'href')
                );
                const hasScheme = (value) => /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);
                const isRelativeRef = (value) => (
                  typeof value === 'string' &&
                  value.length > 0 &&
                  !value.startsWith('/') &&
                  !value.startsWith('#') &&
                  !hasScheme(value)
                );

                const images = importedSvg.querySelectorAll('image');
                images.forEach((img) => {
                  const href = getHref(img);
                  if (!isRelativeRef(href)) return;
                  const resolved = new URL(href, baseUrl).toString();

                  if (img.getAttribute('href') !== null) {
                    img.setAttribute('href', resolved);
                  }
                  const xlinkAttr = img.getAttribute('xlink:href');
                  const xlinkNsAttr = img.getAttributeNS(XLINK_NS, 'href');
                  if (xlinkAttr !== null || xlinkNsAttr !== null) {
                    img.setAttributeNS(XLINK_NS, 'href', resolved);
                  }
                });

                // Preload all resolved image URLs so hidden layers (e.g. night JPG starting as
                // display:none) are already cached when the day/night layer switches.
                images.forEach((img) => {
                  const href = getHref(img);
                  if (href && /^https?:\/\//i.test(href)) {
                    const preloader = new window.Image();
                    preloader.src = href;
                  }
                });
              } catch (e) {
                // ignore
              }

              // Performance note: if the background SVG contains multiple car-count variants
              // (daynocar/day1car/day2car and nightnocar/night1car/night2car), keep only the
              // active one. This enables using external image URLs while guaranteeing only
              // one background image gets requested/decoded.
              try {
                const effectiveConfig = this.card._sunMoonManager._layerConfigWithEffectiveNight(this.card.config);
                const carCount = (typeof getConfiguredCarCount === 'function') ? getConfiguredCarCount(effectiveConfig) : 0;
                const isNight = Boolean(effectiveConfig && effectiveConfig.night_mode);
                const desiredRole = (() => {
                  if (isNight) {
                    if (carCount <= 0) return 'nightnocar';
                    if (carCount === 1) return 'night1car';
                    return 'night2car';
                  }
                  if (carCount <= 0) return 'daynocar';
                  if (carCount === 1) return 'day1car';
                  return 'day2car';
                })();

                const candidateRoles = ['daynocar', 'day1car', 'day2car', 'nightnocar', 'night1car', 'night2car'];
                candidateRoles.forEach((role) => {
                  if (role === desiredRole) return;
                  const nodes = importedSvg.querySelectorAll(`[data-role="${role}"]`);
                  nodes.forEach((node) => {
                    if (node && node.parentNode) {
                      node.parentNode.removeChild(node);
                    }
                  });
                });
              } catch (e) {
                // ignore
              }
            }
          } catch (e) {
            // ignore
          }
          refs.backgroundSvg.appendChild(importedSvg);
          // Apply layer visibility after loading
          applySvgLayerVisibility(refs.backgroundSvg, this.card._sunMoonManager._layerConfigWithEffectiveNight(this.card.config));

          // Apply custom car effects defined in the background SVG.
          this.card._animationManager._applyCarEffectFilters(refs.backgroundSvg, viewState);

          // Use the most recent viewState in case multiple renders happened during the async SVG fetch.
          // The closure 'viewState' may be stale (e.g. captured as daytime, but it is now night).
          const currentViewState = this.card._viewState || viewState;

          // Populate any SVG-embedded text placeholders once the SVG is present.
          this.card._textBindingsManager.apply(currentViewState);
          // Refresh DOM caches so feature references (like headlights) resolve immediately.
          this._cacheDomReferences();
          this.card._animationManager._updateHeadlightFlash(currentViewState);
          // Re-apply sun/moon position after DOM cache refresh so the moon/sun icon reflects
          // the current day/night state with up-to-date element references.
          this.card._sunMoonManager._updateSunMoonPosition(currentViewState);
          // SVG is now in DOM — trigger a full re-render so flow animations start immediately
          // rather than waiting for the next update_interval cycle.
          this.card._forceRender = true;
          this.card.render();
        })
        .catch(error => {
          console.error('Failed to load background SVG:', backgroundUrl, error);
        });
    }

    if (refs.dailyYieldGroup) {
      const visible = viewState.daily && viewState.daily.visible;
      const display = visible ? 'inline' : 'none';
      if (refs.dailyYieldGroup.style.display !== display) {
        refs.dailyYieldGroup.style.display = display;
      }
      const cursor = visible ? 'pointer' : 'default';
      if (refs.dailyYieldGroup.style.cursor !== cursor) {
        refs.dailyYieldGroup.style.cursor = cursor;
      }
    }

    if (Array.isArray(viewState.batteries) && viewState.batteries.length) {
      const svgRoot = refs.backgroundSvg || refs.svgRoot;
      if (svgRoot) {
        const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
        const ensureClipPolygon = (target) => {
          if (!target || !target.ownerSVGElement) return null;
          const svg = target.ownerSVGElement;
          const SVG_NS = 'http://www.w3.org/2000/svg';
          let defs = svg.querySelector('defs[data-role="advanced-defs"]') || svg.querySelector('defs');
          if (!defs) {
            defs = document.createElementNS(SVG_NS, 'defs');
            defs.setAttribute('data-role', 'advanced-defs');
            svg.insertBefore(defs, svg.firstChild);
          } else if (!defs.getAttribute('data-role')) {
            defs.setAttribute('data-role', 'advanced-defs');
          }

          if (!target.dataset) return null;
          if (!target.dataset.fillClipId) {
            target.dataset.fillClipId = `advanced-batfill-${Math.random().toString(36).slice(2, 9)}`;
          }
          const clipId = target.dataset.fillClipId;
          let clipPath = defs.querySelector(`#${CSS.escape(clipId)}`);
          if (!clipPath) {
            clipPath = document.createElementNS(SVG_NS, 'clipPath');
            clipPath.setAttribute('id', clipId);
            clipPath.setAttribute('clipPathUnits', 'userSpaceOnUse');
            const polygon = document.createElementNS(SVG_NS, 'polygon');
            polygon.setAttribute('points', '0,0 1,0 1,1 0,1');
            clipPath.appendChild(polygon);
            defs.appendChild(clipPath);
          } else if (clipPath.getAttribute('clipPathUnits') !== 'userSpaceOnUse') {
            clipPath.setAttribute('clipPathUnits', 'userSpaceOnUse');
          }
          const polygon = clipPath.querySelector('polygon');
          return polygon || null;
        };
        const getWorldBBox = (target) => {
          if (!target || typeof target.getBBox !== 'function') {
            return null;
          }
          let bbox = null;
          try {
            bbox = target.getBBox();
          } catch (e) {
            bbox = null;
          }
          if (!bbox || !Number.isFinite(bbox.x) || !Number.isFinite(bbox.y)
            || !Number.isFinite(bbox.width) || !Number.isFinite(bbox.height)
            || bbox.width <= 0 || bbox.height <= 0) {
            return null;
          }
          const ctm = (typeof target.getCTM === 'function') ? target.getCTM() : null;
          if (!ctm || !Number.isFinite(ctm.a) || !Number.isFinite(ctm.b)
            || !Number.isFinite(ctm.c) || !Number.isFinite(ctm.d)
            || !Number.isFinite(ctm.e) || !Number.isFinite(ctm.f)) {
            return bbox;
          }
          const toWorld = (pt) => ({
            x: (pt.x * ctm.a) + (pt.y * ctm.c) + ctm.e,
            y: (pt.x * ctm.b) + (pt.y * ctm.d) + ctm.f
          });
          const corners = [
            { x: bbox.x, y: bbox.y },
            { x: bbox.x + bbox.width, y: bbox.y },
            { x: bbox.x + bbox.width, y: bbox.y + bbox.height },
            { x: bbox.x, y: bbox.y + bbox.height }
          ].map(toWorld);
          const xs = corners.map((p) => p.x);
          const ys = corners.map((p) => p.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
          };
        };

        viewState.batteries.forEach((bat) => {
          const role = bat && bat.role ? bat.role : '';
          if (!role) return;
          const fillEl = svgRoot.querySelector(`[data-role="${role}-fill-level"]`);
          const topEl = svgRoot.querySelector(`[data-role="${role}-fill-top"]`);
          const bottomEl = svgRoot.querySelector(`[data-role="${role}-fill-bottom"]`) 
            || svgRoot.querySelector(`[data-role="${role}-filll-bottom"]`);
          if (!fillEl) return;

          const config = this.card._config || this.card.config || {};
          const lowThreshold = Number.isFinite(Number(config.battery_fill_low_threshold))
            ? Number(config.battery_fill_low_threshold)
            : DEFAULT_BATTERY_LOW_THRESHOLD;
          const fillHigh = (typeof config.battery_fill_high_color === 'string' && config.battery_fill_high_color.trim())
            ? config.battery_fill_high_color.trim()
            : DEFAULT_BATTERY_FILL_HIGH_COLOR;
          const fillLow = (typeof config.battery_fill_low_color === 'string' && config.battery_fill_low_color.trim())
            ? config.battery_fill_low_color.trim()
            : DEFAULT_BATTERY_FILL_LOW_COLOR;
          const fillOpacity = (() => {
            const raw = Number(config.battery_fill_opacity);
            if (!Number.isFinite(raw)) return 1;
            return Math.min(Math.max(raw, 0), 1);
          })();

          const display = bat.visible ? 'inline' : 'none';
          if (fillEl.style.display !== display) {
            fillEl.style.display = display;
          }
          if (!bat.visible) return;

          const socValue = Number.isFinite(bat.soc) ? bat.soc : 0;
          const chosenFill = socValue <= lowThreshold ? fillLow : fillHigh;
          if (chosenFill) {
            if (fillEl.getAttribute('fill') !== chosenFill) {
              fillEl.setAttribute('fill', chosenFill);
            }
            if (fillEl.style.fill !== chosenFill) {
              fillEl.style.fill = chosenFill;
            }
          }
          const opacityText = String(fillOpacity);
          if (fillEl.style.opacity !== opacityText) {
            fillEl.style.opacity = opacityText;
          }
          if (fillEl.style.fillOpacity !== opacityText) {
            fillEl.style.fillOpacity = opacityText;
          }

          const fillBox = getWorldBBox(fillEl);
          const topBox = topEl ? getWorldBBox(topEl) : null;
          const bottomBox = bottomEl ? getWorldBBox(bottomEl) : null;

          if (!fillBox) {
            return;
          }

          // Function to parse all points from a path
          const parsePathPoints = (pathEl) => {
            if (!pathEl) return [];
            const d = pathEl.getAttribute('d');
            if (!d) return [];
            const points = [];
            let currentX = 0, currentY = 0;
            
            const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
            commands.forEach(cmd => {
              const type = cmd[0];
              const coords = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(Number.isFinite);
              
              if (type === 'M') {
                currentX = coords[0];
                currentY = coords[1];
                points.push({ x: currentX, y: currentY });
                for (let i = 2; i < coords.length; i += 2) {
                  currentX = coords[i];
                  currentY = coords[i + 1];
                  points.push({ x: currentX, y: currentY });
                }
              } else if (type === 'm') {
                currentX += coords[0];
                currentY += coords[1];
                points.push({ x: currentX, y: currentY });
                for (let i = 2; i < coords.length; i += 2) {
                  currentX += coords[i];
                  currentY += coords[i + 1];
                  points.push({ x: currentX, y: currentY });
                }
              } else if (type === 'L') {
                for (let i = 0; i < coords.length; i += 2) {
                  currentX = coords[i];
                  currentY = coords[i + 1];
                  points.push({ x: currentX, y: currentY });
                }
              } else if (type === 'l') {
                for (let i = 0; i < coords.length; i += 2) {
                  currentX += coords[i];
                  currentY += coords[i + 1];
                  points.push({ x: currentX, y: currentY });
                }
              }
            });
            return points;
          };

          const topPoints = parsePathPoints(topEl);
          const bottomPoints = parsePathPoints(bottomEl);

          const level = clamp01(socValue / 100);

          if (topPoints.length > 0 && bottomPoints.length > 0) {
            // Use path-based polygon clipping with userSpaceOnUse coordinates
            // Interpolate clip points between top and bottom paths
            // Use (1 - level) because we want high SOC to show more fill (clip line near top)
            const clipPoints = topPoints.map((topPt, i) => {
              const bottomPt = bottomPoints[i] || bottomPoints[bottomPoints.length - 1];
              return {
                x: topPt.x + (bottomPt.x - topPt.x) * (1 - level),
                y: topPt.y + (bottomPt.y - topPt.y) * (1 - level)
              };
            });

            // Build polygon: clip points + bottom points reversed (using actual SVG coordinates)
            const polygonPoints = [
              ...clipPoints.map(p => `${p.x},${p.y}`),
              ...bottomPoints.slice().reverse().map(p => `${p.x},${p.y}`)
            ].join(' ');

            const polygon = ensureClipPolygon(fillEl);
            if (polygon) {
              polygon.setAttribute('points', polygonPoints);
              fillEl.setAttribute('clip-path', `url(#${fillEl.dataset.fillClipId})`);
            }
          } else {
            // Fallback to rectangle clipping if no paths found
            const topYRaw = (topBox && Number.isFinite(topBox.y)) ? topBox.y : fillBox.y;
            const bottomYRaw = (bottomBox && Number.isFinite(bottomBox.y) && Number.isFinite(bottomBox.height))
              ? (bottomBox.y + bottomBox.height)
              : (fillBox.y + fillBox.height);
            const topY = Math.min(topYRaw, bottomYRaw);
            const bottomY = Math.max(topYRaw, bottomYRaw);
            const range = Math.max(bottomY - topY, 1);
            const currentHeight = range * level;
            const y = bottomY - currentHeight;

            const rectY = clamp01((y - fillBox.y) / fillBox.height);
            const rectH = clamp01(currentHeight / fillBox.height);

            const polygon = ensureClipPolygon(fillEl);
            if (polygon) {
              polygon.setAttribute('points', `0,${rectY} 1,${rectY} 1,1 0,1`);
              fillEl.setAttribute('clip-path', `url(#${fillEl.dataset.fillClipId})`);
            }
          }
        });
      }
    }

    if (Array.isArray(viewState.batteries) && viewState.batteries.length) {
      const svgRoot = refs.backgroundSvg || refs.svgRoot;
      if (svgRoot) {
        viewState.batteries.forEach((bat) => {
          const role = bat && bat.role ? bat.role : '';
          if (!role) return;
          const group = svgRoot.querySelector(`[data-role="${role}"]`);
          if (!group) return;
          const display = bat.visible ? 'inline' : 'none';
          if (group.style.display !== display) {
            group.style.display = display;
          }
          const opacity = bat.visible ? '1' : '0';
          if (group.getAttribute('opacity') !== opacity) {
            group.setAttribute('opacity', opacity);
          }
          if (group.style && group.style.opacity !== opacity) {
            group.style.opacity = opacity;
          }
        });
      }
    }

    if (Array.isArray(viewState.batteryText) && viewState.batteryText.length) {
      const svgRoot = refs.backgroundSvg || refs.svgRoot;
      if (svgRoot) {
        viewState.batteryText.forEach((bat) => {
          const index = bat && Number.isFinite(bat.index) ? bat.index : null;
          if (!index) return;
          const group = svgRoot.querySelector(`[data-role="battery${index}-text"]`);
          if (!group) return;
          const opacity = bat.visible ? '1' : '0';
          if (group.getAttribute('opacity') !== opacity) {
            group.setAttribute('opacity', opacity);
          }
          if (group.style && group.style.opacity !== opacity) {
            group.style.opacity = opacity;
          }
        });
      }
    }

    // Update inverter1-status text based on battery and grid state
    if (viewState.batteries || viewState.grid) {
      const svgRoot = refs.backgroundSvg || refs.svgRoot;
      if (svgRoot) {
        const statusEl = svgRoot.querySelector('[data-role="inverter1-status"]');
        if (statusEl) {
          const config = this.card._config || this.card.config || {};
          const i18n = new LocalizationManager(this.card._config && this.card._config.language || 'en');
          let statusText = '';

          // Determine status based on battery and grid state
          // Get battery power (from first battery or total)
          let batteryPower = 0;
          if (viewState.batteries && viewState.batteries.length > 0) {
            const bat1 = viewState.batteries[0];
            if (bat1 && Number.isFinite(bat1.power)) {
              batteryPower = bat1.power;
            }
          }

          // Get grid power
          let gridPower = 0;
          if (viewState.grid && Number.isFinite(viewState.grid.power)) {
            gridPower = viewState.grid.power;
          }

          // Priority: Battery charging/discharging > Grid importing/exporting
          if (Math.abs(batteryPower) > 100) {
            if (batteryPower > 0) {
              statusText = i18n.t('charging');
            } else {
              statusText = i18n.t('discharging');
            }
          } else if (Math.abs(gridPower) > 100) {
            if (gridPower > 0) {
              statusText = i18n.t('importing');
            } else {
              statusText = i18n.t('exporting');
            }
          } else {
            statusText = i18n.t('standby');
          }

          if (statusEl.textContent !== statusText) {
            statusEl.textContent = statusText;
          }

          // Apply color and font size from config
          if (config.inverter1_status_text_color) {
            const statusColor = config.inverter1_status_text_color;
            if (statusEl.style.fill !== statusColor) {
              statusEl.style.fill = statusColor;
            }
          }

          if (config.inverter1_status_font_size !== undefined) {
            const num = Number(config.inverter1_status_font_size);
            const statusFontSize = Number.isFinite(num) ? Math.min(Math.max(num, 4), 28) : 8;
            if (statusEl.style.fontSize !== `${statusFontSize}px`) {
              statusEl.style.fontSize = `${statusFontSize}px`;
            }
          }
        }
      }
    }

    // Update battery time calculation attributes
    if (viewState.inv1DateTime || viewState.inv1TimeUntil || viewState.inv2DateTime || viewState.inv2TimeUntil) {
      const svgRoot = refs.backgroundSvg || refs.svgRoot;
      if (svgRoot) {
        // Update inverter 1 datetime
        const inv1DateEl = svgRoot.querySelector('[data-feature="inv1-datetime"]');
        if (inv1DateEl && viewState.inv1DateTime) {
          const newText = viewState.inv1DateTime.text || '';
          if (inv1DateEl.textContent !== newText) {
            inv1DateEl.textContent = newText;
          }
          if (viewState.inv1DateTime.fill && inv1DateEl.style.fill !== viewState.inv1DateTime.fill) {
            inv1DateEl.style.fill = viewState.inv1DateTime.fill;
          }
          if (viewState.inv1DateTime.fontSize) {
            const fontSize = `${viewState.inv1DateTime.fontSize}px`;
            if (inv1DateEl.style.fontSize !== fontSize) {
              inv1DateEl.style.fontSize = fontSize;
            }
          }
        }

        // Update inverter 1 time until
        const inv1TimeEl = svgRoot.querySelector('[data-feature="inv1-timeuntil"]');
        if (inv1TimeEl && viewState.inv1TimeUntil) {
          const newText = viewState.inv1TimeUntil.text || '';
          if (inv1TimeEl.textContent !== newText) {
            inv1TimeEl.textContent = newText;
          }
          if (viewState.inv1TimeUntil.fill && inv1TimeEl.style.fill !== viewState.inv1TimeUntil.fill) {
            inv1TimeEl.style.fill = viewState.inv1TimeUntil.fill;
          }
          if (viewState.inv1TimeUntil.fontSize) {
            const fontSize = `${viewState.inv1TimeUntil.fontSize}px`;
            if (inv1TimeEl.style.fontSize !== fontSize) {
              inv1TimeEl.style.fontSize = fontSize;
            }
          }
        }

        // Update inverter 2 datetime
        const inv2DateEl = svgRoot.querySelector('[data-feature="inv2-datetime"]');
        if (inv2DateEl && viewState.inv2DateTime) {
          const newText = viewState.inv2DateTime.text || '';
          if (inv2DateEl.textContent !== newText) {
            inv2DateEl.textContent = newText;
          }
          if (viewState.inv2DateTime.fill && inv2DateEl.style.fill !== viewState.inv2DateTime.fill) {
            inv2DateEl.style.fill = viewState.inv2DateTime.fill;
          }
          if (viewState.inv2DateTime.fontSize) {
            const fontSize = `${viewState.inv2DateTime.fontSize}px`;
            if (inv2DateEl.style.fontSize !== fontSize) {
              inv2DateEl.style.fontSize = fontSize;
            }
          }
        }

        // Update inverter 2 time until
        const inv2TimeEl = svgRoot.querySelector('[data-feature="inv2-timeuntil"]');
        if (inv2TimeEl && viewState.inv2TimeUntil) {
          const newText = viewState.inv2TimeUntil.text || '';
          if (inv2TimeEl.textContent !== newText) {
            inv2TimeEl.textContent = newText;
          }
          if (viewState.inv2TimeUntil.fill && inv2TimeEl.style.fill !== viewState.inv2TimeUntil.fill) {
            inv2TimeEl.style.fill = viewState.inv2TimeUntil.fill;
          }
          if (viewState.inv2TimeUntil.fontSize) {
            const fontSize = `${viewState.inv2TimeUntil.fontSize}px`;
            if (inv2TimeEl.style.fontSize !== fontSize) {
              inv2TimeEl.style.fontSize = fontSize;
            }
          }
        }
      }
    }

    if (viewState.car1 || viewState.car2) {
      const svgRoot = refs.backgroundSvg || refs.svgRoot;
      if (svgRoot) {
        const applyCarOpacity = (key, visible) => {
          const group = svgRoot.querySelector(`[data-role="${key}"]`);
          if (!group) return;
          const opacity = visible ? '1' : '0';
          if (group.getAttribute('opacity') !== opacity) {
            group.setAttribute('opacity', opacity);
          }
          if (group.style && group.style.opacity !== opacity) {
            group.style.opacity = opacity;
          }
        };
        applyCarOpacity('car1', Boolean(viewState.car1 && viewState.car1.visible));
        applyCarOpacity('car2', Boolean(viewState.car2 && viewState.car2.visible));
      }
    }

    // Force-hide legacy SVG popups (single HTML overlay is used instead)
    const legacyPopups = [refs.pvPopup, refs.housePopup, refs.gridPopup, refs.inverterPopup].filter(Boolean);
    legacyPopups.forEach((popup) => {
      if (popup && popup.style && popup.style.display !== 'none') {
        popup.style.display = 'none';
      }
    });

    // If PV UI becomes disabled while PV popup is open, close it.
    if (!viewState.pvUiEnabled && this.card._activePopup === 'pv') {
      this.card._popupManager.closePopup();
    }

    // Keep popup positioned on every view update while visible
    if (this.card._activePopup) {
      this.card._popupManager.syncPopupPosition();
    }

    const prevFlows = prev.flows || {};
    Object.entries(viewState.flows).forEach(([key, flowState]) => {
      const element = refs.flows ? refs.flows[key] : null;
      const arrowGroup = useArrowsGlobally && refs.arrows ? refs.arrows[key] : null;
      const arrowShapes = useArrowsGlobally && refs.arrowShapes ? refs.arrowShapes[key] : null;
      if (!element) {
        return;
      }
      const prevFlow = prevFlows[key] || {};
      if (prevFlow.stroke !== flowState.stroke) {
        element.setAttribute('stroke', flowState.stroke);
      }
      if (useArrowsGlobally && arrowShapes && arrowShapes.length && (prevFlow.stroke !== flowState.stroke || prevFlow.glowColor !== flowState.glowColor)) {
        arrowShapes.forEach((shape) => {
          shape.setAttribute('fill', flowState.glowColor || flowState.stroke);
        });
      }
      const pathOpacity = flowState.active ? '1' : '0';
      if (element.style.opacity !== pathOpacity) {
        element.style.opacity = pathOpacity;
      }
      if (!this.card._animationManager.tweens.get(key)) {
        this.card._animationManager.setFlowGlow(element, flowState.glowColor || flowState.stroke, flowState.active ? 0.8 : 0.25);
        if (useArrowsGlobally && arrowGroup) {
          const arrowOpacity = flowState.active ? '1' : '0';
          if (arrowGroup.style.opacity !== arrowOpacity) {
            arrowGroup.style.opacity = arrowOpacity;
          }
          if (!flowState.active && arrowShapes && arrowShapes.length) {
            arrowShapes.forEach((shape) => shape.removeAttribute('transform'));
          }
        }
      } else if (useArrowsGlobally && arrowGroup) {
        const arrowOpacity = flowState.active ? '1' : '0';
        if (arrowGroup.style.opacity !== arrowOpacity) {
          arrowGroup.style.opacity = arrowOpacity;
        }
        if (!flowState.active && arrowShapes && arrowShapes.length) {
          arrowShapes.forEach((shape) => shape.removeAttribute('transform'));
        }
      }

      if (!useArrowsGlobally && refs.arrows && refs.arrows[key] && (styleChanged || refs.arrows[key].style.opacity !== '0')) {
        refs.arrows[key].style.opacity = '0';
        if (refs.arrowShapes && refs.arrowShapes[key]) {
          refs.arrowShapes[key].forEach((shape) => shape.removeAttribute('transform'));
        }
      }
    });

    // Safety: if we are not in arrow mode, force-hide ANY arrow groups/shapes.
    // This protects against leftover arrow polygons when switching styles.
    if (!useArrowsGlobally && refs.svgRoot) {
      const arrowGroups = refs.svgRoot.querySelectorAll('[data-arrow-key], .flow-arrow');
      arrowGroups.forEach((group) => {
        if (group && group.style && group.style.opacity !== '0') {
          group.style.opacity = '0';
        }
      });
      const arrowShapesAll = refs.svgRoot.querySelectorAll('[data-arrow-shape]');
      arrowShapesAll.forEach((shape) => shape.removeAttribute('transform'));
    }

    // Apply layer visibility if background is already loaded
    if (refs.backgroundSvg && refs.backgroundSvg.children.length > 0) {
      applySvgLayerVisibility(refs.backgroundSvg, this.card._sunMoonManager._layerConfigWithEffectiveNight(this.card.config));
      this.card._animationManager._applyCarEffectFilters(refs.backgroundSvg, viewState);
    }

    // Windmill blades: rotate only when windmill total is positive.
    try {
      const blades = refs.windmillBlades || (refs.backgroundSvg ? refs.backgroundSvg.querySelector('[data-key-rotate="windmill-blades"]') : null);
      if (blades) {
        const shouldSpin = Boolean(viewState && viewState.windmillSpin);
        if (shouldSpin) {
          if (blades.getAttribute('data-advanced-rotate-disabled') !== null) {
            blades.removeAttribute('data-advanced-rotate-disabled');
          }
        } else {
          if (blades.getAttribute('data-advanced-rotate-disabled') !== '1') {
            blades.setAttribute('data-advanced-rotate-disabled', '1');
          }
        }
      }
    } catch (e) {
      // ignore
    }

    this.card._animationManager._updateHeadlightFlash(viewState);

    // Populate SVG-embedded text placeholders (safe no-op if none exist).
    this.card._textBindingsManager.apply(viewState);

    // Re-attach event listeners after DOM updates
    this._cacheDomReferences(); // Re-cache refs in case DOM was updated
    this.card._attachEventListeners();
  }

  _cacheDomReferences() {
    if (!this.card.shadowRoot) {
      return;
    }
    const root = this.card.shadowRoot;
    this.card._animationManager.pathLengths.clear();
    this.card._domRefs = {
      card: root.querySelector('ha-card'),
      svgRoot: root.querySelector('svg'),
      backgroundSvg: root.querySelector('[data-role="background-svg"]'),
      titleOverlay: root.querySelector('[data-role="title-overlay"]'),
      pvDailyOverlay: root.querySelector('[data-role="pv-daily-overlay"]'),
      popupBackdrop: root.querySelector('[data-role="popup-backdrop"]'),
      popupOverlay: root.querySelector('[data-role="popup-overlay"]'),
      popupLines: root.querySelector('[data-role="popup-lines"]'),
      title: root.querySelector('[data-role="title-text"]'),
      dailyYieldGroup: root.querySelector('[data-role="daily-yield-group"]'),
      dailyLabel: root.querySelector('[data-role="daily-label"]'),
      dailyValue: root.querySelector('[data-role="daily-value"]'),
      pvLines: Array.from({ length: MAX_PV_LINES }, (_, index) => root.querySelector(`[data-role="pv-line-${index}"]`)),
      pv2Lines: Array.from({ length: 6 }, (_, index) => root.querySelector(`[data-role="pv2-line-${index}"]`)),
      loadText: root.querySelector('[data-role="load-power"]'),
      loadLines: Array.from({ length: 3 }, (_, index) => root.querySelector(`[data-role="load-line-${index}"]`)),
      gridText: root.querySelector('[data-role="grid-power"]'),
      gridLines: Array.from({ length: 2 }, (_, index) => root.querySelector(`[data-role="grid-line-${index}"]`)),
      heatPumpText: root.querySelector('[data-role="heat-pump-power"]'),
      car1Label: root.querySelector('[data-role="car1-label"]'),
      car1Power: root.querySelector('[data-role="car1-power"]'),
      car1Soc: root.querySelector('[data-role="car1-soc"]'),
      car2Label: root.querySelector('[data-role="car2-label"]'),
      car2Power: root.querySelector('[data-role="car2-power"]'),
      car2Soc: root.querySelector('[data-role="car2-soc"]'),
      pvPopup: root.querySelector('[data-role="pv-popup"]'),
      pvPopupLines: Array.from({ length: 6 }, (_, index) => root.querySelector(`[data-role="pv-popup-line-${index}"]`)),
      housePopup: root.querySelector('[data-role="house-popup"]'),
      housePopupLines: Array.from({ length: 6 }, (_, index) => root.querySelector(`[data-role="house-popup-line-${index}"]`)),
      gridPopup: root.querySelector('[data-role="grid-popup"]'),
      gridPopupLines: Array.from({ length: 6 }, (_, index) => root.querySelector(`[data-role="grid-popup-line-${index}"]`)),
      inverterPopup: root.querySelector('[data-role="inverter-popup"]'),
      inverterPopupLines: Array.from({ length: 6 }, (_, index) => root.querySelector(`[data-role="inverter-popup-line-${index}"]`)),
      echoAliveContainer: root.querySelector('[data-role="echo-alive-container"]'),

      windmillBlades: root.querySelector('[data-key-rotate="windmill-blades"]'),

      flows: {
        pv1: root.querySelector('[data-flow-key="pv1"]'),
        pv2: root.querySelector('[data-flow-key="pv2"]'),
        'array-inverter1': root.querySelector('[data-flow-key="array-inverter1"]'),
        'array-inverter2': root.querySelector('[data-flow-key="array-inverter2"]'),
        'windmill-inverter1': root.querySelector('[data-flow-key="windmill-inverter1"]'),
        'windmill-inverter2': root.querySelector('[data-flow-key="windmill-inverter2"]'),
        load: root.querySelector('[data-flow-key="load"]'),
        'house-load-inverter1': root.querySelector('[data-flow-key="house-load-inverter1"]'),
        'house-load-inverter2': root.querySelector('[data-flow-key="house-load-inverter2"]'),
        grid: root.querySelector('[data-flow-key="grid"]'),
        grid_house: root.querySelector('[data-flow-key="grid_house"]'),
        'grid-house': root.querySelector('[data-flow-key="grid-house"]'),
        'grid-feed': root.querySelector('[data-flow-key="grid-feed"]') || root.querySelector('[data-flow-key="gird-feed"]'),
        'inverter1-import-export': root.querySelector('[data-flow-key="inverter1-import-export"]') || root.querySelector('[data-flow-key="grid-import-export"]'),
        'inverter1-grid': root.querySelector('[data-flow-key="inverter1-grid"]') || root.querySelector('[data-flow-key="inverter1-import-export"]') || root.querySelector('[data-flow-key="grid-import-export"]'),
        'inverter2-import-export': root.querySelector('[data-flow-key="inverter2-import-export"]'),
        'inverter2-grid': root.querySelector('[data-flow-key="inverter2-grid"]') || root.querySelector('[data-flow-key="inverter2-import-export"]'),
        'grid-import-export': root.querySelector('[data-flow-key="grid-import-export"]') || root.querySelector('[data-flow-key="inverter1-import-export"]'),
        car1: root.querySelector('[data-flow-key="car1"]'),
        car2: root.querySelector('[data-flow-key="car2"]'),
        heatPump: root.querySelector('[data-flow-key="heatPump"]'),
        'inverter1-battery1': root.querySelector('[data-flow-key="inverter1-battery1"], [inverter1-battery1="inverter1-battery1"]'),
        'inverter1-battery2': root.querySelector('[data-flow-key="inverter1-battery2"]'),
        'inverter1-battery3': root.querySelector('[data-flow-key="inverter1-battery3"]'),
        'inverter1-battery4': root.querySelector('[data-flow-key="inverter1-battery4"]'),
        'inverter2-battery3': root.querySelector('[data-flow-key="inverter2-battery3"]'),
        'inverter2-battery4': root.querySelector('[data-flow-key="inverter2-battery4"]'),
        pool: root.querySelector('[data-flow-key="pool"]')
      },
      rotateElements: []
    };

    // Cache any SVG elements marked for rotation.
    try {
      const svg = this.card._domRefs && this.card._domRefs.svgRoot ? this.card._domRefs.svgRoot : root.querySelector('svg');
      if (svg) {
        this.card._domRefs.rotateElements = Array.from(svg.querySelectorAll('[data-key-rotate]'));
      }
    } catch (e) {
      this.card._domRefs.rotateElements = [];
    }

    // Ensure arrow groups exist inside the loaded SVG so the "arrows" animation style can work
    if (this.card._domRefs && this.card._domRefs.flows) {
      this._ensureArrowGroups(this.card._domRefs.flows);
    }

    // Cache arrow groups/shapes after ensuring they exist
    this.card._domRefs.arrows = {
      pv1: root.querySelector('[data-arrow-key="pv1"]'),
      pv2: root.querySelector('[data-arrow-key="pv2"]'),
      'array-inverter1': root.querySelector('[data-arrow-key="array-inverter1"]'),
      'array-inverter2': root.querySelector('[data-arrow-key="array-inverter2"]'),
      load: root.querySelector('[data-arrow-key="load"]'),
      'windmill-inverter1': root.querySelector('[data-arrow-key="windmill-inverter1"]'),
      'windmill-inverter2': root.querySelector('[data-arrow-key="windmill-inverter2"]'),
      'house-load-inverter1': root.querySelector('[data-arrow-key="house-load-inverter1"]'),
      'house-load-inverter2': root.querySelector('[data-arrow-key="house-load-inverter2"]'),
      grid: root.querySelector('[data-arrow-key="grid"]'),
      grid_house: root.querySelector('[data-arrow-key="grid_house"]'),
      'grid-house': root.querySelector('[data-arrow-key="grid-house"]'),
      'grid-feed': root.querySelector('[data-arrow-key="grid-feed"]') || root.querySelector('[data-arrow-key="gird-feed"]'),
      'inverter1-import-export': root.querySelector('[data-arrow-key="inverter1-import-export"]') || root.querySelector('[data-arrow-key="grid-import-export"]'),
      'inverter1-grid': root.querySelector('[data-arrow-key="inverter1-grid"]') || root.querySelector('[data-arrow-key="inverter1-import-export"]') || root.querySelector('[data-arrow-key="grid-import-export"]'),
      'inverter2-import-export': root.querySelector('[data-arrow-key="inverter2-import-export"]'),
      'inverter2-grid': root.querySelector('[data-arrow-key="inverter2-grid"]') || root.querySelector('[data-arrow-key="inverter2-import-export"]'),
      'grid-import-export': root.querySelector('[data-arrow-key="grid-import-export"]') || root.querySelector('[data-arrow-key="inverter1-import-export"]'),
      car1: root.querySelector('[data-arrow-key="car1"]'),
      car2: root.querySelector('[data-arrow-key="car2"]'),
      heatPump: root.querySelector('[data-arrow-key="heatPump"]'),
      'inverter1-battery1': root.querySelector('[data-arrow-key="inverter1-battery1"]'),
      'inverter1-battery2': root.querySelector('[data-arrow-key="inverter1-battery2"]'),
      'inverter1-battery3': root.querySelector('[data-arrow-key="inverter1-battery3"]'),
      'inverter1-battery4': root.querySelector('[data-arrow-key="inverter1-battery4"]'),
      'inverter2-battery3': root.querySelector('[data-arrow-key="inverter2-battery3"]'),
      'inverter2-battery4': root.querySelector('[data-arrow-key="inverter2-battery4"]')
    };
    this.card._domRefs.arrowShapes = {
      pv1: Array.from(root.querySelectorAll('[data-arrow-shape="pv1"]')),
      pv2: Array.from(root.querySelectorAll('[data-arrow-shape="pv2"]')),
      'array-inverter1': Array.from(root.querySelectorAll('[data-arrow-shape="array-inverter1"]')),
      'array-inverter2': Array.from(root.querySelectorAll('[data-arrow-shape="array-inverter2"]')),
      load: Array.from(root.querySelectorAll('[data-arrow-shape="load"]')),
      'windmill-inverter1': Array.from(root.querySelectorAll('[data-arrow-shape="windmill-inverter1"]')),
      'windmill-inverter2': Array.from(root.querySelectorAll('[data-arrow-shape="windmill-inverter2"]')),
      'house-load-inverter1': Array.from(root.querySelectorAll('[data-arrow-shape="house-load-inverter1"]')),
      'house-load-inverter2': Array.from(root.querySelectorAll('[data-arrow-shape="house-load-inverter2"]')),
      grid: Array.from(root.querySelectorAll('[data-arrow-shape="grid"]')),
      grid_house: Array.from(root.querySelectorAll('[data-arrow-shape="grid_house"]')),
      'grid-house': Array.from(root.querySelectorAll('[data-arrow-shape="grid-house"]')),
      'grid-feed': Array.from(root.querySelectorAll('[data-arrow-shape="grid-feed"], [data-arrow-shape="gird-feed"]')),
      'inverter1-import-export': Array.from(root.querySelectorAll('[data-arrow-shape="inverter1-import-export"], [data-arrow-shape="grid-import-export"]')),
      'inverter1-grid': Array.from(root.querySelectorAll('[data-arrow-shape="inverter1-grid"], [data-arrow-shape="inverter1-import-export"], [data-arrow-shape="grid-import-export"]')),
      'inverter2-import-export': Array.from(root.querySelectorAll('[data-arrow-shape="inverter2-import-export"]')),
      'inverter2-grid': Array.from(root.querySelectorAll('[data-arrow-shape="inverter2-grid"], [data-arrow-shape="inverter2-import-export"]')),
      'grid-import-export': Array.from(root.querySelectorAll('[data-arrow-shape="grid-import-export"], [data-arrow-shape="inverter1-import-export"]')),
      car1: Array.from(root.querySelectorAll('[data-arrow-shape="car1"]')),
      car2: Array.from(root.querySelectorAll('[data-arrow-shape="car2"]')),
      heatPump: Array.from(root.querySelectorAll('[data-arrow-shape="heatPump"]')),
      'inverter1-battery1': Array.from(root.querySelectorAll('[data-arrow-shape="inverter1-battery1"]')),
      'inverter1-battery2': Array.from(root.querySelectorAll('[data-arrow-shape="inverter1-battery2"]')),
      'inverter1-battery3': Array.from(root.querySelectorAll('[data-arrow-shape="inverter1-battery3"]')),
      'inverter1-battery4': Array.from(root.querySelectorAll('[data-arrow-shape="inverter1-battery4"]')),
      'inverter2-battery3': Array.from(root.querySelectorAll('[data-arrow-shape="inverter2-battery3"]')),
      'inverter2-battery4': Array.from(root.querySelectorAll('[data-arrow-shape="inverter2-battery4"]'))
    };
    this.card._domRefs.headlights = {
      car1: Array.from(root.querySelectorAll('[data-feature~="car1-headlights"]')),
      car2: Array.from(root.querySelectorAll('[data-feature~="car2-headlights"]'))
    };

    this.card._animationManager._logHeadlightDebug('cached headlight nodes', {
      car1Count: (this.card._domRefs.headlights.car1 || []).length,
      car2Count: (this.card._domRefs.headlights.car2 || []).length
    });

    if (this.card._domRefs && this.card._domRefs.flows) {
      this.card._animationManager.precomputePathLengths(this.card._domRefs.flows);
    }

  }

  _ensureArrowGroups(flows) {
    if (!this.card.shadowRoot || !flows) {
      return;
    }
    const svgRoot = this.card.shadowRoot.querySelector('svg');
    if (!svgRoot) {
      return;
    }
    const ns = 'http://www.w3.org/2000/svg';

    Object.entries(flows).forEach(([flowKey, element]) => {
      if (!element) {
        return;
      }

      const container = element.tagName === 'g' ? element : element.parentNode;
      if (!container || typeof container.querySelector !== 'function') {
        return;
      }

      // If already present, do nothing
      if (container.querySelector(`[data-arrow-key="${flowKey}"]`)) {
        return;
      }

      const paths = this.card._animationManager._getFlowGeometryPaths(element);
      if (!paths || paths.length === 0) {
        return;
      }

      const arrowGroup = document.createElementNS(ns, 'g');
      arrowGroup.setAttribute('class', 'flow-arrow');
      arrowGroup.setAttribute('data-arrow-key', flowKey);
      arrowGroup.style.opacity = '0';

      // Some flow paths (e.g. car1/car2 charge cables) carry their own
      // transform attribute. getPointAtLength() returns points in that
      // path's pre-transform space, so the sibling arrow group needs the
      // same transform to land in the same place on screen.
      if (element !== container) {
        const elementTransform = element.getAttribute && element.getAttribute('transform');
        if (elementTransform) {
          arrowGroup.setAttribute('transform', elementTransform);
        }
      }

      paths.forEach((path, trackIndex) => {
        for (let i = 0; i < FLOW_ARROW_COUNT; i++) {
          const poly = document.createElementNS(ns, 'polygon');
          poly.setAttribute('data-arrow-shape', flowKey);
          poly.setAttribute('data-arrow-index', String(i));
          poly.setAttribute('data-arrow-track', String(trackIndex));
          poly.setAttribute('points', '-8,-3 0,0 -8,3');
          poly.setAttribute('fill', '#00FFFF');
          arrowGroup.appendChild(poly);
        }
      });

      container.appendChild(arrowGroup);
    });
  }
}
