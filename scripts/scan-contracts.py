#!/usr/bin/env python3
"""
Odiville Contract Scanner
Queries all Odiville contracts across Ethereum, Shape, and Apechain.
Outputs a static inventory JSON for the Archive page.

Usage:  python scripts/scan-contracts.py
Output: js/data/inventory.json
"""

import json, time, sys, os, re, base64, hashlib
from datetime import datetime, timezone
from urllib.parse import urlparse

import requests

# ── Configuration ──────────────────────────────────────────────────────

CONTRACTS = [
    "0x8ef59800a6751305fe26a2f6ea4a401411567a7e",
    "0xcbef61f2675981080da1375647741c508db2b198",
    "0x45c03cef4bac4ee37f22bd2081bd931fec2716c2",
    "0xf65c302e0aee68843af2c5324fbc49ba322d970f",
    "0xa3e8fe3a0e82947bfc505ba83f2967408fc568bf",
    "0x7957acfae47695c341c40f5a3f7474f1af13397c",
    "0x54cba79fd1ccc5658b2a9abe7b5bf19a39172421",
    "0x67a931807e871c09d1af4d3062ec85562908efcd",
    "0xdaa19c2c091575bf4fcdb7a63f794fdb2aa3eabb",
    "0x941b14b24c3ca713554d32cdb42563e4992b4dbc",
    "0x10aafa66f2e2a058fb6f875867b6d0c6fc93e5f8",
    "0xb841f3c34aed4b34201814a02a9bc3b1f66d1780",
]

CHAINS = {
    "ethereum": {
        "rpcs": [
            "https://eth.llamarpc.com",
            "https://ethereum.publicnode.com",
            "https://rpc.ankr.com/eth",
            "https://cloudflare-eth.com",
            "https://1rpc.io/eth",
            "https://eth.drpc.org",
        ],
        "chain_id": 1,
        "explorer": "https://etherscan.io",
        "from_block": 14000000,
        "supports_logs": True,
    },
    "shape": {
        "rpcs": [
            "https://mainnet.shape.network",
            "https://shape-mainnet.g.alchemy.com/public",
        ],
        "chain_id": 360,
        "explorer": "https://shapescan.xyz",
        "from_block": 0,
        "supports_logs": False,  # public RPCs don't support getLogs
    },
    "apechain": {
        "rpcs": [
            "https://rpc.apechain.com",
            "https://apechain.drpc.org",
        ],
        "chain_id": 33139,
        "explorer": "https://apescan.io",
        "from_block": 0,
        "supports_logs": True,
    },
}

# Order to try chains — Ethereum first since most contracts are there
CHAIN_ORDER = ["ethereum", "shape", "apechain"]

IPFS_GATEWAYS = [
    "https://ipfs.io/ipfs/",
    "https://w3s.link/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
]

# ERC-165 interface IDs
IERC721  = "80ac58cd"
IERC1155 = "d9b67a26"

# Event signatures
SIG_TRANSFER_721  = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
SIG_TRANSFER_1155 = "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62"
ZERO_TOPIC = "0x" + "0" * 64

# Throttle
RPC_DELAY = 0.15  # seconds between RPC calls
META_TIMEOUT = 10
BATCH_SIZE = 6
CHUNK_SIZE = 500000  # blocks per getLogs call

req_id = 0


# ── RPC helpers ────────────────────────────────────────────────────────

def rpc_call(chain_name, method, params):
    global req_id
    req_id += 1
    chain = CHAINS[chain_name]
    for url in chain["rpcs"]:
        try:
            resp = requests.post(
                url,
                json={"jsonrpc": "2.0", "id": req_id, "method": method, "params": params},
                timeout=15,
            )
            data = resp.json()
            if "error" in data:
                continue
            time.sleep(RPC_DELAY)
            return data["result"]
        except Exception:
            continue
    raise Exception(f"All RPCs failed for {method} on {chain_name}")


def eth_call(chain_name, to, data):
    return rpc_call(chain_name, "eth_call", [{"to": to, "data": data}, "latest"])


def get_code(chain_name, addr):
    return rpc_call(chain_name, "eth_getCode", [addr, "latest"])


def get_block_number(chain_name):
    return int(rpc_call(chain_name, "eth_blockNumber", []), 16)


