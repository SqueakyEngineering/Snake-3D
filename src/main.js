import './styles.css';
import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  Pause,
  Play,
  RotateCcw,
  createIcons,
} from 'lucide';

const GRID_SIZE = 15;
const FLOOR_CELL_COUNT = GRID_SIZE * GRID_SIZE;
const HALF_CELL_SPAN = (GRID_SIZE - 1) / 2;
const ARENA_BOUNDS = GRID_SIZE / 2;
const BASE_STEP_MS = 235;
const MIN_STEP_MS = 92;
const LEVEL_SPAN = 4;
const BEST_SCORE_KEY = 'three-snake-3d-best';
const HEAD_FORWARD = new Vector3(0, 0, 1);
const INITIAL_FORWARD = new Vector3(1, 0, 0);
const INITIAL_UP = new Vector3(0, 1, 0);
const INITIAL_RIGHT = new Vector3(0, 0, 1);
const CAMERA_BACK_OFFSET = 0.12;
const CAMERA_UP_OFFSET = 0.08;
const LOOK_AHEAD_DISTANCE = 4.5;

const DIRECTION_KEYS = new Map([
  ['KeyA', 'left'],
  ['KeyD', 'right'],
  ['KeyS', 'down'],
  ['KeyW', 'up'],
]);

const canvas = document.querySelector('#game-canvas');
const scoreElement = document.querySelector('#score');
const bestElement = document.querySelector('#best');
const levelElement = document.querySelector('#level');
const layerElement = document.querySelector('#layer');
const fruitLayerElement = document.querySelector('#fruit-layer');
const stateElement = document.querySelector('#state');
const pauseButton = document.querySelector('#pause');
const restartButton = document.querySelector('#restart');

createIcons({
  icons: lucideIcons(),
});

const scene = new Scene();
scene.background = new Color(0x101419);

const renderer = new WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.outputColorSpace = SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const camera = new PerspectiveCamera(72, 1, 0.03, 120);
camera.position.set(0, 0, 0);
camera.lookAt(0, 0, 0);

const world = new Group();
scene.add(world);

const arenaGroup = new Group();
world.add(arenaGroup);

const tileLightMaterial = new MeshStandardMaterial({
  color: 0x6a4a2f,
  roughness: 0.82,
  metalness: 0.05,
});
const tileDarkMaterial = new MeshStandardMaterial({
  color: 0x4f3726,
  roughness: 0.86,
  metalness: 0.04,
});
const baseMaterial = new MeshStandardMaterial({
  color: 0x2b1d16,
  roughness: 0.9,
  metalness: 0.02,
});
const floorMaterial = new MeshStandardMaterial({
  color: 0x5a3521,
  roughness: 0.86,
  metalness: 0.02,
  side: DoubleSide,
});
const wallMaterial = new MeshStandardMaterial({
  color: 0x18232d,
  roughness: 0.88,
  metalness: 0.02,
  side: DoubleSide,
});
const ceilingMaterial = new MeshStandardMaterial({
  color: 0x245f9b,
  emissive: 0x0b2541,
  emissiveIntensity: 0.18,
  roughness: 0.74,
  metalness: 0.03,
  side: DoubleSide,
});
const frameMaterial = new LineBasicMaterial({
  color: 0xd4b056,
  transparent: true,
  opacity: 0.82,
});
const boundaryGridMaterial = new LineBasicMaterial({
  color: 0xd9e0d3,
  transparent: true,
  opacity: 0.48,
  depthTest: false,
  depthWrite: false,
});
const layerGridMaterial = new LineBasicMaterial({
  color: 0xa9bba5,
  transparent: true,
  opacity: 0.1,
  depthWrite: false,
});
const layerGuideMaterial = new MeshBasicMaterial({
  color: 0xf0c35a,
  transparent: true,
  opacity: 0.035,
  side: DoubleSide,
  depthWrite: false,
});
const fruitGuideMaterial = new LineBasicMaterial({
  color: 0xfff0a3,
  transparent: true,
  opacity: 0.96,
  depthTest: false,
  depthWrite: false,
});
const fruitColumnMaterial = new MeshBasicMaterial({
  color: 0xff5e57,
  transparent: true,
  opacity: 0.16,
  depthTest: false,
  depthWrite: false,
});
const fruitFloorMaterial = new MeshBasicMaterial({
  color: 0xffd166,
  transparent: true,
  opacity: 0.58,
  side: DoubleSide,
  depthTest: false,
  depthWrite: false,
});
const fruitLayerMaterial = new MeshBasicMaterial({
  color: 0xff5e57,
  transparent: true,
  opacity: 0.34,
  side: DoubleSide,
  depthTest: false,
  depthWrite: false,
});
const bodyMaterial = new MeshStandardMaterial({
  color: 0x62c36e,
  emissive: 0x123c1b,
  emissiveIntensity: 0.22,
  roughness: 0.48,
  metalness: 0.08,
});
const headMaterial = new MeshStandardMaterial({
  color: 0x8ee66d,
  emissive: 0x174d1f,
  emissiveIntensity: 0.28,
  roughness: 0.38,
  metalness: 0.1,
});
const foodMaterial = new MeshStandardMaterial({
  color: 0xff5e57,
  emissive: 0xb8212a,
  emissiveIntensity: 0.62,
  roughness: 0.4,
  metalness: 0.12,
});
const foodHaloMaterial = new MeshStandardMaterial({
  color: 0xffd166,
  emissive: 0xff6b4a,
  emissiveIntensity: 0.3,
  transparent: true,
  opacity: 0.42,
  roughness: 0.5,
  wireframe: true,
});
const eyeMaterial = new MeshStandardMaterial({
  color: 0x151719,
  roughness: 0.35,
});

