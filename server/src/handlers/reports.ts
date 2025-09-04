import { db } from '../db';
import { transaksiTable, siswaTable, kelasTable } from '../db/schema';
import { type Transaksi } from '../schema';
import { and, eq, gte, lte, sql, count, sum, avg, desc } from 'drizzle-orm';

export interface ReportSummary {
    total_transaksi: number;
    total_menabung: number;
    total_menarik: number;
    jumlah_siswa_aktif: number;
    rata_rata_tabungan: number;
}

export interface MonthlyReport {
    bulan: string;
    tahun: number;
    total_transaksi: number;
    total_menabung: number;
    total_menarik: number;
}

export async function getTransactionReport(
    startDate?: Date, 
    endDate?: Date, 
    kelasId?: number
): Promise<Transaksi[]> {
    try {
        // Build conditions array
        const conditions: any[] = [];

        // Add date filters
        if (startDate) {
            conditions.push(gte(transaksiTable.tanggal_transaksi, startDate));
        }

        if (endDate) {
            conditions.push(lte(transaksiTable.tanggal_transaksi, endDate));
        }

        let results;

        if (kelasId) {
            // Query with join for class filter
            conditions.push(eq(siswaTable.kelas_id, kelasId));
            
            const query = db.select({
                id: transaksiTable.id,
                siswa_id: transaksiTable.siswa_id,
                tanggal_transaksi: transaksiTable.tanggal_transaksi,
                jumlah: transaksiTable.jumlah,
                jenis_transaksi: transaksiTable.jenis_transaksi,
                status_verifikasi: transaksiTable.status_verifikasi,
                catatan_penolakan: transaksiTable.catatan_penolakan,
                created_at: transaksiTable.created_at
            })
            .from(transaksiTable)
            .innerJoin(siswaTable, eq(transaksiTable.siswa_id, siswaTable.id))
            .where(conditions.length === 1 ? conditions[0] : and(...conditions))
            .orderBy(desc(transaksiTable.tanggal_transaksi));

            results = await query.execute();
        } else {
            // Query without join
            const query = db.select()
                .from(transaksiTable)
                .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined)
                .orderBy(desc(transaksiTable.tanggal_transaksi));

            results = await query.execute();
        }

        // Convert numeric fields to numbers
        return results.map(result => ({
            ...result,
            jumlah: parseFloat(result.jumlah) // Convert numeric to number
        }));
    } catch (error) {
        console.error('Transaction report generation failed:', error);
        throw error;
    }
}

export async function getReportSummary(
    startDate?: Date, 
    endDate?: Date, 
    kelasId?: number
): Promise<ReportSummary> {
    try {
        const conditions: any[] = [];

        // Add date filters
        if (startDate) {
            conditions.push(gte(transaksiTable.tanggal_transaksi, startDate));
        }

        if (endDate) {
            conditions.push(lte(transaksiTable.tanggal_transaksi, endDate));
        }

        let summaryResult;

        if (kelasId) {
            // Query with class filter
            conditions.push(eq(siswaTable.kelas_id, kelasId));
            
            const summaryQuery = db.select({
                total_transaksi: count(transaksiTable.id),
                total_menabung: sum(
                    sql`CASE WHEN ${transaksiTable.jenis_transaksi} = 'menabung' THEN ${transaksiTable.jumlah} ELSE 0 END`
                ),
                total_menarik: sum(
                    sql`CASE WHEN ${transaksiTable.jenis_transaksi} = 'menarik' THEN ${transaksiTable.jumlah} ELSE 0 END`
                )
            })
            .from(transaksiTable)
            .innerJoin(siswaTable, eq(transaksiTable.siswa_id, siswaTable.id))
            .where(conditions.length === 1 ? conditions[0] : and(...conditions));

            summaryResult = await summaryQuery.execute();
        } else {
            // Query without class filter
            const summaryQuery = db.select({
                total_transaksi: count(transaksiTable.id),
                total_menabung: sum(
                    sql`CASE WHEN ${transaksiTable.jenis_transaksi} = 'menabung' THEN ${transaksiTable.jumlah} ELSE 0 END`
                ),
                total_menarik: sum(
                    sql`CASE WHEN ${transaksiTable.jenis_transaksi} = 'menarik' THEN ${transaksiTable.jumlah} ELSE 0 END`
                )
            })
            .from(transaksiTable)
            .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined);

            summaryResult = await summaryQuery.execute();
        }

        // Query for active students count
        const activeStudentsQuery = kelasId 
            ? db.select({
                jumlah_siswa_aktif: count(siswaTable.id)
              })
              .from(siswaTable)
              .where(and(eq(siswaTable.status, 'aktif'), eq(siswaTable.kelas_id, kelasId)))
            : db.select({
                jumlah_siswa_aktif: count(siswaTable.id)
              })
              .from(siswaTable)
              .where(eq(siswaTable.status, 'aktif'));

        const activeStudentsResult = await activeStudentsQuery.execute();

        // Calculate average savings - get all students' net savings first
        const savingsConditions = [
            eq(siswaTable.status, 'aktif'),
            eq(transaksiTable.status_verifikasi, 'terverifikasi')
        ];

        if (kelasId) {
            savingsConditions.push(eq(siswaTable.kelas_id, kelasId));
        }
        if (startDate) {
            savingsConditions.push(gte(transaksiTable.tanggal_transaksi, startDate));
        }
        if (endDate) {
            savingsConditions.push(lte(transaksiTable.tanggal_transaksi, endDate));
        }

        const savingsQuery = db.select({
            siswa_id: transaksiTable.siswa_id,
            net_savings: sum(
                sql`CASE WHEN ${transaksiTable.jenis_transaksi} = 'menabung' THEN ${transaksiTable.jumlah} ELSE -${transaksiTable.jumlah} END`
            )
        })
        .from(transaksiTable)
        .innerJoin(siswaTable, eq(transaksiTable.siswa_id, siswaTable.id))
        .where(and(...savingsConditions))
        .groupBy(transaksiTable.siswa_id);

        const savingsResults = await savingsQuery.execute();
        const totalSavings = savingsResults.reduce((sum, student) => sum + parseFloat(student.net_savings || '0'), 0);
        const avgSavings = savingsResults.length > 0 ? totalSavings / savingsResults.length : 0;

        const summary = summaryResult[0];
        const activeStudents = activeStudentsResult[0];

        return {
            total_transaksi: summary.total_transaksi || 0,
            total_menabung: parseFloat(summary.total_menabung || '0'),
            total_menarik: parseFloat(summary.total_menarik || '0'),
            jumlah_siswa_aktif: activeStudents.jumlah_siswa_aktif || 0,
            rata_rata_tabungan: avgSavings
        };
    } catch (error) {
        console.error('Report summary generation failed:', error);
        throw error;
    }
}

