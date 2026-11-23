import { request } from "./api";

const listeners = new Set();

export function onCartChange(handler) {
  listeners.add(handler);
  return function () {
    listeners.delete(handler);
  };
}

function emit() {
  listeners.forEach(function (handler) {
    handler();
  });
  window.dispatchEvent(new Event("mv:cart-changed"));
}

export async function loadCart() {
  return request("/api/cart");
}

export async function addToCart(productId, quantity) {
  const data = await request("/api/cart/items", {
    method: "POST",
    body: JSON.stringify({ productId: productId, quantity: quantity || 1 }),
  });
  emit();
  return data;
}

export async function setQuantity(productId, quantity) {
  const data = await request("/api/cart/items/" + productId, {
    method: "PATCH",
    body: JSON.stringify({ quantity: quantity }),
  });
  emit();
  return data;
}

export async function removeFromCart(productId) {
  const data = await request("/api/cart/items/" + productId, { method: "DELETE" });
  emit();
  return data;
}

export async function checkoutCart() {
  const data = await request("/api/cart/checkout", { method: "POST" });
  emit();
  return data;
}

export function countItems(cart) {
  if (!cart || !cart.items) return 0;
  return cart.items.reduce(function (sum, item) {
    return sum + Number(item.quantity || 0);
  }, 0);
}
