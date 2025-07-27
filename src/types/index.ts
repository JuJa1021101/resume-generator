// Core data types
export interface User {
  id: string;
  profile: UserProfile;
  preferences: UserPreferences;
  history: AnalysisHistory[];
  createdAt: Date;
  updatedAt: Date;
}

// User profile with comprehensive information
export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: UserSkill[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  certifications: Certification[];
  languages: Language[];
  interests: string[];
}

// Additional interfaces for comprehensive user profile
export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
  url?: string;
}

export interface Language {
  name: string;
  proficiency: 'native' | 'fluent' | 'conversational' | 'basic';
  certifications?: string[];
}

export interface UserSkill {
  name: string;
  level: 1 | 2 | 3 | 4 | 5;
  category: SkillCategory;
  yearsOfExperience: number;
  certifications: string[];
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: Date;
  endDate?: Date;
  description: string;
  achievements: string[];
  technologies: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  major: string;
  startDate: Date;
  endDate?: Date;
  gpa?: number;
}

export interface UserPreferences {
  aiEngine: 'gpt4o' | 'transformers';
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
  autoSave: boolean;
}

export interface AnalysisHistory {
  id: string;
  jobId: string;
  result: AnalysisResult;
  createdAt: Date;
}

// Job and analysis types
export interface JobDescription {
  id: string;
  title: string;
  company: string;
  content: string;
  requirements: JobRequirement[];
  skills: RequiredSkill[];
  analyzedAt: Date;
  aiAnalysis: AIAnalysisResult;
}

export interface JobRequirement {
  type: 'must-have' | 'nice-to-have';
  description: string;
  importance: number;
  category: string;
}

export interface RequiredSkill {
  name: string;
  importance: number;
  category: SkillCategory;
  level?: number;
}

export interface AIAnalysisResult {
  keywords: Keyword[];
  skills: Skill[];
  matchScore: number;
  suggestions: string[];
  processingTime: number;
  confidence: number;
}

export interface Keyword {
  text: string;
  importance: number;
  category: 'technical' | 'soft' | 'domain';
  frequency: number;
}

export interface Skill {
  name: string;
  category: SkillCategory;
  importance: number;
  matched: boolean;
  userLevel?: number;
  requiredLevel: number;
}

export interface MatchResult {
  overallScore: number;
  categoryScores: CategoryScore[];
  gaps: SkillGap[];
  strengths: string[];
  recommendations: string[];
}

export interface CategoryScore {
  category: SkillCategory;
  score: number;
  maxScore: number;
  skillCount: number;
  matchedSkills: number;
}

export interface SkillGap {
  skill: string;
  category: SkillCategory;
  requiredLevel: number;
  currentLevel: number;
  importance: number;
  priority: 'high' | 'medium' | 'low';
}

export interface AnalysisResult {
  id: string;
  userId: string;
  jobId: string;
  matchScore: number;
  detailedScores: DetailedScore[];
  recommendations: Recommendation[];
  generatedResume: GeneratedResume;
  performanceMetrics: PerformanceMetrics;
  createdAt: Date;
}

export interface DetailedScore {
  category: string;
  score: number;
  maxScore: number;
  breakdown: ScoreBreakdown[];
}

export interface ScoreBreakdown {
  skill: string;
  userScore: number;
  requiredScore: number;
  weight: number;
}

export interface Recommendation {
  type: 'skill-gap' | 'strength' | 'improvement';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

export interface GeneratedResume {
  id: string;
  template: 'modern' | 'classic' | 'creative';
  content: ResumeContent;
  optimizedFor: string; // Job title
  generatedAt: Date;
}

export interface ResumeContent {
  personalInfo: PersonalInfo;
  summary: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
}

export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  startDate: Date;
  endDate?: Date;
  url?: string;
  highlights: string[];
}

// Enums and utility types
export type SkillCategory =
  | 'frontend'
  | 'backend'
  | 'database'
  | 'devops'
  | 'mobile'
  | 'design'
  | 'soft-skills'
  | 'tools'
  | 'languages';

export interface PerformanceMetrics {
  loadTime: number;
  aiProcessingTime: number;
  renderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
}

// Extended performance metrics for monitoring system
export interface ExtendedPerformanceMetrics extends PerformanceMetrics {
  // Web Vitals
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte

  // Custom metrics
  modelLoadTime?: number;
  analysisTime?: number;
  componentRenderTime?: number;
  chartRenderTime?: number;
  pdfGenerationTime?: number;
  dbQueryTime?: number;
  workerResponseTime?: number;
  heapUsed?: number;
  heapTotal?: number;
  jsHeapSizeLimit?: number;
}

// API and Worker types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface WorkerMessage {
  type: string;
  payload: unknown;
  id: string;
}

export interface WorkerResponse {
  type: string;
  payload: unknown;
  id: string;
  error?: string;
}

// Chart and visualization types
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

export interface RadarChartData extends ChartData {
  type: 'radar';
}

export interface BarChartData extends ChartData {
  type: 'bar';
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}
