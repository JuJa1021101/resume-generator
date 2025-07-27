import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../ProgressBar';

describe('ProgressBar', () => {
  it('should render progress bar with correct progress', () => {
    render(<ProgressBar progress={50} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressBar).toHaveStyle({ width: '50%' });
  });

  it('should render with label', () => {
    render(<ProgressBar progress={75} label="Loading..." />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-label', 'Loading...');
  });

  it('should show percentage when enabled', () => {
    render(<ProgressBar progress={33.7} showPercentage />);

    expect(screen.getByText('34%')).toBeInTheDocument();
  });

  it('should show both label and percentage', () => {
    render(<ProgressBar progress={80} label="Processing" showPercentage />);

    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('should clamp progress values', () => {
    const { rerender } = render(<ProgressBar progress={150} />);

    let progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    expect(progressBar).toHaveStyle({ width: '100%' });

    rerender(<ProgressBar progress={-10} />);

    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    expect(progressBar).toHaveStyle({ width: '0%' });
  });

  it('should apply different sizes', () => {
    const { rerender } = render(<ProgressBar progress={50} size="sm" />);

    let container = screen.getByRole('progressbar').parentElement;
    expect(container).toHaveClass('h-1');

    rerender(<ProgressBar progress={50} size="md" />);
    container = screen.getByRole('progressbar').parentElement;
    expect(container).toHaveClass('h-2');

    rerender(<ProgressBar progress={50} size="lg" />);
    container = screen.getByRole('progressbar').parentElement;
    expect(container).toHaveClass('h-3');
  });

  it('should apply different colors', () => {
    const { rerender } = render(<ProgressBar progress={50} color="primary" />);

    let progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-blue-600');

    rerender(<ProgressBar progress={50} color="success" />);
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-green-600');

    rerender(<ProgressBar progress={50} color="warning" />);
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-yellow-600');

    rerender(<ProgressBar progress={50} color="error" />);
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-red-600');
  });

  it('should apply custom className', () => {
    render(<ProgressBar progress={50} className="custom-class" />);

    const container = screen.getByRole('progressbar').closest('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('should handle animation prop', () => {
    const { rerender } = render(<ProgressBar progress={50} animated />);

    let progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('transition-transform');

    rerender(<ProgressBar progress={50} animated={false} />);
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).not.toHaveClass('transition-transform');
  });

  it('should have proper accessibility attributes', () => {
    render(<ProgressBar progress={60} label="Upload progress" />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '60');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressBar).toHaveAttribute('aria-label', 'Upload progress');
  });

  it('should use default aria-label when no label provided', () => {
    render(<ProgressBar progress={45} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-label', '进度 45%');
  });
});