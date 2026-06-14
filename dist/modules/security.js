// Security Helpers
export const SecurityHelpers = {
  /**
   * Sanitize SVG content to prevent XSS attacks
   * Removes dangerous elements and attributes
   */
  sanitizeSvg(svgText) {
    if (typeof svgText !== 'string' || !svgText.trim()) {
      return '';
    }

    // List of dangerous tags that should be removed
    const dangerousTags = [
      'script', 'iframe', 'object', 'embed', 'link', 'style',
      'meta', 'base', 'form', 'input', 'button', 'textarea'
    ];

    // List of dangerous attributes that should be removed
    const dangerousAttrs = [
      'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
      'onmouseenter', 'onmouseleave', 'onfocus', 'onblur', 'onchange',
      'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress', 'ontouchstart',
      'ontouchmove', 'ontouchend'
    ];

    // Parse SVG
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    
    // Check for parse errors
    const parserError = svgDoc.querySelector('parsererror');
    if (parserError) {
      console.error('SVG parsing error:', parserError.textContent);
      return '';
    }

    const svgElement = svgDoc.documentElement;
    if (!svgElement || svgElement.tagName.toLowerCase() !== 'svg') {
      console.error('Invalid SVG: root element is not <svg>');
      return '';
    }

    // Remove dangerous elements
    dangerousTags.forEach(tag => {
      const elements = svgElement.querySelectorAll(tag);
      elements.forEach(el => {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    });

    // Remove dangerous attributes from all elements
    const allElements = svgElement.querySelectorAll('*');
    allElements.forEach(el => {
      // Remove event handler attributes
      dangerousAttrs.forEach(attr => {
        if (el.hasAttribute(attr)) {
          el.removeAttribute(attr);
        }
      });

      // Sanitize href and xlink:href to prevent javascript: URLs
      ['href', 'xlink:href'].forEach(attrName => {
        const attrValue = el.getAttribute(attrName);
        if (attrValue && typeof attrValue === 'string') {
          const trimmed = attrValue.trim().toLowerCase();
          if (trimmed.startsWith('javascript:') ||
              trimmed.startsWith('data:') ||
              trimmed.startsWith('vbscript:')) {
            el.removeAttribute(attrName);
          }
        }
      });
    });

    // Return sanitized SVG as string
    return new XMLSerializer().serializeToString(svgElement);
  },

  /**
   * Validate URL to ensure it's from a trusted source
   * Only allows relative paths, http/https, and local file references
   */
  validateUrl(url, allowedOrigins = []) {
    if (typeof url !== 'string' || !url.trim()) {
      return { valid: false, error: 'Empty or invalid URL' };
    }

    const trimmed = url.trim();

    // Allow relative paths
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      return { valid: true, sanitized: trimmed };
    }

    // Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
    const lowerUrl = trimmed.toLowerCase();
    for (const protocol of dangerousProtocols) {
      if (lowerUrl.startsWith(protocol)) {
        return { valid: false, error: `Blocked dangerous protocol: ${protocol}` };
      }
    }

    // Validate HTTP/HTTPS URLs
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const parsedUrl = new URL(trimmed);
        
        // If allowed origins specified, check against them
        if (allowedOrigins.length > 0) {
          const origin = parsedUrl.origin.toLowerCase();
          const allowed = allowedOrigins.some(allowed => 
            origin === allowed.toLowerCase() || 
            origin.endsWith('.' + allowed.toLowerCase())
          );
          
          if (!allowed) {
            return { valid: false, error: 'URL origin not in allowed list' };
          }
        }

        return { valid: true, sanitized: parsedUrl.href };
      } catch (e) {
        return { valid: false, error: `Invalid URL: ${e.message}` };
      }
    }

    // Allow unqualified paths (no protocol)
    if (!trimmed.includes(':')) {
      return { valid: true, sanitized: trimmed };
    }

    return { valid: false, error: 'Unrecognized URL format' };
  },

  /**
   * Sanitize text content for safe DOM insertion
   * Escapes HTML/SVG special characters
   */
  sanitizeText(text) {
    if (typeof text !== 'string') {
      return String(text || '');
    }
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Escape HTML/SVG text for safe inclusion in templates
   * Use when building HTML/SVG strings with user-provided content
   */
  escapeHtml(text) {
    if (typeof text !== 'string') {
      return String(text || '');
    }
    
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return text.replace(/[&<>"'\/]/g, char => escapeMap[char]);
  },

  /**
   * Validate configuration value against expected type and constraints
   */
  validateConfigValue(value, type, constraints = {}) {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') return { valid: false };
        if (constraints.maxLength && value.length > constraints.maxLength) {
          return { valid: false, error: 'String too long' };
        }
        if (constraints.pattern && !constraints.pattern.test(value)) {
          return { valid: false, error: 'Pattern mismatch' };
        }
        return { valid: true, sanitized: value };

      case 'number':
        const num = Number(value);
        if (!Number.isFinite(num)) return { valid: false };
        if (constraints.min !== undefined && num < constraints.min) {
          return { valid: false, error: 'Below minimum' };
        }
        if (constraints.max !== undefined && num > constraints.max) {
          return { valid: false, error: 'Above maximum' };
        }
        return { valid: true, sanitized: num };

      case 'boolean':
        return { valid: true, sanitized: Boolean(value) };

      case 'color':
        if (typeof value !== 'string') return { valid: false };
        // Allow hex colors, rgb/rgba, hsl/hsla, and named colors
        const colorPattern = /^(#[0-9A-Fa-f]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|[a-z]+)$/i;
        if (!colorPattern.test(value.trim())) {
          return { valid: false, error: 'Invalid color format' };
        }
        return { valid: true, sanitized: value.trim() };

      default:
        return { valid: true, sanitized: value };
    }
  },

  /**
   * Sanitize and validate a CSS declaration string intended for SVG text/label elements.
   * Only allows a safe whitelist of text-styling properties.
   * Strips dangerous patterns (expression(), url(), javascript:, etc.).
   * Returns a cleaned semicolon-separated declaration string, or '' if nothing valid remains.
   */
  sanitizeLabelCss(cssText) {
    if (typeof cssText !== 'string' || !cssText.trim()) return '';

    // Strip CSS comments
    const stripped = cssText.replace(/\/\*[\s\S]*?\*\//g, '');

    // Patterns that make a value dangerous regardless of property
    const dangerousValue = [
      /expression\s*\(/i,
      /javascript\s*:/i,
      /vbscript\s*:/i,
      /behavior\s*:/i,
      /-moz-binding/i,
      /@import/i,
      /<[a-z]/i,
      /&[a-z#]/i,
      /url\s*\(/i,
    ];

    // Safe properties for SVG text / label styling
    const allowed = new Set([
      'font-weight', 'font-style', 'font-variant', 'font-stretch',
      'letter-spacing', 'word-spacing', 'line-height',
      'text-decoration', 'text-decoration-line', 'text-decoration-style', 'text-decoration-color',
      'text-transform', 'text-shadow',
      'opacity', 'visibility',
      'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap',
      'fill-opacity', 'paint-order',
      'dominant-baseline', 'alignment-baseline', 'baseline-shift',
      'direction', 'writing-mode',
      'white-space', 'overflow',
    ]);

    const valid = [];
    stripped.split(';').forEach(decl => {
      const colon = decl.indexOf(':');
      if (colon <= 0) return;
      const prop = decl.substring(0, colon).trim().toLowerCase();
      const val  = decl.substring(colon + 1).trim();
      if (!prop || !val || val.length > 200) return;
      if (!allowed.has(prop)) return;
      for (const pattern of dangerousValue) {
        if (pattern.test(val)) return;
      }
      valid.push(`${prop}: ${val}`);
    });

    return valid.join('; ');
  }
};

// Rate Limiter for resource loading
export const ResourceRateLimiter = {
  requests: new Map(),
  
  /**
   * Check if a resource request should be allowed based on rate limiting
   */
  checkLimit(resourceKey, maxRequests = 10, windowMs = 60000) {
    const now = Date.now();
    const existing = this.requests.get(resourceKey) || [];
    
    // Remove old requests outside the time window
    const recent = existing.filter(timestamp => now - timestamp < windowMs);
    
    if (recent.length >= maxRequests) {
      return false;
    }
    
    recent.push(now);
    this.requests.set(resourceKey, recent);
    return true;
  },
  
  /**
   * Clear rate limit for a resource
   */
  clearLimit(resourceKey) {
    this.requests.delete(resourceKey);
  }
};
