import { describe, it, expect } from 'vitest';
import React from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { useRedrawAfterInput } from '../../src/hooks/useRedrawAfterInput.js';

function Probe({ delayMs, enabled }: { delayMs: number; enabled?: boolean }): React.ReactElement {
  const epoch = useRedrawAfterInput(delayMs, enabled);
  return <Text>epoch:{epoch}</Text>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('useRedrawAfterInput', () => {
  it('starts at 0 and does not change without input', async () => {
    const { lastFrame } = render(<Probe delayMs={80} />);
    await delay(200);
    expect(lastFrame()).toBe('epoch:0');
  });

  it('bumps once, delayMs after the last of a burst of keypresses', async () => {
    const { lastFrame, stdin } = render(<Probe delayMs={80} />);
    await delay(20);

    stdin.write('\t');
    await delay(50);
    stdin.write('x');
    await delay(50);
    // 100ms after the first key but only 50ms after the last: no bump yet.
    expect(lastFrame()).toBe('epoch:0');

    await delay(100);
    expect(lastFrame()).toBe('epoch:1');

    // No further bumps while idle.
    await delay(200);
    expect(lastFrame()).toBe('epoch:1');
  });

  it('never bumps while disabled (no chart shown, or an image format that survives repaints)', async () => {
    const { lastFrame, stdin } = render(<Probe delayMs={80} enabled={false} />);
    await delay(20);
    stdin.write('\t');
    await delay(200);
    expect(lastFrame()).toBe('epoch:0');
  });
});
