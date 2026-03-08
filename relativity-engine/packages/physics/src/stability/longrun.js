import { Simulator } from '../engine/simulator';
import { generateDeterministicBodies } from '../benchmark/benchmark';
import { createGravityDerivative } from '../forces/gravity';
import { velocityVerlet } from '../integrators/verlet';
import { totalEnergy } from '../energy/totalEnergy';
import { SnapshotSerializer } from '../snapshot/serializer';
import { hashFloat64Array } from '../utils/hash';
export function runStabilityTest(config) {
    const seed = 42;
    const { state, masses } = generateDeterministicBodies(config.bodies, seed);
    const epsilon = 1e-3;
    const dt = 0.01;
    const derivative = createGravityDerivative(masses, epsilon);
    const simulator = new Simulator(state, derivative, {
        dt,
        epsilon,
        integrator: velocityVerlet
    });
    const serializer = new SnapshotSerializer(config.bodies);
    const initialE = totalEnergy(state, masses, epsilon);
    console.log(`Stability Test Started: ${config.bodies} bodies, ${config.steps} steps`);
    console.log(`Initial Energy: ${initialE}`);
    let maxDrift = 0;
    // We log every logInterval steps without storing anything that grows memory
    for (let step = 1; step <= config.steps; step++) {
        simulator.tick();
        if (step % config.logInterval === 0) {
            const currentState = simulator.getState();
            const currentE = totalEnergy(currentState, masses, epsilon);
            const driftPercent = Math.abs((currentE - initialE) / initialE);
            if (driftPercent > maxDrift) {
                maxDrift = driftPercent;
            }
            const serialized = serializer.serialize(currentState, masses);
            const hash = hashFloat64Array(serialized.state);
            const hashHex = hash.toString(16).padStart(8, '0');
            console.log(`Step ${step} | dE: ${driftPercent.toExponential(4)} | Max dE: ${maxDrift.toExponential(4)} | Hash: ${hashHex}`);
            if (driftPercent > config.driftThreshold) {
                throw new Error(`Stability Abort: Energy drift ${driftPercent.toExponential(4)} exceeded threshold ${config.driftThreshold.toExponential(4)} at step ${step}.`);
            }
        }
    }
    console.log(`Stability Test Completed Successfully. Max Drift: ${maxDrift.toExponential(4)}`);
}
