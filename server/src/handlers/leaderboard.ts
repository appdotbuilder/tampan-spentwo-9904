import { db } from '../db';
import { 
  siswaTable, 
  kelasTable, 
  transaksiTable 
} from '../db/schema';
import { type LeaderboardItem, type KelasLeaderboardItem } from '../schema';
import { eq, sql, desc, count, sum, and } from 'drizzle-orm';

export async function getStudentLeaderboard(limit: number = 10): Promise<LeaderboardItem[]> {
  try {
    // Query to get student leaderboard with savings count and total savings
    const results = await db
      .select({
        siswa_id: siswaTable.id,
        nama_siswa: siswaTable.nama_siswa,
        nama_kelas: kelasTable.nama_kelas,
        total_tabungan: sql<string>`COALESCE(SUM(CASE WHEN ${transaksiTable.jenis_transaksi} = 'menabung' AND ${transaksiTable.status_verifikasi} = 'terverifikasi' THEN ${transaksiTable.jumlah} ELSE 0 END) - SUM(CASE WHEN ${transaksiTable.jenis_transaksi} = 'menarik' AND ${transaksiTable.status_verifikasi} = 'terverifikasi' THEN ${transaksiTable.jumlah} ELSE 0 END), 0)`,
        jumlah_menabung: sql<string>`COALESCE(COUNT(CASE WHEN ${transaksiTable.jenis_transaksi} = 'menabung' AND ${transaksiTable.status_verifikasi} = 'terverifikasi' THEN 1 END), 0)`,
      })
      .from(siswaTable)
      .innerJoin(kelasTable, eq(siswaTable.kelas_id, kelasTable.id))
      .leftJoin(transaksiTable, eq(siswaTable.id, transaksiTable.siswa_id))
      .where(eq(siswaTable.status, 'aktif'))
      .groupBy(siswaTable.id, siswaTable.nama_siswa, kelasTable.nama_kelas)
      .orderBy(
        desc(sql`COUNT(CASE WHEN ${transaksiTable.jenis_transaksi} = 'menabung' AND ${transaksiTable.status_verifikasi} = 'terverifikasi' THEN 1 END)`),
        desc(sql`COALESCE(SUM(CASE WHEN ${transaksiTable.jenis_transaksi} = 'menabung' AND ${transaksiTable.status_verifikasi} = 'terverifikasi' THEN ${transaksiTable.jumlah} ELSE 0 END) - SUM(CASE WHEN ${transaksiTable.jenis_transaksi} = 'menarik' AND ${transaksiTable.status_verifikasi} = 'terverifikasi' THEN ${transaksiTable.jumlah} ELSE 0 END), 0)`),
        siswaTable.nama_siswa
      )
      .limit(limit)
      .execute();

    // Add rank to results
    return results.map((result, index) => ({
      siswa_id: result.siswa_id,
      nama_siswa: result.nama_siswa,
      nama_kelas: result.nama_kelas,
      total_tabungan: parseFloat(result.total_tabungan),
      jumlah_menabung: parseInt(result.jumlah_menabung),
      rank: index + 1
    }));
  } catch (error) {
    console.error('Student leaderboard fetch failed:', error);
    throw error;
  }
}

export async function getKelasLeaderboard(limit: number = 10): Promise<KelasLeaderboardItem[]> {
  try {
    // Query to get class leaderboard with total transactions and active students
    const results = await db
      .select({
        kelas_id: kelasTable.id,
        nama_kelas: kelasTable.nama_kelas,
        tingkat: kelasTable.tingkat,
        total_transaksi: sql<string>`COALESCE(COUNT(${transaksiTable.id}), 0)`,
        total_siswa_aktif: sql<string>`COUNT(DISTINCT ${siswaTable.id})`,
      })
      .from(kelasTable)
      .leftJoin(siswaTable, and(
        eq(kelasTable.id, siswaTable.kelas_id),
        eq(siswaTable.status, 'aktif')
      ))
      .leftJoin(transaksiTable, and(
        eq(siswaTable.id, transaksiTable.siswa_id),
        eq(transaksiTable.status_verifikasi, 'terverifikasi')
      ))
      .groupBy(kelasTable.id, kelasTable.nama_kelas, kelasTable.tingkat)
      .orderBy(
        desc(sql`COALESCE(COUNT(${transaksiTable.id}), 0)`),
        desc(sql`COUNT(DISTINCT ${siswaTable.id})`),
        kelasTable.nama_kelas
      )
      .limit(limit)
      .execute();

    // Add rank to results
    return results.map((result, index) => ({
      kelas_id: result.kelas_id,
      nama_kelas: result.nama_kelas,
      tingkat: result.tingkat,
      total_transaksi: parseInt(result.total_transaksi),
      total_siswa_aktif: parseInt(result.total_siswa_aktif),
      rank: index + 1
    }));
  } catch (error) {
    console.error('Class leaderboard fetch failed:', error);
    throw error;
  }
}