const tileGeometry = new BoxGeometry(0.9, 0.08, 0.9);
const tileLightMesh = new InstancedMesh(tileGeometry, tileLightMaterial, FLOOR_CELL_COUNT / 2 + 1);
const tileDarkMesh = new InstancedMesh(tileGeometry, tileDarkMaterial, FLOOR_CELL_COUNT / 2 + 1);
tileLightMesh.receiveShadow = true;
tileDarkMesh.receiveShadow = true;

const dummy = new Object3D();
let lightIndex = 0;
let darkIndex = 0;

for (let z = 0; z < GRID_SIZE; z += 1) {
  for (let x = 0; x < GRID_SIZE; x += 1) {
    const position = cellToWorld(x, 0, z);
    dummy.position.set(position.x, -ARENA_BOUNDS - 0.04, position.z);
    dummy.updateMatrix();

    if ((x + z) % 2 === 0) {
      tileLightMesh.setMatrixAt(lightIndex, dummy.matrix);
      lightIndex += 1;
    } else {
      tileDarkMesh.setMatrixAt(darkIndex, dummy.matrix);
      darkIndex += 1;
    }
  }
}

tileLightMesh.count = lightIndex;
tileDarkMesh.count = darkIndex;
arenaGroup.add(tileLightMesh, tileDarkMesh);

const base = new Mesh(
  new RoundedBoxGeometry(GRID_SIZE + 0.9, 0.28, GRID_SIZE + 0.9, 6, 0.16),
  baseMaterial,
);
base.position.y = -ARENA_BOUNDS - 0.22;
base.receiveShadow = true;
base.castShadow = true;
arenaGroup.add(base);

const floor = new Mesh(new PlaneGeometry(GRID_SIZE, GRID_SIZE), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -ARENA_BOUNDS - 0.08;
floor.receiveShadow = true;
arenaGroup.add(floor);

const northWall = new Mesh(new PlaneGeometry(GRID_SIZE, GRID_SIZE), wallMaterial);
const southWall = northWall.clone();
const eastWall = new Mesh(new PlaneGeometry(GRID_SIZE, GRID_SIZE), wallMaterial);
const westWall = eastWall.clone();
const ceiling = new Mesh(new PlaneGeometry(GRID_SIZE, GRID_SIZE), ceilingMaterial);

northWall.position.z = -ARENA_BOUNDS;
southWall.position.z = ARENA_BOUNDS;
eastWall.rotation.y = Math.PI / 2;
eastWall.position.x = ARENA_BOUNDS;
westWall.rotation.y = Math.PI / 2;
westWall.position.x = -ARENA_BOUNDS;
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = ARENA_BOUNDS;

[northWall, southWall, eastWall, westWall, ceiling].forEach((surface) => {
  surface.receiveShadow = true;
  arenaGroup.add(surface);
});

const arenaFrame = new LineSegments(
  new EdgesGeometry(new BoxGeometry(GRID_SIZE, GRID_SIZE, GRID_SIZE)),
  frameMaterial,
);
arenaGroup.add(arenaFrame);

const boundaryGrid = new LineSegments(createBoundaryGridGeometry(), boundaryGridMaterial);
boundaryGrid.renderOrder = 5;
arenaGroup.add(boundaryGrid);

const layerGrid = new LineSegments(createLayerGridGeometry(), layerGridMaterial);
arenaGroup.add(layerGrid);

const layerGuide = new Mesh(new PlaneGeometry(GRID_SIZE, GRID_SIZE), layerGuideMaterial);
layerGuide.rotation.x = -Math.PI / 2;
arenaGroup.add(layerGuide);

const shadowPlane = new Mesh(
  new PlaneGeometry(42, 42),
  new ShadowMaterial({ color: 0x000000, opacity: 0.26 }),
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = -ARENA_BOUNDS - 0.42;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

const snakeGroup = new Group();
world.add(snakeGroup);

const foodMesh = new Mesh(new IcosahedronGeometry(0.43, 2), foodMaterial);
foodMesh.castShadow = true;
world.add(foodMesh);

const foodHalo = new Mesh(new RoundedBoxGeometry(0.98, 0.98, 0.98, 5, 0.14), foodHaloMaterial);
world.add(foodHalo);

const fruitGuideGeometry = new BufferGeometry();
fruitGuideGeometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(54), 3));
const fruitGuide = new LineSegments(fruitGuideGeometry, fruitGuideMaterial);
fruitGuide.renderOrder = 4;
world.add(fruitGuide);

