(function () {
  'use strict';

  var inventory = [];
  var listings  = {};   // { "contract:tokenId": listing }
  var floors    = {};   // { "collection-slug": { price, currency } }
  var listingsFetchedAt = null;
  var savedScrollY  = 0;
  var activeItem    = null;
  var sortKey       = 'date';
  var sortDir       = 'desc';
  var filterEra = 'all';
  var filterYear = '';
  var ODIVILLE_DATE = '2025-02-11'; // Book release date — the dividing line

  // All DUU artworks except "Welcome to Odiville" are pre-Odiville (migrated to Shape)
  var PROLOGUE_OVERRIDES = [
    'ticket booth', 'blend in', 'ticket', 'meet the puppets', 'inescapable end',
    'four horsemen', 'pink balloon', 'blue balloon', 'green balloon', 'cyclone',
    'play to learn', 'the rose petal garden', 'the verdant veil', 'the lost lagoon',
    'the abyssal void', 'redemption', 'hush', 'play to burn', 'whispers in the glade',
    'map of the glade', 'barn', 'carnival', 'forest', 'uninvited', 'a gift', 'no air',
    'broken', 'light keeper', 'foreboding tree', 'wasteland', 'the maw is starving',
    'mutual pact', 'marked', 'stone tiles', 'key of the collective', 'extract', 'etched',
    'green door', 'white door', 'room of lights', 'room of shadows', 'pool of doubt',
    'garden of reflection', 'a ticket home', 'an echo of sacrifice'
  ];
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
    'fabricated-fairytales': { label: 'Fabricated Fairytales',   color: '#d4a8c7' },
    'villain-ungloved':     { label: 'Villain Ungloved',        color: '#c77d8a' },
    'seasons':              { label: 'Seasons',                  color: '#7db8a4' },
    'happy-thoughts':       { label: 'Happy Thoughts',           color: '#e6c86e' },
    'artifex':              { label: 'Artifex',                  color: '#9b8ec4' },
    'fuse-and-burn':        { label: 'Fuse and Burn',            color: '#d4826a' },
    'playing-arts':         { label: 'Playing Arts',             color: '#6ea8d4' },
    'sad-love':             { label: 'Sad Love',                 color: '#c47a8b' },
    'superrare':            { label: 'SuperRare',                color: '#e0e0e0' },
    'superrare-2020':       { label: 'SuperRare (2020-2023)',    color: '#e0e0e0' },
    'the-memes':            { label: 'The Memes (6529)',         color: '#a0a0a0' },
    'the-whispering-well':  { label: 'The Whispering Well',      color: '#8bc4a0' },
    'pranksy-christmas':    { label: 'Pranksy Christmas Calendar', color: '#d4a0a0' },
    'knownorigin':          { label: 'KnownOrigin',              color: '#c4b08e' },
    'makersplace':          { label: 'MakersPlace',              color: '#8eb0c4' },
    'rarible':              { label: 'Rarible',                  color: '#ffe066' },
    'wright-brothers':      { label: 'Wright Brothers Icons',    color: '#b0c4a0' },
    'cryptocubes':          { label: 'CryptoCubes',              color: '#8ec4c4' },
    'fakerare':             { label: 'FAKERARE (BTC)',           color: '#6ecf6e' },
    'dontbuymeme':          { label: 'dontbuymeme',              color: '#c4a0d4' },
    'foundation':           { label: 'Foundation',               color: '#1d1d1d' },
    'digitalax-fashion-collab': { label: 'Digitalax Fashion Collab', color: '#d46ea8' },
    'keys-of-the-collective': { label: 'Keys of the Collective', color: '#7ea8c4' },
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

  function getEra(rec) {
    var titleLc = (rec.title || '').toLowerCase();
    var isPrologue = PROLOGUE_OVERRIDES.indexOf(titleLc) !== -1 ||
                     (rec.mintDate && rec.mintDate < ODIVILLE_DATE);
    return isPrologue ? 'prologue' : 'odiville';
  }

  function getMintYear(rec) {
    if (!rec.mintDate) return null;
    return rec.mintDate.slice(0, 4);
  }

  function getFiltered() {
    return inventory.filter(function (a) {
      // Special "for-sale" filter
      if (filterEra === 'for-sale') {
        if (!getListing(a)) return false;
        // Year filter applies in for-sale view too
        if (filterYear) {
          var fy = getMintYear(a);
          if (fy !== filterYear) return false;
        }
        if (searchQuery) {
          var fq = searchQuery.toLowerCase();
          return (a.title       || '').toLowerCase().indexOf(fq) !== -1 ||
                 (a.projectName || '').toLowerCase().indexOf(fq) !== -1 ||
                 (a.contract    || '').toLowerCase().indexOf(fq) !== -1 ||
                 (a.description || '').toLowerCase().indexOf(fq) !== -1;
        }
        return true;
      }
      // Era filter
      if (filterEra === 'prologue' || filterEra === 'odiville') {
        if (getEra(a) !== filterEra) return false;
      }
      // Year filter
      if (filterYear) {
        var y = getMintYear(a);
        if (y !== filterYear) return false;
      }
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
          // Empty dates always go to the end regardless of sort direction
          if (!a.mintDate && !b.mintDate) return 0;
          if (!a.mintDate) return 1;
          if (!b.mintDate) return -1;
          av = a.mintDate;
          bv = b.mintDate;
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

  /* ── Grouping helper ────────────────────────────────────── */

  // Normalize title for grouping: lowercase, strip trailing " #N" suffixes
  function groupKey(title) {
    return (title || '').toLowerCase().replace(/\s*#\d+$/, '').trim();
  }

  // Stamp _editionNum and _editionTotal on every record
  function enrichEditions() {
    var map = {};
    inventory.forEach(function (rec) {
      // ERC-1155 tokens are self-contained (editions live within one token) —
      // never group them with other records
      var std = (rec.tokenStandard || '').toLowerCase();
      if (std === 'erc-1155') {
        rec._editionNum = null;
        rec._editionTotal = null;
        return;
      }
      var key = groupKey(rec.title);
      if (!map[key]) map[key] = [];
      map[key].push(rec);
    });
    Object.keys(map).forEach(function (key) {
      var group = map[key];
      if (group.length <= 1) {
        group[0]._editionNum = null;
        group[0]._editionTotal = null;
        return;
      }
      // Sort by tokenId
      group.sort(function (a, b) {
        return parseFloat(a.tokenId || '0') - parseFloat(b.tokenId || '0');
      });
      var minId = parseFloat(group[0].tokenId || '0');
      var maxId = parseFloat(group[group.length - 1].tokenId || '0');
      var isSeq = (maxId - minId + 1) === group.length;
      group.forEach(function (rec, i) {
        var titleMatch = (rec.title || '').match(/#(\d+)\s*$/);
        if (titleMatch) {
          rec._editionNum = parseInt(titleMatch[1], 10);
        } else if (isSeq) {
          rec._editionNum = parseFloat(rec.tokenId || '0') - minId + 1;
        } else {
          rec._editionNum = i + 1;
        }
        rec._editionTotal = group.length;
      });
    });
  }

  // Display title with edition: "title #N/total" or just "title" for 1/1s
  function editionTitle(rec) {
    if (rec._editionNum && rec._editionTotal) {
      return groupKey(rec.title) + ' #' + rec._editionNum + '/' + rec._editionTotal;
    }
    return rec.title;
  }

  function groupByTitle(items) {
    var map = {};
    var order = [];
    items.forEach(function (rec) {
      // ERC-1155 tokens always stand alone — use a unique key
      var std = (rec.tokenStandard || '').toLowerCase();
      var key = std === 'erc-1155'
        ? '__erc1155__' + rec.contract + '|' + rec.tokenId
        : groupKey(rec.title);
      if (!(key in map)) {
        map[key] = [];
        order.push(key);
      }
      map[key].push(rec);
    });
    return order.map(function (key) { return map[key]; });
  }

  /* ── Row builder (shared by master + sub-rows) ──────────── */

  function buildRowCells(rec, editionCell, titleOverride) {
    var proj     = rec.project || '';
    var cfg      = PROJECT_CONFIG[proj] || { label: rec.projectName || proj, color: 'var(--white-dim)' };
    var dateVal  = rec.mintDate || '—';
    var standard = rec.tokenStandard ? rec.tokenStandard.replace('erc-', '').replace('ERC-', '') : '—';
    var fileType = rec.fileExt || (rec.mediaType ? rec.mediaType.split('/').pop() : null) || '—';
    var chain    = rec.blockchain || 'ethereum';
    var chainCfg = CHAIN_LABELS[chain] || { text: chain, cls: '' };
    var chainCell = '<span class="archive-chain-label ' + chainCfg.cls + '">' + escHtml(chainCfg.text) + '</span>';

    var collectionLabel = rec.projectName || cfg.label;
    var collectionCell = '<span class="archive-collection-link">' + escHtml(collectionLabel) + '</span>';

    var standardCell = standard !== '—'
      ? '<span class="archive-standard-badge">' + escHtml(standard) + '</span>'
      : '<span class="archive-dash">—</span>';

    var descIcon = rec.description
      ? '<span class="archive-desc-icon" title="' + escHtml(rec.description) + '">&#9432;</span>'
      : '';

    var listing = getListing(rec);
    var priceCell;
    if (listing) {
      var pStr = fmtPrice(listing.price, listing.currency);
      priceCell = '<span class="archive-price-tag">' + escHtml(pStr) + '</span>';
    } else {
      priceCell = '<span class="archive-dash">—</span>';
    }

    var ownerShort = rec.owner ? rec.owner.slice(0, 6) + '…' + rec.owner.slice(-4) : '—';
    var ownerCell  = rec.owner
      ? '<a class="archive-owner-link" href="https://opensea.io/' + encodeURIComponent(rec.owner) + '" target="_blank" rel="noopener">' + escHtml(ownerShort) + '</a>'
      : '<span class="archive-dash">—</span>';

    return {
      html:
        '<span class="atcol atcol--token">'    + editionCell + '</span>' +
        '<span class="atcol atcol--title atcol--clickable">' + descIcon + escHtml(titleOverride || rec.title) + '</span>' +
        '<span class="atcol atcol--series">'   + collectionCell + '</span>' +
        '<span class="atcol atcol--date">'     + escHtml(dateVal) + '</span>' +
        '<span class="atcol atcol--chain">'    + chainCell + '</span>' +
        '<span class="atcol atcol--standard">' + standardCell + '</span>' +
        '<span class="atcol atcol--filetype atcol--ft-' + escHtml(fileType || '') + '">' + escHtml(fileType || '—') + '</span>' +
        '<span class="atcol atcol--price">'    + priceCell + '</span>' +
        '<span class="atcol atcol--owner">'    + ownerCell + '</span>',
      listed: !!listing
    };
  }

  /* ── Table render ───────────────────────────────────────── */

  function buildList() {
    var container = document.getElementById('archiveList');
    var countEl   = document.getElementById('archiveCount');
    if (!container) return;

    var items  = getSorted(getFiltered());
    var groups = groupByTitle(items);
    container.innerHTML = '';

    // Count unique artworks for display
    countEl.textContent = groups.length + ' artwork' + (groups.length !== 1 ? 's' : '') +
      (items.length !== groups.length ? ' · ' + items.length + ' tokens' : '');

    groups.forEach(function (group) {
      var rep = group[0]; // representative record (first in sorted order)
      var count = group.length;
      var hasEditions = count > 1;

      // Edition cell for master row
      var editionHtml;
      if (hasEditions) {
        editionHtml = '<span class="archive-editions-badge">' + count + '</span>';
      } else {
        editionHtml = '<span class="archive-editions-single">1/1</span>';
      }

      var masterTitle = groupKey(rep.title) || rep.title;
      var cells = buildRowCells(rep, editionHtml, masterTitle);

      // Master row
      var row = document.createElement('div');
      row.className = 'archive-row' + (hasEditions ? ' archive-row--group' : '');
      row.setAttribute('data-project', rep.project || '');
      row.innerHTML = cells.html;
      if (cells.listed) row.classList.add('archive-row--listed');

      // Click title → open panel
      var titleCell = row.querySelector('.atcol--clickable');
      if (titleCell) {
        titleCell.addEventListener('click', function () {
          if (activeItem) activeItem.classList.remove('is-active');
          activeItem = row;
          row.classList.add('is-active');
          openPanel(rep, rep.localImage || rep.imageUrl || rep.mediaUrl || '');
        });
      }

      container.appendChild(row);

      // Expandable sub-rows for multi-edition groups
      if (hasEditions) {
        var subContainer = document.createElement('div');
        subContainer.className = 'archive-sub-rows';
        subContainer.style.display = 'none';

        // Sort sub-rows by edition number (pre-computed)
        var subSorted = group.slice().sort(function (a, b) {
          return (a._editionNum || 0) - (b._editionNum || 0);
        });

        subSorted.forEach(function (sub) {
          var subRow = document.createElement('div');
          subRow.className = 'archive-row archive-row--sub';

          var edNum = (sub._editionNum || '?') + '/' + count;
          var subEditionHtml = '<span class="archive-editions-sub">' + escHtml(edNum) + '</span>';
          var subCells = buildRowCells(sub, subEditionHtml, editionTitle(sub));
          subRow.innerHTML = subCells.html;
          if (subCells.listed) subRow.classList.add('archive-row--listed');

          var subTitleEl = subRow.querySelector('.atcol--clickable');
          if (subTitleEl) {
            subTitleEl.addEventListener('click', function () {
              if (activeItem) activeItem.classList.remove('is-active');
              activeItem = subRow;
              subRow.classList.add('is-active');
              openPanel(sub, sub.localImage || sub.imageUrl || sub.mediaUrl || '');
            });
          }
          subContainer.appendChild(subRow);
        });

        // Footer close row at bottom of sub-rows
        var footer = document.createElement('div');
        footer.className = 'archive-sub-footer';
        footer.innerHTML = '<span class="archive-sub-close">Collapse ' + escHtml(masterTitle) + '</span>';
        subContainer.appendChild(footer);

        container.appendChild(subContainer);

        // Shared toggle function
        function toggleSubs(e) {
          e.stopPropagation();
          var open = subContainer.style.display !== 'none';
          subContainer.style.display = open ? 'none' : '';
          row.classList.toggle('archive-row--expanded', !open);
          if (open) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Click edition badge (top) to expand/collapse
        var badge = row.querySelector('.archive-editions-badge');
        if (badge) {
          badge.addEventListener('click', toggleSubs);
        }
        // Click footer to collapse
        footer.addEventListener('click', toggleSubs);
      }
    });
  }

  /* ── Grid render ────────────────────────────────────────── */

  function buildGrid() {
    var grid    = document.getElementById('archiveGrid');
    var countEl = document.getElementById('archiveCount');
    var table   = document.getElementById('archiveTable');
    if (!grid) return;

    var items  = getSorted(getFiltered());
    var groups = groupByTitle(items);
    countEl.textContent = groups.length + ' artwork' + (groups.length !== 1 ? 's' : '') +
      (items.length !== groups.length ? ' · ' + items.length + ' tokens' : '');

    table.style.display = 'none';
    grid.style.display  = 'grid';
    grid.innerHTML = '';

    var allHtml = '';
    var groupMap = {};
    groups.forEach(function (group, gi) {
      var rec   = group[0];
      var count = group.length;
      var proj  = rec.project || '';
      var cfg   = PROJECT_CONFIG[proj] || { label: rec.projectName || proj, color: 'var(--white-dim)' };
      var displayTitle = groupKey(rec.title) || rec.title; // base name without #N
      // Thumbnail: prefer local thumb, then local full (skip videos), fall back to imageUrl
      var local = getLocalFile(rec);
      var fullPath = local ? local.full : null;
      var isLocalVideo = fullPath && /\.(mp4|webm|mov)$/i.test(fullPath);
      var thumb = (local && local.thumb) ? local.thumb
        : (fullPath && !isLocalVideo) ? fullPath
        : (rec.imageUrl || rec.mediaUrl || '');
      groupMap[gi] = { group: group, rec: rec, thumb: thumb };

      // Price badge — show lowest listed price across all editions
      var bestListing = null;
      group.forEach(function (r) {
        var l = getListing(r);
        if (l && (!bestListing || l.price < bestListing.price)) bestListing = l;
      });
      var priceBadge = '';
      if (bestListing) {
        var pStr = fmtPrice(bestListing.price, bestListing.currency);
        priceBadge = '<span class="gallery-card-price">' + escHtml(pStr) + '</span>';
      }

      // Edition badge on card
      var editionBadge = count > 1
        ? '<span class="gallery-card-editions">' + count + '</span>'
        : '';

      var mediaHtml = thumb
        ? '<img class="gallery-card-img" src="' + escHtml(thumb) + '" alt="' + escHtml(displayTitle) + '">'
        : '<div class="gallery-card-placeholder"></div>';

      allHtml +=
        '<div class="gallery-card" data-project="' + escHtml(proj) + '" data-gi="' + gi + '">' +
          '<div class="gallery-card-media">' + mediaHtml + priceBadge + editionBadge + '</div>' +
          '<div class="gallery-card-info">' +
            '<span class="gallery-card-collection">' + escHtml(rec.projectName || cfg.label) + '</span>' +
            '<span class="gallery-card-title">' + escHtml(displayTitle) + '</span>' +
          '</div>' +
        '</div>';
    });

    grid.innerHTML = allHtml;

    // Attach click handlers
    grid.querySelectorAll('.gallery-card').forEach(function (card) {
      var gi = parseInt(card.getAttribute('data-gi'), 10);
      var entry = groupMap[gi];
      if (!entry) return;
      card.addEventListener('click', function (e) {
        if (activeItem) activeItem.classList.remove('is-active');
        activeItem = card;
        card.classList.add('is-active');

        if (entry.group.length === 1) {
          // Single token — open preview directly
          openPanel(entry.rec, entry.thumb);
        } else {
          // Multi-token — toggle edition dropdown
          toggleGridDropdown(card, entry.group, entry.thumb);
        }
      });
    });
  }

  /* ── Grid edition dropdown ─────────────────────────────── */

  function toggleGridDropdown(card, group, parentThumb) {
    // Close any existing dropdown
    var existing = card.parentNode.querySelector('.grid-edition-dropdown');
    if (existing) {
      existing.remove();
      return;
    }

    var baseName = groupKey(group[0].title) || group[0].title;

    var dropdown = document.createElement('div');
    dropdown.className = 'grid-edition-dropdown';
    dropdown.innerHTML =
      '<div class="grid-edition-header">' +
        escHtml(baseName) +
        ' <span class="grid-edition-count">' + group.length + ' tokens</span>' +
        '<button class="grid-edition-close">&times;</button>' +
      '</div>' +
      '<input class="grid-edition-search" type="text" placeholder="Edition #" autocomplete="off">' +
      '<div class="grid-edition-results"></div>';

    card.insertAdjacentElement('afterend', dropdown);

    var input   = dropdown.querySelector('.grid-edition-search');
    var results = dropdown.querySelector('.grid-edition-results');

    // Sort by pre-computed edition number
    var sorted = group.slice().sort(function (a, b) {
      return (a._editionNum || 0) - (b._editionNum || 0);
    });

    // Render matching results as grid cards
    function renderResults(query) {
      var q = (query || '').trim();
      var matches = [];
      sorted.forEach(function (rec) {
        var numStr = String(rec._editionNum || 0);
        if (q && numStr.indexOf(q) !== 0) return;
        matches.push({ rec: rec, label: editionTitle(rec), edNum: rec._editionNum });
      });

      // Cap visible results at 50 to keep it snappy
      var shown = matches.slice(0, 50);
      var html = '';
      shown.forEach(function (m, si) {
        var local = getLocalFile(m.rec);
        var fp = local ? local.full : null;
        var isVid = fp && /\.(mp4|webm|mov)$/i.test(fp);
        var thumb = (local && local.thumb) ? local.thumb
          : (fp && !isVid) ? fp
          : (m.rec.imageUrl || m.rec.mediaUrl || '');

        var listing = getListing(m.rec);
        var priceBadge = '';
        if (listing) {
          priceBadge = '<span class="gallery-card-price">' +
            escHtml(fmtPrice(listing.price, listing.currency)) + '</span>';
        }

        var mediaHtml = thumb
          ? '<img class="gallery-card-img" src="' + escHtml(thumb) + '" alt="' + escHtml(m.label) + '">'
          : '<div class="gallery-card-placeholder"></div>';

        var numDisplay = '#' + m.edNum;

        html +=
          '<div class="gallery-card grid-edition-card" data-si="' + si + '">' +
            '<div class="gallery-card-media">' + mediaHtml + priceBadge +
              '<span class="grid-edition-hover-num">' + escHtml(numDisplay) + '</span>' +
            '</div>' +
            '<div class="gallery-card-info">' +
              '<span class="gallery-card-title">' + escHtml(m.label) + '</span>' +
            '</div>' +
          '</div>';
      });

      if (!q && matches.length > 50) {
        html += '<div class="grid-edition-hint">Type an edition number to find a specific token</div>';
      } else if (q && matches.length === 0) {
        html += '<div class="grid-edition-hint">No matching editions</div>';
      }

      results.innerHTML = html;

      // Attach click handlers using the shown array directly
      results.querySelectorAll('.grid-edition-card').forEach(function (edCard) {
        var si = parseInt(edCard.getAttribute('data-si'), 10);
        var rec = shown[si].rec;
        edCard.addEventListener('click', function (e) {
          e.stopPropagation();
          var loc = getLocalFile(rec);
          var fp = loc ? loc.full : null;
          var isVid = fp && /\.(mp4|webm|mov)$/i.test(fp);
          var t = (fp && !isVid) ? fp : (rec.imageUrl || rec.mediaUrl || '');
          openPanel(rec, t);
        });
      });
    }

    // Show initial results (capped at 50)
    renderResults('');

    input.addEventListener('input', function () {
      renderResults(input.value);
    });
    input.addEventListener('click', function (e) { e.stopPropagation(); });

    // Focus the search input
    setTimeout(function () { input.focus(); }, 50);

    // Close button
    dropdown.querySelector('.grid-edition-close').addEventListener('click', function (e) {
      e.stopPropagation();
      dropdown.remove();
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

  // Resolve local file path for a record (URL-encoded for browser)
  function encodePath(p) {
    return p.split('/').map(function (seg) { return encodeURIComponent(seg); }).join('/');
  }

  // Returns { full, thumb } or null
  function getLocalFile(rec) {
    var localFiles = window.LOCAL_FILES || {};
    var titleKey = (rec.title || '').toLowerCase()
      .replace(/[\u2019\u2018\u0060\u00B4\u2018'']/g, "'")
      .replace(/_/g, ' ').trim();
    var entry = localFiles[titleKey] || null;
    // Also try with #N stripped (grouped titles like "Keys of the Collective #5")
    if (!entry) {
      var baseKey = titleKey.replace(/\s*#\d+$/, '').trim();
      if (baseKey !== titleKey) entry = localFiles[baseKey] || null;
    }
    if (!entry) return null;
    // Support old format (plain string) and new format ({ full, thumb })
    if (typeof entry === 'string') return { full: encodePath(entry), thumb: null };
    return {
      full: entry.full ? encodePath(entry.full) : null,
      thumb: entry.thumb ? encodePath(entry.thumb) : null
    };
  }

  function openPanel(rec, thumb) {
    var panel   = document.getElementById('galleryPanel');
    var overlay = document.getElementById('galleryPanelOverlay');
    var media   = document.getElementById('galleryPanelMedia');
    var meta    = document.getElementById('galleryPanelMeta');
    if (!panel) return;

    var proj = rec.project || '';
    var cfg  = PROJECT_CONFIG[proj] || { label: rec.projectName || proj, color: 'var(--white-dim)' };

    // Prefer local full-res file, fall back to CDN animation, CDN image, then thumbnail
    var local = getLocalFile(rec);
    var localFull = local ? local.full : null;
    var src = localFull || rec.displayAnimationUrl || rec.imageUrl || thumb || '';
    var isVideo = src && /\.(mp4|webm|mov)(\?|$)/i.test(src);

    if (isVideo) {
      media.innerHTML =
        '<video class="gallery-panel-img" src="' + escHtml(src) + '" autoplay loop muted playsinline controls></video>';
    } else if (src) {
      media.innerHTML = '<img class="gallery-panel-img" src="' + escHtml(src) + '" alt="' + escHtml(rec.title) + '">';
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
      '<h2 class="gp-title">' + escHtml(editionTitle(rec)) + '</h2>' +
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
    var video = panel.querySelector('video');
    if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
    panel.classList.remove('is-open');
    overlay.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
  }

  /* ── Sort headers ───────────────────────────────────────── */

  function syncSortDropdown() {
    var sel = document.getElementById('archiveSortSelect');
    if (!sel) return;
    var val = sortKey + '-' + sortDir;
    // Only sync if it's a value the dropdown supports
    var opts = sel.querySelectorAll('option');
    var found = false;
    opts.forEach(function (o) { if (o.value === val) found = true; });
    if (found) sel.value = val;
  }

  function initSortHeaders() {
    var headers = document.querySelectorAll('.archive-thead .sortable');
    headers.forEach(function (th) {
      th.addEventListener('click', function () {
        var key = th.dataset.sort;
        sortDir = (sortKey === key) ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
        sortKey = key;
        updateHeaderIndicators();
        syncSortDropdown();
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

  function buildYearOptions(era) {
    var years = {};
    inventory.forEach(function (r) {
      if (era === 'prologue' || era === 'odiville') {
        if (getEra(r) !== era) return;
      }
      var y = getMintYear(r);
      if (y) years[y] = true;
    });
    var sorted = Object.keys(years).sort();
    return sorted;
  }

  function updateYearDropdown() {
    var sel = document.getElementById('archiveYearFilter');
    if (!sel) return;
    var years = buildYearOptions(filterEra === 'for-sale' ? 'all' : filterEra);
    sel.innerHTML = '<option value="">All Years</option>';
    years.forEach(function (y) {
      sel.innerHTML += '<option value="' + y + '">' + y + '</option>';
    });
    sel.value = filterYear;
    sel.style.display = '';
  }

  function initFilterTabs() {
    var tabs = document.querySelectorAll('#archiveFilters .archive-era-btn');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        filterEra = tab.dataset.filter;
        filterYear = '';
        tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
        updateYearDropdown();
        render();
      });
    });

    var yearSel = document.getElementById('archiveYearFilter');
    if (yearSel) {
      yearSel.addEventListener('change', function () {
        filterYear = yearSel.value;
        render();
      });
    }
  }

  /* ── Sort dropdown ──────────────────────────────────────── */

  function initSortDropdown() {
    var sel = document.getElementById('archiveSortSelect');
    if (!sel) return;
    sel.addEventListener('change', function () {
      var parts = sel.value.split('-');
      sortKey = parts[0];
      sortDir = parts[1];
      updateHeaderIndicators();
      render();
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
      enrichEditions();
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

    // Fetch live listings from Vercel API (merges into static data)
    if (LISTINGS_API_URL) {
      fetch(LISTINGS_API_URL)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (ldata) {
          if (!ldata) return;
          // Merge live data into existing listings (update/add, don't remove static)
          var liveListings = ldata.listings || {};
          var liveFloors   = ldata.floors   || {};
          for (var k in liveListings) { listings[k] = liveListings[k]; }
          for (var s in liveFloors)   { floors[s]   = liveFloors[s]; }
          if (ldata.fetchedAt) listingsFetchedAt = ldata.fetchedAt;
          console.log('[archive] Merged ' + Object.keys(liveListings).length +
            ' live listings (total: ' + Object.keys(listings).length + ')');
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
    initSortDropdown();
    initFilterTabs();
    initSearch();
    initViewToggle();
    updateHeaderIndicators();
    loadInventory();
    updateYearDropdown();
  });

})();
