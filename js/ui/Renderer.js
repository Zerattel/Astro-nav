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

        this.FIGMA_BASE_RADIUS = 50; 

        // Библиотека спрайтов флота
        // Библиотека спрайтов флота (хранит размеры ViewBox для авто-центрирования)
        this.shipSprites = {
            'ADS': {
                w: 147, h: 124,
                paths: [
                    'M62.0029 124.009L0 62.006L62.0029 0.00303799L66.5 4.50011L8.99707 62.003L66.5029 119.509L62.0029 124.009Z',
                    'M147.003 62.003L84.9999 124.006L22.9969 62.003L84.9999 0L147.003 62.003Z'
                ]
            },
            'BATTLECRUISER': {
                w: 111, h: 99,
                paths: [
                    'M9 2.01073e-06L9 99H0L4.32743e-06 1.61733e-06L9 2.01073e-06Z',
                    'M111 49.4978L65 98.9983L65 0L111 49.4978Z',
                    'M65 0L65 99H20L20 4.3714e-08L65 0Z'
                ]
            },
            'BATTLESHIP': {
                w: 127, h: 100,
                paths: [
                    'M0 99L7.72707e-09 98.8232L52.001 49.5L4.31971e-06 0.176758L4.32743e-06 0L75 3.27836e-06L75 99H0Z',
                    'M127 49.6186L75 99.119L75 3.27836e-06L127 49.6186Z'
                ]
            },
            'CORVETTE': {
                w: 28, h: 54,
                paths: [
                    'M0 53.6934L3.38288e-07 45.9541L19.75 26.8467L2.00872e-06 7.73926L2.34701e-06 0L27.75 26.8467L0 53.6934Z'
                ]
            },
            'CRUISER': {
                w: 91, h: 99,
                paths: [
                    'M91 49.4962L45 98.9966L45 0L91 49.4962Z',
                    'M45 0L45 99H0L4.32743e-06 4.3714e-08L45 0Z'
                ]
            },
            'DESTROYER': {
                w: 67, h: 100,
                paths: [
                    'M67 49.7965L20.5 99.5929L20.5 0L67 49.7965Z',
                    'M5 0.296461L5 99.2965H0L4.32743e-06 0.296461L5 0.296461Z'
                ]
            },
            'DREADNOUGHT': {
                w: 140, h: 143,
                paths: [
                    'M140 71.0141L69.5 142.028L69.5 0L140 71.0141Z',
                    'M0 71.0141L37.5 33.775V108.253L0 71.0141Z',
                    'M69.5 0.0140869L69.4946 142.014H32.9946L32.9946 0.0140853L69.5 0.0140869Z'
                ]
            },
            'FREGATE': {
                w: 47, h: 100,
                paths: [
                    'M46.5 49.7965L0 99.5929L4.35335e-06 0L46.5 49.7965Z'
                ]
            },
            'TITAN': {
                w: 156, h: 98,
                paths: [
                    'M60 98V97.9932L108 48.9893L60 0L108 2.09815e-06L108 98H60Z',
                    'M156 48.9892L108 97.9929L108 2.09815e-06L156 48.9892Z',
                    'M0 98L3.0559e-10 97.9932L48 48.9893L4.28372e-06 0L48 2.09815e-06L48 98H0Z',
                    'M96 48.9892L48 97.9929L48 2.09815e-06L96 48.9892Z'
                ]
            },
            'DEFAULT': { 
                w: 20, h: 20, 
                paths: ['M 20 10 L 0 20 L 5 10 L 0 0 Z'] 
            }
        };

        // Библиотека небесных тел и станций
        this.bodySprites = {
            'GASGIANT': {
                w: 682, h: 682,
                paths: [
                    'M527.088 261.031C544.023 263.987 559.856 267.336 574.387 271.035C604.387 278.673 629.495 287.958 647.382 298.725C664.548 309.058 678.637 322.993 678.637 341.004C678.637 359.015 664.548 372.95 647.382 383.283C629.495 394.05 604.387 403.334 574.387 410.973C514.209 426.294 431.698 435.643 340.998 435.643C250.298 435.643 167.787 426.294 107.609 410.973C77.6089 403.334 52.5011 394.05 34.6143 383.283C17.4477 372.95 3.35938 359.015 3.35938 341.004C3.35938 322.993 17.4477 309.058 34.6143 298.725C52.5011 287.958 77.6089 278.673 107.609 271.035C122.139 267.336 137.971 263.987 154.905 261.031C148.159 269.096 144.353 277.733 144.021 286.722C133.213 288.849 122.969 291.144 113.353 293.593C84.3589 300.975 61.7252 309.575 46.6191 318.668C30.7927 328.195 26.6367 336.095 26.6367 341.004C26.6367 345.912 30.7927 353.813 46.6191 363.34C61.7252 372.433 84.3589 381.033 113.353 388.415C171.163 403.134 251.653 412.365 340.998 412.365C430.343 412.365 510.833 403.134 568.644 388.415C597.637 381.033 620.271 372.433 635.377 363.34C651.203 353.813 655.359 345.912 655.359 341.004C655.359 336.095 651.203 328.195 635.377 318.668C620.271 309.575 597.637 300.975 568.644 293.593C559.026 291.144 548.781 288.848 537.972 286.721C537.64 277.732 533.834 269.096 527.088 261.031Z',
                    'M340.993 143.772C449.914 143.772 538.212 232.07 538.212 340.991C538.212 449.913 449.914 538.211 340.993 538.211C232.072 538.211 143.773 449.913 143.773 340.991C143.773 232.07 232.072 143.772 340.993 143.772Z',
                    'M296.273 533.016C392.433 524.569 467.912 441.822 467.912 340.99C467.912 239.557 391.532 156.426 294.555 148.82'
                ]
            },
            'PLANET': {
                w: 694, h: 694,
                paths: [
                    'M346.575 11.6396C531.554 11.6396 681.509 161.595 681.509 346.574C681.509 531.553 531.554 681.508 346.575 681.508C161.596 681.508 11.6406 531.553 11.6406 346.574C11.6406 161.595 161.596 11.6396 346.575 11.6396Z',
                    'M270.613 672.691C433.92 658.346 562.105 517.819 562.105 346.577C562.105 174.316 432.389 33.1348 267.695 20.2188'
                ]
            },
            'MOON': {
                w: 694, h: 694,
                paths: [
                    'M346.575 11.6396C531.554 11.6396 681.509 161.595 681.509 346.574C681.509 531.553 531.554 681.508 346.575 681.508C161.596 681.508 11.6406 531.553 11.6406 346.574C11.6406 161.595 161.596 11.6396 346.575 11.6396Z',
                    'M270.613 672.691C433.92 658.346 562.105 517.819 562.105 346.577C562.105 174.316 432.389 33.1348 267.695 20.2188'
                ]
            },
            'STATION': {
                w: 100, h: 100,
                paths: ['M 0 0 L 100 0 L 100 100 L 0 100 Z'] // Простой квадрат
            }
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
        
        const length = 2500; // Делаем луч на весь экран, как настоящий пеленг!
        const endX = start.x + Math.cos(angle) * length;
        const endY = start.y + Math.sin(angle) * length;

        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(endX, endY);
        this.ctx.strokeStyle = color;
        
        // Делаем линию штриховой, чтобы подчеркнуть погрешность пеленгатора
        this.ctx.setLineDash([10, 15]); 
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        this.ctx.font = '12px Courier New';
        this.ctx.fillStyle = color;
        // Текст рисуем чуть поодаль от нашего корабля
        const textX = start.x + Math.cos(angle) * 150;
        const textY = start.y + Math.sin(angle) * 150;
        this.ctx.fillText(`[WARN: ${label} EMISSION DETECTED]`, textX, textY);
    }

    drawPathSprite(spriteData, fillColor, strokeColor, lineWidth = 1) {
        this.ctx.fillStyle = fillColor;
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;

        if (Array.isArray(spriteData)) {
            // Если передан массив строк путей из Figma
            spriteData.forEach(pathStr => {
                const pathObj = new Path2D(pathStr);
                this.ctx.fill(pathObj);
                if (strokeColor) this.ctx.stroke(pathObj);
            });
        } else if (spriteData instanceof Path2D) {
            // Если передан готовый Path2D объект
            this.ctx.fill(spriteData);
            if (strokeColor) this.ctx.stroke(spriteData);
        } else if (typeof spriteData === 'string') {
            // Если передана одиночная строка пути
            const pathObj = new Path2D(spriteData);
            this.ctx.fill(pathObj);
            if (strokeColor) this.ctx.stroke(pathObj);
        }
    }

    drawEntity(entity) {
        const screenPos = this.toScreen(entity.renderX, entity.renderY);
        const r = Math.max(entity.radius * this.zoom, 2);

        const entityColor = entity.color || '#ffffff';
        const strokeColor = 'rgba(255, 255, 255, 0.8)';

        switch (entity.type) {
            case 'star':
            case 'planet':
            case 'moon':
            case 'station':
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

                // Выбираем спрайт (если нет ключа, подменяем на дефолт)
                const bodyKey = entity.spriteClass || (entity.type === 'station' ? 'STATION' : 'PLANET');
                const bodySprite = this.bodySprites[bodyKey] || this.bodySprites['PLANET'];

                this.ctx.save();
                this.ctx.translate(screenPos.x, screenPos.y);
                
                // Идеальное масштабирование на основе самого большого измерения спрайта
                const bodyBaseRadius = Math.max(bodySprite.w, bodySprite.h) / 2;
                const bodyScale = r / bodyBaseRadius;
                
                this.ctx.scale(bodyScale, bodyScale);
                
                // Авто-центрирование: сдвигаем холст на половину ширины и высоты спрайта
                this.ctx.translate(-bodySprite.w / 2, -bodySprite.h / 2);
                
                this.drawPathSprite(
                    bodySprite.paths, 
                    entityColor, 
                    entity.type === 'star' ? '#ffffff' : strokeColor, 
                    1.5 / bodyScale // Компенсация толщины обводки
                );
                this.ctx.restore();

                // Пунктирная линия Сферы Влияния (SoI)
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
                
            case 'ship':
                this.ctx.save();
                this.ctx.translate(screenPos.x, screenPos.y);
                this.ctx.rotate(entity.heading); 
                
                const shipKey = entity.shipClass || 'DEFAULT';
                const shipSprite = this.shipSprites[shipKey] || this.shipSprites['DEFAULT'];
                
                const shipBaseRadius = Math.max(shipSprite.w, shipSprite.h) / 2;
                const targetShipScreenSize = Math.max(r, 6); 
                const shipScale = targetShipScreenSize / shipBaseRadius;
                
                this.ctx.scale(shipScale, shipScale);
                
                // Компенсация поворота: корабли из Figma смотрят вверх, доворачиваем их вправо
                this.ctx.rotate(Math.PI / 2);
                
                // Авто-центрирование
                this.ctx.translate(-shipSprite.w / 2, -shipSprite.h / 2);
                
                this.drawPathSprite(shipSprite.paths, entityColor, 'rgba(0, 0, 0, 0.8)', 1 / shipScale);

                this.ctx.restore();
                break;
        }

        if (this.zoom > 0.5 || entity.type === 'star' || entity.type === 'planet') {
            this.ctx.font = '10px Courier New';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.fillText(entity.name, screenPos.x + r + 5, screenPos.y - r - 5);
        }
    }

    // Отрисовка анонимного радарного контакта (без орбиты и вектора)
    drawRadarBlip(entity) {
        const screenPos = this.toScreen(entity.renderX, entity.renderY);
        
        // Рисуем футуристичный ромб
        this.ctx.beginPath();
        this.ctx.moveTo(screenPos.x, screenPos.y - 6);
        this.ctx.lineTo(screenPos.x + 6, screenPos.y);
        this.ctx.lineTo(screenPos.x, screenPos.y + 6);
        this.ctx.lineTo(screenPos.x - 6, screenPos.y);
        this.ctx.closePath();
        
        this.ctx.fillStyle = 'rgba(0, 255, 204, 0.3)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(0, 255, 204, 1)';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        // Рисуем метку (генерируем псевдо-ID из имени корабля)
        this.ctx.font = '10px Courier New';
        this.ctx.fillStyle = 'rgba(0, 255, 204, 0.8)';
        // Хэшируем имя, чтобы ID контакта не менялся, но не выдавал реальное имя
        const hashId = Math.abs(entity.name.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)).toString().substring(0,4);
        
        this.ctx.fillText(`TRK-${hashId}`, screenPos.x + 10, screenPos.y + 4);
    }
    
    toWorld(screenX, screenY) {
        return {
            x: (screenX - this.offsetX) / this.zoom,
            y: (screenY - this.offsetY) / this.zoom
        };
    }
}