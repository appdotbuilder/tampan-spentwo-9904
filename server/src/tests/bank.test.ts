import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { bankTable, jenisRekeningTable, rekeningSiswaTable, usersTable, kelasTable, guruTable, siswaTable } from '../db/schema';
import { type CreateBankInput, type CreateJenisRekeningInput, type CreateRekeningSiswaInput } from '../schema';
import { createBank, getBanks, createJenisRekening, getJenisRekening, createRekeningSiswa, getRekeningSiswa } from '../handlers/bank';
import { eq } from 'drizzle-orm';

// Test data
const testBankInput: CreateBankInput = {
  nama_bank: 'Bank Test Indonesia'
};

const testJenisRekeningInput: CreateJenisRekeningInput = {
  nama_jenis_rekening: 'Tabungan Siswa'
};

describe('Bank Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createBank', () => {
    it('should create a bank', async () => {
      const result = await createBank(testBankInput);

      expect(result.nama_bank).toEqual('Bank Test Indonesia');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save bank to database', async () => {
      const result = await createBank(testBankInput);

      const banks = await db.select()
        .from(bankTable)
        .where(eq(bankTable.id, result.id))
        .execute();

      expect(banks).toHaveLength(1);
      expect(banks[0].nama_bank).toEqual('Bank Test Indonesia');
      expect(banks[0].created_at).toBeInstanceOf(Date);
    });
  });

  describe('getBanks', () => {
    it('should return empty array when no banks exist', async () => {
      const result = await getBanks();
      expect(result).toEqual([]);
    });

    it('should return all banks', async () => {
      // Create test banks
      await createBank({ nama_bank: 'Bank A' });
      await createBank({ nama_bank: 'Bank B' });

      const result = await getBanks();

      expect(result).toHaveLength(2);
      expect(result[0].nama_bank).toEqual('Bank A');
      expect(result[1].nama_bank).toEqual('Bank B');
      result.forEach(bank => {
        expect(bank.id).toBeDefined();
        expect(bank.created_at).toBeInstanceOf(Date);
      });
    });
  });

  describe('createJenisRekening', () => {
    it('should create a jenis rekening', async () => {
      const result = await createJenisRekening(testJenisRekeningInput);

      expect(result.nama_jenis_rekening).toEqual('Tabungan Siswa');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save jenis rekening to database', async () => {
      const result = await createJenisRekening(testJenisRekeningInput);

      const jenisRekenings = await db.select()
        .from(jenisRekeningTable)
        .where(eq(jenisRekeningTable.id, result.id))
        .execute();

      expect(jenisRekenings).toHaveLength(1);
      expect(jenisRekenings[0].nama_jenis_rekening).toEqual('Tabungan Siswa');
      expect(jenisRekenings[0].created_at).toBeInstanceOf(Date);
    });
  });

  describe('getJenisRekening', () => {
    it('should return empty array when no jenis rekening exist', async () => {
      const result = await getJenisRekening();
      expect(result).toEqual([]);
    });

    it('should return all jenis rekening', async () => {
      // Create test jenis rekening
      await createJenisRekening({ nama_jenis_rekening: 'Tabungan' });
      await createJenisRekening({ nama_jenis_rekening: 'Giro' });

      const result = await getJenisRekening();

      expect(result).toHaveLength(2);
      expect(result[0].nama_jenis_rekening).toEqual('Tabungan');
      expect(result[1].nama_jenis_rekening).toEqual('Giro');
      result.forEach(jenis => {
        expect(jenis.id).toBeDefined();
        expect(jenis.created_at).toBeInstanceOf(Date);
      });
    });
  });

  describe('createRekeningSiswa', () => {
    it('should create a rekening siswa', async () => {
      // Create prerequisite data
      const user = await db.insert(usersTable)
        .values({
          username: 'testsiswa',
          password_hash: 'hash123',
          role: 'siswa'
        })
        .returning()
        .execute();

      const userGuru = await db.insert(usersTable)
        .values({
          username: 'testguru',
          password_hash: 'hash123',
          role: 'wali_kelas'
        })
        .returning()
        .execute();

      const guru = await db.insert(guruTable)
        .values({
          nama_guru: 'Test Guru',
          nip_nik: '123456789',
          status: 'aktif',
          user_id: userGuru[0].id
        })
        .returning()
        .execute();

      const kelas = await db.insert(kelasTable)
        .values({
          nama_kelas: 'X-A',
          tingkat: '10',
          wali_kelas_id: guru[0].id
        })
        .returning()
        .execute();

      const siswa = await db.insert(siswaTable)
        .values({
          nama_siswa: 'Test Siswa',
          nisn: '1234567890',
          nis: '12345',
          tanggal_lahir: '2005-01-01',
          kelas_id: kelas[0].id,
          status: 'aktif',
          user_id: user[0].id
        })
        .returning()
        .execute();

      const bank = await createBank({ nama_bank: 'Test Bank' });
      const jenisRekening = await createJenisRekening({ nama_jenis_rekening: 'Tabungan' });

      const testRekeningSiswaInput: CreateRekeningSiswaInput = {
        siswa_id: siswa[0].id,
        bank_id: bank.id,
        jenis_rekening_id: jenisRekening.id,
        nomor_rekening: '1234567890'
      };

      const result = await createRekeningSiswa(testRekeningSiswaInput);

      expect(result.siswa_id).toEqual(siswa[0].id);
      expect(result.bank_id).toEqual(bank.id);
      expect(result.jenis_rekening_id).toEqual(jenisRekening.id);
      expect(result.nomor_rekening).toEqual('1234567890');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save rekening siswa to database', async () => {
      // Create prerequisite data
      const user = await db.insert(usersTable)
        .values({
          username: 'testsiswa2',
          password_hash: 'hash123',
          role: 'siswa'
        })
        .returning()
        .execute();

      const userGuru = await db.insert(usersTable)
        .values({
          username: 'testguru2',
          password_hash: 'hash123',
          role: 'wali_kelas'
        })
        .returning()
        .execute();

      const guru = await db.insert(guruTable)
        .values({
          nama_guru: 'Test Guru 2',
          nip_nik: '987654321',
          status: 'aktif',
          user_id: userGuru[0].id
        })
        .returning()
        .execute();

      const kelas = await db.insert(kelasTable)
        .values({
          nama_kelas: 'X-B',
          tingkat: '10',
          wali_kelas_id: guru[0].id
        })
        .returning()
        .execute();

      const siswa = await db.insert(siswaTable)
        .values({
          nama_siswa: 'Test Siswa 2',
          nisn: '9876543210',
          nis: '54321',
          tanggal_lahir: '2005-06-15',
          kelas_id: kelas[0].id,
          status: 'aktif',
          user_id: user[0].id
        })
        .returning()
        .execute();

      const bank = await createBank({ nama_bank: 'Test Bank 2' });
      const jenisRekening = await createJenisRekening({ nama_jenis_rekening: 'Giro' });

      const testRekeningSiswaInput: CreateRekeningSiswaInput = {
        siswa_id: siswa[0].id,
        bank_id: bank.id,
        jenis_rekening_id: jenisRekening.id,
        nomor_rekening: '0987654321'
      };

      const result = await createRekeningSiswa(testRekeningSiswaInput);

      const rekenings = await db.select()
        .from(rekeningSiswaTable)
        .where(eq(rekeningSiswaTable.id, result.id))
        .execute();

      expect(rekenings).toHaveLength(1);
      expect(rekenings[0].siswa_id).toEqual(siswa[0].id);
      expect(rekenings[0].bank_id).toEqual(bank.id);
      expect(rekenings[0].jenis_rekening_id).toEqual(jenisRekening.id);
      expect(rekenings[0].nomor_rekening).toEqual('0987654321');
      expect(rekenings[0].created_at).toBeInstanceOf(Date);
    });

    it('should throw error when siswa does not exist', async () => {
      const bank = await createBank({ nama_bank: 'Test Bank' });
      const jenisRekening = await createJenisRekening({ nama_jenis_rekening: 'Tabungan' });

      const testRekeningSiswaInput: CreateRekeningSiswaInput = {
        siswa_id: 99999, // Non-existent siswa
        bank_id: bank.id,
        jenis_rekening_id: jenisRekening.id,
        nomor_rekening: '1234567890'
      };

      expect(createRekeningSiswa(testRekeningSiswaInput))
        .rejects.toThrow(/siswa with id 99999 not found/i);
    });

    it('should throw error when bank does not exist', async () => {
      // Create prerequisite data
      const user = await db.insert(usersTable)
        .values({
          username: 'testsiswa3',
          password_hash: 'hash123',
          role: 'siswa'
        })
        .returning()
        .execute();

      const userGuru = await db.insert(usersTable)
        .values({
          username: 'testguru3',
          password_hash: 'hash123',
          role: 'wali_kelas'
        })
        .returning()
        .execute();

      const guru = await db.insert(guruTable)
        .values({
          nama_guru: 'Test Guru 3',
          nip_nik: '111222333',
          status: 'aktif',
          user_id: userGuru[0].id
        })
        .returning()
        .execute();

      const kelas = await db.insert(kelasTable)
        .values({
          nama_kelas: 'X-C',
          tingkat: '10',
          wali_kelas_id: guru[0].id
        })
        .returning()
        .execute();

      const siswa = await db.insert(siswaTable)
        .values({
          nama_siswa: 'Test Siswa 3',
          nisn: '1111222233',
          nis: '11223',
          tanggal_lahir: '2005-12-25',
          kelas_id: kelas[0].id,
          status: 'aktif',
          user_id: user[0].id
        })
        .returning()
        .execute();

      const jenisRekening = await createJenisRekening({ nama_jenis_rekening: 'Tabungan' });

      const testRekeningSiswaInput: CreateRekeningSiswaInput = {
        siswa_id: siswa[0].id,
        bank_id: 99999, // Non-existent bank
        jenis_rekening_id: jenisRekening.id,
        nomor_rekening: '1234567890'
      };

      expect(createRekeningSiswa(testRekeningSiswaInput))
        .rejects.toThrow(/bank with id 99999 not found/i);
    });

    it('should throw error when jenis rekening does not exist', async () => {
      // Create prerequisite data
      const user = await db.insert(usersTable)
        .values({
          username: 'testsiswa4',
          password_hash: 'hash123',
          role: 'siswa'
        })
        .returning()
        .execute();

      const userGuru = await db.insert(usersTable)
        .values({
          username: 'testguru4',
          password_hash: 'hash123',
          role: 'wali_kelas'
        })
        .returning()
        .execute();

      const guru = await db.insert(guruTable)
        .values({
          nama_guru: 'Test Guru 4',
          nip_nik: '444555666',
          status: 'aktif',
          user_id: userGuru[0].id
        })
        .returning()
        .execute();

      const kelas = await db.insert(kelasTable)
        .values({
          nama_kelas: 'X-D',
          tingkat: '10',
          wali_kelas_id: guru[0].id
        })
        .returning()
        .execute();

      const siswa = await db.insert(siswaTable)
        .values({
          nama_siswa: 'Test Siswa 4',
          nisn: '4444555566',
          nis: '44556',
          tanggal_lahir: '2005-03-10',
          kelas_id: kelas[0].id,
          status: 'aktif',
          user_id: user[0].id
        })
        .returning()
        .execute();

      const bank = await createBank({ nama_bank: 'Test Bank 4' });

      const testRekeningSiswaInput: CreateRekeningSiswaInput = {
        siswa_id: siswa[0].id,
        bank_id: bank.id,
        jenis_rekening_id: 99999, // Non-existent jenis rekening
        nomor_rekening: '1234567890'
      };

      expect(createRekeningSiswa(testRekeningSiswaInput))
        .rejects.toThrow(/jenis rekening with id 99999 not found/i);
    });
  });

  describe('getRekeningSiswa', () => {
    it('should return empty array when no rekening siswa exist', async () => {
      const result = await getRekeningSiswa();
      expect(result).toEqual([]);
    });

    it('should return all rekening siswa', async () => {
      // Create prerequisite data for two students
      const user1 = await db.insert(usersTable)
        .values({
          username: 'testsiswa5',
          password_hash: 'hash123',
          role: 'siswa'
        })
        .returning()
        .execute();

      const user2 = await db.insert(usersTable)
        .values({
          username: 'testsiswa6',
          password_hash: 'hash123',
          role: 'siswa'
        })
        .returning()
        .execute();

      const userGuru = await db.insert(usersTable)
        .values({
          username: 'testguru5',
          password_hash: 'hash123',
          role: 'wali_kelas'
        })
        .returning()
        .execute();

      const guru = await db.insert(guruTable)
        .values({
          nama_guru: 'Test Guru 5',
          nip_nik: '777888999',
          status: 'aktif',
          user_id: userGuru[0].id
        })
        .returning()
        .execute();

      const kelas = await db.insert(kelasTable)
        .values({
          nama_kelas: 'XI-A',
          tingkat: '11',
          wali_kelas_id: guru[0].id
        })
        .returning()
        .execute();

      const siswa1 = await db.insert(siswaTable)
        .values({
          nama_siswa: 'Test Siswa 5',
          nisn: '7777888899',
          nis: '77889',
          tanggal_lahir: '2004-08-20',
          kelas_id: kelas[0].id,
          status: 'aktif',
          user_id: user1[0].id
        })
        .returning()
        .execute();

      const siswa2 = await db.insert(siswaTable)
        .values({
          nama_siswa: 'Test Siswa 6',
          nisn: '9999000011',
          nis: '99001',
          tanggal_lahir: '2004-11-30',
          kelas_id: kelas[0].id,
          status: 'aktif',
          user_id: user2[0].id
        })
        .returning()
        .execute();

      const bank = await createBank({ nama_bank: 'Test Bank 5' });
      const jenisRekening = await createJenisRekening({ nama_jenis_rekening: 'Tabungan Pelajar' });

      // Create rekening siswa records
      await createRekeningSiswa({
        siswa_id: siswa1[0].id,
        bank_id: bank.id,
        jenis_rekening_id: jenisRekening.id,
        nomor_rekening: '1111111111'
      });

      await createRekeningSiswa({
        siswa_id: siswa2[0].id,
        bank_id: bank.id,
        jenis_rekening_id: jenisRekening.id,
        nomor_rekening: '2222222222'
      });

      const result = await getRekeningSiswa();

      expect(result).toHaveLength(2);
      expect(result[0].siswa_id).toEqual(siswa1[0].id);
      expect(result[0].nomor_rekening).toEqual('1111111111');
      expect(result[1].siswa_id).toEqual(siswa2[0].id);
      expect(result[1].nomor_rekening).toEqual('2222222222');
      
      result.forEach(rekening => {
        expect(rekening.id).toBeDefined();
        expect(rekening.bank_id).toEqual(bank.id);
        expect(rekening.jenis_rekening_id).toEqual(jenisRekening.id);
        expect(rekening.created_at).toBeInstanceOf(Date);
      });
    });
  });
});