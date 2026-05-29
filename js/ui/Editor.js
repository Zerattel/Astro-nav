// js/ui/Editor.js
import { CelestialBody } from '../entities/CelestialBody.js';
import { Ship } from '../entities/Ship.js';

export class Editor {
    constructor(entitiesArray, onUpdateCallback) {
        this.entities = entitiesArray;
        this.onUpdate = onUpdateCallback;
        this.selectedEntityIndex = null;

        this.modal = document.getElementById('editor-modal');
        this.listContainer = document.getElementById('editor-entity-list');
        this.formContainer = document.getElementById('editor-entity-form');

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('btn-editor').addEventListener('click', () => this.open());
        document.getElementById('btn-close-editor').addEventListener('click', () => this.close());
        document.getElementById('btn-generate-system').addEventListener('click', () => this.generateRandomSystem());
        
        document.getElementById('btn-export-system').addEventListener('click', () => this.exportJSON());
        document.getElementById('btn-import-system').addEventListener('click', () => document.getElementById('import-file').click());
        document.getElementById('import-file').addEventListener('change', (e) => this.importJSON(e));
    }

    open() {
        this.modal.classList.remove('hidden');
        this.renderList();
    }

    close() {
        this.modal.classList.add('hidden');
    }

    renderList() {
        this.listContainer.innerHTML = '';
        
        const btnAdd = document.createElement('button');
        btnAdd.textContent = '+ ДОБАВИТЬ ОБЪЕКТ';
        btnAdd.style.width = '100%'; btnAdd.style.marginBottom = '15px';
        btnAdd.onclick = () => this.createNewEntity();
        this.listContainer.appendChild(btnAdd);

        this.entities.forEach((entity, index) => {
            const div = document.createElement('div');
            div.className = 'editor-list-item';
            div.textContent = `[${entity.type.toUpperCase()}] ${entity.name}`;
            div.onclick = () => this.renderForm(index);
            this.listContainer.appendChild(div);
        });
    }

    createNewEntity() {
        const parent = this.entities.find(e => e.type === 'star') || null;
        const newBody = new CelestialBody("New Planet", "planet", 10, parent, 100, 0, 0, 0, 100);
        this.entities.push(newBody);
        this.renderList();
        this.renderForm(this.entities.length - 1);
        this.onUpdate();
    }

