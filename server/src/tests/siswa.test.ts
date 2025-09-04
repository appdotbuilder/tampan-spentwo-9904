import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { siswaTable, usersTable, kelasTable, guruTable } from '../db/schema';
import { type CreateSiswaInput } from '../schema';
import { createSiswa } from '../handlers/siswa';
import { eq } from 'drizzle-orm';

describe('createSiswa', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  const createPrerequisiteData = async () => {
    // Create a user for siswa
    const userResult = await db.insert(usersTable)
      .values({
        username: 'student_user',
        password_hash: 'hashed_password',
        role: 'siswa'
      })
      .returning()
      .execute();

    // Create a user for guru (wali kelas)
    const guruUserResult = await db.insert(usersTable)
      .values({
        username: 'guru_user',
        password_hash: 'hashed_password',
        role: 'wali_kelas'
      })
      .returning()
      .execute();

    // Create a guru to be wali kelas
    const guruResult = await db.insert(guruTable)
      .values({
        nama_guru: 'Pak Guru',
        nip_nik: '123456789',
        nomor_hp: '081234567890',
        email: 'guru@school.com',
        status: 'aktif',
        user_id: guruUserResult[0].id
      })
      .returning()
      .execute();

    // Create a kelas
    const kelasResult = await db.insert(kelasTable)
      .values({
        nama_kelas: '7A',
        tingkat: '7',
        wali_kelas_id: guruResult[0].id
      })
      .returning()
      .execute();

    return {
      user_id: userResult[0].id,
      kelas_id: kelasResult[0].id
    };
  };

  const createTestInput = (user_id: number, kelas_id: number): CreateSiswaInput => ({
    nama_siswa: 'Ahmad Budi Santoso',
    nisn: '1234567890',
    nis: '2024001',
    tanggal_lahir: new Date('2010-05-15'),
    nomor_hp: '081234567890',
    email: 'ahmad.budi@email.com',
    kelas_id: kelas_id,
    status: 'aktif',
    user_id: user_id
  });

  it('should create a siswa with all fields', async () => {
    const { user_id, kelas_id } = await createPrerequisiteData();
    const testInput = createTestInput(user_id, kelas_id);

    const result = await createSiswa(testInput);

    // Basic field validation
    expect(result.nama_siswa).toEqual('Ahmad Budi Santoso');
    expect(result.nisn).toEqual('1234567890');
    expect(result.nis).toEqual('2024001');
    expect(result.tanggal_lahir).toBeInstanceOf(Date);
    expect(result.tanggal_lahir.toISOString().split('T')[0]).toEqual('2010-05-15');
    expect(result.nomor_hp).toEqual('081234567890');
    expect(result.email).toEqual('ahmad.budi@email.com');
    expect(result.kelas_id).toEqual(kelas_id);
    expect(result.status).toEqual('aktif');
    expect(result.user_id).toEqual(user_id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save siswa to database correctly', async () => {
    const { user_id, kelas_id } = await createPrerequisiteData();
    const testInput = createTestInput(user_id, kelas_id);

    const result = await createSiswa(testInput);

    // Query database to verify saved data
    const siswaInDb = await db.select()
      .from(siswaTable)
      .where(eq(siswaTable.id, result.id))
      .execute();

    expect(siswaInDb).toHaveLength(1);
    expect(siswaInDb[0].nama_siswa).toEqual('Ahmad Budi Santoso');
    expect(siswaInDb[0].nisn).toEqual('1234567890');
    expect(siswaInDb[0].nis).toEqual('2024001');
    expect(siswaInDb[0].tanggal_lahir).toEqual('2010-05-15');
    expect(siswaInDb[0].nomor_hp).toEqual('081234567890');
    expect(siswaInDb[0].email).toEqual('ahmad.budi@email.com');
    expect(siswaInDb[0].kelas_id).toEqual(kelas_id);
    expect(siswaInDb[0].status).toEqual('aktif');
    expect(siswaInDb[0].user_id).toEqual(user_id);
    expect(siswaInDb[0].created_at).toBeInstanceOf(Date);
  });

  it('should create siswa with nullable fields as null', async () => {
    const { user_id, kelas_id } = await createPrerequisiteData();
    const testInput: CreateSiswaInput = {
      nama_siswa: 'Siti Nurhaliza',
      nisn: '9876543210',
      nis: '2024002',
      tanggal_lahir: new Date('2011-03-20'),
      nomor_hp: null,
      email: null,
      kelas_id: kelas_id,
      status: 'aktif',
      user_id: user_id
    };

    const result = await createSiswa(testInput);

    expect(result.nama_siswa).toEqual('Siti Nurhaliza');
    expect(result.nomor_hp).toBeNull();
    expect(result.email).toBeNull();
    expect(result.kelas_id).toEqual(kelas_id);
    expect(result.status).toEqual('aktif');
    expect(result.user_id).toEqual(user_id);
  });

  it('should create siswa with different status values', async () => {
    const { user_id, kelas_id } = await createPrerequisiteData();
    const testInput = createTestInput(user_id, kelas_id);
    testInput.status = 'lulus';

    const result = await createSiswa(testInput);

    expect(result.status).toEqual('lulus');

    // Verify in database
    const siswaInDb = await db.select()
      .from(siswaTable)
      .where(eq(siswaTable.id, result.id))
      .execute();

    expect(siswaInDb[0].status).toEqual('lulus');
  });

  it('should throw error when user_id does not exist', async () => {
    const { kelas_id } = await createPrerequisiteData();
    const testInput = createTestInput(999, kelas_id); // Non-existent user_id

    await expect(createSiswa(testInput)).rejects.toThrow(/User with id 999 does not exist/i);
  });

  it('should throw error when kelas_id does not exist', async () => {
    const { user_id } = await createPrerequisiteData();
    const testInput = createTestInput(user_id, 999); // Non-existent kelas_id

    await expect(createSiswa(testInput)).rejects.toThrow(/Kelas with id 999 does not exist/i);
  });

  it('should handle date conversion correctly', async () => {
    const { user_id, kelas_id } = await createPrerequisiteData();
    const testInput = createTestInput(user_id, kelas_id);
    testInput.tanggal_lahir = new Date('2009-12-25');

    const result = await createSiswa(testInput);

    expect(result.tanggal_lahir).toBeInstanceOf(Date);
    expect(result.tanggal_lahir.getFullYear()).toEqual(2009);
    expect(result.tanggal_lahir.getMonth()).toEqual(11); // December is month 11
    expect(result.tanggal_lahir.getDate()).toEqual(25);
  });

  it('should create multiple siswa in same kelas', async () => {
    const { user_id, kelas_id } = await createPrerequisiteData();
    
    // Create another user for second siswa
    const secondUserResult = await db.insert(usersTable)
      .values({
        username: 'student_user2',
        password_hash: 'hashed_password',
        role: 'siswa'
      })
      .returning()
      .execute();

    const firstInput = createTestInput(user_id, kelas_id);
    const secondInput = createTestInput(secondUserResult[0].id, kelas_id);
    secondInput.nama_siswa = 'Budi Ahmad';
    secondInput.nisn = '0987654321';
    secondInput.nis = '2024003';

    const firstResult = await createSiswa(firstInput);
    const secondResult = await createSiswa(secondInput);

    expect(firstResult.kelas_id).toEqual(kelas_id);
    expect(secondResult.kelas_id).toEqual(kelas_id);
    expect(firstResult.id).not.toEqual(secondResult.id);

    // Verify both are saved in database
    const siswaInDb = await db.select()
      .from(siswaTable)
      .where(eq(siswaTable.kelas_id, kelas_id))
      .execute();

    expect(siswaInDb).toHaveLength(2);
  });
});