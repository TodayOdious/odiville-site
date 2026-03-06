#!/usr/bin/env python3
"""
opensea-pull.py — Pull NFT metadata + images for all Odiville Ethereum contracts via OpenSea REST API.
Usage: OPENSEA_API_KEY=xxx python scripts/opensea-pull.py
"""

import json, os, re, sys, time
import urllib.request, urllib.error

API_KEY = os.environ.get("OPENSEA_API_KEY", "")
if not API_KEY:
    print("ERROR: OPENSEA_API_KEY not set")
    sys.exit(1)

BASE_URL = "https://api.opensea.io/api/v2"

ETHEREUM_CONTRACTS = [
    "0x8ef59800a6751305fe26a2f6ea4a401411567a7e",
    "0xcbef61f2675981080da1375647741c508db2b198",
    "0xa3e8fe3a0e82947bfc505ba83f2967408fc568bf",
    "0x7957acfae47695c341c40f5a3f7474f1af13397c",
    "0x67a931807e871c09d1af4d3062ec85562908efcd",
    "0xdaa19c2c091575bf4fcdb7a63f794fdb2aa3eabb",
    "0x941b14b24c3ca713554d32cdb42563e4992b4dbc",
]

SKIPPED = [
    "0x45c03cef4bac4ee37f22bd2081bd931fec2716c2  (Shape)",
    "0x54cba79fd1ccc5658b2a9abe7b5bf19a39172421  (Shape)",
    "0xf65c302e0aee68843af2c5324fbc49ba322d970f  (Apechain)",
]

OUT_DIR = os.path.join(os.path.dirname(__file__), "opensea-data")
META_DIR = os.path.join(OUT_DIR, "metadata")
IMG_DIR  = os.path.join(OUT_DIR, "images")


def opensea_get(path, params=None):
    url = BASE_URL + path
    if params:
        qs = "&".join(f"{k}={v}" for k, v in params.items() if v)
        url += "?" + qs
    req = urllib.request.Request(url, headers={
        "x-api-key": API_KEY,
        "Accept": "application/json",
        "User-Agent": "odiville-pull/1.0",
    })
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 10 * (attempt + 1)
                print(f"    Rate limited, waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"    HTTP {e.code} for {url}")
                return None
        except Exception as e:
            print(f"    Request failed: {e}")
            time.sleep(2)
    return None


def image_ext(url):
    m = re.search(r"\.(\w+)(?:\?|#|$)", url or "")
    if m and m.group(1).lower() in ("png", "jpg", "jpeg", "gif", "webp", "svg"):
        return m.group(1).lower()
    return "jpg"


def download_image(url, dest_path):
    if os.path.exists(dest_path):
        return "cached"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=20) as r, open(dest_path, "wb") as f:
            f.write(r.read())
        return "ok"
    except Exception as e:
        return f"FAILED: {e}"


def pull_contract(contract):
    cdir = os.path.join(META_DIR, contract)
    idir = os.path.join(IMG_DIR, contract)
    os.makedirs(cdir, exist_ok=True)
    os.makedirs(idir, exist_ok=True)

    next_cursor = None
    page = 1
    total = 0

    while True:
        params = {"limit": "50"}
        if next_cursor:
            params["next"] = next_cursor

        print(f"  Page {page}...", end=" ", flush=True)
        data = opensea_get(f"/chain/ethereum/contract/{contract}/nfts", params)

        if not data:
            print("no data / error")
            break

        nfts = data.get("nfts", [])
        print(f"{len(nfts)} NFTs")

        for nft in nfts:
            tid = str(nft.get("identifier", nft.get("token_id", "unknown")))

            # Save metadata
            meta_path = os.path.join(cdir, f"token-{tid}.json")
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(nft, f, indent=2, ensure_ascii=False)

            # Download image
            img_url = nft.get("image_url") or nft.get("display_image_url") or ""
            if img_url and img_url.startswith("http"):
                ext = image_ext(img_url)
                img_path = os.path.join(idir, f"token-{tid}.{ext}")
                status = download_image(img_url, img_path)
                name = nft.get("name") or f"token-{tid}"
                print(f"    [{status}] {name[:50]}  -> token-{tid}.{ext}")
            else:
                name = nft.get("name") or f"token-{tid}"
                print(f"    [no-img] {name[:50]}")

        total += len(nfts)
        next_cursor = data.get("next")
        if not next_cursor or not nfts:
            break
        page += 1
        time.sleep(0.4)

    return total


def main():
    os.makedirs(META_DIR, exist_ok=True)
    os.makedirs(IMG_DIR, exist_ok=True)

    print("=== OpenSea NFT Pull ===")
    print(f"Output: {OUT_DIR}\n")
    print("Skipped (unsupported chains):")
    for s in SKIPPED:
        print(f"  {s}")
    print()

    grand_total = 0
    results = {}

    for contract in ETHEREUM_CONTRACTS:
        print(f"{'='*56}")
        print(f"Contract: {contract}")
        count = pull_contract(contract)
        results[contract] = count
        grand_total += count
        print(f"  => {count} tokens\n")
        time.sleep(0.5)

    print("="*56)
    print(f"Done! {grand_total} tokens total\n")
    print("Per-contract summary:")
    for c, n in results.items():
        print(f"  {c}  {n} tokens")
    print("\nSkipped (not on OpenSea):")
    for s in SKIPPED:
        print(f"  {s}")

    # Write summary JSON
    summary_path = os.path.join(OUT_DIR, "summary.json")
    with open(summary_path, "w") as f:
        json.dump({"contracts": results, "total": grand_total, "skipped": SKIPPED}, f, indent=2)
    print(f"\nSummary written to {summary_path}")


if __name__ == "__main__":
    main()
