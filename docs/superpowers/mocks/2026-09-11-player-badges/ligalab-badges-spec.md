# LigaLab · Sistema de Badges (Insignias)
### Documento de implementación · Fútbol de los Lunes

> **Principio rector (igual que las cartas):** las insignias se GANAN con hechos
> reales del partido, nunca se compran ni se otorgan por usar la app. Cada badge
> cuenta una historia que pasó en la cancha. Voz de camarín: pícara, cálida,
> nunca humillante.

---

## 0. Dos familias que NO se mezclan

La app ya tiene **Premios del Camarín** (Patrimonio Histórico, Mourinho de Temu,
Siete Pulmones…): son **títulos de temporada/vitalicios, de asignación editorial
o semi-manual**, sobre la *persona* y su rol en el grupo. Se conservan tal cual.

Este documento define los **BADGES**: reconocimientos **automáticos, event-driven**,
que se disparan solos al cerrar la planilla de un partido, sobre *lo que hiciste
esa noche*. Muchos, frecuentes, coleccionables. Un jugador puede acumular decenas.

| | Premios del Camarín (ya existen) | Badges (este doc) |
|---|---|---|
| Origen | Editorial / votación | Automático desde eventos del partido |
| Frecuencia | Pocos, temporada/vitalicio | Muchos, cada fecha |
| Sujeto | La persona | La actuación puntual |
| Ejemplo | "Highlander" | "Gol de última hora" |

---

## 1. Anatomía de un badge (contrato de datos)

```jsonc
{
  "id": "gol_ultima_hora",
  "nombre": "Gol de Última Hora",
  "descripcion": "Marcó el gol de la victoria en los minutos finales.",
  "familia": "clutch",          // ver §2
  "rareza": "epico",            // comun | raro | epico | legendario
  "icono": "reloj-gol",         // clave de SVG monolínea del set propio
  "repetible": true,            // ¿se puede ganar varias veces?
  "condicion": "gol del equipo que queda arriba, en el último X% del partido, y el marcador se mantiene",
  "xp": 50                      // opcional, si se usa nivel de jugador (§5)
}
```

Cuando un jugador lo gana se guarda una **instancia**:

```jsonc
{
  "badgeId": "gol_ultima_hora",
  "playerId": "cm92...",
  "matchId": "cmtq...",
  "fecha": "2026-09-07",
  "contexto": "Minuto 58' · Blancos 5-4 Negros",  // para mostrar la historia
  "veces": 1
}
```

---

## 2. Familias de badges

1. **Clutch** — momentos decisivos (goles tardíos, remontadas).
2. **Goleador** — volumen y tipos de gol.
3. **Creador** — asistencias y juego.
4. **Muralla** — defensa y arco (porteros, vallas invictas).
5. **Constancia** — presencia, rachas, aparecer siempre (¡el valor central!).
6. **Camarín** — lo social y lo pícaro (autogoles, fair play, rivalidad).
7. **Hitos** — acumulados de carrera (gol 50, partido 100).

---

## 3. EL SET INICIAL (listo para implementar)

> Umbrales entre `<>` = parámetros configurables por liga. Los valores dados son
> defaults pensados para Los Lunes (partidos ~50-60 min, marcadores altos).

### Familia CLUTCH
| id | Nombre | Rareza | Se gana cuando… |
|----|--------|--------|-----------------|
| `gol_ultima_hora` | **Gol de Última Hora** | épico | marca un gol en el último `<15%>` del tiempo y su equipo termina ganando por 1 |
| `heroe_remontada` | **Héroe de la Remontada** | legendario | anota o asiste yendo abajo `<2+>` goles, y el equipo da vuelta el partido |
| `mano_helada` | **Mano Helada** | raro | anota el gol que rompe un empate en el `<último cuarto>` |
| `doblete_express` | **Doblete Exprés** | épico | marca `<2>` goles en menos de `<10>` minutos entre uno y otro |
| `el_ultimo_en_rendirse`| **El Último en Rendirse** | raro | participa en un gol estando su equipo perdiendo por `<3+>` |

