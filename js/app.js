window.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // --- 1. MENÚ Y MODO TÁCTICO (INFRARROJO) ---
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            navLinks.forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('tactical-mode');
        themeToggle.innerText = document.body.classList.contains('tactical-mode') ? 'Modo Radar' : 'Modo Táctico';
    });

    const container = document.getElementById('globe-viz');
    if (!container) return;

    // Hubs y Meteorología
    const hubs = [
        { name: 'Base Toluca (TLC)', lat: 19.3371, lng: -99.5660, desc: 'Hangares centrales y logística de América.', gates: 18, traffic: 'Muy Alto', temp: '18°C', wind: '12 km/h NE', visibility: '10 km (Óptima)' },
        { name: 'Base JFK (Nueva York)', lat: 40.6413, lng: -73.7781, desc: 'Enlace transatlántico y control norteamericano.', gates: 32, traffic: 'Crítico', temp: '9°C', wind: '24 km/h NW', visibility: '8 km (Nuboso)' },
        { name: 'Base LHR (Londres)', lat: 51.4700, lng: -0.4543, desc: 'Distribución de tráfico europeo y slots.', gates: 45, traffic: 'Muy Alto', temp: '11°C', wind: '18 km/h SW', visibility: '6 km (Niebla parcial)' },
        { name: 'Base HND (Tokio)', lat: 35.5494, lng: 139.7798, desc: 'Telemetría para la división del pacífico asiático.', gates: 28, traffic: 'Alto', temp: '15°C', wind: '10 km/h E', visibility: '10 km (Despejado)' },
        { name: 'Base DXB (Dubái)', lat: 25.2532, lng: 55.3657, desc: 'Interconexión global de carga pesada.', gates: 50, traffic: 'Crítico', temp: '34°C', wind: '14 km/h S', visibility: '10 km (Caluroso)' },
        { name: 'Base GRU (São Paulo)', lat: -23.4356, lng: -46.4731, desc: 'Estación principal para operaciones en Sudamérica.', gates: 20, traffic: 'Moderado', temp: '22°C', wind: '15 km/h SE', visibility: '9 km (Estable)' }
    ];

    const meteoContainer = document.getElementById('meteo-cards-container');
    hubs.forEach(h => {
        const card = document.createElement('div');
        card.className = 'meteo-card';
        card.innerHTML = `
            <h4>${h.name}</h4>
            <p>${h.desc}</p>
            <div class="meteo-stats">
                <span>Temp: <strong>${h.temp}</strong></span>
                <span>Viento: <strong>${h.wind}</strong></span>
                <span style="grid-column: span 2;">Visibilidad: <strong>${h.visibility}</strong></span>
            </div>
        `;
        meteoContainer.appendChild(card);
    });

    // --- Three.js Setup & Aviones en Movimiento ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 3.1;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const earthGroup = new THREE.Group();
    earthGroup.rotation.x = 0.25;
    scene.add(earthGroup);

    earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.99, 64, 64), new THREE.MeshBasicMaterial({ color: 0x030406 })));
    earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.04, 64, 64), new THREE.MeshBasicMaterial({ color: 0xFACC15, transparent: true, opacity: 0.08, side: THREE.BackSide })));

    function latLngToVector3(lat, lng, radius = 1.01) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        return new THREE.Vector3(-(radius * Math.sin(phi) * Math.cos(theta)), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
    }

    let animatedPlanes = [];

    const mapImg = new Image();
    mapImg.crossOrigin = 'Anonymous';
    mapImg.src = 'https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/planets/earth_specular_2048.jpg';

    mapImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 360; canvas.height = 180;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(mapImg, 0, 0, 360, 180);
        const imgData = ctx.getImageData(0, 0, 360, 180).data;

        const positions = [], colors = [];
        const c1 = new THREE.Color(0xFACC15), c2 = new THREE.Color(0xCA8A04);

        for (let lat = -85; lat <= 85; lat += 1.25) {
            const cosLat = Math.cos(lat * Math.PI / 180);
            for (let lng = -180; lng <= 180; lng += 1.25 / Math.max(0.2, cosLat)) {
                const u = Math.floor(((lng + 180) / 360) * 360);
                const v = Math.floor(((90 - lat) / 180) * 180);
                if (imgData[(v * 360 + u) * 4] < 60) {
                    const v3 = latLngToVector3(lat, lng, 1.005);
                    positions.push(v3.x, v3.y, v3.z);
                    const col = Math.random() > 0.35 ? c1 : c2;
                    colors.push(col.r, col.g, col.b);
                }
            }
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        earthGroup.add(new THREE.Points(geom, new THREE.PointsMaterial({ size: 0.014, vertexColors: true, transparent: true, opacity: 0.95 })));

        const hubGeom = new THREE.SphereGeometry(0.022, 16, 16);
        const hubMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

        hubs.forEach(h => {
            const mesh = new THREE.Mesh(hubGeom, hubMat);
            mesh.position.copy(latLngToVector3(h.lat, h.lng, 1.015));
            mesh.userData = h;
            earthGroup.add(mesh);
        });

        // Crear Rutas y Aviones en Animación Constante
        const routes = [
            { from: [19.33, -99.56], to: [40.64, -73.77] },
            { from: [19.33, -99.56], to: [51.47, -0.45] },
            { from: [40.64, -73.77], to: [25.25, 55.36] },
            { from: [51.47, -0.45], to: [35.54, 139.77] }
        ];

        const lineMat = new THREE.LineBasicMaterial({ color: 0xFEF08A, transparent: true, opacity: 0.4 });
        const planeGeo = new THREE.SphereGeometry(0.018, 8, 8);
        const planeMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

        routes.forEach(r => {
            const start = latLngToVector3(r.from[0], r.from[1]);
            const end = latLngToVector3(r.to[0], r.to[1]);
            const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(1.2);
            const curve = new THREE.QuadraticBezierCurve3(start, mid, end);

            earthGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)), lineMat));

            const planeMesh = new THREE.Mesh(planeGeo, planeMat);
            earthGroup.add(planeMesh);
            animatedPlanes.push({ mesh: planeMesh, curve: curve, progress: Math.random() });
        });
    };

    // --- Clic en Hubs ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    container.addEventListener('click', (event) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hit = raycaster.intersectObjects(earthGroup.children).find(i => i.object.userData && i.object.userData.name);
        if (hit) {
            document.getElementById('modal-title').innerText = hit.object.userData.name;
            document.getElementById('modal-desc').innerText = hit.object.userData.desc;
            document.getElementById('modal-gates').innerText = hit.object.userData.gates;
            document.getElementById('modal-traffic').innerText = hit.object.userData.traffic;
            document.getElementById('hub-modal').classList.add('open');
        }
    });

    const modal = document.getElementById('hub-modal');
    document.getElementById('close-modal').addEventListener('click', () => modal.classList.remove('open'));

    // --- Base de Datos con LocalStorage ---
    let defaultFlights = [
        { code: 'AER-402', model: 'Boeing 787-9', pilot: 'Cmdte. Roberto Garza', route: 'Toluca (TLC) ➔ New York (JFK)', alt: '36,000 ft', spd: '910 km/h', gate: 'Gate 04 (TLC)', status: 'active' },
        { code: 'AER-810', model: 'Airbus A350', pilot: 'Cmdte. Sofia Morales', route: 'Toluca (TLC) ➔ Londres (LHR)', alt: '38,500 ft', spd: '940 km/h', gate: 'Gate 02 (TLC)', status: 'active' },
        { code: 'AER-115', model: 'Boeing 777F', pilot: 'Cmdte. Marcus Vance', route: 'Toluca (TLC) ➔ Tokio (HND)', alt: '35,000 ft', spd: '890 km/h', gate: 'Platform B', status: 'landing' },
        { code: 'AER-330', model: 'Airbus A320neo', pilot: 'Cmdte. Elena Rios', route: 'Monterrey (MTY) ➔ Toluca (TLC)', alt: '0 ft (En Tierra)', spd: '0 km/h', gate: 'Hangar 3', status: 'maintenance' }
    ];

    let flightsData = JSON.parse(localStorage.getItem('aero_ops_flights')) || defaultFlights;

    let maintenanceData = [
        { plate: 'XA-BOE', model: 'Boeing 787-9', hours: '4,850 hrs', lastService: '12 Ene 2026', nextService: '12 Jun 2026', status: 'Operativo' },
        { plate: 'XA-AIR', model: 'Airbus A350', hours: '5,200 hrs', lastService: '02 Feb 2026', nextService: '02 Jul 2026', status: 'Operativo' },
        { plate: 'XA-CAR', model: 'Boeing 777F', hours: '7,100 hrs', lastService: '15 Nov 2025', nextService: '20 Mar 2026', status: 'En Hangar (Revisión)' }
    ];

    let crewData = [
        { name: 'Cmdte. Roberto Garza', rank: 'Capitán Sr.', hours: '74 hrs', rest: 'Hace 18 horas', status: 'Disponible' },
        { name: 'Cmdte. Sofia Morales', rank: 'Capitán', hours: '82 hrs', rest: 'Hace 24 horas', status: 'Disponible' },
        { name: 'Oficial Daniel Soto', rank: 'Primer Oficial', hours: '95 hrs (Límite)', rest: 'Requiere Descanso', status: 'En Retén / Descanso' }
    ];

    const tableBody = document.getElementById('flights-table-body');
    const searchInput = document.getElementById('flight-search');
    let currentFilter = 'all';

    function renderFlights(filterText = '') {
        tableBody.innerHTML = '';
        flightsData.filter(f => {
            const matchesFilter = currentFilter === 'all' || f.status === currentFilter;
            const matchesSearch = f.code.toLowerCase().includes(filterText.toLowerCase()) || f.pilot.toLowerCase().includes(filterText.toLowerCase());
            return matchesFilter && matchesSearch;
        }).forEach(f => {
            const statusLabels = { active: 'EN VUELO', landing: 'ATERRIZANDO', maintenance: 'EN HANGAR' };
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${f.code}</strong></td><td>${f.model}</td><td>${f.pilot}</td><td>${f.route}</td>
                <td>${f.alt} / ${f.spd}</td><td>${f.gate}</td>
                <td><span class="status-badge ${f.status}">${statusLabels[f.status] || 'ACTIVO'}</span></td>
            `;
            tableBody.appendChild(tr);
        });
        document.getElementById('active-flights-count').innerText = flightsData.length + 1420;
    }

    function renderMaintenance() {
        const body = document.getElementById('maintenance-table-body');
        body.innerHTML = '';
        maintenanceData.forEach(m => {
            body.innerHTML += `
                <tr><td><strong>${m.plate}</strong></td><td>${m.model}</td><td>${m.hours}</td><td>${m.lastService}</td><td>${m.nextService}</td>
                <td><span class="status-badge ${m.status.includes('Hangar') ? 'maintenance' : 'active'}">${m.status}</span></td></tr>
            `;
        });
    }

    function renderCrew() {
        const body = document.getElementById('crew-table-body');
        body.innerHTML = '';
        crewData.forEach(c => {
            body.innerHTML += `
                <tr><td><strong>${c.name}</strong></td><td>${c.rank}</td><td>${c.hours}</td><td>${c.rest}</td>
                <td><span class="status-badge ${c.status.includes('Descanso') ? 'rest' : 'active'}">${c.status}</span></td></tr>
            `;
        });
    }

    renderFlights();
    renderMaintenance();
    renderCrew();

    searchInput.addEventListener('input', (e) => renderFlights(e.target.value));

    document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderFlights(searchInput.value);
        });
    });

    // --- Exportar a CSV ---
    document.getElementById('export-btn').addEventListener('click', () => {
        let csv = 'Codigo,Modelo,Capitán,Ruta,Altitud,Velocidad,Base/Puerta,Estatus\n';
        flightsData.forEach(f => {
            csv += `"${f.code}","${f.model}","${f.pilot}","${f.route}","${f.alt}","${f.spd}","${f.gate}","${f.status}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', 'aero_ops_reporte_vuelos.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    // --- Despacho y LocalStorage ---
    document.getElementById('flight-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const dist = parseFloat(document.getElementById('f-dist').value) || 5000;
        const fuelEst = (dist * 4.2).toFixed(0);
        const costEst = (fuelEst * 1.85).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

        const newFlight = {
            code: document.getElementById('f-code').value.toUpperCase(),
            model: document.getElementById('f-model').value,
            pilot: document.getElementById('f-pilot').value,
            route: document.getElementById('f-route').value,
            alt: document.getElementById('f-alt').value,
            spd: document.getElementById('f-spd').value,
            gate: 'Plataforma Central',
            status: 'active'
        };

        flightsData.unshift(newFlight);
        localStorage.setItem('aero_ops_flights', JSON.stringify(flightsData));
        renderFlights(searchInput.value);
        e.target.reset();
        alert(`¡Plan de vuelo autorizado y guardado en sistema!\n\n- Consumo estimado de turbosina: ${fuelEst} Litros\n- Costo operativo estimado: ${costEst}`);
    });

    // --- Animación 3D y Movimiento de Aviones ---
    let isDragging = false, prevMouse = { x: 0, y: 0 }, autoRotate = true;
    earthGroup.rotation.y = 4.2;

    container.addEventListener('mousedown', (e) => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        earthGroup.rotation.y += (e.clientX - prevMouse.x) * 0.005;
        earthGroup.rotation.x += (e.clientY - prevMouse.y) * 0.005;
        prevMouse = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => { isDragging = false; });

    document.getElementById('toggle-rotation').addEventListener('click', () => autoRotate = !autoRotate);
    document.getElementById('reset-view').addEventListener('click', () => { earthGroup.rotation.set(0.25, 4.2, 0); autoRotate = true; });

    function animate() {
        requestAnimationFrame(animate);
        if (autoRotate) earthGroup.rotation.y += 0.002;

        // Animar aviones sobre las rutas
        animatedPlanes.forEach(p => {
            p.progress += 0.0025;
            if (p.progress > 1) p.progress = 0;
            const pos = p.curve.getPoint(p.progress);
            p.mesh.position.copy(pos);
        });

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
});