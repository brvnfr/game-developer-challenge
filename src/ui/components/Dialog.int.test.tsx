import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';

function DialogHarness({ onEscape }: { readonly onEscape?: () => void }) {
  const [isOpen, setOpen] = useState(false);
  const secondRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {isOpen && (
        <Dialog
          title="Ahoy"
          description="Choose wisely."
          initialFocusRef={secondRef}
          {...(onEscape ? { onEscape } : {})}
        >
          <button type="button">First</button>
          <button ref={secondRef} type="button">
            Second
          </button>
          <button type="button" onClick={() => setOpen(false)}>
            Close
          </button>
        </Dialog>
      )}
    </>
  );
}

describe('Dialog', () => {
  it('is a labelled modal that focuses its main action and wraps Tab inside', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog', { name: 'Ahoy' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Choose wisely.');
    expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('gives focus back to the opener when it closes', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it('calls onEscape when Escape is pressed inside', async () => {
    const user = userEvent.setup();
    const onEscape = vi.fn();
    render(<DialogHarness onEscape={onEscape} />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.keyboard('{Escape}');
    expect(onEscape).toHaveBeenCalledOnce();
  });
});
