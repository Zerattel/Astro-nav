// js/main.js
import { Renderer } from './ui/Renderer.js';
import { TimeManager } from './engine/TimeManager.js';
import { CelestialBody } from './entities/CelestialBody.js';
import { Ship } from './entities/Ship.js';
import { generateOrbitPath, getTimeAtAnomaly } from './physics/Kepler.js';

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
p2.spriteClass = 'GAS_GIANT'; 
p2.color = '#ffaa00';
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
let viewObserver = null;
const sensorsUI = document.getElementById('sensors-ui');
const chkRadar = document.getElementById('chk-radar');
const chkMag = document.getElementById('chk-mag');
const chkLadar = document.getElementById('chk-ladar');
const inpLadarAz = document.getElementById('inp-ladar-az');
const chkGrav = document.getElementById('chk-grav');
const chkThermal = document.getElementById('chk-thermal');
const chkPredict = document.getElementById('chk-predict');

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
    const worldClick = renderer.toWorld(mouseX, mouseY);

    let closestEntity = null;
    let minDistance = Infinity;

    systemEntities.forEach(entity => {
        const dx = entity.x - worldClick.x;
        const dy = entity.y - worldClick.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hitRadius = Math.max(entity.radius, 10) / renderer.zoom; 
        if (dist < hitRadius && dist < minDistance) {
            minDistance = dist;
            closestEntity = entity;
        }
    });

    // Если кликнули в пустоту, проверяем, не кликнули ли мы ПО ОРБИТЕ текущего корабля
    let clickedOrbit = false;
    
    if (!closestEntity && selectedEntity && selectedEntity.type === 'ship' && selectedEntity.parent) {
        // Вектор от родителя к месту клика
        const dx = worldClick.x - selectedEntity.parent.renderX;
        const dy = worldClick.y - selectedEntity.parent.renderY;
        const clickAngle = Math.atan2(dy, dx);
        
        // Получаем угол (Истинную аномалию) места клика
        let theta = clickAngle - selectedEntity.renderOmega;
        theta = Math.atan2(Math.sin(theta), Math.cos(theta)); // Нормализация угла
        
        // Радиус орбиты в этом угле
        const e = selectedEntity.renderE;
        const a = selectedEntity.renderA;
        const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
        
        const dist = Math.hypot(dx, dy);
        const hitTolerance = 15 / renderer.zoom; // Зона поражения кликом масштабируется зумом

        // Если дистанция от клика до центра совпадает с радиусом эллипса в этой точке
        if (Math.abs(dist - r) < hitTolerance) {
            clickedOrbit = true;
            
            // Вычисляем время до этой точки
            const targetTime = getTimeAtAnomaly(
                theta, 
                selectedEntity.period, 
                selectedEntity.renderE, 
                selectedEntity.offset, 
                selectedEntity.direction, 
                timeManager.time
            );
            
            // Обновляем инпут DELAY
            const delay = targetTime - timeManager.time;
            inpDelay.value = delay.toFixed(1);
            
            // Мигаем полем для обратной связи
            inpDelay.style.backgroundColor = 'rgba(255, 170, 0, 0.3)';
            setTimeout(() => inpDelay.style.backgroundColor = 'transparent', 300);
        }
    }

    if (closestEntity) {
        selectedEntity = closestEntity;
    } else if (!clickedOrbit) {
        // Снимаем выделение только если кликнули совсем в пустоту
        selectedEntity = null;
    }
    
    // Обновляем UI
    if (selectedEntity) {
        panelTarget.style.display = 'block';
        tgtName.innerText = selectedEntity.name;
        
        if (selectedEntity.type === 'ship') {
            tgtType.innerText = `SHIP [${selectedEntity.shipClass}]`;
            maneuverUI.style.display = 'block';
            sensorsUI.style.display = 'block';
            
            chkRadar.checked = selectedEntity.radarActive;
            chkMag.checked = selectedEntity.magActive;
            chkLadar.checked = selectedEntity.ladarActive;
            inpLadarAz.value = selectedEntity.ladarAzimuth;
            chkGrav.checked = selectedEntity.gravSignature;
            chkThermal.checked = selectedEntity.thermalSignature;
        } else {
            tgtType.innerText = selectedEntity.type.toUpperCase();
            maneuverUI.style.display = 'none';
            sensorsUI.style.display = 'none';
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

chkRadar.addEventListener('change', () => selectedEntity?.toggleRadar(timeManager.time));
chkMag.addEventListener('change', () => selectedEntity?.toggleMag(timeManager.time));
chkLadar.addEventListener('change', () => selectedEntity?.toggleLadar(timeManager.time));
inpLadarAz.addEventListener('change', () => selectedEntity?.setLadarAzimuth(parseFloat(inpLadarAz.value), timeManager.time));
chkGrav.addEventListener('change', () => selectedEntity?.toggleGravSignature(timeManager.time));
chkThermal.addEventListener('change', () => selectedEntity?.toggleThermal(timeManager.time));

// Функция проверки преград (лун, планет) между точкой А и точкой Б
function isLineOfSightClear(x1, y1, x2, y2) {
    for (const body of systemEntities) {
        // Корабли и станции не перекрывают видимость для Ладара
        if (body.type === 'ship' || body.type === 'station') continue; 
        
        // Векторная математика: находим кратчайшее расстояние от центра планеты до луча
        const l2 = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
        if (l2 === 0) continue;
        
        // Проекция точки (планеты) на отрезок луча
        let t = ((body.renderX - x1) * (x2 - x1) + (body.renderY - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t)); // Ограничиваем отрезком от 0 до 1
        
        const projX = x1 + t * (x2 - x1);
        const projY = y1 + t * (y2 - y1);
        
        const distToLine = Math.hypot(body.renderX - projX, body.renderY - projY);
        
        // Если луч прошел ближе к центру планеты, чем ее радиус — он заблокирован!
        if (distToLine < body.radius) {
            return false; 
        }
    }
    return true;
}

// Функция для проверки, попадает ли цель в узкий сектор Ладара
function isInLadarCone(observerX, observerY, targetX, targetY, azDeg) {
    const azRad = (azDeg - 90) * (Math.PI / 180);
    const angleToTarget = Math.atan2(targetY - observerY, targetX - observerX);
    
    // Нормализация разницы углов
    let diff = Math.abs(angleToTarget - azRad);
    while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
    
    // Половина ширины луча (0.05 радиан ~ 3 градуса)
    return diff <= 0.05; 
}

// --- ГЛАВНЫЙ ЦИКЛ ---
function renderLoop() {
    timeManager.update();
    uiTime.innerText = timeManager.time.toFixed(1);

    renderer.clear();

    sun.updatePosition(timeManager.time, systemEntities);
    sun.updateRenderPosition(viewObserver, timeManager.time, C_SPEED);

    // Сначала рисуем зоны сенсоров (чтобы они были под кораблями)
    if (viewObserver && viewObserver.type === 'ship') {
        renderer.drawSensorZones(viewObserver, systemEntities);
    } else {
        // В режиме бога рисуем зоны всех кораблей
        systemEntities.forEach(e => {
            if (e.type === 'ship') renderer.drawSensorZones(e, systemEntities);
        });
    }

    systemEntities.forEach(entity => {
        // --- ЛОГИКА ВИДИМОСТИ ---
        let isVisible = true;
        
        if (viewObserver && entity !== viewObserver && entity.type === 'ship') {
            isVisible = false; 
            
            let pastState = entity; 
            if (entity.orbitalHistory) {
                 const distanceToTarget = Math.hypot(entity.renderX - viewObserver.renderX, entity.renderY - viewObserver.renderY);
                 const tPast = timeManager.time - (distanceToTarget / C_SPEED);
                 pastState = entity.getHistoricalState(tPast);
            }

            const dist = Math.hypot(entity.renderX - viewObserver.renderX, entity.renderY - viewObserver.renderY);
            
            // Проверка преград для Ладара и Радара
            const hasLoS = isLineOfSightClear(viewObserver.renderX, viewObserver.renderY, entity.renderX, entity.renderY);

            // 1. МАГНИТОМЕТР (Не требует Line of Sight)
            if (viewObserver.magActive && dist <= viewObserver.magRange) isVisible = true;
            if (!isVisible && pastState.magActive) isVisible = true;

            // 2. РАДАР (ОБНОВЛЕНО: Теперь строго требует Line of Sight!)
            if (viewObserver.radarActive && dist <= viewObserver.radarRange && hasLoS) isVisible = true;
            if (!isVisible && pastState.radarActive && dist <= entity.radarRange * 2 && hasLoS) isVisible = true;

            // 3. ЛАДАР (Требует Line of Sight)
            if (!isVisible && viewObserver.ladarActive && hasLoS) {
                if (isInLadarCone(viewObserver.renderX, viewObserver.renderY, entity.renderX, entity.renderY, viewObserver.ladarAzimuth)) {
                    isVisible = true;
                }
            }
            if (!isVisible && pastState.ladarActive && hasLoS) isVisible = true;

            // 4. ПАССИВНЫЕ ИЛС и ГРАВИТОМЕТР
            if (pastState.gravSignature) renderer.drawBearing(viewObserver, entity, '#ff00aa', 'GRAV');
            // Тепловая сигнатура (ИК-диапазон) тоже должна блокироваться планетами
            if (pastState.thermalSignature && hasLoS) renderer.drawBearing(viewObserver, entity, '#ffaa00', 'THERMAL');
        }

        // --- ОТРИСОВКА (если видим) ---
        if (isVisible || !viewObserver) {
            if (entity.parent) {
                const renderA = entity.renderA !== undefined ? entity.renderA : entity.a;
                const renderE = entity.renderE !== undefined ? entity.renderE : entity.e;
                const renderOmega = entity.renderOmega !== undefined ? entity.renderOmega : entity.omega;
                
                const path = generateOrbitPath(renderA, renderE, renderOmega); 
                const renderPath = path.map(p => ({
                    x: p.x + entity.parent.renderX,
                    y: p.y + entity.parent.renderY
                }));
                
                // Если это выделенный корабль - его текущая орбита рисуется ЖЕЛТЫМ
                const isSelectedShip = (entity === selectedEntity && entity.type === 'ship');
                const orbitColor = isSelectedShip ? 'rgba(255, 170, 0, 0.4)' : 'rgba(255, 255, 255, 0.2)';
                
                renderer.drawOrbit(renderPath, orbitColor, !isSelectedShip); // У выделенного сплошная линия
            }
            
            renderer.drawEntity(entity);
            
            // НОВОЕ: Отрисовка ПРОГНОЗА, если выделен корабль, есть нода и включен перк
            if (entity === selectedEntity && entity.type === 'ship' && chkPredict.checked) {
                // ПЕРЕДАЕМ timeManager.time вторым аргументом!
                const prediction = entity.getPredictedPath(systemEntities, timeManager.time);
                if (prediction) {
                    const offsetX = entity.parent.renderX - entity.parent.x;
                    const offsetY = entity.parent.renderY - entity.parent.y;
                    renderer.drawPredictedPath(prediction, offsetX, offsetY);
                }
            }
            
            if (entity === selectedEntity) {
                const screenPos = renderer.toScreen(entity.renderX, entity.renderY);
                // ... (тут старый код штрихового круга вокруг объекта)
                renderer.ctx.beginPath();
                renderer.ctx.arc(screenPos.x, screenPos.y, (entity.radius * renderer.zoom) + 10, 0, Math.PI * 2);
                renderer.ctx.strokeStyle = '#ffaa00';
                renderer.ctx.setLineDash([4, 4]);
                renderer.ctx.stroke();
                renderer.ctx.setLineDash([]);
            }
        }
    });

    requestAnimationFrame(renderLoop);
}

document.querySelector('[data-warp="1"]').classList.add('active');
renderLoop();