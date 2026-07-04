import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageNumbers } from "../lib/pagination.js";

export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Table pages">
      <span>{pagination.totalItems} records</span>
      <button className="secondary" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)} aria-label="Previous page">
        <ChevronLeft size={16} />
      </button>
      {pageNumbers(pagination.page, pagination.totalPages).map((page) => (
        <button key={page} className={page === pagination.page ? "active" : "secondary"} onClick={() => onPageChange(page)}>{page}</button>
      ))}
      <button className="secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)} aria-label="Next page">
        <ChevronRight size={16} />
      </button>
      <span>Page {pagination.page} of {pagination.totalPages}</span>
    </nav>
  );
}