def get_block_timestamp(chain_name, block_hex):
    block = rpc_call(chain_name, "eth_getBlockByNumber", [block_hex, False])
    if block and "timestamp" in block:
        return int(block["timestamp"], 16)
    return None


# ── ABI decode helpers ─────────────────────────────────────────────────

def decode_string(hex_str):
    """Decode a Solidity string return value."""
    if not hex_str or hex_str == "0x":
        return ""
    raw = hex_str.replace("0x", "")
    if len(raw) < 128:
        # Might be a short non-standard return — try raw bytes
        try:
            return bytes.fromhex(raw).decode("utf-8", errors="ignore").strip("\x00")
        except Exception:
            return ""
    try:
        length = int(raw[64:128], 16)
        if length == 0 or length > 10000:
            return ""
        hex_bytes = raw[128 : 128 + length * 2]
        return bytes.fromhex(hex_bytes).decode("utf-8", errors="ignore")
    except Exception:
        return ""


def decode_uint(hex_str):
    if not hex_str or hex_str == "0x":
        return None
    try:
        return int(hex_str, 16)
    except Exception:
        return None


def decode_bool(hex_str):
    if not hex_str or hex_str == "0x":
        return False
    try:
        return int(hex_str[-2:], 16) == 1
    except Exception:
        return False


def decode_address(hex_str):
    if not hex_str or len(hex_str) < 42:
        return None
    raw = hex_str.replace("0x", "")
    if len(raw) >= 64:
        raw = raw[-40:]
    return "0x" + raw.lower()


# ── Contract introspection ─────────────────────────────────────────────

def detect_chain(addr):
    """Try each chain to find where this contract is deployed."""
    for chain_name in CHAIN_ORDER:
        try:
            code = get_code(chain_name, addr)
            if code and code != "0x" and len(code) > 4:
                print(f"  [{chain_name}] Found contract {addr[:10]}...")
                return chain_name
        except Exception:
            continue
    return None


def get_contract_name(chain_name, addr):
    try:
        return decode_string(eth_call(chain_name, addr, "0x06fdde03"))
    except Exception:
        return ""


def get_contract_symbol(chain_name, addr):
    try:
        return decode_string(eth_call(chain_name, addr, "0x95d89b41"))
    except Exception:
        return ""


def detect_standard(chain_name, addr):
    """Detect ERC-721 vs ERC-1155 via ERC-165."""
    try:
        r1155 = eth_call(chain_name, addr,
            "0x01ffc9a7" + IERC1155.ljust(64, "0"))
        if decode_bool(r1155):
            return "ERC-1155"
    except Exception:
        pass
    try:
        r721 = eth_call(chain_name, addr,
            "0x01ffc9a7" + IERC721.ljust(64, "0"))
        if decode_bool(r721):
            return "ERC-721"
    except Exception:
        pass
    return "ERC-721"  # fallback


def get_total_supply(chain_name, addr):
    try:
        result = eth_call(chain_name, addr, "0x18160ddd")
        n = decode_uint(result)
        if n is not None and 0 < n <= 5000:
            return n
    except Exception:
        pass
    return None


# ── Token discovery ────────────────────────────────────────────────────

def get_logs_chunked(chain_name, filter_params, from_block, to_block):
    all_logs = []
    start = from_block
    while start <= to_block:
        end = min(start + CHUNK_SIZE - 1, to_block)
        try:
            f = {**filter_params}
            f["fromBlock"] = hex(start)
            f["toBlock"] = hex(end)
            logs = rpc_call(chain_name, "eth_getLogs", [f])
            if isinstance(logs, list):
                all_logs.extend(logs)
        except Exception as e:
            print(f"    getLogs chunk failed {start}-{end}: {e}")
        start += CHUNK_SIZE
    return all_logs


def discover_tokens_by_supply(supply):
    tokens = {}
    for i in range(supply):
        tokens[i] = {"block_hex": None}
    return tokens


