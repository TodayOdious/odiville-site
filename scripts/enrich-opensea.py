#!/usr/bin/env python3
"""
enrich-opensea.py — Merge OpenSea metadata + local image stats into inventory.json.
Adds: opensea_url, collection slug, animation URL, traits, image dimensions, file size,
      GIF frame count + duration, file size.
Usage: python scripts/enrich-opensea.py
"""

import json, os, struct, glob

SCRIPT_DIR   = os.path.dirname(__file__)
META_ROOT    = os.path.join(SCRIPT_DIR, "opensea-data", "metadata")
IMG_ROOT     = os.path.join(SCRIPT_DIR, "opensea-data", "images")
INVENTORY    = os.path.join(SCRIPT_DIR, "..", "js", "data", "inventory.json")


# ── Image dimension parsers ────────────────────────────────────────────

def read_png_dims(path):
    try:
        with open(path, "rb") as f:
            sig = f.read(8)
            if sig != b"\x89PNG\r\n\x1a\n":
                return None, None
            f.read(4)  # chunk length
            chunk = f.read(4)
            if chunk != b"IHDR":
                return None, None
            w = struct.unpack(">I", f.read(4))[0]
            h = struct.unpack(">I", f.read(4))[0]
            return w, h
    except Exception:
        return None, None


def read_gif_info(path):
    """Returns (width, height, frame_count, duration_ms)."""
    try:
        with open(path, "rb") as f:
            data = f.read()
        if data[:3] not in (b"GIF", ):
            return None, None, None, None
        w = struct.unpack_from("<H", data, 6)[0]
        h = struct.unpack_from("<H", data, 8)[0]

        frames = 0
        duration_ms = 0
        i = 13
        flags = data[10]
        if flags & 0x80:
            i += 3 * (1 << ((flags & 0x07) + 1))  # skip global color table

        while i < len(data):
            b = data[i]
            if b == 0x3B:  # trailer
                break
            elif b == 0x2C:  # image descriptor
                frames += 1
                lflags = data[i + 9] if i + 9 < len(data) else 0
                i += 10
                if lflags & 0x80:
                    i += 3 * (1 << ((lflags & 0x07) + 1))
                i += 1  # LZW min code size
                # skip sub-blocks
                while i < len(data):
                    bsize = data[i]
                    i += 1 + bsize
                    if bsize == 0:
                        break
            elif b == 0x21:  # extension
                ext = data[i + 1] if i + 1 < len(data) else 0
                i += 2
                if ext == 0xF9 and i < len(data) and data[i] == 4:
                    # Graphic Control Extension — delay in centiseconds
                    delay_cs = struct.unpack_from("<H", data, i + 2)[0]
                    duration_ms += delay_cs * 10
                # skip sub-blocks
                while i < len(data):
                    bsize = data[i]
                    i += 1 + bsize
                    if bsize == 0:
                        break
            else:
                i += 1

        return w, h, frames, duration_ms
    except Exception:
        return None, None, None, None


def read_jpeg_dims(path):
    try:
        with open(path, "rb") as f:
            data = f.read()
        i = 2  # skip SOI marker
        while i < len(data) - 8:
            if data[i] != 0xFF:
                break
            marker = data[i + 1]
            length = struct.unpack_from(">H", data, i + 2)[0]
            if marker in (0xC0, 0xC1, 0xC2):
                h = struct.unpack_from(">H", data, i + 5)[0]
                w = struct.unpack_from(">H", data, i + 7)[0]
                return w, h
            i += 2 + length
    except Exception:
        pass
    return None, None


def read_webp_dims(path):
    try:
        with open(path, "rb") as f:
            data = f.read(40)
        if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
            return None, None
        chunk = data[12:16]
        if chunk == b"VP8 ":
            w = struct.unpack_from("<H", data, 26)[0] & 0x3FFF
            h = struct.unpack_from("<H", data, 28)[0] & 0x3FFF
            return w, h
        elif chunk == b"VP8L":
            bits = struct.unpack_from("<I", data, 21)[0]
            w = (bits & 0x3FFF) + 1
            h = ((bits >> 14) & 0x3FFF) + 1
            return w, h
        elif chunk == b"VP8X":
            # width/height stored as 24-bit LE minus 1 at offsets 24 and 27
            w = (data[24] | (data[25] << 8) | (data[26] << 16)) + 1
            h = (data[27] | (data[28] << 8) | (data[29] << 16)) + 1
            return w, h
    except Exception:
        pass
    return None, None


def detect_format(path):
    """Detect actual image format from magic bytes, ignoring file extension."""
    try:
        with open(path, "rb") as f:
            header = f.read(12)
        if header[:8] == b"\x89PNG\r\n\x1a\n":
            return "png"
        if header[:3] == b"GIF":
            return "gif"
        if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
            return "webp"
        if header[:2] == b"\xff\xd8":
            return "jpeg"
    except Exception:
        pass
    return None


