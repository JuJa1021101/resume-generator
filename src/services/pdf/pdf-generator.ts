import jsPDF from 'jspdf';
import { UserProfile, GeneratedResume, ResumeContent } from '../../types';

export type ResumeTemplate = 'modern' | 'classic' | 'creative';

export interface PDFGenerationOptions {
  template: ResumeTemplate;
  fontSize: number;
  margin: number;
  colorScheme: 'blue' | 'green' | 'purple' | 'gray';
  includePhoto: boolean;
}

export interface PDFGenerationProgress {
  stage: 'initializing' | 'rendering' | 'formatting' | 'finalizing' | 'complete';
  progress: number; // 0-100
  message: string;
}

export interface PDFGenerationResult {
  blob: Blob;
  size: number;
  generationTime: number;
  template: ResumeTemplate;
}

export class PDFGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'PDFGenerationError';
  }
}

export class PDFGenerator {
  private progressCallback?: (progress: PDFGenerationProgress) => void;
  private colorSchemes = {
    blue: { primary: '#2563eb', secondary: '#64748b', accent: '#f1f5f9' },
    green: { primary: '#059669', secondary: '#64748b', accent: '#f0fdf4' },
    purple: { primary: '#7c3aed', secondary: '#64748b', accent: '#faf5ff' },
    gray: { primary: '#374151', secondary: '#6b7280', accent: '#f9fafb' }
  };

  constructor(progressCallback?: (progress: PDFGenerationProgress) => void) {
    this.progressCallback = progressCallback;
  }

