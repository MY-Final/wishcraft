# -*- coding: utf-8 -*-
"""
Real tokenizer measurement for the inference visualization.

Uses the actual Qwen2.5-0.5B-Instruct tokenizer.json (Hugging Face) through the
`tokenizers` Rust implementation. No hand-splitting, no guessing: every id/offset
below comes from tokenizer.encode().

Run:
  python tokenize_qwen.py
Outputs:
  tokenizer-example.json   (machine readable)
  _tokenizer_summary.txt   (human readable debug dump)
"""

import json
import sys
import unicodedata
from pathlib import Path

try:  # Windows console is GBK by default; force UTF-8 for the debug print
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from tokenizers import Tokenizer

HERE = Path(__file__).resolve().parent
ASSET = HERE / "assets" / "qwen2.5-0.5b-instruct-tokenizer.json"
CFG = HERE / "assets" / "qwen2.5-0.5b-instruct-tokenizer_config.json"

QUESTION = "为什么天空是蓝色的？"
ANSWER = (
    "天空之所以呈现蓝色，主要是因为阳光进入大气层后发生瑞利散射。"
    "太阳光包含各种颜色的光，波长较短的光更容易被空气分子散射；"
    "蓝光波长比红光短，所以天空看起来是蓝色的。"
)

# ---------------------------------------------------------------- byte level
# Inverse of the GPT-2 bytes_to_unicode table, used by Qwen's ByteLevel BPE.
def _bytes_to_unicode():
    bs = (
        list(range(ord("!"), ord("~") + 1))
        + list(range(ord("\u00a1"), ord("\u00ac") + 1))
        + list(range(ord("\u00ae"), ord("\u00ff") + 1))
    )
    cs = bs[:]
    n = 0
    for b in range(2 ** 8):
        if b not in bs:
            bs.append(b)
            cs.append(2 ** 8 + n)
            n += 1
    return {b: chr(c) for b, c in zip(bs, cs)}


UNI2BYTE = {v: k for k, v in _bytes_to_unicode().items()}


def token_bytes(tok_str):
    """Recover the exact byte content behind a ByteLevel token string."""
    out = bytearray()
    for ch in tok_str:
        b = UNI2BYTE.get(ch)
        if b is None:  # special/added token, not byte-level
            out.extend(ch.encode("utf-8"))
        else:
            out.append(b)
    return bytes(out)


def display_of(raw):
    """Human facing label: spaces/newlines become visible glyphs."""
    if raw == "":
        return "∅"
    out = []
    for ch in raw:
        if ch == " ":
            out.append("\u2423")          # ␣ open box = space
        elif ch == "\n":
            out.append("\u23ce")          # ⏎ return
        elif ch == "\t":
            out.append("\u21e5")          # ⇥ tab
        elif ch == "\r":
            out.append("\u240d")          # ␍
        elif unicodedata.category(ch) == "Cc":
            out.append("\\u%04x" % ord(ch))
        else:
            out.append(ch)
    return "".join(out)


def kind_of(raw, decoded_ok, tok_str):
    if not decoded_ok:
        return "partial_byte"
    if raw.strip() == "":
        return "whitespace" if raw else "empty"
    if len(raw) == 1 and "\u4e00" <= raw <= "\u9fff":
        return "cjk_char"
    if all("\u4e00" <= c <= "\u9fff" for c in raw):
        return "cjk_multi"
    if all(unicodedata.category(c).startswith("P") for c in raw):
        return "punctuation"
    if raw.replace(" ", "").isalpha() and raw.replace(" ", "").isascii():
        return "word" if " " not in raw else "word_with_space"
    return "subword"


def measure(tok, text, label):
    enc = tok.encode(text, add_special_tokens=False)
    rows = []
    for i, (tid, tstr, (cs, ce)) in enumerate(zip(enc.ids, enc.tokens, enc.offsets)):
        tb = token_bytes(tstr)
        try:
            raw = tb.decode("utf-8")
            ok = True
        except UnicodeDecodeError:
            raw = tb.decode("utf-8", errors="replace")
            ok = False
        rows.append(
            {
                "index": i,
                "id": tid,
                "raw": raw,
                "display": display_of(raw),
                "byte_level": tstr,
                "offset_start": cs,
                "offset_end": ce,
                "byte_len": len(tb),
                "byte_offset_start": len(text[:cs].encode("utf-8")),
                "byte_offset_end": len(text[:ce].encode("utf-8")),
                "kind": kind_of(raw, ok, tstr),
                "valid_utf8": ok,
            }
        )
    decoded = tok.decode(enc.ids, skip_special_tokens=False)
    return {
        "label": label,
        "text": text,
        "n_tokens": len(rows),
        "tokens": rows,
        "ids": list(enc.ids),
        "decoded": decoded,
        "concatenated_ok": decoded == text,
    }


