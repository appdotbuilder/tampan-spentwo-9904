import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser, getUsers, getUserById } from '../handlers/users';
import { eq } from 'drizzle-orm';

// Test input data
const testUserInput: CreateUserInput = {
  username: 'test_user',
  password: 'password123',
  role: 'siswa'
};

const testAdminInput: CreateUserInput = {
  username: 'admin_test',
  password: 'admin123',
  role: 'admin_sekolah'
};

const testGuruInput: CreateUserInput = {
  username: 'guru_test',
  password: 'guru123',
  role: 'wali_kelas'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with siswa role', async () => {
    const result = await createUser(testUserInput);

    // Verify returned user data
    expect(result.username).toEqual('test_user');
    expect(result.role).toEqual('siswa');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.password_hash).toContain('hashed_');
    expect(result.password_hash).not.toEqual('password123'); // Password should be hashed
  });

  it('should create a user with admin_sekolah role', async () => {
    const result = await createUser(testAdminInput);

    expect(result.username).toEqual('admin_test');
    expect(result.role).toEqual('admin_sekolah');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a user with wali_kelas role', async () => {
    const result = await createUser(testGuruInput);

    expect(result.username).toEqual('guru_test');
    expect(result.role).toEqual('wali_kelas');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testUserInput);

    // Query database directly to verify the user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('test_user');
    expect(users[0].role).toEqual('siswa');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].password_hash).toContain('hashed_');
  });

  it('should fail when creating user with duplicate username', async () => {
    // Create first user
    await createUser(testUserInput);

    // Attempt to create second user with same username
    const duplicateInput: CreateUserInput = {
      username: 'test_user', // Same username
      password: 'different123',
      role: 'admin_sekolah'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow();
  });

  it('should hash different passwords differently', async () => {
    const input1: CreateUserInput = {
      username: 'user1',
      password: 'password1',
      role: 'siswa'
    };

    const input2: CreateUserInput = {
      username: 'user2',
      password: 'password2',
      role: 'siswa'
    };

    const user1 = await createUser(input1);
    const user2 = await createUser(input2);

    expect(user1.password_hash).not.toEqual(user2.password_hash);
    expect(user1.password_hash).toContain('hashed_');
    expect(user2.password_hash).toContain('hashed_');
  });
});

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();

    expect(result).toEqual([]);
  });

  it('should return all users when users exist', async () => {
    // Create multiple users
    await createUser(testUserInput);
    await createUser(testAdminInput);
    await createUser(testGuruInput);

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Verify users are returned with correct data
    const usernames = result.map(user => user.username);
    expect(usernames).toContain('test_user');
    expect(usernames).toContain('admin_test');
    expect(usernames).toContain('guru_test');

    // Verify all users have required fields
    result.forEach(user => {
      expect(user.id).toBeDefined();
      expect(user.username).toBeDefined();
      expect(user.role).toBeDefined();
      expect(user.password_hash).toBeDefined();
      expect(user.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return users with different roles', async () => {
    await createUser(testUserInput);
    await createUser(testAdminInput);
    await createUser(testGuruInput);

    const result = await getUsers();

    const roles = result.map(user => user.role);
    expect(roles).toContain('siswa');
    expect(roles).toContain('admin_sekolah');
    expect(roles).toContain('wali_kelas');
  });

  it('should maintain user creation order', async () => {
    const user1 = await createUser(testUserInput);
    const user2 = await createUser(testAdminInput);

    const result = await getUsers();

    expect(result).toHaveLength(2);
    expect(result[0].id).toEqual(user1.id);
    expect(result[1].id).toEqual(user2.id);
  });
});

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when user does not exist', async () => {
    const result = await getUserById(999);

    expect(result).toBeNull();
  });

  it('should return user when user exists', async () => {
    const createdUser = await createUser(testUserInput);

    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.username).toEqual('test_user');
    expect(result!.role).toEqual('siswa');
    expect(result!.password_hash).toContain('hashed_');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return correct user when multiple users exist', async () => {
    const user1 = await createUser(testUserInput);
    const user2 = await createUser(testAdminInput);
    const user3 = await createUser(testGuruInput);

    // Test getting each user by ID
    const result1 = await getUserById(user1.id);
    const result2 = await getUserById(user2.id);
    const result3 = await getUserById(user3.id);

    expect(result1!.username).toEqual('test_user');
    expect(result1!.role).toEqual('siswa');
    
    expect(result2!.username).toEqual('admin_test');
    expect(result2!.role).toEqual('admin_sekolah');
    
    expect(result3!.username).toEqual('guru_test');
    expect(result3!.role).toEqual('wali_kelas');
  });

  it('should return user with all required fields', async () => {
    const createdUser = await createUser(testUserInput);

    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(typeof result!.id).toEqual('number');
    expect(typeof result!.username).toEqual('string');
    expect(typeof result!.password_hash).toEqual('string');
    expect(typeof result!.role).toEqual('string');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should handle non-existent ID gracefully', async () => {
    // Create a user to ensure database is working
    await createUser(testUserInput);

    // Try to get non-existent user
    const result = await getUserById(-1);

    expect(result).toBeNull();
  });
});