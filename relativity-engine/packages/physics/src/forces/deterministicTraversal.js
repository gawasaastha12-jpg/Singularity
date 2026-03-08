import { G } from '../constants/physicalConstants';
export let audit_totalNodesVisited = 0;
export let audit_approximationsPerformed = 0;
export let audit_exactInteractions = 0;
export function resetAuditCounters() {
    audit_totalNodesVisited = 0;
    audit_approximationsPerformed = 0;
    audit_exactInteractions = 0;
}
export function traverseForBody(i, bx, by, bz, tree, eps2, theta, stack) {
    let ax = 0;
    let ay = 0;
    let top = 0;
    stack[top++] = 0; // push root node (index 0)
    while (top > 0) {
        const nodeIdx = stack[--top];
        audit_totalNodesVisited++;
        const dx = tree.comX[nodeIdx] - bx;
        const dy = tree.comY[nodeIdx] - by;
        const dz = tree.comZ[nodeIdx] - bz;
        const distSq = dx * dx + dy * dy + dz * dz + eps2;
        const distance = Math.sqrt(distSq);
        const isLeaf = tree.bodyIndex[nodeIdx] !== -1;
        const nodeHalfSize = tree.halfSize[nodeIdx];
        if (isLeaf || ((nodeHalfSize / distance) < theta)) {
            if (isLeaf && tree.bodyIndex[nodeIdx] === i) {
                continue;
            }
            if (isLeaf) {
                audit_exactInteractions++;
            }
            else {
                audit_approximationsPerformed++;
            }
            const m = tree.mass[nodeIdx];
            const invDist = 1 / distance;
            const invDist3 = invDist * invDist * invDist;
            const forceStr = G * m * invDist3;
            ax += forceStr * dx;
            ay += forceStr * dy;
        }
        else {
            const cBase = nodeIdx * 8;
            for (let c = 7; c >= 0; c--) {
                const childIdx = tree.child[cBase + c];
                if (childIdx !== -1) {
                    stack[top++] = childIdx;
                }
            }
        }
    }
    return { ax, ay };
}
