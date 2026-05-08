# Flujo colaborador

1. Ingresa cédula y contraseña.
2. La cédula se transforma internamente a email técnico: `cedula@polla.local`.
3. Supabase Auth autentica.
4. La app lee `profiles` para conocer cédula, nombre, área y rol.
5. El colaborador ve sus tickets.
6. Si recibió un código, lo activa por RPC `claim_ticket`.
7. Completa predicción por ticket.
8. Puede editar hasta `prediction_deadline`.
9. Revisa ranking general.

## Validaciones críticas

Aunque la UI muestra bloqueo por deadline, PostgreSQL también valida que no se guarden predicciones fuera de plazo.
