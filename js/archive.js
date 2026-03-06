(function () {
  'use strict';

  var inventory = [];
  var listings  = {};   // { "contract:tokenId": listing }
  var floors    = {};   // { "collection-slug": { price, currency } }
  var listingsFetchedAt = null;
  var savedScrollY  = 0;
  var activeItem    = null;
  var sortKey       = 'name';
  var sortDir       = 'asc';
  var filterProject = 'all';
  var searchQuery   = '';
  var currentView   = 'table';

  /* ── Project config ─────────────────────────────────────── */

  var PROJECT_CONFIG = {
    'duu':                  { label: 'Echoes by Odious',          color: 'var(--accent-duu)' },
    'whispers':             { label: 'Whispers',                 color: 'var(--accent-whispers)' },
    'residents':            { label: 'Residents of Odiville',    color: 'var(--accent-whispers)' },
    'owt':                  { label: 'One-Way Ticket',           color: '#8fbcba' },
    'this-place-remembers': { label: 'This Place Remembers',     color: '#a4d4ae' },
    'ferrymanspromise':     { label: "The Ferryman's Promise",   color: '#7ea8c4' },
    'this-is-reality':      { label: 'This is Reality',          color: '#c8a06c' },
    'editions':             { label: 'Editions',                 color: 'var(--white-dim)' },
    'receipts':             { label: 'RECEIPTS',                 color: 'var(--white-faint)' },
    'game-master':          { label: 'Game Master',              color: '#b89cce' },
    'originals':            { label: 'Originals',                color: 'var(--white-dim)' },
  };

  /* ── Helpers ────────────────────────────────────────────── */

  function escHtml(str) {
    var d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function getListingKey(rec) {
    if (!rec.contract || rec.tokenId == null) return null;
    return rec.contract.toLowerCase() + ':' + rec.tokenId;
  }

  function getListing(rec) {
    var key = getListingKey(rec);
    return key ? listings[key] || null : null;
  }

  function fmtPrice(price, currency) {
    if (!price || price <= 0) return null;
    var p = price < 0.001 ? price.toFixed(6) :
            price < 1     ? price.toFixed(4) :
            price < 100   ? price.toFixed(2) : String(Math.round(price));
    // Trim trailing zeros after decimal
    if (p.indexOf('.') !== -1) {
      p = p.replace(/0+$/, '').replace(/\.$/, '');
    }
    return p + ' ' + (currency || 'ETH');
  }

  /* ── Chain icons ────────────────────────────────────────── */

  var CHAIN_LABELS = {
    ethereum: { text: 'ETH',   cls: 'archive-chain-label--eth' },
    shape:    { text: 'Shape', cls: 'archive-chain-label--shape' },
    apechain: { text: 'Ape',   cls: 'archive-chain-label--apechain' },
  };

  /* ── Filter + sort ──────────────────────────────────────── */

  function getFiltered() {
    return inventory.filter(function (a) {
      // Special "for-sale" filter
      if (filterProject === 'for-sale') {
        return !!getListing(a);
      }
      if (filterProject !== 'all' && a.project !== filterProject) return false;
      if (searchQuery) {
        var q = searchQuery.toLowerCase();
        return (a.title       || '').toLowerCase().indexOf(q) !== -1 ||
               (a.projectName || '').toLowerCase().indexOf(q) !== -1 ||
               (a.contract    || '').toLowerCase().indexOf(q) !== -1 ||
               (a.description || '').toLowerCase().indexOf(q) !== -1;
      }
      return true;
    });
  }

  function getSorted(items) {
    var list = items.slice();
    list.sort(function (a, b) {
      var av, bv;
      switch (sortKey) {
        case 'name':
          av = (a.title || '').toLowerCase();
          bv = (b.title || '').toLowerCase();
          break;
        case 'project':
          av = (a.projectName || '').toLowerCase();
          bv = (b.projectName || '').toLowerCase();
          break;
        case 'blockchain':
          av = (a.blockchain || '').toLowerCase();
          bv = (b.blockchain || '').toLowerCase();
          break;
        case 'token':
          av = a.tokenId != null ? a.tokenId : 9999;
          bv = b.tokenId != null ? b.tokenId : 9999;
          return sortDir === 'asc' ? av - bv : bv - av;
        case 'date':
          av = a.mintDate || '0000-00-00';
          bv = b.mintDate || '0000-00-00';
          break;
        case 'standard':
          av = a.tokenStandard || 'zz';
          bv = b.tokenStandard || 'zz';
          break;
        case 'filetype':
          av = a.fileExt || a.mediaType || 'zz';
          bv = b.fileExt || b.mediaType || 'zz';
          break;
        case 'price':
          // Listed items first, sorted by price; unlisted at bottom
          var la = getListing(a), lb = getListing(b);
          av = la ? la.price : 999999;
          bv = lb ? lb.price : 999999;
          return sortDir === 'asc' ? av - bv : bv - av;
        default:
          av = (a.title || '').toLowerCase();
          bv = (b.title || '').toLowerCase();
      }
      var cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }

  /* ── Render dispatcher ──────────────────────────────────── */

  function render() {
    if (currentView === 'grid') {
      buildGrid();
    } else {
      buildList();
    }
    updateFreshnessLabel();
  }

  /* ── Freshness indicator ─────────────────────────────────── */

  function timeAgo(dateStr) {
    if (!dateStr) return null;
    var then = new Date(dateStr).getTime();
    if (isNaN(then)) return null;
    var diff = Date.now() - then;
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    var days = Math.floor(hrs / 24);
    return days + 'd ago';
  }

  function updateFreshnessLabel() {
    var el = document.getElementById('archiveListingsAge');
    if (!el) return;
    if (!listingsFetchedAt) {
      el.style.display = 'none';
      return;
    }
    var ago = timeAgo(listingsFetchedAt);
    if (ago) {
      el.textContent = 'Prices: ' + ago;
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  }

  /* ── Table render ───────────────────────────────────────── */

  function buildList() {
    var container = document.getElementById('archiveList');
    var countEl   = document.getElementById('archiveCount');
    if (!container) return;

    var items = getSorted(getFiltered());
    container.innerHTML = '';
    countEl.textContent = items.length + ' work' + (items.length !== 1 ? 's' : '');

    items.forEach(function (rec) {
      var row = document.createElement('div');
      row.className = 'archive-row';
      row.setAttribute('data-project', rec.project || '');

      var proj     = rec.project || '';
      var cfg      = PROJECT_CONFIG[proj] || { label: rec.projectName || proj, color: 'var(--white-dim)' };
      var tokenVal = rec.tokenId != null ? rec.tokenId : '—';
      var dateVal  = rec.mintDate || '—';
      var standard = rec.tokenStandard ? rec.tokenStandard.replace('erc-', '').replace('ERC-', '') : '—';
      var fileType = rec.fileExt || (rec.mediaType ? rec.mediaType.split('/').pop() : null) || '—';
      var chain    = rec.blockchain || 'ethereum';
      var chainCfg = CHAIN_LABELS[chain] || { text: chain, cls: '' };
      var chainCell = '<span class="archive-chain-label ' + chainCfg.cls + '">' + escHtml(chainCfg.text) + '</span>';

      var ownerShort = rec.owner ? rec.owner.slice(0, 6) + '…' + rec.owner.slice(-4) : '—';
      var ownerCell  = rec.owner
        ? '<a class="archive-owner-link" href="https://opensea.io/' + encodeURIComponent(rec.owner) + '" target="_blank" rel="noopener">' + escHtml(ownerShort) + '</a>'
        : '<span class="archive-dash">—</span>';

      var collectionLabel = rec.projectName || cfg.label;
      var collectionCell = '<span class="archive-collection-link">' + escHtml(collectionLabel) + '</span>';

      var standardCell = standard !== '—'
        ? '<span class="archive-standard-badge">' + escHtml(standard) + '</span>'
        : '<span class="archive-dash">—</span>';

      var descIcon = rec.description
        ? '<span class="archive-desc-icon" title="' + escHtml(rec.description) + '">&#9432;</span>'
        : '';

      // Price cell
      var listing = getListing(rec);
      var priceCell;
      if (listing) {
        var pStr = fmtPrice(listing.price, listing.currency);
        priceCell = '<span class="archive-price-tag">' + escHtml(pStr) + '</span>';
      } else {
        priceCell = '<span class="archive-dash">—</span>';
      }

      row.innerHTML =
        '<span class="atcol atcol--token">'    + escHtml(String(tokenVal)) + '</span>' +
        '<span class="atcol atcol--title atcol--clickable">' + descIcon + escHtml(rec.title) + '</span>' +
        '<span class="atcol atcol--series">'   + collectionCell + '</span>' +
        '<span class="atcol atcol--date">'     + escHtml(dateVal) + '</span>' +
        '<span class="atcol atcol--chain">'    + chainCell + '</span>' +
        '<span class="atcol atcol--standard">' + standardCell + '</span>' +
        '<span class="atcol atcol--filetype atcol--ft-' + escHtml(fileType || '') + '">' + escHtml(fileType || '—') + '</span>' +
        '<span class="atcol atcol--price">'    + priceCell + '</span>' +
        '<span class="atcol atcol--owner">'    + ownerCell + '</span>';

      if (listing) row.classList.add('archive-row--listed');

      var titleCell = row.querySelector('.atcol--clickable');
      if (titleCell) {
        titleCell.addEventListener('click', function () {
          if (activeItem) activeItem.classList.remove('is-active');
          activeItem = row;
          row.classList.add('is-active');
          openPanel(rec, rec.localImage || rec.imageUrl || rec.mediaUrl || '');
        });
      }

      container.appendChild(row);
    });
  }

  /* ── Grid render ────────────────────────────────────────── */

  function buildGrid() {
    var grid    = document.getElementById('archiveGrid');
    var countEl = document.getElementById('archiveCount');
    var table   = document.getElementById('archiveTable');
    if (!grid) return;

    var items = getSorted(getFiltered());
    countEl.textContent = items.length + ' work' + (items.length !== 1 ? 's' : '');

    table.style.display = 'none';
    grid.style.display  = 'grid';
    grid.innerHTML = '';

    items.forEach(function (rec) {
      var proj  = rec.project || '';
      var cfg   = PROJECT_CONFIG[proj] || { label: rec.projectName || proj, color: 'var(--white-dim)' };
      var thumb = rec.localImage || rec.imageUrl || rec.mediaUrl || '';
      var ext   = (rec.fileExt || '').toLowerCase();
      var isGif = ext === 'gif' || (thumb && thumb.endsWith('.gif'));

      var card = document.createElement('div');
      card.className = 'gallery-card';
      card.setAttribute('data-project', proj);

      var mediaHtml;
      if (thumb) {
        mediaHtml = '<img class="gallery-card-img" src="' + escHtml(thumb) + '" alt="' + escHtml(rec.title) + '" loading="lazy">';
      } else {
        mediaHtml = '<div class="gallery-card-placeholder"></div>';
      }

      // Price badge for listed items
      var listing = getListing(rec);
      var priceBadge = '';
      if (listing) {
        var pStr = fmtPrice(listing.price, listing.currency);
        priceBadge = '<span class="gallery-card-price">' + escHtml(pStr) + '</span>';
      }

      card.innerHTML =
        '<div class="gallery-card-media">' + mediaHtml + priceBadge + '</div>' +
        '<div class="gallery-card-info">' +
          '<span class="gallery-card-collection">' + escHtml(rec.projectName || cfg.label) + '</span>' +
          '<span class="gallery-card-title">' + escHtml(rec.title) + '</span>' +
        '</div>';

      card.addEventListener('click', function () {
        if (activeItem) activeItem.classList.remove('is-active');
        activeItem = card;
        card.classList.add('is-active');
        openPanel(rec, thumb);
      });
      grid.appendChild(card);
    });
  }

  /* ── Detail panel ───────────────────────────────────────── */

  function fmtBytes(bytes) {
    if (!bytes) return null;
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function fmtDuration(ms) {
    if (!ms) return null;
    var s = ms / 1000;
    return s % 1 === 0 ? s + 's' : s.toFixed(1) + 's';
  }

  function openPanel(rec, thumb) {
    var panel   = document.getElementById('galleryPanel');
    var overlay = document.getElementById('galleryPanelOverlay');
    var media   = document.getElementById('galleryPanelMedia');
    var meta    = document.getElementById('galleryPanelMeta');
    if (!panel) return;

    var proj = rec.project || '';
    var cfg  = PROJECT_CONFIG[proj] || { label: rec.projectName || proj, color: 'var(--white-dim)' };

    // Media — prefer displayAnimationUrl (CDN-served animated version), fall back to thumb
    var animUrl = rec.displayAnimationUrl || '';
    var isVideo = animUrl && /\.(mp4|webm|mov)(\?|$)/i.test(animUrl);

    if (isVideo) {
      media.innerHTML =
        '<video class="gallery-panel-img" src="' + escHtml(animUrl) + '" autoplay loop muted playsinline controls></video>';
    } else if (animUrl) {
      media.innerHTML = '<img class="gallery-panel-img" src="' + escHtml(animUrl) + '" alt="' + escHtml(rec.title) + '">';
    } else if (thumb) {
      media.innerHTML = '<img class="gallery-panel-img" src="' + escHtml(thumb) + '" alt="' + escHtml(rec.title) + '">';
    } else {
      media.innerHTML = '<div class="gallery-panel-no-media">No preview available</div>';
    }

    // Metadata helpers
    var ownerShort = rec.owner ? rec.owner.slice(0, 6) + '…' + rec.owner.slice(-4) : null;
    var ownerHtml  = rec.owner
      ? '<a href="https://opensea.io/' + encodeURIComponent(rec.owner) + '" target="_blank" rel="noopener">' + escHtml(ownerShort) + '</a>'
      : '—';
    var contractShort = rec.contract ? rec.contract.slice(0, 6) + '…' + rec.contract.slice(-4) : '—';
    var chainCfg = CHAIN_LABELS[rec.blockchain || 'ethereum'] || { text: rec.blockchain || '—', cls: '' };

    function row(label, val) {
      if (!val || val === '—') return '';
      return '<div class="gp-row"><span class="gp-label">' + escHtml(label) + '</span><span class="gp-val">' + val + '</span></div>';
    }

    // Listing / price
    var listing = getListing(rec);
    var priceHtml = '';
    if (listing) {
      var pStr = fmtPrice(listing.price, listing.currency);
      var buyUrl = rec.openseaUrl || '';
      priceHtml =
        '<div class="gp-price-block">' +
          '<span class="gp-price-amount">' + escHtml(pStr) + '</span>' +
          (buyUrl
            ? '<a class="gp-buy-btn" href="' + escHtml(buyUrl) + '" target="_blank" rel="noopener">Buy on OpenSea</a>'
            : '') +
        '</div>';
    }

    // Floor price for this collection
    var floorHtml = '';
    var slug = rec.openseaCollection;
    if (slug && floors[slug] && floors[slug].price > 0) {
      floorHtml = escHtml(fmtPrice(floors[slug].price, floors[slug].currency));
    }

    // Dimensions + file info
    var dimsVal = (rec.width && rec.height)
      ? escHtml(rec.width + ' × ' + rec.height + ' px')
      : null;

    var fileInfoParts = [];
    var fileExt = (rec.trueFileExt || rec.fileExt || (rec.mediaType ? rec.mediaType.split('/').pop() : null) || '').toUpperCase();
    if (fileExt) fileInfoParts.push(fileExt);
    if (rec.gifFrames) fileInfoParts.push(rec.gifFrames + ' frames');
    if (rec.gifDurationMs) fileInfoParts.push(fmtDuration(rec.gifDurationMs));
    var fileInfoVal = fileInfoParts.length ? escHtml(fileInfoParts.join(' · ')) : null;

    var fileSizeVal = rec.fileSize ? escHtml(fmtBytes(rec.fileSize)) : null;

    // Traits
    var traitsHtml = '';
    if (rec.traits && rec.traits.length) {
      traitsHtml = '<div class="gp-traits">' +
        rec.traits.map(function (t) {
          return '<div class="gp-trait">' +
            '<span class="gp-trait-type">' + escHtml(t.trait_type || t.type || '') + '</span>' +
            '<span class="gp-trait-val">'  + escHtml(String(t.value || '')) + '</span>' +
          '</div>';
        }).join('') +
      '</div>';
    }

    // Links
    var downloadUrl = rec.originalAnimationUrl || rec.originalImageUrl || rec.displayAnimationUrl || rec.imageUrl || '';
    var downloadExt = (rec.trueFileExt || rec.fileExt || 'file').toLowerCase();
    var downloadName = (rec.title || 'artwork').replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.' + downloadExt;

    var links = [];
    if (rec.openseaUrl)
      links.push('<a class="gp-link" href="' + escHtml(rec.openseaUrl) + '" target="_blank" rel="noopener">View on OpenSea</a>');
    if (downloadUrl)
      links.push('<a class="gp-link gp-link--download" href="' + escHtml(downloadUrl) + '" download="' + escHtml(downloadName) + '" target="_blank" rel="noopener">Download ' + escHtml(downloadExt.toUpperCase()) + '</a>');

    meta.innerHTML =
      '<h2 class="gp-title">' + escHtml(rec.title) + '</h2>' +
      '<p class="gp-collection">' + escHtml(rec.projectName || cfg.label) + '</p>' +
      priceHtml +
      (rec.description ? '<p class="gp-description">' + escHtml(rec.description).replace(/\n/g, '<br>') + '</p>' : '') +
      traitsHtml +
      '<div class="gp-rows">' +
        row('Dimensions',  dimsVal) +
        row('File',        fileInfoVal) +
        row('File Size',   fileSizeVal) +
        row('Floor Price', floorHtml) +
        row('Token ID',    rec.tokenId != null ? String(rec.tokenId) : null) +
        row('Mint Date',   rec.mintDate) +
        row('Editions',    rec.editions != null && rec.editions > 1 ? String(rec.editions) : null) +
        row('Standard',    rec.tokenStandard ? rec.tokenStandard.toUpperCase() : null) +
        row('Blockchain',  '<span class="archive-chain-label ' + chainCfg.cls + '">' + escHtml(chainCfg.text) + '</span>') +
        row('Contract',    rec.contract ? '<span title="' + escHtml(rec.contract) + '">' + escHtml(contractShort) + '</span>' : null) +
        row('Owner',       ownerHtml) +
      '</div>' +
      (links.length ? '<div class="gp-links">' + links.join('') + '</div>' : '');

    panel.classList.add('is-open');
    overlay.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
  }

  function closePanel() {
    var panel   = document.getElementById('galleryPanel');
    var overlay = document.getElementById('galleryPanelOverlay');
    if (!panel) return;
    panel.classList.remove('is-open');
    overlay.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
  }

  /* ── Sort headers ───────────────────────────────────────── */

  function initSortHeaders() {
    var headers = document.querySelectorAll('.archive-thead .sortable');
    headers.forEach(function (th) {
      th.addEventListener('click', function () {
        var key = th.dataset.sort;
        sortDir = (sortKey === key) ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
        sortKey = key;
        updateHeaderIndicators();
        render();
      });
    });
  }

  function updateHeaderIndicators() {
    document.querySelectorAll('.archive-thead .sortable').forEach(function (th) {
      th.classList.toggle('sort-active', th.dataset.sort === sortKey);
      th.removeAttribute('data-dir');
      if (th.dataset.sort === sortKey) th.setAttribute('data-dir', sortDir);
    });
  }

  /* ── Filter tabs ────────────────────────────────────────── */

  function initFilterTabs() {
    var tabs = document.querySelectorAll('#archiveFilters .archive-filter-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        filterProject = tab.dataset.filter;
        tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
        render();
      });
    });
  }

  /* ── Search ─────────────────────────────────────────────── */

  function initSearch() {
    var input = document.getElementById('archiveSearch');
    if (!input) return;
    input.addEventListener('input', function () {
      searchQuery = input.value.trim();
      render();
    });
  }

  /* ── Listings API (Vercel proxy) ────────────────────────── */

  // Set this to your Vercel project URL once deployed, e.g.:
  // 'https://odiville-xyz.vercel.app/api/listings'
  // Leave empty to use only the static listings.js fallback.
  var LISTINGS_API_URL = 'https://odiville-site.vercel.app/api/listings';

  function applyListingsData(ldata) {
    if (!ldata) return;
    listings          = ldata.listings || {};
    floors            = ldata.floors   || {};
    listingsFetchedAt = ldata.fetchedAt || null;
    console.log('[archive] Listings loaded: ' + Object.keys(listings).length +
      ' listings, fetched ' + (listingsFetchedAt || 'unknown'));
  }

  /* ── Load data ──────────────────────────────────────────── */

  function loadInventory() {
    var data = window.INVENTORY;
    if (data && data.records) {
      inventory = data.records;
      console.log('[archive] Loaded ' + inventory.length + ' records from INVENTORY');
    } else {
      console.warn('[archive] window.INVENTORY not found');
      var countEl = document.getElementById('archiveCount');
      if (countEl) countEl.textContent = 'no data';
    }

    // Apply static listings.js as immediate fallback
    if (window.LISTINGS) {
      applyListingsData(window.LISTINGS);
    }

    render();

    // Fetch live listings from Vercel API (updates prices in background)
    if (LISTINGS_API_URL) {
      fetch(LISTINGS_API_URL)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (ldata) {
          if (!ldata) return;
          applyListingsData(ldata);
          render();
        })
        .catch(function (e) {
          console.warn('[archive] Live listings fetch failed:', e);
        });
    }
  }

  /* ── View toggle ────────────────────────────────────────── */

  function initViewToggle() {
    var btns = document.querySelectorAll('.archive-view-btn');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentView = btn.dataset.view;
        btns.forEach(function (b) { b.classList.toggle('active', b === btn); });

        var table = document.getElementById('archiveTable');
        var grid  = document.getElementById('archiveGrid');

        if (currentView === 'table') {
          if (table) table.style.display = '';
          if (grid)  grid.style.display  = 'none';
        }
        render();
      });
    });

    // Panel close
    var closeBtn = document.getElementById('galleryPanelClose');
    var overlay  = document.getElementById('galleryPanelOverlay');
    if (closeBtn) closeBtn.addEventListener('click', closePanel);
    if (overlay)  overlay.addEventListener('click', closePanel);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePanel();
    });
  }

  /* ── Init ───────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    initSortHeaders();
    initFilterTabs();
    initSearch();
    initViewToggle();
    updateHeaderIndicators();
    loadInventory();
  });

})();
