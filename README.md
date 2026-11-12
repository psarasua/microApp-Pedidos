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
5. Inicia la app, toca *Crear cuenta* con tu celular y luego, en el SQL Editor, conviértete en admin:
   ```sql
   update perfiles set rol = 'admin', estado = 'aprobado' where usuario = 'TU_NUMERO';
   ```

### Cómo entran los clientes
Se registran solos con su número de celular y una contraseña. Quedan **pendientes** hasta que los apruebes en *Admin > Clientes*.
Desde ahí también puedes bloquearlos o cambiarles la contraseña. Cada cliente ve el catálogo y **solo sus propios pedidos**.

## Instalar en el celular
Publica la app (por ejemplo en Vercel o Netlify con `npm run build`) y ábrela desde el celular:
- Android (Chrome): menú ⋮ > *Instalar app*.
- iPhone (Safari): Compartir > *Añadir a pantalla de inicio*.
