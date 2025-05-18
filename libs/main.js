// Инициализация карты
var myMap = L.map('map',{
    attributionControl: false,
    zoomControl: false  // Отключаем стандартный zoom control
}).setView([55.7637122, 37.66179], 14);

const isMobile = window.matchMedia("(max-width: 768px)").matches;
let isLandscape = window.matchMedia("(orientation: landscape)").matches;

function handleOrientationChange() {
    if (window.matchMedia("(orientation: landscape)").matches) {
        document.querySelector('.search-container').style.width = '40%';
        document.getElementById('memorial-sidebar').style.width = '50%';
    } else {
        document.querySelector('.search-container').style.width = 'calc(100% - 20px)';
        document.getElementById('memorial-sidebar').style.width = '100%';
    }
    setTimeout(() => myMap.invalidateSize(), 100);
}

window.addEventListener('orientationchange', handleOrientationChange);
window.addEventListener('resize', handleOrientationChange);

// Добавляем кастомный zoom control
L.control.zoom({
    position: 'topleft',
    zoomInText: '+',
    zoomOutText: '–'
}).addTo(myMap);

// Базовые слои карт
var baseLayers = {
    'Яндекс Карты': L.yandex('map', { attribution: 'Яндекс Карты' }),
    '2GIS': L.tileLayer('https://tile{s}.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1.3', {
        subdomains: ['1', '2', '3', '4'],
        attribution: '2GIS',
        maxZoom: 18
    }),
    'Google Спутник': L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: 'Google Maps',
        maxZoom: 20
    })
};

// Добавляем первый слой по умолчанию
baseLayers['Яндекс Карты'].addTo(myMap);

// Создаем иконки для памятников с динамическим размером
var MemorialIcon = L.Icon.extend({
    options: {
        iconAnchor: [0, 0], // Будем обновлять при изменении размера
        popupAnchor: [0, 0]
    }
});

// Функция для обновления размера маркеров при изменении масштаба
function updateMarkersSize() {
    const currentZoom = myMap.getZoom();
    // Динамически рассчитываем размер в зависимости от масштаба
    let size;
    
    if (currentZoom <= 12) {
        size = 10;
    } else if (currentZoom <= 13) {
        size = 15;
    } else if (currentZoom <= 14) {
        size = 18;
    } else if (currentZoom <= 16) {
        size = 22;
    } else {
        size = 24;
    }
    
    // Обновляем все маркеры на карте
    memorialsLayer.eachLayer(function(layer) {
        if (layer instanceof L.Marker) {
            layer.setIcon(new MemorialIcon({
                iconUrl: './data/icons/record.png',
                iconSize: [size, size],
                iconAnchor: [size/2, size/2]
            }));
        }
    });
}

// Создаем слой памятников с динамическими иконками
var memorialsLayer = L.geoJSON(phmmrl, {
    pointToLayer: function(feature, latlng) {
        const initialSize = 15; // Начальный размер
        return L.marker(latlng, {
            icon: new MemorialIcon({ 
                iconUrl: './data/icons/record.png',
                iconSize: [initialSize, initialSize],
                iconAnchor: [initialSize/2, initialSize/2]
            })
        }).on('click', function() {
            openSidebar(feature);
            myMap.panTo(latlng);
        });
    }
}).addTo(myMap);

// Слушаем событие изменения масштаба
myMap.on('zoomend', function() {
    updateMarkersSize();
});

// Инициализируем размер маркеров при загрузке
updateMarkersSize();

// Создаем иконки для памятников
// var memorialIcon = L.Icon.extend({
//     options: {
//         iconSize: [15, 15],
//         iconAnchor: [7,7],
//         popupAnchor: [-16, 0]
//     }
// });



