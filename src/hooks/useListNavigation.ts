import { useState, useCallback, useMemo } from 'react';

export interface ListNavigationOptions {
  /** Total number of items in the list */
  itemCount: number;
  /** Number of visible rows in the viewport */
  viewportSize: number;
  /** Optional: returns false for items that should be skipped during navigation (e.g. headers) */
  isSelectable?: (index: number) => boolean;
}

export interface ListNavigation {
  selectedIndex: number;
  scrollOffset: number;
  searchQuery: string;

  /** Move selection up by 1 */
  moveUp: () => void;
  /** Move selection down by 1 */
  moveDown: () => void;
  /** Jump to first item */
  goToStart: () => void;
  /** Jump to last item */
  goToEnd: () => void;
  /** Set search filter text */
  setSearchQuery: (q: string) => void;
  /** Reset selection to 0 */
  resetSelection: () => void;
  /** Jump to a specific index */
  goTo: (index: number) => void;

  /** Range of items visible in the viewport: [start, end) */
  visibleRange: [number, number];
}

export function useListNavigation({ itemCount, viewportSize, isSelectable }: ListNavigationOptions): ListNavigation {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const findSelectable = useCallback(
    (from: number, direction: 1 | -1): number => {
      if (!isSelectable) return from;
      let idx = from;
      while (idx >= 0 && idx < itemCount && !isSelectable(idx)) {
        idx += direction;
      }
      // If we went out of bounds, search the other direction from the original
      if (idx < 0 || idx >= itemCount) {
        idx = from;
        while (idx >= 0 && idx < itemCount && !isSelectable(idx)) {
          idx -= direction;
        }
      }
      return Math.max(0, Math.min(idx, itemCount - 1));
    },
    [isSelectable, itemCount],
  );

  const clampAndScroll = useCallback(
    (newIndex: number) => {
      const clamped = Math.max(0, Math.min(newIndex, itemCount - 1));
      setSelectedIndex(clamped);

      setScrollOffset((prev) => {
        if (clamped < prev) return clamped;
        if (clamped >= prev + viewportSize) return clamped - viewportSize + 1;
        return prev;
      });
    },
    [itemCount, viewportSize],
  );

  const moveUp = useCallback(() => {
    let target = selectedIndex - 1;
    if (isSelectable) {
      target = findSelectable(target, -1);
    }
    clampAndScroll(target);
  }, [clampAndScroll, selectedIndex, isSelectable, findSelectable]);

  const moveDown = useCallback(() => {
    let target = selectedIndex + 1;
    if (isSelectable) {
      target = findSelectable(target, 1);
    }
    clampAndScroll(target);
  }, [clampAndScroll, selectedIndex, isSelectable, findSelectable]);

  const goToStart = useCallback(() => {
    clampAndScroll(isSelectable ? findSelectable(0, 1) : 0);
  }, [clampAndScroll, isSelectable, findSelectable]);

  const goToEnd = useCallback(() => {
    clampAndScroll(isSelectable ? findSelectable(itemCount - 1, -1) : itemCount - 1);
  }, [clampAndScroll, itemCount, isSelectable, findSelectable]);

  const resetSelection = useCallback(() => {
    const start = isSelectable ? findSelectable(0, 1) : 0;
    setSelectedIndex(start);
    setScrollOffset(0);
  }, [isSelectable, findSelectable]);

  const visibleRange = useMemo<[number, number]>(
    () => [scrollOffset, Math.min(scrollOffset + viewportSize, itemCount)],
    [scrollOffset, viewportSize, itemCount],
  );

  return {
    selectedIndex,
    scrollOffset,
    searchQuery,
    moveUp,
    moveDown,
    goToStart,
    goToEnd,
    setSearchQuery,
    resetSelection,
    goTo: clampAndScroll,
    visibleRange,
  };
}
