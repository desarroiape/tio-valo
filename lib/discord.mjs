/* =====================================================================
   Anuncio automático en Discord al publicar una cuenta.
   Usa un webhook (canal de FORO): cada cuenta crea un post nuevo.
   Es "best-effort": si falla, no rompe la publicación.
   ===================================================================== */

const NARANJA = 0xF26A21; // color de marca para el embed

export async function anunciarCuenta(cuenta) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return; // sin webhook configurado, no hace nada

  const siteUrl = (process.env.SITE_URL || 'https://tio-valo.vercel.app').replace(/\/$/, '');
  const codigo = 'VAL-' + String(cuenta.id).padStart(3, '0');
  const link = `${siteUrl}/comprar?cuenta=${cuenta.id}`;
  const titulo = `${codigo} · ${cuenta.titulo}`;

  const fields = [];
  if (cuenta.precio != null) fields.push({ name: '💵 Precio', value: `$${cuenta.precio} USD`, inline: true });
  if (cuenta.rango) fields.push({ name: '🏆 Rango', value: String(cuenta.rango), inline: true });
  if (cuenta.region) fields.push({ name: '🌎 Región', value: String(cuenta.region), inline: true });
  if (cuenta.skins != null) fields.push({ name: '🔫 Skins', value: String(cuenta.skins), inline: true });
  if (cuenta.correo) fields.push({ name: '📧 Correo', value: String(cuenta.correo), inline: true });
  if (cuenta.destacadas) fields.push({ name: '⭐ Destacadas', value: String(cuenta.destacadas), inline: false });

  const desc = [];
  if (cuenta.descripcion) desc.push(String(cuenta.descripcion).slice(0, 1500));
  desc.push(`\n🔗 **[Ver esta cuenta en la web](${link})**`);

  const embed = {
    title: titulo.slice(0, 256),
    url: link,
    description: desc.join('\n').slice(0, 4000),
    color: NARANJA,
    fields,
    footer: { text: 'Trustify Market' },
    timestamp: new Date().toISOString(),
  };
  const img = Array.isArray(cuenta.imagenes) ? cuenta.imagenes.find(Boolean) : null;
  if (img) embed.image = { url: img };

  const payload = {
    thread_name: titulo.slice(0, 100), // canal de foro -> crea un post nuevo
    embeds: [embed],
  };

  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Discord webhook: ' + res.status + ' ' + (await res.text()));
}
