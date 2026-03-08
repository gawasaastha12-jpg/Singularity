"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rk4_1 = require("./integrators/rk4");
const verlet_1 = require("./integrators/verlet");
const gravity_1 = require("./forces/gravity");
const totalEnergy_1 = require("./energy/totalEnergy");
const masses = [1e6, 1];
const epsilon = 1e-3;
const derivative = (0, gravity_1.createGravityDerivative)(masses, epsilon);
const radius = 100;
const velocity = Math.sqrt((6.67430e-11 * masses[0]) / radius);
const initialState = [
    0, 0, 0, 0,
    radius, 0, 0, velocity
];
const dt = 10000;
const steps = 20000;
let stateRK4 = [...initialState];
let stateVerlet = [...initialState];
const initialEnergy = (0, totalEnergy_1.totalEnergy)(initialState, masses, epsilon);
let t = 0;
for (let i = 0; i < steps; i++) {
    stateRK4 = (0, rk4_1.rk4)(derivative, t, stateRK4, dt);
    stateVerlet = (0, verlet_1.velocityVerlet)(derivative, t, stateVerlet, dt);
    t += dt;
}
const driftRK4 = Math.abs((0, totalEnergy_1.totalEnergy)(stateRK4, masses, epsilon) - initialEnergy);
const driftVerlet = Math.abs((0, totalEnergy_1.totalEnergy)(stateVerlet, masses, epsilon) - initialEnergy);
console.log('Drift RK4:', driftRK4);
console.log('Drift Verlet:', driftVerlet);
