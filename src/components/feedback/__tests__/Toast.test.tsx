import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Toast, ToastContainer } from '../Toast';

describe('Toast', () => {
  const defaultProps = {
    id: 'test-toast',
    type: 'info' as const,
    title: 'Test Title',
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render toast with title', () => {
    render(<Toast {...defaultProps} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should render toast with message', () => {
    render(<Toast {...defaultProps} message="Test message" />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should render different toast types with correct styling', () => {
    const { rerender } = render(<Toast {...defaultProps} type="success" />);
    expect(screen.getByRole('alert')).toHaveClass('bg-green-50');

    rerender(<Toast {...defaultProps} type="error" />);
    expect(screen.getByRole('alert')).toHaveClass('bg-red-50');

    rerender(<Toast {...defaultProps} type="warning" />);
    expect(screen.getByRole('alert')).toHaveClass('bg-yellow-50');

    rerender(<Toast {...defaultProps} type="info" />);
    expect(screen.getByRole('alert')).toHaveClass('bg-blue-50');
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<Toast {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByLabelText('关闭通知');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledWith('test-toast');
  });

  it('should auto-close after duration', async () => {
    jest.useFakeTimers();
    const onClose = jest.fn();

    render(<Toast {...defaultProps} onClose={onClose} duration={1000} />);

    // Fast-forward time
    jest.advanceTimersByTime(1300); // Duration + animation time

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledWith('test-toast');
    });

    jest.useRealTimers();
  });

  it('should not auto-close when persistent is true', async () => {
    jest.useFakeTimers();
    const onClose = jest.fn();

    render(<Toast {...defaultProps} onClose={onClose} persistent duration={1000} />);

    jest.advanceTimersByTime(2000);

    expect(onClose).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('should not auto-close when duration is 0', async () => {
    jest.useFakeTimers();
    const onClose = jest.fn();

    render(<Toast {...defaultProps} onClose={onClose} duration={0} />);

    jest.advanceTimersByTime(2000);

    expect(onClose).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('should have proper accessibility attributes', () => {
    render(<Toast {...defaultProps} />);

    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'polite');

    const closeButton = screen.getByLabelText('关闭通知');
    expect(closeButton).toBeInTheDocument();
  });
});

describe('ToastContainer', () => {
  const mockToasts = [
    {
      id: 'toast-1',
      type: 'success' as const,
      title: 'Success',
      onClose: jest.fn(),
    },
    {
      id: 'toast-2',
      type: 'error' as const,
      title: 'Error',
      message: 'Error message',
      onClose: jest.fn(),
    },
  ];

  beforeEach(() => {
    // Create toast root element
    const toastRoot = document.createElement('div');
    toastRoot.id = 'toast-root';
    document.body.appendChild(toastRoot);
  });

  afterEach(() => {
    // Clean up toast root
    const toastRoot = document.getElementById('toast-root');
    if (toastRoot) {
      document.body.removeChild(toastRoot);
    }
  });

  it('should render multiple toasts', () => {
    const onClose = jest.fn();
    render(<ToastContainer toasts={mockToasts} onClose={onClose} />);

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('should render empty container when no toasts', () => {
    const onClose = jest.fn();
    render(<ToastContainer toasts={[]} onClose={onClose} />);

    // Container should exist but be empty
    const container = screen.getByLabelText('', { selector: '[aria-live="assertive"]' });
    expect(container).toBeInTheDocument();
    expect(container.children).toHaveLength(1); // Only the wrapper div
  });

  it('should call onClose when toast close button is clicked', () => {
    const onClose = jest.fn();
    render(<ToastContainer toasts={mockToasts} onClose={onClose} />);

    const closeButtons = screen.getAllByLabelText('关闭通知');
    fireEvent.click(closeButtons[0]);

    expect(onClose).toHaveBeenCalledWith('toast-1');
  });

  it('should render toasts in portal', () => {
    const onClose = jest.fn();
    render(<ToastContainer toasts={mockToasts} onClose={onClose} />);

    const toastRoot = document.getElementById('toast-root');
    expect(toastRoot).toContainElement(screen.getByText('Success'));
    expect(toastRoot).toContainElement(screen.getByText('Error'));
  });

  it('should have proper accessibility attributes', () => {
    const onClose = jest.fn();
    render(<ToastContainer toasts={mockToasts} onClose={onClose} />);

    const container = screen.getByLabelText('', { selector: '[aria-live="assertive"]' });
    expect(container).toHaveAttribute('aria-live', 'assertive');
  });
});