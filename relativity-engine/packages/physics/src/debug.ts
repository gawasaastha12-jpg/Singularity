import { rk4 } from './integrators/rk4';
import { velocityVerlet } from './integrators/verlet';
import { createGravityDerivative } from './forces/gravity';
import { totalEnergy } from './energy/totalEnergy';
import type { StateVector } from './types/state';

const masses = [1e6, 1];
const epsilon = 1e-3;

const derivative = createGravityDerivative(masses, epsilon);

const radius = 100;
const velocity = Math.sqrt((6.67430e-11 * masses[0]) / radius);

const initialState = new Float64Array([
    0, 0, 0, 0,
    radius, 0, 0, velocity
]);

const dt = 10000;
const steps = 20000;

let stateRK4: StateVector = new Float64Array(initialState);
let stateVerlet: StateVector = new Float64Array(initialState);

const initialEnergy = totalEnergy(initialState, masses, epsilon);

let t = 0;

for (let i = 0; i < steps; i++) {
    stateRK4 = rk4(stateRK4, dt, derivative);
    stateVerlet = velocityVerlet(stateVerlet, dt, derivative);
    t += dt;
}

const driftRK4 = Math.abs(totalEnergy(stateRK4, masses, epsilon) - initialEnergy);
const driftVerlet = Math.abs(totalEnergy(stateVerlet, masses, epsilon) - initialEnergy);

console.log('Drift RK4:', driftRK4);
console.log('Drift Verlet:', driftVerlet);
