import {
  SerializationUtils,
  serializeUser,
  deserializeUser,
  serializeUserProfile,
  deserializeUserProfile,
  serializeExperience,
  deserializeExperience,
  serializeEducation,
  deserializeEducation,
  serializeJobDescription,
  deserializeJobDescription,
  serializeAIAnalysisResult,
  deserializeAIAnalysisResult,
  exportUserData,
  importUserData,
} from '../serialization';
import {
  User,
  Experience,
  Education,
  JobDescription,
  AIAnalysisResult,
} from '@/types';

describe('SerializationUtils', () => {
  describe('serializeDate and deserializeDate', () => {
    it('should serialize and deserialize dates correctly', () => {
      const originalDate = new Date('2023-01-01T12:00:00.000Z');
      const serialized = SerializationUtils.serializeDate(originalDate);
      const deserialized = SerializationUtils.deserializeDate(serialized);

      expect(serialized).toBe('2023-01-01T12:00:00.000Z');
      expect(deserialized.getTime()).toBe(originalDate.getTime());
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const validJson = '{"name": "test", "value": 123}';
      const result = SerializationUtils.safeJsonParse(validJson, {});
      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('should return fallback for invalid JSON', () => {
      const invalidJson = '{"name": "test", "value":}';
      const fallback = { error: true };
      const result = SerializationUtils.safeJsonParse(invalidJson, fallback);
      expect(result).toEqual(fallback);
    });
  });

  describe('deepClone', () => {
    it('should create a deep copy of an object', () => {
      const original = {
        name: 'test',
        nested: { value: 123, array: [1, 2, 3] },
      };
      const cloned = SerializationUtils.deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.nested).not.toBe(original.nested);
      expect(cloned.nested.array).not.toBe(original.nested.array);
    });
  });

  describe('sanitizeObject', () => {
    it('should remove undefined and null values', () => {
      const input = {
        name: 'test',
        value: 123,
        undefined: undefined,
        null: null,
        empty: '',
        zero: 0,
      };
      const result = SerializationUtils.sanitizeObject(input);

      expect(result).toEqual({
        name: 'test',
        value: 123,
        empty: '',
        zero: 0,
      });
    });
  });
});

describe('User serialization', () => {
  const mockUser: User = {
    id: 'user-123',
    profile: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      location: 'New York',
      summary: 'Software developer',
      skills: [
        {
          name: 'JavaScript',
          level: 4,
          category: 'frontend',
          yearsOfExperience: 3,
          certifications: [],
        },
      ],
      experience: [
        {
          id: 'exp-1',
          company: 'Tech Corp',
          position: 'Software Engineer',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2023-01-01'),
          description: 'Developed web applications',
          achievements: ['Built 5 major features'],
          technologies: ['React', 'Node.js'],
        },
      ],
      education: [
        {
          id: 'edu-1',
          institution: 'University',
          degree: 'Bachelor',
          major: 'Computer Science',
          startDate: new Date('2016-09-01'),
          endDate: new Date('2020-06-01'),
          gpa: 3.5,
        },
      ],
      projects: [],
      certifications: [],
      languages: [],
      interests: [],
    },
    preferences: {
      aiEngine: 'gpt4o',
      theme: 'light',
      language: 'zh-CN',
      autoSave: true,
    },
    history: [],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
  };

  it('should serialize and deserialize user correctly', () => {
    const serialized = serializeUser(mockUser);
    const deserialized = deserializeUser(serialized);

    expect(deserialized.id).toBe(mockUser.id);
    expect(deserialized.profile.name).toBe(mockUser.profile.name);
    expect(deserialized.profile.email).toBe(mockUser.profile.email);
    expect(deserialized.createdAt.getTime()).toBe(mockUser.createdAt.getTime());
    expect(deserialized.updatedAt.getTime()).toBe(mockUser.updatedAt.getTime());
  });

  it('should handle user profile serialization', () => {
    const serialized = serializeUserProfile(mockUser.profile);
    const deserialized = deserializeUserProfile(serialized);

    expect(deserialized.name).toBe(mockUser.profile.name);
    expect(deserialized.skills).toHaveLength(1);
    expect(deserialized.experience).toHaveLength(1);
    expect(deserialized.education).toHaveLength(1);
  });
});

describe('Experience serialization', () => {
  const mockExperience: Experience = {
    id: 'exp-1',
    company: 'Tech Corp',
    position: 'Software Engineer',
    startDate: new Date('2020-01-01'),
    endDate: new Date('2023-01-01'),
    description: 'Developed web applications',
    achievements: ['Built 5 major features'],
    technologies: ['React', 'Node.js'],
  };

  it('should serialize and deserialize experience correctly', () => {
    const serialized = serializeExperience(mockExperience);
    const deserialized = deserializeExperience(serialized);

    expect(deserialized.id).toBe(mockExperience.id);
    expect(deserialized.company).toBe(mockExperience.company);
    expect(deserialized.startDate.getTime()).toBe(mockExperience.startDate.getTime());
    expect(deserialized.endDate?.getTime()).toBe(mockExperience.endDate?.getTime());
    expect(deserialized.achievements).toEqual(mockExperience.achievements);
    expect(deserialized.technologies).toEqual(mockExperience.technologies);
  });

  it('should handle experience without end date', () => {
    const experienceWithoutEndDate = { ...mockExperience, endDate: undefined };
    const serialized = serializeExperience(experienceWithoutEndDate);
    const deserialized = deserializeExperience(serialized);

    expect(deserialized.endDate).toBeUndefined();
  });
});

