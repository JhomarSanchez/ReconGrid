# Osiris

Aplicacion de escritorio construida con Electron para procesar archivos Excel en flujos operativos orientados a catalogacion, comparacion y extraccion de datos. El proyecto esta pensado para equipos que trabajan con volumenes altos de informacion tabular y necesitan una herramienta visual para configurar hojas, columnas, reglas de busqueda y exportacion de resultados.

## Vision general

Osiris centraliza tres necesidades frecuentes en operaciones con Excel:

- Catalogar datos de vehiculos a partir de columnas con texto semiestructurado.
- Comparar dos archivos Excel para detectar coincidencias y generar un archivo consolidado.
- Comparar dos columnas dentro de una misma hoja y marcar concordancias o diferencias.

La aplicacion corre como cliente de escritorio y empaqueta sus distribuciones con `electron-builder`, incluyendo objetivos para Windows y macOS.

## Capacidades principales

### 1. Catalogacion de datos

Permite procesar una o varias hojas de Excel que contienen descripciones de vehiculos en un formato compacto, por ejemplo:

```text
RENAULT-12(1970,1990); RENAULT-18 GTL (1978-1981)
```

El flujo:

- valida archivos, hojas y columnas antes del procesamiento;
- interpreta marca, modelo y anos desde una columna catalogo;
- genera una salida estructurada en Excel;
- conserva detalles de error para filas que no pudieron procesarse.

### 2. Comparacion y extraccion entre archivos

Permite comparar un archivo origen contra un archivo objetivo configurando:

- hoja de trabajo;
- fila de encabezados;
- columnas de busqueda;
- columnas de datos a exportar.

La comparacion no depende solo de coincidencias literales. El motor incorpora normalizaciones para encontrar codigos equivalentes con variaciones como:

- guiones convertidos en espacios;
- codigos compactados sin espacios;
- reemplazos por `/`, `//`, `\` y `\\`.

Tambien evita reprocesar filas duplicadas reales y mantiene resultados cacheados mientras el flujo siga activo.

### 3. Comparacion interna de columnas

Permite comparar dos columnas dentro de una misma hoja y generar una nueva salida con:

- los datos originales de cada fila;
- el resultado de la comparacion (`IGUALES` o `DIFERENTES`);
- estadisticas de coincidencias y diferencias.

## Arquitectura

El proyecto sigue una separacion por capas que ayuda a mantener responsabilidades claras:

- `presentation/`: vistas HTML, scripts del renderer y controladores de interfaz.
- `domain/`: entidades y casos de uso del negocio.
- `data/`: repositorios e implementaciones de lectura/escritura Excel.
- `infrastructure/`: configuraciones y parseadores especializados.
- `assets/` y `build-resources/`: iconos y recursos de empaquetado.

Esta organizacion facilita extender el comportamiento del dominio sin mezclarlo con la UI o con detalles de infraestructura.

## Estructura del proyecto

```text
alter-osiris/
|-- index.js
|-- index.html
|-- package.json
|-- assets/
|-- build-resources/
|-- data/
|   |-- repositories/
|   `-- services/
|-- domain/
|   |-- entities/
|   |-- repositories/
|   `-- usecases/
|-- infrastructure/
|   |-- config/
|   `-- parsers/
`-- presentation/
    |-- assets/
    |-- controllers/
    |-- scripts/
    `-- views/
```

## Stack tecnico

- Electron
- Electron Builder
- ExcelJS
- Bootstrap 5
- JavaScript CommonJS

## Requisitos

Para trabajar en desarrollo se recomienda contar con:

- Node.js en una version LTS reciente
- npm
- Windows o macOS si se desea empaquetar instaladores nativos

## Instalacion

```bash
npm install
```

## Ejecucion en desarrollo

```bash
npm start
```

Para escenarios con archivos mas pesados tambien existe:

```bash
npm run start:large
```

Ese script aumenta el limite de memoria y habilita `gc` explicito para ayudar en procesos de mayor volumen.

## Scripts disponibles

| Script | Descripcion |
| --- | --- |
| `npm start` | Inicia la aplicacion Electron con configuracion base de memoria. |
| `npm run start:large` | Inicia la app con mas memoria disponible para archivos grandes. |
| `npm run dist` | Genera artefactos de distribucion segun la configuracion de `electron-builder`. |
| `npm run dist:win` | Genera builds para Windows. |
| `npm run dist:mac` | Genera builds para macOS. |

## Distribucion y empaquetado

La configuracion de build definida en `package.json` contempla:

- `productName`: `Osiris`
- `appId`: `com.castelmotors.osiris`
- salida en `dist/`
- instalador NSIS y version portable para Windows x64
- paquete `pkg` para macOS arm64
- inclusion de iconos y recursos extra desde `assets/`

## Flujo funcional resumido

### Comparacion entre archivos

1. Seleccionar ambos archivos Excel.
2. Configurar hoja, fila de encabezados y columnas relevantes.
3. Ejecutar la comparacion.
4. Exportar el archivo resultante.

### Catalogacion

1. Seleccionar uno o varios archivos.
2. Elegir la hoja y la columna catalogo a procesar.
3. Ejecutar el parser.
4. Revisar errores y exportar resultados.

### Comparacion interna

1. Seleccionar un archivo y una hoja.
2. Elegir fila de encabezados y columnas a comparar.
3. Ejecutar la comparacion.
4. Exportar la nueva hoja con el resultado.

## Consideraciones tecnicas

- La aplicacion incluye optimizaciones de memoria para procesar archivos grandes.
- Parte del flujo usa progreso incremental para informar el avance al renderer.
- El estado de algunos procesos se conserva temporalmente en memoria para evitar recomputos innecesarios.
- El script `npm test` aun no esta implementado; hoy no existe una suite automatizada de pruebas en el repositorio.

## Oportunidades de mejora

- Incorporar pruebas unitarias para casos de uso y parseadores.
- Agregar validaciones mas estrictas para formatos de entrada.
- Documentar ejemplos reales de archivos esperados por cada modo.
- Separar mas la logica IPC del arranque principal de Electron a medida que crezca la app.

## Licencia

Este proyecto usa la licencia `ISC`, segun `package.json`.
