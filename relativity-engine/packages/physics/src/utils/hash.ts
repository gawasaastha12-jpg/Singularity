export function hashFloat64Array(arr: Float64Array): number {
    // 32-bit FNV-1a over the bytes of the Float64Array
    const uint8View = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
    let hash = 2166136261;
    for (let i = 0; i < uint8View.length; i++) {
        hash ^= uint8View[i];
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
}
