const toNumber = (value) => (value == null ? value : Number(value));

// Fields safe to expose to admin UI when including a customer relation.
// Excludes password, emailOtp and phoneOtp.
const CUSTOMER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  street: true,
  houseNumber: true,
  postalCode: true,
  city: true,
  floorApartment: true,
  deliveryNotes: true,
  preferredLanguage: true
};

const serializeProduct = (product) => {
  if (!product) return product;
  return {
    ...product,
    b2bPrice: toNumber(product.b2bPrice)
  };
};

const serializeOrderItem = (item) => {
  if (!item) return item;
  return {
    ...item,
    price: toNumber(item.price),
    subtotal: toNumber(item.subtotal),
    product: item.product ? serializeProduct(item.product) : item.product
  };
};

const serializeOrder = (order) => {
  if (!order) return order;
  return {
    ...order,
    totalAmount: toNumber(order.totalAmount),
    orderItems: order.orderItems ? order.orderItems.map(serializeOrderItem) : order.orderItems
  };
};

const serializeAccounting = (record) => {
  if (!record) return record;
  return {
    ...record,
    amount: toNumber(record.amount),
    order: record.order ? serializeOrder(record.order) : record.order
  };
};

module.exports = {
  toNumber,
  CUSTOMER_PUBLIC_SELECT,
  serializeProduct,
  serializeOrder,
  serializeAccounting
};
