// Globals
let keysPressed = new Map();
let depth = 1;
let frameTime = 0;
let workers = [];
let pendingPixels = 0;
let incX, incY, P0;

// COLOR FUNCTIONS
function rgbToHex(color) {
	function hexCode(i) {
		return ("0" + parseInt(i).toString(16)).slice(-2);
	}
	return "#" + hexCode(color[0]*255) + hexCode(color[1]*255) + hexCode(color[2]*255);
}
function hexToRGB(hexValue) {
	let aRgbHex = hexValue.match(/.{1,2}/g);
	return [
		parseInt(aRgbHex[0], 16) / 255,
		parseInt(aRgbHex[1], 16) / 255,
		parseInt(aRgbHex[2], 16) / 255,
		parseInt(aRgbHex[3], 16) / 255
	];
}

// HTML ELEMENTS
let selectIllum = document.getElementById("select_illum");
let selectShape = document.getElementById("select_shapes");
let selectMaterial = document.getElementById("select_materials");
let colorPickerLa = document.getElementById("colorPickerLight_la");
let colorPickerLd = document.getElementById("colorPickerLight_ld");
let colorPickerLs = document.getElementById("colorPickerLight_ls");
let colorPickerMa = document.getElementById("colorPickerMaterial_ma");
let colorPickerMd = document.getElementById("colorPickerMaterial_md");
let colorPickerMs = document.getElementById("colorPickerMaterial_ms");
let sliderMm = document.getElementById("sliderMaterial_mm");
let sliderMr = document.getElementById("sliderMaterial_mr");
let sliderShininess = document.getElementById("sliderMaterial_shininess");
let outputMm = document.getElementById("mm_output");
let outputMr = document.getElementById("mr_output");
let outputShininess = document.getElementById("shininess_output");
let selectShapeMaterial = document.getElementById("select_shape_material");
let selectCamera = document.getElementById("select_camera");
let sliderFov = document.getElementById("slider_fov");
let outputFov = document.getElementById("fov_output");
let depthInput = document.getElementById("depth");
let outputEye = document.getElementById("eye_output");
let outputCenter = document.getElementById("center_output");
let outputUp = document.getElementById("up_output");
let checkboxMultithreading = document.getElementById("multithreading");
let nThreads = document.getElementById("n_threads");
let outputFrametime = document.getElementById("frametime_output");
let inputLightPosition = {
	x: document.getElementById("light_positionX"),
	y: document.getElementById("light_positionY"),
	z: document.getElementById("light_positionZ")
}

