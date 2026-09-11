# LigaLab · Especificación de Cartas y Stats de Jugador
### Documento de implementación para "Fútbol de los Lunes" (ligalab.cl/loslunes)

> **Para la IA/dev que implementa:** este documento define un sistema de cartas
> tipo FIFA cuyos atributos se derivan de datos reales que la app **ya captura**
> (goles, asistencias, presencias). El principio rector de todo el producto es:
> **"Stats reales, cero humo — la carta se gana en la cancha, nunca se compra."**
> Ninguna acción dentro de la app debe poder subir un atributo. Solo el
> rendimiento real registrado en partidos oficiales lo hace.

---

## 0. Contexto del producto (leer antes de codear)

LigaLab es una plataforma de gestión de ligas de fútbol amateur. "Fútbol de los
Lunes" es una instancia real en producción (`ligalab.cl/loslunes`): un grupo de
amistosos semanales Blancos vs Negros, activo desde 2014, en cancha Nueva Braunau.

La app **ya tiene** y expone:
- Partidos con marcador, formaciones (ej. 4-3-3 / 4-4-2), local/visita.
- Fotos de jugadores en `GET /api/players/{playerId}/photo`.
- Escudos de equipo en `GET /api/matches/{matchId}/crest/{A|B}`.
- Rankings de **últimos 30 días**: goleadores, asistencias, goles por partido,
  asistencias por partido.
- Racha "Últimos 5" por equipo.
- "Premios del camarín" (asignación editorial: Patrimonio Histórico, Highlander,
  Mourinho de Temu, Siete Pulmones, Compromiso Total, Trayectoria).

Lo que **falta** y define este documento: convertir esos datos crudos en una
**carta de identidad por jugador** con atributos 0-99 y un OVR, que evolucione
semana a semana.

---

## 1. Modelo de atributos

Seis atributos visibles, escala 0-99. Se agrupan en dos clases según su origen:

| Atributo | Nombre | Clase | Fuente |
|----------|--------|-------|--------|
| **TIR** | Definición | Derivado | Goles por partido + tasa de conversión |
| **VIS** | Visión | Derivado | Asistencias por partido |
| **RES** | Resistencia | Derivado | % de presencia (constancia) |
| **REG** | Regate | Semilla + ajuste | Base del capitán, sube con hitos |
| **RIT** | Ritmo | Semilla + ajuste | Base del capitán, sube con hitos |
| **FÍS** | Físico | Semilla + ajuste | Base del capitán, sube con hitos |

**Derivados**: se recalculan 100% desde datos objetivos en cada ventana.
**Semilla + ajuste**: no hay dato objetivo que los mida hoy, así que arrancan de
un valor base (autoevaluación del capitán o media de la liga = 65) y se mueven
con bonificaciones por hitos (ver §4). Nunca editables por el propio jugador.

> Decisión abierta: si a futuro se integran wearables (STATSports, Playermaker),
> RIT y FÍS pasan a clase Derivado usando velocidad máx. y distancia real.

---

## 2. Ventana de cálculo

- **Ventana móvil de 30 días** (ya usada por los rankings actuales). Todos los
  atributos derivados se calculan sobre los partidos dentro de la ventana.
- Recalcular **una vez por fecha jugada** (cada lunes tras cerrar la planilla).
- La carta muestra la fecha del último recálculo: "actualizada tras la Fecha N".
- Esto crea el bucle de enganche: **si la rompiste el lunes, tu carta sube; si
  desapareciste un mes, baja.**

**Regla de mínimo de muestra:** un jugador necesita ≥ `MIN_PJ` (sugerido 2)
partidos en la ventana para tener atributos derivados calculados. Con menos,
mostrar la carta en estado "En formación" con los valores semilla y un badge
"Faltan N partidos para tu primera carta completa".

---

## 3. Fórmulas de atributos derivados

Todas las fórmulas normalizan **contra la propia liga** (percentil relativo), no
contra valores absolutos arbitrarios. Esto hace la carta justa para cualquier
nivel de liga: ser top en Los Lunes da 90, sin importar si esos números serían
otros en otra liga.

