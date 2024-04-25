import { Debugger } from "../lib/webglutils/Debugging.ts";
import { CanvasAnimation, WebGLUtilities } from "../lib/webglutils/CanvasAnimation.ts";
import { Floor } from "../lib/webglutils/Floor.ts";
import { GUI, Mode } from "./Gui.ts";
import {
	sceneFSText,
	sceneFSTextureText,
	sceneVSText,
	floorFSText,
	floorVSText,
	skeletonFSText,
	skeletonVSText,
	sBackVSText,
	sBackFSText,
	cylinderVSText,
	cylinderFSText,
	keyFramesFSText,
	keyFramesVSText,
	timelineFSText,
	timelineVSText,
	scrubberFSText,
	scrubberVSText,
} from "./Shaders.ts";
import { Mat4, Vec4, Vec3, Quat, Vec2 } from "../lib/TSM.ts";
import { CLoader } from "./AnimationFileLoader.ts";
import { RenderPass } from "../lib/webglutils/RenderPass.ts";
import { Camera } from "../lib/webglutils/Camera.ts";
import { Cylinder } from "./Cylinder.ts";
import { Timeline } from "./Timeline.ts";
import { KeyframeTrack } from "../lib/threejs/src/Three";

export class SkinningAnimation extends CanvasAnimation {
	private gui: GUI;
	private millis: number;

	private loadedScene: string;

	/* Floor Rendering Info */
	private floor: Floor;
	public floorRenderPass: RenderPass;

	/* Scene rendering info */
	private scene: CLoader;
	private sceneRenderPass: RenderPass;

	/* Skeleton rendering info */
	private skeletonRenderPass: RenderPass;

	/* Cylinder rendering info */
	public cylinder: Cylinder;
	public cylinderRenderPass: RenderPass;

	/* Scrub bar background rendering info */
	private sBackRenderPass: RenderPass;

	/* Timeline rendering info */
	private timeline: Timeline;
	private timelineRenderPass: RenderPass;
	public times: number[];
	public lockedTimes: boolean[];
	private scrubberRenderPass: RenderPass;

	private static readonly hoverColor = [0, 1, 0, 0.5];
	private static readonly selectedColor = [0, 1, 0, 1];
	private static readonly timelineColor = [1, 1, 1, 1];
	private static readonly lockedColor = [1, 0, 0, 1];

	/* Global Rendering Info */
	private lightPosition: Vec4;
	private backgroundColor: Vec4;

	/* Key Frames rendering info */
	public keyFramesRenderPass: RenderPass;
	public keyFrameRenderPasses: RenderPass[];
	public keyFrameStart: number;
	public static readonly panelWidth = 320;
	public static readonly panelHeight = 800;
	public static readonly frameWidth = 260;
	public static readonly frameHeight = 195;
	public static readonly framePadding = 25;
	public static readonly w = SkinningAnimation.frameWidth / SkinningAnimation.panelWidth;
	public static readonly h = (2 * SkinningAnimation.frameHeight) / SkinningAnimation.panelHeight;
	public static readonly p = (2 * SkinningAnimation.framePadding) / SkinningAnimation.panelHeight;

	private canvas2d: HTMLCanvasElement;
	private ctx2: CanvasRenderingContext2D | null;

	public toast: Function;