const fruitColumn = new Mesh(new BoxGeometry(0.22, GRID_SIZE, 0.22), fruitColumnMaterial);
fruitColumn.renderOrder = 2;
world.add(fruitColumn);

const fruitFloorMarker = new Mesh(new RingGeometry(0.38, 0.74, 36), fruitFloorMaterial);
fruitFloorMarker.rotation.x = -Math.PI / 2;
fruitFloorMarker.renderOrder = 3;
world.add(fruitFloorMarker);

const fruitLayerMarker = new Mesh(new RingGeometry(0.44, 0.84, 36), fruitLayerMaterial);
fruitLayerMarker.rotation.x = -Math.PI / 2;
fruitLayerMarker.renderOrder = 3;
world.add(fruitLayerMarker);

scene.add(new AmbientLight(0xffffff, 0.18));
const hemi = new HemisphereLight(0xbde5ff, 0x2f241d, 1.1);
scene.add(hemi);

const keyLight = new DirectionalLight(0xfff0c8, 3.4);
keyLight.position.set(-8, 15, 12);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 45;
keyLight.shadow.camera.left = -22;
keyLight.shadow.camera.right = 22;
keyLight.shadow.camera.top = 22;
keyLight.shadow.camera.bottom = -22;
scene.add(keyLight);

const fillLight = new DirectionalLight(0x8fd3ff, 0.72);
fillLight.position.set(12, 9, -10);
scene.add(fillLight);

const segmentGeometry = new RoundedBoxGeometry(0.72, 0.72, 0.72, 6, 0.16);
const eyeGeometry = new RoundedBoxGeometry(0.11, 0.11, 0.08, 3, 0.025);
const segmentPool = [];

let snake = [];
let forward = INITIAL_FORWARD.clone();
let upAxis = INITIAL_UP.clone();
let rightAxis = INITIAL_RIGHT.clone();
let queuedForward = INITIAL_FORWARD.clone();
let queuedUp = INITIAL_UP.clone();
let queuedRight = INITIAL_RIGHT.clone();
let food = new Vector3();
let score = 0;
let bestScore = Number.parseInt(localStorage.getItem(BEST_SCORE_KEY) ?? '0', 10) || 0;
let level = 1;
let state = 'ready';
let moveAccumulator = 0;
let lastFrameTime = 0;

bestElement.textContent = bestScore.toString();
resetGame();
bindControls();
resize();
requestAnimationFrame(animate);

function bindControls() {
  window.addEventListener('keydown', (event) => {
    const nextDirection = DIRECTION_KEYS.get(event.code);

    if (nextDirection) {
      event.preventDefault();
      queueTurn(nextDirection);
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      togglePause();
      return;
    }

    if (event.code === 'Enter' || event.code === 'KeyR') {
      event.preventDefault();
      resetGame();
    }
  });

  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', resetGame);

  window.addEventListener('resize', resize);
}

