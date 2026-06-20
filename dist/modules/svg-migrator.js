/**
 * SVG migration framework for advanced-energy-card.
 *
 * Rules are registered once (see SVG_MIGRATIONS at the bottom of this file).
 * Each rule describes how to detect an outdated SVG attribute pattern and
 * transform it in-place on the live DOM.
 *
 * Migrations run on every SVG load (transparent — the card always works with
 * any SVG version). When one or more rules apply, a persistent HA notification
 * is sent once per URL advising the user to download the migrated version from
 * the card editor and replace the original file.
 */

export class SvgMigrationRule {
  constructor({ id, description, detect, apply }) {
    this.id = id;
    this.description = description;
    this._detect = detect;
    this._apply = apply;
  }

  detect(svgRoot) {
    try { return Boolean(this._detect(svgRoot)); } catch (e) { return false; }
  }

  apply(svgRoot) {
    try { this._apply(svgRoot); } catch (e) { /* never break render */ }
  }
}

export class SvgMigrator {
  constructor() {
    this._rules = [];
  }

  /** Register a migration rule. Call this once at module load time. */
  addRule(rule) {
    this._rules.push(new SvgMigrationRule(rule));
    return this;
  }

  /** Returns the subset of rules whose detect() returns true for this SVG root. */
  getApplicableRules(svgRoot) {
    if (!svgRoot) return [];
    return this._rules.filter(r => r.detect(svgRoot));
  }

  /** Returns true if the SVG needs any migration. */
  needsMigration(svgRoot) {
    return this.getApplicableRules(svgRoot).length > 0;
  }

  /**
   * Apply all applicable rules to svgRoot in-place.
   * Returns the list of rules that were applied (empty if nothing needed doing).
   */
  applyToDOM(svgRoot) {
    const applicable = this.getApplicableRules(svgRoot);
    if (applicable.length === 0) {
      console.log('[AEC SvgMigrator] No migrations needed for this SVG (tag:', svgRoot?.tagName, ')');
    } else {
      console.log('[AEC SvgMigrator] Applying', applicable.length, 'migration(s):', applicable.map(r => r.id));
      applicable.forEach(r => {
        console.log('[AEC SvgMigrator]  →', r.id);
        r.apply(svgRoot);
      });
      console.log('[AEC SvgMigrator] Done. Verifying first rule detect():', this._rules[0]?.detect(svgRoot));
    }
    return applicable;
  }

  /** Serialize an SVG element to a string. */
  serializeSvg(svgRoot) {
    try {
      return new XMLSerializer().serializeToString(svgRoot);
    } catch (e) {
      return null;
    }
  }

