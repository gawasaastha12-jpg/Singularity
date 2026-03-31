🚀 Singularity — Deterministic N-Body Physics Engine

Singularity is a high-performance, deterministic N-body simulation engine designed for scientific accuracy, reproducibility, and real-time visualization. It models gravitational systems using advanced numerical methods and scales efficiently from small systems to thousands of interacting bodies.

🌌 Overview

This project implements a fully deterministic physics engine capable of simulating complex gravitational interactions with strict guarantees on reproducibility and numerical stability. It combines rigorous physical modeling with modern system design to enable both research-grade simulations and interactive visualization.

⚙️ Core Features

🔬 Deterministic Simulation
Seed-based reproducibility (identical inputs → identical outputs)
Snapshot + replay support for experiment verification
Strictly pure computation pipeline (no hidden mutation)

🧮 Numerical Methods
RK4 Integrator — high local accuracy
Velocity Verlet (Symplectic) — long-term stability
Time-reversal and zero-step invariants enforced

🌍 Gravity Engine
N-body gravitational interaction with epsilon softening
Energy and momentum conservation validation
Stable orbital behavior over long simulation horizons

⚡ Performance & Scalability
Optimized O(n²) baseline with zero-allocation hot loops
Barnes–Hut Octree (O(n log n)) for large-scale systems
Handles thousands of bodies efficiently (5k+)

📊 Validation & Benchmarking
Energy drift tracking (< 1e-10 over long runs)
Momentum conservation checks
Determinism verification via hashing
Benchmark suite for performance + scaling analysis

🧠 Architecture
Fully modular system design:
Physics Engine (deterministic core)
Renderer (GPU/WebGL)
UI Layer (React-based control + metrics)
Worker-based execution for non-blocking performance

🎨 Visualization (Hybrid UI)
Research Mode
Clean, minimal rendering
Precise metrics and scientific graphs
Focus on correctness and analysis
Cosmos Mode
GPU-accelerated visuals (glow, trails, nebula effects)
Cinematic rendering with real physics underneath
Designed for demos, teaching, and outreach

🧪 What This Enables
Study multi-body gravitational systems
Analyze numerical stability and integrator behavior
Compare exact vs approximate algorithms (Barnes–Hut)
Build reproducible physics experiments

🏗 Tech Stack
Core Engine: TypeScript (strict typing, Float64Array)
Physics: Custom N-body + Barnes–Hut implementation
Rendering: Three.js (WebGL, instanced rendering, shaders)
UI: React + Zustand
Concurrency: Web Workers + SharedArrayBuffer

📈 Performance Highlights
~20x speedup using Barnes–Hut vs direct summation at 8k bodies
Stable energy drift within scientific tolerance bounds
Real-time simulation at thousands of bodies
