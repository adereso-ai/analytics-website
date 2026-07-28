# Analítica Web · GA4 Dashboard

Dashboard simple sobre la **Google Analytics Data API** para revisar:

- Páginas más visitadas
- Fuentes de tráfico
- Landings y siguiente página (flujo)
- Eventos de conversión (key events)
- Páginas que convierten
- Embudos configurables

## Setup rápido

### 1. Google Cloud

1. Crea (o usa) un proyecto en [Google Cloud Console](https://console.cloud.google.com/).
2. Habilita **Google Analytics Data API**.
3. Crea un **Service Account** → descarga el JSON de la clave.

### 2. Permisos en GA4

1. En GA4: **Admin → Property access management**.
2. Agrega el email del service account (`...@....iam.gserviceaccount.com`) con rol **Viewer**.
3. Copia el **Property ID** numérico (Admin → Property settings).

### 3. Variables de entorno

```bash
cp .env.example .env.local
```

Completa al menos:

```env
GA4_PROPERTY_ID=123456789
GA4_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"...", ...}
```

Alternativas: `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`, o `GOOGLE_APPLICATION_CREDENTIALS=./ruta/al.json`.

### 4. Embudos

Por defecto hay dos embudos fijos en `adereso.ai`:

- **Conversión:** Home → `/contacto` → `/thank-you-page`
- **Interés:** Home → `/pricing` (+ top páginas siguientes)

Override opcional del embudo de conversión:

```env
GA4_FUNNEL_STEPS=[{"name":"Home","hostNames":["adereso.ai","www.adereso.ai"],"pagePath":"/"},{"name":"Contacto","hostNames":["adereso.ai","www.adereso.ai"],"pagePath":"/contacto"},{"name":"Thank-you","hostNames":["adereso.ai","www.adereso.ai"],"pagePath":"/thank-you-page"}]
```

Cada paso acepta `hostNames`, `pagePath`, `pagePathContains` o `eventName`.

### 5. Correr

```bash
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Notas

- Los datos no son realtime: el rango usa hasta **ayer**.
- Las conversiones solo muestran eventos marcados como **key events** en GA4.
- Los embudos usan `runFunnelReport` (API alpha de Google).
