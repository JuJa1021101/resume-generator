import { BaseRepository } from '../base-repository';
import { STORES, type AIModelCache } from '../schema';

export class AIModelRepository extends BaseRepository<typeof STORES.AI_MODELS, AIModelCache> {
  constructor() {
    super(STORES.AI_MODELS);
  }

  /**
   * Get model by version
   */
  async getByVersion(version: string): Promise<AIModelCache | null> {
    const models = await this.queryByIndex({
      indexName: 'version',
      value: version,
      options: { limit: 1 }
    });

    return models.length > 0 ? models[0] : null;
  }

  /**
   * Get models ordered by last access time
   */
  async getByLastAccessed(limit?: number): Promise<AIModelCache[]> {
    return this.queryByIndex({
      indexName: 'lastAccessed',
      value: IDBKeyRange.lowerBound(new Date(0)),
      options: {
        limit,
        orderDirection: 'desc'
      }
    });
  }

  /**
   * Get models ordered by access count
   */
  async getByAccessCount(limit?: number): Promise<AIModelCache[]> {
    return this.queryByIndex({
      indexName: 'accessCount',
      value: IDBKeyRange.lowerBound(0),
      options: {
        limit,
        orderDirection: 'desc'
      }
    });
  }

  /**
   * Get models by size range
   */
  async getBySize(minSize: number, maxSize: number): Promise<AIModelCache[]> {
    const range = IDBKeyRange.bound(minSize, maxSize);

    return this.queryByIndex({
      indexName: 'size',
      value: range,
      options: { orderDirection: 'asc' }
    });
  }

  /**
   * Update model access information
   */
  async updateAccess(modelId: string): Promise<AIModelCache> {
    const model = await this.getById(modelId);
    if (!model) {
      throw new Error(`AI Model with ID ${modelId} not found`);
    }

    const updatedModel: AIModelCache = {
      ...model,
      lastAccessed: new Date(),
      accessCount: model.accessCount + 1
    };

    return this.update(updatedModel);
  }

  /**
   * Get least recently used models for cache eviction
   */
  async getLeastRecentlyUsed(limit: number): Promise<AIModelCache[]> {
    return this.queryByIndex({
      indexName: 'lastAccessed',
      value: IDBKeyRange.lowerBound(new Date(0)),
      options: {
        limit,
        orderDirection: 'asc' // Oldest first
      }
    });
  }

  /**
   * Get total cache size
   */
  async getTotalCacheSize(): Promise<number> {
    const allModels = await this.getAll();
    return allModels.reduce((total, model) => total + model.size, 0);
  }

  /**
   * Get cache statistics
   */
  async getCacheStatistics(): Promise<{
    totalModels: number;
    totalSize: number;
    averageSize: number;
    mostAccessedModel: AIModelCache | null;
    leastAccessedModel: AIModelCache | null;
    oldestModel: AIModelCache | null;
    newestModel: AIModelCache | null;
  }> {
    const allModels = await this.getAll();

    if (allModels.length === 0) {
      return {
        totalModels: 0,
        totalSize: 0,
        averageSize: 0,
        mostAccessedModel: null,
        leastAccessedModel: null,
        oldestModel: null,
        newestModel: null
      };
    }

    const totalSize = allModels.reduce((sum, model) => sum + model.size, 0);
    const sortedByAccess = [...allModels].sort((a, b) => b.accessCount - a.accessCount);
    const sortedByDate = [...allModels].sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

    return {
      totalModels: allModels.length,
      totalSize,
      averageSize: totalSize / allModels.length,
      mostAccessedModel: sortedByAccess[0],
      leastAccessedModel: sortedByAccess[sortedByAccess.length - 1],
      oldestModel: sortedByDate[0],
      newestModel: sortedByDate[sortedByDate.length - 1]
    };
  }

  /**
   * Check if model exists and is valid
   */
  async isModelValid(modelId: string, expectedChecksum?: string): Promise<boolean> {
    const model = await this.getById(modelId);
    if (!model) return false;

    if (expectedChecksum && model.metadata.checksum !== expectedChecksum) {
      return false;
    }

    return true;
  }

  /**
   * Get models that need updating (based on version or checksum)
   */
  async getModelsNeedingUpdate(currentVersions: Record<string, string>): Promise<AIModelCache[]> {
    const allModels = await this.getAll();

    return allModels.filter(model => {
      const currentVersion = currentVersions[model.metadata.name];
      return currentVersion && model.version !== currentVersion;
    });
  }

  /**
   * Clean up invalid or corrupted models
   */
  async cleanupInvalidModels(): Promise<number> {
    const allModels = await this.getAll();
    let cleanedCount = 0;

    for (const model of allModels) {
      try {
        // Basic validation - check if model data exists and has reasonable size
        if (!model.modelData || model.modelData.byteLength === 0 ||
          model.size !== model.modelData.byteLength) {
          await this.delete(model.id);
          cleanedCount++;
        }
      } catch (error) {
        // If there's an error accessing the model, delete it
        await this.delete(model.id);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get models by type
   */
  async getModelsByType(type: AIModelCache['metadata']['type']): Promise<AIModelCache[]> {
    const allModels = await this.getAll();
    return allModels.filter(model => model.metadata.type === type);
  }

  /**
   * Update model metadata
   */
  async updateMetadata(modelId: string, metadata: Partial<AIModelCache['metadata']>): Promise<AIModelCache> {
    const model = await this.getById(modelId);
    if (!model) {
      throw new Error(`AI Model with ID ${modelId} not found`);
    }

    const updatedModel: AIModelCache = {
      ...model,
      metadata: {
        ...model.metadata,
        ...metadata
      }
    };

    return this.update(updatedModel);
  }
}