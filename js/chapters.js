(function() {
  'use strict';

  /* ========== DUU TABS ========== */
  var tabs = document.querySelectorAll('.duu-tab');
  var views = document.querySelectorAll('.duu-view');
  var navTimeline = document.querySelector('.nav-links--duu-timeline');
  var navInfo = document.querySelector('.nav-links--duu-info');

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var target = this.dataset.view;
      tabs.forEach(function(t) { t.classList.remove('active'); });
      this.classList.add('active');
      views.forEach(function(v) { v.classList.remove('active'); });
      var el = document.getElementById('duu-view-' + target);
      if (el) el.classList.add('active');
      if (navTimeline && navInfo) {
        navTimeline.style.display = target === 'timeline' ? 'flex' : 'none';
        navInfo.style.display = target === 'info' ? 'flex' : 'none';
      }
      if (typeof observeReveals === 'function') observeReveals();
    });
  });

  /* ========== CHAPTER ARTWORK DATA ========== */
  var CHAPTERS = {
    '1': {
      label: 'I', title: 'The Arrival',
      artworks: [
        { name: 'The Arrival', src: 'images/Book/Chapter 1/The-Arrival-Jitter_v3_resized.gif', tokenId: 0, contract: 'DUU', shadeCost: null, shadeValue: null }
      ]
    },
    '2': {
      label: 'II', title: 'Meet The Puppets',
      artworks: [
        { name: 'Ticket Booth',     src: 'images/Book/Chapter 2/Ticket-Booth-Jitter_v3.gif',  tokenId: 1,  contract: 'DUU',     shadeCost: 1,    shadeValue: 1    },
        { name: 'Blend In',         src: 'images/Book/Chapter 2/Blend-In-Jitter.gif',          tokenId: 2,  contract: 'DUU',     shadeCost: 1,    shadeValue: 1    },
        { name: 'Ticket',           src: 'images/Book/Chapter 2/ticket.png',                   tokenId: 3,  contract: 'Tickets', shadeCost: null, shadeValue: 1    },
        { name: 'The Apprentice',   src: 'images/Book/Chapter 2/the-apprentice.png',           tokenId: 4,  contract: 'DUU',     shadeCost: null, shadeValue: null },
        { name: 'Meet The Puppets', src: 'images/Book/Chapter 2/Meet-The-Puppets.gif',         tokenId: 5,  contract: 'DUU',     shadeCost: 1,    shadeValue: 1    },
        { name: 'The Invite',       src: 'images/Book/Chapter 2/the invite.png',               tokenId: 53, contract: 'DUU',     shadeCost: null, shadeValue: null },
        { name: 'Inescapable End',  src: 'images/Book/Chapter 2/inescapable-end.png',          tokenId: 52, contract: 'DUU',     shadeCost: 1,    shadeValue: 1    }
      ]
    },
    '3': {
      label: 'III', title: 'Whispering Winds',
      artworks: [
        { name: 'Four Horsemen',        src: 'images/Book/Chapter 3/Four-Horsemen-Jitter.gif',      tokenId: 6,  contract: 'DUU', shadeCost: 2,    shadeValue: 2    },
        { name: 'Pink Balloon',         src: 'images/Book/Chapter 3/Pink_Balloon.png',              tokenId: 7,  contract: 'DUU', shadeCost: 1,    shadeValue: 2    },
        { name: 'Blue Balloon',         src: 'images/Book/Chapter 3/Blue_Balloon.png',              tokenId: 8,  contract: 'DUU', shadeCost: 1,    shadeValue: 2    },
        { name: 'Green Balloon',        src: 'images/Book/Chapter 3/Green_Balloon.png',             tokenId: 9,  contract: 'DUU', shadeCost: 1,    shadeValue: 2    },
        { name: 'Cyclone',              src: 'images/Book/Chapter 3/cyclone.png',                   tokenId: 10, contract: 'DUU', shadeCost: 2,    shadeValue: 2    },
        { name: 'Play to Learn',        src: 'images/Book/Chapter 3/play-to-learn.png',             tokenId: 11, contract: 'DUU', shadeCost: 1,    shadeValue: 0.1  },
        { name: 'The Rose Petal Garden',src: 'images/Book/Chapter 3/The Rose Petal Garden.gif',     tokenId: 12, contract: 'DUU', shadeCost: 2,    shadeValue: 2    },
        { name: 'The Verdant Veil',     src: 'images/Book/Chapter 3/The Verdant Veil.gif',          tokenId: 13, contract: 'DUU', shadeCost: 2,    shadeValue: 2    },
        { name: 'The Lost Lagoon',      src: 'images/Book/Chapter 3/The Lost Lagoon.gif',           tokenId: 14, contract: 'DUU', shadeCost: 2,    shadeValue: 2    },
        { name: 'The Abyssal Void',     src: 'images/Book/Chapter 3/The Abyssal Void.gif',          tokenId: 15, contract: 'DUU', shadeCost: 2,    shadeValue: 2    },
        { name: 'Redemption',           src: 'images/Book/Chapter 3/Copy of Redemption-Event-Jitter.gif', tokenId: 16, contract: 'DUU', shadeCost: 2, shadeValue: 2 },
        { name: 'Blue Reverie',         src: 'images/Book/Chapter 3/Blue Reverie.png',              tokenId: 17, contract: 'DUU', shadeCost: null, shadeValue: null },
        { name: 'Hush',                 src: 'images/Book/Chapter 3/Copy of Hush_v2.png',           tokenId: 18, contract: 'DUU', shadeCost: 2,    shadeValue: 2    },
        { name: 'Play to Burn',         src: 'images/Book/Chapter 3/play-to-burn.png',              tokenId: 19, contract: 'DUU', shadeCost: null, shadeValue: null }
      ]
    },
    '4': {
      label: 'IV', title: 'Tread Lightly',
      artworks: [
        { name: 'Whispers in the Glade', src: 'images/Book/Chapter 4/whispers in the glade v2.png', tokenId: 20, contract: 'DUU', shadeCost: 4,  shadeValue: 6    },
        { name: 'Map of The Glade',      src: 'images/Book/Chapter 4/Map of The Glade.png',         tokenId: 21, contract: 'DUU', shadeCost: 6,  shadeValue: 6    },
        { name: 'Barn',                  src: 'images/Book/Chapter 4/Barn.png',                     tokenId: 22, contract: 'DUU', shadeCost: 12, shadeValue: 12   },
        { name: 'Carnival',              src: 'images/Book/Chapter 4/Carnival.png',                 tokenId: 23, contract: 'DUU', shadeCost: 12, shadeValue: 16   },
        { name: 'Forest',                src: 'images/Book/Chapter 4/Forest.png',                   tokenId: 24, contract: 'DUU', shadeCost: 12, shadeValue: 16   },
        { name: 'Uninvited',             src: 'images/Book/Chapter 4/Unwanted_Guest v2.png',        tokenId: 25, contract: 'DUU', shadeCost: 16, shadeValue: 0    },
        { name: 'A Gift',                src: 'images/Book/Chapter 4/a-gift-v4.gif',                tokenId: 26, contract: 'DUU', shadeCost: 16, shadeValue: null },
        { name: 'No Air',                src: 'images/Book/Chapter 4/no air.png',                   tokenId: 27, contract: 'DUU', shadeCost: 16, shadeValue: 16   }
      ]
    },
    '5': {
      label: 'V', title: 'A Gift',
      artworks: [
        { name: 'Broken',            src: 'images/Book/Chapter 5/Broken-Shards.png',                    tokenId: 28, contract: 'DUU', shadeCost: 16, shadeValue: 16 },
        { name: 'Light Keeper',      src: 'images/Book/Chapter 5/light-keeper-v3.gif',                  tokenId: 29, contract: 'DUU', shadeCost: 16, shadeValue: 16 },
        { name: 'Foreboding Tree',   src: 'images/Book/Chapter 5/Forboding Tree.png',                   tokenId: 30, contract: 'DUU', shadeCost: 16, shadeValue: 12 },
        { name: 'Wasteland',         src: 'images/Book/Chapter 5/Wasteland_V6_Final_V4.gif',            tokenId: 31, contract: 'DUU', shadeCost: 16, shadeValue: 16 },
        { name: 'The Maw is Starving',src: 'images/Book/Chapter 5/the-maw-is-starving-final_small.gif', tokenId: 32, contract: 'DUU', shadeCost: 16, shadeValue: 16 },
        { name: 'Mutual Pact',       src: 'images/Book/Chapter 5/Mutual Pact_v4.png',                   tokenId: 33, contract: 'DUU', shadeCost: 32, shadeValue: 32 },
        { name: 'Marked',            src: 'images/Book/Chapter 5/Marked.png',                           tokenId: 34, contract: 'DUU', shadeCost: 32, shadeValue: 40 },
        { name: 'Stone Tiles',       src: 'images/Book/Chapter 5/stone-tiles.gif',                      tokenId: 54, contract: 'DUU', shadeCost: 16, shadeValue: 16 }
      ]
    },
    '6': {
      label: 'VI', title: 'Choice in the Clouds',
      artworks: [
        { name: 'A Choice in the Clouds', src: 'images/Book/Chapter 6/1-1/a choice in the clouds.png',           tokenId: 35, contract: 'DUU', shadeCost: null, shadeValue: null },
        { name: 'Key of the Collective',  src: 'images/Book/Chapter 6/The Collective/Keys of the Collective.gif', tokenId: 36, contract: 'Key', shadeCost: null, shadeValue: null },
        { name: 'Empty',                  src: 'images/Book/Chapter 6/Empty/Empty.png',                          tokenId: 37, contract: 'DUU', shadeCost: null, shadeValue: 0    },
        { name: 'Error',                  src: 'images/Book/Chapter 6/Error/Ch6_Error.gif',                      tokenId: 38, contract: 'DUU', shadeCost: null, shadeValue: 0    },
        { name: 'Extract',                src: 'images/Book/Chapter 6/Extract/Ch6_Extract.png',                  tokenId: 39, contract: 'DUU', shadeCost: null, shadeValue: 0    },
        { name: 'Etched',                 src: 'images/Book/Chapter 6/The Collective/etched_v9.gif',             tokenId: 40, contract: 'DUU', shadeCost: null, shadeValue: 0    }
      ]
    },
    '7': {
      label: 'VII', title: 'Crossroads',
      artworks: [
        { name: 'Green Door',      src: 'images/Book/Chapter 7/Ch7_Empty/green door.png',          tokenId: 41, contract: 'DUU', shadeCost: 11,   shadeValue: null },
        { name: 'White Door',      src: 'images/Book/Chapter 7/Ch7_Empty/white door.png',          tokenId: 42, contract: 'DUU', shadeCost: 11,   shadeValue: null },
        { name: 'Antithesis',      src: 'images/Book/Chapter 7/Ch7_Empty/antithesis.png',          tokenId: 43, contract: 'DUU', shadeCost: null, shadeValue: null },
        { name: 'Room of Lights',  src: 'images/Book/Chapter 7/Ch7_Empty/room of lights b v2.png', tokenId: 44, contract: 'DUU', shadeCost: 11,   shadeValue: null },
        { name: 'Room of Shadows', src: 'images/Book/Chapter 7/Ch7_Empty/Room of shadows b v2.png',tokenId: 45, contract: 'DUU', shadeCost: 11,   shadeValue: null }
      ]
    },
    '8': {
      label: 'VIII', title: 'Pool of Doubt',
      artworks: [
        { name: 'Pool of Doubt',        src: 'images/Book/Chapter 8/Ch8_pool_of_doubt.png',      tokenId: 46, contract: 'DUU', shadeCost: 22, shadeValue: null },
        { name: 'Garden of Reflection', src: 'images/Book/Chapter 8/Ch8_garden_of_embrace.png',  tokenId: 47, contract: 'DUU', shadeCost: 22, shadeValue: null }
      ]
    },
    '9': {
      label: 'IX', title: 'A Ticket Home',
      artworks: [
        { name: 'A Ticket Home',        src: 'images/Book/Chapter 9/A Ticket Home/Ch9_A_Ticket_Home_Part_2.gif',          tokenId: 48, contract: 'DUU', shadeCost: 44,   shadeValue: null },
        { name: 'Farewell to Odiville', src: 'images/Book/Chapter 9/1-1/Ch9_Farewell_To_Odiville_resized.gif',            tokenId: 49, contract: 'DUU', shadeCost: null, shadeValue: null },
        { name: 'An Echo of Sacrifice', src: 'images/Book/Chapter 9/An Echo of Sacrifice/Ch9_An_Echo_of_Sacrifice_Part_2.gif', tokenId: 50, contract: 'DUU', shadeCost: 44, shadeValue: null }
      ]
    },
    '10': {
      label: 'X', title: 'Welcome to Odiville',
      artworks: [
        { name: 'Welcome to Odiville', src: 'images/Book/Chapter 10/Ch10_Welcome_To_Odiville.gif', tokenId: 51, contract: 'DUU', shadeCost: null, shadeValue: null }
      ]
    }
  };

  /* ========== DOM REFS ========== */
  var nodes = document.querySelectorAll('.journey-node[data-chapter]');
  var panel = document.getElementById('chapter-panel');
  var numeralEl = document.getElementById('chapterNumeral');
  var titleEl = document.getElementById('chapterTitle');
  var masonryEl = document.getElementById('chapterMasonry');
  var activeChapter = null;

  /* ========== LIGHTBOX STATE ========== */
  var lbOpen = false;
  var triggerEl = null;
  var currentArtworks = [];
  var currentArtIdx = -1;

  /* ========== SWITCH CHAPTER (no toggle — used by arrows and selectChapter) ========== */
  function switchChapter(chapterNum) {
    var ch = CHAPTERS[chapterNum];
    if (!ch) return;

    activeChapter = chapterNum;

    nodes.forEach(function(n) {
      var isActive = n.dataset.chapter === chapterNum;
      n.classList.toggle('active', isActive);
      n.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    });

    numeralEl.textContent = ch.label;
    titleEl.textContent = ch.title;

    buildMasonry(ch, chapterNum);

    panel.removeAttribute('hidden');
    panel.offsetHeight;
    panel.classList.add('open');
  }

  /* ========== SELECT CHAPTER (node click — toggles closed if same) ========== */
  function selectChapter(chapterNum) {
    if (!CHAPTERS[chapterNum]) return;
    if (activeChapter === chapterNum) { closePanel(); return; }
    switchChapter(chapterNum);
  }

  function closePanel() {
    activeChapter = null;
    panel.classList.remove('open');
    setTimeout(function() {
      if (!activeChapter) {
        panel.setAttribute('hidden', '');
        masonryEl.innerHTML = '';
      }
    }, 500);
    nodes.forEach(function(n) {
      n.classList.remove('active');
      n.setAttribute('aria-expanded', 'false');
    });
  }

  /* ========== ARTWORK LIST BUILDER ========== */
  function buildMasonry(ch, chKey) {
    masonryEl.innerHTML = '';

    ch.artworks.forEach(function(art) {
      var btn = document.createElement('button');
      btn.className = 'artwork-list-btn';
      btn.textContent = art.name;
      btn.setAttribute('aria-label', art.name);

      (function(a, c, k) {
        btn.addEventListener('click', function() { openLightbox(a, c, k); });
      }(art, ch, chKey));

      masonryEl.appendChild(btn);
    });
  }

  /* ========== LIGHTBOX ========== */
  function openLightbox(art, ch, chKey) {
    if (!lbOpen) triggerEl = document.activeElement;

    // Track position within the chapter's artworks
    currentArtworks = ch.artworks;
    currentArtIdx = ch.artworks.indexOf(art);

    // Mark active text button
    var listBtns = masonryEl ? masonryEl.querySelectorAll('.artwork-list-btn') : [];
    listBtns.forEach(function(b, i) { b.classList.toggle('active', i === currentArtIdx); });

    var lb = document.getElementById('duuLightbox');
    var media = document.getElementById('duuLightboxMedia');
    if (!lb) return;

    // Populate media
    media.innerHTML = '<img src="' + art.src + '" alt="' + art.name + '" decoding="async">';

    // Populate info
    document.getElementById('duuLightboxChapter').textContent = ch.label + ' \u2014 ' + ch.title;
    document.getElementById('duuLightboxName').textContent = art.name;
    document.getElementById('duuLightboxTokenId').textContent = art.tokenId !== null ? art.tokenId : '\u2014';

    var contractEl = document.getElementById('duuLightboxContract');
    contractEl.textContent = art.contract || '\u2014';
    contractEl.title = '';

    document.getElementById('duuLightboxShadeCost').textContent = art.shadeCost !== null ? art.shadeCost : '\u2014';
    document.getElementById('duuLightboxShadeValue').textContent = art.shadeValue !== null ? art.shadeValue : '\u2014';

    // Show/hide arrows based on position within chapter
    var prevBtn = document.getElementById('duuLightboxPrev');
    var nextBtn = document.getElementById('duuLightboxNext');
    if (prevBtn) prevBtn.hidden = (currentArtIdx <= 0);
    if (nextBtn) nextBtn.hidden = (currentArtIdx >= currentArtworks.length - 1);

    lb.classList.add('active');
    lb.setAttribute('aria-hidden', 'false');
    lbOpen = true;

    setTimeout(function() {
      document.getElementById('duuLightboxClose').focus({ preventScroll: true });
    }, 50);
  }

  function closeLightbox() {
    var lb = document.getElementById('duuLightbox');
    if (!lb) return;
    lb.classList.remove('active');
    lb.setAttribute('aria-hidden', 'true');
    lbOpen = false;
    var listBtns = masonryEl ? masonryEl.querySelectorAll('.artwork-list-btn') : [];
    listBtns.forEach(function(b) { b.classList.remove('active'); });
    if (triggerEl && document.contains(triggerEl)) { triggerEl.focus({ preventScroll: true }); }
    triggerEl = null;
  }

  /* Focus trap */
  function trapFocus(e) {
    var lb = document.getElementById('duuLightbox');
    if (!lb || !lbOpen) return;
    var focusable = Array.from(lb.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(function(el) { return !el.disabled && el.offsetParent !== null; });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  }

  /* ========== EVENT BINDING ========== */

  // Node clicks
  nodes.forEach(function(node) {
    node.addEventListener('click', function() {
      selectChapter(this.dataset.chapter);
    });
  });

  // Arrow key navigation between journey nodes
  var nodeArray = Array.from(nodes);
  nodeArray.forEach(function(node, idx) {
    node.addEventListener('keydown', function(e) {
      var target = null;
      if (e.key === 'ArrowRight' && idx < nodeArray.length - 1) {
        target = nodeArray[idx + 1];
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        target = nodeArray[idx - 1];
      } else if (e.key === 'Home') {
        target = nodeArray[0];
      } else if (e.key === 'End') {
        target = nodeArray[nodeArray.length - 1];
      }
      if (target) {
        e.preventDefault();
        target.focus();
      }
    });
  });

  // Escape and focus trap
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (lbOpen) {
        closeLightbox();
      } else if (activeChapter) {
        closePanel();
      }
    }
    if (lbOpen) trapFocus(e);
  });

  // Lightbox close button
  var closeBtn = document.getElementById('duuLightboxClose');
  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);

  // Prev / next arrows — navigate within current chapter
  var prevBtn = document.getElementById('duuLightboxPrev');
  var nextBtn = document.getElementById('duuLightboxNext');
  if (prevBtn) prevBtn.addEventListener('click', function() {
    if (currentArtIdx > 0) {
      var ch = CHAPTERS[activeChapter];
      openLightbox(currentArtworks[currentArtIdx - 1], ch, activeChapter);
    }
  });
  if (nextBtn) nextBtn.addEventListener('click', function() {
    if (currentArtIdx < currentArtworks.length - 1) {
      var ch = CHAPTERS[activeChapter];
      openLightbox(currentArtworks[currentArtIdx + 1], ch, activeChapter);
    }
  });

})();
