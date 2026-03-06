(function () {
  'use strict';

  const registry = window.ARTWORK_REGISTRY || [];

  let sortKey       = 'name';
  let sortDir       = 'asc';
  let filterProject = 'all';
  let searchQuery   = '';

  let chainItems = [];  // synthetic entries for on-chain tokens not in registry

  /* ── Project config ─────────────────────────────────────── */

  const PROJECT_CONFIG = {
    duu:      { label: 'The Book',       url: 'https://opensea.io/todayodious',                       platform: '—' },
    whispers: { label: 'Whispers',       url: 'https://opensea.io/collection/whispers-of-odiville',  platform: 'OpenSea' },
    owt:      { label: 'One-Way Ticket', url: 'https://opensea.io/collection/one-way-ticket',         platform: 'OpenSea' },
  };

  /* ── Project guess from contract name ───────────────────── */

  function guessProject(contractName) {
    const n = (contractName || '').toLowerCase();
    if (n.includes('whisper'))                       return 'whispers';
    if (n.includes('ticket') || n.includes('owt'))  return 'owt';
    if (n.includes('duu') || n.includes('book') ||
        n.includes('odiville') || n.includes('key') ||
        n.includes('fragment') || n.includes('arrival') ||
        n.includes('today'))                         return 'duu';
    return 'duu';  // default fallback
  }

  /* ── Build synthetic items from chain data ───────────────── */

  // Set of registry keys already covered: contractAddress:tokenId
  function buildRegistryKeySet() {
    const keys = new Set();
    registry.forEach(function (a) {
      if (a.tokenId == null) return;
      if (a.contract)         keys.add(a.contract.toLowerCase() + ':' + a.tokenId);
      if (a.contractAddress)  keys.add(a.contractAddress.toLowerCase() + ':' + a.tokenId);
    });
    return keys;
  }

  function buildChainItems(chainData) {
    const covered = buildRegistryKeySet();
    const items   = [];

    Object.entries(chainData).forEach(function ([addr, info]) {
      const project = guessProject(info.name);
      Object.entries(info.tokens || {}).forEach(function ([tokenId, tokenInfo]) {
        const key = addr + ':' + tokenId;
        if (covered.has(key)) return;  // already in registry
        items.push({
          id:              'chain-' + addr.slice(2, 8) + '-' + tokenId,
          name:            tokenInfo.name || (info.name + ' #' + tokenId),
          project:         project,
          projectName:     (PROJECT_CONFIG[project] || {}).label || project,
          tokenId:         Number(tokenId),
          contract:        addr,
          contractAddress: addr,
          src:             tokenInfo.imageUrl || null,
          fileType:        tokenInfo.fileType  || null,
          fileSize:        '—',
          fileDimensions:  '—',
        });
      });
    });

    return items;
  }

  /* ── Chain data lookup ──────────────────────────────────── */

  let chainLookup = {};

  function buildChainLookup(chainData) {
    chainLookup = {};
    Object.entries(chainData).forEach(function ([addr, info]) {
      const nameKey = (info.name || '').toLowerCase();
      Object.entries(info.tokens || {}).forEach(function ([tokenId, tokenInfo]) {
        const entry = { date: tokenInfo.date, supply: tokenInfo.supply, standard: info.standard };
        chainLookup[nameKey + ':' + tokenId] = entry;
        chainLookup[addr + ':' + tokenId]    = entry;
      });
    });
    console.log('[archive] Chain lookup built —', Object.keys(chainLookup).length, 'entries');
  }

  function getChainInfo(artwork) {
    if (artwork.tokenId == null) return null;
    if (artwork.contract) {
      const hit = chainLookup[artwork.contract.toLowerCase() + ':' + artwork.tokenId];
      if (hit) return hit;
    }
    if (artwork.contractAddress) {
      const hit = chainLookup[artwork.contractAddress.toLowerCase() + ':' + artwork.tokenId];
      if (hit) return hit;
    }
    return null;
  }

  /* ── Helpers ────────────────────────────────────────────── */

  function escHtml(str) {
    var d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function getFileType(src) {
    if (!src) return null;
    var m = src.match(/\.(\w+)(?:\?|#|$)/i);
    return m ? m[1].toLowerCase() : null;
  }

  /* ── Filter + sort ──────────────────────────────────────── */

  function getAllItems() {
    return registry.concat(chainItems);
  }

  function getFiltered() {
    return getAllItems().filter(function (a) {
      if (filterProject !== 'all' && a.project !== filterProject) return false;
      if (searchQuery) {
        var q = searchQuery.toLowerCase();
        return (a.name        || '').toLowerCase().indexOf(q) !== -1 ||
               (a.projectName || '').toLowerCase().indexOf(q) !== -1 ||
               (a.contract    || '').toLowerCase().indexOf(q) !== -1;
      }
      return true;
    });
  }

  function getSorted(items) {
    var list = items.slice();
    list.sort(function (a, b) {
      var av, bv, ca, cb;
      switch (sortKey) {
        case 'name':
          av = (a.name || '').toLowerCase();
          bv = (b.name || '').toLowerCase();
          break;
        case 'project':
          av = (a.projectName || '').toLowerCase();
          bv = (b.projectName || '').toLowerCase();
          break;
        case 'platform':
          av = ((PROJECT_CONFIG[a.project] || {}).platform || '').toLowerCase();
          bv = ((PROJECT_CONFIG[b.project] || {}).platform || '').toLowerCase();
          break;
        case 'token':
          av = a.tokenId != null ? a.tokenId : 9999;
          bv = b.tokenId != null ? b.tokenId : 9999;
          return sortDir === 'asc' ? av - bv : bv - av;
        case 'date':
          ca = getChainInfo(a); cb = getChainInfo(b);
          av = (ca && ca.date) ? ca.date : '0000-00-00';
          bv = (cb && cb.date) ? cb.date : '0000-00-00';
          break;
        case 'edition':
          ca = getChainInfo(a); cb = getChainInfo(b);
          av = ca ? ca.supply : 0;
          bv = cb ? cb.supply : 0;
          return sortDir === 'asc' ? av - bv : bv - av;
        case 'standard':
          ca = getChainInfo(a); cb = getChainInfo(b);
          av = (ca && ca.standard) ? ca.standard : 'zz';
          bv = (cb && cb.standard) ? cb.standard : 'zz';
          break;
        case 'filetype':
          av = getFileType(a.src) || a.fileType || 'zz';
          bv = getFileType(b.src) || b.fileType || 'zz';
          break;
        default:
          av = (a.name || '').toLowerCase();
          bv = (b.name || '').toLowerCase();
      }
      var cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }

  /* ── Render ─────────────────────────────────────────────── */

  var ETH_ICON = '<svg class="archive-eth-icon" viewBox="0 0 24 38" xmlns="http://www.w3.org/2000/svg"><polygon points="12,0 0,19.5 12,26 24,19.5" fill="#627EEA" opacity="0.9"/><polygon points="12,28.5 0,22 12,38 24,22" fill="#627EEA" opacity="0.6"/></svg>';

  function buildList() {
    var container = document.getElementById('archiveList');
    var countEl   = document.getElementById('archiveCount');
    if (!container) return;

    var items = getSorted(getFiltered());
    container.innerHTML = '';
    countEl.textContent = items.length + ' work' + (items.length !== 1 ? 's' : '');

    items.forEach(function (artwork) {
      var row = document.createElement('div');
      row.className = 'archive-row';
      row.setAttribute('data-project', artwork.project || '');

      var proj       = artwork.project  || '';
      var cfg        = PROJECT_CONFIG[proj] || { label: proj, url: null, platform: '—' };
      var tokenVal   = artwork.tokenId != null ? artwork.tokenId : '—';
      var chain      = getChainInfo(artwork);
      var dateVal    = (chain && chain.date)     ? chain.date   : '—';
      var editionVal = (chain && chain.supply)   ? chain.supply : '—';
      var standard   = (chain && chain.standard) ? chain.standard.replace('ERC-', '') : '—';
      var fileType   = getFileType(artwork.src) || artwork.fileType || '—';
      var fileSize   = artwork.fileSize       || '—';
      var fileDims   = artwork.fileDimensions || '—';

      var collectionCell = cfg.url
        ? '<a class="archive-collection-link archive-collection-link--' + escHtml(proj) + '" href="' + escHtml(cfg.url) + '" target="_blank" rel="noopener">' + escHtml(cfg.label) + '</a>'
        : '<span class="archive-collection-link archive-collection-link--' + escHtml(proj) + '">' + escHtml(cfg.label) + '</span>';

      var standardCell = standard !== '—'
        ? '<span class="archive-standard-badge">' + escHtml(standard) + '</span>'
        : '<span class="archive-dash">—</span>';

      row.innerHTML =
        '<span class="atcol atcol--title">'    + escHtml(artwork.name) + '</span>' +
        '<span class="atcol atcol--series">'   + collectionCell + '</span>' +
        '<span class="atcol atcol--platform">' + escHtml(cfg.platform) + '</span>' +
        '<span class="atcol atcol--token">'    + escHtml(String(tokenVal)) + '</span>' +
        '<span class="atcol atcol--date">'     + escHtml(dateVal) + '</span>' +
        '<span class="atcol atcol--edition">'  + escHtml(String(editionVal)) + '</span>' +
        '<span class="atcol atcol--chain">'    + ETH_ICON + '</span>' +
        '<span class="atcol atcol--standard">' + standardCell + '</span>' +
        '<span class="atcol atcol--filetype atcol--ft-' + escHtml(fileType || '') + '">' + escHtml(fileType || '—') + '</span>' +
        '<span class="atcol atcol--filesize">' + escHtml(fileSize) + '</span>' +
        '<span class="atcol atcol--dims">'     + escHtml(fileDims) + '</span>';

      container.appendChild(row);
    });
  }

  /* ── Chain data events ──────────────────────────────────── */

  document.addEventListener('chainDataLoading', function () {
    var countEl = document.getElementById('archiveCount');
    if (countEl) countEl.innerHTML = '<span class="archive-chain-loading">fetching chain data&hellip;</span>';
  });

  document.addEventListener('chainDataReady', function (e) {
    const data = e.detail || {};
    buildChainLookup(data);
    chainItems = buildChainItems(data);
    buildList();
  });

  document.addEventListener('chainMetadataUpdate', function (e) {
    const data = e.detail || {};
    buildChainLookup(data);
    chainItems = buildChainItems(data);
    buildList();
  });

  document.addEventListener('chainDataError', function () {
    buildList();
  });

  /* ── Sort headers ───────────────────────────────────────── */

  function initSortHeaders() {
    var headers = document.querySelectorAll('.archive-thead .sortable');
    headers.forEach(function (th) {
      th.addEventListener('click', function () {
        var key = th.dataset.sort;
        sortDir = (sortKey === key) ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
        sortKey = key;
        updateHeaderIndicators();
        buildList();
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
        buildList();
      });
    });
  }

  /* ── Search ─────────────────────────────────────────────── */

  function initSearch() {
    var input = document.getElementById('archiveSearch');
    if (!input) return;
    input.addEventListener('input', function () {
      searchQuery = input.value.trim();
      buildList();
    });
  }

  /* ── Init ───────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    initSortHeaders();
    initFilterTabs();
    initSearch();
    updateHeaderIndicators();
    buildList();
  });

})();
