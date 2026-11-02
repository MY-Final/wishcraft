# 分词器实测说明（Qwen2.5，真实 token ID）

本目录里的每一个 token ID 都由 **真实的 Qwen2.5 分词器文件** 现场计算得出，
没有手工切分、没有估算、没有"示意图"数字。可视化里显示的 chip、ID、偏移量
都可以直接从这里取用。

## 0. 一句话结论

| 内容 | 字符数 | token 数 | 首 token | 末 token | 解码还原 |
|---|---|---|---|---|---|
| 用户问题 `为什么天空是蓝色的？` | 10 | **6** | `为什么` (100678) | `？` (11319) | ✅ 完全一致 |
| 同上 + 结尾换行 | 11 | **6**（`？` 与 `\n` 合并） | `为什么` (100678) | `？\n` (94432) | ✅ 完全一致 |
| 回答全文（80 字） | 80 | **55** | `天空` (101916) | `。` (1773) | ✅ 完全一致 |

> 关键细节：中文里"词"会被合并成一个 token（`为什么`、`天空`、`蓝色`），
> 所以 **10 个字只有 6 个 token**。这正是可视化要讲的故事。

## 1. 使用的分词器（可核验的具体版本）

| 项目 | 值 |
|---|---|
| 模型仓库 | `Qwen/Qwen2.5-0.5B-Instruct`（Hugging Face） |
| 文件 | `tokenizer.json`（7,031,645 字节） |
| 仓库 commit | `7ae557604adf67be50417f59c2c2f167def9a775` |
| 文件 git blob sha | `443909a61d429dff23010e5bddd28ff530edda00` |
| 下载后本地 SHA-256 | `C0382117EA329CDF097041132F6D735924B697924D6F6FC3945713E96CE87539` |
| 词表大小 | 151,665（含 `<|endoftext|>` 151643、`<|im_start|>` 151644、`<|im_end|>` 151645） |
| 模型结构 | BPE + ByteLevel 预分词（GPT-2 式字节级 BPE），无 Normalizer |
| 运行库 | `tokenizers==0.23.3`（Python 3.12.14） |

交叉校验：`Qwen/Qwen2.5-7B-Instruct/tokenizer.json` 与本文件的 SHA-256 **完全相同**
（`C0382117…7539`），说明这是整个 Qwen2.5 家族共用的分词器，不算"小模型特例"。

## 2. 复现命令（English commands, as run）

```powershell
# 1) install into user site-packages only (repo dependencies untouched)
python -m pip install --user "tokenizers>=0.20" tiktoken

# 2) download the real assets (already saved under ./assets)
Invoke-WebRequest `
  -Uri "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/resolve/main/tokenizer.json" `
  -OutFile "assets/qwen2.5-0.5b-instruct-tokenizer.json"

# 3) compute + write tokenizer-example.json
$env:PYTHONIOENCODING="utf-8"; python tokenize_qwen.py

# 4) independent re-check of the saved JSON (decode, vocab lookup, offsets, chunks)
$env:PYTHONIOENCODING="utf-8"; python verify_example_json.py
# -> RESULT: PASS   (FAILS: 0)
```

`tokenize_qwen.py` 只做三件事：`Tokenizer.from_file()` → `encode(add_special_tokens=False)`
→ 记录 `ids / tokens / offsets`，再用 `decode()` 反解验证。`verify_example_json.py`
不重新编码，而是 **只读已保存的 JSON**，把每个 ID 拿去 `tokenizer.json` 自带的
`model.vocab` 里逐条比对，并检查偏移量是否首尾相接、是否覆盖整串。

## 3. 用户问题：`为什么天空是蓝色的？`（6 个 content token）

| # | ID | 显示文本 | 字符偏移 | UTF-8 字节 | 类型 | byte-level 原始形式 |
|---|---|---|---|---|---|---|
| 0 | 100678 | 为什么 | [0,3) | 9 | cjk_multi（3 字合并） | `ä¸ºä»Ģä¹Ī` |
| 1 | 101916 | 天空 | [3,5) | 6 | cjk_multi（2 字合并） | `å¤©ç©º` |
| 2 | 20412 | 是 | [5,6) | 3 | cjk_char（单字） | `æĺ¯` |
| 3 | 105681 | 蓝色 | [6,8) | 6 | cjk_multi（2 字合并） | `èĵĿèī²` |
| 4 | 9370 | 的 | [8,9) | 3 | cjk_char（单字） | `çļĦ` |
| 5 | 11319 | ？ | [9,10) | 3 | punctuation（全角问号） | `ï¼Ł` |

`ids = [100678, 101916, 20412, 105681, 9370, 11319]`

