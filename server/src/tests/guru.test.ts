import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, guruTable } from '../db/schema';
import { type CreateGuruInput, type CreateUserInput } from '../schema';
import { createGuru, getGuru, getGuruById, updateGuru, deleteGuru } from '../handlers/guru';
import { eq } from 'drizzle-orm';

// Test helper to create a user for guru to reference
const createTestUser = async (): Promise<number> => {
  const userInput: CreateUserInput = {
    username: 'testuser',
    password: 'password123',
    role: 'wali_kelas'
  };

  const result = await db.insert(usersTable)
    .values({
      username: userInput.username,
      password_hash: 'hashed_password',
      role: userInput.role
    })
    .returning()
    .execute();

  return result[0].id;
};

const testInput: CreateGuruInput = {
  nama_guru: 'Budi Santoso',
  nip_nik: '196507121990021001',
  nomor_hp: '08123456789',
  email: 'budi.santoso@school.com',
  status: 'aktif',
  user_id: 1 // Will be set dynamically in tests
};

describe('createGuru', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a guru successfully', async () => {
    const userId = await createTestUser();
    const input = { ...testInput, user_id: userId };

    const result = await createGuru(input);

    expect(result.nama_guru).toEqual('Budi Santoso');
    expect(result.nip_nik).toEqual('196507121990021001');
    expect(result.nomor_hp).toEqual('08123456789');
    expect(result.email).toEqual('budi.santoso@school.com');
    expect(result.status).toEqual('aktif');
    expect(result.user_id).toEqual(userId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save guru to database', async () => {
    const userId = await createTestUser();
    const input = { ...testInput, user_id: userId };

    const result = await createGuru(input);

    const gurus = await db.select()
      .from(guruTable)
      .where(eq(guruTable.id, result.id))
      .execute();

    expect(gurus).toHaveLength(1);
    expect(gurus[0].nama_guru).toEqual('Budi Santoso');
    expect(gurus[0].user_id).toEqual(userId);
    expect(gurus[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle nullable fields correctly', async () => {
    const userId = await createTestUser();
    const input: CreateGuruInput = {
      nama_guru: 'Siti Nurhaliza',
      nip_nik: '196608151991032002',
      nomor_hp: null,
      email: null,
      status: 'aktif',
      user_id: userId
    };

    const result = await createGuru(input);

    expect(result.nama_guru).toEqual('Siti Nurhaliza');
    expect(result.nomor_hp).toBeNull();
    expect(result.email).toBeNull();
    expect(result.status).toEqual('aktif');
    expect(result.user_id).toEqual(userId);
  });

  it('should throw error if user_id does not exist', async () => {
    const input = { ...testInput, user_id: 999 };

    expect(createGuru(input)).rejects.toThrow(/User with id 999 not found/i);
  });
});

describe('getGuru', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no gurus exist', async () => {
    const result = await getGuru();

    expect(result).toEqual([]);
  });

  it('should return all gurus', async () => {
    const userId1 = await createTestUser();
    
    // Create second user
    const userId2 = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        password_hash: 'hashed_password',
        role: 'wali_kelas'
      })
      .returning()
      .execute()
      .then(result => result[0].id);

    const input1 = { ...testInput, user_id: userId1 };
    const input2 = {
      nama_guru: 'Ani Widiastuti',
      nip_nik: '196709201992032003',
      nomor_hp: '08198765432',
      email: 'ani.widiastuti@school.com',
      status: 'aktif' as const,
      user_id: userId2
    };

    await createGuru(input1);
    await createGuru(input2);

    const result = await getGuru();

    expect(result).toHaveLength(2);
    expect(result[0].nama_guru).toEqual('Budi Santoso');
    expect(result[1].nama_guru).toEqual('Ani Widiastuti');
  });
});

