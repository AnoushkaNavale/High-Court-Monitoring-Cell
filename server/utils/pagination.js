function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function paginationFromQuery(query = {}, defaults = {}) {
  const page = parsePositiveInteger(query.page, defaults.page || 1);
  const pageSize = Math.min(
    parsePositiveInteger(query.pageSize, defaults.pageSize || 25),
    defaults.maxPageSize || 500
  );
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function paginationMeta(total, page, pageSize) {
  const totalItems = Number(total) || 0;
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}

module.exports = { paginationFromQuery, paginationMeta };
