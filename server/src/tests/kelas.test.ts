import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { kelasTable, usersTable, guruTable } from '../db/schema';
import { type CreateKelasInput, type CreateUserInput, type CreateGuruInput } from '../schema';
import { createKelas, getKelas, getKelasByWaliKelas, updateKelas, deleteKelas } from '../handlers/kelas';
import { eq } from 'drizzle-orm';

// Create test user for guru
const testUser: CreateUserInput = {
  username: 'test_guru',
  password: 'password123',
  role: 'wali_kelas'
};

// Create test guru
const testGuru: CreateGuruInput = {
  nama_guru: 'Test Guru',
  nip_nik: '123456789',
  nomor_hp: '08123456789',
  email: 'guru@test.com',
  status: 'aktif',
  user_id: 1 // Will be set after user creation
};

// Test kelas input
const testKelasInput: CreateKelasInput = {
  nama_kelas: '7A',
  tingkat: '7',
  wali_kelas_id: 1 // Will be set after guru creation
};

describe('kelas handlers', () => {
  let guruId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create user first
    const userResult = await db.insert(usersTable)
      .values({
        username: testUser.username,
        password_hash: 'hashed_password',
        role: testUser.role
      })
      .returning()
      .execute();

    // Create guru
    const guruResult = await db.insert(guruTable)
      .values({
        ...testGuru,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    guruId = guruResult[0].id;
  });

  afterEach(resetDB);

  describe('createKelas', () => {
    it('should create a kelas successfully', async () => {
      const input = {
        ...testKelasInput,
        wali_kelas_id: guruId
      };

      const result = await createKelas(input);

      expect(result.nama_kelas).toEqual('7A');
      expect(result.tingkat).toEqual('7');
      expect(result.wali_kelas_id).toEqual(guruId);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save kelas to database', async () => {
      const input = {
        ...testKelasInput,
        wali_kelas_id: guruId
      };

      const result = await createKelas(input);

      const kelasFromDb = await db.select()
        .from(kelasTable)
        .where(eq(kelasTable.id, result.id))
        .execute();

      expect(kelasFromDb).toHaveLength(1);
      expect(kelasFromDb[0].nama_kelas).toEqual('7A');
      expect(kelasFromDb[0].tingkat).toEqual('7');
      expect(kelasFromDb[0].wali_kelas_id).toEqual(guruId);
    });

    it('should throw error when wali_kelas does not exist', async () => {
      const input = {
        ...testKelasInput,
        wali_kelas_id: 999
      };

      expect(async () => {
        await createKelas(input);
      }).toThrow(/Guru with ID 999 not found/i);
    });
  });

  describe('getKelas', () => {
    it('should return empty array when no kelas exist', async () => {
      const result = await getKelas();
      expect(result).toEqual([]);
    });

    it('should return all kelas', async () => {
      // Create multiple kelas
      const input1 = { ...testKelasInput, wali_kelas_id: guruId, nama_kelas: '7A' };
      const input2 = { ...testKelasInput, wali_kelas_id: guruId, nama_kelas: '7B' };

      await createKelas(input1);
      await createKelas(input2);

      const result = await getKelas();

      expect(result).toHaveLength(2);
      expect(result.some(k => k.nama_kelas === '7A')).toBe(true);
      expect(result.some(k => k.nama_kelas === '7B')).toBe(true);
    });
  });

  describe('getKelasByWaliKelas', () => {
    it('should return empty array when wali kelas has no classes', async () => {
      const result = await getKelasByWaliKelas(guruId);
      expect(result).toEqual([]);
    });

    it('should return classes for specific wali kelas', async () => {
      // Create another guru for comparison
      const userResult2 = await db.insert(usersTable)
        .values({
          username: 'test_guru2',
          password_hash: 'hashed_password',
          role: 'wali_kelas'
        })
        .returning()
        .execute();

      const guruResult2 = await db.insert(guruTable)
        .values({
          nama_guru: 'Test Guru 2',
          nip_nik: '987654321',
          nomor_hp: '08987654321',
          email: 'guru2@test.com',
          status: 'aktif',
          user_id: userResult2[0].id
        })
        .returning()
        .execute();

      const guru2Id = guruResult2[0].id;

      // Create kelas for both gurus
      await createKelas({ ...testKelasInput, wali_kelas_id: guruId, nama_kelas: '7A' });
      await createKelas({ ...testKelasInput, wali_kelas_id: guruId, nama_kelas: '7B' });
      await createKelas({ ...testKelasInput, wali_kelas_id: guru2Id, nama_kelas: '8A' });

      const result = await getKelasByWaliKelas(guruId);

      expect(result).toHaveLength(2);
      expect(result.every(k => k.wali_kelas_id === guruId)).toBe(true);
      expect(result.some(k => k.nama_kelas === '7A')).toBe(true);
      expect(result.some(k => k.nama_kelas === '7B')).toBe(true);
    });
  });

  describe('updateKelas', () => {
    let kelasId: number;

    beforeEach(async () => {
      const result = await createKelas({
        ...testKelasInput,
        wali_kelas_id: guruId
      });
      kelasId = result.id;
    });

    it('should update kelas successfully', async () => {
      const updateData = {
        nama_kelas: '7C',
        tingkat: '8'
      };

      const result = await updateKelas(kelasId, updateData);

      expect(result).not.toBeNull();
      expect(result!.nama_kelas).toEqual('7C');
      expect(result!.tingkat).toEqual('8');
      expect(result!.wali_kelas_id).toEqual(guruId);
    });

    it('should update wali_kelas_id when new guru exists', async () => {
      // Create another guru
      const userResult2 = await db.insert(usersTable)
        .values({
          username: 'test_guru2',
          password_hash: 'hashed_password',
          role: 'wali_kelas'
        })
        .returning()
        .execute();

      const guruResult2 = await db.insert(guruTable)
        .values({
          nama_guru: 'Test Guru 2',
          nip_nik: '987654321',
          nomor_hp: '08987654321',
          email: 'guru2@test.com',
          status: 'aktif',
          user_id: userResult2[0].id
        })
        .returning()
        .execute();

      const guru2Id = guruResult2[0].id;
      const updateData = { wali_kelas_id: guru2Id };

      const result = await updateKelas(kelasId, updateData);

      expect(result).not.toBeNull();
      expect(result!.wali_kelas_id).toEqual(guru2Id);
    });

    it('should throw error when updating with non-existent wali_kelas_id', async () => {
      const updateData = { wali_kelas_id: 999 };

      expect(async () => {
        await updateKelas(kelasId, updateData);
      }).toThrow(/Guru with ID 999 not found/i);
    });

    it('should return null when kelas does not exist', async () => {
      const updateData = { nama_kelas: 'Updated' };

      const result = await updateKelas(999, updateData);

      expect(result).toBeNull();
    });
  });

  describe('deleteKelas', () => {
    it('should delete existing kelas successfully', async () => {
      const kelas = await createKelas({
        ...testKelasInput,
        wali_kelas_id: guruId
      });

      const result = await deleteKelas(kelas.id);

      expect(result).toBe(true);

      // Verify deletion
      const kelasFromDb = await db.select()
        .from(kelasTable)
        .where(eq(kelasTable.id, kelas.id))
        .execute();

      expect(kelasFromDb).toHaveLength(0);
    });

    it('should return false when kelas does not exist', async () => {
      const result = await deleteKelas(999);

      expect(result).toBe(false);
    });
  });
});