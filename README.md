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
3. En Cloud Run o Firebase App Hosting, usa la cuenta de servicio asignada al runtime.

### 2. Permisos en GA4

1. En GA4: **Admin → Property access management**.
2. Agrega el email del service account (`...@....iam.gserviceaccount.com`) con rol **Viewer**.
3. Copia el **Property ID** numérico (Admin → Property settings).

### 3. Variables de entorno

```bash
cp .env.example .env.local
```

En Cloud Run o Firebase App Hosting, habilita Application Default Credentials
(ADC) para usar la identidad del runtime sin descargar una clave privada:

```env
GOOGLE_AUTH_USE_ADC=true
GA4_PROPERTY_ID=123456789
```

Este modo tiene prioridad sobre `GA4_SERVICE_ACCOUNT_JSON` y las credenciales
`GOOGLE_CLIENT_EMAIL` / `GOOGLE_PRIVATE_KEY`. Deja `GOOGLE_APPLICATION_CREDENTIALS`
sin definir para que ADC use la identidad del runtime. Firebase Admin también
usa ADC y el proyecto indicado por `NEXT_PUBLIC_FIREBASE_PROJECT_ID`; configura las
variables `NEXT_PUBLIC_FIREBASE_*` para el mismo proyecto de Authentication. La
cuenta del runtime necesita los permisos de Firebase Admin que usa la aplicación
y acceso de lectura a las propiedades GA4 consultadas.

Para desarrollo local o despliegues existentes con una clave estática, deja ADC
deshabilitado y configura:

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
