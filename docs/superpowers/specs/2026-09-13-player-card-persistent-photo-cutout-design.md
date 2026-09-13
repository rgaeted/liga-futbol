# Carta de jugador — foto FIFA persistente

> Estado: **Diseño aprobado en sesión**
> Fecha: 2026-09-13
> Producto: **LigaLab**
> Org inicial: **Partidos Los Lunes** (`loslunes`)
> Depende de: `2026-09-11-loslunes-player-card-design.md`

## 1. Objetivo

Hacer que la foto de cada jugador se integre naturalmente en la carta, como en una carta FIFA: sujeto sin fondo rectangular, encuadre uniforme de cabeza y torso, iluminación equilibrada y borde limpio.

El procesamiento ocurre localmente en el navegador del administrador. La foto original no se envía a servicios externos. El resultado se guarda una vez en LigaLab y se reutiliza en la carta web y su imagen para compartir.

## 2. Alcance

### Incluido

- Mantener la identidad verde, oro y noche de Los Lunes.
- Eliminar automáticamente el fondo de las fotos.
- Recortar márgenes transparentes y normalizar el encuadre.
- Aplicar un retoque conservador de exposición, contraste y saturación.
- Permitir ajustar posición y escala antes de guardar si el resultado automático lo necesita.
- Guardar el recorte procesado de forma persistente.
- Procesar en lote las fotos existentes de Los Lunes.
- Procesar cada foto nueva al subirla.
- Usar el mismo recorte en la carta web y en el PNG/Open Graph.
- Mantener nombre, posición, equipo, premio e insignias.
- Mantener fuera de la carta OVR y atributos calculados.

### Fuera de alcance

- Cambiar la carta a la paleta dorada de FIFA.
- Retoque facial generativo o modificación de rasgos.
- Enviar fotos a remove.bg, Cloudinary u otros servicios externos.
- Reemplazar la foto original del perfil.
- Generar recortes durante cada visita pública.

## 3. Resultado visual

La foto ocupa la zona superior derecha del escudo. La cabeza queda completa y el torso termina detrás de la franja del nombre, sin un rectángulo visible. El sujeto recibe una sombra suave para separarlo del fondo de la carta.

El procesamiento no cambia la cara ni inventa ropa. Solo:

1. separa sujeto y fondo;
2. recorta el lienzo al contenido visible;
3. ubica el sujeto en un lienzo transparente normalizado;
4. corrige luz, contraste y saturación dentro de rangos discretos;
5. exporta una imagen con transparencia.

El encuadre automático prioriza una composición de cabeza y hombros. Si una foto es demasiado cerrada, está inclinada o contiene más de una persona, el administrador puede mover y escalar el sujeto en la vista previa antes de guardar.

## 4. Persistencia

Se agregan campos opcionales a `Person`:

- `cardPhotoMimeType String?`
- `cardPhotoData Bytes?`
- `cardPhotoUpdatedAt DateTime?`

La foto original permanece en `photoMimeType` y `photoData`. El recorte de carta es un derivado regenerable.

Al reemplazar o eliminar la foto original, también se limpian los campos `cardPhoto*`. Esto evita que una carta muestre un recorte antiguo.

No se guardan offsets ni escala después de procesar: el archivo final ya contiene el encuadre aprobado. Un nuevo ajuste vuelve a generar y reemplaza el derivado.

## 5. Procesamiento local

El módulo cliente separa la inferencia pesada de la composición:

```ts
type CardPhotoAdjustments = {
  offsetX: number
  offsetY: number
  scale: number
}

extractPlayerCutout(source: Blob): Promise<Blob>
composePlayerCardPhoto(
  cutout: Blob,
  adjustments: CardPhotoAdjustments,
): Promise<Blob>
```

Flujo:

1. `@imgly/background-removal` produce una sola vez un PNG con alfa usando `isnet_quint8`.
2. Un canvas detecta el rectángulo útil leyendo el canal alfa.
3. El sujeto se escala y posiciona en un lienzo transparente fijo.
4. Se aplican correcciones suaves y constantes de imagen.
5. Se exporta PNG transparente optimizado.

Al mover o escalar el sujeto en la vista previa solo se repiten los pasos de canvas; no se vuelve a ejecutar el modelo.

El modelo puede descargarse desde su proveedor, pero la foto se procesa dentro del navegador y nunca se sube a ese proveedor. La UI explica que la primera ejecución puede demorar por la descarga del modelo.

## 6. API

