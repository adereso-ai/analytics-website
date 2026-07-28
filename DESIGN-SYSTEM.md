# ADERESO DESIGN SYSTEM — REFERENCIA DE TRABAJO

> Este documento describe **cómo se construye visualmente el sitio en la práctica**.
> Incluye los tokens del sistema Y los patrones de código reales usados en el codebase.
> Es la referencia autoritativa para cualquier agente o desarrollador que trabaje en este proyecto.

---

## STACK

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS v4** — tokens definidos en `app/globals.css` bajo `@theme inline`
- **Fuentes:** Outfit (headings) + Work Sans (body) — cargadas vía `next/font/google`
- **Íconos:** `@tabler/icons-react` — tamaño default 20px, stroke 1.5
- **Dark-mode only.** Sin modo claro. El fondo de toda página es `#0C0C0D`.

---

## 1. COLORES

### Tokens definidos en `globals.css`

```
--color-brand:         #FFD540   → bg-brand, text-brand
--color-brand-hover:   #FFE37A   → hover:bg-brand-hover
--color-brand-active:  #E6C039   → active:bg-brand-active
--color-neutral-800:   #131415   → superficies elevadas (cards)
--color-neutral-900:   #0C0C0D   → fondo de página
```

### Valores usados en `style={{}}` (inline — aceptado en este proyecto)

```
Fondo de página:      backgroundColor: '#0C0C0D'
Fondo de cards:       backgroundColor: '#131415'
Acento / métricas:    color: '#ffd540'
Hover acento:         backgroundColor: '#FFE37A'
Cuerpo muted:         color: 'rgba(255,255,255,0.55–0.65)'
Texto secundario:     color: '#a3a3a3'  ó  color: '#cccccc'
Borde estándar:       border: '1px solid rgba(255,255,255,0.1)'
Borde sutil:          border: '1px solid rgba(255,255,255,0.06–0.08)'
Borde visible:        border: '1px solid rgba(255,255,255,0.15)'
```

---

## 2. TIPOGRAFÍA

### Setup del font (patrón obligatorio)

En **cada componente** que use Outfit, declarar la constante al inicio del archivo:

```tsx
const font = 'font-[family-name:var(--font-outfit)]'
```

Luego interpolarlo en `className`:

```tsx
<h2 className={`text-2xl md:text-3xl font-semibold text-white ${font}`}>
  Título
</h2>
```

Work Sans es el `font-family` del `body` — se aplica automáticamente a párrafos sin clase.

### Escala responsive (mobile → desktop)

| Elemento        | Tailwind classes                     | Notas                            |
|-----------------|--------------------------------------|----------------------------------|
| H1 hero         | `text-4xl md:text-5xl lg:text-[3.5rem]` | Tracking `-0.02em`            |
| H1 landing hero | `text-5xl md:text-6xl`               | Máximo del sistema               |
| H2 sección      | `text-2xl md:text-[2.25rem]`         | `leading-snug`                   |
| H2 contenido    | `text-xl md:text-2xl`                | `font-semibold`                  |
| Body            | `text-base md:text-lg leading-relaxed` | Color `rgba(255,255,255,0.55–0.65)` |
| Body secundario | `text-sm leading-snug`               | Subtítulos, captions             |
| Label / badge   | `text-xs font-semibold uppercase tracking-wide` | 12px — para eyebrows de sección y tags pequeños |
| Badge grande    | `text-sm font-medium`                           | 14px — para badges en heroes y pills de canal/producto |

### Reglas
- `font-medium` (500) para H1–H2, `font-semibold` (600) para métricas grandes, H3+
- `font-normal` (400) para cuerpo
- `leading-[1.1]` en headlines grandes, `leading-snug` en H2-H3, `leading-relaxed` en párrafos
- `tracking-[-0.02em]` en headlines de secciones

---

## 3. GRADIENTE DE TEXTO (headlines hero)

Patrón estándar para headlines con degradado blanco:

