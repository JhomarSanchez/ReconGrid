# Osiris

Osiris is a desktop application built with Electron for high-volume Excel processing. It is designed for operational teams that need more control, repeatability, and speed than spreadsheet-only workflows typically provide.

The application focuses on three core scenarios:

- catalog normalization from semi-structured strings;
- cross-workbook comparison and data extraction;
- in-sheet column comparison with result generation.

Unlike a manual Excel workflow, Osiris turns these tasks into deterministic application flows with explicit configuration, controlled parsing, indexed lookups, progress reporting, and exportable outputs.

## Why This Project Exists

In many business environments, Excel is used as both a data source and a processing engine. That works up to a point, but it becomes fragile when the workload grows in any of these ways:

- large row counts;
- inconsistent identifier formatting;
- repeated manual preprocessing;
- multiple files that must be reconciled;
- catalog-like text that needs to be parsed into structured fields.

Osiris addresses those problems by moving the heavy lifting into application code while preserving Excel as the input and output format.

## Core Product Capabilities

### 1. Semi-Structured Parsing

This mode processes workbooks that contain semi-structured catalog strings and turns them into structured records.

Depending on the source format, the parser can extract structured attributes and preserve additional business columns from the original row.

It also keeps row-level error details for entries that cannot be parsed cleanly, which is an important operational feature for data quality review.

### 2. Workbook-to-Workbook Comparison and Extraction

This mode compares a source Excel file against a target Excel file after the user configures:

- worksheet;
- header row;
- search columns;
- output data columns.

The output keeps every source row and appends matching target-side data when a match exists.

### 3. Internal Column Comparison

This mode compares two columns within the same worksheet and creates a new output file that includes:

- the original row data;
- a comparison result column;
- aggregate counts for equal vs different values.

## Software Architecture

The project is organized in layered form to keep business logic separate from UI and I/O concerns:

- `presentation/`: HTML views, renderer scripts, and UI controllers.
- `domain/`: entities and use cases that represent business rules.
- `data/`: repository implementations and Excel reader/writer services.
- `infrastructure/`: parsers and supporting configuration artifacts.
- `assets/` and `build-resources/`: application icons and packaging resources.

This is a practical, maintainable separation:

- UI concerns stay in Electron views and controllers.
- comparison and parsing rules live in domain/use-case code;
- Excel file handling is abstracted behind repository and service layers;
- packaging remains isolated from runtime logic.

## Technical Design Highlights

### Indexed Comparison Engine

The main comparison workflow is not implemented as a naive row-by-row nested scan.

Instead, the target workbook is pre-indexed into multiple `Map`-based lookup tables:

- exact code index;
- normalized code index;
- compact code index;
- slash-variation index.

This enables the engine to support matching patterns such as:

- `ABC-123` -> `ABC 123`
- `ABC-123-D` -> `ABC123D`
- `ABC-123` -> `ABC/123`
- `ABC-123` -> `ABC\123`

The comparison pipeline then works like this:

1. Read all target rows.
2. Build search indices once.
3. Read source rows.
4. For each source row, derive candidate search keys.
5. Resolve matches through constant-time hash-map lookups instead of repeatedly scanning the full target sheet.

### Duplicate-Aware Processing

The engine hashes complete source rows and keeps a processed-code cache to skip true duplicate rows during the comparison phase. This reduces redundant work in files that contain repeated records.

### Adaptive Excel Reading Strategy

The reader service chooses different loading paths depending on file size:

- standard workbook loading for smaller files;
- stream-based reading for larger files;
- selective preview and worksheet metadata extraction when a full load would be unnecessarily expensive.

This is paired with:

- raised Node/Electron heap limits;
- batch-style row processing;
- periodic event loop yielding;
- optional manual garbage collection in large-run mode.

### Export as a First-Class Output

Results are not just shown on screen. The application generates new Excel files with:

- explicit headers;
- preserved row ordering;
- result-side styling;
- autosized columns;
- separate flows for cross-file and internal comparison outputs.

## Comparison Algorithm Deep Dive

The most important engineering advantage in Osiris is the comparison strategy.

### Naive Spreadsheet-Style Exact Match

A classic exact-match `VLOOKUP` or `BUSCARV` workflow is often used like this:

- for each source row,
- scan the target table until the requested code is found,
- repeat that search for every source row.

For unsorted exact-match search, that is effectively a repeated linear scan. In complexity terms, it behaves like:

```text
O(S * T)
```

Where:

- `S` = number of source rows;
- `T` = number of target rows.

If each row can contain multiple candidate codes, the practical workload gets even larger.

### Osiris Strategy

Osiris converts the target dataset into hash-map indices first, then performs direct lookups:

