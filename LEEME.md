# StreamV2

Tu propia app de escritorio para el live: **alertas de regalos**, **rankings**, **regalo más caro** y un **bot que lee el chat en voz alta**. Corre en tu computadora; no depende de servicios de terceros como TikFinity.

## 1. Instalar (una sola vez)

1. Descarga **StreamV2-Setup.exe** de la sección [Releases](../../releases/latest) y ábrelo.
2. Windows puede mostrar **"Windows protegió tu PC"** porque la app no tiene firma digital de pago. Toca **Más información → Ejecutar de todas formas**. Solo pasa la primera vez.
3. Se instala sola y se abre. Queda un acceso directo **StreamV2** en tu escritorio y en el menú Inicio.

No necesitas Node.js ni nada más.

### Si usabas la versión anterior (la de INICIAR.bat)

En StreamV2 toca el botón de **versión** (abajo a la izquierda) → **Importar de la versión anterior** y elige la carpeta vieja donde estaba `INICIAR.bat`. Se copian tu usuario, API key de Fish Audio, voces, ranking y estilos. Después puedes borrar la carpeta vieja.

## 2. Actualizaciones

StreamV2 busca versiones nuevas al abrirse y cada 2 horas. Cuando hay una, **la descarga sola** (solo las partes que cambiaron) y te avisa arriba con **Versión X lista → Actualizar**. Si no la instalas en ese momento, se instala sola la próxima vez que cierres la app. Nunca tienes que volver a descargar el instalador.

Tus datos (ajustes, API key, voces, ranking) viven en `%APPDATA%\StreamV2`, separados de la app, así que **las actualizaciones no los tocan**. Para verlos: botón de versión → **Abrir carpeta de datos**.

## 3. Conectarte a tu live

1. Empieza tu transmisión en TikTok.
2. En el panel escribe tu usuario (sin @) y presiona **Conectar**.
3. Si todavía no estás en vivo, la app espera y se conecta sola cuando empieces. La próxima vez que abras la app se reconecta automáticamente.

## 4. Poner los overlays en OBS / TikTok LIVE Studio

Mientras StreamV2 esté abierto, en tu programa de streaming agrega una **Fuente de navegador** (Browser Source) con cada link (son los mismos de la versión anterior):

| Overlay | Link | Tamaño sugerido |
|---|---|---|
| Alertas de regalos | `http://127.0.0.1:3939/alertas.html` | El de tu escena (ej. 1080×1920 vertical) |
| Top taps (likes) | `http://127.0.0.1:3939/ranking.html` | 500×600 |
| Ranking de regalos | `http://127.0.0.1:3939/ranking.html?tipo=regalos` | 500×600 |
| Regalo más caro del stream | `http://127.0.0.1:3939/top-regalo.html` | 520×220 |
| Chat en pantalla | `http://127.0.0.1:3939/chat.html` | 450×700 |

Usa los botones **Probar** del panel para ver cómo se ven sin estar en vivo.

### Estilos de overlay

En la pestaña **Overlays** eliges el estilo de cada overlay con una vista previa en vivo, y le cambias el título (o lo quitas con **Mostrar título**), los puestos y si lleva fondo. **Tu stream se actualiza solo**: no hace falta volver a pegar el link en OBS.

