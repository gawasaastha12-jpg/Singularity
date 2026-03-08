import { describe, it, expect } from "vitest";
import { Vector } from "../../packages/physics/src/utils/vector";
describe("Vector", () => {
    it("should add two vectors", () => {
        const v1 = new Vector([1, 2, 3]);
        const v2 = new Vector([4, 5, 6]);
        expect(v1.add(v2).toArray()).toEqual([5, 7, 9]);
    });
    it("should subtract two vectors", () => {
        const v1 = new Vector([5, 7, 9]);
        const v2 = new Vector([4, 5, 6]);
        expect(v1.subtract(v2).toArray()).toEqual([1, 2, 3]);
    });
    it("should scale a vector", () => {
        const v1 = new Vector([1, 2, 3]);
        expect(v1.scale(2).toArray()).toEqual([2, 4, 6]);
    });
    it("should calculate dot product", () => {
        const v1 = new Vector([1, 2, 3]);
        const v2 = new Vector([4, -5, 6]);
        expect(v1.dot(v2)).toBe(12);
    });
    it("should calculate magnitude", () => {
        const v1 = new Vector([3, 4]);
        expect(v1.magnitude()).toBe(5);
    });
    it("should throw error on dimension mismatch", () => {
        const v1 = new Vector([1, 2]);
        const v2 = new Vector([1, 2, 3]);
        expect(() => v1.add(v2)).toThrowError("Vector dimension mismatch: 2 !== 3");
        expect(() => v1.subtract(v2)).toThrowError("Vector dimension mismatch: 2 !== 3");
        expect(() => v1.dot(v2)).toThrowError("Vector dimension mismatch: 2 !== 3");
    });
    it("should not mutate original vector", () => {
        const originalArray = [1, 2, 3];
        const v = new Vector(originalArray);
        originalArray[0] = 999;
        expect(v.toArray()[0]).toBe(1);
    });
    it("toArray should return a copy", () => {
        const v = new Vector([1, 2, 3]);
        const arr = v.toArray();
        arr[0] = 999;
        expect(v.toArray()[0]).toBe(1);
    });
});
