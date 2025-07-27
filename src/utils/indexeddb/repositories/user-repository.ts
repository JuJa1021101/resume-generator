import { BaseRepository } from '../base-repository';
import { STORES } from '../schema';
import type { User } from '../../../types';

export class UserRepository extends BaseRepository<typeof STORES.USERS, User> {
  constructor() {
    super(STORES.USERS);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const users = await this.queryByIndex({
      indexName: 'email',
      value: email,
      options: { limit: 1 }
    });

    return users.length > 0 ? users[0] : null;
  }

  /**
   * Get users created within a date range
   */
  async getUsersCreatedBetween(startDate: Date, endDate: Date): Promise<User[]> {
    const range = IDBKeyRange.bound(startDate, endDate);

    return this.queryByIndex({
      indexName: 'createdAt',
      value: range,
      options: { orderDirection: 'desc' }
    });
  }

  /**
   * Get recently updated users
   */
  async getRecentlyUpdated(limit: number = 10): Promise<User[]> {
    return this.queryByIndex({
      indexName: 'updatedAt',
      value: IDBKeyRange.lowerBound(new Date(0)),
      options: {
        limit,
        orderDirection: 'desc'
      }
    });
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, profileUpdates: Partial<User['profile']>): Promise<User> {
    const user = await this.getById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const updatedUser: User = {
      ...user,
      profile: {
        ...user.profile,
        ...profileUpdates
      },
      updatedAt: new Date()
    };

    return this.update(updatedUser);
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, preferences: Partial<User['preferences']>): Promise<User> {
    const user = await this.getById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const updatedUser: User = {
      ...user,
      preferences: {
        ...user.preferences,
        ...preferences
      },
      updatedAt: new Date()
    };

    return this.update(updatedUser);
  }

  /**
   * Add analysis to user history
   */
  async addAnalysisToHistory(userId: string, analysisHistory: User['history'][0]): Promise<User> {
    const user = await this.getById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const updatedUser: User = {
      ...user,
      history: [...user.history, analysisHistory],
      updatedAt: new Date()
    };

    return this.update(updatedUser);
  }

  /**
   * Get user analysis history
   */
  async getUserHistory(userId: string): Promise<User['history']> {
    const user = await this.getById(userId);
    return user?.history || [];
  }

  /**
   * Clear user analysis history
   */
  async clearUserHistory(userId: string): Promise<User> {
    const user = await this.getById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const updatedUser: User = {
      ...user,
      history: [],
      updatedAt: new Date()
    };

    return this.update(updatedUser);
  }
}