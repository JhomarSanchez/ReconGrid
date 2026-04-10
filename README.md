# ReconGrid App

ReconGrid es una aplicacion de escritorio construida con Electron para reconciliar datos tabulares, comparar workbooks de Excel y generar archivos de salida auditables.

![Vista general de ReconGrid](../docs/assets/recongrid-overview.svg)

## Flujos visibles
- Comparacion entre dos archivos Excel.
- Comparacion de columnas dentro de una misma hoja.

## Capacidades principales
- configuracion explicita de hoja, fila de encabezados y columnas;
- matching flexible de identificadores con indices en memoria;
- comparacion interna con columna de veredicto;
- exportacion de resultados en Excel;
- progreso visible y mensajes de error mas claros durante cargas largas.

## Arquitectura
- `presentation/`: vistas HTML, scripts del renderer y controladores.
- `domain/`: entidades y casos de uso.
- `data/`: repositorios y servicios de lectura y escritura.
- `infrastructure/`: configuraciones y componentes auxiliares heredados.

## Comandos
```bash
npm start
npm run start:large
npm test
npm run bench:matching
npm run dist:win
npm run dist:mac
```

## Desarrollo local
```bash
npm install
npm start
```

## Documentacion relacionada
- [Motor de matching](../docs/matching-engine.md)
- [Deuda tecnica](../docs/technical-debt.md)
- [Checklist de release](../docs/release-checklist.md)
