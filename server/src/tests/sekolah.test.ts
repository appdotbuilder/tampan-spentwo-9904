import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { sekolahTable } from '../db/schema';
import { type CreateSekolahInput } from '../schema';
import { createSekolah } from '../handlers/sekolah';
import { eq } from 'drizzle-orm';

// Complete test input with all required fields
const testInput: CreateSekolahInput = {
  nama_sekolah: 'SMA Negeri 1 Jakarta',
  npsn: '20100001',
  jenjang: 'SMA',
  jenis_sekolah: 'Negeri',
  nama_kepala_sekolah: 'Dr. Ahmad Suryadi, M.Pd',
  nip_nik_kepala: '196512121990031001',
  alamat_sekolah: 'Jl. Budi Kemuliaan No. 6, Jakarta Pusat',
  nomor_telepon: '021-3846417',
  email: 'sma1jakarta@kemendikbud.go.id'
};

// Test input with nullable fields
const testInputWithNulls: CreateSekolahInput = {
  nama_sekolah: 'SD Swasta Harapan',
  npsn: '20100002',
  jenjang: 'SD',
  jenis_sekolah: 'Swasta',
  nama_kepala_sekolah: 'Siti Nurhaliza, S.Pd',
  nip_nik_kepala: '3201234567890001',
  alamat_sekolah: 'Jl. Melati No. 15, Bandung',
  nomor_telepon: null,
  email: null
};

