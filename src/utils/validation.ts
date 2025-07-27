import {
  User,
  UserProfile,
  UserSkill,
  Experience,
  Education,
  JobDescription,
  JobRequirement,
  AIAnalysisResult,
  ValidationError,
  SkillCategory,
} from '@/types';

// Validation utility functions
export class ValidationUtils {
  // Email validation
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Phone validation (supports multiple formats)
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{6,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  // URL validation
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Date validation
  static isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  // Skill level validation
  static isValidSkillLevel(level: number): level is 1 | 2 | 3 | 4 | 5 {
    return Number.isInteger(level) && level >= 1 && level <= 5;
  }

  // Skill category validation
  static isValidSkillCategory(category: string): category is SkillCategory {
    const validCategories: SkillCategory[] = [
      'frontend',
      'backend',
      'database',
      'devops',
      'mobile',
      'design',
      'soft-skills',
      'tools',
      'languages',
    ];
    return validCategories.includes(category as SkillCategory);
  }
}

// User profile validation
export function validateUserProfile(profile: Partial<UserProfile>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields validation
  if (!profile.name || profile.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: '姓名不能为空',
      value: profile.name,
    });
  }

  if (!profile.email || !ValidationUtils.isValidEmail(profile.email)) {
    errors.push({
      field: 'email',
      message: '请输入有效的邮箱地址',
      value: profile.email,
    });
  }

  if (!profile.phone || !ValidationUtils.isValidPhone(profile.phone)) {
    errors.push({
      field: 'phone',
      message: '请输入有效的手机号码',
      value: profile.phone,
    });
  }

  if (!profile.location || profile.location.trim().length === 0) {
    errors.push({
      field: 'location',
      message: '所在地不能为空',
      value: profile.location,
    });
  }

  // Skills validation
  if (profile.skills) {
    profile.skills.forEach((skill, index) => {
      const skillErrors = validateUserSkill(skill);
      skillErrors.forEach(error => {
        errors.push({
          ...error,
          field: `skills[${index}].${error.field}`,
        });
      });
    });
  }

  // Experience validation
  if (profile.experience) {
    profile.experience.forEach((exp, index) => {
      const expErrors = validateExperience(exp);
      expErrors.forEach(error => {
        errors.push({
          ...error,
          field: `experience[${index}].${error.field}`,
        });
      });
    });
  }

  // Education validation
  if (profile.education) {
    profile.education.forEach((edu, index) => {
      const eduErrors = validateEducation(edu);
      eduErrors.forEach(error => {
        errors.push({
          ...error,
          field: `education[${index}].${error.field}`,
        });
      });
    });
  }

  return errors;
}

// User skill validation
export function validateUserSkill(skill: Partial<UserSkill>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!skill.name || skill.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: '技能名称不能为空',
      value: skill.name,
    });
  }

  if (skill.level !== undefined && !ValidationUtils.isValidSkillLevel(skill.level)) {
    errors.push({
      field: 'level',
      message: '技能等级必须在1-5之间',
      value: skill.level,
    });
  }

  if (!skill.category || !ValidationUtils.isValidSkillCategory(skill.category)) {
    errors.push({
      field: 'category',
      message: '请选择有效的技能分类',
      value: skill.category,
    });
  }

  if (skill.yearsOfExperience !== undefined && skill.yearsOfExperience < 0) {
    errors.push({
      field: 'yearsOfExperience',
      message: '工作年限不能为负数',
      value: skill.yearsOfExperience,
    });
  }

  return errors;
}

// Experience validation
export function validateExperience(experience: Partial<Experience>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!experience.company || experience.company.trim().length === 0) {
    errors.push({
      field: 'company',
      message: '公司名称不能为空',
      value: experience.company,
    });
  }

  if (!experience.position || experience.position.trim().length === 0) {
    errors.push({
      field: 'position',
      message: '职位名称不能为空',
      value: experience.position,
    });
  }

  if (!experience.startDate || !ValidationUtils.isValidDate(experience.startDate)) {
    errors.push({
      field: 'startDate',
      message: '请输入有效的开始日期',
      value: experience.startDate,
    });
  }

  if (
    experience.endDate &&
    experience.startDate &&
    ValidationUtils.isValidDate(experience.endDate) &&
    ValidationUtils.isValidDate(experience.startDate) &&
    experience.endDate < experience.startDate
  ) {
    errors.push({
      field: 'endDate',
      message: '结束日期不能早于开始日期',
      value: experience.endDate,
    });
  }

  if (!experience.description || experience.description.trim().length === 0) {
    errors.push({
      field: 'description',
      message: '工作描述不能为空',
      value: experience.description,
    });
  }

  return errors;
}

