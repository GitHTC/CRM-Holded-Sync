/**
 * Decodes HTML entities iteratively (up to 3 passes) so double-encoded or triple-encoded
 * HTML strings from Holded (e.g. "&lt;p&gt;Texto&lt;/p&gt;") become actual HTML strings.
 */
export function decodeHtmlEntities(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let current = input;
  for (let i = 0; i < 3; i++) {
    if (!current.includes('&')) break;
    const prev = current;
    current = current
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/&amp;/gi, '&');
    if (current === prev) break;
  }
  return current;
}

/**
 * Converts any HTML (including entity-encoded HTML) into clean, readable plain text
 * preserving line breaks and bullet points, with zero HTML tags remaining.
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  try {
    const decoded = decodeHtmlEntities(html);

    // Pre-format block elements and list items so textContent preserves structure
    const structured = decoded
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\s*\/p\s*>/gi, '\n')
      .replace(/<\s*\/div\s*>/gi, '\n')
      .replace(/<\s*\/h[1-6]\s*>/gi, '\n')
      .replace(/<\s*li[^>]*>/gi, '• ')
      .replace(/<\s*\/li\s*>/gi, '\n');

    let text = structured.replace(/<[^>]+>/g, '');

    return text
      .replace(/\u00A0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch {
    return html.replace(/<[^>]+>/g, '').trim();
  }
}

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'span', 'div', 'a', 'hr'
]);

/**
 * Decodes and sanitizes HTML from Holded task/project descriptions so it can be
 * safely rendered visually without exposing raw HTML tags or unsafe scripts.
 */
export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  try {
    const decoded = decodeHtmlEntities(rawHtml).trim();
    if (!decoded) return '';

    const hasTags = /<\s*[a-z!/?][\s\S]*?>/i.test(decoded);
    if (!hasTags) {
      // Plain text: escape HTML entities and convert newlines to <br />
      const escaped = decoded
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return escaped.replace(/\r?\n/g, '<br />');
    }

    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
      return decoded.replace(/<script[\s\S]*?<\/script>/gi, '');
    }

    const doc = new DOMParser().parseFromString(decoded, 'text/html');

    const cleanNode = (node: Node): void => {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          const tag = el.tagName.toLowerCase();

          if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object' || tag === 'embed') {
            el.remove();
            continue;
          }

          if (!ALLOWED_TAGS.has(tag)) {
            // Unwrap unknown tag while keeping its children
            while (el.firstChild) {
              node.insertBefore(el.firstChild, el);
            }
            el.remove();
            continue;
          }

          // Strip unsafe attributes
          const attrs = Array.from(el.attributes);
          for (const attr of attrs) {
            const name = attr.name.toLowerCase();
            if (tag === 'a' && name === 'href') {
              const val = attr.value.trim();
              if (/^javascript:/i.test(val) || /^data:/i.test(val)) {
                el.removeAttribute(attr.name);
              } else {
                el.setAttribute('target', '_blank');
                el.setAttribute('rel', 'noopener noreferrer');
              }
            } else {
              el.removeAttribute(attr.name);
            }
          }

          cleanNode(el);
        } else if (child.nodeType === Node.COMMENT_NODE) {
          child.remove();
        }
      }
    };

    cleanNode(doc.body);

    // Remove empty trailing paragraphs like <p><br></p> or <p></p>
    let result = doc.body.innerHTML
      .replace(/(?:<p>\s*(?:<br\s*\/?>|\u00A0|\s)*\s*<\/p>\s*)+$/gi, '')
      .replace(/^(?:\s*<p>\s*(?:<br\s*\/?>|\u00A0|\s)*\s*<\/p>)+/gi, '')
      .trim();

    return result;
  } catch {
    return stripHtml(rawHtml);
  }
}
