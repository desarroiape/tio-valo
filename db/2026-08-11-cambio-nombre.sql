-- Añade el campo "¿se puede cambiar el nombre?" a las cuentas publicadas.
-- Solo se usa en cuentas de Fortnite; en Valorant se guarda siempre en false.
-- El catálogo lo muestra únicamente cuando es true: si es false no se menciona.
--
-- Ejecutar en Supabase → SQL Editor ANTES de desplegar el código que lo usa.
-- Es aditivo y no rompe nada si se corre antes de tiempo.

alter table public.cuentas
  add column if not exists cambio_nombre boolean not null default false;
