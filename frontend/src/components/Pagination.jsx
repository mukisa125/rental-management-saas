import React from 'react';

const Pagination = ({ page = 1, totalPages = 1, total = 0, limit = 10, onPage }) => {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-slate-500">Showing {total === 0 ? 0 : start} to {end} of {total} results</div>
      <div className="flex items-center gap-2">
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm bg-white border-slate-200 disabled:opacity-50">Previous</button>
        <div className="px-3 py-1 text-sm">Page {page} of {totalPages}</div>
        <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded text-sm bg-white border-slate-200 disabled:opacity-50">Next</button>
      </div>
    </div>
  );
};

export default Pagination;