// HTML HANDLERS
function initHTML(Scene) {
	for (let i = 0; i < Scene.Lights.length; i++) {
		let txt = "Light " + i.toString();
		selectIllum.appendChild(new Option(txt,i.toString()));
	}
	selectIllum.selectedIndex = 0;
	for (let i = 0; i < Scene.Shapes.length; i++) {
		let txt = Scene.Shapes[i].id;
		selectShape.appendChild(new Option(txt,txt));
	}
	selectShape.selectedIndex = 0;
	for (let material in Materials) {
		let txt = material;
		selectMaterial.appendChild(new Option(txt,txt));
		selectShapeMaterial.appendChild(new Option(txt,txt));
	}
	selectMaterial.selectedIndex = 0;
	selectShapeMaterial.selectedIndex = 0;
	for (let i = 0; i < Scene.Camera.pois.length; i++) {
		let txt = Scene.Camera.pois[i].name;
		let opt = new Option(txt,txt);
		selectCamera.appendChild(opt);
	}
	selectCamera.selectedIndex = 0;

	onSelectIllum();
	onSelectMaterials();
	onSelectShapes();
	onSelectCamera();
	onChangedDepth();
	updateCameraPosition();
	onChangedMultithread();
	nThreads.setAttribute("value",navigator.hardwareConcurrency.toString());
}
function onSelectIllum() {
	let i = parseInt(selectIllum.value);
	let l = Scene.Lights[i];
	colorPickerLa.value = rgbToHex(l.La);
	colorPickerLd.value = rgbToHex(l.Ld);
	colorPickerLs.value = rgbToHex(l.Ls);
	inputLightPosition.x.value = l.position[0];
	inputLightPosition.y.value = l.position[1];
	inputLightPosition.z.value = l.position[2];
}
function onChangedIllum() {
	let i = parseInt(selectIllum.value);
	let light = Scene.Lights[i];
	light.La = hexToRGB(colorPickerLa.value.substr(1)).slice(0, -1);
	light.Ld = hexToRGB(colorPickerLd.value.substr(1)).slice(0, -1);
	light.Ls = hexToRGB(colorPickerLs.value.substr(1)).slice(0, -1);
	let position = [];
	position[0] = inputLightPosition.x.value;
	position[1] = inputLightPosition.y.value;
	position[2] = inputLightPosition.z.value;
	light.position = position;
}
function onSelectShapes() {
	let id = selectShape.value;
	let shape = Scene.Shapes.find(x => x.id === id);
	let selectedMaterial = shape.material;
	let name = "";
	for (let material in Materials) {
		if( JSON.stringify(Materials[material]) ===  JSON.stringify(selectedMaterial))
			name = material;
	}
	selectShapeMaterial.value = name;
}
function onChangedShapes() {
	let name = selectShapeMaterial.value;
	let material = Materials[name];
	let id = selectShape.value;
	let shape = Scene.Shapes.find(x => x.id === id);
	shape.material = material;
}
function onSelectMaterials() {
	let name = selectMaterial.value;
	let material = Materials[name];
	colorPickerMa.value = rgbToHex(material.Ma);
	colorPickerMd.value = rgbToHex(material.Md);
	colorPickerMs.value = rgbToHex(material.Ms);
	sliderMm.value = material.Mm;
	sliderMr.value = material.Mr;
	sliderShininess.value = material.shininess;

	outputMm.value = material.Mm;
	outputMr.value = material.Mr;
	outputShininess.value = material.shininess;
}
function onChangedMaterials() {
	let name = selectMaterial.value;
	let material = Materials[name];
	material.Ma = hexToRGB(colorPickerMa.value.substr(1)).slice(0, -1);
	material.Md = hexToRGB(colorPickerMd.value.substr(1)).slice(0, -1);
	material.Ms = hexToRGB(colorPickerMs.value.substr(1)).slice(0, -1);
	material.Mm = parseFloat(sliderMm.value);
	material.Mr = parseFloat(sliderMr.value);
	material.shininess = parseFloat(sliderShininess.value);

	outputMm.value = material.Mm;
	outputMr.value = material.Mr;
	outputShininess.value = material.shininess;
}
function onSelectCamera() {
	let name = selectCamera.value;
	Scene.Camera.restorePoi(name);

	sliderFov.value = Scene.Camera.fov;
	outputFov.value = Scene.Camera.fov;

	updateCameraPosition();
}
function onChangedCamera() {
	Scene.Camera.fov = sliderFov.value;
	outputFov.value = sliderFov.value;
}
function onChangedDepth() {
	depth = parseInt(depthInput.value);
}
function updateCameraPosition() {
	function arrayToString(array) {
		return '[' + array[0].toFixed(2) + ", "
				   + array[1].toFixed(2) + ", "
			       + array[2].toFixed(2) + ']';
	}
	outputEye.value = arrayToString(Scene.Camera.state.eye);
	outputCenter.value = arrayToString(Scene.Camera.state.center);
	outputUp.value = arrayToString(Scene.Camera.state.up);
}
function onChangedMultithread() {
	if (checkboxMultithreading.checked) {
		checkboxMultithreading.nextElementSibling.style.display = "inline";

		if (workers.length > nThreads.value) {
			for (let i = workers.length-1; i >= nThreads.value; i--) {
				workers.pop().terminate();
			}
		}
		else {
			for (let i = workers.length; i < nThreads.value; i++) {
				workers[i] = new Worker("worker.js");
				workers[i].onmessage = function (oEvent) {
					plot(oEvent.data.x, oEvent.data.y, oEvent.data.color);
					pendingPixels--;
					if (pendingPixels === 0) {
						Screen.context.putImageData(Screen.buffer, 0, 0);
						setFrameTime();
					}
				};
				workers[i].postMessage({
					type: "init",
					shapes: Scene.Shapes,
					lights: Scene.Lights,
					fons: Scene.Fons
				});
			}
		}
	}
	else {
		checkboxMultithreading.nextElementSibling.style.display = "none";
		for (let i = workers.length-1; i >= 0; i--) {
			workers.pop().terminate();
		}
	}
}
function setFrameTime() {
	let time = (Date.now() - frameTime) / 1000;
	outputFrametime.value = time.toString() + "s";
}
function onClickStart() {
	outputFrametime.value = "Computing...";

	// Calculem els increments i P0 (GLOBALS)
	incX = calcularIncrementX(Scene.Camera,Screen);
	incY = calcularIncrementY(Scene.Camera,Screen);
	P0 = calcularP0(incX,incY,Scene.Camera,Screen);

	// Executem RayTracing
	frameTime = Date.now();
	if (checkboxMultithreading.checked)
		rayTracingSceneConcurrent(Scene, Screen);
	else
		rayTracingScene(Scene, Screen);
}