describe('getGuruById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when guru does not exist', async () => {
    const result = await getGuruById(999);

    expect(result).toBeNull();
  });

  it('should return guru when it exists', async () => {
    const userId = await createTestUser();
    const input = { ...testInput, user_id: userId };
    const createdGuru = await createGuru(input);

    const result = await getGuruById(createdGuru.id);

    expect(result).not.toBeNull();
    expect(result!.nama_guru).toEqual('Budi Santoso');
    expect(result!.nip_nik).toEqual('196507121990021001');
    expect(result!.user_id).toEqual(userId);
    expect(result!.id).toEqual(createdGuru.id);
  });
});

describe('updateGuru', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when guru does not exist', async () => {
    const result = await updateGuru(999, { nama_guru: 'Updated Name' });

    expect(result).toBeNull();
  });

  it('should update guru successfully', async () => {
    const userId = await createTestUser();
    const input = { ...testInput, user_id: userId };
    const createdGuru = await createGuru(input);

    const updateData = {
      nama_guru: 'Budi Santoso Updated',
      nomor_hp: '08199999999',
      status: 'tidak_aktif' as const
    };

    const result = await updateGuru(createdGuru.id, updateData);

    expect(result).not.toBeNull();
    expect(result!.nama_guru).toEqual('Budi Santoso Updated');
    expect(result!.nomor_hp).toEqual('08199999999');
    expect(result!.status).toEqual('tidak_aktif');
    expect(result!.nip_nik).toEqual('196507121990021001'); // Unchanged field
    expect(result!.user_id).toEqual(userId); // Unchanged field
  });

  it('should update partial fields only', async () => {
    const userId = await createTestUser();
    const input = { ...testInput, user_id: userId };
    const createdGuru = await createGuru(input);

    const updateData = { nomor_hp: '08188888888' };

    const result = await updateGuru(createdGuru.id, updateData);

    expect(result).not.toBeNull();
    expect(result!.nomor_hp).toEqual('08188888888');
    expect(result!.nama_guru).toEqual('Budi Santoso'); // Unchanged
    expect(result!.status).toEqual('aktif'); // Unchanged
  });

  it('should throw error if updating with non-existent user_id', async () => {
    const userId = await createTestUser();
    const input = { ...testInput, user_id: userId };
    const createdGuru = await createGuru(input);

    const updateData = { user_id: 999 };

    expect(updateGuru(createdGuru.id, updateData)).rejects.toThrow(/User with id 999 not found/i);
  });

  it('should update user_id successfully when new user exists', async () => {
    const userId1 = await createTestUser();
    
    // Create second user
    const userId2 = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        password_hash: 'hashed_password',
        role: 'wali_kelas'
      })
      .returning()
      .execute()
      .then(result => result[0].id);

    const input = { ...testInput, user_id: userId1 };
    const createdGuru = await createGuru(input);

    const result = await updateGuru(createdGuru.id, { user_id: userId2 });

    expect(result).not.toBeNull();
    expect(result!.user_id).toEqual(userId2);
    expect(result!.nama_guru).toEqual('Budi Santoso'); // Unchanged
  });
});

describe('deleteGuru', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return false when guru does not exist', async () => {
    const result = await deleteGuru(999);

    expect(result).toBe(false);
  });

  it('should delete guru successfully', async () => {
    const userId = await createTestUser();
    const input = { ...testInput, user_id: userId };
    const createdGuru = await createGuru(input);

    const result = await deleteGuru(createdGuru.id);

    expect(result).toBe(true);

    // Verify deletion
    const deletedGuru = await getGuruById(createdGuru.id);
    expect(deletedGuru).toBeNull();
  });

  it('should remove guru from database completely', async () => {
    const userId = await createTestUser();
    const input = { ...testInput, user_id: userId };
    const createdGuru = await createGuru(input);

    await deleteGuru(createdGuru.id);

    // Verify using direct database query
    const gurus = await db.select()
      .from(guruTable)
      .where(eq(guruTable.id, createdGuru.id))
      .execute();

    expect(gurus).toHaveLength(0);
  });
});