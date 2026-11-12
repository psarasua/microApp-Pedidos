import { createSupabaseDb } from './db.supabase'
import { localDb } from './db.local'
import type { Db } from './types'

const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

/** Con Supabase configurado los datos se comparten entre dispositivos; si no, quedan en este navegador. */
export const db: Db = configured ? createSupabaseDb() : localDb
