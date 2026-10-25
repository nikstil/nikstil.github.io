# Vendored: MediaPipe face tracking

Served from nikstil.com itself so /D/ doesn't depend on anyone else's CDN.

| File | From | Version |
|---|---|---|
| `vision_bundle.mjs` | npm `@mediapipe/tasks-vision` (the `sourceMappingURL` comment removed, the map isn't shipped) | 0.10.35 |
| `vision_wasm_internal.js`, `vision_wasm_internal.wasm` | the same package, `wasm/` (the SIMD build, which every current browser supports) | 0.10.35 |
| `face_landmarker.task` | https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task | float16 / 1 |

MediaPipe is © Google LLC, licensed under the Apache License 2.0
(https://www.apache.org/licenses/LICENSE-2.0). Everything runs in the browser: camera frames never leave the device.
