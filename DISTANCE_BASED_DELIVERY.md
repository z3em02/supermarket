# Distanzbasierte Liefergebühr / Distance-Based Delivery System

Dieses Dokument protokolliert alle Schritte, mathematischen Formeln, Konfigurationen, Code-Änderungen und Test-Verifikationen für die distanzbasierte Liefergebühr des Supermarkts.

---

## 1. Übersicht & Berechnungsmodell

Die Liefergebühr setzt sich transparent aus zwei Hauptkomponenten zusammen:

1. **Grundgebühr / Servicepauschale ($F_{\text{base}}$)**:
   - Z. B. `2,00 €`
   - Deckt Verpackung, Vorbereitung und Grundlogistik ab.
2. **Entfernungsaufschlag ($F_{\text{distance}}$)**:
   - Z. B. `0,10 € / km`
   - Berechnet sich anhand der **exakten Straßen-Fahrtstrecke** zwischen dem Supermarkt (`Koppreitergasse 8, 1120 Wien`) und der spezifischen Kunden-Lieferadresse (Straße und Hausnummer — **nicht bloß der allgemeine Bezirk**).

### Formel:
$$F_{\text{distance}} = \text{Runden}(D \times R_{\text{km}}, 2)$$
$$F_{\text{total}} = F_{\text{base}} + F_{\text{distance}}$$

*Wobei:*
- $D$ = Echte Straßen-Fahrtstrecke in Kilometern (über OSRM Straßennetzwerk oder Haversine-Luftlinie $\times 1.25$ als urbaner Fallback).
- $R_{\text{km}}$ = Preis pro Kilometer (konfigurierbar in den Einstellungen, z. B. `0,10 € / km`).
- $F_{\text{base}}$ = Grundgebühr / Servicepauschale (konfigurierbar in den Einstellungen, z. B. `2,00 €`).

### Ausnahmen & Schutzregeln:
- **Kostenlose Lieferung ($F_{\text{total}} = 0,00 €$)**: Greift automatisch, wenn der Warenkorb den Schwellenwert für kostenlose Lieferung erreicht (`freeDeliveryThreshold`, z. B. ab 50,00 €) oder ein gültiger Gutschein mit kostenlosem Versand eingelöst wurde.
- **Maximaldistanz (`maxDeliveryDistanceKm`)**: Optional einstellbar (z. B. 15 km). Bei Adressen jenseits dieser Grenze wird der Checkout mit einer verständlichen Meldung gesperrt.

---

## 2. Straßengenaue Präzision & Ausfallsicherheit (Mehrschichtige Architektur)

Um eine exakte, hausnummerngenaue Berechnung zu garantieren und gleichzeitig Ausfälle, Latenzspitzen oder Ratenbegrenzungen (Rate-Limits) vollständig auszuschließen:

1. **Intelligente Adress-Normalisierung (`normalizeAddressForGeocoding`)**:
   - Kunden geben Adressen oft inklusive interner Wohnungsdaten ein (z. B. `Margaretenstraße 166, Top 4`, `Stiege 2, Tür 14` oder `166/4`).
   - Solche internen Gebäudemetadaten führen bei Geocodern zu Fehlern ("Nicht gefunden").
   - Das System normalisiert die Adresse vor dem Geocoding vollautomatisch, filtert Tür/Top/Stiege/Stock heraus und übergibt die saubere Straße und Hausnummer an den Geocoder.

2. **Primärer Geocoder: Photon (Komoot OSM Geocoder)**:
   - Straßengenaue und hausnummerngenaue Auflösung.
   - Mit Standort-Bias um den Supermarkt (`lat=48.1746&lon=16.3272`) für sekundenschnelle Treffer im Großraum Wien ohne 429-Rate-Limits.

3. **Echtes Straßennetz-Routing: OSRM (Open Source Routing Machine)**:
   - Berechnet die echte Fahrstrecke auf dem Wiener Straßennetzwerk (Kurven, Einbahnstraßen, Hauptverkehrsstraßen) statt einer bloßen Luftlinie.
   - Adressen im selben Bezirk erhalten **unterschiedliche, exakte Entfernungen und Gebühren** (z. B. Margaretenstraße 166: 2,7 km vs. Reinprechtsdorfer Straße 12: 3,3 km).

