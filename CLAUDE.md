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
- Catálogo de Conaprole 2026 (311 productos, 12 categorías): `supabase/seed-catalogo-conaprole.sql` (idempotente) y las fotos en
  `public/productos/<código>.webp` (`image_url = /productos/<código>.webp`; los dos códigos repetidos del catálogo, 2635 y 81339, usan `-2.webp`
  para el segundo producto). El catálogo no trae precios: quedan en 0 y la app los muestra como «Sin precio». `productos.codigo` no es único.
  Las fotos nuevas que se suben desde Admin van a Supabase Storage.

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
- Correo obligatorio: el registro pide un correo real (`perfiles.email`, único) y lo verifica con un código de 6 dígitos enviado por Brevo.
  El usuario (ID) sigue siendo el login; el correo solo sirve para verificar, recuperar contraseña (`recuperar_pedir` y `recuperar_confirmar`,
  con el ID o el correo) y recuperar el usuario (`olvide_usuario`). **La contraseña nunca se envía por correo ni se puede mostrar** (es un hash).
  Los códigos y los límites de envío viven en `envios_correo` (solo accesible por la función `clientes`): vencen a los 15 min, 5 intentos,
  3 correos por dirección/hora, 10 por conexión/hora, 250 por día; los intentos se cuentan con `codigo_intento` (atómico). Las respuestas de
  recuperación son genéricas para no revelar qué cuentas existen. Un cliente no puede ser aprobado sin `email_verificado` (check en la tabla).
  Otras acciones: `registrar`, `verificar_correo`, `reenviar_codigo`, `cambiar_clave`, `restablecer_clave` (admin: genera una contraseña temporal y marca
  `perfiles.debe_cambiar_clave`, que fuerza la pantalla `ForcePasswordChange`). Cambiar una contraseña invalida las sesiones abiertas,
  por eso la app vuelve a iniciar sesión justo después. Secretos de la función: `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`,
  y `CORREO_SIMULADO=1` solo para pruebas. No hay sección «Mi cuenta»: el cliente solo ve Catálogo, Pedido y Mis pedidos (más «Salir»).
  Para cambiar el ID de una cuenta hay que actualizar `auth.users.email`, `auth.identities.identity_data.email` y `perfiles.usuario` juntos.
- Roles: `cliente` (ve catálogo y solo sus pedidos) y `admin`. Un cliente nuevo queda `pendiente` hasta que el admin lo aprueba.
- La seguridad real está en las políticas RLS de `schema.sql`, no en ocultar pantallas. El precio de cada ítem lo fija un trigger
  desde `productos`: nunca confiar en el precio que envía el navegador.
- Al agregar una tabla: activar RLS y escribir sus políticas en el mismo cambio.
