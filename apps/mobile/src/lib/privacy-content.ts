export const MOBILE_APP_PRIVACY_SECTIONS = [
  {
    title: 'Cuenta',
    body: 'No necesitas crear una cuenta para usar la app. El acceso es anónimo.',
  },
  {
    title: 'Datos que guardamos',
    body: 'Guardamos un identificador anónimo de instalación (UUID generado en el dispositivo), los equipos favoritos que eliges, tu token de notificaciones Expo, la plataforma (iOS o Android), la versión de la app y registros de entrega de notificaciones para diagnosticar fallos.',
  },
  {
    title: 'Notificaciones',
    body: 'Puedes revocar permisos de notificaciones desde la configuración del sistema operativo. También puedes desactivar la instalación desde la app; dejamos de enviarte alertas y marcamos el token como inactivo.',
  },
  {
    title: 'Contenido deportivo y editorial',
    body: 'Resultados, tablas, noticias, galerías y patrocinadores son contenido público de la liga, disponible sin iniciar sesión.',
  },
] as const

export const MOBILE_APP_PRIVACY_URL = 'https://torneos-kelme.vercel.app/privacidad/app'