4. **Sekundärer & Tertiärer Fallback (Offline-Garantie)**:
   - Sekundär: OpenStreetMap Nominatim.
   - Tertiär (100% Offline-Resilienz): Lokale Wiener Postleitzahlen-Zentroidtabelle (`1010` bis `1230` + Umland). Sollte das Internet ausfallen, bricht der Bestellvorgang niemals ab.
   - Routing-Fallback: Haversine-Luftlinie $\times 1.25$ (urbaner Straßenfaktor), falls der Routing-Server nicht binnen 2,5 Sekunden antwortet.

5. **In-Memory LRU-Caching**:
   - Geocodierte Koordinaten und ermittelte Fahrstrecken werden 1 Stunde im Arbeitsspeicher gehalten. Wiederholte Aufrufe für dieselbe Adresse erfolgen in **0 ms**.

---

## 3. Protokoll der durchgeführten Schritte

### Schritt 1: Spezifikation & Dokumentation
- Definition des zweistufigen Modells ($F_{\text{base}} + D \times R_{\text{km}}$) und Schutz gegen API-Ausfälle.

### Schritt 2: Datenbankschema erweitert (`backend/prisma/schema.prisma`)
- **Tabelle `StoreSettings`**:
  - `deliveryFee`: Basis-Servicepauschale (Standard: 2.00 €).
  - `deliveryFeePerKm`: Kilometerpreis (Standard: 0.10 €/km).
  - `storeLatitude`: 48.1746605 (Koppreitergasse 8, 1120 Wien).
  - `storeLongitude`: 16.3272662.
  - `maxDeliveryDistanceKm`: Maximale Distanz in km (0 = unbegrenzt).
- **Tabelle `Order`**:
  - `deliveryFee`: Gesamte Liefergebühr.
  - `deliveryDistanceKm`: Exakte Fahrtstrecke in km.
  - `baseDeliveryFee`: Basis-Servicepauschale.
  - `distanceDeliveryFee`: Entfernungsaufschlag.
- Schema per `prisma db push` synchronisiert und Prisma-Client generiert.

### Schritt 3: Distanz- & Geocoding-Service implementiert (`backend/utils/distanceService.js`)
- `normalizeAddressForGeocoding(addressText)`: Filtert Stiege/Top/Tür/Stock/Floor heraus und bereinigt Hausnummer-Slashes (z. B. `166/4` $\to$ `166`).
- `geocodeAddress(addressText, storeLat, storeLng)`: Multi-Layer Geocoder (Photon $\to$ Nominatim $\to$ PLZ-Zentroid).
- `getOsrmRoadDistance(lat1, lon1, lat2, lon2)`: Echtes Straßenrouting via OSRM mit In-Memory Cache.
- `calculateDeliveryDistance(address, storeSettings)`: Führt alle Bausteine zusammen und gibt die transparente Aufschlüsselung zurück.

### Schritt 4: Backend-Endpunkte & Order-Logik integriert
- `POST /api/delivery-distance/calculate`: Öffentlicher Endpunkt für den Warenkorb zur Live-Berechnung bei Adresseingabe.
- `POST /api/delivery-distance/geocode-store`: Admin-Endpunkt zum automatischen Geocodieren der Geschäftsadresse.
- `settingsController.js`: Speichern & Auslesen aller Distanz-Parameter.
- `orderController.js`: Verbindliche serverseitige Neuberechnung bei Bestelleingang. Speichert `deliveryDistanceKm`, `baseDeliveryFee`, `distanceDeliveryFee`, `deliveryFee` fest in der Datenbank.
- `emailService.js`: Zeigt die Liefergebühr auf Kunden- und Händler-E-Mails an.

### Schritt 5: Admin-Einstellungen & Zweisprachigkeit (`Settings.jsx`, `LanguageContext.jsx`)
- Reiter "Lieferung & Zeitfenster" erweitert:
  - Basis-Servicepauschale (€)
  - Liefergebühr pro Kilometer (€/km)
  - Maximale Lieferdistanz (km)
  - GPS-Koordinaten mit "Koordinaten aus Adresse ermitteln"-Button.
- Vollständig zweisprachig auf Deutsch (`de`) und Arabisch (`ar`).

### Schritt 6: Kunden-Warenkorb & Checkout (`CustomerCartDrawer.jsx`)
- Debounced Live-Abfrage bei Eingabe der Lieferadresse.
- Transparente Aufschlüsselung vor Bestellabschluss:
  - `Zwischensumme`: z. B. €27,80
  - `Servicepauschale (Basis)`: €2,00
  - `Entfernungsgebühr (2,7 km × €0,10/km)`: +€0,27
  - `Gesamtbetrag`: €30,07
