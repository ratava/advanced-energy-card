// Constants relocated to ./constants.js (sibling import avoids the cross-
// boundary `../advanced-energy-card.js` re-export that caused double module
// evaluation under HACS cache-busting query strings).
export {
  GEOMETRY,
  SVG_LAYER_CONFIG,
  DEBUG_LAYER_NOSOLAR_ENABLED,
  DEBUG_LAYER_1ARRAY_ENABLED,
  DEBUG_LAYER_2ARRAY_ENABLED,
  LEGACY_CAR_VISIBILITY_KEYS,
  LEGACY_DEPRECATED_KEYS,
} from './constants.js';

// Tier-1 utility classes, re-exported for Tier-2 modules
export { LocalizationManager } from './localization-manager.js';
export { SecurityHelpers } from './security.js';
