# THE INFERENCE — 场景模块契约

> 这是团队并行开发时唯一的接口约定。写任何场景代码之前先读这份文档，并读
> `src/three/types.ts`、`src/three/kit/*`、`src/three/layout.ts`。

## 项目基调

「黑镜式未来科技 × 白色极简实验室 × 电影级科学可视化」。页面背景是暖白纸面，
主结构是石墨黑、精密金属、半透明玻璃和细线框；数据/激活用暖橙 `#e4572a`，协议/成功状态用
少量青绿 `#247c70`。不要使用蓝紫渐变、霓虹灯、发光卡片、生物神经元式点灯。

3D 结构必须有真实空间纵深和真实几何，不要用朝向相机的二维卡片冒充三维对象。
文字可以出现在 CanvasTexture 贴图或 Sprite 上，但结构本身必须是三维的。

## 文件所有权

只写自己的目录，其他文件一律不要改（包括 package.json、styles、kit、data）：

- 传输场景负责人：`src/three/scenes/transit/NetworkScene.ts`、`src/three/scenes/transit/StreamScene.ts`，以及该目录下自建的局部 helper。
- 语言场景负责人：`src/three/scenes/language/TokenizerScene.ts`、`src/three/scenes/language/EmbeddingScene.ts`，以及该目录下自建的局部 helper。
- Lead：其余所有文件。

如果需要修改 kit 或共享类型，先发消息给 Lead；不要自行修改。

## 场景接口

```ts
import type { QualityInfo, SceneFrame, CameraPose, StageScene } from '../../types';

export class NetworkScene implements StageScene {
  readonly group: THREE.Group;
  readonly pickables: THREE.Object3D[];
  constructor(quality: QualityInfo);
  update(frame: SceneFrame): void;
  cameraPose(frame: SceneFrame, aspect: number): CameraPose;
  dispose(): void;
}
```

- `group` 由 World 放到场景锚点；你**只建局部坐标**，不要再平移锚点。
- 所有几何以 `group` 为根。
- `pickables` 收集可点击 mesh/group（顶层 group 也可以）。每个可点击对象设置
  `object.userData.infoId = '<NODE_INFO 的 id>'`。不要在每个子 mesh 上重复添加。
- `cameraPose` 返回局部相机位置、局部观察目标、FOV。`stageProgress` 为本章 0→1。
  实现 3–5 个关键帧并用平滑插值；不要每帧瞬移。宽高比 < 0.9 时适当把相机后撤。
- `update(frame)` 必须只依赖 `frame` 和内部动画状态；暂停时静止，拖动时间轴时能立即
  反映进度。`frame.time` 是会话时间，可以用于持续粒子流动。
- `dispose()` 遍历释放 geometry / material / texture。可用 `disposeObject(group)`。
- 遵守 `frame.reducedMotion`：降低/停止环境漂浮与大幅镜头漂移，但进度相关的必要变化保留。
- `frame.quality.nodeScale` 用于裁剪粒子数和细节；移动端不要硬编码高数量。

## 坐标约定

所有场景朝向世界 +Z 为“观众方向”，局部 X 为流程方向。相机一般位于 +Z / +Y。

- `NetworkScene`：胶囊从局部 x≈-10 进入，沿 X 前进到 x≈+13。网关中心约 x=0。
- `StreamScene`：返回链路沿局部 -X 方向流动，从 x≈+12 到 x≈-13（越走越接近客户端方向）。
- `TokenizerScene`：原句从 x≈-9 进入，分词刀在 x≈-1，Token 轨道从 x≈+1 延伸到 x≈+11。
- `EmbeddingScene`：Token 轨道从 x≈-9 进入，嵌入矩阵墙在 x≈-2，向量空间在 x≈+1..+11。
- 所有场景的局部 Y=0 是地面基准。世界有柔和接触阴影和薄雾。

## 可点击节点 id

只使用 `src/data/nodes.ts` 里存在的 id。指定的节点如下：

### NetworkScene

`dns-hop`、`https-tunnel`、`api-gateway`、`auth-check`、`rate-limit`、`model-router`、`queue-scheduler`、`gpu-cluster`。

### StreamScene

