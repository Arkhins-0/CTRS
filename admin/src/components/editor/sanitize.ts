/**
 * The single HTML allowlist for editorial body HTML — used by the article
 * save action (bodyHtml cache) and the .docx import route so the two can
 * never drift apart. Server-side only (sanitize-html is a node package).
 */
import sanitizeHtml from "sanitize-html";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1",
    "h2",
    "h3",
    "h4",
    "p",
    "strong",
    "em",
    "u",
    "s",
    "a",
    "ul",
    "ol",
    "li",
    "blockquote",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "figure",
    "figcaption",
    "br",
    "hr",
  ],
  allowedAttributes: {
    a: ["href"],
    img: ["src", "alt"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https"],
  disallowedTagsMode: "discard",
};

export function sanitizeBodyHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
