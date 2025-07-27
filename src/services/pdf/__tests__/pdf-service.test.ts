import { PDFService, PDFServiceConfig } from '../pdf-service';
import { PDFGenerationError } from '../pdf-generator';
import { ResumeContent } from '../../../types';

// Mock the PDFGenerator
jest.mock('../pdf-generator', () => ({
  PDFGenerator: jest.fn().mockImplementation((progressCallback) => ({
    generatePDF: jest.fn().mockImplementation(async (resumeData, options) => {
      // Simulate progress callbacks
      if (progressCallback) {
        progressCallback({ stage: 'initializing', progress: 0, message: 'Starting...' });
        progressCallback({ stage: 'rendering', progress: 50, message: 'Rendering...' });
        progressCallback({ stage: 'complete', progress: 100, message: 'Complete!' });
      }

      return {
        blob: new Blob(['test pdf'], { type: 'application/pdf' }),
        size: 1024,
        generationTime: 2000,
        template: options.template
      };
    })
  })),
  PDFGenerationError: class extends Error {
    constructor(message: string, mockCode: string, mockDetails?: unknown) {
      super(message);
      this.name = 'PDFGenerationError';
      this.code = mockCode;
      this.details = mockDetails;
    }
  }
}));

// Mock DOM methods
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'blob:mock-url'),
    revokeObjectURL: jest.fn()
  }
});

Object.defineProperty(global.document, 'createElement', {
  value: jest.fn(() => ({
    href: '',
    download: '',
    click: jest.fn(),
    remove: jest.fn()
  }))
});

Object.defineProperty(global.document, 'body', {
  value: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
});