    renderForm(index) {
        this.selectedEntityIndex = index;
        const entity = this.entities[index];
        
        // Создаем выпадающий список потенциальных родителей
        const parentOptions = this.entities
            .map((e, i) => i !== index ? `<option value="${i}" ${entity.parent === e ? 'selected' : ''}>${e.name}</option>` : '')
            .join('');

        let html = `
            <div class="form-group"><label>ИМЯ ОБЪЕКТА</label><input type="text" id="ed-name" value="${entity.name}"></div>
            <div class="form-group"><label>ТИП</label>
                <select id="ed-type">
                    <option value="star" ${entity.type==='star'?'selected':''}>Звезда</option>
                    <option value="planet" ${entity.type==='planet'?'selected':''}>Планета</option>
                    <option value="moon" ${entity.type==='moon'?'selected':''}>Луна</option>
                    <option value="station" ${entity.type==='station'?'selected':''}>Станция</option>
                    <option value="ship" ${entity.type==='ship'?'selected':''}>Корабль</option>
                </select>
            </div>
            <div class="form-group"><label>ЦВЕТ (HEX)</label><input type="color" id="ed-color" value="${entity.color || '#ffffff'}"></div>
            <div class="form-group"><label>РОДИТЕЛЬСКОЕ ТЕЛО</label>
                <select id="ed-parent">
                    <option value="null">-- НЕТ (ЦЕНТР) --</option>
                    ${parentOptions}
                </select>
            </div>
            <div style="display:flex; gap:10px;">
                <div class="form-group" style="flex:1;"><label>РАДИУС / РАЗМЕР</label><input type="number" id="ed-radius" value="${entity.radius}"></div>
                <div class="form-group" style="flex:1;"><label>МАССА</label><input type="number" id="ed-mass" value="${entity.mass || 0}"></div>
            </div>
            <div style="display:flex; gap:10px;">
                <div class="form-group" style="flex:1;"><label>ОРБИТА (A)</label><input type="number" id="ed-a" value="${entity.a}"></div>
                <div class="form-group" style="flex:1;"><label>ЭКСЦЕНТРИСИТЕТ (E)</label><input type="number" step="0.01" id="ed-e" value="${entity.e}"></div>
                <div class="form-group" style="flex:1;"><label>ОМЕГА (OMEGA)</label><input type="number" step="0.1" id="ed-omega" value="${entity.omega}"></div>
            </div>
        `;

        if (entity.type === 'ship') {
            html += `
                <hr style="border: 1px solid #333; margin: 15px 0;">
                <div class="form-group"><label>КЛАСС КОРАБЛЯ (Спрайт)</label><input type="text" id="ed-shipClass" value="${entity.shipClass}"></div>
                <div style="display:flex; gap:10px;">
                    <div class="form-group" style="flex:1;"><label>РАДАР (Дал.)</label><input type="number" id="ed-radar" value="${entity.radarRange}"></div>
                    <div class="form-group" style="flex:1;"><label>ЛАДАР (Дал.)</label><input type="number" id="ed-ladar" value="${entity.ladarRange}"></div>
                    <div class="form-group" style="flex:1;"><label>МАГ (Дал.)</label><input type="number" id="ed-mag" value="${entity.magRange}"></div>
                </div>
            `;
        } else {
            html += `<div class="form-group"><label>СПРАЙТ КЛАСС (Опционально)</label><input type="text" id="ed-spriteClass" value="${entity.spriteClass || ''}"></div>`;
        }

        html += `
            <button class="btn-save" id="ed-save">СОХРАНИТЬ ИЗМЕНЕНИЯ</button>
            <button class="btn-delete" id="ed-delete">УДАЛИТЬ ОБЪЕКТ</button>
        `;

        this.formContainer.innerHTML = html;

        document.getElementById('ed-save').onclick = () => this.saveForm();
        document.getElementById('ed-delete').onclick = () => {
            this.entities.splice(this.selectedEntityIndex, 1);
            this.renderList();
            this.formContainer.innerHTML = '';
            this.onUpdate();
        };
    }

    saveForm() {
        const entity = this.entities[this.selectedEntityIndex];
        
        entity.name = document.getElementById('ed-name').value;
        const newType = document.getElementById('ed-type').value;
        entity.color = document.getElementById('ed-color').value;
        entity.radius = parseFloat(document.getElementById('ed-radius').value);
        entity.mu = parseFloat(document.getElementById('ed-mass').value);
        
        entity.a = parseFloat(document.getElementById('ed-a').value);
        entity.e = parseFloat(document.getElementById('ed-e').value);
        entity.omega = parseFloat(document.getElementById('ed-omega').value);
        
        const parentIdx = document.getElementById('ed-parent').value;
        entity.parent = parentIdx !== 'null' ? this.entities[parentIdx] : null;

        // Если тип изменился на корабль, нам по хорошему нужно пересоздать объект,
        // но чтобы не ломать ссылки, просто насильно меняем тип и добавляем свойства.
        entity.type = newType;
        if (newType === 'ship') {
            entity.shipClass = document.getElementById('ed-shipClass').value;
            entity.radarRange = parseFloat(document.getElementById('ed-radar').value);
            entity.ladarRange = parseFloat(document.getElementById('ed-ladar').value);
            entity.magRange = parseFloat(document.getElementById('ed-mag').value);
        } else {
            entity.spriteClass = document.getElementById('ed-spriteClass').value || null;
            entity.calculateSoI(); // Пересчитываем Сферу Влияния при изменении массы/орбиты
        }

        this.renderList();
        this.onUpdate();
    }

