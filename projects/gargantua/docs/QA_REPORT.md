# GARGANTUA — Browser Acceptance Report

Generated: 2026-11-02T16:46:25.907Z  ·  Suite: `tools/qa.mjs`  ·  Duration: 261.0 s

## Summary

| Metric | Value |
| --- | --- |
| Tests executed | 58 |
| Passed | 58 |
| Failed | 0 |
| Skipped | 0 |
| Overall | PASS (all executed checks green) |

Committed evidence subset: `docs/evidence/` (desktop HUD, mobile HUD, clean canvas, 0–9 debug contact sheet, context-loss overlay). The full 31 screenshots are produced by the suite into `docs/screens/` (gitignored local artifacts); every one is re-verified as a valid non-empty PNG before this report is written.

## Environment

| Field | Value |
| --- | --- |
| os | Windows_NT 10.0.22621 (win32 x64) |
| node | v25.2.1 |
| playwrightCore | 1.64.1 |
| chromeChannel | system Chrome (headless) |
| chromeVersion | 156.0.8078.48 |
| browserArgs | ["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"] |
| server | tools/serve.mjs (in-process, ephemeral port) |
| timezone | Asia/Shanghai |
| servedUrl | http://127.0.0.1:56559/ |
| webgl | {"version":"WebGL 2.0 (OpenGL ES 3.0 Chromium)","renderer":"ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)","vendor":"Google Inc. (Google)","maxTextureSize":8192} |
| page | {"userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36","platform":"Win32","devicePixelRatio":1,"viewport":{"width":1000,"height":620},"screen":{"width":1000,"height":620},"language":"zh-CN","hardwareConcurrency":24} |

## Issue #2 acceptance criteria (1:1 mapping)

| # | Criterion | Status | Evidence (test ids / screenshots) |
| --- | --- | --- | --- |
| A | 静态服务器可直接打开，无构建步骤，无控制台错误，无黑屏。 | PASS | A1:pass, A2:pass, A3:pass, G2:pass, G3:pass<br>screens/qa-01-desktop-load.png, screens/qa-02-canvas-standard.png |
| B | 核心画面由 fragment shader 实时积分产生；黑球/平面圆环/贴图伪造视为不通过。 | PASS | A3:pass, B1:pass, B2:pass, C2:pass<br>screens/qa-02-canvas-standard.png |
| C | 事件视界、光子环、多次盘穿越、引力透镜、Doppler、红移与湍流均可见。 | PASS | A3:pass, C3:pass, C4:pass, B2:pass, E9:pass, C1:pass, E18:pass, C2:pass<br>screens/qa-02-canvas-standard.png, screens/qa-12-cinematic.png |
| D | HDR Bloom、ACES、暗角、颗粒、色散生效且不过度。 | PASS | D1:pass, D2:pass, C2:pass, D3:pass<br>screens/qa-22-final-composite.png |
| E | 电影循环、OrbitControls、四预设、HUD、21 参数、0–9 调试视图、快捷键与音频开关可用。 | PASS | A4:pass, E1:pass, E2:pass, E3:pass, E4:pass, E5:pass, E6:pass, E7:pass, E8:pass, E9:pass, E10:pass, E11:pass, E12:pass, E13:pass, E14:pass, E15:pass, E16:pass, E17:pass, E18:pass, E19:pass<br>screens/qa-03-exposure-175.png, screens/qa-04-panel-closed.png, screens/qa-05-help-overlay.png, screens/qa-06-hud-hidden.png, screens/qa-08-debug-0-final.png, screens/qa-09-debug-2-steps.png, screens/qa-10-debug-6-redshift.png, screens/qa-11-view-presets.png, screens/qa-12-cinematic.png |
| F | 三档质量、移动端、Retina、状态持久化、WebGL 恢复、URL 截图接口可验证。 | PASS | A2:pass, A4:pass, F1:pass, F2:pass, F3:pass, F4:pass, F5:pass, F6:pass, F7:pass, F8:pass, F9:pass, F10:pass, F11:pass, F12:pass, F13:pass, F14:pass, F15:pass, F16:pass, F17:pass<br>screens/qa-07-quality-high.png, screens/qa-13-shot-deterministic.png, screens/qa-14-debug-0.png, screens/qa-14-debug-1.png, screens/qa-14-debug-2.png, screens/qa-14-debug-3.png, screens/qa-14-debug-4.png, screens/qa-14-debug-5.png, screens/qa-14-debug-6.png, screens/qa-14-debug-7.png, screens/qa-14-debug-8.png, screens/qa-14-debug-9.png, screens/qa-15-persistence-restored.png, screens/qa-16-mobile.png, screens/qa-17-reduced-motion.png, screens/qa-18-retina.png, screens/qa-19-webgl-context-lost.png, screens/qa-20-webgl-restored.png |
| G | 提供全部源码、vendor、音频资源、启动命令与测试结果；通过视觉与交互验收。 | PASS | E15:pass, F4:pass, G1:pass, G2:pass, G3:pass, G4:pass, G5:pass, G6:pass, G7:pass, G8:pass, S1:pass<br>screens/qa-21-static-subpath.png |

