import {
  PDFGenerator,
  PDFGenerationOptions,
  PDFGenerationResult,
  PDFGenerationProgress,
  PDFGenerationError,
  ResumeTemplate
} from './pdf-generator';
import { ResumeContent } from '../../types';

export interface PDFExportOptions extends PDFGenerationOptions {
  filename?: string;
  autoDownload?: boolean;
}

export interface PDFServiceConfig {
  defaultTemplate: ResumeTemplate;
  defaultOptions: Partial<PDFGenerationOptions>;
  maxFileSize: number; // in bytes
  compressionEnabled: boolean;
}

export class PDFService {
  private config: PDFServiceConfig;
  private activeGenerations = new Map<string, AbortController>();

  constructor(config?: Partial<PDFServiceConfig>) {
    this.config = {
      defaultTemplate: 'modern',
      defaultOptions: {
        fontSize: 11,
        margin: 20,
        colorScheme: 'blue',
        includePhoto: false
      },
      maxFileSize: 5 * 1024 * 1024, // 5MB
      compressionEnabled: true,
      ...config
    };
  }

  /**
   * Generate and optionally download a PDF resume
   */
  async generateResume(
    resumeData: ResumeContent,
    options: Partial<PDFExportOptions> = {},
    progressCallback?: (progress: PDFGenerationProgress) => void
  ): Promise<PDFGenerationResult> {
    const generationId = this.generateId();
    const abortController = new AbortController();
    this.activeGenerations.set(generationId, abortController);

    try {
      const fullOptions: PDFGenerationOptions = {
        template: options.template || this.config.defaultTemplate,
        fontSize: options.fontSize || this.config.defaultOptions.fontSize || 11,
        margin: options.margin || this.config.defaultOptions.margin || 20,
        colorScheme: options.colorScheme || this.config.defaultOptions.colorScheme || 'blue',
        includePhoto: options.includePhoto || this.config.defaultOptions.includePhoto || false
      };

      // Validate resume data
      this.validateResumeData(resumeData);

      // Create progress wrapper that checks for cancellation
      const wrappedProgressCallback = (progress: PDFGenerationProgress) => {
        if (abortController.signal.aborted) {
          throw new PDFGenerationError('PDF generation was cancelled', 'CANCELLED');
        }
        progressCallback?.(progress);
      };

      const generator = new PDFGenerator(wrappedProgressCallback);
      const result = await generator.generatePDF(resumeData, fullOptions);

      // Validate file size
      if (result.size > this.config.maxFileSize) {
        throw new PDFGenerationError(
          `Generated PDF size (${this.formatFileSize(result.size)}) exceeds maximum allowed size (${this.formatFileSize(this.config.maxFileSize)})`,
          'FILE_TOO_LARGE'
        );
      }

      // Auto-download if requested
      if (options.autoDownload !== false) {
        const filename = options.filename || this.generateFilename(resumeData, fullOptions.template);
        this.downloadPDF(result.blob, filename);
      }

      return result;

    } catch (error) {
      if (error instanceof PDFGenerationError) {
        throw error;
      }
      throw new PDFGenerationError(
        `PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_FAILED',
        error
      );
    } finally {
      this.activeGenerations.delete(generationId);
    }
  }

  /**
   * Cancel an active PDF generation
   */
  cancelGeneration(generationId?: string): void {
    if (generationId) {
      const controller = this.activeGenerations.get(generationId);
      if (controller) {
        controller.abort();
        this.activeGenerations.delete(generationId);
      }
    } else {
      // Cancel all active generations
      this.activeGenerations.forEach(controller => controller.abort());
      this.activeGenerations.clear();
    }
  }

  /**
   * Get available templates with their descriptions
   */
  getAvailableTemplates(): Array<{
    id: ResumeTemplate;
    name: string;
    description: string;
    preview?: string;
  }> {
    return [
      {
        id: 'modern',
        name: 'Modern',
        description: 'Clean, contemporary design with accent colors and modern typography',
        preview: '/templates/modern-preview.png'
      },
      {
        id: 'classic',
        name: 'Classic',
        description: 'Traditional, professional layout suitable for conservative industries',
        preview: '/templates/classic-preview.png'
      },
      {
        id: 'creative',
        name: 'Creative',
        description: 'Eye-catching design with sidebar layout, perfect for creative roles',
        preview: '/templates/creative-preview.png'
      }
    ];
  }

  /**
   * Get default options for a specific template
   */
  getTemplateDefaults(template: ResumeTemplate): PDFGenerationOptions {
    const baseDefaults: PDFGenerationOptions = {
      template,
      fontSize: 11,
      margin: 20,
      colorScheme: 'blue',
      includePhoto: false
    };

    switch (template) {
      case 'modern':
        return {
          ...baseDefaults,
          colorScheme: 'blue',
          fontSize: 11
        };
      case 'classic':
        return {
          ...baseDefaults,
          colorScheme: 'gray',
          fontSize: 12
        };
      case 'creative':
        return {
          ...baseDefaults,
          colorScheme: 'purple',
          fontSize: 10,
          margin: 15
        };
      default:
        return baseDefaults;
    }
  }

  /**
   * Estimate PDF generation time based on content complexity
   */
  estimateGenerationTime(resumeData: ResumeContent): number {
    let baseTime = 2000; // 2 seconds base time

    // Add time based on content complexity
    baseTime += resumeData.experience.length * 500;
    baseTime += resumeData.education.length * 200;
    baseTime += resumeData.projects.length * 300;
    baseTime += Math.min(resumeData.skills.length * 10, 500);

    // Add time for summary length
    if (resumeData.summary) {
      baseTime += Math.min(resumeData.summary.length * 2, 1000);
    }

    return Math.min(baseTime, 10000); // Cap at 10 seconds
  }

  /**
   * Validate resume data before PDF generation
   */
  private validateResumeData(resumeData: ResumeContent): void {
    if (!resumeData.personalInfo?.name) {
      throw new PDFGenerationError('Personal name is required', 'MISSING_REQUIRED_DATA');
    }

    if (!resumeData.personalInfo?.email) {
      throw new PDFGenerationError('Email address is required', 'MISSING_REQUIRED_DATA');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resumeData.personalInfo.email)) {
      throw new PDFGenerationError('Invalid email format', 'INVALID_DATA_FORMAT');
    }

    // Check for minimum content
    const hasContent = resumeData.experience.length > 0 ||
      resumeData.education.length > 0 ||
      resumeData.projects.length > 0 ||
      resumeData.skills.length > 0;

    if (!hasContent) {
      throw new PDFGenerationError(
        'Resume must contain at least one section (experience, education, projects, or skills)',
        'INSUFFICIENT_CONTENT'
      );
    }
  }

  /**
   * Download PDF blob as file
   */
  private downloadPDF(blob: Blob, filename: string): void {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new PDFGenerationError(
        'Failed to download PDF file',
        'DOWNLOAD_FAILED',
        error
      );
    }
  }

  /**
   * Generate filename for PDF
   */
  private generateFilename(resumeData: ResumeContent, template: ResumeTemplate): string {
    const name = resumeData.personalInfo.name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();

    const timestamp = new Date().toISOString().split('T')[0];
    return `${name}_resume_${template}_${timestamp}.pdf`;
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate unique ID for tracking generations
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get current service configuration
   */
  getConfig(): PDFServiceConfig {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<PDFServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}