describe('Education serialization', () => {
  const mockEducation: Education = {
    id: 'edu-1',
    institution: 'University',
    degree: 'Bachelor',
    major: 'Computer Science',
    startDate: new Date('2016-09-01'),
    endDate: new Date('2020-06-01'),
    gpa: 3.5,
  };

  it('should serialize and deserialize education correctly', () => {
    const serialized = serializeEducation(mockEducation);
    const deserialized = deserializeEducation(serialized);

    expect(deserialized.id).toBe(mockEducation.id);
    expect(deserialized.institution).toBe(mockEducation.institution);
    expect(deserialized.startDate.getTime()).toBe(mockEducation.startDate.getTime());
    expect(deserialized.endDate?.getTime()).toBe(mockEducation.endDate?.getTime());
    expect(deserialized.gpa).toBe(mockEducation.gpa);
  });
});

describe('JobDescription serialization', () => {
  const mockJobDescription: JobDescription = {
    id: 'job-1',
    title: 'Software Engineer',
    company: 'Tech Corp',
    content: 'We are looking for a software engineer...',
    requirements: [
      {
        type: 'must-have',
        description: 'JavaScript experience',
        importance: 9,
        category: 'technical',
      },
    ],
    skills: [
      {
        name: 'JavaScript',
        importance: 9,
        category: 'frontend',
        level: 4,
      },
    ],
    analyzedAt: new Date('2023-01-01'),
    aiAnalysis: {
      keywords: [
        {
          text: 'JavaScript',
          importance: 9,
          category: 'technical',
          frequency: 5,
        },
      ],
      skills: [],
      matchScore: 85,
      suggestions: ['Focus on React experience'],
      processingTime: 1000,
      confidence: 0.9,
    },
  };

  it('should serialize and deserialize job description correctly', () => {
    const serialized = serializeJobDescription(mockJobDescription);
    const deserialized = deserializeJobDescription(serialized);

    expect(deserialized.id).toBe(mockJobDescription.id);
    expect(deserialized.title).toBe(mockJobDescription.title);
    expect(deserialized.analyzedAt.getTime()).toBe(mockJobDescription.analyzedAt.getTime());
    expect(deserialized.aiAnalysis.matchScore).toBe(mockJobDescription.aiAnalysis.matchScore);
    expect(deserialized.requirements).toHaveLength(1);
    expect(deserialized.skills).toHaveLength(1);
  });
});

describe('AIAnalysisResult serialization', () => {
  const mockAIResult: AIAnalysisResult = {
    keywords: [
      {
        text: 'JavaScript',
        importance: 9,
        category: 'technical',
        frequency: 5,
      },
    ],
    skills: [
      {
        name: 'React',
        category: 'frontend',
        importance: 8,
        matched: true,
        userLevel: 4,
        requiredLevel: 3,
      },
    ],
    matchScore: 85,
    suggestions: ['Focus on React experience'],
    processingTime: 1000,
    confidence: 0.9,
  };

  it('should serialize and deserialize AI analysis result correctly', () => {
    const serialized = serializeAIAnalysisResult(mockAIResult);
    const deserialized = deserializeAIAnalysisResult(serialized);

    expect(deserialized.keywords).toHaveLength(1);
    expect(deserialized.skills).toHaveLength(1);
    expect(deserialized.matchScore).toBe(mockAIResult.matchScore);
    expect(deserialized.confidence).toBe(mockAIResult.confidence);
    expect(deserialized.processingTime).toBe(mockAIResult.processingTime);
  });
});

describe('Export/Import utilities', () => {
  const mockUser: User = {
    id: 'user-123',
    profile: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      location: 'New York',
      summary: 'Software developer',
      skills: [],
      experience: [],
      education: [],
      projects: [],
      certifications: [],
      languages: [],
      interests: [],
    },
    preferences: {
      aiEngine: 'gpt4o',
      theme: 'light',
      language: 'zh-CN',
      autoSave: true,
    },
    history: [],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
  };

  it('should export and import user data correctly', () => {
    const exported = exportUserData(mockUser);
    const imported = importUserData(exported);

    expect(imported.user.id).toBe(mockUser.id);
    expect(imported.user.profile.name).toBe(mockUser.profile.name);
    expect(imported.version).toBe('1.0.0');
    expect(imported.exportedAt).toBeInstanceOf(Date);
  });

  it('should handle malformed import data gracefully', () => {
    const malformedData = '{"invalid": "data"}';
    const imported = importUserData(malformedData);

    // Should not throw and should return some default structure
    expect(imported.user).toBeDefined();
    expect(imported.user.id).toBe('');
    expect(imported.user.profile.name).toBe('');
    expect(imported.version).toBe('1.0.0');
  });
});