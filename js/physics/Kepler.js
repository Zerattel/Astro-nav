// js/physics/Kepler.js

/**
 * Рассчитывает координаты X и Y точки на орбите на основе истинной аномалии (угла).
 * @param {number} a - Большая полуось (расстояние)
 * @param {number} e - Эксцентриситет (0 - идеальный круг, 0.99 - вытянутый эллипс)
 * @param {number} theta - Истинная аномалия в радианах (текущий угол)
 * @returns {Object} {x, y}
 */
export function getPositionAtAnomaly(a, e, theta, omega = 0) {
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
    
    // Локальные координаты (эллипс лежит ровно)
    const localX = r * Math.cos(theta);
    const localY = r * Math.sin(theta);
    
    // Поворачиваем орбиту на угол omega (матрица поворота 2D)
    const x = localX * Math.cos(omega) - localY * Math.sin(omega);
    const y = localX * Math.sin(omega) + localY * Math.cos(omega);
    
    return { x, y };
}

/**
 * Генерирует массив точек для отрисовки линии орбиты
 * @param {number} a - Большая полуось
 * @param {number} e - Эксцентриситет
 * @param {number} segments - Детализация (кол-во точек)
 * @returns {Array} Массив объектов {x, y}
 */
export function generateOrbitPath(a, e, omega = 0, segments = 100) {
    const path = [];
    const step = (Math.PI * 2) / segments;
    
    for (let i = 0; i <= segments; i++) {
        const theta = i * step;
        path.push(getPositionAtAnomaly(a, e, theta, omega));
    }
    return path;
}

/**
 * Рассчитывает Истинную Аномалию (угол в пространстве) на основе прошедшего времени.
 * @param {number} t - Текущее время симуляции
 * @param {number} period - Период обращения (за сколько времени делает полный круг)
 * @param {number} e - Эксцентриситет
 * @param {number} timeOffset - Смещение времени (чтобы планеты не стартовали из одной точки)
 * @returns {number} Истинная аномалия в радианах
 */
export function calculateTrueAnomaly(t, period, e, timeOffset = 0) {
    // 1. Средняя аномалия (M) - как если бы орбита была идеально круглой
    const M = ((t + timeOffset) / period) * Math.PI * 2;

    // 2. Эксцентрическая аномалия (E) - решаем уравнение Кеплера (M = E - e * sin(E)) методом Ньютона
    let E = M;
    for (let i = 0; i < 10; i++) { // 10 итераций обычно достаточно для точности
        const deltaE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        E -= deltaE;
        if (Math.abs(deltaE) < 1e-6) break;
    }

    // 3. Истинная аномалия (theta) - реальный угол от фокуса
    const theta = 2 * Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2)
    );

    return theta;
}

// Формула для вычисления периода орбиты (в упрощенном виде P = a^1.5)
export function calculatePeriod(a) {
    return Math.pow(a, 1.5) * 0.1; // Коэффициент 0.1 просто для удобной скорости в симуляции
}