def discover_tokens_by_logs(chain_name, addr, standard):
    latest = get_block_number(chain_name)
    from_block = CHAINS[chain_name]["from_block"]

    if standard == "ERC-1155":
        filter_params = {"address": addr, "topics": [SIG_TRANSFER_1155, None, ZERO_TOPIC]}
    else:
        filter_params = {"address": addr, "topics": [SIG_TRANSFER_721, ZERO_TOPIC]}

    logs = get_logs_chunked(chain_name, filter_params, from_block, latest)
    tokens = {}
    for log in logs:
        if standard == "ERC-1155":
            raw = (log.get("data") or "").replace("0x", "")
            if len(raw) < 128:
                continue
            token_id = int(raw[:64], 16)
            supply = int(raw[64:128], 16)
        else:
            if len(log.get("topics", [])) < 4:
                continue
            token_id = int(log["topics"][3], 16)
            supply = 1

        if token_id not in tokens:
            tokens[token_id] = {"block_hex": log.get("blockNumber"), "supply": 0}
        tokens[token_id]["supply"] = tokens[token_id].get("supply", 0) + supply

    return tokens


# ── Token discovery by probing ─────────────────────────────────────────

def probe_token_exists(chain_name, addr, token_id, standard):
    """Check if a token ID exists by calling ownerOf (721) or uri (1155)."""
    pad_id = hex(token_id)[2:].zfill(64)
    try:
        if standard == "ERC-721":
            result = eth_call(chain_name, addr, "0x6352211e" + pad_id)
            # If we get a valid address back, token exists
            return result and result != "0x" and len(result) >= 42
        else:
            # ERC-1155: try uri()
            result = eth_call(chain_name, addr, "0x0e89341c" + pad_id)
            return result and result != "0x" and len(result) > 66
    except Exception:
        return False


def discover_tokens_by_probe(chain_name, addr, standard, max_id=200):
    """Probe sequential token IDs to find which ones exist."""
    tokens = {}
    consecutive_misses = 0
    # Try both 0-based and 1-based
    for token_id in range(0, max_id):
        if probe_token_exists(chain_name, addr, token_id, standard):
            tokens[token_id] = {"block_hex": None}
            consecutive_misses = 0
            print(f"    found token {token_id}", end="\r", flush=True)
        else:
            consecutive_misses += 1
            if consecutive_misses > 10 and token_id > 5:
                break  # stop after 10 consecutive misses
    print(f"    probed up to {token_id}, found {len(tokens)}       ")
    return tokens


# ── Metadata fetching ──────────────────────────────────────────────────

def get_token_uri(chain_name, addr, token_id, standard):
    if standard == "ERC-1155":
        selector = "0x0e89341c"
    else:
        selector = "0xc87b56dd"
    pad_id = hex(token_id)[2:].zfill(64)
    try:
        return decode_string(eth_call(chain_name, addr, selector + pad_id))
    except Exception:
        return None


def resolve_uri(uri, token_id=None):
    if not uri:
        return None
    if token_id is not None:
        uri = uri.replace("{id}", hex(token_id)[2:].zfill(64))
    if uri.startswith("ipfs://"):
        return IPFS_GATEWAYS[0] + uri[7:]
    if uri.startswith("ar://"):
        return "https://arweave.net/" + uri[5:]
    return uri


def detect_storage_type(uri):
    if not uri:
        return None
    if "ipfs" in uri or uri.startswith("ipfs://"):
        return "IPFS"
    if "arweave" in uri or uri.startswith("ar://"):
        return "Arweave"
    if uri.startswith("data:"):
        return "on-chain"
    return "HTTP"


def fetch_metadata(uri):
    if not uri:
        return None
    try:
        if uri.startswith("data:application/json"):
            if ";base64," in uri:
                payload = uri.split(";base64,")[1]
                return json.loads(base64.b64decode(payload).decode("utf-8"))
            else:
                payload = uri.split(",", 1)[1]
                return json.loads(payload)
        resp = requests.get(uri, timeout=META_TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"    metadata fetch failed: {e}")
        return None


def file_type_from_url(url):
    if not url:
        return None
    m = re.search(r"\.(\w+)(?:\?|#|$)", url)
    return m.group(1).lower() if m else None


def media_type_from_url(url):
    ext = file_type_from_url(url)
    if not ext:
        return None
    mapping = {
        "mp4": "video/mp4", "webm": "video/webm", "mov": "video/quicktime",
        "gif": "image/gif", "png": "image/png", "jpg": "image/jpeg",
        "jpeg": "image/jpeg", "webp": "image/webp", "svg": "image/svg+xml",
        "mp3": "audio/mpeg", "wav": "audio/wav", "ogg": "audio/ogg",
    }
    return mapping.get(ext)


# ── Owner lookup ───────────────────────────────────────────────────────

