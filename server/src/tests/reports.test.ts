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
    getTransactionReport, 
    getReportSummary, 
    getMonthlyReport, 
    exportReportToExcel 
} from '../handlers/reports';

// Test data
const testUser = {
    username: 'test_user',
    password_hash: 'hashed_password',
    role: 'siswa' as const
};

const testGuru = {
    nama_guru: 'Guru Test',
    nip_nik: '12345678',
    nomor_hp: '081234567890',
    email: 'guru@test.com',
    status: 'aktif' as const,
    user_id: 1
};

const testKelas = {
    nama_kelas: 'XII IPA 1',
    tingkat: '12',
    wali_kelas_id: 1
};

const testSiswa = {
    nama_siswa: 'Siswa Test',
    nisn: '1234567890',
    nis: '12345',
    tanggal_lahir: '2005-01-01',
    nomor_hp: '081234567890',
    email: 'siswa@test.com',
    kelas_id: 1,
    status: 'aktif' as const,
    user_id: 1
};

const testTransaksi1 = {
    siswa_id: 1,
    tanggal_transaksi: new Date('2024-01-15'),
    jumlah: '50000.00',
    jenis_transaksi: 'menabung' as const,
    status_verifikasi: 'terverifikasi' as const,
    catatan_penolakan: null
};

const testTransaksi2 = {
    siswa_id: 1,
    tanggal_transaksi: new Date('2024-02-15'),
    jumlah: '25000.00',
    jenis_transaksi: 'menarik' as const,
    status_verifikasi: 'terverifikasi' as const,
    catatan_penolakan: null
};

const testTransaksi3 = {
    siswa_id: 1,
    tanggal_transaksi: new Date('2024-03-15'),
    jumlah: '75000.00',
    jenis_transaksi: 'menabung' as const,
    status_verifikasi: 'terverifikasi' as const,
    catatan_penolakan: null
};

