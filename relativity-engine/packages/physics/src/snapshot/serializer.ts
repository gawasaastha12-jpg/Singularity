import type { StateVector } from '../types/state';

export interface Snapshot {
    state: Float64Array;
    masses: Float64Array;
}

export class SnapshotSerializer {
    private stateBuffer: Float64Array;
    private massesBuffer: Float64Array;

    constructor(maxBodies: number) {
        this.stateBuffer = new Float64Array(maxBodies * 4);
        this.massesBuffer = new Float64Array(maxBodies);
    }

    serialize(state: StateVector, masses: number[]): Snapshot {
        for (let i = 0; i < state.length; i++) {
            this.stateBuffer[i] = state[i];
        }
        for (let i = 0; i < masses.length; i++) {
            this.massesBuffer[i] = masses[i];
        }

        return {
            state: new Float64Array(this.stateBuffer.buffer, 0, state.length),
            masses: new Float64Array(this.massesBuffer.buffer, 0, masses.length)
        };
    }

    deserialize(snapshot: Snapshot): { state: StateVector, masses: number[] } {
        const state = new Float64Array(snapshot.state.length);
        const masses = new Array(snapshot.masses.length);

        for (let i = 0; i < state.length; i++) state[i] = snapshot.state[i];
        for (let i = 0; i < masses.length; i++) masses[i] = snapshot.masses[i];

        return { state, masses };
    }
}
