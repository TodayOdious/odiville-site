(function () {
  'use strict';

  const registry = window.ARTWORK_REGISTRY || [];

  // Active filter state
  const filters = { project: 'all', type: 'all' };

  // Accent colour per project
  const PROJECT_COLOR = {
    duu: 'var(--accent-duu)',
    whispers: 'var(--accent-whispers)',
    owt: 'var(--accent-owt)'
  };

  /* ── Grid build ──────────────────────────────────────────── */

  function buildGrid() {
    const grid = document.getElementById('archiveGrid');
    const countEl = document.getElementById('archiveCount');
    if (!grid) return;

    grid.innerHTML = '';
    const visible = registry.filter(artwork => {
      const pMatch = filters.project === 'all' || artwork.project === filters.project;
      const tMatch = filters.type === 'all' || artwork.type === filters.type;
      return pMatch && tMatch;
    });

    const countText = visible.length + ' work' + (visible.length !== 1 ? 's' : '');
    countEl.textContent = countText;
    countEl.setAttribute('aria-live', 'polite');
    countEl.setAttribute('aria-atomic', 'true');

    visible.forEach((artwork, idx) => {
      const item = document.createElement('div');
      item.className = 'archive-item';
      item.dataset.id = artwork.id;

      const isVideo = artwork.src.endsWith('.mp4');
      const accentColor = PROJECT_COLOR[artwork.project] || 'var(--white)';

      if (isVideo) {
        item.innerHTML = `
          <div class="archive-item-video-thumb">
            <svg class="archive-play-icon" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" stroke="currentColor" stroke-width="1"/>
              <polygon points="10,8 18,12 10,16" fill="currentColor"/>
            </svg>
          </div>
          <div class="archive-item-overlay" style="--accent:${accentColor}">
            <span class="archive-item-name">${artwork.name}</span>
            <span class="archive-item-project">${artwork.projectName}</span>
          </div>`;
      } else {
        item.innerHTML = `
          <img src="${artwork.src}" alt="${artwork.name}" loading="lazy" decoding="async">
          <div class="archive-item-overlay" style="--accent:${accentColor}">
            <span class="archive-item-name">${artwork.name}</span>
            <span class="archive-item-project">${artwork.projectName}</span>
          </div>`;
      }

      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', artwork.name + ' — ' + artwork.projectName);
      item.addEventListener('click', () => openLightbox(artwork));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(artwork); }
      });
      grid.appendChild(item);
    });

    // Re-run lazy image observer for new images
    if (typeof initLazyImages === 'function') initLazyImages();
  }

  /* ── Filters ─────────────────────────────────────────────── */

  function initFilters() {
    const filterBtns = document.querySelectorAll('#archiveFilters .archive-filter');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.dataset.filter;
        const value = btn.dataset.value;
        filters[group] = value;

        // Update active state within this group
        document.querySelectorAll(`#archiveFilters [data-filter="${group}"]`)
          .forEach(b => b.classList.toggle('active', b === btn));

        buildGrid();
      });
    });
  }

  /* ── Lightbox ─────────────────────────────────────────────── */

  let lightboxOpen = false;

  function closeLightbox() {
    const lb = document.getElementById('archiveLightbox');
    const media = document.getElementById('archiveLightboxMedia');
    if (!lb) return;
    lb.classList.remove('active');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // Pause any video
    const video = media.querySelector('video');
    if (video) video.pause();
    lightboxOpen = false;
    // Return focus to the element that opened the lightbox
    if (_triggerEl) { _triggerEl.focus(); _triggerEl = null; }
  }

  /* Focus trap helper */
  function getFocusable(container) {
    return Array.from(container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.disabled && el.offsetParent !== null);
  }

  function trapFocus(e) {
    const lb = document.getElementById('archiveLightbox');
    if (!lb || !lightboxOpen) return;
    const focusable = getFocusable(lb);
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  }

  let _triggerEl = null; // element that opened the lightbox

  function openLightbox(artwork) {
    _triggerEl = document.activeElement;
    // ... rest handled after
    const lb = document.getElementById('archiveLightbox');
    const media = document.getElementById('archiveLightboxMedia');
    const projEl = document.getElementById('archiveLightboxProject');
    const nameEl = document.getElementById('archiveLightboxName');
    const metaEl = document.getElementById('archiveLightboxMeta');
    if (!lb) return;

    const accentColor = PROJECT_COLOR[artwork.project] || 'var(--white)';
    const isVideo = artwork.src.endsWith('.mp4');

    media.innerHTML = isVideo
      ? `<video src="${artwork.src}" controls autoplay loop muted playsinline></video>`
      : `<img src="${artwork.src}" alt="${artwork.name}" loading="lazy" decoding="async">`;

    projEl.textContent = artwork.projectName;
    projEl.style.color = accentColor;
    nameEl.textContent = artwork.name;
    metaEl.textContent = [artwork.chapter, artwork.type].filter(Boolean).join(' · ');

    lb.classList.add('active');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    lightboxOpen = true;

    // Focus the close button
    setTimeout(() => document.getElementById('archiveLightboxClose')?.focus(), 50);
  }

  function initLightbox() {
    document.getElementById('archiveLightboxClose')
      ?.addEventListener('click', closeLightbox);
    document.getElementById('archiveLightboxBackdrop')
      ?.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => {
      if (lightboxOpen && e.key === 'Escape') closeLightbox();
      if (lightboxOpen) trapFocus(e);
    });
  }

  /* ── Init ─────────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    initLightbox();
    buildGrid();
  });

})();
