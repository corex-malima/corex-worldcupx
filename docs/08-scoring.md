# Scoring

El scoring está parametrizado primero en TypeScript (`DEFAULT_SCORING_RULES`) y luego debe moverse a `scoring_rules` o `app_config` cuando Supabase esté listo.

| Etapa | Evento | Puntos |
|---|---:|---:|
| Grupos | Marcador exacto | 3 |
| Grupos | Resultado general | 1 |
| Grupos | Posición exacta 1.º | 1 |
| Grupos | Posición exacta 2.º | 1 |
| Grupos | Posición exacta 3.º | 1 |
| Dieciseisavos | País pasa a octavos | 2 |
| Octavos | País pasa a cuartos | 4 |
| Cuartos | País pasa a semifinales | 8 |
| Semifinal | País pasa a final | 10 |
| Eliminatorias con cruce exacto | Marcador exacto 90 min | 3 |
| Eliminatorias con cruce exacto | Resultado general 90 min | 1 |
| Final | Campeón correcto | 20 |
| Tercer puesto | Tercer lugar correcto | 10 |

Reglas:

- Exacto no suma resultado adicional.
- Los goles de eliminatorias representan marcador de 90 minutos.
- Si hay empate en 90 minutos, se elige quién avanza.
- El ganador elegido sirve para avance correcto; no altera el marcador exacto.
- Subcampeón no tiene bonus por defecto.

TODO técnico:

- Cuando exista resultado real, normalizar el orden local/visitante antes de comparar marcador en cruces exactos con equipos invertidos.
- Persistir `score_details` para auditoría por ticket.
