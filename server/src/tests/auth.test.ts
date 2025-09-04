import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login, resetPassword } from '../handlers/auth';
import { eq } from 'drizzle-orm';

// Helper function to hash password for tests (same logic as in handler)
function hashPassword(password: string): string {
  return Buffer.from(password).toString('base64');
}

describe('auth handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('login', () => {
    it('should authenticate user with valid credentials', async () => {
      // Create test user
      const hashedPassword = hashPassword('testpass123');
      const userResult = await db.insert(usersTable)
        .values({
          username: 'testuser',
          password_hash: hashedPassword,
          role: 'admin_sekolah'
        })
        .returning()
        .execute();

      const testUser = userResult[0];

      const loginInput: LoginInput = {
        username: 'testuser',
        password: 'testpass123'
      };

      const result = await login(loginInput);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(testUser.id);
      expect(result!.username).toBe('testuser');
      expect(result!.role).toBe('admin_sekolah');
      expect(result!.password_hash).toBe(hashedPassword);
      expect(result!.created_at).toBeInstanceOf(Date);
    });

    it('should return null for non-existent user', async () => {
      const loginInput: LoginInput = {
        username: 'nonexistent',
        password: 'password123'
      };

      const result = await login(loginInput);

      expect(result).toBeNull();
    });

    it('should return null for invalid password', async () => {
      // Create test user
      const hashedPassword = hashPassword('correctpass');
      await db.insert(usersTable)
        .values({
          username: 'testuser',
          password_hash: hashedPassword,
          role: 'wali_kelas'
        })
        .execute();

      const loginInput: LoginInput = {
        username: 'testuser',
        password: 'wrongpass'
      };

      const result = await login(loginInput);

      expect(result).toBeNull();
    });

    it('should authenticate siswa user', async () => {
      // Create siswa user
      const hashedPassword = hashPassword('siswapass');
      await db.insert(usersTable)
        .values({
          username: 'siswa123',
          password_hash: hashedPassword,
          role: 'siswa'
        })
        .execute();

      const loginInput: LoginInput = {
        username: 'siswa123',
        password: 'siswapass'
      };

      const result = await login(loginInput);

      expect(result).not.toBeNull();
      expect(result!.username).toBe('siswa123');
      expect(result!.role).toBe('siswa');
    });

    it('should authenticate wali_kelas user', async () => {
      // Create wali_kelas user
      const hashedPassword = hashPassword('gurupass');
      await db.insert(usersTable)
        .values({
          username: 'pak_guru',
          password_hash: hashedPassword,
          role: 'wali_kelas'
        })
        .execute();

      const loginInput: LoginInput = {
        username: 'pak_guru',
        password: 'gurupass'
      };

      const result = await login(loginInput);

      expect(result).not.toBeNull();
      expect(result!.username).toBe('pak_guru');
      expect(result!.role).toBe('wali_kelas');
    });
  });

  describe('resetPassword', () => {
    it('should reset password for existing user', async () => {
      // Create test user
      const originalHash = hashPassword('oldpass');
      const userResult = await db.insert(usersTable)
        .values({
          username: 'testuser',
          password_hash: originalHash,
          role: 'admin_sekolah'
        })
        .returning()
        .execute();

      const userId = userResult[0].id;

      // Reset password
      const result = await resetPassword(userId, 'newpass123');

      expect(result).toBe(true);

      // Verify password was changed in database
      const updatedUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      const updatedUser = updatedUsers[0];
      const newHash = hashPassword('newpass123');
      
      expect(updatedUser.password_hash).toBe(newHash);
      expect(updatedUser.password_hash).not.toBe(originalHash);
    });

    it('should return false for non-existent user', async () => {
      const result = await resetPassword(999, 'newpass123');

      expect(result).toBe(false);
    });

    it('should update password for siswa user', async () => {
      // Create siswa user
      const userResult = await db.insert(usersTable)
        .values({
          username: 'siswa123',
          password_hash: hashPassword('oldpass'),
          role: 'siswa'
        })
        .returning()
        .execute();

      const userId = userResult[0].id;

      const result = await resetPassword(userId, 'newsiswapass');

      expect(result).toBe(true);

      // Verify the password was actually changed
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      expect(users[0].password_hash).toBe(hashPassword('newsiswapass'));
    });

    it('should update password for wali_kelas user', async () => {
      // Create wali_kelas user
      const userResult = await db.insert(usersTable)
        .values({
          username: 'pak_guru',
          password_hash: hashPassword('oldgurupass'),
          role: 'wali_kelas'
        })
        .returning()
        .execute();

      const userId = userResult[0].id;

      const result = await resetPassword(userId, 'newgurupass');

      expect(result).toBe(true);

      // Verify the password was actually changed
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      expect(users[0].password_hash).toBe(hashPassword('newgurupass'));
    });

    it('should handle password reset after successful login', async () => {
      // Create user and login first
      const hashedPassword = hashPassword('originalpass');
      const userResult = await db.insert(usersTable)
        .values({
          username: 'testuser',
          password_hash: hashedPassword,
          role: 'admin_sekolah'
        })
        .returning()
        .execute();

      const userId = userResult[0].id;

      // Verify original login works
      const loginInput: LoginInput = {
        username: 'testuser',
        password: 'originalpass'
      };

      const loginResult1 = await login(loginInput);
      expect(loginResult1).not.toBeNull();

      // Reset password
      const resetResult = await resetPassword(userId, 'newpassword123');
      expect(resetResult).toBe(true);

      // Verify old password no longer works
      const loginResult2 = await login(loginInput);
      expect(loginResult2).toBeNull();

      // Verify new password works
      const newLoginInput: LoginInput = {
        username: 'testuser',
        password: 'newpassword123'
      };

      const loginResult3 = await login(newLoginInput);
      expect(loginResult3).not.toBeNull();
      expect(loginResult3!.username).toBe('testuser');
    });
  });
});