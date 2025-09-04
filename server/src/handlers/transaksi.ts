import { db } from '../db';
import { transaksiTable, siswaTable } from '../db/schema';
import { type CreateTransaksiInput, type VerifyTransaksiInput, type Transaksi } from '../schema';
import { eq, and, sum, sql } from 'drizzle-orm';

export async function createTransaksi(input: CreateTransaksiInput): Promise<Transaksi> {
  try {
    // Verify siswa exists
    const existingSiswa = await db.select()
      .from(siswaTable)
      .where(eq(siswaTable.id, input.siswa_id))
      .execute();

    if (existingSiswa.length === 0) {
      throw new Error('Siswa not found');
    }

    // Insert transaction with 'menunggu' status for verification
    const result = await db.insert(transaksiTable)
      .values({
        siswa_id: input.siswa_id,
        tanggal_transaksi: input.tanggal_transaksi,
        jumlah: input.jumlah.toString(), // Convert number to string for numeric column
        jenis_transaksi: input.jenis_transaksi,
        status_verifikasi: 'menunggu', // Default status for new transactions
        catatan_penolakan: null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const transaksi = result[0];
    return {
      ...transaksi,
      jumlah: parseFloat(transaksi.jumlah) // Convert string back to number
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
}

export async function getTransaksi(): Promise<Transaksi[]> {
  try {
    // Fetch all transactions
    const results = await db.select()
      .from(transaksiTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaksi => ({
      ...transaksi,
      jumlah: parseFloat(transaksi.jumlah)
    }));
  } catch (error) {
    console.error('Fetching transactions failed:', error);
    throw error;
  }
}

export async function getTransaksiBySiswa(siswaId: number): Promise<Transaksi[]> {
  try {
    // Fetch transactions for specific student
    const results = await db.select()
      .from(transaksiTable)
      .where(eq(transaksiTable.siswa_id, siswaId))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaksi => ({
      ...transaksi,
      jumlah: parseFloat(transaksi.jumlah)
    }));
  } catch (error) {
    console.error('Fetching student transactions failed:', error);
    throw error;
  }
}

export async function getTransaksiByStatus(status: 'menunggu' | 'terverifikasi' | 'ditolak'): Promise<Transaksi[]> {
  try {
    // Fetch transactions by verification status
    const results = await db.select()
      .from(transaksiTable)
      .where(eq(transaksiTable.status_verifikasi, status))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaksi => ({
      ...transaksi,
      jumlah: parseFloat(transaksi.jumlah)
    }));
  } catch (error) {
    console.error('Fetching transactions by status failed:', error);
    throw error;
  }
}

export async function verifyTransaksi(input: VerifyTransaksiInput): Promise<Transaksi | null> {
  try {
    // Update transaction status and add rejection notes if applicable
    const result = await db.update(transaksiTable)
      .set({
        status_verifikasi: input.status_verifikasi,
        catatan_penolakan: input.catatan_penolakan
      })
      .where(eq(transaksiTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const transaksi = result[0];
    return {
      ...transaksi,
      jumlah: parseFloat(transaksi.jumlah)
    };
  } catch (error) {
    console.error('Transaction verification failed:', error);
    throw error;
  }
}

export async function getTotalTabunganBySiswa(siswaId: number): Promise<number> {
  try {
    // Calculate total savings: sum of verified 'menabung' minus sum of verified 'menarik'
    
    // Get sum of verified deposits (menabung)
    const depositsResult = await db.select({
      total: sum(transaksiTable.jumlah)
    })
      .from(transaksiTable)
      .where(
        and(
          eq(transaksiTable.siswa_id, siswaId),
          eq(transaksiTable.jenis_transaksi, 'menabung'),
          eq(transaksiTable.status_verifikasi, 'terverifikasi')
        )
      )
      .execute();

    // Get sum of verified withdrawals (menarik)
    const withdrawalsResult = await db.select({
      total: sum(transaksiTable.jumlah)
    })
      .from(transaksiTable)
      .where(
        and(
          eq(transaksiTable.siswa_id, siswaId),
          eq(transaksiTable.jenis_transaksi, 'menarik'),
          eq(transaksiTable.status_verifikasi, 'terverifikasi')
        )
      )
      .execute();

    // Parse results (sum returns string or null)
    const totalDeposits = depositsResult[0]?.total ? parseFloat(depositsResult[0].total) : 0;
    const totalWithdrawals = withdrawalsResult[0]?.total ? parseFloat(withdrawalsResult[0].total) : 0;

    // Calculate net savings
    return totalDeposits - totalWithdrawals;
  } catch (error) {
    console.error('Calculating total savings failed:', error);
    throw error;
  }
}