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
export const printHtmlInHiddenIframe = (html) => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;visibility:hidden';
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
