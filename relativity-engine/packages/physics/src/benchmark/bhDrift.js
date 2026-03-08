import { Simulator } from '../engine/simulator';
import { generateDeterministicBodies } from './benchmark';
import { createBarnesHutDerivative } from '../forces/integrationAdapter';
import { velocityVerlet } from '../integrators/verlet';
import { totalEnergy } from '../energy/totalEnergy';
// 100k step run testing Theta approximation impacts on energy drift
const bodyCount = 1000;
const seed = 42;
const steps = 100_000;
const epsilon = 1e-3;
const dt = 0.01;
const theta = 0.5;
const { state, masses } = generateDeterministicBodies(bodyCount, seed);
const deriv = createBarnesHutDerivative(masses, epsilon, theta);
const sim = new Simulator(state, deriv, { dt, epsilon, integrator: velocityVerlet });
const initialE = totalEnergy(state, masses, epsilon);
console.log(`Starting 100k step test on Barnes-Hut. Target: measure relative drift against 1e-8 relative...`);
console.log(`Initial Energy: ${initialE}`);
for (let i = 1; i <= steps; i++) {
    sim.tick();
    if (i % 25000 === 0) {
        const curE = totalEnergy(sim.getState(), masses, epsilon);
        const drift = Math.abs((curE - initialE) / initialE);
        console.log(`Step ${i} | Drift: ${drift.toExponential(4)}`);
    }
}
