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
            direction: this.direction,
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
        this.maneuverNodes = [{ courseDegree, deltaV, executionTime }];
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
        const anomaly = calculateTrueAnomaly(exactTime, this.period, this.e, this.offset, this.direction);
        const vel = getVelocityAtAnomaly(this.a, this.e, anomaly, this.omega, parentMu, this.direction);
        const pos = getPositionAtAnomaly(this.a, this.e, anomaly, this.omega);
        
        const courseRad = (courseDegree - 90) * (Math.PI / 180);
        vel.vx += deltaV * Math.cos(courseRad);
        vel.vy += deltaV * Math.sin(courseRad);
        
        const newOrbit = cartesianToKepler(pos.x, pos.y, vel.vx, vel.vy, exactTime, parentMu);
        
        this.a = newOrbit.a;
        this.e = newOrbit.e;
        this.omega = newOrbit.omega;
        this.offset = newOrbit.offset;
        this.period = newOrbit.period;
        this.direction = newOrbit.direction; 
        
        this.commitStateToHistory(exactTime);
        return { success: true };
    }

    checkSoITransitions(time, systemEntities) {
        let targetParent = null;
        let minSoI = Infinity;

        // 1. Проверяем ВХОД в чужую SoI
        for (const body of systemEntities) {
            // Нельзя войти в себя, в другие корабли или в своего текущего родителя
            if (body.type === 'ship' || body === this || body === this.parent) continue;

            const dist = Math.hypot(this.x - body.x, this.y - body.y);
            // Гистерезис 0.99: входим, когда пересекли границу чуть вглубь
            if (dist < body.soi * 0.99 && body.soi < minSoI) {
                minSoI = body.soi;
                targetParent = body;
            }
        }

        // 2. Проверяем ВЫХОД из текущей SoI
        if (!targetParent && this.parent && this.parent.parent) {
            const distToParent = Math.hypot(this.x - this.parent.x, this.y - this.parent.y);
            // Гистерезис 1.01: вылетаем, когда чуть-чуть отдалились за границу
            if (distToParent > this.parent.soi * 1.01) {
                targetParent = this.parent.parent;
            }
        }

        if (targetParent && targetParent !== this.parent) {
            this.transitionToParent(targetParent, time);
        }
    }

    transitionToParent(newParent, time) {
        console.log(`[NAV SYS]: ${this.name} SoI Transition: ${this.parent.name} -> ${newParent.name}`);
        const myAbsPos = this.getAbsolutePositionAtTime(time);
        const myAbsVel = this.getAbsoluteVelocityAtTime(time);
        const parentAbsPos = newParent.getAbsolutePositionAtTime(time);
        const parentAbsVel = newParent.getAbsoluteVelocityAtTime(time);

        const relX = myAbsPos.x - parentAbsPos.x;
        const relY = myAbsPos.y - parentAbsPos.y;
        const relVx = myAbsVel.vx - parentAbsVel.vx;
        const relVy = myAbsVel.vy - parentAbsVel.vy;

        const newOrbit = cartesianToKepler(relX, relY, relVx, relVy, time, newParent.mu);

        this.a = newOrbit.a; this.e = newOrbit.e; this.omega = newOrbit.omega; 
        this.offset = newOrbit.offset; this.period = newOrbit.period;
        
        // Перехватываем новое направление!
        this.direction = newOrbit.direction; 

        const oldIndex = this.parent.children.indexOf(this);
        if (oldIndex > -1) this.parent.children.splice(oldIndex, 1);
        this.parent = newParent;
        this.parent.children.push(this);

        this.commitStateToHistory(time);
    }

    getPredictedPath(systemEntities, currentTime) {
        let node;
        let hasNode = false;
        
        if (this.maneuverNodes.length > 0) {
            node = this.maneuverNodes[0];
            hasNode = true;
        } else {
            // Если маневра нет, создаем "пустышку" прямо сейчас с нулевым импульсом
            node = { executionTime: currentTime, courseDegree: 0, deltaV: 0 };
        }
        
        let t = node.executionTime;
        let dummyParent = this.parent;
        
        const anomaly = calculateTrueAnomaly(t, this.period, this.e, this.offset, this.direction);
        const pos = getPositionAtAnomaly(this.a, this.e, anomaly, this.omega);
        const vel = getVelocityAtAnomaly(this.a, this.e, anomaly, this.omega, dummyParent.mu, this.direction);
        
        const courseRad = (node.courseDegree - 90) * (Math.PI / 180);
        vel.vx += node.deltaV * Math.cos(courseRad);
        vel.vy += node.deltaV * Math.sin(courseRad);
        
        let orbit = cartesianToKepler(pos.x, pos.y, vel.vx, vel.vy, t, dummyParent.mu);
        const path = [];
        const maxSteps = 400; 
        
        const parentStartPos = dummyParent.getAbsolutePositionAtTime(t);
        const nodeAbsPos = { x: parentStartPos.x + pos.x, y: parentStartPos.y + pos.y };

        for (let i = 0; i < maxSteps; i++) {
            let dt = 1;
            if (dummyParent.soi < 100) dt = 0.5; 
            else if (orbit.e < 1) dt = Math.max(0.5, orbit.period / maxSteps); 
            else dt = 5; 

            t += dt;
            
            const parentAbsPos = dummyParent.getAbsolutePositionAtTime(t);
            const parentAbsVel = dummyParent.getAbsoluteVelocityAtTime(t);
            
            const currentAnomaly = calculateTrueAnomaly(t, orbit.period, orbit.e, orbit.offset, orbit.direction);
            const localPos = getPositionAtAnomaly(orbit.a, orbit.e, currentAnomaly, orbit.omega);
            const absPos = { x: parentAbsPos.x + localPos.x, y: parentAbsPos.y + localPos.y };
            
            path.push({ x: absPos.x, y: absPos.y, parentName: dummyParent.name });
            
            let newParent = null;
            let minSoI = Infinity;
            
            for (const body of systemEntities) {
                if (body.type === 'ship' || body === dummyParent) continue;
                const bodyAbsPos = body.getAbsolutePositionAtTime(t);
                const dist = Math.hypot(absPos.x - bodyAbsPos.x, absPos.y - bodyAbsPos.y);
                if (dist < body.soi * 0.99 && body.soi < minSoI) {
                    minSoI = body.soi;
                    newParent = body;
                }
            }
            
            if (!newParent && dummyParent.parent) {
                const distToParent = Math.hypot(absPos.x - parentAbsPos.x, absPos.y - parentAbsPos.y);
                if (distToParent > dummyParent.soi * 1.01) {
                    newParent = dummyParent.parent;
                }
            }
            
            if (newParent) {
                const localVel = getVelocityAtAnomaly(orbit.a, orbit.e, currentAnomaly, orbit.omega, dummyParent.mu, orbit.direction);
                const absVel = { vx: parentAbsVel.vx + localVel.vx, vy: parentAbsVel.vy + localVel.vy };
                
                const newParentAbsPos = newParent.getAbsolutePositionAtTime(t);
                const newParentAbsVel = newParent.getAbsoluteVelocityAtTime(t);
                
                const relX = absPos.x - newParentAbsPos.x;
                const relY = absPos.y - newParentAbsPos.y;
                const relVx = absVel.vx - newParentAbsVel.vx;
                const relVy = absVel.vy - newParentAbsVel.vy;
                
                orbit = cartesianToKepler(relX, relY, relVx, relVy, t, newParent.mu);
                dummyParent = newParent;
                
                path.push({ x: absPos.x, y: absPos.y, transition: newParent.name });
            }
        }
        
        // Возвращаем флаг hasNode, чтобы знать, рисовать ли желтый прицел
        return { nodeAbsPos, path, hasNode }; 
    }

}