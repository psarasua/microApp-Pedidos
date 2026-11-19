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
- `supabase/functions/clientes/` registro de clientes, recuperación y cambio de clave (verify_jwt desactivado). `index.ts` solo enruta; cada acción vive en `acciones/<accion>.ts`
  (`registrar`, `verificar-correo`, `reenviar-codigo`, `recuperar-pedir`, `recuperar-confirmar`, `olvide-usuario`, `cambiar-clave`, `restablecer-clave`) y lo común en `http`, `correo`, `envios`, `perfiles`, `limites`, `utiles` y `supabase`.
  Se despliega con `npx supabase functions deploy clientes --remote=<ref> --no-verify-jwt --use-api` (la CLI pide confirmación para producción).
- Archivo del pedido: al confirmar un pedido se abre «Mis pedidos» con ese pedido y el botón «Descargar .txt»; cada pedido del historial tiene el mismo botón (también el admin en «Recibidos»).
  Se genera en el navegador con `src/lib/txtPedido.ts`: **una línea por artículo, sin encabezado y con CRLF: `codigo_cliente,codigo_articulo,cantidad`** (el código de cliente sale de
  `pedidos.codigo_cliente`, que fija un trigger al crear el pedido; el artículo es `productos.codigo`). Si falta el código de cliente o algún código de artículo, no se genera y se explica por qué.
- `supabase/functions/pedido-correo/` (`index.ts`, verify_jwt desactivado; hay que volver a desplegarla con el cambio a .txt) ya está desplegada pero **la app todavía no la usa** (el envío por correo es lo último
  que se hace). Cuando se active: llamar `enviarPedidoPorCorreo(id)` (`src/lib/supabase.ts`) tras `createOrder`; envía por Brevo el .txt adjunto a `PEDIDOS_DESTINO` y, en copia,
  a `PEDIDOS_COPIA` (secretos, listas separadas por comas), una sola vez por pedido (`pedidos.correo_enviado_at`, reserva atómica; el admin puede reenviar con `reenviar`).
- `src/pages/` Catalog, Cart (nuevo pedido), Orders (historial), Login, Register, Recover, ForgotUser, ForcePasswordChange y `Admin.tsx` (solo reparte entre pestañas).
  Cada pestaña o ventana del admin vive en su archivo de `src/pages/admin/`: `ProductosTab`, `ProductoForm`, `CategoriasTab`, `ClientesTab`, `DatosClienteModal`, `RestablecerClaveModal`, `HerramientasDatosTab`.
- **Regla de organización:** un archivo, una responsabilidad y un nombre que la diga; si pasa de ~200 líneas hay que preguntarse si hace más de una cosa. Las pantallas dependen de la interfaz `Db` (`types.ts`), no de Supabase.
- `src/components/Modal.tsx` (`<dialog>` nativo) y `confirmar.ts` (sustituye a `window.confirm`)
- `vercel.json` define las cabeceras de seguridad (CSP estricta, HSTS, nosniff, etc.). Si se agrega un servicio externo (fuentes, imágenes,
  API) hay que permitirlo en `connect-src`/`img-src`/`font-src`. La fuente se sirve desde el paquete `@fontsource-variable/schibsted-grotesk` (sin Google Fonts).
- Los pedidos se crean con la función SQL `crear_pedido` (una sola transacción); el navegador solo envía producto y cantidad.
- `supabase/schema.sql` esquema completo; los nombres de columnas están en español y se mapean a inglés en `db.supabase.ts`
- Catálogo de Conaprole 2026 (189 productos, 9 categorías: sin Helados, Congelados ni Polar Food, que no se venden): `supabase/seed-catalogo-conaprole.sql` (idempotente) y las fotos en
  `public/productos/<código>.webp` (`image_url = /productos/<código>.webp`).
  El catálogo no trae precios: quedan en 0 y la app los muestra como «Sin precio». **`productos.codigo` es la clave del producto: obligatorio y único**
  (índice `productos_codigo_key`). El catálogo original repetía 81339 y 2635; se resolvió quitando los duplicados (de 2635 queda Pudding Chocolate).
  Las fotos nuevas que se suben desde Admin van a Supabase Storage.