// Функции для работы с боковой панелью
function openSidebar(feature) {
    const sidebar = document.getElementById('memorial-sidebar');
    const photo = document.getElementById('memorial-photo');
    const desc = document.getElementById('memorial-desc');
    const title = document.getElementById('memorial-title');
    
    // Устанавливаем название
    title.textContent = feature.properties.title || 'Неизвестный памятник';
    
    // Обработка фото
    if (feature.properties.photo_link) {
        // Проверяем расширение файла
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const fileExt = feature.properties.photo_link.substring(feature.properties.photo_link.lastIndexOf('.')).toLowerCase();
        
        if (!validExtensions.includes(fileExt)) {
            console.warn('Неподдерживаемый формат изображения:', feature.properties.photo_link);
            showImagePlaceholder(photo, 'Неподдерживаемый формат');
        } else {
            // Пробуем загрузить фото
            photo.src = feature.properties.photo_link;
            photo.onerror = () => {
                console.error('Ошибка загрузки изображения:', feature.properties.photo_link);
                showImagePlaceholder(photo, 'Фото недоступно');
            };
            photo.onload = () => {
                console.log('Изображение успешно загружено:', feature.properties.photo_link);
            };
            photo.style.cursor = 'zoom-in';
        }
    } else {
        console.warn('Отсутствует ссылка на фото для:', feature.properties.title);
        showImagePlaceholder(photo, 'Фото отсутствует');
    }
    
    // Устанавливаем описание
    desc.textContent = feature.properties.desc || 'Описание отсутствует';
    
    // Открываем панель
    sidebar.classList.add('sidebar-open');
}

