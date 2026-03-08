let currentSeed = 12345;
export function setSeed(seed) {
    currentSeed = seed;
}
export function getSeed() {
    return currentSeed;
}
/**
 * Mulberry32 is a fast, high-quality 32-bit PRNG.
 */
export function random() {
    let t = (currentSeed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
/**
 * Box-Muller transform for Gaussian distribution.
 */
export function randomGaussian() {
    const u = 1 - random();
    const v = random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