`detokenizer`、`sse-stream`、`response-chunks`、`ttft`。

### TokenizerScene

`tokenizer`、`token-rail`。

### EmbeddingScene

`embedding-matrix`、`vector-space`。Token 向量对象额外设置
`object.userData.tokenIndex = 0..5`；点击后 UI 会打开该 Token 的向量检查器。

## 可用共享 kit

```ts
import { PALETTE } from '../../kit/palette';
import { graphiteMaterial, steelMaterial, glassMaterial, smokedGlassMaterial,
         accentMaterial, emissiveMaterial, wireMaterial, glowMaterial } from '../../kit/materials';
import { roundedBox, lineFromPoints, curveFromPoints, tubeAlong, tickStrip,
         smallSphere, setShadows, disposeObject } from '../../kit/geometry';
import { makeTextTexture, makePlaneLabel, makeSpriteLabel, makeCanvasTexture,
         makeTokenTexture, makeGlowTexture } from '../../kit/textures';
import { createFlowParticles, createDustField, dotTexture } from '../../kit/particles';
import { createTokenSlab, createDataCapsule, createNodePost, createMeasureLine } from '../../kit/nodes';
import { FONT_SANS, FONT_MONO } from '../../kit/textures';
```

Kit 提供的是起点，不限制你自建更合适的几何/材质。不要为了炫技堆叠大量独立 draw call；
能用 InstancedMesh 的重复单元尽量用 InstancedMesh。桌面每场景建议 ≤ 140 draw calls，
移动端 ≤ 80。

## 内容与数据

- 中文文案从 `src/data/*` 读取，不要另写技术解释；节点解释已统一在 `nodes.ts`。
- Tokenizer 必须使用 `src/data/tokenization.ts` 的真实 6 个 Token（`QUESTION_TOKENS`），
  包括文本、ID、位置。不能为了构图手拆文字。不要在 token 字符串里插入空格。
- 网络/流式场景使用 `src/data/request.ts` 的 `REQUEST_BODY`、`SSE_EVENTS`、`NETWORK_CHUNKS`。
- Embedding 使用 `src/data/embedding.ts` 的 `CONCEPT_VECTORS`（明确是概念映射）。
- 所有数字/概率在 UI 会统一标注模拟；3D 标签也不要声称是真实监控。

## 视觉叙事要求

### NetworkScene（第 02 章，stageIndex = 1）

- 请求胶囊沿三维链路前进，链路有细密刻度、支撑结构与微光粒子。
- 必须出现：DNS/连接环、HTTPS/TLS 包裹、API 网关门架、身份认证、限流/配额、模型路由、排队调度、GPU 集群。
- 每个环节被胶囊穿过时有扫描、开合、写入或脉冲响应，不能只是静态摆件。
- 网关、认证等节点应体现“这是常见组合，不同厂商不同”，但文案放在节点解释里，3D 里用可选/旁路式的视觉暗示。
- 镜头随胶囊推进，有穿过门架、贴近扫描、最后拉远看到集群的节奏。

### StreamScene（第 08 章，stageIndex = 7）

- 返回链路：Detokenizer 把 Token 重新变成文本，SSE 事件沿链路向客户端方向流动。
- 必须出现 5 个 NetworkChunk 的可视化，并明显展示 chunk ≠ token：一个 chunk 可包含多个 token、一个事件可以被拆开。
- 有 TTFT / tokens-per-second 的细线标注或仪表结构，但数字是模拟，UI 统一说明。
- 镜头从模型侧出发，沿返回链路滑向客户端方向，速度要快一些但仍平滑。
- 画面以暖橙数据流 + 青绿协议结构区分“内容”和“协议”。

## 验收

- `pnpm exec tsc --noEmit` 通过；`pnpm build` 通过。
- 场景在 stageProgress 0、0.5、1 都有合理构图，无物体穿透相机、无巨大空白。
- 没有外部图片/网络资源，不引入新依赖。
- 控制台无报错（World 集成后由 Lead 统一验证）。
- 文件控制在合理规模；复杂场景可拆为同目录 helper。

完成后报告：文件、draw call 估计、已实现的交互节点 id、已知问题。
