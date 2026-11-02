export interface StageDefinition {
  id: string;
  index: number;
  nav: string;
  en: string;
  title: string;
  subtitle: string;
  summary: string;
  moment: string;
  duration: number;
  hint?: string;
}

/**
 * Chapter durations are narrative time, not wall-clock latency. The metrics
 * panel uses a compressed simulation and says so explicitly.
 */
export const STAGES: readonly StageDefinition[] = [
  {
    id: 'request',
    index: 0,
    nav: '发送',
    en: 'THE REQUEST',
    title: '一行问题，变成一次请求',
    subtitle: '客户端构建请求 · 用户态',
    summary:
      '你按下发送。浏览器先把这句话包装成一份结构化请求：模型名、消息数组、流式标记、采样参数，以及身份凭证。它不是直接“说给模型听”，而是准备一个可以被网络和服务端理解的信封。',
    moment: '你写下的每一个字，都会先变成可传输的字节。',
    duration: 10,
    hint: '切换 Web / API，看看同一个动作的两种入口。',
  },
  {
    id: 'network',
    index: 1,
    nav: '网络',
    en: 'THE NETWORK',
    title: '穿过网关，抵达推理集群',
    subtitle: 'HTTPS · API Gateway · 调度',
    summary:
      '请求沿加密链路离开你的设备。TLS 负责途中保密，API 网关负责确认你是谁、还能不能用、该去哪个模型，调度器再把它排进某块 GPU 的工作队列。不同厂商把这些环节拆在不同层，这里展示的是一种常见组合。',
    moment: '网络不搬运意义，它只搬运比特。',
    duration: 13,
    hint: '网关环节并非所有厂商都完全一致：点击节点查看差异。',
  },
  {
    id: 'tokenizer',
    index: 2,
    nav: '分词',
    en: 'TOKENIZER',
    title: '文字被切成模型能读的 Token',
    subtitle: 'BPE 分词 · Token ID 序列',
    summary:
      '模型不直接读字符串。Qwen2.5 的 BPE 分词器把 10 个字符（9 个汉字 + 问号）切成 6 个 Token：「为什么」「天空」各是一个 Token，「是」「的」各是一个。每个 Token 再映射为词表里的整数 ID，这才是模型真正的输入。',
    moment: '模型不认识汉字；它认识数字。',
    duration: 12,
    hint: '这里的 Token 边界与 ID 来自真实 Qwen2.5 tokenizer，而不是手工拆分。',
  },
  {
    id: 'embedding',
    index: 3,
    nav: '嵌入',
    en: 'EMBEDDING',
    title: '每个 Token 变成一串数字',
    subtitle: '查表 · 高维向量',
    summary:
      'Token ID 是一行索引。模型拿它去嵌入矩阵里查出一行向量：一个数千维的数值表示。这里的三维空间只是把高维向量折叠后的概念映射；真实 Embedding 没有这样直观的方向，却同样在表达“哪些 Token 更接近”。',
    moment: '一个词的意义，被折叠成数千个坐标。',
    duration: 10,
    hint: '点击任意向量，看看它在三维投影中对应的形状。',
  },
  {
    id: 'transformer',
    index: 4,
    nav: '计算',
    en: 'TRANSFORMER',
    title: '走进 Transformer 的核心',
    subtitle: 'Attention · MLP · 多层堆叠',
    summary:
      '表示进入一层又一层的 Transformer Block。Attention 决定每个 Token 该从上下文里读取什么，MLP 再逐位置地变换它。残差连接和归一化让信息能穿过很深的网络。模型不是一片逐个点亮的神经元，而是一组组并行矩阵运算。',
    moment: '注意力不是注视，而是计算谁该影响谁。',
    duration: 19,
    hint: '点击 Attention / MLP / 层堆叠等结构，查看它们各自在算什么。',
  },
  {
    id: 'prefill',
    index: 5,
    nav: '预填',
    en: 'PREFILL',
    title: '先把整段上下文读完',
    subtitle: '并行计算 · KV Cache',
    summary:
      'Prefill 把整段输入序列一起送进网络，计算出所有位置的中间表示，并把每一层的 Key / Value 写进 KV Cache。它通常很“吃算力”，也常常是首 Token 延迟里最大的一块——但 TTFT 还包括网络、排队和第一步解码。',
    moment: '先把整段话读懂，再开口。',
    duration: 12,
    hint: 'KV Cache 已占用的格子会随着输入被写入而增加。',
  },
  {
    id: 'decode',
    index: 6,
    nav: '解码',
    en: 'DECODE',
    title: '下一个 Token，是怎么被选中的',
    subtitle: '自回归 · Logits · 采样',
    summary:
      '模型每一步只做一件事：根据当前上下文预测下一个 Token 的概率。选中的 Token 被接回序列，KV Cache 再写入一格，然后重复。它不是先写好整段答案再发送，而是一个 Token 接一个 Token 地把答案“长”出来。',
    moment: '每说一个字，都要把前面所有字再想一遍——只是不用重算。',
    duration: 20,
    hint: '拖动 Temperature，观察同一组模拟 logits 如何被重新采样。',
  },
  {
    id: 'stream',
    index: 7,
    nav: '返回',
    en: 'STREAM',
    title: '答案以流的形式离开机房',
    subtitle: 'Detokenize · SSE · Chunk',
    summary:
      'Token 被重新拼成文本，组织成连续的响应片段，沿一条并行的返回链路离开机房。SSE 让连接保持打开，客户端无需等待完整回答。一个网络 Chunk 可能包含多个 Token，也可能只是半个汉字——Token 边界与网络边界并不相等。',
    moment: '答案不是一次性寄出的包裹，而是一条持续抵达的河。',
    duration: 11,
    hint: '注意看 Chunk 的边界：它和 Token 的边界并不重合。',
  },
  {
    id: 'arrival',
    index: 8,
    nav: '抵达',
    en: 'ARRIVAL',
    title: '文字在你的屏幕上逐渐出现',
    subtitle: '客户端渲染 · 完整回路',
    summary:
      '客户端把每个片段即时插入消息，回答在屏幕上逐渐成形。你看到一段连贯的文字；它经历了请求构建、网络与网关、分词、嵌入、Transformer、Prefill 与一次次 Decode，再以流的形式回到这里。',
    moment: '你看到的是一段回答，它经历的却是一场复杂的计算旅程。',
    duration: 13,
    hint: '镜头拉远后，你可以继续自由观察整条链路。',
  },
];

