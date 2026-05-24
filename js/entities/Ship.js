// js/entities/Ship.js
import { CelestialBody } from './CelestialBody.js';
import { calculateTrueAnomaly, getPositionAtAnomaly, getVelocityAtAnomaly, cartesianToKepler, MU } from '../physics/Kepler.js';

export class Ship extends CelestialBody {
    constructor(name, shipClass, parent, a, e, offset, omega = 0) {
        super(name, 'ship', 3, parent, a, e, offset, omega);
        this.shipClass = shipClass;
        this.heading = 0; 
        this.maneuverNodes = []; 
        
        // --- СЕНСОРЫ И СИГНАТУРЫ ---
        this.radarActive = false;
        this.radarRange = 150; 
        
        // НОВОЕ: Магнитометр
        this.magActive = false;
        this.magRange = 50; // Малая дальность
        
        // НОВОЕ: Ладар
        this.ladarActive = false;
        this.ladarAzimuth = 0; // Направление луча в градусах
        
        // Пассивные засветы (для ГМа)
        this.gravSignature = false; 
        this.thermalSignature = false; // НОВОЕ: Для ИЛС
        
        // Обновляем стартовую историю
        this.orbitalHistory[0].radarActive = this.radarActive;
        this.orbitalHistory[0].magActive = this.magActive;
        this.orbitalHistory[0].ladarActive = this.ladarActive;
        this.orbitalHistory[0].ladarAzimuth = this.ladarAzimuth;
        this.orbitalHistory[0].gravSignature = this.gravSignature;
        this.orbitalHistory[0].thermalSignature = this.thermalSignature;
    }

    /**
     * Универсальная функция для записи текущего состояния в журнал
     */
    commitStateToHistory(exactTime) {
        this.orbitalHistory.push({
            time: exactTime,
            a: this.a, e: this.e, omega: this.omega, offset: this.offset, period: this.period,
            radarActive: this.radarActive,
            magActive: this.magActive,
            ladarActive: this.ladarActive,
            ladarAzimuth: this.ladarAzimuth,
            gravSignature: this.gravSignature,
            thermalSignature: this.thermalSignature
        });
    }
    toggleMag(time) { this.magActive = !this.magActive; this.commitStateToHistory(time); }
    toggleLadar(time) { this.ladarActive = !this.ladarActive; this.commitStateToHistory(time); }
    setLadarAzimuth(deg, time) { this.ladarAzimuth = deg; this.commitStateToHistory(time); }
    toggleThermal(time) { this.thermalSignature = !this.thermalSignature; this.commitStateToHistory(time); }

    // Включение/выключение радара
    toggleRadar(time) {
        this.radarActive = !this.radarActive;
        this.commitStateToHistory(time);
    }

    // Включение/выключение гравитационного следа (для ГМа)
    toggleGravSignature(time) {
        this.gravSignature = !this.gravSignature;
        this.commitStateToHistory(time);
    }

    planManeuver(courseDegree, deltaV, executionTime) {
        this.maneuverNodes.push({ courseDegree, deltaV, executionTime });
        this.maneuverNodes.sort((a, b) => a.executionTime - b.executionTime);
    }

    updatePosition(time, systemEntities = []) {
        while (this.maneuverNodes.length > 0 && time >= this.maneuverNodes[0].executionTime) {
            const node = this.maneuverNodes.shift();
            this.performManeuver(node.courseDegree, node.deltaV, node.executionTime);
        }

        super.updatePosition(time, systemEntities);
        
        // НОВОЕ: Проверка на пересечение границ Сфер Влияния
        if (systemEntities.length > 0) {
            this.checkSoITransitions(time, systemEntities);
        }
        
        if (this.x !== this.lastX || this.y !== this.lastY) {
            this.heading = Math.atan2(this.y - this.lastY, this.x - this.lastX);
        }
    }