### 3.1 Función de normalización base

```
// Convierte un valor crudo del jugador en un atributo 0-99,
// posicionándolo dentro del rango real de la liga en la ventana.
//
// valor      : métrica del jugador (ej. goles/PJ)
// p10, p90   : percentil 10 y 90 de esa métrica entre TODOS los
//              jugadores de la liga con >= MIN_PJ en la ventana
// piso, techo: rango de salida (por defecto 40 y 99)

function normalizar(valor, p10, p90, piso = 40, techo = 99) {
  if (p90 <= p10) return Math.round((piso + techo) / 2); // liga homogénea
  const t = (valor - p10) / (p90 - p10);          // 0..1 aprox
  const clamped = Math.max(0, Math.min(1, t));
  return Math.round(piso + clamped * (techo - piso));
}
```

> Usar percentiles (p10/p90) y no min/max evita que un solo crack o un novato
> distorsionen toda la escala. Recalcular p10/p90 por liga y por ventana.

### 3.2 TIR — Definición

```
// Combina volumen (goles/PJ) con eficiencia (conversión de remates).
// Si NO hay dato de remates en la app todavía, usar solo golesPorPartido
// (pesoConversion = 0) y subirlo cuando exista el registro de remates.

golesPorPartido = golesEnVentana / pjEnVentana
conversion      = golesEnVentana / max(1, remquesEnVentana)   // opcional

tirVolumen   = normalizar(golesPorPartido, p10_gpp, p90_gpp)
tirEficiencia= normalizar(conversion,      p10_conv, p90_conv) // opcional

pesoConversion = 0.30   // 0 si no hay datos de remates
TIR = round( tirVolumen * (1 - pesoConversion) + tirEficiencia * pesoConversion )
```

Ejemplo real (Opitz): 2,3 gol/PJ, top de la liga → **TIR ≈ 88**.

### 3.3 VIS — Visión

```
asistPorPartido = asistenciasEnVentana / pjEnVentana
VIS = normalizar(asistPorPartido, p10_app, p90_app)
```

Ejemplo (Opitz): 1,7 asist/PJ → **VIS ≈ 82**.

### 3.4 RES — Resistencia (el atributo insignia)

```
// Premia la CONSTANCIA: aparecer todos los lunes. Es el valor central
// del fútbol amateur y lo que ningún videojuego mide.
//
// fechasPosibles = fechas jugadas por la liga en la ventana
// presencias     = fechas en que el jugador estuvo en cancha

tasaPresencia = presencias / max(1, fechasPosibles)   // 0..1
// Mapeo directo, no percentil: la constancia es un valor absoluto.
RES = round(50 + tasaPresencia * 49)                  // 50..99
```

Ejemplo (Opitz, casi no falta): → **RES ≈ 90**.

> No usar percentil aquí a propósito: si toda la liga es constante, todos
> merecen RES alto. La constancia no es competencia, es virtud.

### 3.5 OVR — General

```
// Ponderación por posición. La posición sale de la formación registrada
// o del rol declarado. Los pesos suman 1 dentro de cada fila.

PESOS = {
  DEL: { TIR:0.34, VIS:0.16, RES:0.16, REG:0.14, RIT:0.12, FIS:0.08 },
  MED: { TIR:0.18, VIS:0.30, RES:0.16, REG:0.16, RIT:0.12, FIS:0.08 },
  DEF: { TIR:0.08, VIS:0.16, RES:0.22, REG:0.14, RIT:0.16, FIS:0.24 },
  POR: { TIR:0.04, VIS:0.12, RES:0.28, REG:0.10, RIT:0.10, FIS:0.36 },
}

OVR = round( Σ atributo[k] * PESOS[posicion][k] )
```

> Un delantero vive de TIR; un defensa, de RES/FÍS. Así el OVR no castiga al
> defensa por no meter goles. **Nunca** un ranking global de OVR entre posiciones
> distintas como "el mejor"; comparar solo dentro de la misma posición.

