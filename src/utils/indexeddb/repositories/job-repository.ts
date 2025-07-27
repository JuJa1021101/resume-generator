import { BaseRepository } from '../base-repository';
import { STORES } from '../schema';
import type { JobDescription } from '../../../types';

export class JobRepository extends BaseRepository<typeof STORES.JOB_DESCRIPTIONS, JobDescription> {
  constructor() {
    super(STORES.JOB_DESCRIPTIONS);
  }

  /**
   * Find jobs by title (partial match)
   */
  async findByTitle(title: string): Promise<JobDescription[]> {
    // Since IndexedDB doesn't support partial text search natively,
    // we'll get all jobs and filter in memory for now
    const allJobs = await this.getAll();
    return allJobs.filter(job =>
      job.title.toLowerCase().includes(title.toLowerCase())
    );
  }

  /**
   * Find jobs by company
   */
  async findByCompany(company: string): Promise<JobDescription[]> {
    return this.queryByIndex({
      indexName: 'company',
      value: company,
      options: { orderDirection: 'desc', orderBy: 'analyzedAt' }
    });
  }

  /**
   * Get recently analyzed jobs
   */
  async getRecentlyAnalyzed(limit: number = 10): Promise<JobDescription[]> {
    return this.queryByIndex({
      indexName: 'analyzedAt',
      value: IDBKeyRange.lowerBound(new Date(0)),
      options: {
        limit,
        orderDirection: 'desc'
      }
    });
  }

  /**
   * Get jobs analyzed within a date range
   */
  async getJobsAnalyzedBetween(startDate: Date, endDate: Date): Promise<JobDescription[]> {
    const range = IDBKeyRange.bound(startDate, endDate);

    return this.queryByIndex({
      indexName: 'analyzedAt',
      value: range,
      options: { orderDirection: 'desc' }
    });
  }

  /**
   * Search jobs by keywords in content
   */
  async searchByKeywords(keywords: string[]): Promise<JobDescription[]> {
    const allJobs = await this.getAll();

    return allJobs.filter(job => {
      const content = job.content.toLowerCase();
      return keywords.some(keyword =>
        content.includes(keyword.toLowerCase())
      );
    });
  }

  /**
   * Get jobs with high match scores for AI analysis
   */
  async getHighMatchJobs(minScore: number = 0.7): Promise<JobDescription[]> {
    const allJobs = await this.getAll();

    return allJobs.filter(job =>
      job.aiAnalysis && job.aiAnalysis.matchScore >= minScore
    );
  }

  /**
   * Update job analysis results
   */
  async updateAnalysis(jobId: string, aiAnalysis: JobDescription['aiAnalysis']): Promise<JobDescription> {
    const job = await this.getById(jobId);
    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    const updatedJob: JobDescription = {
      ...job,
      aiAnalysis,
      analyzedAt: new Date()
    };

    return this.update(updatedJob);
  }

  /**
   * Get jobs that need re-analysis (older than specified days)
   */
  async getJobsNeedingReanalysis(daysOld: number = 30): Promise<JobDescription[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const range = IDBKeyRange.upperBound(cutoffDate);

    return this.queryByIndex({
      indexName: 'analyzedAt',
      value: range
    });
  }

  /**
   * Get unique companies from stored jobs
   */
  async getUniqueCompanies(): Promise<string[]> {
    const allJobs = await this.getAll();
    const companies = new Set(allJobs.map(job => job.company));
    return Array.from(companies).sort();
  }

  /**
   * Get job statistics
   */
  async getJobStatistics(): Promise<{
    totalJobs: number;
    uniqueCompanies: number;
    averageMatchScore: number;
    recentJobs: number; // Last 7 days
  }> {
    const allJobs = await this.getAll();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentJobs = allJobs.filter(job => job.analyzedAt >= sevenDaysAgo);
    const jobsWithScores = allJobs.filter(job => job.aiAnalysis?.matchScore);
    const averageScore = jobsWithScores.length > 0
      ? jobsWithScores.reduce((sum, job) => sum + job.aiAnalysis.matchScore, 0) / jobsWithScores.length
      : 0;

    return {
      totalJobs: allJobs.length,
      uniqueCompanies: new Set(allJobs.map(job => job.company)).size,
      averageMatchScore: averageScore,
      recentJobs: recentJobs.length
    };
  }
}