// Функция для отображения заглушки
function showImagePlaceholder(imgElement, message) {
    imgElement.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="%2334495e"><rect width="400" height="300"/><text x="200" y="150" font-family="Arial" font-size="16" fill="%23ecf0f1" text-anchor="middle">${message}</text></svg>`;
    imgElement.style.cursor = 'default';
}

// Улучшенная функция полноэкранного просмотра с поддержкой мобильных устройств
function openFullscreen(imgSrc) {
    try {
        if (!imgSrc || typeof imgSrc !== 'string') {
            console.error('Неверный источник изображения:', imgSrc);
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'fullscreen-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.95);
            z-index: 2000;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: zoom-out;
            touch-action: none;
        `;

        const img = document.createElement('img');
        img.src = imgSrc;
        img.id = 'fullscreen-image';
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            user-select: none;
            -webkit-user-select: none;
            transition: transform 0.3s ease;
            transform-origin: center center;
            touch-action: manipulation;
        `;

        let scale = 1;
        let translateX = 0;
        let translateY = 0;
        let startX = 0;
        let startY = 0;
        let isDragging = false;
        let startDistance = 0;
        let lastTapTime = 0;

        // Обновление трансформации изображения с ограничением перемещения
        const updateTransform = () => {
            const containerWidth = overlay.clientWidth;
            const containerHeight = overlay.clientHeight;
            const imgWidth = img.naturalWidth;
            const imgHeight = img.naturalHeight;

            const scaledWidth = (imgWidth * scale > containerWidth * 0.9) ? containerWidth * 0.9 * scale : imgWidth * scale;
            const scaledHeight = (imgHeight * scale > containerHeight * 0.9) ? containerHeight * 0.9 * scale : imgHeight * scale;

            const maxOffsetX = Math.max(0, (scaledWidth - containerWidth) / 2);
            const maxOffsetY = Math.max(0, (scaledHeight - containerHeight) / 2);

            // Ограничение смещения
            translateX = Math.min(maxOffsetX, Math.max(-maxOffsetX, translateX));
            translateY = Math.min(maxOffsetY, Math.max(-maxOffsetY, translateY));

            // Если масштаб = 1 — отключаем любое перемещение
            if (scale === 1) {
                translateX = 0;
                translateY = 0;
            }

            img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        };

        img.onload = () => {
            updateTransform();
        };

        const handleTouchStart = (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                startDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            } else if (e.touches.length === 1 && scale > 1) {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTapTime;
                if (tapLength < 300 && tapLength > 0) {
                    e.preventDefault();
                    if (scale === 1) {
                        scale = 2;
                    } else {
                        scale = 1;
                        translateX = 0;
                        translateY = 0;
                    }
                    updateTransform();
                }
                lastTapTime = currentTime;

                isDragging = true;
                startX = e.touches[0].clientX - translateX;
                startY = e.touches[0].clientY - translateY;
            }
        };

        const handleTouchMove = (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const currentDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );

                if (startDistance > 0) {
                    const newScale = Math.max(1, Math.min(5, scale * (currentDistance / startDistance)));
                    if (Math.abs(newScale - scale) > 0.01) {
                        scale = newScale;
                        updateTransform();
                    }
                }
                startDistance = currentDistance;
            } else if (isDragging && e.touches.length === 1 && scale > 1) {
                e.preventDefault();
                translateX = e.touches[0].clientX - startX;
                translateY = e.touches[0].clientY - startY;
                updateTransform();
            }
        };

        const handleTouchEnd = () => {
            isDragging = false;
            startDistance = 0;
        };

        const handleDblClick = () => {
            if (scale === 1) {
                scale = 2;
            } else {
                scale = 1;
                translateX = 0;
                translateY = 0;
            }
            updateTransform();
        };

        img.addEventListener('touchstart', handleTouchStart, { passive: false });
        img.addEventListener('touchmove', handleTouchMove, { passive: false });
        img.addEventListener('touchend', handleTouchEnd);
        img.addEventListener('dblclick', handleDblClick);

        const closeBtn = document.createElement('div');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            color: white;
            font-size: 30px;
            cursor: pointer;
            z-index: 2001;
            background: rgba(0,0,0,0.5);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        overlay.appendChild(img);
        overlay.appendChild(closeBtn);
        document.body.appendChild(overlay);

        const closeOverlay = () => {
            img.removeEventListener('touchstart', handleTouchStart);
            img.removeEventListener('touchmove', handleTouchMove);
            img.removeEventListener('touchend', handleTouchEnd);
            img.removeEventListener('dblclick', handleDblClick);
            document.removeEventListener('keydown', handleKeyDown);

            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') closeOverlay();
        };

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target === closeBtn) {
                closeOverlay();
            }
        });

        document.addEventListener('keydown', handleKeyDown);

    } catch (error) {
        console.error('Ошибка в функции openFullscreen:', error);
        window.open(imgSrc, '_blank');
    }
}





// Создаем слой памятников
// var memorialsLayer = L.geoJSON(phmmrl, {
//     pointToLayer: function(feature, latlng) {
//         return L.marker(latlng, {
//             icon: new memorialIcon({ iconUrl: './data/icons/record.png' })
//         }).on('click', function() {
//             openSidebar(feature);
//             myMap.panTo(latlng);
//         });
//     }
// }).addTo(myMap);

// Обработчики для боковой панели
document.getElementById('memorial-photo').onclick = function(e) {
    if (this.src) {
        openFullscreen(this.src);
        e.stopPropagation();
    }
};

document.querySelector('.sidebar-close').addEventListener('click', function() {
    document.getElementById('memorial-sidebar').classList.remove('sidebar-open');
});

// Инициализация управления слоями
L.control.layers(baseLayers, {
    'Памятники': memorialsLayer
}).addTo(myMap);



const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

// Слушаем ввод
searchInput.addEventListener('input', function () {
    const query = this.value.trim().toLowerCase();
    searchResults.innerHTML = '';
    
    if (!query) {
        searchResults.style.display = 'none';
        return;
    }

    const results = phmmrl.features.filter(f =>
        f.properties.title && f.properties.title.toLowerCase().includes(query)
    );

    if (results.length === 0) {
        const noResult = document.createElement('li');
        noResult.textContent = 'Ничего не найдено';
        noResult.style.padding = '10px';
        searchResults.appendChild(noResult);
        searchResults.style.display = 'block';
        return;
    }

    results.forEach(f => {
        const li = document.createElement('li');
        li.textContent = f.properties.title;
        li.style.padding = '10px';
        li.style.cursor = 'pointer';
        li.addEventListener('click', function () {
            // Правильно берём координаты, не мутируя:
            const [lon, lat] = f.geometry.coordinates;
            const coords = [lat, lon];
        
            // Центрируем карту
            myMap.setView(coords, 17);
        
            // Открываем сайдбар
            openSidebar(f);
        
            // Очистить и скрыть результаты
            searchInput.value = '';
            searchResults.style.display = 'none';
            searchResults.innerHTML = '';
        });
        searchResults.appendChild(li);
    });

    searchResults.style.display = 'block';
});

handleOrientationChange();