### Familia GOLEADOR
| id | Nombre | Rareza | Se gana cuando… |
|----|--------|--------|-----------------|
| `hat_trick` | **Hat-Trick** | épico | marca `<3>` goles en un partido |
| `poker` | **Póker** | legendario | marca `<4+>` goles en un partido |
| `abrio_la_lata` | **Abrió la Lata** | común | marca el primer gol del partido |
| `sentencio` | **Sentenció** | común | marca el gol que deja diferencia de `<3+>` |
| `de_todos_los_sabores`| **De Todos los Sabores** | raro | en la temporada marca de zurda, derecha y cabeza (requiere registrar tipo de gol) |
| `verdugo` | **Verdugo** | raro | le marca `<3+>` en una misma noche al equipo rival de siempre |

### Familia CREADOR
| id | Nombre | Rareza | Se gana cuando… |
|----|--------|--------|-----------------|
| `arquitecto` | **El Arquitecto** | épico | reparte `<3+>` asistencias en un partido |
| `sociedad` | **Sociedad Anónima** | raro | asiste `<3+>` veces al mismo goleador en una noche |
| `taco_de_oro` | **Taco de Oro** | raro | asistencia + gol en el mismo partido (doblete de participación) |
| `mano_a_mano` | **Bandeja de Plata** | común | registra su primera asistencia de la noche |

### Familia MURALLA
| id | Nombre | Rareza | Se gana cuando… |
|----|--------|--------|-----------------|
| `valla_invicta` | **Valla Invicta** | épico | (portero/equipo) termina el partido sin recibir goles |
| `muro` | **El Muro** | raro | (portero) gana un partido recibiendo `<1>` gol o menos |
| `salvador` | **San Portero** | raro | ataja un penal (requiere registrar penales) |
| `pichanga_limpia` | **Pichanga Limpia** | común | su equipo gana sin recibir en el `<primer tiempo>` |

### Familia CONSTANCIA (el corazón del producto)
| id | Nombre | Rareza | Se gana cuando… |
|----|--------|--------|-----------------|
| `nunca_falla` | **Nunca Falla** | épico | asiste a `<8>` lunes seguidos |
| `puntual` | **Puntual** | común | llega a `<4>` partidos seguidos |
| `todoterreno` | **Todoterreno** | raro | juega `<todas>` las fechas de un mes |
| `el_fundador` | **De la Vieja Escuela** | legendario | acumula `<100>` partidos en el club |
| `sin_excusas` | **Sin Excusas** | raro | juega bajo lluvia / frío extremo (marca manual del organizador) |

### Familia CAMARÍN (lo pícaro, con cariño)
| id | Nombre | Rareza | Se gana cuando… |
|----|--------|--------|-----------------|
| `en_contra` | **Cambio de Camiseta** | común | se marca un autogol (con humor, nunca humillante) |
| `caballero` | **Juego Limpio** | raro | temporada completa sin tarjetas |
| `tarjetero` | **Coleccionista de Amarillas** | común | junta `<3>` amarillas en la temporada (autoconsciente y simpático) |
| `el_show` | **Cara de la Fecha** | raro | fue MVP del partido |
| `bombero` | **Apaga Incendios** | común | entra de suplente y su equipo mejora el marcador |

### Familia HITOS (acumulados de carrera)
| id | Nombre | Rareza | Se gana cuando… |
|----|--------|--------|-----------------|
| `club_50` | **Club de los 50** | épico | llega a `<50>` goles históricos |
| `centurion_asist`| **Centurión** | épico | llega a `<50>` asistencias históricas |
| `mil_minutos` | **Kilometrero** | raro | acumula `<X>` partidos jugados |
| `primer_gol` | **Se Abrió la Cuenta** | común | marca su primer gol en el club (badge de bienvenida) |

---

## 4. Motor de detección (cómo se disparan)

