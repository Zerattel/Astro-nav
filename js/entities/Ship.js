// js/entities/Ship.js
import { CelestialBody } from './CelestialBody.js';
import { calculateTrueAnomaly, getPositionAtAnomaly, getVelocityAtAnomaly, cartesianToKepler } from '../physics/Kepler.js';

export class Ship extends CelestialBody {
    constructor(name, shipClass, parent, a, e, offset, omega = 0) {
        super(name, 'ship', 3, parent, a, e, offset, omega);
        this.shipClass = shipClass;
        this.heading = 0; 
        
        // Очередь запланированных маневров (Узлы)
        this.maneuverNodes = []; 
    }

    /**
     * Добавляет маневр в очередь
     */
    planManeuver(courseDegree, deltaV, executionTime) {
        this.maneuverNodes.push({
            courseDegree,
            deltaV,
            executionTime
        });
        
        // Сортируем по времени (сначала самые ранние)
        this.maneuverNodes.sort((a, b) => a.executionTime - b.executionTime);
    }

    updatePosition(time) {
        // Проверяем очередь маневров. Если настало время - выполняем!
        // Используем while, на случай если на этот кадр выпало сразу два маневра
        while (this.maneuverNodes.length > 0 && time >= this.maneuverNodes[0].executionTime) {
            const node = this.maneuverNodes.shift();
            // Выполняем строго в то время, которое было запланировано
            this.performManeuver(node.courseDegree, node.deltaV, node.executionTime);
        }

        super.updatePosition(time);
        
        if (this.x !== this.lastX || this.y !== this.lastY) {
            this.heading = Math.atan2(this.y - this.lastY, this.x - this.lastX);
        }
    }

    performManeuver(courseDegree, deltaV, exactTime) {
        if (!this.parent) return { success: false, reason: "No parent body" };

        const parentMu = this.parent.mu; // Используем гравитацию того тела, вокруг которого летим

        const anomaly = calculateTrueAnomaly(exactTime, this.period, this.e, this.offset);
        const pos = getPositionAtAnomaly(this.a, this.e, anomaly, this.omega);
        const vel = getVelocityAtAnomaly(this.a, this.e, anomaly, this.omega, parentMu);
        
        const courseRad = (courseDegree - 90) * (Math.PI / 180);
        const dVx = deltaV * Math.cos(courseRad);
        const dVy = deltaV * Math.sin(courseRad);
        
        vel.vx += dVx;
        vel.vy += dVy;
        
        const newOrbit = cartesianToKepler(pos.x, pos.y, vel.vx, vel.vy, exactTime, parentMu);
        
        if (newOrbit.error) {
            console.warn(`Ship ${this.name} aborted burn: Exceeds escape velocity.`);
            return { success: false, reason: "Burn exceeds escape velocity." };
        }
        
        this.a = newOrbit.a;
        this.e = newOrbit.e;
        this.omega = newOrbit.omega;
        this.offset = newOrbit.offset;
        this.period = newOrbit.period;
        
        return { success: true };
    }
}