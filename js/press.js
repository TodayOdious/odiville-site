(function () {
  'use strict';

  const pressEntries      = window.PRESS_ENTRIES      || [];
  const exhibitionEntries = window.EXHIBITION_ENTRIES || [];
  const hasContent = pressEntries.length > 0 || exhibitionEntries.length > 0;

  const placeholder  = document.getElementById('pressPlaceholder');
  const entriesEl    = document.getElementById('pressEntries');
  const section      = document.getElementById('pressSection');
  if (!section) return;

  if (!hasContent) {
    // Empty state already in DOM — nothing extra to do
    return;
  }

  // Hide placeholder, show entries container
  if (placeholder) placeholder.style.display = 'none';
  if (entriesEl)   entriesEl.style.display    = 'block';

  /* ── Press articles ─────────────────────────────────────── */
  if (pressEntries.length > 0) {
    const pressBlock = document.createElement('div');
    pressBlock.className = 'press-block reveal';
    pressBlock.innerHTML = '<h2 class="press-block-title">Press</h2>';

    const list = document.createElement('ul');
    list.className = 'press-list';

    pressEntries.forEach(entry => {
      const li = document.createElement('li');
      li.className = 'press-item';
      li.innerHTML = `
        <div class="press-item-meta">
          <span class="press-pub">${entry.pub}</span>
          <span class="press-date">${entry.date}</span>
        </div>
        <div class="press-item-body">
          ${entry.url
            ? `<a class="press-title" href="${entry.url}" target="_blank" rel="noopener">${entry.title} &#8599;</a>`
            : `<span class="press-title">${entry.title}</span>`
          }
          ${entry.description ? `<p class="press-desc">${entry.description}</p>` : ''}
        </div>`;
      list.appendChild(li);
    });

    pressBlock.appendChild(list);
    entriesEl.appendChild(pressBlock);
  }

  /* ── Exhibitions ─────────────────────────────────────────── */
  if (exhibitionEntries.length > 0) {
    const exBlock = document.createElement('div');
    exBlock.className = 'press-block reveal';
    exBlock.innerHTML = '<h2 class="press-block-title">Exhibitions</h2>';

    const grid = document.createElement('div');
    grid.className = 'exhibitions-grid';

    exhibitionEntries.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'exhibition-card';
      card.innerHTML = `
        <div class="exhibition-date">${entry.date}</div>
        <div class="exhibition-venue">${entry.venue}</div>
        <div class="exhibition-title">${entry.title}</div>
        <div class="exhibition-location">${entry.location}</div>
        ${entry.description ? `<p class="exhibition-desc">${entry.description}</p>` : ''}
        ${entry.url ? `<a class="exhibition-link" href="${entry.url}" target="_blank" rel="noopener">Details &#8599;</a>` : ''}`;
      grid.appendChild(card);
    });

    exBlock.appendChild(grid);
    entriesEl.appendChild(exBlock);
  }

  // Re-observe reveals
  if (typeof observeReveals === 'function') observeReveals();

})();
