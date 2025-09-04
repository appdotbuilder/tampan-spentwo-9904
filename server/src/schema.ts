import { z } from 'zod';

// Enums
export const userRoleEnum = z.enum(['admin_sekolah', 'wali_kelas', 'siswa']);
export const statusEnum = z.enum(['aktif', 'tidak_aktif']);
export const statusSiswaEnum = z.enum(['aktif', 'lulus', 'tidak_aktif']);
export const jenisTransaksiEnum = z.enum(['menabung', 'menarik']);
export const statusVerifikasiEnum = z.enum(['menunggu', 'terverifikasi', 'ditolak']);

// Users schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password_hash: z.string(),
  role: userRoleEnum,
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: userRoleEnum
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Sekolah schema
export const sekolahSchema = z.object({
  id: z.number(),
  nama_sekolah: z.string(),
  npsn: z.string(),
  jenjang: z.string(),
  jenis_sekolah: z.string(),
  nama_kepala_sekolah: z.string(),
  nip_nik_kepala: z.string(),
  alamat_sekolah: z.string(),
  nomor_telepon: z.string().nullable(),
  email: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Sekolah = z.infer<typeof sekolahSchema>;

export const createSekolahInputSchema = z.object({
  nama_sekolah: z.string(),
  npsn: z.string(),
  jenjang: z.string(),
  jenis_sekolah: z.string(),
  nama_kepala_sekolah: z.string(),
  nip_nik_kepala: z.string(),
  alamat_sekolah: z.string(),
  nomor_telepon: z.string().nullable(),
  email: z.string().nullable()
});

export type CreateSekolahInput = z.infer<typeof createSekolahInputSchema>;

// Guru schema
export const guruSchema = z.object({
  id: z.number(),
  nama_guru: z.string(),
  nip_nik: z.string(),
  nomor_hp: z.string().nullable(),
  email: z.string().nullable(),
  status: statusEnum,
  user_id: z.number(),
  created_at: z.coerce.date()
});

export type Guru = z.infer<typeof guruSchema>;

export const createGuruInputSchema = z.object({
  nama_guru: z.string(),
  nip_nik: z.string(),
  nomor_hp: z.string().nullable(),
  email: z.string().nullable(),
  status: statusEnum,
  user_id: z.number()
});

export type CreateGuruInput = z.infer<typeof createGuruInputSchema>;

// Kelas schema
export const kelasSchema = z.object({
  id: z.number(),
  nama_kelas: z.string(),
  tingkat: z.string(),
  wali_kelas_id: z.number(),
  created_at: z.coerce.date()
});

export type Kelas = z.infer<typeof kelasSchema>;

export const createKelasInputSchema = z.object({
  nama_kelas: z.string(),
  tingkat: z.string(),
  wali_kelas_id: z.number()
});

export type CreateKelasInput = z.infer<typeof createKelasInputSchema>;

// Siswa schema
export const siswaSchema = z.object({
  id: z.number(),
  nama_siswa: z.string(),
  nisn: z.string(),
  nis: z.string(),
  tanggal_lahir: z.coerce.date(),
  nomor_hp: z.string().nullable(),
  email: z.string().nullable(),
  kelas_id: z.number(),
  status: statusSiswaEnum,
  user_id: z.number(),
  created_at: z.coerce.date()
});

export type Siswa = z.infer<typeof siswaSchema>;

export const createSiswaInputSchema = z.object({
  nama_siswa: z.string(),
  nisn: z.string(),
  nis: z.string(),
  tanggal_lahir: z.string().transform(str => new Date(str)),
  nomor_hp: z.string().nullable(),
  email: z.string().nullable(),
  kelas_id: z.number(),
  status: statusSiswaEnum,
  user_id: z.number()
});

export type CreateSiswaInput = z.infer<typeof createSiswaInputSchema>;

// Bank schema
export const bankSchema = z.object({
  id: z.number(),
  nama_bank: z.string(),
  created_at: z.coerce.date()
});

export type Bank = z.infer<typeof bankSchema>;

export const createBankInputSchema = z.object({
  nama_bank: z.string()
});

export type CreateBankInput = z.infer<typeof createBankInputSchema>;

// Jenis Rekening schema
export const jenisRekeningSchema = z.object({
  id: z.number(),
  nama_jenis_rekening: z.string(),
  created_at: z.coerce.date()
});

export type JenisRekening = z.infer<typeof jenisRekeningSchema>;

export const createJenisRekeningInputSchema = z.object({
  nama_jenis_rekening: z.string()
});

export type CreateJenisRekeningInput = z.infer<typeof createJenisRekeningInputSchema>;

// Rekening Siswa schema
export const rekeningSiswaSchema = z.object({
  id: z.number(),
  siswa_id: z.number(),
  bank_id: z.number(),
  jenis_rekening_id: z.number(),
  nomor_rekening: z.string(),
  created_at: z.coerce.date()
});

export type RekeningSiswa = z.infer<typeof rekeningSiswaSchema>;

export const createRekeningSiswaInputSchema = z.object({
  siswa_id: z.number(),
  bank_id: z.number(),
  jenis_rekening_id: z.number(),
  nomor_rekening: z.string()
});

export type CreateRekeningSiswaInput = z.infer<typeof createRekeningSiswaInputSchema>;

// Transaksi schema
export const transaksiSchema = z.object({
  id: z.number(),
  siswa_id: z.number(),
  tanggal_transaksi: z.coerce.date(),
  jumlah: z.number(),
  jenis_transaksi: jenisTransaksiEnum,
  status_verifikasi: statusVerifikasiEnum,
  catatan_penolakan: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Transaksi = z.infer<typeof transaksiSchema>;

export const createTransaksiInputSchema = z.object({
  siswa_id: z.number(),
  tanggal_transaksi: z.string().transform(str => new Date(str)),
  jumlah: z.number().positive(),
  jenis_transaksi: jenisTransaksiEnum
});

export type CreateTransaksiInput = z.infer<typeof createTransaksiInputSchema>;

export const verifyTransaksiInputSchema = z.object({
  id: z.number(),
  status_verifikasi: statusVerifikasiEnum,
  catatan_penolakan: z.string().nullable()
});

export type VerifyTransaksiInput = z.infer<typeof verifyTransaksiInputSchema>;

// Log Sistem schema
export const logSistemSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  aksi: z.string(),
  tanggal: z.coerce.date(),
  keterangan: z.string().nullable(),
  created_at: z.coerce.date()
});

export type LogSistem = z.infer<typeof logSistemSchema>;

export const createLogSistemInputSchema = z.object({
  user_id: z.number(),
  aksi: z.string(),
  keterangan: z.string().nullable()
});

export type CreateLogSistemInput = z.infer<typeof createLogSistemInputSchema>;

// Harapan Siswa schema
export const harapanSiswaSchema = z.object({
  id: z.number(),
  siswa_id: z.number(),
  isi_harapan: z.string(),
  tanggal_harapan: z.coerce.date(),
  created_at: z.coerce.date()
});

export type HarapanSiswa = z.infer<typeof harapanSiswaSchema>;

export const createHarapanSiswaInputSchema = z.object({
  siswa_id: z.number(),
  isi_harapan: z.string()
});

export type CreateHarapanSiswaInput = z.infer<typeof createHarapanSiswaInputSchema>;

// Badges Siswa schema
export const badgesSiswaSchema = z.object({
  id: z.number(),
  siswa_id: z.number(),
  nama_badge: z.string(),
  tanggal_dapat: z.coerce.date(),
  created_at: z.coerce.date()
});

export type BadgesSiswa = z.infer<typeof badgesSiswaSchema>;

export const createBadgesSiswaInputSchema = z.object({
  siswa_id: z.number(),
  nama_badge: z.string()
});

export type CreateBadgesSiswaInput = z.infer<typeof createBadgesSiswaInputSchema>;

// Response schemas for complex queries
export const siswaWithDetailsSchema = z.object({
  id: z.number(),
  nama_siswa: z.string(),
  nisn: z.string(),
  nis: z.string(),
  tanggal_lahir: z.coerce.date(),
  nomor_hp: z.string().nullable(),
  email: z.string().nullable(),
  status: statusSiswaEnum,
  kelas: z.object({
    id: z.number(),
    nama_kelas: z.string(),
    tingkat: z.string()
  }),
  total_tabungan: z.number(),
  jumlah_transaksi: z.number()
});

export type SiswaWithDetails = z.infer<typeof siswaWithDetailsSchema>;

export const leaderboardItemSchema = z.object({
  siswa_id: z.number(),
  nama_siswa: z.string(),
  nama_kelas: z.string(),
  total_tabungan: z.number(),
  jumlah_menabung: z.number(),
  rank: z.number()
});

export type LeaderboardItem = z.infer<typeof leaderboardItemSchema>;

export const kelasLeaderboardItemSchema = z.object({
  kelas_id: z.number(),
  nama_kelas: z.string(),
  tingkat: z.string(),
  total_transaksi: z.number(),
  total_siswa_aktif: z.number(),
  rank: z.number()
});

export type KelasLeaderboardItem = z.infer<typeof kelasLeaderboardItemSchema>;