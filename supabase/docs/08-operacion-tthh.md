# Operación TTHH

## Venta

1. Buscar cédula.
2. Confirmar pago.
3. Ejecutar venta desde UI.
4. Copiar o imprimir código.
5. Entregar al colaborador.

## Anulación

1. Seleccionar ticket.
2. Ingresar motivo.
3. Ejecutar `cancel_ticket`.
4. La acción queda en `admin_audit_log`.

## Resultados

1. Cargar marcador oficial.
2. Cargar ganador por penales si aplica.
3. Ejecutar recálculo.
4. Verificar ranking.

## Cierre

Al pasar el deadline, `lock_predictions()` puede bloquear predicciones pendientes o enviadas.