### `GET /api/players/{id}/card-photo`

- Pública bajo la misma política que la carta.
- Devuelve `cardPhotoData` si existe.
- Si aún no hay derivado, devuelve la foto original como fallback.
- Responde 404 si no hay ninguna foto.
- Usa `ETag` o una política de caché que permita ver reemplazos sin conservar imágenes antiguas indefinidamente.

### `POST /api/players/{id}/card-photo`

- Reutiliza `requirePlayerPhotoMutation`.
- Recibe `multipart/form-data` con `photo`.
- Acepta solo PNG con transparencia dentro de límites de tamaño y dimensiones.
- Guarda `cardPhotoMimeType`, `cardPhotoData` y `cardPhotoUpdatedAt`.
- Revalida páginas públicas y administrativas relevantes.

### Foto original

`POST` y `DELETE /api/players/{id}/photo` limpian el derivado guardado cuando cambia la fuente.

## 7. Experiencia administrativa

### Nueva foto

Después de subir una foto:

1. se muestra la vista previa del recorte;
2. el administrador puede mover y escalar;
3. **Guardar recorte** persiste el derivado;
4. si falla el procesamiento, la foto original queda guardada y se ofrece **Reintentar**.

### Fotos existentes

En jugadores de Los Lunes se agrega **Preparar fotos para cartas**:

- lista jugadores con foto original y sin recorte;
- procesa secuencialmente para no saturar memoria;
- muestra progreso, nombre actual y errores;
- permite pausar, reintentar errores y corregir casos individuales;
- nunca reemplaza la foto original.

El lote se ejecuta en el navegador del administrador. Cerrar la pestaña lo detiene, pero los recortes ya guardados permanecen y el lote puede continuar después.

## 8. Carta pública

`PlayerCardPhoto` deja de ejecutar eliminación de fondo durante la visita pública. Consume `/api/players/{id}/card-photo`.

Si existe un recorte:

- se presenta con `object-contain`, anclado abajo;
- ocupa más espacio vertical, como la referencia FIFA;
- lleva una sombra suave.

Si todavía no existe:

- se usa la foto original con encuadre y degradado inferior como fallback;
- no se descarga el modelo de IA al visitante.

`PlayerCardOgImage` consume el mismo endpoint, por lo que la imagen compartida coincide con la carta web.

## 9. Errores y límites

- Sin sujeto detectable: conservar original y pedir corrección manual o una foto distinta.
- Más de una persona: advertir que se necesita una foto individual.
- Recorte defectuoso: permitir reprocesar desde el original.
- Navegador sin soporte suficiente: mantener foto original; no bloquear la carta ni la carga de jugadores.
- Archivo procesado demasiado grande: reducir dimensiones antes de enviar.
- Fallo de red al guardar: mantener la vista previa local y ofrecer reintento.

## 10. Seguridad y privacidad

- La foto original solo viaja entre LigaLab y el navegador autenticado.
- El modelo se ejecuta localmente.
- Solo usuarios autorizados para modificar la foto del jugador pueden guardar o reemplazar el recorte.
- El endpoint valida tipo, firma, dimensiones y tamaño; no confía solo en el MIME enviado.
- La ruta pública entrega bytes de imagen y no expone metadatos administrativos.

## 11. Verificación

### Tests

- La subida de una foto original invalida el recorte anterior.
- El borrado elimina original y recorte.
- `GET card-photo` prefiere el recorte y usa original como fallback.
- `POST card-photo` rechaza usuarios no autorizados y archivos inválidos.
- El procesador recorta correctamente un fixture con alfa y respeta offset/escala.
- El lote omite jugadores ya procesados y continúa después de un error.

### Revisión visual

- Fernando Opitz y Rodrigo Olave sin fondo rectangular.
- Cabeza completa y hombros visibles en móvil y escritorio.
- Nombre e insignias no quedan cubiertos por la foto.
- Carta web y PNG compartido usan el mismo recorte.
- Fallback original funciona cuando no existe derivado.

## 12. Migración y despliegue

1. Agregar migración Prisma con campos `cardPhoto*`.
2. Desplegar API, procesador y fallback.
3. Ejecutar **Preparar fotos para cartas** para Los Lunes.
4. Revisar casos fallidos y corregirlos.
5. Confirmar que la carta y el OG usan el derivado.
6. Eliminar el procesamiento de fondo durante visitas públicas.

La migración es aditiva y reversible: si no existe un recorte persistido, la aplicación sigue usando la foto original.
