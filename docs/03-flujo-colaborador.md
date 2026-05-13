# Flujo colaborador

1. El colaborador se acerca a TTHH y compra uno o más tickets.
2. TTHH registra la venta y entrega un código de ticket de 6 caracteres.
3. Para crear cuenta, el colaborador ingresa cédula + código de ticket.
4. La app valida el par con `validate_registration_ticket(p_cedula, p_ticket_code)`.
5. Si el ticket es válido, vendido, no reclamado y pertenece a la cédula, el colaborador define contraseña.
6. Supabase Auth usa un email técnico generado como `<cedula>.<apellido>@mundial.malima`; el colaborador no necesita verlo ni usarlo.
7. `complete_registration_with_ticket(p_cedula, p_ticket_code)` crea `profiles`, reclama el ticket y crea `prediction_headers`.
8. El colaborador entra con cédula + contraseña.
9. Tickets adicionales se activan desde el dashboard con `claim_ticket(p_code)`.
10. Cada ticket permite una predicción independiente.

Reglas de seguridad:

- No usar `service_role` en frontend.
- No mostrar cédula completa en ranking.
- No mostrar código completo de ticket salvo al dueño o admin.
- Los errores de registro deben ser genéricos si cédula y ticket no coinciden.
