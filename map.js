(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const NUMBERS = { sonya: '1', frans: '2', cider: '3', vnvnc: '4', sumbur: 'С' };

  window.initNightMap = function initNightMap(options) {
    const opts = options || {};
    const host = typeof opts.container === 'string' ? document.querySelector(opts.container) : opts.container;
    const d3 = window.d3;
    const data = opts.data || window.NIGHT_MAP;
    if (!host) throw new Error('Не найден контейнер карты.');
    if (!d3 || !d3.geoMercator || !d3.zoom) throw new Error('Для карты необходим D3.');
    if (!data || !data.basemap) throw new Error('Не загружены географические данные маршрута.');

    const places = (opts.places || data.places || []).filter(p => Array.isArray(p.point));
    const byId = new Map(places.map(p => [p.id, p]));
    const geometryPlaces = new Map((data.places || []).map(p => [p.id, p]));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 320, height = 440, selected = null, extra = false, destroyed = false;
    let visited = new Set();
    let transform = d3.zoomIdentity;
    let lastWidth = 0, lastHeight = 0;
    let resizeFrame = 0;

    const root = document.createElement('div');
    root.className = 'night-map';
    Object.assign(root.style, { position: 'relative', width: '100%', height: '100%', minHeight: '320px', overflow: 'hidden', isolation: 'isolate', background: 'var(--map-ground, #e9e7dc)' });
    host.appendChild(root);

    const svg = d3.select(root).append('svg')
      .attr('class', 'night-map__svg').attr('role', 'img').attr('tabindex', '0')
      .attr('aria-label', 'Пешая карта: Radisson Sonya, Франс, Сидрерия и VNVNC. Масштаб можно менять кнопками; карту можно перемещать.')
      .style('display', 'block').style('width', '100%').style('height', '100%')
      .style('position', 'absolute').style('inset', '0').style('touch-action', 'pan-y');
    svg.append('title').text('Ночной пеший маршрут по Петербургу');
    svg.append('desc').text('Реальная уличная сеть OpenStreetMap и пешеходные маршруты. Нажмите на номер остановки, чтобы увидеть подробности.');
    const canvas = svg.append('g').attr('class', 'night-map__canvas');
    const projection = d3.geoMercator();
    const path = d3.geoPath(projection);

    // D3 uses clockwise exterior rings. OSM GeoJSON may use either winding.
    const features = (data.basemap.features || []).map(f => {
      if (f.geometry && f.geometry.type === 'Polygon' && d3.geoArea(f) > 2 * Math.PI) {
        return { ...f, geometry: { ...f.geometry, coordinates: f.geometry.coordinates.map(r => r.slice().reverse()) } };
      }
      return f;
    });
    const groups = {};
    ['park', 'water', 'building', 'river', 'road'].forEach(kind => {
      groups[kind] = canvas.append('g').attr('class', 'night-map__' + kind);
      groups[kind].selectAll('path').data(features.filter(f => f.properties.kind === kind)).join('path')
        .attr('class', 'night-map__feature night-map__feature--' + kind)
        .attr('vector-effect', 'non-scaling-stroke')
        .attr('fill', ['park', 'water', 'building'].includes(kind) ? 'var(--map-' + kind + ')' : 'none')
        .attr('fill-rule', 'evenodd')
        .attr('stroke', ['road', 'river'].includes(kind) ? 'var(--map-' + (kind === 'river' ? 'water' : 'road') + ')' : 'none')
        .attr('stroke-width', f => kind === 'river' ? 8 : /primary|secondary/.test(f.properties.highway || '') ? 3 : /footway|path|steps|pedestrian/.test(f.properties.highway || '') ? 0.9 : 1.8)
        .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round')
        .attr('opacity', kind === 'park' ? 0.7 : kind === 'building' ? 0.72 : kind === 'road' ? 0.85 : 1);
    });

    const routeLayer = canvas.append('g').attr('class', 'night-map__routes');
    const routeUnder = routeLayer.append('g').attr('class', 'night-map__route-under');
    const routeInk = routeLayer.append('g').attr('class', 'night-map__route-ink');
    const labels = canvas.append('g').attr('class', 'night-map__labels').attr('aria-hidden', 'true').style('pointer-events', 'none');
    const labelWanted = /Литейный|Пестеля|Моховая|Соляной|Фонтанка|Мойка|Михайловский сад|Летний сад|Конюшенная/;
    const labelFeatures = new Map();
    features.forEach(f => {
      const name = f.properties.name || '';
      if (!labelWanted.test(name) || f.properties.kind === 'building') return;
      const old = labelFeatures.get(name);
      if (!old || d3.geoLength(f) > d3.geoLength(old)) labelFeatures.set(name, f);
    });
    const labelNodes = labels.selectAll('text').data(Array.from(labelFeatures.values())).join('text')
      .attr('class', 'night-map__street-label').attr('text-anchor', 'middle')
      .attr('font-family', 'inherit').attr('font-size', 14).attr('font-weight', 500)
      .attr('fill', 'var(--muted, #686d63)').attr('paint-order', 'stroke')
      .attr('stroke', 'var(--map-ground, #e9e7dc)').attr('stroke-width', 3)
      .attr('stroke-linejoin', 'round').text(f => f.properties.name);

    const pins = document.createElement('div');
    pins.className = 'night-map__pins';
    Object.assign(pins.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
    root.appendChild(pins);
    const pinNodes = new Map();

    function placeAddress(p) { return p.address || (geometryPlaces.get(p.id) || {}).address || ''; }
    places.forEach((p, i) => {
      const optional = p.optional || p.id === 'sumbur';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'night-map__pin' + (optional ? ' is-optional' : '');
      button.dataset.place = p.id;
      button.setAttribute('aria-label', (NUMBERS[p.id] || i + 1) + '. ' + p.name + '. ' + placeAddress(p));
      button.setAttribute('aria-pressed', 'false');
      Object.assign(button.style, { position: 'absolute', width: '44px', height: '44px', padding: '0', cursor: 'pointer', pointerEvents: 'auto', transform: 'translate(-50%, -50%)', display: 'grid', placeItems: 'center' });
      const halo = document.createElement('span');
      halo.className = 'night-map__pin-halo';
      Object.assign(halo.style, { position: 'absolute', inset: '-8px', border: '2px solid var(--accent, #c9ef76)', borderRadius: '50%', opacity: '0', pointerEvents: 'none' });
      const number = document.createElement('span');
      number.className = 'night-map__pin-number';
      number.textContent = NUMBERS[p.id] || String(i + 1);
      number.setAttribute('aria-hidden', 'true');
      const check = document.createElementNS(SVG_NS, 'svg');
      check.setAttribute('viewBox', '0 0 20 20');
      check.setAttribute('aria-hidden', 'true');
      check.classList.add('night-map__pin-check');
      Object.assign(check.style, { position: 'absolute', width: '20px', height: '20px', top: '-7px', right: '-7px', display: 'none', background: 'var(--ink, #172b24)', color: 'var(--accent, #c9ef76)', borderRadius: '50%', border: '2px solid var(--map-ground, #e9e7dc)', padding: '2px', boxSizing: 'content-box' });
      const checkPath = document.createElementNS(SVG_NS, 'path');
      checkPath.setAttribute('d', 'M4.5 10.2 8 13.7 15.5 6.3');
      checkPath.setAttribute('fill', 'none'); checkPath.setAttribute('stroke', 'currentColor');
      checkPath.setAttribute('stroke-width', '2'); checkPath.setAttribute('stroke-linecap', 'round'); checkPath.setAttribute('stroke-linejoin', 'round');
      check.appendChild(checkPath);
      const label = document.createElement('span');
      label.className = 'night-map__pin-label';
      label.textContent = p.id === 'sonya' ? 'Sonya' : p.name;
      label.setAttribute('aria-hidden', 'true');
      Object.assign(label.style, { position: 'absolute', left: '50%', top: '49px', transform: 'translateX(-50%)', pointerEvents: 'none' });
      button.append(halo, number, check, label);
      button.addEventListener('click', () => { select(p.id); if (typeof opts.onSelect === 'function') opts.onSelect(p.id); });
      button.addEventListener('focus', () => { button.style.outline = '3px solid var(--ink, #172b24)'; button.style.outlineOffset = '5px'; });
      button.addEventListener('blur', () => { button.style.outline = ''; button.style.outlineOffset = ''; });
      pins.appendChild(button);
      pinNodes.set(p.id, { button, halo, number, check, label, optional });
    });

    const credit = document.createElement('a');
    credit.className = 'night-map__credit';
    credit.href = 'https://www.openstreetmap.org/copyright'; credit.target = '_blank'; credit.rel = 'noopener noreferrer';
    credit.textContent = data.copyright || '© OpenStreetMap contributors';
    Object.assign(credit.style, { position: 'absolute', bottom: '8px', left: '10px', zIndex: '3', padding: '3px 5px', fontFamily: 'inherit', fontWeight: '500', fontSize: '14px', lineHeight: '1.2', color: 'var(--muted, #686d63)', background: 'var(--map-ground, #e9e7dc)', borderRadius: '4px' });
    root.appendChild(credit);

    function currentLegs() {
      const legs = (data.legs || []).slice();
      return extra ? legs.filter(l => !(l.from === 'cider' && l.to === 'vnvnc')).concat(data.optional || []) : legs;
    }
    function drawRoutes() {
      const legs = currentLegs();
      [routeUnder, routeInk].forEach((layer, i) => {
        layer.selectAll('path').data(legs, l => l.from + '-' + l.to).join('path')
          .attr('class', l => 'night-map__route' + ((data.optional || []).includes(l) ? ' is-optional' : ''))
          .attr('d', l => path(l.geometry)).attr('fill', 'none')
          .attr('stroke', i === 0 ? 'var(--ink, #172b24)' : 'var(--accent, #c9ef76)')
          .attr('stroke-width', i === 0 ? 8 : 4.5).attr('stroke-opacity', i === 0 ? 0.18 : 1)
          .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round')
          .attr('vector-effect', 'non-scaling-stroke');
      });
    }
    function updatePins() {
      places.forEach(p => {
        const pin = pinNodes.get(p.id);
        const point = transform.apply(projection(p.point));
        pin.button.style.left = point[0] + 'px'; pin.button.style.top = point[1] + 'px';
        pin.button.style.zIndex = selected === p.id ? '6' : '4';
      });
    }
    const zoom = d3.zoom().scaleExtent([1, 2.8])
      .filter(event => {
        if (event.target && event.target.closest && event.target.closest('button, a')) return false;
        // Ordinary wheel scrolling continues to scroll the page.
        if (event.type === 'wheel') return event.ctrlKey || event.metaKey;
        // A single finger scrolls the page; two fingers manipulate the map.
        if (event.type === 'touchstart') return event.touches.length > 1;
        return !event.button;
      })
      .on('start.night-map', event => { if (event.sourceEvent) root.classList.add('is-dragging'); })
      .on('zoom.night-map', event => {
        transform = event.transform;
        canvas.attr('transform', transform.toString());
        updatePins();
      })
      .on('end.night-map', () => root.classList.remove('is-dragging'));
    svg.call(zoom).on('dblclick.zoom', null);
    const d3TouchMove = svg.on('touchmove.zoom');
    if (d3TouchMove) svg.on('touchmove.zoom', function (event) {
      if (event.touches.length > 1) d3TouchMove.call(this, event);
    }, { passive: false });
    svg.style('touch-action', 'pan-y');

    function constrain(t) {
      const k = Math.max(1, Math.min(2.8, t.k));
      const x = Math.max(width - width * 1.18 * k, Math.min(width * 0.18 * k, t.x));
      const y = Math.max(height - height * 1.18 * k, Math.min(height * 0.18 * k, t.y));
      return d3.zoomIdentity.translate(x, y).scale(k);
    }
    function applyTransform(next, animate) {
      if (destroyed) return;
      svg.interrupt();
      const target = constrain(next);
      if (animate && !reduced.matches) svg.transition().duration(220).call(zoom.transform, target);
      else svg.call(zoom.transform, target);
    }
    function resize() {
      if (destroyed) return;
      const rect = root.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width || host.clientWidth || 320));
      height = Math.max(320, Math.round(rect.height || host.clientHeight || 440));
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width; lastHeight = height;
      svg.attr('viewBox', '0 0 ' + width + ' ' + height);
      const padding = width < 500 ? { x: 36, y: 52 } : { x: 64, y: 58 };
      const fit = { type: 'FeatureCollection', features: places.map(p => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: p.point } })).concat((data.legs || []).map(l => ({ type: 'Feature', properties: {}, geometry: l.geometry }))) };
      projection.fitExtent([[padding.x, padding.y], [Math.max(padding.x + 1, width - padding.x), Math.max(padding.y + 1, height - padding.y - 22)]], fit);
      canvas.selectAll('.night-map__feature').attr('d', path);
      labelNodes.attr('transform', f => {
        let xy = path.centroid(f), angle = 0;
        if (f.geometry.type === 'LineString') {
          const coords = f.geometry.coordinates, mid = Math.max(1, Math.floor(coords.length / 2));
          const a = projection(coords[mid - 1]), b = projection(coords[mid]);
          xy = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          angle = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
          if (angle > 90) angle -= 180; if (angle < -90) angle += 180;
        }
        return 'translate(' + xy[0] + ',' + (xy[1] - 8) + ') rotate(' + angle + ')';
      });
      drawRoutes();
      zoom.extent([[0, 0], [width, height]]).translateExtent([[-width * 0.18, -height * 0.18], [width * 1.18, height * 1.18]]);
      applyTransform(d3.zoomIdentity, false);
    }
    function select(id) {
      if (id != null && !byId.has(id)) return;
      selected = id;
      pinNodes.forEach((p, key) => {
        const active = key === selected;
        p.button.classList.toggle('is-selected', active);
        p.button.setAttribute('aria-pressed', String(active));
        if (active) p.button.setAttribute('aria-current', 'step'); else p.button.removeAttribute('aria-current');
        p.halo.style.opacity = active ? '1' : '0';
        p.button.style.zIndex = active ? '6' : '4';
      });
    }
    function setExtra(value) {
      extra = Boolean(value);
      root.classList.toggle('has-extra', extra);
      pinNodes.forEach(p => { if (p.optional) { p.button.classList.toggle('is-in-route', extra); p.button.style.opacity = extra ? '1' : '0.72'; } });
      drawRoutes();
    }
    function setVisited(ids) {
      visited = new Set(Array.isArray(ids) ? ids : []);
      pinNodes.forEach((p, id) => {
        const done = visited.has(id), place = byId.get(id);
        p.button.classList.toggle('is-visited', done);
        p.check.style.display = done ? 'block' : 'none';
        p.button.setAttribute('aria-label', (NUMBERS[id] || '') + '. ' + place.name + '. ' + placeAddress(place) + (done ? '. Посещено.' : ''));
      });
    }
    function zoomBy(factor) {
      if (!Number.isFinite(factor) || factor <= 0) return;
      if (reduced.matches) svg.call(zoom.scaleBy, factor);
      else svg.interrupt().transition().duration(220).call(zoom.scaleBy, factor);
    }
    function reset() { applyTransform(d3.zoomIdentity, true); }
    function focusPlace(id) {
      const p = byId.get(id); if (!p) return;
      select(id);
      const xy = projection(p.point), scale = Math.max(1.6, Math.min(2.2, transform.k));
      applyTransform(d3.zoomIdentity.translate(width / 2 - xy[0] * scale, height / 2 - xy[1] * scale).scale(scale), true);
    }
    svg.on('keydown.night-map', event => {
      if (event.target !== svg.node()) return;
      const arrows = { ArrowLeft: [45, 0], ArrowRight: [-45, 0], ArrowUp: [0, 45], ArrowDown: [0, -45] };
      if (arrows[event.key]) { event.preventDefault(); const delta = arrows[event.key]; applyTransform(d3.zoomIdentity.translate(transform.x + delta[0], transform.y + delta[1]).scale(transform.k), false); }
      else if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomBy(1.25); }
      else if (event.key === '-') { event.preventDefault(); zoomBy(0.8); }
      else if (event.key === 'Home' || event.key === '0') { event.preventDefault(); reset(); }
    });
    function scheduleResize() { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(resize); }
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleResize) : null;
    if (observer) observer.observe(host); else window.addEventListener('resize', scheduleResize);
    setExtra(false);
    resize();

    return {
      select, setExtra, setVisited, zoomBy, reset, focusPlace,
      destroy() {
        destroyed = true; cancelAnimationFrame(resizeFrame);
        if (observer) observer.disconnect(); else window.removeEventListener('resize', scheduleResize);
        svg.interrupt().on('.zoom', null).on('.night-map', null);
        root.remove();
      }
    };
  };
})();