    performManeuver(courseDegree, deltaV, exactTime) {
        if (!this.parent) return { success: false, reason: "No parent body" };

        const parentMu = this.parent.mu; 
        const anomaly = calculateTrueAnomaly(exactTime, this.period, this.e, this.offset);
        const pos = getPositionAtAnomaly(this.a, this.e, anomaly, this.omega);
        const vel = getVelocityAtAnomaly(this.a, this.e, anomaly, this.omega, parentMu);
        
        const courseRad = (courseDegree - 90) * (Math.PI / 180);
        vel.vx += deltaV * Math.cos(courseRad);
        vel.vy += deltaV * Math.sin(courseRad);
        
        const newOrbit = cartesianToKepler(pos.x, pos.y, vel.vx, vel.vy, exactTime, parentMu);
        
        if (newOrbit.error) return { success: false, reason: "Burn exceeds escape velocity." };
        
        this.a = newOrbit.a;
        this.e = newOrbit.e;
        this.omega = newOrbit.omega;
        this.offset = newOrbit.offset;
        this.period = newOrbit.period;
        
        // Используем новую функцию вместо дублирования кода
        this.commitStateToHistory(exactTime);
        return { success: true };
    }

    checkSoITransitions(time, systemEntities) {
        let targetParent = null;
        let minSoI = Infinity;

        // 1. Проверяем, не влетели ли мы в SoI другого тела
        for (const body of systemEntities) {
            if (body.type === 'ship' || body === this) continue;

            const dist = Math.hypot(this.x - body.x, this.y - body.y);
            // Если мы внутри чужой сферы, и она меньше нашей текущей (ищем самую глубокую)
            if (dist < body.soi && body.soi < minSoI) {
                minSoI = body.soi;
                targetParent = body;
            }
        }

        // 2. Если мы вылетели за пределы SoI своего текущего родителя
        if (this.parent && this.parent.parent) {
            const distToParent = Math.hypot(this.x - this.parent.x, this.y - this.parent.y);
            if (distToParent > this.parent.soi) {
                targetParent = this.parent.parent; // Падаем обратно на орбиту дедушки (звезды/планеты)
            }
        }

        // Если родитель сменился - производим перерасчет!
        if (targetParent && targetParent !== this.parent) {
            this.transitionToParent(targetParent, time);
        }
    }

    transitionToParent(newParent, time) {
        console.log(`[NAV SYS]: ${this.name} SoI Transition: ${this.parent.name} -> ${newParent.name}`);

        // 1. Получаем абсолютные координаты и скорости нас и нового родителя
        const myAbsPos = this.getAbsolutePositionAtTime(time);
        const myAbsVel = this.getAbsoluteVelocityAtTime(time);
        
        const parentAbsPos = newParent.getAbsolutePositionAtTime(time);
        const parentAbsVel = newParent.getAbsoluteVelocityAtTime(time);

        // 2. Вычисляем относительные векторы
        const relX = myAbsPos.x - parentAbsPos.x;
        const relY = myAbsPos.y - parentAbsPos.y;
        const relVx = myAbsVel.vx - parentAbsVel.vx;
        const relVy = myAbsVel.vy - parentAbsVel.vy;

        // 3. Конвертируем обратно в Кеплеровские орбиты с гравитацией нового родителя
        const newOrbit = cartesianToKepler(relX, relY, relVx, relVy, time, newParent.mu);

        this.a = newOrbit.a;
        this.e = newOrbit.e;
        this.omega = newOrbit.omega;
        this.offset = newOrbit.offset;
        this.period = newOrbit.period;

        // 4. Переносим себя в дереве иерархии
        const oldIndex = this.parent.children.indexOf(this);
        if (oldIndex > -1) this.parent.children.splice(oldIndex, 1);
        
        this.parent = newParent;
        this.parent.children.push(this);

        // 5. Записываем смену орбиты в Историю (чтобы задержка света работала идеально!)
        this.commitStateToHistory(time);
    }
}