  /**
   * Fetch the SVG at svgUrl, apply all migration rules, and return a blob
   * download URL pointing at the migrated content.
   * Caller must call URL.revokeObjectURL() when finished.
   */
  async getMigratedDownloadUrl(svgUrl) {
    const response = await fetch(svgUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status} loading ${svgUrl}`);
    const text = await response.text();
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) throw new Error(`SVG parse error: ${parserError.textContent}`);
    const svgRoot = doc.documentElement;
    this.applyToDOM(svgRoot);
    const serialized = this.serializeSvg(svgRoot);
    if (!serialized) throw new Error('SVG serialization failed');
    const blob = new Blob([serialized], { type: 'image/svg+xml' });
    return URL.createObjectURL(blob);
  }

  /**
   * Trigger a browser download of the migrated SVG (re-fetches and re-applies rules).
   * Cleans up the blob URL automatically after 10 s.
   */
  async triggerDownload(svgUrl) {
    const blobUrl = await this.getMigratedDownloadUrl(svgUrl);
    const filename = (svgUrl.split('/').pop() || 'migrated.svg').replace(/[?#].*$/, '');
    this._dispatchDownload(blobUrl, filename);
  }

  /**
   * Trigger a browser download from an already-migrated in-memory SVG element.
   * Use this to avoid a second fetch when the element is already available.
   */
  async triggerDownloadFromElement(svgElement, filename) {
    const serialized = this.serializeSvg(svgElement);
    if (!serialized) throw new Error('SVG serialization failed');
    const blob = new Blob([serialized], { type: 'image/svg+xml' });
    const blobUrl = URL.createObjectURL(blob);
    this._dispatchDownload(blobUrl, filename || 'migrated.svg');
  }

  _dispatchDownload(blobUrl, filename) {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => { try { URL.revokeObjectURL(blobUrl); } catch (e) { /* ignore */ } }, 10000);
  }

  /** Human-readable list of changes that would be applied to this SVG. */
  getMigrationSummary(svgRoot) {
    return this.getApplicableRules(svgRoot).map(r => r.description);
  }
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Singleton — import SVG_MIGRATOR and call .addRule() to register migrations.
// Rules are defined here so they are registered exactly once at module load.
//
// SVG_MIGRATION_PENDING: module-level map of svgUrl → appliedRuleIds[].
// render-manager populates it when migrations are applied; card-editor reads it
// to show a "Download Migrated SVG" button.
// ---------------------------------------------------------------------------

export const SVG_MIGRATOR = new SvgMigrator();

/** svgUrl → string[] of applied rule IDs. Populated by render-manager on load. */
export const SVG_MIGRATION_PENDING = new Map();

// ── Migration rules ──────────────────────────────────────────────────────────
// Rules are order-independent and idempotent (detect() must return false after apply() runs).

// Elements that must carry data-style="config-right" (right-aligned static text labels).
// Applies to tech-profile SVGs and custom SVGs based on tech.
const _CONFIG_RIGHT_ROLES = [
  'grid-current-power-text', 'grid-daily-import-text', 'grid-daily-export-text',
  'pool-power-text', 'house-load-text',
];

SVG_MIGRATOR.addRule({
  id: 'tech-data-style-config-right-v2',
  description: 'Set data-style="config-right" on right-aligned text label elements (grid/pool/house-load)',
  detect(svgRoot) {
    const profileId = svgRoot.getAttribute('data-profile-id');
    // Skip if explicitly set to a non-tech profile (e.g. "overview").
    if (profileId && !profileId.startsWith('tech')) return false;
    return _CONFIG_RIGHT_ROLES.some(role => {
      const el = svgRoot.querySelector(`[data-role="${role}"]`);
      return el !== null && el.getAttribute('data-style') !== 'config-right';
    });
  },
  apply(svgRoot) {
    _CONFIG_RIGHT_ROLES.forEach(role => {
      const el = svgRoot.querySelector(`[data-role="${role}"]`);
      if (el) el.setAttribute('data-style', 'config-right');
    });
  },
});

// Elements that must carry data-style="config-center" (explicitly centred dynamic values).
// Previously these used the bare "config" value; v2.0 requires explicit "config-center".
const _CONFIG_CENTER_ROLES = [
  'windmill-power',
  'car1-name', 'car2-name', 'car1-soc', 'car2-soc', 'car1-power', 'car2-power',
  'battery1-soc', 'battery2-soc', 'battery3-soc', 'battery4-soc',
  'battery1-power', 'battery2-power', 'battery3-power', 'battery4-power',
  'dishwasher-power', 'freezer-power', 'refrigerator-power',
  'washing-machine-power', 'dryer-power',
  'hot-water-power', 'heat-pump-power',
];

SVG_MIGRATOR.addRule({
  id: 'tech-data-style-config-center-v2',
  description: 'Set data-style="config-center" on centred dynamic value elements (was bare "config" in v1.x)',
  detect(svgRoot) {
    const profileId = svgRoot.getAttribute('data-profile-id');
    // Skip if explicitly set to a non-tech profile (e.g. "overview").
    if (profileId && !profileId.startsWith('tech')) return false;
    return _CONFIG_CENTER_ROLES.some(role => {
      const el = svgRoot.querySelector(`[data-role="${role}"]`);
      return el !== null && el.getAttribute('data-style') !== 'config-center';
    });
  },
  apply(svgRoot) {
    _CONFIG_CENTER_ROLES.forEach(role => {
      const el = svgRoot.querySelector(`[data-role="${role}"]`);
      if (el) el.setAttribute('data-style', 'config-center');
    });
  },
});