```tsx
<h1
  style={{
    background: 'linear-gradient(180deg, #FFFFFF 30%, rgba(255,255,255,0.65) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }}
>
  Headline aquí
</h1>
```

---

## 4. ANIMACIONES DE ENTRADA

### Patrón A — Hero inmediato (primer render)

Usando la clase `.hero-in` / `.hero-in.on` definida en `globals.css`:

```tsx
'use client'
import { useState, useEffect } from 'react'

const [on, setOn] = useState(false)
useEffect(() => {
  const t = setTimeout(() => setOn(true), 80)
  return () => clearTimeout(t)
}, [])

// En JSX:
<h1 className={`hero-in ${on ? 'on' : ''}`} style={{ transitionDelay: '0s' }}>
<p  className={`hero-in ${on ? 'on' : ''}`} style={{ transitionDelay: '0.1s' }}>
<div className={`hero-in ${on ? 'on' : ''}`} style={{ transitionDelay: '0.2s' }}>
```

### Patrón B — IntersectionObserver (secciones al hacer scroll)

Patrón de referencia — copiar y adaptar:

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'

const ref = useRef<HTMLDivElement>(null)
const [visible, setVisible] = useState(false)

useEffect(() => {
  const obs = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) setVisible(true) },
    { threshold: 0.1 }
  )
  if (ref.current) obs.observe(ref.current)
  return () => obs.disconnect()
}, [])

// Helper para inline style:
const fadeUp = (delay = '0s') => ({
  opacity: visible ? 1 : 0,
  transform: visible ? 'translateY(0)' : 'translateY(20px)',
  transition: `opacity 0.7s cubic-bezier(0.2,0.8,0.2,1) ${delay}, transform 0.7s cubic-bezier(0.2,0.8,0.2,1) ${delay}`,
})

// En JSX:
<section ref={ref}>
  <h2 style={fadeUp('0s')}>Título</h2>
  <p  style={fadeUp('0.1s')}>Subtítulo</p>
  <div style={fadeUp('0.2s')}>Contenido</div>
</section>
```

**Parámetros estándar:**
- Threshold: `0.05` – `0.15` (usar `0.1` como default)
- Distancia Y: `20px` – `24px`
- Duración: `0.65s` – `0.7s`
- Easing: siempre `cubic-bezier(0.2,0.8,0.2,1)`
- Delays de stagger: `0s`, `0.1s`, `0.2s`, `0.3s`

---

## 5. LAYOUT — WRAPPERS DE SECCIÓN

```tsx
{/* Secciones de marketing generales */}
<div className="max-w-[1052px] mx-auto px-4 md:px-6">

{/* Contenido editorial (landings de producto, blog) */}
<div className="max-w-5xl mx-auto px-6 md:px-12">

{/* Secciones anchas (BSP, NuestroSistema) */}
<div className="max-w-[1140px] mx-auto px-4 md:px-6 py-16 md:py-24">

