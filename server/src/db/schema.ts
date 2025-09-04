import { serial, text, pgTable, timestamp, numeric, integer, pgEnum, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin_sekolah', 'wali_kelas', 'siswa']);
export const statusEnum = pgEnum('status', ['aktif', 'tidak_aktif']);
export const statusSiswaEnum = pgEnum('status_siswa', ['aktif', 'lulus', 'tidak_aktif']);
export const jenisTransaksiEnum = pgEnum('jenis_transaksi', ['menabung', 'menarik']);
export const statusVerifikasiEnum = pgEnum('status_verifikasi', ['menunggu', 'terverifikasi', 'ditolak']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Sekolah table
export const sekolahTable = pgTable('sekolah', {
  id: serial('id').primaryKey(),
  nama_sekolah: text('nama_sekolah').notNull(),
  npsn: text('npsn').notNull(),
  jenjang: text('jenjang').notNull(),
  jenis_sekolah: text('jenis_sekolah').notNull(),
  nama_kepala_sekolah: text('nama_kepala_sekolah').notNull(),
  nip_nik_kepala: text('nip_nik_kepala').notNull(),
  alamat_sekolah: text('alamat_sekolah').notNull(),
  nomor_telepon: text('nomor_telepon'),
  email: text('email'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Guru table
export const guruTable = pgTable('guru', {
  id: serial('id').primaryKey(),
  nama_guru: text('nama_guru').notNull(),
  nip_nik: text('nip_nik').notNull(),
  nomor_hp: text('nomor_hp'),
  email: text('email'),
  status: statusEnum('status').notNull().default('aktif'),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Kelas table
export const kelasTable = pgTable('kelas', {
  id: serial('id').primaryKey(),
  nama_kelas: text('nama_kelas').notNull(),
  tingkat: text('tingkat').notNull(),
  wali_kelas_id: integer('wali_kelas_id').notNull().references(() => guruTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Siswa table
export const siswaTable = pgTable('siswa', {
  id: serial('id').primaryKey(),
  nama_siswa: text('nama_siswa').notNull(),
  nisn: text('nisn').notNull(),
  nis: text('nis').notNull(),
  tanggal_lahir: date('tanggal_lahir').notNull(),
  nomor_hp: text('nomor_hp'),
  email: text('email'),
  kelas_id: integer('kelas_id').notNull().references(() => kelasTable.id),
  status: statusSiswaEnum('status').notNull().default('aktif'),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Bank table
export const bankTable = pgTable('bank', {
  id: serial('id').primaryKey(),
  nama_bank: text('nama_bank').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Jenis Rekening table
export const jenisRekeningTable = pgTable('jenis_rekening', {
  id: serial('id').primaryKey(),
  nama_jenis_rekening: text('nama_jenis_rekening').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Rekening Siswa table
export const rekeningSiswaTable = pgTable('rekening_siswa', {
  id: serial('id').primaryKey(),
  siswa_id: integer('siswa_id').notNull().references(() => siswaTable.id),
  bank_id: integer('bank_id').notNull().references(() => bankTable.id),
  jenis_rekening_id: integer('jenis_rekening_id').notNull().references(() => jenisRekeningTable.id),
  nomor_rekening: text('nomor_rekening').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Transaksi table
export const transaksiTable = pgTable('transaksi', {
  id: serial('id').primaryKey(),
  siswa_id: integer('siswa_id').notNull().references(() => siswaTable.id),
  tanggal_transaksi: timestamp('tanggal_transaksi').notNull(),
  jumlah: numeric('jumlah', { precision: 15, scale: 2 }).notNull(),
  jenis_transaksi: jenisTransaksiEnum('jenis_transaksi').notNull(),
  status_verifikasi: statusVerifikasiEnum('status_verifikasi').notNull().default('menunggu'),
  catatan_penolakan: text('catatan_penolakan'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Log Sistem table
export const logSistemTable = pgTable('log_sistem', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  aksi: text('aksi').notNull(),
  tanggal: timestamp('tanggal').defaultNow().notNull(),
  keterangan: text('keterangan'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Harapan Siswa table
export const harapanSiswaTable = pgTable('harapan_siswa', {
  id: serial('id').primaryKey(),
  siswa_id: integer('siswa_id').notNull().references(() => siswaTable.id),
  isi_harapan: text('isi_harapan').notNull(),
  tanggal_harapan: timestamp('tanggal_harapan').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Badges Siswa table
export const badgesSiswaTable = pgTable('badges_siswa', {
  id: serial('id').primaryKey(),
  siswa_id: integer('siswa_id').notNull().references(() => siswaTable.id),
  nama_badge: text('nama_badge').notNull(),
  tanggal_dapat: timestamp('tanggal_dapat').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ one, many }) => ({
  guru: one(guruTable, {
    fields: [usersTable.id],
    references: [guruTable.user_id],
  }),
  siswa: one(siswaTable, {
    fields: [usersTable.id],
    references: [siswaTable.user_id],
  }),
  logSistem: many(logSistemTable),
}));

export const guruRelations = relations(guruTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [guruTable.user_id],
    references: [usersTable.id],
  }),
  kelasAsWali: many(kelasTable),
}));

export const kelasRelations = relations(kelasTable, ({ one, many }) => ({
  waliKelas: one(guruTable, {
    fields: [kelasTable.wali_kelas_id],
    references: [guruTable.id],
  }),
  siswa: many(siswaTable),
}));

export const siswaRelations = relations(siswaTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [siswaTable.user_id],
    references: [usersTable.id],
  }),
  kelas: one(kelasTable, {
    fields: [siswaTable.kelas_id],
    references: [kelasTable.id],
  }),
  rekenings: many(rekeningSiswaTable),
  transaksis: many(transaksiTable),
  harapans: many(harapanSiswaTable),
  badges: many(badgesSiswaTable),
}));

export const bankRelations = relations(bankTable, ({ many }) => ({
  rekenings: many(rekeningSiswaTable),
}));

export const jenisRekeningRelations = relations(jenisRekeningTable, ({ many }) => ({
  rekenings: many(rekeningSiswaTable),
}));

export const rekeningSiswaRelations = relations(rekeningSiswaTable, ({ one }) => ({
  siswa: one(siswaTable, {
    fields: [rekeningSiswaTable.siswa_id],
    references: [siswaTable.id],
  }),
  bank: one(bankTable, {
    fields: [rekeningSiswaTable.bank_id],
    references: [bankTable.id],
  }),
  jenisRekening: one(jenisRekeningTable, {
    fields: [rekeningSiswaTable.jenis_rekening_id],
    references: [jenisRekeningTable.id],
  }),
}));

export const transaksiRelations = relations(transaksiTable, ({ one }) => ({
  siswa: one(siswaTable, {
    fields: [transaksiTable.siswa_id],
    references: [siswaTable.id],
  }),
}));

export const logSistemRelations = relations(logSistemTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [logSistemTable.user_id],
    references: [usersTable.id],
  }),
}));

export const harapanSiswaRelations = relations(harapanSiswaTable, ({ one }) => ({
  siswa: one(siswaTable, {
    fields: [harapanSiswaTable.siswa_id],
    references: [siswaTable.id],
  }),
}));

export const badgesSiswaRelations = relations(badgesSiswaTable, ({ one }) => ({
  siswa: one(siswaTable, {
    fields: [badgesSiswaTable.siswa_id],
    references: [siswaTable.id],
  }),
}));

// Export all tables for drizzle schema
export const tables = {
  users: usersTable,
  sekolah: sekolahTable,
  guru: guruTable,
  kelas: kelasTable,
  siswa: siswaTable,
  bank: bankTable,
  jenisRekening: jenisRekeningTable,
  rekeningSiswa: rekeningSiswaTable,
  transaksi: transaksiTable,
  logSistem: logSistemTable,
  harapanSiswa: harapanSiswaTable,
  badgesSiswa: badgesSiswaTable,
};