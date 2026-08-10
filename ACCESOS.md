# Accesos y credenciales — Trustify Market

> **Este archivo NO contiene ninguna clave.** Solo dice qué existe, para qué sirve,
> dónde está guardado y cómo regenerarlo. Los valores reales viven en `.env.local`
> (tu PC) y en Vercel. Nunca pegues un token aquí.

Última revisión: 10 de agosto de 2026.

---

## 1. El mapa en una frase

El sitio es **HTML estático + funciones serverless** en Vercel. El código está en
**GitHub**; cada push a `main` despliega solo. Los datos de las cuentas en venta viven en
**Supabase** (base + imágenes), los formularios de venta se avisan por **Telegram** y se
archivan en **Google Sheets**, y las publicaciones se anuncian en **Discord**.

```
GitHub (main) ──push──> Vercel ──> www.trustifymarket.online
                          │
                          ├─ Supabase      catálogo de cuentas + fotos
                          ├─ Telegram      aviso de cada formulario / anuncios
                          ├─ Google Sheets archivo de cada formulario
                          └─ Discord       anuncio al publicar una cuenta
```

---

## 2. Las 6 cuentas de las que dependes

| # | Servicio | Para qué | Dónde entras | Cuenta |
|---|----------|----------|--------------|--------|
| 1 | **GitHub** | El código | github.com/desarroiape/tio-valo | `desarroiape` |
| 2 | **Vercel** | Hosting + las variables de entorno | vercel.com → proyecto `tio-valo` | equipo `desarroiapes-projects` |
| 3 | **Supabase** | Base de datos y fotos del catálogo | supabase.com → tu proyecto | — |
| 4 | **Telegram** | Bots de aviso y de anuncios | @BotFather dentro de Telegram | — |
| 5 | **Google (Apps Script + Sheets)** | La hoja donde se archivan los formularios | script.google.com | tu cuenta de Google |
| 6 | **Discord** | Servidor y webhook de anuncios | Ajustes del canal → Integraciones | servidor Trustify |

Si pierdes el acceso a **GitHub o Vercel**, se cae todo. Esos dos son los que deben
tener contraseña fuerte y verificación en dos pasos activada.

---

## 3. Las 13 variables de entorno, explicadas

Todas se leen desde el código en `api/` y `lib/`. La columna "Origen" dice de dónde
sacas el valor si algún día hay que ponerlo de nuevo.

### Telegram — avisos del formulario de venta

| Variable | Qué es | Origen |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Token del bot que te manda cada formulario | @BotFather → `/mybots` → API Token |
| `TELEGRAM_CHAT_ID` | A qué chat te lo manda | El ID de tu chat o grupo |

### Telegram — canal de anuncios (bot aparte)

| Variable | Qué es | Origen |
|---|---|---|
| `TELEGRAM_ANUNCIOS_BOT_TOKEN` | Token del bot que publica anuncios | @BotFather |
| `TELEGRAM_ANUNCIOS_CHAT_ID` | Canal donde publica | ID del canal |

### Google Sheets — archivo de formularios

| Variable | Qué es | Origen |
|---|---|---|
| `SHEETS_WEBHOOK_URL` | URL del Web App de Apps Script (termina en `/exec`) | script.google.com → Implementar → Web App |
| `SHEETS_SECRET` | Contraseña compartida entre el sitio y el script | La inventas tú; **debe ser idéntica** en Vercel y dentro del Apps Script |

El código del script está en [apps-script/vender-sheets.gs](apps-script/vender-sheets.gs).
Un solo script sirve a los dos juegos: el sitio le manda el juego y la pestaña, y el
script elige el libro con el mapa `LIBROS` de su primera línea.

| Juego | Libro (ID de la hoja) | Pestaña |
|---|---|---|
| Valorant | `1Odr9_5CFQkU5cqbkTM6iV1u5t5yU5J6VcNqI07vDUsI` | `Valorant form` |
| Fortnite | `1jHmWOfwwCix054PkP7W8xtSUl7kfXP6n7AKkjwlx6yo` | `FORTNITE FORMS` |

⚠️ **Guardar el código NO basta.** La URL `/exec` ejecuta la versión *publicada*: tras
cualquier cambio hay que hacer Implementar → Gestionar implementaciones → ✏️ →
Versión "Nueva versión" (o crear una implementación nueva, que da otra URL y obliga a
actualizar `SHEETS_WEBHOOK_URL`).