describe('createSekolah', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a sekolah with all fields', async () => {
    const result = await createSekolah(testInput);

    // Basic field validation
    expect(result.nama_sekolah).toEqual('SMA Negeri 1 Jakarta');
    expect(result.npsn).toEqual('20100001');
    expect(result.jenjang).toEqual('SMA');
    expect(result.jenis_sekolah).toEqual('Negeri');
    expect(result.nama_kepala_sekolah).toEqual('Dr. Ahmad Suryadi, M.Pd');
    expect(result.nip_nik_kepala).toEqual('196512121990031001');
    expect(result.alamat_sekolah).toEqual('Jl. Budi Kemuliaan No. 6, Jakarta Pusat');
    expect(result.nomor_telepon).toEqual('021-3846417');
    expect(result.email).toEqual('sma1jakarta@kemendikbud.go.id');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a sekolah with null optional fields', async () => {
    const result = await createSekolah(testInputWithNulls);

    // Basic field validation
    expect(result.nama_sekolah).toEqual('SD Swasta Harapan');
    expect(result.npsn).toEqual('20100002');
    expect(result.jenjang).toEqual('SD');
    expect(result.jenis_sekolah).toEqual('Swasta');
    expect(result.nama_kepala_sekolah).toEqual('Siti Nurhaliza, S.Pd');
    expect(result.nip_nik_kepala).toEqual('3201234567890001');
    expect(result.alamat_sekolah).toEqual('Jl. Melati No. 15, Bandung');
    expect(result.nomor_telepon).toBeNull();
    expect(result.email).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save sekolah to database', async () => {
    const result = await createSekolah(testInput);

    // Query using proper drizzle syntax
    const sekolahs = await db.select()
      .from(sekolahTable)
      .where(eq(sekolahTable.id, result.id))
      .execute();

    expect(sekolahs).toHaveLength(1);
    const savedSekolah = sekolahs[0];
    expect(savedSekolah.nama_sekolah).toEqual('SMA Negeri 1 Jakarta');
    expect(savedSekolah.npsn).toEqual('20100001');
    expect(savedSekolah.jenjang).toEqual('SMA');
    expect(savedSekolah.jenis_sekolah).toEqual('Negeri');
    expect(savedSekolah.nama_kepala_sekolah).toEqual('Dr. Ahmad Suryadi, M.Pd');
    expect(savedSekolah.nip_nik_kepala).toEqual('196512121990031001');
    expect(savedSekolah.alamat_sekolah).toEqual('Jl. Budi Kemuliaan No. 6, Jakarta Pusat');
    expect(savedSekolah.nomor_telepon).toEqual('021-3846417');
    expect(savedSekolah.email).toEqual('sma1jakarta@kemendikbud.go.id');
    expect(savedSekolah.created_at).toBeInstanceOf(Date);
  });

  it('should save sekolah with null fields to database', async () => {
    const result = await createSekolah(testInputWithNulls);

    // Query using proper drizzle syntax
    const sekolahs = await db.select()
      .from(sekolahTable)
      .where(eq(sekolahTable.id, result.id))
      .execute();

    expect(sekolahs).toHaveLength(1);
    const savedSekolah = sekolahs[0];
    expect(savedSekolah.nama_sekolah).toEqual('SD Swasta Harapan');
    expect(savedSekolah.npsn).toEqual('20100002');
    expect(savedSekolah.jenjang).toEqual('SD');
    expect(savedSekolah.jenis_sekolah).toEqual('Swasta');
    expect(savedSekolah.nama_kepala_sekolah).toEqual('Siti Nurhaliza, S.Pd');
    expect(savedSekolah.nip_nik_kepala).toEqual('3201234567890001');
    expect(savedSekolah.alamat_sekolah).toEqual('Jl. Melati No. 15, Bandung');
    expect(savedSekolah.nomor_telepon).toBeNull();
    expect(savedSekolah.email).toBeNull();
    expect(savedSekolah.created_at).toBeInstanceOf(Date);
  });

  it('should create multiple sekolah records', async () => {
    const result1 = await createSekolah(testInput);
    const result2 = await createSekolah(testInputWithNulls);

    // Verify both records were created with different IDs
    expect(result1.id).toBeDefined();
    expect(result2.id).toBeDefined();
    expect(result1.id).not.toEqual(result2.id);

    // Verify both records exist in database
    const allSekolahs = await db.select()
      .from(sekolahTable)
      .execute();

    expect(allSekolahs).toHaveLength(2);
    const savedIds = allSekolahs.map(s => s.id);
    expect(savedIds).toContain(result1.id);
    expect(savedIds).toContain(result2.id);
  });

  it('should handle different jenjang types', async () => {
    const tkInput: CreateSekolahInput = {
      ...testInput,
      nama_sekolah: 'TK Tunas Bangsa',
      npsn: '20100003',
      jenjang: 'TK',
      jenis_sekolah: 'Swasta'
    };

    const smpInput: CreateSekolahInput = {
      ...testInput,
      nama_sekolah: 'SMP Negeri 5 Jakarta',
      npsn: '20100004',
      jenjang: 'SMP',
      jenis_sekolah: 'Negeri'
    };

    const tkResult = await createSekolah(tkInput);
    const smpResult = await createSekolah(smpInput);

    expect(tkResult.jenjang).toEqual('TK');
    expect(tkResult.nama_sekolah).toEqual('TK Tunas Bangsa');
    expect(smpResult.jenjang).toEqual('SMP');
    expect(smpResult.nama_sekolah).toEqual('SMP Negeri 5 Jakarta');
  });

  it('should handle long text fields correctly', async () => {
    const longTextInput: CreateSekolahInput = {
      nama_sekolah: 'SMA Negeri 1 Jakarta Pusat dengan Nama yang Sangat Panjang untuk Testing',
      npsn: '20100005',
      jenjang: 'SMA',
      jenis_sekolah: 'Negeri',
      nama_kepala_sekolah: 'Prof. Dr. Muhammad Abdullah bin Ahmad Al-Indonesi, M.Pd., Ph.D',
      nip_nik_kepala: '196512121990031002',
      alamat_sekolah: 'Jl. Budi Kemuliaan Raya No. 6-8, Kelurahan Gambir, Kecamatan Gambir, Jakarta Pusat, DKI Jakarta, Indonesia 10110',
      nomor_telepon: '+62-21-3846417-18-19',
      email: 'admin.sma1jakartapusat@kemendikbudristek.go.id'
    };

    const result = await createSekolah(longTextInput);

    expect(result.nama_sekolah).toEqual(longTextInput.nama_sekolah);
    expect(result.nama_kepala_sekolah).toEqual(longTextInput.nama_kepala_sekolah);
    expect(result.alamat_sekolah).toEqual(longTextInput.alamat_sekolah);
    expect(result.nomor_telepon).toEqual(longTextInput.nomor_telepon);
    expect(result.email).toEqual(longTextInput.email);
  });
});