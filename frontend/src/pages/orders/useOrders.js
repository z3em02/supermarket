import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import axios from '../../utils/adminAxios';
import { getApiUrl } from '../../utils/api';
import { buildDeliverySlot, fetchActiveDeliveryWindows } from '../../utils/deliverySlot';

const PAGE_SIZE = 50;
const EMPTY_METRICS = {
  total: 0, pending: 0, pending_customer_approval: 0, accepted: 0,
  preparing: 0, shipped: 0, delivered: 0, declined: 0
};

/**
 * Owns everything the Orders page talks to the server about: one *page* of the
 * order list (server-side paginated + filtered), the status metrics (from the
 * summary endpoint, so they reflect all orders not just the page), the
 * reference data the create/edit forms need, and the mutating actions. The
 * page component keeps only which modal is open + the current selection.
 *
 * The list is server-paginated because loading every order at once grows
 * linearly (measured: ~1MB / 180ms at 400 orders). page/status/search are sent
 * to the server; polling just re-fetches the current page, which is cheap.
 *
 * NOTE: customer names are encrypted at rest, so the server `search` matches
 * order number + driver name only. The page additionally narrows the loaded
 * rows by customer name client-side (see the page's own filter).
 */
export const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [customers, setCustomers] = useState([]);
  const [customersLocked, setCustomersLocked] = useState(false);
  const [products, setProducts] = useState([]);
  const [deliveryWindows, setDeliveryWindows] = useState([]);
  const [activeDrivers, setActiveDrivers] = useState([]);

  // Latest requested filters, read by refresh()/poll without re-creating them.
  const queryRef = useRef({ page: 1, status: 'all', search: '' });
  queryRef.current = { page, status: statusFilter, search: searchTerm };

  const fetchMetrics = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();
      const res = await axios.get(`${apiUrl}/api/orders/summary`);
      const byStatus = res.data?.byStatus || {};
      const declined = (byStatus.declined || 0) + (byStatus.rejected || 0) + (byStatus.canceled || 0) + (byStatus.cancelled || 0);
      setMetrics({
        total: res.data?.total || 0,
        pending: byStatus.pending || 0,
        pending_customer_approval: byStatus.pending_customer_approval || 0,
        accepted: byStatus.accepted || 0,
        preparing: byStatus.preparing || 0,
        shipped: byStatus.shipped || 0,
        delivered: byStatus.delivered || 0,
        declined
      });
    } catch (error) {
      console.error('Error fetching order metrics:', error);
    }
  }, []);

  // Fetches the current page (server-side filtered) plus the summary metrics.
  const refresh = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();
      const { page: p, status, search } = queryRef.current;
      const params = { page: p, limit: PAGE_SIZE };
      if (status && status !== 'all') params.status = status;
      if (search && search.trim()) params.search = search.trim();
      const [listRes] = await Promise.all([
        axios.get(`${apiUrl}/api/orders`, { params }),
        fetchMetrics()
      ]);
      const body = listRes.data;
      // Envelope { data, total, page, totalPages } for the browse view; fall
      // back to a bare array if an older backend answers.
      if (Array.isArray(body)) {
        setOrders(body); setTotal(body.length); setTotalPages(1);
      } else {
        setOrders(body.data || []);
        setTotal(body.total || 0);
        setTotalPages(body.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchMetrics]);

  const reloadFormData = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();
      const [customersRes, productsRes] = await Promise.all([
        // The customer list sits behind the Kunden section PIN; when it's
        // locked the create form explains that instead of an empty dropdown.
        axios.get(`${apiUrl}/api/customer-auth/customers`).catch((err) => ({
          data: [],
          locked: err.response?.data?.code === 'SECTION_LOCKED'
        })),
        axios.get(`${apiUrl}/api/products`)
      ]);
      setCustomers(customersRes.data);
      setCustomersLocked(Boolean(customersRes.locked));
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Error fetching form data:', error);
    }
  }, []);

  const fetchActiveDrivers = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();
      const res = await axios.get(`${apiUrl}/api/settings/driver-sessions`);
      setActiveDrivers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching active driver sessions:', err);
    }
  }, []);

  // Reference data once on mount, and a 20s poll that re-fetches the current
  // page (cheap now that it's paginated) so new/changed orders show up.
  useEffect(() => {
    reloadFormData();
    const pollId = setInterval(refresh, 20000);
    return () => clearInterval(pollId);
  }, [refresh, reloadFormData]);

  // Refetch whenever the page or status filter changes immediately, and the
  // search term after a short debounce (so typing doesn't fire a request per
  // keystroke). Also resets to page 1 when a filter/search changes.
  useEffect(() => {
    const id = setTimeout(refresh, searchTerm ? 300 : 0);
    return () => clearTimeout(id);
  }, [page, statusFilter, searchTerm, refresh]);

  useEffect(() => {
    fetchActiveDeliveryWindows().then(setDeliveryWindows).catch(() => {});
  }, []);

  useEffect(() => {
    fetchActiveDrivers();
    const interval = setInterval(fetchActiveDrivers, 15000);
    return () => clearInterval(interval);
  }, [fetchActiveDrivers]);

  // Union of who's online now and every name ever assigned on a loaded order,
  // so the autocomplete still suggests someone even while they're offline.
  const knownDriverNames = useMemo(() => {
    const names = new Set(activeDrivers.map((s) => s.driverName));
    orders.forEach((o) => { if (o.assignedDriverName) names.add(o.assignedDriverName); });
    return Array.from(names);
  }, [activeDrivers, orders]);

  // Changing the filter or search resets to page 1 (guards against landing on
  // a now-out-of-range page).
  const changeStatusFilter = useCallback((s) => { setStatusFilter(s); setPage(1); }, []);
  const changeSearch = useCallback((s) => { setSearchTerm(s); setPage(1); }, []);

  // --- Mutating actions -------------------------------------------------

  const fetchOrderById = useCallback(async (id) => {
    const apiUrl = getApiUrl();
    const res = await axios.get(`${apiUrl}/api/orders/${id}`);
    return res.data;
  }, []);

  // Patches the list optimistically and returns the new assigned name so the
  // caller can also reflect it into an open detail view.
  const assignDriver = useCallback(async (orderId, assignedDriverName) => {
    const apiUrl = getApiUrl();
    const res = await axios.put(`${apiUrl}/api/orders/${orderId}/assign-driver`, { assignedDriverName: assignedDriverName || null });
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, assignedDriverName: res.data.assignedDriverName } : o)));
    return res.data.assignedDriverName;
  }, []);

  const createOrder = useCallback(async (payload) => {
    const apiUrl = getApiUrl();
    await axios.post(`${apiUrl}/api/orders`, payload);
    await refresh();
  }, [refresh]);

  const changeStatus = useCallback(async (orderId, body) => {
    const apiUrl = getApiUrl();
    await axios.put(`${apiUrl}/api/orders/${orderId}/status`, body);
    await refresh();
  }, [refresh]);

  const saveDeliverySlot = useCallback(async (orderId, date, window) => {
    const apiUrl = getApiUrl();
    await axios.put(`${apiUrl}/api/orders/${orderId}/status`, {
      deliverySlot: buildDeliverySlot(date, window?.startHour, window?.endHour)
    });
    await refresh();
  }, [refresh]);

  const saveOrderEdit = useCallback(async (orderId, payload) => {
    const apiUrl = getApiUrl();
    const res = await axios.put(`${apiUrl}/api/orders/${orderId}/edit`, payload);
    await refresh();
    return res.data;
  }, [refresh]);

  return {
    // data
    orders,
    loading,
    customers,
    customersLocked,
    products,
    deliveryWindows,
    activeDrivers,
    knownDriverNames,
    metrics,
    // pagination + server-side filters
    page,
    setPage,
    totalPages,
    total,
    pageSize: PAGE_SIZE,
    statusFilter,
    setStatusFilter: changeStatusFilter,
    searchTerm,
    setSearchTerm: changeSearch,
    // actions
    refresh,
    reloadFormData,
    fetchOrderById,
    assignDriver,
    createOrder,
    changeStatus,
    saveDeliverySlot,
    saveOrderEdit
  };
};
