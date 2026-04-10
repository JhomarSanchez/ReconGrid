# ReconGrid App

ReconGrid is an Electron desktop application for spreadsheet reconciliation, workbook comparison, and auditable Excel exports.

![ReconGrid overview](docs/assets/recongrid-overview.svg)

## Usage Notice

This repository is publicly visible strictly for portfolio, technical evaluation, and recruitment review.

The source code is proprietary and not open source.

No permission is granted to use, copy, modify, redistribute, sublicense, train on, republish, commercialize, or create derivative works from this software, in whole or in part, without prior explicit written permission from the author.

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
