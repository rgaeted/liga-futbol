# KELME — Guía de diseño para Liga Fútbol

> Fuente de referencia: [kelme.cl](https://kelme.cl/) (tienda oficial Chile) + identidad global KELME®  
> Estado: **Aprobado** — Nombre oficial: **Torneos Kelme**

---

## 1. Contexto de marca

**KELME®** es una marca deportiva española con fuerte presencia en fútbol y fútbol sala. En Chile opera tienda oficial en [kelme.cl](https://kelme.cl/), con indumentaria para clubes, escuelas y ligas.

La liga debe sentirse como **producto oficial / plataforma de competición KELME**, no como app genérica ni como MODO CRACK (gaming/neon).

**Personalidad:** profesional, deportiva, limpia, confiable, orientada a competición.

---

## 2. Logo

| Elemento | Descripción |
|----------|-------------|
| Isotipo | Silueta abstracta del lince/gato (marca registrada KELME) — **siempre en negro** sobre fondos claros, o **blanco** sobre fondos rojos/oscuros |
| Logotipo | Palabra **KELME** en mayúsculas, sans-serif bold, tracking moderado |
| Uso en app | Header + login + favicon/PWA. **No distorsionar, no recolorear el isotipo** |

> ⚠️ Usar assets oficiales provistos por KELME Chile o extraídos de materiales autorizados. No redibujar el logo para producción.

**Referencia SVG pública:** [Wikipedia — Kelme Logo](https://commons.wikimedia.org/wiki/File:Kelme_Logo.svg)

---

## 3. Paleta de colores (extraída de kelme.cl)

Tokens detectados en CSS del sitio chileno (`elementor` globals + homepage):

| Token | Hex | Uso en la liga |
|-------|-----|----------------|
| **Kelme Red** | `#CD212A` | Primary — CTAs, links activos, badge EN VIVO, acentos |
| **Kelme Red Dark** | `#A7144C` | Hover, bordes activos, gradientes |
| **Kelme Red Bright** | `#FF1E00` / `#FF1700` | Alertas, goles, highlights en marcador |
| **White** | `#FFFFFF` | Fondos de cards, texto sobre rojo |
| **Black** | `#000000` | Logo, títulos fuertes, navbar alternativa |
| **Gray 900** | `#3D3D3D` | Texto principal |
| **Gray 600** | `#4E4E4E` / `#54595F` | Texto secundario |
| **Gray 400** | `#7A7A7A` | Labels, metadata |
| **Gray 100** | `#F5F5F5` | Fondo de página (modo claro) |
| **Kelme Green** | `#008C45` | Stats positivas, confirmaciones, futsal |
| **Border** | `#E5E5E5` / `#CCCCCC` | Separadores, inputs |

### Modo oscuro (marcador en vivo / árbitro en cancha)

Para pantallas de partido en vivo y panel del árbitro, conviene un **dark sport** derivado de KELME:

| Token | Hex | Uso |
|-------|-----|-----|
| Background | `#0D0D0D` | Fondo general |
| Surface | `#1A1A1A` | Cards, panel árbitro |
| Surface elevated | `#252525` | Inputs, botones secundarios |
| Text | `#FFFFFF` | Marcador, nombres |
| Muted | `#707070` | Minuto, metadata |
| Live accent | `#CD212A` | EN VIVO, goles |

---

## 4. Tipografía (kelme.cl)

Fuentes cargadas en el sitio oficial:

| Fuente | Rol en la liga |
|--------|----------------|
| **Montserrat** (600–800) | Títulos, logo text, headings de sección |
| **Poppins** (400–600) | UI, botones, navegación |
| **Roboto** (400–500) | Cuerpo, tablas, formularios |

```html
<!-- Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500&display=swap" rel="stylesheet" />
```

**Jerarquía sugerida:**
- H1: Montserrat 800, uppercase opcional en hero/login
- H2–H3: Montserrat 700
- Body / forms: Roboto 400
- Nav / buttons: Poppins 600

---

## 5. Componentes UI — reglas

### Botones

| Tipo | Estilo |
|------|--------|
| Primary | Fondo `#CD212A`, texto blanco, radius 8px, hover `#A7144C` |
| Secondary | Borde `#CD212A`, fondo transparente, texto `#CD212A` |
| Ghost | Borde `#E5E5E5`, texto `#3D3D3D` |
| Danger | `#FF1E00` (solo acciones destructivas) |

### Navegación

- Header blanco, borde inferior `#E5E5E5`
- Logo KELME izquierda + “Liga” o nombre del torneo
- Link activo: texto `#CD212A` + subrayado 2px
- Link inactivo: `#54595F`

### Cards / tablas

- Fondo blanco, borde `#E5E5E5`, radius 12px
- Sin sombras pesadas — estilo e-commerce limpio como kelme.cl
- Hover sutil: borde `#CD212A33`

### Marcador en vivo

- Fondo dark `#0D0D0D`
- Score: Montserrat 800, tamaño grande, blanco
- Badge “EN VIVO”: fondo `#CD212A`, pulse animation
- Goles en cronología: acento `#CD212A`

### Panel árbitro (mobile-first)

- Botones grandes táctiles
- Gol / tarjeta amarilla / roja mantienen colores semánticos FIFA
- Header con logo KELME pequeño + nombre del partido

---

## 6. CSS variables propuestas

```css
:root {
  /* Brand */
  --kelme-red: #CD212A;
  --kelme-red-dark: #A7144C;
  --kelme-red-bright: #FF1E00;
  --kelme-green: #008C45;
  --kelme-black: #000000;
  --kelme-white: #FFFFFF;

  /* Neutrals */
  --gray-900: #3D3D3D;
  --gray-600: #54595F;
  --gray-400: #7A7A7A;
  --gray-100: #F5F5F5;
  --border: #E5E5E5;

  /* Typography */
  --font-display: 'Montserrat', sans-serif;
  --font-ui: 'Poppins', sans-serif;
  --font-body: 'Roboto', sans-serif;

  /* Layout */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
}

[data-theme="dark"] {
  --background: #0D0D0D;
  --surface: #1A1A1A;
  --foreground: #FFFFFF;
  --muted: #707070;
}
```

---

## 7. Pantallas clave — wireframe de intención

### Login
- Fondo blanco o foto de cancha con overlay blanco
- Logo KELME centrado
- Subtítulo: “Liga Oficial” / nombre del torneo
- Botón “Ingresar” rojo KELME

### Dashboard jugador
- Header blanco con logo
- Stats en cards blancas con número en rojo KELME
- Partidos próximos con badge de estado

### Admin
- Misma shell — no cambiar identidad por rol
- Tablas estilo e-commerce (como listado de productos en kelme.cl)

### Live `/live/[matchId]`
- Dark mode KELME
- Marcador protagonista
- Logo KELME discreto en footer

---

## 8. PWA / Mobile

- `theme_color`: `#CD212A`
- `background_color`: `#FFFFFF`
- Ícono: isotipo KELME oficial sobre rojo o blanco
- Nombre app: **KELME Liga** (confirmar con marca)

---

## 9. Diferencias vs diseño actual (liga-futbol)

| Actual | Propuesto KELME |
|--------|-----------------|
| `slate-950` dark everywhere | Blanco en app general, dark solo en vivo/árbitro |
| `emerald-600` accent | `#CD212A` red |
| Geist font | Montserrat + Poppins + Roboto |
| “Liga Fútbol” genérico | KELME® + nombre del torneo |
| Placeholder icon | Logo oficial |

---

## 10. Implementación sugerida (cuando apruebes)

1. Crear `src/styles/kelme.css` con CSS variables
2. Actualizar `layout.tsx` — fuentes Google
3. Componente `<KelmeLogo />` + `<AppShell />` compartido
4. Refactor login + layouts admin/player/coach/referee
5. Live scoreboard + referee panel en dark theme
6. `manifest.json` + favicon con assets KELME
7. Seed: renombrar “Equipo Marca FC” → club con indumentaria KELME

---

## 11. Pendiente de confirmación

- [ ] Nombre oficial del torneo (ej. “Liga KELME 2026”, “Copa KELME”)
- [ ] Assets oficiales del logo (PNG/SVG alta resolución)
- [ ] ¿La liga es solo fútbol 11, futsal, o ambos?
- [ ] ¿Modo claro en toda la app o dark por defecto?
