// Strips personal data from an error-tracking (Sentry) event before it leaves
// the server (lib/errorTracking.js uses it as beforeSend). Pure, so it's
// unit-tested (tests/errorEvents.test.js). What's left: the error message
// (masked), the stack trace, method + path of the request, the request id.

const MAX_TEXT = 500;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// "+43 660 1234567", "0660/1234567", "004366012345…": + or 0, then 7+ digits
// with optional spaces, dashes or slashes; not part of a word or a UUID.
const PHONE = /(?<![\w-])(?:\+|0)\d(?:[\s/-]?\d){6,}(?![\w-])/g;

// Masks email addresses and phone numbers, and keeps only the first and last
// line of a multi-line message: Prisma prints the query's arguments (the
// data) in the lines between. Capped at MAX_TEXT characters.
const scrubText = (text) => {
  if (typeof text !== 'string') return text;
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const kept = lines.length > 2 ? [lines[0], '…', lines[lines.length - 1]] : lines;
  const masked = kept.join('\n').replace(EMAIL, '[email]').replace(PHONE, '[phone]');
  return masked.length > MAX_TEXT ? `${masked.slice(0, MAX_TEXT)}…` : masked;
};

const withoutQuery = (url) => (typeof url === 'string' ? url.split(/[?#]/)[0] : url);

const scrubErrorEvent = (event) => {
  // Request: method and path only. No query string (search terms), headers,
  // cookies or body.
  if (event.request) {
    event.request = { method: event.request.method, url: withoutQuery(event.request.url) };
  }
  delete event.user; // IP address, if the SDK ever adds one
  delete event.breadcrumbs; // earlier log lines and outgoing URLs (geocoding has addresses in them)

  if (typeof event.message === 'string') event.message = scrubText(event.message);
  if (event.logentry) {
    event.logentry = { message: scrubText(event.logentry.formatted || event.logentry.message) };
  }
  for (const exception of event.exception?.values || []) {
    exception.value = scrubText(exception.value);
    for (const frame of exception.stacktrace?.frames || []) delete frame.vars;
  }

  // captureConsole attaches every console.error argument; keep just the text.
  if (event.extra) {
    const args = Array.isArray(event.extra.arguments) ? event.extra.arguments : [];
    const text = args.filter((arg) => typeof arg === 'string').join(' ');
    event.extra = text ? { log: scrubText(text) } : {};
  }
  return event;
};

module.exports = { scrubErrorEvent, scrubText };
