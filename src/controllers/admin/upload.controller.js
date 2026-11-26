import multer from 'multer';
import { isStorageFeature, STORAGE_FEATURES } from '../../config/storage.js';
import { uploadImage } from '../../services/storage.service.js';

const maxFileSize = 2 * 1024 * 1024;
const uploadFeatures = new Set(STORAGE_FEATURES);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSize,
    files: 1,
    fields: 2,
    fieldSize: 32,
  },
});

export function parseUpload(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(Object.assign(new Error('Ukuran gambar maksimal 2 MB.'), {
        status: 413,
        code: 'PAYLOAD_TOO_LARGE',
      }));
      return;
    }

    if (error instanceof multer.MulterError) {
      next(Object.assign(new Error('Permintaan upload gambar tidak valid.'), {
        status: 422,
        code: 'VALIDATION_ERROR',
      }));
      return;
    }

    if (error) {
      next(error);
      return;
    }

    next();
  });
}

export async function uploadFile(req, res, next) {
  if (!req.file) {
    next(Object.assign(new Error('File gambar wajib diunggah.'), {
      status: 422,
      code: 'VALIDATION_ERROR',
    }));
    return;
  }

  const feature = req.body.folder ?? req.body.feature ?? 'lainnya';
  if (!uploadFeatures.has(feature) || !isStorageFeature(feature)) {
    next(Object.assign(new Error('Fitur upload tidak valid.'), {
      status: 422,
      code: 'VALIDATION_ERROR',
      details: [{ field: 'folder', message: 'Fitur upload tidak didukung.' }],
    }));
    return;
  }

  try {
    const data = await uploadImage(req.file, feature);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}
