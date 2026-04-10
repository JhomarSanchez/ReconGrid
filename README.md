# ReconGrid App

ReconGrid is an Electron desktop application for spreadsheet reconciliation, workbook comparison, and auditable Excel exports.

![ReconGrid overview](docs/assets/recongrid-overview.svg)

## Visible workflows
- Compare two Excel files.
- Compare two columns within the same worksheet.

## Core capabilities
- Explicit worksheet, header-row, and column configuration.
- Flexible identifier matching backed by in-memory indexes.
- Internal comparison output with a verdict column.
- Excel export as the final operational artifact.
- Clearer progress and error feedback during long-running jobs.

## Architecture
- `presentation/`: HTML views, renderer scripts, and UI controllers.
- `domain/`: entities and use cases.
- `data/`: repositories plus Excel read/write services.
- `infrastructure/`: auxiliary configuration and inherited support modules.

## Commands
```bash
npm start
npm run start:large
npm test
npm run bench:matching
npm run dist:win
npm run dist:linux
npm run dist:mac
```

## Local development
```bash
npm install
npm start
```

## Public project docs
- [Matching engine](docs/matching-engine.md)
- [Release checklist](docs/release-checklist.md)
