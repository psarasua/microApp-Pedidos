# microApp-Pedidos

App para armar pedidos: catálogo de productos con foto, agrupados por categoría, y pedidos con artículos y cantidades.
Debe funcionar en PC, Android e iOS (PWA instalable).

## Stack
- React 19 + Vite + TypeScript, Tailwind CSS v4 (tokens en `src/index.css`, bloque `@theme`)
- Supabase (Postgres, Auth, Storage y una Edge Function) como backend opcional; sin variables de entorno usa `localStorage` ("modo local", sin login: quien usa el dispositivo es admin)
- PWA con `vite-plugin-pwa`

## Comandos
- `npm run dev` servidor de desarrollo
- `npm run build` typecheck + build de producción
- `npm run lint` oxlint

## Estructura
- `src/lib/db.ts` elige la implementación: `db.supabase.ts` o `db.local.ts` (misma interfaz `Db` en `types.ts`)
- `src/lib/data.tsx` carga categorías/productos/pedidos; llamar `refresh()` tras cada escritura
- `src/lib/cart.tsx` carrito en `localStorage`
- `src/lib/auth.tsx` sesión y perfil; `src/lib/supabase.ts` cliente compartido
- `supabase/functions/clientes/index.ts` registro de clientes y cambio de clave por el admin (se despliega con verify_jwt desactivado)
- `src/pages/` Catalog, Cart (nuevo pedido), Orders (historial), Admin (CRUD productos, categorías y aprobación de clientes), Login, Account
- `supabase/schema.sql` esquema completo; los nombres de columnas están en español y se mapean a inglés en `db.supabase.ts`

## Diseño
Idea: talonario de pedidos. Paleta: tinta `#14213D`, papel `#F6F7F9`, azul carbón `#2347C5`, rojo sello `#D93A2B`,
resaltador `#FFD93D` (solo para cantidades y totales). Tipografía: Schibsted Grotesk. Navegación inferior en móvil,
barra lateral en PC. Mantener botones táctiles de al menos 40 px y foco visible.

## Convenciones
- Textos de interfaz en español, frases en minúscula salvo la primera letra.
- Los pedidos guardan nombre y precio del producto al momento de confirmar (no cambian si se edita el producto).
- Login: usuario = número de celular (8 a 15 dígitos), contraseña de 8 o más caracteres. Supabase Auth guarda el hash (bcrypt).
  Internamente el usuario se convierte en el email `<numero>@clientes.invalid` (debe coincidir en `src/lib/supabase.ts` y en la función).
- Roles: `cliente` (ve catálogo y solo sus pedidos) y `admin`. Un cliente nuevo queda `pendiente` hasta que el admin lo aprueba.
- La seguridad real está en las políticas RLS de `schema.sql`, no en ocultar pantallas. El precio de cada ítem lo fija un trigger
  desde `productos`: nunca confiar en el precio que envía el navegador.
- Al agregar una tabla: activar RLS y escribir sus políticas en el mismo cambio.