// Education validation
export function validateEducation(education: Partial<Education>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!education.institution || education.institution.trim().length === 0) {
    errors.push({
      field: 'institution',
      message: '学校名称不能为空',
      value: education.institution,
    });
  }

  if (!education.degree || education.degree.trim().length === 0) {
    errors.push({
      field: 'degree',
      message: '学历不能为空',
      value: education.degree,
    });
  }

  if (!education.major || education.major.trim().length === 0) {
    errors.push({
      field: 'major',
      message: '专业不能为空',
      value: education.major,
    });
  }

  if (!education.startDate || !ValidationUtils.isValidDate(education.startDate)) {
    errors.push({
      field: 'startDate',
      message: '请输入有效的开始日期',
      value: education.startDate,
    });
  }

  if (
    education.endDate &&
    education.startDate &&
    ValidationUtils.isValidDate(education.endDate) &&
    ValidationUtils.isValidDate(education.startDate) &&
    education.endDate < education.startDate
  ) {
    errors.push({
      field: 'endDate',
      message: '结束日期不能早于开始日期',
      value: education.endDate,
    });
  }

  if (education.gpa !== undefined && (education.gpa < 0 || education.gpa > 4.0)) {
    errors.push({
      field: 'gpa',
      message: 'GPA必须在0-4.0之间',
      value: education.gpa,
    });
  }

  return errors;
}

// Job description validation
export function validateJobDescription(job: Partial<JobDescription>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!job.title || job.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: '职位标题不能为空',
      value: job.title,
    });
  }

  if (!job.company || job.company.trim().length === 0) {
    errors.push({
      field: 'company',
      message: '公司名称不能为空',
      value: job.company,
    });
  }

  if (!job.content || job.content.trim().length === 0) {
    errors.push({
      field: 'content',
      message: '职位描述不能为空',
      value: job.content,
    });
  }

  if (job.content && job.content.length > 10000) {
    errors.push({
      field: 'content',
      message: '职位描述不能超过10000字符',
      value: job.content,
    });
  }

  return errors;
}

// Job requirement validation
export function validateJobRequirement(requirement: Partial<JobRequirement>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!requirement.type || !['must-have', 'nice-to-have'].includes(requirement.type)) {
    errors.push({
      field: 'type',
      message: '要求类型必须是必需或可选',
      value: requirement.type,
    });
  }

  if (!requirement.description || requirement.description.trim().length === 0) {
    errors.push({
      field: 'description',
      message: '要求描述不能为空',
      value: requirement.description,
    });
  }

  if (requirement.importance !== undefined && (requirement.importance < 0 || requirement.importance > 10)) {
    errors.push({
      field: 'importance',
      message: '重要性必须在0-10之间',
      value: requirement.importance,
    });
  }

  return errors;
}

// AI analysis result validation
export function validateAIAnalysisResult(result: Partial<AIAnalysisResult>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!result.keywords || !Array.isArray(result.keywords)) {
    errors.push({
      field: 'keywords',
      message: '关键词必须是数组',
      value: result.keywords,
    });
  }

  if (!result.skills || !Array.isArray(result.skills)) {
    errors.push({
      field: 'skills',
      message: '技能必须是数组',
      value: result.skills,
    });
  }

  if (result.matchScore !== undefined && (result.matchScore < 0 || result.matchScore > 100)) {
    errors.push({
      field: 'matchScore',
      message: '匹配度必须在0-100之间',
      value: result.matchScore,
    });
  }

  if (result.confidence !== undefined && (result.confidence < 0 || result.confidence > 1)) {
    errors.push({
      field: 'confidence',
      message: '置信度必须在0-1之间',
      value: result.confidence,
    });
  }

  if (result.processingTime !== undefined && result.processingTime < 0) {
    errors.push({
      field: 'processingTime',
      message: '处理时间不能为负数',
      value: result.processingTime,
    });
  }

  return errors;
}

// Comprehensive user validation
export function validateUser(user: Partial<User>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!user.id || user.id.trim().length === 0) {
    errors.push({
      field: 'id',
      message: '用户ID不能为空',
      value: user.id,
    });
  }

  if (user.profile) {
    const profileErrors = validateUserProfile(user.profile);
    profileErrors.forEach(error => {
      errors.push({
        ...error,
        field: `profile.${error.field}`,
      });
    });
  }

  if (!user.createdAt || !ValidationUtils.isValidDate(user.createdAt)) {
    errors.push({
      field: 'createdAt',
      message: '创建时间无效',
      value: user.createdAt,
    });
  }

  if (!user.updatedAt || !ValidationUtils.isValidDate(user.updatedAt)) {
    errors.push({
      field: 'updatedAt',
      message: '更新时间无效',
      value: user.updatedAt,
    });
  }

  return errors;
}