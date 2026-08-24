# Cancha de noche — Design Spec

> Plan: [`docs/superpowers/plans/2026-08-23-cancha-de-noche.md`](../plans/2026-08-23-cancha-de-noche.md)
> Fecha: 2026-08-23
> Producto: **LigaLab**
> Estado: **Spec aprobada · plan listo**

---

## 1. Objetivo

Que la web se sienta diseñada por una agencia, no como un admin genérico con rojo Kelme. La tesis visual es **cancha húmeda bajo reflectores**: fondo verde-negro, el color de cada liga es luz (no relleno), y el live es el padre visual de todos los paneles.

No se cambian flujos, APIs ni el modelo de datos. Solo identidad, tokens, shells y las 4 superficies que más se ven.

---

## 2. Decisiones

| Tema | Elección | Por qué |
|------|----------|---------|
| Alcance de superficies | Todos los paneles web: landing, auth, admin, DT, jugador, árbitro, live, plataforma | El usuario eligió C |
| App Expo | Fuera | Mismo contrato de API; otro shell nativo |
| Personalidad | Cancha de noche | Oscuro, denso, live como eje |
| Color de liga | La liga pinta la noche: fondo negro-césped fijo, acento = `--org-primary` | Multi-tenant sin romper Kelme / Le Park / Los Lunes |
| Cómo se entrega | Sistema + cascarones; segundo pase en dashboard admin, partidos, live y login | Calidad de agencia sin reescribir 80 páginas |
| Wizards campo a campo | No se redibujan uno a uno | Heredan tokens (`btn-kelme`, `input-kelme`, `card-kelme`) |
| Features nuevas | Ninguna | Solo look & feel |

### Alternativas descartadas

1. **Solo público, o público + admin.** El usuario quiso todos los paneles web.
2. **Club privado (claro, editorial) u operación de liga (tablero claro).** El usuario eligió noche.
3. **LigaLab manda (acento chico) o dos capas marketing/liga.** El usuario eligió que la org pinte el acento en toda la noche.
4. **Pantalla por pantalla o design system lento.** Demasiado tiempo o look a medias.

---

## 3. Alcance

### Incluido

- Tokens CSS en `src/app/globals.css` y mapeo Tailwind `@theme`.
- Fuentes: Oswald (display), Manrope (UI), IBM Plex Mono (datos) en `src/lib/fonts.ts`.
- Redefinir utilidades existentes: `btn-kelme`, `btn-kelme-outline`, `input-kelme`, `card-kelme`, `table-kelme`, `link-nav`, `link-nav-active`, `live-pulse`.
- Shells: `DashboardAppShell`, `DashboardShell` (kelme), `PlatformShell`, `MarketingShell`.
- Redibujo de: `ProductLanding`, login, registro, picker `/organizaciones`, live (marcador + barra de contexto), `AdminDashboardHome` / `AdminDashboardPanels` / skeleton.
- `--org-primary` lo setea el shell del tenant; plataforma usa ember LigaLab `#C91F26`.
- Motion mínima + `prefers-reduced-motion`.
- Contraste flood/night, foco de teclado, layout usable en móvil.

### Excluido

- App Expo (`apps/mobile`).
- Reescribir wizards, tablas internas o forms campo a campo.
- Cambiar copy de producto salvo headlines de landing/login que hoy suenan a plantilla.
- Nuevas features, APIs, Prisma, o cambiar el rojo de Kelme en datos (sigue siendo su `--org-primary`).
- Modo claro / toggle de tema.

---

## 4. Identidad

### Material

No es “SaaS negro + botón rojo”. Es césped de noche: el fondo tira a verde, el texto a blanco de reflector, los bordes a cal de cancha.

### Paleta (hex fijos)

| Token | Hex | Uso |
|-------|-----|-----|
| `night` | `#0B1210` | Fondo de página |
| `turf` | `#121A18` | Cards, sidebar, header |
| `line` | `#2A3A32` | Bordes, divisores |
| `flood` | `#E8E4D8` | Texto principal |
| `mist` | `#8A938C` | Texto secundario, captions |
| `ember` | `--org-primary` | Acento; default / plataforma / fallback Kelme `#C91F26` |

Aliases legacy (`--kelme-red`, `--background`, `--foreground`, `--surface`, `--border`, grises) **apuntan a estos tokens** para no romper clases sueltas `bg-[#f5f5f7]` de un día para otro. Donde haya hex hardcodeados en shells y landing, se reemplazan por tokens o clases semánticas.

**Qué no usamos:** cream `#F4F1EA` + serif, verde ácido, layout de diario, rojo como fondo de pantalla.