def get_image_stats(path):
    """Return dict with dims + file size, detecting format from magic bytes."""
    if not path or not os.path.exists(path):
        return {}
    stats = {}
    stats["fileSize"] = os.path.getsize(path)

    fmt = detect_format(path)
    if fmt == "png":
        w, h = read_png_dims(path)
        if w:
            stats["width"], stats["height"] = w, h
    elif fmt == "gif":
        w, h, frames, dur = read_gif_info(path)
        if w:
            stats["width"], stats["height"] = w, h
        if frames is not None:
            stats["gifFrames"] = frames
        if dur:
            stats["gifDurationMs"] = dur
    elif fmt == "webp":
        w, h = read_webp_dims(path)
        if w:
            stats["width"], stats["height"] = w, h
    elif fmt == "jpeg":
        w, h = read_jpeg_dims(path)
        if w:
            stats["width"], stats["height"] = w, h

    return stats


IPFS_GATEWAY = "https://ipfs.io/ipfs/"


def resolve_ipfs(url):
    """Convert ipfs:// or ar:// to gateway URL, pass HTTP through unchanged."""
    if not url:
        return None
    if url.startswith("ipfs://"):
        return IPFS_GATEWAY + url[7:]
    if url.startswith("ar://"):
        return "https://arweave.net/" + url[5:]
    return url


def true_ext_from_url(url):
    """Extract file extension from URL, return lowercase or None."""
    if not url:
        return None
    import re
    m = re.search(r"\.(\w+)(?:\?|#|$)", url)
    if m:
        ext = m.group(1).lower()
        if ext in ("gif", "mp4", "webm", "mov", "png", "jpg", "jpeg", "webp", "svg"):
            return ext
    return None


# ── Build lookup from OpenSea metadata ────────────────────────────────

def build_opensea_lookup():
    """Returns {(contract, token_id_int): opensea_data_dict}"""
    lookup = {}
    for meta_path in glob.glob(os.path.join(META_ROOT, "**", "token-*.json"), recursive=True):
        try:
            with open(meta_path, encoding="utf-8") as f:
                nft = json.load(f)
            contract = nft.get("contract", "").lower()
            tid = int(nft.get("identifier", -1))
            if not contract or tid < 0:
                continue

            # Find local image
            img_dir = os.path.join(IMG_ROOT, contract)
            img_path = None
            for ext in ("gif", "png", "jpg", "jpeg", "webp", "svg"):
                candidate = os.path.join(img_dir, f"token-{tid}.{ext}")
                if os.path.exists(candidate):
                    img_path = candidate
                    break

            img_stats = get_image_stats(img_path)

            orig_anim = nft.get("original_animation_url")
            orig_img  = nft.get("original_image_url")
            disp_anim = nft.get("display_animation_url")

            # Derive the true source file extension (original takes precedence over CDN)
            true_ext = (
                true_ext_from_url(orig_anim) or
                true_ext_from_url(orig_img) or
                true_ext_from_url(disp_anim) or
                true_ext_from_url(nft.get("display_image_url"))
            )

            lookup[(contract, tid)] = {
                "openseaUrl":            nft.get("opensea_url"),
                "openseaCollection":     nft.get("collection"),
                "displayAnimationUrl":   disp_anim,
                "displayImageUrl":       nft.get("display_image_url") or nft.get("image_url"),
                "originalAnimationUrl":  resolve_ipfs(orig_anim),
                "originalImageUrl":      resolve_ipfs(orig_img),
                "metadataUrl":           nft.get("metadata_url"),
                "trueFileExt":           true_ext,
                "traits":                nft.get("traits") or [],
                "localImagePath":        img_path,
                **img_stats,
            }
        except Exception as e:
            print(f"  Warning: could not parse {meta_path}: {e}")

    return lookup


# ── Merge into inventory ───────────────────────────────────────────────

def main():
    with open(INVENTORY, encoding="utf-8") as f:
        inventory = json.load(f)

    lookup = build_opensea_lookup()
    print(f"OpenSea lookup built: {len(lookup)} tokens")

    enriched = 0
    for rec in inventory.get("records", []):
        contract = (rec.get("contract") or "").lower()
        tid = rec.get("tokenId")
        if tid is None:
            continue
        key = (contract, int(tid))
        os_data = lookup.get(key)
        if not os_data:
            continue

        rec["openseaUrl"]           = os_data.get("openseaUrl")
        rec["openseaCollection"]    = os_data.get("openseaCollection")
        rec["displayAnimationUrl"]  = os_data.get("displayAnimationUrl")
        rec["originalAnimationUrl"] = os_data.get("originalAnimationUrl")
        rec["originalImageUrl"]     = os_data.get("originalImageUrl")
        if os_data.get("displayImageUrl"):
            rec["imageUrl"] = os_data["displayImageUrl"]  # fast OpenSea CDN for thumbnails
        rec["metadataUrl"]   = os_data.get("metadataUrl")
        rec["trueFileExt"]   = os_data.get("trueFileExt")
        rec["traits"]        = os_data.get("traits") or []
        rec["width"]         = os_data.get("width")
        rec["height"]        = os_data.get("height")
        rec["fileSize"]      = os_data.get("fileSize")
        rec["gifFrames"]     = os_data.get("gifFrames")
        rec["gifDurationMs"] = os_data.get("gifDurationMs")
        enriched += 1

    with open(INVENTORY, "w", encoding="utf-8") as f:
        json.dump(inventory, f, indent=2, ensure_ascii=False)

    print(f"Enriched {enriched} / {len(inventory.get('records', []))} records")
    print(f"Saved to {INVENTORY}")


if __name__ == "__main__":
    main()
