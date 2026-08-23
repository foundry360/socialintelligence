"use client";

import { useEffect, useState } from "react";

export const TABLE_PAGE_SIZE = 25;

export function useTablePagination(
  itemCount: number,
  resetKey: string | number,
  pageSize = TABLE_PAGE_SIZE,
) {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [resetKey, pageSize]);

  function showMore() {
    setVisibleCount((current) => Math.min(current + pageSize, itemCount));
  }

  return {
    visibleCount: Math.min(visibleCount, itemCount),
    showMore,
    hasMore: visibleCount < itemCount,
  };
}

export function TableSeeMore({
  onShowMore,
}: {
  onShowMore: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-border px-4 py-3 text-center">
      <button
        type="button"
        onClick={onShowMore}
        className="text-sm font-medium text-accent hover:underline"
      >
        See more
      </button>
    </div>
  );
}
