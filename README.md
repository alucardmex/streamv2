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

**Cada live empieza en cero:** cuando empiezas un live nuevo, StreamV2 borra solo los comentarios, likes, diamantes, rankings y el regalo más caro del live anterior, para que la app vaya ligera. Si solo se corta la conexión y se reconecta al mismo live, no se borra nada. El contador de tiempo y las partidas no se tocan. Se apaga en **Ranking → Empezar en cero cada live nuevo**.

## 3. Conectarte a tu live

1. Empieza tu transmisión en TikTok.
2. En el panel escribe tu usuario (sin @) y presiona **Conectar**.
3. Si todavía no estás en vivo, la app espera y se conecta sola cuando empieces. La próxima vez que abras la app se reconecta automáticamente.

### Kick

Arriba a la izquierda están **TikTok** y **Kick**: prende una, la otra o las dos al mismo tiempo (al menos una queda prendida). Al prender Kick aparece la pestaña **Kick** con todo lo suyo:

- **Conexión:** escribe tu canal (lo que va después de `kick.com/`) y presiona **Conectar**. Kick se conecta al chat aunque todavía no estés en vivo, y se reconecta solo al abrir la app. Arriba, junto a TikTok, ves si Kick está en vivo.
- **Alertas de Kick:** Kicks, subs y subs regalados, y nuevos seguidores, con su mínimo de Kicks y su vista previa. Salen en el mismo overlay de alertas que TikTok.
- **Bot de voz en Kick:** qué se lee (chat, Kicks, subs, seguidores) y sus textos. Usa las mismas voces, volúmenes y filtros de la pestaña Voz. Kick no avisa si alguien te sigue: para leer solo a seguidores usa el modo *Solo seguidores* del chat en tu canal de Kick.
- **Contador de tiempo:** cuánto suma cada Kick, cada sub, cada seguidor y cada mensaje, al mismo contador que TikTok.
- **Pruebas:** comentario, Kicks, sub, subs regalados y seguidor.
- **Ranking de Kicks:** quién te ha dado más Kicks y el Kick más grande del stream, aparte de los diamantes de TikTok. Tienen sus propios overlays (**Top Kicks** y **Kick más grande**, con el estilo que elegiste en Overlays) y también están en Escena.
- En "En vivo" y en el chat en pantalla, lo de Kick sale con una **K** verde.
- Cada plataforma empieza en cero en su propio live nuevo: un live nuevo de Kick no borra lo de TikTok, y al revés.
- Kick no manda la foto de quien escribe; en su lugar sale su inicial.

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