- **Regalo más caro:** Tarjeta, Banner (barra horizontal), Trofeo (vertical con corona, ideal para stream vertical), Neón, Minimal (solo texto), Burbuja (foto de quien lo mandó) Círculo y Cuadro (la foto de perfil y el regalo se van volteando como moneda; eliges cada cuántos segundos).
- **Top taps** y **Top regalos:** Lista, Podio (top 3 en escalones), Líder (solo el #1 en grande), Compacto, Neón, Cinta (barra que se desplaza, ideal abajo de la pantalla) y Bolitas (vertical: la foto de cada fan en un círculo con aro de color, y le salen corazones cuando da taps).

### Animaciones

Cada overlay tiene su propio bloque **Animaciones** (se puede apagar con el interruptor):

- **Movimiento todo el tiempo:** Quieto, Brillo (un destello cruza la tarjeta), Borde de luz (borde de colores que gira), Flotar, Respirar, Balanceo y Destellos. El regalo más caro además tiene **Girar regalo**, y los rankings tienen **Ola** (los puestos se iluminan uno tras otro).
- **Al cambiar:** Pop, Deslizar, Zoom, Voltear o Sacudida. En el regalo más caro se ve cuando hay nuevo récord; en los rankings cuando alguien entra o sube de puesto.
- **Intensidad:** Suave, Normal o Fuerte.
- **Números que suben:** los taps y diamantes cuentan hacia arriba en lugar de saltar.
- **Resaltar a quien sube de puesto** (rankings): la fila brilla en verde con una flechita ▲, y las filas se reacomodan deslizándose.

Con **▶ Probar animación** ves en la vista previa cómo se vería un récord nuevo o alguien rebasando al primero.

**Opciones extra en el link** (se combinan con `&`):

- Alertas: `?escala=1.3`, `?posicion=arriba` / `abajo`, `?sonido=0`
- Top taps / top regalos: `?tipo=regalos`, `?estilo=podio`, `?top=3`, `?titulo=Mis%20fans` (`?titulo=0` sin título), `?fondo=0` (sin caja), `?ancho=1200` (estilo Cinta), `?escala=1.2`, `?animacion=0` (sin animaciones)
- Regalo más caro: `?estilo=trofeo`, `?titulo=Rey%20del%20stream` (`?titulo=0` sin título), `?fondo=0`, `?escala=1.2`, `?ocultarVacio=1` (no se muestra hasta el primer regalo), `?cambio=4` (segundos entre foto y regalo, estilos Círculo y Cuadro), `?animacion=0`
- Chat: `?ocultar=30` (segundos; `0` = nunca), `?max=8`, `?regalos=0`, `?escala=1.2`

## 5. El bot lector de chat

- Habla desde la ventana de StreamV2, aunque esté minimizada.
- Tu programa de streaming lo captura como **audio del escritorio**. Si no se escucha en el live, revisa que tengas la fuente "Audio del escritorio" activa.
- Puedes elegir qué leer (comentarios, regalos, seguidores, compartidos).

### Voces de Fish Audio

El bot lee con voces de **Fish Audio**, una biblioteca con miles de voces (narradores, personajes, anime, robots, abuelitas…).

1. Crea una cuenta en [fish.audio](https://fish.audio), copia tu **API key** en [fish.audio/app/api-keys](https://fish.audio/app/api-keys/) y pégala en **Voz** (la primera vez aparece una tarjeta para hacerlo). Se guarda solo en tu computadora (`config.json`); no la compartas.
2. Toca **Explorar voces**: busca por nombre o estilo, filtra por español o todos los idiomas, ordena por más usadas, mejor valoradas o nuevas, y escucha cada una con ▶. Toca **Agregar** para guardarla en **Tus voces**.
3. En cada voz, **Ajustar** te deja cambiarle el nombre, la **emoción** (emocionado, sarcástico, susurrando, gritando…) y la **velocidad**.

### Quién habla

- **Voz general:** lee los comentarios de todos.
- **Regalos**, **regalos grandes** (tú eliges desde cuántos diamantes), **nuevos seguidores** y **compartidos** pueden tener su propia voz.
- **Voces por usuario:** dale a alguien de tu live una voz especial. Sus comentarios se leen con esa voz en lugar de la general, y si activas "También sus regalos", también sus agradecimientos. Atajo: en **En vivo**, haz clic en el nombre de cualquier persona para darle su voz.
- La primera voz que agregas se asigna a todo automáticamente, para que funcione de inmediato.

### Respaldo y gasto

- Si Fish Audio falla (sin saldo, sin internet), el bot lee con la **voz de respaldo** del navegador y te avisa en la barra de abajo. El live nunca se queda mudo.
- En **Cuenta de Fish Audio** ves cuántas letras llevas este mes y puedes elegir el modelo de voz.
- Las frases repetidas (agradecimientos, pruebas) se guardan un rato y no se vuelven a cobrar.
- Los regalos se leen antes que los comentarios.
- Para más voces del navegador en Windows: Configuración → Hora e idioma → Voz → Agregar voces.

## Regalo más caro

La pestaña **Top regalo** muestra el regalo de mayor precio que te han mandado en el stream actual (si dos cuestan lo mismo, gana quien mandó más), quién lo mandó y el top 5. Se reinicia solo cuando empiezas un live nuevo, o a mano con **Reiniciar**. Su overlay anuncia "¡Nuevo récord!" cada vez que alguien lo supera.

## Preguntas frecuentes

**¿Funciona si transmito desde el celular?** El panel y el bot de voz sí (los escuchas en tu compu). Los overlays solo se pueden poner si transmites desde la PC con OBS o TikTok LIVE Studio.

**Error de "rate limit" / límite de conexiones.** La conexión gratis tiene un límite. Crea una API key gratuita en https://www.eulerstream.com, pégala en el panel (Conexión → Opcional), conéctate y reinicia la app.

**Dejó de funcionar de un día para otro.** TikTok no tiene API oficial para lives; esta app usa la librería `tiktok-live-connector`, que se actualiza cuando TikTok cambia algo. Cuando eso pase, publicaremos una versión nueva y StreamV2 se actualizará sola.

**¿Dónde se guardan mis ajustes?** En `%APPDATA%\\StreamV2` (`config.json`, `ranking.json`, `uso-voz.json`). Sobreviven a las actualizaciones; usa "Reiniciar ranking" para empezar de cero.

**"El puerto 3939 ya está en uso".** Tienes abierta la versión anterior (la ventana negra de INICIAR.bat). Ciérrala y vuelve a abrir StreamV2.

## Para desarrollo

```bash
npm install
npm start            # abre la app
npm run dist         # crea el instalador en dist/
npm run release      # crea el instalador y lo publica en GitHub Releases (requiere GH_TOKEN)
```

Para publicar una actualización: sube `version` en `package.json`, escribe las novedades en `NOTAS.md`, haz commit y súbelo a `main`. GitHub Actions construye el instalador en Windows y lo publica en Releases; la app instalada lo detecta sola.