- 全角问号 `？`（U+FF1F）是**独立的一个 token（11319）**，不是 ASCII 的 `?`（`?` 才是 30）。
- 这里没有空格、没有换行，6 个 token 恰好拼回原文（`concatenated_ok: true`）。

### 带显式结尾换行时（UI 若提供"加换行"开关）

| # | ID | 显示文本 | 字符偏移 | 字节 | 说明 |
|---|---|---|---|---|---|
| 0–4 | 同上一模一样 | | | | 前 5 个 token 完全不变 |
| 5 | **94432** | `？` + `⏎` | [9,11) | 4 | `？` 与 `\n` 被合并成 **一个** token |

**结论：加换行不会让 token 数从 6 变 7，只会把最后一个 ID 从 11319 换成 94432。**
如果可视化只讲"数量变化"，这个开关会造成误导；如果讲"边界会变"，它是个很好的演示。

## 4. 回答全文（55 个 content token，按可视块分组）

原文 80 字，55 个 token。下表每行是一个可直接排成一行 chip 的"可视块"
（`answer_chunks`，按标点切句、超长句对半切开）：

| 块 | token 区间 | 数量 | 文本 | IDs |
|---|---|---|---|---|
| 0 | 0–4 | 5 | 天空之所以呈现蓝色， | 101916, 105133, 104401, 105681, 3837 |
| 1 | 5–11 | 7 | 主要是因为阳光进入大气层后 | 104312, 99519, 104166, 101040, 105797, 99371, 33447 |
| 2 | 12–17 | 6 | 发生瑞利散射。 | 99726, 100705, 59532, 99632, 99759, 1773 |
| 3 | 18–25 | 8 | 太阳光包含各种颜色的光， | 101281, 99225, 102298, 100646, 102284, 9370, 99225, 3837 |
| 4 | 26–32 | 7 | 波长较短的光更容易 | 99804, 45861, 99260, 99534, 9370, 99225, 108478 |
| 5 | 33–38 | 6 | 被空气分子散射； | 99250, 100819, 102388, 99632, 99759, 24968 |
| 6 | 39–43 | 5 | 蓝光波长比 | 100400, 99225, 99804, 45861, 56006 |
| 7 | 44–47 | 4 | 红光短， | 99425, 99225, 99534, 3837 |
| 8 | 48–54 | 7 | 所以天空看起来是蓝色的。 | 99999, 101916, 104544, 20412, 105681, 9370, 1773 |

前 30 个 token（索引 0–29）刚好覆盖块 0–3 以及块 4 的前 4 个 token
（`波 长 较 短`）——若只显示开头，建议停在块 3 结尾或块 4 结尾，不要切在句中。

完整 55 条（含 `raw`、`display`、字节级形式、字节偏移、类型）在
`tokenizer-example.json` 的 `answer.tokens` 里，不需要再抄一遍。

## 5. 空格、换行与特殊 token

回答文本本身 **不含任何 ASCII 空格（0x20）、不含换行**，所以可视化里没有
"带空格 token"需要展示。实测探针（写入 JSON 的 `space_and_newline_probes`）：

| 输入 | IDs | 说明 |
|---|---|---|
| `" "` | `[220]` | 单个空格 = 1 个 token，byte-level 形式是 `Ġ` |
| `"\n"` | `[198]` | 单个换行 = 1 个 token，形式是 `Ċ` |
| `"天空 蓝色"` | `[101916, 8908, 241, 251, 38035]` | ⚠️ 空格会粘到 `蓝` 的第一个字节上，把 `蓝` 拆成 3 个"半个汉字"的 token |
| `" 天空"` | `[40666, 102, 34794]` | ⚠️ 同上，前导空格同样会拆字 |

**给可视化的硬性提醒：不要在待分词字符串里为了排版插入空格。** 一旦插入空格，
汉字可能被按字节劈开，单个 token 解码出来是 `�`（非法 UTF-8）。排版间距请用
CSS `gap` 实现，不要改字符串。

### 特殊 token / BOS / EOS

- `post_processor` 是 `{"type": "ByteLevel"}`，**没有** `TemplateProcessing`，
  因此 `add_special_tokens=True` 与 `False` 返回的 ID 完全相同（已验证）。
- Qwen2.5 **不加 BOS**（`bos_token: null`，`add_bos_token: false`）。
- EOS 是 `<|im_end|>`（151645）；PAD 是 `<|endoftext|>`（151643）。纯文本编码时都不会出现。
- 若按官方 chat template 渲染（`<|im_start|>system\n…<|im_end|>\n<|im_start|>user\n…<|im_end|>\n<|im_start|>assistant\n`），
  整段是 35 个 token，问题位于第 **24–29** 位，前后被 24 个模板 token 和 5 个收尾 token 包住
  （见 JSON `chat_template_prompt`）。