{/* CTA final, FAQ */}
<div className="max-w-[1200px] mx-auto px-3 md:px-6">
```

**Padding vertical de secciones:**
- Estándar: `py-14 md:py-20`
- Grande: `py-16 md:py-24`
- Pequeño: `py-10 md:py-16`

---

## 6. SECCIÓN HERO — PATRONES

### Hero con foto de fondo (caso de estudio, landing de industria)

```tsx
<section className="relative w-full min-h-[88vh] flex items-end overflow-hidden"
         style={{ backgroundColor: '#0C0C0D' }}>

  {/* Foto */}
  <div
    className="absolute inset-0"
    style={{
      backgroundImage: `url(${img})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center top',
      transform: on ? 'scale(1)' : 'scale(1.04)',
      transition: 'transform 1.2s cubic-bezier(0.2,0.8,0.2,1)',
    }}
  />

  {/* Overlay vertical (bottom-heavy) */}
  <div
    className="absolute inset-0"
    style={{
      background: 'linear-gradient(to bottom, rgba(12,12,13,0.3) 0%, rgba(12,12,13,0.15) 30%, rgba(12,12,13,0.75) 65%, rgba(12,12,13,0.97) 100%)',
    }}
  />

  {/* Vignette lateral izquierda */}
  <div
    className="absolute inset-0"
    style={{ background: 'linear-gradient(to right, rgba(12,12,13,0.6) 0%, transparent 60%)' }}
  />

  {/* Contenido */}
  <div className="relative w-full max-w-5xl mx-auto px-6 md:px-12 pb-16 md:pb-20">
    {/* logo + h1 + subtitle + CTA */}
  </div>
</section>
```

### Hero con fondo radial brand (secciones de listado)

```tsx
<section className="relative w-full overflow-hidden" style={{ backgroundColor: '#0C0C0D' }}>
  <div
    className="absolute inset-0 pointer-events-none"
    style={{
      background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,213,64,0.07) 0%, transparent 70%)',
    }}
  />
  {/* contenido */}
</section>
```

---

## 7. BOTONES

### Primario (amarillo)

```tsx
<a
  href="/contacto"
  className={`inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-medium text-black no-underline transition-all duration-200 ${font}`}
  style={{ backgroundColor: '#ffd540', boxShadow: '0 0 20px rgba(255,213,64,0.2)' }}
  onMouseEnter={e => {
    e.currentTarget.style.backgroundColor = '#FFE37A'
    e.currentTarget.style.boxShadow = '0 0 28px rgba(255,213,64,0.35)'
  }}
  onMouseLeave={e => {
    e.currentTarget.style.backgroundColor = '#ffd540'
    e.currentTarget.style.boxShadow = '0 0 20px rgba(255,213,64,0.2)'
  }}
>
  Hablar con un experto
  <svg>…</svg>
</a>
```

Variante con tokens Tailwind (también válida, usada en `Hero.tsx`):

```tsx
<a
  href="/contacto"
  className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-medium
              bg-brand text-neutral-900
              hover:bg-brand-hover hover:shadow-[0_0_28px_rgba(255,213,64,0.28)]
              active:bg-brand-active transition-all duration-200 ${font}`}
  style={{ boxShadow: '0 0 20px rgba(255,213,64,0.15)' }}
>
  Hablar con un experto
</a>
```

### Secundario (glass outline)

```tsx
<a
  href="#"
  className={`inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-medium text-white no-underline transition-all duration-200 ${font}`}
  style={{
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
  }}
  onMouseEnter={e => {
    e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
  }}
  onMouseLeave={e => {
    e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
  }}
>
  Ver casos
</a>
```

### Tamaños de CTA

| Contexto     | Padding           | Font size  |
|--------------|-------------------|------------|
| Hero grande  | `px-8 py-3.5`     | `text-base`|
| Estándar     | `px-7 py-3.5`     | `text-sm`  |
| Sidebar/mini | `px-5 py-3`       | `text-sm`  |
| Inline pill  | `px-3 py-1.5`     | `text-xs`  |

---

## 8. BADGES / LABELS

### Amarillo brand (industry tag, eyebrow de sección)

```tsx
<span
  className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase ${font}`}
  style={{
    border: '1px solid rgba(255,213,64,0.25)',
    background: 'rgba(255,213,64,0.06)',
    color: '#ffd540',
  }}
>
  <span className="w-1.5 h-1.5 rounded-full bg-[#ffd540] animate-pulse" />
  Etiqueta
</span>
```

### Badge grande (heroes, pills de canal/producto)

Usar cuando el badge acompaña un H1 o necesita mejor legibilidad. `text-sm` = 14px.

```tsx
<span
  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium ${font}`}
  style={{
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.55)',
    background: 'rgba(255,255,255,0.06)',
  }}
>
  Badge
</span>
```

### Neutro (label de sección, category)

```tsx
<span
  className="inline-block px-3 py-1 rounded-full text-xs font-medium"
  style={{
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.5)',
  }}
>
  Label
</span>
```

---

## 9. CARDS

### Card oscura (stat, feature, métrica)

```tsx
<div
  className="flex flex-col p-5 md:p-6 rounded-2xl"
  style={{ border: '1px solid rgba(255,255,255,0.07)', backgroundColor: '#131415' }}
