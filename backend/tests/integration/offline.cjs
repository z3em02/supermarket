// Preloaded into the server that the database tests start (node --require):
// fetch() may only reach this machine. Geocoding (Photon, Nominatim, OSRM)
// then fails like it does when those services are down, and the delivery-fee
// code takes its offline fallback (postal-code centroids), so fees don't
// depend on outside services and nothing leaves the machine. Email, WhatsApp
// and push have no credentials in the test environment anyway (harness.cjs).
const realFetch = globalThis.fetch;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!LOCAL_HOSTS.has(url.hostname)) {
    return Promise.reject(new TypeError(`fetch failed (outbound network is blocked in tests: ${url.hostname})`));
  }
  return realFetch(input, init);
};