def get_owner_721(chain_name, addr, token_id):
    pad_id = hex(token_id)[2:].zfill(64)
    try:
        result = eth_call(chain_name, addr, "0x6352211e" + pad_id)
        return decode_address(result)
    except Exception:
        return None


# ── Mint date resolution ───────────────────────────────────────────────

def resolve_mint_dates(chain_name, addr, standard, tokens):
    """Resolve mint dates for tokens that have block_hex from log discovery."""
    if not CHAINS[chain_name].get("supports_logs", True):
        print("    (skipping date resolution — chain doesn't support getLogs)")
        return

    # Collect unique blocks needing timestamps
    blocks_needed = set()
    for tid, info in tokens.items():
        if info.get("block_hex") and not info.get("mint_date"):
            blocks_needed.add(info["block_hex"])

    if not blocks_needed:
        # Fall back: get dates from getLogs
        latest = get_block_number(chain_name)
        from_block = CHAINS[chain_name]["from_block"]
        if standard == "ERC-1155":
            filter_params = {"address": addr, "topics": [SIG_TRANSFER_1155, None, ZERO_TOPIC]}
        else:
            filter_params = {"address": addr, "topics": [SIG_TRANSFER_721, ZERO_TOPIC]}

        logs = get_logs_chunked(chain_name, filter_params, from_block, latest)
        for log in logs:
            if standard == "ERC-1155":
                raw = (log.get("data") or "").replace("0x", "")
                if len(raw) < 64:
                    continue
                tid = int(raw[:64], 16)
            else:
                if len(log.get("topics", [])) < 4:
                    continue
                tid = int(log["topics"][3], 16)
            if tid in tokens and not tokens[tid].get("block_hex"):
                tokens[tid]["block_hex"] = log.get("blockNumber")
                blocks_needed.add(log["blockNumber"])

    # Resolve timestamps
    ts_map = {}
    blocks_list = list(blocks_needed)
    for i in range(0, len(blocks_list), 5):
        batch = blocks_list[i : i + 5]
        for bh in batch:
            try:
                ts = get_block_timestamp(chain_name, bh)
                if ts:
                    ts_map[bh] = ts
            except Exception:
                pass

    for tid, info in tokens.items():
        bh = info.get("block_hex")
        if bh and bh in ts_map:
            dt = datetime.fromtimestamp(ts_map[bh], tz=timezone.utc)
            info["mint_date"] = dt.strftime("%Y-%m-%d")


# ── Project guessing ───────────────────────────────────────────────────

def guess_project(contract_name, contract_symbol=""):
    n = (contract_name + " " + contract_symbol).lower()
    if "whisper" in n:
        return "whispers", "Whispers"
    if "ticket" in n or "owt" in n:
        return "owt", "One-Way Ticket"
    if any(k in n for k in ["duu", "book", "odiville", "key", "fragment", "arrival", "today", "puppet"]):
        return "duu", "The Book"
    return "duu", "The Book"  # default


# ── Main scan ──────────────────────────────────────────────────────────

