# Release Checklist

## Antes de empaquetar
1. Ejecutar `npm test`.
2. Ejecutar `npm run bench:matching`.
3. Revisar branding visible y nombres de artefactos.
4. Confirmar que el README del proyecto este actualizado.

## Empaquetado
1. Ejecutar `npm run dist:win`.
2. Ejecutar `npm run dist:mac`.
3. Verificar que los artefactos usen el nombre `ReconGrid`.

## Revision final
1. Abrir la app empaquetada y revisar el nombre del producto.
2. Confirmar que no haya referencias heredadas en instalador, accesos directos o pantallas.
3. Validar que el archivo exportado se genere correctamente.