```text
Index build: O(T)
Lookups:     O(S)
Total:       O(S + T)
```

This is the core reason the application scales far better than a spreadsheet formula workflow for exact-match reconciliation.

### Why the "2380x Faster Than VLOOKUP" Claim Can Make Sense

The exact wall-clock multiplier depends on:

- workbook size;
- number of search columns;
- code normalization cost;
- hardware;
- Excel recalculation overhead;
- file I/O and memory pressure.

So, an exact universal claim would be bad engineering. However, the order-of-magnitude argument is solid.

Example:

- source rows: `6,000`
- target rows: `4,000`
- naive exact-match scan: up to `24,000,000` row comparisons
- indexed approach: about `10,000` primary row passes before normalization overhead

That is roughly:

```text
24,000,000 / 10,000 = 2,400x
```

So a statement such as "around 2,380x more efficient than an exact-match spreadsheet scan" is plausible as an algorithmic and benchmark-scale claim for mid-sized workloads, but it should be presented as:

- workload-dependent;
- based on exact-match scan behavior;
- not a universal guarantee for every workbook.

### Practical Performance Notes

In addition to asymptotic gains, Osiris improves real execution time because:

- the target file is indexed once, not scanned repeatedly;
- flexible normalization rules are pre-structured into multiple lookup paths;
- duplicate work is skipped when the source contains repeated identical rows;
- the workflow runs in application memory rather than as thousands of spreadsheet formula evaluations.

## Engineering Considerations

### Time Complexity

- Cross-file comparison: optimized from repeated scan behavior toward indexed lookup behavior.
- Semi-structured parsing: linear with respect to processed rows, plus regex parsing cost per parsed cell.
- Internal comparison: linear with respect to worksheet rows.

### Space Complexity

The comparison engine intentionally trades memory for speed:

- all relevant rows are materialized into application objects;
- multiple indices are built for the target workbook;
- result rows are retained before export.

That is a reasonable design choice for desktop batch processing because it dramatically reduces repeated search work, but it also means very large files can still be memory-intensive.

### Data Normalization Strategy

The comparison use case normalizes codes into several representations:

- raw exact form;
- hyphen-to-space form;
- compact form without separators;
- slash and backslash variants.

This is a practical approach for real operational data, where the same identifier often appears in inconsistent human-entered formats.

### Error Handling

The project includes explicit handling for:

- invalid or missing files;
- large-file memory pressure;
- worksheet access errors;
- row-level parsing failures;
- IPC-level operation failures during UI flows.

### User Experience for Long-Running Jobs

The application reports progress back to the renderer during heavy operations. This matters in desktop processing tools because perceived responsiveness is part of system quality, not just raw throughput.

## Repository Structure

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

## Runtime and Packaging

The application is packaged with `electron-builder` and currently includes:

- Windows x64 installer via NSIS;
- Windows x64 portable build;
- macOS arm64 package output;
- dedicated icons and packaging resources in `build-resources/`.

Build metadata is configured directly in `package.json`.

## Technology Stack

- Electron
- Electron Builder
- ExcelJS
- Bootstrap 5
- JavaScript CommonJS

## Requirements

Recommended environment:

- Node.js LTS
- npm
- Windows or macOS for native packaging workflows

## Installation

```bash
npm install
```

## Development

Start the application:

```bash
npm start
```

For heavier workloads:

```bash
npm run start:large
```

## Available Scripts

| Script | Purpose |
| --- | --- |
| `npm start` | Starts the Electron application with the standard memory configuration. |
| `npm run start:large` | Starts the app with a larger memory budget for heavier Excel workloads. |
| `npm run dist` | Builds distributable application packages. |
| `npm run dist:win` | Builds Windows packages. |
| `npm run dist:mac` | Builds macOS packages. |

## Current Technical Trade-Offs

From a software engineering perspective, these are the most relevant current trade-offs in the codebase:

- The comparison engine is well optimized algorithmically, but it still materializes full row collections in memory.
- The project is strong in operational functionality, but it does not yet include an automated test suite.
- The Electron application is optimized for internal utility workflows rather than hardened distribution security.
- Packaging is already defined, which is a strong sign of product maturity compared with many internal-only tools.

## Recommended Next Engineering Steps

If this application is expected to grow or be maintained by a broader engineering team, the highest-value next steps would be:

- add unit tests for comparison and parsing use cases;
- add reproducible benchmark fixtures and publish measured performance baselines;
- move Electron renderer access toward a preload-based IPC boundary;
- introduce structured logging levels for operational diagnostics;
- document representative sample datasets for each workflow.

## License

This project is licensed under `ISC`, as defined in `package.json`.