describe('PDFService', () => {
  let service: PDFService;
  let mockResumeData: ResumeContent;

  beforeEach(() => {
    service = new PDFService();

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
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const config = service.getConfig();
      expect(config.defaultTemplate).toBe('modern');
      expect(config.maxFileSize).toBe(5 * 1024 * 1024);
      expect(config.compressionEnabled).toBe(true);
    });

    it('should initialize with custom config', () => {
      const customConfig: Partial<PDFServiceConfig> = {
        defaultTemplate: 'classic',
        maxFileSize: 10 * 1024 * 1024,
        compressionEnabled: false
      };

      const customService = new PDFService(customConfig);
      const config = customService.getConfig();

      expect(config.defaultTemplate).toBe('classic');
      expect(config.maxFileSize).toBe(10 * 1024 * 1024);
      expect(config.compressionEnabled).toBe(false);
    });
  });

  describe('generateResume', () => {
    it('should generate PDF with default options', async () => {
      const result = await service.generateResume(mockResumeData);

      expect(result).toHaveProperty('blob');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('generationTime');
      expect(result.template).toBe('modern');
    });

    it('should generate PDF with custom options', async () => {
      const options = {
        template: 'classic' as const,
        fontSize: 12,
        colorScheme: 'gray' as const,
        autoDownload: false
      };

      const result = await service.generateResume(mockResumeData, options);
      expect(result.template).toBe('classic');
    });

    it('should call progress callback', async () => {
      const progressCallback = jest.fn();

      await service.generateResume(mockResumeData, {}, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith({
        stage: 'initializing',
        progress: 0,
        message: 'Starting...'
      });
    });

    it('should auto-download by default', async () => {
      const createElementSpy = jest.spyOn(document, 'createElement');
      const appendChildSpy = jest.spyOn(document.body, 'appendChild');

      await service.generateResume(mockResumeData);

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
    });

    it('should not auto-download when disabled', async () => {
      const createElementSpy = jest.spyOn(document, 'createElement');
      createElementSpy.mockClear(); // Clear previous calls

      await service.generateResume(mockResumeData, { autoDownload: false });

      expect(createElementSpy).not.toHaveBeenCalled();

      createElementSpy.mockRestore();
    });

    it('should validate resume data', async () => {
      const invalidData = {
        ...mockResumeData,
        personalInfo: {
          ...mockResumeData.personalInfo,
          name: '', // Invalid: empty name
          email: 'invalid-email' // Invalid: bad email format
        }
      };

      await expect(service.generateResume(invalidData))
        .rejects.toThrow(PDFGenerationError);
    });

    it('should reject files that are too large', async () => {
      // Mock a large file
      const { PDFGenerator } = require('../pdf-generator');
      PDFGenerator.mockImplementation(() => ({
        generatePDF: jest.fn().mockResolvedValue({
          blob: new Blob(['x'.repeat(10 * 1024 * 1024)]), // 10MB file
          size: 10 * 1024 * 1024,
          generationTime: 2000,
          template: 'modern'
        })
      }));

      await expect(service.generateResume(mockResumeData))
        .rejects.toThrow('exceeds maximum allowed size');
    });

    it('should handle generation errors', async () => {
      const { PDFGenerator } = require('../pdf-generator');
      PDFGenerator.mockImplementation(() => ({
        generatePDF: jest.fn().mockRejectedValue(new Error('Generation failed'))
      }));

      await expect(service.generateResume(mockResumeData))
        .rejects.toThrow(PDFGenerationError);
    });
  });

  describe('getAvailableTemplates', () => {
    it('should return all available templates', () => {
      const templates = service.getAvailableTemplates();

      expect(templates).toHaveLength(3);
      expect(templates.map(t => t.id)).toEqual(['modern', 'classic', 'creative']);

      templates.forEach(template => {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('preview');
      });
    });
  });

  describe('getTemplateDefaults', () => {
    it('should return correct defaults for modern template', () => {
      const defaults = service.getTemplateDefaults('modern');

      expect(defaults.template).toBe('modern');
      expect(defaults.colorScheme).toBe('blue');
      expect(defaults.fontSize).toBe(11);
    });

    it('should return correct defaults for classic template', () => {
      const defaults = service.getTemplateDefaults('classic');

      expect(defaults.template).toBe('classic');
      expect(defaults.colorScheme).toBe('gray');
      expect(defaults.fontSize).toBe(12);
    });

    it('should return correct defaults for creative template', () => {
      const defaults = service.getTemplateDefaults('creative');

      expect(defaults.template).toBe('creative');
      expect(defaults.colorScheme).toBe('purple');
      expect(defaults.fontSize).toBe(10);
      expect(defaults.margin).toBe(15);
    });
  });

  describe('estimateGenerationTime', () => {
    it('should estimate time based on content complexity', () => {
      const simpleData = {
        ...mockResumeData,
        experience: [],
        education: [],
        projects: [],
        skills: ['JavaScript']
      };

      const complexData = {
        ...mockResumeData,
        experience: Array(5).fill(mockResumeData.experience[0]),
        education: Array(3).fill({
          id: '1',
          institution: 'University',
          degree: 'Bachelor',
          major: 'CS',
          startDate: new Date(),
          endDate: new Date()
        }),
        projects: Array(4).fill({
          id: '1',
          name: 'Project',
          description: 'Description',
          technologies: ['Tech'],
          startDate: new Date(),
          highlights: []
        }),
        skills: Array(20).fill('Skill'),
        summary: 'A'.repeat(500)
      };

      const simpleTime = service.estimateGenerationTime(simpleData);
      const complexTime = service.estimateGenerationTime(complexData);

      expect(complexTime).toBeGreaterThan(simpleTime);
      expect(complexTime).toBeLessThanOrEqual(10000); // Capped at 10 seconds
    });
  });

  describe('cancelGeneration', () => {
    it('should cancel all active generations', () => {
      // This is a basic test since we can't easily test the actual cancellation
      expect(() => service.cancelGeneration()).not.toThrow();
    });
  });

  describe('updateConfig', () => {
    it('should update service configuration', () => {
      const newConfig = {
        defaultTemplate: 'creative' as const,
        maxFileSize: 2 * 1024 * 1024
      };

      service.updateConfig(newConfig);
      const config = service.getConfig();

      expect(config.defaultTemplate).toBe('creative');
      expect(config.maxFileSize).toBe(2 * 1024 * 1024);
    });
  });

  describe('validation', () => {
    it('should require personal name', async () => {
      const invalidData = {
        ...mockResumeData,
        personalInfo: {
          ...mockResumeData.personalInfo,
          name: ''
        }
      };

      await expect(service.generateResume(invalidData))
        .rejects.toThrow('Personal name is required');
    });

    it('should require email address', async () => {
      const invalidData = {
        ...mockResumeData,
        personalInfo: {
          ...mockResumeData.personalInfo,
          email: ''
        }
      };

      await expect(service.generateResume(invalidData))
        .rejects.toThrow('Email address is required');
    });

    it('should validate email format', async () => {
      const invalidData = {
        ...mockResumeData,
        personalInfo: {
          ...mockResumeData.personalInfo,
          email: 'invalid-email'
        }
      };

      await expect(service.generateResume(invalidData))
        .rejects.toThrow('Invalid email format');
    });

    it('should require minimum content', async () => {
      const emptyData = {
        ...mockResumeData,
        experience: [],
        education: [],
        projects: [],
        skills: []
      };

      await expect(service.generateResume(emptyData))
        .rejects.toThrow('Resume must contain at least one section');
    });
  });
});