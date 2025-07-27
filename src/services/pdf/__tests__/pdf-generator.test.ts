import { PDFGenerator, PDFGenerationError } from '../pdf-generator';
import { ResumeContent } from '../../../types';

// Mock jsPDF
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    setTextColor: jest.fn(),
    setFontSize: jest.fn(),
    setFont: jest.fn(),
    text: jest.fn(),
    rect: jest.fn(),
    line: jest.fn(),
    setFillColor: jest.fn(),
    setDrawColor: jest.fn(),
    setLineWidth: jest.fn(),
    splitTextToSize: jest.fn().mockReturnValue(['line1', 'line2']),
    output: jest.fn().mockReturnValue(new Blob(['test'], { type: 'application/pdf' }))
  }));
});

describe('PDFGenerator', () => {
  let generator: PDFGenerator;
  let mockProgressCallback: jest.Mock;
  let mockResumeData: ResumeContent;

  beforeEach(() => {
    mockProgressCallback = jest.fn();
    generator = new PDFGenerator(mockProgressCallback);

    mockResumeData = {
      personalInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        location: 'New York, NY',
        linkedin: 'linkedin.com/in/johndoe',
        github: 'github.com/johndoe'
      },
      summary: 'Experienced software developer with 5+ years of experience.',
      skills: ['JavaScript', 'React', 'Node.js', 'Python'],
      experience: [
        {
          id: '1',
          company: 'Tech Corp',
          position: 'Senior Developer',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2023-01-01'),
          description: 'Led development of web applications',
          achievements: ['Improved performance by 50%', 'Led team of 5 developers'],
          technologies: ['React', 'Node.js']
        }
      ],
      education: [
        {
          id: '1',
          institution: 'University of Technology',
          degree: 'Bachelor of Science',
          major: 'Computer Science',
          startDate: new Date('2016-09-01'),
          endDate: new Date('2020-05-01'),
          gpa: 3.8
        }
      ],
      projects: [
        {
          id: '1',
          name: 'E-commerce Platform',
          description: 'Built a full-stack e-commerce platform',
          technologies: ['React', 'Node.js', 'MongoDB'],
          startDate: new Date('2022-01-01'),
          endDate: new Date('2022-06-01'),
          url: 'https://example.com',
          highlights: ['Handled 10k+ users', 'Real-time features']
        }
      ]
    };
  });

  describe('generatePDF', () => {
    it('should generate PDF with modern template', async () => {
      const options = {
        template: 'modern' as const,
        fontSize: 11,
        margin: 20,
        colorScheme: 'blue' as const,
        includePhoto: false
      };

      const result = await generator.generatePDF(mockResumeData, options);

      expect(result).toHaveProperty('blob');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('generationTime');
      expect(result.template).toBe('modern');
      expect(mockProgressCallback).toHaveBeenCalledWith({
        stage: 'initializing',
        progress: 0,
        message: 'Initializing PDF generation...'
      });
    });

    it('should generate PDF with classic template', async () => {
      const options = {
        template: 'classic' as const,
        fontSize: 12,
        margin: 25,
        colorScheme: 'gray' as const,
        includePhoto: false
      };

      const result = await generator.generatePDF(mockResumeData, options);

      expect(result.template).toBe('classic');
      expect(mockProgressCallback).toHaveBeenCalled();
    });

    it('should generate PDF with creative template', async () => {
      const options = {
        template: 'creative' as const,
        fontSize: 10,
        margin: 15,
        colorScheme: 'purple' as const,
        includePhoto: false
      };

      const result = await generator.generatePDF(mockResumeData, options);

      expect(result.template).toBe('creative');
      expect(mockProgressCallback).toHaveBeenCalled();
    });

    it('should throw error for invalid template', async () => {
      const options = {
        template: 'invalid' as any,
        fontSize: 11,
        margin: 20,
        colorScheme: 'blue' as const,
        includePhoto: false
      };

      await expect(generator.generatePDF(mockResumeData, options))
        .rejects.toThrow(PDFGenerationError);
    });

    it('should report progress during generation', async () => {
      const options = {
        template: 'modern' as const,
        fontSize: 11,
        margin: 20,
        colorScheme: 'blue' as const,
        includePhoto: false
      };

      await generator.generatePDF(mockResumeData, options);

      expect(mockProgressCallback).toHaveBeenCalledWith({
        stage: 'initializing',
        progress: 0,
        message: 'Initializing PDF generation...'
      });

      expect(mockProgressCallback).toHaveBeenCalledWith({
        stage: 'rendering',
        progress: 20,
        message: 'Rendering resume content...'
      });

      expect(mockProgressCallback).toHaveBeenCalledWith({
        stage: 'complete',
        progress: 100,
        message: 'PDF generation complete!'
      });
    });

    it('should handle minimal resume data', async () => {
      const minimalData: ResumeContent = {
        personalInfo: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+1234567890',
          location: 'Boston, MA'
        },
        summary: '',
        skills: ['JavaScript'],
        experience: [],
        education: [],
        projects: []
      };

      const options = {
        template: 'modern' as const,
        fontSize: 11,
        margin: 20,
        colorScheme: 'blue' as const,
        includePhoto: false
      };

      const result = await generator.generatePDF(minimalData, options);
      expect(result).toHaveProperty('blob');
    });

    it('should handle resume with long content', async () => {
      const longContentData: ResumeContent = {
        ...mockResumeData,
        summary: 'A'.repeat(1000), // Very long summary
        experience: Array(10).fill(null).map((_, i) => ({
          id: `exp-${i}`,
          company: `Company ${i}`,
          position: `Position ${i}`,
          startDate: new Date('2020-01-01'),
          endDate: new Date('2023-01-01'),
          description: 'B'.repeat(500), // Long description
          achievements: Array(5).fill('Achievement').map((a, j) => `${a} ${j}`),
          technologies: ['Tech1', 'Tech2', 'Tech3']
        }))
      };

      const options = {
        template: 'modern' as const,
        fontSize: 11,
        margin: 20,
        colorScheme: 'blue' as const,
        includePhoto: false
      };

      const result = await generator.generatePDF(longContentData, options);
      expect(result).toHaveProperty('blob');
    });
  });

  describe('error handling', () => {
    it('should throw PDFGenerationError on jsPDF failure', async () => {
      // Mock jsPDF to throw an error
      const jsPDF = require('jspdf');

      // Store original mock
      const originalMock = jsPDF.getMockImplementation();

      jsPDF.mockImplementation(() => {
        throw new Error('jsPDF error');
      });

      const options = {
        template: 'modern' as const,
        fontSize: 11,
        margin: 20,
        colorScheme: 'blue' as const,
        includePhoto: false
      };

      await expect(generator.generatePDF(mockResumeData, options))
        .rejects.toThrow(PDFGenerationError);

      // Restore original mock
      jsPDF.mockImplementation(originalMock);
    });

    it('should include error details in PDFGenerationError', async () => {
      const jsPDF = require('jspdf');
      const originalError = new Error('Original error');

      // Store original mock
      const originalMock = jsPDF.getMockImplementation();

      jsPDF.mockImplementation(() => {
        throw originalError;
      });

      const options = {
        template: 'modern' as const,
        fontSize: 11,
        margin: 20,
        colorScheme: 'blue' as const,
        includePhoto: false
      };

      try {
        await generator.generatePDF(mockResumeData, options);
      } catch (error) {
        expect(error).toBeInstanceOf(PDFGenerationError);
        expect((error as PDFGenerationError).code).toBe('GENERATION_FAILED');
        expect((error as PDFGenerationError).details).toBe(originalError);
      }

      // Restore original mock
      jsPDF.mockImplementation(originalMock);
    });
  });

  describe('color schemes', () => {
    it.each(['blue', 'green', 'purple', 'gray'] as const)(
      'should handle %s color scheme',
      async (colorScheme) => {
        const options = {
          template: 'modern' as const,
          fontSize: 11,
          margin: 20,
          colorScheme,
          includePhoto: false
        };

        const result = await generator.generatePDF(mockResumeData, options);
        expect(result).toHaveProperty('blob');
      }
    );
  });

  describe('font sizes and margins', () => {
    it.each([9, 10, 11, 12])('should handle font size %d', async (fontSize) => {
      const options = {
        template: 'modern' as const,
        fontSize,
        margin: 20,
        colorScheme: 'blue' as const,
        includePhoto: false
      };

      const result = await generator.generatePDF(mockResumeData, options);
      expect(result).toHaveProperty('blob');
    });

    it.each([15, 20, 25])('should handle margin %d', async (margin) => {
      const options = {
        template: 'modern' as const,
        fontSize: 11,
        margin,
        colorScheme: 'blue' as const,
        includePhoto: false
      };

      const result = await generator.generatePDF(mockResumeData, options);
      expect(result).toHaveProperty('blob');
    });
  });
});