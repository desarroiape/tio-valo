/* =====================================================================
   Motor de catálogo compartido (Valorant y Fortnite).
   La página define window.CATALOGO = { juego, whatsapp } antes de cargarlo.
   Construye los filtros según el juego, renderiza el grid y el detalle.
   ===================================================================== */
(function () {
  const CFG = window.CATALOGO || {};
  const JUEGO = CFG.juego === 'fortnite' ? 'fortnite' : 'valorant';
  const ES_FT = JUEGO === 'fortnite';
  const WHATSAPP = CFG.whatsapp || '51904812870';
  const PREFIX = ES_FT ? 'FN-' : 'VAL-';
  const PLACEHOLDER = 'https://placehold.co/720x480/181B27/8A93AC?text=Sin+foto';

  // Si el admin deja el precio vacío, mostramos "Consultar precio" en su lugar.
  const tienePrecio = (p) => p != null && Number(p) > 0;

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
  window.ampliarImg = (src) => {
    let lb = document.getElementById('lightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'lightbox';
      lb.className = 'fixed inset-0 z-[100] hidden items-center justify-center bg-ink/90 backdrop-blur-sm p-4 cursor-zoom-out';
      lb.innerHTML = `<img id="lightbox-img" src="" alt="Imagen ampliada" class="max-h-[92vh] max-w-[92vw] rounded-lg object-contain shadow-2xl" />
        <button type="button" aria-label="Cerrar" class="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-line/60 bg-ink/70 text-cream hover:border-red hover:text-red">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>`;
      lb.addEventListener('click', () => lb.classList.add('hidden'));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lb.classList.add('hidden'); });
      document.body.appendChild(lb);
    }
    document.getElementById('lightbox-img').src = src;
    lb.classList.remove('hidden');
    lb.classList.add('flex');
  };

  /* ---------- Datos ---------- */
  function normalizar(row) {
    const imgs = Array.isArray(row.imagenes) ? row.imagenes.filter(Boolean) : [];
    return {
      id: String(row.id),
      codigo: (row.codigo && String(row.codigo).trim()) ? String(row.codigo).trim() : (PREFIX + String(row.id).padStart(3, '0')),
      estado: row.estado || 'disponible',
      titulo: row.titulo || 'Cuenta',
      precio: (row.precio === '' || row.precio == null) ? null : Number(row.precio),
      skins: row.skins,
      destacado: row.destacadas || '',
      descripcion: row.descripcion || '',
      correo: row.correo || '',
      imagenes: imgs,
      img: imgs[0] || PLACEHOLDER,
      rango: row.rango || '',
      region: row.region || '',
      pais: row.pais || '',
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
  // Tier base del rango (quita el nivel I/II/III para agrupar el filtro)
  const baseTier = (r) => String(r || '').replace(/\s+I{1,3}$/, '').trim();

  /* ---------- Sidebar de filtros (según juego) ---------- */
  function chip(grupo, valor, etiqueta = valor) {
    return `<label class="flex cursor-pointer items-center gap-2 text-sm text-cream/85 hover:text-cream">
      <input type="checkbox" data-grupo="${grupo}" value="${valor}" class="peer sr-only" />
      <span class="h-4 w-4 shrink-0 rounded border border-line bg-ink peer-checked:border-red peer-checked:bg-red"></span>${etiqueta}</label>`;
  }
  const lbl = (t) => `<label class="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">${t}</label>`;
  const sliderVal = (t, id) => `<label class="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted"><span>${t}</span><span id="${id}" class="text-red">0</span></label>`;

  function construirSidebar() {
    const b = [];
    b.push(`<div>${lbl('Skins destacadas')}<input id="f-texto" type="search" placeholder="Ej. ${ES_FT ? 'Renegade Raider' : 'Reaver Vandal'}" class="w-full border border-line bg-ink px-3 py-2 text-sm text-cream placeholder:text-muted/60 focus:border-red focus:outline-none" /></div>`);
    if (ES_FT) {
      b.push(`<div>${lbl('Plataforma')}<div id="f-plataformas" class="space-y-2"></div></div>`);
      b.push(`<div>${lbl('Cuenta')}<label class="flex cursor-pointer items-center gap-2 text-sm text-cream/85 hover:text-cream"><input id="f-og" type="checkbox" class="peer sr-only" /><span class="h-4 w-4 shrink-0 rounded border border-line bg-ink peer-checked:border-red peer-checked:bg-red"></span>Solo cuentas OG 👑</label></div>`);
      b.push(`<div>${sliderVal('Skins (mínimo)', 'f-skins-val')}<input id="f-skins" type="range" min="0" max="200" value="0" class="w-full accent-red" /></div>`);
      b.push(`<div>${sliderVal('Pavos (mínimo)', 'f-pavos-val')}<input id="f-pavos" type="range" min="0" max="10000" value="0" class="w-full accent-red" /></div>`);
    } else {
      b.push(`<div>${lbl('Rango')}<div id="f-rangos" class="space-y-2"></div></div>`);
      b.push(`<div>${lbl('Región')}<div id="f-regiones" class="space-y-2"></div></div>`);
      b.push(`<div>${lbl('Recibos de compra')}<div class="space-y-2">${chip('recibos', 'si', 'Sí incluye')}${chip('recibos', 'no', 'No incluye')}</div></div>`);
      b.push(`<div>${lbl('Preguntas de recuperación')}<div class="space-y-2">${chip('recuperacion', 'si', 'Sí incluye')}${chip('recuperacion', 'no', 'No incluye')}</div></div>`);
      b.push(`<div>${lbl('Agentes')}<input id="f-agentes" type="search" placeholder="Ej. todos los agentes" class="w-full border border-line bg-ink px-3 py-2 text-sm text-cream placeholder:text-muted/60 focus:border-red focus:outline-none" /></div>`);
      b.push(`<div>${lbl('Otros')}<div id="f-otros" class="space-y-2"></div></div>`);
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
      const rangos = [...new Set(ALL.map(c => baseTier(c.rango)))].filter(v => v && v !== '—'), regiones = set('region');
      document.getElementById('f-rangos').innerHTML = rangos.length ? rangos.map(r => chip('rango', r)).join('') : '<span class="text-xs text-muted">—</span>';
      document.getElementById('f-regiones').innerHTML = regiones.length ? regiones.map(r => chip('region', r)).join('') : '<span class="text-xs text-muted">—</span>';
      const tags = [...new Set(ALL.flatMap(c => (c.destacado || '').split(/[,·]/).map(s => s.trim()).filter(Boolean)))];
      // Muestra la etiqueta sin el prefijo "Cuenta " (el valor se conserva para filtrar).
      const etiquetaCorta = (t) => { const s = t.replace(/^Cuenta\s+/i, ''); return s.charAt(0).toUpperCase() + s.slice(1); };
      document.getElementById('f-otros').innerHTML = tags.length ? tags.map(t => chip('otros', t, etiquetaCorta(t))).join('') : '<span class="text-xs text-muted">—</span>';
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
    let recibosSel = null, recupSel = null, otrosSel = null, agentesTxt = '';
    if (ES_FT) {
      minPavos = Number(val('f-pavos') || 0);
      const pvv = document.getElementById('f-pavos-val'); if (pvv) pvv.textContent = String(minPavos);
      soloOg = document.getElementById('f-og').checked;
      plats = seleccionados('plataforma');
    } else {
      rangos = seleccionados('rango');
      regiones = seleccionados('region');
      recibosSel = seleccionados('recibos');
      recupSel = seleccionados('recuperacion');
      otrosSel = seleccionados('otros');
      agentesTxt = (val('f-agentes') || '').trim().toLowerCase();
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
        if (rangos.size && !rangos.has(baseTier(c.rango))) return false;
        if (regiones.size && !regiones.has(c.region)) return false;
        if (recibosSel.size && !recibosSel.has(c.recibos ? 'si' : 'no')) return false;
        if (recupSel.size && !recupSel.has(c.recuperacion ? 'si' : 'no')) return false;
        if (agentesTxt && !String(c.agentes || '').toLowerCase().includes(agentesTxt)) return false;
        if (otrosSel.size) {
          const tags = (c.destacado || '').split(/[,·]/).map(t => t.trim());
          if (![...otrosSel].some(t => tags.includes(t))) return false;
        }
      }
      return true;
    });
    renderGrid();
    countEl.textContent = `${VIEW.length} de ${ALL.length} cuenta${ALL.length === 1 ? '' : 's'}`;
  }
  function limpiar() {
    document.querySelectorAll('#filtros input[type="search"]').forEach(i => (i.value = ''));
    document.querySelectorAll('input[data-grupo]:checked').forEach(i => (i.checked = false));
    const og = document.getElementById('f-og'); if (og) og.checked = false;
    ['f-skins', 'f-pavos'].forEach(id => { const el = document.getElementById(id); if (el) el.value = 0; });
    const pr = document.getElementById('f-precio'); if (pr) pr.value = pr.max;
    aplicarFiltros();
  }

  /* ---------- Grid ---------- */
  const TIPO_TAGS = [
    { test: t => /cheta/i.test(t), label: 'Chetada', color: 'red' },
    { test: t => /econ/i.test(t), label: 'Económica', color: 'green' },
    { test: t => /exclusiv/i.test(t), label: 'Exclusiva', color: 'gold' },
  ];
  function tiposDe(c) {
    const tags = (c.destacado || '').split(/[,·]/).map(s => s.trim()).filter(Boolean);
    return TIPO_TAGS.filter(t => tags.some(tag => t.test(tag)));
  }
  function tagPill(color, label, big, { bg = `bg-${color}/[0.08]`, extra = '' } = {}) {
    const pad = big ? 'px-3 py-1' : 'px-2.5 py-1', size = big ? 'text-[11px]' : 'text-[10px]';
    return `<span class="tag ${extra} border border-${color}/50 ${bg} ${pad} font-mono ${size} font-700 uppercase tracking-wider text-${color}">${label}</span>`;
  }
  function tagTipoHtml(t, big) {
    return tagPill(t.color, t.label, big);
  }
  function estadoBadgeHtml(c, big) {
    const vendida = c.estado === 'vendida';
    const pos = big ? 'left-4 top-4' : 'left-3 top-3';
    const gap = big ? 'gap-2' : 'gap-1.5';
    const bg = { bg: 'bg-ink/70 backdrop-blur-sm' };
    const badges = [tagPill(vendida ? 'muted' : 'red', vendida ? 'Vendida' : 'Disponible', big, bg)];
    // Badge de rango al lado (solo Valorant y si la cuenta tiene rango).
    if (!ES_FT && c.rango) badges.push(tagPill('mint', c.rango, big, bg));
    return `<div class="absolute ${pos} z-10 flex flex-wrap ${gap}">${badges.join('')}</div>`;
  }
  function correoIncluido(c) {
    return /correo original incluido/i.test(c.correo || '');
  }
  // Resumen del preview: specs como recuadros (valor resaltado) + garantías como mini-lista.
  function resumenCard(c) {
    const specs = [];
    if (ES_FT) {
      if (c.nivel != null) specs.push(['Nivel', c.nivel]);
      if (c.pavos != null) specs.push(['Pavos', c.pavos]);
      if (c.skins != null && c.skins !== '') specs.push(['Skins', c.skins]);
    } else {
      if (c.skins != null && c.skins !== '') specs.push(['Skins', c.skins]);
      if (c.region) specs.push(['Región', c.region]);
      if (c.pais) specs.push(['País', c.pais]);
    }
    const chips = specs.map(([label, val]) => `<span class="inline-flex items-baseline gap-1 rounded-md border border-line/70 bg-ink/50 px-2 py-1">
      <span class="font-cond text-sm font-700 leading-none text-cream">${val}</span>
      <span class="font-mono text-[9px] uppercase tracking-wider text-muted">${label}</span></span>`).join('');

    const gar = [];
    if (correoIncluido(c)) gar.push('Correo original incluido');
    if (c.recibos) gar.push('Recibos de compra incluidos');
    if (c.recuperacion) gar.push('Preguntas de recuperación incluidas');
    const garHtml = gar.length ? `<ul class="mt-3 flex flex-col gap-1.5">
      ${gar.map(g => `<li class="flex items-center gap-1.5 text-[11px] leading-tight text-cream/70"><svg width="12" height="12" viewBox="0 0 24 24" class="shrink-0 text-mint" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>${g}</li>`).join('')}
    </ul>` : '';

    return `<div class="mt-3 flex flex-wrap gap-1.5">${chips}</div>${garHtml}`;
  }
  function renderGrid() {
    if (!VIEW.length) {
      grid.innerHTML = `<div class="col-span-full border border-line/60 bg-surface/50 px-6 py-14 text-center notch-tr">
        <p class="font-cond text-lg font-600 uppercase tracking-wide text-cream">${ALL.length ? 'Sin resultados' : 'Aún no hay cuentas publicadas'}</p>
        <p class="mt-2 text-sm text-muted">${ALL.length ? 'Prueba ajustando o limpiando los filtros.' : 'Vuelve pronto: estamos cargando nuevas cuentas.'}</p>
      </div>`;
      return;
    }
    grid.innerHTML = VIEW.map(c => {
      const vendida = c.estado === 'vendida';
      const tipos = tiposDe(c);
      return `
      <article class="card group cursor-pointer bg-surface notch-tr layer-shadow${vendida ? ' [filter:grayscale(1)]' : ''}" data-id="${c.id}" tabindex="0" role="button" aria-label="Ver ${c.titulo}">
        <div class="img-treat aspect-[3/2] overflow-hidden">
          <img src="${c.img}" alt="${c.titulo}" class="card-img h-full w-full object-cover" loading="lazy" />
          <div class="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-1/2 bg-gradient-to-t from-ink/95 via-ink/40 to-transparent"></div>
          ${estadoBadgeHtml(c, false)}
          ${ES_FT && c.og ? `<span class="tag absolute right-3 top-3 z-10 bg-gold px-2 py-1 font-mono text-[10px] font-700 uppercase tracking-wider text-ink">OG</span>` : ''}
          <span class="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-cream/85"><span class="h-2 w-[2px] bg-red"></span>${c.codigo}</span>
        </div>
        ${tipos.length ? `<div class="flex flex-wrap gap-1.5 px-5 pt-3">${tipos.map(t => tagTipoHtml(t, false)).join('')}</div>` : ''}
        <div class="p-5${tipos.length ? ' pt-2.5' : ''}">
          <h3 class="font-cond text-lg font-600 uppercase leading-tight tracking-wide text-cream">${c.titulo}</h3>
          ${resumenCard(c)}
          <div class="mt-4 flex items-center justify-between border-t border-line/60 pt-4">
            <span class="flex items-center gap-1.5 font-cond text-xs font-600 uppercase tracking-[0.14em] text-cream/70 group-hover:text-red">Ver detalle
              <svg width="14" height="14" viewBox="0 0 24 24" class="transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </span>
            ${tienePrecio(c.precio)
              ? `<span class="font-display text-2xl text-red">$${c.precio}</span>`
              : `<span class="font-cond text-sm font-700 uppercase tracking-[0.1em] text-red">Consultar precio</span>`}
          </div>
        </div>
      </article>`;
    }).join('');
  }

  /* ---------- Detalle ---------- */
  function statsDetalle(c) {
    let rows;
    if (ES_FT) {
      rows = [['Plataforma', c.plataforma || '—'], ['Nivel', c.nivel ?? '—'], ['Skins', c.skins ?? '—'], ['Pavos', c.pavos ?? '—']];
    } else {
      rows = [['Región', c.pais ? `${c.region || '—'} · ${c.pais}` : (c.region || '—')], ['Skins', c.skins ?? '—'], ['Rango', c.rango || '—']];
      if (c.rango_maximo) rows.push(['Rango máx', c.rango_maximo]);
    }
    const cols = rows.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3';
    return `<div class="mt-6 grid ${cols} gap-px overflow-hidden border border-line/60 bg-line/40 notch-tr">
      ${rows.map(([k, v]) => `<div class="bg-ink px-4 py-4 transition-colors hover:bg-surface/60"><div class="font-display text-xl leading-tight text-cream">${v}</div><div class="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">${k}</div></div>`).join('')}
    </div>`;
  }
  // Encabezado de sección con barra-acento naranja (eco del eyebrow de la página).
  function seccion(titulo) {
    return `<div class="mb-3 flex items-center gap-2.5"><span class="h-3.5 w-[3px] shrink-0 bg-red"></span><h4 class="font-cond text-sm font-700 uppercase tracking-[0.18em] text-cream">${titulo}</h4></div>`;
  }
  function abrirDetalle(id) {
    const c = ALL.find(x => x.id === id);
    if (!c) return;
    const vendida = c.estado === 'vendida';
    const precioMsg = tienePrecio(c.precio) ? `$${c.precio} USD` : 'a consultar';
    const msg = `¡Hola! Quiero comprar esta cuenta (${ES_FT ? 'Fortnite' : 'Valorant'}):\n\n• ID: ${c.codigo}\n• ${c.titulo}\n• Precio: ${precioMsg}\n\n¿Sigue disponible?`;
    const link = waLink(msg);
    const destacadas = (c.destacado || '').split(/[,·]/).map(s => s.trim()).filter(Boolean);
    const tiposDetalle = tiposDe(c);
    const galeria = c.imagenes.length > 1 ? `
      <div class="flex gap-2 overflow-x-auto px-6 pt-4 sm:px-8">
        ${c.imagenes.map((u, i) => `<img data-src="${u}" onclick="swapImg(this)" src="${u}" alt="Foto ${i + 1}" class="h-16 w-16 shrink-0 cursor-pointer rounded-lg object-cover ring-1 ring-line/70 hover:ring-red" />`).join('')}
      </div>` : '';

    const chip = (icono, texto) => `<span class="inline-flex items-center gap-2 rounded-lg border border-mint/30 bg-mint/[0.07] px-3.5 py-2 text-sm font-500 text-cream">
      <svg width="15" height="15" viewBox="0 0 24 24" class="shrink-0 text-mint" fill="none" stroke="currentColor" stroke-width="2">${icono}</svg>${texto}</span>`;
    const chips = [];
    if (correoIncluido(c)) chips.push(chip('<path d="M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z"/><path d="M3.5 7l8.5 6 8.5-6"/>', c.correo));
    if (c.recibos) chips.push(chip('<path d="M7 3h10a1 1 0 011 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 011-1z"/><path d="M9 8h6M9 12h6"/>', 'Recibos de compra'));
    if (c.recuperacion) chips.push(chip('<path d="M12 1l9 4v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-6.45-9-12V5l9-4z"/><path d="M9 12l2 2 4-4"/>', 'Preguntas de recuperación'));

    overlayBody.innerHTML = `
      <div class="${vendida ? '[filter:grayscale(1)]' : ''}">
      <div class="img-treat relative aspect-[16/7] overflow-hidden">
        <img id="detalle-img" src="${c.img}" alt="${c.titulo}" onclick="ampliarImg(this.src)" class="h-full w-full cursor-zoom-in object-cover" />
        <div class="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-2/3 bg-gradient-to-t from-ink via-ink/55 to-transparent"></div>
        ${estadoBadgeHtml(c, true)}
        ${ES_FT && c.og ? `<span class="tag absolute right-4 top-4 z-10 bg-gold px-3 py-1 font-mono text-[11px] font-700 uppercase tracking-wider text-ink">OG 👑</span>` : ''}
        ${tiposDetalle.length ? `<div class="absolute bottom-4 left-4 z-10 flex flex-wrap gap-2">${tiposDetalle.map(t => tagTipoHtml(t, false)).join('')}</div>` : ''}
        <div class="absolute bottom-4 right-4 z-10 flex items-baseline gap-1.5 border border-red/40 bg-ink/80 px-4 py-2 notch-tr backdrop-blur-sm">
          ${tienePrecio(c.precio)
            ? `<span class="font-display text-3xl leading-none text-red">$${c.precio}</span><span class="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">USD</span>`
            : `<span class="font-cond text-base font-700 uppercase tracking-[0.1em] text-red">Consultar precio</span>`}
        </div>
      </div>
      ${galeria}
      <div class="p-6 sm:p-8">
        <p class="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-red"><span class="h-2.5 w-[3px] bg-red"></span>${c.codigo}</p>
        <h3 class="mt-2 font-display text-3xl uppercase leading-none text-cream sm:text-4xl">${c.titulo}</h3>

        ${statsDetalle(c)}

        ${c.descripcion ? `<p class="mt-6 text-sm leading-[1.75] text-cream/80">${c.descripcion}</p>` : ''}

        ${destacadas.length ? `
          <div class="mt-7">
            ${seccion(ES_FT ? 'Skins destacadas' : 'Inventario destacado')}
            <div class="border border-line/60 bg-surface/30 notch-tr p-5">
              <ul class="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                ${destacadas.map(d => `<li class="flex items-center gap-2.5 text-sm text-cream/90"><span class="h-1.5 w-1.5 shrink-0 rotate-45 bg-red"></span>${d}</li>`).join('')}
              </ul>
            </div>
          </div>` : ''}

        ${(chips.length || c.agentes) ? `
          <div class="mt-6">
            ${seccion('Garantías')}
            ${chips.length ? `<div class="flex flex-wrap gap-2.5">${chips.join('')}</div>` : ''}
            ${c.agentes ? `<div class="mt-3 flex items-start gap-2.5 border-l-2 border-mint/50 bg-surface/30 px-3.5 py-2.5"><span class="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Agentes</span><span class="text-sm text-cream/85">${c.agentes}</span></div>` : ''}
          </div>` : ''}

        ${c.link ? `<a href="${c.link}" target="_blank" rel="noopener" class="mt-6 inline-flex items-center gap-2 rounded-lg border border-red/50 bg-red/[0.08] px-4 py-2 text-sm font-600 text-red hover:bg-red hover:text-ink">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg>
          LINK EXPLORANT</a>` : ''}

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
      // Orden descendente por número de cuenta (el mayor primero).
      const numDe = (c) => { const m = String(c.codigo || '').match(/\d+/g); return m ? parseInt(m[m.length - 1], 10) : -Infinity; };
      ALL.sort((a, b) => numDe(b) - numDe(a));
    } catch { ALL = []; }
    poblarFiltros();
    aplicarFiltros();
    const wanted = new URLSearchParams(location.search).get('cuenta');
    if (wanted && ALL.some(c => c.id === String(wanted))) abrirDetalle(String(wanted));
  }
  cargar();
})();
