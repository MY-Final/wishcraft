export interface DeepDiveSection {
  heading: string;
  body: string;
  formula?: string;
  code?: string;
  codeLabel?: string;
}

export interface DeepDive {
  stage: number;
  eyebrow: string;
  title: string;
  lede: string;
  sections: DeepDiveSection[];
  caution?: string;
  sources?: Array<{ label: string; url: string }>;
}

const TOKENIZER_SOURCE = {
  label: 'Qwen2.5-7B-Instruct · tokenizer.json',
  url: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct/blob/main/tokenizer.json',
};

export const DEEP_DIVES: Record<number, DeepDive> = {
  0: {
    stage: 0,
    eyebrow: 'CHAPTER 01 · 深入请求',
    title: '消息离开输入框之前',
    lede:
      '聊天界面只是入口。真正的请求是一段带结构、带身份、带传输意图的数据。Web 对话与 API 调用在用户眼里不同，在网络上最终都变成一次 HTTP 请求。',
    sections: [
      {
        heading: '一次 Chat Completions 请求的骨架',
        body:
          'messages 是角色与内容的有序数组；stream: true 表示希望服务端边生成边返回；temperature 只影响后续解码时的采样，不改变请求的传输方式。不同厂商的字段名会略有差异，但核心信息通常相同。',
        codeLabel: 'HTTP · 请求示例',
        code: `POST /v1/chat/completions HTTP/2
host: api.example.com
content-type: application/json
authorization: Bearer ••••••••

{
  "model": "qwen2.5-7b-instruct",
  "messages": [
    { "role": "user", "content": "为什么天空是蓝色的？" }
  ],
  "stream": true,
  "temperature": 0.7
}`,
      },
      {
        heading: 'Web 与 API 的差别在哪里',
        body:
          'Web 对话会帮你保存历史、拼出 system prompt、管理会话并渲染流式文本；API 调用把这些责任交给开发者。两者最终都要做同一件事：把消息数组序列化为请求体，附上凭证，建立连接。',
      },
      {
        heading: '发送之前，浏览器还做了什么',
        body:
          '序列化 JSON、选择 HTTP 版本、解析域名、建立或复用 TLS 连接、准备请求头。若连接已存在，这部分开销可能只有几毫秒；若需要重新握手，就会直接叠加进总延迟。',
      },
    ],
    caution:
      '示例中的域名、模型名和参数只用于说明结构。不同服务商的端点、认证方式与可用参数并不相同。',
  },
  1: {
    stage: 1,
    eyebrow: 'CHAPTER 02 · 深入网络',
    title: '网关不是一条固定流水线',
    lede:
      '真实的推理服务通常由多层基础设施组成。认证、限流、路由和排队可能在同一网关内完成，也可能分散在边缘节点、API 平台和推理引擎里。可视化中的节点是一种常见组合，不是唯一答案。',
    sections: [
      {
        heading: 'HTTPS 保护的是“路上”',
        body:
          'TLS 在客户端与服务端之间建立加密通道，使中间网络设备无法直接读取请求内容。到达服务端后，TLS 终止；请求在内部网络中如何被保护，取决于厂商的部署方式。HTTPS 不保护模型内部的推理过程，也不等于端到端加密。',
      },
      {
        heading: 'API 网关常见职责',
        body:
          '认证（API Key、OAuth、签名）、配额与限流（例如每分钟请求数或每分钟 Token 数）、请求校验、模型路由、负载均衡、审计与计费。某些场景会跳过其中某些环节，例如私有部署可以没有公网网关，但仍需要身份与配额控制。',
      },
      {
        heading: '排队与连续批处理',
        body:
          '推理引擎会把不同请求的 Prefill 与 Decode 任务调度到 GPU 上。现代引擎常使用连续批处理（continuous batching）与分页 KV Cache，让新请求在旧请求生成过程中插入，而不是整批等待。排队时间会直接进入 TTFT。',
      },
    ],
    caution:
      '不要把这张图当作某个厂商的真实架构。它是理解常见职责边界的教学模型；不同产品的实现可能更简单，也可能更复杂。',
    sources: [
      { label: 'vLLM · Continuous batching / PagedAttention', url: 'https://docs.vllm.ai/en/latest/' },
    ],
  },
  2: {
    stage: 2,
    eyebrow: 'CHAPTER 03 · 深入 Tokenizer',
    title: '为什么 10 个字符只有 6 个 Token',
    lede:
      '分词器把文本切成子词单元（Token），再映射成词表索引。它不是按“字”或“词”机械切分，而是由模型训练时学到的合并规则决定。中文、英文、标点、空格都可能改变边界。',
    sections: [
      {
        heading: '真实结果：Qwen2.5 的 6 个 Token',
        body:
          '下表来自 Qwen2.5 tokenizer 的实际编码结果：10 个字符（9 个汉字 + 全角问号）被编码成 6 个 content token。注意「为什么」「天空」「蓝色」这样的多字 Token——它们比逐字切分更高效。',
        codeLabel: 'Qwen2.5 · 实测',
        code: `"为什么天空是蓝色的？"
→ [100678, 101916, 20412, 105681, 9370, 11319]
→ ["为什么", "天空", "是", "蓝色", "的", "？"]
字符数 10 · Token 数 6 · decode 完全还原`,
      },
      {
        heading: 'BPE 在做什么',
        body:
          'Byte Pair Encoding 从字节或字符开始，反复把语料中高频相邻片段合并成新的词表项。高频词更容易成为一个 Token，低频词则退回更小的子词甚至字节。因此同一个词在不同 tokenizer 中可能有不同边界。',
      },
      {
        heading: 'Chat Template 与特殊 Token',
        body:
          '聊天接口还会在内容前后加入角色标记、分隔符等特殊 Token。Qwen2.5 的聊天模板会把用户问题放在完整模板中，此时序列远长于 6 个内容 Token。本可视化只展示内容 Token，避免把模板标记误当成用户文字。',
      },
    ],
    caution:
      '同一句中文在 OpenAI o200k_base 中会变成 7 个 Token（「蓝」「色」被拆开）。Token 数、Token ID 和边界都依赖于具体模型，不能跨模型混用。',
    sources: [TOKENIZER_SOURCE],
  },
  3: {
    stage: 3,
    eyebrow: 'CHAPTER 04 · 深入 Embedding',
    title: '从词表索引到可计算向量',
    lede:
      '嵌入层是一个可学习的矩阵。Token ID 不是数值意义上的“大小”，而是一个行号；查表得到的向量才是模型继续计算的起点。',
    sections: [
      {
        heading: '查表，不是计算',
        body:
          '若词表大小为 V、隐藏维度为 d，嵌入矩阵 E 的形状是 V × d。第 t 个 Token 的向量就是 E[token_id_t]。这一步本身很轻，真正的成本在后续层。',
        formula: 'x_t = E[token_id_t] ∈ ℝ^d',
      },
      {
        heading: '位置信息从哪里来',
        body:
          'Transformer 本身对顺序不敏感，因此必须注入位置信息。原始 Transformer 在输入向量上相加正弦位置编码；现代模型更常用 RoPE 等方式，在 Attention 的 Q/K 上编码相对位置。具体做法因模型而异。',
        formula: 'x_t ← x_t + PE(t)   （做法因模型而异）',
      },
      {
        heading: '三维投影只是隐喻',
        body:
          '真实 Embedding 可能有 2048、4096 或更多维，人类无法直接看见。这里把向量折叠成三维轨迹与点阵，只表达相对关系与结构，不代表真实坐标。没有展示真实权重，也不应从中推断词义。',
      },
    ],
    caution:
      '画面中的向量坐标、颜色与距离是为讲解生成的概念映射；真实 Embedding 数值需要模型权重才能计算。',
  },
  4: {
    stage: 4,
    eyebrow: 'CHAPTER 05 · 深入 Transformer',
    title: '矩阵在深处做什么',
    lede:
      'Transformer Block 不是生物神经网络。它由可微分的矩阵运算、归一化和非线性函数堆叠而成；Attention 负责跨位置混合信息，MLP 负责逐位置变换表示。',
    sections: [
      {
        heading: '因果自注意力',
        body:
          '每个位置的表示被投影成 Query、Key、Value。Query 与所有可见 Key 做点积，除以缩放因子并 softmax 得到注意力权重，再用权重加权求和 Value。因果掩码保证第 t 个位置不能偷看未来的 Token。',
        formula: 'Attention(Q, K, V) = softmax(QKᵀ / √d_k + M) V',
      },
      {
        heading: '多头注意力',
        body:
          '模型把表示拆成多个头，让不同头学习不同的关系模式，再拼接后投影。一个头关注语法搭配、另一个关注指代，只是一种常见直觉，实际分工并不固定。',
        formula: 'MultiHead(X) = Concat(head₁, …, headₕ) W_O',
      },
      {
        heading: 'MLP、残差与归一化',
        body:
          '每个位置独立经过两层线性变换与激活函数，隐藏维度通常比模型维度更宽。残差连接把输入直接加回输出，归一化稳定数值范围，使几十层堆叠仍然可训练、可推理。',
        formula: 'MLP(x) = W₂ · σ(W₁x)    y = x + Sublayer(Norm(x))',
      },
      {
        heading: 'MoE：只激活一部分参数',
        body:
          '在 MoE 层中，Router 为每个 Token 选择少数专家（top-k），只计算被选中的专家并加权合并。总参数量可以很大，但每个 Token 的实际计算量受 top-k 限制。并非所有模型都使用 MoE；标准 Dense 模型每个 Token 都会经过全部 MLP 参数。',
        formula: 'y = Σ_{i∈TopK} g_i · Expert_i(x)',
      },
    ],
    caution:
      '可视化把注意力画成空间中的连接、把 MLP 画成矩阵切片，是为了让抽象运算具有可观察的几何形态。它们不是字面意义上的光学设备或生物神经元。',
    sources: [
      { label: 'Vaswani et al. 2017 · Attention Is All You Need', url: 'https://arxiv.org/abs/1706.03762' },
      { label: 'Su et al. 2021 · RoFormer / RoPE', url: 'https://arxiv.org/abs/2104.09864' },
    ],
  },
  5: {
    stage: 5,
    eyebrow: 'CHAPTER 06 · 深入 Prefill',
    title: 'Prefill 与 Decode 为什么不同',
    lede:
      'Prefill 处理完整输入序列，是高度并行的矩阵乘矩阵；Decode 每次只新增一个 Token，是逐位置的矩阵乘向量。两者算力特征不同，延迟表现也不同。',
    sections: [
      {
        heading: 'Prefill 在算什么',
        body:
          '输入的所有位置一起进入网络。虽然因果掩码限制了可见范围，但每个位置的计算仍能并行展开。每层的 Key 和 Value 会被写入 KV Cache，供之后的 Decode 复用。',
        formula: 'KV_cache[layer] ← (K_{1…n}, V_{1…n})',
      },
      {
        heading: 'Decode 为什么更慢地“看起来”',
        body:
          'Decode 每步只处理一个新 Token，但需要读取整个 KV Cache 与模型权重。它是典型的内存带宽受限工作负载：GPU 的并行度没有被喂满，生成速度常用 Tokens/s 衡量。',
      },
      {
        heading: 'TTFT 不只有 Prefill',
        body:
          'TTFT 通常指从客户端发出请求到收到第一个可显示内容的时间。它包含网络往返、网关处理、排队等待、Prefill，以及产生第一个输出 Token 的那一步。把 TTFT 等同于 Prefill 时间会漏掉前后所有环节。',
        formula: 'TTFT ≈ network + queue + prefill + first_decode',
      },
    ],
    caution:
      '不同引擎可能采用 chunked prefill、投机解码等优化，Prefill 与 Decode 的边界并不总是绝对分离。',
    sources: [
      { label: 'vLLM · PagedAttention / serving internals', url: 'https://docs.vllm.ai/en/latest/' },
    ],
  },
  6: {
    stage: 6,
    eyebrow: 'CHAPTER 07 · 深入 Decode',
    title: '一个 Token 的诞生',
    lede:
      '自回归生成是一条循环：读取当前上下文，计算词表上的分数，选择下一个 Token，把它接回序列，更新缓存，然后继续。',
    sections: [
      {
        heading: 'Logits → 概率',
        body:
          '模型最后一层输出词表大小的 logits 向量。softmax 把它转换为概率分布。temperature 是一个缩放系数：T < 1 让分布更尖锐，T > 1 让分布更平坦。它不是“创造力旋钮”，只是改变了采样分布。',
        formula: 'p_i = exp(z_i / T) / Σ_j exp(z_j / T)',
      },
      {
        heading: '采样与停止',
        body:
          'Greedy 选择概率最高的 Token；temperature、top-p、top-k 等方法会从分布中取样。生成会在遇到 EOS、达到长度上限、命中停止字符串或超时等条件时结束。',
        formula: 'token_{t+1} ~ Categorical(p),   h_{t+1} = Model(x_{≤t+1}; KV_cache)',
      },
      {
        heading: '为什么回答看起来连贯',
        body:
          '每一步的输入都包含此前生成的全部 Token，注意力因此能回看上下文。KV Cache 保存过去的 K/V，避免每一步重算所有历史表示，但模型仍需要为每个新 Token 做一次完整的前向计算。',
      },
      {
        heading: '关于推理计算与隐藏思维链',
        body:
          '一些模型在给出最终回答前会进行额外的推理、工具调用或搜索。这类计算可以影响延迟和输出，但厂商内部真实的隐藏思维链通常不可见，也不应被可视化伪造。本页不展示任何“读心”式的内部独白。',
      },
    ],
    caution:
      '为保持演示叙事完整，主回答使用固定 Token 序列；温度采样器是同一组模拟 logits 的独立实验。它不调用真实模型，也不代表某一家厂商的解码实现。',
    sources: [
      { label: 'Hugging Face · Generation strategies', url: 'https://huggingface.co/docs/transformers/en/generation_strategies' },
    ],
  },
  7: {
    stage: 7,
    eyebrow: 'CHAPTER 08 · 深入流式返回',
    title: 'Token、Chunk 与 SSE',
    lede:
      '模型生成 Token；网络传输字节流；客户端把字节流切成事件。三者是不同的层次，边界不必对齐。',
    sections: [
      {
        heading: 'SSE 长什么样',
        body:
          'Server-Sent Events 以 text/event-stream 返回，每个事件以 data: 开头、空行结束。OpenAI 兼容接口常把 JSON delta 放在 data 中，并以 data: [DONE] 结束。SSE 只是常见选择，WebSocket、HTTP/2 流等也能实现流式返回。',
        codeLabel: 'SSE · 示例（已简化）',
        code: `HTTP/1.1 200 OK
content-type: text/event-stream

data: {"choices":[{"delta":{"content":"天空"}}]}

data: {"choices":[{"delta":{"content":"之所以呈现蓝色，"}}]}

data: [DONE]`,
      },
      {
        heading: 'Chunk 不一定等于 Token',
        body:
          '服务端可能把多个 Token 合成一个 chunk 再发送，也可能因为网络分片把一行 JSON 拆到多个 TCP 包。客户端必须按协议边界重组数据，而不是假设“每收到一个包就有一个 Token”。',
      },
      {
        heading: 'TTFT 与 Tokens/s',
        body:
          'TTFT 衡量第一段可显示内容出现得有多快；Tokens/s 衡量稳定生成阶段的速度。两者受不同瓶颈影响：首字受网络、排队和 Prefill 影响，后续速度受 Decode 与带宽影响。一个模型可能首字很快但输出很慢，也可能相反。',
        formula: 'decode_tokens_per_second ≈ 1 / mean(inter-token latency)',
      },
    ],
    caution:
      '演示中的 chunk 分组是人为压缩的教学示例。真实服务端的缓冲策略、事件格式和分片行为会因实现而异。',
    sources: [
      {
        label: 'MDN · Using server-sent events',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events',
      },
    ],
  },
  8: {
    stage: 8,
    eyebrow: 'CHAPTER 09 · 深入抵达',
    title: '屏幕上的一小段文字，背后的一条长链',
    lede:
      '客户端看到的是流式文本；服务端完成的是多次矩阵运算与缓存读写。把这两端连起来，才能理解一次“简单提问”的真实成本结构。',
    sections: [
      {
        heading: '为什么感觉像在“实时思考”',
        body:
          '因为响应在完成之前就开始传输。第一段内容到达时，后续 Token 仍在生成；客户端每收到一段就渲染一段。视觉上的连续感来自网络流与浏览器渲染的共同作用。',
      },
      {
        heading: '时间花在了哪里',
        body:
          '一次请求的总耗时大致由客户端准备、网络往返、网关与排队、Prefill、Decode 以及最终传输组成。不同负载下瓶颈会转移：长输入更偏向 Prefill，长输出更偏向 Decode，高并发时排队可能占主导。',
        formula: 'T_total ≈ T_client + T_network + T_queue + T_prefill + T_decode',
      },
      {
        heading: '本作品中的数字',
        body:
          '输入 Token 数与分词边界来自真实 Qwen2.5 tokenizer；其余指标、Embedding 形状、采样概率与网络时延均为教学模拟。它们用于展示量级和关系，不代表任何线上服务。',
      },
    ],
    caution:
      '这是一个前端教学演示：没有调用真实模型，没有监控真实服务端，也没有展示任何厂商的隐藏推理过程。',
  },
};

export function getDeepDive(stage: number): DeepDive {
  return DEEP_DIVES[stage] ?? DEEP_DIVES[0];
}
