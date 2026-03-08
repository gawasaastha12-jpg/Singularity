// Preallocated Flat-Array Octree
export class Octree {
    maxNodes;
    nodeCount;
    centerX;
    centerY;
    centerZ;
    halfSize;
    mass;
    comX;
    comY;
    comZ;
    // child[nodeIndex * 8 + octant]
    child;
    // bodyIndex[nodeIndex] holds the inserted body id if leaf, or -1 if internal
    bodyIndex;
    constructor(maxBodies) {
        // Safe upper bound for octree node count
        this.maxNodes = Math.max(8 * maxBodies, 1024);
        this.centerX = new Float64Array(this.maxNodes);
        this.centerY = new Float64Array(this.maxNodes);
        this.centerZ = new Float64Array(this.maxNodes);
        this.halfSize = new Float64Array(this.maxNodes);
        this.mass = new Float64Array(this.maxNodes);
        this.comX = new Float64Array(this.maxNodes);
        this.comY = new Float64Array(this.maxNodes);
        this.comZ = new Float64Array(this.maxNodes);
        this.child = new Int32Array(this.maxNodes * 8);
        this.bodyIndex = new Int32Array(this.maxNodes);
        this.nodeCount = 0;
    }
    build(state, masses) {
        this.nodeCount = 0;
        const bodyCount = masses.length;
        if (bodyCount === 0)
            return;
        // 1) Find bounds
        let minX = state[0], maxX = state[0];
        let minY = state[1], maxY = state[1];
        // Note: z is implicitly 0 if 2D, but we must be fully 3D compatible.
        // Assuming flat state is [x, y, vx, vy] for 2D, but prompt has Z in COM.
        // Engine so far uses `jx = j*4; jy = jx+1;` for forces. Wait, the force code earlier didn't use Z.
        // The previous baseline gravity.ts: dx = state[jx]-xi, dy = state[jy]-yi.
        // In the prompt: 0: (-x, -y, -z) ... 7: (+x, +y, +z). So we MUST assume full 3D coordinates, OR if the engine is purely 2D, we just keep z = 0.
        // The prompt says: const bz = ... so it might be 3D. The benchmark generator sets z=0 implicitly?
        // Wait, generateDeterministicBodies in benchmark.ts sets ix..ix+3. No Z!
        // But prompt explicitly requires 0-7 octant 3D splitting structure.
        // Let's implement full 3D, if z is missing from state, it's 0.
        // If state is [x, y, vx, vy], there are no Z coordinates in the standard 4-vector state.
        // Let's read Z as 0 if array doesn't have it, but for n-body we might need to assume 3D geometry.
        // Wait, state.length === bodyCount * 4. So Z is never set!
        // Let's just treat Z as 0.
        let minZ = 0, maxZ = 0;
        for (let i = 1; i < bodyCount; i++) {
            const ix = i * 4;
            const x = state[ix];
            const y = state[ix + 1];
            if (x < minX)
                minX = x;
            if (x > maxX)
                maxX = x;
            if (y < minY)
                minY = y;
            if (y > maxY)
                maxY = y;
        }
        const dx = maxX - minX;
        const dy = maxY - minY;
        const dz = maxZ - minZ;
        const maxSpan = Math.max(dx, dy, dz);
        const halfSize = maxSpan * 0.5;
        const centerX = minX + halfSize;
        const centerY = minY + halfSize;
        const centerZ = minZ + halfSize;
        // Allocate root
        this.allocNode(centerX, centerY, centerZ, halfSize);
        // Strict insertion order
        for (let i = 0; i < bodyCount; i++) {
            this.insert(i, state);
        }
        // Compute COM iteratively (post-order traversal)
        this.computeCOM(state, masses);
    }
    allocNode(cx, cy, cz, hs) {
        if (this.nodeCount >= this.maxNodes) {
            throw new Error('Octree max nodes exceeded. Increase preallocated capacity.');
        }
        const idx = this.nodeCount++;
        this.centerX[idx] = cx;
        this.centerY[idx] = cy;
        this.centerZ[idx] = cz;
        this.halfSize[idx] = hs;
        this.mass[idx] = 0;
        this.comX[idx] = 0;
        this.comY[idx] = 0;
        this.comZ[idx] = 0;
        this.bodyIndex[idx] = -1;
        const cBase = idx * 8;
        for (let i = 0; i < 8; i++) {
            this.child[cBase + i] = -1;
        }
        return idx;
    }
    getOctant(nodeIdx, x, y, z) {
        let octant = 0;
        if (x >= this.centerX[nodeIdx])
            octant |= 1;
        if (y >= this.centerY[nodeIdx])
            octant |= 2;
        if (z >= this.centerZ[nodeIdx])
            octant |= 4;
        return octant;
    }
    insert(bodyId, state) {
        const ix = bodyId * 4;
        const bx = state[ix];
        const by = state[ix + 1];
        const bz = 0; // State is 2D in this engine (x, y, vx, vy)
        let currNode = 0;
        // Iterative descent
        while (true) {
            const occupyingBody = this.bodyIndex[currNode];
            if (occupyingBody === -1) {
                // Determine if this is a leaf without bodies or internal node
                let isInternal = false;
                const cBase = currNode * 8;
                for (let i = 0; i < 8; i++) {
                    if (this.child[cBase + i] !== -1) {
                        isInternal = true;
                        break;
                    }
                }
                if (!isInternal) {
                    // Empty leaf, place body here
                    this.bodyIndex[currNode] = bodyId;
                    return;
                }
                else {
                    // Internal node, descend
                    const octant = this.getOctant(currNode, bx, by, bz);
                    if (this.child[cBase + octant] === -1) {
                        const hs = this.halfSize[currNode] * 0.5;
                        const ncx = this.centerX[currNode] + (octant & 1 ? hs : -hs);
                        const ncy = this.centerY[currNode] + (octant & 2 ? hs : -hs);
                        const ncz = this.centerZ[currNode] + (octant & 4 ? hs : -hs);
                        this.child[cBase + octant] = this.allocNode(ncx, ncy, ncz, hs);
                    }
                    currNode = this.child[cBase + octant];
                }
            }
            else {
                // Occupied leaf node - must split and redistribute the existing body and the new body
                const exBody = occupyingBody;
                this.bodyIndex[currNode] = -1; // Node becomes internal
                const exX = state[exBody * 4];
                const exY = state[exBody * 4 + 1];
                const exZ = 0;
                // Push existing body down
                const exOctant = this.getOctant(currNode, exX, exY, exZ);
                const cBase = currNode * 8;
                const hs = this.halfSize[currNode] * 0.5;
                const eNcX = this.centerX[currNode] + (exOctant & 1 ? hs : -hs);
                const eNcY = this.centerY[currNode] + (exOctant & 2 ? hs : -hs);
                const eNcZ = this.centerZ[currNode] + (exOctant & 4 ? hs : -hs);
                const newExNode = this.allocNode(eNcX, eNcY, eNcZ, hs);
                this.child[cBase + exOctant] = newExNode;
                this.bodyIndex[newExNode] = exBody;
                // Now attempt to place the new body. We continue the loop so it re-evaluates the split node
            }
        }
    }
    computeCOM(state, masses) {
        // Evaluate COM using an explicit stack for strict post-order traversal without recursion
        // A flat Int32Array stack is 100% adequate. Depth is bounded by precision (e.g. 100 is far more than enough)
        const stack = new Int32Array(this.nodeCount * 2);
        let top = 0;
        // Push root initialized with phase 0 (visiting)
        stack[top++] = 0; // nodeIdx
        stack[top++] = 0; // phase
        while (top > 0) {
            const phase = stack[--top];
            const n = stack[--top];
            if (phase === 0) {
                // Pre-process: push self as phase 1 (compute), then push children
                stack[top++] = n;
                stack[top++] = 1;
                const cBase = n * 8;
                for (let i = 0; i < 8; i++) {
                    const childIdx = this.child[cBase + i];
                    if (childIdx !== -1) {
                        stack[top++] = childIdx;
                        stack[top++] = 0;
                    }
                }
            }
            else {
                // Post-process: children already computed
                const bodyId = this.bodyIndex[n];
                if (bodyId !== -1) {
                    // Leaf node
                    const m = masses[bodyId];
                    const ix = bodyId * 4;
                    this.mass[n] = m;
                    this.comX[n] = state[ix];
                    this.comY[n] = state[ix + 1];
                    this.comZ[n] = 0;
                }
                else {
                    // Internal node, sum from children
                    let tm = 0;
                    let tx = 0;
                    let ty = 0;
                    let tz = 0;
                    const cBase = n * 8;
                    for (let i = 0; i < 8; i++) { // Strict 0-7 loop order
                        const childIdx = this.child[cBase + i];
                        if (childIdx !== -1) {
                            const cm = this.mass[childIdx];
                            tm += cm;
                            tx += this.comX[childIdx] * cm;
                            ty += this.comY[childIdx] * cm;
                            tz += this.comZ[childIdx] * cm;
                        }
                    }
                    this.mass[n] = tm;
                    if (tm > 0) {
                        this.comX[n] = tx / tm;
                        this.comY[n] = ty / tm;
                        this.comZ[n] = tz / tm;
                    }
                }
            }
        }
    }
    exportBoundingBoxes(maxDepth, maxBoxes) {
        // We will output [cx, cy, cz, halfSize] for each node up to maxBoxes
        if (this.nodeCount === 0)
            return new Float32Array(0);
        const out = new Float32Array(maxBoxes * 4);
        let outIdx = 0;
        // Queue for BFS: [nodeIdx, depth]
        // Safe max size: bounding to maxNodes
        const queue = new Int32Array(this.nodeCount * 2);
        let head = 0;
        let tail = 0;
        queue[tail++] = 0; // Root nodeIdx
        queue[tail++] = 0; // Root depth
        while (head < tail && outIdx < maxBoxes * 4) {
            const n = queue[head++];
            const depth = queue[head++];
            out[outIdx++] = this.centerX[n];
            out[outIdx++] = this.centerY[n];
            out[outIdx++] = this.centerZ[n];
            out[outIdx++] = this.halfSize[n];
            if (depth < maxDepth) {
                const cBase = n * 8;
                for (let i = 0; i < 8; i++) {
                    const childIdx = this.child[cBase + i];
                    if (childIdx !== -1) {
                        queue[tail++] = childIdx;
                        queue[tail++] = depth + 1;
                    }
                }
            }
        }
        // Return precisely sliced array
        return out.slice(0, outIdx);
    }
}
