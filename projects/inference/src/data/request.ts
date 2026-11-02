import { ANSWER_CHUNKS, ANSWER_TOKENS, QUESTION_TEXT } from './tokenization';

export const ENDPOINT = 'POST /v1/chat/completions';
export const DEMO_MODEL_ID = 'qwen2.5-7b-instruct';

export interface ChatMessage {
  role: 'user';
  content: string;
}

export interface RequestShape {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  temperature: number;
  max_tokens: number;
}

export const REQUEST_BODY: RequestShape = {
  model: DEMO_MODEL_ID,
  messages: [{ role: 'user', content: QUESTION_TEXT }],
  stream: true,
  temperature: 0.7,
  max_tokens: 512,
};

export const REQUEST_JSON = JSON.stringify(REQUEST_BODY, null, 2).replace(
  '"content": "为什么天空是蓝色的？"',
  '"content": "为什么天空是蓝色的？"',
);

export interface SseEvent {
  id: number;
  text: string;
  tokenStart: number;
  tokenEnd: number;
  payload: string;
}

/** One SSE event per visible sentence chunk. Chunk and token boundaries differ. */
export const SSE_EVENTS: SseEvent[] = ANSWER_CHUNKS.map((chunk) => ({
  id: chunk.index,
  text: chunk.text,
  tokenStart: chunk.tokenStart,
  tokenEnd: chunk.tokenEnd,
  payload: JSON.stringify({
    id: 'chatcmpl-demo',
    object: 'chat.completion.chunk',
    model: DEMO_MODEL_ID,
    choices: [{ index: 0, delta: { content: chunk.text }, finish_reason: null }],
  }),
}));

export interface NetworkChunk {
  id: number;
  eventIds: number[];
  tokenCount: number;
  byteLabel: string;
}

/**
 * Deliberately uneven: the transport does not emit one chunk per token or even
 * per SSE event. This is the teaching point of chapter 08.
 */
export const NETWORK_CHUNKS: NetworkChunk[] = [
  { id: 0, eventIds: [0, 1], tokenCount: 12, byteLabel: '226 B' },
  { id: 1, eventIds: [2], tokenCount: 6, byteLabel: '164 B' },
  { id: 2, eventIds: [3, 4], tokenCount: 15, byteLabel: '294 B' },
  { id: 3, eventIds: [5, 6], tokenCount: 11, byteLabel: '248 B' },
  { id: 4, eventIds: [7, 8], tokenCount: 11, byteLabel: '238 B' },
];

export const WEB_PIPELINE = [
  { key: 'input', label: '用户输入', detail: '浏览器拿到文本与对话状态' },
  { key: 'compose', label: '组装消息', detail: '角色、历史与参数进入 messages' },
  { key: 'serialize', label: '序列化请求', detail: 'JSON + 请求头 + 凭证' },
  { key: 'post', label: 'HTTPS POST', detail: '连接复用，等待响应流' },
  { key: 'render', label: '读取流', detail: '按事件增量更新界面' },
] as const;

export const API_PIPELINE = [
  { key: 'key', label: '凭证', detail: 'Authorization: Bearer …' },
  { key: 'endpoint', label: '端点', detail: ENDPOINT },
  { key: 'body', label: '请求体', detail: 'model · messages · stream' },
  { key: 'stream', label: '流式响应', detail: 'text/event-stream' },
] as const;

export const FIRST_EVENT_TEXT = ANSWER_CHUNKS[0]?.text ?? '';
export const ALL_ANSWER_TEXT = ANSWER_TOKENS.map((token) => token.display).join('');
