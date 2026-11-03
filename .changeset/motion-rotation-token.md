---
'@senakster/senui-tokens': minor
---

Adds `--senui-motion-duration-rotation` (960 ms): one turn of essential continuous rotation, such as a progress spinner, and nothing else. It has no reduced-motion value: slow it with the reduce factor instead, as `calc(var(--senui-motion-duration-rotation) * (4 - 3 * var(--senui-motion-reduce)))`, so a consumer who sets `--senui-motion-reduce` to `0` slows it too. The `motion.duration` descriptions now say that colour and opacity keep their duration under reduced motion.
