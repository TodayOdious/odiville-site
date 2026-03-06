#!/usr/bin/env python3
"""
fetch-listings.py — Pull active OpenSea listings + floor prices for all Odiville collections.
Outputs js/data/listings.json and js/data/listings.js (window.LISTINGS = ...).

Usage: OPENSEA_API_KEY=xxx python scripts/fetch-listings.py
"""

import json, os, sys, time
import urllib.request, urllib.error

API_KEY = os.environ.get("OPENSEA_API_KEY", "")
if not API_KEY:
    print("ERROR: OPENSEA_API_KEY not set")
    sys.exit(1)

BASE_URL = "https://api.opensea.io/api/v2"

SCRIPT_DIR = os.path.dirname(__file__)
INVENTORY  = os.path.join(SCRIPT_DIR, "..", "js", "data", "inventory.json")
OUT_JSON   = os.path.join(SCRIPT_DIR, "..", "js", "data", "listings.json")
OUT_JS     = os.path.join(SCRIPT_DIR, "..", "js", "data", "listings.js")


def api_get(path, params=None):
    url = BASE_URL + path
    if params:
        qs = "&".join(f"{k}={v}" for k, v in params.items() if v)
        url += "?" + qs
    req = urllib.request.Request(url, headers={
        "x-api-key": API_KEY,
        "Accept": "application/json",
        "User-Agent": "odiville-listings/1.0",
    })
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 10 * (attempt + 1)
                print(f"  Rate limited, waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"  HTTP {e.code} for {url}")
                return None
        except Exception as e:
            print(f"  Request failed: {e}")
            time.sleep(2)
    return None


def wei_to_eth(value_str, decimals=18):
    """Convert wei string to float ETH value."""
    try:
        return int(value_str) / (10 ** decimals)
    except (ValueError, TypeError):
        return 0.0


def get_collection_slugs():
    """Read inventory.json and return unique openseaCollection slugs."""
    with open(INVENTORY, encoding="utf-8") as f:
        data = json.load(f)
    slugs = set()
    for rec in data.get("records", []):
        slug = rec.get("openseaCollection")
        if slug:
            slugs.add(slug)
    return sorted(slugs)


def fetch_floor_price(slug):
    """Fetch floor price for a collection."""
    print(f"  Floor price for {slug}...")
    data = api_get(f"/collections/{slug}/stats")
    if not data:
        return None
    total = data.get("total", {})
    price = total.get("floor_price")
    symbol = total.get("floor_price_symbol", "ETH")
    if price is not None:
        return {"price": round(price, 6), "currency": symbol}
    return None


def fetch_listings(slug):
    """Fetch all active listings for a collection. Returns list of parsed listings."""
    listings = []
    next_cursor = None
    page = 1

    while True:
        params = {"limit": "50"}
        if next_cursor:
            params["next"] = next_cursor

        print(f"  Listings page {page} for {slug}...", end=" ", flush=True)
        data = api_get(f"/listings/collection/{slug}/all", params)

        if not data:
            print("no data")
            break

        raw = data.get("listings", [])
        print(f"{len(raw)} listings")

        for item in raw:
            try:
                price_info = item.get("price", {}).get("current", {})
                price_val = price_info.get("value", "0")
                decimals = price_info.get("decimals", 18)
                currency = price_info.get("currency", "ETH")
                price_eth = wei_to_eth(price_val, decimals)

                proto = item.get("protocol_data", {}).get("parameters", {})
                offerer = proto.get("offerer", "")

                # Extract NFT contract + token ID from the offer array
                offer_items = proto.get("offer", [])
                if not offer_items:
                    continue
                nft_contract = offer_items[0].get("token", "").lower()
                token_id = offer_items[0].get("identifierOrCriteria", "")

                if not nft_contract or not token_id:
                    continue

                order_hash = item.get("order_hash", "")
                closing_date = item.get("closing_date", "")

                key = f"{nft_contract}:{token_id}"
                listings.append({
                    "key": key,
                    "contract": nft_contract,
                    "tokenId": token_id,
                    "price": round(price_eth, 6),
                    "priceWei": price_val,
                    "currency": currency,
                    "seller": offerer,
                    "orderHash": order_hash,
                    "expiration": closing_date,
                    "collection": slug,
                })
            except Exception as e:
                print(f"    Warning: could not parse listing: {e}")

        next_cursor = data.get("next")
        if not next_cursor or not raw:
            break
        page += 1
        time.sleep(0.4)

    return listings


def main():
    slugs = get_collection_slugs()
    if not slugs:
        print("No OpenSea collection slugs found in inventory.json")
        print("Run enrich-opensea.py first to populate openseaCollection fields")
        sys.exit(1)

    print(f"=== Fetch OpenSea Listings ===")
    print(f"Collections: {', '.join(slugs)}\n")

    # Fetch floor prices
    floors = {}
    for slug in slugs:
        fp = fetch_floor_price(slug)
        if fp:
            floors[slug] = fp
            print(f"    => {fp['price']} {fp['currency']}")
        else:
            print(f"    => no floor data")
        time.sleep(0.4)

    print()

    # Fetch all listings
    all_listings = {}
    total = 0
    for slug in slugs:
        items = fetch_listings(slug)
        for item in items:
            k = item["key"]
            # Keep lowest price if multiple listings for same token
            if k not in all_listings or item["price"] < all_listings[k]["price"]:
                all_listings[k] = item
        total += len(items)
        time.sleep(0.5)

    # Clean up — remove internal "key" field
    listings_out = {}
    for k, v in all_listings.items():
        entry = {kk: vv for kk, vv in v.items() if kk != "key"}
        listings_out[k] = entry

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    result = {
        "fetchedAt": now,
        "listingCount": len(listings_out),
        "floors": floors,
        "listings": listings_out,
    }

    # Write JSON
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    # Write JS (window.LISTINGS = ...)
    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write("window.LISTINGS = ")
        json.dump(result, f, ensure_ascii=False)
        f.write(";\n")

    print(f"\n{'='*50}")
    print(f"Done! {len(listings_out)} unique listings from {total} total")
    print(f"Floor prices: {len(floors)} collections")
    for slug, fp in floors.items():
        print(f"  {slug}: {fp['price']} {fp['currency']}")
    print(f"\nSaved to {OUT_JSON}")
    print(f"Saved to {OUT_JS}")


if __name__ == "__main__":
    main()
