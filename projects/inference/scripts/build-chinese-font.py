"""
Build the self-hosted Chinese font subset used by the page.

The source is Noto Sans SC (SIL Open Font License) from the notofonts/noto-cjk
repository. Only glyphs that actually occur in this project are kept, which
keeps the WOFF2 payload small while making Chinese typography consistent across
operating systems.

Usage:
    python scripts/build-chinese-font.py

The source TTF is downloaded into .cache/ (gitignored). The generated WOFF2 is
committed at src/assets/fonts/noto-sans-sc-subset.woff2. The license is stored
next to it as OFL.txt.
"""
from pathlib import Path
from urllib.request import urlretrieve
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
SOURCE_URL = (
    "https://raw.githubusercontent.com/notofonts/noto-cjk/main/"
    "Sans/Variable/TTF/Subset/NotoSansSC-VF.ttf"
)
CACHE = ROOT / ".cache" / "NotoSansSC-VF.ttf"
OUT = ROOT / "src" / "assets" / "fonts" / "noto-sans-sc-subset.woff2"
GLYPHS = ROOT / ".cache" / "glyphs.txt"

EXTRA = [
    0x3000, 0x3001, 0x3002, 0xFF0C, 0xFF1A, 0xFF1B, 0xFF1F, 0xFF01,
    0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026, 0x00B7, 0x2713,
    0x00D7, 0x2248, 0x2192, 0x2193, 0x2191, 0x2212, 0x221A, 0x03A3,
    0x03B8, 0x2260, 0x2264, 0x2265, 0x2208, 0x211D, 0x2211, 0x02E3,
    0x2016, 0x00B2, 0x00B3, 0x2190,
]


def main() -> None:
    try:
        from fontTools import subset  # noqa: F401
    except ImportError:
        sys.exit("fonttools is required: python -m pip install --user fonttools brotli")

    chars = set()
    for pattern, suffix in (("src/**/*", {".ts", ".tsx", ".css"}), ("index.html", None)):
        for path in ROOT.glob(pattern):
            if not path.is_file():
                continue
            if suffix is not None and path.suffix.lower() not in suffix:
                continue
            try:
                chars.update(path.read_text(encoding="utf-8"))
            except UnicodeDecodeError:
                continue

    chars.update(chr(code) for code in range(0x20, 0x7F))
    chars.update(chr(code) for code in EXTRA)
    chars.difference_update({"\x00", "\r", "\n", "\t"})
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    GLYPHS.write_text("".join(sorted(chars)), encoding="utf-8")

    if not CACHE.exists():
        print(f"downloading {SOURCE_URL}")
        urlretrieve(SOURCE_URL, CACHE)

    subprocess.run(
        [
            sys.executable,
            "-m",
            "fontTools.subset",
            str(CACHE),
            f"--text-file={GLYPHS}",
            "--flavor=woff2",
            "--layout-features=*",
            "--no-hinting",
            "--desubroutinize",
            f"--output-file={OUT}",
        ],
        check=True,
    )
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size:,} bytes, {len(chars):,} glyphs)")


if __name__ == "__main__":
    main()
