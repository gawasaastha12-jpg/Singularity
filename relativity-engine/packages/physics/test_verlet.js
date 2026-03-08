const { rk4 } = require('./dist/integrators/rk4.js');
const { velocityVerlet } = require('./dist/integrators/verlet.js');
const { createGravityDerivative } = require('./dist/forces/gravity.js');
const { totalEnergy } = require('./dist/energy/totalEnergy.js');

const masses = [1e6, 1];
const epsilon = 1e-3;

const derivative = createGravityDerivative(masses, epsilon);

const radius = 100;
const velocity = Math.sqrt((6.67430e-11 * masses[0]) / radius);

const initialState = [
    0, 0, 0, 0,
    radius, 0, 0, velocity
];

const dt = 1;
const steps = 20000;

let stateRK4 = [...initialState];
let stateVerlet = [...initialState];

const initialEnergy = totalEnergy(initialState, masses, epsilon);

let t = 0;

for (let i = 0; i < steps; i++) {
    stateRK4 = rk4(derivative, t, stateRK4, dt);
    stateVerlet = velocityVerlet(derivative, t, stateVerlet, dt);
    t += dt;
}

const driftRK4 = Math.abs(totalEnergy(stateRK4, masses, epsilon) - initialEnergy);
const driftVerlet = Math.abs(totalEnergy(stateVerlet, masses, epsilon) - initialEnergy);

console.log('Drift RK4:', driftRK4);
console.log('Drift Verlet:', driftVerlet);