---

## 4. Atributos semilla + ajuste (REG, RIT, FÍS)

```
BASE_LIGA = 65   // media neutra al inscribirse

// 1) Semilla: el capitán/organizador puede fijar una base 50-80 al alta
//    del jugador (o queda en BASE_LIGA). Es la ÚNICA entrada humana y NO
//    la hace el propio jugador.
semilla = capitanBase ?? BASE_LIGA

// 2) Ajuste por hitos acumulados en la ventana (datos objetivos):
bonus = 0
bonus += mvpsEnVentana * 2         // ser MVP sube un poco todo
bonus += (rachaGoleadora >= 3 ? 3 : 0)
bonus += (rachaPresencia >= 5 ? 2 : 0)
bonus -= tarjetasRojasEnVentana * 3

// 3) Resultado, siempre acotado
REG = clamp(semilla + bonus + jitterPorAtributo.REG, 40, 95)
RIT = clamp(semilla + bonus + jitterPorAtributo.RIT, 40, 95)
FIS = clamp(semilla + bonus + jitterPorAtributo.FIS, 40, 95)
// jitterPorAtributo: pequeño offset fijo por jugador (-4..+4) derivado
// determinísticamente de su ID, para que las tres no sean idénticas.
```

> Techo 95 para semilla+ajuste (no 99): los atributos no medidos objetivamente
> nunca deben poder igualar la cima, que se reserva a lo demostrado en datos.

---

## 5. Datos que la carta necesita (contrato de datos)

Endpoint sugerido: `GET /api/players/{playerId}/card?ligaId=loslunes`

```jsonc
{
  "player": {
    "id": "cm92624634c9f14665bb0cc5c",
    "nombre": "Fernando Opitz",
    "nombreCorto": "F. Opitz",
    "posicion": "DEL",              // DEL|MED|DEF|POR
    "equipo": "Blancos",
    "fotoUrl": "/api/players/cm92.../photo",
    "escudoUrl": "/branding/loslunes-logo.png",
    "premio": "Patrimonio Histórico" // opcional, del sistema de premios
  },
  "ventana": { "dias": 30, "desde": "2026-08-08", "hasta": "2026-09-07",
               "fechasPosibles": 5, "pj": 3, "ultimaFecha": 12 },
  "crudos": {
    "goles": 7, "asistencias": 5, "remates": null,
    "presencias": 3, "mvps": 2, "amarillas": 1, "rojas": 0,
    "rachaGoleadora": 3, "rachaPresencia": 5
  },
  "atributos": { "TIR":88, "VIS":82, "RES":90, "REG":74, "RIT":79, "FIS":71 },
  "ovr": 86,
  "estado": "completa"             // completa | en_formacion
}
```

El backend calcula `atributos` y `ovr` con §3–§4; el front solo pinta.
Guardar snapshot histórico de la carta por fecha (para §7, evolución).

---

## 6. Especificación visual de la carta

Referencia de maqueta entregada: **`carta-loslunes.html`** (abrir junto a este
doc; es la fuente de verdad del diseño). Resumen de tokens y estructura:

