import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PDFExporter from '../PDFExporter';
import { ResumeContent } from '../../../types';

// Mock the PDF service
jest.mock('../../../services/pdf/pdf-service', () => ({
  PDFService: jest.fn().mockImplementation(() => ({
    generateResume: jest.fn(),
    getAvailableTemplates: jest.fn().mockReturnValue([
      {
        id: 'modern',
        name: 'Modern',
        description: 'Clean, contemporary design',
        preview: '/templates/modern-preview.png'
      },
      {
        id: 'classic',
        name: 'Classic',
        description: 'Traditional, professional layout',
        preview: '/templates/classic-preview.png'
      },
      {
        id: 'creative',
        name: 'Creative',
        description: 'Eye-catching design with sidebar',
        preview: '/templates/creative-preview.png'
      }
    ]),
    estimateGenerationTime: jest.fn().mockReturnValue(3000),
    cancelGeneration: jest.fn()
  }))
}));

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  DocumentArrowDownIcon: () => <div data-testid="download-icon" />,
  XMarkIcon: () => <div data-testid="x-icon" />
}));

describe('PDFExporter', () => {
  let mockResumeData: ResumeContent;
  let mockOnExportComplete: jest.Mock;
  let mockOnExportError: jest.Mock;

  beforeEach(() => {
    mockResumeData = {
      personalInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        location: 'New York, NY'
      },
      summary: 'Experienced developer',
      skills: ['JavaScript', 'React'],
      experience: [
        {
          id: '1',
          company: 'Tech Corp',
          position: 'Developer',
          startDate: new Date('2020-01-01'),
          description: 'Developed applications',
          achievements: ['Built features'],
          technologies: ['React']
        }
      ],
      education: [],
      projects: []
    };

    mockOnExportComplete = jest.fn();
    mockOnExportError = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render export component', () => {
      render(
        <PDFExporter
          resumeData={mockResumeData}
          onExportComplete={mockOnExportComplete}
          onExportError={mockOnExportError}
        />
      );

      expect(screen.getByText('Export Resume as PDF')).toBeInTheDocument();
      expect(screen.getByText('Choose Template')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
    });

    it('should render all available templates', () => {
      render(
        <PDFExporter
          resumeData={mockResumeData}
          onExportComplete={mockOnExportComplete}
          onExportError={mockOnExportError}
        />
      );

      expect(screen.getByText('Modern')).toBeInTheDocument();
      expect(screen.getByText('Classic')).toBeInTheDocument();
      expect(screen.getByText('Creative')).toBeInTheDocument();
      expect(screen.getByText('Clean, contemporary design')).toBeInTheDocument();
    });

    it('should show estimated generation time', () => {
      render(
        <PDFExporter
          resumeData={mockResumeData}
          onExportComplete={mockOnExportComplete}
          onExportError={mockOnExportError}
        />
      );

      expect(screen.getByText('Estimated time: 3.0s')).toBeInTheDocument();
    });
  });

  describe('template selection', () => {
    it('should select modern template by default', () => {
      render(
        <PDFExporter
          resumeData={mockResumeData}
          onExportComplete={mockOnExportComplete}
          onExportError={mockOnExportError}
        />
      );

      const modernTemplate = screen.getByText('Modern').closest('div');
      expect(modernTemplate).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('should allow template selection', async () => {
      const user = userEvent.setup();

      render(
        <PDFExporter
          resumeData={mockResumeData}
          onExportComplete={mockOnExportComplete}
          onExportError={mockOnExportError}
        />
      );

      const classicTemplate = screen.getByText('Classic').closest('div');
      await user.click(classicTemplate!);

      expect(classicTemplate).toHaveClass('border-blue-500', 'bg-blue-50');
    });
  });

  describe('advanced options', () => {
    it('should toggle advanced options', async () => {
      const user = userEvent.setup();

      render(
        <PDFExporter
          resumeData={mockResumeData}
          onExportComplete={mockOnExportComplete}
          onExportError={mockOnExportError}
        />
      );

      const toggleButton = screen.getByText('Show Advanced Options');
      await user.click(toggleButton);

      expect(screen.getByText('Font Size')).toBeInTheDocument();
      expect(screen.getByText('Color Scheme')).toBeInTheDocument();
      expect(screen.getByText('Margin')).toBeInTheDocument();
      expect(screen.getByText('Auto-download PDF')).toBeInTheDocument();

      await user.click(screen.getByText('Hide Advanced Options'));
      expect(screen.queryByText('Font Size')).not.toBeInTheDocument();
    });

    it('should update font size option', async () => {
      const user = userEvent.setup();

      render(
        <PDFExporter
          resumeData={mockResumeData}
          onExportComplete={mockOnExportComplete}
          onExportError={mockOnExportError}
        />
      );

      await user.click(screen.getByText('Show Advanced Options'));

      const fontSizeSelect = screen.getByDisplayValue('Normal (11pt)');
      await user.selectOptions(fontSizeSelect, '12');

      expect(screen.getByDisplayValue('Large (12pt)')).toBeInTheDocument();
    });

    it('should update color scheme option', async () => {
      const user = userEvent.setup();

      render(
        <PDFExporter
          resumeData={mockResumeData}
          onExportComplete={mockOnExportComplete}
          onExportError={mockOnExportError}
        />
      );

      await user.click(screen.getByText('Show Advanced Options'));

      const colorSelect = screen.getByDisplayValue('Blue');
      await user.selectOptions(colorSelect, 'green');

      expect(screen.getByDisplayValue('Green')).toBeInTheDocument();
    });

    it('should toggle auto-download option', async () => {
      const user = userEvent.setup();

      render(
        <PDFExporter
          resumeData={mockResumeData}
          onExportComplete={mockOnExportComplete}
          onExportError={mockOnExportError}
        />
      );

      await user.click(screen.getByText('Show Advanced Options'));

      const autoDownloadCheckbox = screen.getByRole('checkbox', { name: /auto-download pdf/i });
      expect(autoDownloadCheckbox).toBeChecked();

      await user.click(autoDownloadCheckbox);
      expect(autoDownloadCheckbox).not.toBeChecked();
    });
  });

  describe('PDF generation', () => {
    it('should generate PDF successfully', async () => {
      const user = userEvent.setup();
      const { PDFService } = require('../../../services/pdf/pdf-service');
      const mockService = new PDFService();

      mockService.generateResume.mockResolvedValue({
        blob: new Blob(['test'], { type: 'application/pdf' }),
        size: 1024,
        generationTime: 2000,
        template: 'modern'
      });

      render(
        <PDFExporter
          resumeData={mockResumeData}
          onExportComplete={mockOnExportComplete}
          onExportError={mockOnExportError}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockOnExportComplete).toHaveBeenCalled();
      });

      expect(screen.getByText('PDF Generated Successfully')).toBeInTheDocument();
      expect(screen.getByText('File size: 1.0 KB')).toBeInTheDocument();
    });

    it('should show progress during generation', async () => {
      const user = userEvent.setup();
      const { PDFService } = require('../../../services/pdf/pdf-service');
      const mockService = new PDFService();

      mockService.generateResume.mockImplementation(async (data, options, progressCallback) => {
        if (progressCallback) {
          progressCallback({ stage: 'rendering', progress: 50, message: 'Rendering content...' });
        }
        return {
          blob: new Blob(['test'], { type: 'application/pdf' }),
          size: 1024,
          generationTime: 2000,
          template: 'modern'
        };
      });

      render(
        <PDFExporter
          resumeData={mockResumeData}
          onExportComplete={mockOnExportComplete}
          onExportError={mockOnExportError}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      expect(screen.getByText('Rendering content...')).toBeInTheDocument();
      expect(screen.getByText('50% complete')).toBeInTheDocument();
    });

    it('should handle generation errors', async () => {
      const user = userEvent.setup();
      const { PDFService } = require('../../../services/pdf/pdf-service');
      const mockService = new PDFService();

      mockService.generateResume.mockRejectedValue(new Error('Generation failed'));

      render(
        <PDFExporter
          resumeData={mockResumeData}
          onExportComplete={mockOnExportComplete}
          onExportError={mockOnExportError}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockOnExportError).toHaveBeenCalled();
      });

      expect(screen.getByText('Export Failed')).toBeInTheDocument();
      expect(screen.getByText('Generation failed')).toBeInTheDocument();
    });

    it('should disable export button during generation', async () => {
      const user = userEvent.setup();
      const { PDFService } = require('../../../services/pdf/pdf-service');
      const mockService = new PDFService();

      mockService.generateResume.mockImplementation(() => new Promise(() => { })); // Never resolves

      render(
        <PDFExporter
          resumeData={mockResumeData}
          onExportComplete={mockOnExportComplete}
          onExportError={mockOnExportError}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
    });

    it('should allow cancellation during generation', async () => {
      const user = userEvent.setup();
      const { PDFService } = require('../../../services/pdf/pdf-service');
      const mockService = new PDFService();

      mockService.generateResume.mockImplementation(async (data, options, progressCallback) => {
        if (progressCallback) {
          progressCallback({ stage: 'rendering', progress: 50, message: 'Rendering...' });
        }
        return new Promise(() => { }); // Never resolves
      });

      render(
        <PDFExporter
          resumeData={mockResumeData}
          onExportComplete={mockOnExportComplete}
          onExportError={mockOnExportError}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      // Wait for progress to show
      await waitFor(() => {
        expect(screen.getByText('Rendering...')).toBeInTheDocument();
      });

      const cancelButton = screen.getByTestId('x-icon').closest('button');
      await user.click(cancelButton!);

      expect(mockService.cancelGeneration).toHaveBeenCalled();
    });
  });

  describe('download functionality', () => {
    it('should allow re-downloading generated PDF', async () => {
      const user = userEvent.setup();
      const { PDFService } = require('../../../services/pdf/pdf-service');
      const mockService = new PDFService();

      // Mock URL.createObjectURL and related DOM methods
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();

      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      mockService.generateResume.mockResolvedValue({
        blob: new Blob(['test'], { type: 'application/pdf' }),
        size: 1024,
        generationTime: 2000,
        template: 'modern'
      });

      render(
        <PDFExporter
          resumeData={mockResumeData}
          onExportComplete={mockOnExportComplete}
          onExportError={mockOnExportError}
        />
      );

      // Generate PDF first
      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('PDF Generated Successfully')).toBeInTheDocument();
      });

      // Click download again button
      const downloadAgainButton = screen.getByText('Download Again');
      await user.click(downloadAgainButton);

      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <PDFExporter
          resumeData={mockResumeData}
          onExportComplete={mockOnExportComplete}
          onExportError={mockOnExportError}
        />
      );

      expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /auto-download pdf/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <PDFExporter
          resumeData={mockResumeData}
          onExportComplete={mockOnExportComplete}
          onExportError={mockOnExportError}
        />
      );

      // Tab through elements
      await user.tab();
      expect(screen.getByText('Modern').closest('div')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Classic').closest('div')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Creative').closest('div')).toHaveFocus();
    });
  });
});