- **可视化只显示 content token**：问题 6 个、回答 55 个。`<|im_start|>`/`<|im_end|>`/`\n` 这些模板 token 不要进入画面。

## 6. 校验结果

`verify_example_json.py` 对三个字符串逐项检查，全部通过（`RESULT: PASS`，`FAILS: 0`）：

1. `tokenizer.decode(ids)` 与原文**逐字符相等**（含全角标点）；
2. 每个 ID 都能在 `tokenizer.json` 自己的 `model.vocab` 里按 byte-level 字符串查到同值；
3. 偏移量首尾相接、无空洞，且 `text[start:end] == raw`，最后恰好覆盖整串；
4. `index` 连续；chunk 分组无重叠、无遗漏，完整覆盖 0–54；
5. 无 ID 越界（最大用到 108478 < 151665）。

## 7. 可视化建议（来自实测数据，而非猜测）

- chip 宽度可用 `byte_len` 或字符数映射：单字 token 3 字节、双字词 6 字节、三字词 9 字节，
  宽度天然体现出"一个 token 吃掉一个词"。
- 颜色建议按 `kind` 区分：`cjk_char`（单字）、`cjk_multi`（合并词）、`punctuation`（标点）。
  标点 token 很"便宜"（3 字节）但在语义上很重，适合单独强调。
- 展示 ID 时用真实值（100678…），不要用"第几个 token"充当 ID。
- 若需要"同一句话在不同模型下切得不一样"的对比，可直接用 JSON 里的
  `cross_check_o200k_base`：OpenAI o200k_base 把问题切成 **7** 个 token
  （`蓝`、`色` 分开）、回答切成 **64** 个 token，且会把 `，所以` 合成一个 token
  （id 16491）——这是很好的教学对照，但 **ID 不可与 Qwen 混用**。

## 8. 注意事项与局限

1. **不同模型家族的分词器完全不同，ID 不可移植。** 本文件里的 ID 只对 Qwen2.5 有效；
   Llama、GPT、DeepSeek 各有自己的词表，同一个汉字几乎必然是别的 ID。
2. **Qwen 会把常用中文词合并成一个 token**（`为什么`、`主要是`、`更容易`、`看起来`），
   也会把"较生僻"的词拆成单字（`发生`+`瑞`+`利`+`散`+`射`）。所以 token 数
   ≠ 字数，且不同句子里同一个字的 ID 可能不同（例如 `光` 单独出现是 99225，
   在 `阳光` 里则是 104166 的一部分）。
3. **byte-level 原始形式不能直接给用户看。** `ä¸ºä»Ģä¹Ī` 是 `为什么` 的 UTF-8 字节
   经 GPT-2 字节映射后的样子；UI 上应显示 `raw`/`display`，`byte_level` 只用于调试。
4. **偏移量是字符（code point）下标，不是字节下标。** 库返回 `offsets` 为字符索引；
   本文件另外算了 `byte_offset_start/end` 供高亮使用。两者对中文差别很大（1 字 = 3 字节）。
5. **`tokenizers` 与 `transformers` 的 Qwen2Tokenizer(Fast) 读的是同一份 `tokenizer.json`**，
   因此 ID 一致；未安装 `transformers`（避免拖入 torch），故未做双库对跑，
   但已用文件哈希 + 词表逐条比对做了独立校验。
6. `assets/` 里的 `tokenizer.json` 有 7 MB，仅为离线复现保留；删掉它不影响
   `tokenizer-example.json` 的任何数值，但 `verify_example_json.py` 将无法再运行。
7. 若未来 Qwen 发布新词表（如 Qwen3），**必须重新跑本脚本**，不能沿用这些 ID。

## 9. 参考来源

- Hugging Face 模型页（含 tokenizer 文件与配置）：<https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct>
- 实际下载的 tokenizer 文件：<https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/blob/main/tokenizer.json>
- `tokenizers` 库 Encoding/offsets 文档：<https://huggingface.co/docs/tokenizers/api/encoding>
- Qwen2.5 Technical Report（词表与训练设定）：<https://arxiv.org/abs/2412.15115>
- OpenAI `tiktoken`（o200k_base 对照）：<https://github.com/openai/tiktoken>

## 附：文件清单

| 文件 | 作用 |
|---|---|
| `tokenizer-example.json` | 机器可读结果（问题/带换行问题/回答全部 token + 分组 + 探针 + 对照） |
| `TOKENIZER_NOTES.md` | 本说明 |
| `tokenize_qwen.py` | 生成脚本（真实 encode/decode） |
| `verify_example_json.py` | 独立校验脚本（只读 JSON + 词表比对） |
| `_tokenizer_summary.txt` | 人类可读的逐 token 转储（调试用，可删） |
| `assets/*.json` | 下载的原始分词器资产（含 SHA-256 记录） |
