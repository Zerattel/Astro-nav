// js/main.js
import { Renderer } from './ui/Renderer.js';
import { TimeManager } from './engine/TimeManager.js';
import { CelestialBody } from './entities/CelestialBody.js';
import { Ship } from './entities/Ship.js'; // Подключаем класс корабля

const renderer = new Renderer('star-map');
const timeManager = new TimeManager();

// Обрати внимание на последний параметр (omega). Теперь орбиты повернуты!
const sun = new CelestialBody("Sol-Prime", "star", 15);
const p1 = new CelestialBody("Icarus", "planet", 6, sun, 150, 0.2, 0, 0);
const p2 = new CelestialBody("Goliath", "planet", 12, sun, 450, 0.05, 100, Math.PI / 4); // Повернута на 45 град
const m1 = new CelestialBody("Titan", "moon", 3, p2, 40, 0.1, 0, -Math.PI / 6);
const p3 = new CelestialBody("Pluto-X", "planet", 4, sun, 800, 0.7, 500, Math.PI / 2); // Повернута на 90 град

// КОРАБЛИ (находятся на орбитах)
const ship1 = new Ship("UNS-Ares", "Корвет", p2, 70, 0, 0); // На орбите Голиафа
const ship2 = new Ship("Trident-9", "Фрегат", sun, 300, 0.4, 0, Math.PI); // Вытянутая орбита вокруг звезды

const systemEntities = [sun, p1, p2, m1, p3, ship1, ship2];

// UI Элементы
const uiTime = document.getElementById('ui-time');
const uiWarp = document.getElementById('ui-warp');
const btnPause = document.getElementById('btn-pause');
const btnRand = document.getElementById('btn-rand');
const warpButtons = document.querySelectorAll('.btn-warp');
const uiTrackedCount = document.getElementById('ui-tracked-count');

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

    sun.updatePosition(timeManager.time);

    systemEntities.forEach(entity => {
        if (entity.parent) {
            const orbitPath = entity.getAbsoluteOrbitPath();
            renderer.drawOrbit(orbitPath);
        }
        renderer.drawEntity(entity);
        
        // Подсветка выделенного объекта
        if (entity === selectedEntity) {
            const screenPos = renderer.toScreen(entity.x, entity.y);
            renderer.ctx.beginPath();
            renderer.ctx.arc(screenPos.x, screenPos.y, (entity.radius * renderer.zoom) + 10, 0, Math.PI * 2);
            renderer.ctx.strokeStyle = '#ffaa00'; // Оранжевый хазард-цвет
            renderer.ctx.setLineDash([4, 4]);
            renderer.ctx.stroke();
            renderer.ctx.setLineDash([]);
        }
    });

    requestAnimationFrame(renderLoop);
}

document.querySelector('[data-warp="1"]').classList.add('active');
renderLoop();