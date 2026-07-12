/* ==========================================================================
   Zakariya Qureshi - personal website
   --------------------------------------------------------------------------
   Contents
     1. Helpers
     2. Live text (experience, copyright year)
     3. Reveal-on-scroll
     4. Collection folders (accordion)
     5. Tray photos (lazy load with retries)
     6. Always-visible images (load pulse + retries)
     7. Lightbox
     8. Mobile menu
     9. Project card stack (small screens)
   ========================================================================== */

(() => {
  'use strict';

  /* 1. Helpers
     ------------------------------------------------------------------------ */

  const prefersReducedMotion = () =>
    window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 2. Live text - never hardcode numbers that drift with time.
     Experience runs from the first job, April 2021.
     ------------------------------------------------------------------------ */

  function initLiveText() {
    const now = new Date();

    const yearsEl = document.getElementById('experience-years');
    if (yearsEl) {
      let years = now.getFullYear() - 2021 - (now.getMonth() < 3 ? 1 : 0);
      if (years < 0) years = 0;
      const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
        'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
        'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
      yearsEl.textContent = years < 20
        ? ones[years]
        : years < 40
          ? (years < 30 ? 'twenty' : 'thirty') + (years % 10 ? '-' + ones[years % 10] : '')
          : String(years);
    }

    const yearEl = document.getElementById('copyright-year');
    if (yearEl) yearEl.textContent = String(now.getFullYear());
  }

  /* 3. Reveal-on-scroll
     Anything already in view at load is left alone - never blank out and
     re-animate content the visitor can already see. Only elements still
     below the fold are pre-hidden and revealed as they enter.
     ------------------------------------------------------------------------ */

  let revealObserver = null;

  function initReveal() {
    if (prefersReducedMotion()) return;

    const cutoff = window.innerHeight * 0.92;
    const pending = [...document.querySelectorAll('.reveal')].filter((el) => {
      if (el.getBoundingClientRect().top < cutoff) return false;
      el.style.opacity = '0';
      return true;
    });
    if (!pending.length) return;

    revealObserver = new IntersectionObserver((entries) => {
      let i = 0;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        revealObserver.unobserve(el);
        el.style.opacity = '';
        el.animate(
          [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 640, delay: Math.min(i++ * 70, 210), easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }
        );
      });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });

    pending.forEach((el) => revealObserver.observe(el));
  }

  /* 4. Collection folders
     One tray open at a time. Heights are measured, then animated with WAAPI;
     hover tints and the +/× glyph are pure CSS driven by the .is-open class.
     ------------------------------------------------------------------------ */

  let openFolder = null;

  function initFolders() {
    const panel = document.querySelector('.folder-panel');
    if (!panel) return;

    panel.addEventListener('click', (event) => {
      const photo = event.target.closest('.photo-tile img');
      if (photo) {
        if (photo.complete && photo.naturalWidth) openLightbox(photo);
        return;
      }
      const row = event.target.closest('.folder-row');
      if (row) toggleFolder(row.closest('.folder'));
    });

    panel.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const row = event.target.closest('.folder-row');
      if (row) {
        event.preventDefault();
        toggleFolder(row.closest('.folder'));
      }
    });
  }

  function toggleFolder(folder) {
    if (!folder) return;
    if (openFolder === folder) {
      openFolder = null;
      closeTray(folder);
      return;
    }
    const previous = openFolder;
    openFolder = folder;
    if (previous) closeTray(previous);
    openTray(folder);
  }

  function openTray(folder) {
    const row = folder.querySelector('.folder-row');
    const tray = folder.querySelector('.folder-tray');
    folder.classList.add('is-open');
    row.setAttribute('aria-expanded', 'true');
    tray.querySelectorAll('img[data-src]').forEach((img) => loadTrayImage(img));

    const from = tray.getBoundingClientRect().height;
    tray.getAnimations().forEach((a) => a.cancel());
    const target = tray.firstElementChild.offsetHeight;

    if (prefersReducedMotion()) {
      tray.style.height = 'auto';
      return;
    }

    tray.style.height = target + 'px';
    const grow = tray.animate(
      [{ height: from + 'px' }, { height: target + 'px' }],
      { duration: 560, easing: 'cubic-bezier(.22,.85,.25,1)' }
    );
    grow.onfinish = () => { tray.style.height = 'auto'; };

    tray.querySelectorAll('.photo-tile').forEach((tile, i) => {
      tile.animate(
        [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 460, delay: 90 + i * 55, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }
      );
    });
  }

  function closeTray(folder) {
    const row = folder.querySelector('.folder-row');
    const tray = folder.querySelector('.folder-tray');
    folder.classList.remove('is-open');
    row.setAttribute('aria-expanded', 'false');

    const from = tray.getBoundingClientRect().height;
    tray.getAnimations().forEach((a) => a.cancel());
    tray.style.height = '0px';
    if (prefersReducedMotion()) return;
    tray.animate(
      [{ height: from + 'px' }, { height: '0px' }],
      { duration: 430, easing: 'cubic-bezier(.33,.75,.3,1)' }
    );
  }

  /* 5. Tray photos - resilient loading.
     data-src stays on the img until a load SUCCEEDS, so closing the tray
     mid-load never strands a tile (reopening re-triggers). Errors auto-retry
     twice with backoff + a cache-buster, a hung request is failed by a 15s
     watchdog, and once the budget is spent the tile gets a [ retry ] chip.
     ------------------------------------------------------------------------ */

  function loadTrayImage(img, fresh) {
    if (!img.getAttribute('data-src') || img.dataset.loading === '1') return;
    if (fresh) img.dataset.tries = '0';

    const tile = img.closest('.photo-tile');
    const oldChip = tile ? tile.querySelector('.photo-retry') : null;
    if (oldChip) oldChip.remove();

    img.dataset.loading = '1';
    const pulse = tile ? pulseWhileLoading(tile) : null;

    let settled = false;
    let watchdog = 0;

    const settle = () => {
      if (settled) return false;
      settled = true;
      clearTimeout(watchdog);
      if (pulse) pulse.cancel();
      delete img.dataset.loading;
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
      return true;
    };

    const onLoad = () => {
      if (!settle()) return;
      img.removeAttribute('data-src');
      delete img.dataset.tries;
      delete img.dataset.attempt;
      img.classList.add('is-loaded');
      img.style.pointerEvents = 'auto';
    };

    const onError = () => {
      if (!settle()) return;
      const tries = parseInt(img.dataset.tries || '0', 10) + 1;
      img.dataset.tries = String(tries);
      if (tries < 3) setTimeout(() => loadTrayImage(img), tries === 1 ? 900 : 2600);
      else if (tile) showRetryChip(tile, img);
    };

    img.style.pointerEvents = 'none';
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    watchdog = setTimeout(onError, 15000);

    const attempt = parseInt(img.dataset.attempt || '0', 10);
    img.dataset.attempt = String(attempt + 1);
    const base = img.getAttribute('data-src');
    img.src = attempt === 0
      ? base
      : base + (base.indexOf('?') === -1 ? '?' : '&') + 'r=' + attempt;
  }

  function showRetryChip(tile, img) {
    if (tile.querySelector('.photo-retry')) return;
    tile.style.position = 'relative';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'photo-retry';
    button.setAttribute('aria-label', 'Retry loading this photo');

    const chip = document.createElement('span');
    chip.textContent = '[ retry ]';
    button.appendChild(chip);

    button.addEventListener('click', (event) => {
      event.stopPropagation();
      loadTrayImage(img, true);
    });
    tile.appendChild(button);
  }

  function pulseWhileLoading(el) {
    if (prefersReducedMotion()) return null;
    return el.animate(
      [{ opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }],
      { duration: 1600, iterations: Infinity, easing: 'ease-in-out' }
    );
  }

  /* 6. Always-visible images (the life collage): pulse while loading and
     auto-retry twice with backoff + cache-buster if a load fails.
     ------------------------------------------------------------------------ */

  function initEagerImages() {
    document.querySelectorAll('img:not([data-src]):not(.lightbox__image)').forEach((img) => {
      if (img.complete && img.naturalWidth) return;
      const base = img.getAttribute('src');
      if (!base) return;

      const pulse = pulseWhileLoading(img);
      let tries = 0;

      const done = () => {
        img.removeEventListener('error', fail);
        if (!pulse) return;
        pulse.cancel();
        img.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: 400, easing: 'ease-out' });
      };

      const attach = () => {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', fail, { once: true });
      };

      const fail = () => {
        img.removeEventListener('load', done);
        img.removeEventListener('error', fail);
        tries += 1;
        if (tries > 2) {
          if (pulse) pulse.cancel();
          return;
        }
        setTimeout(() => {
          attach();
          img.src = base + (base.indexOf('?') === -1 ? '?' : '&') + 'r=' + tries;
        }, tries === 1 ? 900 : 2600);
      };

      attach();
      if (img.complete && !img.naturalWidth) fail();
    });
  }

  /* 7. Lightbox
     Opens from a tray photo with a FLIP animation from the tile's position.
     The image is hidden until the new frame is decoded: an <img> keeps
     painting its previous frame while a fresh src loads, so without this the
     prior photo would linger whenever the next file isn't already cached.
     ------------------------------------------------------------------------ */

  let lightboxOpen = false;

  function initLightbox() {
    const lightbox = document.querySelector('.lightbox');
    if (!lightbox) return;

    lightbox.addEventListener('click', closeLightbox);
    lightbox.querySelector('.lightbox__close').addEventListener('click', (event) => {
      event.stopPropagation();
      closeLightbox();
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeLightbox();
    });
  }

  function openLightbox(thumb) {
    const lightbox = document.querySelector('.lightbox');
    if (!lightbox) return;
    const image = lightbox.querySelector('.lightbox__image');
    const caption = lightbox.querySelector('.lightbox__caption');

    const tray = thumb.closest('.folder-tray');
    const folder = thumb.closest('.folder');
    const photos = tray ? [...tray.querySelectorAll('.photo-tile img')] : [thumb];
    const index = Math.max(0, photos.indexOf(thumb));
    const name = folder ? folder.getAttribute('data-folder') : '';

    // Hide until the new frame is decoded (see section note above).
    image.style.opacity = '0';
    image.src = thumb.currentSrc || thumb.src;
    image.alt = thumb.alt || '';
    const reveal = () => { image.style.opacity = ''; };
    if (image.complete && image.naturalWidth) reveal();
    else image.decode().then(reveal).catch(reveal);

    caption.textContent = name + '/ \u00b7 0' + (index + 1) + ' of 0' + photos.length;

    lightboxOpen = true;
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (prefersReducedMotion()) return;
    const flip = () => {
      requestAnimationFrame(() => {
        const to = image.getBoundingClientRect();
        const fromRect = thumb.getBoundingClientRect();
        if (!to.width || !fromRect.width) return;
        const dx = (fromRect.left + fromRect.width / 2) - (to.left + to.width / 2);
        const dy = (fromRect.top + fromRect.height / 2) - (to.top + to.height / 2);
        const scale = Math.max(fromRect.width / to.width, 0.05);
        image.getAnimations().forEach((a) => a.cancel());
        image.animate(
          [
            { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')', opacity: 0.35 },
            { transform: 'translate(0px,0px) scale(1)', opacity: 1 }
          ],
          { duration: 440, easing: 'cubic-bezier(.2,.8,.2,1)' }
        );
      });
    };
    if (image.complete && image.naturalWidth) flip();
    else image.decode().then(flip).catch(flip);
  }

  function closeLightbox() {
    const lightbox = document.querySelector('.lightbox');
    if (!lightbox || !lightboxOpen) return;
    lightboxOpen = false;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* 8. Mobile menu
     ------------------------------------------------------------------------ */

  let menuOpen = false;

  function initMenu() {
    const button = document.querySelector('.menu-button');
    const menu = document.querySelector('.mobile-menu');
    if (!button || !menu) return;

    button.addEventListener('click', () => openMenu(menu));
    menu.addEventListener('click', (event) => {
      if (event.target.closest('.mobile-menu__close') || event.target.closest('.mobile-menu-link')) {
        closeMenu(menu);
      }
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu(menu);
    });
  }

  function openMenu(menu) {
    if (menuOpen) return;
    menuOpen = true;
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (prefersReducedMotion()) return;
    menu.querySelectorAll('.mobile-menu-link').forEach((link, i) => {
      link.animate(
        [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 460, delay: 60 + i * 50, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }
      );
    });
  }

  function closeMenu(menu) {
    if (!menuOpen) return;
    menuOpen = false;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* 9. Project card stack
     On small screens the four project cards become a swipeable deck:
     drag left/right (or tap) to cycle, dots to jump. Card geometry is
     computed per layout; static styles live in styles.css under .is-stacked.
     ------------------------------------------------------------------------ */

  const stack = {
    container: null,
    cards: [],
    order: [],
    dots: [],
    nav: null,
    counter: null,
    enabled: false,
    busy: false,
    height: 0,
    dragStartX: 0,
    dragStartY: 0,
    dragDX: 0,
    dragging: false,
    pointerId: null
  };

  const stackStep = (containerWidth) =>
    Math.max(14, Math.min(22, Math.round(containerWidth * 0.06)));

  function initStack() {
    const container = document.querySelector('.project-cards');
    if (!container) return;
    stack.container = container;
    stack.cards = [...container.querySelectorAll('.project-card')];
    if (!stack.cards.length) return;
    stack.order = [...stack.cards];
    stack.nav = document.querySelector('.project-nav');
    stack.counter = stack.nav.querySelector('.project-nav__counter');
    stack.dots = [...stack.nav.querySelectorAll('.project-nav__dots button')];

    stack.dots.forEach((dot, i) => {
      dot.addEventListener('click', () => stackGoTo(i));
    });

    const mq = matchMedia('(max-width: 760px)');
    const sync = () => {
      if (mq.matches && !stack.enabled) enableStack();
      else if (!mq.matches && stack.enabled) disableStack();
    };
    mq.addEventListener('change', sync);
    window.addEventListener('resize', () => { if (stack.enabled) layoutStack(false); });
    sync();

    // Re-measure once webfonts land: metrics change card heights.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (stack.enabled) layoutStack(false); });
    }
  }

  function enableStack() {
    stack.enabled = true;
    stack.order = [...stack.cards];
    stack.container.classList.add('is-stacked');
    stack.cards.forEach((card) => {
      if (revealObserver) revealObserver.unobserve(card);
      card.getAnimations().forEach((a) => a.cancel());
      card.style.opacity = '';
    });
    stack.nav.classList.add('is-active');
    stack.nav.setAttribute('aria-hidden', 'false');
    stack.container.addEventListener('pointerdown', onStackPointerDown);
    layoutStack(false);
  }

  function disableStack() {
    stack.enabled = false;
    stack.container.classList.remove('is-stacked');
    stack.container.style.height = '';
    stack.container.removeEventListener('pointerdown', onStackPointerDown);
    window.removeEventListener('pointermove', onStackPointerMove);
    window.removeEventListener('pointerup', onStackPointerUp);
    stack.cards.forEach((card) => {
      card.style.transition = 'none';
      ['transform', 'width', 'height', 'zIndex', 'opacity', 'boxShadow', 'cursor'].forEach((prop) => {
        card.style[prop] = '';
      });
      void card.offsetWidth;   // flush so the transition removal doesn't animate
      card.style.transition = '';
    });
    stack.nav.classList.remove('is-active');
    stack.nav.setAttribute('aria-hidden', 'true');
  }

  function layoutStack(animate) {
    const width = stack.container.clientWidth;
    const count = stack.order.length;
    const step = stackStep(width);
    const cardWidth = width - (count - 1) * step;

    stack.order.forEach((card) => {
      card.style.width = cardWidth + 'px';
      card.style.height = 'auto';
    });
    let height = 0;
    stack.order.forEach((card) => { height = Math.max(height, card.offsetHeight); });
    stack.height = height;
    stack.container.style.height = height + 'px';

    stack.order.forEach((card, i) => {
      card.style.transition = animate ? '' : 'none';
      placeCard(card, i, step, height);
      if (!animate) { void card.offsetWidth; card.style.transition = ''; }
    });
    updateStackNav();
  }

  function placeCard(card, i, step, height) {
    card.style.height = height + 'px';
    card.style.transform = 'translateX(' + (i * step) + 'px)';
    card.style.zIndex = String(100 - i);
    card.style.opacity = '1';
    card.style.boxShadow = i === 0
      ? '14px 0 36px -20px rgba(0,0,0,.55)'
      : '10px 0 28px -20px rgba(0,0,0,.5)';
    card.style.cursor = i === 0 ? 'grab' : 'pointer';
  }

  function updateStackNav() {
    const index = stack.cards.indexOf(stack.order[0]);
    stack.dots.forEach((dot, i) => dot.classList.toggle('is-current', i === index));
    stack.counter.textContent = '0' + (index + 1) + ' / 0' + stack.cards.length;
  }

  function onStackPointerDown(event) {
    if (!stack.enabled || stack.busy) return;
    stack.dragStartX = event.clientX;
    stack.dragStartY = event.clientY;
    stack.dragDX = 0;
    stack.dragging = false;
    stack.pointerId = event.pointerId;
    window.addEventListener('pointermove', onStackPointerMove);
    window.addEventListener('pointerup', onStackPointerUp);
  }

  function onStackPointerMove(event) {
    if (event.pointerId !== stack.pointerId) return;
    const dx = event.clientX - stack.dragStartX;
    const dy = event.clientY - stack.dragStartY;
    if (!stack.dragging) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) { releaseStackDrag(); return; }  // vertical scroll wins
      stack.dragging = true;
      stack.order[0].style.transition = 'none';
    }
    event.preventDefault();
    stack.dragDX = dx;
    const damping = dx > 0 ? 0.32 : 1;   // dragging "back" resists
    stack.order[0].style.transform =
      'translateX(' + (dx * damping) + 'px) rotate(' + (dx * 0.018) + 'deg)';
  }

  function onStackPointerUp() {
    releaseStackDrag();
    const front = stack.order[0];
    const dx = stack.dragDX;
    const wasDragging = stack.dragging;
    stack.dragging = false;
    front.style.transition = '';
    if (!wasDragging) { advanceStack(); return; }   // plain tap: next card
    if (dx < -58) advanceStack();
    else if (dx > 58) rewindStack();
    else layoutStack(true);                          // not far enough: settle back
  }

  function releaseStackDrag() {
    window.removeEventListener('pointermove', onStackPointerMove);
    window.removeEventListener('pointerup', onStackPointerUp);
  }

  function advanceStack() {
    if (stack.busy) return;
    const step = stackStep(stack.container.clientWidth);
    const front = stack.order[0];
    const recycle = () => {
      stack.order.push(stack.order.shift());
      layoutStackFrom(step, front);
    };
    if (prefersReducedMotion()) { recycle(); return; }
    stack.busy = true;
    front.style.transition = 'transform .4s cubic-bezier(.55,0,.7,.2), opacity .4s ease';
    front.style.transform = 'translateX(-118%) rotate(-7deg)';
    front.style.opacity = '0';
    setTimeout(() => { recycle(); stack.busy = false; }, 430);
  }

  function rewindStack() {
    if (stack.busy) return;
    const step = stackStep(stack.container.clientWidth);
    const incoming = stack.order[stack.order.length - 1];
    incoming.style.transition = 'none';
    incoming.style.transform = 'translateX(-118%) rotate(-7deg)';
    incoming.style.opacity = '0';
    incoming.style.zIndex = '101';
    void incoming.offsetWidth;
    stack.order.unshift(stack.order.pop());
    if (prefersReducedMotion()) { layoutStack(false); return; }
    stack.busy = true;
    requestAnimationFrame(() => {
      stack.order.forEach((card, i) => {
        card.style.transition = '';
        placeCard(card, i, step, stack.height);
      });
      updateStackNav();
      setTimeout(() => { stack.busy = false; }, 430);
    });
  }

  /* Re-place every card after the front card was recycled to the back;
     the recycled card jumps without transition, the rest glide. */
  function layoutStackFrom(step, jumpCard) {
    stack.order.forEach((card, i) => {
      const jump = card === jumpCard;
      card.style.transition = jump ? 'none' : '';
      placeCard(card, i, step, stack.height);
      if (jump) { void card.offsetWidth; card.style.transition = ''; }
    });
    updateStackNav();
  }

  function stackGoTo(cardIndex) {
    if (stack.busy) return;
    const target = stack.cards[cardIndex];
    const position = stack.order.indexOf(target);
    if (position <= 0) return;
    stack.order = stack.order.slice(position).concat(stack.order.slice(0, position));
    layoutStack(true);
  }

  /* Boot
     ------------------------------------------------------------------------ */

  initLiveText();
  initReveal();
  initFolders();
  initEagerImages();
  initLightbox();
  initMenu();
  initStack();
})();
