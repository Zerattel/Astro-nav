// js/main.js
import { Renderer } from './ui/Renderer.js';
import { TimeManager } from './engine/TimeManager.js';
import { CelestialBody } from './entities/CelestialBody.js';
import { Ship } from './entities/Ship.js'; // Подключаем класс корабля

const renderer = new Renderer('star-map');
const timeManager = new TimeManager();
const C_SPEED = 100;

// Обрати внимание на последний параметр (omega). Теперь орбиты повернуты!
const sun = new CelestialBody("Sol-Prime", "star", 15, null, 0, 0, 0, 0, 5000); 
const p1 = new CelestialBody("Icarus", "planet", 6, sun, 150, 0.2, 0, 0, 100);
const p2 = new CelestialBody("Goliath", "planet", 12, sun, 450, 0.05, 100, Math.PI / 4, 800);
const m1 = new CelestialBody("Titan", "moon", 3, p2, 40, 0.1, 0, -Math.PI / 6, 10);
const p3 = new CelestialBody("Pluto-X", "planet", 4, sun, 800, 0.7, 500, Math.PI / 2, 50);

const ship1 = new Ship("UNS-Ares", "Корвет", p2, 70, 0, 0); 
const ship2 = new Ship("Trident-9", "Фрегат", sun, 300, 0.4, 0, Math.PI);

const systemEntities = [sun, p1, p2, m1, p3, ship1, ship2];

// UI Элементы
const uiTime = document.getElementById('ui-time');
const uiWarp = document.getElementById('ui-warp');
const btnPause = document.getElementById('btn-pause');
const btnRand = document.getElementById('btn-rand');
const warpButtons = document.querySelectorAll('.btn-warp');
const uiTrackedCount = document.getElementById('ui-tracked-count');
const btnBurn = document.getElementById('btn-burn');
const inpCourse = document.getElementById('inp-course');
const inpDv = document.getElementById('inp-dv');
const inpDelay = document.getElementById('inp-delay');
const btnViewMode = document.getElementById('btn-view-mode');
let viewObserver = null; // null = Global view, объект = Tactical view

// UI Выделенной цели
let selectedEntity = null;
const panelTarget = document.getElementById('panel-target');
const tgtName = document.getElementById('tgt-name');
const tgtType = document.getElementById('tgt-type');
const maneuverUI = document.getElementById('maneuver-ui');

uiTrackedCount.innerText = systemEntities.length;

// --- ОБРАБОТКА КЛИКОВ (ВЫДЕЛЕНИЕ ОБЪЕКТОВ) ---
renderer.canvas.addEventListener('click', (e) => {
    // Получаем координаты клика относительно канваса
    const rect = renderer.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Переводим экранные координаты в координаты симуляции
    const worldClick = renderer.toWorld(mouseX, mouseY);

    let closestEntity = null;
    let minDistance = Infinity;

    // Ищем ближайший объект (с учетом погрешности клика, скажем 15px в мире)
    systemEntities.forEach(entity => {
        const dx = entity.x - worldClick.x;
        const dy = entity.y - worldClick.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Даем радиус захвата чуть больше самого объекта для удобства
        const hitRadius = Math.max(entity.radius, 10) / renderer.zoom; 

        if (dist < hitRadius && dist < minDistance) {
            minDistance = dist;
            closestEntity = entity;
        }
    });

    selectedEntity = closestEntity;
    
    // Обновляем UI
    if (selectedEntity) {
        panelTarget.style.display = 'block';
        tgtName.innerText = selectedEntity.name;
        
        if (selectedEntity.type === 'ship') {
            tgtType.innerText = `SHIP [${selectedEntity.shipClass}]`;
            maneuverUI.style.display = 'block'; // Показываем панель маневров
        } else {
            tgtType.innerText = selectedEntity.type.toUpperCase();
            maneuverUI.style.display = 'none'; // Скрываем панель маневров для планет
        }
    } else {
        panelTarget.style.display = 'none';
    }
});

