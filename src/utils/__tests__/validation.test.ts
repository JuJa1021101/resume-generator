import {
  ValidationUtils,
  validateUserProfile,
  validateUserSkill,
  validateExperience,
  validateEducation,
  validateJobDescription,
  validateAIAnalysisResult,
} from '../validation';
import {
  UserProfile,
  UserSkill,
  Experience,
  Education,
  JobDescription,
  AIAnalysisResult,
} from '@/types';

describe('ValidationUtils', () => {
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(ValidationUtils.isValidEmail('test@example.com')).toBe(true);
      expect(ValidationUtils.isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(ValidationUtils.isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(ValidationUtils.isValidEmail('invalid-email')).toBe(false);
      expect(ValidationUtils.isValidEmail('test@')).toBe(false);
      expect(ValidationUtils.isValidEmail('@example.com')).toBe(false);
      expect(ValidationUtils.isValidEmail('')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should validate correct phone numbers', () => {
      expect(ValidationUtils.isValidPhone('1234567890')).toBe(true);
      expect(ValidationUtils.isValidPhone('+1234567890')).toBe(true);
      expect(ValidationUtils.isValidPhone('123-456-7890')).toBe(true);
      expect(ValidationUtils.isValidPhone('(123) 456-7890')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(ValidationUtils.isValidPhone('abc')).toBe(false);
      expect(ValidationUtils.isValidPhone('123')).toBe(false);
      expect(ValidationUtils.isValidPhone('')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(ValidationUtils.isValidUrl('https://example.com')).toBe(true);
      expect(ValidationUtils.isValidUrl('http://localhost:3000')).toBe(true);
      expect(ValidationUtils.isValidUrl('ftp://files.example.com')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(ValidationUtils.isValidUrl('not-a-url')).toBe(false);
      expect(ValidationUtils.isValidUrl('http://')).toBe(false);
      expect(ValidationUtils.isValidUrl('')).toBe(false);
    });
  });

  describe('isValidSkillLevel', () => {
    it('should validate skill levels 1-5', () => {
      expect(ValidationUtils.isValidSkillLevel(1)).toBe(true);
      expect(ValidationUtils.isValidSkillLevel(3)).toBe(true);
      expect(ValidationUtils.isValidSkillLevel(5)).toBe(true);
    });

    it('should reject invalid skill levels', () => {
      expect(ValidationUtils.isValidSkillLevel(0)).toBe(false);
      expect(ValidationUtils.isValidSkillLevel(6)).toBe(false);
      expect(ValidationUtils.isValidSkillLevel(1.5)).toBe(false);
    });
  });
});

describe('validateUserProfile', () => {
  const validProfile: UserProfile = {
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
  };

  it('should pass validation for valid profile', () => {
    const errors = validateUserProfile(validProfile);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation for missing required fields', () => {
    const invalidProfile: Partial<UserProfile> = {
      name: '',
      email: 'invalid-email',
      phone: 'abc',
      location: '',
    };

    const errors = validateUserProfile(invalidProfile);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.field === 'name')).toBe(true);
    expect(errors.some(e => e.field === 'email')).toBe(true);
    expect(errors.some(e => e.field === 'phone')).toBe(true);
    expect(errors.some(e => e.field === 'location')).toBe(true);
  });
});

describe('validateUserSkill', () => {
  const validSkill: UserSkill = {
    name: 'JavaScript',
    level: 4,
    category: 'frontend',
    yearsOfExperience: 3,
    certifications: [],
  };

  it('should pass validation for valid skill', () => {
    const errors = validateUserSkill(validSkill);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation for invalid skill data', () => {
    const invalidSkill: Partial<UserSkill> = {
      name: '',
      level: 6 as any,
      category: 'invalid-category' as any,
      yearsOfExperience: -1,
    };

    const errors = validateUserSkill(invalidSkill);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.field === 'name')).toBe(true);
    expect(errors.some(e => e.field === 'level')).toBe(true);
    expect(errors.some(e => e.field === 'category')).toBe(true);
    expect(errors.some(e => e.field === 'yearsOfExperience')).toBe(true);
  });
});

