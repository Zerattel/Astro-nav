// js/ui/Renderer.js

export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.offsetX = 0;
        this.offsetY = 0;
        this.zoom = 1;

        // Переменные для перетаскивания (Pan)
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupCameraControls();
    }

    resize() {
        // Подгоняем canvas под размер родительского контейнера
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Центрируем камеру
        this.offsetX = this.canvas.width / 2;
        this.offsetY = this.canvas.height / 2;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Перевод мировых координат в координаты экрана
    toScreen(x, y) {
        return {
            x: x * this.zoom + this.offsetX,
            y: y * this.zoom + this.offsetY
        };
    }

    drawStar(x, y, radius) {
        const screenPos = this.toScreen(x, y);
        
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, radius * this.zoom, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();
        
        // Свечение (опционально для красоты)
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#ffffff';
        this.ctx.fill();
        this.ctx.shadowBlur = 0; // отключаем, чтобы не светилось всё остальное
    }

    drawPlanet(x, y, radius) {
        const screenPos = this.toScreen(x, y);
        
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, Math.max(radius * this.zoom, 2), 0, Math.PI * 2); // Минимальный радиус 2px
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Перекрестие внутри планеты для "технического" вида
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x - radius * this.zoom - 2, screenPos.y);
        this.ctx.lineTo(screenPos.x + radius * this.zoom + 2, screenPos.y);
        this.ctx.moveTo(screenPos.x, screenPos.y - radius * this.zoom - 2);
        this.ctx.lineTo(screenPos.x, screenPos.y + radius * this.zoom + 2);
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    drawOrbit(path) {
        if (path.length === 0) return;

        this.ctx.beginPath();
        const start = this.toScreen(path[0].x, path[0].y);
        this.ctx.moveTo(start.x, start.y);

        for (let i = 1; i < path.length; i++) {
            const point = this.toScreen(path[i].x, path[i].y);
            this.ctx.lineTo(point.x, point.y);
        }

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // Полупрозрачный белый
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]); // Пунктирная линия
        this.ctx.stroke();
        this.ctx.setLineDash([]); // Возвращаем сплошную линию для других объектов
    }

    setupCameraControls() {
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault(); // Останавливаем прокрутку страницы
            const mouseX = e.clientX - this.canvas.getBoundingClientRect().left;
            const mouseY = e.clientY - this.canvas.getBoundingClientRect().top;

            // Вычисляем, где мышка была в координатах мира до зума
            const worldX = (mouseX - this.offsetX) / this.zoom;
            const worldY = (mouseY - this.offsetY) / this.zoom;

            const zoomAmount = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom = Math.max(0.05, Math.min(this.zoom, 10)); // Расширен лимит зума
            this.zoom *= zoomAmount;

            // Корректируем смещение, чтобы зум происходил в точку под мышкой
            this.offsetX = mouseX - worldX * this.zoom;
            this.offsetY = mouseY - worldY * this.zoom;
        });

        // Перетаскивание карты (Pan)
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0 || e.button === 1) { // Левая или средняя кнопка
                this.isDragging = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                this.canvas.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'crosshair'; // Возвращаем прицел
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const dx = e.clientX - this.lastMouseX;
                const dy = e.clientY - this.lastMouseY;
                this.offsetX += dx;
                this.offsetY += dy;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            }
        });
    }
    drawEntity(entity) {
        const screenPos = this.toScreen(entity.renderX, entity.renderY);
        const r = Math.max(entity.radius * this.zoom, 2);

        this.ctx.beginPath();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.fillStyle = '#ffffff';

        switch (entity.type) {
            case 'star':
                this.ctx.arc(screenPos.x, screenPos.y, r, 0, Math.PI * 2);
                this.ctx.fill();
                break;

            case 'planet':
            case 'moon':
                this.ctx.arc(screenPos.x, screenPos.y, r, 0, Math.PI * 2);
                this.ctx.lineWidth = entity.type === 'moon' ? 1 : 2;
                this.ctx.stroke();
                // Перекрестие
                this.ctx.moveTo(screenPos.x - r - 2, screenPos.y);
                this.ctx.lineTo(screenPos.x + r + 2, screenPos.y);
                this.ctx.moveTo(screenPos.x, screenPos.y - r - 2);
                this.ctx.lineTo(screenPos.x, screenPos.y + r + 2);
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
                break;

            case 'station':
                // Рисуем квадрат
                this.ctx.rect(screenPos.x - r, screenPos.y - r, r * 2, r * 2);
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
                // Точка в центре
                this.ctx.fillRect(screenPos.x - 1, screenPos.y - 1, 2, 2);
                break;
            case 'ship':
                this.ctx.save();
                this.ctx.translate(screenPos.x, screenPos.y);
                // Поворачиваем холст по направлению движения корабля
                this.ctx.rotate(entity.heading); 
                
                // Рисуем футуристичный треугольный маркер (шеврон)
                this.ctx.beginPath();
                this.ctx.moveTo(r * 2, 0); // Нос
                this.ctx.lineTo(-r, r);    // Левое крыло
                this.ctx.lineTo(-r/2, 0);  // Выемка сзади
                this.ctx.lineTo(-r, -r);   // Правое крыло
                this.ctx.closePath();
                
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fill();
                this.ctx.restore();
                break;
        }

        // Имя объекта рядом с ним (показываем только если масштаб позволяет или это звезда/планета)
        if (this.zoom > 0.5 || entity.type === 'star' || entity.type === 'planet') {
            this.ctx.font = '10px Courier New';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.fillText(entity.name, screenPos.x + r + 5, screenPos.y - r - 5);
        }
    }
    toWorld(screenX, screenY) {
        return {
            x: (screenX - this.offsetX) / this.zoom,
            y: (screenY - this.offsetY) / this.zoom
        };
    }
}