btnBurn.addEventListener('click', () => {
    if (selectedEntity && selectedEntity.type === 'ship') {
        const course = parseFloat(inpCourse.value);
        const dv = parseFloat(inpDv.value);
        const delay = parseFloat(inpDelay.value);
        
        if (isNaN(course) || isNaN(dv) || isNaN(delay)) {
            alert("SYS ERROR: Invalid input.");
            return;
        }
        
        // Вычисляем абсолютное время, когда маневр должен произойти
        const executionTime = timeManager.time + delay;
        
        // Загружаем маневр в бортовой компьютер корабля
        selectedEntity.planManeuver(course, dv, executionTime);
        
        // Кнопка мигает для подтверждения
        btnBurn.innerText = "NODE UPLOADED";
        setTimeout(() => btnBurn.innerText = "UPLOAD NODE", 1500);
    }
});

btnViewMode.addEventListener('click', () => {
    if (viewObserver === null) {
        // Пытаемся включить тактический вид
        if (selectedEntity && selectedEntity.type === 'ship') {
            viewObserver = selectedEntity;
            btnViewMode.innerText = `VIEW: TACTICAL [${selectedEntity.name}]`;
            btnViewMode.style.borderColor = "#ff0044";
            btnViewMode.style.color = "#ff0044";
        } else {
            alert("SYS: Select a ship first to enter Tactical View.");
        }
    } else {
        // Возвращаемся в глобальный вид
        viewObserver = null;
        btnViewMode.innerText = "VIEW: GLOBAL (GM)";
        btnViewMode.style.borderColor = "#00ffcc";
        btnViewMode.style.color = "#00ffcc";
    }
});

// ... (обработчики кнопок времени остаются как были) ...
btnPause.addEventListener('click', () => {
    const isPaused = timeManager.togglePause();
    btnPause.innerText = isPaused ? "> PLAY" : "|| PAUSE";
    btnPause.classList.toggle('active', isPaused);
});

btnRand.addEventListener('click', () => timeManager.addRandomTime());

warpButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const warp = parseInt(e.target.dataset.warp);
        timeManager.setTimeScale(warp);
        uiWarp.innerText = warp;
        warpButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
    });
});

// --- ГЛАВНЫЙ ЦИКЛ ---
function renderLoop() {
    timeManager.update();
    uiTime.innerText = timeManager.time.toFixed(1);

    renderer.clear();

    // 1. Физика: Обновляем РЕАЛЬНЫЕ позиции (для маневров и столкновений)
    sun.updatePosition(timeManager.time);

    // 2. Релятивность: Вычисляем ВИДИМЫЕ позиции (с учетом задержки света)
    sun.updateRenderPosition(viewObserver, timeManager.time, C_SPEED);

    // 3. Отрисовка
    systemEntities.forEach(entity => {
        // Рисуем орбиту (сдвигаем ее туда, где мы ВИДИМ родителя)
        if (entity.parent) {
            const path = generateOrbitPath(entity.a, entity.e, entity.omega); // из Kepler.js
            const renderPath = path.map(p => ({
                x: p.x + entity.parent.renderX, 
                y: p.y + entity.parent.renderY
            }));
            renderer.drawOrbit(renderPath);
        }
        
        // Рисуем сам объект
        renderer.drawEntity(entity);
        
        // Подсветка выделенного объекта (используем renderX/renderY!)
        if (entity === selectedEntity) {
            const screenPos = renderer.toScreen(entity.renderX, entity.renderY);
            renderer.ctx.beginPath();
            renderer.ctx.arc(screenPos.x, screenPos.y, (entity.radius * renderer.zoom) + 10, 0, Math.PI * 2);
            renderer.ctx.strokeStyle = '#ffaa00';
            renderer.ctx.setLineDash([4, 4]);
            renderer.ctx.stroke();
            renderer.ctx.setLineDash([]);
        }
    });

    requestAnimationFrame(renderLoop);
}

document.querySelector('[data-warp="1"]').classList.add('active');
renderLoop();