- **Marco**: dorado con `conic-gradient` (oro-2 → oro → #FFF3D0 → oro → oro-2),
  radio 22px, sombra profunda. El dorado = "lo ganado", nunca decorativo.
- **Fondo interior**: degradado verde noche (#14241D → #0A130F) + textura de
  líneas diagonales sutiles + una franja de brillo diagonal.
- **Paleta** (alineada con tokens.css del proyecto):
  - noche `#0B1210`, panel `#12211B`, borde `#22382E`
  - hielo `#EDF2EE`, hielo-suave `#8BA598`
  - oro `#E8C878` / oro-2 `#C79A3E` (OVR, marco, premio)
  - verde "on fire" `#3DE68C` / `#1FA968` (barras, atributos destacados) —
    **es el verde que la app ya usa en "Los que están on fire"**
- **Tipografía**: Anton (display: OVR, nombre, cifras) + Barlow Condensed (texto).
- **Layout de la carta** (de arriba a abajo):
  1. Fila superior: OVR grande + posición (izq), escudo + equipo (der).
  2. Foto del jugador con halo verde detrás; fallback a iniciales en círculo.
  3. Nombre corto + tag de premio del camarín (si tiene).
  4. Línea divisoria dorada.
  5. Grid 2 columnas de 6 atributos: valor + label + barra de progreso.
     Atributos por encima de umbral (ej. ≥85) se pintan en verde "on fire".
  6. Pie: 3 cifras crudas de respaldo (Goles 30d, Asist 30d, Gol/PJ).
  7. Firma "Fútbol de los Lunes · LigaLab".
- **Estado "en_formacion"**: carta en escala de grises parcial, atributos
  derivados con "–", badge "Faltan N partidos para tu carta completa".

**Anti-tics de IA (obligatorio):** sin Inter/system-ui, sin violeta genérico,
sin emojis como iconos (usar SVG monolínea o los premios reales), copy con voz
de camarín. Ver notas de uso en `tokens.css`.

---

## 7. Roadmap de implementación (orden sugerido)

1. **Motor de cálculo** (§3–§4) como función pura `calcularCarta(crudos, ventana,
   percentilesLiga, semilla)` con tests sobre los datos reales de Opitz y otros
   de la tabla actual (Reyes, Vargas, Lagos, Espinoza).
2. **Percentiles de liga**: job que calcula p10/p90 por métrica y por ventana.
3. **Endpoint** `/api/players/{id}/card` (§5).
4. **Ruta y vista** `/loslunes/jugador/{id}` renderizando `carta-loslunes.html`.
5. **Botón "Compartir carta"**: exportar la carta como imagen (canvas/OG image)
   para WhatsApp. **Este es el motor de crecimiento**: cuando un jugador comparte
   su carta en el grupo, los demás quieren la suya. Priorizar temprano.
6. **Snapshot histórico** por fecha → habilita la vista de evolución (siguiente
   documento).
7. **Enganchar premios automáticos**: "Goleador del mes" y similares dejan de
   asignarse a mano y salen del motor.

---

## 8. Extensiones ya diseñadas (documentar aparte cuando se aborden)

- **Evolución semanal**: gráfico de OVR y atributos en el tiempo usando los
  snapshots de §7. "Tu carta subió +3 esta semana."
- **Duelo de nóminas**: sumar OVR de cada formación (Blancos vs Negros) y
  mostrarlo en la previa del partido. "Los Negros llegan 8 puntos arriba."
- **Informe Pro** (producto pago, adultos): PDF de temporada con radar,
  percentiles y evolución. Ver `informe-pro.html` como maqueta.
- **Ficha de Proyección** (15-18 años, con consentimiento parental): datos
  certificados por la liga para scouting. **Jamás** en módulo formativo <15.

---

## 9. Reglas innegociables (no romper nunca)

1. Ningún atributo sube por acciones dentro de la app. Solo rendimiento real.
2. RES (constancia) se premia siempre; nunca se penaliza a la liga por ser pareja.
3. No comparar OVR entre posiciones distintas como ranking de "el mejor".
4. Atributos semilla (REG/RIT/FÍS) tienen techo 95; los derivados llegan a 99.
5. La foto real manda; el fallback ilustrado nunca es una silueta gris genérica.
6. Voz de marca: "stats reales, cero humo". El dato antes que el adjetivo.
7. En módulo formativo infantil (<15) **no aplica este sistema**: ahí no hay OVR
   ni comparación entre niños (ver modelo-gamificacion.md).

---
*Maquetas de referencia entregadas junto a este documento:*
- `carta-loslunes.html` — la carta individual (fuente de verdad del diseño)
- `informe-pro.html` — el Informe Pro de temporada (producto pago futuro)
- `tokens.css` — sistema de diseño y anti-tics de IA
