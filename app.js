// 1. Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();   // Говорим Telegram, что приложение загрузилось
tg.expand();  // Разворачиваем на весь экран

// 2. Настройка Three.js
const container = document.getElementById('game-container');

// Создаем сцену
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e); // Цвет фона (как в CSS)

// Создаем камеру (угол обзора, соотношение сторон, ближняя и дальняя границы)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(3, 3, 3); // Ставим камеру чуть сбоку, чтобы видеть куб
camera.lookAt(0, 0, 0);       // Смотрим в центр

// Создаем рендерер (движок, который рисует картинку)
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio); // Чтобы было четко на телефонах
container.appendChild(renderer.domElement);

// 3. Добавляем свет (иначе куб будет черным)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Мягкий свет
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// 4. Создаем сам объект (пока это просто куб-заглушка)
const geometry = new THREE.BoxGeometry(2, 2, 2); // Размер куба
const material = new THREE.MeshStandardMaterial({ color: 0x4a86ff }); // Синий цвет
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// 5. Анимация (вращение куба, чтобы было видно, что 3D работает)
function animate() {
    requestAnimationFrame(animate);

    // Вращаем куб для наглядности
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    renderer.render(scene, camera);
}

animate();

// 6. Обработка изменения размера окна
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});