function resetGame() {
  const center = Math.floor(GRID_SIZE / 2);
  snake = [
    new Vector3(center, center, center),
    new Vector3(center - 1, center, center),
    new Vector3(center - 2, center, center),
    new Vector3(center - 3, center, center),
  ];
  forward.copy(INITIAL_FORWARD);
  upAxis.copy(INITIAL_UP);
  rightAxis.copy(INITIAL_RIGHT);
  queuedForward.copy(forward);
  queuedUp.copy(upAxis);
  queuedRight.copy(rightAxis);
  score = 0;
  level = 1;
  moveAccumulator = 0;
  state = 'ready';
  snakeGroup.rotation.set(0, 0, 0);
  placeFood();
  syncSnakeMeshes(true);
  updateFoodMesh(0);
  updateUi();
}

function togglePause() {
  if (state === 'gameover') {
    resetGame();
    return;
  }

  state = state === 'paused' || state === 'ready' ? 'playing' : 'paused';
  updateUi();
}

function queueTurn(turn) {
  if (state === 'gameover') {
    resetGame();
  }

  const nextBasis = turnBasis(turn);

  if (!nextBasis || nextBasis.forward.dot(forward) === -1) {
    return;
  }

  if (state === 'paused' || state === 'ready') {
    state = 'playing';
  }

  queuedForward.copy(nextBasis.forward);
  queuedUp.copy(nextBasis.up);
  queuedRight.copy(nextBasis.right);
  updateUi();
}

function turnBasis(turn) {
  if (turn === 'up') {
    return {
      forward: queuedUp.clone(),
      up: queuedForward.clone().negate(),
      right: queuedRight.clone(),
    };
  }

  if (turn === 'down') {
    return {
      forward: queuedUp.clone().negate(),
      up: queuedForward.clone(),
      right: queuedRight.clone(),
    };
  }

  if (turn === 'left') {
    return {
      forward: queuedRight.clone().negate(),
      up: queuedUp.clone(),
      right: queuedForward.clone(),
    };
  }

  if (turn === 'right') {
    return {
      forward: queuedRight.clone(),
      up: queuedUp.clone(),
      right: queuedForward.clone().negate(),
    };
  }

  return null;
}

