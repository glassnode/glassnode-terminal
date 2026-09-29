import { describe, it, expect } from 'vitest';
import React from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { useListNavigation, type ListNavigation } from '../../src/hooks/useListNavigation.js';

let nav!: ListNavigation;
function Probe({ itemCount, viewportSize }: { itemCount: number; viewportSize: number }): React.ReactElement {
  nav = useListNavigation({ itemCount, viewportSize });
  return <Text>{`${nav.selectedIndex} ${nav.visibleRange[0]}-${nav.visibleRange[1]}`}</Text>;
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 20));
}

describe('useListNavigation', () => {
  it('keeps the selection visible when the viewport shrinks', async () => {
    const { rerender, lastFrame } = render(<Probe itemCount={30} viewportSize={20} />);
    await settle();
    nav.goToEnd();
    await settle();
    expect(lastFrame()).toBe('29 10-30');

    // The pane gets shorter (terminal resize, a wrapping header line, an error line…).
    rerender(<Probe itemCount={30} viewportSize={10} />);
    await settle();
    const [start, end] = nav.visibleRange;
    expect(nav.selectedIndex).toBe(29);
    expect(29 >= start && 29 < end).toBe(true);
  });

  it('does not scroll past the end when the viewport grows', async () => {
    const { rerender } = render(<Probe itemCount={30} viewportSize={10} />);
    await settle();
    nav.goToEnd();
    await settle();
    rerender(<Probe itemCount={30} viewportSize={25} />);
    await settle();
    expect(nav.visibleRange).toEqual([5, 30]);
  });
});
