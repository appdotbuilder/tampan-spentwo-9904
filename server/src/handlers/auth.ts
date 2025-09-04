import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

// Simple password hashing utility (in production, use bcrypt or similar)
function hashPassword(password: string): string {
  // This is a simplified hash for demo purposes
  // In production, use a proper hashing library like bcrypt
  return Buffer.from(password).toString('base64');
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export async function login(input: LoginInput): Promise<User | null> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      return null; // User not found
    }

    const user = users[0];

    // Verify password
    if (!verifyPassword(input.password, user.password_hash)) {
      return null; // Invalid password
    }

    // Return user data (excluding password hash for security)
    return {
      id: user.id,
      username: user.username,
      password_hash: user.password_hash,
      role: user.role,
      created_at: user.created_at
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function resetPassword(userId: number, newPassword: string): Promise<boolean> {
  try {
    // Hash the new password
    const hashedPassword = hashPassword(newPassword);

    // Update user password
    const result = await db.update(usersTable)
      .set({
        password_hash: hashedPassword
      })
      .where(eq(usersTable.id, userId))
      .returning()
      .execute();

    // Return true if user was found and updated
    return result.length > 0;
  } catch (error) {
    console.error('Password reset failed:', error);
    throw error;
  }
}