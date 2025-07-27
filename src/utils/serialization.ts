import {
  User,
  UserProfile,
  UserSkill,
  Experience,
  Education,
  JobDescription,
  AIAnalysisResult,
  AnalysisResult,
  Project,
  Certification,
} from '@/types';

// Serialization utilities for data persistence and API communication
export class SerializationUtils {
  // Date serialization helpers
  static serializeDate(date: Date): string {
    return date.toISOString();
  }

  static deserializeDate(dateString: string): Date {
    return new Date(dateString);
  }

  // Safe JSON parsing with error handling
  static safeJsonParse<T>(jsonString: string, fallback: T): T {
    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      console.warn('JSON parsing failed:', error);
      return fallback;
    }
  }

  // Deep clone utility
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  // Remove undefined and null values
  static sanitizeObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const sanitized: Partial<T> = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        sanitized[key as keyof T] = value as T[keyof T];
      }
    });
    return sanitized;
  }
}

// User serialization
export function serializeUser(user: User): string {
  const serializable = {
    ...user,
    createdAt: SerializationUtils.serializeDate(user.createdAt),
    updatedAt: SerializationUtils.serializeDate(user.updatedAt),
    profile: serializeUserProfile(user.profile),
    history: user.history.map(h => ({
      ...h,
      createdAt: SerializationUtils.serializeDate(h.createdAt),
      result: serializeAnalysisResult(h.result),
    })),
  };
  return JSON.stringify(serializable);
}

export function deserializeUser(data: string): User {
  const parsed = SerializationUtils.safeJsonParse(data, {} as any);
  return {
    id: parsed.id || '',
    profile: deserializeUserProfile(parsed.profile),
    preferences: parsed.preferences || {
      aiEngine: 'gpt4o',
      theme: 'light',
      language: 'zh-CN',
      autoSave: true,
    },
    history: parsed.history?.map((h: any) => ({
      ...h,
      createdAt: SerializationUtils.deserializeDate(h.createdAt),
      result: deserializeAnalysisResult(h.result),
    })) || [],
    createdAt: parsed.createdAt ? SerializationUtils.deserializeDate(parsed.createdAt) : new Date(),
    updatedAt: parsed.updatedAt ? SerializationUtils.deserializeDate(parsed.updatedAt) : new Date(),
  };
}

// User profile serialization
export function serializeUserProfile(profile: UserProfile): Record<string, unknown> {
  return {
    ...profile,
    experience: profile.experience.map(serializeExperience),
    education: profile.education.map(serializeEducation),
    projects: profile.projects?.map(serializeProject) || [],
    certifications: profile.certifications?.map(serializeCertification) || [],
  };
}

export function deserializeUserProfile(data: any): UserProfile {
  if (!data) {
    return {
      name: '',
      email: '',
      phone: '',
      location: '',
      summary: '',
      skills: [],
      experience: [],
      education: [],
      projects: [],
      certifications: [],
      languages: [],
      interests: [],
    };
  }

  return {
    ...data,
    experience: data.experience?.map(deserializeExperience) || [],
    education: data.education?.map(deserializeEducation) || [],
    projects: data.projects?.map(deserializeProject) || [],
    certifications: data.certifications?.map(deserializeCertification) || [],
    languages: data.languages || [],
    interests: data.interests || [],
  };
}

// Experience serialization
export function serializeExperience(experience: Experience): Record<string, unknown> {
  return {
    ...experience,
    startDate: SerializationUtils.serializeDate(experience.startDate),
    endDate: experience.endDate ? SerializationUtils.serializeDate(experience.endDate) : undefined,
  };
}

export function deserializeExperience(data: any): Experience {
  return {
    ...data,
    startDate: SerializationUtils.deserializeDate(data.startDate),
    endDate: data.endDate ? SerializationUtils.deserializeDate(data.endDate) : undefined,
    achievements: data.achievements || [],
    technologies: data.technologies || [],
  };
}

// Education serialization
export function serializeEducation(education: Education): Record<string, unknown> {
  return {
    ...education,
    startDate: SerializationUtils.serializeDate(education.startDate),
    endDate: education.endDate ? SerializationUtils.serializeDate(education.endDate) : undefined,
  };
}

export function deserializeEducation(data: any): Education {
  return {
    ...data,
    startDate: SerializationUtils.deserializeDate(data.startDate),
    endDate: data.endDate ? SerializationUtils.deserializeDate(data.endDate) : undefined,
  };
}

// Project serialization
export function serializeProject(project: Project): Record<string, unknown> {
  return {
    ...project,
    startDate: SerializationUtils.serializeDate(project.startDate),
    endDate: project.endDate ? SerializationUtils.serializeDate(project.endDate) : undefined,
  };
}

export function deserializeProject(data: any): Project {
  return {
    ...data,
    startDate: SerializationUtils.deserializeDate(data.startDate),
    endDate: data.endDate ? SerializationUtils.deserializeDate(data.endDate) : undefined,
    technologies: data.technologies || [],
    highlights: data.highlights || [],
  };
}

