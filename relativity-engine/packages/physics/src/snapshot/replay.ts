import { Simulator } from '../engine/simulator';
import { createGravityDerivative } from '../forces/gravity';
import { velocityVerlet } from '../integrators/verlet';
import { SnapshotSerializer, Snapshot } from './serializer';
import { hashFloat64Array } from '../utils/hash';

export interface ReplayVerificationConfig {
    initialSnapshot: Snapshot;
    steps: number;
    expectedHashes: number[];
}

// In a real environment, save/load would use fs API with TypedArray offsets.
// Since we cant't use JSON stringify per requirements inside the loop, the
// state buffers themselves can be written directly to binary files.
export class ReplaySystem {

    // Simulate saving a snapshot to binary memory
    static saveSnapshot(snapshot: Snapshot): ArrayBuffer {
        const combined = new Float64Array(snapshot.state.length + snapshot.masses.length);
        combined.set(snapshot.state, 0);
        combined.set(snapshot.masses, snapshot.state.length);
        return combined.buffer;
    }

    // Simulate loading a snapshot from binary memory
    static loadSnapshot(buffer: ArrayBuffer, bodyCount: number): Snapshot {
        const stateLength = bodyCount * 4;
        return {
            state: new Float64Array(buffer, 0, stateLength),
            masses: new Float64Array(buffer, stateLength * 8, bodyCount) // 8 bytes per float64
        };
    }

    static verifyReplay(config: ReplayVerificationConfig): boolean {
        const expectedHashes = config.expectedHashes;
        const bodyCount = config.initialSnapshot.masses.length;
        const serializer = new SnapshotSerializer(bodyCount);
        const { state, masses } = serializer.deserialize(config.initialSnapshot);

        const dt = 0.01;
        const epsilon = 1e-3;

        const derivative = createGravityDerivative(masses, epsilon);
        const simulator = new Simulator(state, derivative, {
            dt,
            epsilon,
            integrator: velocityVerlet
        });

        console.log(`Starting Replay Verification for ${config.steps} steps.`);
        let valid = true;

        for (let step = 0; step < config.steps; step++) {
            simulator.tick();

            const currentState = simulator.getState();
            const snap = serializer.serialize(currentState, masses);
            const currentHash = hashFloat64Array(snap.state);

            if (expectedHashes[step] !== undefined && expectedHashes[step] !== currentHash) {
                console.error(`Mismatch at step ${step + 1}: expected ${expectedHashes[step].toString(16)}, got ${currentHash.toString(16)}`);
                valid = false;
                break;
            }
        }

        if (valid) {
            console.log("Replay verification successful: All hashes match identically.");
        }

        return valid;
    }
}
