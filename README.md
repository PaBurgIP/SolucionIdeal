<!-- Author: Pablo Ib | Last modified by: Pablo Ib -->
# Distancia al ideal

Aplicación local en español para experimentar con la distancia a la solución ideal de **3 alternativas y 3 criterios**, con un gráfico 3D que puedes girar, ampliar y desplazar. Autor y última modificación por: **Pablo Ib**.

## Abrir la aplicación

Haz doble clic en **index.html**. No requiere instalación, conexión a Internet ni cuenta. Conserva todos los archivos de esta carpeta juntos.

Si prefieres un servidor local y tienes Node.js: ejecuta `npm start` en esta carpeta y abre http://127.0.0.1:4173. `npm test` ejecuta las pruebas matemáticas. No es necesario ejecutar `npm install`.

## Experimentar

1. Mueve los pesos de eficacia, sostenibilidad y viabilidad. El porcentaje visible es el peso efectivo, normalizado para sumar el 100 %. El número pequeño es el valor del deslizador.
2. Modifica cualquiera de los 9 valores con su deslizador. Todos usan escala 0–100; puedes usar las flechas del teclado para afinar.
3. Cambia el sentido de cada criterio: maximizar o minimizar.
4. Elige un ideal de escala fijo (100 al maximizar, 0 al minimizar) o el vector formado por el mejor valor observado de cada criterio.
5. Explora el parámetro p: 1 = Manhattan ponderada; 2 = euclídea ponderada; valores mayores dan más influencia a las desviaciones grandes.
6. Guarda un estado de inicio y otro final. El time slider interpola sus valores, pesos y p. El botón de reproducción recorre la transición durante 12 segundos (o el tiempo restante si se reanuda). El sentido de los criterios y el modo de ideal se mantienen como estén seleccionados en ese momento.
7. Exporta e importa experimentos como JSON. Incluyen ambos estados temporales y los metadatos de autor y último editor. El autoguardado local depende de la configuración del navegador.

El gráfico se controla así:

- Arrastra con el ratón para girar la vista 3D.
- Usa la rueda o los botones + y − para ampliar o reducir.
- Mantén Mayús y arrastra para desplazar la vista.
- En pantalla táctil, un dedo gira y dos dedos amplían o desplazan.
- Con el gráfico enfocado, las flechas giran; Mayús + flechas desplaza; +/− amplía y reduce; Inicio centra.
- El botón «Centrar vista» o un doble clic restablecen la cámara. Los cambios de sliders conservan la orientación elegida.

Selecciona A–C en la leyenda, o pulsa su punto, para resaltar una alternativa. La tabla contiene los valores y las distancias para consultar el resultado sin depender del gráfico o de los colores.

## Datos de ejemplo

| Alternativa | Eficacia | Sostenibilidad | Viabilidad |
| --- | ---: | ---: | ---: |
| A | 88 | 52 | 46 |
| B | 61 | 91 | 58 |
| C | 56 | 62 | 94 |

Todos los criterios se maximizan al abrir el ejemplo original. Pesos iniciales: 34, 33 y 33; p = 2.

Ninguna alternativa coincide con el ideal fijo (100, 100, 100), ni con el ideal observado (88, 91, 94). La mejor alternativa inicial es B. A, B y C pasan a ser las más cercanas al priorizar exclusivamente eficacia, sostenibilidad y viabilidad, respectivamente.

## Método

`d_p(i) = (sum_j [w_j * (abs(x_ij - z*_j) / 100)^p])^(1/p)`

`w_j = peso_j / suma_de_pesos`

Normalizamos las desviaciones dividiendo por el rango fijo 100. Los pesos se aplican a las potencias de las desviaciones. Por tanto, p=2 corresponde a `sqrt(sum_j w_j * delta_ij^2)`, equivalente a escalar las coordenadas con `sqrt(w_j)`. No se aplica `sqrt(sum_j (w_j * delta_ij)^2)`.

Las distancias están entre 0 y 1: menor es mejor. Las barras usan esa escala fija, no una escala relativa al peor resultado de cada momento. Los empates comparten posición (1, 1, 3…). Si todos los pesos son cero, no se muestra una clasificación. Un criterio de peso cero no contribuye a la distancia, de modo que distancia cero no implica siempre coincidencia en los tres criterios.

El gráfico 3D muestra las alternativas A, B y C como puntos y el ideal como un rombo. Cada coordenada es el valor orientado (100 − valor si se minimiza), dividido entre 100 y multiplicado por `w_j^(1/p)`. La distancia de orden p en este espacio coincide con el cálculo; con p=2, es la longitud del segmento recto. Con otros p, se usan las distancias numéricas indicadas. El ideal observado cambia con la matriz; el ideal fijo no. El time slider interpola los pesos brutos y después los normaliza, así como los 9 valores y p; calcula de nuevo las distancias en cada instante, sin interpolar directamente los resultados o las posiciones.

Este es un experimento de distancia al ideal positivo, no un cálculo del índice de cercanía TOPSIS. Los datos son ilustrativos y las preferencias elegidas determinan la clasificación.

## Archivos

- `index.html`, `styles.css`, `app.js`, `model.js`, `graph.js`, `favicon.svg`: aplicación completa, sin dependencias externas.
- `model.test.cjs` y `graph.test.cjs`: pruebas del cálculo, la geometría ponderada, la proyección, los límites, los empates, la interpolación, la migración y los metadatos exportados.
- `serve.cjs`, `package.json`: herramientas opcionales para desarrollo local.

## GitHub Pages (opcional)

Para publicarla posteriormente, sube los archivos a un repositorio de tu GitHub y selecciona **Settings → Pages → Deploy from a branch → main → / (root)**. No hay compilación ni claves que configurar.

La carpeta entregada no se ha subido a GitHub: el destino final solicitado ha sido el Escritorio.

Los escenarios exportados por la primera versión con cinco alternativas se pueden importar: se conservan las alternativas A, B y C, también en los estados temporales. Las nuevas exportaciones usan el formato 2 y contienen exactamente tres alternativas.