	constructor(canvas: HTMLCanvasElement, toast: Function) {
		super(canvas);

		this.canvas2d = document.getElementById("textCanvas") as HTMLCanvasElement;
		this.ctx2 = this.canvas2d.getContext("2d");
		if (this.ctx2) {
			this.ctx2.font = "25px serif";
			this.ctx2.fillStyle = "#ffffffff";
		}

		this.ctx = Debugger.makeDebugContext(this.ctx);
		let gl = this.ctx;

		this.times = [];
		this.lockedTimes = [];

		this.floor = new Floor();
		this.cylinder = new Cylinder();
		this.timeline = new Timeline(this.times);

		this.floorRenderPass = new RenderPass(this.extVAO, gl, floorVSText, floorFSText);
		this.sceneRenderPass = new RenderPass(this.extVAO, gl, sceneVSText, sceneFSText);
		this.skeletonRenderPass = new RenderPass(this.extVAO, gl, skeletonVSText, skeletonFSText);
		this.cylinderRenderPass = new RenderPass(this.extVAO, gl, cylinderVSText, cylinderFSText);

		this.gui = new GUI(this.canvas2d, this, canvas);
		this.lightPosition = new Vec4([-10, 10, -10, 1]);
		this.backgroundColor = new Vec4([0.0, 0.37254903, 0.37254903, 1.0]);

		this.initFloor();
		this.scene = new CLoader("");

		// Status bar
		this.sBackRenderPass = new RenderPass(this.extVAO, gl, sBackVSText, sBackFSText);
		this.timelineRenderPass = new RenderPass(this.extVAO, gl, timelineVSText, timelineFSText);
		this.scrubberRenderPass = new RenderPass(this.extVAO, gl, scrubberVSText, scrubberFSText);

		// TODO
		// Other initialization, for instance, for the bone highlighting
		this.keyFrameStart = 1;

		this.toast = toast;

		this.initGui();

		this.millis = new Date().getTime();
	}

	public getScene(): CLoader {
		return this.scene;
	}

	/**
	 * Setup the animation. This can be called again to reset the animation.
	 */
	public reset(): void {
		this.gui.reset();
		this.keyFrameStart = 1;
		this.setScene(this.loadedScene);
	}

