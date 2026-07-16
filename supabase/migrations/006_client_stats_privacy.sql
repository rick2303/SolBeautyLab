-- ============================================================
-- 006 · client_stats: privacidad de lifetime + conteo correcto
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
--
-- 1) total_spent (lifetime) solo lo ve el owner — para los demás
--    llega NULL desde la base de datos (no solo oculto en la UI).
-- 2) Corrige el conteo de visitas: la versión anterior unía
--    appointments y payments a la vez, lo que inflaba los números
--    cuando un cliente tenía varios pagos.
-- ============================================================

create or replace view client_stats as
select
  c.id as client_id,
  coalesce(ap.visits, 0) as visits,
  case
    when my_role() = 'owner' then coalesce(pay.total, 0)::numeric
  end as total_spent,
  ap.last_visit,
  (
    select s.name
    from appointments a2
    join services s on s.id = a2.service_id
    where a2.client_id = c.id and a2.status = 'completed'
    group by s.name
    order by count(*) desc
    limit 1
  ) as favorite_service,
  c.created_at > now() - interval '30 days' as is_new
from clients c
left join lateral (
  select
    count(*) filter (where a.status = 'completed') as visits,
    max(a.starts_at) filter (where a.status = 'completed') as last_visit
  from appointments a
  where a.client_id = c.id
) ap on true
left join lateral (
  select sum(p.amount) as total
  from payments p
  where p.client_id = c.id
) pay on true;