**Estilos nuevos:** **Leyenda** para el regalo más caro (la foto de quien lo mandó con corona, su regalo, la rareza del regalo y los diamantes; al romperse el récord cae el sello "¡Nuevo récord!") y **MVP** para el Top taps y el Top regalos (el #1 en grande con su foto y corona, cuánto le falta al #2, y los demás con barras que muestran qué tan cerca van). Tamaño sugerido: Leyenda 600 × 300, MVP 440 × 590.

**Variantes del MVP** (el mismo diseño en otras formas, para Top taps y Top regalos): **Podio MVP** (los 3 primeros en tarjetas, el #1 en medio y más grande con corona; los demás abajo con barras), **Barra MVP** (horizontal, para arriba o abajo de la pantalla), **Mini MVP** (solo el #1 y cuánto le falta al #2, para una esquina) y **Columna MVP** (angosta, para un lado de la pantalla). Cada puesto tiene su color: #1 dorado, #2 morado y #3 aqua. Tamaño sugerido: Podio MVP 570 × 530, Barra MVP 1040 × 190, Mini MVP 430 × 200 y Columna MVP 290 × 610.

**Título:** en **Texto → Título** de cada overlay le pones el tamaño de letra en px (con − y + o escribiendo el número), el color y la tipografía. Vacío = el tamaño del estilo; **Color del estilo** y **Tamaño del estilo** lo regresan a como venía.

- **Regalo más caro:** Tarjeta, Banner (barra horizontal), Trofeo (vertical con corona, ideal para stream vertical), Neón, Minimal (solo texto), Burbuja (foto de quien lo mandó) Círculo y Cuadro (la foto de perfil y el regalo se van volteando como moneda; eliges cada cuántos segundos).
- **Top taps** y **Top regalos:** Lista, Podio (top 3 en escalones), Líder (solo el #1 en grande), Compacto, Neón, Cinta (barra que se desplaza, ideal abajo de la pantalla) y Bolitas (vertical: la foto de cada fan en un círculo con aro de color, y le salen corazones cuando da taps).

### Contador de tiempo (subathon)

En **Overlays → Contador de tiempo** pones el tiempo inicial y cuánto suma cada cosa: segundos por cada 💎 diamante, cada cierta cantidad de likes, por seguidor nuevo, por compartido, por Super Fan y por mensaje en el chat. Con números negativos **resta** tiempo. Desde ahí lo inicias, lo pausas, le sumas o quitas minutos a mano o lo fijas en un tiempo exacto. Puedes poner un tiempo máximo y elegir si suma aunque esté en pausa. Al sumar se ve en el overlay qué se sumó y quién lo hizo. Si cierras la app con el contador corriendo, sigue donde iba. Estilos: Digital, Barra y Compacto.

### Partidas · PUBG Mobile

En **Overlays → Partidas** llevas tus **pollos** (partidas ganadas) y **derrotas** con dos botones grandes: **🍗 Gané** y **💀 Perdí**. Al ganar sale "WINNER WINNER CHICKEN DINNER!" con pollos cayendo. Muestra la racha y el % de victorias, y puedes poner una meta de pollos. **Deshacer** quita la última, **Corregir** pone los números a mano. Estilos: Marcador (barra estilo PUBG), Pollo y Compacto.

Atajos que funcionan aunque estés en el juego (en la app de escritorio): **Ctrl+Alt+G** gané · **Ctrl+Alt+P** perdí · **Ctrl+Alt+Z** deshacer · **Ctrl+Alt+T** iniciar o pausar el contador de tiempo.

### Escena: todos tus overlays en un solo link

Para no llenar TikTok LIVE Studio de fuentes de navegador, en la pestaña **Escena** juntas varios overlays (alertas, regalo más caro, top taps, top regalos y chat) en **un solo link**:

1. Toca **＋ Crear mi escena** y elige **Horizontal** (1920 × 1080) o **Vertical** (1080 × 1920).
2. Agrega o quita overlays, arrástralos para acomodarlos y jala la esquina dorada para cambiar el tamaño de su espacio. Con **Tamaño del contenido** lo haces más grande o más chico. Se pegan solos a los bordes y al centro (mantén Alt para moverlos libremente).
3. Copia el **Link de la escena** y agrégalo como una sola fuente de navegador, del mismo tamaño que la escena.

Los cambios se ven al momento en tu stream, sin volver a copiar el link. El estilo y las animaciones de cada overlay se siguen eligiendo en **Overlays**. Puedes tener varias escenas (por ejemplo una horizontal y una vertical).

### Texto: tamaño, tipografía y color

En cada overlay de **Regalo más caro**, **Top taps** y **Top regalos** hay un bloque **Texto**. Ahí cambias, por separado, el nombre de quien mandó el regalo, el nombre del regalo y los diamantes (en los tops: los nombres y la cantidad):

- **Tipografía:** más de 20 para elegir (Bebas Neue, Anton, Bungee, Black Ops One, Bangers, Pacifico, Press Start 2P…), o "La del estilo".
- **Tamaño:** de 50% a 250%.
- **Color:** el que quieras, o vuelve al del estilo con **Color del estilo**.

### Animaciones

Cada overlay tiene su propio bloque **Animaciones** (se puede apagar con el interruptor):

- **Movimiento todo el tiempo:** Quieto, Brillo (un destello cruza la tarjeta), Borde de luz (borde de colores que gira), Flotar, Respirar, Balanceo y Destellos. El regalo más caro además tiene **Girar regalo**, y los rankings tienen **Ola** (los puestos se iluminan uno tras otro). En 3D: **Inclinar 3D** (se ladea como tarjeta bajo la luz, con reflejo), **Profundidad 3D** (se acerca y se aleja de la cámara) y **Girar 3D** (da una vuelta completa cada tantos segundos).
- **Al cambiar:** Pop, Deslizar, Zoom, Voltear, Sacudida, Giro 3D, Cubo 3D o Desde el fondo 3D. En el regalo más caro se ve cuando hay nuevo récord; en los rankings cuando alguien entra o sube de puesto.
- **Intensidad:** Suave, Normal o Fuerte.
- **Números que suben:** los taps y diamantes cuentan hacia arriba en lugar de saltar.
- **Resaltar a quien sube de puesto** (rankings): la fila brilla en verde con una flechita ▲, y las filas se reacomodan deslizándose.

Con **▶ Probar animación** ves en la vista previa cómo se vería un récord nuevo o alguien rebasando al primero.

**Opciones extra en el link** (se combinan con `&`):

- Alertas: `?escala=1.3`, `?posicion=arriba` / `abajo`, `?sonido=0` (la posición también la eliges en la pestaña **Alertas**, junto a la vista previa, y el link se arma solo), `?diseno=clasica`, `?efecto=fuego` (`luz`, `explosion`, `portal`, `fuego`, `relampago`, `neon` o `aleatorio`; manda sobre el efecto del panel, útil si tienes dos fuentes con efectos distintos)
- Top taps / top regalos: `?tipo=regalos`, `?estilo=podio` (o `mvp-podio`, `mvp-barra`, `mvp-mini`, `mvp-columna`), `?top=3`, `?titulo=Mis%20fans` (`?titulo=0` sin título), `?fondo=0` (sin caja), `?ancho=1200` (estilo Cinta), `?escala=1.2`, `?animacion=0` (sin animaciones)
- Regalo más caro: `?estilo=trofeo`, `?titulo=Rey%20del%20stream` (`?titulo=0` sin título), `?fondo=0`, `?escala=1.2`, `?ocultarVacio=1` (no se muestra hasta el primer regalo), `?cambio=4` (segundos entre foto y regalo, estilos Círculo y Cuadro), `?animacion=0`
- Chat: `?ocultar=30` (segundos; `0` = nunca), `?max=8`, `?regalos=0`, `?escala=1.2`

### Diseño de las alertas: Botín

Cada alerta sale con la **foto de quien te manda el regalo**, su **nombre** en grande, el regalo que mandó y **cuántos diamantes** (el número sube). El color dice qué tan grande es el regalo, como el botín de un juego:

- **¡Regalo!** (azul): menos de 100 💎
- **¡Épico!** (morado): desde 100 💎, con confeti
- **¡Legendario!** (dorado): desde 1,000 💎, con destello, temblor y lluvia de diamantes
- **¡Mítico!** (rojo): desde 10,000 💎, todo lo anterior en grande

Los seguidores, compartidos y subs de Kick también salen con su foto. Si alguien no tiene foto (o no carga), sale su inicial sobre un color. En la pestaña **Alertas**, junto a la vista previa, eliges **Botín** o **Clásica** (el diseño de antes). Las vistas previas usan fotos de ejemplo; en tu live sale la foto real de cada quien.

**Efecto** (junto a la vista previa; al tocar uno lo ves en la vista previa):

- **✨ Luz** (el de siempre): el botín cae del cielo con un rayo de luz.
- **💥 Explosión:** estalla en el centro con ondas de choque, las letras del nombre llegan volando de todos lados y siguen saliendo chispas.
- **🌀 Portal:** se abre un círculo mágico con anillos que giran y la foto sale girando de adentro.
- **🔥 Fuego:** la foto sube entre llamas del color de la alerta (azules, moradas, doradas o rojas).
- **⚡ Relámpago:** cae un rayo sobre la foto con destello y la foto queda electrizada.
- **💡 Neón:** se prende como letrero de neón, con parpadeo, y al final se apaga como tele vieja.
- **🎲 Al azar:** cada alerta con un efecto distinto.

Los efectos son del diseño Botín (si eliges uno estando en Clásica, se cambia a Botín).

### Qué alertas salen

En **Alertas → Qué alertas salen**: los regalos siempre salen, y prendes las demás que quieras:

- **💖 Nuevos seguidores** y **📢 Compartidos**.
- **⭐ Super Fans:** quien se suscribe a tu live de TikTok (así se llaman ahora las suscripciones), con sus meses si ya lleva varios. El bot también los puede leer (**Voz → Super Fans**, frase en **Frases → Super Fan**, con `{meses}`) y el contador de tiempo les suma lo que pongas.
- **❤️ Metas de likes:** cada vez que el live junta otra meta (5,000, 10,000, 15,000… o la que pongas en **Meta de likes cada**), sale quien dio el tap que llegó, con lluvia de corazones.
- **💰 Cofres:** quien suelta un cofre de diamantes, con cuántos diamantes y para cuántas personas. El color va con su tamaño, como los regalos.
- **👋 Bienvenidas:** quien entra a tu live, una vez por persona en cada live. Salen más chicas y rápidas, solo cuando no hay otra alerta, y cualquier regalo las corta para no atrasarse.

Para probarlas sin estar en vivo: **En vivo → Probar sin estar en vivo** (Super Fan, Meta de likes, Cofre y Bienvenida) o los botones de **Ver alerta de** junto a la vista previa.

### Sonidos de las alertas

En **Alertas → Sonido** cada alerta tiene su sonido y su volumen: regalo chico, épico, legendario, mítico, nuevo seguidor, compartido, Super Fan (y subs de Kick), meta de likes, cofre y bienvenida.

- **Incluidos:** Campana (la de siempre), Moneda, Fanfarria, Arcade, Láser, Tambores, Explosión, Magia, Latido, Burbuja o Sin sonido. Se generan en la app, no necesitan archivos.
- **Tuyos:** toca **Subir** en la alerta que quieras y elige un MP3, WAV u OGG. Se guarda en tu carpeta de datos (`media`) y queda en la lista para usarlo en otras alertas. Con la ✕ lo quitas de la lista.
- **▶** lo escuchas. El volumen de cada alerta va sobre el **Volumen general** (100% = igual que el general, hasta 150%).

Las alertas personalizadas con **El sonido de la alerta** usan el que elegiste aquí para ese tamaño de regalo.

### Probador de alertas

En la pestaña **Alertas** está el **Probador de alertas**: eliges si es regalo, seguidor o compartido, quién lo manda, qué regalo y cuántos. Te dice qué alerta va a salir (tu video/foto/GIF o la animación de siempre) y si tu mínimo de diamantes la dejaría fuera. Puedes verla en la vista previa, mandarla a tu stream (sale en OBS y el bot la lee, pero no cuenta para el ranking ni para el regalo más caro) o probar 5 seguidas para ver cómo se forman en fila.

### Alertas personalizadas (tu propio video, foto o GIF)

En la pestaña **Alertas**, sección **Alertas personalizadas**, toca **＋ Agregar video, foto o GIF** y elige:

- **Para un regalo:** escribe el nombre del regalo. Los regalos que ya te han mandado aparecen en la lista para elegirlos. Los más comunes funcionan en español o en inglés ("Rosa" o "Rose").
- **Desde cierta cantidad:** por ejemplo, "Desde 1,000 💎". Cuenta el total (precio × cantidad). Si hay varias, gana la más alta que alcance.
- **Tamaño:** Chico, Mediano, Grande o Pantalla completa.
- **Sonido:** el del video, el sonido de la alerta (el que elegiste en **Sonido** para ese tamaño de regalo) o sin sonido.
- **Segundos:** los videos duran lo que dure el video (hasta 60 s); las fotos y GIF usan los segundos de siempre, o los que pongas.

Si un regalo tiene alerta para él y además alcanza una cantidad, gana la del regalo. Lo que no tenga alerta propia usa la animación de siempre. Una alerta para un regalo se muestra aunque ese regalo cueste menos que el mínimo de diamantes. Formatos: MP4 o WEBM para video; GIF, PNG, JPG o WEBP para imagen. Los archivos se guardan en tu carpeta de datos (`media`).

## 5. El bot lector de chat

- Habla desde la ventana de StreamV2, aunque esté minimizada.
- Tu programa de streaming lo captura como **audio del escritorio**. Si no se escucha en el live, revisa que tengas la fuente "Audio del escritorio" activa.
- Puedes elegir qué leer (comentarios, regalos, seguidores, compartidos y Super Fans).

### Voces de Fish Audio

El bot lee con voces de **Fish Audio**, una biblioteca con miles de voces (narradores, personajes, anime, robots, abuelitas…).

1. Crea una cuenta en [fish.audio](https://fish.audio), copia tu **API key** en [fish.audio/app/api-keys](https://fish.audio/app/api-keys/) y pégala en **Voz** (la primera vez aparece una tarjeta para hacerlo). Se guarda solo en tu computadora (`config.json`); no la compartas.
2. Toca **Explorar voces**: busca por nombre o estilo, filtra por español o todos los idiomas, ordena por más usadas, mejor valoradas o nuevas, y escucha cada una con ▶. Toca **Agregar** para guardarla en **Tus voces**.
3. En cada voz, **Ajustar** te deja cambiarle el nombre, la **emoción** (emocionado, sarcástico, susurrando, gritando…), la **velocidad** y el **volumen**.

**Volumen de cada voz:** hay voces de Fish Audio que se escuchan más bajito que otras. Cada tarjeta de **Tus voces** tiene su barra 🔊 de 0 a **200%** (la rayita del centro es 100%). Con ▶ escuchas la muestra, y si mueves la barra mientras suena, cambia al momento. Toca el porcentaje para regresarla a 100%. Arriba de 100% el audio pasa por un limitador para que no truene.

**Quitar voces:** cada tarjeta tiene un bote 🗑 para quitarla de tus voces. Las voces que no tienen ningún uso dicen **Sin usar**, y con **Quitar las que no uso** (arriba a la derecha) las quitas todas de un jalón. Si te equivocas, toca **Deshacer** en el aviso de abajo y regresan con todo lo que tenían asignado. Quitar una voz solo la quita de la app, no de tu cuenta de Fish Audio.

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

**Volumen por tipo y por persona:** en **Voz → Qué se lee**, además del volumen general, cada cosa tiene su volumen: comentarios, regalos, regalos grandes, nuevos seguidores y compartidos. En **Voces por usuario** cada persona con voz especial tiene su propio volumen 🔊. Se multiplican junto con el volumen de cada voz: por ejemplo, general 80% y comentarios 50% suenan al 40%, y si esa voz está al 200%, al 80%.

**Solo seguidores:** en **Voz → Quién y qué no se lee**, prende **Solo seguidores** y el bot solo lee los comentarios de quien te sigue (tus moderadores también se leen). Los demás comentarios salen en el chat de "En vivo" marcados como *no te sigue*. Los regalos, follows y compartidos se siguen leyendo de todos. Para probarlo usa **Comentario (no te sigue)** en las pruebas.

**Pausa entre mensajes:** en **Voz → Ritmo** eliges cuántos segundos espera el bot después de leer un mensaje antes del siguiente (de 0 a 15). **Saltar** también corta la pausa.

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
