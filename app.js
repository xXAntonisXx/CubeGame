const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const container = document.getElementById('game-container');

// 1. Настройка сцены и камеры
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
// Ставим камеру на одинаковое расстояние по всем осям, чтобы смотреть ровно в центр (0,0,0)
camera.position.set(4, 4, 4); 
camera.lookAt(0, 0, 0);

// 2. Настройка рендерера
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Защита от слишком больших текстур на телефонах
container.appendChild(renderer.domElement);

// 3. Свет
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// 4. Создание текстуры сетки
function createGridTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#4a86ff'; // Синий фон
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#ffffff'; // Белая сетка
    ctx.lineWidth = 6;
    const step = size / 3;

    for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
    }

    // Рамка по краям
    ctx.lineWidth = 12;
    ctx.strokeRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
}

// 5. Создание куба
const geometry = new THREE.BoxGeometry(2.5, 2.5, 2.5); // Чуть увеличил размер
const material = new THREE.MeshStandardMaterial({ map: createGridTexture() });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// 6. Управление вращением
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

function onPointerDown(e) {
    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    previousMousePosition = { x: clientX, y: clientY };
}

function onPointerMove(e) {
    if (!isDragging) return;
    // Предотвращаем скролл страницы при свайпе
    if(e.cancelable) e.preventDefault(); 

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const deltaMove = {
        x: clientX - previousMousePosition.x,
        y: clientY - previousMousePosition.y
    };

    cube.rotation.y += deltaMove.x * 0.01;
    cube.rotation.x += deltaMove.y * 0.01;

    previousMousePosition = { x: clientX, y: clientY };
}

function onPointerUp() {
    isDragging = false;
}

renderer.domElement.addEventListener('mousedown', onPointerDown);
renderer.domElement.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', onPointerUp);

renderer.domElement.addEventListener('touchstart', onPointerDown, { passive: false });
renderer.domElement.addEventListener('touchmove', onPointerMove, { passive: false });
window.addEventListener('touchend', onPointerUp);

// 7. Функция для корректного изменения размера
function onWindowResize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// Привязываем ресайз к разным событиям
window.addEventListener('resize', onWindowResize);
window.addEventListener('orientationchange', onWindowResize);

// 8. Запуск рендера
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Вызываем ресайз один раз при старте, чтобы камера встала ровно
onWindowResize(); 
animate();
