/**
 * useVirtualList — reusable @tanstack/react-virtual wrapper.
 *
 * Renders only ~20 DOM nodes regardless of list size.
 * Use for any list with more than 50 items: chat, reports, timeline, logs.
 *
 * @example
 *   const { parentRef, virtualizer, totalHeight } = useVirtualList(messages, 72);
 *   <div ref={parentRef} className="h-full overflow-auto">
 *     <div style={{ height: totalHeight, position: "relative" }}>
 *       {virtualizer.getVirtualItems().map(row => (
 *         <div key={row.key} style={{ position: "absolute", top: 0, transform: `translateY(${row.start}px)`, width: "100%" }}>
 *           <MyItem item={items[row.index]} />
 *         </div>
 *       ))}
 *     </div>
 *   </div>
 */
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface Options {
  /** Number of items to render beyond the visible window (default 5) */
  overscan?: number;
  /** Reverse the list direction — useful for chat (newest at bottom) */
  reverse?: boolean;
}

export function useVirtualList<T>(
  items: T[],
  estimateSize: number | ((index: number) => number) = 80,
  options: Options = {}
) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { overscan = 5 } = options;

  const sizeFn = typeof estimateSize === "function" ? estimateSize : () => estimateSize;

  const virtualizer = useVirtualizer({
    count:           items.length,
    getScrollElement: () => parentRef.current,
    estimateSize:    sizeFn,
    overscan,
  });

  return {
    parentRef,
    virtualizer,
    totalHeight: virtualizer.getTotalSize(),
    virtualItems: virtualizer.getVirtualItems(),
  };
}

/**
 * useRowVirtualList — for multi-column grids.
 * Groups flat items into rows of `columns` items each, then virtualizes rows.
 *
 * @example
 *   const { parentRef, rowVirtualizer, getRowItems, totalHeight } = useRowVirtualList(reports, 2, 200);
 */
export function useRowVirtualList<T>(
  items: T[],
  columns: number,
  estimateRowHeight = 200,
  options: Options = {}
) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { overscan = 3 } = options;
  const rowCount = Math.ceil(items.length / columns);

  const rowVirtualizer = useVirtualizer({
    count:            rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize:     () => estimateRowHeight,
    overscan,
  });

  const getRowItems = (rowIndex: number): T[] =>
    items.slice(rowIndex * columns, rowIndex * columns + columns);

  return {
    parentRef,
    rowVirtualizer,
    virtualRows: rowVirtualizer.getVirtualItems(),
    totalHeight: rowVirtualizer.getTotalSize(),
    getRowItems,
    rowCount,
  };
}
