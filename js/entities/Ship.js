// js/entities/Ship.js
import { CelestialBody } from './CelestialBody.js';

export class Ship extends CelestialBody {
    constructor(name, shipClass, parent, a, e, offset, omega = 0) {
        // Корабли делаем мелкими (радиус 3)
        super(name, 'ship', 3, parent, a, e, offset, omega);
        
        this.shipClass = shipClass; // 'Шаттл', 'Корвет', 'Фрегат' и т.д.
        
        // Будущие параметры для маневров и сенсоров
        this.plannedManeuvers = [];
        
        // Вектор текущего направления (азимут в радианах)
        this.heading = 0; 
    }

    updatePosition(time) {
        super.updatePosition(time);
        
        // Рассчитываем, куда направлен нос корабля (разница между текущей и прошлой позицией)
        if (this.x !== this.lastX || this.y !== this.lastY) {
            this.heading = Math.atan2(this.y - this.lastY, this.x - this.lastX);
        }
    }
}