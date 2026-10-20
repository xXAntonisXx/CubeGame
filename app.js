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
    ctx.fillStyle = '#2a4b8d'; 
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

const CUBE_SIZE = 3; 
const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ map: createGridTexture() });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// --- СОЗДАНИЕ СТРЕЛОК ---
const arrows = []; 

function createArrow(pos, rotation) {
    const arrowGroup = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.2; 
    arrowGroup.add(body);

    const headGeo = new THREE.ConeGeometry(0.2, 0.3, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xff4444 }); 
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.55; 
    arrowGroup.add(head);

    arrowGroup.position.copy(pos);
    arrowGroup.rotation.copy(rotation);

    arrowGroup.userData = {
        isAnimating: false,
        direction: new THREE.Vector3(0, 1, 0).applyEuler(rotation) 
    };

    cube.add(arrowGroup); 
    arrows.push(arrowGroup);
}

const offset = CUBE_SIZE / 2 + 0.01; 

// Ставим стрелки чуть в стороне от центра, чтобы было видно, что клик работает точечно
createArrow(new THREE.Vector3(0.8, offset, 0), new THREE.Euler(0, 0, 0)); 
createArrow(new THREE.Vector3(-0.8, 0, offset), new THREE.Euler(Math.PI/2, 0, 0)); 
createArrow(new THREE.Vector3(offset, 0, 0.8), new THREE.Euler(0, 0, -Math.PI/2)); 

// --- ЛОГИКА КЛИКА (RAYCASTER) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function handleTap(clientX, clientY) {
    // Переводим координаты экрана в координаты Three.js (-1 до 1)
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Проверяем пересечение луча со стрелками
    const intersects = raycaster.intersectObjects(arrows, true); 

    if (intersects.length > 0) {
        let clickedObject = intersects[0].object;
        
        // Ищем корневую группу стрелки
        while (clickedObject.parent !== cube && clickedObject.parent !== null) {
            clickedObject = clickedObject.parent;
        }

        if (clickedObject.userData && !clickedObject.userData.isAnimating) {
            clickedObject.userData.isAnimating = true;
            
            const direction = clickedObject.userData.direction.clone();
            const startPos = clickedObject.position.clone();
            const startTime = Date.now();

            // Делаем стрелку полупрозрачной, чтобы показать, что она "активирована"
            clickedObject.traverse((child) => {
                if (child.isMesh) child.material.transparent = true;
            });

            function animateArrow() {
                const timePassed = (Date.now() - startTime) / 1000;
                
                clickedObject.position.copy(startPos).add(direction.clone().multiplyScalar(timePassed * 5));
                clickedObject.scale.setScalar(Math.max(0, 1 - timePassed));
                
                // Плавно делаем прозрачной
                clickedObject.traverse((child) => {
                    if (child.isMesh) child.material.opacity = Math.max(0, 1 - timePassed);
                });

                if (timePassed < 1) {
                    requestAnimationFrame(animateArrow);
                } else {
                    cube.remove(clickedObject);
                    const index = arrows.indexOf(clickedObject);
                    if (index > -1) arrows.splice(index, 1);
                }
            }
            animateArrow();
        }
    }
}

// --- УПРАВЛЕНИЕ ---
let isDragging = false;
let startX = 0, startY = 0;
let previousMousePosition = { x: 0, y: 0 };
let dragDistance = 0; 

function onPointerDown(e) {
    isDragging = true;
    dragDistance = 0;
    
    // Берем координаты из тача или мыши
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    startX = clientX;
    startY = clientY;
    previousMousePosition = { x: clientX, y: clientY };
}

function onPointerMove(e) {
    if (!isDragging) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const deltaMove = {
        x: clientX - previousMousePosition.x,
        y: clientY - previousMousePosition.y
    };

    dragDistance += Math.abs(deltaMove.x) + Math.abs(deltaMove.y);

    cube.rotation.y += deltaMove.x * 0.01;
    cube.rotation.x += deltaMove.y * 0.01;

    previousMousePosition = { x: clientX, y: clientY };
}

function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;

    // Если сдвинули меньше 15 пикселей — это тап, а не свайп
    if (dragDistance < 15) {
        const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
        handleTap(clientX, clientY);
    }
}

// Привязываем события к самому холсту (canvas), а не к window
renderer.domElement.addEventListener('mousedown', onPointerDown);
renderer.domElement.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', onPointerUp); // mouseup на window, чтобы работало, если увести мышь

// Для тач-экранов используем passive: false, чтобы работал preventDefault, если понадобится
renderer.domElement.addEventListener('touchstart', onPointerDown, { passive: true });
renderer.domElement.addEventListener('touchmove', onPointerMove, { passive: true });
window.addEventListener('touchend', onPointerUp);

// --- РЕСАЙЗ И АНИМАЦИЯ ---
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
