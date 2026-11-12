# microApp-Pedidos

App para armar pedidos: catálogo de productos con foto, agrupados por categoría, y pedidos con artículos y cantidades.
Debe funcionar en PC, Android e iOS (PWA instalable).

## Stack
- React 19 + Vite + TypeScript, Tailwind CSS v4 (tokens en `src/index.css`, bloque `@theme`)
- Supabase (Postgres + Storage) como backend opcional; sin variables de entorno usa `localStorage` ("modo local")
- PWA con `vite-plugin-pwa`

## Comandos
- `npm run dev` servidor de desarrollo
- `npm run build` typecheck + build de producción
- `npm run lint` oxlint

## Estructura
- `src/lib/db.ts` elige la implementación: `db.supabase.ts` o `db.local.ts` (misma interfaz `Db` en `types.ts`)
- `src/lib/data.tsx` carga categorías/productos/pedidos; llamar `refresh()` tras cada escritura
- `src/lib/cart.tsx` carrito en `localStorage`
- `src/pages/` Catalog, Cart (nuevo pedido), Orders (historial), Admin (CRUD productos y categorías)
- `supabase/schema.sql` esquema completo; los nombres de columnas están en español y se mapean a inglés en `db.supabase.ts`

## Diseño
Idea: talonario de pedidos. Paleta: tinta `#14213D`, papel `#F6F7F9`, azul carbón `#2347C5`, rojo sello `#D93A2B`,
resaltador `#FFD93D` (solo para cantidades y totales). Tipografía: Schibsted Grotesk. Navegación inferior en móvil,
barra lateral en PC. Mantener botones táctiles de al menos 40 px y foco visible.

## Convenciones
- Textos de interfaz en español, frases en minúscula salvo la primera letra.
- Los pedidos guardan nombre y precio del producto al momento de confirmar (no cambian si se edita el producto).
- Las políticas RLS de `schema.sql` son abiertas: agregar autenticación antes de exponer la app públicamente.
