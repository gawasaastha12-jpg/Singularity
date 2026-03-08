# Phase 8: Profiling & Hotspot Confirmation

To verify that the optimization effort (zero-allocation, O(n²) numeric core) is successful and that the V8 engine is not hitting any unexpected garbage collection bottlenecks, follow these step-by-step profiling instructions.

## 1. Node CPU Profiling (CLI)

The easiest way to generate a rapid CPU profile is using Node's built-in V8 profiler.

### Execution Steps
1. Navigate to the engine root directory (`relativity-engine/`).
2. Run the scalable benchmark script with the V8 `--prof` flag:
   ```bash
   node --prof --require tsx/cjs packages/physics/src/benchmark/scalable-cli.ts
   ```
3. This generates an isolate log file in the directory (e.g., `isolate-0xnnnnnnnnnnnn-v8.log`).
4. Process the log into a readable text format:
   ```bash
   node --prof-process isolate-*.log > profile-results.txt
   ```

### Interpretation Checklist
- [ ] Open `profile-results.txt`.
- [ ] Look at the `[Summary]` section. Confirm that **C++ / system** time is minimal and JavaScript time is high.
- [ ] Under `[JavaScript]`, identify the top functions consuming ticks. You should verify that `createGravityDerivative` dominates (`>90%`).
- [ ] Check the `[GC]` section to confirm zero GC spikes during the benchmark tight-loops.

## 2. Chrome DevTools (Flamegraph)

If you prefer a visual flamegraph out of the V8 isolate:

### Execution Steps
1. Run the scalable benchmark with the inspector open and breaking on the first line:
   ```bash
   node --inspect-brk --require tsx/cjs packages/physics/src/benchmark/scalable-cli.ts
   ```
2. Open Chrome and navigate to `chrome://inspect`.
3. Click "Open dedicated DevTools for Node".
4. Go to the **Profiler** tab.
5. Select **Start CPU profiling**.
6. Switch to the **Sources** tab and click "Resume script execution" (Play button).
7. Let the benchmark finish.
8. Stop the CPU profile back in the **Profiler** tab.

### Interpretation Checklist
- [ ] Select the **Chart** view (Flamegraph).
- [ ] Ignore the initial wide bars (warmup and setup).
- [ ] Focus on the deep execution stacks corresponding to `simulator.tick()`.
- [ ] You should see wide blocks for `velocityVerlet` or `rk4` and an extremely wide child block for the anonymous derivative closure (gravity numeric core).
- [ ] Confirm there are no jagged "Minor GC" or "Major GC" blocks overlapping the hot loops.

## Zero GC Verification

To prove conclusively that there are ZERO allocations in the hot path:

1. Use `--trace-gc` while running the long run stability test:
   ```bash
   node --trace-gc --require tsx/cjs packages/physics/src/stability/longrun-cli.ts
   ```
2. You will see GC events logged to stdout.
3. Observe the output: after the first few seconds (warm-up), there should be absolutely no `Scavenge` or `Mark-sweep` lines printed until the script exits.
