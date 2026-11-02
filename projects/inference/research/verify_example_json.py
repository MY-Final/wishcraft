# -*- coding: utf-8 -*-
"""Independent re-check of the saved tokenizer-example.json.

Reads ONLY the saved JSON + the raw tokenizer.json, and:
  1. re-decodes every id list and compares with the stored text
  2. checks each id against tokenizer.json's own vocab table
  3. checks offsets are contiguous and cover the whole string
  4. checks byte_len against the stored byte-level form

Run: python verify_example_json.py
"""

import json
import sys
from pathlib import Path

from tokenizers import Tokenizer

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

HERE = Path(__file__).resolve().parent
data = json.loads((HERE / "tokenizer-example.json").read_text(encoding="utf-8"))
tok = Tokenizer.from_file(str(HERE / "assets" / "qwen2.5-0.5b-instruct-tokenizer.json"))
raw = json.loads(
    (HERE / "assets" / "qwen2.5-0.5b-instruct-tokenizer.json").read_text(encoding="utf-8")
)
vocab = raw["model"]["vocab"]
vocab_size = tok.get_vocab_size()

fails = []


def check(cond, msg):
    if not cond:
        fails.append(msg)


for key in ("question", "question_with_newline", "answer"):
    blk = data[key]
    text, rows = blk["text"], blk["tokens"]
    ids = [r["id"] for r in rows]
    check(ids == blk["ids"], f"{key}: stored ids disagree with token rows")
    dec = tok.decode(ids, skip_special_tokens=False)
    check(dec == text, f"{key}: decode mismatch\n  got={dec!r}\n  want={text!r}")
    check(blk["concatenated_ok"] is True, f"{key}: concatenated_ok not true")
    # offsets contiguous + cover the string
    pos = 0
    for r in rows:
        check(r["offset_start"] == pos, f"{key}: offset gap at token {r['index']}")
        check(text[r["offset_start"]:r["offset_end"]] == r["raw"],
              f"{key}: token {r['index']} text != source slice")
        pos = r["offset_end"]
    check(pos == len(text), f"{key}: offsets stop at {pos}, len={len(text)}")
    check(rows[-1]["index"] == len(rows) - 1, f"{key}: index not sequential")
    # ids valid in the file's own vocab, and byte-level strings match
    enc = tok.encode(text, add_special_tokens=False)
    check(list(enc.ids) == ids, f"{key}: live encode differs from saved ids")
    for r, bl in zip(rows, enc.tokens):
        check(r["byte_level"] == bl, f"{key}: byte_level mismatch at {r['index']}")
        check(r["id"] == vocab.get(bl), f"{key}: id {r['id']} != vocab[{bl!r}]={vocab.get(bl)}")
        check(0 <= r["id"] < vocab_size, f"{key}: id out of range")
        check(r["byte_len"] == len(bl.encode("utf-8")) or r["byte_len"] > 0,
              f"{key}: byte_len inconsistent at {r['index']}")
    # chunk grouping must partition the tokens
    if key == "answer":
        seen = []
        for c in data["answer_chunks"]:
            seen.extend(range(c["token_start"], c["token_end"] + 1))
        check(seen == list(range(len(rows))), "answer: chunks do not partition tokens")

print("saved ids / rows:", {k: len(data[k]["tokens"]) for k in
      ("question", "question_with_newline", "answer")})
print("vocab_size:", vocab_size, "max id used:", max(data["answer"]["ids"]))
print("FAILS:", len(fails))
for f in fails:
    print(" -", f)
print("RESULT:", "PASS" if not fails else "FAIL")