>
  <span className={`text-3xl md:text-4xl font-bold leading-none mb-2 ${font}`} style={{ color: '#ffd540' }}>
    98%
  </span>
  <span className="text-sm leading-snug" style={{ color: 'rgba(255,255,255,0.55)' }}>
    Descripción del KPI
  </span>
</div>
```

### Card con imagen de fondo (casos de éxito, industrias)

```tsx
function ImageCard({ img, hovered, setHovered }: ...) {
  return (
    <article
      className="relative overflow-hidden rounded-2xl min-h-[400px]"
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Imagen */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${img})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          transform: hovered ? 'scale(1.04)' : 'scale(1)',
          transition: 'transform 0.6s cubic-bezier(0.2,0.8,0.2,1)',
        }}
      />

      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: hovered
            ? 'linear-gradient(to top, rgba(12,12,13,0.97) 0%, rgba(12,12,13,0.7) 45%, rgba(12,12,13,0.15) 100%)'
            : 'linear-gradient(to top, rgba(12,12,13,0.95) 0%, rgba(12,12,13,0.55) 40%, rgba(12,12,13,0.08) 100%)',
          transition: 'background 0.5s ease',
        }}
      />

      {/* Contenido posicionado al fondo */}
      <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-7">
        {/* logo, métrica, descripción, link */}
      </div>
    </article>
  )
}
```

---

## 10. TESTIMONIAL / QUOTE

```tsx
<div
  className="rounded-2xl p-7 md:p-10"
  style={{
    border: '1px solid rgba(255,213,64,0.15)',
    background: 'linear-gradient(135deg, rgba(255,213,64,0.05) 0%, rgba(255,213,64,0.02) 100%)',
  }}
>
  {/* Comillas decorativas */}
  <svg className="mb-5 opacity-40" width="32" height="24" fill="#ffd540" aria-hidden="true">…</svg>

  <blockquote
    className={`text-lg md:text-xl font-medium leading-relaxed text-white mb-6 ${font}`}
    style={{ fontStyle: 'italic' }}
  >
    "El texto de la cita va aquí."
  </blockquote>

  <div className="flex items-center gap-4">
    {/* foto opcional */}
    {photo && (
      <img src={photo} alt={author} className="w-12 h-12 rounded-full object-cover"
           style={{ border: '2px solid rgba(255,213,64,0.3)' }} />
    )}
    <div>
      <p className={`text-sm font-semibold text-white ${font}`}>{author}</p>
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{role}</p>
    </div>
  </div>
</div>
```

---

## 11. LAYOUT DE PÁGINA DE DETALLE (2 columnas)

Patrón para páginas de caso de estudio, posts de blog, landing de producto:

```tsx
<section className="w-full py-14 md:py-20" style={{ backgroundColor: '#0C0C0D' }}>
  <div className="max-w-5xl mx-auto px-6 md:px-12">
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12 lg:gap-20">

      {/* Contenido principal */}
      <div>
        {/* Secciones de texto, imágenes, testimonial */}
      </div>

      {/* Sidebar sticky */}
      <aside className="hidden lg:block">
        <div className="sticky top-28 space-y-4">
          {/* KPIs, CTA secundario */}
        </div>
      </aside>

    </div>
  </div>
</section>
```

---

## 12. GRILLA DE TARJETAS — LAYOUT MAGAZINE

Para secciones de listing (casos, productos, blog):

```tsx
{/* Primera fila: featured 3/5 + secundaria 2/5 */}
<div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
  <div className="md:col-span-3"><Card featured /></div>
  <div className="md:col-span-2"><Card featured /></div>
</div>