// Certification serialization
export function serializeCertification(certification: Certification): Record<string, unknown> {
  return {
    ...certification,
    issueDate: SerializationUtils.serializeDate(certification.issueDate),
    expiryDate: certification.expiryDate ? SerializationUtils.serializeDate(certification.expiryDate) : undefined,
  };
}

export function deserializeCertification(data: any): Certification {
  return {
    ...data,
    issueDate: SerializationUtils.deserializeDate(data.issueDate),
    expiryDate: data.expiryDate ? SerializationUtils.deserializeDate(data.expiryDate) : undefined,
  };
}

// Job description serialization
export function serializeJobDescription(job: JobDescription): string {
  const serializable = {
    ...job,
    analyzedAt: SerializationUtils.serializeDate(job.analyzedAt),
    aiAnalysis: serializeAIAnalysisResult(job.aiAnalysis),
  };
  return JSON.stringify(serializable);
}

export function deserializeJobDescription(data: string): JobDescription {
  const parsed = SerializationUtils.safeJsonParse(data, {} as any);
  return {
    ...parsed,
    analyzedAt: SerializationUtils.deserializeDate(parsed.analyzedAt),
    aiAnalysis: deserializeAIAnalysisResult(parsed.aiAnalysis),
    requirements: parsed.requirements || [],
    skills: parsed.skills || [],
  };
}

// AI analysis result serialization
export function serializeAIAnalysisResult(result: AIAnalysisResult): Record<string, unknown> {
  return SerializationUtils.sanitizeObject({
    keywords: result.keywords,
    skills: result.skills,
    matchScore: result.matchScore,
    suggestions: result.suggestions,
    processingTime: result.processingTime,
    confidence: result.confidence,
  });
}

export function deserializeAIAnalysisResult(data: any): AIAnalysisResult {
  return {
    keywords: data.keywords || [],
    skills: data.skills || [],
    matchScore: data.matchScore || 0,
    suggestions: data.suggestions || [],
    processingTime: data.processingTime || 0,
    confidence: data.confidence || 0,
  };
}

// Analysis result serialization
export function serializeAnalysisResult(result: AnalysisResult): Record<string, unknown> {
  return {
    ...result,
    createdAt: SerializationUtils.serializeDate(result.createdAt),
    detailedScores: result.detailedScores,
    recommendations: result.recommendations,
    generatedResume: result.generatedResume ? {
      ...result.generatedResume,
      generatedAt: SerializationUtils.serializeDate(result.generatedResume.generatedAt),
    } : undefined,
    performanceMetrics: result.performanceMetrics,
  };
}

export function deserializeAnalysisResult(data: any): AnalysisResult {
  return {
    ...data,
    createdAt: SerializationUtils.deserializeDate(data.createdAt),
    detailedScores: data.detailedScores || [],
    recommendations: data.recommendations || [],
    generatedResume: data.generatedResume ? {
      ...data.generatedResume,
      generatedAt: SerializationUtils.deserializeDate(data.generatedResume.generatedAt),
    } : undefined,
    performanceMetrics: data.performanceMetrics || {
      loadTime: 0,
      aiProcessingTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
    },
  };
}

// Batch serialization utilities
export function serializeUserSkills(skills: UserSkill[]): string {
  return JSON.stringify(skills.map(skill => SerializationUtils.sanitizeObject(skill as unknown as Record<string, unknown>)));
}

export function deserializeUserSkills(data: string): UserSkill[] {
  const parsed = SerializationUtils.safeJsonParse(data, []);
  return Array.isArray(parsed) ? parsed : [];
}

// Export/Import utilities for data backup
export function exportUserData(user: User): string {
  const exportData = {
    version: '1.0.0',
    exportedAt: SerializationUtils.serializeDate(new Date()),
    user: serializeUser(user),
  };
  return JSON.stringify(exportData, null, 2);
}

export function importUserData(data: string): { user: User; version: string; exportedAt: Date } {
  const parsed = SerializationUtils.safeJsonParse(data, {} as any);
  return {
    user: deserializeUser(parsed.user),
    version: parsed.version || '1.0.0',
    exportedAt: SerializationUtils.deserializeDate(parsed.exportedAt),
  };
}

// Data migration utilities
export function migrateUserData(data: any, fromVersion: string, toVersion: string): any {
  // Placeholder for future data migration logic
  console.log(`Migrating user data from ${fromVersion} to ${toVersion}`);

  // For now, return data as-is
  // In the future, implement version-specific migration logic
  return data;
}

// Data validation before serialization
export function validateBeforeSerialization<T>(data: T, validator: (data: T) => boolean): T {
  if (!validator(data)) {
    throw new Error('Data validation failed before serialization');
  }
  return data;
}

// Compression utilities for large data sets
export function compressData(data: string): string {
  // Placeholder for compression logic
  // Could implement LZ-string or similar compression
  return data;
}

export function decompressData(compressedData: string): string {
  // Placeholder for decompression logic
  return compressedData;
}