function animate(time) {
  const delta = Math.min(time - lastFrameTime, 80);
  lastFrameTime = time;

  if (state === 'playing') {
    moveAccumulator += delta;

    while (moveAccumulator >= stepMs()) {
      moveAccumulator -= stepMs();
      stepGame();
    }
  }

  const interpolation =
    state === 'playing' || state === 'paused' ? moveAccumulator / stepMs() : 1;
  renderSnake(interpolation);
  updateFirstPersonCamera();
  renderFood(time);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function stepGame() {
  forward.copy(queuedForward);
  upAxis.copy(queuedUp);
  rightAxis.copy(queuedRight);
  const head = snake[0].clone().add(forward);
  const willEat = head.equals(food);
  const occupiedCells = willEat ? snake : snake.slice(0, -1);

  if (isOutside(head) || occupiedCells.some((segment) => segment.equals(head))) {
    state = 'gameover';
    moveAccumulator = 0;
    updateUi();
    return;
  }

  snake.unshift(head);

  if (willEat) {
    score += 10;
    level = Math.floor(score / (LEVEL_SPAN * 10)) + 1;
    bestScore = Math.max(bestScore, score);
    localStorage.setItem(BEST_SCORE_KEY, bestScore.toString());
    placeFood();
    updateFoodMesh(0);
  } else {
    snake.pop();
  }

  syncSnakeMeshes(false);
  updateUi();
}

function syncSnakeMeshes(forcePosition) {
  while (segmentPool.length < snake.length) {
    const segment = createSegment(segmentPool.length === 0);
    snakeGroup.add(segment.group);
    segmentPool.push(segment);
  }

  segmentPool.forEach((segment, index) => {
    segment.group.visible = index < snake.length;

    if (index >= snake.length) {
      return;
    }

    segment.group.userData.previous.copy(segment.group.position);
    segment.group.userData.target.copy(cellToWorld(snake[index].x, snake[index].y, snake[index].z));

    if (forcePosition || index >= snake.length - 1) {
      segment.group.userData.previous.copy(segment.group.userData.target);
      segment.group.position.copy(segment.group.userData.target);
    }

    segment.group.scale.setScalar(index === 0 ? 1.06 : Math.max(0.76, 1 - index * 0.012));
    segment.mesh.material = index === 0 ? headMaterial : bodyMaterial;
    segment.mesh.visible = index !== 0;
    segment.eyes.visible = false;
  });

  updateLayerGuide();
  orientHead();
}

function renderSnake(interpolation) {
  const eased = 1 - Math.pow(1 - MathUtils.clamp(interpolation, 0, 1), 3);

  segmentPool.forEach((segment, index) => {
    if (index >= snake.length) {
      return;
    }

    segment.group.position.lerpVectors(
      segment.group.userData.previous,
      segment.group.userData.target,
      eased,
    );
  });

  snakeGroup.rotation.y = MathUtils.lerp(snakeGroup.rotation.y, 0, 0.1);
  snakeGroup.rotation.x = MathUtils.lerp(snakeGroup.rotation.x, 0, 0.1);
}

function orientHead() {
  const head = segmentPool[0]?.group;

  if (!head) {
    return;
  }

  head.quaternion.setFromUnitVectors(HEAD_FORWARD, queuedForward.clone().normalize());
}

function updateFirstPersonCamera() {
  const head = segmentPool[0]?.group;

  if (!head) {
    return;
  }

  const viewForward = queuedForward.clone().normalize();
  const viewUp = queuedUp.clone().normalize();
  const cameraPosition = head.position
    .clone()
    .addScaledVector(viewForward, -CAMERA_BACK_OFFSET)
    .addScaledVector(viewUp, CAMERA_UP_OFFSET);
  const lookTarget = head.position
    .clone()
    .addScaledVector(viewForward, LOOK_AHEAD_DISTANCE)
    .addScaledVector(viewUp, 0.08);

  camera.up.copy(viewUp);
  camera.position.copy(cameraPosition);
  camera.lookAt(lookTarget);
}

function createSegment(isHead) {
  const group = new Group();
  const mesh = new Mesh(segmentGeometry, isHead ? headMaterial : bodyMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const eyes = new Group();
  const leftEye = new Mesh(eyeGeometry, eyeMaterial);
  const rightEye = leftEye.clone();
  leftEye.position.set(-0.18, 0.12, 0.36);
  rightEye.position.set(0.18, 0.12, 0.36);
  eyes.add(leftEye, rightEye);
  group.add(eyes);

  group.userData.previous = new Vector3();
  group.userData.target = new Vector3();

  return { group, mesh, eyes };
}

function renderFood(time) {
  const pulse = Math.sin(time * 0.006);
  const position = cellToWorld(food.x, food.y, food.z);
  foodMesh.rotation.x += 0.014;
  foodMesh.rotation.y += 0.018;
  foodMesh.position.set(position.x, position.y + pulse * 0.08, position.z);
  foodMesh.scale.setScalar(1 + pulse * 0.05);
  foodHalo.position.copy(position);
  foodHalo.scale.setScalar(1.06 + Math.sin(time * 0.005) * 0.12);
  updateFruitGuides(position, pulse);
}

function updateFoodMesh(time) {
  renderFood(time);
}

function placeFood() {
  const openCells = [];

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let z = 0; z < GRID_SIZE; z += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const cell = new Vector3(x, y, z);

        if (!snake.some((segment) => segment.equals(cell))) {
          openCells.push(cell);
        }
      }
    }
  }

  food.copy(openCells[Math.floor(Math.random() * openCells.length)]);
}

function updateLayerGuide() {
  const head = snake[0];
  const worldY = cellToWorld(head.x, head.y, head.z).y;
  layerGuide.position.y = worldY;
}

function updateFruitGuides(position, pulse = 0) {
  const min = -ARENA_BOUNDS;
  const max = ARENA_BOUNDS;
  const floorY = min + 0.08;
  const ceilingY = max;
  const markerPulse = 1 + pulse * 0.08;
  const positions = fruitGuideGeometry.attributes.position.array;
  let offset = 0;

  offset = writeSegment(positions, offset, position.x, floorY, position.z, position.x, ceilingY, position.z);
  offset = writeSegment(positions, offset, min, position.y, position.z, max, position.y, position.z);
  offset = writeSegment(positions, offset, position.x, position.y, min, position.x, position.y, max);
  offset = writeSegment(positions, offset, position.x - 0.74, floorY, position.z, position.x + 0.74, floorY, position.z);
  offset = writeSegment(positions, offset, position.x, floorY, position.z - 0.74, position.x, floorY, position.z + 0.74);
  offset = writeSegment(positions, offset, position.x - 0.68, position.y, position.z, position.x + 0.68, position.y, position.z);
  offset = writeSegment(positions, offset, position.x, position.y, position.z - 0.68, position.x, position.y, position.z + 0.68);
  offset = writeSegment(positions, offset, position.x - 0.5, ceilingY, position.z, position.x + 0.5, ceilingY, position.z);
  writeSegment(positions, offset, position.x, ceilingY, position.z - 0.5, position.x, ceilingY, position.z + 0.5);

  fruitGuideGeometry.attributes.position.needsUpdate = true;
  fruitGuideGeometry.computeBoundingSphere();

  fruitColumn.position.set(position.x, 0, position.z);
  fruitColumn.scale.set(1 + pulse * 0.05, 1, 1 + pulse * 0.05);

  fruitFloorMarker.position.set(position.x, floorY + 0.01, position.z);
  fruitFloorMarker.scale.setScalar(markerPulse);

  fruitLayerMarker.position.copy(position);
  fruitLayerMarker.scale.setScalar(markerPulse);
}

