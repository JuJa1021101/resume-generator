import { BaseRepository } from '../base-repository';
import { STORES } from '../schema';
import type { AnalysisResult } from '../../../types';

export class AnalysisRepository extends BaseRepository<typeof STORES.ANALYSIS_RESULTS, AnalysisResult> {
  constructor() {
    super(STORES.ANALYSIS_RESULTS);
  }

  /**
   * Get analysis results for a specific user
   */
  async getByUserId(userId: string): Promise<AnalysisResult[]> {
    return this.queryByIndex({
      indexName: 'userId',
      value: userId,
      options: { orderDirection: 'desc', orderBy: 'createdAt' }
    });
  }

  /**
   * Get analysis results for a specific job
   */
  async getByJobId(jobId: string): Promise<AnalysisResult[]> {
    return this.queryByIndex({
      indexName: 'jobId',
      value: jobId,
      options: { orderDirection: 'desc', orderBy: 'createdAt' }
    });
  }

  /**
   * Get analysis results by user and job
   */
  async getByUserAndJob(userId: string, jobId: string): Promise<AnalysisResult[]> {
    const userResults = await this.getByUserId(userId);
    return userResults.filter(result => result.jobId === jobId);
  }

  /**
   * Get recent analysis results
   */
  async getRecent(limit: number = 10): Promise<AnalysisResult[]> {
    return this.queryByIndex({
      indexName: 'createdAt',
      value: IDBKeyRange.lowerBound(new Date(0)),
      options: {
        limit,
        orderDirection: 'desc'
      }
    });
  }

  /**
   * Get analysis results within a date range
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<AnalysisResult[]> {
    const range = IDBKeyRange.bound(startDate, endDate);

    return this.queryByIndex({
      indexName: 'createdAt',
      value: range,
      options: { orderDirection: 'desc' }
    });
  }

  /**
   * Get high-scoring analysis results
   */
  async getHighScoring(minScore: number = 0.8): Promise<AnalysisResult[]> {
    const range = IDBKeyRange.lowerBound(minScore);

    return this.queryByIndex({
      indexName: 'matchScore',
      value: range,
      options: { orderDirection: 'desc' }
    });
  }

  /**
   * Get analysis results with low scores (need improvement)
   */
  async getLowScoring(maxScore: number = 0.5): Promise<AnalysisResult[]> {
    const range = IDBKeyRange.upperBound(maxScore);

    return this.queryByIndex({
      indexName: 'matchScore',
      value: range,
      options: { orderDirection: 'asc' }
    });
  }

  /**
   * Get the latest analysis for a user-job combination
   */
  async getLatestForUserJob(userId: string, jobId: string): Promise<AnalysisResult | null> {
    const results = await this.getByUserAndJob(userId, jobId);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get analysis statistics for a user
   */
  async getUserStatistics(userId: string): Promise<{
    totalAnalyses: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    recentAnalyses: number; // Last 7 days
    improvementTrend: 'improving' | 'declining' | 'stable';
  }> {
    const userResults = await this.getByUserId(userId);

    if (userResults.length === 0) {
      return {
        totalAnalyses: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        recentAnalyses: 0,
        improvementTrend: 'stable'
      };
    }

    const scores = userResults.map(result => result.matchScore);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentResults = userResults.filter(result => result.createdAt >= sevenDaysAgo);

    // Calculate trend (compare last 3 vs previous 3)
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (userResults.length >= 6) {
      const recent3 = userResults.slice(0, 3).map(r => r.matchScore);
      const previous3 = userResults.slice(3, 6).map(r => r.matchScore);

      const recentAvg = recent3.reduce((sum, score) => sum + score, 0) / recent3.length;
      const previousAvg = previous3.reduce((sum, score) => sum + score, 0) / previous3.length;

      if (recentAvg > previousAvg + 0.05) trend = 'improving';
      else if (recentAvg < previousAvg - 0.05) trend = 'declining';
    }

    return {
      totalAnalyses: userResults.length,
      averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      recentAnalyses: recentResults.length,
      improvementTrend: trend
    };
  }

  /**
   * Get global analysis statistics
   */
  async getGlobalStatistics(): Promise<{
    totalAnalyses: number;
    uniqueUsers: number;
    uniqueJobs: number;
    averageScore: number;
    analysesThisWeek: number;
    analysesThisMonth: number;
  }> {
    const allResults = await this.getAll();

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const weekResults = allResults.filter(result => result.createdAt >= oneWeekAgo);
    const monthResults = allResults.filter(result => result.createdAt >= oneMonthAgo);

    const scores = allResults.map(result => result.matchScore);
    const averageScore = scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;

    return {
      totalAnalyses: allResults.length,
      uniqueUsers: new Set(allResults.map(result => result.userId)).size,
      uniqueJobs: new Set(allResults.map(result => result.jobId)).size,
      averageScore,
      analysesThisWeek: weekResults.length,
      analysesThisMonth: monthResults.length
    };
  }

  /**
   * Delete old analysis results (cleanup)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const oldResults = await this.queryByIndex({
      indexName: 'createdAt',
      value: IDBKeyRange.upperBound(cutoffDate)
    });

    // Delete each old result
    for (const result of oldResults) {
      await this.delete(result.id);
    }

    return oldResults.length;
  }

  /**
   * Get performance metrics summary
   */
  async getPerformanceMetricsSummary(): Promise<{
    averageLoadTime: number;
    averageAiProcessingTime: number;
    averageRenderTime: number;
    averageMemoryUsage: number;
    averageCacheHitRate: number;
  }> {
    const allResults = await this.getAll();
    const metrics = allResults.map(result => result.performanceMetrics);

    if (metrics.length === 0) {
      return {
        averageLoadTime: 0,
        averageAiProcessingTime: 0,
        averageRenderTime: 0,
        averageMemoryUsage: 0,
        averageCacheHitRate: 0
      };
    }

    return {
      averageLoadTime: metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length,
      averageAiProcessingTime: metrics.reduce((sum, m) => sum + m.aiProcessingTime, 0) / metrics.length,
      averageRenderTime: metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length,
      averageMemoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length,
      averageCacheHitRate: metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length
    };
  }
}