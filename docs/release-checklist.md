# Release Checklist

## Before packaging
1. Run `npm test`.
2. Run `npm run bench:matching`.
3. Review visible branding and artifact names.
4. Confirm that the project README is current.

## Packaging
1. Run `npm run dist:win`.
2. Run `npm run dist:linux`.
3. Run `npm run dist:mac`.
4. Verify that generated artifacts use the `ReconGrid` name.

## Final review
1. Open the packaged app and check the product name.
2. Confirm there are no inherited naming traces in installers, shortcuts, or screens.
3. Validate that the export file is generated correctly.
