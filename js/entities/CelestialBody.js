// js/entities/CelestialBody.js
import { calculateTrueAnomaly, getPositionAtAnomaly, calculatePeriod, generateOrbitPath } from '../physics/Kepler.js';

export class CelestialBody {
    // ДОБАВИЛИ mu в конец (по умолчанию берем ту же константу, чтобы ничего не сломать)
    constructor(name, type, radius, parent = null, a = 0, e = 0, offset = 0, omega = 0, mu = 3947.84) {
        this.name = name;
        this.type = type;
        this.radius = radius;
        this.mu = mu; // <--- Собственная сила притяжения этого тела
        
        this.parent = parent;
        this.a = a;
        this.e = e;
        this.offset = offset;
        this.omega = omega;
        
        // Считаем период, основываясь на гравитации РОДИТЕЛЯ (вокруг кого летим)
        this.period = (a > 0 && parent) ? calculatePeriod(a, parent.mu) : 0;
        
        this.children = [];
        if (this.parent) this.parent.children.push(this);

        this.x = 0;
        this.y = 0;
        this.lastX = 0;
        this.lastY = 0;
    }

    updatePosition(time) {
        this.lastX = this.x;
        this.lastY = this.y;

        if (!this.parent || this.a === 0) {
            this.x = 0;
            this.y = 0;
        } else {
            // Передаем гравитацию родителя
            const anomaly = calculateTrueAnomaly(time, this.period, this.e, this.offset);
            const localPos = getPositionAtAnomaly(this.a, this.e, anomaly, this.omega);
            
            this.x = this.parent.x + localPos.x;
            this.y = this.parent.y + localPos.y;
        }

        for (const child of this.children) {
            child.updatePosition(time);
        }
    }

    getAbsolutePositionAtTime(time) {
        if (!this.parent || this.a === 0) {
            return { x: 0, y: 0 };
        }
        
        const parentPos = this.parent.getAbsolutePositionAtTime(time);
        const anomaly = calculateTrueAnomaly(time, this.period, this.e, this.offset);
        const localPos = getPositionAtAnomaly(this.a, this.e, anomaly, this.omega);
        
        return {
            x: parentPos.x + localPos.x,
            y: parentPos.y + localPos.y
        };
    }

    updateRenderPosition(observer, currentTime, cSpeed) {
        if (!observer || observer === this) {
            // В режиме бога или для самого себя задержки нет
            this.renderX = this.x;
            this.renderY = this.y;
        } else {
            // Итеративное вычисление задержки света (3 итерации дают точность 99.9%)
            let tPast = currentTime;
            for (let i = 0; i < 3; i++) {
                const pastPos = this.getAbsolutePositionAtTime(tPast);
                const distance = Math.hypot(pastPos.x - observer.x, pastPos.y - observer.y);
                tPast = currentTime - (distance / cSpeed);
            }
            
            // Получаем финальные координаты из прошлого
            const finalPos = this.getAbsolutePositionAtTime(tPast);
            this.renderX = finalPos.x;
            this.renderY = finalPos.y;
        }

        // Обновляем детей (луны, станции)
        for (const child of this.children) {
            child.updateRenderPosition(observer, currentTime, cSpeed);
        }
    }
    getAbsoluteOrbitPath() {
        if (!this.parent || this.a === 0) return [];
        const localPath = generateOrbitPath(this.a, this.e, this.omega);
        return localPath.map(p => ({
            x: p.x + this.parent.x,
            y: p.y + this.parent.y
        }));
    }
}