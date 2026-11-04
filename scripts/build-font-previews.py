"""Build self-hosted subsets for the fixed Academy Blue typography specimen."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONT_KEYS = ("wenkai", "xihei", "xiaowei", "smiley", "kuaile")


def main():
    parser = argparse.ArgumentParser(
        description="Build preview font subsets. Requires fonttools and brotli."
    )
    parser.add_argument(
        "--font-dir", type=Path, required=True,
        help="Directory with five .ttf files and matching *-license.txt files",
    )
    source = parser.parse_args().font_dir
    text = "".join(
        (ROOT / "public" / name).read_text()
        for name in ("font-options.html", "font-options.js")
    )
    text += "".join(chr(n) for n in range(32, 127))
    text += "，。；：！？、（）「」《》—–·％×÷±²³αβθ∞≥≤∑√"
    manifest = []
    for index, key in enumerate(FONT_KEYS, 1):
        original = source / (key + ".ttf")
        font = TTFont(original)
        cmap = font.getBestCmap()
        missing = sorted({
            char for char in text
            if "\u4e00" <= char <= "\u9fff" and ord(char) not in cmap
        })
        if missing:
            raise ValueError(f"{key}: missing Chinese glyphs {missing}")
        options = subset.Options()
        options.flavor = "woff2"
        options.name_IDs = ["*"]
        options.name_legacy = True
        options.name_languages = ["*"]
        options.recalc_timestamp = False
        builder = subset.Subsetter(options=options)
        builder.populate(text=text)
        builder.subset(font)
        # Respect reserved upstream names; keep copyright and license records.
        family = f"Classwords Preview {index}"
        postscript = f"ClasswordsPreview{index}-Regular"
        names = {1: family, 2: "Regular", 3: postscript,
                 4: family + " Regular", 6: postscript,
                 16: family, 17: "Regular"}
        for record in font["name"].names:
            if record.nameID in names:
                record.string = names[record.nameID].encode(
                    record.getEncoding(), errors="replace"
                )
        font.flavor = "woff2"
        target = ROOT / "public" / f"font-preview-{key}.woff2"
        font.save(target)
        shutil.copy2(source / f"{key}-license.txt",
                     ROOT / "public" / f"font-license-{key}.txt")
        manifest.append({
            "font": key,
            "source_sha256": hashlib.sha256(original.read_bytes()).hexdigest(),
            "preview_bytes": target.stat().st_size,
        })
        print(key, target.stat().st_size, "Chinese coverage complete")
    # Supply the original and substitution instructions with the IPA derivative.
    shutil.copy2(source / "xihei.ttf", ROOT / "public/font-original-xihei.ttf")
    (ROOT / "docs/font-preview-manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n"
    )


if __name__ == "__main__":
    main()
