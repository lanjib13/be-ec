import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { deleteImages } from './storage.service.js';

// Semua kolom yang menyimpan URL gambar, baik teks tunggal maupun array JSON.
export const IMAGE_COLUMNS = Object.freeze([
  ['about_misi', 'gambar_url'],
  ['about_output', 'gambar_url'],
  ['events', 'foto_cover'],
  ['produk', 'foto_cover'],
  ['produk', 'galeri'],
  ['berita', 'gambar_sampul'],
  ['program', 'foto_cover'],
  ['program', 'galeri'],
  ['achievements', 'gambar'],
  ['mitra', 'logo_url'],
]);

export async function isImageReferenced(url) {
  for (const [table, column] of IMAGE_COLUMNS) {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT 1
      FROM ${Prisma.raw(`"${table}"`)}
      WHERE ${Prisma.raw(`"${column}"`)} IS NOT NULL
        AND strpos(${Prisma.raw(`"${column}"`)}::text, ${url}) > 0
      LIMIT 1
    `);

    if (rows.length > 0) return true;
  }

  return false;
}

// Hapus hanya gambar yang sudah tidak dirujuk baris mana pun, agar URL yang
// dipakai bersama (misalnya di beberapa konten) tidak ikut terhapus.
export async function cleanupImages(urls) {
  const unique = [...new Set((urls ?? []).filter(Boolean))];
  if (unique.length === 0) return 0;

  const orphans = [];
  for (const url of unique) {
    if (!(await isImageReferenced(url))) orphans.push(url);
  }

  if (orphans.length === 0) return 0;
  return deleteImages(orphans);
}

export function cleanupImagesInBackground(urls) {
  cleanupImages(urls).catch((error) => {
    console.warn(`Pembersihan gambar gagal: ${error.message}`);
  });
}
