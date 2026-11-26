import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

let authClient;
let storageClient;

export function getSupabaseClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    const error = new Error('Supabase Auth is not configured.');
    error.status = 503;
    error.code = 'SUPABASE_NOT_CONFIGURED';
    throw error;
  }

  if (!authClient) {
    authClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return authClient;
}

export function getSupabaseStorageClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    const error = new Error('Supabase Storage server credentials are not configured.');
    error.status = 503;
    error.code = 'SUPABASE_STORAGE_NOT_CONFIGURED';
    throw error;
  }

  if (!storageClient) {
    storageClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return storageClient;
}