describe('validateExperience', () => {
  const validExperience: Experience = {
    id: '1',
    company: 'Tech Corp',
    position: 'Software Engineer',
    startDate: new Date('2020-01-01'),
    endDate: new Date('2023-01-01'),
    description: 'Developed web applications',
    achievements: [],
    technologies: [],
  };

  it('should pass validation for valid experience', () => {
    const errors = validateExperience(validExperience);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation for invalid experience data', () => {
    const invalidExperience: Partial<Experience> = {
      company: '',
      position: '',
      startDate: new Date('2023-01-01'),
      endDate: new Date('2020-01-01'), // End before start
      description: '',
    };

    const errors = validateExperience(invalidExperience);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.field === 'company')).toBe(true);
    expect(errors.some(e => e.field === 'position')).toBe(true);
    expect(errors.some(e => e.field === 'endDate')).toBe(true);
    expect(errors.some(e => e.field === 'description')).toBe(true);
  });
});

describe('validateEducation', () => {
  const validEducation: Education = {
    id: '1',
    institution: 'University',
    degree: 'Bachelor',
    major: 'Computer Science',
    startDate: new Date('2016-09-01'),
    endDate: new Date('2020-06-01'),
    gpa: 3.5,
  };

  it('should pass validation for valid education', () => {
    const errors = validateEducation(validEducation);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation for invalid education data', () => {
    const invalidEducation: Partial<Education> = {
      institution: '',
      degree: '',
      major: '',
      startDate: new Date('2020-01-01'),
      endDate: new Date('2016-01-01'), // End before start
      gpa: 5.0, // Invalid GPA
    };

    const errors = validateEducation(invalidEducation);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.field === 'institution')).toBe(true);
    expect(errors.some(e => e.field === 'degree')).toBe(true);
    expect(errors.some(e => e.field === 'major')).toBe(true);
    expect(errors.some(e => e.field === 'endDate')).toBe(true);
    expect(errors.some(e => e.field === 'gpa')).toBe(true);
  });
});

describe('validateJobDescription', () => {
  const validJob: JobDescription = {
    id: '1',
    title: 'Software Engineer',
    company: 'Tech Corp',
    content: 'We are looking for a software engineer...',
    requirements: [],
    skills: [],
    analyzedAt: new Date(),
    aiAnalysis: {
      keywords: [],
      skills: [],
      matchScore: 85,
      suggestions: [],
      processingTime: 1000,
      confidence: 0.9,
    },
  };

  it('should pass validation for valid job description', () => {
    const errors = validateJobDescription(validJob);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation for invalid job description', () => {
    const invalidJob: Partial<JobDescription> = {
      title: '',
      company: '',
      content: '',
    };

    const errors = validateJobDescription(invalidJob);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.field === 'title')).toBe(true);
    expect(errors.some(e => e.field === 'company')).toBe(true);
    expect(errors.some(e => e.field === 'content')).toBe(true);
  });

  it('should fail validation for content too long', () => {
    const longContent = 'a'.repeat(10001);
    const invalidJob: Partial<JobDescription> = {
      title: 'Valid Title',
      company: 'Valid Company',
      content: longContent,
    };

    const errors = validateJobDescription(invalidJob);
    expect(errors.some(e => e.field === 'content' && e.message.includes('10000字符'))).toBe(true);
  });
});

describe('validateAIAnalysisResult', () => {
  const validResult: AIAnalysisResult = {
    keywords: [],
    skills: [],
    matchScore: 85,
    suggestions: [],
    processingTime: 1000,
    confidence: 0.9,
  };

  it('should pass validation for valid AI analysis result', () => {
    const errors = validateAIAnalysisResult(validResult);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation for invalid AI analysis result', () => {
    const invalidResult: Partial<AIAnalysisResult> = {
      keywords: 'not-an-array' as any,
      skills: 'not-an-array' as any,
      matchScore: 150, // Out of range
      confidence: 2, // Out of range
      processingTime: -100, // Negative
    };

    const errors = validateAIAnalysisResult(invalidResult);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.field === 'keywords')).toBe(true);
    expect(errors.some(e => e.field === 'skills')).toBe(true);
    expect(errors.some(e => e.field === 'matchScore')).toBe(true);
    expect(errors.some(e => e.field === 'confidence')).toBe(true);
    expect(errors.some(e => e.field === 'processingTime')).toBe(true);
  });
});