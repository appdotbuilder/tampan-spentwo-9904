import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  loginInputSchema,
  createUserInputSchema,
  createSekolahInputSchema,
  createGuruInputSchema,
  createKelasInputSchema,
  createSiswaInputSchema,
  createBankInputSchema,
  createJenisRekeningInputSchema,
  createRekeningSiswaInputSchema,
  createTransaksiInputSchema,
  verifyTransaksiInputSchema,
  createLogSistemInputSchema,
  createHarapanSiswaInputSchema,
  createBadgesSiswaInputSchema
} from './schema';

// Import handlers
import { login, resetPassword } from './handlers/auth';
import { createUser, getUsers, getUserById } from './handlers/users';
import { createSekolah, getSekolah, updateSekolah, deleteSekolah } from './handlers/sekolah';
import { createGuru, getGuru, getGuruById, updateGuru, deleteGuru } from './handlers/guru';
import { createKelas, getKelas, getKelasByWaliKelas, updateKelas, deleteKelas } from './handlers/kelas';
import { createSiswa, getSiswa, getSiswaByKelas, getSiswaByWaliKelas, getSiswaById, updateSiswa, deleteSiswa } from './handlers/siswa';
import { createBank, getBanks, createJenisRekening, getJenisRekening, createRekeningSiswa, getRekeningSiswa } from './handlers/bank';
import { createTransaksi, getTransaksi, getTransaksiBySiswa, getTransaksiByStatus, verifyTransaksi, getTotalTabunganBySiswa } from './handlers/transaksi';
import { createHarapanSiswa, getHarapanSiswa, getHarapanBySiswa, getHarapanByWaliKelas, deleteHarapanSiswa } from './handlers/harapan';
import { createBadgesSiswa, getBadgesSiswa, getBadgesBySiswa, checkAndAwardBadges, deleteBadgesSiswa } from './handlers/badges';
import { getStudentLeaderboard, getKelasLeaderboard, getStudentRankBySiswaId, getKelasRankByKelasId } from './handlers/leaderboard';
import { createLogSistem, getLogSistem, getLogByUser, getLogByDateRange } from './handlers/log';
import { getTransactionReport, getReportSummary, getMonthlyReport, exportReportToExcel } from './handlers/reports';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  resetPassword: publicProcedure
    .input(z.object({ userId: z.number(), newPassword: z.string() }))
    .mutation(({ input }) => resetPassword(input.userId, input.newPassword)),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  getUserById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getUserById(input.id)),

  // School data routes
  createSekolah: publicProcedure
    .input(createSekolahInputSchema)
    .mutation(({ input }) => createSekolah(input)),

  getSekolah: publicProcedure
    .query(() => getSekolah()),

  updateSekolah: publicProcedure
    .input(z.object({ id: z.number(), data: createSekolahInputSchema.partial() }))
    .mutation(({ input }) => updateSekolah(input.id, input.data)),

  deleteSekolah: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteSekolah(input.id)),

  // Teacher/Guru routes
  createGuru: publicProcedure
    .input(createGuruInputSchema)
    .mutation(({ input }) => createGuru(input)),

  getGuru: publicProcedure
    .query(() => getGuru()),

  getGuruById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getGuruById(input.id)),

  updateGuru: publicProcedure
    .input(z.object({ id: z.number(), data: createGuruInputSchema.partial() }))
    .mutation(({ input }) => updateGuru(input.id, input.data)),

  deleteGuru: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteGuru(input.id)),

  // Class routes
  createKelas: publicProcedure
    .input(createKelasInputSchema)
    .mutation(({ input }) => createKelas(input)),

  getKelas: publicProcedure
    .query(() => getKelas()),

  getKelasByWaliKelas: publicProcedure
    .input(z.object({ waliKelasId: z.number() }))
    .query(({ input }) => getKelasByWaliKelas(input.waliKelasId)),

  updateKelas: publicProcedure
    .input(z.object({ id: z.number(), data: createKelasInputSchema.partial() }))
    .mutation(({ input }) => updateKelas(input.id, input.data)),

  deleteKelas: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteKelas(input.id)),

  // Student routes
  createSiswa: publicProcedure
    .input(createSiswaInputSchema)
    .mutation(({ input }) => createSiswa(input)),

  getSiswa: publicProcedure
    .query(() => getSiswa()),

  getSiswaByKelas: publicProcedure
    .input(z.object({ kelasId: z.number() }))
    .query(({ input }) => getSiswaByKelas(input.kelasId)),

  getSiswaByWaliKelas: publicProcedure
    .input(z.object({ waliKelasId: z.number() }))
    .query(({ input }) => getSiswaByWaliKelas(input.waliKelasId)),

  getSiswaById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getSiswaById(input.id)),

  updateSiswa: publicProcedure
    .input(z.object({ id: z.number(), data: createSiswaInputSchema.partial() }))
    .mutation(({ input }) => updateSiswa(input.id, input.data)),

  deleteSiswa: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteSiswa(input.id)),

  // Bank and account routes
  createBank: publicProcedure
    .input(createBankInputSchema)
    .mutation(({ input }) => createBank(input)),

  getBanks: publicProcedure
    .query(() => getBanks()),

  createJenisRekening: publicProcedure
    .input(createJenisRekeningInputSchema)
    .mutation(({ input }) => createJenisRekening(input)),

  getJenisRekening: publicProcedure
    .query(() => getJenisRekening()),

  createRekeningSiswa: publicProcedure
    .input(createRekeningSiswaInputSchema)
    .mutation(({ input }) => createRekeningSiswa(input)),

  getRekeningSiswa: publicProcedure
    .query(() => getRekeningSiswa()),

  // Transaction routes
  createTransaksi: publicProcedure
    .input(createTransaksiInputSchema)
    .mutation(({ input }) => createTransaksi(input)),

  getTransaksi: publicProcedure
    .query(() => getTransaksi()),

  getTransaksiBySiswa: publicProcedure
    .input(z.object({ siswaId: z.number() }))
    .query(({ input }) => getTransaksiBySiswa(input.siswaId)),

  getTransaksiByStatus: publicProcedure
    .input(z.object({ status: z.enum(['menunggu', 'terverifikasi', 'ditolak']) }))
    .query(({ input }) => getTransaksiByStatus(input.status)),

  verifyTransaksi: publicProcedure
    .input(verifyTransaksiInputSchema)
    .mutation(({ input }) => verifyTransaksi(input)),

  getTotalTabunganBySiswa: publicProcedure
    .input(z.object({ siswaId: z.number() }))
    .query(({ input }) => getTotalTabunganBySiswa(input.siswaId)),

  // Hope/Harapan routes
  createHarapanSiswa: publicProcedure
    .input(createHarapanSiswaInputSchema)
    .mutation(({ input }) => createHarapanSiswa(input)),

  getHarapanSiswa: publicProcedure
    .query(() => getHarapanSiswa()),

  getHarapanBySiswa: publicProcedure
    .input(z.object({ siswaId: z.number() }))
    .query(({ input }) => getHarapanBySiswa(input.siswaId)),

  getHarapanByWaliKelas: publicProcedure
    .input(z.object({ waliKelasId: z.number() }))
    .query(({ input }) => getHarapanByWaliKelas(input.waliKelasId)),

  deleteHarapanSiswa: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteHarapanSiswa(input.id)),

  // Badges routes
  createBadgesSiswa: publicProcedure
    .input(createBadgesSiswaInputSchema)
    .mutation(({ input }) => createBadgesSiswa(input)),

  getBadgesSiswa: publicProcedure
    .query(() => getBadgesSiswa()),

  getBadgesBySiswa: publicProcedure
    .input(z.object({ siswaId: z.number() }))
    .query(({ input }) => getBadgesBySiswa(input.siswaId)),

  checkAndAwardBadges: publicProcedure
    .input(z.object({ siswaId: z.number() }))
    .mutation(({ input }) => checkAndAwardBadges(input.siswaId)),

  deleteBadgesSiswa: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteBadgesSiswa(input.id)),

  // Leaderboard routes
  getStudentLeaderboard: publicProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(({ input }) => getStudentLeaderboard(input.limit)),

  getKelasLeaderboard: publicProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(({ input }) => getKelasLeaderboard(input.limit)),

  getStudentRankBySiswaId: publicProcedure
    .input(z.object({ siswaId: z.number() }))
    .query(({ input }) => getStudentRankBySiswaId(input.siswaId)),

  getKelasRankByKelasId: publicProcedure
    .input(z.object({ kelasId: z.number() }))
    .query(({ input }) => getKelasRankByKelasId(input.kelasId)),

  // System log routes
  createLogSistem: publicProcedure
    .input(createLogSistemInputSchema)
    .mutation(({ input }) => createLogSistem(input)),

  getLogSistem: publicProcedure
    .query(() => getLogSistem()),

  getLogByUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getLogByUser(input.userId)),

  getLogByDateRange: publicProcedure
    .input(z.object({ startDate: z.string().transform(str => new Date(str)), endDate: z.string().transform(str => new Date(str)) }))
    .query(({ input }) => getLogByDateRange(input.startDate, input.endDate)),

  // Report routes
  getTransactionReport: publicProcedure
    .input(z.object({
      startDate: z.string().transform(str => new Date(str)).optional(),
      endDate: z.string().transform(str => new Date(str)).optional(),
      kelasId: z.number().optional()
    }))
    .query(({ input }) => getTransactionReport(input.startDate, input.endDate, input.kelasId)),

  getReportSummary: publicProcedure
    .input(z.object({
      startDate: z.string().transform(str => new Date(str)).optional(),
      endDate: z.string().transform(str => new Date(str)).optional(),
      kelasId: z.number().optional()
    }))
    .query(({ input }) => getReportSummary(input.startDate, input.endDate, input.kelasId)),

  getMonthlyReport: publicProcedure
    .input(z.object({ year: z.number(), kelasId: z.number().optional() }))
    .query(({ input }) => getMonthlyReport(input.year, input.kelasId)),

  exportReportToExcel: publicProcedure
    .input(z.object({ 
      transactionIds: z.array(z.number()), 
      filename: z.string() 
    }))
    .mutation(({ input }) => {
      // This would normally fetch transactions by IDs and export them
      return exportReportToExcel([], input.filename);
    })
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TAMPAN SPENTWO V.1x TRPC server listening at port: ${port}`);
}

start();