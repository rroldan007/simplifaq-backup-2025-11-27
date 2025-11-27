import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal, ConfirmModal } from '../Modal';
import { useModal } from '../../../hooks/useModal';

// Mock createPortal
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

// Composant de test pour useModal
function TestModalHook() {
  const { isOpen, open, close, toggle } = useModal();
  
  return (
    <div>
      <div data-testid="modal-state">{isOpen.toString()}</div>
      <button data-testid="open-btn" onClick={open}>Open</button>
      <button data-testid="close-btn" onClick={close}>Close</button>
      <button data-testid="toggle-btn" onClick={toggle}>Toggle</button>
      <Modal isOpen={isOpen} onClose={close} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    </div>
  );
}

describe('Modal', () => {
  beforeEach(() => {
    // Reset body overflow
    document.body.style.overflow = 'unset';
  });

  it('should not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={jest.fn()}>
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()}>
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('should render with title', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test Title">
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <Modal isOpen={true} onClose={onClose} title="Test Title">
        <p>Modal content</p>
      </Modal>
    );

    const closeButton = screen.getByLabelText('Fermer');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when escape key is pressed', () => {
    const onClose = jest.fn();

    render(
      <Modal isOpen={true} onClose={onClose}>
        <p>Modal content</p>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when escape key is pressed if closeOnEscape is false', () => {
    const onClose = jest.fn();

    render(
      <Modal isOpen={true} onClose={onClose} closeOnEscape={false}>
        <p>Modal content</p>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should call onClose when overlay is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <Modal isOpen={true} onClose={onClose}>
        <p>Modal content</p>
      </Modal>
    );

    // Cliquer sur l'overlay (pas sur le modal lui-même)
    const overlay = screen.getByRole('dialog').parentElement;
    if (overlay) {
      await user.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should not call onClose when overlay is clicked if closeOnOverlayClick is false', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <Modal isOpen={true} onClose={onClose} closeOnOverlayClick={false}>
        <p>Modal content</p>
      </Modal>
    );

    const overlay = screen.getByRole('dialog').parentElement;
    if (overlay) {
      await user.click(overlay);
      expect(onClose).not.toHaveBeenCalled();
    }
  });

  it('should not show close button when showCloseButton is false', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test Title" showCloseButton={false}>
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.queryByLabelText('Fermer')).not.toBeInTheDocument();
  });

  it('should apply different sizes', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={jest.fn()} size="sm">
        <p>Modal content</p>
      </Modal>
    );

    let modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('max-w-md');

    rerender(
      <Modal isOpen={true} onClose={jest.fn()} size="lg">
        <p>Modal content</p>
      </Modal>
    );

    modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('max-w-2xl');
  });

  it('should prevent body scroll when open', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={jest.fn()}>
        <p>Modal content</p>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <Modal isOpen={false} onClose={jest.fn()}>
        <p>Modal content</p>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('unset');
  });

  it('should have proper accessibility attributes', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test Title">
        <p>Modal content</p>
      </Modal>
    );

    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
  });
});

describe('ConfirmModal', () => {
  it('should render with title and message', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm Action"
        message="Are you sure?"
      />
    );

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('should call onConfirm and onClose when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const onClose = jest.fn();

    render(
      <ConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Confirm Action"
        message="Are you sure?"
      />
    );

    const confirmButton = screen.getByText('Confirmer');
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call only onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const onClose = jest.fn();

    render(
      <ConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Confirm Action"
        message="Are you sure?"
      />
    );

    const cancelButton = screen.getByText('Annuler');
    await user.click(cancelButton);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should render different variants with appropriate styles', () => {
    const { rerender } = render(
      <ConfirmModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Danger"
        message="This is dangerous"
        variant="danger"
      />
    );

    let confirmButton = screen.getByText('Confirmer');
    expect(confirmButton).toHaveClass('bg-red-600');

    rerender(
      <ConfirmModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Warning"
        message="This is a warning"
        variant="warning"
      />
    );

    confirmButton = screen.getByText('Confirmer');
    expect(confirmButton).toHaveClass('bg-amber-600');
  });

  it('should use custom button texts', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Custom"
        message="Custom message"
        confirmText="Yes, do it"
        cancelText="No, cancel"
      />
    );

    expect(screen.getByText('Yes, do it')).toBeInTheDocument();
    expect(screen.getByText('No, cancel')).toBeInTheDocument();
  });
});

describe('useModal hook', () => {
  it('should start with closed state by default', () => {
    render(<TestModalHook />);

    expect(screen.getByTestId('modal-state')).toHaveTextContent('false');
  });

  it('should open modal when open is called', async () => {
    const user = userEvent.setup();
    render(<TestModalHook />);

    const openButton = screen.getByTestId('open-btn');
    await user.click(openButton);

    expect(screen.getByTestId('modal-state')).toHaveTextContent('true');
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('should close modal when close is called', async () => {
    const user = userEvent.setup();
    render(<TestModalHook />);

    // Ouvrir d'abord
    const openButton = screen.getByTestId('open-btn');
    await user.click(openButton);
    expect(screen.getByTestId('modal-state')).toHaveTextContent('true');

    // Puis fermer
    const closeButton = screen.getByTestId('close-btn');
    await user.click(closeButton);
    expect(screen.getByTestId('modal-state')).toHaveTextContent('false');
  });

  it('should toggle modal state when toggle is called', async () => {
    const user = userEvent.setup();
    render(<TestModalHook />);

    const toggleButton = screen.getByTestId('toggle-btn');

    // Premier toggle - ouvrir
    await user.click(toggleButton);
    expect(screen.getByTestId('modal-state')).toHaveTextContent('true');

    // Deuxième toggle - fermer
    await user.click(toggleButton);
    expect(screen.getByTestId('modal-state')).toHaveTextContent('false');
  });
});