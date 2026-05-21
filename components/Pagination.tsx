"use client";

/**
 * Pagination — the shared footer pager for table views.
 *
 * Anatomy:
 *  ┌──────────────────────────────────────────────────────────────────────────┐
 *  │  Showing 1–10 of 42 routes               ‹ Previous  1 2 … 5  Next ›    │
 *  └──────────────────────────────────────────────────────────────────────────┘
 *
 * The left side shows a "Showing N–M of T <noun>" summary in mono-tabular nums so
 * the digits stay aligned as the user moves through pages. The right side shows
 * Previous / numbered page chips (with ellipses for long ranges) / Next.
 *
 * Usage:
 *   <Pagination
 *     page={page}
 *     pageSize={10}
 *     total={filtered.length}
 *     onPageChange={setPage}
 *     noun="routes"
 *   />
 *
 * Visual language matches the rest of the page — bordered slate-200 chips, brand
 * orange for the active page, hairline-divided footer. The component renders
 * `null` when there is only one page so simple tables stay uncluttered.
 */
export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  noun = "items",
  className = "",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
  /** Singular/plural noun rendered after the count — e.g. "routes", "vessels". */
  noun?: string;
  /** Extra classes (e.g. to override the default rounded-b-2xl border-t). */
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const go = (n: number) => {
    const clamped = Math.min(totalPages, Math.max(1, n));
    if (clamped !== page) onPageChange(clamped);
  };

  return (
    <div
      className={
        "flex items-center justify-between rounded-b-2xl border-t border-slate-100 px-5 py-3 " +
        className
      }
    >
      {/* Left — running count */}
      <span className="text-[12px] text-slate-500">
        Showing{" "}
        <span className="font-mono tabular-nums text-slate-700">{from}</span>
        <span className="mx-0.5">–</span>
        <span className="font-mono tabular-nums text-slate-700">{to}</span>{" "}
        of <span className="font-mono tabular-nums text-slate-700">{total}</span> {noun}
      </span>

      {/* Right — paging controls */}
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <PageButton
          onClick={() => go(page - 1)}
          disabled={page === 1}
          ariaLabel="Previous page"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span>Previous</span>
        </PageButton>

        {/* Numbered page chips with smart truncation */}
        <ul className="mx-1 flex items-center gap-1">
          {buildPageList(page, totalPages).map((token, i) =>
            token === "…" ? (
              <li key={`gap-${i}`} className="px-1 text-[12px] text-slate-400">…</li>
            ) : (
              <li key={token}>
                <button
                  type="button"
                  onClick={() => go(token)}
                  aria-label={`Go to page ${token}`}
                  aria-current={token === page ? "page" : undefined}
                  className={
                    "grid h-7 min-w-[28px] place-items-center rounded-lg px-2 font-mono text-[12px] tabular-nums " +
                    "transition-colors duration-150 ease-out " +
                    (token === page
                      ? "bg-brand-500 text-white shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
                  }
                >
                  {token}
                </button>
              </li>
            ),
          )}
        </ul>

        <PageButton
          onClick={() => go(page + 1)}
          disabled={page === totalPages}
          ariaLabel="Next page"
        >
          <span>Next</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </PageButton>
      </nav>
    </div>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={
        "inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 " +
        "transition-colors duration-150 ease-out hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      }
    >
      {children}
    </button>
  );
}

/**
 * Build the visible page tokens for the numbered chips, e.g.
 *   total=12, page=1  → [1, 2, 3, 4, 5, "…", 12]
 *   total=12, page=6  → [1, "…", 5, 6, 7, "…", 12]
 *   total=12, page=12 → [1, "…", 8, 9, 10, 11, 12]
 *   total=5,  page=3  → [1, 2, 3, 4, 5]
 * Always shows first + last; uses "…" sentinels to keep the strip compact.
 */
function buildPageList(page: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: Array<number | "…"> = [1];
  const left = Math.max(2, page - 1);
  const right = Math.min(total - 1, page + 1);
  if (left > 2) out.push("…");
  for (let i = left; i <= right; i++) out.push(i);
  if (right < total - 1) out.push("…");
  out.push(total);
  return out;
}
