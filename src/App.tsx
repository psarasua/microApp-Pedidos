import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Spinner } from './components/ui'
import { AuthProvider, useAuth } from './lib/auth'
import { CartProvider } from './lib/cart'
import { DataProvider } from './lib/data'
import { AccountStatus } from './pages/AccountStatus'
import { Admin } from './pages/Admin'
import { Cart } from './pages/Cart'
import { Catalog } from './pages/Catalog'
import { ForcePasswordChange } from './pages/ForcePasswordChange'
import { ForgotUser } from './pages/ForgotUser'
import { Login } from './pages/Login'
import { Orders } from './pages/Orders'
import { Recover } from './pages/Recover'
import { Register } from './pages/Register'

function Gate() {
  const { loading, signedIn, perfil, isAdmin } = useAuth()

  if (loading) return <div className="grid min-h-dvh place-items-center"><Spinner /></div>

  if (!signedIn)
    return (
      <Routes>
        <Route path="registro" element={<Register />} />
        <Route path="recuperar" element={<Recover />} />
        <Route path="usuario" element={<ForgotUser />} />
        <Route path="*" element={<Login />} />
      </Routes>
    )

  if (perfil?.debe_cambiar_clave) return <ForcePasswordChange />

  if (perfil?.estado !== 'aprobado') return <AccountStatus />

  return (
    <DataProvider>
      <CartProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Catalog />} />
            <Route path="pedido" element={<Cart />} />
            <Route path="historial" element={<Orders />} />
            {isAdmin && <Route path="admin" element={<Admin />} />}
            <Route path="*" element={<Catalog />} />
          </Route>
        </Routes>
      </CartProvider>
    </DataProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  )
}