- Badge zeigt: `Fahrtstrecke zu Ihrer Adresse: 2.7 km` (bzw. auf Arabisch: `مسافة التوصيل لعنوانك: 2.7 كم`).
- Prüfung auf Maximaldistanz warnt den Kunden und verhindert ungültige Bestellungen.

### Schritt 7: Auftragsverwaltung & Belege
- `Orders.jsx` (Admin): Anzeige von Distanz und Gebührenaufteilung in Modal und Druckansicht.
- `CustomerAccount.jsx` (Kunde): Anzeige der Lieferdistanz in der Bestellübersicht und auf dem offiziellen Lieferschein.

---

## 4. End-to-End Verifikation & Testergebnisse

### Test 1: Adressen im selben Bezirk (1050 Wien - Margareten)
Unterschiedliche Straßen & Hausnummern im selben Bezirk erhalten **unterschiedliche, adressgenaue Distanzen**:

| Adresse | Bezirk | Match | Routing | Distanz | Basis | Aufpreis (0,10 €/km) | Liefergebühr gesamt |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Margaretenstraße 166, Top 4** | 1050 Wien | Exakte Adresse | OSRM Driving | **2,7 km** | 2,00 € | +0,27 € | **2,27 €** |
| **Reinprechtsdorfer Straße 12** | 1050 Wien | Exakte Adresse | OSRM Driving | **3,3 km** | 2,00 € | +0,33 € | **2,33 €** |
| **Pilgramgasse 15** | 1050 Wien | Exakte Adresse | OSRM Driving | **3,6 km** | 2,00 € | +0,36 € | **2,36 €** |

### Test 2: Unterschiedliche Hausnummern auf derselben Straße (1160 Wien - Ottakring)
| Adresse | Straße | Hausnummer | Distanz | Liefergebühr |
| :--- | :--- | :--- | :--- | :--- |
| **Thaliastraße 10, 1160 Wien** | Thaliastraße | 10 | **5,1 km** | **2,51 €** (2,00 + 0,51) |
| **Thaliastraße 100, 1160 Wien** | Thaliastraße | 100 | **5,6 km** | **2,56 €** (2,00 + 0,56) |

### Test 3: Echte Bestellaufgabe über die Live-API (`POST /api/orders`)
Zwei aufeinanderfolgende Bestellungen im selben Bezirk mit Speicherung in PostgreSQL:
1. **Bestellung #1 (`Margaretenstraße 166, Top 4, 1050 Wien`)**:
   - `deliveryDistanceKm`: `2.7 km`
   - `baseDeliveryFee`: `2.00 €`
   - `distanceDeliveryFee`: `0.27 €`
   - `deliveryFee`: `2.27 €`
   - `totalAmount`: `30.07 €` $\to$ **Erfolgreich in DB gespeichert**
2. **Bestellung #2 (`Reinprechtsdorfer Straße 12, 1050 Wien`)**:
   - `deliveryDistanceKm`: `3.3 km`
   - `baseDeliveryFee`: `2.00 €`
   - `distanceDeliveryFee`: `0.33 €`
   - `deliveryFee`: `2.33 €`
   - `totalAmount`: `30.13 €` $\to$ **Erfolgreich in DB gespeichert**

### Test 4: Maximaldistanz-Schutz
- Bei 15 km Limit: Adresse `Wagramer Straße 100, 1220 Wien` (15,8 km) $\to$ `isWithinMaxDistance: false`, Bestellung wird mit verständlichem Hinweis blockiert.

### Test 5: Frontend-Build
- `npm run build`: `✓ built in 1.94s` (0 Fehler, 0 Warnungen).

---

## 5. API-Referenz

### `POST /api/delivery-distance/calculate` (Öffentlich)
**Request Body**:
```json
{
  "address": "Margaretenstraße 166, Top 4, 1050 Wien",
  "postalCode": "1050"
}
```

**Response**:
```json
{
  "distanceKm": 2.7,
  "straightLineKm": 2.1,
  "isExactAddress": true,
  "isApproximate": false,
  "source": "photon_osm",
  "routingEngine": "osrm_driving",
  "destinationCoordinates": { "lat": 48.1861007, "lon": 16.3449607 },
  "originCoordinates": { "lat": 48.1746605, "lon": 16.3272662 },
  "baseFee": 2.0,
  "perKmRate": 0.1,
  "distanceFee": 0.27,
  "totalDeliveryFee": 2.27,
  "isWithinMaxDistance": true,
  "maxDeliveryDistanceKm": 15.0
}
```
