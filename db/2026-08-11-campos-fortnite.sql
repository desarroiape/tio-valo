-- Alinea la publicación de Fortnite en /admin con lo que llega del formulario
-- de venta (las mismas columnas que caen en la hoja de Sheets).
--
-- Dos grupos:
--   • Públicos  -> plataformas_vinculadas, puede_desvincular. Salen en el catálogo.
--   • Internos  -> origen, inversion, cambio_correo_ugi, historial_recuperacion,
--                  bloqueos. Solo se ven en /admin al editar la cuenta; nunca
--                  se publican ni viajan a los anuncios de Discord/Telegram.
--
-- Ejecutar en Supabase → SQL Editor ANTES de desplegar el código que los usa.
-- Es aditivo: no toca las cuentas existentes.

alter table public.cuentas
  add column if not exists plataformas_vinculadas text,
  add column if not exists puede_desvincular      text,
  add column if not exists origen                 text,
  add column if not exists inversion              numeric,
  add column if not exists cambio_correo_ugi      text,
  add column if not exists historial_recuperacion text,
  add column if not exists bloqueos               text;
