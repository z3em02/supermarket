import { useEffect, useState, useMemo } from 'react';
import axios from '../utils/adminAxios';
import { getApiUrl } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { 
  Search, 
  Check, 
  X, 
  Clock, 
  Truck, 
  Package, 
  DollarSign, 
  User, 
  Calendar, 
  FileText, 
  Plus,
  Trash2,
  Printer,
  Lock,
  Layers,
  CheckCircle2,
  XCircle,
  Building2,
  ChevronDown,
  SlidersHorizontal,
  MapPin,
  ShieldCheck,
  Edit,
  AlertTriangle,
  Minus,
  PlusCircle,
  RotateCcw,
  Phone,
  Mail,
  Tag,
  Gift,
  Sparkles,
  Receipt
} from 'lucide-react';
import { todayIso, maxDeliveryDateIso, buildDeliverySlot, parseDeliverySlot, formatDeliverySlot, windowLabel, fetchActiveDeliveryWindows } from '../utils/deliverySlot';

export const parseOrderNotes = (adminNotes, language) => {
  if (!adminNotes) return { customNotes: '', customerResponse: null };
  const isAr = language === 'ar';
  const lines = String(adminNotes).split('\n').map((l) => l.trim()).filter(Boolean);
  let customerResponse = null;
  const otherLines = [];

  for (const line of lines) {
    // Check for acceptance in either German or Arabic
    const acceptMatch = line.match(/\[(?:Kunde hat Änderung akzeptiert am|وافق العميل على التعديل بتاريخ|وافق العميل على التعديل في)\s*(.*?)\]/i);
    if (acceptMatch) {
      customerResponse = {
        type: 'accepted',
        date: acceptMatch[1],
        label: isAr
          ? `وافق العميل على التعديل (${acceptMatch[1]})`
          : `Kunde hat Änderung akzeptiert (${acceptMatch[1]})`
      };
      continue;
    }

    // Check for decline in either German or Arabic
    const declineMatch = line.match(/\[(?:Kunde hat Änderung abgelehnt und Bestellung storniert am|رفض العميل التعديل وتم إلغاء الطلب بتاريخ|رفض العميل التعديل وتم إلغاء الطلب في)\s*(.*?)\]/i);
    if (declineMatch) {
      customerResponse = {
        type: 'declined',
        date: declineMatch[1],
        label: isAr
          ? `رفض العميل التعديل وتم إلغاء الطلب (${declineMatch[1]})`
          : `Kunde hat Änderung abgelehnt & storniert (${declineMatch[1]})`
      };
      continue;
    }

    otherLines.push(line);
  }

  return {
    customNotes: otherLines.join('\n'),
    customerResponse
  };
};