def strip_helper(blk):
    """Question blocks follow the requested JSON schema (text/tokens/concatenated_ok)."""
    return {
        "text": blk["text"],
        "n_tokens": blk["n_tokens"],
        "tokens": blk["tokens"],
        "concatenated_ok": blk["concatenated_ok"],
        "ids": blk["ids"],
    }


def build_chunks(blk, soft_max=8):
    """Group tokens into clause-level visual rows, split long clauses at ~half."""
    groups, cur = [], []
    for r in blk["tokens"]:
        cur.append(r)
        if r["kind"] == "punctuation":
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)

    out, idx = [], 0
    for g in groups:
        parts = [g]
        if len(g) > soft_max:
            mid = (len(g) + 1) // 2
            parts = [g[:mid], g[mid:]]
        for p in parts:
            out.append(
                {
                    "chunk_index": len(out),
                    "token_start": p[0]["index"],
                    "token_end": p[-1]["index"],
                    "n_tokens": len(p),
                    "ids": [t["id"] for t in p],
                    "text": "".join(t["raw"] for t in p),
                    "displays": [t["display"] for t in p],
                    "ends_with_punctuation": p[-1]["kind"] == "punctuation",
                }
            )
            idx += 1
    return out


def tiktoken_check():
    """Independent second family (OpenAI o200k_base), only for the caveat section."""
    try:
        import tiktoken
    except Exception as exc:  # pragma: no cover
        return {"available": False, "error": str(exc)}
    enc = tiktoken.get_encoding("o200k_base")
    res = {"available": True, "encoding": "o200k_base", "tiktoken_version": tiktoken.__version__}
    for name, text in (("question", QUESTION), ("answer", ANSWER)):
        ids = enc.encode(text)
        toks = [enc.decode_single_token_bytes(i) for i in ids]
        res[name] = {
            "n_tokens": len(ids),
            "ids": ids,
            "raw": [t.decode("utf-8", "replace") for t in toks],
            "decode_ok": enc.decode(ids) == text,
        }
    return res


