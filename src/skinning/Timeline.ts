import { Mat3, Mat4, Vec3, Vec4 } from "../lib/TSM.ts";

/* A potential interface that students should implement */
interface ITimeline {
	positionsFlat(): Float32Array;
	indicesFlat(): Uint32Array;
}

/**
 * Represents a Timeline
 */
export class Timeline implements ITimeline {
	// TODO: timeline data structures
	positions: number[];
	indices: number[];
	start: number;
	end: number;

	constructor(times: number[]) {
		// TODO: other initialization
		this.start = -0.8;
		this.end = 0.8;
		this.setVBAs(times);
	}
	/* Returns a flat Float32Array of the timeline's vertex positions */
	public positionsFlat(): Float32Array {
		return new Float32Array(this.positions);
	}

	/**
	 * Returns a flat Uint32Array of the timeline's face indices
	 */
	public indicesFlat(): Uint32Array {
		return new Uint32Array(this.indices);
	}

	public setVBAs(times: number[]) {
		this.positions = [];
		this.indices = [];
		const y = 0.68;
		// push horizontal line points
		this.positions.push(this.start, y, this.end, y);
		this.indices.push(0, 1);

		// push scrubber tick
		// if (time) {
		// 	this.positions.push(this.transform(time), y - 0.15, this.transform(time), y + 0.15);
		// 	this.indices.push(2, 3);
		// }
		times.forEach((t) => {
			const index = this.positions.length / 2;
			const pos = this.transform(t);
			this.positions.push(pos, y - 0.1, pos, y + 0.1);
			this.indices.push(index, index + 1);
		});
	}

	public transform(x: number) {
		return this.start + x * (this.end - this.start);
	}
}
