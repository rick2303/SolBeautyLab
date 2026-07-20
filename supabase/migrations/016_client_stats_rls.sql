-- ============================================================
-- 016 · client_stats debe respetar RLS (security_invoker)
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
--
-- Las vistas de Postgres se ejecutan por defecto con los permisos de
-- quien las creó, NO de quien las consulta: client_stats estaba
-- saltándose las políticas de `appointments`, así que una técnica veía
-- el conteo de visitas y el servicio favorito de TODA la clienta,
-- incluidas las citas atendidas por sus compañeras.
-- (Verificado: con 5 visitas de las que solo 1 era suya, veía "5".)
--
-- security_invoker aplica las políticas del usuario que consulta:
--   · owner  → sigue viendo el total real
--   · staff  → solo cuenta sus propias citas con esa clienta
-- total_spent ya estaba protegido aparte por el my_role() del CASE.
-- ============================================================

alter view client_stats set (security_invoker = on);
