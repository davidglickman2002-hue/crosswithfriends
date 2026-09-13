import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import React, {act} from 'react';
import {createRoot, Root} from 'react-dom/client';
import Keyboard from '../Keyboard';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Keyboard component', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const renderComponent = async (element: React.ReactElement) => {
    await act(async () => {
      root.render(element);
    });
  };

  it('renders all 26 alphabet keys', async () => {
    await renderComponent(<Keyboard onKeyPress={vi.fn()} />);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    alphabet.forEach((letter) => {
      const button = container.querySelector(`button[aria-label="${letter}"]`);
      expect(button).not.toBeNull();
      expect(button?.textContent).toBe(letter);
    });
  });

  it('renders Backspace and Direction toggle buttons', async () => {
    await renderComponent(<Keyboard onKeyPress={vi.fn()} direction="across" />);
    const backspaceBtn = container.querySelector('button[aria-label="Backspace"]');
    expect(backspaceBtn).not.toBeNull();

    const dirBtn = container.querySelector('button[aria-label^="Toggle direction"]');
    expect(dirBtn).not.toBeNull();
  });

  it('calls onKeyPress with the correct letter when pressed', async () => {
    const onKeyPress = vi.fn();
    await renderComponent(<Keyboard onKeyPress={onKeyPress} />);
    const keyA = container.querySelector('button[aria-label="A"]') as HTMLButtonElement;
    keyA.click();
    expect(onKeyPress).toHaveBeenCalledWith('A');

    const keyZ = container.querySelector('button[aria-label="Z"]') as HTMLButtonElement;
    keyZ.click();
    expect(onKeyPress).toHaveBeenCalledWith('Z');
  });

  it('calls onBackspace when Backspace button is pressed', async () => {
    const onBackspace = vi.fn();
    const onKeyPress = vi.fn();
    await renderComponent(<Keyboard onKeyPress={onKeyPress} onBackspace={onBackspace} />);
    const backspaceBtn = container.querySelector('button[aria-label="Backspace"]') as HTMLButtonElement;
    backspaceBtn.click();
    expect(onBackspace).toHaveBeenCalledTimes(1);
  });

  it('calls onKeyPress("BACKSPACE") if onBackspace is not provided', async () => {
    const onKeyPress = vi.fn();
    await renderComponent(<Keyboard onKeyPress={onKeyPress} />);
    const backspaceBtn = container.querySelector('button[aria-label="Backspace"]') as HTMLButtonElement;
    backspaceBtn.click();
    expect(onKeyPress).toHaveBeenCalledWith('BACKSPACE');
  });

  it('calls onDirectionToggle when Direction button is pressed', async () => {
    const onDirectionToggle = vi.fn();
    const onKeyPress = vi.fn();
    await renderComponent(
      <Keyboard onKeyPress={onKeyPress} onDirectionToggle={onDirectionToggle} direction="across" />
    );
    const dirBtn = container.querySelector('button[aria-label^="Toggle direction"]') as HTMLButtonElement;
    dirBtn.click();
    expect(onDirectionToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onKeyPress("TOGGLE_DIRECTION") if onDirectionToggle is not provided', async () => {
    const onKeyPress = vi.fn();
    await renderComponent(<Keyboard onKeyPress={onKeyPress} />);
    const dirBtn = container.querySelector('button[aria-label^="Toggle direction"]') as HTMLButtonElement;
    dirBtn.click();
    expect(onKeyPress).toHaveBeenCalledWith('TOGGLE_DIRECTION');
  });

  it('does not trigger callbacks when disabled is true', async () => {
    const onKeyPress = vi.fn();
    const onBackspace = vi.fn();
    const onDirectionToggle = vi.fn();
    await renderComponent(
      <Keyboard
        disabled
        onKeyPress={onKeyPress}
        onBackspace={onBackspace}
        onDirectionToggle={onDirectionToggle}
      />
    );
    const keyM = container.querySelector('button[aria-label="M"]') as HTMLButtonElement;
    keyM.click();
    expect(onKeyPress).not.toHaveBeenCalled();

    const backspaceBtn = container.querySelector('button[aria-label="Backspace"]') as HTMLButtonElement;
    backspaceBtn.click();
    expect(onBackspace).not.toHaveBeenCalled();

    const dirBtn = container.querySelector('button[aria-label^="Toggle direction"]') as HTMLButtonElement;
    dirBtn.click();
    expect(onDirectionToggle).not.toHaveBeenCalled();
  });
});
