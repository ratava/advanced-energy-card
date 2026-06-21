export function ensureGoogleFont(fontFamily) {
  try {
    if (typeof document === 'undefined' || !document.head) {
      return;
    }

    const raw = (fontFamily === null || fontFamily === undefined) ? '' : String(fontFamily);
    if (!raw.trim()) {
      return;
    }

    // Use the first font in a CSS font-family list.
    const primary = raw.split(',')[0].trim();
    const unquoted = primary.replace(/^['\"]|['\"]$/g, '').trim();
    if (!unquoted) {
      return;
    }

    // Skip generic/system families.
    const generic = new Set([
      'serif',
      'sans-serif',
      'monospace',
      'cursive',
      'fantasy',
      'system-ui',
      'ui-serif',
      'ui-sans-serif',
      'ui-monospace',
      'ui-rounded',
      'emoji',
      'math',
      'fangsong'
    ]);
    if (generic.has(unquoted.toLowerCase())) {
      return;
    }

    // Best-effort Google Fonts CSS2 API. Avoid hardcoding weights so "any" font works.
    const familyParam = encodeURIComponent(unquoted).replace(/%20/g, '+');
    const href = `https://fonts.googleapis.com/css2?family=${familyParam}&display=swap`;

    // Make a stable key for dedupe.
    const key = unquoted.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!key) {
      return;
    }

    const selector = `link[data-advanced-font="${key}"]`;
    const existing = document.head.querySelector(selector);
    if (existing) {
      return;
    }

    const link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('href', href);
    link.dataset.advancedFont = key;
    document.head.appendChild(link);
  } catch (e) {
    // ignore
  }
}