// CALCULAR INCREMENTS I P0
function calcularIncrementX(Cam,Scr) {
	let rati = (Scr.height/Scr.width);

	let theta = (Cam.fov * Math.PI / 180);
	let w = 2*Math.tan(theta/2); // Calculem w' = 2*tg(theta/2)
	let h = w*rati; // Calculem h' = w'*rati

	let aux = w/Scr.width; // w'/W
	// Calculem increment de X (X * 2*tg(theta/2)/W)
	return vec3.scale(Cam.right, aux);
}
function calcularIncrementY(Cam,Scr) {
	let rati = (Scr.height/Scr.width);

	let theta = (Cam.fov * Math.PI / 180);
	let w = 2*Math.tan(theta/2); // Calculem w' = 2*tg(theta/2)
	let h = w*rati; // Calculem h' = w'*rati

	let aux = rati*w/Scr.height; // rati*w'/H
	// Calculem increment de Y (Y * 2*tg(theta/2)/W)
	return vec3.scale(Cam.state.up, aux);
}
function calcularP0(incX,incY,Cam,Scr) {
	const P = vec3.subtract(Cam.state.eye, vec3.negate(Cam.front)); // Calculem P (O - Z)
	const aux = vec3.scale(incX, ((Scr.width - 1) / 2)); // Increment de X * (W-1)/2
	const aux2 = vec3.scale(incY, ((Scr.height - 1) / 2)); // Increment de Y * (H-1)/2
	const aux3 = vec3.subtract(P, aux); // P - Increment de X * (W-1)/2
	 // Calculem P0 (P - Increment de X * (W-1)/2 + Increment de Y * (H-1)/2)
	return vec3.add(aux3, aux2);
}

