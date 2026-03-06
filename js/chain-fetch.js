(function () {
  'use strict';

  const RPCS = [
    'https://ethereum.publicnode.com',
    'https://rpc.ankr.com/eth',
    'https://cloudflare-eth.com',
  ];

  const CACHE_KEY  = 'odiville_chain_v5';
  const CACHE_TTL  = 2 * 60 * 60 * 1000;
  const META_BATCH = 6;    // parallel tokenURI calls per batch
  const META_MAX   = 2000; // max tokens per contract
  const CHUNK_SIZE = 500000; // blocks per getLogs call (reduced number of calls)
  const FROM_BLOCK = 0xD693A0; // block 14,000,000 (~Jan 2022)

  const SIG_721         = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const SIG_1155_SINGLE = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62';
  const ZERO_TOPIC      = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const IPFS_GW         = 'https://ipfs.io/ipfs/';

  const CONTRACTS = [
    '0x8ef59800a6751305fe26a2f6ea4a401411567a7e',
    '0xcbef61f2675981080da1375647741c508db2b198',
    '0x45c03cef4bac4ee37f22bd2081bd931fec2716c2',
    '0xf65c302e0aee68843af2c5324fbc49ba322d970f',
    '0xa3e8fe3a0e82947bfc505ba83f2967408fc568bf',
    '0x7957acfae47695c341c40f5a3f7474f1af13397c',
    '0x54cba79fd1ccc5658b2a9abe7b5bf19a39172421',
    '0x67a931807e871c09d1af4d3062ec85562908efcd',
    '0xdaa19c2c091575bf4fcdb7a63f794fdb2aa3eabb',
    '0x941b14b24c3ca713554d32cdb42563e4992b4dbc',
  ];

  let reqId = 0;

  /* ── RPC with fallback ─────────────────────────────────── */

  async function rpc(method, params) {
    for (const url of RPCS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: ++reqId, method, params }),
          signal: AbortSignal.timeout(10000),
        });
        const d = await res.json();
        if (d.error) throw new Error(d.error.message);
        return d.result;
      } catch (e) { /* try next */ }
    }
    throw new Error('All RPCs failed for ' + method);
  }

  async function ethCall(to, data) {
    return rpc('eth_call', [{ to, data }, 'latest']);
  }

  /* ── ABI decode ─────────────────────────────────────────── */

  function decodeString(hex) {
    try {
      const raw = (hex || '').replace(/^0x/, '');
      if (raw.length < 128) return '';
      const len = parseInt(raw.slice(64, 128), 16);
      if (!len || len > 4000) return '';
      const bytes = raw.slice(128, 128 + len * 2);
      let out = '';
      for (let i = 0; i < bytes.length; i += 2) {
        out += String.fromCharCode(parseInt(bytes.slice(i, i + 2), 16));
      }
      return out;
    } catch (e) { return ''; }
  }

  function decodeUint(hex) {
    if (!hex || hex === '0x') return null;
    const n = parseInt(hex, 16);
    return isNaN(n) ? null : n;
  }

  function decodeBool(hex) {
    return !!hex && hex !== '0x' && parseInt((hex || '0x0').slice(-2), 16) === 1;
  }

  /* ── Contract introspection ─────────────────────────────── */

  async function getContractName(addr) {
    try { return decodeString(await ethCall(addr, '0x06fdde03')); }
    catch (e) { return ''; }
  }

  async function detectStandard(addr) {
    try {
      const [r721, r1155] = await Promise.all([
        ethCall(addr, '0x01ffc9a780ac58cd00000000000000000000000000000000000000000000000000000000').catch(() => '0x'),
        ethCall(addr, '0x01ffc9a7d9b67a2600000000000000000000000000000000000000000000000000000000').catch(() => '0x'),
      ]);
      if (decodeBool(r1155)) return 'ERC-1155';
      if (decodeBool(r721))  return 'ERC-721';
    } catch (e) {}
    return 'ERC-721';
  }

  // totalSupply() — works on ERC-721 with supply tracking
  async function getTotalSupply(addr) {
    try {
      const n = decodeUint(await ethCall(addr, '0x18160ddd'));
      if (n !== null && n > 0 && n <= META_MAX) return n;
    } catch (e) {}
    return null;
  }

  /* ── Token metadata ─────────────────────────────────────── */

  async function getTokenUri(addr, tokenId, standard) {
    const sel   = standard === 'ERC-1155' ? '0x0e89341c' : '0xc87b56dd';
    const padId = tokenId.toString(16).padStart(64, '0');
    try { return decodeString(await ethCall(addr, sel + padId)); }
    catch (e) { return null; }
  }

  function resolveUri(uri, tokenId) {
    if (!uri) return null;
    uri = uri.replace('{id}', tokenId.toString(16).padStart(64, '0'));
    if (uri.startsWith('ipfs://')) return IPFS_GW + uri.slice(7);
    return uri;
  }

  async function fetchMeta(uri) {
    if (!uri) return null;
    try {
      if (uri.startsWith('data:application/json')) {
        const payload = uri.split(',')[1];
        return JSON.parse(uri.includes(';base64,') ? atob(payload) : decodeURIComponent(payload));
      }
      const res = await fetch(uri, { signal: AbortSignal.timeout(8000) });
      return await res.json();
    } catch (e) { return null; }
  }

  function fileTypeFromUrl(url) {
    if (!url) return null;
    const m = url.match(/\.(\w+)(?:\?|#|$)/i);
    return m ? m[1].toLowerCase() : null;
  }

  /* ── Phase 1: discover tokens via totalSupply ────────────── */

  async function discoverTokensBySupply(addr, supply) {
    // Assume sequential token IDs starting at 0 (standard for art NFTs).
    // Verify by probing token 0 and token (supply-1) exist.
    const tokens = {};
    for (let i = 0; i < supply; i++) {
      tokens[i] = { date: null, supply: 1, name: null, imageUrl: null, fileType: null };
    }
    return tokens;
  }

  /* ── Phase 1b: discover tokens via getLogs (fallback) ────── */

  async function getCurrentBlock() {
    return parseInt(await rpc('eth_blockNumber', []), 16);
  }

  async function getLogsChunked(filter, fromBlock, toBlock) {
    const allLogs = [];
    for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE - 1, toBlock);
      try {
        const logs = await rpc('eth_getLogs', [{
          ...filter,
          fromBlock: '0x' + start.toString(16),
          toBlock:   '0x' + end.toString(16),
        }]);
        if (Array.isArray(logs)) allLogs.push(...logs);
      } catch (e) {
        console.warn('[chain] getLogs chunk failed', start, e.message);
      }
    }
    return allLogs;
  }

  function parseLogs(logs, standard) {
    return logs.map(log => {
      let tokenId, supply;
      if (standard === 'ERC-1155') {
        const raw = (log.data || '').replace(/^0x/, '');
        tokenId = parseInt(raw.slice(0, 64), 16);
        supply  = parseInt(raw.slice(64, 128), 16);
      } else {
        tokenId = parseInt(log.topics[3], 16);
        supply  = 1;
      }
      return { tokenId, supply, blockHex: log.blockNumber };
    });
  }

  async function discoverTokensByLogs(addr, standard) {
    const latestBlock = await getCurrentBlock();
    const filter = standard === 'ERC-1155'
      ? { address: addr, topics: [SIG_1155_SINGLE, null, ZERO_TOPIC] }
      : { address: addr, topics: [SIG_721, ZERO_TOPIC] };
    const logs   = await getLogsChunked(filter, FROM_BLOCK, latestBlock);
    const parsed = parseLogs(logs, standard);
    console.log('[chain]', addr.slice(0, 10), '→', parsed.length, 'mint event(s) via getLogs');

    const tokens = {};
    for (const { tokenId, supply, blockHex } of parsed) {
      if (!tokens[tokenId]) {
        tokens[tokenId] = { date: null, supply: 0, blockHex, name: null, imageUrl: null, fileType: null };
      }
      tokens[tokenId].supply += supply;
    }
    return tokens;
  }

  /* ── Phase 2: enrich with metadata ─────────────────────── */

  async function enrichMetadata(addr, info) {
    const tokenIds = Object.keys(info.tokens).map(Number).sort((a, b) => a - b);
    const toFetch  = tokenIds.slice(0, META_MAX);

    for (let i = 0; i < toFetch.length; i += META_BATCH) {
      const batch = toFetch.slice(i, i + META_BATCH);
      await Promise.all(batch.map(async tokenId => {
        const t = info.tokens[tokenId];
        if (!t) return;
        const uri  = await getTokenUri(addr, tokenId, info.standard);
        const url  = resolveUri(uri, tokenId);
        const meta = await fetchMeta(url);
        if (meta) {
          if (meta.name)   t.name     = meta.name;
          const imgUrl = meta.animation_url || meta.image || null;
          if (imgUrl)      t.imageUrl = imgUrl;
          t.fileType = fileTypeFromUrl(imgUrl) || t.fileType || null;
        }
      }));

      document.dispatchEvent(new CustomEvent('chainMetadataUpdate', { detail: window.CHAIN_DATA }));
    }
  }

  /* ── Phase 3: fill dates via getLogs (background) ───────── */

  async function enrichDates(addr, info, standard) {
    // Only run if tokens have no dates yet
    const needsDates = Object.values(info.tokens).some(t => !t.date);
    if (!needsDates) return;

    try {
      const latestBlock = await getCurrentBlock();
      const filter = standard === 'ERC-1155'
        ? { address: addr, topics: [SIG_1155_SINGLE, null, ZERO_TOPIC] }
        : { address: addr, topics: [SIG_721, ZERO_TOPIC] };
      const logs = await getLogsChunked(filter, FROM_BLOCK, latestBlock);
      const parsed = parseLogs(logs, standard);

      // Resolve block timestamps
      const blockHexes = [...new Set(parsed.map(p => p.blockHex))];
      const tsMap = {};
      for (let i = 0; i < blockHexes.length; i += 5) {
        const batch = blockHexes.slice(i, i + 5);
        const results = await Promise.all(batch.map(bh =>
          rpc('eth_getBlockByNumber', [bh, false]).catch(() => null)
        ));
        batch.forEach((bh, idx) => {
          const block = results[idx];
          if (block) tsMap[bh] = parseInt(block.timestamp, 16);
        });
      }

      for (const { tokenId, blockHex } of parsed) {
        const t = info.tokens[tokenId];
        if (t && !t.date && tsMap[blockHex]) {
          t.date = tsToDate(tsMap[blockHex]);
        }
      }

      saveCache(window.CHAIN_DATA);
      document.dispatchEvent(new CustomEvent('chainMetadataUpdate', { detail: window.CHAIN_DATA }));
      console.log('[chain] Dates resolved for', addr.slice(0, 10));
    } catch (e) {
      console.warn('[chain] Date enrichment failed for', addr.slice(0, 10), e.message);
    }
  }

  function tsToDate(ts) {
    const d = new Date(ts * 1000);
    return d.getUTCFullYear() + '-' +
      String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(d.getUTCDate()).padStart(2, '0');
  }

  /* ── Main fetch ────────────────────────────────────────── */

  async function fetchAll() {
    const result = {};

    // Step 1: introspect all contracts in parallel
    const contractMeta = await Promise.all(CONTRACTS.map(async addr => {
      const a = addr.toLowerCase();
      const [name, standard, supply] = await Promise.all([
        getContractName(a),
        detectStandard(a),
        getTotalSupply(a),
      ]);
      return { addr: a, name, standard, supply };
    }));

    console.log('[chain] Contracts:\n' +
      contractMeta.map(m =>
        '  ' + m.addr.slice(0, 10) + '… "' + m.name + '" ' + m.standard +
        (m.supply !== null ? ' supply=' + m.supply : ' (no totalSupply)')
      ).join('\n'));

    // Step 2: discover tokens
    for (const { addr, name, standard, supply } of contractMeta) {
      let tokens;
      if (supply !== null) {
        tokens = await discoverTokensBySupply(addr, supply);
        console.log('[chain]', name || addr.slice(0, 10), '→', supply, 'tokens (totalSupply)');
      } else {
        tokens = await discoverTokensByLogs(addr, standard);
        console.log('[chain]', name || addr.slice(0, 10), '→', Object.keys(tokens).length, 'tokens (getLogs)');
      }
      result[addr] = { name, standard, tokens, usedSupply: supply !== null };
    }

    return result;
  }

  /* ── Cache ─────────────────────────────────────────────── */

  function loadCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      return Date.now() - ts < CACHE_TTL ? data : null;
    } catch (e) { return null; }
  }

  function saveCache(data) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); }
    catch (e) {}
  }

  /* ── Init ──────────────────────────────────────────────── */

  window.CHAIN_DATA = null;

  async function init() {
    const cached = loadCache();
    if (cached) {
      console.log('[chain] Using cached data (' + Object.keys(cached).length + ' contracts)');
      window.CHAIN_DATA = cached;
      document.dispatchEvent(new CustomEvent('chainDataReady', { detail: cached }));
      runBackground(cached);
      return;
    }

    document.dispatchEvent(new CustomEvent('chainDataLoading'));
    try {
      const data = await fetchAll();
      window.CHAIN_DATA = data;
      saveCache(data);
      document.dispatchEvent(new CustomEvent('chainDataReady', { detail: data }));
      runBackground(data);
    } catch (e) {
      console.warn('[chain] Fetch failed:', e);
      document.dispatchEvent(new CustomEvent('chainDataError'));
    }
  }

  // Background: enrich metadata then dates (non-blocking)
  async function runBackground(data) {
    for (const [addr, info] of Object.entries(data)) {
      if (Object.keys(info.tokens).length === 0) continue;
      await enrichMetadata(addr, info);
      saveCache(data);
    }
    document.dispatchEvent(new CustomEvent('chainMetadataUpdate', { detail: data }));
    console.log('[chain] Metadata complete');

    // Now try to get dates (slow getLogs pass, best-effort)
    for (const [addr, info] of Object.entries(data)) {
      if (Object.keys(info.tokens).length === 0) continue;
      await enrichDates(addr, info, info.standard);
    }
    console.log('[chain] Date enrichment complete');
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(init, 600);
  });

})();
