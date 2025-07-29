// import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChartContainer from '../ChartContainer';
import { lightTheme } from '../utils/chartThemes';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn().mockImplementation(() => {
    callback([{ isIntersecting: true }]);
  }),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('ChartContainer', () => {
  const mockChild = <div data-testid="chart-content">Chart Content</div>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children correctly', () => {
    render(
      <ChartContainer>
        {mockChild}
      </ChartContainer>
    );

    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
  });

  it('displays title and subtitle when provided', () => {
    render(
      <ChartContainer title="Test Chart" subtitle="Test Subtitle">
        {mockChild}
      </ChartContainer>
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <ChartContainer loading={true}>
        {mockChild}
      </ChartContainer>
    );

    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    const errorMessage = 'Chart failed to load';
    render(
      <ChartContainer error={errorMessage}>
        {mockChild}
      </ChartContainer>
    );

    expect(screen.getByText('⚠️ 图表加载失败')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ChartContainer className="custom-class">
        {mockChild}
      </ChartContainer>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('applies theme styles correctly', () => {
    const config = { theme: lightTheme };
    const { container } = render(
      <ChartContainer config={config}>
        {mockChild}
      </ChartContainer>
    );

    const chartContainer = container.firstChild as HTMLElement;
    expect(chartContainer).toHaveStyle({
      backgroundColor: lightTheme.colors.background,
      color: lightTheme.colors.text,
      fontFamily: lightTheme.fonts.family,
    });
  });

  it('calls onResize when dimensions change', async () => {
    const mockOnResize = jest.fn();

    render(
      <ChartContainer onResize={mockOnResize}>
        {mockChild}
      </ChartContainer>
    );

    // Simulate resize
    const resizeCallback = (ResizeObserver as jest.Mock).mock.calls[0][0];
    resizeCallback([{ target: { clientWidth: 800, clientHeight: 600 } }]);

    await waitFor(() => {
      expect(mockOnResize).toHaveBeenCalled();
    });
  });

  it('sets up intersection observer for animations', () => {
    render(
      <ChartContainer config={{ animations: true }}>
        {mockChild}
      </ChartContainer>
    );

    expect(IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      { threshold: 0.1 }
    );
  });

  it('skips intersection observer when animations disabled', () => {
    render(
      <ChartContainer config={{ animations: false }}>
        {mockChild}
      </ChartContainer>
    );

    // Should still be called once from the previous test, but not again
    expect(IntersectionObserver).toHaveBeenCalledTimes(1);
  });

  it('handles responsive configuration', () => {
    const config = { responsive: true };
    render(
      <ChartContainer config={config}>
        {mockChild}
      </ChartContainer>
    );

    expect(ResizeObserver).toHaveBeenCalled();
  });

  it('handles non-responsive configuration', () => {
    const config = { responsive: false };
    render(
      <ChartContainer config={config}>
        {mockChild}
      </ChartContainer>
    );

    // ResizeObserver should not be used for non-responsive charts
    const resizeObserverInstance = (ResizeObserver as jest.Mock).mock.instances[0];
    expect(resizeObserverInstance.observe).not.toHaveBeenCalled();
  });

  it('cleans up observers on unmount', () => {
    const { unmount } = render(
      <ChartContainer>
        {mockChild}
      </ChartContainer>
    );

    const resizeObserverInstance = (ResizeObserver as jest.Mock).mock.instances[0];
    const intersectionObserverInstance = (IntersectionObserver as jest.Mock).mock.instances[0];

    unmount();

    expect(resizeObserverInstance.disconnect).toHaveBeenCalled();
    expect(intersectionObserverInstance.disconnect).toHaveBeenCalled();
  });
});