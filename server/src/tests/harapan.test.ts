import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, guruTable, kelasTable, siswaTable, harapanSiswaTable } from '../db/schema';
import { type CreateHarapanSiswaInput } from '../schema';
import { 
  createHarapanSiswa, 
  getHarapanSiswa, 
  getHarapanBySiswa, 
  getHarapanByWaliKelas, 
  deleteHarapanSiswa 
} from '../handlers/harapan';
import { eq } from 'drizzle-orm';

// Test setup data
let testUserId: number;
let testGuruId: number;
let testKelasId: number;
let testSiswaId: number;
let testUser2Id: number;
let testSiswa2Id: number;

const testInput: CreateHarapanSiswaInput = {
  siswa_id: 0, // Will be set in beforeEach
  isi_harapan: 'Saya ingin menjadi dokter untuk membantu orang lain'
};

describe('Harapan Siswa Handlers', () => {
  beforeEach(async () => {
    await createDB();

    // Create test user for guru
    const users = await db.insert(usersTable)
      .values({
        username: 'testguru',
        password_hash: 'hashed_password',
        role: 'wali_kelas'
      })
      .returning()
      .execute();
    testUserId = users[0].id;

    // Create test guru
    const gurus = await db.insert(guruTable)
      .values({
        nama_guru: 'Test Guru',
        nip_nik: '123456789',
        nomor_hp: '081234567890',
        email: 'guru@test.com',
        status: 'aktif',
        user_id: testUserId
      })
      .returning()
      .execute();
    testGuruId = gurus[0].id;

    // Create test kelas
    const kelas = await db.insert(kelasTable)
      .values({
        nama_kelas: '10A',
        tingkat: '10',
        wali_kelas_id: testGuruId
      })
      .returning()
      .execute();
    testKelasId = kelas[0].id;

    // Create test user for siswa
    const siswaUsers = await db.insert(usersTable)
      .values({
        username: 'testsiswa',
        password_hash: 'hashed_password',
        role: 'siswa'
      })
      .returning()
      .execute();
    testUser2Id = siswaUsers[0].id;

    // Create test siswa
    const siswa = await db.insert(siswaTable)
      .values({
        nama_siswa: 'Test Siswa',
        nisn: '1234567890',
        nis: '123456',
        tanggal_lahir: '2005-01-01',
        nomor_hp: '082345678901',
        email: 'siswa@test.com',
        kelas_id: testKelasId,
        status: 'aktif',
        user_id: testUser2Id
      })
      .returning()
      .execute();
    testSiswaId = siswa[0].id;

    // Create second siswa for testing multiple students
    const siswaUsers2 = await db.insert(usersTable)
      .values({
        username: 'testsiswa2',
        password_hash: 'hashed_password',
        role: 'siswa'
      })
      .returning()
      .execute();

    const siswa2 = await db.insert(siswaTable)
      .values({
        nama_siswa: 'Test Siswa 2',
        nisn: '1234567891',
        nis: '123457',
        tanggal_lahir: '2005-02-01',
        nomor_hp: '082345678902',
        email: 'siswa2@test.com',
        kelas_id: testKelasId,
        status: 'aktif',
        user_id: siswaUsers2[0].id
      })
      .returning()
      .execute();
    testSiswa2Id = siswa2[0].id;

    // Update test input with valid siswa_id
    testInput.siswa_id = testSiswaId;
  });

  afterEach(resetDB);

  describe('createHarapanSiswa', () => {
    it('should create a harapan siswa', async () => {
      const result = await createHarapanSiswa(testInput);

      expect(result.siswa_id).toEqual(testSiswaId);
      expect(result.isi_harapan).toEqual(testInput.isi_harapan);
      expect(result.id).toBeDefined();
      expect(result.tanggal_harapan).toBeInstanceOf(Date);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save harapan to database', async () => {
      const result = await createHarapanSiswa(testInput);

      const harapans = await db.select()
        .from(harapanSiswaTable)
        .where(eq(harapanSiswaTable.id, result.id))
        .execute();

      expect(harapans).toHaveLength(1);
      expect(harapans[0].siswa_id).toEqual(testSiswaId);
      expect(harapans[0].isi_harapan).toEqual(testInput.isi_harapan);
      expect(harapans[0].tanggal_harapan).toBeInstanceOf(Date);
      expect(harapans[0].created_at).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent siswa', async () => {
      const invalidInput = {
        ...testInput,
        siswa_id: 99999
      };

      expect(createHarapanSiswa(invalidInput)).rejects.toThrow(/not found/i);
    });
  });

  describe('getHarapanSiswa', () => {
    it('should return empty array when no harapan exists', async () => {
      const result = await getHarapanSiswa();
      expect(result).toEqual([]);
    });

    it('should return all harapan siswa', async () => {
      // Create multiple harapan
      await createHarapanSiswa(testInput);
      await createHarapanSiswa({
        siswa_id: testSiswa2Id,
        isi_harapan: 'Saya ingin menjadi guru yang inspiratif'
      });

      const result = await getHarapanSiswa();

      expect(result).toHaveLength(2);
      expect(result[0].siswa_id).toBeDefined();
      expect(result[0].isi_harapan).toBeDefined();
      expect(result[0].tanggal_harapan).toBeInstanceOf(Date);
      expect(result[1].siswa_id).toBeDefined();
      expect(result[1].isi_harapan).toBeDefined();
      expect(result[1].tanggal_harapan).toBeInstanceOf(Date);
    });

    it('should return harapan ordered by tanggal_harapan desc', async () => {
      // Create first harapan
      const harapan1 = await createHarapanSiswa(testInput);
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Create second harapan
      const harapan2 = await createHarapanSiswa({
        siswa_id: testSiswa2Id,
        isi_harapan: 'Saya ingin menjadi engineer'
      });

      const result = await getHarapanSiswa();

      expect(result).toHaveLength(2);
      // More recent harapan should come first
      expect(result[0].tanggal_harapan >= result[1].tanggal_harapan).toBe(true);
    });
  });

  describe('getHarapanBySiswa', () => {
    it('should return empty array for siswa with no harapan', async () => {
      const result = await getHarapanBySiswa(testSiswaId);
      expect(result).toEqual([]);
    });

    it('should return harapan for specific siswa', async () => {
      // Create harapan for first siswa
      await createHarapanSiswa(testInput);
      await createHarapanSiswa({
        siswa_id: testSiswaId,
        isi_harapan: 'Harapan kedua saya adalah menjadi peneliti'
      });

      // Create harapan for second siswa
      await createHarapanSiswa({
        siswa_id: testSiswa2Id,
        isi_harapan: 'Saya ingin menjadi pengusaha'
      });

      const result = await getHarapanBySiswa(testSiswaId);

      expect(result).toHaveLength(2);
      result.forEach(harapan => {
        expect(harapan.siswa_id).toEqual(testSiswaId);
        expect(harapan.isi_harapan).toBeDefined();
        expect(harapan.tanggal_harapan).toBeInstanceOf(Date);
      });
    });

    it('should return harapan ordered by tanggal_harapan desc', async () => {
      // Create first harapan
      await createHarapanSiswa(testInput);
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Create second harapan for same siswa
      await createHarapanSiswa({
        siswa_id: testSiswaId,
        isi_harapan: 'Harapan terbaru saya'
      });

      const result = await getHarapanBySiswa(testSiswaId);

      expect(result).toHaveLength(2);
      // More recent harapan should come first
      expect(result[0].tanggal_harapan >= result[1].tanggal_harapan).toBe(true);
    });
  });

  describe('getHarapanByWaliKelas', () => {
    it('should return empty array when no students have harapan', async () => {
      const result = await getHarapanByWaliKelas(testGuruId);
      expect(result).toEqual([]);
    });

    it('should return harapan from students under wali kelas', async () => {
      // Create harapan for students in the class
      await createHarapanSiswa(testInput);
      await createHarapanSiswa({
        siswa_id: testSiswa2Id,
        isi_harapan: 'Saya ingin menjadi insinyur'
      });

      const result = await getHarapanByWaliKelas(testGuruId);

      expect(result).toHaveLength(2);
      result.forEach(harapan => {
        expect(harapan.siswa_id).toBeDefined();
        expect(harapan.isi_harapan).toBeDefined();
        expect(harapan.tanggal_harapan).toBeInstanceOf(Date);
        expect(harapan.created_at).toBeInstanceOf(Date);
        expect(harapan.id).toBeDefined();
      });
    });

    it('should only return harapan from students in wali kelas classes', async () => {
      // Create another guru and kelas
      const user2 = await db.insert(usersTable)
        .values({
          username: 'testguru2',
          password_hash: 'hashed_password',
          role: 'wali_kelas'
        })
        .returning()
        .execute();

      const guru2 = await db.insert(guruTable)
        .values({
          nama_guru: 'Test Guru 2',
          nip_nik: '987654321',
          status: 'aktif',
          user_id: user2[0].id
        })
        .returning()
        .execute();

      const kelas2 = await db.insert(kelasTable)
        .values({
          nama_kelas: '10B',
          tingkat: '10',
          wali_kelas_id: guru2[0].id
        })
        .returning()
        .execute();

      // Create siswa in different class
      const userSiswa3 = await db.insert(usersTable)
        .values({
          username: 'testsiswa3',
          password_hash: 'hashed_password',
          role: 'siswa'
        })
        .returning()
        .execute();

      const siswa3 = await db.insert(siswaTable)
        .values({
          nama_siswa: 'Test Siswa 3',
          nisn: '1234567892',
          nis: '123458',
          tanggal_lahir: '2005-03-01',
          kelas_id: kelas2[0].id,
          status: 'aktif',
          user_id: userSiswa3[0].id
        })
        .returning()
        .execute();

      // Create harapan for students in first class
      await createHarapanSiswa(testInput);
      
      // Create harapan for student in second class
      await createHarapanSiswa({
        siswa_id: siswa3[0].id,
        isi_harapan: 'Harapan dari kelas lain'
      });

      const result = await getHarapanByWaliKelas(testGuruId);

      expect(result).toHaveLength(1);
      expect(result[0].siswa_id).toEqual(testSiswaId);
    });

    it('should return harapan ordered by tanggal_harapan desc', async () => {
      // Create first harapan
      await createHarapanSiswa(testInput);
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Create second harapan
      await createHarapanSiswa({
        siswa_id: testSiswa2Id,
        isi_harapan: 'Harapan yang lebih baru'
      });

      const result = await getHarapanByWaliKelas(testGuruId);

      expect(result).toHaveLength(2);
      // More recent harapan should come first
      expect(result[0].tanggal_harapan >= result[1].tanggal_harapan).toBe(true);
    });
  });

  describe('deleteHarapanSiswa', () => {
    it('should delete existing harapan', async () => {
      const harapan = await createHarapanSiswa(testInput);

      const result = await deleteHarapanSiswa(harapan.id);
      expect(result).toBe(true);

      // Verify harapan is deleted
      const harapans = await db.select()
        .from(harapanSiswaTable)
        .where(eq(harapanSiswaTable.id, harapan.id))
        .execute();

      expect(harapans).toHaveLength(0);
    });

    it('should throw error for non-existent harapan', async () => {
      expect(deleteHarapanSiswa(99999)).rejects.toThrow(/not found/i);
    });

    it('should not affect other harapan when deleting one', async () => {
      const harapan1 = await createHarapanSiswa(testInput);
      const harapan2 = await createHarapanSiswa({
        siswa_id: testSiswa2Id,
        isi_harapan: 'Harapan siswa lain'
      });

      await deleteHarapanSiswa(harapan1.id);

      // Verify only the target harapan is deleted
      const remainingHarapans = await db.select()
        .from(harapanSiswaTable)
        .execute();

      expect(remainingHarapans).toHaveLength(1);
      expect(remainingHarapans[0].id).toEqual(harapan2.id);
    });
  });
});