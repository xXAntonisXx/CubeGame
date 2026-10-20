const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const container = document.getElementById('game-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(3, 3, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// Свет
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// --- СОЗДАЕМ ИГРОВОЕ ПОЛЕ ---

// Генерируем текстуру для сетки (чтобы видеть клетки)
function createGridTexture() {
    const size = 512; // Размер текстуры
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Фон грани
    ctx.fillStyle = '#4a86ff';
    ctx.fillRect(0, 0, size, size);

    // Рисуем сетку (3x3)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4; // Толщина линий
    const step = size / 3;

    for (let i = 1; i < 3; i++) {
        // Вертикальные линии
        ctx.beginPath();
        ctx.moveTo(i * step, 0);
        ctx.lineTo(i * step, size);
        ctx.stroke();

        // Горизонтальные линии
        ctx.beginPath();
        ctx.moveTo(0, i * step);
        ctx.lineTo(size, i * step);
        ctx.stroke();
    }

    // Добавляем рамку по краям
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

const gridTexture = createGridTexture();
const material = new THREE.MeshStandardMaterial({ 
    map: gridTexture,
    transparent: true,
    opacity: 0.9
});

const geometry = new THREE.BoxGeometry(2, 2, 2);
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// --- УПРАВЛЕНИЕ ВРАЩЕНИЕМ (свайпы) ---

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

// Обработка нажатия (мышь/палец)
function onPointerDown(e) {
    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    previousMousePosition = { x: clientX, y: clientY };
}

// Обработка движения
function onPointerMove(e) {
    if (!isDragging) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const deltaMove = {
        x: clientX - previousMousePosition.x,
        y: clientY - previousMousePosition.y
    };

    // Вращаем куб (коэффициент 0.01 для плавности)
    cube.rotation.y += deltaMove.x * 0.01;
    cube.rotation.x += deltaMove.y * 0.01;

    previousMousePosition = { x: clientX, y: clientY };
}

function onPointerUp() {
    isDragging = false;
}

// Привязываем события
renderer.domElement.addEventListener('mousedown', onPointerDown);
renderer.domElement.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', onPointerUp);

// Для тач-экранов (телефоны)
renderer.domElement.addEventListener('touchstart', onPointerDown, { passive: false });
renderer.domElement.addEventListener('touchmove', onPointerMove, { passive: false });
window.addEventListener('touchend', onPointerUp);


// Анимация (без автовращения, только рендер)
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
