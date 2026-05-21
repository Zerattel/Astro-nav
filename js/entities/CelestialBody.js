// js/entities/CelestialBody.js
import { calculateTrueAnomaly, getPositionAtAnomaly, calculatePeriod, generateOrbitPath } from '../physics/Kepler.js';

export class CelestialBody {
    /**
     * @param {string} name - Название
     * @param {string} type - 'star', 'planet', 'moon', 'station'
     * @param {number} radius - Радиус для отрисовки
     * @param {CelestialBody|null} parent - Вокруг кого вращается (null для центральной звезды)
     * @param {number} a - Большая полуось
     * @param {number} e - Эксцентриситет
     * @param {number} offset - Смещение по времени (чтобы не стартовали вместе)
     */
    constructor(name, type, radius, parent = null, a = 0, e = 0, offset = 0, omega = 0) {
        this.name = name;
        this.type = type;
        this.radius = radius;
        
        this.parent = parent;
        this.a = a;
        this.e = e;
        this.offset = offset;
        this.omega = omega; // <--- НОВОЕ СВОЙСТВО: Поворот эллипса
        this.period = a > 0 ? calculatePeriod(a) : 0;
        
        this.children = [];
        if (this.parent) this.parent.children.push(this);

        this.x = 0;
        this.y = 0;
        this.lastX = 0; // <--- Для расчета вектора движения
        this.lastY = 0;
    }

    /**
     * Обновляет координаты тела на основе текущего времени симуляции
     * @param {number} time - Текущее время симуляции
     */
    updatePosition(time) {
        this.lastX = this.x;
        this.lastY = this.y;

        if (!this.parent || this.a === 0) {
            this.x = 0;
            this.y = 0;
        } else {
            const anomaly = calculateTrueAnomaly(time, this.period, this.e, this.offset);
            // Передаем omega в расчет
            const localPos = getPositionAtAnomaly(this.a, this.e, anomaly, this.omega);
            
            this.x = this.parent.x + localPos.x;
            this.y = this.parent.y + localPos.y;
        }

        for (const child of this.children) {
            child.updatePosition(time);
        }
    }

    /**
     * Возвращает массив абсолютных координат для отрисовки линии орбиты
     */
    getAbsoluteOrbitPath() {
        if (!this.parent || this.a === 0) return [];
        // Передаем omega
        const localPath = generateOrbitPath(this.a, this.e, this.omega);
        return localPath.map(p => ({
            x: p.x + this.parent.x,
            y: p.y + this.parent.y
        }));
    }
}