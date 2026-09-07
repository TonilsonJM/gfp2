-- =====================================================================
-- Fin JM - Migração v2
-- Execute apenas se já tiver rodado o schema.sql anteriormente
-- (adiciona o campo de limite de gasto mensal usado no alerta do Dashboard)
-- =====================================================================

alter table public.profiles
  add column if not exists limite_gasto_mensal numeric(14,2);
