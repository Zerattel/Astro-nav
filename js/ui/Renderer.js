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

    drawOrbit(path, color = 'rgba(255, 255, 255, 0.2)', isDashed = true) {
        if (path.length === 0) return;
        this.ctx.beginPath();
        const start = this.toScreen(path[0].x, path[0].y);
        this.ctx.moveTo(start.x, start.y);
        for (let i = 1; i < path.length; i++) {
            const point = this.toScreen(path[i].x, path[i].y);
            this.ctx.lineTo(point.x, point.y);
        }
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        if (isDashed) this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
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

    drawPredictedPath(prediction, offsetX = 0, offsetY = 0) {
        if (!prediction || prediction.path.length === 0) return;

        // Рисуем синюю траекторию (Остается без изменений)
        this.ctx.beginPath();
        const start = this.toScreen(prediction.path[0].x + offsetX, prediction.path[0].y + offsetY);
        this.ctx.moveTo(start.x, start.y);
        for (let i = 1; i < prediction.path.length; i++) {
            const pt = this.toScreen(prediction.path[i].x + offsetX, prediction.path[i].y + offsetY);
            this.ctx.lineTo(pt.x, pt.y);
        }
        this.ctx.strokeStyle = '#00aaff';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([3, 3]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        prediction.path.forEach(pt => {
            if (pt.transition) {
                const screenPt = this.toScreen(pt.x + offsetX, pt.y + offsetY);
                this.ctx.beginPath();
                this.ctx.arc(screenPt.x, screenPt.y, 3, 0, Math.PI * 2);
                this.ctx.fillStyle = '#00aaff';
                this.ctx.fill();
                this.ctx.font = '10px Courier New';
                this.ctx.fillText(`ENCOUNTER: ${pt.transition}`, screenPt.x + 6, screenPt.y);
            }
        });

        if (prediction.hasNode) {
            const nodePos = this.toScreen(prediction.nodeAbsPos.x + offsetX, prediction.nodeAbsPos.y + offsetY);
            this.ctx.beginPath();
            this.ctx.arc(nodePos.x, nodePos.y, 4, 0, Math.PI * 2);
            this.ctx.strokeStyle = '#ffaa00';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
            this.ctx.moveTo(nodePos.x - 8, nodePos.y); this.ctx.lineTo(nodePos.x + 8, nodePos.y);
            this.ctx.moveTo(nodePos.x, nodePos.y - 8); this.ctx.lineTo(nodePos.x, nodePos.y + 8);
            this.ctx.stroke();
        }
    }

    drawSensorZones(entity, systemEntities = []) {
        const screenPos = this.toScreen(entity.renderX, entity.renderY);

        // 1. МАГНИТОМЕТР (Рисуется ДО маски, так как бьет сквозь планеты)
        if (entity.magActive) {
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, entity.magRange * this.zoom, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(0, 150, 255, 0.1)';
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(0, 150, 255, 0.5)';
            this.ctx.stroke();
        }

        // --- НАЧАЛО МАСКИРОВАНИЯ ---
        this.ctx.save();
        this.ctx.beginPath();

        // Создаем огромный холст, на котором МОЖНО рисовать
        this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);

        // "Вырезаем" из него тени планет
        systemEntities.forEach(body => {
            if (body.type === 'ship' || body.type === 'station' || body === entity) return;

            const dx = body.renderX - entity.renderX;
            const dy = body.renderY - entity.renderY;
            const dist = Math.hypot(dx, dy);

            if (dist <= body.radius) return;

            // Расчет касательных (как в drawLOSShadows)
            const angleToBody = Math.atan2(dy, dx);
            const theta = Math.asin(body.radius / dist);
            const tangentDist = Math.sqrt(dist * dist - body.radius * body.radius);

            const t1_x = entity.renderX + tangentDist * Math.cos(angleToBody - theta);
            const t1_y = entity.renderY + tangentDist * Math.sin(angleToBody - theta);
            const t2_x = entity.renderX + tangentDist * Math.cos(angleToBody + theta);
            const t2_y = entity.renderY + tangentDist * Math.sin(angleToBody + theta);

            const shadowLength = 10000;
            const p1_x = t1_x + shadowLength * Math.cos(angleToBody - theta);
            const p1_y = t1_y + shadowLength * Math.sin(angleToBody - theta);
            const p2_x = t2_x + shadowLength * Math.cos(angleToBody + theta);
            const p2_y = t2_y + shadowLength * Math.sin(angleToBody + theta);

            const screenT1 = this.toScreen(t1_x, t1_y);
            const screenT2 = this.toScreen(t2_x, t2_y);
            const screenP1 = this.toScreen(p1_x, p1_y);
            const screenP2 = this.toScreen(p2_x, p2_y);

            // Дуга по передней (освещенной) части планеты
            const angleToSensor = Math.atan2(entity.renderY - body.renderY, entity.renderX - body.renderX);
            const startArc = angleToSensor - (Math.PI / 2 - theta);
            const endArc = angleToSensor + (Math.PI / 2 - theta);
            const screenBody = this.toScreen(body.renderX, body.renderY);

            // Формируем контур "слепой зоны"
            this.ctx.moveTo(screenP2.x, screenP2.y);
            this.ctx.lineTo(screenT2.x, screenT2.y);
            this.ctx.arc(screenBody.x, screenBody.y, body.radius * this.zoom, startArc, endArc, false);
            this.ctx.lineTo(screenP1.x, screenP1.y);
            this.ctx.closePath();
        });

        // ПРИМЕНЯЕМ МАСКУ (evenodd вырезает внутренние пересекающиеся контуры)
        this.ctx.clip('evenodd');

        // 2. РАДАР (Теперь рисуется ТОЛЬКО там, где нет теней)
        if (entity.radarActive) {
            // Зеленая зона обнаружения
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, entity.radarRange * this.zoom, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(0, 255, 204, 0.05)';
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(0, 255, 204, 0.3)';
            this.ctx.setLineDash([2, 4]);
            this.ctx.stroke();

            // Красная зона демаскировки
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, (entity.radarRange * 2) * this.zoom, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(255, 0, 68, 0.2)';
            this.ctx.setLineDash([10, 10]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // 3. ЛАДАР (Просто рисуем длинный луч, маска сама обрежет его об планету)
        if (entity.ladarActive) {
            const azRad = (entity.ladarAzimuth - 90) * (Math.PI / 180);
            const beamLengthScreen = 2000 * this.zoom; 
            const beamWidth = 0.05;

            this.ctx.beginPath();
            this.ctx.moveTo(screenPos.x, screenPos.y);
            this.ctx.lineTo(
                screenPos.x + Math.cos(azRad - beamWidth) * beamLengthScreen,
                screenPos.y + Math.sin(azRad - beamWidth) * beamLengthScreen
            );
            this.ctx.lineTo(
                screenPos.x + Math.cos(azRad + beamWidth) * beamLengthScreen,
                screenPos.y + Math.sin(azRad + beamWidth) * beamLengthScreen
            );
            this.ctx.closePath();

            this.ctx.fillStyle = 'rgba(255, 50, 50, 0.15)';
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
            this.ctx.stroke();
        }

        // --- СНИМАЕМ МАСКУ ---
        this.ctx.restore();
    }

    // НОВОЕ: Отрисовка динамических теней слепых зон
    drawLOSShadows(observer, systemEntities) {
        if (!observer) return;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Густая тень (слепая зона)
        
        systemEntities.forEach(body => {
            // Тени отбрасывают только крупные небесные тела
            if (body.type === 'ship' || body.type === 'station' || body === observer) return;

            const dx = body.renderX - observer.renderX;
            const dy = body.renderY - observer.renderY;
            const dist = Math.hypot(dx, dy);

            if (dist <= body.radius) return; // Если мы внутри, тени нет

            // Угол на планету
            const angleToBody = Math.atan2(dy, dx);
            // Угол отклонения касательных линий (размер планеты с нашей точки зрения)
            const theta = Math.asin(body.radius / dist);

            // Дистанция от нас до точек касания на краях планеты
            const tangentDist = Math.sqrt(dist * dist - body.radius * body.radius);

            // Вычисляем координаты левой и правой точек касания (в мире)
            const t1_x = observer.renderX + tangentDist * Math.cos(angleToBody - theta);
            const t1_y = observer.renderY + tangentDist * Math.sin(angleToBody - theta);
            
            const t2_x = observer.renderX + tangentDist * Math.cos(angleToBody + theta);
            const t2_y = observer.renderY + tangentDist * Math.sin(angleToBody + theta);

            // Продлеваем эти линии далеко в космос (создаем конус тени)
            const shadowLength = 5000;
            const p1_x = t1_x + shadowLength * Math.cos(angleToBody - theta);
            const p1_y = t1_y + shadowLength * Math.sin(angleToBody - theta);
            
            const p2_x = t2_x + shadowLength * Math.cos(angleToBody + theta);
            const p2_y = t2_y + shadowLength * Math.sin(angleToBody + theta);

            // Переводим в экранные координаты
            const screenT1 = this.toScreen(t1_x, t1_y);
            const screenT2 = this.toScreen(t2_x, t2_y);
            const screenP1 = this.toScreen(p1_x, p1_y);
            const screenP2 = this.toScreen(p2_x, p2_y);

            // Рисуем полигон тени
            this.ctx.beginPath();
            this.ctx.moveTo(screenT1.x, screenT1.y);
            this.ctx.lineTo(screenP1.x, screenP1.y);
            this.ctx.lineTo(screenP2.x, screenP2.y);
            this.ctx.lineTo(screenT2.x, screenT2.y);
            this.ctx.closePath();
            
            this.ctx.fill();
        });
    }

    drawBearing(fromEntity, toEntity, color, label) {
        const start = this.toScreen(fromEntity.renderX, fromEntity.renderY);
        const target = this.toScreen(toEntity.renderX, toEntity.renderY);
        
        // Рисуем вектор от наблюдателя в сторону цели
        const dx = target.x - start.x;
        const dy = target.y - start.y;
        const angle = Math.atan2(dy, dx);
        
        // Линия не идет до самого конца, это просто пеленг (указатель направления)
        const length = 100; 
        const endX = start.x + Math.cos(angle) * length;
        const endY = start.y + Math.sin(angle) * length;

        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(endX, endY);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        this.ctx.font = '10px Courier New';
        this.ctx.fillStyle = color;
        this.ctx.fillText(`[${label} BEARING]`, endX + 5, endY + 5);
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
                if (entity.soi !== Infinity) {
                    this.ctx.beginPath();
                    this.ctx.arc(screenPos.x, screenPos.y, entity.soi * this.zoom, 0, Math.PI * 2);
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; // Очень тусклый белый
                    this.ctx.lineWidth = 1;
                    this.ctx.setLineDash([5, 10]);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                }
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