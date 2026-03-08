export class Vector {
    values;
    constructor(values) {
        this.values = [...values];
    }
    add(other) {
        if (this.values.length !== other.values.length) {
            throw new Error(`Vector dimension mismatch: ${this.values.length} !== ${other.values.length}`);
        }
        return new Vector(this.values.map((v, i) => v + other.values[i]));
    }
    subtract(other) {
        if (this.values.length !== other.values.length) {
            throw new Error(`Vector dimension mismatch: ${this.values.length} !== ${other.values.length}`);
        }
        return new Vector(this.values.map((v, i) => v - other.values[i]));
    }
    scale(scalar) {
        return new Vector(this.values.map(v => v * scalar));
    }
    dot(other) {
        if (this.values.length !== other.values.length) {
            throw new Error(`Vector dimension mismatch: ${this.values.length} !== ${other.values.length}`);
        }
        return this.values.reduce((sum, v, i) => sum + v * other.values[i], 0);
    }
    magnitude() {
        return Math.sqrt(this.values.reduce((sum, v) => sum + v * v, 0));
    }
    toArray() {
        return [...this.values];
    }
}
