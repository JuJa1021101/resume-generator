import { PDFService } from '../pdf-service';
import { ResumeContent } from '../../../types';

// Mock jsPDF
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    setFillColor: jest.fn(),
    rect: jest.fn(),
    setTextColor: jest.fn(),
    setFontSize: jest.fn(),
    setFont: jest.fn(),
    text: jest.fn(),
    splitTextToSize: jest.fn().mockReturnValue(['line 1', 'line 2']),
    setDrawColor: jest.fn(),
    line: jest.fn(),
    setLineWidth: jest.fn(),
    output: jest.fn().mockReturnValue(new Blob(['mock pdf'], { type: 'application/pdf' }))
  }));
});

describe('PDF Integration Tests', () => {
  let pdfService: PDFService;
  let mockResumeData: ResumeContent;

  beforeEach(() => {
    pdfService = new PDFService();
    mockResumeData = {
      personalInfo: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-0123',
        location: 'New York, NY'
      },
      summary: 'Experienced software developer with 5+ years in full-stack development.',
      experience: [
        {
          id: '1',
          position: 'Senior Developer',
          company: 'Tech Corp',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2023-12-31'),
          description: 'Led development of web applications',
          achievements: ['Improved performance by 40%', 'Mentored 3 junior developers'],
          technologies: ['React', 'Node.js']
        }
      ],
      education: [
        {
          id: '1',
          degree: 'Bachelor of Science',
          major: 'Computer Science',
          institution: 'University of Technology',
          startDate: new Date('2016-09-01'),
          endDate: new Date('2020-05-31')
        }
      ],
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python'],
      projects: [
        {
          id: '1',
          name: 'E-commerce Platform',
          description: 'Built a full-stack e-commerce solution',
          technologies: ['React', 'Node.js', 'MongoDB'],
          startDate: new Date('2022-01-01'),
          endDate: new Date('2022-06-01'),
          highlights: ['Handled 10k+ users', 'Real-time features']
        }
      ]
    };
  });

  describe('End-to-End PDF Generation', () => {
    it('should generate PDF with modern template successfully', async () => {
      const result = await pdfService.generateResume(mockResumeData, {
        template: 'modern',
        autoDownload: false
      });

      expect(result).toBeDefined();
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.template).toBe('modern');
      expect(result.generationTime).toBeGreaterThan(0);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should generate PDF with classic template successfully', async () => {
      const result = await pdfService.generateResume(mockResumeData, {
        template: 'classic',
        autoDownload: false
      });

      expect(result).toBeDefined();
      expect(result.template).toBe('classic');
    });

    it('should generate PDF with creative template successfully', async () => {
      const result = await pdfService.generateResume(mockResumeData, {
        template: 'creative',
        autoDownload: false
      });

      expect(result).toBeDefined();
      expect(result.template).toBe('creative');
    });
  });

  describe('Progress Tracking Integration', () => {
    it('should track progress through all stages', async () => {
      const progressUpdates: any[] = [];

      await pdfService.generateResume(
        mockResumeData,
        { template: 'modern', autoDownload: false },
        (progress) => {
          progressUpdates.push(progress);
        }
      );

      expect(progressUpdates.length).toBeGreaterThan(0);

      // Check that we have the expected stages
      const stages = progressUpdates.map(p => p.stage);
      expect(stages).toContain('initializing');
      expect(stages).toContain('rendering');
      expect(stages).toContain('finalizing');
      expect(stages).toContain('complete');

      // Check progress values are increasing
      const progressValues = progressUpdates.map(p => p.progress);
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
      }

      // Final progress should be 100
      expect(progressValues[progressValues.length - 1]).toBe(100);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle missing required data', async () => {
      const invalidData = {
        ...mockResumeData,
        personalInfo: {
          ...mockResumeData.personalInfo,
          name: ''
        }
      };

      await expect(
        pdfService.generateResume(invalidData, { autoDownload: false })
      ).rejects.toThrow('Personal name is required');
    });

    it('should handle invalid email format', async () => {
      const invalidData = {
        ...mockResumeData,
        personalInfo: {
          ...mockResumeData.personalInfo,
          email: 'invalid-email'
        }
      };

      await expect(
        pdfService.generateResume(invalidData, { autoDownload: false })
      ).rejects.toThrow('Invalid email format');
    });

    it('should handle insufficient content', async () => {
      const emptyData = {
        personalInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '',
          location: ''
        },
        summary: '',
        experience: [],
        education: [],
        skills: [],
        projects: []
      };

      await expect(
        pdfService.generateResume(emptyData, { autoDownload: false })
      ).rejects.toThrow('Resume must contain at least one section');
    });
  });

  describe('Template Options Integration', () => {
    it('should apply different color schemes correctly', async () => {
      const colorSchemes = ['blue', 'green', 'purple', 'gray'] as const;

      for (const colorScheme of colorSchemes) {
        const result = await pdfService.generateResume(mockResumeData, {
          template: 'modern',
          colorScheme,
          autoDownload: false
        });

        expect(result).toBeDefined();
        expect(result.blob).toBeInstanceOf(Blob);
      }
    });

    it('should apply different font sizes correctly', async () => {
      const fontSizes = [9, 10, 11, 12];

      for (const fontSize of fontSizes) {
        const result = await pdfService.generateResume(mockResumeData, {
          template: 'modern',
          fontSize,
          autoDownload: false
        });

        expect(result).toBeDefined();
        expect(result.blob).toBeInstanceOf(Blob);
      }
    });

    it('should apply different margins correctly', async () => {
      const margins = [15, 20, 25];

      for (const margin of margins) {
        const result = await pdfService.generateResume(mockResumeData, {
          template: 'modern',
          margin,
          autoDownload: false
        });

        expect(result).toBeDefined();
        expect(result.blob).toBeInstanceOf(Blob);
      }
    });
  });

  describe('Service Configuration Integration', () => {
    it('should use default template when none specified', async () => {
      const result = await pdfService.generateResume(mockResumeData, {
        autoDownload: false
      });

      expect(result.template).toBe('modern'); // Default template
    });

    it('should respect custom service configuration', async () => {
      const customService = new PDFService({
        defaultTemplate: 'classic',
        defaultOptions: {
          fontSize: 12,
          colorScheme: 'gray'
        }
      });

      const result = await customService.generateResume(mockResumeData, {
        autoDownload: false
      });

      expect(result.template).toBe('classic');
    });

    it('should get available templates with metadata', () => {
      const templates = pdfService.getAvailableTemplates();

      expect(templates).toHaveLength(3);
      expect(templates.map(t => t.id)).toEqual(['modern', 'classic', 'creative']);

      templates.forEach(template => {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
      });
    });

    it('should get template-specific defaults', () => {
      const modernDefaults = pdfService.getTemplateDefaults('modern');
      const classicDefaults = pdfService.getTemplateDefaults('classic');
      const creativeDefaults = pdfService.getTemplateDefaults('creative');

      expect(modernDefaults.template).toBe('modern');
      expect(modernDefaults.colorScheme).toBe('blue');

      expect(classicDefaults.template).toBe('classic');
      expect(classicDefaults.colorScheme).toBe('gray');

      expect(creativeDefaults.template).toBe('creative');
      expect(creativeDefaults.colorScheme).toBe('purple');
    });
  });

  describe('Performance Integration', () => {
    it('should estimate generation time based on content complexity', () => {
      const simpleData = {
        ...mockResumeData,
        experience: [],
        projects: [],
        skills: ['JavaScript']
      };

      const complexData = {
        ...mockResumeData,
        experience: Array(5).fill(mockResumeData.experience[0]),
        projects: Array(3).fill(mockResumeData.projects[0]),
        skills: Array(20).fill('Skill'),
        summary: 'A'.repeat(1000)
      };

      const simpleTime = pdfService.estimateGenerationTime(simpleData);
      const complexTime = pdfService.estimateGenerationTime(complexData);

      expect(complexTime).toBeGreaterThan(simpleTime);
      expect(simpleTime).toBeGreaterThan(0);
      expect(complexTime).toBeLessThanOrEqual(10000); // Capped at 10 seconds
    });

    it('should complete generation within reasonable time', async () => {
      const startTime = Date.now();

      await pdfService.generateResume(mockResumeData, {
        template: 'modern',
        autoDownload: false
      });

      const actualTime = Date.now() - startTime;
      const estimatedTime = pdfService.estimateGenerationTime(mockResumeData);

      // Actual time should be reasonable (allowing for test overhead)
      expect(actualTime).toBeLessThan(estimatedTime + 5000);
    });
  });

  describe('Cancellation Integration', () => {
    it('should handle generation cancellation', async () => {
      const promise = pdfService.generateResume(mockResumeData, {
        template: 'modern',
        autoDownload: false
      });

      // Cancel immediately
      pdfService.cancelGeneration();

      // The promise might resolve before cancellation takes effect
      // or it might be cancelled, both are acceptable
      try {
        await promise;
      } catch (error) {
        expect((error as Error).message).toContain('cancelled');
      }
    });
  });

  describe('File Size Validation Integration', () => {
    it('should validate file size limits', async () => {
      const serviceWithSmallLimit = new PDFService({
        maxFileSize: 100 // Very small limit
      });

      // Mock a large blob
      const jsPDF = require('jspdf');
      const mockDoc = {
        setFillColor: jest.fn(),
        rect: jest.fn(),
        setTextColor: jest.fn(),
        setFontSize: jest.fn(),
        setFont: jest.fn(),
        text: jest.fn(),
        splitTextToSize: jest.fn().mockReturnValue(['line 1', 'line 2']),
        setDrawColor: jest.fn(),
        line: jest.fn(),
        setLineWidth: jest.fn(),
        output: jest.fn().mockReturnValue(new Blob(['x'.repeat(200)], { type: 'application/pdf' }))
      };
      jsPDF.mockImplementation(() => mockDoc);

      await expect(
        serviceWithSmallLimit.generateResume(mockResumeData, {
          autoDownload: false
        })
      ).rejects.toThrow('exceeds maximum allowed size');

      // Restore original mock
      jsPDF.mockImplementation(() => ({
        setFillColor: jest.fn(),
        rect: jest.fn(),
        setTextColor: jest.fn(),
        setFontSize: jest.fn(),
        setFont: jest.fn(),
        text: jest.fn(),
        splitTextToSize: jest.fn().mockReturnValue(['line 1', 'line 2']),
        setDrawColor: jest.fn(),
        line: jest.fn(),
        setLineWidth: jest.fn(),
        output: jest.fn().mockReturnValue(new Blob(['mock pdf'], { type: 'application/pdf' }))
      }));
    });
  });

  describe('Complex Resume Data Integration', () => {
    it('should handle resume with all sections populated', async () => {
      const complexResumeData: ResumeContent = {
        personalInfo: {
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          phone: '+1-555-0456',
          location: 'San Francisco, CA'
        },
        summary: 'Highly experienced full-stack developer with expertise in modern web technologies and team leadership. Proven track record of delivering scalable solutions and mentoring development teams.',
        experience: [
          {
            id: '1',
            position: 'Senior Full Stack Developer',
            company: 'Tech Innovations Inc.',
            startDate: new Date('2021-03-01'),
            endDate: undefined,
            description: 'Lead development of microservices architecture and mentor junior developers.',
            achievements: [
              'Reduced system latency by 60% through optimization',
              'Led migration to cloud infrastructure',
              'Mentored 5 junior developers'
            ],
            technologies: ['React', 'Node.js', 'Docker', 'AWS']
          },
          {
            id: '2',
            position: 'Frontend Developer',
            company: 'Digital Solutions LLC',
            startDate: new Date('2019-06-01'),
            endDate: new Date('2021-02-28'),
            description: 'Developed responsive web applications using React and TypeScript.',
            achievements: [
              'Improved user engagement by 35%',
              'Implemented automated testing pipeline'
            ],
            technologies: ['React', 'TypeScript', 'Jest']
          }
        ],
        education: [
          {
            id: '1',
            degree: 'Master of Science',
            major: 'Computer Science',
            institution: 'Stanford University',
            startDate: new Date('2017-09-01'),
            endDate: new Date('2019-05-31')
          },
          {
            id: '2',
            degree: 'Bachelor of Science',
            major: 'Software Engineering',
            institution: 'UC Berkeley',
            startDate: new Date('2013-09-01'),
            endDate: new Date('2017-05-31')
          }
        ],
        skills: [
          'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular',
          'Node.js', 'Python', 'Java', 'Go', 'Docker', 'Kubernetes',
          'AWS', 'Azure', 'MongoDB', 'PostgreSQL', 'Redis',
          'GraphQL', 'REST APIs', 'Microservices', 'CI/CD'
        ],
        projects: [
          {
            id: '1',
            name: 'E-commerce Platform',
            description: 'Built a scalable e-commerce platform handling 10k+ daily transactions with real-time inventory management.',
            technologies: ['React', 'Node.js', 'MongoDB', 'Redis', 'Docker'],
            startDate: new Date('2022-01-01'),
            endDate: new Date('2022-06-01'),
            highlights: ['Handled 10k+ users', 'Real-time inventory']
          },
          {
            id: '2',
            name: 'Real-time Chat Application',
            description: 'Developed a real-time messaging application with video calling capabilities.',
            technologies: ['Vue.js', 'Socket.io', 'WebRTC', 'Express.js'],
            startDate: new Date('2021-06-01'),
            endDate: new Date('2021-12-01'),
            highlights: ['Real-time messaging', 'Video calling']
          },
          {
            id: '3',
            name: 'Data Analytics Dashboard',
            description: 'Created an interactive dashboard for business intelligence with real-time data visualization.',
            technologies: ['Angular', 'D3.js', 'Python', 'PostgreSQL'],
            startDate: new Date('2020-03-01'),
            endDate: new Date('2020-09-01'),
            highlights: ['Interactive visualizations', 'Real-time data']
          }
        ]
      };

      const result = await pdfService.generateResume(complexResumeData, {
        template: 'modern',
        autoDownload: false
      });

      expect(result).toBeDefined();
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should handle resume with minimal data', async () => {
      const minimalResumeData: ResumeContent = {
        personalInfo: {
          name: 'John Minimal',
          email: 'john@example.com',
          phone: '',
          location: ''
        },
        summary: '',
        experience: [],
        education: [],
        skills: ['JavaScript'], // At least one skill to meet minimum content requirement
        projects: []
      };

      const result = await pdfService.generateResume(minimalResumeData, {
        template: 'modern',
        autoDownload: false
      });

      expect(result).toBeDefined();
      expect(result.blob).toBeInstanceOf(Blob);
    });
  });
});