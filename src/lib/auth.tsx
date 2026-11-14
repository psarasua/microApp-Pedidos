import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { emailDe, sb } from './supabase'
import type { Perfil } from './types'

type AuthCtx = {
  loading: boolean
  signedIn: boolean
  perfil: Perfil | null
  isAdmin: boolean
  signIn: (usuario: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshPerfil: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

/** En modo local no hay cuentas: quien usa el dispositivo es el administrador. */
const LOCAL_PERFIL: Perfil = {
  id: 'local',
  usuario: '',
  nombre: 'Este dispositivo',
  direccion: '',
  telefono: '',
  email: null,
  email_verificado: true,
  debe_cambiar_clave: false,
  rol: 'admin',
  estado: 'aprobado',
  created_at: '',
}

export const soloDigitos = (v: string) => v.replace(/\D/g, '')

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(sb ? null : LOCAL_PERFIL)
  const [loading, setLoading] = useState(Boolean(sb))

  useEffect(() => {
    if (!sb) return
    const { data } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) setLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id

  const loadPerfil = useCallback(async () => {
    if (!sb || !userId) return
    const { data } = await sb.from('perfiles').select('*').eq('id', userId).maybeSingle()
    setPerfil((data as Perfil | null) ?? null)
  }, [userId])

  useEffect(() => {
    if (!sb) return
    if (!userId) {
      setPerfil(null)
      return
    }
    setLoading(true)
    void loadPerfil().finally(() => setLoading(false))
  }, [userId, loadPerfil])

  const value = useMemo<AuthCtx>(
    () => ({
      loading,
      signedIn: sb ? Boolean(session) : true,
      perfil,
      isAdmin: perfil?.rol === 'admin' && perfil.estado === 'aprobado',
      async signIn(usuario, password) {
        const { error } = await sb!.auth.signInWithPassword({ email: emailDe(soloDigitos(usuario)), password })
        if (error) throw new Error('Usuario o contraseña incorrectos')
      },
      async signOut() {
        await sb?.auth.signOut()
      },
      refreshPerfil: loadPerfil,
    }),
    [loading, session, perfil, loadPerfil],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth fuera de AuthProvider')
  return v
}
