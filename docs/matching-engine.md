# Matching Engine

## Resumen
ReconGrid compara registros entre dos archivos Excel usando un indice en memoria para evitar busquedas completas repetidas sobre el archivo destino.

## Orden de resolucion
1. Coincidencia exacta.
2. Coincidencia con guiones reemplazados por espacios.
3. Coincidencia compacta sin guiones ni espacios.
4. Coincidencia por variaciones con barras.

## Ejemplos
- `ABC-123` puede coincidir con `ABC 123`
- `ABC-123` puede coincidir con `ABC123`
- `ABC-123` puede coincidir con `ABC/123`

## Notas operativas
- La fila origen siempre se conserva en el resultado.
- El motor evita duplicados reales cuando una fila repetida trae exactamente el mismo contenido.
- La exportacion final se genera en un archivo Excel nuevo.