def main():
    tok = Tokenizer.from_file(str(ASSET))
    cfg = json.loads(CFG.read_text(encoding="utf-8"))
    vocab = tok.get_vocab()

    q = measure(tok, QUESTION, "question")
    qn = measure(tok, QUESTION + "\n", "question + trailing newline")
    a = measure(tok, ANSWER, "answer")

    # --- special token behaviour -------------------------------------------
    enc_plain = tok.encode(QUESTION, add_special_tokens=False)
    enc_special = tok.encode(QUESTION, add_special_tokens=True)
    post = json.loads(ASSET.read_text(encoding="utf-8")).get("post_processor")

    # --- explicit space / newline probes (the answer itself has no ASCII space)
    probes = {}
    for name, s in {
        "space_between_cjk": "天空 蓝色",
        "leading_space": " 天空",
        "newline_only": "\n",
        "space_only": " ",
    }.items():
        e = tok.encode(s, add_special_tokens=False)
        probes[name] = {
            "text": s,
            "ids": list(e.ids),
            "byte_level": e.tokens,
            "rows": [
                {
                    "id": i,
                    "raw": token_bytes(t).decode("utf-8", "replace"),
                    "display": display_of(token_bytes(t).decode("utf-8", "replace")),
                    "byte_level": t,
                    "byte_len": len(token_bytes(t)),
                }
                for i, t in zip(e.ids, e.tokens)
            ],
            "decode_ok": tok.decode(e.ids) == s,
        }

    # --- chat template (text read from the real tokenizer_config.json) ------
    tmpl = cfg.get("chat_template", "")
    rendered = (
        "<|im_start|>system\n"
        + "You are Qwen, created by Alibaba Cloud. You are a helpful assistant."
        + "<|im_end|>\n<|im_start|>user\n"
        + QUESTION
        + "<|im_end|>\n<|im_start|>assistant\n"
    )
    e = tok.encode(rendered, add_special_tokens=False)
    chat = {
        "template_present": bool(tmpl),
        "template_snippet": tmpl[:400],
        "rendered_prompt": rendered,
        "n_tokens": len(e.ids),
        "ids": list(e.ids),
        "byte_level": e.tokens,
        "tokens": [
            {"id": i, "raw": token_bytes(t).decode("utf-8", "replace"),
             "display": display_of(token_bytes(t).decode("utf-8", "replace"))}
            for i, t in zip(e.ids, e.tokens)
        ],
        "question_token_position": None,
    }
    qids = list(q["ids"])
    for start in range(len(e.ids)):
        if e.ids[start:start + len(qids)] == qids:
            chat["question_token_position"] = [start, start + len(qids) - 1]
            break

    special_info = {
        "post_processor": post,
        "add_special_tokens_false_ids": list(enc_plain.ids),
        "add_special_tokens_true_ids": list(enc_special.ids),
        "special_tokens_added": list(enc_special.ids) != list(enc_plain.ids),
        "bos_token": cfg.get("bos_token"),
        "eos_token": cfg.get("eos_token"),
        "pad_token": cfg.get("pad_token"),
        "add_bos_token": cfg.get("add_bos_token"),
        "add_eos_token": cfg.get("add_eos_token"),
        "eos_id": vocab.get(cfg.get("eos_token", "")),
        "bos_id": vocab.get(cfg.get("bos_token", "")),
        "im_start_id": vocab.get("<|im_start|>"),
        "im_end_id": vocab.get("<|im_end|>"),
        "vocab_size": tok.get_vocab_size(),
        "model_type": json.loads(ASSET.read_text(encoding="utf-8"))["model"]["type"],
        "pre_tokenizer": json.loads(ASSET.read_text(encoding="utf-8"))["pre_tokenizer"],
    }

    out = {
        "tokenizer": {
            "name": "Qwen2.5 (Qwen2.5-0.5B-Instruct) ByteLevel BPE",
            "repo": "Qwen/Qwen2.5-0.5B-Instruct",
            "file": "tokenizer.json",
            "revision_or_hash": {
                "hf_repo_commit": "7ae557604adf67be50417f59c2c2f167def9a775",
                "git_blob_sha1_etag": "443909a61d429dff23010e5bddd28ff530edda00",
                "local_sha256": "C0382117EA329CDF097041132F6D735924B697924D6F6FC3945713E96CE87539",
                "file_bytes": 7031645,
                "identical_in": "Qwen/Qwen2.5-7B-Instruct/tokenizer.json (same sha256)",
            },
            "source_url": "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/resolve/main/tokenizer.json",
            "library": "tokenizers==0.23.3 (Python 3.12.14)",
            "vocab_size": tok.get_vocab_size(),
        },
        "question": strip_helper(q),
        "question_with_newline": strip_helper(qn),
        "answer": strip_helper(a),
        "answer_chunks": build_chunks(a),
        "special_tokens": special_info,
        "space_and_newline_probes": probes,
        "chat_template_prompt": chat,
        "cross_check_o200k_base": tiktoken_check(),
        "notes": [
            "All ids come from tokenizer.encode(text, add_special_tokens=False) on the real Qwen2.5 tokenizer.json; nothing was hand-split.",
            "tokenizer.decode(ids) reproduces each source string exactly (concatenated_ok = true).",
            "The question text has no ASCII space (0x20) and no newline; the answer text also contains no ASCII space.",
            "Adding a trailing '\\n' does not add a token: '？' (11319) merges with the newline into '？\\n' (94432), so the count stays 6 but the last id changes.",
            "The fullwidth question mark U+FF1F is its own single token (11319), 3 UTF-8 bytes.",
            "Qwen2.5 merges frequent Chinese words into one token (为什么, 天空, 蓝色, 主要是, 更容易), so tokens are not 1:1 with characters.",
            "No BOS is prepended: post_processor is ByteLevel only and add_special_tokens=True returns the same ids as False.",
            "EOS is <|im_end|> (151645); it is only present when the chat template is rendered, never in raw text tokenization.",
            "Offsets are character (Unicode code point) indices into the original Python string, not byte offsets.",
        ],
    }

    (HERE / "tokenizer-example.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # --- debug dump ---------------------------------------------------------
    lines = []
    for blk in (q, qn, a):
        lines.append(f"=== {blk['label']} | {blk['n_tokens']} tokens | ok={blk['concatenated_ok']}")
        for r in blk["tokens"]:
            lines.append(
                f"{r['index']:>3} {r['id']:>6} {r['raw']!r:<14} {r['display']:<10} "
                f"[{r['offset_start']},{r['offset_end']}) {r['byte_len']}B {r['kind']} bl={r['byte_level']!r}"
            )
        lines.append("")
    lines.append("special: " + json.dumps(special_info, ensure_ascii=False))
    lines.append("probes: " + json.dumps(probes, ensure_ascii=False))
    lines.append("chat: " + json.dumps(
        {k: v for k, v in chat.items() if k not in ("tokens", "rendered_prompt")},
        ensure_ascii=False))
    lines.append("chunks: " + json.dumps(
        [{k: v for k, v in c.items() if k != "ids"} for c in out["answer_chunks"]],
        ensure_ascii=False))
    lines.append("o200k: " + json.dumps(
        {k: (v if k in ("available", "encoding", "tiktoken_version") else
             {"n_tokens": v["n_tokens"], "ids": v["ids"], "raw": v["raw"], "ok": v["decode_ok"]})
         for k, v in out["cross_check_o200k_base"].items()}, ensure_ascii=False))
    (HERE / "_tokenizer_summary.txt").write_text("\n".join(lines), encoding="utf-8")

    print("\n".join(lines[:6]))
    print("question ok:", q["concatenated_ok"], "| with \\n ok:", qn["concatenated_ok"],
          "| answer ok:", a["concatenated_ok"])
    print("special added:", special_info["special_tokens_added"])


if __name__ == "__main__":
    main()
