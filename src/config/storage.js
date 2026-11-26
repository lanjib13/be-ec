import { env } from './env.js';

// Satu bucket per fitur agar aset tidak tercampur dalam satu bucket.
export const STORAGE_FEATURES = Object.freeze([
  'about',
  'program',
  'event',
  'berita',
  'produk',
  'mitra',
  'achievement',
  'lainnya',
]);

const featureSet = new Set(STORAGE_FEATURES);

export function isStorageFeature(feature) {
  return featureSet.has(feature);
}

export function bucketForFeature(feature = 'lainnya') {
  if (!isStorageFeature(feature)) {
    const error = new Error('Fitur upload tidak valid.');
    error.status = 422;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  return `${env.SUPABASE_STORAGE_BUCKET_PREFIX}-${feature}`;
}
