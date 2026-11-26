import sanitizeHtml from 'sanitize-html';

const sanitizeOptions = {
  allowedTags: [
    'a', 'blockquote', 'br', 'code', 'em', 'h2', 'h3', 'h4',
    'li', 'ol', 'p', 'pre', 'strong', 'ul',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
  },
};

export function sanitizeRichText(html) {
  return sanitizeHtml(html, sanitizeOptions);
}
