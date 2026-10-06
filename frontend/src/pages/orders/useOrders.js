import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import axios from '../../utils/adminAxios';
import { buildDeliverySlot, fetchActiveDeliveryWindows } from '../../utils/deliverySlot';

const PAGE_SIZE = 50;
const EMPTY_METRICS = {
  total: 0, pending: 0, pending_customer_approval: 0, accepted: 0,
  preparing: 0, out_for_delivery: 0, delivered: 0, declined: 0
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
 * to the server; polling re-fetches the current page, which is cheap — except
 * while searching (see poll below).
 *
 * The server `search` covers the whole order history: order number, driver,
 * customer name, phone and address (it decrypts those columns to match).
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
  const [driverAccountNames, setDriverAccountNames] = useState([]);

  // Latest requested filters, read by refresh()/poll without re-creating them.
  // Intentionally written during render so reads always see the current values.
  const queryRef = useRef({ page: 1, status: 'all', search: '' });
  // oxlint-disable-next-line react/refs
  queryRef.current = { page, status: statusFilter, search: searchTerm };

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await axios.get(`/api/orders/summary`);
      const byStatus = res.data?.byStatus || {};
      setMetrics({
        total: res.data?.total || 0,
        pending: byStatus.pending || 0,
        pending_customer_approval: byStatus.pending_customer_approval || 0,
        accepted: byStatus.accepted || 0,
        preparing: byStatus.preparing || 0,
        out_for_delivery: byStatus.out_for_delivery || 0,
        delivered: byStatus.delivered || 0,
        declined: byStatus.declined || 0
      });
    } catch (error) {
      console.error('Error fetching order metrics:', error);
    }
  }, []);

  // Only the newest request may set the list, so a slow response for an
  // older search term can't overwrite the results of the current one.
  const requestSeqRef = useRef(0);
  // Server clock of the last list response (X-Server-Time): the cursor for
  // poll()'s "what changed since" request.
  const cursorRef = useRef(null);

  // Fetches the current page (server-side filtered) plus the summary metrics.
  const refresh = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    try {
      const { page: p, status, search } = queryRef.current;
      const params = { page: p, limit: PAGE_SIZE };
      if (status && status !== 'all') params.status = status;
      if (search && search.trim()) params.search = search.trim();
      const [listRes] = await Promise.all([
        axios.get(`/api/orders`, { params }),
        fetchMetrics()
      ]);
      if (seq !== requestSeqRef.current) return;
      cursorRef.current = listRes.headers?.['x-server-time'] || null;
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

  // The 20s poll. Without a search it re-fetches the current page. With one,
  // that would make the server decrypt the whole order history again every
  // 20s, so it only asks for orders changed since the last response and
  // updates the ones already on screen. New matches appear when the search,
  // filter or page changes, or after an action here (those call refresh()).
  const poll = useCallback(async () => {
    const since = cursorRef.current;
    if (!queryRef.current.search.trim() || !since) return refresh();
    const seq = requestSeqRef.current;
    try {
      const [changedRes] = await Promise.all([
        axios.get(`/api/orders`, { params: { updatedSince: since } }),
        fetchMetrics()
      ]);
      // A refresh started meanwhile (new search, page, action) wins.
      if (seq !== requestSeqRef.current) return;
      cursorRef.current = changedRes.headers?.['x-server-time'] || since;
      const changed = new Map((Array.isArray(changedRes.data) ? changedRes.data : []).map((o) => [o.id, o]));
      if (changed.size > 0) setOrders((prev) => prev.map((o) => changed.get(o.id) || o));
    } catch (error) {
      console.error('Error polling orders:', error);
    }
  }, [refresh, fetchMetrics]);

  const reloadFormData = useCallback(async () => {
    try {
      const [customersRes, productsRes] = await Promise.all([
        // The customer list sits behind the Kunden section PIN; when it's
        // locked the create form explains that instead of an empty dropdown.
        axios.get(`/api/customers`).catch((err) => ({
          data: [],
          locked: err.response?.data?.code === 'SECTION_LOCKED'
        })),
        axios.get(`/api/products`)
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
      const res = await axios.get(`/api/settings/driver-sessions`);
      setActiveDrivers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching active driver sessions:', err);
    }
  }, []);

  // Reference data once on mount, and a 20s poll so new/changed orders show up.
  useEffect(() => {
    reloadFormData();
    const pollId = setInterval(poll, 20000);
    return () => clearInterval(pollId);
  }, [poll, reloadFormData]);

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

  // Active driver accounts (Settings → Fahrerkonten), so the assign-driver
  // choice lists every driver, not only those online or on the current page.
  useEffect(() => {
    axios.get(`/api/settings/drivers/names`)
      .then((res) => setDriverAccountNames(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error('Error fetching driver names:', err));
  }, []);

  useEffect(() => {
    fetchActiveDrivers();
    const interval = setInterval(fetchActiveDrivers, 15000);
    return () => clearInterval(interval);
  }, [fetchActiveDrivers]);

  // Driver accounts + who's online now + names on loaded orders (older
  // assignments may name a driver whose account was since removed).
  const knownDriverNames = useMemo(() => {
    const names = new Set(driverAccountNames);
    activeDrivers.forEach((s) => names.add(s.driverName));
    orders.forEach((o) => { if (o.assignedDriverName) names.add(o.assignedDriverName); });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [driverAccountNames, activeDrivers, orders]);

  // Changing the filter or search resets to page 1 (guards against landing on
  // a now-out-of-range page).
  const changeStatusFilter = useCallback((s) => { setStatusFilter(s); setPage(1); }, []);
  const changeSearch = useCallback((s) => { setSearchTerm(s); setPage(1); }, []);

  // --- Mutating actions -------------------------------------------------

  const fetchOrderById = useCallback(async (id) => {
    const res = await axios.get(`/api/orders/${id}`);
    return res.data;
  }, []);

  // Loads the order's own history (status changes, edits, driver changes)
  // for the drawer's "Verlauf" tab.
  const fetchOrderHistory = useCallback(async (id) => {
    const res = await axios.get(`/api/orders/${id}/history`);
    return res.data;
  }, []);

  // The drawer passes `expectedUpdatedAt` (the version it's showing) so the
  // server answers 409 STALE_ORDER instead of overwriting a newer change.
  // List quick actions don't, and always apply.
  const assignDriver = useCallback(async (orderId, assignedDriverName, expectedUpdatedAt) => {
    const res = await axios.put(`/api/orders/${orderId}/assign-driver`, {
      assignedDriverName: assignedDriverName || null,
      expectedUpdatedAt
    });
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, assignedDriverName: res.data.assignedDriverName, updatedAt: res.data.updatedAt } : o)));
    return res.data;
  }, []);

  const createOrder = useCallback(async (payload) => {
    await axios.post(`/api/orders`, payload);
    await refresh();
  }, [refresh]);

  const changeStatus = useCallback(async (orderId, body) => {
    const res = await axios.put(`/api/orders/${orderId}/status`, body);
    await refresh();
    return res.data;
  }, [refresh]);

  const saveDeliverySlot = useCallback(async (orderId, date, window, expectedUpdatedAt) => {
    const res = await axios.put(`/api/orders/${orderId}/status`, {
      deliverySlot: buildDeliverySlot(date, window?.startHour, window?.endHour),
      expectedUpdatedAt
    });
    await refresh();
    return res.data;
  }, [refresh]);

  const saveOrderEdit = useCallback(async (orderId, payload) => {
    const res = await axios.put(`/api/orders/${orderId}/edit`, payload);
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
    fetchOrderHistory,
    assignDriver,
    createOrder,
    changeStatus,
    saveDeliverySlot,
    saveOrderEdit
  };
};
