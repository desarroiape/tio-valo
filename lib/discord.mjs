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
  const juego = cuenta.juego === 'fortnite' ? 'fortnite' : 'valorant';
  const juegoLabel = juego === 'fortnite' ? '🎮 Fortnite' : '🎯 Valorant';
  const codigo = (cuenta.codigo && String(cuenta.codigo).trim())
    ? String(cuenta.codigo).trim()
    : ((juego === 'fortnite' ? 'FN-' : 'VAL-') + String(cuenta.id).padStart(3, '0'));
  const link = `${siteUrl}/${juego}?cuenta=${cuenta.id}`;
  const titulo = String(cuenta.titulo || codigo);

  const fields = [{ name: '🕹️ Juego', value: juegoLabel, inline: true }];
  const tienePrecio = cuenta.precio != null && Number(cuenta.precio) > 0;
  fields.push({ name: '💵 Precio', value: tienePrecio ? `$${cuenta.precio} USD` : 'Consultar precio', inline: true });
  if (juego === 'valorant') {
    if (cuenta.rango) fields.push({ name: '🏆 Rango', value: String(cuenta.rango), inline: true });
    if (cuenta.rango_maximo) fields.push({ name: '📊 Rango máx', value: String(cuenta.rango_maximo), inline: true });
    if (cuenta.region) fields.push({ name: '🌎 Región', value: String(cuenta.region), inline: true });
    if (cuenta.pais) fields.push({ name: '📍 País', value: String(cuenta.pais), inline: true });
    if (cuenta.skins != null) fields.push({ name: '🔫 Skins', value: String(cuenta.skins), inline: true });
    if (cuenta.agentes) fields.push({ name: '🎭 Agentes', value: String(cuenta.agentes), inline: true });
  } else {
    if (cuenta.skins != null) fields.push({ name: '🎨 Skins', value: String(cuenta.skins), inline: true });
    if (cuenta.pavos != null) fields.push({ name: '💰 Pavos', value: String(cuenta.pavos), inline: true });
    if (cuenta.nivel != null) fields.push({ name: '📈 Nivel', value: String(cuenta.nivel), inline: true });
    if (cuenta.plataforma) fields.push({ name: '🖥️ Plataforma', value: String(cuenta.plataforma), inline: true });
    if (cuenta.og) fields.push({ name: '👑 Cuenta OG', value: 'Sí', inline: true });
  }
  // Solo se mencionan si de verdad se incluyen; si no, se omiten.
  if (cuenta.correo && cuenta.correo !== 'Sin correo original') fields.push({ name: '📧 Correo', value: String(cuenta.correo), inline: true });
  if (cuenta.recibos) fields.push({ name: '🧾 Recibos de compra', value: 'Incluidos', inline: true });
  if (cuenta.recuperacion) fields.push({ name: '🔐 Preguntas de recuperación', value: 'Incluidas', inline: true });
  if (cuenta.destacadas) fields.push({ name: '⭐ Destacadas', value: String(cuenta.destacadas), inline: false });
  if (cuenta.link) fields.push({ name: '🔎 Link de Explorant', value: String(cuenta.link), inline: false });

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
  // El logo va como miniatura (esquina), para que la descripción quede arriba
  // y las fotos del inventario se muestren grandes debajo del mensaje.
  embed.thumbnail = { url: `${siteUrl}/logotrustifymarket.jpeg` };

  // Descarga TODAS las fotos de la cuenta. Para FORZAR el orden (anuncio
  // arriba, fotos abajo) NO se dejan como adjuntos sueltos —Discord los pone
  // encima del embed—: cada imagen se mete en un embed extra que COMPARTE la
  // misma `url` que el anuncio. Discord agrupa esos embeds y muestra las fotos
  // como una galería DEBAJO del embed principal.
  const imgs = (Array.isArray(cuenta.imagenes) ? cuenta.imagenes : []).filter(Boolean).slice(0, 10);
  const embeds = [embed];
  const fd = new FormData();
  let n = 0;
  for (const url of imgs) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const type = r.headers.get('content-type') || 'image/jpeg';
      const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
      const nombre = `foto-${n + 1}.${ext}`;
      const buf = Buffer.from(await r.arrayBuffer());
      fd.append(`files[${n}]`, new Blob([buf], { type }), nombre);
      if (n === 0) {
        // La primera foto se ata al embed del anuncio (aparece bajo los datos).
        embed.image = { url: `attachment://${nombre}` };
      } else {
        // El resto van como embeds extra con la MISMA url -> galería debajo.
        embeds.push({ url: link, image: { url: `attachment://${nombre}` } });
      }
      n++;
    } catch { /* si una imagen falla, se omite */ }
  }
  fd.append('payload_json', JSON.stringify({
    thread_name: titulo.slice(0, 100), // canal de foro -> crea un post nuevo
    // @everyone: el texto va arriba del todo y notifica a todos.
    // allowed_mentions es obligatorio para que la mención realmente haga ping.
    content: '@everyone',
    allowed_mentions: { parse: ['everyone'] },
    // Orden garantizado: texto (@everyone) -> anuncio -> galería de fotos.
    embeds,
  }));

  const res = await fetch(webhook, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Discord webhook: ' + res.status + ' ' + (await res.text()));
}
