import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { ADMIN_BASE } from '../config/adminPath';
import { Search, Truck, Package, Plus } from 'lucide-react';
import { todayIso, parseDeliverySlot } from '../utils/deliverySlot';
import { printHtmlInHiddenIframe } from '../utils/printDocument';
import { buildA4ReceiptHtml, buildThermalReceiptHtml } from '../utils/adminOrderReceipt';
import { useOrders } from './orders/useOrders';
import { EditOrderModal } from './orders/EditOrderModal';
import { CreateOrderModal } from './orders/CreateOrderModal';
import { PrintOrderModal } from './orders/PrintOrderModal';
import { OrderDetailModal } from './orders/OrderDetailModal';
import { StatusChangeModal } from './orders/StatusChangeModal';
import { AcceptOrderModal } from './orders/AcceptOrderModal';
import { OrderCard } from './orders/OrderCard';
import { OrderStatusSummary } from './orders/OrderStatusSummary';

export const Orders = () => {
  const { t, language } = useLanguage();

  // All server data and mutating actions live in the hook; this component
  // keeps only view state (which modal is open, search/filter, form inputs)
  // and orchestrates the hook's actions around it.
  const {
    orders,
    loading,
    customers,
    customersLocked,
    products,
    deliveryWindows,
    activeDrivers,
    knownDriverNames,
    metrics,
    page,
    setPage,
    totalPages,
    total,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    reloadFormData,
    fetchOrderById,
    assignDriver,
    createOrder,
    changeStatus,
    saveDeliverySlot,
    saveOrderEdit
  } = useOrders();

  // --- View state -------------------------------------------------------
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printOrder, setPrintOrder] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [editingDeliverySlot, setEditingDeliverySlot] = useState(false);
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editSelectedWindow, setEditSelectedWindow] = useState(null);
  const [savingDeliverySlot, setSavingDeliverySlot] = useState(false);
  const [assigningDriverId, setAssigningDriverId] = useState(null);

  // Accept modal (accepting requires choosing a driver)
  const [acceptModalOrder, setAcceptModalOrder] = useState(null);
  const [acceptModalDriver, setAcceptModalDriver] = useState('');
  const [acceptingOrder, setAcceptingOrder] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const toggleOrderItemsExpand = (id) => {
    setExpandedOrders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // --- Orchestration handlers ------------------------------------------

  const handleAssignDriver = async (orderId, assignedDriverName) => {
    setAssigningDriverId(orderId);
    try {
      const newName = await assignDriver(orderId, assignedDriverName);
      setSelectedOrder((prev) => (prev && prev.id === orderId ? { ...prev, assignedDriverName: newName } : prev));
    } catch (err) {
      console.error('Error assigning driver:', err);
      alert(err.response?.data?.error || (language === 'ar' ? 'فشل تعيين السائق' : 'Fahrer konnte nicht zugewiesen werden'));
    } finally {
      setAssigningDriverId(null);
    }
  };

  const handleConfirmAccept = async () => {
    if (!acceptModalOrder || !acceptModalDriver) return;
    setAcceptingOrder(true);
    try {
      await assignDriver(acceptModalOrder.id, acceptModalDriver);
      await changeStatus(acceptModalOrder.id, { status: 'accepted' });
      setAcceptModalOrder(null);
      setAcceptModalDriver('');
    } catch (error) {
      console.error('Error accepting order:', error);
      alert(error.response?.data?.error || t('error'));
    } finally {
      setAcceptingOrder(false);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const items = orderForm.items.filter((item) => item.productId && Number(item.quantity) > 0);
    if (!orderForm.customerId || items.length === 0) {
      alert((t('error') || 'Fehler') + ': ' + (t('selectCustomer') || 'Kunde auswählen') + ' & ' + (t('selectProduct') || 'Produkt auswählen'));
      return;
    }

    try {
      await createOrder({
        customerId: orderForm.customerId,
        customerName: orderForm.customerName,
        customerPhone: orderForm.customerPhone,
        deliveryAddress: orderForm.deliveryAddress,
        paymentMethod: 'cash_on_delivery',
        notes: orderForm.notes,
        items
      });
      setShowCreateModal(false);
      setOrderForm({ customerId: '', customerName: '', customerPhone: '', deliveryAddress: '', notes: '', items: [{ productId: '', quantity: 1 }] });
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

  // Reflect a mutation into the open detail view, if it's the same order.
  const refreshSelectedOrder = async (orderId, fallback) => {
    if (!selectedOrder || selectedOrder.id !== orderId) return;
    if (fallback !== undefined) { setSelectedOrder(fallback); return; }
    try {
      setSelectedOrder(await fetchOrderById(orderId));
    } catch (err) {
      console.error('Error refreshing order detail:', err);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!statusModalOrder) return;
    setUpdating(true);
    try {
      await changeStatus(statusModalOrder.id, {
        status: targetStatus,
        notes: customerNoteInput,
        adminNotes: adminNoteInput
      });
      const orderId = statusModalOrder.id;
      setStatusModalOrder(null);
      await refreshSelectedOrder(orderId);
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
      await changeStatus(orderId, { status: newStatus });
      await refreshSelectedOrder(orderId);
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
      await saveDeliverySlot(orderId, editDeliveryDate, editSelectedWindow);
      setEditingDeliverySlot(false);
      await refreshSelectedOrder(orderId);
    } catch (error) {
      console.error('Error updating delivery slot:', error);
      alert(error.response?.data?.error || t('error'));
    } finally {
      setSavingDeliverySlot(false);
    }
  };

  const handleViewDetails = async (order) => {
    try {
      setSelectedOrder(await fetchOrderById(order.id));
      setShowDetailModal(true);
      setEditingDeliverySlot(false);
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
  };

  const handleOpenEditModal = (order) => {
    setEditingOrder(order);
    setEditReason(order.modificationReason || '');
    if (!products || products.length === 0) {
      reloadFormData();
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

  const handleSaveOrderEdit = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (editItems.length === 0) {
      alert(language === 'ar' ? 'يجب أن يحتوي الطلب على منتج واحد على الأقل' : 'Der Auftrag muss mindestens einen Artikel enthalten.');
      return;
    }

    try {
      setSavingEdit(true);
      const payload = {
        items: editItems.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          price: it.price
        })),
        modificationReason: editReason.trim() || (language === 'ar' ? 'تعديل بسبب عدم توفر بعض المنتجات' : 'Anpassung wegen fehlender Verfügbarkeit einzelner Artikel.')
      };

      const orderId = editingOrder.id;
      const updated = await saveOrderEdit(orderId, payload);
      setShowEditModal(false);
      setEditingOrder(null);
      await refreshSelectedOrder(orderId, updated);
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

  const printReceipt = (order, format = 'a4') => {
    printHtmlInHiddenIframe(format === 'thermal'
      ? buildThermalReceiptHtml(order, language)
      : buildA4ReceiptHtml(order, language));
  };

  // The server already applied the status filter and matched the search
  // against order number + driver name across all pages. This only *additionally*
  // narrows the loaded page by customer name/phone/address — which the server
  // can't match because those columns are encrypted at rest. It keeps any order
  // whose number or driver matched server-side, so server results are never
  // dropped here. (Customer-name search therefore only spans the current page.)
  const q = searchTerm.trim().toLowerCase();
  const filteredOrders = !q ? orders : orders.filter((order) =>
    order.id.toLowerCase().includes(q) ||
    (order.assignedDriverName && order.assignedDriverName.toLowerCase().includes(q)) ||
    (order.customer?.name && order.customer.name.toLowerCase().includes(q)) ||
    (order.customerName && order.customerName.toLowerCase().includes(q)) ||
    (order.customerPhone && order.customerPhone.toLowerCase().includes(q)) ||
    (order.deliveryAddress && order.deliveryAddress.toLowerCase().includes(q))
  );

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
        <div className="w-full sm:w-auto flex items-center gap-2">
          <Link
            to={`${ADMIN_BASE}/driver`}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 sm:py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs transition touch-manipulation cursor-pointer"
          >
            <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{language === 'ar' ? 'واجهة التوصيل للسائق' : 'Fahreransicht'}</span>
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm rounded-xl shadow-sm transition touch-manipulation cursor-pointer"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{t('createOrder')}</span>
          </button>
        </div>
      </div>

      {/* Admin Quick Metric Summary Bar */}
      <OrderStatusSummary metrics={metrics} setStatusFilter={setStatusFilter} statusFilter={statusFilter} />

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
        {filteredOrders.map((order) => (
          <OrderCard
            key={order.id}
            isExpanded={!!expandedOrders[order.id]}
            handleOpenEditModal={handleOpenEditModal}
            handleOpenPrintModal={handleOpenPrintModal}
            handleQuickStatusChange={handleQuickStatusChange}
            handleViewDetails={handleViewDetails}
            openStatusModal={openStatusModal}
            order={order}
            setAcceptModalDriver={setAcceptModalDriver}
            setAcceptModalOrder={setAcceptModalOrder}
            toggleOrderItemsExpand={toggleOrderItemsExpand}
            updating={updating}
          />
        ))}

        {filteredOrders.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800">
            <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">{t('noOrdersFound')}</p>
          </div>
        )}
      </div>

      {/* Pagination — the list is server-paginated (page/status/search sent to
          the API), so only one page of orders is ever loaded at a time. */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {language === 'ar'
              ? `صفحة ${page} من ${totalPages} · ${total} طلب`
              : `Seite ${page} von ${totalPages} · ${total} ${total === 1 ? 'Bestellung' : 'Bestellungen'}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-gray-800 transition cursor-pointer touch-manipulation"
            >
              {language === 'ar' ? 'التالي' : 'Zurück'}
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-gray-800 transition cursor-pointer touch-manipulation"
            >
              {language === 'ar' ? 'السابق' : 'Weiter'}
            </button>
          </div>
        </div>
      )}

      {/* Accept Order — requires choosing a driver, since a driver only ever
          sees orders assigned to them; an order accepted with nobody chosen
          would be invisible to every driver. */}
      {acceptModalOrder && (
        <AcceptOrderModal
          acceptModalDriver={acceptModalDriver}
          acceptModalOrder={acceptModalOrder}
          acceptingOrder={acceptingOrder}
          activeDrivers={activeDrivers}
          handleConfirmAccept={handleConfirmAccept}
          knownDriverNames={knownDriverNames}
          setAcceptModalDriver={setAcceptModalDriver}
          setAcceptModalOrder={setAcceptModalOrder}
        />
      )}

      {/* Status Change & Admin Note Modal */}
      {statusModalOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <StatusChangeModal
            adminNoteInput={adminNoteInput}
            customerNoteInput={customerNoteInput}
            handleConfirmStatusChange={handleConfirmStatusChange}
            setAdminNoteInput={setAdminNoteInput}
            setCustomerNoteInput={setCustomerNoteInput}
            setStatusModalOrder={setStatusModalOrder}
            setTargetStatus={setTargetStatus}
            statusModalOrder={statusModalOrder}
            targetStatus={targetStatus}
            updating={updating}
          />
        </div>
      )}

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <OrderDetailModal
            activeDrivers={activeDrivers}
            assigningDriverId={assigningDriverId}
            deliveryWindows={deliveryWindows}
            editDeliveryDate={editDeliveryDate}
            editSelectedWindow={editSelectedWindow}
            editingDeliverySlot={editingDeliverySlot}
            handleAssignDriver={handleAssignDriver}
            handleOpenEditDeliverySlot={handleOpenEditDeliverySlot}
            handleOpenEditModal={handleOpenEditModal}
            handleOpenPrintModal={handleOpenPrintModal}
            handleSaveDeliverySlot={handleSaveDeliverySlot}
            knownDriverNames={knownDriverNames}
            openStatusModal={openStatusModal}
            savingDeliverySlot={savingDeliverySlot}
            selectedOrder={selectedOrder}
            setEditDeliveryDate={setEditDeliveryDate}
            setEditSelectedWindow={setEditSelectedWindow}
            setEditingDeliverySlot={setEditingDeliverySlot}
            setShowDetailModal={setShowDetailModal}
          />
        </div>
      )}

      {/* Printable Invoice / Packing Slip Modal */}
      {showPrintModal && printOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <PrintOrderModal printOrder={printOrder} printReceipt={printReceipt} setShowPrintModal={setShowPrintModal} />
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <CreateOrderModal
            customers={customers}
            customersLocked={customersLocked}
            handleCreateOrder={handleCreateOrder}
            orderForm={orderForm}
            products={products}
            setOrderForm={setOrderForm}
            setShowCreateModal={setShowCreateModal}
          />
        </div>
      )}
      {/* ── Edit Order Modal (Unavailable items & customer approval) ── */}
      {showEditModal && editingOrder && (
        <EditOrderModal
          editItems={editItems}
          editReason={editReason}
          editingOrder={editingOrder}
          handleAddProductWithQty={handleAddProductWithQty}
          handleRemoveItemFromEdit={handleRemoveItemFromEdit}
          handleSaveOrderEdit={handleSaveOrderEdit}
          handleUpdateItemQuantity={handleUpdateItemQuantity}
          products={products}
          savingEdit={savingEdit}
          setEditReason={setEditReason}
          setShowEditModal={setShowEditModal}
        />
      )}
    </div>
  );
};

export default Orders;
