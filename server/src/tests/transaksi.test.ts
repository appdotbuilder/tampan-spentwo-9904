import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, siswaTable, kelasTable, guruTable, transaksiTable } from '../db/schema';
import { type CreateTransaksiInput, type VerifyTransaksiInput } from '../schema';
import {
  createTransaksi,
  getTransaksi,
  getTransaksiBySiswa,
  getTransaksiByStatus,
  verifyTransaksi,
  getTotalTabunganBySiswa
} from '../handlers/transaksi';
import { eq } from 'drizzle-orm';

// Test data setup
let testUserId: number;
let testGuruId: number;
let testKelasId: number;
let testSiswaId: number;

describe('transaksi handlers', () => {
  beforeEach(async () => {
    await createDB();

    // Create prerequisite test data
    // Create user for guru
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testguru',
        password_hash: 'hashedpass',
        role: 'wali_kelas'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create guru
    const guruResult = await db.insert(guruTable)
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
    testGuruId = guruResult[0].id;

    // Create kelas
    const kelasResult = await db.insert(kelasTable)
      .values({
        nama_kelas: 'X IPA 1',
        tingkat: '10',
        wali_kelas_id: testGuruId
      })
      .returning()
      .execute();
    testKelasId = kelasResult[0].id;

    // Create user for siswa
    const siswaUserResult = await db.insert(usersTable)
      .values({
        username: 'testsiswa',
        password_hash: 'hashedpass',
        role: 'siswa'
      })
      .returning()
      .execute();

    // Create siswa
    const siswaResult = await db.insert(siswaTable)
      .values({
        nama_siswa: 'Test Siswa',
        nisn: '1234567890',
        nis: '12345',
        tanggal_lahir: '2005-01-01',
        nomor_hp: '081234567890',
        email: 'siswa@test.com',
        kelas_id: testKelasId,
        status: 'aktif',
        user_id: siswaUserResult[0].id
      })
      .returning()
      .execute();
    testSiswaId = siswaResult[0].id;
  });

  afterEach(resetDB);

  describe('createTransaksi', () => {
    const testInput: CreateTransaksiInput = {
      siswa_id: 0, // Will be set in tests
      tanggal_transaksi: new Date('2024-01-15'),
      jumlah: 50000,
      jenis_transaksi: 'menabung'
    };

    it('should create a transaction with menunggu status', async () => {
      const input = { ...testInput, siswa_id: testSiswaId };
      const result = await createTransaksi(input);

      // Basic field validation
      expect(result.siswa_id).toEqual(testSiswaId);
      expect(result.tanggal_transaksi).toEqual(input.tanggal_transaksi);
      expect(result.jumlah).toEqual(50000);
      expect(typeof result.jumlah).toBe('number');
      expect(result.jenis_transaksi).toEqual('menabung');
      expect(result.status_verifikasi).toEqual('menunggu');
      expect(result.catatan_penolakan).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save transaction to database', async () => {
      const input = { ...testInput, siswa_id: testSiswaId };
      const result = await createTransaksi(input);

      // Query database to verify transaction was saved
      const transactions = await db.select()
        .from(transaksiTable)
        .where(eq(transaksiTable.id, result.id))
        .execute();

      expect(transactions).toHaveLength(1);
      expect(transactions[0].siswa_id).toEqual(testSiswaId);
      expect(parseFloat(transactions[0].jumlah)).toEqual(50000);
      expect(transactions[0].jenis_transaksi).toEqual('menabung');
      expect(transactions[0].status_verifikasi).toEqual('menunggu');
      expect(transactions[0].created_at).toBeInstanceOf(Date);
    });

    it('should reject transaction for non-existent siswa', async () => {
      const input = { ...testInput, siswa_id: 99999 };

      await expect(createTransaksi(input)).rejects.toThrow(/siswa not found/i);
    });

    it('should create withdrawal transaction', async () => {
      const input: CreateTransaksiInput = {
        ...testInput,
        siswa_id: testSiswaId,
        jenis_transaksi: 'menarik',
        jumlah: 25000
      };

      const result = await createTransaksi(input);

      expect(result.jenis_transaksi).toEqual('menarik');
      expect(result.jumlah).toEqual(25000);
      expect(result.status_verifikasi).toEqual('menunggu');
    });
  });

  describe('getTransaksi', () => {
    it('should return all transactions', async () => {
      // Create test transactions
      await createTransaksi({
        siswa_id: testSiswaId,
        tanggal_transaksi: new Date('2024-01-15'),
        jumlah: 50000,
        jenis_transaksi: 'menabung'
      });

      await createTransaksi({
        siswa_id: testSiswaId,
        tanggal_transaksi: new Date('2024-01-16'),
        jumlah: 25000,
        jenis_transaksi: 'menarik'
      });

      const result = await getTransaksi();

      expect(result).toHaveLength(2);
      result.forEach(transaksi => {
        expect(transaksi.id).toBeDefined();
        expect(typeof transaksi.jumlah).toBe('number');
        expect(transaksi.siswa_id).toEqual(testSiswaId);
        expect(transaksi.status_verifikasi).toEqual('menunggu');
      });
    });

    it('should return empty array when no transactions exist', async () => {
      const result = await getTransaksi();

      expect(result).toHaveLength(0);
    });
  });

  describe('getTransaksiBySiswa', () => {
    it('should return transactions for specific siswa', async () => {
      // Create transactions for test siswa
      await createTransaksi({
        siswa_id: testSiswaId,
        tanggal_transaksi: new Date('2024-01-15'),
        jumlah: 50000,
        jenis_transaksi: 'menabung'
      });

      await createTransaksi({
        siswa_id: testSiswaId,
        tanggal_transaksi: new Date('2024-01-16'),
        jumlah: 25000,
        jenis_transaksi: 'menarik'
      });

      const result = await getTransaksiBySiswa(testSiswaId);

      expect(result).toHaveLength(2);
      result.forEach(transaksi => {
        expect(transaksi.siswa_id).toEqual(testSiswaId);
        expect(typeof transaksi.jumlah).toBe('number');
      });
    });

    it('should return empty array for siswa with no transactions', async () => {
      const result = await getTransaksiBySiswa(testSiswaId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getTransaksiByStatus', () => {
    it('should return transactions filtered by status', async () => {
      // Create transaction and verify it
      const transaksi = await createTransaksi({
        siswa_id: testSiswaId,
        tanggal_transaksi: new Date('2024-01-15'),
        jumlah: 50000,
        jenis_transaksi: 'menabung'
      });

      await verifyTransaksi({
        id: transaksi.id,
        status_verifikasi: 'terverifikasi',
        catatan_penolakan: null
      });

      // Create another unverified transaction
      await createTransaksi({
        siswa_id: testSiswaId,
        tanggal_transaksi: new Date('2024-01-16'),
        jumlah: 25000,
        jenis_transaksi: 'menarik'
      });

      // Test filtering by different statuses
      const verifiedTransactions = await getTransaksiByStatus('terverifikasi');
      const pendingTransactions = await getTransaksiByStatus('menunggu');

      expect(verifiedTransactions).toHaveLength(1);
      expect(verifiedTransactions[0].status_verifikasi).toEqual('terverifikasi');
      expect(typeof verifiedTransactions[0].jumlah).toBe('number');

      expect(pendingTransactions).toHaveLength(1);
      expect(pendingTransactions[0].status_verifikasi).toEqual('menunggu');
    });

    it('should return empty array for status with no transactions', async () => {
      const result = await getTransaksiByStatus('ditolak');

      expect(result).toHaveLength(0);
    });
  });

  describe('verifyTransaksi', () => {
    it('should verify transaction successfully', async () => {
      const transaksi = await createTransaksi({
        siswa_id: testSiswaId,
        tanggal_transaksi: new Date('2024-01-15'),
        jumlah: 50000,
        jenis_transaksi: 'menabung'
      });

      const verifyInput: VerifyTransaksiInput = {
        id: transaksi.id,
        status_verifikasi: 'terverifikasi',
        catatan_penolakan: null
      };

      const result = await verifyTransaksi(verifyInput);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(transaksi.id);
      expect(result!.status_verifikasi).toEqual('terverifikasi');
      expect(result!.catatan_penolakan).toBeNull();
      expect(typeof result!.jumlah).toBe('number');
    });

    it('should reject transaction with reason', async () => {
      const transaksi = await createTransaksi({
        siswa_id: testSiswaId,
        tanggal_transaksi: new Date('2024-01-15'),
        jumlah: 50000,
        jenis_transaksi: 'menabung'
      });

      const verifyInput: VerifyTransaksiInput = {
        id: transaksi.id,
        status_verifikasi: 'ditolak',
        catatan_penolakan: 'Bukti transfer tidak valid'
      };

      const result = await verifyTransaksi(verifyInput);

      expect(result).not.toBeNull();
      expect(result!.status_verifikasi).toEqual('ditolak');
      expect(result!.catatan_penolakan).toEqual('Bukti transfer tidak valid');
    });

    it('should return null for non-existent transaction', async () => {
      const verifyInput: VerifyTransaksiInput = {
        id: 99999,
        status_verifikasi: 'terverifikasi',
        catatan_penolakan: null
      };

      const result = await verifyTransaksi(verifyInput);

      expect(result).toBeNull();
    });
  });

  describe('getTotalTabunganBySiswa', () => {
    it('should calculate correct savings balance', async () => {
      // Create multiple transactions
      const deposit1 = await createTransaksi({
        siswa_id: testSiswaId,
        tanggal_transaksi: new Date('2024-01-15'),
        jumlah: 100000,
        jenis_transaksi: 'menabung'
      });

      const deposit2 = await createTransaksi({
        siswa_id: testSiswaId,
        tanggal_transaksi: new Date('2024-01-16'),
        jumlah: 75000,
        jenis_transaksi: 'menabung'
      });

      const withdrawal = await createTransaksi({
        siswa_id: testSiswaId,
        tanggal_transaksi: new Date('2024-01-17'),
        jumlah: 25000,
        jenis_transaksi: 'menarik'
      });

      // Verify all transactions
      await verifyTransaksi({
        id: deposit1.id,
        status_verifikasi: 'terverifikasi',
        catatan_penolakan: null
      });

      await verifyTransaksi({
        id: deposit2.id,
        status_verifikasi: 'terverifikasi',
        catatan_penolakan: null
      });

      await verifyTransaksi({
        id: withdrawal.id,
        status_verifikasi: 'terverifikasi',
        catatan_penolakan: null
      });

      const totalSavings = await getTotalTabunganBySiswa(testSiswaId);

      // Expected: 100000 + 75000 - 25000 = 150000
      expect(totalSavings).toEqual(150000);
    });

    it('should return zero for siswa with no verified transactions', async () => {
      const totalSavings = await getTotalTabunganBySiswa(testSiswaId);

      expect(totalSavings).toEqual(0);
    });

    it('should only count verified transactions', async () => {
      // Create transactions but don't verify one
      const deposit = await createTransaksi({
        siswa_id: testSiswaId,
        tanggal_transaksi: new Date('2024-01-15'),
        jumlah: 100000,
        jenis_transaksi: 'menabung'
      });

      await createTransaksi({
        siswa_id: testSiswaId,
        tanggal_transaksi: new Date('2024-01-16'),
        jumlah: 50000,
        jenis_transaksi: 'menabung'
      });

      // Only verify first transaction
      await verifyTransaksi({
        id: deposit.id,
        status_verifikasi: 'terverifikasi',
        catatan_penolakan: null
      });

      const totalSavings = await getTotalTabunganBySiswa(testSiswaId);

      // Only verified transaction should be counted
      expect(totalSavings).toEqual(100000);
    });

    it('should handle negative balance correctly', async () => {
      // Create withdrawal larger than deposits
      const deposit = await createTransaksi({
        siswa_id: testSiswaId,
        tanggal_transaksi: new Date('2024-01-15'),
        jumlah: 50000,
        jenis_transaksi: 'menabung'
      });

      const withdrawal = await createTransaksi({
        siswa_id: testSiswaId,
        tanggal_transaksi: new Date('2024-01-16'),
        jumlah: 75000,
        jenis_transaksi: 'menarik'
      });

      // Verify both transactions
      await verifyTransaksi({
        id: deposit.id,
        status_verifikasi: 'terverifikasi',
        catatan_penolakan: null
      });

      await verifyTransaksi({
        id: withdrawal.id,
        status_verifikasi: 'terverifikasi',
        catatan_penolakan: null
      });

      const totalSavings = await getTotalTabunganBySiswa(testSiswaId);

      // Expected: 50000 - 75000 = -25000
      expect(totalSavings).toEqual(-25000);
    });
  });
});