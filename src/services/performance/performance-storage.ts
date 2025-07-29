import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { PerformanceEntry, PerformanceReport, PerformanceAlert, PerformanceConfig } from './types';

// IndexedDB schema for performance data
interface PerformanceDB extends DBSchema {
  entries: {
    key: string;
    value: PerformanceEntry;
    indexes: { 'by-timestamp': number; 'by-operation': string };
  };
  reports: {
    key: string;
    value: PerformanceReport;
    indexes: { 'by-generated-at': Date };
  };
  alerts: {
    key: string;
    value: PerformanceAlert;
    indexes: { 'by-timestamp': Date; 'by-severity': string };
  };
  config: {
    key: 'performance-config';
    value: PerformanceConfig;
  };
}

export class PerformanceStorage {
  private db: IDBPDatabase<PerformanceDB> | null = null;
  private readonly DB_NAME = 'performance-monitor';
  private readonly DB_VERSION = 1;

  async initialize(): Promise<void> {
    try {
      this.db = await openDB<PerformanceDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Performance entries store
          const entriesStore = db.createObjectStore('entries', { keyPath: 'id' });
          entriesStore.createIndex('by-timestamp', 'timestamp');
          entriesStore.createIndex('by-operation', 'operation');

          // Performance reports store
          const reportsStore = db.createObjectStore('reports', { keyPath: 'id' });
          reportsStore.createIndex('by-generated-at', 'generatedAt');

          // Performance alerts store
          const alertsStore = db.createObjectStore('alerts', { keyPath: 'id' });
          alertsStore.createIndex('by-timestamp', 'timestamp');
          alertsStore.createIndex('by-severity', 'severity');

          // Configuration store
          db.createObjectStore('config', { keyPath: 'key' });
        }
      });
    } catch (error) {
      console.error('Failed to initialize performance storage:', error);
      throw error;
    }
  }

  // Performance entries management
  async storeEntry(entry: PerformanceEntry): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.add('entries', entry);
      await this.cleanupOldEntries();
    } catch (error) {
      console.error('Failed to store performance entry:', error);
      throw error;
    }
  }

  async getEntries(
    startTime?: number,
    endTime?: number,
    operation?: string
  ): Promise<PerformanceEntry[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      let entries: PerformanceEntry[];

      if (operation) {
        entries = await this.db.getAllFromIndex('entries', 'by-operation', operation);
      } else {
        entries = await this.db.getAll('entries');
      }

      // Filter by time range if specified
      if (startTime || endTime) {
        entries = entries.filter(entry => {
          if (startTime && entry.timestamp < startTime) return false;
          if (endTime && entry.timestamp > endTime) return false;
          return true;
        });
      }

      return entries.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to get performance entries:', error);
      return [];
    }
  }

  async getEntriesByOperation(operation: string): Promise<PerformanceEntry[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      return await this.db.getAllFromIndex('entries', 'by-operation', operation);
    } catch (error) {
      console.error('Failed to get entries by operation:', error);
      return [];
    }
  }

  // Performance reports management
  async storeReport(report: PerformanceReport): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.put('reports', report);
      await this.cleanupOldReports();
    } catch (error) {
      console.error('Failed to store performance report:', error);
      throw error;
    }
  }

  async getReports(limit = 10): Promise<PerformanceReport[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const reports = await this.db.getAllFromIndex('reports', 'by-generated-at');
      return reports.reverse().slice(0, limit);
    } catch (error) {
      console.error('Failed to get performance reports:', error);
      return [];
    }
  }

  async getLatestReport(): Promise<PerformanceReport | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const reports = await this.getReports(1);
      return reports[0] || null;
    } catch (error) {
      console.error('Failed to get latest report:', error);
      return null;
    }
  }

  // Performance alerts management
  async storeAlert(alert: PerformanceAlert): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.add('alerts', alert);
      await this.cleanupOldAlerts();
    } catch (error) {
      console.error('Failed to store performance alert:', error);
      throw error;
    }
  }

  async getAlerts(severity?: string, limit = 50): Promise<PerformanceAlert[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      let alerts: PerformanceAlert[];

      if (severity) {
        alerts = await this.db.getAllFromIndex('alerts', 'by-severity', severity);
      } else {
        alerts = await this.db.getAll('alerts');
      }

      return alerts
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get performance alerts:', error);
      return [];
    }
  }

  // Configuration management
  async storeConfig(config: PerformanceConfig): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.put('config', config, 'performance-config');
    } catch (error) {
      console.error('Failed to store performance config:', error);
      throw error;
    }
  }

  async getConfig(): Promise<PerformanceConfig | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.get('config', 'performance-config');
      return result || null;
    } catch (error) {
      console.error('Failed to get performance config:', error);
      return null;
    }
  }

  // Cleanup methods
  private async cleanupOldEntries(): Promise<void> {
    if (!this.db) return;

    try {
      const config = await this.getConfig();
      const maxEntries = config?.maxEntries || 1000;

      const allEntries = await this.db.getAll('entries');
      if (allEntries.length > maxEntries) {
        const sortedEntries = allEntries.sort((a, b) => b.timestamp - a.timestamp);
        const entriesToDelete = sortedEntries.slice(maxEntries);

        const tx = this.db.transaction('entries', 'readwrite');
        for (const entry of entriesToDelete) {
          await tx.store.delete(entry.id);
        }
        await tx.done;
      }
    } catch (error) {
      console.error('Failed to cleanup old entries:', error);
    }
  }

  private async cleanupOldReports(): Promise<void> {
    if (!this.db) return;

    try {
      const reports = await this.db.getAll('reports');
      const maxReports = 50; // Keep last 50 reports

      if (reports.length > maxReports) {
        const sortedReports = reports.sort((a, b) =>
          b.generatedAt.getTime() - a.generatedAt.getTime()
        );
        const reportsToDelete = sortedReports.slice(maxReports);

        const tx = this.db.transaction('reports', 'readwrite');
        for (const report of reportsToDelete) {
          await tx.store.delete(report.id);
        }
        await tx.done;
      }
    } catch (error) {
      console.error('Failed to cleanup old reports:', error);
    }
  }

  private async cleanupOldAlerts(): Promise<void> {
    if (!this.db) return;

    try {
      const alerts = await this.db.getAll('alerts');
      const maxAlerts = 200; // Keep last 200 alerts

      if (alerts.length > maxAlerts) {
        const sortedAlerts = alerts.sort((a, b) =>
          b.timestamp.getTime() - a.timestamp.getTime()
        );
        const alertsToDelete = sortedAlerts.slice(maxAlerts);

        const tx = this.db.transaction('alerts', 'readwrite');
        for (const alert of alertsToDelete) {
          await tx.store.delete(alert.id);
        }
        await tx.done;
      }
    } catch (error) {
      console.error('Failed to cleanup old alerts:', error);
    }
  }

  // Statistics and analytics
  async getStorageStats(): Promise<{
    entriesCount: number;
    reportsCount: number;
    alertsCount: number;
    estimatedSize: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const [entriesCount, reportsCount, alertsCount] = await Promise.all([
        this.db.count('entries'),
        this.db.count('reports'),
        this.db.count('alerts')
      ]);

      // Rough estimation of storage size (in bytes)
      const estimatedSize = (entriesCount * 500) + (reportsCount * 2000) + (alertsCount * 300);

      return {
        entriesCount,
        reportsCount,
        alertsCount,
        estimatedSize
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        entriesCount: 0,
        reportsCount: 0,
        alertsCount: 0,
        estimatedSize: 0
      };
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const tx = this.db.transaction(['entries', 'reports', 'alerts'], 'readwrite');
      await Promise.all([
        tx.objectStore('entries').clear(),
        tx.objectStore('reports').clear(),
        tx.objectStore('alerts').clear()
      ]);
      await tx.done;
    } catch (error) {
      console.error('Failed to clear performance data:', error);
      throw error;
    }
  }
}

// Singleton instance
export const performanceStorage = new PerformanceStorage();