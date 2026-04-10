# Matching Engine

## Overview
ReconGrid compares records across two Excel files by building an in-memory index for the target file, avoiding repeated full scans during matching.

## Resolution order
1. Exact match.
2. Hyphen-to-space normalized match.
3. Compact match without hyphens or spaces.
4. Slash-variation match.

## Examples
- `ABC-123` can match `ABC 123`
- `ABC-123` can match `ABC123`
- `ABC-123` can match `ABC/123`

## Operational notes
- Every source row is preserved in the final output.
- The engine skips only true duplicates when a repeated row has identical full-row content.
- The final result is always exported into a newly generated Excel file.
