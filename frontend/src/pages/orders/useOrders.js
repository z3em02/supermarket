import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import axios from '../../utils/adminAxios';
import { getApiUrl } from '../../utils/api';
import { buildDeliverySlot, fetchActiveDeliveryWindows } from '../../utils/deliverySlot';

// Replaces/adds the received orders by id, newest first (see refresh()).
const mergeOrdersById = (current, received) => {
  if (received.length === 0) return current;
  const byId = new Map(current.map((o) => [o.id, o]));
  for (const o of received) byId.set(o.id, o);
  return [...byId.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
};

/**
 * Owns everything the Orders page talks to the server about: the order list
 * (with incremental polling), the reference data the create/edit forms need
 * (customers, products, delivery windows, active drivers), and the mutating
 * actions. The page itself keeps only view state (which modal is open, the
 * search/filter, form inputs) and orchestrates these actions.
 *
 * Every action refetches or patches the list itself; actions that the page
 * also needs to reflect into an open detail view return the server response
 * so the caller can update its own `selectedOrder`.
 */
export const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [customersLocked, setCustomersLocked] = useState(false);
  const [products, setProducts] = useState([]);
  const [deliveryWindows, setDeliveryWindows] = useState([]);
  const [activeDrivers, setActiveDrivers] = useState([]);

  // After the first full load, every refresh only asks for orders updated
  // since the previous fetch — by the server's clock, minus a minute of
  // overlap so an update whose transaction committed a moment late isn't
  // skipped — and merges them into the list by id.
  const syncCursorRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();
      const cursor = syncCursorRef.current;
      const params = cursor ? { updatedSince: new Date(new Date(cursor).getTime() - 60 * 1000).toISOString() } : undefined;
      const response = await axios.get(`${apiUrl}/api/orders`, { params });
      const received = response.data;
      // Without the header (an older backend) fall back to a full reload each time.
      syncCursorRef.current = response.headers['x-server-time'] || null;
      setOrders((prev) => (cursor ? mergeOrdersById(prev, received) : received));
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Initial load + reference data.
  useEffect(() => {
    refresh();
    reloadFormData();
    // Poll for new orders so the list stays current without a manual refresh
    // when a customer submits an order while this page is open.
    const pollId = setInterval(refresh, 20000);
    return () => clearInterval(pollId);
  }, [refresh, reloadFormData]);

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
