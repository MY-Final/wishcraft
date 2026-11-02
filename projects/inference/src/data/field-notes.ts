export interface FieldQuestion {
  id: string;
  number: string;
  question: string;
  answer: string;
  keywords: string[];
}

export const FIELD_QUESTIONS: FieldQuestion[] = [
  {
    id: 'q1',
    number: '01',
    question: '用户点击发送之后，请求首先去了哪里？',
    answer:
      '先留在客户端：界面把消息整理成 messages 数组，附带 model、stream、temperature 与身份凭证，序列化为 HTTP 请求。随后请求经 DNS / TLS 连接离开设备，到达服务端入口（常见为 API 网关），而不是直接进入模型。',
    keywords: ['客户端', 'HTTPS', 'API 网关'],
  },
  {
    id: 'q2',
    number: '02',
    question: 'API 网关与推理服务分别负责什么？',
    answer:
      '网关处理“谁可以请求、能不能现在请求、该去哪个模型”：认证、限流、配额、路由、审计。推理服务处理“如何算”：Tokenizer、Embedding、Transformer、Prefill / Decode 与 KV Cache。两者可以由不同团队、不同系统承担，也可能在某些部署中合并。',
    keywords: ['认证', '限流', '调度', '推理'],
  },
  {
    id: 'q3',
    number: '03',
    question: 'Tokenizer 如何把自然语言转换成 Token？',
    answer:
      '它按训练时学到的规则（常见为 BPE）把文本切成子词，再用词表把每个子词映射成整数 ID。中文不保证逐字切分：真实 Qwen2.5 把「为什么天空是蓝色的？」编码成 6 个 Token，其中「为什么」「天空」「蓝色」各是一个 Token。',
    keywords: ['BPE', '词表', 'Token ID'],
  },
  {
    id: 'q4',
    number: '04',
    question: '模型如何把 Token 转变成可计算的向量？',
    answer:
      '每个 Token ID 作为行号，在嵌入矩阵中查出一行 d_model 维向量。位置与顺序信息由位置编码或 RoPE 等方式引入。真实维度可能有数千个；本页的三维形状只是概念投影，不是模型权重。',
    keywords: ['Embedding', '查表', '位置编码'],
  },
  {
    id: 'q5',
    number: '05',
    question: 'Transformer、Attention 和 KV Cache 各自发挥什么作用？',
    answer:
      'Transformer 是层层堆叠的计算结构；Attention 让每个位置从上下文中读取信息，MLP 逐位置变换表示，残差与归一化帮助深层训练。KV Cache 保存过去 Token 每层的 Key/Value，使 Decode 不必重算历史，代价是显存占用随上下文增长。',
    keywords: ['Q/K/V', 'MLP', '缓存'],
  },
  {
    id: 'q6',
    number: '06',
    question: 'Prefill 和 Decode 为什么不同？',
    answer:
      'Prefill 一次处理整个输入序列，矩阵运算并行度高，并把 K/V 写入缓存；Decode 每一步只生成一个 Token，需要读取权重与不断增长的 KV Cache，常受显存带宽限制。前者影响首 Token 之前的时间，后者决定后续生成速度。',
    keywords: ['并行', '带宽', 'KV Cache'],
  },
  {
    id: 'q7',
    number: '07',
    question: '模型如何一步一步决定输出的下一个 Token？',
    answer:
      '模型对当前上下文做前向计算，输出词表大小的 logits；softmax 将它变成概率分布；再按 greedy、temperature、top-p 等策略选出一个 Token。该 Token 被追加到序列，缓存更新，然后重复，直到遇到停止条件。',
    keywords: ['logits', 'softmax', '采样'],
  },
  {
    id: 'q8',
    number: '08',
    question: '为什么 AI 可以边生成边向客户端返回内容？',
    answer:
      '因为生成本身就是逐 Token 的。服务端每产生一段可发送的内容，就可以通过 SSE 或兼容的 HTTP 流把它推给客户端；客户端按事件增量渲染。网络 chunk 与 Token 不是一一对应，chunk 边界取决于服务端缓冲与传输层分片。',
    keywords: ['SSE', 'Chunk', '增量渲染'],
  },
  {
    id: 'q9',
    number: '09',
    question: '为什么首 Token 延迟和后续输出速度可能不同？',
    answer:
      'TTFT 包含网络、网关、排队、Prefill 与第一步 Decode，任何一个环节都可能成为瓶颈；Tokens/s 描述的是进入稳定 Decode 后的平均速度，更多受显存带宽、批次与输出长度影响。因此“首字很快但输出慢”和“首字慢但输出快”都合理。',
    keywords: ['TTFT', 'Tokens/s', '瓶颈'],
  },
  {
    id: 'q10',
    number: '10',
    question: '为什么不同模型架构的推理过程可能存在差异？',
    answer:
      'Tokenizer、层数、注意力实现、位置编码、是否使用 MoE、推理引擎的批处理与缓存策略都可能不同。MoE 只激活部分专家，Dense 模型则每个 Token 都经过全部参数；即使同为 Transformer，服务端调度也会改变延迟与吞吐。',
    keywords: ['Dense', 'MoE', '推理引擎'],
  },
];

export const DATA_NOTES = [
  {
    title: '哪些是真实的',
    body:
      '用户问题与演示回答的 Token 边界、Token ID 与字符偏移来自真实的 Qwen2.5 tokenizer，并由独立脚本验证 decode(ids) 能完整还原原文。',
  },
  {
    title: '哪些是模拟的',
    body:
      '性能指标、网络时延、排队时间、Embedding 三维形状、Attention 权重、采样 logits 与候选概率均为教学模拟，不代表任何线上服务。所有指标面板都标注 SIMULATED。',
  },
  {
    title: '架构不是唯一答案',
    body:
      'API 网关、认证、限流、模型路由与排队都是常见职责，但不同厂商的拆分方式不同。本页展示的是一条便于理解的概念链路，不是某家厂商的真实拓扑。',
  },
  {
    title: '关于隐藏思维链',
    body:
      '本页不展示、也不声称能展示任何厂商内部的隐藏思维链。对于可能存在的额外推理或工具调用阶段，仅以抽象方式说明其存在。',
  },
  {
    title: '静态前端',
    body:
      '作品不调用真实模型 API，不收集输入，也不需要登录。页面运行时没有后端请求；所有动画与数字在本地生成。',
  },
];

export const SOURCES = [
  {
    label: 'Vaswani et al. (2017) — Attention Is All You Need',
    url: 'https://arxiv.org/abs/1706.03762',
  },
  {
    label: 'Qwen2.5-7B-Instruct — tokenizer.json',
    url: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct/blob/main/tokenizer.json',
  },
  {
    label: 'Su et al. (2021) — RoFormer / Rotary Position Embedding',
    url: 'https://arxiv.org/abs/2104.09864',
  },
  {
    label: 'Hugging Face — Text generation strategies',
    url: 'https://huggingface.co/docs/transformers/en/generation_strategies',
  },
  {
    label: 'vLLM — inference engine documentation',
    url: 'https://docs.vllm.ai/en/latest/',
  },
  {
    label: 'MDN — Using server-sent events',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events',
  },
];

export const CREDITS = {
  title: 'THE INFERENCE / 推理现场',
  subtitle: '一次大语言模型请求的完整生命周期，做成一个可以走进去的三维现场。',
  stack: 'Three.js · React · TypeScript · Vite',
  note: '研究与实现：WISHCRAFT 许愿池。所有模拟数据均为教学用途。',
};
