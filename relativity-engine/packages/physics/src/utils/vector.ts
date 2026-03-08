export class Vector {
    private readonly values: number[];

    constructor(values: number[]) {
        this.values = [...values];
    }

    add(other: Vector): Vector {
        if (this.values.length !== other.values.length) {
            throw new Error(`Vector dimension mismatch: ${this.values.length} !== ${other.values.length}`);
        }
        return new Vector(this.values.map((v, i) => v + other.values[i]));
    }

    subtract(other: Vector): Vector {
        if (this.values.length !== other.values.length) {
            throw new Error(`Vector dimension mismatch: ${this.values.length} !== ${other.values.length}`);
        }
        return new Vector(this.values.map((v, i) => v - other.values[i]));
    }

    scale(scalar: number): Vector {
        return new Vector(this.values.map(v => v * scalar));
    }

    dot(other: Vector): number {
        if (this.values.length !== other.values.length) {
            throw new Error(`Vector dimension mismatch: ${this.values.length} !== ${other.values.length}`);
        }
        return this.values.reduce((sum, v, i) => sum + v * other.values[i], 0);
    }

    magnitude(): number {
        return Math.sqrt(this.values.reduce((sum, v) => sum + v * v, 0));
    }

    toArray(): number[] {
        return [...this.values];
    }
}
