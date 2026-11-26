import { z } from 'zod';
import { loginAdmin } from '../../services/admin-auth.service.js';
import { httpError } from '../../utils/http-error.js';

const loginSchema = z.object({
  username: z.string().min(1).max(150),
  password: z.string().min(1).max(1024),
}).strict();

export async function login(req, res, next) {
  const validation = loginSchema.safeParse(req.body);
  if (!validation.success) {
    next(httpError(422, 'VALIDATION_ERROR', 'Username dan password wajib diisi.'));
    return;
  }

  try {
    const data = await loginAdmin(validation.data.username, validation.data.password);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}
