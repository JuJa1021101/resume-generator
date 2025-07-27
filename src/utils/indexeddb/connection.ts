import {
  DB_NAME,
  DB_VERSION,
  STORES,
  INDEX_DEFINITIONS,
  type DatabaseSchema,
} from './schema';

export class DatabaseConnection {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initialize();
    await this.initPromise;
  }

  private async _initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        this._setupErrorHandling();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this._createObjectStores(db);
      };
    });
  }

  /**
   * Create object stores and indexes during database upgrade
   */
  private _createObjectStores(db: IDBDatabase): void {
    // Create Users store
    if (!db.objectStoreNames.contains(STORES.USERS)) {
      const userStore = db.createObjectStore(STORES.USERS, { keyPath: 'id' });
      INDEX_DEFINITIONS[STORES.USERS].forEach(index => {
        userStore.createIndex(index.name, index.keyPath, { unique: index.unique });
      });
    }

    // Create Job Descriptions store
    if (!db.objectStoreNames.contains(STORES.JOB_DESCRIPTIONS)) {
      const jobStore = db.createObjectStore(STORES.JOB_DESCRIPTIONS, { keyPath: 'id' });
      INDEX_DEFINITIONS[STORES.JOB_DESCRIPTIONS].forEach(index => {
        jobStore.createIndex(index.name, index.keyPath, { unique: index.unique });
      });
    }

    // Create Analysis Results store
    if (!db.objectStoreNames.contains(STORES.ANALYSIS_RESULTS)) {
      const analysisStore = db.createObjectStore(STORES.ANALYSIS_RESULTS, { keyPath: 'id' });
      INDEX_DEFINITIONS[STORES.ANALYSIS_RESULTS].forEach(index => {
        analysisStore.createIndex(index.name, index.keyPath, { unique: index.unique });
      });
    }

    // Create AI Models store
    if (!db.objectStoreNames.contains(STORES.AI_MODELS)) {
      const modelStore = db.createObjectStore(STORES.AI_MODELS, { keyPath: 'id' });
      INDEX_DEFINITIONS[STORES.AI_MODELS].forEach(index => {
        modelStore.createIndex(index.name, index.keyPath, { unique: index.unique });
      });
    }

    // Create Performance Metrics store
    if (!db.objectStoreNames.contains(STORES.PERFORMANCE_METRICS)) {
      const metricsStore = db.createObjectStore(STORES.PERFORMANCE_METRICS, { keyPath: 'id' });
      INDEX_DEFINITIONS[STORES.PERFORMANCE_METRICS].forEach(index => {
        metricsStore.createIndex(index.name, index.keyPath, { unique: index.unique });
      });
    }

    // Create Cache Metadata store
    if (!db.objectStoreNames.contains(STORES.CACHE_METADATA)) {
      const cacheStore = db.createObjectStore(STORES.CACHE_METADATA, { keyPath: 'key' });
      INDEX_DEFINITIONS[STORES.CACHE_METADATA].forEach(index => {
        cacheStore.createIndex(index.name, index.keyPath, { unique: index.unique });
      });
    }
  }

  /**
   * Setup error handling for the database connection
   */
  private _setupErrorHandling(): void {
    if (!this.db) return;

    this.db.onerror = (event) => {
      console.error('Database error:', event);
    };

    this.db.onversionchange = () => {
      this.db?.close();
      this.db = null;
      this.isInitialized = false;
      console.warn('Database version changed, connection closed');
    };
  }

  /**
   * Get the database instance
   */
  getDatabase(): IDBDatabase {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Create a transaction for the specified stores
   */
  createTransaction(
    storeNames: string | string[],
    mode: IDBTransactionMode = 'readonly'
  ): IDBTransaction {
    const db = this.getDatabase();
    return db.transaction(storeNames, mode);
  }

  /**
   * Get an object store from a transaction
   */
  getStore<K extends keyof DatabaseSchema>(
    transaction: IDBTransaction,
    storeName: K
  ): IDBObjectStore {
    return transaction.objectStore(storeName);
  }

  /**
   * Execute a transaction with automatic error handling
   */
  async executeTransaction<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    operation: (transaction: IDBTransaction) => Promise<T>
  ): Promise<T> {
    const transaction = this.createTransaction(storeNames, mode);

    return new Promise((resolve, reject) => {
      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error?.message}`));
      };

      transaction.onabort = () => {
        reject(new Error('Transaction aborted'));
      };

      operation(transaction)
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }

  /**
   * Delete the entire database
   */
  static async deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME);

      deleteRequest.onerror = () => {
        reject(new Error(`Failed to delete database: ${deleteRequest.error?.message}`));
      };

      deleteRequest.onsuccess = () => {
        resolve();
      };

      deleteRequest.onblocked = () => {
        console.warn('Database deletion blocked by open connections');
      };
    });
  }

  /**
   * Check if IndexedDB is supported
   */
  static isSupported(): boolean {
    return 'indexedDB' in window && indexedDB !== null;
  }

  /**
   * Get database usage statistics
   */
  async getStorageEstimate(): Promise<StorageEstimate | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      return navigator.storage.estimate();
    }
    return null;
  }
}

// Singleton instance
export const dbConnection = new DatabaseConnection();