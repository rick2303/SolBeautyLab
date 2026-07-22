-- ============================================================
-- 023 · Pagos a nombre de otra persona del equipo
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
--
-- Nuevo: al registrar un pago suelto se puede asignar a otra persona
-- del staff (payments.staff_id). El pago cuenta para el negocio y para
-- la persona asignada; quien lo registró NO lo ve en su historial ni
-- en sus ingresos (la app le muestra un aviso al crearlo para que sepa
-- a quién y por cuánto quedó registrado).
--
-- Visibilidad resultante ("payments read"):
--   · owner                                   → ve todo
--   · asignada (payments.staff_id = tú)       → lo ves
--   · técnica de la cita (a.staff_id = tú)    → lo ves
--   · lo registraste tú y NO está asignado a otra persona → lo ves
--
-- Se conserva el fix de la migración 017 para cobros de citas: esos
-- pagos no llevan staff_id, así que quien cobra la cita de otra técnica
-- los sigue viendo y el botón "Cobrar" no reaparece (doble cobro).
-- ============================================================

alter table payments
  add column if not exists staff_id uuid references profiles(id);

create index if not exists payments_staff_idx on payments (staff_id);

drop policy if exists "payments read" on payments;

create policy "payments read" on payments for select to authenticated
  using (
    my_role() = 'owner'
    or (
      (has_module('payments') or has_module('reports'))
      and (
        payments.staff_id = auth.uid()
        or exists (
          select 1 from appointments a
          where a.id = payments.appointment_id
            and a.staff_id = auth.uid()
        )
        or (payments.recorded_by = auth.uid() and payments.staff_id is null)
      )
    )
  );
