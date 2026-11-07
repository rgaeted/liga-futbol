import {
  LEGAL_DATA_CONTROLLER,
  LEGAL_PRIVACY_EMAIL,
  LEGAL_PRODUCT_NAME,
  LEGAL_SITE_URL,
  LEGAL_SUPPORT_EMAIL,
  PRIVACY_POLICY_LAST_UPDATED,
  PRIVACY_POLICY_VERSION,
} from '@/lib/legal/constants'

export type LegalSection = {
  id: string
  title: string
  paragraphs: string[]
  bullets?: string[]
}

export const PLATFORM_PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'intro',
    title: '1. Introducción',
    paragraphs: [
      `${LEGAL_DATA_CONTROLLER} (“${LEGAL_PRODUCT_NAME}”, “nosotros”) opera la plataforma web ${LEGAL_SITE_URL} y servicios relacionados para la gestión de ligas, clubes, partidos y contenido deportivo.`,
      'Esta Política de Privacidad explica cómo tratamos datos personales conforme a la Ley N° 19.628 sobre Protección de la Vida Privada y, en lo que corresponda, al marco de la Ley N° 21.663 de Ciberseguridad.',
      'Al crear una cuenta o usar nuestros servicios, declaras haber leído esta política y otorgas tu consentimiento para el tratamiento indicado, salvo que la ley permita otra base legal.',
    ],
  },
  {
    id: 'controller',
    title: '2. Responsable del tratamiento',
    paragraphs: [
      `Responsable: ${LEGAL_DATA_CONTROLLER}.`,
      `Canal de privacidad y derechos del titular: ${LEGAL_PRIVACY_EMAIL}.`,
      `Consultas generales de soporte: ${LEGAL_SUPPORT_EMAIL}.`,
      `Sitio: ${LEGAL_SITE_URL}.`,
    ],
  },
  {
    id: 'data',
    title: '3. Datos personales que tratamos',
    bullets: [
      'Identificación y contacto: nombre, correo electrónico y contraseña cifrada de tu cuenta.',
      'Perfil deportivo: datos asociados a tu ficha de jugador, DT o árbitro (nombre, categoría, equipo, posición, fotos, estadísticas y participación en partidos).',
      'Datos de uso y operación: registros técnicos, dirección IP, identificadores de sesión, cookies necesarias para autenticación y preferencias de organización activa.',
      'Datos de organizaciones: información de ligas y clubes que administras (nombre, slug, colores, logo, membresías y roles).',
      'Comunicaciones: mensajes que nos envíes por correo o formularios de contacto.',
      'App móvil (si la usas): identificador anónimo de instalación, token de notificaciones push, plataforma, versión de la app y equipos favoritos.',
    ],
    paragraphs: [
      'No solicitamos datos sensibles de forma directa. Si una liga registra información adicional de menores o datos de salud, el administrador de esa organización es responsable de contar con la autorización correspondiente.',
    ],
  },
  {
    id: 'purposes',
    title: '4. Finalidades del tratamiento',
    bullets: [
      'Crear y administrar tu cuenta de usuario.',
      'Vincular tu cuenta a tu perfil de jugador cuando usas un link personal de invitación.',
      'Permitir el acceso a paneles de jugador, DT, árbitro y administración según tus roles.',
      'Operar partidos en vivo, convocatorias, evaluaciones, contenidos y estadísticas deportivas.',
      'Enviar notificaciones push de la app móvil, si las autorizas en tu dispositivo.',
      'Garantizar seguridad, prevenir fraudes, diagnosticar errores y cumplir obligaciones legales.',
      'Mejorar el servicio mediante métricas agregadas y no identificables cuando sea posible.',
    ],
    paragraphs: [],
  },
  {
    id: 'legal-basis',
    title: '5. Base legal y consentimiento',
    paragraphs: [
      'Tratamos tus datos principalmente con tu consentimiento informado, otorgado al registrarte y al aceptar esta política.',
      'También podemos tratar datos cuando sea necesario para ejecutar el servicio que solicitas, cumplir obligaciones legales o proteger intereses legítimos de seguridad y operación de la plataforma, siempre respetando tus derechos.',
      'Puedes retirar tu consentimiento contactándonos; el retiro no afecta tratamientos previos lícitos ni impide conservar datos cuando la ley lo exija.',
    ],
  },
  {
    id: 'sharing',
    title: '6. Encargados y terceros',
    paragraphs: [
      'Compartimos datos solo con proveedores que nos ayudan a operar el servicio, bajo contratos que exigen confidencialidad y medidas de seguridad adecuadas.',
    ],
    bullets: [
      'Infraestructura cloud y hosting (por ejemplo, Vercel).',
      'Base de datos administrada (por ejemplo, Supabase/PostgreSQL).',
      'Servicios de correo o mensajería, si los usamos para notificaciones transaccionales.',
      'Proveedor de notificaciones push (Expo), en el caso de la app móvil.',
    ],
  },
  {
    id: 'transfers',
    title: '7. Transferencias internacionales',
    paragraphs: [
      'Algunos proveedores pueden procesar datos fuera de Chile. En esos casos adoptamos medidas contractuales y técnicas razonables para proteger tu información conforme a la legislación chilena aplicable.',
    ],
  },
  {
    id: 'retention',
    title: '8. Plazo de conservación',
    paragraphs: [
      'Conservamos los datos mientras mantengas una cuenta activa o sea necesario para prestarte el servicio.',
      'Tras solicitud de eliminación o cierre de cuenta, bloqueamos o eliminamos datos en un plazo razonable, salvo obligación legal de conservarlos (por ejemplo, respaldos técnicos o registros de seguridad).',
      'Los registros técnicos y de seguridad se conservan por el tiempo necesario para investigar incidentes y cumplir la normativa de ciberseguridad.',
    ],
  },
  {
    id: 'rights',
    title: '9. Derechos del titular (Ley 19.628)',
    bullets: [
      'Acceso: saber qué datos personales tratamos sobre ti.',
      'Rectificación: corregir datos inexactos o incompletos.',
      'Cancelación: solicitar la eliminación cuando proceda.',
      'Bloqueo: restringir el uso de tus datos en los casos previstos por ley.',
      'Oposición: oponerte a ciertos tratamientos basados en interés legítimo, cuando corresponda.',
    ],
    paragraphs: [
      `Para ejercer tus derechos escribe a ${LEGAL_PRIVACY_EMAIL} indicando tu nombre, correo de cuenta y el derecho que deseas ejercer. Responderemos dentro de los plazos legales aplicables.`,
      'Si consideras que no hemos atendido adecuadamente tu solicitud, puedes recurrir ante los tribunales competentes o autoridades que correspondan en Chile.',
    ],
  },
  {
    id: 'security',
    title: '10. Medidas de ciberseguridad (Ley 21.663)',
    paragraphs: [
      'Adoptamos medidas técnicas y organizativas proporcionales al riesgo para proteger la confidencialidad, integridad y disponibilidad de la información.',
    ],
    bullets: [
      'Contraseñas almacenadas con funciones de hash seguras.',
      'Comunicaciones cifradas mediante HTTPS.',
      'Control de acceso por roles dentro de cada organización.',
      'Registro de eventos relevantes para detectar abusos.',
      'Actualizaciones periódicas de dependencias y revisión de accesos administrativos.',
      'Copias de respaldo y procedimientos de recuperación ante fallos.',
    ],
  },
  {
    id: 'incidents',
    title: '11. Incidentes de seguridad',
    paragraphs: [
      'Ante un incidente de ciberseguridad que afecte datos personales y genere riesgo para tus derechos, investigaremos, contenemos el incidente y, cuando corresponda, te informaremos en un plazo razonable por correo o mediante aviso visible en la plataforma.',
      'Cooperaremos con las autoridades competentes cuando la Ley N° 21.663 u otras normas lo requieran.',
      `Reporta sospechas de acceso no autorizado a ${LEGAL_PRIVACY_EMAIL}.`,
    ],
  },
  {
    id: 'cookies',
    title: '12. Cookies y tecnologías similares',
    paragraphs: [
      'Usamos cookies estrictamente necesarias para mantener tu sesión iniciada, recordar la organización activa y proteger formularios contra abuso.',
      'No usamos cookies publicitarias de terceros en la plataforma principal.',
      'Puedes bloquear cookies desde tu navegador, pero algunas funciones (como iniciar sesión) podrían dejar de funcionar.',
    ],
  },
  {
    id: 'minors',
    title: '13. Menores de edad',
    paragraphs: [
      'El servicio puede ser usado por menores dentro de una liga o club. La organización deportiva es responsable de obtener autorización de padres o tutores cuando corresponda.',
      'Si eres padre, madre o tutor y crees que tratamos datos de un menor sin la autorización adecuada, contáctanos para revisar o eliminar la información.',
    ],
  },
  {
    id: 'changes',
    title: '14. Cambios a esta política',
    paragraphs: [
      `Podemos actualizar esta política. Publicaremos la versión vigente en ${LEGAL_SITE_URL}/privacidad e indicaremos la fecha de actualización.`,
      'Si el cambio es sustancial, te avisaremos por correo o mediante un aviso destacado antes de que entre en vigor, cuando sea razonablemente posible.',
      `Versión actual: ${PRIVACY_POLICY_VERSION}.`,
    ],
  },
  {
    id: 'law',
    title: '15. Legislación aplicable',
    paragraphs: [
      'Esta política se rige por las leyes de la República de Chile, en particular la Ley N° 19.628 sobre Protección de la Vida Privada y, en materia de medidas de seguridad y gestión de incidentes, la Ley N° 21.663 de Ciberseguridad, en lo que resulte aplicable a nuestro servicio.',
    ],
  },
]

export const PLATFORM_PRIVACY_META = {
  title: `Política de Privacidad — ${LEGAL_PRODUCT_NAME}`,
  description:
    'Tratamiento de datos personales de LigaLab conforme a la Ley 19.628 y medidas de ciberseguridad alineadas a la Ley 21.663.',
  lastUpdated: PRIVACY_POLICY_LAST_UPDATED,
  version: PRIVACY_POLICY_VERSION,
}
