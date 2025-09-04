import { db } from '../db';
import { logSistemTable } from '../db/schema';
import { type CreateLogSistemInput, type LogSistem } from '../schema';
import { eq, gte, lte, and, desc } from 'drizzle-orm';

export async function createLogSistem(input: CreateLogSistemInput): Promise<LogSistem> {
  try {
    // Insert log entry into database
    const result = await db.insert(logSistemTable)
      .values({
        user_id: input.user_id,
        aksi: input.aksi,
        keterangan: input.keterangan,
        tanggal: new Date(), // Set current timestamp
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Log creation failed:', error);
    throw error;
  }
}

export async function getLogSistem(): Promise<LogSistem[]> {
  try {
    // Fetch all logs ordered by most recent first
    const results = await db.select()
      .from(logSistemTable)
      .orderBy(desc(logSistemTable.tanggal))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    throw error;
  }
}

export async function getLogByUser(userId: number): Promise<LogSistem[]> {
  try {
    // Fetch logs for specific user
    const results = await db.select()
      .from(logSistemTable)
      .where(eq(logSistemTable.user_id, userId))
      .orderBy(desc(logSistemTable.tanggal))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch logs by user:', error);
    throw error;
  }
}

export async function getLogByDateRange(startDate: Date, endDate: Date): Promise<LogSistem[]> {
  try {
    // Fetch logs within specified date range
    const results = await db.select()
      .from(logSistemTable)
      .where(
        and(
          gte(logSistemTable.tanggal, startDate),
          lte(logSistemTable.tanggal, endDate)
        )
      )
      .orderBy(desc(logSistemTable.tanggal))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch logs by date range:', error);
    throw error;
  }
}