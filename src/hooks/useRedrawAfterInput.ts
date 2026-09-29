import { useEffect, useRef, useState } from 'react';
import { useInput } from 'ink';

/**
 * Returns a counter that bumps once, `delayMs` after the last keypress.
 *
 * Inline-image charts (iTerm2 protocol, e.g. in VS Code) are written straight to the
 * terminal, outside Ink's frame. Any Ink repaint of the rows under the image erases it,
 * and a keypress (pane focus, list navigation, search) can repaint every row. Feeding
 * this counter into the chart's inputs re-stamps the image once after the user stops
 * typing, instead of redrawing it on a timer (which flickers).
 *
 * Pass `enabled = false` when no chart is shown or the chart's format survives repaints
 * (kitty's graphics layer, text charts): each bump re-renders and re-sends the image.
 */
export function useRedrawAfterInput(delayMs = 150, enabled = true): number {
  const [epoch, setEpoch] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useInput(() => {
    if (!enabled) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setEpoch((e) => e + 1), delayMs);
  });

  useEffect(() => () => clearTimeout(timer.current), []);

  return epoch;
}