## Diseño
Identidad «Lácteo fresco»: limpia, amable y pensada para productos de heladera (el catálogo es de lácteos). Tokens en `src/index.css` (bloque `@theme`):
crema de leche `paper #FBFAF6`, tinta verde bosque `ink #17302B`, verde menta profundo `accion #0F7B5F` (acciones y selección; `accion-soft #E3F3ED`),
durazno `mark #FFB86B` (solo cantidades y totales), línea `#E6E3D8`, alerta `stamp #D6453D`. Tipografía: Bricolage Grotesque (títulos, marca y totales,
clase `font-display`) e Inter (texto), ambas autoalojadas con fontsource. Bordes redondeados (12–16 px) y sombra suave (`shadow-suave`).
Estructura: barra superior con menú (cuenta, recibidos, admin), categorías en columna izquierda en PC (chips en móvil), lista de productos con campo
de cantidad siempre visible; el resumen del pedido (cantidad y total) va como chip compacto en la barra superior, sin barras flotantes que tapen productos. Navegación inferior en móvil. Mantener botones táctiles de al menos 40 px y foco visible.
Logo: una gota de leche con un tilde (pedido listo). Componentes en `src/components/Logo.tsx`: `LogoMark` (ícono cuadrado), `Logo` (marca + «pedidos», donde la gota
reemplaza el punto de la «i», con la «ı» sin punto de Bricolage) y `LogoCargando` (la gota se llena de leche con olas, dibuja el tilde y repite; con «reducir movimiento»
queda quieta y llena). `Spinner` usa `LogoCargando`, y `index.html` trae el mismo cargador estático mientras carga el JavaScript. El ícono de la app
(`public/favicon.svg` y los PNG) sale de la misma gota; los PNG se regeneran con sharp a partir de esas rutas SVG.

## Animaciones
Leves y con propósito (todo en `src/index.css`, sección «Movimiento»): botones que se hunden al presionar (`scale(.97)`, 160 ms), diálogos y menú de
cuenta que aparecen con fundido y un pequeño ascenso (150–220 ms, `@starting-style`), y un latido del contador del pedido. Curva `--ease-out`;
solo `transform` y `opacity`; nada de `scale(0)` ni `transition: all`. **No se animan** las acciones muy frecuentes (sumar/restar cantidades, listas
del catálogo, cambio de categoría). Con «reducir movimiento» queda solo el fundido.

## Convenciones
- Textos de interfaz en español, frases en minúscula salvo la primera letra.
- Los pedidos guardan nombre y precio del producto al momento de confirmar (no cambian si se edita el producto).
- Login: usuario = ID numérico que asigna la función `clientes` al registrarse (6 dígitos al azar, único; la base acepta 5 a 15),
  contraseña de 8 o más caracteres. Supabase Auth guarda el hash (bcrypt). **El registro pide solo correo y contraseña** (sin nombre, celular ni dirección: no se usan). `perfiles.nombre` queda provisorio («Cliente 496230») y el nombre real es `perfiles.nombre_cliente`, que asigna el admin; la app muestra `nombreMostrado(perfil)`. Las columnas `telefono` y `direccion` quedan vacías.
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
  `CORREO_SIMULADO=1` solo para pruebas y `ALLOWED_ORIGINS` (opcional, lista de orígenes permitidos por CORS; sin él se permite cualquiera).
  `restablecer_clave` solo funciona sobre clientes, no sobre admins. No hay sección «Mi cuenta»: el cliente solo ve Catálogo, Pedido y Mis pedidos (más «Salir»).
  Para cambiar el ID de una cuenta hay que actualizar `auth.users.email`, `auth.identities.identity_data.email` y `perfiles.usuario` juntos.
- **Código y nombre de cliente:** `perfiles.codigo_cliente` (1 a 10 dígitos, único) y `perfiles.nombre_cliente` los asigna solo el admin (pestaña Clientes, que también lista las cuentas de administrador, solo para asignarles código y nombre y poder pedir desde ellas; la política de UPDATE de `perfiles` es solo admin).
  Hasta tener ambos, una cuenta aprobada ve el catálogo pero no puede crear pedidos: lo exige la política `pedidos: crear` (función `private.puede_pedir`) y la app avisa (`AvisoSinCodigo`) y desactiva «Confirmar pedido».
  En modo local no aplica. Migración para una base existente: `supabase/migraciones/2026-11-18-codigo-de-cliente.sql`.
- Roles: `cliente` (ve catálogo y solo sus pedidos) y `admin`. Un cliente nuevo queda `pendiente` hasta que el admin lo aprueba.
- La seguridad real está en las políticas RLS de `schema.sql`, no en ocultar pantallas. El precio de cada ítem lo fija un trigger
  desde `productos`: nunca confiar en el precio que envía el navegador.
- Al agregar una tabla: activar RLS y escribir sus políticas en el mismo cambio.