export const Orders = () => {
  const { t, language } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printOrder, setPrintOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [editingDeliverySlot, setEditingDeliverySlot] = useState(false);
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editSelectedWindow, setEditSelectedWindow] = useState(null);
  const [savingDeliverySlot, setSavingDeliverySlot] = useState(false);
  const [deliveryWindows, setDeliveryWindows] = useState([]);

  useEffect(() => {
    fetchActiveDeliveryWindows().then(setDeliveryWindows).catch(() => {});
  }, []);

  const toggleOrderItemsExpand = (id) => {
    setExpandedOrders((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  // Status Change / Admin Note modal
  const [statusModalOrder, setStatusModalOrder] = useState(null);
  const [targetStatus, setTargetStatus] = useState('');
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [customerNoteInput, setCustomerNoteInput] = useState('');

  const [orderForm, setOrderForm] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    notes: '',
    items: [{ productId: '', quantity: 1 }]
  });

  // Edit Order modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [editReason, setEditReason] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [addSelectedProductId, setAddSelectedProductId] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('all');
  const [pickerStockFilter, setPickerStockFilter] = useState('all');
  const [pickerSort, setPickerSort] = useState('default');
  const [pickerQuantities, setPickerQuantities] = useState({});

  const fetchCreateFormData = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      const headers = { Authorization: `Bearer ${token}` };
      const [customersRes, productsRes] = await Promise.all([
        axios.get(`${apiUrl}/api/customer-auth/customers`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${apiUrl}/api/products`, { headers })
      ]);
      setCustomers(customersRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Error fetching form data:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      const response = await axios.get(`${apiUrl}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchCreateFormData();

    // Poll for new orders so the list stays current without a manual refresh
    // when a customer submits an order while this page is open.
    const pollId = setInterval(fetchOrders, 20000);
    return () => clearInterval(pollId);
  }, []);

  // Status metrics summary
  const metrics = useMemo(() => {
    const counts = {
      total: orders.length,
      pending: 0,
      pending_customer_approval: 0,
      accepted: 0,
      preparing: 0,
      shipped: 0,
      delivered: 0,
      declined: 0
    };
    orders.forEach((o) => {
      const s = o.status?.toLowerCase();
      if (s === 'declined' || s === 'rejected' || s === 'decline') counts.declined += 1;
      else if (counts[s] !== undefined) counts[s] += 1;
    });
    return counts;
  }, [orders]);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const items = orderForm.items.filter((item) => item.productId && Number(item.quantity) > 0);
    if (!orderForm.customerId || items.length === 0) {
      alert((t('error') || 'Fehler') + ': ' + (t('selectCustomer') || 'Kunde auswählen') + ' & ' + (t('selectProduct') || 'Produkt auswählen'));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      await axios.post(
        `${apiUrl}/api/orders`,
        {
          customerId: orderForm.customerId,
          customerName: orderForm.customerName,
          customerPhone: orderForm.customerPhone,
          deliveryAddress: orderForm.deliveryAddress,
          paymentMethod: 'cash_on_delivery',
          notes: orderForm.notes,
          items
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowCreateModal(false);
      setOrderForm({ customerId: '', customerName: '', customerPhone: '', deliveryAddress: '', notes: '', items: [{ productId: '', quantity: 1 }] });
      fetchOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      alert(error.response?.data?.error || t('error'));
    }
  };

  // Open the Status Change & Admin Note Modal
  const openStatusModal = (order, newStatus) => {
    setStatusModalOrder(order);
    setTargetStatus(newStatus || order.status);
    setAdminNoteInput(order.adminNotes || '');
    setCustomerNoteInput(order.notes || '');
  };

  const handleConfirmStatusChange = async () => {
    if (!statusModalOrder) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      await axios.put(
        `${apiUrl}/api/orders/${statusModalOrder.id}/status`,
        {
          status: targetStatus,
          notes: customerNoteInput,
          adminNotes: adminNoteInput
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatusModalOrder(null);
      await fetchOrders();
      if (selectedOrder && selectedOrder.id === statusModalOrder.id) {
        const updatedOrder = await axios.get(`${apiUrl}/api/orders/${statusModalOrder.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSelectedOrder(updatedOrder.data);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert(error.response?.data?.error || t('error'));
    } finally {
      setUpdating(false);
    }
  };

  // Direct quick status change (without modal)
  const handleQuickStatusChange = async (orderId, newStatus) => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      await axios.put(`${apiUrl}/api/orders/${orderId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        const updatedOrder = await axios.get(`${apiUrl}/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSelectedOrder(updatedOrder.data);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert(error.response?.data?.error || t('error'));
    } finally {
      setUpdating(false);
    }
  };

  // Admin directly overwrites the customer's requested delivery slot (e.g.
  // after a phone call) — no separate customer approval needed.
  const handleOpenEditDeliverySlot = (order) => {
    const parsed = parseDeliverySlot(order.deliverySlot);
    setEditDeliveryDate(parsed?.date || todayIso());
    const matching = parsed
      ? deliveryWindows.find((w) => w.startHour === parsed.startHour && w.endHour === parsed.endHour)
      : null;
    setEditSelectedWindow(matching || deliveryWindows[0] || null);
    setEditingDeliverySlot(true);
  };

  const handleSaveDeliverySlot = async (orderId) => {
    setSavingDeliverySlot(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      await axios.put(
        `${apiUrl}/api/orders/${orderId}/status`,
        { deliverySlot: buildDeliverySlot(editDeliveryDate, editSelectedWindow?.startHour, editSelectedWindow?.endHour) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingDeliverySlot(false);
      await fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        const updatedOrder = await axios.get(`${apiUrl}/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSelectedOrder(updatedOrder.data);
      }
    } catch (error) {
      console.error('Error updating delivery slot:', error);
      alert(error.response?.data?.error || t('error'));
    } finally {
      setSavingDeliverySlot(false);
    }
  };



  const handleViewDetails = async (order) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      const response = await axios.get(`${apiUrl}/api/orders/${order.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedOrder(response.data);
      setShowDetailModal(true);
      setEditingDeliverySlot(false);
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
  };

  const handleOpenEditModal = (order) => {
    setEditingOrder(order);
    setEditReason(order.modificationReason || '');
    setAddSelectedProductId('');
    setShowProductPicker(false);
    setPickerSearch('');
    setPickerCategory('all');
    setPickerStockFilter('all');
    setPickerSort('default');
    setPickerQuantities({});
    if (!products || products.length === 0) {
      fetchCreateFormData();
    }
    const items = (order.orderItems || []).map((it) => ({
      id: it.id,
      productId: it.productId,
      quantity: it.quantity,
      price: it.price,
      subtotal: it.subtotal || it.price * it.quantity,
      product: it.product
    }));
    setEditItems(items);
    setShowEditModal(true);
  };

  const handleUpdateItemQuantity = (index, delta) => {
    setEditItems((prev) => {
      const next = [...prev];
      const newQty = Math.max(1, (next[index].quantity || 1) + delta);
      next[index] = {
        ...next[index],
        quantity: newQty,
        subtotal: newQty * next[index].price
      };
      return next;
    });
  };

  const handleRemoveItemFromEdit = (index) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const pickerCategories = useMemo(() => {
    const map = new Map();
    (products || []).forEach((p) => {
      if (p.category && p.category.id) {
        map.set(p.category.id, p.category);
      }
    });
    return Array.from(map.values());
  }, [products]);

  const filteredPickerProducts = useMemo(() => {
    let list = [...(products || [])];
    const isAr = language === 'ar';

    // 1. Text search
    if (pickerSearch.trim()) {
      const q = pickerSearch.trim().toLowerCase();
      list = list.filter((p) => {
        const nameDe = (p.nameDe || p.name || '').toLowerCase();
        const nameAr = (p.nameAr || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const desc = `${p.descriptionDe || p.description || ''} ${p.descriptionAr || ''}`.toLowerCase();
        return nameDe.includes(q) || nameAr.includes(q) || sku.includes(q) || desc.includes(q);
      });
    }

    // 2. Category filter
    if (pickerCategory !== 'all') {
      list = list.filter((p) => p.categoryId === pickerCategory || p.category?.id === pickerCategory);
    }

    // 3. Stock filter
    if (pickerStockFilter === 'in_stock') {
      list = list.filter((p) => (p.stock || 0) > 0);
    } else if (pickerStockFilter === 'low_stock') {
      list = list.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) <= 5);
    } else if (pickerStockFilter === 'out_of_stock') {
      list = list.filter((p) => (p.stock || 0) <= 0);
    }

    // 4. Sort
    if (pickerSort === 'name_asc') {
      list.sort((a, b) => {
        const nameA = (isAr ? a.nameAr || a.nameDe : a.nameDe || a.name) || '';
        const nameB = (isAr ? b.nameAr || b.nameDe : b.nameDe || b.name) || '';
        return nameA.localeCompare(nameB, isAr ? 'ar' : 'de');
      });
    } else if (pickerSort === 'name_desc') {
      list.sort((a, b) => {
        const nameA = (isAr ? a.nameAr || a.nameDe : a.nameDe || a.name) || '';
        const nameB = (isAr ? b.nameAr || b.nameDe : b.nameDe || b.name) || '';
        return nameB.localeCompare(nameA, isAr ? 'ar' : 'de');
      });
    } else if (pickerSort === 'price_asc') {
      list.sort((a, b) => (a.b2bPrice || 0) - (b.b2bPrice || 0));
    } else if (pickerSort === 'price_desc') {
      list.sort((a, b) => (b.b2bPrice || 0) - (a.b2bPrice || 0));
    } else if (pickerSort === 'stock_desc') {
      list.sort((a, b) => (b.stock || 0) - (a.stock || 0));
    }

    return list;
  }, [products, pickerSearch, pickerCategory, pickerStockFilter, pickerSort, language]);

  const handleAddProductWithQty = (prod, qty = 1) => {
    if (!prod) return;
    const addQty = Math.max(1, Number(qty) || 1);
    const existingIndex = editItems.findIndex((it) => it.productId === prod.id);
    if (existingIndex >= 0) {
      handleUpdateItemQuantity(existingIndex, addQty);
    } else {
      setEditItems((prev) => [
        ...prev,
        {
          productId: prod.id,
          quantity: addQty,
          price: prod.b2bPrice,
          subtotal: prod.b2bPrice * addQty,
          product: prod
        }
      ]);
    }
  };

  const handleAddProductToEdit = () => {
    if (!addSelectedProductId) return;
    const prod = products.find((p) => p.id === addSelectedProductId);
    if (!prod) return;
    handleAddProductWithQty(prod, 1);
    setAddSelectedProductId('');
  };

  const handleSaveOrderEdit = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (editItems.length === 0) {
      alert(language === 'ar' ? 'يجب أن يحتوي الطلب على منتج واحد على الأقل' : 'Der Auftrag muss mindestens einen Artikel enthalten.');
      return;
    }

    try {
      setSavingEdit(true);
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      const payload = {
        items: editItems.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          price: it.price
        })),
        modificationReason: editReason.trim() || (language === 'ar' ? 'تعديل بسبب عدم توفر بعض المنتجات' : 'Anpassung wegen fehlender Verfügbarkeit einzelner Artikel.')
      };

      const res = await axios.put(`${apiUrl}/api/orders/${editingOrder.id}/edit`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowEditModal(false);
      setEditingOrder(null);
      await fetchOrders();
      if (selectedOrder && selectedOrder.id === editingOrder.id) {
        setSelectedOrder(res.data);
      }
    } catch (err) {
      console.error('Error saving order edit:', err);
      alert(err.response?.data?.error || (language === 'ar' ? 'فشل حفظ التعديل' : 'Fehler beim Speichern der Änderung'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenPrintModal = (order) => {
    setPrintOrder(order);
    setShowPrintModal(true);
  };

  // Writes html into a hidden iframe and triggers the browser print dialog on
  // it — shared by both the A4 and thermal-receipt-printer formats below.
  const printHtmlInHiddenIframe = (html) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;visibility:hidden';
    document.body.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.contentWindow.onafterprint = () => document.body.removeChild(iframe);
    setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); }, 300);
  };

  const printReceipt = (order, format = 'a4') => {
    if (format === 'thermal') {
      printHtmlInHiddenIframe(buildThermalReceiptHtml(order));
      return;
    }
    printHtmlInHiddenIframe(buildA4ReceiptHtml(order));
  };

  const buildA4ReceiptHtml = (order) => {
    const isAr = language === 'ar';
    const dir = isAr ? 'rtl' : 'ltr';
    const total = Number(order.totalAmount);

    const escapeHtml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const itemsHtml = (order.orderItems || []).map((item) => {
      const rawName = (isAr ? item.product?.nameAr : item.product?.nameDe) || item.product?.name || item.productId;
      const name = escapeHtml(rawName);
      const sku = escapeHtml(item.product?.sku || '—');
      const subtotal = Number(item.subtotal);
      const unitPrice = item.quantity > 0 ? subtotal / item.quantity : 0;
      return `
        <tr>
          <td style="padding:8px 10px;font-weight:600">${name}</td>
          <td style="padding:8px 10px;text-align:center">${sku}</td>
          <td style="padding:8px 10px;text-align:right">€${unitPrice.toFixed(2)}</td>
          <td style="padding:8px 10px;text-align:center;font-weight:700">${item.quantity}</td>
          <td style="padding:8px 10px;text-align:right;font-weight:700">€${subtotal.toFixed(2)}</td>
        </tr>`;
    }).join('');

    const labelProduct   = isAr ? 'المنتج'            : 'Artikel';
    const labelSku       = isAr ? 'الرقم'             : 'Art-Nr.';
    const labelUnit      = isAr ? 'سعر الوحدة'        : 'Einzelpreis';
    const labelQty       = isAr ? 'الكمية'            : 'Menge';
    const labelSubtotal  = isAr ? 'المجموع'           : 'Betrag';
    const labelGross     = isAr ? 'المجموع الكلي'     : 'Gesamtbetrag';
    const labelSubtotalGross = isAr ? 'المجموع الفرعي' : 'Zwischensumme';
    const labelCoupon    = isAr ? 'كوبون الخصم'       : 'Gutschein';
    const labelPromo     = isAr ? 'خصم العروض'        : 'Aktionsrabatt';
    const labelDeliveryFee = isAr ? 'رسوم التوصيل'    : 'Liefergebühr';
    const labelBilledTo  = isAr ? 'فاتورة إلى'       : 'Rechnungsempfänger';
    const labelDelivery  = isAr ? 'عنوان التسليم'    : 'Lieferadresse';
    const labelInvoice   = isAr ? 'فاتورة'            : 'Rechnung';
    const labelOrder     = isAr ? 'رقم الطلب'        : 'Bestellnummer';
    const labelDate      = isAr ? 'التاريخ'           : 'Datum';
    const labelStatus    = isAr ? 'الحالة'            : 'Status';
    const labelNotes     = isAr ? 'ملاحظات'           : 'Hinweise';
    const labelAdminNote = isAr ? 'ملاحظة داخلية'    : 'Interne Notiz';

    const html = `<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title>${labelInvoice} – INV-${order.id.slice(0,8).toUpperCase()}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:${isAr ? "'Noto Sans Arabic', Arial, sans-serif" : "Arial, sans-serif"};font-size:12px;color:#111;background:#fff;direction:${dir};padding:32px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:2px solid #2563eb;margin-bottom:18px}
    .brand{font-size:20px;font-weight:800;color:#1e3a8a;letter-spacing:-0.5px}
    .brand-sub{color:#6b7280;font-size:11px;margin-top:3px}
    .badge{display:inline-block;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;text-transform:uppercase}
    .meta{margin-bottom:18px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .meta-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}
    .meta-box h4{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:6px}
    .meta-box p{font-size:12px;color:#111;line-height:1.6}
    .meta-box p strong{font-weight:700}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    thead tr{background:#1e3a8a;color:#fff}
    thead th{padding:9px 10px;font-size:11px;font-weight:700;text-align:start}
    thead th:not(:first-child){text-align:center}
    thead th:last-child,thead th:nth-child(3){text-align:end}
    tbody tr{border-bottom:1px solid #e2e8f0}
    tbody tr:nth-child(even){background:#f8fafc}
    .totals{display:flex;justify-content:flex-end;margin-bottom:16px}
    .totals-box{width:240px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
    .totals-row{display:flex;justify-content:space-between;padding:7px 12px;font-size:12px}
    .totals-row:not(:last-child){border-bottom:1px solid #f1f5f9}
    .totals-row.total{background:#1e3a8a;color:#fff;font-weight:800;font-size:13px}
    .notes-box{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;font-size:11px;color:#78350f;margin-bottom:12px}
    .footer{text-align:center;color:#94a3b8;font-size:10px;border-top:1px solid #e2e8f0;padding-top:14px;margin-top:8px}
    @media print{body{padding:0 16px}@page{margin:16mm}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Supermarkt Lieferservice</div>
      <div class="brand-sub">Hauszustellung &amp; Frische Produkte</div>
      <div class="brand-sub" style="margin-top:4px">${labelInvoice} Ref: INV-${order.id.slice(0,8).toUpperCase()}</div>
    </div>
    <div style="text-align:${isAr?'left':'right'}">
      <div class="badge">${escapeHtml(order.status || '—')}</div>
      <div style="color:#6b7280;font-size:11px;margin-top:6px">${labelDate}: ${new Date(order.createdAt).toLocaleDateString(isAr?'ar-DE':'de-DE',{year:'numeric',month:'long',day:'numeric'})}</div>
      <div style="color:#6b7280;font-size:11px">${labelOrder}: #${order.id.slice(0,8).toUpperCase()}</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-box">
      <h4>${labelBilledTo}</h4>
      <p><strong>${escapeHtml(order.customer?.name || order.customerName || '—')}</strong></p>
      ${(order.customer?.phone || order.customerPhone) ? `<p>${escapeHtml(order.customer?.phone || order.customerPhone)}</p>` : ''}
    </div>
    <div class="meta-box">
      <h4>${labelDelivery}</h4>
      <p>${escapeHtml(order.deliveryAddress || order.customer?.address || '—')}</p>
      ${order.notes ? `<p style="font-size:11px;color:#6b7280;margin-top:4px;"><strong>Hinweis:</strong> ${escapeHtml(order.notes)}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align:${isAr?'right':'left'}">${labelProduct}</th>
        <th style="text-align:center">${labelSku}</th>
        <th style="text-align:${isAr?'left':'right'}">${labelUnit}</th>
        <th style="text-align:center">${labelQty}</th>
        <th style="text-align:${isAr?'left':'right'}">${labelSubtotal}</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      ${Number(order.itemsSubtotal) > 0 && (Number(order.couponDiscount) > 0 || Number(order.promotionDiscount) > 0) ? `
      <div class="totals-row"><span>${labelSubtotalGross}</span><span>€${Number(order.itemsSubtotal).toFixed(2)}</span></div>
      ` : ''}
      ${Number(order.promotionDiscount) > 0 ? `
      <div class="totals-row" style="color:#e11d48"><span>${labelPromo}</span><span>-€${Number(order.promotionDiscount).toFixed(2)}</span></div>
      ` : ''}
      ${Number(order.couponDiscount) > 0 ? `
      <div class="totals-row" style="color:#7c3aed"><span>${labelCoupon}${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ''}</span><span>-€${Number(order.couponDiscount).toFixed(2)}</span></div>
      ` : ''}
      ${Number(order.deliveryFee) > 0 ? `
      <div class="totals-row"><span>${labelDeliveryFee}</span><span>€${Number(order.deliveryFee).toFixed(2)}</span></div>
      ` : ''}
      <div class="totals-row total"><span>${labelGross}</span><span>€${total.toFixed(2)}</span></div>
    </div>
  </div>

  ${order.notes ? `<div class="notes-box"><strong>${labelNotes}:</strong> ${escapeHtml(order.notes)}</div>` : ''}
  ${order.adminNotes ? `<div class="notes-box" style="background:#faf5ff;border-color:#c4b5fd;color:#4c1d95"><strong>${labelAdminNote}:</strong> ${escapeHtml(order.adminNotes)}</div>` : ''}

  <div class="footer">Supermarkt Lieferservice &bull; INV-${order.id.slice(0,8).toUpperCase()} &bull; ${new Date(order.createdAt).toLocaleDateString()}</div>
</body>
</html>`;

    return html;
  };

  // Compact single-column layout for an 80mm thermal receipt printer —
  // no multi-column table, no color, dashed-line separators, monospace.
  const buildThermalReceiptHtml = (order) => {
    const isAr = language === 'ar';
    const dir = isAr ? 'rtl' : 'ltr';
    const total = Number(order.totalAmount);

    const escapeHtml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const labelQty       = isAr ? 'الكمية'            : 'Menge';
    const labelGross     = isAr ? 'المجموع الكلي'     : 'Gesamtbetrag';
    const labelSubtotalGross = isAr ? 'المجموع الفرعي' : 'Zwischensumme';
    const labelCoupon    = isAr ? 'كوبون الخصم'       : 'Gutschein';
    const labelPromo     = isAr ? 'خصم العروض'        : 'Aktionsrabatt';
    const labelDeliveryFee = isAr ? 'رسوم التوصيل'    : 'Liefergebühr';
    const labelDelivery  = isAr ? 'عنوان التسليم'    : 'Lieferadresse';
    const labelInvoice   = isAr ? 'فاتورة'            : 'Rechnung';
    const labelOrder     = isAr ? 'رقم الطلب'        : 'Bestellnummer';
    const labelDate      = isAr ? 'التاريخ'           : 'Datum';
    const labelNotes     = isAr ? 'ملاحظات'           : 'Hinweise';
    const thanks         = isAr ? 'شكراً لتسوقكم معنا!' : 'Danke für Ihren Einkauf!';

    const itemsHtml = (order.orderItems || []).map((item) => {
      const rawName = (isAr ? item.product?.nameAr : item.product?.nameDe) || item.product?.name || item.productId;
      const name = escapeHtml(rawName);
      const subtotal = Number(item.subtotal);
      const unitPrice = item.quantity > 0 ? subtotal / item.quantity : 0;
      return `
        <div class="item">
          <div class="item-name">${name}</div>
          <div class="item-line"><span>${item.quantity} x €${unitPrice.toFixed(2)}</span><span>€${subtotal.toFixed(2)}</span></div>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title>${labelInvoice} – INV-${order.id.slice(0,8).toUpperCase()}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Courier New',${isAr ? "'Noto Sans Arabic'," : ''}monospace;font-size:12px;color:#000;background:#fff;direction:${dir};width:76mm;padding:2mm}
    .center{text-align:center}
    .brand{font-size:15px;font-weight:800}
    .sub{font-size:10px;margin-top:2px}
    .dashed{border-top:1px dashed #000;margin:6px 0}
    .row{display:flex;justify-content:space-between;font-size:11px;padding:1px 0}
    .item{margin:4px 0}
    .item-name{font-weight:700;font-size:11px}
    .item-line{display:flex;justify-content:space-between;font-size:11px}
    .totals-row{display:flex;justify-content:space-between;font-size:11px;padding:1px 0}
    .totals-row.total{font-weight:800;font-size:13px;border-top:1px dashed #000;margin-top:4px;padding-top:4px}
    .notes{font-size:10px;margin-top:6px}
    .footer{text-align:center;font-size:10px;margin-top:10px}
    @media print{body{width:auto}@page{size:80mm auto;margin:2mm}}
  </style>
</head>
<body>
  <div class="center">
    <div class="brand">Supermarkt Lieferservice</div>
    <div class="sub">${labelInvoice} INV-${order.id.slice(0,8).toUpperCase()}</div>
    <div class="sub">${labelDate}: ${new Date(order.createdAt).toLocaleDateString(isAr?'ar-DE':'de-DE')}</div>
    <div class="sub">${labelOrder}: #${order.id.slice(0,8).toUpperCase()}</div>
  </div>

  <div class="dashed"></div>

  <div>${escapeHtml(order.customer?.name || order.customerName || '—')}</div>
  ${(order.customer?.phone || order.customerPhone) ? `<div class="sub">${escapeHtml(order.customer?.phone || order.customerPhone)}</div>` : ''}
  <div class="sub" style="margin-top:4px">${labelDelivery}: ${escapeHtml(order.deliveryAddress || order.customer?.address || '—')}</div>

  <div class="dashed"></div>

  ${itemsHtml}

  <div class="dashed"></div>

  ${Number(order.itemsSubtotal) > 0 && (Number(order.couponDiscount) > 0 || Number(order.promotionDiscount) > 0) ? `
  <div class="totals-row"><span>${labelSubtotalGross}</span><span>€${Number(order.itemsSubtotal).toFixed(2)}</span></div>
  ` : ''}
  ${Number(order.promotionDiscount) > 0 ? `
  <div class="totals-row"><span>${labelPromo}</span><span>-€${Number(order.promotionDiscount).toFixed(2)}</span></div>
  ` : ''}
  ${Number(order.couponDiscount) > 0 ? `
  <div class="totals-row"><span>${labelCoupon}${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ''}</span><span>-€${Number(order.couponDiscount).toFixed(2)}</span></div>
  ` : ''}
  ${Number(order.deliveryFee) > 0 ? `
  <div class="totals-row"><span>${labelDeliveryFee}</span><span>€${Number(order.deliveryFee).toFixed(2)}</span></div>
  ` : ''}
  <div class="totals-row total"><span>${labelGross}</span><span>€${total.toFixed(2)}</span></div>

  ${order.notes ? `<div class="notes"><strong>${labelNotes}:</strong> ${escapeHtml(order.notes)}</div>` : ''}

  <div class="footer">${thanks}</div>
</body>
</html>`;

    return html;
  };

  const handleOpenPrintModal_orig = (order) => {
    setPrintOrder(order);
    setShowPrintModal(true);
  };

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'pending':
        return {
          icon: Clock,
          label: t('pending'),
          classes: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-900/60'
        };
      case 'pending_customer_approval':
        return {
          icon: AlertTriangle,
          label: language === 'ar' ? 'بانتظار موافقة العميل' : 'Wartet auf Kundenbestätigung',
          classes: 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800'
        };
      case 'accepted':
        return {
          icon: CheckCircle2,
          label: t('accepted'),
          classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-900/60'
        };
      case 'preparing':
        return {
          icon: Layers,
          label: t('preparing'),
          classes: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-900/60'
        };
      case 'shipped':
        return {
          icon: Truck,
          label: t('shipped'),
          classes: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-900/60'
        };
      case 'out_for_delivery':
        return {
          icon: Truck,
          label: language === 'ar' ? 'جاري التوصيل للمنزل' : 'In Zustellung',
          classes: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-900/60'
        };
      case 'confirmed':
        return {
          icon: CheckCircle2,
          label: t('accepted'),
          classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-900/60'
        };
      case 'delivered':
        return {
          icon: CheckCircle2,
          label: t('delivered'),
          classes: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-900/60'
        };
      case 'declined':
      case 'rejected':
      case 'decline':
      case 'canceled':
      case 'cancelled':
        return {
          icon: XCircle,
          label: t('declined'),
          classes: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-900/60'
        };
      default:
        return {
          icon: Clock,
          label: status,
          classes: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-gray-800 dark:text-slate-300 dark:border-gray-700'
        };
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customer?.name && order.customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customerPhone && order.customerPhone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.deliveryAddress && order.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      const orderStatus = order.status?.toLowerCase();
      if (statusFilter === 'declined') {
        matchesStatus = orderStatus === 'declined' || orderStatus === 'rejected' || orderStatus === 'decline';
      } else {
        matchesStatus = orderStatus === statusFilter;
      }
    }
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t('orders')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
            {t('manageTrack')}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm rounded-xl shadow-sm transition touch-manipulation cursor-pointer"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>{t('createOrder')}</span>
        </button>
      </div>

      {/* Admin Quick Metric Summary Bar */}
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-2.5">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`p-2.5 sm:p-3 rounded-xl border text-start transition touch-manipulation cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 dark:border-blue-700/80 text-blue-900 dark:text-blue-200 shadow-2xs'
              : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-850 hover:border-blue-300 dark:hover:border-gray-700'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
            {t('all')}
          </span>
          <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{metrics.total}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className={`p-2.5 sm:p-3 rounded-xl border text-start transition touch-manipulation cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 dark:border-amber-700/80 text-amber-900 dark:text-amber-200 shadow-2xs'
              : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-850 hover:border-amber-300 dark:hover:border-gray-700'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 block truncate">
            {t('pending')}
          </span>
          <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{metrics.pending}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('pending_customer_approval')}
          className={`p-2.5 sm:p-3 rounded-xl border text-start transition touch-manipulation cursor-pointer ${
            statusFilter === 'pending_customer_approval'
              ? 'bg-amber-100 dark:bg-amber-950 border-amber-500 text-amber-950 dark:text-amber-200 shadow-2xs'
              : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-850 hover:border-amber-400 dark:hover:border-gray-700'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 block truncate">
            {language === 'ar' ? 'بانتظار العميل' : 'Wartet auf Kunde'}
          </span>
          <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{metrics.pending_customer_approval}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('accepted')}
          className={`p-2.5 sm:p-3 rounded-xl border text-start transition touch-manipulation cursor-pointer ${
            statusFilter === 'accepted'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-700/80 text-emerald-900 dark:text-emerald-200 shadow-2xs'
              : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-850 hover:border-emerald-300 dark:hover:border-gray-700'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block truncate">
            {t('accepted')}
          </span>
          <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{metrics.accepted}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('preparing')}
          className={`p-2.5 sm:p-3 rounded-xl border text-start transition touch-manipulation cursor-pointer ${
            statusFilter === 'preparing'
              ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-400 dark:border-indigo-700/80 text-indigo-900 dark:text-indigo-200 shadow-2xs'
              : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-850 hover:border-indigo-300 dark:hover:border-gray-700'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block truncate">
            {t('preparing')}
          </span>
          <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{metrics.preparing}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('shipped')}
          className={`p-2.5 sm:p-3 rounded-xl border text-start transition touch-manipulation cursor-pointer ${
            statusFilter === 'shipped'
              ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 dark:border-blue-700/80 text-blue-900 dark:text-blue-200 shadow-2xs'
              : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-850 hover:border-blue-300 dark:hover:border-gray-700'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 block truncate">
            {t('shipped')}
          </span>
          <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{metrics.shipped}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('delivered')}
          className={`p-2.5 sm:p-3 rounded-xl border text-start transition touch-manipulation cursor-pointer ${
            statusFilter === 'delivered'
              ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-400 dark:border-purple-700/80 text-purple-900 dark:text-purple-200 shadow-2xs'
              : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-850 hover:border-purple-300 dark:hover:border-gray-700'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 block truncate">
            {t('delivered')}
          </span>
          <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{metrics.delivered}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('declined')}
          className={`p-2.5 sm:p-3 rounded-xl border text-start transition touch-manipulation cursor-pointer ${
            statusFilter === 'declined'
              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-700/80 text-rose-900 dark:text-rose-200 shadow-2xs'
              : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-850 hover:border-rose-300 dark:hover:border-gray-700'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 block truncate">
            {t('declined')}
          </span>
          <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{metrics.declined}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder={t('searchOrders')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ps-10 sm:ps-11 pe-4 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm transition"
        >
          <option value="all" className="dark:bg-gray-900 dark:text-white">{t('allStatus')}</option>
          <option value="pending" className="dark:bg-gray-900 dark:text-white">{t('pending')}</option>
          <option value="pending_customer_approval" className="dark:bg-gray-900 dark:text-white">
            {language === 'ar' ? 'بانتظار موافقة العميل' : 'Wartet auf Kundenbestätigung'}
          </option>
          <option value="accepted" className="dark:bg-gray-900 dark:text-white">{t('accepted')}</option>
          <option value="preparing" className="dark:bg-gray-900 dark:text-white">{t('preparing')}</option>
          <option value="shipped" className="dark:bg-gray-900 dark:text-white">{t('shipped')}</option>
          <option value="delivered" className="dark:bg-gray-900 dark:text-white">{t('delivered')}</option>
          <option value="declined" className="dark:bg-gray-900 dark:text-white">{t('declined')}</option>
        </select>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.map((order) => {
          const badge = getStatusBadge(order.status);
          const StatusIcon = badge.icon;
          const currentStatus = order.status?.toLowerCase();
          const totalItems = (order.orderItems || []).reduce((s, i) => s + i.quantity, 0);
          const { customNotes, customerResponse } = parseOrderNotes(order.adminNotes, language);
          const isExpanded = !!expandedOrders[order.id];

          return (
            <div 
              key={order.id} 
              className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/90 dark:border-gray-800 shadow-2xs hover:shadow-md transition-all overflow-hidden"
            >
              {/* ── 1. Compact Header Bar: Status + ID + Timestamp + Total Price ── */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-5 py-3 bg-slate-50/80 dark:bg-gray-950/50 border-b border-slate-100 dark:border-gray-850">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.classes}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {badge.label}
                  </span>

                  {/* Order ID */}
                  <span className="font-bold text-slate-900 dark:text-white text-xs font-mono">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>

                  {/* Date & Time */}
                  <span className="text-slate-400 dark:text-gray-500 text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {new Date(order.createdAt).toLocaleDateString(language === 'ar' ? 'ar-DE' : 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    <span className="text-slate-300 dark:text-gray-700">&bull;</span>
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {/* Delivery tag */}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200/80 dark:border-emerald-900/50">
                    <Truck className="w-3 h-3" />
                    {language === 'ar' ? 'توصيل منزلي' : 'Hauszustellung'}
                  </span>

                  {Number(order.promotionDiscount) > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px] font-bold border border-rose-200/80 dark:border-rose-900/50">
                      <Sparkles className="w-3 h-3 text-rose-500" />
                      <span>{t('promotions')}: -€{Number(order.promotionDiscount).toFixed(2)}</span>
                    </span>
                  )}

                  {Number(order.couponDiscount) > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[11px] font-bold border border-purple-200/80 dark:border-purple-900/50" title={order.couponCode ? `Code: ${order.couponCode}` : undefined}>
                      <Tag className="w-3 h-3 text-purple-500" />
                      <span>{order.couponCode || t('coupon')}: -€{Number(order.couponDiscount).toFixed(2)}</span>
                    </span>
                  )}
                </div>

                {/* Amount + items count */}
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-gray-800 text-slate-600 dark:text-slate-300">
                    {totalItems} {t('items')}
                  </span>
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
                    €{Number(order.totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* ── 2. Card Content: Clean 2-Column Info & Notes ── */}
              <div className="p-4 sm:p-5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Left Column: Customer details */}
                  <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-gray-950/30 border border-slate-100 dark:border-gray-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        <span>{order.customer?.name || order.customerName || 'Kunde'}</span>
                      </div>
                      {(order.customerPhone || order.customer?.phone) && (
                        <a
                          href={`tel:${order.customerPhone || order.customer?.phone}`}
                          className="font-mono text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold inline-flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{order.customerPhone || order.customer?.phone}</span>
                        </a>
                      )}
                    </div>

                    {order.deliveryAddress && (
                      <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300 pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{order.deliveryAddress}</span>
                      </div>
                    )}
                    {formatDeliverySlot(order.deliverySlot, language === 'ar') && (
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 pt-0.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{formatDeliverySlot(order.deliverySlot, language === 'ar')}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Customer Response & Alerts */}
                  <div className="space-y-2">
                    {/* Customer Acceptance Badge (Bilingual & Clean) */}
                    {customerResponse && customerResponse.type === 'accepted' && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{customerResponse.label}</span>
                      </div>
                    )}

                    {customerResponse && customerResponse.type === 'declined' && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs font-bold">
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{customerResponse.label}</span>
                      </div>
                    )}

                    {/* Pending customer approval notification */}
                    {order.status === 'pending_customer_approval' && (
                      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <span className="font-bold block">
                            {language === 'ar' ? 'تعديل مقترح (بانتظار موافقة العميل)' : 'Anpassung vorgeschlagen (Wartet auf Bestätigung)'}
                          </span>
                          {order.modificationReason && (
                            <span className="text-[11px] text-amber-800 dark:text-amber-300 italic block mt-0.5">
                              "{order.modificationReason}"
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Customer note */}
                    {order.notes && (
                      <div className="flex items-start gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-gray-950/50 border border-slate-200/60 dark:border-gray-800 text-[11px] text-slate-600 dark:text-slate-400">
                        <FileText className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        <span className="italic truncate">
                          <strong className="not-italic text-slate-700 dark:text-slate-300">
                            {language === 'ar' ? 'ملاحظة العميل:' : 'Kundennotiz:'}
                          </strong> "{order.notes}"
                        </span>
                      </div>
                    )}

                    {/* Custom Admin note */}
                    {customNotes && (
                      <div className="flex items-start gap-1.5 p-2 rounded-lg bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-900/40 text-[11px] text-purple-800 dark:text-purple-300">
                        <Lock className="w-3 h-3 text-purple-600 shrink-0 mt-0.5" />
                        <span className="truncate">
                          <strong className="text-purple-900 dark:text-purple-200">{t('adminNotes')}:</strong> {customNotes}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── 3. Compact & Collapsible Items Bar ── */}
                <div className="pt-2 border-t border-slate-100 dark:border-gray-800/80">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    {/* Compact preview chips */}
                    <div className="flex items-center gap-1.5 overflow-hidden flex-1 text-slate-500 dark:text-gray-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                        {language === 'ar' ? 'المنتجات:' : 'Artikel:'}
                      </span>
                      <span className="truncate">
                        {(order.orderItems || []).map((it) => {
                          const name = (language === 'ar' ? it.product?.nameAr : it.product?.nameDe) || it.product?.name || 'Artikel';
                          return `${name} (${it.quantity}×)`;
                        }).join(', ')}
                      </span>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => toggleOrderItemsExpand(order.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
                    >
                      <span>
                        {isExpanded
                          ? language === 'ar' ? 'إخفاء التفاصيل' : 'Weniger'
                          : language === 'ar' ? `عرض ${order.orderItems?.length || 0} عناصر` : `${order.orderItems?.length || 0} Artikel anzeigen`}
                      </span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Expanded item details */}
                  {isExpanded && (
                    <div className="mt-2.5 bg-slate-50 dark:bg-gray-950/60 rounded-xl border border-slate-200/70 dark:border-gray-800 overflow-hidden divide-y divide-slate-100 dark:divide-gray-800/80 animate-in fade-in duration-150">
                      {(order.orderItems || []).map((item, idx) => {
                        const itemName = (language === 'ar' ? item.product?.nameAr : item.product?.nameDe) || item.product?.name || item.productId;
                        const subtotal = Number(item.subtotal || item.price * item.quantity);
                        const unitPrice = Number(item.price || (item.quantity > 0 ? subtotal / item.quantity : 0));

                        return (
                          <div key={item.id || idx} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {item.quantity}×
                              </span>
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{itemName}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 font-mono">
                              <span className="text-[11px] text-slate-400">€{unitPrice.toFixed(2)}/Stk.</span>
                              <span className="font-bold text-slate-900 dark:text-white">€{subtotal.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ── 4. Clean, Grouped Action Footer ── */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 sm:px-5 py-2.5 bg-slate-50/80 dark:bg-gray-950/50 border-t border-slate-100 dark:border-gray-850">
                {/* Left: Utilities */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => handleViewDetails(order)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-850 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer touch-manipulation"
                  >
                    {t('viewDetails')}
                  </button>

                  <button
                    onClick={() => handleOpenPrintModal(order)}
                    title={t('printInvoice')}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-850 text-slate-500 dark:text-slate-400 transition cursor-pointer touch-manipulation"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>

                  {currentStatus !== 'delivered' && currentStatus !== 'declined' && currentStatus !== 'cancelled' && (
                    <button
                      onClick={() => handleOpenEditModal(order)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80 transition cursor-pointer touch-manipulation"
                    >
                      <Edit className="w-3 h-3" />
                      <span>{language === 'ar' ? 'تعديل الطلب' : 'Auftrag bearbeiten'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => openStatusModal(order, order.status)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-gray-700 transition cursor-pointer touch-manipulation"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>{t('changeStatus')}</span>
                  </button>
                </div>

                {/* Right: Primary Step Workflow Button + Delete */}
                <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-wrap pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-gray-800">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {currentStatus === 'pending' && (
                      <>
                        <button onClick={() => handleQuickStatusChange(order.id, 'accepted')} disabled={updating}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition shadow-2xs cursor-pointer touch-manipulation">
                          {t('accept')}
                        </button>
                        <button onClick={() => openStatusModal(order, 'declined')} disabled={updating}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-lg font-bold text-xs transition cursor-pointer touch-manipulation">
                          {t('decline')}
                        </button>
                      </>
                    )}
                    {currentStatus === 'accepted' && (
                      <button onClick={() => handleQuickStatusChange(order.id, 'preparing')} disabled={updating}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition shadow-2xs cursor-pointer touch-manipulation">
                        <Clock className="w-3 h-3" />
                        <span>{t('preparing')}</span>
                      </button>
                    )}
                    {currentStatus === 'preparing' && (
                      <button onClick={() => handleQuickStatusChange(order.id, 'shipped')} disabled={updating}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition shadow-2xs cursor-pointer touch-manipulation">
                        <Truck className="w-3 h-3" />
                        <span>{t('markShipped')}</span>
                      </button>
                    )}
                    {currentStatus === 'shipped' && (
                      <button onClick={() => handleQuickStatusChange(order.id, 'delivered')} disabled={updating}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition shadow-2xs cursor-pointer touch-manipulation">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{t('markDelivered')}</span>
                      </button>
                    )}
                    {currentStatus === 'declined' && (
                      <button onClick={() => handleQuickStatusChange(order.id, 'accepted')} disabled={updating}
                        className="px-3 py-1.5 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg font-bold text-xs transition cursor-pointer touch-manipulation">
                        {t('accept')}
                      </button>
                    )}
                  </div>


                </div>
              </div>
            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800">
            <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">{t('noOrdersFound')}</p>
          </div>
        )}
      </div>

      {/* Status Change & Admin Note Modal */}
      {statusModalOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg overflow-y-auto border border-slate-200 dark:border-gray-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100/80 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('changeStatusPrompt')}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Order #{statusModalOrder.id.slice(0, 8)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setStatusModalOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('status')} *
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm capitalize"
                >
                  <option value="pending" className="dark:bg-gray-900 dark:text-white">{t('pending')}</option>
                  <option value="accepted" className="dark:bg-gray-900 dark:text-white">{t('accepted')}</option>
                  <option value="preparing" className="dark:bg-gray-900 dark:text-white">{t('preparing')}</option>
                  <option value="out_for_delivery" className="dark:bg-gray-900 dark:text-white">{language === 'ar' ? 'جاري التوصيل للمنزل' : 'In Zustellung (Lieferung)'}</option>
                  <option value="shipped" className="dark:bg-gray-900 dark:text-white">{t('shipped')}</option>
                  <option value="delivered" className="dark:bg-gray-900 dark:text-white">{t('delivered')}</option>
                  <option value="declined" className="dark:bg-gray-900 dark:text-white">{t('declined')}</option>
                </select>
                {targetStatus === 'declined' && (
                  <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                    Note: If previously accepted or preparing, deducted stock will be automatically restored to inventory.
                  </p>
                )}
              </div>

              {/* Admin Note Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                    {t('adminNotes')} ({t('internalNoteOnly')})
                  </label>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-purple-500" /> Private
                  </span>
                </div>
                <textarea
                  rows="3"
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="z.B. 2. Stock links klingeln, Lieferzeitfenster 18:00-19:00, passend bar..."
                  className="w-full px-3.5 py-2.5 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/60 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-sm placeholder-slate-400"
                />
              </div>

              {/* Customer Note Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('customerNotes')}
                </label>
                <textarea
                  rows="2"
                  value={customerNoteInput}
                  onChange={(e) => setCustomerNoteInput(e.target.value)}
                  placeholder={t('notesPlaceholder')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm placeholder-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setStatusModalOrder(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={updating}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {updating ? t('loading') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-7 w-full max-w-2xl max-h-[90dvh] overflow-y-auto border border-slate-200 dark:border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-5 border-b border-slate-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {t('orderDetails')}
                </h2>
                <button
                  type="button"
                  onClick={() => handleOpenPrintModal(selectedOrder)}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-850 text-slate-600 dark:text-slate-300 transition cursor-pointer touch-manipulation"
                  title={t('printInvoice')}
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 sm:space-y-6">
              {/* Order Info Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-gray-950/60 border border-slate-100 dark:border-gray-800">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('orderId')}</p>
                  <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white truncate">
                    #{selectedOrder.id.slice(0, 8)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{t('status')}</p>
                  {(() => {
                    const modalBadge = getStatusBadge(selectedOrder.status);
                    const ModalStatusIcon = modalBadge.icon;
                    return (
                      <div
                      className={`appearance-none ps-6 pe-5 sm:ps-7 sm:pe-6 py-1 rounded-full text-xs font-bold border shadow-2xs outline-none transition capitalize truncate ${modalBadge.classes}`}
                      >
{['rejected', 'decline', 'declined'].includes(selectedOrder.status?.toLowerCase()) ? 'declined' : selectedOrder.status?.toLowerCase()}
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {language === 'ar' ? 'العميل' : 'Kunde'}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {selectedOrder.customer?.name || selectedOrder.customerName || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('totalAmount')}</p>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    €{Number(selectedOrder.totalAmount).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Home Delivery Information Box */}
              {(selectedOrder.deliveryAddress || selectedOrder.customer || selectedOrder.orderType === 'home_delivery') && (
                <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-850 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                    <Truck className="w-4 h-4 shrink-0" />
                    <span>{language === 'ar' ? 'بيانات التوصيل المنزلي (الدفع عند الاستلام)' : 'Hauszustellung (Zahlung an der Haustür)'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 dark:text-gray-400">{language === 'ar' ? 'عنوان التوصيل:' : 'Lieferadresse:'} </span>
                    <span className="font-bold text-slate-800 dark:text-gray-200 break-words">{selectedOrder.deliveryAddress || '—'}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 sm:gap-4 text-slate-600 dark:text-gray-300 pt-1">
                    {(selectedOrder.customerPhone || selectedOrder.customer?.phone) && (
                      <span className="font-mono inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{selectedOrder.customerPhone || selectedOrder.customer?.phone}</span>
                      </span>
                    )}
                    {(selectedOrder.customerEmail || selectedOrder.customer?.email) && (
                      <span className="break-all inline-flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{selectedOrder.customerEmail || selectedOrder.customer?.email}</span>
                      </span>
                    )}
                    {selectedOrder.deliveryNotes && (
                      <span className="italic break-words inline-flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{selectedOrder.deliveryNotes}</span>
                      </span>
                    )}
                  </div>

                  {/* Delivery time — its own prominent row with a visible edit button */}
                  <div className="flex items-center justify-between gap-2 pt-2 mt-1 border-t border-emerald-200/50 dark:border-emerald-850">
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-slate-700 dark:text-gray-200 truncate">
                        {formatDeliverySlot(selectedOrder.deliverySlot, language === 'ar') || (language === 'ar' ? 'لم يُحدد بعد' : 'Noch nicht festgelegt')}
                      </span>
                    </span>
                    {!editingDeliverySlot && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditDeliverySlot(selectedOrder)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer shrink-0 shadow-sm"
                      >
                        <Edit className="w-3 h-3" />
                        {language === 'ar' ? 'تعديل الوقت' : 'Zeit bearbeiten'}
                      </button>
                    )}
                  </div>

                  {editingDeliverySlot && (
                    <div className="pt-2 mt-1 border-t border-emerald-200/60 dark:border-emerald-850 space-y-2">
                      <div className="flex flex-wrap items-end gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">
                            {language === 'ar' ? 'التاريخ' : 'Datum'}
                          </label>
                          <input
                            type="date"
                            value={editDeliveryDate}
                            min={todayIso()}
                            max={maxDeliveryDateIso()}
                            onChange={(e) => setEditDeliveryDate(e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {deliveryWindows.length === 0 ? (
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 self-center">
                              {language === 'ar'
                                ? 'لا توجد أوقات توصيل مُفعّلة. أضفها في الإعدادات.'
                                : 'Keine aktiven Zeitfenster. Bitte in den Einstellungen anlegen.'}
                            </p>
                          ) : (
                            deliveryWindows.map((w) => (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => setEditSelectedWindow(w)}
                                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                                  editSelectedWindow?.id === w.id
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-300 hover:border-emerald-400'
                                }`}
                              >
                                {windowLabel(w.startHour, w.endHour, language === 'ar')}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveDeliverySlot(selectedOrder.id)}
                          disabled={savingDeliverySlot || !editSelectedWindow}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer"
                        >
                          {savingDeliverySlot ? '...' : (language === 'ar' ? 'حفظ' : 'Speichern')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDeliverySlot(false)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 text-[11px] font-bold cursor-pointer"
                        >
                          {language === 'ar' ? 'إلغاء' : 'Abbrechen'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Order Items Table */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2.5 sm:mb-3">
                  {t('orderItems')}
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-gray-800">
                  <table className="w-full text-xs sm:text-sm text-left rtl:text-right min-w-[320px]">
                    <thead className="bg-slate-100 dark:bg-gray-850 text-[11px] sm:text-xs uppercase text-slate-600 dark:text-slate-400">
                      <tr>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3">{t('product')}</th>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center">{t('quantity')}</th>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-end">{t('price')}</th>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-end">{t('subtotal')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                      {(selectedOrder.orderItems || []).map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/40">
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-slate-900 dark:text-white">
                            {((language === 'ar' ? item.product?.nameAr : item.product?.nameDe) || item.product?.name || item.productId)}
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center text-slate-700 dark:text-slate-300">
                            {item.quantity}
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-end text-slate-700 dark:text-slate-300 font-mono">
                            €{Number(item.price).toFixed(2)}
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-end font-semibold text-slate-900 dark:text-white font-mono">
                            €{Number(item.subtotal).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Totals Summary */}
              <div className="flex justify-end">
                <div className="w-full sm:w-72 bg-slate-50 dark:bg-gray-950/60 rounded-xl border border-slate-200 dark:border-gray-800 p-3.5 space-y-2 text-xs">
                  {Number(selectedOrder.itemsSubtotal) > 0 && (Number(selectedOrder.couponDiscount) > 0 || Number(selectedOrder.promotionDiscount) > 0) && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>{language === 'ar' ? 'المجموع الفرعي' : 'Zwischensumme'}</span>
                      <span className="font-mono">€{Number(selectedOrder.itemsSubtotal).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(selectedOrder.promotionDiscount) > 0 && (
                    <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                      <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> {language === 'ar' ? 'خصم العروض' : 'Aktionsrabatt'}</span>
                      <span className="font-mono">-€{Number(selectedOrder.promotionDiscount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(selectedOrder.couponDiscount) > 0 && (
                    <div className="flex justify-between text-purple-600 dark:text-purple-400 font-semibold">
                      <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {t('coupon')} {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''}</span>
                      <span className="font-mono">-€{Number(selectedOrder.couponDiscount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(selectedOrder.deliveryFee) > 0 ? (
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>{t('deliveryFee')}</span>
                        <span className="font-mono">€{Number(selectedOrder.deliveryFee).toFixed(2)}</span>
                      </div>
                      {selectedOrder.deliveryDistanceKm != null && Number(selectedOrder.deliveryDistanceKm) > 0 && (
                        <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            <span>
                              {language === 'ar'
                                ? `المسافة: ${selectedOrder.deliveryDistanceKm} كم`
                                : `Distanz: ${selectedOrder.deliveryDistanceKm} km`}
                              {selectedOrder.baseDeliveryFee != null && selectedOrder.distanceDeliveryFee != null
                                ? ` (Basis: €${Number(selectedOrder.baseDeliveryFee).toFixed(2)} + Distanz: €${Number(selectedOrder.distanceDeliveryFee).toFixed(2)})`
                                : ''}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span>{t('deliveryFee')}</span>
                      <span>{t('freeShipping')}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-gray-800 text-sm font-black text-slate-900 dark:text-white">
                    <span>{t('total')}</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">€{Number(selectedOrder.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Customer Response / Admin Note in Detail Modal */}
              {(() => {
                const { customNotes, customerResponse } = parseOrderNotes(selectedOrder.adminNotes, language);
                return (
                  <>
                    {customerResponse && (
                      <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-bold ${
                        customerResponse.type === 'accepted'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-850 dark:text-emerald-200'
                          : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-850 dark:text-rose-200'
                      }`}>
                        {customerResponse.type === 'accepted' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        )}
                        <span>{customerResponse.label}</span>
                      </div>
                    )}

                    {customNotes && (
                      <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                          <Lock className="w-3.5 h-3.5" />
                          <span>{t('adminNotes')} ({t('internalNoteOnly')})</span>
                        </div>
                        <p className="text-xs text-purple-950 dark:text-purple-200 whitespace-pre-line">
                          {customNotes}
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Customer Notes Details Box */}
              {selectedOrder.notes && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-gray-950/60 border border-slate-100 dark:border-gray-800 text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">{t('customerNotes')}:</p>
                  <p className="break-words">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const orderToEdit = selectedOrder;
                      setShowDetailModal(false);
                      openStatusModal(orderToEdit, orderToEdit.status);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/50 transition shadow-2xs touch-manipulation cursor-pointer flex-1 sm:flex-none"
                    title={t('alwaysChangeStatusHint')}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>{t('changeStatus')} & {t('adminNotes')}</span>
                  </button>
                  {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'declined' && selectedOrder.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => {
                        const orderToEdit = selectedOrder;
                        setShowDetailModal(false);
                        handleOpenEditModal(orderToEdit);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80 transition touch-manipulation cursor-pointer flex-1 sm:flex-none"
                    >
                      <Edit className="w-4 h-4" />
                      <span>{language === 'ar' ? 'تعديل المنتجات' : 'Bestellung anpassen'}</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenPrintModal(selectedOrder)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-850 text-slate-700 dark:text-slate-300 transition touch-manipulation cursor-pointer flex-1 sm:flex-none"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{t('printInvoice')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-800 dark:text-slate-200 transition touch-manipulation cursor-pointer flex-1 sm:flex-none"
                  >
                    {t('close')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Invoice / Packing Slip Modal */}
      {showPrintModal && printOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-gray-800 rounded-2xl w-full max-w-2xl max-h-[92dvh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal toolbar */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{t('printInvoice')}</h3>
                  <p className="text-[11px] text-slate-400 dark:text-gray-500 font-mono">INV-{printOrder.id.slice(0,8).toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => printReceipt(printOrder, 'a4')}
                  title={language === 'ar' ? 'طباعة A4' : 'A4 drucken'}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition touch-manipulation cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">A4</span>
                </button>
                <button
                  type="button"
                  onClick={() => printReceipt(printOrder, 'thermal')}
                  title={language === 'ar' ? 'طباعة على طابعة الإيصالات' : 'Auf Bon-Drucker drucken'}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-xl text-xs font-semibold shadow-sm transition touch-manipulation cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">{language === 'ar' ? 'بون' : 'Bon'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-500 dark:text-slate-400 touch-manipulation cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Receipt Preview */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 sm:pb-5 border-b-2 border-blue-600 dark:border-blue-500">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">Supermarkt Lieferservice</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-gray-400">Hauszustellung &amp; Frische Produkte</p>
                  <p className="text-xs text-slate-400 dark:text-gray-500 font-mono mt-1">
                    {language === 'ar' ? 'فاتورة' : 'Rechnung'} Ref: INV-{printOrder.id.slice(0,8).toUpperCase()}
                  </p>
                </div>
                <div className={`text-${language === 'ar' ? 'start' : 'end'}`}>
                  {(() => { const b = getStatusBadge(printOrder.status); const I = b.icon; return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${b.classes}`}>
                      <I className="w-3.5 h-3.5" />
                      {b.label}
                    </span>
                  ); })()}
                  <p className="text-xs text-slate-400 dark:text-gray-500 mt-2">
                    {language === 'ar' ? 'التاريخ' : 'Datum'}: {new Date(printOrder.createdAt).toLocaleDateString(language === 'ar' ? 'ar-DE' : 'de-DE', {year:'numeric',month:'long',day:'numeric'})}
                  </p>
                </div>
              </div>

              {/* Billing + Delivery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-slate-50 dark:bg-gray-950/60 rounded-xl border border-slate-100 dark:border-gray-800 p-3.5 sm:p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-1.5 sm:mb-2">
                    {language === 'ar' ? 'بيانات العميل' : 'Kundeninformation'}
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{printOrder.customer?.name || printOrder.customerName || '—'}</p>
                  {(printOrder.customer?.email || printOrder.customerEmail) && <p className="text-xs text-slate-500 dark:text-gray-400 break-all">{printOrder.customer?.email || printOrder.customerEmail}</p>}
                  {(printOrder.customer?.phone || printOrder.customerPhone) && <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">Tel: {printOrder.customer?.phone || printOrder.customerPhone}</p>}
                </div>
                <div className="bg-slate-50 dark:bg-gray-950/60 rounded-xl border border-slate-100 dark:border-gray-800 p-3.5 sm:p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-1.5 sm:mb-2">
                    {language === 'ar' ? 'عنوان التسليم' : 'Lieferadresse'}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed break-words">
                    {printOrder.deliveryAddress || printOrder.customer?.address || '—'}
                  </p>
                  {formatDeliverySlot(printOrder.deliverySlot, language === 'ar') && (
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1.5">
                      {formatDeliverySlot(printOrder.deliverySlot, language === 'ar')}
                    </p>
                  )}
                  {printOrder.notes && (
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-2 italic break-words">
                      Hinweis: {printOrder.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="rounded-xl border border-slate-200 dark:border-gray-800 overflow-x-auto">
                <table className="w-full text-xs min-w-[340px]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  <thead>
                    <tr className="bg-blue-900 dark:bg-blue-950 text-white">
                      <th className="px-3 py-3 text-start font-semibold">{language === 'ar' ? 'المنتج' : 'Artikel'}</th>
                      <th className="px-3 py-3 text-center font-semibold">{language === 'ar' ? 'الرقم' : 'Art-Nr.'}</th>
                      <th className="px-3 py-3 text-end font-semibold">{language === 'ar' ? 'سعر الوحدة' : 'Einzelpreis'}</th>
                      <th className="px-3 py-3 text-center font-semibold">{language === 'ar' ? 'الكمية' : 'Menge'}</th>
                      <th className="px-3 py-3 text-end font-semibold">{language === 'ar' ? 'المجموع' : 'Betrag'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                    {(printOrder.orderItems || []).map((item, idx) => {
                      const name = (language === 'ar' ? item.product?.nameAr : item.product?.nameDe) || item.product?.name || item.productId;
                      const subtotal = Number(item.subtotal);
                      const unitPrice = item.quantity > 0 ? subtotal / item.quantity : 0;
                      return (
                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-slate-50/60 dark:bg-gray-950/40'}>
                          <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white">{name}</td>
                          <td className="px-3 py-2.5 text-center text-slate-400 dark:text-gray-500 font-mono">{item.product?.sku || '—'}</td>
                          <td className="px-3 py-2.5 text-end text-slate-600 dark:text-gray-400 font-mono">€{unitPrice.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-black border border-blue-200/80 dark:border-blue-900/40">
                              {item.quantity}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-end font-bold text-slate-900 dark:text-white font-mono">€{subtotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden divide-y divide-slate-100 dark:divide-gray-800">
                  {Number(printOrder.itemsSubtotal) > 0 && (Number(printOrder.couponDiscount) > 0 || Number(printOrder.promotionDiscount) > 0) && (
                    <div className="flex justify-between px-4 py-2 bg-slate-50 dark:bg-gray-950 text-slate-600 dark:text-slate-300 text-xs">
                      <span>{language === 'ar' ? 'المجموع الفرعي' : 'Zwischensumme'}</span>
                      <span className="font-mono">€{Number(printOrder.itemsSubtotal).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(printOrder.promotionDiscount) > 0 && (
                    <div className="flex justify-between px-4 py-2 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                      <span>{language === 'ar' ? 'خصم العروض' : 'Aktionsrabatt'}</span>
                      <span className="font-mono">-€{Number(printOrder.promotionDiscount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(printOrder.couponDiscount) > 0 && (
                    <div className="flex justify-between px-4 py-2 bg-purple-50/50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 text-xs font-semibold">
                      <span>{language === 'ar' ? 'كوبون الخصم' : 'Gutschein'} {printOrder.couponCode ? `(${printOrder.couponCode})` : ''}</span>
                      <span className="font-mono">-€{Number(printOrder.couponDiscount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(printOrder.deliveryFee) > 0 ? (
                    <div className="px-4 py-2 bg-slate-50 dark:bg-gray-950 text-slate-600 dark:text-slate-300 text-xs space-y-0.5">
                      <div className="flex justify-between">
                        <span>{language === 'ar' ? 'رسوم التوصيل' : 'Liefergebühr'}</span>
                        <span className="font-mono">€{Number(printOrder.deliveryFee).toFixed(2)}</span>
                      </div>
                      {printOrder.deliveryDistanceKm != null && Number(printOrder.deliveryDistanceKm) > 0 && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          <span>
                            {language === 'ar' ? `المسافة: ${printOrder.deliveryDistanceKm} كم` : `Distanz: ${printOrder.deliveryDistanceKm} km`}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-between px-4 py-2 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                      <span>{language === 'ar' ? 'رسوم التوصيل' : 'Liefergebühr'}</span>
                      <span>{language === 'ar' ? 'مجاناً' : 'Kostenlos'}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-4 py-3 bg-blue-900 dark:bg-blue-950 text-white text-sm font-black">
                    <span>{language === 'ar' ? 'المجموع الكلي' : 'Gesamtbetrag'}</span>
                    <span className="font-mono">€{Number(printOrder.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {printOrder.notes && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <p><strong>{language === 'ar' ? 'ملاحظات' : 'Hinweise'}:</strong> {printOrder.notes}</p>
                </div>
              )}
              {printOrder.adminNotes && (
                <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
                  <p><strong>{language === 'ar' ? 'ملاحظة داخلية' : 'Interne Notiz'}:</strong> {printOrder.adminNotes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-gray-800 text-center text-[10px] text-slate-400 dark:text-gray-600">
                Supermarkt Lieferservice &bull; INV-{printOrder.id.slice(0,8).toUpperCase()} &bull; {new Date(printOrder.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-7 w-full max-w-xl max-h-[90dvh] overflow-y-auto border border-slate-200 dark:border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-5 border-b border-slate-100 dark:border-gray-800">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {t('createOrder')}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 sm:space-y-5">
              {/* Customer Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {language === 'ar' ? 'العميل' : 'Kunde'} *
                </label>
                <select
                  required
                  value={orderForm.customerId}
                  onChange={(e) => {
                    const selCust = customers.find(c => c.id === e.target.value);
                    const addr = selCust ? [selCust.street, `${selCust.postalCode || ''} ${selCust.city || ''}`.trim()].filter(Boolean).join(', ') : '';
                    setOrderForm({
                      ...orderForm,
                      customerId: e.target.value,
                      customerName: selCust?.name || '',
                      customerPhone: selCust?.phone || '',
                      deliveryAddress: addr
                    });
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition text-sm cursor-pointer"
                >
                  <option value="" className="dark:bg-gray-900 dark:text-white">-- {language === 'ar' ? 'اختر العميل' : 'Kunde auswählen'} --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id} className="dark:bg-gray-900 dark:text-white">
                      {c.name} ({c.phone || c.email || '—'}) {c.city ? `- ${c.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Delivery Address & Phone Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {language === 'ar' ? 'رقم الهاتف' : 'Telefonnummer'} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={orderForm.customerPhone}
                    onChange={(e) => setOrderForm({ ...orderForm, customerPhone: e.target.value })}
                    placeholder="+49 170 1234567"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {language === 'ar' ? 'عنوان التوصيل' : 'Lieferadresse'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={orderForm.deliveryAddress}
                    onChange={(e) => setOrderForm({ ...orderForm, deliveryAddress: e.target.value })}
                    placeholder="Musterstr. 12, 10115 Berlin"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Order Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {t('orderItems')} *
                  </label>
                  <button
                    type="button"
                    onClick={() => setOrderForm({
                      ...orderForm,
                      items: [...orderForm.items, { productId: '', quantity: 1 }]
                    })}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer touch-manipulation"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('addItem')}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {orderForm.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 sm:gap-3">
                      <select
                        required
                        value={item.productId}
                        onChange={(e) => {
                          const nextItems = [...orderForm.items];
                          nextItems[index].productId = e.target.value;
                          setOrderForm({ ...orderForm, items: nextItems });
                        }}
                        className="flex-1 min-w-0 px-2.5 sm:px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="" className="dark:bg-gray-900 dark:text-white">-- {t('selectProduct')} --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id} className="dark:bg-gray-900 dark:text-white">
                            {((language === 'ar' ? p.nameAr : p.nameDe) || p.name)} (€{Number(p.b2bPrice).toFixed(2)}) - {t('stock')}: {p.stock}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => {
                          const nextItems = [...orderForm.items];
                          nextItems[index].quantity = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setOrderForm({ ...orderForm, items: nextItems });
                        }}
                        className="w-16 sm:w-20 px-2 sm:px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold shrink-0"
                      />

                      {orderForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextItems = orderForm.items.filter((_, i) => i !== index);
                            setOrderForm({ ...orderForm, items: nextItems });
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition shrink-0 cursor-pointer touch-manipulation"
                          title={t('remove')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('notes')}
                </label>
                <textarea
                  rows="2"
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
                  placeholder={t('notesPlaceholder')}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition cursor-pointer touch-manipulation"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-xl shadow-sm transition cursor-pointer touch-manipulation"
                >
                  {t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Edit Order Modal (Unavailable items & customer approval) ── */}
      {showEditModal && editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-800 p-4 sm:p-7 my-4 sm:my-8 max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-gray-800 mb-4 sm:mb-5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit className="w-4 sm:w-5 h-4 sm:h-5 text-amber-600 shrink-0" />
                  <span>{language === 'ar' ? 'تعديل المنتجات بالطلب (غير متوفرة بالمخزن)' : 'Bestellung anpassen (Artikel nicht vorrätig)'}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                  #{editingOrder.id.slice(0, 8).toUpperCase()} &bull; {editingOrder.customer?.name || editingOrder.customerName || 'Kunde'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition cursor-pointer touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrderEdit} className="space-y-5">
              {/* Notice banner */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {language === 'ar'
                    ? 'عند تعديل الطلب، سيتم إشعار العميل فوراً بالبريد الإلكتروني، وسينتقل الطلب إلى حالة "بانتظار موافقة العميل" حتى يؤكد التعديل أو يلغي الطلب.'
                    : 'Wenn Sie Artikel anpassen oder entfernen, wird der Kunde per E-Mail benachrichtigt. Die Bestellung wechselt in den Status "Wartet auf Kundenbestätigung", bis der Kunde die Änderung annimmt.'}
                </p>
              </div>

              {/* Items in Order */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  {language === 'ar' ? 'المنتجات في الطلب:' : 'Aktuelle Artikel im Auftrag:'}
                </label>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {editItems.map((item, index) => {
                    const prodName = (language === 'ar' ? item.product?.nameAr : item.product?.nameDe) 
                      || item.product?.name 
                      || item.productId;
                    const stock = item.product?.stock !== undefined ? item.product.stock : '—';
                    const unitPrice = Number(item.price || 0);
                    const subtotal = Number(item.subtotal || unitPrice * item.quantity);

                    return (
                      <div
                        key={item.productId || index}
                        className="p-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-950/60 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                            {prodName}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                            <span className="font-mono">€{unitPrice.toFixed(2)} / Stk.</span>
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-slate-200 dark:bg-gray-800 text-[10px] text-slate-600 dark:text-gray-300">
                              Lager: {stock}
                            </span>
                          </div>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(index, -1)}
                            disabled={item.quantity <= 1}
                            className="w-7 h-7 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 disabled:opacity-30 transition"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-bold text-xs text-slate-900 dark:text-white font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(index, 1)}
                            className="w-7 h-7 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Subtotal */}
                        <div className="w-16 text-end shrink-0 font-mono font-bold text-xs text-slate-900 dark:text-white">
                          €{subtotal.toFixed(2)}
                        </div>

                        {/* Remove item button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItemFromEdit(index)}
                          title={language === 'ar' ? 'حذف هذا المنتج (غير متوفر)' : 'Diesen Artikel als nicht vorrätig entfernen'}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Substitute & Additional Products UI Menu with Filters in both languages */}
              <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40 p-3 sm:p-4 space-y-3">
                {/* Menu Header / Toggle Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>{language === 'ar' ? 'إضافة منتج بديل أو عنصر إضافي:' : 'Ersatzprodukt oder weiteren Artikel hinzufügen:'}</span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                      {language === 'ar'
                        ? 'تصفح وفلترة المنتجات بالمخزن لإضافتها إلى هذا الطلب بكل سهولة'
                        : 'Durchsuchen und filtern Sie das Sortiment nach passenden Alternativen'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowProductPicker((prev) => !prev)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800/80 shadow-2xs transition shrink-0 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>
                      {showProductPicker
                        ? language === 'ar'
                          ? 'إغلاق قائمة المنتجات'
                          : 'Auswahlmenü schließen'
                        : language === 'ar'
                          ? 'فتح قائمة المنتجات والفلترة'
                          : 'Produktauswahl & Filter öffnen'}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        showProductPicker ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Quick select fallback when picker is closed */}
                {!showProductPicker && (
                  <div className="flex gap-2 pt-1">
                    <select
                      value={addSelectedProductId}
                      onChange={(e) => setAddSelectedProductId(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- {language === 'ar' ? 'اختيار سريع لمنتج' : 'Schnellauswahl Produkt'} --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {((language === 'ar' ? p.nameAr : p.nameDe) || p.name)} (€{Number(p.b2bPrice).toFixed(2)}) - Lager: {p.stock}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddProductToEdit}
                      disabled={!addSelectedProductId}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 transition cursor-pointer"
                    >
                      {language === 'ar' ? 'إضافة' : 'Hinzufügen'}
                    </button>
                  </div>
                )}

                {/* Interactive UI Menu with Filter Options */}
                {showProductPicker && (
                  <div className="pt-2 border-t border-slate-200/80 dark:border-gray-800 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Filters Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {/* 1. Search filter */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 rtl:right-2.5 rtl:left-auto top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          placeholder={language === 'ar' ? 'بحث بالاسم، رقم الصنف...' : 'Name, Art.-Nr., EAN...'}
                          className="w-full pl-8 pr-7 rtl:pr-8 rtl:pl-7 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {pickerSearch && (
                          <button
                            type="button"
                            onClick={() => setPickerSearch('')}
                            className="absolute right-2.5 rtl:left-2.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* 2. Category filter */}
                      <div>
                        <select
                          value={pickerCategory}
                          onChange={(e) => setPickerCategory(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="all">
                            {language === 'ar' ? 'جميع الفئات' : 'Alle Kategorien'} ({products.length})
                          </option>
                          {pickerCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {(language === 'ar' ? c.nameAr : c.nameDe) || c.nameDe || c.nameAr}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 3. Stock Availability filter */}
                      <div>
                        <select
                          value={pickerStockFilter}
                          onChange={(e) => setPickerStockFilter(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="all">{language === 'ar' ? 'جميع المخازن' : 'Alle Bestände'}</option>
                          <option value="in_stock">{language === 'ar' ? 'متوفر بالمخزن فقط (> 0)' : 'Nur vorrätig (> 0)'}</option>
                          <option value="low_stock">{language === 'ar' ? 'مخزون منخفض (≤ 5)' : 'Geringer Bestand (≤ 5)'}</option>
                          <option value="out_of_stock">{language === 'ar' ? 'غير متوفر (0)' : 'Ausverkauft (0)'}</option>
                        </select>
                      </div>

                      {/* 4. Sort filter */}
                      <div>
                        <select
                          value={pickerSort}
                          onChange={(e) => setPickerSort(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="default">{language === 'ar' ? 'الترتيب: الافتراضي' : 'Sortierung: Standard'}</option>
                          <option value="name_asc">{language === 'ar' ? 'الاسم (أ – ي)' : 'Name (A → Z)'}</option>
                          <option value="name_desc">{language === 'ar' ? 'الاسم (ي – أ)' : 'Name (Z → A)'}</option>
                          <option value="price_asc">{language === 'ar' ? 'السعر (تصاعدي)' : 'Preis (aufsteigend)'}</option>
                          <option value="price_desc">{language === 'ar' ? 'السعر (تنازلي)' : 'Preis (absteigend)'}</option>
                          <option value="stock_desc">{language === 'ar' ? 'الأعلى مخزوناً' : 'Höchster Lagerbestand'}</option>
                        </select>
                      </div>
                    </div>

                    {/* Results count & reset filters */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-gray-400 px-0.5">
                      <span>
                        {language === 'ar'
                          ? `تم العثور على ${filteredPickerProducts.length} منتج`
                          : `${filteredPickerProducts.length} Artikel gefunden`}
                      </span>
                      {(pickerSearch || pickerCategory !== 'all' || pickerStockFilter !== 'all' || pickerSort !== 'default') && (
                        <button
                          type="button"
                          onClick={() => {
                            setPickerSearch('');
                            setPickerCategory('all');
                            setPickerStockFilter('all');
                            setPickerSort('default');
                          }}
                          className="flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{language === 'ar' ? 'إعادة ضبط الفلاتر' : 'Filter zurücksetzen'}</span>
                        </button>
                      )}
                    </div>

                    {/* Scrollable Products List */}
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-200/60 dark:divide-gray-800">
                      {filteredPickerProducts.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <Package className="w-8 h-8 mx-auto mb-1 opacity-40" />
                          <p className="text-xs font-semibold">
                            {language === 'ar'
                              ? 'لم يتم العثور على أي منتج يطابق معايير الفلترة'
                              : 'Keine Produkte für die ausgewählten Filter gefunden.'}
                          </p>
                        </div>
                      ) : (
                        filteredPickerProducts.map((p) => {
                          const existingItem = editItems.find((it) => it.productId === p.id);
                          const currentQtyInOrder = existingItem ? existingItem.quantity : 0;
                          const chosenQty = pickerQuantities[p.id] || 1;
                          const isAr = language === 'ar';
                          const prodName = (isAr ? p.nameAr : p.nameDe) || p.name || 'Produkt';
                          const subName = isAr ? p.nameDe : p.nameAr;
                          const isOutOfStock = (p.stock || 0) <= 0;

                          return (
                            <div
                              key={p.id}
                              className={`pt-2 first:pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-2 rounded-xl transition ${
                                existingItem
                                  ? 'bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60'
                                  : 'hover:bg-white dark:hover:bg-gray-900'
                              }`}
                            >
                              {/* Left: Product Info */}
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {p.imageUrl ? (
                                  <img
                                    src={p.imageUrl}
                                    alt={prodName}
                                    className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-gray-800 shrink-0 border border-slate-200 dark:border-gray-800"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-slate-200/80 dark:bg-gray-800 flex items-center justify-center text-slate-500 shrink-0">
                                    <Package className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                      {prodName}
                                    </span>
                                    {p.sku && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400">
                                        #{p.sku}
                                      </span>
                                    )}
                                    {p.category && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-gray-800 text-slate-600 dark:text-gray-300">
                                        {(isAr ? p.category.nameAr : p.category.nameDe) || p.category.nameDe}
                                      </span>
                                    )}
                                  </div>
                                  {subName && subName !== prodName && (
                                    <p className="text-[10px] text-slate-400 truncate">{subName}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className="font-extrabold text-xs text-slate-900 dark:text-white font-mono">
                                      €{Number(p.b2bPrice).toFixed(2)}
                                    </span>
                                    <span className="text-slate-300 dark:text-gray-700">&bull;</span>
                                    {isOutOfStock ? (
                                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.2 rounded">
                                        {isAr ? 'نفذت الكمية (0)' : 'Ausverkauft (0)'}
                                      </span>
                                    ) : (p.stock || 0) <= 5 ? (
                                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.2 rounded">
                                        {isAr ? `متبقي ${p.stock} فقط` : `Nur noch ${p.stock} Stk.`}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded">
                                        {isAr ? `متوفر: ${p.stock}` : `Vorrätig: ${p.stock}`}
                                      </span>
                                    )}
                                    {existingItem && (
                                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.2 rounded">
                                        {isAr ? `بالطلب (${currentQtyInOrder}×)` : `Im Auftrag (${currentQtyInOrder}×)`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right: Actions */}
                              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                {/* Stepper for quantity */}
                                <div className="flex items-center border border-slate-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 overflow-hidden shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPickerQuantities((prev) => ({
                                        ...prev,
                                        [p.id]: Math.max(1, (prev[p.id] || 1) - 1)
                                      }))
                                    }
                                    className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800 transition cursor-pointer"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <span className="w-6 text-center font-bold text-xs font-mono text-slate-800 dark:text-slate-200">
                                    {chosenQty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPickerQuantities((prev) => ({
                                        ...prev,
                                        [p.id]: (prev[p.id] || 1) + 1
                                      }))
                                    }
                                    className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800 transition cursor-pointer"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>

                                {/* Add Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleAddProductWithQty(p, chosenQty);
                                    setPickerQuantities((prev) => ({ ...prev, [p.id]: 1 }));
                                  }}
                                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                                    existingItem
                                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  }`}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>
                                    {existingItem
                                      ? isAr
                                        ? `+${chosenQty} زيادة`
                                        : `+${chosenQty} mehr`
                                      : isAr
                                        ? 'إضافة'
                                        : 'Hinzufügen'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Reason input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {language === 'ar' ? 'سبب التعديل / ملاحظة للعميل (ستصل بالبريد):' : 'Grund der Änderung / Nachricht an den Kunden (wird per E-Mail gesendet):'}
                </label>
                <textarea
                  rows="2"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: نعتذر، الحليب غير متوفر حالياً بالمخزن وتم تقليل الكمية.' : 'z.B. Milch war leider ausverkauft. Wir haben die Menge angepasst.'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 transition text-xs"
                />
              </div>

              {/* Price Calculation Summary */}
              {(() => {
                const newTotal = editItems.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
                const oldTotal = Number(editingOrder.totalAmount || 0);
                const diff = newTotal - oldTotal;

                return (
                  <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-gray-800/80 text-xs flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-slate-500 dark:text-gray-400">{language === 'ar' ? 'المبلغ الأصلي:' : 'Bisheriger Betrag:'} </span>
                      <span className="font-mono line-through text-slate-400">€{oldTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 dark:text-gray-300">{language === 'ar' ? 'المبلغ الجديد بعد التعديل:' : 'Neuer Betrag:'}</span>
                      <span className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">€{newTotal.toFixed(2)}</span>
                      <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${diff < 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {diff < 0 ? `-€${Math.abs(diff).toFixed(2)}` : `+€${diff.toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition text-center cursor-pointer touch-manipulation"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || editItems.length === 0}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
                >
                  {savingEdit ? '...' : (language === 'ar' ? 'حفظ التعديل وإرسال إشعار للعميل' : 'Änderung speichern & Bestätigung anfordern')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;