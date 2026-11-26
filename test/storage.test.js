import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://postgres:local@127.0.0.1:5432/ec_dev';
process.env.DIRECT_URL ??= 'postgresql://postgres:local@127.0.0.1:5432/ec_dev';
process.env.SUPABASE_STORAGE_BUCKET_PREFIX = 'test-ec';

const { STORAGE_FEATURES, bucketForFeature, isStorageFeature } = await import('../src/config/storage.js');
const { deleteImages, detectImageType, isManagedBucket, parseStorageUrl, uploadImage } = await import('../src/services/storage.service.js');

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x24, 0x00, 0x00, 0x00]), Buffer.from('WEBPVP8 ')]);

test('detectImageType recognises JPEG, PNG, and WebP by signature', () => {
  assert.deepEqual(detectImageType(jpeg), { mimeType: 'image/jpeg', extension: 'jpg' });
  assert.deepEqual(detectImageType(png), { mimeType: 'image/png', extension: 'png' });
  assert.deepEqual(detectImageType(webp), { mimeType: 'image/webp', extension: 'webp' });
});

test('detectImageType rejects unsupported or non-buffer input', () => {
  assert.equal(detectImageType(Buffer.from('GIF89a')), null);
  assert.equal(detectImageType('not a buffer'), null);
});

test('each upload feature maps to its own prefixed bucket', () => {
  assert.deepEqual([...STORAGE_FEATURES], [
    'about',
    'program',
    'event',
    'berita',
    'produk',
    'mitra',
    'achievement',
    'lainnya',
  ]);

  for (const feature of STORAGE_FEATURES) {
    assert.equal(bucketForFeature(feature), `test-ec-${feature}`);
    assert.equal(isStorageFeature(feature), true);
  }

  assert.equal(bucketForFeature(), 'test-ec-lainnya');
  assert.equal(isStorageFeature('unknown'), false);
  assert.throws(() => bucketForFeature('unknown'), (error) => error.status === 422);
});

test('uploadImage rejects mismatched MIME before touching storage', async () => {
  await assert.rejects(
    () => uploadImage({ buffer: jpeg, mimetype: 'image/png', size: jpeg.length }),
    (error) => error.status === 415 && error.code === 'UNSUPPORTED_MEDIA_TYPE',
  );
});

test('uploadImage rejects unknown features before touching storage', async () => {
  await assert.rejects(
    () => uploadImage({ buffer: jpeg, mimetype: 'image/jpeg', size: jpeg.length }, 'unknown'),
    (error) => error.status === 422 && error.code === 'VALIDATION_ERROR',
  );
});

test('parseStorageUrl reads public Supabase Storage URLs only', () => {
  assert.deepEqual(
    parseStorageUrl('https://project.supabase.co/storage/v1/object/public/test-ec-about/2026/a%20b.jpg'),
    { bucket: 'test-ec-about', path: '2026/a b.jpg' },
  );
  assert.equal(parseStorageUrl('https://example.com/image.jpg'), null);
  assert.equal(parseStorageUrl('not a url'), null);
  assert.equal(parseStorageUrl(null), null);
});

test('isManagedBucket only accepts configured feature buckets', () => {
  assert.equal(isManagedBucket('test-ec-about'), true);
  assert.equal(isManagedBucket('test-ec-lainnya'), true);
  assert.equal(isManagedBucket('test-ec-unknown'), false);
  assert.equal(isManagedBucket('ec-public'), false);
});

test('deleteImages ignores empty and unmanaged URLs without storage credentials', async () => {
  assert.equal(await deleteImages([]), 0);
  assert.equal(await deleteImages(['https://example.com/image.jpg']), 0);
});
