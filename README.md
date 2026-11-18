<!-- Author: Pablo Ib | Last modified by: Pablo Ib -->
# Ideal y antiideal

Aplicación local para comparar **3 alternativas y 3 factores de riesgo**, con pesos porcentuales, matrices separadas y un gráfico 3D interactivo. Autor y última modificación por: **Pablo Ib**.

## Abrir

Haz doble clic en **index.html**. No requiere instalación, conexión a Internet ni cuenta. Mantén juntos los archivos de la carpeta.

Con Node.js puedes ejecutar `npm start` y abrir http://127.0.0.1:4173. `npm test` ejecuta las pruebas; no hace falta instalar dependencias.

## Usar

- El editor se encuentra junto al gráfico en pantallas grandes. En pantallas estrechas aparece encima.
- Los factores se llaman por defecto **Temperaturas**, **Humedales** y **DiFLUsion**. Sus nombres se pueden editar y se actualizan en los ejes, las tablas y las etiquetas accesibles.
- Escribe el peso de cada factor en porcentaje (de 0 a 100). Los porcentajes se aplican directamente: **20 % multiplica por 0,2**, incluso si el total no suma 100 %. La suma visible ayuda a comprobar la distribución.
- Cambia los valores de cada alternativa con los deslizadores o los campos numéricos. La escala es 0–100. Los campos numéricos vacíos o fuera de rango recuperan el último valor válido al perder el foco.
- Selecciona si más o menos es mejor para cada factor. El ideal combina los mejores valores observados; el antiideal, los peores. Las referencias cambian al editar la matriz o el sentido.
- Debajo del gráfico se conserva la clasificación por distancia al ideal, con columnas para las distancias al ideal y al antiideal. Los empates comparten posición (1, 1, 3).
- Las matrices normalizada y ponderada se muestran por separado, con sus respectivos vectores ideal y antiideal.
- Los cambios se guardan en el navegador cuando su configuración lo permite. Restablecer recupera el ejemplo original. Los datos guardados por versiones anteriores se migran conservando sus valores, sentidos y porcentajes efectivos; el método de cálculo pasa al nuevo.

El panel lateral de prioridades, el selector de ideal, el parámetro de distancia, la exploración temporal, la explicación desplegable y los controles de importación/exportación se han retirado.

## Cálculo

Para cada valor de la matriz original:

`n_ij = x_ij / 100`

`w_j = porcentaje_j / 100`

`v_ij = n_ij * w_j`

El ideal y el antiideal se forman con el mejor y el peor valor de cada columna, según el sentido elegido, y reciben exactamente la misma normalización y ponderación.

La distancia es siempre euclídea:

`d_ideal(i) = sqrt(sum_j (v_ij - ideal_ponderado_j)^2)`

`d_antiideal(i) = sqrt(sum_j (v_ij - antiideal_ponderado_j)^2)`

No se reajustan los pesos por su suma ni se aplican después de elevar las desviaciones al cuadrado. Por ejemplo, el valor 80 con peso 25 % da 0,8 en la matriz normalizada y 0,2 en la ponderada.

Un peso cero excluye el factor de ambas distancias. Con todos los pesos a cero las matrices siguen disponibles, pero no se muestran distancias ni clasificación. Distancia cero indica coincidencia en los factores activos; puede haber diferencias en los de peso cero. La cota máxima de ambas distancias es `sqrt(sum_j w_j^2)`: no se afirma que estén siempre entre 0 y 1 si los porcentajes no suman 100.

Se calculan ambas distancias; no se añade un índice de cercanía TOPSIS.

## Gráfico

Las coordenadas coinciden con la matriz ponderada. Se muestran los puntos y sus nombres, incluidos ideal (rombo verde) y antiideal (rombo de contorno ocre). No hay segmentos de distancia ni distancias en las etiquetas o sus títulos. Las cifras de los ejes son coordenadas ponderadas.

- Arrastra para girar y usa la rueda o los botones para ampliar.
- Mayús + arrastrar desplaza.
- En pantalla táctil, un dedo gira y dos dedos amplían o desplazan.
- Con el gráfico enfocado, las flechas giran; Mayús + flechas desplaza; +/− amplía; Inicio centra.
- Centrar vista o un doble clic restablece la cámara.
- Selecciona una alternativa en su punto o leyenda para resaltarla.

Los valores ilustrativos iniciales son A=(88,52,46), B=(61,91,58), C=(56,62,94), con pesos 34 %, 33 % y 33 %, y los tres sentidos en maximización.

## Archivos

La app usa index.html, styles.css, app.js, model.js, graph.js y favicon.svg, sin dependencias externas. model.test.cjs, graph.test.cjs y app.test.cjs comprueban las fórmulas, ambas referencias, porcentajes literales, casos límite, migración, metadatos, geometría y eventos de los controles. Las pruebas de eventos usan un DOM mínimo simulado: no sustituyen una revisión visual en navegador. ejemplo-escenario.json documenta el estado de ejemplo y su autoría; no hay un control de importación en la interfaz.

Para publicar en GitHub Pages posteriormente, sube los archivos y selecciona Settings → Pages → Deploy from a branch → main → / (root). No hace falta compilación. Estos cambios son locales; no publican la app.