describe('Reports Handler', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    beforeEach(async () => {
        // Create test data
        await db.insert(usersTable).values(testUser).execute();
        await db.insert(guruTable).values(testGuru).execute();
        await db.insert(kelasTable).values(testKelas).execute();
        await db.insert(siswaTable).values(testSiswa).execute();
        await db.insert(transaksiTable).values([
            testTransaksi1,
            testTransaksi2,
            testTransaksi3
        ]).execute();
    });

    describe('getTransactionReport', () => {
        it('should return all transactions when no filters applied', async () => {
            const result = await getTransactionReport();

            expect(result).toHaveLength(3);
            expect(result[0].jumlah).toEqual(75000); // Most recent first (March)
            expect(result[1].jumlah).toEqual(25000); // February
            expect(result[2].jumlah).toEqual(50000); // January
            
            // Verify numeric conversion
            expect(typeof result[0].jumlah).toBe('number');
        });

        it('should filter transactions by start date', async () => {
            const startDate = new Date('2024-02-01');
            const result = await getTransactionReport(startDate);

            expect(result).toHaveLength(2);
            expect(result[0].tanggal_transaksi.getMonth()).toEqual(2); // March (0-indexed)
            expect(result[1].tanggal_transaksi.getMonth()).toEqual(1); // February (0-indexed)
        });

        it('should filter transactions by end date', async () => {
            const endDate = new Date('2024-02-28');
            const result = await getTransactionReport(undefined, endDate);

            expect(result).toHaveLength(2);
            expect(result[0].tanggal_transaksi.getMonth()).toEqual(1); // February
            expect(result[1].tanggal_transaksi.getMonth()).toEqual(0); // January
        });

        it('should filter transactions by date range', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-02-28');
            const result = await getTransactionReport(startDate, endDate);

            expect(result).toHaveLength(2);
            result.forEach(transaction => {
                expect(transaction.tanggal_transaksi >= startDate).toBe(true);
                expect(transaction.tanggal_transaksi <= endDate).toBe(true);
            });
        });

        it('should filter transactions by class', async () => {
            const result = await getTransactionReport(undefined, undefined, 1);

            expect(result).toHaveLength(3);
            // All transactions should be from siswa in kelas 1
            result.forEach(transaction => {
                expect(transaction.siswa_id).toEqual(1);
            });
        });

        it('should combine date and class filters', async () => {
            const startDate = new Date('2024-02-01');
            const result = await getTransactionReport(startDate, undefined, 1);

            expect(result).toHaveLength(2);
            result.forEach(transaction => {
                expect(transaction.tanggal_transaksi >= startDate).toBe(true);
                expect(transaction.siswa_id).toEqual(1);
            });
        });
    });

    describe('getReportSummary', () => {
        it('should return correct summary for all transactions', async () => {
            const result = await getReportSummary();

            expect(result.total_transaksi).toEqual(3);
            expect(result.total_menabung).toEqual(125000); // 50000 + 75000
            expect(result.total_menarik).toEqual(25000);
            expect(result.jumlah_siswa_aktif).toEqual(1);
            expect(result.rata_rata_tabungan).toEqual(100000); // Net: 125000 - 25000 per 1 student
        });

        it('should filter summary by date range', async () => {
            const startDate = new Date('2024-02-01');
            const result = await getReportSummary(startDate);

            expect(result.total_transaksi).toEqual(2);
            expect(result.total_menabung).toEqual(75000);
            expect(result.total_menarik).toEqual(25000);
        });

        it('should filter summary by class', async () => {
            const result = await getReportSummary(undefined, undefined, 1);

            expect(result.total_transaksi).toEqual(3);
            expect(result.total_menabung).toEqual(125000);
            expect(result.total_menarik).toEqual(25000);
            expect(result.jumlah_siswa_aktif).toEqual(1);
        });

        it('should return zero values for non-existent class', async () => {
            const result = await getReportSummary(undefined, undefined, 999);

            expect(result.total_transaksi).toEqual(0);
            expect(result.total_menabung).toEqual(0);
            expect(result.total_menarik).toEqual(0);
            expect(result.jumlah_siswa_aktif).toEqual(0);
            expect(result.rata_rata_tabungan).toEqual(0);
        });

        it('should handle empty date range correctly', async () => {
            const startDate = new Date('2025-01-01');
            const endDate = new Date('2025-12-31');
            const result = await getReportSummary(startDate, endDate);

            expect(result.total_transaksi).toEqual(0);
            expect(result.total_menabung).toEqual(0);
            expect(result.total_menarik).toEqual(0);
        });
    });

    describe('getMonthlyReport', () => {
        it('should return monthly breakdown for 2024', async () => {
            const result = await getMonthlyReport(2024);

            expect(result).toHaveLength(3); // January, February, March
            
            // Check January
            const january = result.find(r => r.bulan === 'Januari');
            expect(january?.total_transaksi).toEqual(1);
            expect(january?.total_menabung).toEqual(50000);
            expect(january?.total_menarik).toEqual(0);
            
            // Check February
            const february = result.find(r => r.bulan === 'Februari');
            expect(february?.total_transaksi).toEqual(1);
            expect(february?.total_menabung).toEqual(0);
            expect(february?.total_menarik).toEqual(25000);
            
            // Check March
            const march = result.find(r => r.bulan === 'Maret');
            expect(march?.total_transaksi).toEqual(1);
            expect(march?.total_menabung).toEqual(75000);
            expect(march?.total_menarik).toEqual(0);
        });

        it('should filter monthly report by class', async () => {
            const result = await getMonthlyReport(2024, 1);

            expect(result).toHaveLength(3);
            result.forEach(monthReport => {
                expect(monthReport.tahun).toEqual(2024);
                expect(monthReport.total_transaksi).toBeGreaterThan(0);
            });
        });

        it('should return empty array for year with no transactions', async () => {
            const result = await getMonthlyReport(2025);

            expect(result).toHaveLength(0);
        });

        it('should return empty array for non-existent class in year', async () => {
            const result = await getMonthlyReport(2024, 999);

            expect(result).toHaveLength(0);
        });

        it('should have correct month names in Indonesian', async () => {
            const result = await getMonthlyReport(2024);

            const expectedMonths = ['Januari', 'Februari', 'Maret'];
            result.forEach(monthReport => {
                expect(expectedMonths).toContain(monthReport.bulan);
            });
        });
    });

    describe('exportReportToExcel', () => {
        it('should generate export path for transactions', async () => {
            const transactions = await getTransactionReport();
            const result = await exportReportToExcel(transactions, 'laporan_transaksi');

            expect(result).toMatch(/^\/exports\/laporan_transaksi_\d+\.xlsx$/);
        });

        it('should sanitize filename', async () => {
            const transactions = await getTransactionReport();
            const result = await exportReportToExcel(transactions, 'laporan@#$%transaksi!');

            expect(result).toMatch(/^\/exports\/laporan____transaksi__\d+\.xlsx$/);
        });

        it('should handle empty transaction list', async () => {
            const result = await exportReportToExcel([], 'empty_report');

            expect(result).toMatch(/^\/exports\/empty_report_\d+\.xlsx$/);
        });

        it('should generate unique filenames for concurrent exports', async () => {
            const transactions = await getTransactionReport();
            
            // Add small delay to ensure different timestamps
            const result1 = await exportReportToExcel(transactions, 'concurrent_test');
            await new Promise(resolve => setTimeout(resolve, 5));
            const result2 = await exportReportToExcel(transactions, 'concurrent_test');

            expect(result1).not.toEqual(result2);
            expect(result1).toMatch(/concurrent_test/);
            expect(result2).toMatch(/concurrent_test/);
        });
    });
});