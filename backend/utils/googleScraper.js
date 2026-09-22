const puppeteer = require('puppeteer-core');
const fs = require('fs');

/**
 * Locate Chrome or Edge executable on the system.
 */
function getBrowserExecutablePath() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : null,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ];

  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Scrapes Google Maps star rating, review count, and reviews.
 * @param {string} inputUrlOrQuery - Google Maps URL, shortlink, or place search query
 * @param {object} options - Optional config { maxReviews: 10, timeoutMs: 35000 }
 */
async function scrapeGoogleReviews(inputUrlOrQuery, options = {}) {
  const maxReviews = options.maxReviews || 10;
  const timeoutMs = options.timeoutMs || 35000;

  let target = (inputUrlOrQuery || '').trim();
  if (!target) {
    throw new Error('Bitte geben Sie eine gültige Google Maps URL oder einen Firmennamen an.');
  }

  // If not starting with http, assume it's a search term
  if (!target.startsWith('http://') && !target.startsWith('https://')) {
    target = `https://www.google.com/maps/search/${encodeURIComponent(target)}`;
  } else {
    // Only ever navigate the headless browser to Google's own domains — never
    // let an admin-supplied URL make this server fetch an arbitrary internal
    // or external host (SSRF).
    let hostname;
    try {
      hostname = new URL(target).hostname.toLowerCase();
    } catch {
      throw new Error('Ungültige URL.');
    }
    // Check the label immediately before the TLD is exactly "google" (e.g.
    // google.com, maps.google.com, google.de) rather than a loose substring/
    // regex match, which a host like "google.com.evil.com" would slip past.
    const labels = hostname.split('.');
    const isGoogleHost =
      (labels.length >= 2 && labels[labels.length - 2] === 'google') ||
      hostname === 'goo.gl' || hostname.endsWith('.goo.gl') ||
      hostname === 'g.page' || hostname.endsWith('.g.page');
    if (!isGoogleHost) {
      throw new Error('Nur Google Maps- oder Google-Bewertungslinks sind erlaubt.');
    }
  }

  const executablePath = getBrowserExecutablePath();
  if (!executablePath) {
    throw new Error('Kein Chrome- oder Edge-Browser auf dem System gefunden. Bitte installieren Sie Google Chrome.');
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,900',
      '--lang=de-DE,de,ar,en'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    // Follow redirects to the final page
    await page.goto(target, { waitUntil: 'networkidle2', timeout: timeoutMs });

    // Handle Google Consent / Cookie dialog
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, form button'));
        const consentBtn = buttons.find((b) => {
          const txt = (b.textContent || '').trim().toLowerCase();
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          return (
            txt.includes('alle akzeptieren') ||
            txt.includes('accept all') ||
            txt.includes('zustimmen') ||
            txt.includes('موافق') ||
            txt.includes('قبول الكل') ||
            aria.includes('alle akzeptieren') ||
            aria.includes('accept all')
          );
        });
        if (consentBtn) consentBtn.click();
      });
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      // Consent may not be shown
    }

    // Wait for the place details to appear or check search results
    await new Promise((r) => setTimeout(r, 2000));

    // If search results list, click the first result if feed is present
    try {
      await page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]');
        if (feed) {
          const firstResult = feed.querySelector('a[href*="/maps/place/"], div[role="article"] a');
          if (firstResult) {
            firstResult.click();
          }
        }
      });
      await new Promise((r) => setTimeout(r, 2000));
    } catch (e) {}

    // Extract Rating & Review Count
    const metrics = await page.evaluate(() => {
      let rating = null;
      let reviewCount = null;

      // 1. Check standard Google Maps place header div.F7nice
      const f7 = document.querySelector('div.F7nice');
      if (f7) {
        // Rating: span with rating number (e.g., "5,0" or "4.8")
        const ratingEl = f7.querySelector('span[aria-hidden="true"]');
        if (ratingEl && ratingEl.textContent) {
          const parsed = parseFloat(ratingEl.textContent.replace(',', '.').trim());
          if (!isNaN(parsed)) rating = parsed;
        }

        // Rating aria-label fallback (e.g. "5,0 Sterne" or "5.0 stars")
        if (!rating) {
          const ceNz = f7.querySelector('span.ceNzKf, span[aria-label*="Sterne"], span[aria-label*="stars"]');
          if (ceNz) {
            const m = (ceNz.getAttribute('aria-label') || '').match(/([0-5][.,]\d)/);
            if (m) rating = parseFloat(m[1].replace(',', '.'));
          }
        }

        // Review count inside div.F7nice
        const allSpans = Array.from(f7.querySelectorAll('span, button'));
        for (const el of allSpans) {
          const aria = (el.getAttribute('aria-label') || '').trim();
          const text = (el.textContent || '').trim();

          // Check aria-label matching singular/plural: "1 Rezension", "5 Rezensionen", "1 review", "12 reviews", "تقييم"
          const ariaMatch = aria.match(/(\d+[\d.,]*)\s*(?:Rezension|Review|Bewertung|تقييم)/i);
          if (ariaMatch) {
            reviewCount = parseInt(ariaMatch[1].replace(/\D/g, ''), 10);
            break;
          }

          // Check text in parentheses like "(1)" or "(120)" or "(1.450)"
          const parenMatch = text.match(/^\((\d+[\d.,]*)\)$/);
          if (parenMatch) {
            reviewCount = parseInt(parenMatch[1].replace(/\D/g, ''), 10);
            break;
          }
        }
      }

      // Fallback: Check header tabs/buttons (excluding any review card div.jftiEf to avoid reviewer profile badges)
      if (!reviewCount) {
        const tabs = Array.from(document.querySelectorAll('button[role="tab"], button'));
        for (const t of tabs) {
          if (t.closest('div.jftiEf')) continue; // Skip individual review cards
          const text = (t.textContent || '').trim();
          const aria = (t.getAttribute('aria-label') || '').trim();
          const m = (text + ' ' + aria).match(/(\d+[\d.,]*)\s*(?:Rezension|Review|Bewertung|تقييم)/i);
          if (m) {
            reviewCount = parseInt(m[1].replace(/\D/g, ''), 10);
            break;
          }
        }
      }

      return { rating, reviewCount };
    });

    // Try to open the Reviews tab (handles both singular "Rezension" and plural "Rezensionen")
    try {
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button[role="tab"], button'));
        const reviewsTab = tabs.find((t) => {
          if (t.closest('div.jftiEf')) return false;
          const text = (t.textContent || '').trim().toLowerCase();
          const aria = (t.getAttribute('aria-label') || '').toLowerCase();
          return (
            text.includes('rezension') ||
            text.includes('review') ||
            text.includes('bewertung') ||
            text.includes('تقييم') ||
            aria.includes('rezension') ||
            aria.includes('review') ||
            aria.includes('bewertung') ||
            aria.includes('تقييم')
          );
        });
        if (reviewsTab) reviewsTab.click();
      });
      await new Promise((r) => setTimeout(r, 2000));
    } catch (e) {}

    // Expand truncated review texts (click "Mehr" / "More" / "المزيد")
    try {
      await page.evaluate(() => {
        const moreBtns = Array.from(
          document.querySelectorAll('button.w8nwRe, button[aria-label*="Mehr"], button[aria-label*="More"]')
        );
        moreBtns.forEach((b) => b.click());
      });
    } catch (e) {}

    // Extract review cards with strict deduplication
    const reviews = await page.evaluate((max) => {
      // Use div.jftiEf which represents the individual review item
      const cards = Array.from(document.querySelectorAll('div.jftiEf'));
      const results = [];
      const seen = new Set();

      for (const card of cards) {
        if (results.length >= max) break;

        const reviewId = card.getAttribute('data-review-id') || '';
        const authorName = card.querySelector('div.d4r55')?.textContent?.trim() || 'Google-Nutzer';
        const authorPhotoUrl = card.querySelector('img.NBa7we')?.getAttribute('src') || '';

        let starNum = 5;
        const starEl = card.querySelector('span.kvMYJc, span[aria-label*="Stern"], span[aria-label*="star"], span[aria-label*="نجم"]');
        if (starEl) {
          const m = (starEl.getAttribute('aria-label') || '').match(/(\d)/);
          if (m) starNum = parseInt(m[1], 10);
        }

        const relativeTime = card.querySelector('span.rsqaWe')?.textContent?.trim() || 'Kürzlich';
        const text = card.querySelector('span.wiI7pd')?.textContent?.trim() || '';

        // Deduplication key by ID or author + text
        const dedupeKey = reviewId ? `id:${reviewId}` : `author:${authorName.toLowerCase()}|text:${text.toLowerCase()}`;
        if (seen.has(dedupeKey)) {
          continue;
        }
        seen.add(dedupeKey);

        if (authorName) {
          results.push({
            authorName,
            authorPhotoUrl,
            rating: starNum,
            relativeTime,
            text,
            verified: true
          });
        }
      }

      return results;
    }, maxReviews);

    return {
      success: true,
      rating: metrics.rating !== null ? metrics.rating : (reviews.length > 0 ? 5.0 : null),
      reviewCount: metrics.reviewCount !== null ? metrics.reviewCount : (reviews.length > 0 ? reviews.length : null),
      reviews
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  scrapeGoogleReviews,
  getBrowserExecutablePath
};
