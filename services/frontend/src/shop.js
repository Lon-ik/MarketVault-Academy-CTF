export const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420">' +
      '<rect width="640" height="420" fill="#131a26"/>' +
      '<text x="320" y="220" fill="#ea6a0c" font-family="sans-serif" font-size="28" ' +
      'text-anchor="middle">MarketVault</text></svg>'
  );

export function formatPrice(kopecks) {
  const value = Number(kopecks || 0) / 100;
  return value.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " ₽";
}

export function stockLabel(stock) {
  const count = Number(stock || 0);
  if (count <= 0) return { text: "нет в наличии", tone: "out" };
  if (count === 1) return { text: "остался 1 шт.", tone: "low" };
  if (count <= 5) return { text: "осталось " + count + " шт.", tone: "low" };
  return { text: "в наличии: " + count + " шт.", tone: "ok" };
}

export function onImageError(event) {
  event.currentTarget.onerror = null;
  event.currentTarget.src = FALLBACK_IMAGE;
}
