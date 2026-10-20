const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const container = document.getElementById('game-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(4, 4, 4); 
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Свет
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// --- ТЕКСТУРА КУБА ---
function createGridTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2a4b8d'; // Сделал фон куба темнее, чтобы белые стрелки выделялись
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#4a86ff'; 
    ctx.lineWidth = 6;
    const step = size / 3;
    for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
    }
    ctx.lineWidth = 12;
    ctx.strokeRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
}

const CUBE_SIZE = 3; // Размер куба
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ map: createGridTexture() });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// --- СОЗДАНИЕ СТРЕЛОК ---
const arrows = []; // Массив для хранения всех стрелок

// Функция создания одной стрелки
function createArrow(pos, rotation) {
    // Создаем группу (чтобы можно было масштабировать и вращать вместе)
    const arrowGroup = new THREE.Group();

    // Тело стрелки (цилиндр)
    const bodyGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.2; // Сдвигаем вверх
    arrowGroup.add(body);

    // Наконечник стрелки (конус)
    const headGeo = new THREE.ConeGeometry(0.2, 0.3, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xff4444 }); // Красный наконечник
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.55; 
    arrowGroup.add(head);

    // Позиционируем и поворачиваем стрелку
    arrowGroup.position.copy(pos);
    arrowGroup.rotation.copy(rotation);

    // Сохраняем данные о стрелке (для будущей логики)
    arrowGroup.userData = {
        isAnimating: false,
        direction: new THREE.Vector3(0, 1, 0).applyEuler(rotation) // Куда смотрит стрелка
    };

    cube.add(arrowGroup); // Добавляем стрелку внутрь куба (чтобы она двигалась вместе с ним)
    arrows.push(arrowGroup);
}

// --- РАССТАНОВКА СТРЕЛОК НА ГРАНЯХ ---
const gridSize = CUBE_SIZE / 3; // Размер одной клетки (1)
const offset = CUBE_SIZE / 2 + 0.01; // Выносим стрелку чуть-чуть над гранью

// Массив возможных позиций на 3 гранях (верхняя, передняя, правая)
// Чтобы не рисовать на задних гранях, которые не видны
const positions = [];

// Верхняя грань (Y = +offset)
positions.push({ pos: new THREE.Vector3(0, offset, 0), rot: new THREE.Euler(0, 0, 0) }); // Смотрит вверх
// Передняя грань (Z = +offset)
positions.push({ pos: new THREE.Vector3(0, 0, offset), rot: new THREE.Euler(Math.PI/2, 0, 0) }); // Смотрит вперед
// Правая грань (X = +offset)
positions.push({ pos: new THREE.Vector3(offset, 0, 0), rot: new THREE.Euler(0, 0, -Math.PI/2) }); // Смотрит вправо

// Пока поставим по одной стрелке в центр каждой из трех видимых граней
createArrow(positions[0].pos, positions[0].rot);
createArrow(positions[1].pos, positions[1].rot);
createArrow(positions[2].pos, positions[2].rot);

// --- ЛОГИКА КЛИКА (RAYCASTER) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onPointerClick(event) {
    // Если мы только что таскали куб, клик не засчитываем
    if (isDragging) return; 

    // Получаем координаты клика
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Проверяем пересечение луча со стрелками
    const intersects = raycaster.intersectObjects(arrows, true); // true = проверять вложенные объекты

    if (intersects.length > 0) {
        // Находим саму группу стрелки (родителя)
        let clickedObject = intersects[0].object;
        while (clickedObject.parent !== cube && clickedObject.parent !== null) {
            clickedObject = clickedObject.parent;
        }

        if (clickedObject.userData && !clickedObject.userData.isAnimating) {
            // Запускаем анимацию полета
            clickedObject.userData.isAnimating = true;
            
            // Простой эффект: стрелка улетает в направлении своего взгляда и исчезает
            const direction = clickedObject.userData.direction.clone();
            const startPos = clickedObject.position.clone();
            const startTime = Date.now();

            function animateArrow() {
                const timePassed = (Date.now() - startTime) / 1000;
                
                // Двигаем стрелку
                clickedObject.position.copy(startPos).add(direction.clone().multiplyScalar(timePassed * 5));
                
                // Уменьшаем её (эффект исчезновения)
                clickedObject.scale.setScalar(Math.max(0, 1 - timePassed));

                if (timePassed < 1) {
                    requestAnimationFrame(animateArrow);
                } else {
                    // Удаляем после полета
                    cube.remove(clickedObject);
                    const index = arrows.indexOf(clickedObject);
                    if (index > -1) arrows.splice(index, 1);
                }
            }
            animateArrow();
        }
    }
}

// --- УПРАВЛЕНИЕ ВРАЩЕНИЕМ ---
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let dragDistance = 0; // Чтобы отличать клик от свайпа

function onPointerDown(e) {
    isDragging = true;
    dragDistance = 0;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    previousMousePosition = { x: clientX, y: clientY };
}

function onPointerMove(e) {
    if (!isDragging) return;
    if(e.cancelable) e.preventDefault(); 

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const deltaMove = {
        x: clientX - previousMousePosition.x,
        y: clientY - previousMousePosition.y
    };

    // Считаем общее расстояние, на которое сдвинули палец
    dragDistance += Math.abs(deltaMove.x) + Math.abs(deltaMove.y);

    cube.rotation.y += deltaMove.x * 0.01;
    cube.rotation.x += deltaMove.y * 0.01;

    previousMousePosition = { x: clientX, y: clientY };
}

function onPointerUp(e) {
    // Если сдвинули мало — считаем это кликом
    if (isDragging && dragDistance < 10) {
        // Для тач-событий передаем измененные координаты
        const clickEvent = e.changedTouches ? e.changedTouches[0] : e;
        onPointerClick(clickEvent);
    }
    isDragging = false;
}

renderer.domElement.addEventListener('mousedown', onPointerDown);
renderer.domElement.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', onPointerUp);

renderer.domElement.addEventListener('touchstart', onPointerDown, { passive: false });
renderer.domElement.addEventListener('touchmove', onPointerMove, { passive: false });
window.addEventListener('touchend', onPointerUp);

function onWindowResize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

window.addEventListener('resize', onWindowResize);
window.addEventListener('orientationchange', onWindowResize);

onWindowResize(); 

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