    // --- ГЕНЕРАТОР ---
    generateRandomSystem() {
        this.entities.length = 0; // Очищаем массив

        const sun = new CelestialBody("Star-Prime", "star", 20, null, 0, 0, 0, 0, 10000);
        sun.color = "#ffffff";
        this.entities.push(sun);

        const numPlanets = 3 + Math.floor(Math.random() * 4);
        let currentA = 100;
        
        for (let i = 0; i < numPlanets; i++) {
            currentA += 50 + Math.random() * 200; // Дистанция орбиты
            const radius = 4 + Math.random() * 15;
            const mass = radius * 50; 
            
            const planet = new CelestialBody(`Planet-${i+1}`, "planet", radius, sun, currentA, Math.random() * 0.15, 0, Math.random() * Math.PI * 2, mass);
            planet.color = `hsl(${Math.random() * 360}, 60%, 50%)`;
            
            // 20% шанс на газовый гигант
            if (radius > 12 && Math.random() > 0.8) planet.spriteClass = 'GASGIANT';
            
            this.entities.push(planet);

            // Генерация лун
            const numMoons = Math.floor(Math.random() * 3);
            for (let j = 0; j < numMoons; j++) {
                const moonA = radius * 2 + 10 + Math.random() * 30;
                const moon = new CelestialBody(`${planet.name}-${j+1}`, "moon", 2 + Math.random() * 3, planet, moonA, Math.random() * 0.05, 0, Math.random() * Math.PI * 2, mass / 50);
                moon.color = '#aaaaaa';
                this.entities.push(moon);
            }
        }

        // Добавим один корабль игрока по умолчанию
        const ship = new Ship("UNS-Random", "CORVETTE", this.entities[1], 30, 0, 0);
        this.entities.push(ship);

        this.renderList();
        this.formContainer.innerHTML = '';
        this.onUpdate(); // Сигнал в main.js перепривязать камеру
    }

    // --- ЭКСПОРТ / ИМПОРТ ---
    // --- ЭКСПОРТ / ИМПОРТ ---
    exportJSON() {
        const data = this.entities.map(e => ({
            name: e.name, type: e.type, radius: e.radius,
            parent: e.parent ? e.parent.name : null, 
            // ИСПРАВЛЕНИЕ 1: Строго экспортируем нужные физические свойства
            a: e.a, e: e.e, offset: e.offset, omega: e.omega, mu: e.mu,
            color: e.color, spriteClass: e.spriteClass, shipClass: e.shipClass,
            radarRange: e.radarRange, ladarRange: e.ladarRange, magRange: e.magRange
        }));

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'system_export.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            this.entities.length = 0;

            const dataByName = new Map(data.map(d => [d.name, d]));
            const created = new Map();

            // Создаём объекты сверху вниз: сначала родитель, потом дети.
            // Это гарантирует что конструктор получит правильный parent.mu
            // и корректно посчитает period, soi и orbitalHistory[0].period
            const build = (name, parentObj) => {
                if (created.has(name)) return;
                const d = dataByName.get(name);
                if (!d) return;

                const mu     = d.mu     !== undefined ? d.mu     : (d.mass !== undefined ? d.mass : 3947.84);
                const offset = d.offset !== undefined ? d.offset : 0;
                const omega  = d.omega  !== undefined ? d.omega  : 0;

                let obj;
                if (d.type === 'ship') {
                    obj = new Ship(d.name, d.shipClass || "DEFAULT", parentObj, d.a, d.e, offset, omega);
                    if (d.radarRange !== undefined) obj.radarRange = d.radarRange;
                    if (d.ladarRange !== undefined) obj.ladarRange = d.ladarRange;
                    if (d.magRange   !== undefined) obj.magRange   = d.magRange;
                } else {
                    obj = new CelestialBody(d.name, d.type, d.radius, parentObj, d.a, d.e, offset, omega, mu);
                    if (d.spriteClass) obj.spriteClass = d.spriteClass;
                }
                if (d.color) obj.color = d.color;

                created.set(name, obj);
                this.entities.push(obj);

                // Рекурсивно создаём детей этого объекта
                for (const childD of data) {
                    if (childD.parent === name) {
                        build(childD.name, obj);
                    }
                }
            };

            // Стартуем с корневых объектов (без родителя)
            for (const d of data) {
                if (!d.parent) build(d.name, null);
            }

            this.renderList();
            this.formContainer.innerHTML = '';
            this.onUpdate();
        } catch (err) {
            alert("Ошибка чтения файла: " + err.message);
        }
    };
    reader.readAsText(file);
}
}