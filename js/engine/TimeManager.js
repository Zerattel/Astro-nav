// js/engine/TimeManager.js

export class TimeManager {
    constructor() {
        this.time = 0;           // Внутреннее время симуляции
        this.timeScale = 1;      // Множитель времени (1x, 10x и т.д.)
        this.isPaused = false;   // Состояние паузы
        this.lastFrameTime = performance.now();
    }

    update() {
        const currentFrameTime = performance.now();
        // Разница в секундах между кадрами (обычно ~0.016с для 60fps)
        const deltaTime = (currentFrameTime - this.lastFrameTime) / 1000; 
        this.lastFrameTime = currentFrameTime;

        if (!this.isPaused) {
            this.time += deltaTime * this.timeScale;
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        return this.isPaused;
    }

    setTimeScale(scale) {
        this.timeScale = scale;
    }

    addRandomTime(minDays = 10, maxDays = 100) {
        // Добавляет большой скачок времени (для случайного разброса планет)
        const jump = minDays + Math.random() * (maxDays - minDays);
        this.time += jump * 100; // Условный коэффициент для заметного сдвига
    }
}