# ReconGrid

ReconGrid es una aplicacion de escritorio construida con Electron para reconciliacion de hojas de calculo, comparacion de archivos Excel y generacion de salidas auditables.

El producto se concentra en dos flujos visibles:

- comparacion entre dos archivos Excel;
- comparacion de columnas dentro de una misma hoja.

La normalizacion flexible de identificadores forma parte del motor de comparacion entre archivos, no de un modulo separado en la experiencia publica.

## Propuesta de valor

ReconGrid traslada trabajo manual de Excel a flujos controlados por aplicacion:

- configuracion explicita de hojas, encabezados y columnas;
- reconciliacion entre datasets tabulares;
- normalizacion flexible de identificadores;
- procesamiento orientado a archivos grandes;
- exportacion de resultados reutilizables;
- trazabilidad para revisiones operativas.

## Capacidades principales

### 1. Comparacion entre archivos

Permite configurar un archivo base y un archivo de contraste para cruzar registros. El usuario define:

- hoja;
- fila de encabezados;
- columnas de busqueda;
- columnas de datos a anexar.

El resultado conserva las filas del archivo base y agrega los datos coincidentes del segundo archivo cuando encuentra match.

### 2. Comparacion interna de columnas

Compara dos columnas dentro de una misma hoja y genera un archivo nuevo con:

- los datos originales;
- una columna de veredicto;
- conteos agregados de coincidencias y diferencias.

## Arquitectura

El proyecto mantiene una arquitectura por capas:

- `presentation/`: vistas HTML, scripts del renderer y controladores de UI.
- `domain/`: entidades y casos de uso.
- `data/`: repositorios y servicios de lectura/escritura.
- `infrastructure/`: parsers, configuraciones y detalles tecnicos de soporte.

Esta separacion permite mantener la logica de negocio fuera de la UI y deja el procesamiento de Excel encapsulado en casos de uso y servicios.

## Aspectos tecnicos destacados

### Motor de comparacion indexado

La comparacion principal no hace escaneos completos repetidos sobre el archivo objetivo. Primero construye indices basados en `Map` y luego resuelve busquedas con acceso directo.

Esto permite manejar variaciones frecuentes de identificadores, por ejemplo:

- `ABC-123` -> `ABC 123`
- `ABC-123-D` -> `ABC123D`
- `ABC-123` -> `ABC/123`
- `ABC-123` -> `ABC\123`

### Estrategia de lectura adaptativa

El sistema elige diferentes rutas de carga segun el tamano del archivo:

- carga estandar para libros pequenos;
- lectura optimizada para archivos grandes;
- previews parciales cuando no conviene cargar todo el workbook.

### Exportacion como salida principal

ReconGrid no se limita a mostrar resultados en pantalla. Genera nuevos archivos Excel con:

- encabezados claros;
- orden consistente;
- columnas ajustadas;
- resultados listos para revision o entrega.

## Estructura del proyecto

```text
alter-osiris/
|-- index.js
|-- index.html
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
    |-- controllers/
    |-- scripts/
    `-- views/
```

## Stack

- Electron
- electron-builder
- ExcelJS
- Bootstrap 5
- JavaScript CommonJS

## Scripts disponibles

| Script | Proposito |
| --- | --- |
| `npm start` | Inicia la aplicacion con configuracion estandar de memoria. |
| `npm run start:large` | Inicia la app con mayor presupuesto de memoria para cargas pesadas. |
| `npm run dist` | Genera paquetes distribuibles. |
| `npm run dist:win` | Genera paquetes para Windows. |
| `npm run dist:mac` | Genera paquetes para macOS. |

## Instalacion

```bash
npm install
```

## Desarrollo

```bash
npm start
```

Para cargas mas exigentes:

```bash
npm run start:large
```

## Siguientes pasos tecnicos

- ampliar cobertura de pruebas para casos de uso criticos;
- documentar reglas de matching y fixtures de benchmark;
- endurecer la frontera IPC en Electron;
- mejorar logging y diagnostico operativo.