export async function getMonthlyReport(year: number, kelasId?: number): Promise<MonthlyReport[]> {
    try {
        const conditions: any[] = [
            sql`EXTRACT(YEAR FROM ${transaksiTable.tanggal_transaksi}) = ${year}`
        ];

        let results;

        if (kelasId) {
            conditions.push(eq(siswaTable.kelas_id, kelasId));
            
            const query = db.select({
                bulan: sql`EXTRACT(MONTH FROM ${transaksiTable.tanggal_transaksi})`.as('bulan'),
                tahun: sql`EXTRACT(YEAR FROM ${transaksiTable.tanggal_transaksi})`.as('tahun'),
                total_transaksi: count(transaksiTable.id),
                total_menabung: sum(
                    sql`CASE WHEN ${transaksiTable.jenis_transaksi} = 'menabung' THEN ${transaksiTable.jumlah} ELSE 0 END`
                ),
                total_menarik: sum(
                    sql`CASE WHEN ${transaksiTable.jenis_transaksi} = 'menarik' THEN ${transaksiTable.jumlah} ELSE 0 END`
                )
            })
            .from(transaksiTable)
            .innerJoin(siswaTable, eq(transaksiTable.siswa_id, siswaTable.id))
            .where(and(...conditions))
            .groupBy(
                sql`EXTRACT(MONTH FROM ${transaksiTable.tanggal_transaksi})`,
                sql`EXTRACT(YEAR FROM ${transaksiTable.tanggal_transaksi})`
            )
            .orderBy(sql`EXTRACT(MONTH FROM ${transaksiTable.tanggal_transaksi})`);

            results = await query.execute();
        } else {
            const query = db.select({
                bulan: sql`EXTRACT(MONTH FROM ${transaksiTable.tanggal_transaksi})`.as('bulan'),
                tahun: sql`EXTRACT(YEAR FROM ${transaksiTable.tanggal_transaksi})`.as('tahun'),
                total_transaksi: count(transaksiTable.id),
                total_menabung: sum(
                    sql`CASE WHEN ${transaksiTable.jenis_transaksi} = 'menabung' THEN ${transaksiTable.jumlah} ELSE 0 END`
                ),
                total_menarik: sum(
                    sql`CASE WHEN ${transaksiTable.jenis_transaksi} = 'menarik' THEN ${transaksiTable.jumlah} ELSE 0 END`
                )
            })
            .from(transaksiTable)
            .where(conditions[0])
            .groupBy(
                sql`EXTRACT(MONTH FROM ${transaksiTable.tanggal_transaksi})`,
                sql`EXTRACT(YEAR FROM ${transaksiTable.tanggal_transaksi})`
            )
            .orderBy(sql`EXTRACT(MONTH FROM ${transaksiTable.tanggal_transaksi})`);

            results = await query.execute();
        }

        // Convert month numbers to month names and ensure proper types
        const monthNames = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];

        return results.map(result => ({
            bulan: monthNames[Number(result.bulan) - 1] || 'Unknown',
            tahun: Number(result.tahun),
            total_transaksi: Number(result.total_transaksi),
            total_menabung: parseFloat(result.total_menabung || '0'),
            total_menarik: parseFloat(result.total_menarik || '0')
        }));
    } catch (error) {
        console.error('Monthly report generation failed:', error);
        throw error;
    }
}

export async function exportReportToExcel(
    transactions: Transaksi[], 
    filename: string
): Promise<string> {
    try {
        // Generate unique timestamp with more precision
        const timestamp = Date.now() + Math.floor(Math.random() * 1000);
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9]/g, '_');
        const exportPath = `/exports/${sanitizedFilename}_${timestamp}.xlsx`;
        
        // In a real implementation, this would:
        // 1. Create an Excel workbook using a library like 'exceljs'
        // 2. Add transaction data to worksheets
        // 3. Format columns and add headers
        // 4. Save to file system or cloud storage
        // 5. Return the download URL
        
        // For now, simulate the process with a delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 1));
        
        return exportPath;
    } catch (error) {
        console.error('Excel export failed:', error);
        throw error;
    }
}