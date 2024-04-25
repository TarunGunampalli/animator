import { Mat3, Mat4, Vec3, Vec4 } from "../lib/TSM.ts";

/* A potential interface that students should implement */
interface ICylinder {
	positionsFlat(): Float32Array;
	indicesFlat(): Uint32Array;
}

/**
 * Represents a Cylinder
 */
export class Cylinder implements ICylinder {
	// TODO: cylinder data structures
	positions: number[];
	indices: number[];
	draw: boolean;

	constructor() {
		// TODO: other initialization
		this.positions = [];
		this.indices = [];
		this.setVBAs();
	}

	public setDraw(d: boolean) {
		this.draw = d;
	}

	/* Returns a flat Float32Array of the cylinder's vertex positions */
	public positionsFlat(): Float32Array {
		return new Float32Array(this.positions);
	}

	/**
	 * Returns a flat Uint32Array of the cylinder's face indices
	 */
	public indicesFlat(): Uint32Array {
		return new Uint32Array(this.indices);
	}

	/**
	 * Returns the model matrix of the cylinder
	 */
	public uMatrix(): Mat4 {
		// TODO: change this, if it's useful
		const ret: Mat4 = new Mat4().setIdentity();

		return ret;
	}

	private setVBAs() {
		const n = 6;
		const inc = (2 * Math.PI) / n;
		this.positions.push(0, 0, 0, 0, 0, 0.5, 0, 0, 0, 1, 0, 0);
		for (let theta = inc; theta <= 2 * Math.PI; theta += inc) {
			const s = this.positions.length / 4;
			this.positions.push(theta, 0, 0, 0, theta, 0.5, 0, 0, theta, 1, 0, 0);
			[0, 1, 1, 2, 3, 4, 4, 5, 0, 3, 1, 4, 2, 5].forEach((i) => this.indices.push(s - 3 + i));
		}
	}
}