{/* Resto: 3 columnas */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>
```

---

## 13. DIVISORES Y SEPARADORES

```tsx
{/* Línea horizontal sutil */}
<div className="h-px w-full" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />

{/* Divisor de columnas en stats */}
style={i < lastIndex ? { borderRight: '1px solid rgba(255,255,255,0.1)' } : {}}

{/* Border-top de sección */}
style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
```

---

## 14. SECCIÓN LABEL (eyebrow antes de un H2)

```tsx
<span
  className={`inline-block text-xs font-semibold uppercase tracking-widest mb-4 ${font}`}
  style={{ color: '#ffd540' }}
>
  Historia completa
</span>
```

---

## 15. ICONOS

Siempre desde `@tabler/icons-react`:

```tsx
import { IconArrowRight, IconChevronDown } from '@tabler/icons-react'

<IconArrowRight size={20} stroke={1.5} />
<IconChevronDown size={16} stroke={1.5} className="text-white/50" />
```

Tamaños usados: `12`, `14`, `16`, `20`, `22`, `24` px.

> **Emojis prohibidos.** No usar emojis en ningún componente, página ni texto de la interfaz. Reemplazar siempre por íconos de `@tabler/icons-react`.

---

## 16. ESTRUCTURA DE ARCHIVOS

```
app/(marketing)/
├── _sections/              # Secciones compartidas del home
│   ├── Hero.tsx
│   ├── CtaFinal.tsx        ← reutilizar en todas las landings como cierre
│   └── …
├── <ruta>/
│   ├── page.tsx            # Server Component: metadata + composición
│   └── _sections/          # Secciones exclusivas de esta ruta
│       └── MiSeccion.tsx   # 'use client' si tiene animaciones/interactividad

components/
├── layout/                 # Navbar, Footer (presentes en todas las páginas)
└── shared/                 # Secciones usadas en 2+ páginas (CasosDeExito, FAQ)

lib/constants/              # Datos estáticos (cases.ts, marketingRoutes.ts, etc.)
```

**Regla de composición:** `page.tsx` es server component y solo importa y compone secciones. Las secciones son client components cuando necesitan estado, animaciones o eventos del browser.

---

## 17. REGLAS ESTRICTAS

1. **Dark mode only.** Fondo es siempre `#0C0C0D`. Nunca fondos claros.
2. **Outfit para headings.** Siempre usar la constante `const font = 'font-[family-name:var(--font-outfit)]'`.
3. **Acento `#FFD540` solo para CTAs y métricas.** No en párrafos largos.
4. **Animaciones de entrada obligatorias** en todas las secciones de scroll (Pattern B).
5. **Botones siempre `rounded-full`.** No `rounded-lg` ni `rounded-xl` en botones.
6. **Cards con imagen usan hover scale** en el `div` de imagen (no en el `article` raíz).
7. **`CtaFinal` al final de toda landing.** Importar desde `@/app/(marketing)/_sections/CtaFinal`.
8. **Responsive mobile-first.** Base = mobile, `md:` y `lg:` expanden. Ver `ARCHITECTURE.md`.
9. **Links internos con `href="/ruta"`.** Links externos con `target="_blank" rel="noopener noreferrer"`.
10. **Datos centralizados en `lib/constants/`.** No hardcodear arrays grandes en componentes.

---

## 18. TOKENS TAILWIND EXTENDIDOS (globals.css / @theme)

Para referencia de lo que está disponible como clases Tailwind:

```
Colores brand:    bg-brand, text-brand, hover:bg-brand-hover, active:bg-brand-active
Neutros:          bg-neutral-900 (#0C0C0D), bg-neutral-800 (#131415)
Semánticos:       text-success (#52CE5E), text-error (#FF4040), text-warning (#F5B942)
Sombras:          shadow-glow (0 0 20px rgba(255,213,64,0.28))
```

Clases utilitarias globales en `globals.css`:
- `.hero-in` / `.hero-in.on` — animación de entrada para heroes
- `.ds-focus` — focus ring amarillo para a11y
- `.ds-btn` — transiciones estándar para botones
- `.ds-surface` — card oscura con borde y sombra
- `.glass-panel` / `.glass-panel-hover` — glassmorphism

---

**Version:** 2.0
**Actualizado:** Abril 2026
