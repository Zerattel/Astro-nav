// js/physics/Kepler.js

// Гравитационная константа системы (подобрана так, чтобы сохранить старые скорости)
export const MU = 3947.84; 

export function calculatePeriod(a, mu = MU) {
    return (2 * Math.PI) * Math.sqrt(Math.pow(a, 3) / mu);
}

export function calculateTrueAnomaly(t, period, e, timeOffset = 0) {
    // Нормализуем среднюю аномалию, чтобы избежать багов на долгих симуляциях
    let M = ((t + timeOffset) / period) * Math.PI * 2;
    M = M % (Math.PI * 2);
    if (M < 0) M += Math.PI * 2;

    let E = M;
    for (let i = 0; i < 10; i++) {
        const deltaE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        E -= deltaE;
        if (Math.abs(deltaE) < 1e-6) break;
    }

    return 2 * Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2)
    );
}

export function getPositionAtAnomaly(a, e, theta, omega = 0) {
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
    const localX = r * Math.cos(theta);
    const localY = r * Math.sin(theta);
    const x = localX * Math.cos(omega) - localY * Math.sin(omega);
    const y = localX * Math.sin(omega) + localY * Math.cos(omega);
    return { x, y };
}

// НОВОЕ: Получение вектора скорости на орбите
export function getVelocityAtAnomaly(a, e, theta, omega = 0, mu = MU) {
    const p = a * (1 - e * e);
    const h = Math.sqrt(mu * p);
    
    const vLocalX = -(mu / h) * Math.sin(theta);
    const vLocalY = (mu / h) * (e + Math.cos(theta));
    
    const vx = vLocalX * Math.cos(omega) - vLocalY * Math.sin(omega);
    const vy = vLocalX * Math.sin(omega) + vLocalY * Math.cos(omega);
    return { vx, vy };
}

// НОВОЕ: Перевод Декартовых векторов (x,y, vx,vy) обратно в орбиту Кеплера
export function cartesianToKepler(x, y, vx, vy, time, mu = MU) {
    const r = Math.sqrt(x * x + y * y);
    const vSq = vx * vx + vy * vy;
    const h = x * vy - y * vx; // Момент импульса
    
    const epsilon = (vSq / 2) - (mu / r); // Специфическая энергия
    const a = -mu / (2 * epsilon);
    
    const ex = (vy * h) / mu - (x / r);
    const ey = (-vx * h) / mu - (y / r);
    let e = Math.sqrt(ex * ex + ey * ey);

    if (e >= 1) return { error: "escape" }; // Защита от вылета из системы (гиперболы)

    const omega = Math.atan2(ey, ex);

    const cosO = Math.cos(-omega);
    const sinO = Math.sin(-omega);
    const localX = x * cosO - y * sinO;
    const localY = x * sinO + y * cosO;
    const theta = Math.atan2(localY, localX);

    const E = Math.atan2(Math.sqrt(1 - e * e) * Math.sin(theta), e + Math.cos(theta));
    const M = E - e * Math.sin(E);
    
    const period = calculatePeriod(a, mu);
    const offset = (M / (Math.PI * 2)) * period - time;

    return { a, e, omega, offset, period, error: null };
}

export function generateOrbitPath(a, e, omega = 0, segments = 100) {
    const path = [];
    const step = (Math.PI * 2) / segments;
    for (let i = 0; i <= segments; i++) {
        const theta = i * step;
        path.push(getPositionAtAnomaly(a, e, theta, omega));
    }
    return path;
}