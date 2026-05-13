# Banderas circulares

La app soporta iconos circulares por seleccion en `public/assets/flags/circle/{teamId}.png`.

Reglas:

- Usar PNG/SVG descargados manualmente con licencia valida.
- No hacer scraping automatico de Flaticon.
- Mantener atribucion/licencia de los assets usados.
- No bloquear la app si falta una bandera: `TeamIdentity` muestra el emoji actual como fallback circular.

Fuente sugerida por el proyecto: Flaticon, usando assets con licencia/atribucion valida.

## Checklist de assets esperados

Guardar cada archivo como `public/assets/flags/circle/{teamId}.png`:

`mex`, `rsa`, `kor`, `cze`, `can`, `bih`, `qat`, `sui`, `bra`, `mar`, `hai`, `sco`, `usa`, `par`, `aus`, `tur`, `ger`, `cuw`, `civ`, `ecu`, `ned`, `jpn`, `swe`, `tun`, `bel`, `egy`, `irn`, `nzl`, `esp`, `cpv`, `ksa`, `uru`, `fra`, `sen`, `irq`, `nor`, `arg`, `alg`, `aut`, `jor`, `por`, `cod`, `uzb`, `col`, `eng`, `cro`, `gha`, `pan`.

Mientras falten PNG, `TeamIdentity` muestra el código FIFA en un círculo estable para evitar imágenes rotas.
