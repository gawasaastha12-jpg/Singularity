import { Octree } from './octree';
import { traverseForBody } from './deterministicTraversal';
export class BarnesHutContext {
    tree;
    traversalStack;
    constructor(maxBodies) {
        this.tree = new Octree(maxBodies);
        this.traversalStack = new Int32Array(1024);
    }
    evaluateAllForces(state, masses, theta, epsilon, derivatives) {
        const bodyCount = masses.length;
        this.tree.build(state, masses);
        const eps2 = epsilon * epsilon;
        const stack = this.traversalStack;
        // Velocity copies
        for (let i = 0; i < bodyCount; i++) {
            const ix = i * 4;
            derivatives[ix] = state[ix + 2];
            derivatives[ix + 1] = state[ix + 3];
        }
        // Iterative force traversal
        for (let i = 0; i < bodyCount; i++) {
            const ix = i * 4;
            const bx = state[ix];
            const by = state[ix + 1];
            const bz = 0;
            const { ax, ay } = traverseForBody(i, bx, by, bz, this.tree, eps2, theta, stack);
            derivatives[ix + 2] = ax;
            derivatives[ix + 3] = ay;
        }
    }
}
