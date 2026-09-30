import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { ADMIN_BASE } from '../config/adminPath';
import { Search, Truck, Package, Plus } from 'lucide-react';
import { printHtmlInHiddenIframe } from '../utils/printDocument';
import { buildA4ReceiptHtml, buildThermalReceiptHtml } from '../utils/adminOrderReceipt';
import { useOrders } from './orders/useOrders';
import { CreateOrderModal } from './orders/CreateOrderModal';
import { PrintOrderModal } from './orders/PrintOrderModal';
import { OrderDrawer } from './orders/OrderDrawer';
import { AcceptOrderModal } from './orders/AcceptOrderModal';
import { OrderCard } from './orders/OrderCard';
import { OrderStatusSummary } from './orders/OrderStatusSummary';
import { useConfirm, useToast } from '../context/FeedbackContext';
import { Button, EmptyState, Input, Pagination, Select, SkeletonList } from '../components/ui';

export const Orders = () => {
  const { t, language } = useLanguage();
  const toast = useToast();
  const confirm = useConfirm();

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
    fetchOrderHistory,
    assignDriver,
    createOrder,
    changeStatus,
    saveDeliverySlot,
    saveOrderEdit
  } = useOrders();

  // --- View state -------------------------------------------------------
  // The order drawer is the single place to see and change one order.
  const [drawer, setDrawer] = useState(null); // { order, tab, session }
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printOrder, setPrintOrder] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState({});

  // Accept modal (accepting requires choosing a driver)
  const [acceptModalOrder, setAcceptModalOrder] = useState(null);
  const [acceptModalDriver, setAcceptModalDriver] = useState('');
  const [acceptingOrder, setAcceptingOrder] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [orderForm, setOrderForm] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    notes: '',
    items: [{ productId: '', quantity: 1 }]
  });

  const toggleOrderItemsExpand = (id) => {
    setExpandedOrders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // --- Drawer -----------------------------------------------------------

  // Opens the drawer on a freshly loaded order (list rows omit accounting /
  // coupon detail, and the drawer needs the current updatedAt for its
  // stale-edit check).
  const openDrawer = async (order, tab = 'overview') => {
    try {
      const fresh = await fetchOrderById(order.id);
      setDrawer((prev) => ({ order: fresh, tab, session: (prev?.session || 0) + 1 }));
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error(error.response?.data?.error || t('error'));
    }
  };

  const handleDrawerOrderChanged = useCallback((updated) => {
    setDrawer((prev) => (prev && prev.order.id === updated.id ? { ...prev, order: updated } : prev));
  }, []);

  const drawerActions = useMemo(() => ({
    fetchOrderById, fetchOrderHistory, assignDriver, changeStatus, saveDeliverySlot, saveOrderEdit, reloadFormData
  }), [fetchOrderById, fetchOrderHistory, assignDriver, changeStatus, saveDeliverySlot, saveOrderEdit, reloadFormData]);

  const drawerReference = useMemo(() => ({
    activeDrivers, knownDriverNames, deliveryWindows, products
  }), [activeDrivers, knownDriverNames, deliveryWindows, products]);

  // --- List quick actions (no drawer needed) ----------------------------

  const handleConfirmAccept = async () => {
    if (!acceptModalOrder || !acceptModalDriver) return;
    setAcceptingOrder(true);
    try {
      await assignDriver(acceptModalOrder.id, acceptModalDriver);
      await changeStatus(acceptModalOrder.id, { status: 'accepted' });
      toast.success(language === 'ar' ? 'تم قبول الطلب' : 'Bestellung angenommen');
      setAcceptModalOrder(null);
      setAcceptModalDriver('');
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error(error.response?.data?.error || t('error'));
    } finally {
      setAcceptingOrder(false);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const items = orderForm.items.filter((item) => item.productId && Number(item.quantity) > 0);
    if (!orderForm.customerId || items.length === 0) {
      toast.warning((t('error') || 'Fehler') + ': ' + (t('selectCustomer') || 'Kunde auswählen') + ' & ' + (t('selectProduct') || 'Produkt auswählen'));
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
      toast.success(language === 'ar' ? 'تم إنشاء الطلب' : 'Bestellung angelegt');
      setShowCreateModal(false);
      setOrderForm({ customerId: '', customerName: '', customerPhone: '', deliveryAddress: '', notes: '', items: [{ productId: '', quantity: 1 }] });
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.response?.data?.error || t('error'));
    }
  };

  // One-click next step from the card (preparing / out for delivery / delivered).
  const handleQuickStatusChange = async (orderId, newStatus) => {
    setUpdating(true);
    try {
      await changeStatus(orderId, { status: newStatus });
      toast.success(language === 'ar' ? 'تم تحديث الحالة' : 'Status aktualisiert');
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error(error.response?.data?.error || t('error'));
    } finally {
      setUpdating(false);
    }
  };

  // Decline from the card: one confirm, no drawer. Any other status change
  // from the card opens the drawer on its overview.
  const handleCardStatusAction = async (order, targetStatus) => {
    if (targetStatus !== 'declined') {
      openDrawer(order, 'overview');
      return;
    }
    const ok = await confirm({
      title: language === 'ar' ? 'رفض الطلب؟' : 'Bestellung ablehnen?',
      message: language === 'ar'
        ? `الطلب #${order.id.slice(0, 8).toUpperCase()} — سيتم إبلاغ العميل وإرجاع المخزون.`
        : `Bestellung #${order.id.slice(0, 8).toUpperCase()} — der Kunde wird benachrichtigt, Lagerbestand wird zurückgebucht.`,
      confirmText: language === 'ar' ? 'رفض الطلب' : 'Ablehnen',
      variant: 'danger'
    });
    if (ok) handleQuickStatusChange(order.id, 'declined');
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

  if (loading) {
    return <SkeletonList count={6} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-heading-xl">
            {t('orders')}
          </h1>
          <p className="text-body-muted mt-0.5 sm:mt-1">
            {t('manageTrack')}
          </p>
        </div>
        <div className="w-full sm:w-auto flex items-center gap-2">
          <Link
            to={`${ADMIN_BASE}/driver`}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 min-h-11 bg-warning-600 hover:bg-warning-600 text-white font-medium text-xs sm:text-sm rounded-xl shadow-sm transition touch-manipulation cursor-pointer"
          >
            <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{language === 'ar' ? 'واجهة التوصيل للسائق' : 'Fahreransicht'}</span>
          </Link>
          <Button icon={Plus} onClick={() => setShowCreateModal(true)} className="flex-1 sm:flex-initial">
            {t('createOrder')}
          </Button>
        </div>
      </div>

      {/* Admin Quick Metric Summary Bar */}
      <OrderStatusSummary metrics={metrics} setStatusFilter={setStatusFilter} statusFilter={statusFilter} />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        <div className="flex-1">
          <Input
            icon={Search}
            type="text"
            aria-label={t('searchOrders')}
            placeholder={t('searchOrders')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="sm:w-64">
        <Select
          aria-label={t('allStatus')}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">{t('allStatus')}</option>
          <option value="pending">{t('pending')}</option>
          <option value="pending_customer_approval">
            {language === 'ar' ? 'بانتظار موافقة العميل' : 'Wartet auf Kundenbestätigung'}
          </option>
          <option value="accepted">{t('accepted')}</option>
          <option value="preparing">{t('preparing')}</option>
          <option value="out_for_delivery">{t('outForDelivery')}</option>
          <option value="delivered">{t('delivered')}</option>
          <option value="declined">{t('declined')}</option>
        </Select>
        </div>
      </div>

      {/* Orders grid: 1 column on phones, 2 on tablets, 3 on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            isExpanded={!!expandedOrders[order.id]}
            handleOpenEditModal={(o) => openDrawer(o, 'items')}
            handleOpenPrintModal={handleOpenPrintModal}
            handleQuickStatusChange={handleQuickStatusChange}
            handleViewDetails={(o) => openDrawer(o, 'overview')}
            openStatusModal={handleCardStatusAction}
            order={order}
            setAcceptModalDriver={setAcceptModalDriver}
            setAcceptModalOrder={setAcceptModalOrder}
            toggleOrderItemsExpand={toggleOrderItemsExpand}
            updating={updating}
          />
        ))}

        {orders.length === 0 && (
          <EmptyState className="col-span-full" icon={Package} title={t('noOrdersFound')} />
        )}
      </div>

      {/* Pagination — the list is server-paginated (page/status/search sent to
          the API), so only one page of orders is ever loaded at a time. */}
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        itemLabel={language === 'ar' ? 'طلب' : (total === 1 ? 'Bestellung' : 'Bestellungen')}
        onPageChange={setPage}
      />

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

      {drawer && (
        <OrderDrawer
          key={`${drawer.order.id}:${drawer.session}`}
          order={drawer.order}
          initialTab={drawer.tab}
          onClose={() => setDrawer(null)}
          onOrderChanged={handleDrawerOrderChanged}
          onPrint={handleOpenPrintModal}
          actions={drawerActions}
          reference={drawerReference}
        />
      )}

      {/* Printable Invoice / Packing Slip Modal */}
      {showPrintModal && printOrder && (
        <PrintOrderModal printOrder={printOrder} printReceipt={printReceipt} setShowPrintModal={setShowPrintModal} />
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <CreateOrderModal
          customers={customers}
          customersLocked={customersLocked}
          handleCreateOrder={handleCreateOrder}
          orderForm={orderForm}
          products={products}
          setOrderForm={setOrderForm}
          setShowCreateModal={setShowCreateModal}
        />
      )}
    </div>
  );
};

export default Orders;
