import { db } from '../db';
import { kelasTable, guruTable } from '../db/schema';
import { type CreateKelasInput, type Kelas } from '../schema';
import { eq } from 'drizzle-orm';

export const createKelas = async (input: CreateKelasInput): Promise<Kelas> => {
  try {
    // Verify that the wali_kelas exists
    const waliKelas = await db.select()
      .from(guruTable)
      .where(eq(guruTable.id, input.wali_kelas_id))
      .execute();

    if (waliKelas.length === 0) {
      throw new Error(`Guru with ID ${input.wali_kelas_id} not found`);
    }

    // Insert kelas record
    const result = await db.insert(kelasTable)
      .values({
        nama_kelas: input.nama_kelas,
        tingkat: input.tingkat,
        wali_kelas_id: input.wali_kelas_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Kelas creation failed:', error);
    throw error;
  }
};

export const getKelas = async (): Promise<Kelas[]> => {
  try {
    const results = await db.select()
      .from(kelasTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Get kelas failed:', error);
    throw error;
  }
};

export const getKelasByWaliKelas = async (waliKelasId: number): Promise<Kelas[]> => {
  try {
    const results = await db.select()
      .from(kelasTable)
      .where(eq(kelasTable.wali_kelas_id, waliKelasId))
      .execute();

    return results;
  } catch (error) {
    console.error('Get kelas by wali kelas failed:', error);
    throw error;
  }
};

export const updateKelas = async (id: number, input: Partial<CreateKelasInput>): Promise<Kelas | null> => {
  try {
    // If wali_kelas_id is being updated, verify the guru exists
    if (input.wali_kelas_id) {
      const waliKelas = await db.select()
        .from(guruTable)
        .where(eq(guruTable.id, input.wali_kelas_id))
        .execute();

      if (waliKelas.length === 0) {
        throw new Error(`Guru with ID ${input.wali_kelas_id} not found`);
      }
    }

    const result = await db.update(kelasTable)
      .set(input)
      .where(eq(kelasTable.id, id))
      .returning()
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Update kelas failed:', error);
    throw error;
  }
};

export const deleteKelas = async (id: number): Promise<boolean> => {
  try {
    const result = await db.delete(kelasTable)
      .where(eq(kelasTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Delete kelas failed:', error);
    throw error;
  }
};