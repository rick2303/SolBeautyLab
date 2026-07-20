-- ============================================================
-- 017 · Quien registra un pago siempre puede verlo
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
--
-- Problema detectado: la regla de la migración 005 solo dejaba ver los
-- pagos propios cuando NO estaban ligados a una cita
-- (`appointment_id is null and recorded_by = auth.uid()`).
-- Consecuencia real: si recepción cobra la cita de otra técnica, el pago
-- se guarda pero desaparece de su vista — no lo ve en Pagos ni en su
-- panel, y como el botón "Cobrar" reaparece, puede cobrar dos veces.
--
-- Ahora se ve un pago si: eres la dueña, atendiste la cita, o lo
-- registraste tú (con o sin cita asociada).
-- ============================================================

drop policy if exists "payments read" on payments;

create policy "payments read" on payments for select to authenticated
  using (
    my_role() = 'owner'
    or (
      (has_module('payments') or has_module('reports'))
      and (
        exists (
          select 1 from appointments a
          where a.id = payments.appointment_id
            and a.staff_id = auth.uid()
        )
        or payments.recorded_by = auth.uid()
      )
    )
  );
