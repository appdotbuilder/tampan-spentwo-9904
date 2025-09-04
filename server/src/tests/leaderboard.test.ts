import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  guruTable, 
  kelasTable, 
  siswaTable, 
  transaksiTable 
} from '../db/schema';
import { 
  getStudentLeaderboard, 
  getKelasLeaderboard, 
  getStudentRankBySiswaId, 
  getKelasRankByKelasId 
} from '../handlers/leaderboard';

describe('Leaderboard Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getStudentLeaderboard', () => {
    it('should return empty array when no students exist', async () => {
      const result = await getStudentLeaderboard(10);
      expect(result).toEqual([]);
    });

    it('should return student leaderboard ordered by savings frequency', async () => {
      // Create test users
      const users = await db.insert(usersTable)
        .values([
          { username: 'guru1', password_hash: 'hash1', role: 'wali_kelas' },
          { username: 'siswa1', password_hash: 'hash2', role: 'siswa' },
          { username: 'siswa2', password_hash: 'hash3', role: 'siswa' },
          { username: 'siswa3', password_hash: 'hash4', role: 'siswa' }
        ])
        .returning()
        .execute();

      // Create guru
      const gurus = await db.insert(guruTable)
        .values([{
          nama_guru: 'Guru Test',
          nip_nik: '123456789',
          nomor_hp: null,
          email: null,
          status: 'aktif',
          user_id: users[0].id
        }])
        .returning()
        .execute();

      // Create kelas
      const kelas = await db.insert(kelasTable)
        .values([
          {
            nama_kelas: 'Kelas A',
            tingkat: '1',
            wali_kelas_id: gurus[0].id
          },
          {
            nama_kelas: 'Kelas B',
            tingkat: '2',
            wali_kelas_id: gurus[0].id
          }
        ])
        .returning()
        .execute();

      // Create siswa
      const siswa = await db.insert(siswaTable)
        .values([
          {
            nama_siswa: 'Siswa Satu',
            nisn: '1001',
            nis: '2001',
            tanggal_lahir: '2010-01-01',
            nomor_hp: null,
            email: null,
            kelas_id: kelas[0].id,
            status: 'aktif',
            user_id: users[1].id
          },
          {
            nama_siswa: 'Siswa Dua',
            nisn: '1002',
            nis: '2002',
            tanggal_lahir: '2010-01-02',
            nomor_hp: null,
            email: null,
            kelas_id: kelas[0].id,
            status: 'aktif',
            user_id: users[2].id
          },
          {
            nama_siswa: 'Siswa Tiga',
            nisn: '1003',
            nis: '2003',
            tanggal_lahir: '2010-01-03',
            nomor_hp: null,
            email: null,
            kelas_id: kelas[1].id,
            status: 'aktif',
            user_id: users[3].id
          }
        ])
        .returning()
        .execute();

      // Create transactions - Siswa Dua has most savings transactions
      await db.insert(transaksiTable)
        .values([
          // Siswa Dua - 3 savings transactions (should be rank 1)
          {
            siswa_id: siswa[1].id,
            tanggal_transaksi: new Date('2024-01-01'),
            jumlah: '50000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          },
          {
            siswa_id: siswa[1].id,
            tanggal_transaksi: new Date('2024-01-02'),
            jumlah: '25000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          },
          {
            siswa_id: siswa[1].id,
            tanggal_transaksi: new Date('2024-01-03'),
            jumlah: '30000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          },
          // Siswa Satu - 2 savings transactions (should be rank 2)
          {
            siswa_id: siswa[0].id,
            tanggal_transaksi: new Date('2024-01-01'),
            jumlah: '100000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          },
          {
            siswa_id: siswa[0].id,
            tanggal_transaksi: new Date('2024-01-02'),
            jumlah: '20000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          },
          // Siswa Tiga - 1 savings transaction (should be rank 3)
          {
            siswa_id: siswa[2].id,
            tanggal_transaksi: new Date('2024-01-01'),
            jumlah: '75000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          },
          // Add some withdrawal transactions to test net savings calculation
          {
            siswa_id: siswa[0].id,
            tanggal_transaksi: new Date('2024-01-03'),
            jumlah: '10000',
            jenis_transaksi: 'menarik',
            status_verifikasi: 'terverifikasi'
          }
        ])
        .execute();

      const result = await getStudentLeaderboard(10);

      expect(result).toHaveLength(3);
      
      // Check ordering - most savings transactions first
      expect(result[0].nama_siswa).toEqual('Siswa Dua');
      expect(result[0].jumlah_menabung).toEqual(3);
      expect(result[0].total_tabungan).toEqual(105000);
      expect(result[0].rank).toEqual(1);
      expect(result[0].nama_kelas).toEqual('Kelas A');

      expect(result[1].nama_siswa).toEqual('Siswa Satu');
      expect(result[1].jumlah_menabung).toEqual(2);
      expect(result[1].total_tabungan).toEqual(110000); // 120000 - 10000 withdrawal
      expect(result[1].rank).toEqual(2);

      expect(result[2].nama_siswa).toEqual('Siswa Tiga');
      expect(result[2].jumlah_menabung).toEqual(1);
      expect(result[2].total_tabungan).toEqual(75000);
      expect(result[2].rank).toEqual(3);
    });

    it('should respect limit parameter', async () => {
      // Create test users
      const users = await db.insert(usersTable)
        .values([
          { username: 'guru1', password_hash: 'hash1', role: 'wali_kelas' },
          { username: 'siswa1', password_hash: 'hash2', role: 'siswa' },
          { username: 'siswa2', password_hash: 'hash3', role: 'siswa' }
        ])
        .returning()
        .execute();

      // Create guru
      const gurus = await db.insert(guruTable)
        .values([{
          nama_guru: 'Guru Test',
          nip_nik: '123456789',
          nomor_hp: null,
          email: null,
          status: 'aktif',
          user_id: users[0].id
        }])
        .returning()
        .execute();

      // Create kelas
      const kelas = await db.insert(kelasTable)
        .values([{
          nama_kelas: 'Kelas A',
          tingkat: '1',
          wali_kelas_id: gurus[0].id
        }])
        .returning()
        .execute();

      // Create siswa
      await db.insert(siswaTable)
        .values([
          {
            nama_siswa: 'Siswa Satu',
            nisn: '1001',
            nis: '2001',
            tanggal_lahir: '2010-01-01',
            nomor_hp: null,
            email: null,
            kelas_id: kelas[0].id,
            status: 'aktif',
            user_id: users[1].id
          },
          {
            nama_siswa: 'Siswa Dua',
            nisn: '1002',
            nis: '2002',
            tanggal_lahir: '2010-01-02',
            nomor_hp: null,
            email: null,
            kelas_id: kelas[0].id,
            status: 'aktif',
            user_id: users[2].id
          }
        ])
        .execute();

      const result = await getStudentLeaderboard(1);
      expect(result).toHaveLength(1);
    });

    it('should only include active students', async () => {
      // Create test users
      const users = await db.insert(usersTable)
        .values([
          { username: 'guru1', password_hash: 'hash1', role: 'wali_kelas' },
          { username: 'siswa1', password_hash: 'hash2', role: 'siswa' }
        ])
        .returning()
        .execute();

      // Create guru
      const gurus = await db.insert(guruTable)
        .values([{
          nama_guru: 'Guru Test',
          nip_nik: '123456789',
          nomor_hp: null,
          email: null,
          status: 'aktif',
          user_id: users[0].id
        }])
        .returning()
        .execute();

      // Create kelas
      const kelas = await db.insert(kelasTable)
        .values([{
          nama_kelas: 'Kelas A',
          tingkat: '1',
          wali_kelas_id: gurus[0].id
        }])
        .returning()
        .execute();

      // Create inactive siswa
      await db.insert(siswaTable)
        .values([{
          nama_siswa: 'Siswa Tidak Aktif',
          nisn: '1001',
          nis: '2001',
          tanggal_lahir: '2010-01-01',
          nomor_hp: null,
          email: null,
          kelas_id: kelas[0].id,
          status: 'tidak_aktif',
          user_id: users[1].id
        }])
        .execute();

      const result = await getStudentLeaderboard(10);
      expect(result).toHaveLength(0);
    });
  });

  describe('getKelasLeaderboard', () => {
    it('should return empty array when no classes exist', async () => {
      const result = await getKelasLeaderboard(10);
      expect(result).toEqual([]);
    });

    it('should return class leaderboard ordered by total transactions', async () => {
      // Create test users
      const users = await db.insert(usersTable)
        .values([
          { username: 'guru1', password_hash: 'hash1', role: 'wali_kelas' },
          { username: 'siswa1', password_hash: 'hash2', role: 'siswa' },
          { username: 'siswa2', password_hash: 'hash3', role: 'siswa' },
          { username: 'siswa3', password_hash: 'hash4', role: 'siswa' }
        ])
        .returning()
        .execute();

      // Create guru
      const gurus = await db.insert(guruTable)
        .values([{
          nama_guru: 'Guru Test',
          nip_nik: '123456789',
          nomor_hp: null,
          email: null,
          status: 'aktif',
          user_id: users[0].id
        }])
        .returning()
        .execute();

      // Create kelas
      const kelas = await db.insert(kelasTable)
        .values([
          {
            nama_kelas: 'Kelas A',
            tingkat: '1',
            wali_kelas_id: gurus[0].id
          },
          {
            nama_kelas: 'Kelas B',
            tingkat: '2',
            wali_kelas_id: gurus[0].id
          }
        ])
        .returning()
        .execute();

      // Create siswa
      const siswa = await db.insert(siswaTable)
        .values([
          {
            nama_siswa: 'Siswa A1',
            nisn: '1001',
            nis: '2001',
            tanggal_lahir: '2010-01-01',
            nomor_hp: null,
            email: null,
            kelas_id: kelas[0].id,
            status: 'aktif',
            user_id: users[1].id
          },
          {
            nama_siswa: 'Siswa A2',
            nisn: '1002',
            nis: '2002',
            tanggal_lahir: '2010-01-02',
            nomor_hp: null,
            email: null,
            kelas_id: kelas[0].id,
            status: 'aktif',
            user_id: users[2].id
          },
          {
            nama_siswa: 'Siswa B1',
            nisn: '1003',
            nis: '2003',
            tanggal_lahir: '2010-01-03',
            nomor_hp: null,
            email: null,
            kelas_id: kelas[1].id,
            status: 'aktif',
            user_id: users[3].id
          }
        ])
        .returning()
        .execute();

      // Create transactions - Kelas A has more transactions
      await db.insert(transaksiTable)
        .values([
          // Kelas A transactions (3 total)
          {
            siswa_id: siswa[0].id,
            tanggal_transaksi: new Date('2024-01-01'),
            jumlah: '50000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          },
          {
            siswa_id: siswa[0].id,
            tanggal_transaksi: new Date('2024-01-02'),
            jumlah: '25000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          },
          {
            siswa_id: siswa[1].id,
            tanggal_transaksi: new Date('2024-01-01'),
            jumlah: '30000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          },
          // Kelas B transactions (1 total)
          {
            siswa_id: siswa[2].id,
            tanggal_transaksi: new Date('2024-01-01'),
            jumlah: '75000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          }
        ])
        .execute();

      const result = await getKelasLeaderboard(10);

      expect(result).toHaveLength(2);
      
      // Check ordering - most transactions first
      expect(result[0].nama_kelas).toEqual('Kelas A');
      expect(result[0].tingkat).toEqual('1');
      expect(result[0].total_transaksi).toEqual(3);
      expect(result[0].total_siswa_aktif).toEqual(2);
      expect(result[0].rank).toEqual(1);

      expect(result[1].nama_kelas).toEqual('Kelas B');
      expect(result[1].tingkat).toEqual('2');
      expect(result[1].total_transaksi).toEqual(1);
      expect(result[1].total_siswa_aktif).toEqual(1);
      expect(result[1].rank).toEqual(2);
    });

    it('should respect limit parameter', async () => {
      // Create test users
      const users = await db.insert(usersTable)
        .values([
          { username: 'guru1', password_hash: 'hash1', role: 'wali_kelas' }
        ])
        .returning()
        .execute();

      // Create guru
      const gurus = await db.insert(guruTable)
        .values([{
          nama_guru: 'Guru Test',
          nip_nik: '123456789',
          nomor_hp: null,
          email: null,
          status: 'aktif',
          user_id: users[0].id
        }])
        .returning()
        .execute();

      // Create multiple kelas
      await db.insert(kelasTable)
        .values([
          {
            nama_kelas: 'Kelas A',
            tingkat: '1',
            wali_kelas_id: gurus[0].id
          },
          {
            nama_kelas: 'Kelas B',
            tingkat: '2',
            wali_kelas_id: gurus[0].id
          }
        ])
        .execute();

      const result = await getKelasLeaderboard(1);
      expect(result).toHaveLength(1);
    });

    it('should only count verified transactions', async () => {
      // Create test users
      const users = await db.insert(usersTable)
        .values([
          { username: 'guru1', password_hash: 'hash1', role: 'wali_kelas' },
          { username: 'siswa1', password_hash: 'hash2', role: 'siswa' }
        ])
        .returning()
        .execute();

      // Create guru
      const gurus = await db.insert(guruTable)
        .values([{
          nama_guru: 'Guru Test',
          nip_nik: '123456789',
          nomor_hp: null,
          email: null,
          status: 'aktif',
          user_id: users[0].id
        }])
        .returning()
        .execute();

      // Create kelas
      const kelas = await db.insert(kelasTable)
        .values([{
          nama_kelas: 'Kelas A',
          tingkat: '1',
          wali_kelas_id: gurus[0].id
        }])
        .returning()
        .execute();

      // Create siswa
      const siswa = await db.insert(siswaTable)
        .values([{
          nama_siswa: 'Siswa Test',
          nisn: '1001',
          nis: '2001',
          tanggal_lahir: '2010-01-01',
          nomor_hp: null,
          email: null,
          kelas_id: kelas[0].id,
          status: 'aktif',
          user_id: users[1].id
        }])
        .returning()
        .execute();

      // Create transactions with different verification statuses
      await db.insert(transaksiTable)
        .values([
          {
            siswa_id: siswa[0].id,
            tanggal_transaksi: new Date('2024-01-01'),
            jumlah: '50000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          },
          {
            siswa_id: siswa[0].id,
            tanggal_transaksi: new Date('2024-01-02'),
            jumlah: '25000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'menunggu'
          }
        ])
        .execute();

      const result = await getKelasLeaderboard(10);

      expect(result).toHaveLength(1);
      expect(result[0].total_transaksi).toEqual(1); // Only verified transaction counted
    });
  });

  describe('getStudentRankBySiswaId', () => {
    it('should return 0 for non-existent student', async () => {
      const result = await getStudentRankBySiswaId(999);
      expect(result).toEqual(0);
    });

    it('should return correct rank for specific student', async () => {
      // Create test users
      const users = await db.insert(usersTable)
        .values([
          { username: 'guru1', password_hash: 'hash1', role: 'wali_kelas' },
          { username: 'siswa1', password_hash: 'hash2', role: 'siswa' },
          { username: 'siswa2', password_hash: 'hash3', role: 'siswa' }
        ])
        .returning()
        .execute();

      // Create guru
      const gurus = await db.insert(guruTable)
        .values([{
          nama_guru: 'Guru Test',
          nip_nik: '123456789',
          nomor_hp: null,
          email: null,
          status: 'aktif',
          user_id: users[0].id
        }])
        .returning()
        .execute();

      // Create kelas
      const kelas = await db.insert(kelasTable)
        .values([{
          nama_kelas: 'Kelas A',
          tingkat: '1',
          wali_kelas_id: gurus[0].id
        }])
        .returning()
        .execute();

      // Create siswa
      const siswa = await db.insert(siswaTable)
        .values([
          {
            nama_siswa: 'Siswa Satu',
            nisn: '1001',
            nis: '2001',
            tanggal_lahir: '2010-01-01',
            nomor_hp: null,
            email: null,
            kelas_id: kelas[0].id,
            status: 'aktif',
            user_id: users[1].id
          },
          {
            nama_siswa: 'Siswa Dua',
            nisn: '1002',
            nis: '2002',
            tanggal_lahir: '2010-01-02',
            nomor_hp: null,
            email: null,
            kelas_id: kelas[0].id,
            status: 'aktif',
            user_id: users[2].id
          }
        ])
        .returning()
        .execute();

      // Create transactions - Siswa Dua has more savings
      await db.insert(transaksiTable)
        .values([
          {
            siswa_id: siswa[1].id,
            tanggal_transaksi: new Date('2024-01-01'),
            jumlah: '50000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          },
          {
            siswa_id: siswa[1].id,
            tanggal_transaksi: new Date('2024-01-02'),
            jumlah: '25000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          },
          {
            siswa_id: siswa[0].id,
            tanggal_transaksi: new Date('2024-01-01'),
            jumlah: '100000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          }
        ])
        .execute();

      const rank1 = await getStudentRankBySiswaId(siswa[1].id);
      const rank2 = await getStudentRankBySiswaId(siswa[0].id);

      expect(rank1).toEqual(1); // Siswa Dua has more transactions
      expect(rank2).toEqual(2); // Siswa Satu has fewer transactions
    });
  });

  describe('getKelasRankByKelasId', () => {
    it('should return 0 for non-existent class', async () => {
      const result = await getKelasRankByKelasId(999);
      expect(result).toEqual(0);
    });

    it('should return correct rank for specific class', async () => {
      // Create test users
      const users = await db.insert(usersTable)
        .values([
          { username: 'guru1', password_hash: 'hash1', role: 'wali_kelas' },
          { username: 'siswa1', password_hash: 'hash2', role: 'siswa' },
          { username: 'siswa2', password_hash: 'hash3', role: 'siswa' }
        ])
        .returning()
        .execute();

      // Create guru
      const gurus = await db.insert(guruTable)
        .values([{
          nama_guru: 'Guru Test',
          nip_nik: '123456789',
          nomor_hp: null,
          email: null,
          status: 'aktif',
          user_id: users[0].id
        }])
        .returning()
        .execute();

      // Create kelas
      const kelas = await db.insert(kelasTable)
        .values([
          {
            nama_kelas: 'Kelas A',
            tingkat: '1',
            wali_kelas_id: gurus[0].id
          },
          {
            nama_kelas: 'Kelas B',
            tingkat: '2',
            wali_kelas_id: gurus[0].id
          }
        ])
        .returning()
        .execute();

      // Create siswa
      const siswa = await db.insert(siswaTable)
        .values([
          {
            nama_siswa: 'Siswa A1',
            nisn: '1001',
            nis: '2001',
            tanggal_lahir: '2010-01-01',
            nomor_hp: null,
            email: null,
            kelas_id: kelas[0].id,
            status: 'aktif',
            user_id: users[1].id
          },
          {
            nama_siswa: 'Siswa B1',
            nisn: '1002',
            nis: '2002',
            tanggal_lahir: '2010-01-02',
            nomor_hp: null,
            email: null,
            kelas_id: kelas[1].id,
            status: 'aktif',
            user_id: users[2].id
          }
        ])
        .returning()
        .execute();

      // Create transactions - Kelas A has more transactions
      await db.insert(transaksiTable)
        .values([
          {
            siswa_id: siswa[0].id,
            tanggal_transaksi: new Date('2024-01-01'),
            jumlah: '50000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          },
          {
            siswa_id: siswa[0].id,
            tanggal_transaksi: new Date('2024-01-02'),
            jumlah: '25000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          },
          {
            siswa_id: siswa[1].id,
            tanggal_transaksi: new Date('2024-01-01'),
            jumlah: '30000',
            jenis_transaksi: 'menabung',
            status_verifikasi: 'terverifikasi'
          }
        ])
        .execute();

      const rankA = await getKelasRankByKelasId(kelas[0].id);
      const rankB = await getKelasRankByKelasId(kelas[1].id);

      expect(rankA).toEqual(1); // Kelas A has more transactions
      expect(rankB).toEqual(2); // Kelas B has fewer transactions
    });
  });
});