### Tipo

| Rol | Familia | Dónde |
|-----|---------|--------|
| Display | Oswald 500–700 | Títulos, marca, números de hero |
| UI | Manrope 400–700 | Nav, botones, body de panel |
| Datos | IBM Plex Mono 400–600 | Marcador, hora, KPIs, celdas numéricas |

Montserrat, Poppins y Roboto se eliminan de `fonts.ts` y del `layout` raíz.

### Firma

Barra de reflector: 2px, color `--org-primary`, bajo el header de cada shell y como riel del live. El live pulsa en ámbar cálido (`#D4A04A`) o en `ember` al 60% de opacidad — no un blink rojo genérico.

---

## 5. Cascarones

### Marketing (`MarketingShell` + landing + ayuda)

- Fondo `night`. Header `turf` + barra de reflector (ember LigaLab en marketing público).
- Hero: una tesis en Oswald (partido, marcador o cifra), no “gestiona tu liga”.
- CTA primario = `btn-kelme` (ember). Secundario = outline sobre `line`.

### Auth (login, registro, `/organizaciones`)

- Card `turf` centrada, borde `line`, un eje vertical.
- Inputs noche: fondo `night`, borde `line`, texto `flood`, focus anillo `ember`.
- Sin card blanca sobre gris `#f5f5f7`.

### Paneles (admin, DT, jugador, plataforma)

- `DashboardAppShell` / `DashboardShell` / `PlatformShell`: sidebar `turf`, main `night`, header sticky con barra de reflector.
- Nav activa: texto `flood` + raya `ember`, no underline rojo sobre gris.
- Avatar / mark: fondo `ember`, texto `flood`.
- Tablas: thead `mist` uppercase tracking, filas hover `line` al 40%.

### Árbitro

- Mismos tokens. Hit targets ≥ 44px en acciones de partido.
- `MatchControlPanel`: bloque de marcador (Plex Mono) arriba; eventos abajo. No se ve como form de admin.

### Live

- Referente visual del sistema. Marcador Plex Mono a escala tribuna, cronómetro, eventos en cronología.
- Barra de contexto (`LiveMatchContextBar`) usa la barra de reflector y nombres en Oswald.

### Segundo pase (mismo PR o el inmediato siguiente, no un tercer sistema)

1. Dashboard admin (KPIs + próximos + standings por categoría).
2. Lista / acciones de partidos.
3. Live (marcador + timeline).
4. Login.

---

## 6. Tokens e implementación

### `globals.css`

```
--night, --turf, --line, --flood, --mist, --org-primary
--background = night
--foreground = flood
--surface = turf
--border = line
```

Clases `.btn-kelme`, `.input-kelme`, `.card-kelme`, `.table-kelme` se reescriben contra estos tokens. `body` usa Manrope.

### Color de org

El layout tenant ya puede setear `--org-primary`. Si no existe, el shell lo setea en el wrapper (`style={{ ['--org-primary']: orgColor }}`) con fallback `#C91F26`. Plataforma no lee org: ember fijo `#C91F26`.

### Motion

- Hover de fila / botón: 120–160ms ease.
- `live-pulse`: opacidad 1 ↔ 0.55, 1.6s.
- `@media (prefers-reduced-motion: reduce)`: pulso y transiciones apagados.

### Accesibilidad

- Contraste flood sobre night ≥ 4.5:1; mist solo en captions.
- Focus visible: outline 2px `ember`.
- Sidebar móvil: el menú hamburguesa actual se mantiene, con colores noche.

### Fuera de código de producto

No hay cambio de Prisma, rutas ni contratos móviles.

---

## 7. Criterio de listo

- Landing, login, `/organizaciones`, un panel admin, un panel no-admin (jugador o DT), árbitro o live, y plataforma se ven noche + acento de org.
- No queda fondo `#f5f5f7` / texto `#17171a` en esos shells.
- Un tenant con otro `--org-primary` pinta botón, nav activa y barra de reflector, no el fondo.
- `prefers-reduced-motion` no pulsa el live.
- Flujos existentes (crear temporada, partido, live) siguen iguales.

---

## 8. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Hex sueltos en componentes internos | Tokens + utilidades; segundo pase solo en 4 superficies |
| Contraste de `mist` | No usar mist para texto de acción o labels de form |
| `--org-primary` claro (blanco) sobre night | Si el color de org es luminoso, el botón usa texto `night`; si es oscuro, texto `flood` |
| Live ya tiene tokens `--kelme-live-*` | Unificar a `night` / `turf`; no mantener un tercer tema |
