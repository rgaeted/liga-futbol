export type HelpBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; title?: string; items: string[] }
  | { type: 'steps'; title?: string; items: string[] }
  | { type: 'note'; text: string }

export type HelpSection = {
  id: string
  eyebrow?: string
  title: string
  intro?: string
  blocks: HelpBlock[]
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'introduccion',
    eyebrow: 'Bienvenida',
    title: '¿Qué es Torneos Kelme?',
    intro:
      'Torneos Kelme es la plataforma oficial para gestionar ligas y partidos amistosos de la marca KELME: equipos, citaciones, marcador en vivo, estadísticas y más.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Puedes usar la plataforma con distintos perfiles según tu rol en el torneo. Algunas funciones son públicas (como el marcador en vivo) y otras requieren iniciar sesión con las credenciales que te entrega la organización.',
      },
      {
        type: 'list',
        title: 'Tipos de torneo',
        items: [
          'Liga: equipos fijos, temporadas, citaciones del DT y estadísticas acumuladas por jugador.',
          'Amistosos: partidos por categoría con equipos libres (lado A y lado B), jugadores del pool amistoso y reglas propias (capitán, pago, etc.).',
        ],
      },
    ],
  },
  {
    id: 'acceso',
    eyebrow: 'Primeros pasos',
    title: 'Cómo acceder',
    blocks: [
      {
        type: 'steps',
        title: 'Si ya tienes cuenta',
        items: [
          'Ve a Ingresar e ingresa tu email y contraseña.',
          'Serás redirigido al panel correspondiente a tu rol (jugador, DT, árbitro o administrador).',
        ],
      },
      {
        type: 'steps',
        title: 'Si eres jugador amistoso sin cuenta',
        items: [
          'El administrador debe haberte creado en el pool de jugadores amistosos, o puedes reclamar tu perfil en Registrarse si ya apareces en la lista.',
          'Elige tu nombre en el formulario, define email y contraseña, y completa el registro.',
          'Luego ingresa con esas credenciales. Tu rol en el sistema es jugador.',
        ],
      },
      {
        type: 'note',
        text: 'Si no encuentras tu perfil o no tienes credenciales, contacta al administrador del torneo. La organización crea cuentas para DT, árbitros y jugadores de liga.',
      },
    ],
  },
  {
    id: 'vivo',
    eyebrow: 'Público',
    title: 'Marcador en vivo',
    intro: 'No necesitas cuenta para seguir un partido en curso o revisar uno recién terminado.',
    blocks: [
      {
        type: 'list',
        items: [
          'Desde la página de inicio puedes ver los partidos en vivo y abrir el marcador.',
          'También puedes entrar directo con el enlace /live/[id] que comparte la organización.',
          'Verás el marcador, reloj del partido, cronología de eventos (goles, tarjetas, etc.), formaciones cuando estén cargadas y MVPs al finalizar.',
          'En amistosos se muestran escudos por lado, capitán de cada equipo y fotos de jugadores en la formación.',
        ],
      },
      {
        type: 'note',
        text: 'La cronología muestra los eventos en orden cronológico: el más reciente aparece abajo.',
      },
    ],
  },
  {
    id: 'jugador-liga',
    eyebrow: 'Rol: Jugador',
    title: 'Jugadores de liga',
    blocks: [
      {
        type: 'paragraph',
        text: 'Si perteneces a un equipo de liga, tu panel muestra estadísticas personales (goles, asistencias, MVPs, tarjetas) y tus partidos citados.',
      },
      {
        type: 'list',
        items: [
          'Mi Panel: resumen de stats y próximos partidos.',
          'Mis Partidos: historial de citaciones y resultados.',
          'Las evaluaciones del cuerpo técnico aparecen cuando el DT las registra.',
        ],
      },
    ],
  },
  {
    id: 'jugador-amistoso',
    eyebrow: 'Rol: Jugador',
    title: 'Jugadores amistosos',
    blocks: [
      {
        type: 'paragraph',
        text: 'Los jugadores amistosos comparten el rol “jugador” en el sistema, pero sus partidos y estadísticas son independientes de la liga.',
      },
      {
        type: 'list',
        items: [
          'Puedes pertenecer a una o más categorías amistosas (por edad, nivel, etc.).',
          'El administrador te asigna a partidos amistosos en el lado A o B.',
          'En cada partido hay un capitán y un DT por equipo; el DT suele ser uno de los jugadores del roster.',
          'Si fuiste designado DT y tienes cuenta, entra a Amistosos (DT) en tu panel para editar la formación de tu equipo.',
          'Tus estadísticas amistosas (goles, asistencias, MVPs) se calculan aparte de la liga.',
        ],
      },
    ],
  },
  {
    id: 'dt',
    eyebrow: 'Rol: Director técnico',
    title: 'Directores técnicos',
    blocks: [
      {
        type: 'paragraph',
        text: 'El DT gestiona su equipo de liga antes de cada fecha.',
      },
      {
        type: 'steps',
        items: [
          'Entra a Partidos y elige el encuentro de tu equipo.',
          'Abre la citación y formación: marca quién juega, asigna titulares en la cancha y suplentes en el banco.',
          'Guarda con un solo botón (“Guardar citación y formación”).',
          'Opcionalmente registra evaluaciones de jugadores en la sección Evaluaciones.',
        ],
      },
      {
        type: 'note',
        text: 'En partidos amistosos el DT designado (jugador con cuenta) edita la formación de su lado desde Amistosos (DT). El admin sigue pudiendo editar ambos lados.',
      },
    ],
  },
  {
    id: 'arbitro',
    eyebrow: 'Rol: Árbitro',
    title: 'Árbitros',
    blocks: [
      {
        type: 'paragraph',
        text: 'Solo ves y controlas los partidos que te asignó la organización.',
      },
      {
        type: 'list',
        items: [
          'Inicia el partido para activar el reloj automático; no ingresas el minuto manualmente.',
          'Registra goles, tarjetas, tiros al arco y otros eventos desde el panel de control.',
          'Puedes indicar asistencia en goles cuando corresponda.',
          'Al entretiempo el reloj se pausa; usa “2.º tiempo” para reanudar.',
          'Al finalizar, puedes elegir el MVP de cada equipo (local y visitante).',
        ],
      },
    ],
  },
  {
    id: 'admin',
    eyebrow: 'Rol: Administrador',
    title: 'Administradores',
    intro: 'El administrador configura todo el torneo y puede corregir datos cuando hace falta.',
    blocks: [
      {
        type: 'list',
        title: 'Gestión habitual',
        items: [
          'Equipos y jugadores de liga, temporadas y usuarios del sistema.',
          'Partidos de liga y amistosos: fecha, cancha, árbitro, tipo de fútbol (5, 6, 7 u 11).',
          'Categorías y jugadores amistosos: altas, fotos, categorías y cuentas de acceso.',
          'Cronología de partidos: editar, agregar o borrar eventos y recalcular marcador.',
          'Formaciones en liga y amistosos desde la ficha de cada partido.',
          'MVPs por equipo al cierre del partido, con foto opcional dedicada.',
        ],
      },
      {
        type: 'list',
        title: 'Partidos amistosos',
        items: [
          'Define nombres de los lados A y B, escudos y colores.',
          'Arma el roster: jugadores por lado y un capitán obligatorio por equipo.',
          'Marca quién pagó la cancha con el toggle de pago en el listado.',
        ],
      },
    ],
  },
  {
    id: 'formaciones',
    eyebrow: 'Funcionalidad',
    title: 'Formaciones y tipo de fútbol',
    blocks: [
      {
        type: 'paragraph',
        text: 'Cada partido tiene un formato (fútbol 5, 6, 7 u 11) que define la cantidad de jugadores y los esquemas tácticos disponibles.',
      },
      {
        type: 'list',
        items: [
          'Titulares se ubican en la cancha; el resto va al banco.',
          'En liga el DT arma la formación de su equipo; en amistosos lo hace el admin.',
          'Las formaciones aparecen en el marcador en vivo cuando están guardadas.',
          'El arquero se muestra dentro del área en la vista de cancha.',
        ],
      },
    ],
  },
  {
    id: 'mvp',
    eyebrow: 'Funcionalidad',
    title: 'MVP del partido',
    blocks: [
      {
        type: 'paragraph',
        text: 'Al terminar un partido se puede elegir un jugador destacado (MVP) por equipo: local y visitante en liga, o lado A y B en amistosos.',
      },
      {
        type: 'list',
        items: [
          'Lo registran el árbitro asignado o un administrador.',
          'Puedes subir una foto especial del MVP para ese partido (distinta de la foto de perfil).',
          'En vivo se muestran las tarjetas MVP bajo el marcador y una estrella ★ en la formación.',
        ],
      },
    ],
  },
  {
    id: 'faq',
    eyebrow: 'Ayuda',
    title: 'Preguntas frecuentes',
    blocks: [
      {
        type: 'list',
        items: [
          '¿Olvidé mi contraseña? Contacta al administrador; él gestiona las cuentas del torneo.',
          '¿Por qué no veo partidos en mi panel? Verifica que estés citado (liga) o asignado al amistoso (pool amistoso).',
          '¿Puedo ver partidos sin login? Sí, el marcador en vivo es público.',
          '¿Las fechas están en hora de Chile? Sí, la plataforma usa la zona horaria de Santiago.',
          '¿Qué pasa si cambio el tipo de fútbol de un partido con formación ya guardada? Revisa la formación; algunos puestos pueden quedar inválidos.',
        ],
      },
    ],
  },
]

export const HELP_QUICK_LINKS = [
  { href: '#introduccion', label: 'Introducción' },
  { href: '#acceso', label: 'Acceso' },
  { href: '#vivo', label: 'En vivo' },
  { href: '#jugador-liga', label: 'Jugador liga' },
  { href: '#jugador-amistoso', label: 'Jugador amistoso' },
  { href: '#dt', label: 'DT' },
  { href: '#arbitro', label: 'Árbitro' },
  { href: '#admin', label: 'Admin' },
  { href: '#formaciones', label: 'Formaciones' },
  { href: '#mvp', label: 'MVP' },
  { href: '#faq', label: 'FAQ' },
]