```
// Al cerrar la planilla de un partido (evento matchFinalized):
function evaluarBadges(match, eventos, jugadores, historia) {
  const otorgados = [];
  for (const badge of CATALOGO_BADGES) {
    for (const jugador of jugadores) {
      // cada badge define un predicado puro sobre (jugador, match, eventos, historia)
      if (badge.repetible || !yaLoTiene(jugador, badge, historia)) {
        if (badge.predicado(jugador, match, eventos, historia)) {
          otorgados.push(crearInstancia(badge, jugador, match));
        }
      }
    }
  }
  return otorgados; // persistir + notificar
}
```

**Datos que necesita cada evento de gol** para soportar los badges clutch:
`{ playerId, minuto, minutoTotalPartido, marcadorTrasGol:{A,B}, tipo?:'zurda|derecha|cabeza', esPenal?:bool, enContra?:bool }`.

> Si hoy la planilla no guarda el **minuto** del gol, ese es el primer dato a
> agregar: desbloquea toda la familia Clutch, que es la más emocionante.
> Los badges que necesitan datos aún no capturados (tipo de gol, penales) se
> dejan definidos pero inactivos hasta que exista el registro.

---

## 5. Rareza, presentación y (opcional) niveles

**Rareza → color del borde/glow** (usa tokens del proyecto):
- común → hielo/gris, sin glow
- raro → verde "on fire" (#3DE68C)
- épico → oro (#E8C878) con glow suave
- legendario → oro con degradado cónico + glow fuerte (como el marco de la carta)

**Dónde se muestran:**
- En la **carta del jugador**: fila de badges recientes bajo los atributos.
- En el **perfil**: vitrina completa, agrupada por familia, con contador
  "12 de 34 insignias".
- En el **resumen del partido**: "Insignias de la fecha" — quién ganó qué esa
  noche (alimenta el chat de WhatsApp: motor de crecimiento).
- **Notificación al jugador**: "🏅 Ganaste 'Gol de Última Hora' — Minuto 58', el
  gol de la victoria. Compártela." + botón compartir imagen.

**Niveles de jugador (opcional, fase 2):** cada badge da XP según rareza
(común 10 / raro 25 / épico 50 / legendario 100). El XP acumulado sube un
"nivel de jugador" (distinto del OVR: el OVR mide *cómo juegas ahora*, el nivel
mide *tu historia en el club*). No obligatorio para el MVP.

---

## 6. Reglas innegociables

1. Todo badge se gana con un hecho real registrado; ninguno por usar la app.
2. Los pícaros (autogol, amarillas) son **autoconscientes y con cariño**, jamás
   humillan. Si un badge puede hacer sentir mal a alguien, se reformula o se cae.
3. La familia Constancia se celebra tanto como la goleadora: aparecer es mérito.
4. **Módulo formativo infantil (<15): set de badges DISTINTO** — solo conducta y
   participación (asistencia, compañerismo, esfuerzo), nunca ranking ni
   comparación. NO usar este catálogo con niños (ver modelo-gamificacion.md).
5. Rareza calibrada a la liga: un "Hat-Trick" en Los Lunes (marcadores altos)
   quizá deba ser raro y no épico. Ajustar tras ver datos reales.

---

## 7. Roadmap

1. Agregar **minuto del gol** a la planilla (desbloquea Clutch).
2. Definir el `CATALOGO_BADGES` con predicados puros + tests sobre partidos
   reales ya jugados (los 5 de agosto/septiembre que están en la app).
3. Correr el motor **retroactivamente** sobre el historial: el día del lanzamiento
   cada jugador ya tiene su vitrina poblada (no arranca vacía → enganche inmediato).
4. Vitrina en el perfil + fila en la carta.
5. Notificación + compartir imagen del badge.
6. (Fase 2) XP y niveles.

---
*Referencias: `ligalab-stats-spec.md` (cartas y atributos), `tokens.css`
(colores y anti-tics), `carta-loslunes.html` (dónde se incrustan los badges).*
