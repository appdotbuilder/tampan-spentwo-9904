import { db } from '../db';
import { badgesSiswaTable, transaksiTable, siswaTable } from '../db/schema';
import { type CreateBadgesSiswaInput, type BadgesSiswa } from '../schema';
import { eq, count, sum, and } from 'drizzle-orm';

export async function createBadgesSiswa(input: CreateBadgesSiswaInput): Promise<BadgesSiswa> {
  try {
    // Verify siswa exists
    const siswaExists = await db.select()
      .from(siswaTable)
      .where(eq(siswaTable.id, input.siswa_id))
      .execute();

    if (siswaExists.length === 0) {
      throw new Error('Student not found');
    }

    // Check if badge already exists for this student
    const existingBadge = await db.select()
      .from(badgesSiswaTable)
      .where(
        and(
          eq(badgesSiswaTable.siswa_id, input.siswa_id),
          eq(badgesSiswaTable.nama_badge, input.nama_badge)
        )
      )
      .execute();

    if (existingBadge.length > 0) {
      throw new Error('Badge already awarded to this student');
    }

    // Insert new badge record
    const result = await db.insert(badgesSiswaTable)
      .values({
        siswa_id: input.siswa_id,
        nama_badge: input.nama_badge,
        tanggal_dapat: new Date(),
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Badge creation failed:', error);
    throw error;
  }
}

export async function getBadgesSiswa(): Promise<BadgesSiswa[]> {
  try {
    const result = await db.select()
      .from(badgesSiswaTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch badges:', error);
    throw error;
  }
}

export async function getBadgesBySiswa(siswaId: number): Promise<BadgesSiswa[]> {
  try {
    // Verify siswa exists
    const siswaExists = await db.select()
      .from(siswaTable)
      .where(eq(siswaTable.id, siswaId))
      .execute();

    if (siswaExists.length === 0) {
      throw new Error('Student not found');
    }

    const result = await db.select()
      .from(badgesSiswaTable)
      .where(eq(badgesSiswaTable.siswa_id, siswaId))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch student badges:', error);
    throw error;
  }
}

export async function checkAndAwardBadges(siswaId: number): Promise<BadgesSiswa[]> {
  try {
    // Verify siswa exists
    const siswaExists = await db.select()
      .from(siswaTable)
      .where(eq(siswaTable.id, siswaId))
      .execute();

    if (siswaExists.length === 0) {
      throw new Error('Student not found');
    }

    // Get student's transaction statistics
    const stats = await db.select({
      totalTransactions: count(transaksiTable.id),
      totalSavings: sum(transaksiTable.jumlah),
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

    const transactionCount = Number(stats[0].totalTransactions) || 0;
    const totalSavings = parseFloat(stats[0].totalSavings || '0');

    // Get existing badges for this student
    const existingBadges = await db.select()
      .from(badgesSiswaTable)
      .where(eq(badgesSiswaTable.siswa_id, siswaId))
      .execute();

    const existingBadgeNames = existingBadges.map(badge => badge.nama_badge);
    const newBadges: BadgesSiswa[] = [];

    // Award badges based on achievements
    const badgeRules = [
      { name: 'Penabung Pemula', condition: transactionCount >= 1 },
      { name: 'Penabung Rajin', condition: transactionCount >= 5 },
      { name: 'Penabung Hebat', condition: transactionCount >= 10 },
      { name: 'Tabungan 10K', condition: totalSavings >= 10000 },
      { name: 'Tabungan 50K', condition: totalSavings >= 50000 },
      { name: 'Tabungan 100K', condition: totalSavings >= 100000 },
    ];

    for (const rule of badgeRules) {
      if (rule.condition && !existingBadgeNames.includes(rule.name)) {
        const newBadge = await createBadgesSiswa({
          siswa_id: siswaId,
          nama_badge: rule.name
        });
        newBadges.push(newBadge);
      }
    }

    return newBadges;
  } catch (error) {
    console.error('Failed to check and award badges:', error);
    throw error;
  }
}

export async function deleteBadgesSiswa(id: number): Promise<boolean> {
  try {
    // Check if badge exists
    const existingBadge = await db.select()
      .from(badgesSiswaTable)
      .where(eq(badgesSiswaTable.id, id))
      .execute();

    if (existingBadge.length === 0) {
      throw new Error('Badge not found');
    }

    // Delete the badge
    await db.delete(badgesSiswaTable)
      .where(eq(badgesSiswaTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Badge deletion failed:', error);
    throw error;
  }
}