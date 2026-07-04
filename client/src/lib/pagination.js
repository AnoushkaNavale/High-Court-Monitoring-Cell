export function pageNumbers(current, total, radius = 2) {
  const start = Math.max(1, current - radius);
  const end = Math.min(Math.max(1, total), current + radius);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
