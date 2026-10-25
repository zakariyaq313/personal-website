/* ==========================================================================
   Zakariya Qureshi, personal website
   1. Data (folders, photo credits)
   2. Live text (experience, copyright year)
   3. Projects accordion (below 900px)
   4. Collection: tabs + tray (640px and up)
   5. Collection: folder accordion (phones)
   6. Lightbox
   7. Mobile menu
   ========================================================================== */
(function () {
  'use strict';

  const THUMB = (n) => 'assets/' + n + '.jpg';
  const FULL = THUMB; // one file per photo; the grid and the lightbox share it, so the lightbox opens from cache

  /* 1. Data
     photos: [file name, alt text, object-position?, scale?, zoom origin?] */
  const FOLDERS = [
    { word: 'Skies', key: 'terrace-skies', cls: 'f-skies', own: true, note: 'The tower stays. The sky never does.', photos: [
      ['terrace-skies-01-gold-and-violet', 'Sunset burning gold and violet behind the tower'],
      ['terrace-skies-02-pastel-dusk', 'Pastel pink and purple sunset'],
      ['terrace-skies-03-first-star', 'Clear deep-blue dusk, a single faint star'],
      ['terrace-skies-04-crescent-moon', 'A thin crescent moon over the tower as dusk fades to peach']] },
    { word: 'Cats', key: 'street-cats', cls: 'f-cats', own: true, note: 'Family, on their own terms.', photos: [
      ['street-cats-01-kitten-and-sky', 'A tiny kitten held up to a clear blue sky'],
      ['street-cats-02-underfoot', 'Two tabbies weaving around my feet'],
      ['street-cats-03-under-the-aloe', 'Kitten under aloe leaves beside a teal pot'],
      ['street-cats-04-silver-tabby', 'Silver tabby held up against a blue sky']] },
    { word: 'Cities', key: 'cities-after-dark', cls: 'f-cities', note: 'Somewhere it\u2019s always 2 a.m.', photos: [
      ['cities-after-dark-01-neon-street', 'Neon-lit street packed with minibuses at night'],
      ['cities-after-dark-02-rain-glow', 'Rain-slicked city street glowing under streetlights'],
      ['cities-after-dark-03-light-trails', 'Long-exposure light trails on a night expressway'],
      ['cities-after-dark-04-tower-in-fog', 'Floodlit tower rising into the night fog']] },
    { word: 'Wildlife', key: 'wildlife', cls: 'f-wildlife', note: 'One glimpse costs a lifetime of luck.', photos: [
      ['wildlife-01-arctic-fox', 'An arctic fox sitting in violet evening snow', '18% 50%', 1.1, '50% 85%'],
      ['wildlife-02-spirit-bear', 'A white spirit bear walking along a mossy log in the rainforest', '31% 50%'],
      ['wildlife-03-lion-at-rest', 'A lion at rest under a blood-red sky', '50% 100%', 1.43, '50% 100%'],
      ['wildlife-04-black-leopard', 'A black leopard under a starlit sky', '30% 50%']] },
    { word: 'Nature', key: 'nature', cls: 'f-nature', note: 'Someday, in person.', photos: [
      ['nature-01-blood-moon', 'A blood moon framed by an ice cave'],
      ['nature-02-slot-canyon', 'Light curving through a slot canyon'],
      ['nature-03-waterfall', 'A moonlit waterfall with a rainbow arcing through its mist'],
      ['nature-04-fog-tide', 'A pink-and-blue tide of fog rolling over a forest at dusk']] }
  ];

  const UTM = '?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText';
  const unsplash = (by, slug) => ({ by, href: 'https://unsplash.com/photos/' + slug + UTM });
  const natgeo = (href) => ({ via: 'National Geographic', href });
  const CREDITS = {
    'cities-after-dark-01-neon-street': unsplash('Rids', 'cars-on-road-surrounded-by-buildings-during-night-time-C5t-vtoEZ64'),
    'cities-after-dark-02-rain-glow': unsplash('Soheb Zaidi', 'people-walking-on-street-during-night-time-AYS2sSAMyhc'),
    'cities-after-dark-03-light-trails': unsplash('Nguyen Phan Nam Anh', 'a-city-at-night-with-a-lot-of-traffic-7ZQXe8mqmaE'),
    'cities-after-dark-04-tower-in-fog': unsplash('weston m', 'white-car-on-road-near-high-rise-buildings-during-night-time-nqXEd6P_qJ8'),
    'wildlife-01-arctic-fox': { via: 'National Geographic' },
    'wildlife-02-spirit-bear': { by: 'Cristina Mittermeier & Paul Nicklen' },
    'wildlife-03-lion-at-rest': unsplash('Keyur Nandaniya', 'lion-on-green-grass-during-golden-hour-ywPqgpKsXls'),
    'wildlife-04-black-leopard': { by: 'Will Burrard-Lucas', href: 'https://www.burrard-lucas.com' },
    'nature-01-blood-moon': unsplash('Sean Pierce', 'an-orange-ball-is-in-the-middle-of-ice-formations-qKtOgTLEAXA'),
    'nature-02-slot-canyon': natgeo('https://www.nationalgeographic.com/photo-of-the-day/media-spotlight/antelope-canyon-page-arizona'),
    'nature-03-waterfall': natgeo('https://www.nationalgeographic.com/travel/article/finding-moonbows-yosemite'),
    'nature-04-fog-tide': unsplash('Zetong Li', 'a-man-with-a-sunset-in-the-background-sJhGEq4geOw')
  };

  const titleCase = (key) => key.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  const creditLabel = (f) => (f.own ? 'Shot by me' : 'From the internet');
  const pad2 = (n) => String(n).padStart(2, '0');
  const el = (tag, cls, attrs) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (attrs) Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    return node;
  };
  const chevron = () => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<path d="m6 9 6 6 6-6"/>';
    return s;
  };
  // Resolves once the image is downloaded and decoded (or failed), so swaps never show a half-loaded frame.
  const loadImage = (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(resolve);
    img.src = src;
  });
  const nextFrame = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));
  const setPhotoStyle = (img, pos, scale, origin) => {
    if (pos) img.style.setProperty('--pos', pos);
    if (scale) img.style.setProperty('--s', scale);
    if (origin) img.style.setProperty('--o', origin);
  };

  // Used by the menu and lightbox: stops the page scrolling and keeps keyboard focus out of it while they are open.
  let scrollLocks = 0;
  const lockScroll = (on) => {
    // Hiding the scrollbar widens the page; pad by its width so nothing shifts.
    const gap = window.innerWidth - document.documentElement.clientWidth;
    scrollLocks = Math.max(0, scrollLocks + (on ? 1 : -1));
    if (on && scrollLocks === 1) document.documentElement.style.setProperty('--sbw', Math.max(gap, 0) + 'px');
    if (!scrollLocks) document.documentElement.style.removeProperty('--sbw');
    document.body.style.paddingRight = scrollLocks ? 'var(--sbw)' : '';
    document.body.style.overflow = scrollLocks ? 'hidden' : '';
    const page = document.querySelector('.page');
    if (page) page.inert = scrollLocks > 0;
  };

  /* 2. Live text */
  function initLiveText() {
    const now = new Date();
    let years = now.getFullYear() - 2021 - (now.getMonth() < 3 ? 1 : 0); // counted from April 2021
    if (years < 0) years = 0;
    const exp = document.getElementById('experience-years');
    const year = document.getElementById('copyright-year');
    if (exp) exp.textContent = String(years);
    if (year) year.textContent = String(now.getFullYear());
  }

  /* 3. Projects accordion: below 900px the head toggles its project; one open at a time. */
  function initProjects() {
    const mq = window.matchMedia('(max-width: 899px)');
    const items = Array.from(document.querySelectorAll('.project'));
    const set = (open) => items.forEach((item) => {
      const isOpen = item === open;
      item.classList.toggle('is-open', isOpen);
      item.querySelector('.project__toggle').setAttribute('aria-expanded', String(isOpen));
      item.querySelector('.project__body').inert = mq.matches && !isOpen;
      // On phones the name only opens the project, so it is made inert: no focus, not announced as a link,
      // and taps pass through to the head, which opens it. The toggle button next to it carries the name.
      const link = item.querySelector('a.project__word');
      if (link) link.inert = mq.matches;
    });
    items.forEach((item) => {
      item.querySelector('.project__head').addEventListener('click', (e) => {
        if (!mq.matches) return;
        e.preventDefault(); // the word is a link on desktop; here it opens the project
        set(item.classList.contains('is-open') ? null : item);
      });
    });
    const sync = () => set(mq.matches ? items.find((i) => i.classList.contains('is-open')) || null : null);
    mq.addEventListener('change', sync);
    sync();
  }

  /* 4. Collection: tabs + tray */
  let current = 0;
  let trayToken = 0;

  function initTray() {
    const tabs = document.querySelector('.tabs');
    const tray = document.getElementById('tray');
    if (!tabs || !tray) return;

    FOLDERS.forEach((f, i) => {
      const tab = el('button', 'tab ' + f.cls, { type: 'button', role: 'tab', id: 'tab-' + f.key, 'aria-selected': String(i === 0), 'aria-controls': 'tray', tabindex: i === 0 ? '0' : '-1' });
      const word = el('span', 'tab__word');
      word.innerHTML = f.word + '<i>.</i>';
      tab.appendChild(word);
      tab.addEventListener('click', () => pickFolder(i));
      tabs.appendChild(tab);
    });
    tabs.addEventListener('keydown', (e) => {
      const n = FOLDERS.length;
      const next = { ArrowRight: current + 1, ArrowLeft: current - 1 + n, Home: 0, End: n - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      pickFolder(next % n);
      tabs.children[next % n].focus();
    });
    tray.setAttribute('aria-labelledby', 'tab-' + FOLDERS[0].key);
    renderTray(0);
  }

  function renderTray(i) {
    const f = FOLDERS[i];
    const tray = document.getElementById('tray');
    tray.className = 'tray ' + f.cls + (tray.classList.contains('is-fading') ? ' is-fading' : '');
    tray.removeAttribute('aria-busy');
    tray.replaceChildren();
    f.photos.forEach(([n, alt, pos, scale, origin], j) => {
      const tile = el('button', 'tile', { type: 'button', 'aria-label': alt });
      const img = el('img', null, { src: THUMB(n), alt, loading: 'lazy', decoding: 'async' });
      setPhotoStyle(img, pos, scale, origin);
      tile.appendChild(img);
      tile.addEventListener('click', (e) => openLightbox(i, j, e.detail === 0));
      tray.appendChild(tile);
    });
    const note = el('div', 'tray__note');
    const span = el('span');
    span.textContent = f.note;
    note.appendChild(span);
    tray.appendChild(note);
    document.querySelector('.tray-caption__name').textContent = titleCase(f.key);
    document.querySelector('.tray-caption__credit').textContent = creditLabel(f);
  }

  function renderSkeleton(i) {
    const tray = document.getElementById('tray');
    tray.className = 'tray ' + FOLDERS[i].cls;
    tray.setAttribute('aria-busy', 'true');
    tray.replaceChildren();
    const count = FOLDERS[i].photos.length + (window.matchMedia('(max-width: 1023px)').matches ? 0 : 1);
    for (let k = 0; k < count; k++) tray.appendChild(el('div', 'tile tile--skeleton', { 'aria-hidden': 'true' }));
  }

  // Fade the old set out, show skeletons while every new thumbnail loads, then fade the new set in.
  function pickFolder(i) {
    if (i === current) return;
    current = i;
    const tok = ++trayToken;
    const tray = document.getElementById('tray');
    document.querySelectorAll('.tab').forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    tray.setAttribute('aria-labelledby', 'tab-' + FOLDERS[i].key);
    const loaded = Promise.all(FOLDERS[i].photos.map(([n]) => loadImage(THUMB(n))));
    tray.classList.add('is-fading');
    setTimeout(() => {
      if (tok !== trayToken) return;
      renderSkeleton(i);
      loaded.then(() => {
        if (tok !== trayToken) return;
        tray.classList.add('is-fading');
        renderTray(i);
        nextFrame(() => { if (tok === trayToken) tray.classList.remove('is-fading'); });
      });
    }, 220);
  }

  /* 5. Collection: folder accordion (phones). All closed at first; photos load on first open. */
  function initFolders() {
    const wrap = document.querySelector('.folders');
    if (!wrap) return;
    FOLDERS.forEach((f, i) => {
      const folder = el('div', 'folder ' + f.cls);
      const head = el('button', 'folder__head', { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'folder-' + f.key });
      const label = el('span', 'folder__label');
      const word = el('span', 'folder__word');
      word.innerHTML = f.word + '<i>.</i>';
      const credit = el('span', 'folder__credit');
      credit.textContent = creditLabel(f);
      label.append(word, credit);
      head.append(label, chevron());
      const body = el('div', 'folder__body', { id: 'folder-' + f.key });
      const inner = el('div', 'folder__inner');
      const grid = el('div', 'folder__grid');
      inner.appendChild(grid);
      body.appendChild(inner);
      body.inert = true;
      folder.append(head, body);
      wrap.appendChild(folder);

      head.addEventListener('click', () => {
        const open = !folder.classList.contains('is-open');
        wrap.querySelectorAll('.folder').forEach((other) => {
          other.classList.remove('is-open');
          other.querySelector('.folder__head').setAttribute('aria-expanded', 'false');
          other.querySelector('.folder__body').inert = true;
        });
        if (!open) return;
        if (!grid.childElementCount) fillFolder(grid, i);
        folder.classList.add('is-open');
        head.setAttribute('aria-expanded', 'true');
        body.inert = false;
      });
    });
  }

  function fillFolder(grid, i) {
    FOLDERS[i].photos.forEach(([n, alt, pos, scale, origin], j) => {
      const tile = el('button', 'folder__tile', { type: 'button', 'aria-label': alt });
      const img = el('img', null, { alt, decoding: 'async' });
      setPhotoStyle(img, pos, scale, origin);
      img.addEventListener('load', () => tile.classList.add('is-loaded'), { once: true });
      img.src = THUMB(n);
      if (img.complete && img.naturalWidth) tile.classList.add('is-loaded');
      tile.appendChild(img);
      tile.addEventListener('click', (e) => openLightbox(i, j, e.detail === 0));
      grid.appendChild(tile);
    });
  }

  /* 6. Lightbox: opens with a fade (pulsing card if slow); prev/next cross-dissolve in place.
     Neighbours are preloaded. */
  const lb = { folder: 0, index: -1, token: 0, el: null, img: null, count: null, credit: null, lastFocus: null, viaKeyboard: false, tx: null, ty: null };

  function initLightbox() {
    lb.el = document.querySelector('.lightbox');
    if (!lb.el) return;
    lb.img = lb.el.querySelector('.lightbox__img');
    lb.count = lb.el.querySelector('.lightbox__count');
    lb.credit = lb.el.querySelector('.lightbox__credit');
    lb.el.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
    lb.el.querySelector('.lightbox__nav--prev').addEventListener('click', (e) => { e.stopPropagation(); step(-1); });
    lb.el.querySelector('.lightbox__nav--next').addEventListener('click', (e) => { e.stopPropagation(); step(1); });
    lb.el.addEventListener('click', (e) => { if (e.target === lb.el) closeLightbox(); });
    lb.el.addEventListener('touchstart', (e) => { lb.tx = e.touches[0].clientX; lb.ty = e.touches[0].clientY; }, { passive: true });
    lb.el.addEventListener('touchend', (e) => {
      if (lb.tx == null) return;
      const dx = e.changedTouches[0].clientX - lb.tx;
      const dy = e.changedTouches[0].clientY - lb.ty;
      lb.tx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    });
    window.addEventListener('keydown', (e) => {
      if (lb.index < 0) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    });
  }

  function openLightbox(folder, index, viaKeyboard) {
    lb.folder = folder;
    lb.lastFocus = document.activeElement;
    lb.viaKeyboard = !!viaKeyboard;
    lb.img.classList.add('is-hidden');
    lb.el.classList.add('is-open');
    lb.el.setAttribute('aria-hidden', 'false');
    lockScroll(true);
    showPhoto(index, true);
    lb.el.focus({ preventScroll: true }); // focus the viewer itself: keys work, Tab reaches the buttons, nothing looks pre-selected
  }

  function closeLightbox() {
    if (lb.index < 0) return;
    lb.token++;
    lb.index = -1;
    lb.el.classList.remove('is-open', 'is-loading');
    clearGhosts();
    lb.el.setAttribute('aria-hidden', 'true');
    lockScroll(false);
    // Keyboard users get focus back on the photo they opened (with its ring), so they keep their place.
    // Mouse and touch users don't need it, so nothing is left looking selected.
    if (lb.viaKeyboard && lb.lastFocus) lb.lastFocus.focus({ preventScroll: true });
    else if (lb.el.contains(document.activeElement)) document.activeElement.blur();
  }

  function step(d) {
    const n = FOLDERS[lb.folder].photos.length;
    showPhoto((lb.index + d + n) % n, false);
  }

  function clearGhosts() { lb.el.querySelectorAll('.lightbox__ghost').forEach((g) => g.remove()); lb.img.classList.remove('is-xfade'); lb.img.style.transition = ''; }

  // Opening fades the photo in. Stepping cross-dissolves in place: a copy of the current photo
  // sits exactly over it and fades out while the next photo is already underneath, so shared
  // framing (the tower in skies) holds still and only the sky changes.
  function showPhoto(j, opening) {
    const tok = ++lb.token;
    const photos = FOLDERS[lb.folder].photos;
    const n = photos.length;
    let done = false;
    const loaded = loadImage(FULL(photos[j][0])).then(() => { done = true; });
    if (opening) { lb.index = j; clearGhosts(); lb.img.classList.add('is-hidden'); }
    setTimeout(() => {
      if (tok !== lb.token) return;
      if (opening && !done) lb.el.classList.add('is-loading');
      loaded.then(() => {
        if (tok !== lb.token) return;
        const [name, alt] = photos[j];
        let ghost = null;
        if (!opening && lb.img.src) {
          const r = lb.img.getBoundingClientRect();
          ghost = lb.img.cloneNode();
          ghost.className = 'lightbox__ghost';
          ghost.alt = '';
          Object.assign(ghost.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
          lb.img.after(ghost);
          lb.img.classList.add('is-xfade');
        }
        lb.index = j;
        lb.img.src = FULL(name);
        lb.img.alt = alt;
        lb.count.textContent = FOLDERS[lb.folder].key + '/ \u00b7 ' + pad2(j + 1) + ' of ' + pad2(n);
        renderCredit(name);
        lb.el.classList.remove('is-loading');
        const reveal = () => nextFrame(() => {
          if (ghost) {
            // Same shape: the new photo is fully shown underneath, only the old one fades.
            // Different shape: both fade together so the box change dissolves instead of jumping.
            const same = Math.abs(ghost.naturalWidth / ghost.naturalHeight - lb.img.naturalWidth / lb.img.naturalHeight) < 0.01;
            if (same) {
              lb.img.style.transition = 'none';
              lb.img.classList.remove('is-xfade');
              void lb.img.offsetWidth;
              lb.img.style.transition = '';
            } else {
              lb.img.style.transition = 'opacity .6s ease-in-out';
              lb.img.classList.remove('is-xfade');
              setTimeout(() => { lb.img.style.transition = ''; }, 650);
            }
            ghost.addEventListener('transitionend', () => ghost.remove(), { once: true });
            setTimeout(() => ghost.remove(), 900);
            ghost.style.opacity = '0';
          } else if (tok === lb.token) lb.img.classList.remove('is-hidden');
        });
        (lb.img.decode ? lb.img.decode().catch(() => {}) : Promise.resolve()).then(reveal);
        [1, -1].forEach((k) => { new Image().src = FULL(photos[(j + k + n) % n][0]); });
      });
    }, 0);
  }

  function renderCredit(name) {
    const c = CREDITS[name];
    lb.credit.replaceChildren();
    const link = (text, href) => {
      const a = el('a', null, { href, target: '_blank', rel: 'noopener' });
      a.textContent = text;
      a.addEventListener('click', (e) => e.stopPropagation());
      return a;
    };
    if (!c) { lb.credit.textContent = 'Shot by me'; return; }
    if (c.by) lb.credit.append('Photo by ', c.href ? link(c.by, c.href) : c.by);
    else lb.credit.append('Via ', c.href ? link(c.via, c.href) : c.via);
  }

  /* 7. Mobile menu */
  function initMenu() {
    const menu = document.getElementById('menu');
    const btn = document.querySelector('.menu-button');
    if (!menu || !btn) return;
    let open = false;
    const set = (next) => {
      if (next === open) return;
      open = next;
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      btn.setAttribute('aria-expanded', String(open));
      lockScroll(open);
      if (open) menu.querySelector('.menu__close').focus({ preventScroll: true });
      else btn.focus({ preventScroll: true });
    };
    btn.addEventListener('click', () => set(true));
    menu.querySelector('.menu__close').addEventListener('click', () => set(false));
    menu.querySelectorAll('[data-menu-link]').forEach((a) => a.addEventListener('click', () => set(false)));
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) set(false); });
    window.matchMedia('(min-width: 640px)').addEventListener('change', (e) => { if (e.matches) set(false); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initLiveText();
    initProjects();
    initTray();
    initFolders();
    initLightbox();
    initMenu();
  });
})();
