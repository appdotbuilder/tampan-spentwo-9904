import { db } from '../db';
import { guruTable, usersTable } from '../db/schema';
import { type CreateGuruInput, type Guru } from '../schema';
import { eq } from 'drizzle-orm';

export const createGuru = async (input: CreateGuruInput): Promise<Guru> => {
  try {
    // Verify that the user_id exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Insert guru record
    const result = await db.insert(guruTable)
      .values({
        nama_guru: input.nama_guru,
        nip_nik: input.nip_nik,
        nomor_hp: input.nomor_hp,
        email: input.email,
        status: input.status,
        user_id: input.user_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Guru creation failed:', error);
    throw error;
  }
};

export const getGuru = async (): Promise<Guru[]> => {
  try {
    const results = await db.select()
      .from(guruTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch guru data:', error);
    throw error;
  }
};

export const getGuruById = async (id: number): Promise<Guru | null> => {
  try {
    const results = await db.select()
      .from(guruTable)
      .where(eq(guruTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch guru by id:', error);
    throw error;
  }
};

export const updateGuru = async (id: number, input: Partial<CreateGuruInput>): Promise<Guru | null> => {
  try {
    // Verify guru exists
    const existingGuru = await getGuruById(id);
    if (!existingGuru) {
      return null;
    }

    // If user_id is being updated, verify it exists
    if (input.user_id) {
      const user = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.user_id))
        .execute();

      if (user.length === 0) {
        throw new Error(`User with id ${input.user_id} not found`);
      }
    }

    // Update guru record
    const result = await db.update(guruTable)
      .set(input)
      .where(eq(guruTable.id, id))
      .returning()
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Guru update failed:', error);
    throw error;
  }
};

export const deleteGuru = async (id: number): Promise<boolean> => {
  try {
    // Verify guru exists
    const existingGuru = await getGuruById(id);
    if (!existingGuru) {
      return false;
    }

    // Delete guru record
    const result = await db.delete(guruTable)
      .where(eq(guruTable.id, id))
      .execute();

    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Guru deletion failed:', error);
    throw error;
  }
};