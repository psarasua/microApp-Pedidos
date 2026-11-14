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
- Login: usuario = ID numérico que asigna la función `clientes` al registrarse (6 dígitos al azar, único; la base acepta 5 a 15),
  contraseña de 8 o más caracteres. Supabase Auth guarda el hash (bcrypt). El celular es un dato de contacto opcional (`perfiles.telefono`).
  Internamente el usuario se convierte en el email `<id>@clientes.invalid` (debe coincidir en `src/lib/supabase.ts` y en la función).
- Recuperación de contraseña: las contraseñas son un hash y nunca se pueden mostrar. Cada cuenta tiene un código de recuperación
  (`XXXX-XXXX-XXXX`, solo su hash en la tabla `recuperacion`, accesible únicamente por la función `clientes`). Acciones de la función:
  `registrar`, `recuperar`, `cambiar_clave`, `nuevo_codigo`, `restablecer_clave` (admin, genera una temporal y marca
  `perfiles.debe_cambiar_clave`, que fuerza la pantalla `ForcePasswordChange`). Cambiar una contraseña invalida las sesiones abiertas,
  por eso la app vuelve a iniciar sesión justo después. Los mensajes de `recuperar` son genéricos para no revelar qué usuarios existen.
  Para cambiar el ID de una cuenta hay que actualizar `auth.users.email`, `auth.identities.identity_data.email` y `perfiles.usuario` juntos.
- Roles: `cliente` (ve catálogo y solo sus pedidos) y `admin`. Un cliente nuevo queda `pendiente` hasta que el admin lo aprueba.
- La seguridad real está en las políticas RLS de `schema.sql`, no en ocultar pantallas. El precio de cada ítem lo fija un trigger
  desde `productos`: nunca confiar en el precio que envía el navegador.
- Al agregar una tabla: activar RLS y escribir sus políticas en el mismo cambio.