	public initGui(): void {
		// Status bar background
		let verts = new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]);
		this.sBackRenderPass.setIndexBufferData(new Uint32Array([1, 0, 2, 2, 0, 3]));
		this.sBackRenderPass.addAttribute("vertPosition", 2, this.ctx.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, verts);

		this.sBackRenderPass.setDrawData(this.ctx.TRIANGLES, 6, this.ctx.UNSIGNED_INT, 0);
		this.sBackRenderPass.setup();

		this.scrubberRenderPass.setIndexBufferData(new Uint32Array([0, 1]));
		this.scrubberRenderPass.addAttribute(
			"vertPosition",
			3,
			this.ctx.FLOAT,
			false,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			new Float32Array([0, 0.53, 1, 0, 0.83, 1])
		);
		this.scrubberRenderPass.setDrawData(this.ctx.LINES, 2, this.ctx.UNSIGNED_INT, 0);

		this.cylinderRenderPass.setIndexBufferData(this.cylinder.indicesFlat());
		this.cylinderRenderPass.addAttribute(
			"aVertPos",
			4,
			this.ctx.FLOAT,
			false,
			4 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			this.cylinder.positionsFlat()
		);
		this.cylinderRenderPass.addUniform("uProj", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
		});
		this.cylinderRenderPass.addUniform("uView", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
		});
		this.cylinderRenderPass.setDrawData(this.ctx.LINES, this.cylinder.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
	}

	public initScene(): void {
		if (this.scene.meshes.length === 0) {
			return;
		}
		this.times = [];
		this.lockedTimes = [];
		this.gui.reset();
		this.initModel();
		this.initSkeleton();
		this.initKeyFrames();
		this.initTimeline();
	}

	/**
	 * Sets up the mesh and mesh drawing
	 */
	public initModel(): void {
		this.sceneRenderPass = new RenderPass(this.extVAO, this.ctx, sceneVSText, sceneFSText);

		let faceCount = this.scene.meshes[0].geometry.position.count / 3;
		let fIndices = new Uint32Array(faceCount * 3);
		for (let i = 0; i < faceCount * 3; i += 3) {
			fIndices[i] = i;
			fIndices[i + 1] = i + 1;
			fIndices[i + 2] = i + 2;
		}
		this.sceneRenderPass.setIndexBufferData(fIndices);

		this.sceneRenderPass.addAttribute(
			"vertPosition",
			3,
			this.ctx.FLOAT,
			false,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			this.scene.meshes[0].geometry.position.values
		);
		this.sceneRenderPass.addAttribute(
			"aNorm",
			3,
			this.ctx.FLOAT,
			false,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			this.scene.meshes[0].geometry.normal.values
		);
		if (this.scene.meshes[0].geometry.uv) {
			this.sceneRenderPass.addAttribute(
				"aUV",
				2,
				this.ctx.FLOAT,
				false,
				2 * Float32Array.BYTES_PER_ELEMENT,
				0,
				undefined,
				this.scene.meshes[0].geometry.uv.values
			);
		} else {
			this.sceneRenderPass.addAttribute(
				"aUV",
				2,
				this.ctx.FLOAT,
				false,
				2 * Float32Array.BYTES_PER_ELEMENT,
				0,
				undefined,
				new Float32Array(this.scene.meshes[0].geometry.normal.values.length)
			);
		}
		this.sceneRenderPass.addAttribute(
			"skinIndices",
			4,
			this.ctx.FLOAT,
			false,
			4 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			this.scene.meshes[0].geometry.skinIndex.values
		);
		this.sceneRenderPass.addAttribute(
			"skinWeights",
			4,
			this.ctx.FLOAT,
			false,
			4 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			this.scene.meshes[0].geometry.skinWeight.values
		);
		this.sceneRenderPass.addAttribute(
			"v0",
			3,
			this.ctx.FLOAT,
			false,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			this.scene.meshes[0].geometry.v0.values
		);
		this.sceneRenderPass.addAttribute(
			"v1",
			3,
			this.ctx.FLOAT,
			false,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			this.scene.meshes[0].geometry.v1.values
		);
		this.sceneRenderPass.addAttribute(
			"v2",
			3,
			this.ctx.FLOAT,
			false,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			this.scene.meshes[0].geometry.v2.values
		);
		this.sceneRenderPass.addAttribute(
			"v3",
			3,
			this.ctx.FLOAT,
			false,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			this.scene.meshes[0].geometry.v3.values
		);

		this.sceneRenderPass.addUniform("lightPosition", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniform4fv(loc, this.lightPosition.xyzw);
		});
		this.sceneRenderPass.addUniform("mWorld", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(new Mat4().setIdentity().all()));
		});
		this.sceneRenderPass.addUniform("mProj", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
		});
		this.sceneRenderPass.addUniform("mView", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
		});
		this.sceneRenderPass.addUniform("jTrans", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniform3fv(loc, this.scene.meshes[0].getBoneTranslations());
		});
		this.sceneRenderPass.addUniform("jRots", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniform4fv(loc, this.scene.meshes[0].getBoneRotations());
		});
		if (this.scene.meshes[0].imgSrc) {
			this.sceneRenderPass.addTextureMap(this.scene.meshes[0].imgSrc, sceneVSText, sceneFSTextureText);
		}
		this.sceneRenderPass.setDrawData(this.ctx.TRIANGLES, this.scene.meshes[0].geometry.position.count, this.ctx.UNSIGNED_INT, 0);
		this.sceneRenderPass.setup();
	}

	/**
	 * Sets up the skeleton drawing
	 */
	public initSkeleton(): void {
		this.skeletonRenderPass.setIndexBufferData(this.scene.meshes[0].getBoneIndices());

		this.skeletonRenderPass.addAttribute(
			"vertPosition",
			3,
			this.ctx.FLOAT,
			false,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			this.scene.meshes[0].getBonePositions()
		);
		this.skeletonRenderPass.addAttribute(
			"boneIndex",
			1,
			this.ctx.FLOAT,
			false,
			1 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			this.scene.meshes[0].getBoneIndexAttribute()
		);

		this.skeletonRenderPass.addUniform("mWorld", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
		});
		this.skeletonRenderPass.addUniform("mProj", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
		});
		this.skeletonRenderPass.addUniform("mView", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
		});
		this.skeletonRenderPass.addUniform("bTrans", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniform3fv(loc, this.getScene().meshes[0].getBoneTranslations());
		});
		this.skeletonRenderPass.addUniform("bRots", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniform4fv(loc, this.getScene().meshes[0].getBoneRotations());
		});

		this.skeletonRenderPass.setDrawData(this.ctx.LINES, this.scene.meshes[0].getBoneIndices().length, this.ctx.UNSIGNED_INT, 0);
		this.skeletonRenderPass.setup();
	}

	/**
	 * Sets up the floor drawing
	 */
	public initFloor(): void {
		this.floorRenderPass.setIndexBufferData(this.floor.indicesFlat());
		this.floorRenderPass.addAttribute("aVertPos", 4, this.ctx.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.floor.positionsFlat());

		this.floorRenderPass.addUniform("uLightPos", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniform4fv(loc, this.lightPosition.xyzw);
		});
		this.floorRenderPass.addUniform("uWorld", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
		});
		this.floorRenderPass.addUniform("uProj", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
		});
		this.floorRenderPass.addUniform("uView", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
		});
		this.floorRenderPass.addUniform("uProjInv", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().inverse().all()));
		});
		this.floorRenderPass.addUniform("uViewInv", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().inverse().all()));
		});

		this.floorRenderPass.setDrawData(this.ctx.TRIANGLES, this.floor.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
		this.floorRenderPass.setup();
	}

	/**
	 * Sets up the cylinder drawing
	 */
	public initCylinder(scale: Mat4, rot: Quat, trans: Mat4): void {
		this.cylinderRenderPass.addUniform("uScale", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(scale.all()));
		});
		this.cylinderRenderPass.addUniform("uRot", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniform4fv(loc, new Float32Array(rot.xyzw));
		});
		this.cylinderRenderPass.addUniform("uTrans", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(trans.all()));
		});

		this.cylinderRenderPass.setup();
	}

	/**
	 * Sets up the key frames drawing
	 */
	public initKeyFrames(): void {
		const gui = this.getGUI();
		const numFrames = gui.getNumKeyFrames();

		this.keyFrameRenderPasses = [];

		for (let i = 0; i < numFrames; i++) {
			this.initKeyFrame(i);
		}
	}

	public initKeyFrame(index: number) {
		const gui = this.getGUI();
		const w = SkinningAnimation.frameWidth / SkinningAnimation.panelWidth;
		const h = (2 * SkinningAnimation.frameHeight) / SkinningAnimation.panelHeight;
		const p = (2 * SkinningAnimation.framePadding) / SkinningAnimation.panelHeight;
		const keyFrames = gui.keyFrames;
		const keyFrameRenderPass = new RenderPass(this.extVAO, this.ctx, keyFramesVSText, keyFramesFSText);
		const origin = index === gui.selectedKeyFrame && gui.dragging ? gui.selectedOrigin : new Vec2([-w, this.keyFrameStart - (index + 1) * (p + h)]);
		const positionsFlat = [origin.x, origin.y + h, origin.x, origin.y, origin.x + 2 * w, origin.y + h, origin.x + 2 * w, origin.y];
		const indicesFlat = [0, 1, 2, 2, 1, 3];
		keyFrameRenderPass.addTexture(keyFrames[index].texture);
		keyFrameRenderPass.addUniform("w", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniform1f(loc, index === gui.selectedKeyFrame ? 0.6 : 1);
		});
		keyFrameRenderPass.setIndexBufferData(new Uint32Array(indicesFlat));
		keyFrameRenderPass.addUniform("origin", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniform2fv(loc, new Float32Array(origin.xy));
		});
		keyFrameRenderPass.addAttribute(
			"vertPosition",
			2,
			this.ctx.FLOAT,
			false,
			2 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			new Float32Array(positionsFlat)
		);

		keyFrameRenderPass.setDrawData(this.ctx.TRIANGLES, indicesFlat.length, this.ctx.UNSIGNED_INT, 0);
		keyFrameRenderPass.setup();
		this.keyFrameRenderPasses[index] = keyFrameRenderPass;
	}

	public renderTexture() {
		const gl = this.ctx;
		const targetTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, targetTexture);
		// define size and format of level 0
		const level = 0;
		const internalFormat = gl.RGBA;
		const border = 0;
		const format = gl.RGBA;
		const type = gl.UNSIGNED_BYTE;
		const data = null;
		gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, SkinningAnimation.frameWidth, SkinningAnimation.frameHeight, border, format, type, data);

		// set the filtering so we don't need mips
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		// Create and bind the framebuffer
		const fb = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

		// attach the texture as the first color attachment
		const attachmentPoint = gl.COLOR_ATTACHMENT0;
		gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);

		var renderbuffer = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SkinningAnimation.frameWidth, SkinningAnimation.frameHeight);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

		const bg: Vec4 = this.backgroundColor;
		gl.clearColor(bg.r, bg.g, bg.b, bg.a);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.CULL_FACE);
		gl.enable(gl.DEPTH_TEST);
		gl.frontFace(gl.CCW);
		gl.cullFace(gl.BACK);

		this.drawScene(0, 0, 260, 195);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.deleteFramebuffer(fb);
		return targetTexture;
	}

	public initTimeline() {
		this.timelineRenderPass = new RenderPass(this.extVAO, this.ctx, timelineVSText, timelineFSText);
		this.timeline.setVBAs(this.times);
		this.timelineRenderPass.setIndexBufferData(this.timeline.indicesFlat());
		this.timelineRenderPass.addAttribute(
			"vertPosition",
			2,
			this.ctx.FLOAT,
			false,
			2 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			this.timeline.positionsFlat()
		);
		const colorIndices: number[] = [];
		for (let i = 0; i <= this.times.length + 1; i++) colorIndices.push(i, i);
		this.timelineRenderPass.addAttribute("index", 1, this.ctx.FLOAT, false, Float32Array.BYTES_PER_ELEMENT, 0, undefined, new Float32Array(colorIndices));
		const selected = this.getGUI().selectedKeyFrame === -1 ? -1 : (this.timeline.transform(this.times[this.getGUI().selectedKeyFrame]) / 2 + 0.4) * 1.25;
		const hovered = this.getGUI().hoveredTick === -1 ? -1 : (this.timeline.transform(this.times[this.getGUI().hoveredTick]) / 2 + 0.4) * 1.25;
		const colors = [...SkinningAnimation.timelineColor];
		this.times.forEach((t, i) => {
			if (Math.abs(t - selected) < 0.0001) {
				colors.push(...SkinningAnimation.selectedColor);
			} else if (Math.abs(t - hovered) < 0.0001) {
				colors.push(...SkinningAnimation.hoverColor);
			} else if (this.lockedTimes[i]) {
				colors.push(...SkinningAnimation.lockedColor);
			} else {
				colors.push(...SkinningAnimation.timelineColor);
			}
		});
		this.timelineRenderPass.addUniform("colors", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniform4fv(loc, new Float32Array(colors));
		});
		this.timelineRenderPass.setDrawData(this.ctx.LINES, this.timeline.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
		this.timelineRenderPass.setup();
	}

	public setTime(index: number, time: number) {
		if (index <= 0 || index >= this.times.length - 1) return;
		const curTime = this.times[index];
		let prevIndex;
		for (let i = index; i >= 0; i--) {
			if (this.lockedTimes[i]) {
				prevIndex = i;
				break;
			}
		}
		const p = this.times[prevIndex];
		const nextIndex = this.times.findIndex((t, i) => i > index && this.lockedTimes[i]);
		const n = this.times[nextIndex];
		if (time < p || time > n) return;
		const prevScale = (time - p) / (curTime - p);
		const nextScale = (n - time) / (n - curTime);
		this.times.forEach((t, i) => {
			if (i <= prevIndex || i >= nextIndex) return;
			if (i <= index) {
				this.times[i] = p + (t - p) * prevScale;
			} else {
				this.times[i] = n - (n - t) * nextScale;
			}
		});
		this.initTimeline();
	}

	public initScrubber() {
		const time = this.timeline.transform(this.getGUI().getScrubberTime());
		this.scrubberRenderPass.addUniform("trans", (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix3fv(loc, false, new Float32Array([1, 0, 0, 0, 1, 0, time, 0, 1]));
		});
		this.scrubberRenderPass.setup();
	}

	/** @internal
	 * Draws a single frame
	 *
	 */
	public draw(): void {
		const GUI = this.getGUI();

		// Advance to the next time step
		let curr = new Date().getTime();
		let deltaT = curr - this.millis;
		this.millis = curr;
		deltaT /= 1000;
		GUI.incrementTime(deltaT);

		// TODO
		// If the mesh is animating, probably you want to do some updating of the skeleton state here
		if (GUI.mode === Mode.playback) {
			GUI.setFrame(GUI.getTime());
		}

		// draw the status message
		if (this.ctx2) {
			this.ctx2.clearRect(0, 0, this.ctx2.canvas.width, this.ctx2.canvas.height);
			if (this.scene.meshes.length > 0) {
				this.ctx2.fillText(this.getGUI().getModeString(), 50, 710);
			}
		}

		// Drawing
		const gl: WebGLRenderingContext = this.ctx;
		const bg: Vec4 = this.backgroundColor;
		gl.clearColor(bg.r, bg.g, bg.b, bg.a);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.CULL_FACE);
		gl.enable(gl.DEPTH_TEST);
		gl.frontFace(gl.CCW);
		gl.cullFace(gl.BACK);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null); // null is the default frame buffer
		this.drawScene(0, 200, 800, 600);

		/* Draw status bar */
		if (this.scene.meshes.length > 0) {
			gl.viewport(0, 0, 800, 200);
			this.initScrubber();
			this.timelineRenderPass.draw();
			this.scrubberRenderPass.draw();
			this.sBackRenderPass.draw();
		}

		if (this.getGUI().getNumKeyFrames() > 0) {
			if (this.getGUI().scrollUp) {
				this.getGUI().scrollY(50);
			} else if (this.getGUI().scrollDown) {
				this.getGUI().scrollY(-50);
			}
			gl.viewport(800, 0, SkinningAnimation.panelWidth, SkinningAnimation.panelHeight);
			this.keyFrameRenderPasses.forEach((rp) => {
				rp.draw();
			});
		}
	}

	private drawScene(x: number, y: number, width: number, height: number): void {
		const gl: WebGLRenderingContext = this.ctx;
		gl.viewport(x, y, width, height);

		this.floorRenderPass.draw();

		/* Draw Scene */
		if (this.scene.meshes.length > 0) {
			this.sceneRenderPass.draw();
			gl.disable(gl.DEPTH_TEST);
			if (this.gui.mode === Mode.edit) {
				this.skeletonRenderPass.draw();
				// TODO
				// Also draw the highlighted bone (if applicable)
				if (this.cylinder.draw && !gl.getParameter(gl.FRAMEBUFFER_BINDING)) this.cylinderRenderPass.draw();
			}
			gl.enable(gl.DEPTH_TEST);
		}
	}

	public getGUI(): GUI {
		return this.gui;
	}

	/**
	 * Loads and sets the scene from a Collada file
	 * @param fileLocation URI for the Collada file
	 */
	public setScene(fileLocation: string): void {
		this.loadedScene = fileLocation;
		this.scene = new CLoader(fileLocation);
		this.scene.load(() => this.initScene());
	}
}

export function initializeCanvas(toast): SkinningAnimation {
	const canvas = document.getElementById("glCanvas") as HTMLCanvasElement;
	/* Start drawing */
	const canvasAnimation: SkinningAnimation = new SkinningAnimation(canvas, toast);
	canvasAnimation.start();
	canvasAnimation.setScene(`static/assets/skinning/split_cube.dae`);
	return canvasAnimation;
}