## Load, rendering & API

| ID | Status | Check | Detail |
| --- | --- | --- | --- |
| A1 | PASS | Static load reaches ready with no console/page/HTTP errors | ready in 1167 ms, HTTP 200; pageErrors=[]; consoleErrors=[]; consoleWarnings=[]; httpErrors=[]; failedRequests=[] |
| A2 | PASS | WebGL2 rendering context is active (not WebGL1 fallback) | {"isWebGL2":true,"version":"WebGL 2.0 (OpenGL ES 3.0 Chromium)","shadingLanguage":"WebGL GLSL ES 3.00 (OpenGL ES GLSL ES 3.0 Chromium)","vendor":"Google Inc. (Google)","renderer":"ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)"} |
| A3 | PASS | Canvas renders a non-black frame (screenshot pixel sampling) | {"samples":38750,"nonBlackFraction":0.6832,"brightFraction":0.0707,"meanLuma":19.91,"maxLuma":249,"centerMeanLuma":30.72,"centralDarkFraction":0.1808,"leftMeanLuma":22.76,"rightMeanLuma":17.07,"leftRightAsymmetry":0.2861,"canvasWidth":1000,"canvasHeight":620,"dataUrlLength":956198,"isPngDataUrl":true} |
| C3 | PASS | Edge-on disk shows left/right brightness asymmetry (Doppler beaming) | {"leftMeanLuma":22.76,"rightMeanLuma":17.07,"leftRightAsymmetry":0.2861} |
| C4 | PASS | Event-horizon shadow reads as a deep-black region inside the frame | {"centralDarkFraction":0.1808,"centerMeanLuma":30.72,"cornerDarknessNote":"sampled dark pixels (luma<6) in the central 40% box"} |
| B1 | PASS | No image/panorama textures are loaded — scene is procedural | resources=12; imageAssets=[] |
| B2 | PASS | Fragment shader integrates geodesics with relativistic terms (static evidence) | tokens=6/6; RK4 present; sampler2D absent |
| A4 | PASS | window.__GARGANTUA__ API contract matches the documented surface | {"version":"1.0.0","ready":true,"constants":{"RS":1,"MASS":0.5,"PHOTON_SPHERE":1.5,"ISCO":3,"CRITICAL_B":2.598076211353316},"paramCount":21,"params":["exposure","bloomStrength","bloomRadius","bloomThreshold","vignette","grain","chromaticAberration","diskBrightness","diskTemperature","diskInnerRadius","diskOuterRadius","diskThickness","diskOpacity","diskTurbulence","diskSpinSpeed","beaming","redshift","photonRingBoost","starBrightness","galaxyBrightness","fieldOfView"],"qualityLevels":["standard","high","cinematic"],"debugViews":[0,1,2,3,4,5,6,7,8,9],"viewPresets":["edge","polar","oblique","close"],"shortcuts":10,"hasFunctions":true} |
| E1 | PASS | HUD exposes 21 parameter rows and the documented hooks | {"sliderCount":21,"paramRows":21,"sliderIds":["exposure","bloomStrength","bloomRadius","bloomThreshold","vignette","grain","chromaticAberration","diskBrightness","diskTemperature","diskInnerRadius","diskOuterRadius","diskThickness","diskOpacity","diskTurbulence","diskSpinSpeed","beaming","redshift","photonRingBoost","starBrightness","galaxyBrightness","fieldOfView"],"viewButtons":4,"qualityButtons":3,"debugButtons":10,"panelToggle":true,"resetButton":true,"helpButton":true,"help":true,"error":true,"audioButton":true,"shotButton":true,"telemetry":true,"cameraReadout":true,"hint":true} |
| E2 | PASS | Changing a DOM range slider updates the shared state (exposure) | {"before":0.95,"after":1.75,"output":"1.75"} |
| E3 | PASS | Parameter values are validated/clamped to the schema range | {"probe":{"high":3,"low":0.2},"range":{"min":0.2,"max":3,"def":0.95}} |
| E4 | PASS | R shortcut resets all 21 parameters to their defaults | mismatches=[] |
| E5 | PASS | HUD reset button restores defaults | exposure=0.95 |
| E6 | PASS | Parameter panel toggles closed/open through #panel-toggle | {"closed":{"panel":false,"dataset":"closed","bodyHidden":true,"aria":"false"},"reopened":{"panel":true,"dataset":"open"}} |
| E7 | PASS | Help overlay opens/closes via button, ? key and Escape | {"open":{"hidden":false,"display":"grid","visibility":"visible","expanded":"true","rows":10},"closed":true,"keyOpen":true,"escClosed":true} |
| E8 | PASS | H shortcut hides and restores the HUD | {"hidden":{"state":false,"dataset":"hidden","opacity":"0","visibility":"hidden"},"shown":{"state":true,"dataset":"visible","opacity":"1"}} |

