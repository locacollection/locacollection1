const client = globalThis.LOCA?.db;

if (!client) {
  throw new Error("LOCA Supabase client is not initialized.");
}

export const supabase = client;
