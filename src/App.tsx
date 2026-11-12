import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { CartProvider } from './lib/cart'
import { DataProvider } from './lib/data'
import { Admin } from './pages/Admin'
import { Cart } from './pages/Cart'
import { Catalog } from './pages/Catalog'
import { Orders } from './pages/Orders'

export default function App() {
  return (
    <DataProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Catalog />} />
              <Route path="pedido" element={<Cart />} />
              <Route path="historial" element={<Orders />} />
              <Route path="admin" element={<Admin />} />
              <Route path="*" element={<Catalog />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </DataProvider>
  )
}
