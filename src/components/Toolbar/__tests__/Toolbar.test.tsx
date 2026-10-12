/* eslint-disable react/jsx-props-no-spreading */
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {act} from 'react';
import {createRoot, Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router';
import Toolbar from '../index';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Toolbar puzzle title display', () => {
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

  const renderToolbar = async (props: any = {}) => {
    const defaultProps = {
      v2: true,
      gid: '123',
      pid: '456',
      startTime: Date.now(),
      pausedTime: 0,
      isPaused: false,
      solved: false,
      onStartClock: vi.fn(),
      onPauseClock: vi.fn(),
      onResetClock: vi.fn(),
      onCheck: vi.fn(),
      onReveal: vi.fn(),
      onReset: vi.fn(),
      onRefocus: vi.fn(),
      onTogglePencil: vi.fn(),
      onToggleVimMode: vi.fn(),
      onToggleSkipFilledSquares: vi.fn(),
      onToggleAutoAdvanceCursor: vi.fn(),
      onToggleAutocheck: vi.fn(),
      onToggleListView: vi.fn(),
      onToggleChat: vi.fn(),
      onToggleExpandMenu: vi.fn(),
      ...props,
    };

    await act(async () => {
      root.render(
        <MemoryRouter>
          <Toolbar {...defaultProps} />
        </MemoryRouter>
      );
    });
  };

  it('renders puzzle title and subtitle on desktop', async () => {
    await renderToolbar({
      title: 'Monday Midi Mix',
      author: 'Jane Doe',
      type: 'Midi',
      mobile: false,
    });

    const header = container.querySelector('.toolbar--header');
    expect(header).not.toBeNull();

    const titleEl = container.querySelector('.toolbar--header--title');
    expect(titleEl?.textContent).toBe('Monday Midi Mix');

    const authorEl = container.querySelector('.toolbar--header--author');
    expect(authorEl?.textContent).toBe('By Jane Doe');

    const typeEl = container.querySelector('.toolbar--header--type');
    expect(typeEl?.textContent).toBe('Midi');
  });

  it('does not render desktop header when title is empty', async () => {
    await renderToolbar({
      title: '',
      author: '',
      mobile: false,
    });

    const header = container.querySelector('.toolbar--header');
    expect(header).toBeNull();
  });

  it('renders mobile header with title, author, and back button', async () => {
    await renderToolbar({
      title: 'LA Times Daily',
      author: 'John Smith',
      mobile: true,
    });

    const mobileHeader = container.querySelector('.toolbar--mobile-header');
    expect(mobileHeader).not.toBeNull();

    const titleEl = container.querySelector('.toolbar--mobile--title');
    expect(titleEl?.textContent).toBe('LA Times Daily');

    const authorEl = container.querySelector('.toolbar--mobile--author');
    expect(authorEl?.textContent).toBe('By John Smith');

    const backButton = mobileHeader?.querySelector('.toolbar--mobile--back');
    expect(backButton).not.toBeNull();
    expect(backButton?.getAttribute('href')).toBe('/');
  });

  it('renders back button in toolbar--mobile if title is absent', async () => {
    await renderToolbar({
      title: '',
      mobile: true,
    });

    const mobileHeader = container.querySelector('.toolbar--mobile-header');
    expect(mobileHeader).toBeNull();

    const toolbarMobile = container.querySelector('.toolbar--mobile');
    const backButton = toolbarMobile?.querySelector('.toolbar--mobile--back');
    expect(backButton).not.toBeNull();
  });

  it('applies toolbar--header--chat-hidden class when chat is hidden', async () => {
    await renderToolbar({
      title: 'Secret Puzzle',
      chatHidden: true,
      mobile: false,
    });

    const header = container.querySelector('.toolbar--header--chat-hidden');
    expect(header).not.toBeNull();
  });

  it('renders quick chat Say button in toolbar--mobile when onQuickChat is provided', async () => {
    const onQuickChat = vi.fn();
    await renderToolbar({
      mobile: true,
      onQuickChat,
    });

    const sayButton = container.querySelector('.toolbar--mobile .quick-chat--button') as HTMLButtonElement;
    expect(sayButton).not.toBeNull();
    expect(sayButton.textContent).toContain('Say');

    // Click to open quick chat panel
    await act(async () => {
      sayButton.click();
    });

    const input = container.querySelector('.quick-chat--input') as HTMLInputElement;
    expect(input).not.toBeNull();

    // Type message and submit
    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      nativeSetter?.call(input, 'Great clue!');
      input.dispatchEvent(new Event('input', {bubbles: true}));
    });

    const form = container.querySelector('.quick-chat--panel') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
    });

    expect(onQuickChat).toHaveBeenCalledWith('Great clue!');
    expect(container.querySelector('.quick-chat--panel')).toBeNull();
  });

  it('does not render quick chat Say button when onQuickChat is not provided', async () => {
    await renderToolbar({
      mobile: true,
      onQuickChat: undefined,
    });

    expect(container.querySelector('.toolbar--mobile .quick-chat--button')).toBeNull();
  });
});
