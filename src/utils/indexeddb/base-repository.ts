import { dbConnection } from './connection';
import type { DatabaseSchema } from './schema';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface IndexQuery {
  indexName: string;
  value: IDBValidKey | IDBKeyRange;
  options?: QueryOptions;
}

export abstract class BaseRepository<
  K extends keyof DatabaseSchema,
  T extends DatabaseSchema[K]['value']
> {
  constructor(protected storeName: K) { }

  /**
   * Create a new record
   */
  async create(data: T): Promise<T> {
    await dbConnection.initialize();

    return dbConnection.executeTransaction(
      this.storeName,
      'readwrite',
      async (transaction) => {
        const store = dbConnection.getStore(transaction, this.storeName);

        return new Promise<T>((resolve, reject) => {
          const request = store.add(data);

          request.onsuccess = () => {
            resolve(data);
          };

          request.onerror = () => {
            reject(new Error(`Failed to create record: ${request.error?.message}`));
          };
        });
      }
    );
  }

  /**
   * Get a record by ID
   */
  async getById(id: string): Promise<T | null> {
    await dbConnection.initialize();

    return dbConnection.executeTransaction(
      this.storeName,
      'readonly',
      async (transaction) => {
        const store = dbConnection.getStore(transaction, this.storeName);

        return new Promise<T | null>((resolve, reject) => {
          const request = store.get(id);

          request.onsuccess = () => {
            resolve(request.result || null);
          };

          request.onerror = () => {
            reject(new Error(`Failed to get record: ${request.error?.message}`));
          };
        });
      }
    );
  }

  /**
   * Get all records with optional filtering
   */
  async getAll(options?: QueryOptions): Promise<T[]> {
    await dbConnection.initialize();

    return dbConnection.executeTransaction(
      this.storeName,
      'readonly',
      async (transaction) => {
        const store = dbConnection.getStore(transaction, this.storeName);

        return new Promise<T[]>((resolve, reject) => {
          const results: T[] = [];
          let request: IDBRequest;

          if (options?.orderBy) {
            // Use index for ordering if specified
            const index = store.index(options.orderBy);
            request = index.openCursor(
              null,
              options.orderDirection === 'desc' ? 'prev' : 'next'
            );
          } else {
            request = store.openCursor();
          }

          let count = 0;
          const offset = options?.offset || 0;
          const limit = options?.limit;

          request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
              if (count >= offset) {
                if (!limit || results.length < limit) {
                  results.push(cursor.value);
                }
              }
              count++;

              if (!limit || results.length < limit) {
                cursor.continue();
              } else {
                resolve(results);
              }
            } else {
              resolve(results);
            }
          };

          request.onerror = () => {
            reject(new Error(`Failed to get all records: ${request.error?.message}`));
          };
        });
      }
    );
  }

  /**
   * Query records by index
   */
  async queryByIndex(query: IndexQuery): Promise<T[]> {
    await dbConnection.initialize();

    return dbConnection.executeTransaction(
      this.storeName,
      'readonly',
      async (transaction) => {
        const store = dbConnection.getStore(transaction, this.storeName);
        const index = store.index(query.indexName);

        return new Promise<T[]>((resolve, reject) => {
          const results: T[] = [];
          const request = index.openCursor(
            query.value,
            query.options?.orderDirection === 'desc' ? 'prev' : 'next'
          );

          let count = 0;
          const offset = query.options?.offset || 0;
          const limit = query.options?.limit;

          request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
              if (count >= offset) {
                if (!limit || results.length < limit) {
                  results.push(cursor.value);
                }
              }
              count++;

              if (!limit || results.length < limit) {
                cursor.continue();
              } else {
                resolve(results);
              }
            } else {
              resolve(results);
            }
          };

          request.onerror = () => {
            reject(new Error(`Failed to query by index: ${request.error?.message}`));
          };
        });
      }
    );
  }

  /**
   * Update a record
   */
  async update(data: T): Promise<T> {
    await dbConnection.initialize();

    return dbConnection.executeTransaction(
      this.storeName,
      'readwrite',
      async (transaction) => {
        const store = dbConnection.getStore(transaction, this.storeName);

        return new Promise<T>((resolve, reject) => {
          const request = store.put(data);

          request.onsuccess = () => {
            resolve(data);
          };

          request.onerror = () => {
            reject(new Error(`Failed to update record: ${request.error?.message}`));
          };
        });
      }
    );
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<void> {
    await dbConnection.initialize();

    return dbConnection.executeTransaction(
      this.storeName,
      'readwrite',
      async (transaction) => {
        const store = dbConnection.getStore(transaction, this.storeName);

        return new Promise<void>((resolve, reject) => {
          const request = store.delete(id);

          request.onsuccess = () => {
            resolve();
          };

          request.onerror = () => {
            reject(new Error(`Failed to delete record: ${request.error?.message}`));
          };
        });
      }
    );
  }

  /**
   * Count records in the store
   */
  async count(): Promise<number> {
    await dbConnection.initialize();

    return dbConnection.executeTransaction(
      this.storeName,
      'readonly',
      async (transaction) => {
        const store = dbConnection.getStore(transaction, this.storeName);

        return new Promise<number>((resolve, reject) => {
          const request = store.count();

          request.onsuccess = () => {
            resolve(request.result);
          };

          request.onerror = () => {
            reject(new Error(`Failed to count records: ${request.error?.message}`));
          };
        });
      }
    );
  }

  /**
   * Clear all records from the store
   */
  async clear(): Promise<void> {
    await dbConnection.initialize();

    return dbConnection.executeTransaction(
      this.storeName,
      'readwrite',
      async (transaction) => {
        const store = dbConnection.getStore(transaction, this.storeName);

        return new Promise<void>((resolve, reject) => {
          const request = store.clear();

          request.onsuccess = () => {
            resolve();
          };

          request.onerror = () => {
            reject(new Error(`Failed to clear store: ${request.error?.message}`));
          };
        });
      }
    );
  }

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<boolean> {
    const record = await this.getById(id);
    return record !== null;
  }

  /**
   * Batch create multiple records
   */
  async batchCreate(records: T[]): Promise<T[]> {
    await dbConnection.initialize();

    return dbConnection.executeTransaction(
      this.storeName,
      'readwrite',
      async (transaction) => {
        const store = dbConnection.getStore(transaction, this.storeName);
        const results: T[] = [];

        return new Promise<T[]>((resolve, reject) => {
          let completed = 0;
          let hasError = false;

          if (records.length === 0) {
            resolve([]);
            return;
          }

          records.forEach((record, index) => {
            const request = store.add(record);

            request.onsuccess = () => {
              if (!hasError) {
                results[index] = record;
                completed++;

                if (completed === records.length) {
                  resolve(results);
                }
              }
            };

            request.onerror = () => {
              if (!hasError) {
                hasError = true;
                reject(new Error(`Failed to create record at index ${index}: ${request.error?.message}`));
              }
            };
          });
        });
      }
    );
  }

  /**
   * Batch update multiple records
   */
  async batchUpdate(records: T[]): Promise<T[]> {
    await dbConnection.initialize();

    return dbConnection.executeTransaction(
      this.storeName,
      'readwrite',
      async (transaction) => {
        const store = dbConnection.getStore(transaction, this.storeName);
        const results: T[] = [];

        return new Promise<T[]>((resolve, reject) => {
          let completed = 0;
          let hasError = false;

          if (records.length === 0) {
            resolve([]);
            return;
          }

          records.forEach((record, index) => {
            const request = store.put(record);

            request.onsuccess = () => {
              if (!hasError) {
                results[index] = record;
                completed++;

                if (completed === records.length) {
                  resolve(results);
                }
              }
            };

            request.onerror = () => {
              if (!hasError) {
                hasError = true;
                reject(new Error(`Failed to update record at index ${index}: ${request.error?.message}`));
              }
            };
          });
        });
      }
    );
  }
}