# Flujo TTHH/Admin

1. Usuario con rol `admin_tthh` o `super_admin` entra al panel.
2. Busca colaborador por cédula.
3. Confirma pago.
4. Ejecuta RPC `sell_ticket(p_cedula)`.
5. PostgreSQL genera código de 6 caracteres y evita colisiones con `unique(tickets.code)`.
6. TTHH entrega comprobante al colaborador.
7. Puede anular tickets con motivo.
8. Puede cargar resultados reales y recalcular ranking.

## Regla

TTHH nunca escribe manualmente el código; el código nace en PostgreSQL.
