import { db } from '../db';
import { bankTable, jenisRekeningTable, rekeningSiswaTable, siswaTable } from '../db/schema';
import { type CreateBankInput, type Bank, type CreateJenisRekeningInput, type JenisRekening, type CreateRekeningSiswaInput, type RekeningSiswa } from '../schema';
import { eq } from 'drizzle-orm';

export async function createBank(input: CreateBankInput): Promise<Bank> {
  try {
    const result = await db.insert(bankTable)
      .values({
        nama_bank: input.nama_bank
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Bank creation failed:', error);
    throw error;
  }
}

export async function getBanks(): Promise<Bank[]> {
  try {
    const results = await db.select()
      .from(bankTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch banks:', error);
    throw error;
  }
}

export async function createJenisRekening(input: CreateJenisRekeningInput): Promise<JenisRekening> {
  try {
    const result = await db.insert(jenisRekeningTable)
      .values({
        nama_jenis_rekening: input.nama_jenis_rekening
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Jenis Rekening creation failed:', error);
    throw error;
  }
}

export async function getJenisRekening(): Promise<JenisRekening[]> {
  try {
    const results = await db.select()
      .from(jenisRekeningTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch jenis rekening:', error);
    throw error;
  }
}

export async function createRekeningSiswa(input: CreateRekeningSiswaInput): Promise<RekeningSiswa> {
  try {
    // Verify that referenced entities exist
    const [siswaExists, bankExists, jenisRekeningExists] = await Promise.all([
      db.select({ id: siswaTable.id })
        .from(siswaTable)
        .where(eq(siswaTable.id, input.siswa_id))
        .execute(),
      db.select({ id: bankTable.id })
        .from(bankTable)
        .where(eq(bankTable.id, input.bank_id))
        .execute(),
      db.select({ id: jenisRekeningTable.id })
        .from(jenisRekeningTable)
        .where(eq(jenisRekeningTable.id, input.jenis_rekening_id))
        .execute()
    ]);

    if (siswaExists.length === 0) {
      throw new Error(`Siswa with id ${input.siswa_id} not found`);
    }
    if (bankExists.length === 0) {
      throw new Error(`Bank with id ${input.bank_id} not found`);
    }
    if (jenisRekeningExists.length === 0) {
      throw new Error(`Jenis Rekening with id ${input.jenis_rekening_id} not found`);
    }

    const result = await db.insert(rekeningSiswaTable)
      .values({
        siswa_id: input.siswa_id,
        bank_id: input.bank_id,
        jenis_rekening_id: input.jenis_rekening_id,
        nomor_rekening: input.nomor_rekening
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Rekening Siswa creation failed:', error);
    throw error;
  }
}

export async function getRekeningSiswa(): Promise<RekeningSiswa[]> {
  try {
    const results = await db.select()
      .from(rekeningSiswaTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch rekening siswa:', error);
    throw error;
  }
}