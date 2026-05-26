// js/ui/Renderer.js

export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // НОВОЕ: Виртуальный холст для идеальной работы со светом и тенями
        this.maskCanvas = document.createElement('canvas');
        this.maskCtx = this.maskCanvas.getContext('2d');
        
        this.offsetX = 0;
        this.offsetY = 0;
        this.zoom = 1;

        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupCameraControls();

        this.shipSprites = {
            'CORVETTE': new Path2D('M 12 0 L -8 6 L -4 0 L -8 -6 Z'), // Острый перехватчик
            'FRIGATE': new Path2D('M 15 0 L -10 8 L -6 4 L -6 -4 L -10 -8 Z'), // Угловатый
            'CRUISER': new Path2D('M 18 0 L 8 5 L -12 8 L -8 0 L -12 -8 L 8 -5 Z'), // Массивный
            'DEFAULT': new Path2D('M 10 0 L -6 5 L -3 0 L -6 -5 Z') // Запасной вариант
        };
        this.bodySprites = {
            'STAR': new Path2D('M 10 0 A 10 10 0 1 0 -10 0 A 10 10 0 1 0 10 0'), // Идеальный круг
            'PLANET': new Path2D('M 10 0 A 10 10 0 1 0 -10 0 A 10 10 0 1 0 10 0'), 
            'MOON': new Path2D('M 10 0 A 10 10 0 1 0 -10 0 A 10 10 0 1 0 10 0'),
            'GAS_GIANT': new Path2D('M 10 0 A 10 10 0 1 0 -10 0 A 10 10 0 1 0 10 0 M -18 0 C -18 -4 18 -4 18 0 C 18 4 -18 4 -18 0')
        };
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Виртуальный холст всегда должен совпадать по размеру с основным
        this.maskCanvas.width = rect.width;
        this.maskCanvas.height = rect.height;
        
        this.offsetX = this.canvas.width / 2;
        this.offsetY = this.canvas.height / 2;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

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
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#ffffff';
        this.ctx.fill();
        this.ctx.shadowBlur = 0; 
    }

    drawPlanet(x, y, radius) {
        const screenPos = this.toScreen(x, y);
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, Math.max(radius * this.zoom, 2), 0, Math.PI * 2);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
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
            e.preventDefault(); 
            const mouseX = e.clientX - this.canvas.getBoundingClientRect().left;
            const mouseY = e.clientY - this.canvas.getBoundingClientRect().top;

            const worldX = (mouseX - this.offsetX) / this.zoom;
            const worldY = (mouseY - this.offsetY) / this.zoom;

            const zoomAmount = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom = Math.max(0.05, Math.min(this.zoom, 10)); 
            this.zoom *= zoomAmount;

            this.offsetX = mouseX - worldX * this.zoom;
            this.offsetY = mouseY - worldY * this.zoom;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0 || e.button === 1) { 
                this.isDragging = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                this.canvas.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'crosshair'; 
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

        // 1. МАГНИТОМЕТР (Рисуется на главном холсте ДО теней, он прошибает планеты)
        if (entity.magActive) {
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, entity.magRange * this.zoom, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(0, 150, 255, 0.1)';
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(0, 150, 255, 0.5)';
            this.ctx.stroke();
        }

        // --- РЕНДЕР СЕНСОРОВ ЧЕРЕЗ МАСКУ ---
        
        // Очищаем виртуальный холст
        this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);

        // 2. РАДАР (Рисуем на виртуальном холсте)
        if (entity.radarActive) {
            this.maskCtx.beginPath();
            this.maskCtx.arc(screenPos.x, screenPos.y, entity.radarRange * this.zoom, 0, Math.PI * 2);
            this.maskCtx.fillStyle = 'rgba(0, 255, 204, 0.05)';
            this.maskCtx.fill();
            this.maskCtx.strokeStyle = 'rgba(0, 255, 204, 0.3)';
            this.maskCtx.setLineDash([2, 4]);
            this.maskCtx.stroke();

            this.maskCtx.beginPath();
            this.maskCtx.arc(screenPos.x, screenPos.y, (entity.radarRange * 2) * this.zoom, 0, Math.PI * 2);
            this.maskCtx.strokeStyle = 'rgba(255, 0, 68, 0.2)';
            this.maskCtx.setLineDash([10, 10]);
            this.maskCtx.stroke();
            this.maskCtx.setLineDash([]);
        }

        // 3. ЛАДАР (Рисуем на виртуальном холсте)
        if (entity.ladarActive) {
            const azRad = (entity.ladarAzimuth - 90) * (Math.PI / 180);
            const beamLengthScreen = 2000 * this.zoom;
            const beamWidth = 0.05;

            this.maskCtx.beginPath();
            this.maskCtx.moveTo(screenPos.x, screenPos.y);
            this.maskCtx.lineTo(
                screenPos.x + Math.cos(azRad - beamWidth) * beamLengthScreen,
                screenPos.y + Math.sin(azRad - beamWidth) * beamLengthScreen
            );
            this.maskCtx.lineTo(
                screenPos.x + Math.cos(azRad + beamWidth) * beamLengthScreen,
                screenPos.y + Math.sin(azRad + beamWidth) * beamLengthScreen
            );
            this.maskCtx.closePath();

            this.maskCtx.fillStyle = 'rgba(255, 50, 50, 0.15)';
            this.maskCtx.fill();
            this.maskCtx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
            this.maskCtx.stroke();
        }

        // 4. ЛАСТИК ТЕНЕЙ: Всё, что мы нарисуем сейчас, СТОТРЕТ радар и ладар
        this.maskCtx.globalCompositeOperation = 'destination-out';
        this.maskCtx.fillStyle = 'rgba(0,0,0,1)'; // Цвет не важен, он работает как стерка

        systemEntities.forEach(body => {
            if (body.type === 'ship' || body.type === 'station' || body === entity) return;

            const dx = body.renderX - entity.renderX;
            const dy = body.renderY - entity.renderY;
            const dist = Math.hypot(dx, dy);

            if (dist <= body.radius) return; 

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
            const screenBody = this.toScreen(body.renderX, body.renderY);

            // Стираем конус тени за планетой
            this.maskCtx.beginPath();
            this.maskCtx.moveTo(screenT1.x, screenT1.y);
            this.maskCtx.lineTo(screenP1.x, screenP1.y);
            this.maskCtx.lineTo(screenP2.x, screenP2.y);
            this.maskCtx.lineTo(screenT2.x, screenT2.y);
            this.maskCtx.closePath();
            this.maskCtx.fill();

            // Дополнительно стираем саму планету (круг), чтобы луч обрывался идеально по передней кромке!
            this.maskCtx.beginPath();
            this.maskCtx.arc(screenBody.x, screenBody.y, body.radius * this.zoom, 0, Math.PI * 2);
            this.maskCtx.fill();
            this.maskCtx.lineWidth = 2;
            this.maskCtx.stroke();
        });

        // Возвращаем режим в норму
        this.maskCtx.globalCompositeOperation = 'source-over';

        // 5. Переносим обрезанный результат на основной экран
        this.ctx.drawImage(this.maskCanvas, 0, 0);
    }

    drawLOSShadows(observer, systemEntities) {
        if (!observer) return;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; 
        
        systemEntities.forEach(body => {
            if (body.type === 'ship' || body.type === 'station' || body === observer) return;

            const dx = body.renderX - observer.renderX;
            const dy = body.renderY - observer.renderY;
            const dist = Math.hypot(dx, dy);

            if (dist <= body.radius) return; 

            const angleToBody = Math.atan2(dy, dx);
            const theta = Math.asin(body.radius / dist);
            const tangentDist = Math.sqrt(dist * dist - body.radius * body.radius);

            const t1_x = observer.renderX + tangentDist * Math.cos(angleToBody - theta);
            const t1_y = observer.renderY + tangentDist * Math.sin(angleToBody - theta);
            const t2_x = observer.renderX + tangentDist * Math.cos(angleToBody + theta);
            const t2_y = observer.renderY + tangentDist * Math.sin(angleToBody + theta);

            const shadowLength = 5000;
            const p1_x = t1_x + shadowLength * Math.cos(angleToBody - theta);
            const p1_y = t1_y + shadowLength * Math.sin(angleToBody - theta);
            const p2_x = t2_x + shadowLength * Math.cos(angleToBody + theta);
            const p2_y = t2_y + shadowLength * Math.sin(angleToBody + theta);

            const screenT1 = this.toScreen(t1_x, t1_y);
            const screenT2 = this.toScreen(t2_x, t2_y);
            const screenP1 = this.toScreen(p1_x, p1_y);
            const screenP2 = this.toScreen(p2_x, p2_y);

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
        
        const dx = target.x - start.x;
        const dy = target.y - start.y;
        const angle = Math.atan2(dy, dx);
        
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
        
        // НОВОЕ: Цвет корабля/иконки (можно будет привязать к фракции)
        const entityColor = entity.color || '#ffffff'; 
        this.ctx.fillStyle = entityColor;

        switch (entity.type) {
            case 'star':
            case 'planet':
            case 'moon':
                // 1. Отрисовка атмосферного свечения для звезд (остается градиентом)
                if (entity.type === 'star') {
                    const glowRadius = r * 5;
                    const gradient = this.ctx.createRadialGradient(
                        screenPos.x, screenPos.y, r * 0.1, 
                        screenPos.x, screenPos.y, glowRadius
                    );
                    gradient.addColorStop(0, '#ffffff');
                    gradient.addColorStop(0.1, '#fff1e8');
                    gradient.addColorStop(0.4, 'rgba(255, 170, 0, 0.4)');
                    gradient.addColorStop(1, 'rgba(255, 170, 0, 0)');

                    this.ctx.beginPath();
                    this.ctx.arc(screenPos.x, screenPos.y, glowRadius, 0, Math.PI * 2);
                    this.ctx.fillStyle = gradient;
                    this.ctx.fill();
                }

                // 2. Выбираем спрайт (по параметру spriteClass или по типу тела)
                const spriteKey = entity.spriteClass || entity.type.toUpperCase();
                const sprite = this.bodySprites[spriteKey];

                if (sprite) {
                    this.ctx.save();
                    this.ctx.translate(screenPos.x, screenPos.y);
                    
                    // Динамический масштаб: подгоняем базовый радиус (10) под реальный (r)
                    const scale = r / 10;
                    this.ctx.scale(scale, scale);
                    
                    this.ctx.fillStyle = entityColor;
                    this.ctx.fill(sprite);
                    
                    // Обводка для стиля (сохраняем ее толщину независимой от зума)
                    this.ctx.strokeStyle = entity.type === 'star' ? '#ffffff' : 'rgba(255, 255, 255, 0.8)';
                    this.ctx.lineWidth = 1.5 / scale;
                    this.ctx.stroke(sprite);
                    
                    this.ctx.restore();
                } else {
                    // Запасной старый вариант, если спрайт не найден
                    this.ctx.beginPath();
                    this.ctx.arc(screenPos.x, screenPos.y, r, 0, Math.PI * 2);
                    if (entity.type === 'star') {
                        this.ctx.fill();
                    } else {
                        this.ctx.stroke();
                    }
                }

                // 3. Отрисовка пунктирной Сферы Влияния (SoI)
                if (entity.soi !== Infinity && (entity.type === 'planet' || entity.type === 'moon')) {
                    this.ctx.beginPath();
                    this.ctx.arc(screenPos.x, screenPos.y, entity.soi * this.zoom, 0, Math.PI * 2);
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; 
                    this.ctx.lineWidth = 1;
                    this.ctx.setLineDash([5, 10]);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                }
                break;
        }

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