import { db } from '../db';
import { siswaTable, usersTable, kelasTable } from '../db/schema';
import { type CreateSiswaInput, type Siswa, type SiswaWithDetails } from '../schema';
import { eq } from 'drizzle-orm';

export async function createSiswa(input: CreateSiswaInput): Promise<Siswa> {
  try {
    // Verify that the referenced user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();
    
    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Verify that the referenced kelas exists
    const kelas = await db.select()
      .from(kelasTable)
      .where(eq(kelasTable.id, input.kelas_id))
      .execute();
    
    if (kelas.length === 0) {
      throw new Error(`Kelas with id ${input.kelas_id} does not exist`);
    }

    // Insert student record
    const result = await db.insert(siswaTable)
      .values({
        nama_siswa: input.nama_siswa,
        nisn: input.nisn,
        nis: input.nis,
        tanggal_lahir: input.tanggal_lahir.toISOString().split('T')[0], // Convert Date to string
        nomor_hp: input.nomor_hp,
        email: input.email,
        kelas_id: input.kelas_id,
        status: input.status,
        user_id: input.user_id
      })
      .returning()
      .execute();

    // Convert date string back to Date for response
    const siswa = result[0];
    return {
      ...siswa,
      tanggal_lahir: new Date(siswa.tanggal_lahir) // Convert string back to Date
    };
  } catch (error) {
    console.error('Siswa creation failed:', error);
    throw error;
  }
}

export async function getSiswa(): Promise<SiswaWithDetails[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to fetch all student data with class details
    // Should return list of students with their kelas info, total tabungan, and transaction count
    
    return Promise.resolve([]);
}

export async function getSiswaByKelas(kelasId: number): Promise<SiswaWithDetails[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to fetch students by class ID
    // Should return students in specific class with their savings details
    
    return Promise.resolve([]);
}

export async function getSiswaByWaliKelas(waliKelasId: number): Promise<SiswaWithDetails[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to fetch students managed by specific wali kelas
    // Should return students from classes managed by the wali kelas
    
    return Promise.resolve([]);
}

export async function getSiswaById(id: number): Promise<SiswaWithDetails | null> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to fetch student by ID with complete details
    // Should return specific student data with class and savings info
    
    return Promise.resolve(null);
}

export async function updateSiswa(id: number, input: Partial<CreateSiswaInput>): Promise<Siswa | null> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to update existing student data
    // Should update specific student record in database
    
    return Promise.resolve(null);
}

export async function deleteSiswa(id: number): Promise<boolean> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to delete student data entry
    // Should remove student record from database
    
    return Promise.resolve(true);
}