export const STAGE_STARTS: readonly number[] = (() => {
  const starts: number[] = [];
  let elapsed = 0;
  for (const stage of STAGES) {
    starts.push(elapsed);
    elapsed += stage.duration;
  }
  return starts;
})();

export const TOTAL_DURATION = STAGE_STARTS[STAGE_STARTS.length - 1] + STAGES[STAGES.length - 1].duration;

export interface StagePosition {
  index: number;
  localProgress: number;
  globalProgress: number;
  stageElapsed: number;
}

export function positionAt(globalProgress: number): StagePosition {
  const total = Math.min(1, Math.max(0, globalProgress));
  const seconds = total * TOTAL_DURATION;
  let index = STAGES.length - 1;
  for (let candidate = 0; candidate < STAGES.length; candidate += 1) {
    const start = STAGE_STARTS[candidate];
    const end = start + STAGES[candidate].duration;
    if (seconds < end || candidate === STAGES.length - 1) {
      index = candidate;
      break;
    }
  }
  const start = STAGE_STARTS[index];
  const stage = STAGES[index];
  const stageElapsed = Math.max(0, Math.min(stage.duration, seconds - start));
  return {
    index,
    localProgress: stageElapsed / stage.duration,
    globalProgress: total,
    stageElapsed,
  };
}

export function progressAtStage(index: number): number {
  return STAGE_STARTS[Math.max(0, Math.min(STAGES.length - 1, index))] / TOTAL_DURATION;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export const FINAL_LINE = '你看到的是一段回答，它经历的却是一场复杂的计算旅程。';