// RAY TRACING
function rayTracingSceneConcurrent(Scene, Screen) {
	// Init workers
	pendingPixels = Screen.width * Screen.height;

	// Send work to workers
	let pixelCount = 0;
	for(let x = 0; x < Screen.width; x++){
		for (let y = Screen.height-1; y >= 0; y--){
			const ray = computeRay(incX, incY, P0, Scene.Camera.state, x, y);
			workers[pixelCount % nThreads.value].postMessage(
				{
					type: "compute",
					ray: ray,
					depth: depth,
					x:x,
					y:y
				}
			);
			pixelCount++;
		}
	}
}
function rayTracingScene(Scene, Screen) {
	for(let x = 0; x < Screen.width; x++){
		for (let y = Screen.height-1; y >= 0; y--){
			const ray = computeRay(incX, incY, P0, Scene.Camera.state, x, y);
			const color = rayTracing(Scene, ray, depth);
			plot(x,y,color);
		}
	}
	Screen.context.putImageData(Screen.buffer, 0, 0);
	setFrameTime();
}
function computeRay(incX,incY,P0,Cam,x,y){
	// Calculem la direccio per a cada pixel
	const aux = vec3.scale(incX, x); // Increment de X * x
	const aux2 = vec3.scale(incY, y); // Increment de Y * y
	const aux3 = vec3.add(P0, aux); // P0 + Increment de X * x
	const aux4 = vec3.subtract(aux3, aux2); // P0 + Increment de X * x - Increment de Y * y
	const ray = vec3.subtract(aux4, Cam.eye); // Obtenim raig (P0 + Increment de X * x - Increment de Y * y - O)
	const rayNorm = vec3.normalize(ray); // Normalitzem el raig

	return new Ray(Cam.eye, rayNorm);
}
function plot(x,y,color){
	const index = (x + y * Screen.buffer.width) * 4;
	Screen.buffer.data[index] = color[0] * 255;
	Screen.buffer.data[index+1] = color[1] * 255;
	Screen.buffer.data[index+2] = color[2] * 255;
	Screen.buffer.data[index+3] = 255;
	return index;
}


// FPS
function handleKey(event) {
	event.preventDefault();
	let k = keysPressed;
	let camera = Scene.Camera;

	// Modifiers
	let amount = 0.025;
	let shift = event.getModifierState("Shift");
	if(shift) {
		amount *= 2;
	}
	let alt = event.getModifierState("Alt");
	let rotation = amount*20;


	// Left/Right movement
	if(k.get('a') && !k.get('d'))
		camera.moveX(-amount);
	else if(k.get('d') && !k.get('a'))
		camera.moveX(amount);

	// Up/Down movement if Alt is pressed, Front/Back movement otherwise
	if(k.get('w') && !k.get('s'))
		alt ? camera.moveY(amount) : camera.moveZ(amount);
	else if(k.get('s') && !k.get('w'))
		alt ? camera.moveY(-amount) : camera.moveZ(-amount);


	// Barrel roll Right/Left if Alt is pressed, Left/Right rotation otherwise
	if(k.get('arrowleft') && !k.get('arrowright'))
		alt ? camera.rotateZ(rotation) : camera.rotateY(rotation);
	else if(k.get('arrowright') && !k.get('arrowleft'))
		alt ? camera.rotateZ(-rotation) : camera.rotateY(-rotation);

	// Up/Down rotation
	if(k.get('arrowup') && !k.get('arrowdown'))
		camera.rotateX(rotation);
	else if(k.get('arrowdown') && !k.get('arrowup'))
		camera.rotateX(-rotation);

	// Go to next POI
	if(k.get('e')) {
		let index = selectCamera.selectedIndex;
		if(index === selectCamera.options.length-1)
			index = 0;
		else index++;
		camera.restorePoi(selectCamera.options[index].value);
		selectCamera.selectedIndex = index;
	}

	updateCameraPosition()
}
document.addEventListener('keydown', (event) => {
	keysPressed.set(event.key.toLowerCase(),true);
	handleKey(event);
});
document.addEventListener('keyup', (event) => {
	keysPressed.delete(event.key.toLowerCase());
});


// MAIN
function inicialitzar() {
	Screen.canvas = document.getElementById("glcanvas");
	if (Screen.canvas == null)	{
		alert("Invalid element: " + id);
		return;
	}
	Screen.context = Screen.canvas.getContext("2d");
	if(Screen.context == null){
		alert("Could not get context");
		return;
	}
	Screen.width = Screen.canvas.width;
	Screen.height = Screen.canvas.height;
	Screen.buffer = Screen.context.createImageData(Screen.width,Screen.height);

	initHTML(Scene);
}
inicialitzar()