def scan_contract(addr):
    addr = addr.lower()
    print(f"\n{'='*60}")
    print(f"Scanning {addr}")

    # Step 1: detect chain
    chain_name = detect_chain(addr)
    if not chain_name:
        print(f"  Contract not found on any chain, skipping")
        return None

    # Step 2: introspect contract
    name = get_contract_name(chain_name, addr)
    symbol = get_contract_symbol(chain_name, addr)
    standard = detect_standard(chain_name, addr)
    supply = get_total_supply(chain_name, addr)
    project, project_name = guess_project(name, symbol)

    print(f"  Name: {name or '(unknown)'}")
    print(f"  Symbol: {symbol or '(unknown)'}")
    print(f"  Standard: {standard}")
    print(f"  Supply: {supply or '(via logs)'}")
    print(f"  Project: {project_name}")

    # Step 3: discover tokens
    if supply is not None:
        raw_tokens = discover_tokens_by_supply(supply)
        print(f"  Discovered {len(raw_tokens)} tokens (totalSupply)")
    else:
        # Try getLogs first if supported
        raw_tokens = {}
        if CHAINS[chain_name].get("supports_logs", True):
            raw_tokens = discover_tokens_by_logs(chain_name, addr, standard)
        if raw_tokens:
            print(f"  Discovered {len(raw_tokens)} tokens (getLogs)")
        else:
            # Fallback: probe token IDs sequentially
            raw_tokens = discover_tokens_by_probe(chain_name, addr, standard)
            print(f"  Discovered {len(raw_tokens)} tokens (probe)")

    if not raw_tokens:
        print("  No tokens found, skipping")
        return None

    # Step 4: resolve mint dates
    print("  Resolving mint dates...")
    resolve_mint_dates(chain_name, addr, standard, raw_tokens)

    # Step 5: fetch metadata + owners for each token
    records = []
    token_ids = sorted(raw_tokens.keys())
    total = len(token_ids)

    for idx, token_id in enumerate(token_ids):
        info = raw_tokens[token_id]
        print(f"  Token {token_id} ({idx+1}/{total})...", end="", flush=True)

        # Token URI + metadata
        uri_raw = get_token_uri(chain_name, addr, token_id, standard)
        storage_type = detect_storage_type(uri_raw)
        uri_resolved = resolve_uri(uri_raw, token_id)
        meta = fetch_metadata(uri_resolved)

        title = ""
        description = ""
        media_uri_raw = None
        media_url = None
        media_type = None
        file_ext = None
        image_url = None

        if meta:
            title = meta.get("name", "")
            description = meta.get("description", "")
            # Prefer animation_url for media, fall back to image
            media_uri_raw = meta.get("animation_url") or meta.get("image") or meta.get("image_url")
            image_url = meta.get("image") or meta.get("image_url")
            if media_uri_raw:
                media_url = resolve_uri(media_uri_raw)
                file_ext = file_type_from_url(media_uri_raw) or file_type_from_url(media_url)
                media_type = media_type_from_url(media_uri_raw) or media_type_from_url(media_url)

        if not title:
            title = f"{name} #{token_id}" if name else f"Token #{token_id}"

        # Owner (ERC-721 only)
        owner = None
        if standard == "ERC-721":
            owner = get_owner_721(chain_name, addr, token_id)

        # Edition/supply
        editions = info.get("supply", 1)

        record = {
            "title": title,
            "description": description or None,
            "project": project,
            "projectName": project_name,
            "platform": None,  # to be filled from curated data
            "contract": addr,
            "blockchain": chain_name,
            "tokenId": token_id,
            "tokenStandard": standard.lower().replace("-", "-"),
            "mintDate": info.get("mint_date"),
            "editions": editions,
            "mediaType": media_type or file_ext,
            "fileExt": file_ext,
            "storageType": storage_type,
            "mediaUri": media_uri_raw,
            "mediaUrl": media_url,
            "imageUrl": resolve_uri(image_url) if image_url else None,
            "owner": owner,
        }
        records.append(record)
        print(f" {title[:40]}")

    return records


def main():
    print("Odiville Contract Scanner")
    print(f"Scanning {len(CONTRACTS)} contracts across {len(CHAINS)} chains\n")

    all_records = []
    contract_meta = {}

    for ci, addr in enumerate(CONTRACTS):
        if ci > 0:
            time.sleep(1)  # brief pause between contracts to avoid rate limits
        try:
            records = scan_contract(addr)
            if records:
                all_records.extend(records)
                # Track contract-level info
                if records:
                    r0 = records[0]
                    contract_meta[addr.lower()] = {
                        "blockchain": r0["blockchain"],
                        "tokenStandard": r0["tokenStandard"],
                        "count": len(records),
                    }
        except Exception as e:
            print(f"  ERROR scanning {addr}: {e}")
            continue

    # Build output
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    dates = [r["mintDate"] for r in all_records if r.get("mintDate")]
    date_range = None
    if dates:
        date_range = {"first": min(dates), "last": max(dates)}

    output = {
        "generatedAt": now,
        "aggregates": {
            "totalRecords": len(all_records),
            "dateRange": date_range,
            "contracts": len(contract_meta),
            "chains": list(set(r["blockchain"] for r in all_records)),
        },
        "records": all_records,
    }

    # Write output
    out_path = os.path.join(os.path.dirname(__file__), "..", "js", "data", "inventory.json")
    out_path = os.path.normpath(out_path)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"Done! {len(all_records)} records written to {out_path}")
    print(f"Contracts: {len(contract_meta)}")
    print(f"Chains: {output['aggregates']['chains']}")
    if date_range:
        print(f"Date range: {date_range['first']} to {date_range['last']}")


if __name__ == "__main__":
    main()