## Quality tiers

| ID | Status | Check | Detail |
| --- | --- | --- | --- |
| F1 | PASS | Three quality tiers switch and change the reported render resolution | {"before":{"quality":"standard","width":720},"tiers":[{"tier":"high","render":"900×558","canvas":"1000×620","dpr":1,"statsWidth":900,"maxSteps":280,"active":true},{"tier":"cinematic","render":"1000×620","canvas":"1000×620","dpr":1,"statsWidth":1000,"maxSteps":420,"active":true},{"tier":"standard","render":"720×446","canvas":"1000×620","dpr":1,"statsWidth":720,"maxSteps":150,"active":true}],"errors":[{"tier":"high","console":0,"page":0},{"tier":"cinematic","console":0,"page":0},{"tier":"standard","console":0,"page":0}]} |
| F2 | PASS | Quality switching introduces no console/page errors | [{"tier":"high","console":0,"page":0},{"tier":"cinematic","console":0,"page":0},{"tier":"standard","console":0,"page":0}] |

## Debug views 0–9

| ID | Status | Check | Detail |
| --- | --- | --- | --- |
| E9 | PASS | Keys 0–9 switch all ten debug views and keep HUD state in sync | [{"index":0,"ok":true,"debug":0,"dataset":"0","active":true,"label":"0 · FINAL BEAUTY COMPOSITE"},{"index":1,"ok":true,"debug":1,"dataset":"1","active":true,"label":"1 · RAW HDR UNTONEMAPPED HDR BUFFER"},{"index":2,"ok":true,"debug":2,"dataset":"2","active":true,"label":"2 · STEP HEAT GEODESIC INTEGRATION COST"},{"index":3,"ok":true,"debug":3,"dataset":"3","active":true,"label":"3 · CAPTURE MASK RAYS ABSORBED BY THE HORIZON"},{"index":4,"ok":true,"debug":4,"dataset":"4","active":true,"label":"4 · DEFLECTION TOTAL LIGHT BENDING ANGLE"},{"index":5,"ok":true,"debug":5,"dataset":"5","active":true,"label":"5 · DISK PASSES EQUATORIAL PLANE CROSSINGS"},{"index":6,"ok":true,"debug":6,"dataset":"6"," |
| E10 | PASS | All ten debug-view buttons drive the same state as the keys | [{"index":0,"ok":true,"debug":0},{"index":1,"ok":true,"debug":1},{"index":2,"ok":true,"debug":2},{"index":3,"ok":true,"debug":3},{"index":4,"ok":true,"debug":4},{"index":5,"ok":true,"debug":5},{"index":6,"ok":true,"debug":6},{"index":7,"ok":true,"debug":7},{"index":8,"ok":true,"debug":8},{"index":9,"ok":true,"debug":9}] |

## View presets & shortcuts

| ID | Status | Check | Detail |
| --- | --- | --- | --- |
| E11 | PASS | Four view-preset buttons move the camera to the authored poses | [{"id":"polar","storePreset":"polar","storeMode":"manual","rigPreset":"polar","rigMode":"manual","active":true},{"id":"oblique","storePreset":"oblique","storeMode":"manual","rigPreset":"oblique","rigMode":"manual","active":true},{"id":"close","storePreset":"close","storeMode":"manual","rigPreset":"close","rigMode":"manual","active":true},{"id":"edge","storePreset":"edge","storeMode":"manual","rigPreset":"edge","rigMode":"manual","active":true}] |
| E12 | PASS | Shift+1…4 select the four view presets | [{"index":1,"preset":"edge"},{"index":2,"preset":"polar"},{"index":3,"preset":"oblique"},{"index":4,"preset":"close"}] |
| E13 | PASS | C toggles between cinematic and manual camera modes | {"before":"manual","afterFirst":"cinematic","afterSecond":"manual"} |
| E14 | PASS | Space pauses and resumes simulated time | {"before":true,"paused":false,"resumed":true} |
| E15 | PASS | M toggles ambient music; <audio> exists after gesture and the OGG responds 200 | {"audioOn":{"state":true,"dataset":"on","elementPresent":true,"src":"blob:http://127.0.0.1:56559/fcf0e0fd-6be6-400d-9299-9fb51ef839fe","loop":true,"paused":false,"readyState":4},"oggResponses":[{"url":"http://127.0.0.1:56559/assets/audio/gargantua-ambient.ogg","status":200,"type":"fetch"}],"audioHttpStatus":"request-failed: apiRequestContext.get: Protocol \"blob:\" not supported. Expected \"http:\""} |
| E16 | PASS | M toggles ambient music off again | {"state":false,"dataset":"off"} |
| E17 | PASS | Telemetry and camera readout render live values | {"telemetry":"FPS\n2\nFRAME\n626.7 ms\nQUALITY\nSTANDARD\nRENDER\n720 × 446\nSTEPS\n150\nDISK PASSES\n4.1\nDPR\n1.00×","readout":"CAMERA\nMANUAL\nPRESET\nCLOSE\nRADIUS\n20.17 rs\nPOLAR\n86.6°\nAZIMUTH\n47.9°\nTIME\nLIVE"} |

## Post-processing & animation

| ID | Status | Check | Detail |
| --- | --- | --- | --- |
| D1 | PASS | HDR bloom / vignette / grain / chromatic aberration / exposure all alter the composite | {"base":"612ffd0b1e3f50f5","variants":[{"id":"bloom-off","hash":"5a41ec7d186b12c1","differsFromBase":true},{"id":"bloom-max","hash":"9a6f922bf8a18d2f","differsFromBase":true},{"id":"vignette-off","hash":"c1395fb21fcc86c9","differsFromBase":true},{"id":"grain-off","hash":"fdfd2a8e745e1c91","differsFromBase":true},{"id":"chroma-off","hash":"47d405ab8d06371f","differsFromBase":true},{"id":"exposure-low","hash":"6b01e5f275c70b89","differsFromBase":true}]} |
| D2 | PASS | Debug view 1 (RAW HDR) differs from the tonemapped FINAL composite | {"raw":"d0b586e19c5858c3","final":"1187d100cb47ae95"} |
| C1 | PASS | Scene is animated: successive frames differ while motion is live | {"a":"ac6d25b868216e65","b":"c5d9e9d7ec6b942b","motion":true} |

## Camera: cinematic & orbit

| ID | Status | Check | Detail |
| --- | --- | --- | --- |
| E18 | PASS | Cinematic attract loop moves the camera over time | {"start":{"mode":"cinematic","preset":"edge","radius":20.171,"polar":86.6,"azimuth":47.88,"fov":45,"aspect":1.6129,"transitioning":false,"blending":true,"zooming":false},"later":{"mode":"cinematic","preset":"edge","radius":20.176,"polar":86.68,"azimuth":48.24,"fov":45,"aspect":1.6129,"transitioning":false,"blending":true,"zooming":false}} |
| E19 | PASS | Dragging the canvas switches from cinematic to manual OrbitControls | {"stateMode":"manual","rigMode":"manual","point":{"x":100,"y":180}} |

## Screenshot interface

| ID | Status | Check | Detail |
| --- | --- | --- | --- |
| F3 | PASS | SAVE PNG button downloads a PNG file | {"suggestedFilename":"gargantua-20261102T164427.png","failure":null} |

## Shot URL determinism

| ID | Status | Check | Detail |
| --- | --- | --- | --- |
| F4 | PASS | Screenshot URL (?shot=1) loads deterministically with UI hidden, motion frozen and shot contract ready | {"first":{"shot":{"enabled":true,"time":7,"frames":3,"dpr":1,"ui":false,"camera":null},"shotContract":{"windowShotReady":true,"shotReady":true,"shotEnabled":true,"captureType":"function"},"motion":false,"hud":false,"quality":"standard","camera":{"mode":"manual","preset":"edge","radius":22,"polar":84.5,"azimuth":24}},"second":{"shot":{"enabled":true,"time":7,"frames":3,"dpr":1,"ui":false,"camera":null},"shotContract":{"windowShotReady":true,"shotReady":true,"shotEnabled":true,"captureType":"function"},"motion":false,"hud":false},"errors":{"first":{"pageErrors":[],"consoleErrors":[],"consoleWarnings":[],"httpErrors":[],"failedRequests":[]},"second":{"pageErrors":[],"consoleErrors":[],"consoleW |
| F5 | PASS | Two fresh contexts produce identical state and screenshots | {"stateEqual":true,"hashA":"21f323d81df8809824b1","hashB":"21f323d81df8809824b1","renderA":"504×317","renderB":"504×317"} |
| F6 | PASS | __GARGANTUA__.screenshot() returns a decodable, non-trivial PNG data URL | {"isDataUrl":true,"png":{"signature":true,"width":700,"height":440,"bytes":405892},"bytes":405892,"pixels":{"samples":19250,"nonBlackFraction":0.7053,"brightFraction":0.0879,"meanLuma":21.72,"maxLuma":252.8,"centerMeanLuma":37.17,"centralDarkFraction":0.1617,"leftMeanLuma":25.99,"rightMeanLuma":17.41,"leftRightAsymmetry":0.3952,"canvasWidth":700,"canvasHeight":440,"dataUrlLength":541214,"isPngDataUrl":true}} |
| F7 | PASS | Shot determinism pixel diff (not needed — hashes match) | hashes identical |

## Debug views & post-processing (deterministic)

| ID | Status | Check | Detail |
| --- | --- | --- | --- |
| C2 | PASS | All ten debug views render distinct imagery (fixed time, deterministic) | {"unique":10,"hashes":[{"debug":0,"hash":"21f323d81df8"},{"debug":1,"hash":"1794aa2e23eb"},{"debug":2,"hash":"4788103e53f5"},{"debug":3,"hash":"e2c1bfb6a5ee"},{"debug":4,"hash":"23227ed461aa"},{"debug":5,"hash":"ca86e49644a9"},{"debug":6,"hash":"f6ccfaddd3d6"},{"debug":7,"hash":"6f773d8d2deb"},{"debug":8,"hash":"f46020da27a2"},{"debug":9,"hash":"7f5d13acab25"}]} |
| D3 | PASS | Every post-processing parameter changes the final composite (deterministic A/B) | {"base":"21f323d81df88098","variants":[{"id":"bloomStrength","value":0,"differs":true,"hash":"075a6da91b81"},{"id":"bloomRadius","value":0,"differs":true,"hash":"075a6da91b81"},{"id":"bloomThreshold","value":3,"differs":true,"hash":"075a6da91b81"},{"id":"vignette","value":0,"differs":true,"hash":"225ce2c55a34"},{"id":"grain","value":0,"differs":true,"hash":"f017ba81255e"},{"id":"chromaticAberration","value":0,"differs":true,"hash":"555b614b8043"},{"id":"exposure","value":2.4,"differs":true,"hash":"fddd7530732e"}]} |

## Persistence

| ID | Status | Check | Detail |
| --- | --- | --- | --- |
| F8 | PASS | Exposure, quality and debug survive a reload (localStorage) | {"initial":0.95,"changed":1.75,"stored":1.75,"restored":1.75,"restoredQuality":"standard","restoredDebug":3,"slider":"1.75"} |
| F9 | PASS | Clearing storage restores shipping defaults | {"exposure":0.95,"defaultExposure":0.95,"quality":"high","debug":0,"stored":"{\"version\":1,\"quality\":\"high\",\"params\":{\"exposure\":0.95,\"bloomStrength\":0.55,\"bloomRadius\":0.35,\"bloomThreshold\":0.9,\"vignette\":0.55,\"grain\":0.32,\"chromaticAberration\":0.4,\"diskBrightness\":1,\"diskTemperature\":5800,\"diskInnerRadius\":3,\"diskOuterRadius\":10.5,\"diskThickness\":0.16,\"diskOpacity\":0.86,\"diskTurbulence\":0.95,\"diskSpinSpeed\":1,\"beaming\":0.9,\"redshift\":1,\"photonRingBoost\":1,\"starBrightness\":1,\"galaxyBrightness\":0.9,\"fieldOfView\":45},\"debug\":0,\"hud\":true,\"panel\":false,\"audio\":false,\"motion\":true,\"camera\":{\"mode\":\"cinematic\",\"preset\":\"edge\",\ |

## Mobile 390×844 + touch

| ID | Status | Check | Detail |
| --- | --- | --- | --- |
| F10 | PASS | Mobile viewport loads with 21 sliders and no horizontal overflow | {"innerWidth":390,"innerHeight":844,"scrollWidth":390,"bodyScrollWidth":390,"sliderCount":21,"touchPoints":1,"panelToggleVisible":true} |
| F11 | PASS | HUD is usable on touch (panel toggle + debug tap) and the canvas renders | {"panelInitial":{"panel":false,"dataset":"closed"},"panelAfterTap":{"panel":true,"dataset":"open"},"panelRestored":{"panel":false,"dataset":"closed"},"debugAfterTap":7,"pixels":{"samples":20678,"nonBlackFraction":0.2564,"brightFraction":0.2221,"meanLuma":18.35,"maxLuma":173.9,"centerMeanLuma":4.12,"centralDarkFraction":0.7079,"leftMeanLuma":21.65,"rightMeanLuma":15.05,"leftRightAsymmetry":0.3595,"canvasWidth":390,"canvasHeight":844,"dataUrlLength":149414,"isPngDataUrl":true},"errors":{"pageErrors":[],"consoleErrors":[],"consoleWarnings":[],"httpErrors":[],"failedRequests":[]}} |
| F12 | PASS | Mobile context produces no console/page/HTTP errors | {"pageErrors":[],"consoleErrors":[],"consoleWarnings":[],"httpErrors":[],"failedRequests":[]} |

## prefers-reduced-motion

| ID | Status | Check | Detail |
| --- | --- | --- | --- |
| F13 | PASS | Reduced-motion context disables the cinematic loop and holds a static camera | {"first":{"stateMode":"manual","rig":{"mode":"manual","preset":"oblique","radius":21,"polar":62,"azimuth":42,"fov":45,"aspect":1.6,"transitioning":false,"blending":false,"zooming":false},"motion":true},"second":{"stateMode":"manual","rig":{"mode":"manual","preset":"oblique","radius":21,"polar":62,"azimuth":42,"fov":45,"aspect":1.6,"transitioning":false,"blending":false,"zooming":false}},"stable":true,"errors":{"pageErrors":[],"consoleErrors":[],"consoleWarnings":[],"httpErrors":[],"failedRequests":[]}} |

## Retina / DPR

| ID | Status | Check | Detail |
| --- | --- | --- | --- |
| F14 | PASS | Retina (deviceScaleFactor=2) DPR matches the quality-tier cap, not the device ratio | {"devicePixelRatio":2,"qualityCaps":{"standard":1,"high":1.5,"cinematic":2},"high":{"reportedDpr":1.5,"expectedDpr":1.5,"canvasWidth":750,"renderWidth":675},"standard":{"reportedDpr":1,"expectedDpr":1,"canvasWidth":500,"renderWidth":360},"errors":{"pageErrors":[],"consoleErrors":[],"consoleWarnings":[],"httpErrors":[],"failedRequests":[]}} |

## WebGL context loss & restore

| ID | Status | Check | Detail |
| --- | --- | --- | --- |
| F15 | PASS | WEBGL_lose_context extension is available | {"available":true,"functions":["loseContext","restoreContext"]} |
| F16 | PASS | Losing the WebGL context shows the recovery overlay and sets dataset.context=lost | {"lost":true,"lostState":{"datasetContext":"lost","errorHidden":false,"errorVisible":true,"errorTitle":"RENDER CONTEXT LOST","errorMessage":"The GPU context was lost. GARGANTUA is holding the simulation until it can rebuild.","errorActionVisible":true}} |
| F17 | PASS | Restoring the context recovers rendering with zero page errors / console errors / console warnings | {"restoreAttempt":{"called":true},"restored":true,"restoredState":{"datasetContext":"restored","errorHidden":true,"overlayHidden":true},"pixels":{"samples":25000,"nonBlackFraction":0.6948,"brightFraction":0.0745,"meanLuma":20.42,"maxLuma":247.1,"centerMeanLuma":31.35,"centralDarkFraction":0.1681,"leftMeanLuma":23.48,"rightMeanLuma":17.35,"leftRightAsymmetry":0.3004,"canvasWidth":800,"canvasHeight":500,"dataUrlLength":658058,"isPngDataUrl":true},"pageErrorsBefore":0,"pageErrorsAfter":0,"consoleErrorsBefore":0,"consoleErrorsAfter":0,"consoleWarningsBefore":0,"consoleWarningsAfter":0,"warnings":[],"consoleErrors":[]} |

## Static subpath integration (_site)

| ID | Status | Check | Detail |
| --- | --- | --- | --- |
| G1 | PASS | Site builder assembles _site for gargantua | {"status":0,"signal":null,"stdoutTail":"\u001b[90m[wishcraft]\u001b[0m copying portfolio from site/\n\u001b[90m[wishcraft]\u001b[0m building gargantua (GARGANTUA)\n\u001b[32m[ok]\u001b[0m gargantua → projects/gargantua/\n\u001b[32m[ok]\u001b[0m projects.json generated with 3 works\n\u001b[90m[wishcraft]\u001b[0m site assembled at _site/\n","stderrTail":""} |
| G2 | PASS | Built site serves /projects/gargantua/ with zero 404s and ready | {"staticUrl":"http://127.0.0.1:56592/projects/gargantua/","timing":{"ms":1210,"status":200},"loadError":null,"httpErrors":[],"consoleErrors":[],"pageErrors":[],"failedRequests":[],"resources":12,"hasMain":true,"hasThree":true} |
| G3 | PASS | Subpath canvas renders a non-black frame | {"samples":25000,"nonBlackFraction":0.7083,"brightFraction":0.0889,"meanLuma":22.3,"maxLuma":251,"centerMeanLuma":39.89,"centralDarkFraction":0.1506,"leftMeanLuma":26.95,"rightMeanLuma":17.65,"leftRightAsymmetry":0.4168,"canvasWidth":800,"canvasHeight":500,"dataUrlLength":656030,"isPngDataUrl":true} |
| G4 | PASS | Audio asset ships in the static build and responds 200 | {"url":"http://127.0.0.1:56592/projects/gargantua/assets/audio/gargantua-ambient.ogg","status":200} |
| G5 | PASS | projects.json includes the portfolio works and gargantua with preview + cover | {"status":200,"workCount":3,"works":["intelligence-archive","inference","gargantua"],"entry":{"id":"gargantua","order":3,"title":"GARGANTUA","titleZh":"卡冈图雅","year":"2026","kind":"REALTIME GEODESIC RAYTRACER","kindZh":"实时黑洞光线追踪","status":"COMPLETE","tagline":"每一个像素，都是一条弯折的零测地线。","description":"全屏 Fragment Shader 逐像素积分 Schwarzschild 零测地线：事件视界、光子环、引力透镜、多次吸积盘穿越、Doppler 增亮与引力红移全部由方程实时产生。21 项现场参数、四组电影机位与十个调试视图，把一座黑洞变成可以亲手调校的仪器。","meta":["SCHWARZSCHILD GEODESICS","21 LIVE PARAMETERS","THREE.JS + GLSL"],"preview":"projects/gargantua/","cover":"assets/covers/gargantua.jpg","sourcePath":"projects/gargantua"}} |
| G6 | PASS | projects.json cover file exists on disk | {"cover":"assets/covers/gargantua.jpg","file":"site\\assets\\covers\\gargantua.jpg","bytes":115276} |

## Cover artifact

| ID | Status | Check | Detail |
| --- | --- | --- | --- |
| G7 | PASS | Cover is a 1600×1000 JPEG (100–400 KB) with a luminous scene on a deep-black field | {"isJpeg":true,"size":115276,"dimensions":"1600×1000","width":1600,"height":1000,"nonBlackFraction":0.6458,"brightFraction":0.0713,"meanLuma":20.58,"maxLuma":255,"cornerMeanLuma":2.2,"centerMeanLuma":29.88,"centralDarkFraction":0.2613} |
| G8 | PASS | Cover reads as a deep-black field with a luminous disk/ring and a dark central shadow | {"centralDarkFraction":0.2613,"centerMeanLuma":29.88,"cornerMeanLuma":2.2,"maxLuma":255} |
| S1 | PASS | All evidence screenshots are written as valid, non-empty PNG files | 31 screenshots verified (PNG signature + size) |

## Screenshots

| File | Caption | Bytes |
| --- | --- | --- |
| [qa-01-desktop-load.png](screens/qa-01-desktop-load.png) | Desktop first paint with HUD (quality=standard, 1000×620) | 490407 |
| [qa-02-canvas-standard.png](screens/qa-02-canvas-standard.png) | Raytraced canvas dump, ?quality=standard edge-on view | 718028 |
| [qa-03-exposure-175.png](screens/qa-03-exposure-175.png) | Exposure raised to 1.75 through the HUD slider | 544520 |
| [qa-04-panel-closed.png](screens/qa-04-panel-closed.png) | Parameter panel collapsed via #panel-toggle | 489128 |
| [qa-05-help-overlay.png](screens/qa-05-help-overlay.png) | Keyboard shortcut help overlay | 98815 |
| [qa-06-hud-hidden.png](screens/qa-06-hud-hidden.png) | HUD hidden with the H shortcut | 442825 |
| [qa-07-quality-high.png](screens/qa-07-quality-high.png) | HIGH quality tier screenshot | 469566 |
| [qa-08-debug-0-final.png](screens/qa-08-debug-0-final.png) | Debug view 0 — FINAL beauty composite | 372843 |
| [qa-09-debug-2-steps.png](screens/qa-09-debug-2-steps.png) | Debug view 2 — geodesic step heat map | 172113 |
| [qa-10-debug-6-redshift.png](screens/qa-10-debug-6-redshift.png) | Debug view 6 — observed/emitted redshift g | 119327 |
| [qa-11-view-presets.png](screens/qa-11-view-presets.png) | View preset buttons in the HUD dock | 420915 |
| [qa-22-final-composite.png](screens/qa-22-final-composite.png) | FINAL composite after HDR/bloom/vignette/grain/chroma A/B tests | 574023 |
| [qa-12-cinematic.png](screens/qa-12-cinematic.png) | Cinematic attract loop (camera in motion) | 421493 |
| [qa-13-shot-deterministic.png](screens/qa-13-shot-deterministic.png) | ?shot=1&quality=standard&view=edge&debug=0&ui=0&time=7&dpr=1 canvas dump (run A) | 405892 |
| [qa-14-debug-0.png](screens/qa-14-debug-0.png) | Debug view 0 rendered with fixed shot time | 405892 |
| [qa-14-debug-1.png](screens/qa-14-debug-1.png) | Debug view 1 rendered with fixed shot time | 339602 |
| [qa-14-debug-2.png](screens/qa-14-debug-2.png) | Debug view 2 rendered with fixed shot time | 76606 |
| [qa-14-debug-3.png](screens/qa-14-debug-3.png) | Debug view 3 rendered with fixed shot time | 14131 |
| [qa-14-debug-4.png](screens/qa-14-debug-4.png) | Debug view 4 rendered with fixed shot time | 131173 |
| [qa-14-debug-5.png](screens/qa-14-debug-5.png) | Debug view 5 rendered with fixed shot time | 23100 |
| [qa-14-debug-6.png](screens/qa-14-debug-6.png) | Debug view 6 rendered with fixed shot time | 77388 |
| [qa-14-debug-7.png](screens/qa-14-debug-7.png) | Debug view 7 rendered with fixed shot time | 67861 |
| [qa-14-debug-8.png](screens/qa-14-debug-8.png) | Debug view 8 rendered with fixed shot time | 277839 |
| [qa-14-debug-9.png](screens/qa-14-debug-9.png) | Debug view 9 rendered with fixed shot time | 121306 |
| [qa-15-persistence-restored.png](screens/qa-15-persistence-restored.png) | State restored after reload (exposure=1.75, standard, debug 3) | 40597 |
| [qa-16-mobile.png](screens/qa-16-mobile.png) | Mobile 390×844 touch context with HUD | 190564 |
| [qa-17-reduced-motion.png](screens/qa-17-reduced-motion.png) | prefers-reduced-motion: manual still shot | 339953 |
| [qa-18-retina.png](screens/qa-18-retina.png) | Retina context deviceScaleFactor=2, quality=high | 492379 |
| [qa-19-webgl-context-lost.png](screens/qa-19-webgl-context-lost.png) | WebGL context lost — recovery overlay | 37566 |
| [qa-20-webgl-restored.png](screens/qa-20-webgl-restored.png) | WebGL context restored — rendering resumed | 320006 |
| [qa-21-static-subpath.png](screens/qa-21-static-subpath.png) | GARGANTUA served from _site/projects/gargantua/ | 319361 |

## Defects found

None: every executed acceptance check passed.
## Known limitations

- Headless Chrome on this machine runs on SwiftShader (software WebGL2). Measured frame rate is ~3–15 fps at the QA viewport, so the suite uses quality=standard / 1000×620 for interaction tests and allows generous timeouts. Timings are not representative of GPU hardware.
- Cinematic / preset camera moves are frame-rate dependent in wall-clock terms: the app eases by simulated dt (clamped to 0.1 s/frame), so on the software rasterizer a 1.3 s camera ease can take several seconds of real time. The suite waits on observed state, not fixed sleeps.
- Mobile (390×844) and Retina (deviceScaleFactor=2) checks are Chromium emulation, not physical devices.
- Audio playback is subject to the browser autoplay policy; the suite triggers a real gesture before asserting the audio element and the 200 response for the OGG file.
- The WebGL context-loss/restore section records whatever headless SwiftShader actually does. If restore is unsupported it is reported as a FAIL/observed limitation — never as a pass.
- src/{ui,camera,audio,state}.js were actively rewritten during the QA window; this report was generated on the frozen build, including the final main.js shot-ready and context-loss fixes.
- Layout is verified at 1440×900, 1024×768, 390×844 and 768×1024. Very short landscape windows (roughly ≤900 px wide and ≤640 px tall, e.g. 900×560) fall into the mobile stack layout; the collapsed "PARAMETERS" opener then spans the mid-frame and partially covers the artwork. All required/typical viewports are clean; this edge case is recorded as a known cosmetic limitation, not a functional failure.

## How to reproduce

```powershell
cd projects/gargantua
node tools/serve.mjs            # manual review on http://127.0.0.1:5193/
node tools/qa.mjs               # this acceptance suite
node tools/cover.mjs            # regenerate site/assets/covers/gargantua.jpg
```

The suite starts its own static server on an ephemeral port; the development server on :5192 is never touched.