function writeSegment(positions, offset, startX, startY, startZ, endX, endY, endZ) {
  positions[offset] = startX;
  positions[offset + 1] = startY;
  positions[offset + 2] = startZ;
  positions[offset + 3] = endX;
  positions[offset + 4] = endY;
  positions[offset + 5] = endZ;
  return offset + 6;
}

function updateUi() {
  scoreElement.textContent = score.toString();
  bestElement.textContent = bestScore.toString();
  levelElement.textContent = level.toString();
  layerElement.textContent = snake.length > 0 ? (snake[0].y + 1).toString() : '1';
  fruitLayerElement.textContent = (food.y + 1).toString();
  stateElement.textContent = stateLabel();

  const showsPlay = state === 'paused' || state === 'ready' || state === 'gameover';
  pauseButton.setAttribute(
    'aria-label',
    state === 'gameover' ? 'New game' : state === 'ready' ? 'Start' : showsPlay ? 'Resume' : 'Pause',
  );
  pauseButton.innerHTML = showsPlay ? '<i data-lucide="play"></i>' : '<i data-lucide="pause"></i>';
  createIcons({ icons: lucideIcons() });
}

function lucideIcons() {
  return {
    Pause,
    Play,
    RotateCcw,
  };
}

function stateLabel() {
  if (state === 'paused') {
    return 'Paused';
  }

  if (state === 'gameover') {
    return 'Crashed';
  }

  return state === 'ready' ? 'Ready' : 'Live';
}

function stepMs() {
  return Math.max(MIN_STEP_MS, BASE_STEP_MS - (level - 1) * 12);
}

function isOutside(cell) {
  return (
    cell.x < 0 ||
    cell.x >= GRID_SIZE ||
    cell.y < 0 ||
    cell.y >= GRID_SIZE ||
    cell.z < 0 ||
    cell.z >= GRID_SIZE
  );
}

function cellToWorld(x, y, z) {
  return new Vector3(x - HALF_CELL_SPAN, y - HALF_CELL_SPAN, z - HALF_CELL_SPAN);
}

function createBoundaryGridGeometry() {
  const positions = [];
  const min = -ARENA_BOUNDS;
  const max = ARENA_BOUNDS;

  for (let i = 0; i <= GRID_SIZE; i += 1) {
    const coord = i - ARENA_BOUNDS;

    positions.push(min, min, coord, max, min, coord);
    positions.push(coord, min, min, coord, min, max);

    positions.push(min, max, coord, max, max, coord);
    positions.push(coord, max, min, coord, max, max);

    positions.push(min, coord, min, max, coord, min);
    positions.push(coord, min, min, coord, max, min);

    positions.push(min, coord, max, max, coord, max);
    positions.push(coord, min, max, coord, max, max);

    positions.push(min, min, coord, min, max, coord);
    positions.push(min, coord, min, min, coord, max);

    positions.push(max, min, coord, max, max, coord);
    positions.push(max, coord, min, max, coord, max);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geometry;
}

function createLayerGridGeometry() {
  const positions = [];

  for (let y = 0; y < GRID_SIZE; y += 1) {
    const worldY = y - HALF_CELL_SPAN;

    for (let i = 0; i <= GRID_SIZE; i += 1) {
      const coord = i - ARENA_BOUNDS;
      positions.push(-ARENA_BOUNDS, worldY, coord, ARENA_BOUNDS, worldY, coord);
      positions.push(coord, worldY, -ARENA_BOUNDS, coord, worldY, ARENA_BOUNDS);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geometry;
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
