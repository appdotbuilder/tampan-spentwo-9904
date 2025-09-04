import { db } from '../db';
import { harapanSiswaTable, siswaTable, kelasTable, guruTable } from '../db/schema';
import { type CreateHarapanSiswaInput, type HarapanSiswa } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function createHarapanSiswa(input: CreateHarapanSiswaInput): Promise<HarapanSiswa> {
  try {
    // Verify siswa exists
    const siswa = await db.select()
      .from(siswaTable)
      .where(eq(siswaTable.id, input.siswa_id))
      .execute();

    if (siswa.length === 0) {
      throw new Error(`Siswa with ID ${input.siswa_id} not found`);
    }

    // Insert harapan siswa record
    const result = await db.insert(harapanSiswaTable)
      .values({
        siswa_id: input.siswa_id,
        isi_harapan: input.isi_harapan
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Create harapan siswa failed:', error);
    throw error;
  }
}

export async function getHarapanSiswa(): Promise<HarapanSiswa[]> {
  try {
    const results = await db.select()
      .from(harapanSiswaTable)
      .orderBy(desc(harapanSiswaTable.tanggal_harapan))
      .execute();

    return results;
  } catch (error) {
    console.error('Get all harapan siswa failed:', error);
    throw error;
  }
}

export async function getHarapanBySiswa(siswaId: number): Promise<HarapanSiswa[]> {
  try {
    const results = await db.select()
      .from(harapanSiswaTable)
      .where(eq(harapanSiswaTable.siswa_id, siswaId))
      .orderBy(desc(harapanSiswaTable.tanggal_harapan))
      .execute();

    return results;
  } catch (error) {
    console.error('Get harapan by siswa failed:', error);
    throw error;
  }
}

export async function getHarapanByWaliKelas(waliKelasId: number): Promise<HarapanSiswa[]> {
  try {
    // Join harapan_siswa with siswa and kelas to get hopes from students under specific wali kelas
    const results = await db.select({
      id: harapanSiswaTable.id,
      siswa_id: harapanSiswaTable.siswa_id,
      isi_harapan: harapanSiswaTable.isi_harapan,
      tanggal_harapan: harapanSiswaTable.tanggal_harapan,
      created_at: harapanSiswaTable.created_at
    })
      .from(harapanSiswaTable)
      .innerJoin(siswaTable, eq(harapanSiswaTable.siswa_id, siswaTable.id))
      .innerJoin(kelasTable, eq(siswaTable.kelas_id, kelasTable.id))
      .where(eq(kelasTable.wali_kelas_id, waliKelasId))
      .orderBy(desc(harapanSiswaTable.tanggal_harapan))
      .execute();

    return results;
  } catch (error) {
    console.error('Get harapan by wali kelas failed:', error);
    throw error;
  }
}

export async function deleteHarapanSiswa(id: number): Promise<boolean> {
  try {
    // Check if harapan exists
    const harapan = await db.select()
      .from(harapanSiswaTable)
      .where(eq(harapanSiswaTable.id, id))
      .execute();

    if (harapan.length === 0) {
      throw new Error(`Harapan siswa with ID ${id} not found`);
    }

    // Delete the harapan
    await db.delete(harapanSiswaTable)
      .where(eq(harapanSiswaTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Delete harapan siswa failed:', error);
    throw error;
  }
}