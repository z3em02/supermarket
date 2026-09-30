// Optional error tracking with Sentry (README §4.8). Off unless SENTRY_DSN is
// set, and then @sentry/node isn't even loaded. When on, every console.error()
// that carries an Error (every controller's catch block, the global error
// handler) and every crash is reported, after utils/errorEvents.js has
// stripped personal data. Backend only: customers' browsers never talk to
// Sentry.
//
// server.js requires this before express: the SDK has to instrument Node's
// http module before anything uses it, or errors lose their request context.
let Sentry = null;

if (process.env.SENTRY_DSN) {
  Sentry = require('@sentry/node');
  const { scrubErrorEvent } = require('../utils/errorEvents');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    sendDefaultPii: false,
    // Errors only: no tracesSampleRate, so no performance tracing.
    integrations: [Sentry.captureConsoleIntegration({ levels: ['error'] })],
    beforeBreadcrumb: () => null,
    beforeSend: scrubErrorEvent
  });
}

// Tags errors from the current request with its X-Request-Id (the SDK keeps a
// separate scope per incoming request).
const setRequestId = (id) => {
  if (Sentry) Sentry.getIsolationScope().setTag('request_id', id);
};

// Sends reports still queued; called on shutdown. Waits at most 2 s.
const flush = async () => {
  if (Sentry) await Sentry.close(2000).catch(() => {});
};

module.exports = { enabled: Boolean(Sentry), setRequestId, flush };
