// js/physics/Kepler.js
export const MU = 3947.84; 

export function calculatePeriod(a, mu = MU) {
    // Math.abs(a) позволяет формуле работать и для гипербол (где a отрицательное)
    return (2 * Math.PI) * Math.sqrt(Math.pow(Math.abs(a), 3) / mu);
}

export function calculateTrueAnomaly(t, period, e, timeOffset = 0, direction = 1) {
    if (e < 1) {
        // ЭЛЛИПС
        let M = ((t * direction + timeOffset) / period) * Math.PI * 2;
        M = M % (Math.PI * 2);
        if (M < 0) M += Math.PI * 2;

        let E = M;
        for (let i = 0; i < 30; i++) {
            const deltaE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
            E -= deltaE;
            if (Math.abs(deltaE) < 1e-6) break;
        }
        return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    } else {
        // ГИПЕРБОЛА (Гравитационный маневр / Улет)
        const n = (Math.PI * 2) / period;
        let M = n * (t * direction + timeOffset);
        
        // Решение гиперболического уравнения Кеплера методом Ньютона
        let H = Math.asinh(M / e); 
        for(let i = 0; i < 30; i++) {
            const f = e * Math.sinh(H) - H - M;
            const df = e * Math.cosh(H) - 1;
            const deltaH = f / df;
            H -= deltaH;
            if (Math.abs(deltaH) < 1e-6) break;
        }
        
        return 2 * Math.atan(Math.sqrt((e + 1) / (e - 1)) * Math.tanh(H / 2));
    }
}

export function getPositionAtAnomaly(a, e, theta, omega = 0) {
    // Эта формула универсальна и для эллипса, и для гиперболы
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
    const localX = r * Math.cos(theta);
    const localY = r * Math.sin(theta);
    const x = localX * Math.cos(omega) - localY * Math.sin(omega);
    const y = localX * Math.sin(omega) + localY * Math.cos(omega);
    return { x, y };
}

export function getVelocityAtAnomaly(a, e, theta, omega = 0, mu = MU, direction = 1) {
    const p = a * (1 - e * e);
    const h = Math.sqrt(mu * p);
    
    const vLocalX = -(mu / h) * Math.sin(theta) * direction;
    const vLocalY = (mu / h) * (e + Math.cos(theta)) * direction;
    
    const vx = vLocalX * Math.cos(omega) - vLocalY * Math.sin(omega);
    const vy = vLocalX * Math.sin(omega) + vLocalY * Math.cos(omega);
    return { vx, vy };
}

export function cartesianToKepler(x, y, vx, vy, time, mu = MU) {
    const r = Math.sqrt(x * x + y * y);
    const vSq = vx * vx + vy * vy;
    const h = x * vy - y * vx; 
    
    const direction = h >= 0 ? 1 : -1;
    
    const epsilon = (vSq / 2) - (mu / r);
    let a = -mu / (2 * epsilon);
    
    const ex = (vy * h) / mu - (x / r);
    const ey = (-vx * h) / mu - (y / r);
    let e = Math.sqrt(ex * ex + ey * ey);

    // Защита от идеальной параболы (математическая сингулярность)
    if (Math.abs(e - 1) < 0.001) e = e >= 1 ? 1.001 : 0.999;

    const omega = Math.atan2(ey, ex);
    const cosO = Math.cos(-omega);
    const sinO = Math.sin(-omega);
    const localX = x * cosO - y * sinO;
    const localY = x * sinO + y * cosO;
    const theta = Math.atan2(localY, localX);

    let M;
    if (e < 1) {
        const E = Math.atan2(Math.sqrt(1 - e * e) * Math.sin(theta), e + Math.cos(theta));
        M = E - e * Math.sin(E);
    } else {
        // Ограничитель для страховки от float-погрешностей
        let H_val = Math.sqrt((e - 1) / (e + 1)) * Math.tan(theta / 2);
        H_val = Math.max(-0.9999, Math.min(0.9999, H_val)); 
        const H = 2 * Math.atanh(H_val);
        M = e * Math.sinh(H) - H;
    }
    
    const period = calculatePeriod(Math.abs(a), mu);
    const offset = (M / (Math.PI * 2)) * period - (time * direction);

    return { a, e, omega, offset, period, direction, error: null };
}

export function generateOrbitPath(a, e, omega = 0, segments = 100) {
    const path = [];
    if (e < 1) {
        const step = (Math.PI * 2) / segments;
        for (let i = 0; i <= segments; i++) {
            path.push(getPositionAtAnomaly(a, e, i * step, omega));
        }
    } else {
        // Рисуем дугу гиперболы (ограниченную асимптотами)
        const maxTheta = Math.acos(-1 / e) * 0.95;
        const step = (maxTheta * 2) / segments;
        for (let i = 0; i <= segments; i++) {
            const theta = -maxTheta + i * step;
            path.push(getPositionAtAnomaly(a, e, theta, omega));
        }
    }
    return path;

}

export function getTimeAtAnomaly(theta, period, e, offset, direction, currentTime) {
    let M;
    if (e < 1) {
        // Вычисляем Эксцентрическую аномалию (E)
        const E = Math.atan2(Math.sqrt(1 - e * e) * Math.sin(theta), e + Math.cos(theta));
        // Вычисляем Среднюю аномалию (M)
        M = E - e * Math.sin(E);
        if (M < 0) M += Math.PI * 2;

        // Базовое время для этой точки
        const t_base = ((M / (Math.PI * 2)) * period - offset) * direction;

        // Находим ближайшее будущее время (разницу с текущим)
        let timeDiff = (t_base - currentTime) % period;
        if (timeDiff < 0) timeDiff += period;

        return currentTime + timeDiff;
    } else {
        // Для гиперболы
        let H_val = Math.sqrt((e - 1) / (e + 1)) * Math.tan(theta / 2);
        H_val = Math.max(-0.9999, Math.min(0.9999, H_val)); // Защита от NaN
        const H = 2 * Math.atanh(H_val);
        M = e * Math.sinh(H) - H;

        const n = (Math.PI * 2) / period;
        const t = (M / n - offset) * direction;
        return Math.max(currentTime, t); // На гиперболе точка проходится лишь однажды
    }
}