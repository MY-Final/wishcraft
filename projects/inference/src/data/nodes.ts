export interface NodeInfo {
  id: string;
  stage: number;
  name: string;
  en: string;
  role: string;
  body: string[];
  stat?: string;
  tag?: string;
  formula?: string;
}

/**
 * Clickable 3D nodes share these ids. Scenes set `object.userData.infoId`.
 * Keep this list as the single source of truth for the node drawer.
 */
export const NODE_INFO: Record<string, NodeInfo> = {
  'client-screen': {
    id: 'client-screen',
    stage: 0,
    name: '客户端',
    en: 'CLIENT / BROWSER',
    role: '把人能读的文字变成一次可传输的请求',
    body: [
      '聊天界面只是产品的外壳。它负责拼装对话历史、角色与参数，再把它们序列化为 HTTP 请求。',
      '网络层随后处理 DNS、连接复用和 TLS。请求离开设备后，界面不再参与模型内部计算，只等待流式片段回来。',
    ],
    tag: 'USERLAND',
  },
  'request-capsule': {
    id: 'request-capsule',
    stage: 0,
    name: '请求胶囊',
    en: 'HTTP REQUEST',
    role: '一段带有身份与意图的结构化数据',
    body: [
      '胶囊里不是一个“意思”，而是一份 JSON：model、messages、stream、temperature 等字段，加上 Authorization 请求头。',
      '网络只负责把字节送到对端。服务端会根据字段决定认证、路由、排队与解码策略。',
    ],
    stat: 'POST /v1/chat/completions',
    tag: 'STRUCTURED DATA',
  },
  'dns-hop': {
    id: 'dns-hop',
    stage: 1,
    name: '域名解析',
    en: 'DNS / CONNECTION',
    role: '把人类可读的域名指向一个可连接的地址',
    body: [
      '浏览器可能需要解析域名、建立 TCP 连接并完成 TLS 握手。如果连接已经存在，这些步骤可能被复用，开销大幅降低。',
      'DNS 与连接建立通常只占总延迟的一小部分，但在冷启动或跨地域访问时会变得明显。',
    ],
    tag: 'OPTIONAL · CACHED',
  },
  'https-tunnel': {
    id: 'https-tunnel',
    stage: 1,
    name: '加密链路',
    en: 'HTTPS / TLS',
    role: '保护请求在公共网络中的机密性与完整性',
    body: [
      'TLS 在客户端与服务端之间建立加密通道，使中间节点无法直接读取请求内容。',
      'HTTPS 保护“传输中”的数据；它不等于端到端加密，也不保护模型内部计算或服务端落盘策略。',
    ],
    tag: 'TLS 1.3',
  },
  'api-gateway': {
    id: 'api-gateway',
    stage: 1,
    name: 'API 网关',
    en: 'API GATEWAY',
    role: '请求进入服务端后的第一道正式入口',
    body: [
      '网关通常负责认证、配额、限流、请求校验、路由与审计。它把面向公众的 API 与内部推理服务解耦。',
      '并非所有厂商都有独立的网关：私有部署、边缘平台或推理引擎本身都可能承担部分职责。',
    ],
    tag: 'IMPLEMENTATION VARIES',
  },
  'auth-check': {
    id: 'auth-check',
    stage: 1,
    name: '身份认证',
    en: 'AUTHENTICATION',
    role: '确认“谁在请求”和“它能使用什么”',
    body: [
      'API Key、OAuth Token 或签名会被验证，并映射到账号、项目、权限与计费主体。',
      '凭证不应该出现在前端代码里；真实产品通常通过自己的后端代理请求，避免把密钥暴露给浏览器。',
    ],
    tag: 'API KEY / OAUTH',
  },
  'rate-limit': {
    id: 'rate-limit',
    stage: 1,
    name: '限流与配额',
    en: 'RATE LIMIT / QUOTA',
    role: '保护服务容量，也保护你的账单',
    body: [
      '限流可能按请求数、输入 Token 数、输出 Token 数或并发数计算。超过限制通常会得到 429 或明确的错误码。',
      '配额与限流并不相同：前者是长期额度，后者是短时间窗口内的速率。',
    ],
    tag: '429 / QUOTA',
  },
  'model-router': {
    id: 'model-router',
    stage: 1,
    name: '模型路由',
    en: 'MODEL ROUTER',
    role: '把请求送到被请求的模型版本与推理池',
    body: [
      'model 字段可能被映射到具体的模型版本、地域与推理集群。路由器会考虑可用性、容量与租户策略。',
      '在更复杂的产品里，还可能存在自动路由、成本路由或多模型编排，但这不属于基础推理链路。',
    ],
    tag: 'MODEL → POOL',
  },
  'queue-scheduler': {
    id: 'queue-scheduler',
    stage: 1,
    name: '排队与调度',
    en: 'SCHEDULER',
    role: '决定何时把请求交给 GPU',
    body: [
      '推理引擎会把请求放入队列，并根据显存、批次与优先级调度执行。高并发时，排队可能成为 TTFT 的主要组成部分。',
      '连续批处理（continuous batching）让新请求可以在其他请求解码期间加入批次，而不是等整批结束。',
    ],
    tag: 'QUEUE · BATCH',
  },
  'gpu-cluster': {
    id: 'gpu-cluster',
    stage: 1,
    name: 'GPU 推理集群',
    en: 'INFERENCE CLUSTER',
    role: '真正执行 Transformer 计算的硬件',
    body: [
      'GPU 擅长大规模并行矩阵运算。Prefill 的并行度更高，Decode 则更容易受到显存带宽限制。',
      '集群中的每张卡、每条高速互联与每个显存层级都会影响吞吐和延迟；这里只保留概念结构。',
    ],
    stat: 'SIMULATED',
    tag: 'COMPUTE',
  },
  tokenizer: {
    id: 'tokenizer',
    stage: 2,
    name: 'BPE 分词器',
    en: 'TOKENIZER',
    role: '把文本映射为词表中的整数 ID',
    body: [
      '分词器使用训练时确定的合并规则把文本切成子词。中文并不总是逐字切分；高频组合可以成为单个 Token。',
      '这里的结果来自真实 Qwen2.5 tokenizer：「为什么天空是蓝色的？」是 6 个 Token，而不是 10 个。',
    ],
    stat: 'Qwen2.5 · 6 TOKENS',
    tag: 'REAL DATA',
  },
  'token-rail': {
    id: 'token-rail',
    stage: 2,
    name: 'Token 序列',
    en: 'TOKEN ID SEQUENCE',
    role: '模型真正看到的输入',
    body: [
      '每个 Token 同时携带文本、词表 ID 与序列位置。模型前向计算使用的是 ID 对应的嵌入向量，而不是原始字符串。',
      '序列顺序很重要。位置信息会通过位置编码或 RoPE 等方式进入后续计算。',
    ],
    tag: 'INPUT IDS',
  },
  'embedding-matrix': {
    id: 'embedding-matrix',
    stage: 3,
    name: '嵌入矩阵',
    en: 'EMBEDDING MATRIX',
    role: '把离散 ID 变成连续向量',
    body: [
      '嵌入矩阵的形状是词表大小 × 隐藏维度。Token ID 是行号，查出的那一行就是该 Token 的初始向量。',
      '这些权重通过训练得到。相似用法并不保证向量在欧氏空间中一定很近，但模型会学到有用的几何结构。',
    ],
    formula: 'x_t = E[token_id_t]',
    tag: 'V × d_model',
  },
  'vector-space': {
    id: 'vector-space',
    stage: 3,
    name: '高维向量空间',
    en: 'LATENT SPACE',
    role: '把离散符号变成可以参与计算的连续表示',
    body: [
      '真实隐藏维度可能是 2048、4096 或更高。画面中的三维位置是概念投影，不是可直接读取的模型权重。',
      '随着数据穿过 Transformer 层，这些表示会不断被上下文重新塑造；Embedding 只是起点。',
    ],
    tag: 'CONCEPTUAL 3D PROJECTION',
  },
  'transformer-tower': {
    id: 'transformer-tower',
    stage: 4,
    name: 'Transformer 层堆叠',
    en: 'TRANSFORMER STACK',
    role: '让表示在深度中逐层被重塑',
    body: [
      '每一层通常包含 Attention 与 MLP 两个子层，配合残差连接和归一化。不同模型的层数、宽度与排列细节不同。',
      '输入表示沿着层向上传播，每层都在前一层的基础上加入新的上下文信息。',
    ],
    tag: 'LAYERED COMPUTE',
  },
  attention: {
    id: 'attention',
    stage: 4,
    name: '自注意力',
    en: 'SELF-ATTENTION',
    role: '让每个 Token 从上下文中读取相关信息',
    body: [
      '每个位置生成 Query、Key、Value。Query 与可见 Key 的相似度决定权重，再用权重加权 Value。',
      '因果掩码保证模型只能看当前与过去的 Token。注意力权重不是解释模型决策的完整依据，但它展示了信息混合的结构。',
    ],
    formula: 'softmax(QKᵀ / √d_k + M) V',
    tag: 'CONTEXT MIXING',
  },
  qkv: {
    id: 'qkv',
    stage: 4,
    name: 'Q / K / V',
    en: 'QUERY · KEY · VALUE',
    role: '注意力的三种线性投影',
    body: [
      'Query 表达“我在找什么”，Key 表达“我能提供什么”，Value 是被取回的信息。它们都由输入表示经可学习矩阵投影得到。',
      '多头注意力会并行学习多组 Q/K/V，让不同子空间捕捉不同关系，再拼接回模型维度。',
    ],
    formula: 'Q = XW_Q, K = XW_K, V = XW_V',
    tag: 'PROJECTIONS',
  },
  'attention-weights': {
    id: 'attention-weights',
    stage: 4,
    name: '注意力矩阵',
    en: 'ATTENTION MATRIX',
    role: '每个 Token 对其他 Token 的读取权重',
    body: [
      '矩阵的一行代表一个 Query 位置，对所有可见 Key 的权重分布。因果模型下，未来位置被掩码为不可见。',
      '画面中的亮块是模拟权重，用于展示“上下文互相影响”的结构，不是某个真实模型某一层的实际激活值。',
    ],
    stat: 'SIMULATED WEIGHTS',
    tag: 'CONTEXT GRAPH',
  },
  mlp: {
    id: 'mlp',
    stage: 4,
    name: '前馈网络',
    en: 'MLP / FFN',
    role: '对每个位置独立地变换表示',
    body: [
      'MLP 通常先扩展到更宽的隐藏维度，再投影回模型维度，中间经过非线性激活。它不混合不同位置，信息交互由 Attention 完成。',
      '在 MoE 架构中，这一部分可能由多个专家网络替代，并由 Router 为每个 Token 选择少数专家。',
    ],
    formula: 'W₂ · σ(W₁x)',
    tag: 'PER-TOKEN TRANSFORM',
  },
  'residual-norm': {
    id: 'residual-norm',
    stage: 4,
    name: '残差与归一化',
    en: 'RESIDUAL + NORM',
    role: '让深层网络保持可优化、数值稳定',
    body: [
      '残差连接把子层输入直接加回输出，让梯度更容易穿过深层网络。归一化控制激活尺度，常见做法包括 LayerNorm 与 RMSNorm。',
      '不同模型可能采用 Pre-Norm 或 Post-Norm 等不同排列，这些细节会影响训练稳定性。',
    ],
    formula: 'y = x + Sublayer(Norm(x))',
    tag: 'STABILITY',
  },
  'layer-stack': {
    id: 'layer-stack',
    stage: 4,
    name: '多层堆叠',
    en: 'N × BLOCKS',
    role: '重复的 Block 逐渐抽象出更丰富的表示',
    body: [
      '每一层的输出成为下一层的输入。浅层与深层并没有严格的“词法/语义”分工，但它们确实在不同深度形成不同的表示。',
      '可视化只展示少量层。真实模型可能有数十层，层内还有多个注意力头与更宽的 MLP。',
    ],
    tag: 'DEPTH',
  },
  'moe-router': {
    id: 'moe-router',
    stage: 4,
    name: 'MoE Router',
    en: 'SPARSE ROUTER',
    role: '为每个 Token 选择少数专家',
    body: [
      'Router 计算每个 Token 对各专家的分数，选择 top-k 个专家并加权合并输出。这样总参数量可以变大，而每个 Token 的计算量保持受控。',
      'MoE 不是所有模型都采用的架构。路由策略、专家数量与负载均衡细节因模型而异。',
    ],
    formula: 'y = Σ_{i∈TopK} g_i · Expert_i(x)',
    tag: 'OPTIONAL ARCHITECTURE',
  },
  'moe-expert': {
    id: 'moe-expert',
    stage: 4,
    name: '专家模块',
    en: 'EXPERT',
    role: '一组只在被选中时参与计算的参数',
    body: [
      '专家通常也是前馈网络。未被选中的专家不会参与当前 Token 的计算，这让模型可以拥有很大的总参数规模。',
      'MoE 的收益取决于路由质量、专家利用率与通信开销；它并不是“更多参数必然更好”的简单保证。',
    ],
    tag: 'SPARSE COMPUTE',
  },
  'kv-cache': {
    id: 'kv-cache',
    stage: 5,
    name: 'KV Cache',
    en: 'KEY / VALUE CACHE',
    role: '避免在每一步重新计算历史上下文',
    body: [
      'Prefill 阶段会为输入序列的每一层写入 Key 与 Value。Decode 每一步只需计算新 Token 的 Q/K/V，并读取已有缓存。',
      '缓存大小随层数、上下文长度、头数与精度线性增长。长上下文和高并发都会给显存带来压力。',
    ],
    stat: 'SIMULATED MEMORY',
    tag: 'MEMORY TRADEOFF',
  },
  'prefill-wave': {
    id: 'prefill-wave',
    stage: 5,
    name: 'Prefill 波前',
    en: 'PARALLEL PREFILL',
    role: '一次处理完整输入序列',
    body: [
      '输入序列的所有位置一起进入网络。因果注意力仍限制每个位置只能看见左侧上下文，但矩阵运算可以高度并行。',
      'Prefill 完成并产生第一个输出 Token 后，进入逐 Token 的 Decode 阶段。',
    ],
    tag: 'COMPUTE-BOUND',
  },
  logits: {
    id: 'logits',
    stage: 6,
    name: 'Logits',
    en: 'VOCABULARY SCORES',
    role: '词表中每个候选 Token 的未归一化分数',
    body: [
      '模型最后投影到词表维度，得到每个 Token 的分数。分数本身不是概率，需要经过 softmax 才变成分布。',
      '词表可能有十几万项；画面只展示少数候选，用于教学。',
    ],
    formula: 'z = W_out h_t',
    tag: 'RAW SCORES',
  },
  sampler: {
    id: 'sampler',
    stage: 6,
    name: '采样器',
    en: 'SAMPLER',
    role: '从概率分布中选择下一个 Token',
    body: [
      'Greedy 直接取最高分；temperature、top-p、top-k 等方法改变或截断分布后再采样。',
      '本页的温度实验使用模拟 logits。为了保持演示回答固定，主生成序列不随温度改变；采样器面板会展示温度对选择的影响。',
    ],
    formula: 'p_i = exp(z_i / T) / Σ_j exp(z_j / T)',
    tag: 'SIMULATED SAMPLING',
  },
  'decode-loop': {
    id: 'decode-loop',
    stage: 6,
    name: '自回归循环',
    en: 'AUTOREGRESSIVE LOOP',
    role: '把新 Token 接回输入，重复预测',
    body: [
      '每次只生成一个 Token。新 Token 被追加到序列，模型再根据新的上下文预测下一个，直到满足停止条件。',
      '这就是“边生成边返回”的基础：每产生一个 Token，就可以把它交给下游做 detokenize 与流式传输。',
    ],
    tag: 'ONE TOKEN AT A TIME',
  },
  detokenizer: {
    id: 'detokenizer',
    stage: 7,
    name: 'Detokenizer',
    en: 'DETOKENIZER',
    role: '把 Token ID 还原为可显示文本',
    body: [
      'Detokenizer 按词表把 ID 变回字节序列，再组装成 UTF-8 文本。跨 Token 的字节边界可能需要缓冲。',
      '一个 Token 可能对应多个字符，也可能只对应半个汉字的部分字节；因此文本展示与 Token 边界不必一一对应。',
    ],
    tag: 'IDS → TEXT',
  },
  'sse-stream': {
    id: 'sse-stream',
    stage: 7,
    name: 'SSE 流',
    en: 'SERVER-SENT EVENTS',
    role: '在连接保持打开时持续推送事件',
    body: [
      '服务端使用 text/event-stream 返回事件，客户端逐事件解析。OpenAI 兼容接口常在 data 中携带 JSON delta。',
      'SSE 是常见方案，但不是唯一方案；WebSocket 或 HTTP/2 流也能实现类似的流式体验。',
    ],
    stat: 'text/event-stream',
    tag: 'STREAMING TRANSPORT',
  },
  'response-chunks': {
    id: 'response-chunks',
    stage: 7,
    name: '响应 Chunk',
    en: 'NETWORK CHUNK',
    role: '传输层的片段，不等同于模型 Token',
    body: [
      '服务端可以把多个 Token 合成一个 chunk，也可能因为网络分片把一个事件拆开。客户端应按协议边界重组，而不是按网络包计数。',
      '本演示故意让 chunk 边界与 Token 边界错开，以强调两者的区别。',
    ],
    tag: 'CHUNK ≠ TOKEN',
  },
  ttft: {
    id: 'ttft',
    stage: 7,
    name: 'TTFT',
    en: 'TIME TO FIRST TOKEN',
    role: '从发出请求到第一段可显示内容的时间',
    body: [
      'TTFT 通常包含网络往返、网关处理、排队、Prefill 和第一步 Decode。它不等于 Prefill 时间，也不等于模型“思考时间”。',
      '长输入通常推高 Prefill，高并发可能推高排队；不同服务的 TTFT 构成并不相同。',
    ],
    stat: 'SIMULATED · 418 ms',
    tag: 'LATENCY',
  },
  'client-render': {
    id: 'client-render',
    stage: 8,
    name: '客户端渲染',
    en: 'INCREMENTAL RENDER',
    role: '每收到一段内容，就更新一次界面',
    body: [
      '客户端把增量文本插入消息，浏览器重新布局并绘制。视觉上像是一段文字在“长出来”，实际上是许多次网络事件与渲染帧的叠加。',
      '当流结束时，客户端可能收到结束事件，随后关闭连接、更新状态并完成这次请求。',
    ],
    tag: 'UI UPDATE',
  },
};

export function getNodeInfo(id: string): NodeInfo | undefined {
  return NODE_INFO[id];
}
