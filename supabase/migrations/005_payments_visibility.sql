-- ============================================================
-- 005 · Visibilidad de pagos
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
--
-- Regla: solo el OWNER ve todos los pagos.
-- Staff / receptionist (con módulo payments o reports) solo ven:
--   · pagos de citas donde ellos fueron el técnico
--   · pagos sueltos (sin cita) que ellos mismos registraron
-- Aplica automáticamente a Payments, Dashboard y Reports.
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
        or (payments.appointment_id is null and payments.recorded_by = auth.uid())
      )
    )
  );
