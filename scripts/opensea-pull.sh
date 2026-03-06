#!/usr/bin/env bash
# opensea-pull.sh — Pull NFT metadata + images for all Ethereum Odiville contracts via OpenSea
# Usage: OPENSEA_API_KEY=xxx bash scripts/opensea-pull.sh

set -euo pipefail

OUT="scripts/opensea-data"
META_DIR="$OUT/metadata"
IMG_DIR="$OUT/images"
SUMMARY="$OUT/summary.json"

ETHEREUM_CONTRACTS=(
  "0x8ef59800a6751305fe26a2f6ea4a401411567a7e"
  "0xcbef61f2675981080da1375647741c508db2b198"
  "0xa3e8fe3a0e82947bfc505ba83f2967408fc568bf"
  "0x7957acfae47695c341c40f5a3f7474f1af13397c"
  "0x67a931807e871c09d1af4d3062ec85562908efcd"
  "0xdaa19c2c091575bf4fcdb7a63f794fdb2aa3eabb"
  "0x941b14b24c3ca713554d32cdb42563e4992b4dbc"
)

SKIPPED_CONTRACTS=(
  "0x45c03cef4bac4ee37f22bd2081bd931fec2716c2  (Shape — not indexed by OpenSea)"
  "0x54cba79fd1ccc5658b2a9abe7b5bf19a39172421  (Shape — not indexed by OpenSea)"
  "0xf65c302e0aee68843af2c5324fbc49ba322d970f  (Apechain — not indexed by OpenSea)"
)

if [ -z "${OPENSEA_API_KEY:-}" ]; then
  echo "ERROR: OPENSEA_API_KEY not set"
  exit 1
fi

mkdir -p "$META_DIR" "$IMG_DIR"

echo "=== OpenSea NFT Pull ==="
echo "Output: $OUT"
echo ""
echo "Skipping (unsupported chains):"
for s in "${SKIPPED_CONTRACTS[@]}"; do echo "  $s"; done
echo ""

ALL_RECORDS=()
TOTAL_TOKENS=0
TOTAL_IMAGES=0

for CONTRACT in "${ETHEREUM_CONTRACTS[@]}"; do
  echo "----------------------------------------"
  echo "Contract: $CONTRACT"

  CDIR="$META_DIR/$CONTRACT"
  IDIR="$IMG_DIR/$CONTRACT"
  mkdir -p "$CDIR" "$IDIR"

  # Paginate through all NFTs for this contract
  NEXT=""
  PAGE=1
  CONTRACT_TOKENS=0

  while true; do
    echo "  Fetching page $PAGE..."

    if [ -z "$NEXT" ]; then
      RESPONSE=$(npx --yes @opensea/cli nfts list-by-contract ethereum "$CONTRACT" --limit 50 2>/dev/null) || {
        echo "  ERROR: CLI call failed for $CONTRACT"
        break
      }
    else
      RESPONSE=$(npx @opensea/cli nfts list-by-contract ethereum "$CONTRACT" --limit 50 --next "$NEXT" 2>/dev/null) || {
        echo "  ERROR: CLI call failed on page $PAGE"
        break
      }
    fi

    # Extract NFTs array
    NFT_COUNT=$(echo "$RESPONSE" | python -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('nfts',[])))" 2>/dev/null || echo 0)
    echo "  Got $NFT_COUNT NFTs on page $PAGE"

    if [ "$NFT_COUNT" -eq 0 ]; then
      break
    fi

    # Save each token's metadata and download image
    echo "$RESPONSE" | python - "$CDIR" "$IDIR" <<'PYEOF'
import json, sys, os, urllib.request, urllib.error, re

cdir, idir = sys.argv[1], sys.argv[2]
data = json.load(sys.stdin)
nfts = data.get("nfts", [])

for nft in nfts:
    tid = str(nft.get("identifier", nft.get("token_id", "unknown")))

    # Save metadata JSON
    meta_path = os.path.join(cdir, f"token-{tid}.json")
    with open(meta_path, "w") as f:
        json.dump(nft, f, indent=2)

    # Download image
    img_url = nft.get("image_url") or nft.get("display_image_url") or ""
    if img_url and img_url.startswith("http"):
        ext = "jpg"
        m = re.search(r"\.(\w+)(?:\?|$)", img_url)
        if m and m.group(1).lower() in ("png","jpg","jpeg","gif","webp","svg"):
            ext = m.group(1).lower()
        img_path = os.path.join(idir, f"token-{tid}.{ext}")
        if not os.path.exists(img_path):
            try:
                req = urllib.request.Request(img_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=15) as r, open(img_path, "wb") as f:
                    f.write(r.read())
                print(f"  [img] token-{tid}.{ext}")
            except Exception as e:
                print(f"  [img] FAILED token-{tid}: {e}")
        else:
            print(f"  [img] token-{tid}.{ext} (cached)")
    else:
        print(f"  [no-img] token-{tid}")

print(f"__COUNT__{len(nfts)}")
PYEOF

    CONTRACT_TOKENS=$((CONTRACT_TOKENS + NFT_COUNT))

    # Get next cursor
    NEXT=$(echo "$RESPONSE" | python -c "import json,sys; d=json.load(sys.stdin); print(d.get('next',''))" 2>/dev/null || echo "")
    if [ -z "$NEXT" ]; then
      break
    fi
    PAGE=$((PAGE + 1))
    sleep 0.5
  done

  echo "  Total tokens for $CONTRACT: $CONTRACT_TOKENS"
  TOTAL_TOKENS=$((TOTAL_TOKENS + CONTRACT_TOKENS))
done

echo ""
echo "========================================"
echo "Done."
echo "  Ethereum contracts processed: ${#ETHEREUM_CONTRACTS[@]}"
echo "  Total tokens pulled: $TOTAL_TOKENS"
echo "  Metadata: $META_DIR"
echo "  Images:   $IMG_DIR"
echo ""
echo "Skipped (not on OpenSea):"
for s in "${SKIPPED_CONTRACTS[@]}"; do echo "  $s"; done