### Supabase — catálogo e imágenes

| Variable | Qué es | Origen |
|---|---|---|
| `SUPABASE_URL` | URL del proyecto (`https://xxxx.supabase.co`) | Supabase → Settings → API |
| `SUPABASE_SECRET_KEY` | Clave secreta de servidor. **La más peligrosa: da acceso total** | Supabase → Settings → API |
| `SUPABASE_PUBLISHABLE_KEY` | Clave pública, de solo lectura | Supabase → Settings → API |

Usa la tabla **`cuentas`** y el bucket de imágenes **`cuentas`**.

### Panel de administración (`/admin`)

| Variable | Qué es | Origen |
|---|---|---|
| `ADMIN_PASSWORD` | La contraseña con la que entras a `/admin` | La eliges tú |
| `SESSION_SECRET` | Cadena aleatoria larga que firma tu sesión | La generas tú (ver §6) |

### Discord y varios

| Variable | Qué es | Origen |
|---|---|---|
| `DISCORD_WEBHOOK_URL` | Webhook del canal donde se anuncian las cuentas | Discord → Ajustes del canal → Integraciones → Webhooks |
| `SITE_URL` | `https://www.trustifymarket.online` — para los enlaces de los anuncios | Fija |

> `VERCEL_OIDC_TOKEN` aparece en tu `.env.local` pero **no lo pusiste tú**: lo genera
> Vercel solo y caduca. Ignóralo.

---

## 4. Dónde vive cada secreto (los 3 lugares)

Cada clave existe en tres sitios, y los tres deben coincidir:

1. **El servicio que la emitió** — Telegram, Supabase, Discord… Ahí es donde la
   regeneras si se pierde. **Esta es la única fuente de verdad.**
2. **Vercel → proyecto `tio-valo` → Settings → Environment Variables** — es lo que
   usa la web en producción. Si cambias algo aquí, hay que **redeployar** para que
   tome efecto.
3. **`.env.local` en tu PC** — solo para probar en local. Está en `.gitignore`, nunca
   se sube a GitHub.

Para bajar de Vercel a tu PC lo que ya está configurado:

```bash
vercel env pull .env.local
```

---

## 5. ⚠️ Pendiente detectado

Cinco variables están **solo en Production**, no en Preview ni Development:

`ADMIN_PASSWORD` · `SESSION_SECRET` · `SITE_URL` · `TELEGRAM_BOT_TOKEN` · `TELEGRAM_CHAT_ID`

Consecuencia: si algún día abres una rama y Vercel genera un **deploy de Preview**, en
esa URL de prueba no funcionará ni el login de `/admin` ni el aviso por Telegram del
formulario. En producción todo está bien. No es urgente, pero cuando quieras probar
cambios sin tocar el sitio real, hay que añadirlas también a Preview.

---

## 6. Recetas rápidas

**Cambiar la contraseña del panel `/admin`**
```bash
vercel env rm ADMIN_PASSWORD production
vercel env add ADMIN_PASSWORD production   # te pide la nueva
vercel --prod                              # redeploy para que tome efecto
```

**Generar un `SESSION_SECRET` nuevo (cadena aleatoria larga)**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Ojo: al cambiarlo se cierra tu sesión de `/admin` y tienes que volver a entrar.

**Ver qué variables hay configuradas (sin ver los valores)**
```bash
vercel env ls
```

**Si se te filtra un token** (lo pegaste por error en un chat, en el código, etc.):
1. Regenéralo en el servicio de origen — §3, columna "Origen".
2. Actualízalo en Vercel.
3. `vercel env pull .env.local` para actualizar tu PC.
4. Redeploy.

El más urgente de todos si se filtra es `SUPABASE_SECRET_KEY`: da acceso total a la
base de datos y a las fotos.

---

## 7. Reglas de oro

- **Nunca** pegues una clave dentro de un archivo `.html`, `.js` o `.md`. Todo va por
  variables de entorno.
- `.env.local` no se sube nunca. Ya está en `.gitignore`, no lo saques de ahí.
- Antes de commitear, si dudas: `git status` y mira que no aparezca ningún `.env`.
- Verificación en dos pasos activada al menos en **GitHub, Vercel y Google**.
- Si cambias de computadora: clonas el repo, `npm install`, `vercel login`,
  `vercel link` (proyecto `tio-valo`) y `vercel env pull .env.local`. Con eso lo tienes
  todo funcionando en local sin buscar ninguna clave a mano.
