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
5. Inicia la app y toca *Crear cuenta*. La app te asigna un **usuario numérico al azar (6 dígitos)** y te lo muestra: anótalo. Luego, en el SQL Editor, conviértete en admin con ese ID:
   ```sql
   update perfiles set rol = 'admin', estado = 'aprobado' where usuario = 'TU_ID';
   ```

### Cómo entran los clientes
Se registran solos con su nombre y una contraseña (el celular y la dirección son opcionales). El sistema les asigna un **ID numérico único**, que es su usuario, y se lo muestra al terminar el registro.
Quedan **pendientes** hasta que los apruebes en *Admin > Clientes*, donde ves el usuario de cada uno por si lo olvidan.
Desde ahí también puedes bloquearlos o restablecerles la contraseña.

### Si un cliente olvida su contraseña
Las contraseñas se guardan cifradas (hash): **nadie puede verlas**, ni el administrador.
1. **Sin ayuda de nadie:** al crear la cuenta, el cliente recibe un **código de recuperación** (formato `XXXX-XXXX-XXXX`) que debe guardar. En *Olvidé mi contraseña* ingresa su usuario y ese código y elige una contraseña nueva. Le entregan un código nuevo y el anterior deja de servir. Tras 5 intentos fallidos, la recuperación se bloquea 30 minutos.
2. **Si perdió también el código:** en *Admin > Clientes > Restablecer contraseña* se genera una contraseña **temporal**, que ves una sola vez y le pasas. Al entrar, la app le obliga a elegir una nueva.
3. Desde *Mi cuenta* cada persona puede cambiar su contraseña y generar un código de recuperación nuevo.

El administrador que olvide su contraseña usa el mismo código de recuperación. Si pierde ambos, hay que restablecerla desde el panel de Supabase. Cada cliente ve el catálogo y **solo sus propios pedidos**.

## Publicar en internet (Vercel, gratis)
1. Entra en https://vercel.com con tu cuenta de GitHub y elige *Add New > Project*.
2. Selecciona el repositorio `microApp-Pedidos` y la rama que quieras publicar. Vercel detecta Vite solo; `vercel.json` ya tiene la regla para que las rutas de la app funcionen.
3. En *Environment Variables* agrega `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_CURRENCY` con los mismos valores del `.env`.
4. Pulsa *Deploy*. Cada push a GitHub vuelve a publicar la app. Con Netlify funciona igual (`public/_redirects` ya está incluido).

## Instalar en el celular
Abre la dirección publicada desde el celular:
- Android (Chrome): menú ⋮ > *Instalar app*.
- iPhone (Safari): Compartir > *Añadir a pantalla de inicio*.
