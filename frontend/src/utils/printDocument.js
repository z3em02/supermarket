// Shared helpers for the printable HTML documents (admin invoices, customer
// order report). Every value interpolated into those templates must go
// through escapeHtml — order data includes customer-entered text.
export const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Writes html into a hidden iframe and opens the browser print dialog on it,
// so the current page stays untouched. The iframe removes itself afterwards.
//
// The iframe is sized to a real A4 page (not width:0/height:0) and only moved
// off-screen: a zero-size iframe makes its document lay out at ~0 width, so
// the content collapses into a narrow column and the browser then prints that
// mis-scaled onto the page, leaving large empty margins. Giving it the page's
// own dimensions makes the printed layout match the on-screen one.
export const printHtmlInHiddenIframe = (html) => {
  const iframe = document.createElement('iframe');
  // 794x1123 = A4 portrait at 96dpi. position:fixed off-screen keeps it
  // invisible without collapsing its layout width.
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:none;background:#fff';
  document.body.appendChild(iframe);
  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();
  iframe.contentWindow.onafterprint = () => {
    try { document.body.removeChild(iframe); } catch { /* already removed */ }
  };
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 300);
};
