# VIA SMART · prototipo visual de gestión del tráfico urbano

Aplicación web multipágina (HTML5, CSS3 y JavaScript puro) que simula un centro de control de tráfico.
**Todos los datos son ficticios.** No hay backend, base de datos, APIs, sensores, cámaras ni IA reales.

## Cómo ejecutarlo
1. Descomprime la carpeta `via-smart/`.
2. Abre `login.html` en el navegador (doble clic) o sirve la carpeta con cualquier servidor estático:
   `python -m http.server 8000` y entra a `http://localhost:8000/login.html`.
3. Acceso de demostración: usuario `operador` · contraseña `via2026`.

Requiere Internet solo para las bibliotecas opcionales por CDN (Chart.js, Lucide) y la fuente Inter.
La estructura, la navegación y los datos no dependen de ellas.

## Estructura
- `*.html`: una página por módulo (dashboard, intersecciones, detalle, cámaras, análisis, predicciones, incidencias, reportes, configuración, login).
- `css/styles.css`: estilos compartidos con variables CSS (colores, espacios, tema claro/oscuro).
- `js/data.js`: **todos** los datos simulados + capa `service` (punto único para conectar una API en el futuro).
- `js/common.js`: barra lateral/superior, preferencias, reloj, simulación moderada, insignias, modales y gráficos.
- `js/<página>.js`: lógica específica de cada página.

## Notas
- `VS.requireLogin` (en `common.js`) controla si las páginas internas exigen pasar por el login; ponlo en `false` para abrirlas directamente.
- La marca del login es `NEXUS TRAFFIC` (`loginBrand` en `data.js`); el resto de la aplicación usa `VIA SMART`.
- Las incidencias modificadas se guardan en `sessionStorage`; las preferencias, en `localStorage`.
