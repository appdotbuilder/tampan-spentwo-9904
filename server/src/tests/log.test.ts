import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, logSistemTable } from '../db/schema';
import { type CreateLogSistemInput, type CreateUserInput } from '../schema';
import { createLogSistem, getLogSistem, getLogByUser, getLogByDateRange } from '../handlers/log';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  username: 'testuser',
  password: 'password123',
  role: 'admin_sekolah'
};

const testUser2: CreateUserInput = {
  username: 'testuser2',
  password: 'password456',
  role: 'wali_kelas'
};

describe('Log System Handlers', () => {
  let testUserId: number;
  let testUserId2: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test users
    const userResult = await db.insert(usersTable)
      .values({
        username: testUser.username,
        password_hash: 'hashed_password',
        role: testUser.role
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    const userResult2 = await db.insert(usersTable)
      .values({
        username: testUser2.username,
        password_hash: 'hashed_password2',
        role: testUser2.role
      })
      .returning()
      .execute();
    testUserId2 = userResult2[0].id;
  });

  afterEach(resetDB);

  describe('createLogSistem', () => {
    it('should create a log entry', async () => {
      const logInput: CreateLogSistemInput = {
        user_id: testUserId,
        aksi: 'login',
        keterangan: 'User logged in successfully'
      };

      const result = await createLogSistem(logInput);

      expect(result.id).toBeDefined();
      expect(result.user_id).toEqual(testUserId);
      expect(result.aksi).toEqual('login');
      expect(result.keterangan).toEqual('User logged in successfully');
      expect(result.tanggal).toBeInstanceOf(Date);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create log entry without keterangan', async () => {
      const logInput: CreateLogSistemInput = {
        user_id: testUserId,
        aksi: 'logout',
        keterangan: null
      };

      const result = await createLogSistem(logInput);

      expect(result.user_id).toEqual(testUserId);
      expect(result.aksi).toEqual('logout');
      expect(result.keterangan).toBeNull();
    });

    it('should save log to database', async () => {
      const logInput: CreateLogSistemInput = {
        user_id: testUserId,
        aksi: 'create_transaksi',
        keterangan: 'Created new transaction'
      };

      const result = await createLogSistem(logInput);

      // Verify in database
      const logs = await db.select()
        .from(logSistemTable)
        .where(eq(logSistemTable.id, result.id))
        .execute();

      expect(logs).toHaveLength(1);
      expect(logs[0].user_id).toEqual(testUserId);
      expect(logs[0].aksi).toEqual('create_transaksi');
      expect(logs[0].keterangan).toEqual('Created new transaction');
    });

    it('should throw error for non-existent user', async () => {
      const logInput: CreateLogSistemInput = {
        user_id: 99999,
        aksi: 'invalid_action',
        keterangan: 'Should fail'
      };

      await expect(createLogSistem(logInput)).rejects.toThrow(/violates foreign key constraint/i);
    });
  });

  describe('getLogSistem', () => {
    it('should return all logs ordered by date descending', async () => {
      // Create multiple logs with different timestamps
      const log1Input: CreateLogSistemInput = {
        user_id: testUserId,
        aksi: 'first_action',
        keterangan: 'First log'
      };

      const log2Input: CreateLogSistemInput = {
        user_id: testUserId2,
        aksi: 'second_action',
        keterangan: 'Second log'
      };

      const log1 = await createLogSistem(log1Input);
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      const log2 = await createLogSistem(log2Input);

      const results = await getLogSistem();

      expect(results).toHaveLength(2);
      // Should be ordered by date descending (most recent first)
      expect(results[0].id).toEqual(log2.id);
      expect(results[1].id).toEqual(log1.id);
      expect(results[0].aksi).toEqual('second_action');
      expect(results[1].aksi).toEqual('first_action');
    });

    it('should return empty array when no logs exist', async () => {
      const results = await getLogSistem();
      expect(results).toHaveLength(0);
    });
  });

  describe('getLogByUser', () => {
    it('should return logs for specific user only', async () => {
      // Create logs for different users
      const log1Input: CreateLogSistemInput = {
        user_id: testUserId,
        aksi: 'user1_action',
        keterangan: 'User 1 log'
      };

      const log2Input: CreateLogSistemInput = {
        user_id: testUserId2,
        aksi: 'user2_action',
        keterangan: 'User 2 log'
      };

      const log3Input: CreateLogSistemInput = {
        user_id: testUserId,
        aksi: 'user1_another_action',
        keterangan: 'User 1 another log'
      };

      await createLogSistem(log1Input);
      await createLogSistem(log2Input);
      await createLogSistem(log3Input);

      const user1Logs = await getLogByUser(testUserId);
      const user2Logs = await getLogByUser(testUserId2);

      expect(user1Logs).toHaveLength(2);
      expect(user2Logs).toHaveLength(1);

      // All logs should belong to the correct user
      user1Logs.forEach(log => {
        expect(log.user_id).toEqual(testUserId);
      });

      user2Logs.forEach(log => {
        expect(log.user_id).toEqual(testUserId2);
      });
    });

    it('should return empty array for user with no logs', async () => {
      const results = await getLogByUser(testUserId);
      expect(results).toHaveLength(0);
    });

    it('should return logs ordered by date descending', async () => {
      // Create multiple logs for same user
      const log1Input: CreateLogSistemInput = {
        user_id: testUserId,
        aksi: 'first_action',
        keterangan: 'First'
      };

      const log2Input: CreateLogSistemInput = {
        user_id: testUserId,
        aksi: 'second_action',
        keterangan: 'Second'
      };

      const log1 = await createLogSistem(log1Input);
      await new Promise(resolve => setTimeout(resolve, 10));
      const log2 = await createLogSistem(log2Input);

      const results = await getLogByUser(testUserId);

      expect(results).toHaveLength(2);
      // Should be ordered by date descending
      expect(results[0].id).toEqual(log2.id);
      expect(results[1].id).toEqual(log1.id);
    });
  });

  describe('getLogByDateRange', () => {
    it('should return logs within specified date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Create logs
      const logInput: CreateLogSistemInput = {
        user_id: testUserId,
        aksi: 'test_action',
        keterangan: 'Within range'
      };

      const log = await createLogSistem(logInput);

      // Query with range that includes the log
      const results = await getLogByDateRange(yesterday, tomorrow);

      expect(results).toHaveLength(1);
      expect(results[0].id).toEqual(log.id);
      expect(results[0].tanggal >= yesterday).toBe(true);
      expect(results[0].tanggal <= tomorrow).toBe(true);
    });

    it('should exclude logs outside date range', async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Create a log (should be current timestamp)
      const logInput: CreateLogSistemInput = {
        user_id: testUserId,
        aksi: 'test_action',
        keterangan: 'Should be excluded'
      };

      await createLogSistem(logInput);

      // Query with range that excludes current log
      const results = await getLogByDateRange(twoDaysAgo, yesterday);

      expect(results).toHaveLength(0);
    });

    it('should return logs ordered by date descending', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Create multiple logs
      const log1Input: CreateLogSistemInput = {
        user_id: testUserId,
        aksi: 'first_action',
        keterangan: 'First'
      };

      const log2Input: CreateLogSistemInput = {
        user_id: testUserId2,
        aksi: 'second_action',
        keterangan: 'Second'
      };

      const log1 = await createLogSistem(log1Input);
      await new Promise(resolve => setTimeout(resolve, 10));
      const log2 = await createLogSistem(log2Input);

      const results = await getLogByDateRange(yesterday, tomorrow);

      expect(results).toHaveLength(2);
      // Should be ordered by date descending
      expect(results[0].id).toEqual(log2.id);
      expect(results[1].id).toEqual(log1.id);
    });

    it('should return empty array for range with no logs', async () => {
      const farPast = new Date('2020-01-01');
      const stillFarPast = new Date('2020-01-02');

      const results = await getLogByDateRange(farPast, stillFarPast);
      expect(results).toHaveLength(0);
    });
  });
});