import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Hash the password (using simple hashing for now)
    const password_hash = await hashPassword(input.password);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        password_hash,
        role: input.role
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};

export const getUsers = async (): Promise<User[]> => {
  try {
    const result = await db.select()
      .from(usersTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};

export const getUserById = async (id: number): Promise<User | null> => {
  try {
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch user by ID:', error);
    throw error;
  }
};

// Simple password hashing function (in production, use bcrypt or similar)
const hashPassword = async (password: string): Promise<string> => {
  // This is a simple implementation for demonstration
  // In production, use a proper library like bcrypt
  return 'hashed_' + password + '_' + Date.now();
};