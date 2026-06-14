import { SVG_LAYER_CONFIG, DEBUG_LAYER_NOSOLAR_ENABLED, DEBUG_LAYER_1ARRAY_ENABLED, DEBUG_LAYER_2ARRAY_ENABLED } from './loader.js';

export const getConfiguredCarCount = (config) => {
  const hasCar1 = Boolean(config && (config.sensor_car_power || config.sensor_car_soc));
  const hasCar2 = Boolean(config && (config.sensor_car2_power || config.sensor_car2_soc));
  return (hasCar1 ? 1 : 0) + (hasCar2 ? 1 : 0);
};

// Function to apply SVG layer visibility based on configuration
export function applySvgLayerVisibility(svgElement, config) {
  // console.log('=== SVG Layer Visibility Report ===');

  SVG_LAYER_CONFIG.forEach(layer => {
    let shouldShow = layer.condition ? layer.condition(config, svgElement) : Boolean(config[layer.configKey]);

    // Override with debug toggles if enabled
    if (layer.layerName === 'NoSolar' && DEBUG_LAYER_NOSOLAR_ENABLED) {
      shouldShow = true;
      // console.log(`🔧 DEBUG: Forcing NoSolar layer to show`);
    } else if (layer.layerName === '1Array' && DEBUG_LAYER_1ARRAY_ENABLED) {
      shouldShow = true;
      // console.log(`🔧 DEBUG: Forcing 1Array layer to show`);
    } else if (layer.layerName === '2Array' && DEBUG_LAYER_2ARRAY_ENABLED) {
      shouldShow = true;
      // console.log(`🔧 DEBUG: Forcing 2Array layer to show`);
    }

    // console.log(`${shouldShow ? '✅' : '❌'} Layer "${layer.layerName}" (${layer.svgSelector}): ${shouldShow ? 'VISIBLE' : 'HIDDEN'}`);

    const elements = svgElement.querySelectorAll(layer.svgSelector);

    elements.forEach((element, index) => {
      const wasVisible = element.style.display !== 'none';
      const willBeVisible = shouldShow;

      if (shouldShow) {
        element.style.display = element.dataset.originalDisplay || '';
        // Remove display:none if it was set
        if (element.style.display === 'none') {
          element.style.display = '';
        }
      } else {
        // Store original display value before hiding
        if (!element.dataset.originalDisplay) {
          const computedStyle = window.getComputedStyle(element);
          element.dataset.originalDisplay = computedStyle.display;
        }
        element.style.display = 'none';
      }

      const elementType = element.tagName.toLowerCase();
      const dataRole = element.getAttribute('data-role') || 'no-role';
      const dataLayer = element.getAttribute('data-layer') || 'no-layer';

      // console.log(`   ${index + 1}. <${elementType}> [data-role="${dataRole}"] [data-layer="${dataLayer}"]: ${wasVisible ? 'was visible' : 'was hidden'} → ${willBeVisible ? 'now visible' : 'now hidden'}`);
    });
  });

  // console.log('=== End Layer Visibility Report ===');

  // Log all SVG groups and their visibility status
  // console.log('=== All SVG Groups Status ===');
  const allGroups = svgElement.querySelectorAll('g');
  allGroups.forEach((group, index) => {
    const dataLayer = group.getAttribute('data-layer') || 'no-layer';
    const dataRole = group.getAttribute('data-role') || 'no-role';
    const display = group.style.display || window.getComputedStyle(group).display;
    const isVisible = display !== 'none';

    // console.log(`${index + 1}. <g> [data-layer="${dataLayer}"] [data-role="${dataRole}"]: ${isVisible ? 'VISIBLE' : 'HIDDEN'} (${display})`);
  });
  // console.log('=== End All SVG Groups Status ===');

  // Log all elements with data-role attributes
  // console.log('=== All Data-Role Elements Status ===');
  const allDataRoleElements = svgElement.querySelectorAll('[data-role]');
  allDataRoleElements.forEach((element, index) => {
    const dataRole = element.getAttribute('data-role');
    const tagName = element.tagName.toLowerCase();
    const display = element.style.display || window.getComputedStyle(element).display;
    const isVisible = display !== 'none';

    // console.log(`${index + 1}. <${tagName}> [data-role="${dataRole}"]: ${isVisible ? 'VISIBLE' : 'HIDDEN'} (${display})`);
  });
  // console.log('=== End All Data-Role Elements Status ===');

  // Configuration summary
  // console.log('=== Configuration Summary ===');
  const hasArray1PVStrings = config.sensor_pv1 || config.sensor_pv2 || config.sensor_pv3 ||
                            config.sensor_pv4 || config.sensor_pv5 || config.sensor_pv6;
  const hasArray1Total = config.sensor_pv_total;
  const hasArray1 = Boolean(hasArray1PVStrings || hasArray1Total);

  const hasArray2PVStrings = config.sensor_pv_array2_1 || config.sensor_pv_array2_2 || config.sensor_pv_array2_3 ||
                            config.sensor_pv_array2_4 || config.sensor_pv_array2_5 || config.sensor_pv_array2_6;
  const hasArray2Total = config.sensor_pv_total_secondary;
  const hasArray2 = Boolean(hasArray2PVStrings || hasArray2Total);

  const gridPowerOnly = Boolean(config.grid_power_only);
  const inverter1Active = !gridPowerOnly && (Boolean(config.sensor_grid_power)
    || (Boolean(config.sensor_grid_import) && Boolean(config.sensor_grid_export))
    || Boolean(config.sensor_windmill_total));
  const inverter2Active = !gridPowerOnly && (Boolean(config.sensor_grid2_power)
    || (Boolean(config.sensor_grid2_import) && Boolean(config.sensor_grid2_export)));

  const inverter1Nodes = svgElement.querySelectorAll('[data-role="inverter1"]');
  inverter1Nodes.forEach((node) => {
    if (!node || !node.style) {
      return;
    }
    node.style.opacity = inverter1Active ? '1' : '0';
  });

  const inverter2Nodes = svgElement.querySelectorAll('[data-role="inverter2"]');
  inverter2Nodes.forEach((node) => {
    if (!node || !node.style) {
      return;
    }
    node.style.opacity = inverter2Active ? '1' : '0';
  });

  const pv1Nodes = svgElement.querySelectorAll('[data-flow-key="pv1"]');
  const pv2Nodes = svgElement.querySelectorAll('[data-flow-key="pv2"]');
  const pv1Enabled = hasArray1 || hasArray2;
  const pv2Enabled = inverter2Active && hasArray2;

  pv1Nodes.forEach((node) => {
    if (!node || typeof node.setAttribute !== 'function' || typeof node.removeAttribute !== 'function') {
      return;
    }
    if (node.style) {
      node.style.opacity = pv1Enabled ? '1' : '0';
    }
  });

  pv2Nodes.forEach((node) => {
    if (!node || typeof node.setAttribute !== 'function' || typeof node.removeAttribute !== 'function') {
      return;
    }
    if (node.style) {
      node.style.opacity = pv2Enabled ? '1' : '0';
    }
  });

  const arrayInverter1Nodes = svgElement.querySelectorAll('[data-flow-key="array-inverter1"]');
  const arrayInverter2Nodes = svgElement.querySelectorAll('[data-flow-key="array-inverter2"]');

  arrayInverter1Nodes.forEach((node) => {
    if (!node || !node.style) {
      return;
    }
    node.style.opacity = (inverter1Active && !inverter2Active) ? '1' : '0';
  });

  arrayInverter2Nodes.forEach((node) => {
    if (!node || !node.style) {
      return;
    }
    node.style.opacity = inverter2Active ? '1' : '0';
  });

  // console.log(`Array 1 configured: ${hasArray1} (PV strings: ${!!hasArray1PVStrings}, Total sensor: ${!!hasArray1Total})`);
  // console.log(`Array 2 configured: ${hasArray2} (PV strings: ${!!hasArray2PVStrings}, Total sensor: ${!!hasArray2Total})`);
  // console.log(`Expected active layers: Base (always) + ${hasArray1 && hasArray2 ? '2Array' : hasArray1 ? '1Array' : 'NoSolar'}`);
  // console.log('=== End Configuration Summary ===');

  // Removed array->inverter flow debugging for deleted flow keys.
}
