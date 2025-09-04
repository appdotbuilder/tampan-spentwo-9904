import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  siswaTable, 
  kelasTable, 
  guruTable, 
  badgesSiswaTable,
  transaksiTable 
} from '../db/schema';
import { 
  createBadgesSiswa,
  getBadgesSiswa,
  getBadgesBySiswa,
  checkAndAwardBadges,
  deleteBadgesSiswa
} from '../handlers/badges';
import { type CreateBadgesSiswaInput } from '../schema';
import { eq } from 'drizzle-orm';

describe('badges handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testGuruId: number;
  let testKelasId: number;
  let testSiswaId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashedpassword',
        role: 'siswa'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test guru user
    const guruUserResult = await db.insert(usersTable)
      .values({
        username: 'testguru',
        password_hash: 'hashedpassword',
        role: 'wali_kelas'
      })
      .returning()
      .execute();

    // Create test guru
    const guruResult = await db.insert(guruTable)
      .values({
        nama_guru: 'Test Guru',
        nip_nik: '123456789',
        nomor_hp: '08123456789',
        email: 'guru@test.com',
        status: 'aktif',
        user_id: guruUserResult[0].id
      })
      .returning()
      .execute();
    testGuruId = guruResult[0].id;

    // Create test kelas
    const kelasResult = await db.insert(kelasTable)
      .values({
        nama_kelas: '7A',
        tingkat: '7',
        wali_kelas_id: testGuruId
      })
      .returning()
      .execute();
    testKelasId = kelasResult[0].id;

    // Create test siswa
    const siswaResult = await db.insert(siswaTable)
      .values({
        nama_siswa: 'Test Student',
        nisn: '1234567890',
        nis: '12345',
        tanggal_lahir: '2010-01-01',
        nomor_hp: '08123456789',
        email: 'student@test.com',
        kelas_id: testKelasId,
        status: 'aktif',
        user_id: testUserId
      })
      .returning()
      .execute();
    testSiswaId = siswaResult[0].id;
  });

  describe('createBadgesSiswa', () => {
    const testInput: CreateBadgesSiswaInput = {
      siswa_id: 0, // Will be set in tests
      nama_badge: 'Test Badge'
    };

    it('should create a badge for a student', async () => {
      testInput.siswa_id = testSiswaId;

      const result = await createBadgesSiswa(testInput);

      expect(result.id).toBeDefined();
      expect(result.siswa_id).toEqual(testSiswaId);
      expect(result.nama_badge).toEqual('Test Badge');
      expect(result.tanggal_dapat).toBeInstanceOf(Date);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save badge to database', async () => {
      testInput.siswa_id = testSiswaId;

      const result = await createBadgesSiswa(testInput);

      const savedBadges = await db.select()
        .from(badgesSiswaTable)
        .where(eq(badgesSiswaTable.id, result.id))
        .execute();

      expect(savedBadges).toHaveLength(1);
      expect(savedBadges[0].siswa_id).toEqual(testSiswaId);
      expect(savedBadges[0].nama_badge).toEqual('Test Badge');
    });

    it('should throw error for non-existent student', async () => {
      testInput.siswa_id = 9999; // Non-existent ID

      await expect(createBadgesSiswa(testInput)).rejects.toThrow(/student not found/i);
    });

    it('should throw error for duplicate badge', async () => {
      testInput.siswa_id = testSiswaId;

      // Create first badge
      await createBadgesSiswa(testInput);

      // Try to create same badge again
      await expect(createBadgesSiswa(testInput)).rejects.toThrow(/badge already awarded/i);
    });
  });

  describe('getBadgesSiswa', () => {
    it('should return empty array when no badges exist', async () => {
      const result = await getBadgesSiswa();

      expect(result).toEqual([]);
    });

    it('should return all badges', async () => {
      // Create test badges
      await createBadgesSiswa({
        siswa_id: testSiswaId,
        nama_badge: 'Badge 1'
      });

      await createBadgesSiswa({
        siswa_id: testSiswaId,
        nama_badge: 'Badge 2'
      });

      const result = await getBadgesSiswa();

      expect(result).toHaveLength(2);
      expect(result[0].nama_badge).toEqual('Badge 1');
      expect(result[1].nama_badge).toEqual('Badge 2');
    });
  });

  describe('getBadgesBySiswa', () => {
    it('should return empty array when student has no badges', async () => {
      const result = await getBadgesBySiswa(testSiswaId);

      expect(result).toEqual([]);
    });

    it('should return badges for specific student', async () => {
      // Create badges for test student
      await createBadgesSiswa({
        siswa_id: testSiswaId,
        nama_badge: 'Student Badge 1'
      });

      await createBadgesSiswa({
        siswa_id: testSiswaId,
        nama_badge: 'Student Badge 2'
      });

      const result = await getBadgesBySiswa(testSiswaId);

      expect(result).toHaveLength(2);
      expect(result.every(badge => badge.siswa_id === testSiswaId)).toBe(true);
      expect(result.map(b => b.nama_badge)).toContain('Student Badge 1');
      expect(result.map(b => b.nama_badge)).toContain('Student Badge 2');
    });

    it('should throw error for non-existent student', async () => {
      await expect(getBadgesBySiswa(9999)).rejects.toThrow(/student not found/i);
    });
  });

  describe('checkAndAwardBadges', () => {
    it('should award "Penabung Pemula" badge for first transaction', async () => {
      // Create a verified transaction
      await db.insert(transaksiTable)
        .values({
          siswa_id: testSiswaId,
          tanggal_transaksi: new Date(),
          jumlah: '10000',
          jenis_transaksi: 'menabung',
          status_verifikasi: 'terverifikasi'
        })
        .execute();

      const newBadges = await checkAndAwardBadges(testSiswaId);

      expect(newBadges).toHaveLength(2); // Penabung Pemula + Tabungan 10K
      expect(newBadges.map(b => b.nama_badge)).toContain('Penabung Pemula');
      expect(newBadges.map(b => b.nama_badge)).toContain('Tabungan 10K');
    });

    it('should award multiple badges based on transaction count and amount', async () => {
      // Create multiple verified transactions
      for (let i = 0; i < 5; i++) {
        await db.insert(transaksiTable)
          .values({
            siswa_id: testSiswaId,
            tanggal_transaksi: new Date(),
            jumlah: '15000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          })
          .execute();
      }

      const newBadges = await checkAndAwardBadges(testSiswaId);

      const badgeNames = newBadges.map(b => b.nama_badge);
      expect(badgeNames).toContain('Penabung Pemula');
      expect(badgeNames).toContain('Penabung Rajin');
      expect(badgeNames).toContain('Tabungan 10K');
      expect(badgeNames).toContain('Tabungan 50K');
    });

    it('should not award duplicate badges', async () => {
      // Create transaction and award badges
      await db.insert(transaksiTable)
        .values({
          siswa_id: testSiswaId,
          tanggal_transaksi: new Date(),
          jumlah: '10000',
          jenis_transaksi: 'menabung',
          status_verifikasi: 'terverifikasi'
        })
        .execute();

      const firstCheck = await checkAndAwardBadges(testSiswaId);
      expect(firstCheck.length).toBeGreaterThan(0);

      // Run check again - should not award same badges
      const secondCheck = await checkAndAwardBadges(testSiswaId);
      expect(secondCheck).toHaveLength(0);
    });

    it('should only count verified menabung transactions', async () => {
      // Create unverified transaction
      await db.insert(transaksiTable)
        .values({
          siswa_id: testSiswaId,
          tanggal_transaksi: new Date(),
          jumlah: '100000',
          jenis_transaksi: 'menabung',
          status_verifikasi: 'menunggu'
        })
        .execute();

      // Create menarik transaction
      await db.insert(transaksiTable)
        .values({
          siswa_id: testSiswaId,
          tanggal_transaksi: new Date(),
          jumlah: '50000',
          jenis_transaksi: 'menarik',
          status_verifikasi: 'terverifikasi'
        })
        .execute();

      const newBadges = await checkAndAwardBadges(testSiswaId);

      expect(newBadges).toHaveLength(0);
    });

    it('should throw error for non-existent student', async () => {
      await expect(checkAndAwardBadges(9999)).rejects.toThrow(/student not found/i);
    });
  });

  describe('deleteBadgesSiswa', () => {
    it('should delete existing badge', async () => {
      const badge = await createBadgesSiswa({
        siswa_id: testSiswaId,
        nama_badge: 'Badge to Delete'
      });

      const result = await deleteBadgesSiswa(badge.id);

      expect(result).toBe(true);

      // Verify badge is deleted
      const badges = await db.select()
        .from(badgesSiswaTable)
        .where(eq(badgesSiswaTable.id, badge.id))
        .execute();

      expect(badges).toHaveLength(0);
    });

    it('should throw error for non-existent badge', async () => {
      await expect(deleteBadgesSiswa(9999)).rejects.toThrow(/badge not found/i);
    });
  });

  describe('integration tests', () => {
    it('should handle complete badge lifecycle', async () => {
      // 1. Start with no badges
      let badges = await getBadgesBySiswa(testSiswaId);
      expect(badges).toHaveLength(0);

      // 2. Create transactions to earn badges
      for (let i = 0; i < 10; i++) {
        await db.insert(transaksiTable)
          .values({
            siswa_id: testSiswaId,
            tanggal_transaksi: new Date(),
            jumlah: '20000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          })
          .execute();
      }

      // 3. Award badges automatically
      const newBadges = await checkAndAwardBadges(testSiswaId);
      expect(newBadges.length).toBeGreaterThan(0);

      // 4. Verify all badges are present
      badges = await getBadgesBySiswa(testSiswaId);
      const badgeNames = badges.map(b => b.nama_badge);
      expect(badgeNames).toContain('Penabung Pemula');
      expect(badgeNames).toContain('Penabung Rajin');
      expect(badgeNames).toContain('Penabung Hebat');
      expect(badgeNames).toContain('Tabungan 100K');

      // 5. Delete a badge
      await deleteBadgesSiswa(badges[0].id);
      
      // 6. Verify badge count decreased
      const finalBadges = await getBadgesBySiswa(testSiswaId);
      expect(finalBadges).toHaveLength(badges.length - 1);
    });
  });
});