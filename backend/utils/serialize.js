const toNumber = (value) => (value == null ? value : Number(value));

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
  serializeProduct,
  serializeOrder,
  serializeAccounting
};
