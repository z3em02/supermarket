// StoreSettings defaults and the public field list, shared by the settings,
// Google-review and section-PIN controllers.

// String(null) / String(undefined) produce the literal text "null"/"undefined",
// which then reads back as a truthy, non-empty value forever — treat any
// nullish or already-corrupted "null" string as empty instead of stringifying it.
const cleanString = (value) => (value == null || value === 'null' || value === 'undefined') ? '' : String(value).trim();

const DEFAULT_SETTINGS = {
  id: 'default',
  storeName: 'Hajar Supermarkt',
  storeNameDe: 'Hajar Supermarkt',
  storeNameAr: 'سوبرماركت هاجر',
  logoUrl: '',
  phone: '+49 123 4567890',
  email: 'info@hajar-supermarkt.de',
  address: 'Musterstraße 123, 10115 Berlin',
  mapUrl: 'https://maps.google.com',
  mapEmbedUrl: '',
  googleReviewsUrl: '',
  googleRating: 5.0,
  googleReviewCount: 0,
  googlePlaceId: '',
  googleApiKey: '',
  showGoogleReviews: true,
  minOrderValue: 0,
  deliveryFee: 2.0,
  deliveryFeePerKm: 0.10,
  freeDeliveryThreshold: 0,
  storeLatitude: 48.1746605,
  storeLongitude: 16.3272662,
  maxDeliveryDistanceKm: 0,
  allowedPostalCodes: '',
  legalOwnerName: '',
  gisaNumber: '',
  isKleinunternehmer: true,
  vatId: '',
  businessPurposeDe: 'Groß- und Einzelhandel mit Lebensmitteln und orientalischen Spezialitäten',
  businessPurposeAr: 'تجارة الجملة والتجزئة للمواد الغذائية والمنتجات الاستهلاكية'
};

// Fields safe to expose on the public settings endpoint.
// Excludes googleApiKey, googlePlaceId and trustindexWidgetCode.
const PUBLIC_SETTINGS_SELECT = {
  id: true,
  storeName: true,
  storeNameDe: true,
  storeNameAr: true,
  logoUrl: true,
  phone: true,
  email: true,
  address: true,
  mapUrl: true,
  mapEmbedUrl: true,
  googleReviewsUrl: true,
  googleRating: true,
  googleReviewCount: true,
  showGoogleReviews: true,
  minOrderValue: true,
  deliveryFee: true,
  deliveryFeePerKm: true,
  freeDeliveryThreshold: true,
  storeLatitude: true,
  storeLongitude: true,
  maxDeliveryDistanceKm: true,
  allowedPostalCodes: true,
  legalOwnerName: true,
  gisaNumber: true,
  isKleinunternehmer: true,
  vatId: true,
  businessPurposeDe: true,
  businessPurposeAr: true,
  maintenanceMode: true
};

module.exports = {
  PUBLIC_SETTINGS_SELECT,
  DEFAULT_SETTINGS,
  cleanString
};
