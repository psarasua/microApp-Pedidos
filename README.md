# Pedidos

App web instalable (PWA) para armar pedidos desde PC, Android o iOS.

## Probar ahora
```bash
npm install
npm run dev
```
Sin configuración funciona en **modo local**: los datos quedan en el navegador de ese dispositivo.

## Compartir datos entre dispositivos y cuentas de clientes (Supabase)
1. Crea un proyecto gratis en https://supabase.com.
2. En *SQL Editor*, ejecuta el contenido de `supabase/schema.sql`.
3. Despliega la función `supabase/functions/clientes` (*Edge Functions > Deploy*, o `supabase functions deploy clientes --no-verify-jwt`).
4. Copia `.env.example` a `.env` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (en *Project Settings > API*).
5. Configura el envío de correos (ver más abajo, «Correos con Brevo»). Sin eso nadie puede registrarse.
6. Inicia la app y toca *Crear cuenta*: pide un correo y le envía un código de verificación. Al verificarlo, la app te asigna un **usuario numérico al azar (6 dígitos)**, te lo muestra y también te lo envía por correo. Luego, en el SQL Editor, conviértete en admin con ese ID:
   ```sql
   update perfiles set rol = 'admin', estado = 'aprobado' where usuario = 'TU_ID';
   ```
7. (Opcional) Carga el catálogo de Conaprole 2026, con 311 productos y fotos: ejecuta `supabase/seed-catalogo-conaprole.sql` en el SQL Editor.
   Las fotos ya están en `public/productos/`. El catálogo no trae precios: cárgalos desde *Admin > Productos* (los productos sin precio se ven como «Sin precio»).

### Cómo entran los clientes
Se registran solos con nombre, **correo (obligatorio)** y contraseña; el celular y la dirección son opcionales.
1. Les llega un **código de 6 dígitos** al correo y lo escriben para verificarlo.
2. El sistema les asigna un **ID numérico único**, que es su usuario, y se lo muestra y se lo envía por correo. La contraseña la elige cada persona y **nunca viaja por correo**.
3. Quedan **pendientes** hasta que los apruebes en *Admin > Clientes* (solo se puede aprobar a quien verificó su correo). Ahí ves el usuario y el correo de cada uno.
Desde ahí también puedes bloquearlos o restablecerles la contraseña. Cada cliente ve el catálogo y **solo sus propios pedidos**.

### Si un cliente olvida su contraseña o su usuario
Las contraseñas se guardan cifradas (hash): **nadie puede verlas**, ni el administrador.
- **Contraseña:** en *Olvidé mi contraseña* escribe su usuario o su correo, le llega un código y, con el código correcto, elige una contraseña nueva. Le llega un aviso del cambio.
- **Usuario:** en *Olvidé mi usuario* escribe su correo y le llega su ID.
- **Si el correo no llega:** en *Admin > Clientes > Restablecer contraseña* se genera una contraseña **temporal**, que ves una sola vez y le pasas. Al entrar, la app le obliga a elegir una nueva.

Protecciones: los códigos vencen a los 15 minutos y se anulan tras 5 intentos; máximo 3 correos por dirección y por hora, 10 por conexión y por hora, 5 registros por conexión y por hora y 250 correos por día en total; las cuentas que no verifican su correo se borran a las 24 horas; y las respuestas no revelan qué usuarios o correos existen.

### Correos con Brevo
Los correos salen por [Brevo](https://www.brevo.com) (plan gratis: 300 correos por día).
1. Crea una cuenta en Brevo y, en *Senders, Domains & Dedicated IPs > Senders*, agrega y verifica el correo que usarás como remitente.
2. En *SMTP & API > API Keys*, genera una clave de API (v3) y cópiala.
3. En Supabase, *Edge Functions > Secrets* (o *Project Settings > Edge Functions*), agrega:
   - `BREVO_API_KEY`: la clave de API.
   - `BREVO_SENDER_EMAIL`: el remitente verificado en Brevo.
   - `BREVO_SENDER_NAME` (opcional): el nombre que verán los clientes. Por defecto, «Pedidos».
4. Sin dominio propio, los correos de un remitente Gmail pueden caer en spam. Con un dominio propio verificado en Brevo la entrega mejora mucho.

Para probar sin enviar correos, el secreto `CORREO_SIMULADO=1` hace que la función escriba el correo en sus registros en vez de enviarlo. Debe estar apagado en producción.

Si una cuenta de administrador se creó antes de existir el correo obligatorio, agrégale el correo para que pueda recuperar su contraseña:
```sql
update perfiles set email = 'tu@correo.com', email_verificado = true where usuario = 'TU_ID';
```

## Publicar en internet (Vercel, gratis)
1. Entra en https://vercel.com con tu cuenta de GitHub y elige *Add New > Project*.
2. Selecciona el repositorio `microApp-Pedidos` y la rama que quieras publicar. Vercel detecta Vite solo; `vercel.json` ya tiene la regla para que las rutas de la app funcionen.
3. En *Environment Variables* agrega `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_CURRENCY` con los mismos valores del `.env`.
4. Pulsa *Deploy*. Cada push a GitHub vuelve a publicar la app. Con Netlify funciona igual (`public/_redirects` ya está incluido).

## Instalar en el celular
Abre la dirección publicada desde el celular:
- Android (Chrome): menú ⋮ > *Instalar app*.
- iPhone (Safari): Compartir > *Añadir a pantalla de inicio*.
