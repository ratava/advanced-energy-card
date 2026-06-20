import { SecurityHelpers, LEGACY_CAR_VISIBILITY_KEYS, LEGACY_DEPRECATED_KEYS, GENERAL_CONFIG_KEYS } from './loader.js';

/**
 * Configuration Validator
 * Handles validation, normalization, and migration of card configuration
 */
export class ConfigValidator {
  /**
   * Validate and process configuration
   * @param {object} config - Raw configuration object
   * @param {object} defaults - Default configuration values
   * @returns {object} Validated and normalized configuration
   */
  static validate(config, defaults = {}) {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid configuration');
    }
    
    const migrated = this.migrate(config);
    const sanitized = this.stripLegacyKeys(migrated);
    const normalized = this.normalize(sanitized);
    const secured = this.securityValidate(normalized);
    
    return { ...defaults, ...secured };
  }

  /**
   * Apply security validation to configuration values
   * @param {object} config - Configuration to validate
   * @returns {object} Security-validated configuration
   */
  static securityValidate(config) {
    if (!config || typeof config !== 'object') {
      return config;
    }

    const result = { ...config };

    // Validate background URLs
    const bgFields = ['background'];
    bgFields.forEach(field => {
      if (result[field]) {
        const validation = SecurityHelpers.validateUrl(result[field]);
        if (!validation.valid) {
          console.warn(`Invalid ${field} URL, removing:`, validation.error);
          delete result[field];
        } else if (validation.sanitized !== result[field]) {
          result[field] = validation.sanitized;
        }
      }
    });

    // Validate color fields
    const colorFields = [
      'solar_color', 'grid_color', 'home_color', 'battery_color',
      'car_color', 'car2_color', 'car_name_color', 'car2_name_color',
      'car_pct_color', 'car2_pct_color', 'heat_pump_color',
      'battery_fill_high_color', 'battery_fill_low_color'
    ];
    
    colorFields.forEach(field => {
      if (result[field]) {
        const validation = SecurityHelpers.validateConfigValue(result[field], 'color');
        if (!validation.valid) {
          console.warn(`Invalid ${field} color format, removing`);
          delete result[field];
        }
      }
    });

    // Validate numeric fields with reasonable bounds
    const numericFields = [
      { key: 'update_interval', min: 0, max: 3600000 }, // max 1 hour
      { key: 'battery_low_threshold', min: 0, max: 100 },
      { key: 'solar_font_size', min: 1, max: 200 },
      { key: 'grid_font_size', min: 1, max: 200 },
      { key: 'home_font_size', min: 1, max: 200 },
      { key: 'battery_font_size', min: 1, max: 200 },
      { key: 'car_name_font_size', min: 1, max: 200 },
      { key: 'car_power_font_size', min: 1, max: 200 },
      { key: 'car2_name_font_size', min: 1, max: 200 },
      { key: 'car2_power_font_size', min: 1, max: 200 }
    ];

    numericFields.forEach(({ key, min, max }) => {
      if (result[key] !== undefined && result[key] !== null) {
        const validation = SecurityHelpers.validateConfigValue(result[key], 'number', { min, max });
        if (!validation.valid) {
          console.warn(`Invalid ${key} value, resetting to default`);
          delete result[key];
        }
      }
    });

    // Validate string fields for length (prevent DoS via long strings)
    const stringFields = [
      'title', 'solar_label', 'grid_label', 'home_label', 'battery_label',
      'car_label', 'car2_label', 'heat_pump_label'
    ];
    
    stringFields.forEach(field => {
      if (result[field]) {
        const validation = SecurityHelpers.validateConfigValue(result[field], 'string', { maxLength: 500 });
        if (!validation.valid) {
          console.warn(`String too long for ${field}, truncating`);
          result[field] = String(result[field]).substring(0, 500);
        }
      }
    });

    // Sanitize CSS fields
    if (result.card_label_css) {
      result.card_label_css = SecurityHelpers.sanitizeLabelCss(result.card_label_css);
    }
    if (result.card_value_css) {
      result.card_value_css = SecurityHelpers.sanitizeLabelCss(result.card_value_css);
    }

    // Prevent prototype pollution by checking for dangerous own-property keys
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    dangerousKeys.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        delete result[key];
        console.warn(`Removed dangerous configuration key: ${key}`);
      }
    });

    return result;
  }

  /**
   * Migrate legacy configuration keys to new format
   * @param {object} config - Configuration to migrate
   * @returns {object} Migrated configuration
   */
  static migrate(config) {
    if (!config || typeof config !== 'object') {
      return config;
    }

    let result = { ...config };

    // Consolidate background_day/background_night/background_image into a single background key
    result = this._consolidateBackground(result);

    // Migrate background filenames
    result = this._migrateBackgroundFilenames(result);

    // Initialize per-profile storage for the SVG-aware configuration system
    result = this._initProfileStorage(result);

    // Move all profile-scoped top-level keys into _profiles[snapshotKey]
    result = this._migrateToProfileStorage(result);

    return result;
  }

  /**
   * Consolidate legacy background_day/background_night/background_image keys into a
   * single `background` key. Day/night appearance is now driven entirely by data-roles
   * inside the chosen SVG, so a single background selection is sufficient.
   * @private
   */
  static _consolidateBackground(config) {
    if (!config || typeof config !== 'object') {
      return config;
    }
    const hasLegacy = config.background_day !== undefined
      || config.background_night !== undefined
      || config.background_image !== undefined;
    if (!hasLegacy && config.background !== undefined) {
      return config;
    }
    const next = { ...config };
    next.background = config.background || config.background_day || config.background_night
      || config.background_image || '/local/community/advanced-energy-card/tech.svg';
    delete next.background_day;
    delete next.background_night;
    delete next.background_image;
    return next;
  }

  /**
   * Initialize storage for the SVG-aware configuration profile system.
   * @private
   */
  static _initProfileStorage(config) {
    if (config._profiles && typeof config._profiles === 'object') {
      return config;
    }
    return { ...config, _profiles: {}, _profile_basis: {} };
  }

  /**
   * Move all profile-scoped top-level keys into _profiles[snapshotKey].
   * Idempotent: skips if any profile snapshot already has entries.
   * @private
   */
  static _migrateToProfileStorage(config) {
    if (!config || typeof config !== 'object') return config;

    // Idempotency: if any profile snapshot already has entries, migration was already done
    const profiles = config._profiles;
    if (profiles && typeof profiles === 'object') {
      const alreadyMigrated = Object.values(profiles).some(
        v => v && typeof v === 'object' && Object.keys(v).length > 0
      );
      if (alreadyMigrated) return config;
    }

    // Determine profileId from background URL using filename heuristic (sync)
    const bg = (config.background || '').trim();
    let profileId = 'tech';
    if (bg.endsWith('/overview.svg') || bg === 'overview.svg') {
      profileId = 'overview';
    }

    // Compute snapshotKey: built-ins use bare profileId, custom SVGs use <type>-<filename>
    const builtinFile = profileId + '.svg';
    let snapshotKey;
    if (!bg || bg.endsWith('/' + builtinFile) || bg === builtinFile) {
      snapshotKey = profileId;
    } else {
      const filename = bg.split('/').pop()
        .replace(/\.svg$/i, '')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/^_+|_+$/g, '') || 'unknown';
      snapshotKey = `${profileId}-${filename}`;
    }

    // Partition top-level keys: general + metadata stay top-level, rest go into snapshot
    const META_KEYS = new Set(['type', '_profiles', '_profile_basis']);
    const snapshot = {};
    const next = {};

    for (const [key, value] of Object.entries(config)) {
      if (META_KEYS.has(key) || GENERAL_CONFIG_KEYS.has(key)) {
        next[key] = value;
      } else {
        snapshot[key] = value;
      }
    }

    // Store the snapshot and update _profiles
    next._profiles = { ...(config._profiles || {}), [snapshotKey]: snapshot };

    // Migrate _profile_basis keys from old 'custom:xxx' format to new '<type>-<filename>' format
    const oldBasis = config._profile_basis || {};
    const newBasis = {};
    for (const [k, v] of Object.entries(oldBasis)) {
      if (k.startsWith('custom:')) {
        const oldFilename = k.slice('custom:'.length);
        const normalized = oldFilename.replace(/\.svg$/i, '').toLowerCase()
          .replace(/[^a-z0-9_-]/g, '_').replace(/^_+|_+$/g, '') || 'unknown';
        const basisId = typeof v === 'string' ? v : 'tech';
        newBasis[`${basisId}-${normalized}`] = v;
      } else {
        newBasis[k] = v;
      }
    }
    next._profile_basis = newBasis;

    return next;
  }

  /**
   * Strip deprecated/legacy configuration keys
   * @param {object} config - Configuration to sanitize
   * @returns {object} Sanitized configuration
   */
  static stripLegacyKeys(config) {
    if (!config || typeof config !== 'object') {
      return config;
    }
    
    let sanitized = null;
    
    // Remove legacy car visibility keys
    LEGACY_CAR_VISIBILITY_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(config, key)) {
        if (!sanitized) {
          sanitized = { ...config };
        }
        delete sanitized[key];
      }
    });
    
    // Remove deprecated config keys
    LEGACY_DEPRECATED_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(config, key)) {
        if (!sanitized) {
          sanitized = { ...config };
        }
        delete sanitized[key];
      }
    });
    
    return sanitized || config;
  }

  /**
   * Normalize configuration values
   * @param {object} config - Configuration to normalize
   * @returns {object} Normalized configuration
   */
  static normalize(config) {
    if (!config || typeof config !== 'object') {
      return config;
    }

    return { ...config };
  }

  /**
   * Migrate old background filename references to new names
   * @private
   */
  static _migrateBackgroundFilenames(config) {
    const next = { ...config };

    const replaceFilename = (value, from, to) => {
      if (typeof value !== 'string') {
        return value;
      }
      const trimmed = value.trim();
      if (!trimmed) {
        return value;
      }
      if (trimmed === from) {
        return to;
      }
      const suffix = `/${from}`;
      if (trimmed.endsWith(suffix)) {
        return trimmed.slice(0, -from.length) + to;
      }
      if (trimmed.includes(from)) {
        return trimmed.replace(from, to);
      }
      return value;
    };

    next.background = replaceFilename(next.background, 'advanced-new-day.svg', 'advanced-modern-day.svg');
    next.background = replaceFilename(next.background, 'advanced-new-night.svg', 'advanced-modern-night.svg');

    return next;
  }
}
