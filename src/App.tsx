import {
	CameraOutlined,
	CenterFocusWeak,
	DeleteOutlined,
	KeyboardArrowLeft,
	KeyboardArrowRight,
	KeyboardArrowRightOutlined,
	LibraryBooksOutlined,
	LockOutlined,
	PlayArrowOutlined,
	PreviewOutlined,
	Update,
} from "@mui/icons-material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { IconButton, Modal, Snackbar, Tooltip } from "@mui/material";
import React, { useEffect, useState } from "react";
import "./App.css";
import { SkinningAnimation, initializeCanvas } from "./skinning/Animation.ts";
function App() {
	const [canvasAnimation, setCanvasAnimation] = useState<SkinningAnimation>();
	const [openSnackbar, setOpenSnackbar] = useState(false);
	const [openModal, setOpenModal] = useState(false);
	const [tab, setTab] = useState(0);

	const toast = () => setOpenSnackbar(true);
	useEffect(() => setCanvasAnimation(initializeCanvas(toast)), []);

	const tutorialWindows = [<Tutorial1 />, <Tutorial2 />, <Tutorial3 />];

	const gui = canvasAnimation?.getGUI();
	// const [keyframeSelected, setKeyframeSelected] = useState<Boolean>(canvasAnimation?.getGUI().selectedKeyFrame !== -1);
	// useEffect(() => setKeyframeSelected(canvasAnimation?.getGUI().selectedKeyFrame !== -1), [canvasAnimation?.getGUI().selectedKeyFrame]);

	const controls = [
		{ action: "Open Tutorial", icon: LibraryBooksOutlined, onClick: () => setOpenModal(true) },
		{ action: "Reset Scene", keybind: "R", icon: RestartAltIcon, onClick: () => gui?.controlReset() },
		{ action: "Capture Keyframe", keybind: "K", icon: CameraOutlined, onClick: () => gui?.captureKeyframe() },
		{ action: "Play Animation", keybind: "P", icon: PlayArrowOutlined, onClick: () => gui?.playback() },
		{ action: "Record Animation", keybind: "H", icon: CenterFocusWeak, onClick: () => gui?.playback(true) },
		{ action: "Lock Selected Keyframe", keybind: "L", icon: LockOutlined, onClick: () => gui?.lockKeyframe() },
		{ action: "Update Selected Keyframe", keybind: "U", icon: Update, onClick: () => gui?.updateKeyframe() },
		{ action: "Delete Selected Keyframe", keybind: "Delete", icon: DeleteOutlined, onClick: () => gui?.deleteKeyframe() },
		{ action: "Preview Selected Keyframe", keybind: "=", icon: PreviewOutlined, onClick: () => gui?.previewKeyframe() },
	];

	return (
		<div className="container column center">
			<div className="canvas-container card">
				<canvas id="glCanvas" className="canvas card" width="1120" height="800">
					Your browser does not support HTML5
				</canvas>
				<canvas id="textCanvas" className="canvas card" width="1120" height="800">
					Your browser does not support HTML5
				</canvas>
			</div>

			<div className="row">
				{controls.map((control) => (
					<Tooltip title={`${control.action}${control.keybind ? ` (${control.keybind})` : ""}`} key={control.keybind}>
						<IconButton onClick={control.onClick} size="large">
							<control.icon fontSize="inherit" />
						</IconButton>
					</Tooltip>
				))}
			</div>

			<Modal open={openModal} onClose={() => setOpenModal(false)}>
				<div className="row modal-container">
					<IconButton onClick={() => setTab(Math.max(tab - 1, 0))} style={{ marginLeft: "16px", height: "min-content" }}>
						<KeyboardArrowLeft />
					</IconButton>
					{tutorialWindows[tab]}
					<IconButton onClick={() => setTab(Math.min(tab + 1, tutorialWindows.length - 1))} style={{ marginRight: "16px", height: "min-content" }}>
						<KeyboardArrowRight />
					</IconButton>
				</div>
			</Modal>

			<Snackbar open={openSnackbar} autoHideDuration={5000} onClose={() => setOpenSnackbar(false)} message="Select a Keyframe first" />
		</div>
	);
}

function Tutorial1() {
	return (
		<div className="column modal-box">
			<h3>Movement</h3>
			<img src="static/assets/tutorials/WASD Movement.gif" alt="WASD Movement" className="tutorial-gif" />
			<div>Use WASD to move the camera horizontally</div>
		</div>
	);
}
function Tutorial2() {
	return (
		<div className="column modal-box">
			<h3>More Movement</h3>
			<img src="static/assets/tutorials/Arrow Movement.gif" alt="Arrow Movement" className="tutorial-gif" />
			<div>Use the arrow keys to move the camera vertically and rotate it</div>
		</div>
	);
}
function Tutorial3() {
	return (
		<div className="column modal-box">
			<h3>Other Controls</h3>
			<ul>
				<li>Use C to toggle between orbital mode and FPS mode</li>
				<li>Hold T to translate a bone instead of rotating it</li>
			</ul>
		</div>
	);
}

export default App;
