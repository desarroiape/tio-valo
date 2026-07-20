/* =====================================================================
   Motor de catálogo compartido (Valorant y Fortnite).
   La página define window.CATALOGO = { juego, whatsapp } antes de cargarlo.
   Construye los filtros según el juego, renderiza el grid y el detalle.
   ===================================================================== */
(function () {
  const CFG = window.CATALOGO || {};
  const JUEGO = CFG.juego === 'fortnite' ? 'fortnite' : 'valorant';
  const ES_FT = JUEGO === 'fortnite';
  const WHATSAPP = CFG.whatsapp || '51940198935';
  const PREFIX = ES_FT ? 'FN-' : 'VAL-';
  const PLACEHOLDER = 'https://placehold.co/720x480/181B27/8A93AC?text=Sin+foto';

  const grid = document.getElementById('catalog-grid');
  const countEl = document.getElementById('catalog-count');
  const host = document.getElementById('filtros-host');
  const overlay = document.getElementById('overlay');
  const overlayBody = document.getElementById('overlay-body');

  let ALL = [], VIEW = [];

  /* ---------- Métodos de pago por país (edítalos según lo que manejes) ---------- */
  const PAISES = [
    { code: 'pe',  flag: '🇵🇪', nombre: 'Perú',       metodos: ['Yape', 'Plin', 'Transferencia BCP / Interbank / BBVA'] },
    { code: 'ar',  flag: '🇦🇷', nombre: 'Argentina',  metodos: ['Mercado Pago', 'Transferencia (CBU / CVU)', 'Ualá'] },
    { code: 'br',  flag: '🇧🇷', nombre: 'Brasil',     metodos: ['Pix', 'Mercado Pago', 'Nubank'] },
    { code: 'ec',  flag: '🇪🇨', nombre: 'Ecuador',    metodos: ['Transferencia (Pichincha / Guayaquil)', 'DeUna', 'Banco del Pacífico'] },
    { code: 'co',  flag: '🇨🇴', nombre: 'Colombia',   metodos: ['Nequi', 'Daviplata', 'Bancolombia / PSE'] },
    { code: 'mx',  flag: '🇲🇽', nombre: 'México',     metodos: ['Transferencia SPEI', 'Mercado Pago', 'OXXO'] },
    { code: 'cl',  flag: '🇨🇱', nombre: 'Chile',      metodos: ['Transferencia bancaria', 'Mercado Pago', 'MACH'] },
    { code: 'bo',  flag: '🇧🇴', nombre: 'Bolivia',    metodos: ['Transferencia (BCP / Banco Unión)', 'Tigo Money'] },
    { code: 've',  flag: '🇻🇪', nombre: 'Venezuela',  metodos: ['Pago Móvil', 'Zelle', 'Binance (USDT)'] },
    { code: 'otro',flag: '🌎', nombre: 'Otro país',  metodos: ['PayPal', 'Binance / USDT (cripto)', 'Wise'] },
  ];
  window.mostrarMetodos = (code) => {
    const p = PAISES.find(x => x.code === code);
    if (!p) return;
    document.querySelectorAll('[data-pais]').forEach(b => {
      const on = b.dataset.pais === code;
      b.classList.toggle('border-red', on);
      b.classList.toggle('bg-red/10', on);
      b.classList.toggle('text-cream', on);
      b.classList.toggle('border-line', !on);
      b.classList.toggle('text-cream/70', !on);
    });
    document.getElementById('pay-methods').innerHTML = `
      <div class="flex flex-wrap gap-2">
        ${p.metodos.map(m => `<span class="inline-flex items-center gap-1.5 rounded-lg border border-mint/40 bg-mint/[0.06] px-3 py-1.5 text-sm text-cream">
          <svg width="14" height="14" viewBox="0 0 24 24" class="shrink-0 text-mint" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6L9 17l-5-5"/></svg>${m}</span>`).join('')}
      </div>
      <p class="mt-3 text-xs leading-[1.6] text-muted">Coordinamos el método exacto contigo por WhatsApp. <span class="text-mint">Sin comisiones.</span></p>`;
  };
  window.swapImg = (el) => { document.getElementById('detalle-img').src = el.dataset.src; };

  /* ---------- Datos ---------- */
  function normalizar(row) {
    const imgs = Array.isArray(row.imagenes) ? row.imagenes.filter(Boolean) : [];
    return {
      id: String(row.id),
      codigo: PREFIX + String(row.id).padStart(3, '0'),
      titulo: row.titulo || 'Cuenta',
      precio: row.precio ?? 0,
      skins: row.skins,
      destacado: row.destacadas || '',
      descripcion: row.descripcion || '',
      correo: row.correo || '',
      imagenes: imgs,
      img: imgs[0] || PLACEHOLDER,
      rango: row.rango || '',
      region: row.region || '',
      pavos: row.pavos,
      nivel: row.nivel,
      plataforma: row.plataforma || '',
      og: !!row.og,
      rango_maximo: row.rango_maximo || '',
      agentes: row.agentes || '',
      recibos: !!row.recibos,
      recuperacion: !!row.recuperacion,
      link: row.link || '',
    };
  }
  const waLink = (m) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(m)}`;
  const num = (v) => (v == null || v === '' ? NaN : Number(v));

  /* ---------- Sidebar de filtros (según juego) ---------- */
  function chip(grupo, valor) {
    return `<label class="flex cursor-pointer items-center gap-2 text-sm text-cream/85 hover:text-cream">
      <input type="checkbox" data-grupo="${grupo}" value="${valor}" class="peer sr-only" />
      <span class="h-4 w-4 shrink-0 rounded border border-line bg-ink peer-checked:border-red peer-checked:bg-red"></span>${valor}</label>`;
  }
  const lbl = (t) => `<label class="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">${t}</label>`;
  const sliderVal = (t, id) => `<label class="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted"><span>${t}</span><span id="${id}" class="text-red">0</span></label>`;

  function construirSidebar() {
    const b = [];
    b.push(`<div>${lbl('Skin destacada')}<input id="f-texto" type="search" placeholder="Ej. ${ES_FT ? 'Renegade Raider' : 'Reaver Vandal'}" class="w-full border border-line bg-ink px-3 py-2 text-sm text-cream placeholder:text-muted/60 focus:border-red focus:outline-none" /></div>`);
    if (ES_FT) {
      b.push(`<div>${lbl('Plataforma')}<div id="f-plataformas" class="space-y-2"></div></div>`);
      b.push(`<div>${lbl('Cuenta')}<label class="flex cursor-pointer items-center gap-2 text-sm text-cream/85 hover:text-cream"><input id="f-og" type="checkbox" class="peer sr-only" /><span class="h-4 w-4 shrink-0 rounded border border-line bg-ink peer-checked:border-red peer-checked:bg-red"></span>Solo cuentas OG 👑</label></div>`);
      b.push(`<div>${sliderVal('Skins (mínimo)', 'f-skins-val')}<input id="f-skins" type="range" min="0" max="200" value="0" class="w-full accent-red" /></div>`);
      b.push(`<div>${sliderVal('Pavos (mínimo)', 'f-pavos-val')}<input id="f-pavos" type="range" min="0" max="10000" value="0" class="w-full accent-red" /></div>`);
    } else {
      b.push(`<div>${lbl('Tipo de cuenta')}<div id="f-rangos" class="space-y-2"></div></div>`);
      b.push(`<div>${lbl('Región')}<div id="f-regiones" class="space-y-2"></div></div>`);
      b.push(`<div>${sliderVal('Skins (mínimo)', 'f-skins-val')}<input id="f-skins" type="range" min="0" max="50" value="0" class="w-full accent-red" /></div>`);
    }
    b.push(`<div>${sliderVal('Precio máx.', 'f-precio-val')}<input id="f-precio" type="range" min="0" max="500" value="500" class="w-full accent-red" /></div>`);

    host.innerHTML = `
      <button id="filtros-toggle" class="mb-3 flex w-full items-center justify-between border border-line/70 bg-surface/60 px-4 py-3 font-cond text-sm font-600 uppercase tracking-[0.14em] text-cream notch-tr lg:hidden">
        Filtros
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
      </button>
      <div id="filtros" class="hidden space-y-6 border border-line/70 bg-surface/50 p-5 notch-tr lg:block">
        <div class="flex items-center justify-between">
          <span class="font-cond text-sm font-600 uppercase tracking-[0.14em] text-cream">Filtros</span>
          <button id="f-limpiar" class="font-mono text-[10px] uppercase tracking-wider text-muted hover:text-red">Limpiar</button>
        </div>
        ${b.join('')}
      </div>`;

    // eventos
    const filtros = document.getElementById('filtros');
    filtros.addEventListener('input', aplicarFiltros);
    filtros.addEventListener('change', aplicarFiltros);
    document.getElementById('f-limpiar').addEventListener('click', limpiar);
    document.getElementById('filtros-toggle').addEventListener('click', () => filtros.classList.toggle('hidden'));
  }

  function poblarFiltros() {
    const set = (k) => [...new Set(ALL.map(c => c[k]))].filter(v => v && v !== '—');
    if (ES_FT) {
      const plats = set('plataforma');
      document.getElementById('f-plataformas').innerHTML = plats.length ? plats.map(p => chip('plataforma', p)).join('') : '<span class="text-xs text-muted">—</span>';
      setSlider('f-skins', 'f-skins-val', ALL.map(c => num(c.skins)), 10, false);
      setSlider('f-pavos', 'f-pavos-val', ALL.map(c => num(c.pavos)), 1000, false, ' ');
    } else {
      const rangos = set('rango'), regiones = set('region');
      document.getElementById('f-rangos').innerHTML = rangos.length ? rangos.map(r => chip('rango', r)).join('') : '<span class="text-xs text-muted">—</span>';
      document.getElementById('f-regiones').innerHTML = regiones.length ? regiones.map(r => chip('region', r)).join('') : '<span class="text-xs text-muted">—</span>';
      setSlider('f-skins', 'f-skins-val', ALL.map(c => num(c.skins)), 10, false);
    }
    setSlider('f-precio', 'f-precio-val', ALL.map(c => num(c.precio)), 50, true, '$');
  }
  function setSlider(id, valId, vals, min, esMax, prefijo = '') {
    const el = document.getElementById(id); if (!el) return;
    const max = Math.max(min, ...vals.filter(v => !Number.isNaN(v)));
    el.max = max;
    el.value = esMax ? max : 0;
    document.getElementById(valId).textContent = prefijo + el.value;
  }

  function seleccionados(grupo) {
    return new Set([...document.querySelectorAll(`input[data-grupo="${grupo}"]:checked`)].map(i => i.value));
  }
  function val(id) { const el = document.getElementById(id); return el ? el.value : null; }

  function aplicarFiltros() {
    const texto = (val('f-texto') || '').trim().toLowerCase();
    const minSkins = Number(val('f-skins') || 0);
    const maxPrecio = Number(val('f-precio'));
    const skv = document.getElementById('f-skins-val'); if (skv) skv.textContent = String(minSkins);
    const pcv = document.getElementById('f-precio-val'); if (pcv) pcv.textContent = '$' + maxPrecio;

    let minPavos = 0, soloOg = false, plats = null, rangos = null, regiones = null;
    if (ES_FT) {
      minPavos = Number(val('f-pavos') || 0);
      const pvv = document.getElementById('f-pavos-val'); if (pvv) pvv.textContent = String(minPavos);
      soloOg = document.getElementById('f-og').checked;
      plats = seleccionados('plataforma');
    } else {
      rangos = seleccionados('rango');
      regiones = seleccionados('region');
    }

    VIEW = ALL.filter(c => {
      if ((Number(c.precio) || 0) > maxPrecio) return false;
      const s = num(c.skins);
      if (!Number.isNaN(s) && s < minSkins) return false;
      if (texto && !`${c.destacado} ${c.titulo}`.toLowerCase().includes(texto)) return false;
      if (ES_FT) {
        if (plats.size && !plats.has(c.plataforma)) return false;
        if (soloOg && !c.og) return false;
        const p = num(c.pavos);
        if (!Number.isNaN(p) && p < minPavos) return false;
      } else {
        if (rangos.size && !rangos.has(c.rango)) return false;
        if (regiones.size && !regiones.has(c.region)) return false;
      }
      return true;
    });
    renderGrid();
    countEl.textContent = `${VIEW.length} de ${ALL.length} cuenta${ALL.length === 1 ? '' : 's'}`;
  }
  function limpiar() {
    if (val('f-texto') != null) document.getElementById('f-texto').value = '';
    document.querySelectorAll('input[data-grupo]:checked').forEach(i => (i.checked = false));
    const og = document.getElementById('f-og'); if (og) og.checked = false;
    ['f-skins', 'f-pavos'].forEach(id => { const el = document.getElementById(id); if (el) el.value = 0; });
    const pr = document.getElementById('f-precio'); if (pr) pr.value = pr.max;
    aplicarFiltros();
  }

  /* ---------- Grid ---------- */
  function metaCard(c) {
    if (ES_FT) {
      const parts = [];
      if (c.nivel != null) parts.push(`<span><span class="text-cream">Nv ${c.nivel}</span></span>`);
      if (c.skins != null) parts.push(`<span><span class="text-cream">${c.skins}</span> skins</span>`);
      if (c.pavos != null) parts.push(`<span><span class="text-cream">${c.pavos}</span> pavos</span>`);
      return parts.join('');
    }
    return `<span><span class="text-cream">${c.region || '—'}</span> · región</span><span><span class="text-cream">${c.skins ?? '—'}</span> skins</span>`;
  }
  function badgeCard(c) {
    const txt = ES_FT ? (c.plataforma || 'Fortnite') : (c.rango || '—');
    return `<span class="tag absolute left-3 top-3 z-10 bg-red px-2.5 py-1 font-mono text-[10px] font-700 uppercase tracking-wider text-ink">${txt}</span>
      ${ES_FT && c.og ? `<span class="tag absolute right-3 top-3 z-10 bg-gold px-2 py-1 font-mono text-[10px] font-700 uppercase tracking-wider text-ink">OG</span>` : ''}`;
  }
  function renderGrid() {
    if (!VIEW.length) {
      grid.innerHTML = `<div class="col-span-full border border-line/60 bg-surface/50 px-6 py-14 text-center notch-tr">
        <p class="font-cond text-lg font-600 uppercase tracking-wide text-cream">${ALL.length ? 'Sin resultados' : 'Aún no hay cuentas publicadas'}</p>
        <p class="mt-2 text-sm text-muted">${ALL.length ? 'Prueba ajustando o limpiando los filtros.' : 'Vuelve pronto: estamos cargando nuevas cuentas.'}</p>
      </div>`;
      return;
    }
    grid.innerHTML = VIEW.map(c => `
      <article class="card group cursor-pointer bg-surface notch-tr layer-shadow" data-id="${c.id}" tabindex="0" role="button" aria-label="Ver ${c.titulo}">
        <div class="img-treat aspect-[3/2] overflow-hidden">
          <img src="${c.img}" alt="${c.titulo}" class="card-img h-full w-full object-cover" loading="lazy" />
          ${badgeCard(c)}
          <span class="absolute bottom-3 left-3 z-10 font-mono text-[10px] uppercase tracking-[0.2em] text-cream/70">${c.codigo}</span>
        </div>
        <div class="p-5">
          <h3 class="font-cond text-lg font-600 uppercase leading-tight tracking-wide text-cream">${c.titulo}</h3>
          <p class="mt-1 text-sm text-muted">${c.destacado || '&nbsp;'}</p>
          <div class="mt-4 flex items-center justify-between border-t border-line/60 pt-4">
            <div class="flex gap-4 font-mono text-[11px] uppercase tracking-wider text-muted">${metaCard(c)}</div>
            <div class="text-right"><span class="font-display text-2xl text-red">$${c.precio}</span></div>
          </div>
          <span class="mt-4 flex items-center gap-1.5 font-cond text-xs font-600 uppercase tracking-[0.14em] text-cream/70 group-hover:text-red">Ver detalle
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </span>
        </div>
      </article>`).join('');
  }

  /* ---------- Detalle ---------- */
  function statsDetalle(c) {
    let rows;
    if (ES_FT) {
      rows = [['Plataforma', c.plataforma || '—'], ['Nivel', c.nivel ?? '—'], ['Skins', c.skins ?? '—'], ['Pavos', c.pavos ?? '—']];
    } else {
      rows = [['Región', c.region || '—'], ['Skins', c.skins ?? '—'], ['Rango', c.rango || '—']];
      if (c.rango_maximo) rows.push(['Rango máx', c.rango_maximo]);
    }
    const cols = rows.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3';
    return `<div class="mt-6 grid ${cols} gap-px border border-line/60 bg-line/40 notch-tr">
      ${rows.map(([k, v]) => `<div class="bg-ink px-4 py-3"><div class="font-display text-xl text-cream">${v}</div><div class="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">${k}</div></div>`).join('')}
    </div>`;
  }
  function abrirDetalle(id) {
    const c = ALL.find(x => x.id === id);
    if (!c) return;
    const msg = `¡Hola! Quiero comprar esta cuenta (${ES_FT ? 'Fortnite' : 'Valorant'}):\n\n• ID: ${c.codigo}\n• ${c.titulo}\n• Precio: $${c.precio} USD\n\n¿Sigue disponible?`;
    const link = waLink(msg);
    const destacadas = (c.destacado || '').split(/[,·]/).map(s => s.trim()).filter(Boolean);
    const galeria = c.imagenes.length > 1 ? `
      <div class="flex gap-2 overflow-x-auto px-6 pt-4 sm:px-8">
        ${c.imagenes.map((u, i) => `<img data-src="${u}" onclick="swapImg(this)" src="${u}" alt="Foto ${i + 1}" class="h-16 w-16 shrink-0 cursor-pointer rounded-lg object-cover ring-1 ring-line/70 hover:ring-red" />`).join('')}
      </div>` : '';

    overlayBody.innerHTML = `
      <div class="img-treat aspect-[16/7] overflow-hidden">
        <img id="detalle-img" src="${c.img}" alt="${c.titulo}" class="h-full w-full object-cover" />
        <span class="tag absolute left-4 top-4 z-10 bg-red px-3 py-1 font-mono text-[11px] font-700 uppercase tracking-wider text-ink">${ES_FT ? (c.plataforma || 'Fortnite') : (c.rango || '—')}</span>
        ${ES_FT && c.og ? `<span class="tag absolute right-4 top-4 z-10 bg-gold px-3 py-1 font-mono text-[11px] font-700 uppercase tracking-wider text-ink">OG 👑</span>` : ''}
      </div>
      ${galeria}
      <div class="p-6 sm:p-8">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-red">${c.codigo}</p>
            <h3 class="mt-1 font-display text-3xl uppercase leading-none text-cream sm:text-4xl">${c.titulo}</h3>
          </div>
          <div class="shrink-0 text-right">
            <div class="font-display text-4xl text-red">$${c.precio}</div>
            <div class="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">USD</div>
          </div>
        </div>

        ${statsDetalle(c)}

        ${c.descripcion ? `<p class="mt-6 text-sm leading-[1.75] text-cream/80">${c.descripcion}</p>` : ''}

        ${destacadas.length ? `
          <h4 class="mt-6 mb-3 font-cond text-sm font-600 uppercase tracking-[0.18em] text-red">${ES_FT ? 'Skins destacadas' : 'Inventario destacado'}</h4>
          <ul class="grid gap-2 sm:grid-cols-2">
            ${destacadas.map(d => `<li class="flex items-center gap-2 text-sm text-cream/85"><svg width="14" height="14" viewBox="0 0 24 24" class="shrink-0 text-red" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6L9 17l-5-5"/></svg>${d}</li>`).join('')}
          </ul>` : ''}

        ${c.correo ? `<div class="mt-5 flex items-center gap-2 text-sm text-mint"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l9 4v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-6.45-9-12V5l9-4z"/></svg>${c.correo}</div>` : ''}

        ${(c.agentes || c.recibos || c.recuperacion) ? `
          <div class="mt-4 space-y-2">
            ${c.agentes ? `<div class="flex items-center gap-2 text-sm text-cream/85"><svg width="15" height="15" viewBox="0 0 24 24" class="shrink-0 text-mint" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6L9 17l-5-5"/></svg><span><span class="text-muted">Agentes:</span> ${c.agentes}</span></div>` : ''}
            ${c.recibos ? `<div class="flex items-center gap-2 text-sm text-cream/85"><svg width="15" height="15" viewBox="0 0 24 24" class="shrink-0 text-mint" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6L9 17l-5-5"/></svg>Recibos de compra incluidos</div>` : ''}
            ${c.recuperacion ? `<div class="flex items-center gap-2 text-sm text-cream/85"><svg width="15" height="15" viewBox="0 0 24 24" class="shrink-0 text-mint" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6L9 17l-5-5"/></svg>Respuestas de preguntas de recuperación incluidas</div>` : ''}
          </div>` : ''}

        ${c.link ? `<a href="${c.link}" target="_blank" rel="noopener" class="mt-4 inline-flex items-center gap-2 rounded-lg border border-blue/50 bg-blue/[0.08] px-4 py-2 text-sm font-600 text-blue hover:bg-blue hover:text-ink">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg>
          Explorar nombre</a>` : ''}

        <div class="mt-7 border-t border-line/60 pt-6">
          <h4 class="mb-1 font-cond text-sm font-600 uppercase tracking-[0.18em] text-red">Métodos de pago sin comisión</h4>
          <p class="mb-3 text-xs leading-[1.6] text-muted">Elige tu país y te mostramos con qué puedes pagar.</p>
          <div class="flex flex-wrap gap-2">
            ${PAISES.map(p => `<button type="button" data-pais="${p.code}" onclick="mostrarMetodos('${p.code}')" class="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-cream/70 hover:border-red hover:text-cream"><span>${p.flag}</span>${p.nombre}</button>`).join('')}
          </div>
          <div id="pay-methods" class="mt-4"></div>
        </div>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="${link}" target="_blank" rel="noopener" class="cta flex flex-1 items-center justify-center gap-2 bg-red px-6 py-4 font-cond text-sm font-700 uppercase tracking-[0.14em] text-ink btn-red hover:bg-red-dim">Quiero comprar esta cuenta</a>
          <a href="${link}" target="_blank" rel="noopener" aria-label="Contactar por WhatsApp" class="cta flex items-center justify-center gap-2 border border-mint bg-mint/[0.08] px-5 py-4 font-cond text-sm font-700 uppercase tracking-[0.14em] text-mint btn-red hover:bg-mint hover:text-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.01c-.24.68-1.42 1.3-1.95 1.34-.5.05-1.14.24-3.83-.8-3.22-1.27-5.28-4.55-5.44-4.76-.16-.21-1.31-1.74-1.31-3.32s.83-2.36 1.12-2.68c.24-.27.63-.39.99-.39.12 0 .24 0 .34.01.31.01.46.03.66.51.24.6.83 2.09.9 2.24.07.15.12.32.02.53-.09.21-.14.34-.28.53-.14.19-.29.42-.42.56-.14.15-.28.31-.12.6.16.28.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.16-.19.69-.8.87-1.08.18-.28.36-.23.61-.14.25.09 1.61.76 1.88.9.28.14.46.21.53.32.07.12.07.66-.17 1.34z"/></svg>WhatsApp</a>
        </div>
      </div>`;

    overlay.classList.remove('hidden-x');
    document.body.style.overflow = 'hidden';
    document.getElementById('overlay-close').focus();
  }
  function cerrarDetalle() { overlay.classList.add('hidden-x'); document.body.style.overflow = ''; }

  grid.addEventListener('click', e => { const card = e.target.closest('[data-id]'); if (card) abrirDetalle(card.dataset.id); });
  grid.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-id]')) { e.preventDefault(); abrirDetalle(e.target.closest('[data-id]').dataset.id); } });
  document.getElementById('overlay-close').addEventListener('click', cerrarDetalle);
  overlay.addEventListener('click', e => { if (e.target === overlay) cerrarDetalle(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.classList.contains('hidden-x')) cerrarDetalle(); });

  /* ---------- Carga ---------- */
  async function cargar() {
    construirSidebar();
    grid.innerHTML = `<div class="col-span-full px-6 py-14 text-center font-mono text-sm text-muted">Cargando catálogo…</div>`;
    try {
      const res = await fetch('/api/cuentas?juego=' + JUEGO);
      const data = await res.json();
      ALL = (data.cuentas || []).map(normalizar);
    } catch { ALL = []; }
    poblarFiltros();
    aplicarFiltros();
    const wanted = new URLSearchParams(location.search).get('cuenta');
    if (wanted && ALL.some(c => c.id === String(wanted))) abrirDetalle(String(wanted));
  }
  cargar();
})();
