// Single source of truth for the admin section's base path. Kept out of the
// obvious "/admin" or "/secret/admin" naming to avoid automated bot scans —
// note this is NOT real secrecy: it's a client-side route, so the exact
// string ships inside the downloadable JS bundle for anyone who looks. The
// actual protection is backend auth (password + 2FA + session), not this.
export const ADMIN_BASE = '/console-eb68a2f3';
