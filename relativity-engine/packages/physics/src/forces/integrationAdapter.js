import { BarnesHutContext } from './bhForce';
export function createBarnesHutDerivative(masses, epsilon = 0, theta = 0.5) {
    const bodyCount = masses.length;
    // Preallocate context heavily exactly once per generated derivative closure
    const bhContext = new BarnesHutContext(bodyCount);
    // We expect the engine to provide the `out` array.
    // If we need an internal one for some reason, we could keep it, 
    // but the closure now directly evaluates into the provided `out` StateVector.
    return (state, out) => {
        // Evaluate O(N log N) force destructively into provided derivatives array
        bhContext.evaluateAllForces(state, masses, theta, epsilon, out);
    };
}