  async generatePDF(
    resumeData: ResumeContent,
    options: PDFGenerationOptions
  ): Promise<PDFGenerationResult> {
    const startTime = Date.now();

    try {
      this.reportProgress('initializing', 0, 'Initializing PDF generation...');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      this.reportProgress('rendering', 20, 'Rendering resume content...');

      switch (options.template) {
        case 'modern':
          await this.renderModernTemplate(doc, resumeData, options);
          break;
        case 'classic':
          await this.renderClassicTemplate(doc, resumeData, options);
          break;
        case 'creative':
          await this.renderCreativeTemplate(doc, resumeData, options);
          break;
        default:
          throw new PDFGenerationError(
            `Unknown template: ${options.template}`,
            'INVALID_TEMPLATE'
          );
      }

      this.reportProgress('finalizing', 90, 'Finalizing PDF...');

      const blob = doc.output('blob');
      const generationTime = Date.now() - startTime;

      this.reportProgress('complete', 100, 'PDF generation complete!');

      return {
        blob,
        size: blob.size,
        generationTime,
        template: options.template
      };

    } catch (error) {
      throw new PDFGenerationError(
        `PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_FAILED',
        error
      );
    }
  }

  private reportProgress(stage: PDFGenerationProgress['stage'], progress: number, message: string) {
    if (this.progressCallback) {
      this.progressCallback({ stage, progress, message });
    }
  }

  private async renderModernTemplate(
    doc: jsPDF,
    resumeData: ResumeContent,
    options: PDFGenerationOptions
  ): Promise<void> {
    const colors = this.colorSchemes[options.colorScheme];
    const margin = options.margin;
    let yPosition = margin;

    // Header with accent background
    doc.setFillColor(colors.accent);
    doc.rect(0, 0, 210, 40, 'F');

    // Name
    doc.setTextColor(colors.primary);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(resumeData.personalInfo.name, margin, yPosition + 15);

    // Contact info
    doc.setTextColor(colors.secondary);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const contactInfo = [
      resumeData.personalInfo.email,
      resumeData.personalInfo.phone,
      resumeData.personalInfo.location
    ].filter(Boolean).join(' | ');
    doc.text(contactInfo, margin, yPosition + 25);

    yPosition = 50;
    this.reportProgress('rendering', 40, 'Rendering personal information...');

    // Summary section
    if (resumeData.summary) {
      yPosition = this.addSection(doc, 'PROFESSIONAL SUMMARY', yPosition, colors, options);
      yPosition = this.addParagraph(doc, resumeData.summary, yPosition, options);
      yPosition += 5;
    }

    this.reportProgress('rendering', 50, 'Rendering experience...');

    // Experience section
    if (resumeData.experience.length > 0) {
      yPosition = this.addSection(doc, 'EXPERIENCE', yPosition, colors, options);
      for (const exp of resumeData.experience) {
        yPosition = this.addExperience(doc, exp, yPosition, colors, options);
      }
      yPosition += 5;
    }

    this.reportProgress('rendering', 70, 'Rendering education and skills...');

    // Education section
    if (resumeData.education.length > 0) {
      yPosition = this.addSection(doc, 'EDUCATION', yPosition, colors, options);
      for (const edu of resumeData.education) {
        yPosition = this.addEducation(doc, edu, yPosition, colors, options);
      }
      yPosition += 5;
    }

    // Skills section
    if (resumeData.skills.length > 0) {
      yPosition = this.addSection(doc, 'SKILLS', yPosition, colors, options);
      yPosition = this.addSkills(doc, resumeData.skills, yPosition, colors, options);
    }

    // Projects section
    if (resumeData.projects.length > 0) {
      yPosition = this.addSection(doc, 'PROJECTS', yPosition, colors, options);
      for (const project of resumeData.projects) {
        yPosition = this.addProject(doc, project, yPosition, colors, options);
      }
    }
  }

  private async renderClassicTemplate(
    doc: jsPDF,
    resumeData: ResumeContent,
    options: PDFGenerationOptions
  ): Promise<void> {
    const colors = this.colorSchemes.gray; // Classic uses gray scheme
    const margin = options.margin;
    let yPosition = margin;

    // Header - simple and clean
    doc.setTextColor(colors.primary);
    doc.setFontSize(20);
    doc.setFont('times', 'bold');
    doc.text(resumeData.personalInfo.name, margin, yPosition + 10);

    // Contact info
    doc.setTextColor(colors.secondary);
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    yPosition += 15;
    doc.text(resumeData.personalInfo.email, margin, yPosition);
    doc.text(resumeData.personalInfo.phone, margin + 60, yPosition);
    doc.text(resumeData.personalInfo.location, margin + 120, yPosition);

    // Horizontal line
    yPosition += 5;
    doc.setDrawColor(colors.secondary);
    doc.line(margin, yPosition, 210 - margin, yPosition);
    yPosition += 10;

    this.reportProgress('rendering', 40, 'Rendering sections...');

    // Summary
    if (resumeData.summary) {
      yPosition = this.addClassicSection(doc, 'Summary', yPosition, colors, options);
      yPosition = this.addParagraph(doc, resumeData.summary, yPosition, options);
      yPosition += 8;
    }

    // Experience
    if (resumeData.experience.length > 0) {
      yPosition = this.addClassicSection(doc, 'Experience', yPosition, colors, options);
      for (const exp of resumeData.experience) {
        yPosition = this.addExperience(doc, exp, yPosition, colors, options);
      }
      yPosition += 8;
    }

    // Education
    if (resumeData.education.length > 0) {
      yPosition = this.addClassicSection(doc, 'Education', yPosition, colors, options);
      for (const edu of resumeData.education) {
        yPosition = this.addEducation(doc, edu, yPosition, colors, options);
      }
      yPosition += 8;
    }

    // Skills
    if (resumeData.skills.length > 0) {
      yPosition = this.addClassicSection(doc, 'Skills', yPosition, colors, options);
      yPosition = this.addSkills(doc, resumeData.skills, yPosition, colors, options);
    }
  }

  private async renderCreativeTemplate(
    doc: jsPDF,
    resumeData: ResumeContent,
    options: PDFGenerationOptions
  ): Promise<void> {
    const colors = this.colorSchemes[options.colorScheme];
    const margin = options.margin;
    let yPosition = margin;

    // Creative header with colored sidebar
    doc.setFillColor(colors.primary);
    doc.rect(0, 0, 60, 297, 'F'); // Left sidebar

    // Name in sidebar
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const nameLines = doc.splitTextToSize(resumeData.personalInfo.name, 50);
    doc.text(nameLines, 5, yPosition + 10);

    // Contact in sidebar
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    let sidebarY = yPosition + 30;

    const contactItems = [
      resumeData.personalInfo.email,
      resumeData.personalInfo.phone,
      resumeData.personalInfo.location
    ].filter(Boolean);

    contactItems.forEach(item => {
      const lines = doc.splitTextToSize(item, 50);
      doc.text(lines, 5, sidebarY);
      sidebarY += lines.length * 4 + 2;
    });

    // Main content area
    const mainMargin = 70;
    yPosition = margin;

    this.reportProgress('rendering', 40, 'Rendering main content...');

    // Summary
    if (resumeData.summary) {
      yPosition = this.addCreativeSection(doc, 'ABOUT ME', yPosition, colors, options, mainMargin);
      yPosition = this.addParagraph(doc, resumeData.summary, yPosition, options, mainMargin);
      yPosition += 8;
    }

    // Experience
    if (resumeData.experience.length > 0) {
      yPosition = this.addCreativeSection(doc, 'EXPERIENCE', yPosition, colors, options, mainMargin);
      for (const exp of resumeData.experience) {
        yPosition = this.addExperience(doc, exp, yPosition, colors, options, mainMargin);
      }
      yPosition += 8;
    }

    // Skills in sidebar
    if (resumeData.skills.length > 0) {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('SKILLS', 5, sidebarY + 10);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      sidebarY += 20;

      resumeData.skills.slice(0, 15).forEach(skill => { // Limit skills in sidebar
        const skillLines = doc.splitTextToSize(skill, 50);
        doc.text(skillLines, 5, sidebarY);
        sidebarY += skillLines.length * 3 + 1;
      });
    }

    // Education
    if (resumeData.education.length > 0) {
      yPosition = this.addCreativeSection(doc, 'EDUCATION', yPosition, colors, options, mainMargin);
      for (const edu of resumeData.education) {
        yPosition = this.addEducation(doc, edu, yPosition, colors, options, mainMargin);
      }
    }
  }

  private addSection(
    doc: jsPDF,
    title: string,
    yPosition: number,
    colors: any,
    options: PDFGenerationOptions
  ): number {
    doc.setTextColor(colors.primary);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, options.margin, yPosition);

    // Underline
    doc.setDrawColor(colors.primary);
    doc.line(options.margin, yPosition + 2, options.margin + 40, yPosition + 2);

    return yPosition + 10;
  }

  private addClassicSection(
    doc: jsPDF,
    title: string,
    yPosition: number,
    colors: any,
    options: PDFGenerationOptions
  ): number {
    doc.setTextColor(colors.primary);
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text(title.toUpperCase(), options.margin, yPosition);

    // Simple underline
    doc.setDrawColor(colors.secondary);
    doc.line(options.margin, yPosition + 1, 210 - options.margin, yPosition + 1);

    return yPosition + 8;
  }

  private addCreativeSection(
    doc: jsPDF,
    title: string,
    yPosition: number,
    colors: any,
    options: PDFGenerationOptions,
    leftMargin: number = options.margin
  ): number {
    doc.setTextColor(colors.primary);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(title, leftMargin, yPosition);

    // Colored accent line
    doc.setDrawColor(colors.primary);
    doc.setLineWidth(2);
    doc.line(leftMargin, yPosition + 2, leftMargin + 30, yPosition + 2);
    doc.setLineWidth(0.2); // Reset line width

    return yPosition + 12;
  }

  private addParagraph(
    doc: jsPDF,
    text: string,
    yPosition: number,
    options: PDFGenerationOptions,
    leftMargin: number = options.margin
  ): number {
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(options.fontSize);
    doc.setFont('helvetica', 'normal');

    const maxWidth = 210 - leftMargin - options.margin;
    const lines = doc.splitTextToSize(text, maxWidth);

    lines.forEach((line: string, index: number) => {
      doc.text(line, leftMargin, yPosition + (index * 5));
    });

    return yPosition + (lines.length * 5) + 3;
  }

  private addExperience(
    doc: jsPDF,
    experience: any,
    yPosition: number,
    colors: any,
    options: PDFGenerationOptions,
    leftMargin: number = options.margin
  ): number {
    // Company and position
    doc.setTextColor(colors.primary);
    doc.setFontSize(options.fontSize + 1);
    doc.setFont('helvetica', 'bold');
    doc.text(experience.position, leftMargin, yPosition);

    doc.setTextColor(colors.secondary);
    doc.setFontSize(options.fontSize);
    doc.setFont('helvetica', 'normal');
    doc.text(experience.company, leftMargin, yPosition + 5);

    // Dates
    const startDate = new Date(experience.startDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
    const endDate = experience.endDate
      ? new Date(experience.endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      })
      : 'Present';

    doc.text(`${startDate} - ${endDate}`, 210 - options.margin - 30, yPosition);

    yPosition += 12;

    // Description
    if (experience.description) {
      yPosition = this.addParagraph(doc, experience.description, yPosition, options, leftMargin);
    }

    // Achievements
    if (experience.achievements && experience.achievements.length > 0) {
      doc.setFontSize(options.fontSize - 1);
      experience.achievements.forEach((achievement: string) => {
        const bulletPoint = `• ${achievement}`;
        const lines = doc.splitTextToSize(bulletPoint, 210 - leftMargin - options.margin);
        lines.forEach((line: string, index: number) => {
          doc.text(line, leftMargin + 5, yPosition + (index * 4));
        });
        yPosition += lines.length * 4 + 1;
      });
    }

    return yPosition + 5;
  }

  private addEducation(
    doc: jsPDF,
    education: any,
    yPosition: number,
    colors: any,
    options: PDFGenerationOptions,
    leftMargin: number = options.margin
  ): number {
    doc.setTextColor(colors.primary);
    doc.setFontSize(options.fontSize + 1);
    doc.setFont('helvetica', 'bold');
    doc.text(`${education.degree} in ${education.major}`, leftMargin, yPosition);

    doc.setTextColor(colors.secondary);
    doc.setFontSize(options.fontSize);
    doc.setFont('helvetica', 'normal');
    doc.text(education.institution, leftMargin, yPosition + 5);

    // Dates
    const startYear = new Date(education.startDate).getFullYear();
    const endYear = education.endDate ? new Date(education.endDate).getFullYear() : 'Present';
    doc.text(`${startYear} - ${endYear}`, 210 - options.margin - 20, yPosition);

    return yPosition + 12;
  }

  private addSkills(
    doc: jsPDF,
    skills: string[],
    yPosition: number,
    colors: any,
    options: PDFGenerationOptions,
    leftMargin: number = options.margin
  ): number {
    doc.setTextColor(colors.secondary);
    doc.setFontSize(options.fontSize);
    doc.setFont('helvetica', 'normal');

    const skillsText = skills.join(' • ');
    const maxWidth = 210 - leftMargin - options.margin;
    const lines = doc.splitTextToSize(skillsText, maxWidth);

    lines.forEach((line: string, index: number) => {
      doc.text(line, leftMargin, yPosition + (index * 5));
    });

    return yPosition + (lines.length * 5) + 5;
  }

  private addProject(
    doc: jsPDF,
    project: any,
    yPosition: number,
    colors: any,
    options: PDFGenerationOptions,
    leftMargin: number = options.margin
  ): number {
    doc.setTextColor(colors.primary);
    doc.setFontSize(options.fontSize + 1);
    doc.setFont('helvetica', 'bold');
    doc.text(project.name, leftMargin, yPosition);

    yPosition += 7;

    if (project.description) {
      yPosition = this.addParagraph(doc, project.description, yPosition, options, leftMargin);
    }

    if (project.technologies && project.technologies.length > 0) {
      doc.setTextColor(colors.secondary);
      doc.setFontSize(options.fontSize - 1);
      doc.setFont('helvetica', 'italic');
      const techText = `Technologies: ${project.technologies.join(', ')}`;
      yPosition = this.addParagraph(doc, techText, yPosition, options, leftMargin);
    }

    return yPosition + 5;
  }
}