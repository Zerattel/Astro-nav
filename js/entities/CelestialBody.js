// js/entities/CelestialBody.js
import { calculateTrueAnomaly, getPositionAtAnomaly, calculatePeriod, generateOrbitPath } from '../physics/Kepler.js';

export class CelestialBody {
    constructor(name, type, radius, parent = null, a = 0, e = 0, offset = 0, omega = 0, mu = 3947.84) {
        this.name = name;
        this.type = type;
        this.radius = radius;
        this.mu = mu;
        
        this.parent = parent;
        this.a = a;
        this.e = e;
        this.offset = offset;
        this.omega = omega;
        this.period = (a > 0 && parent) ? calculatePeriod(a, parent.mu) : 0;
        
        // НОВОЕ: Сфера влияния (SoI)
        if (this.parent && this.a > 0) {
            // Формула Сферы Влияния Лапласа: R * (m/M)^0.4
            this.soi = this.a * Math.pow(this.mu / this.parent.mu, 0.4);
        } else {
            this.soi = Infinity; // У центральной звезды бесконечная сфера
        }
        
        // --- НОВОЕ: Журнал орбит (Time = -Infinity означает "с начала времен") ---
        this.orbitalHistory = [{
            time: -Infinity,
            a: this.a,
            e: this.e,
            omega: this.omega,
            offset: this.offset,
            period: this.period
        }];
        
        this.children = [];
        if (this.parent) this.parent.children.push(this);

        this.x = 0;
        this.y = 0;
        this.lastX = 0;
        this.lastY = 0;

        // Координаты и параметры орбиты для видимого прошлого
        this.renderX = 0;
        this.renderY = 0;
        this.renderA = this.a;
        this.renderE = this.e;
        this.renderOmega = this.omega;
    }

    /**
     * НОВОЕ: Находит параметры орбиты, актуальные для заданного времени в прошлом
     */
    getHistoricalState(time) {
        // Идем с конца массива к началу, ищем ближайшее прошлое
        for (let i = this.orbitalHistory.length - 1; i >= 0; i--) {
            if (time >= this.orbitalHistory[i].time) {
                return this.orbitalHistory[i];
            }
        }
        return this.orbitalHistory[0];
    }

    getAbsoluteVelocityAtTime(time) {
        if (!this.parent || this.a === 0) return { vx: 0, vy: 0 };
        
        const state = this.getHistoricalState(time);
        if (state.a === 0) return this.parent.getAbsoluteVelocityAtTime(time);

        const anomaly = calculateTrueAnomaly(time, state.period, state.e, state.offset);
        // Скорость относительно родителя
        const localVel = getVelocityAtAnomaly(state.a, state.e, anomaly, state.omega, this.parent.mu);
        // Скорость самого родителя
        const parentVel = this.parent.getAbsoluteVelocityAtTime(time);
        
        return {
            vx: localVel.vx + parentVel.vx,
            vy: localVel.vy + parentVel.vy
        };
    }

    updatePosition(time, systemEntities = []) {
        this.lastX = this.x;
        this.lastY = this.y;

        if (!this.parent || this.a === 0) {
            this.x = 0;
            this.y = 0;
        } else {
            const anomaly = calculateTrueAnomaly(time, this.period, this.e, this.offset);
            const localPos = getPositionAtAnomaly(this.a, this.e, anomaly, this.omega);
            this.x = this.parent.x + localPos.x;
            this.y = this.parent.y + localPos.y;
        }

        for (const child of this.children) {
            child.updatePosition(time, systemEntities);
        }
    }

    getAbsolutePositionAtTime(time) {
        if (!this.parent) return { x: 0, y: 0 };
        
        // НОВОЕ: Берем параметры орбиты из нужной эпохи!
        const state = this.getHistoricalState(time);
        
        if (state.a === 0) return this.parent.getAbsolutePositionAtTime(time);

        const parentPos = this.parent.getAbsolutePositionAtTime(time);
        const anomaly = calculateTrueAnomaly(time, state.period, state.e, state.offset);
        const localPos = getPositionAtAnomaly(state.a, state.e, anomaly, state.omega);
        
        return {
            x: parentPos.x + localPos.x,
            y: parentPos.y + localPos.y
        };
    }

    updateRenderPosition(observer, currentTime, cSpeed) {
        if (!observer || observer === this) {
            // В Режиме Бога мы видим настоящее
            this.renderX = this.x;
            this.renderY = this.y;
            this.renderA = this.a;
            this.renderE = this.e;
            this.renderOmega = this.omega;
        } else {
            // Рассчитываем задержку света
            let tPast = currentTime;
            for (let i = 0; i < 3; i++) {
                const pastPos = this.getAbsolutePositionAtTime(tPast);
                const distance = Math.hypot(pastPos.x - observer.x, pastPos.y - observer.y);
                tPast = currentTime - (distance / cSpeed);
            }
            
            // Фиксируем координаты из прошлого
            const finalPos = this.getAbsolutePositionAtTime(tPast);
            this.renderX = finalPos.x;
            this.renderY = finalPos.y;
            
            // НОВОЕ: Фиксируем ФОРМУ ОРБИТЫ, какой она была в прошлом!
            const pastState = this.getHistoricalState(tPast);
            this.renderA = pastState.a;
            this.renderE = pastState.e;
            this.renderOmega = pastState.omega;
        }

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