export async function getStudentRankBySiswaId(siswaId: number): Promise<number> {
  try {
    // Get all students with their savings count, ordered same as leaderboard
    const allStudents = await db
      .select({
        siswa_id: siswaTable.id,
        jumlah_menabung: sql<string>`COALESCE(COUNT(CASE WHEN ${transaksiTable.jenis_transaksi} = 'menabung' AND ${transaksiTable.status_verifikasi} = 'terverifikasi' THEN 1 END), 0)`,
        total_tabungan: sql<string>`COALESCE(SUM(CASE WHEN ${transaksiTable.jenis_transaksi} = 'menabung' AND ${transaksiTable.status_verifikasi} = 'terverifikasi' THEN ${transaksiTable.jumlah} ELSE 0 END) - SUM(CASE WHEN ${transaksiTable.jenis_transaksi} = 'menarik' AND ${transaksiTable.status_verifikasi} = 'terverifikasi' THEN ${transaksiTable.jumlah} ELSE 0 END), 0)`,
        nama_siswa: siswaTable.nama_siswa
      })
      .from(siswaTable)
      .leftJoin(transaksiTable, eq(siswaTable.id, transaksiTable.siswa_id))
      .where(eq(siswaTable.status, 'aktif'))
      .groupBy(siswaTable.id, siswaTable.nama_siswa)
      .orderBy(
        desc(sql`COUNT(CASE WHEN ${transaksiTable.jenis_transaksi} = 'menabung' AND ${transaksiTable.status_verifikasi} = 'terverifikasi' THEN 1 END)`),
        desc(sql`COALESCE(SUM(CASE WHEN ${transaksiTable.jenis_transaksi} = 'menabung' AND ${transaksiTable.status_verifikasi} = 'terverifikasi' THEN ${transaksiTable.jumlah} ELSE 0 END) - SUM(CASE WHEN ${transaksiTable.jenis_transaksi} = 'menarik' AND ${transaksiTable.status_verifikasi} = 'terverifikasi' THEN ${transaksiTable.jumlah} ELSE 0 END), 0)`),
        siswaTable.nama_siswa
      )
      .execute();

    // Find the rank of the specified student
    const studentIndex = allStudents.findIndex(student => student.siswa_id === siswaId);
    return studentIndex === -1 ? 0 : studentIndex + 1;
  } catch (error) {
    console.error('Student rank fetch failed:', error);
    throw error;
  }
}

export async function getKelasRankByKelasId(kelasId: number): Promise<number> {
  try {
    // Get all classes with their transaction count, ordered same as leaderboard
    const allClasses = await db
      .select({
        kelas_id: kelasTable.id,
        total_transaksi: sql<string>`COALESCE(COUNT(${transaksiTable.id}), 0)`,
        total_siswa_aktif: sql<string>`COUNT(DISTINCT ${siswaTable.id})`,
      })
      .from(kelasTable)
      .leftJoin(siswaTable, and(
        eq(kelasTable.id, siswaTable.kelas_id),
        eq(siswaTable.status, 'aktif')
      ))
      .leftJoin(transaksiTable, and(
        eq(siswaTable.id, transaksiTable.siswa_id),
        eq(transaksiTable.status_verifikasi, 'terverifikasi')
      ))
      .groupBy(kelasTable.id, kelasTable.nama_kelas, kelasTable.tingkat)
      .orderBy(
        desc(sql`COALESCE(COUNT(${transaksiTable.id}), 0)`),
        desc(sql`COUNT(DISTINCT ${siswaTable.id})`),
        kelasTable.nama_kelas
      )
      .execute();

    // Find the rank of the specified class
    const classIndex = allClasses.findIndex(kelas => kelas.kelas_id === kelasId);
    return classIndex === -1 ? 0 : classIndex + 1;
  } catch (error) {
    console.error('Class rank fetch failed:', error);
    throw error;
  }
}