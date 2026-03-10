// Get layout from localStorage and photos from IndexedDB
let layoutData = JSON.parse(localStorage.getItem('selectedLayout'));
let capturedPhotos = [];

const DEMO_DATA = {
    layout: { layout: 'strip3', rows: 3, cols: 1, name: 'Strip 3' },
    photos: [
        { id: 0, placeholder: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%23e0e0e0"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="32" fill="%23666"%3EPhoto 1%3C/text%3E%3C/svg%3E', filters: {} },
        { id: 1, placeholder: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%23d0d0d0"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="32" fill="%23666"%3EPhoto 2%3C/text%3E%3C/svg%3E', filters: {} },
        { id: 2, placeholder: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%23c0c0c0"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="32" fill="%23666"%3EPhoto 3%3C/text%3E%3C/svg%3E', filters: {} }
    ]
};

// Load photos from IndexedDB, fall back to demo data
async function loadPhotos() {
    try {
        const photos = await PhotoDB.getAllPhotos();
        if (photos && photos.length > 0) {
            capturedPhotos = photos;
        } else {
            throw new Error('No photos found');
        }
        if (!layoutData) {
            layoutData = DEMO_DATA.layout;
        }
    } catch (err) {
        console.warn('Using demo data:', err);
        layoutData = DEMO_DATA.layout;
        capturedPhotos = DEMO_DATA.photos;
    }
    initPage();
}

function initPage() {

    const container = document.getElementById('photoStripContainer');

    // Customization state
    let currentFilters = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        preset: 'none'
    };

    let stripColor = '#FFFFFF';
    let emojis = []; // Array to store emoji positions and types
    let selectedEmoji = null;
    let emojiPlacementMode = false;
    let selectedEmojiForEdit = null;

    // Debounced render for performance during rapid interactions
    let _renderTimeout = null;
    function debouncedRender() {
        if (_renderTimeout) cancelAnimationFrame(_renderTimeout);
        _renderTimeout = requestAnimationFrame(() => renderPhotoStrip());
    }

    // Swap two photos and re-render
    function swapPhotos(fromIdx, toIdx) {
        if (toIdx < 0 || toIdx >= capturedPhotos.length) return;
        [capturedPhotos[fromIdx], capturedPhotos[toIdx]] = [capturedPhotos[toIdx], capturedPhotos[fromIdx]];
        capturedPhotos.forEach((p, i) => p.id = i);
        PhotoDB.saveAllPhotos(capturedPhotos).catch(err => console.warn('Reorder save failed:', err));
        renderPhotoStrip();
    }

    // Create reorder overlay buttons for a photo
    function createReorderOverlay(index, total, direction) {
        const controls = document.createElement('div');
        const isVert = direction === 'vertical';
        controls.className = `absolute top-1 right-1 flex ${isVert ? 'flex-col' : ''} gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10`;
        const prev = isVert ? 'arrow_upward' : 'arrow_back';
        const next = isVert ? 'arrow_downward' : 'arrow_forward';

        if (index > 0) {
            const btn = document.createElement('button');
            btn.className = 'reorder-btn p-1 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all';
            btn.dataset.from = index;
            btn.dataset.to = index - 1;
            btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">${prev}</span>`;
            controls.appendChild(btn);
        }
        if (index < total - 1) {
            const btn = document.createElement('button');
            btn.className = 'reorder-btn p-1 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all';
            btn.dataset.from = index;
            btn.dataset.to = index + 1;
            btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">${next}</span>`;
            controls.appendChild(btn);
        }
        return controls;
    }

    // Generate photo strip based on layout
    function renderPhotoStrip() {
        container.innerHTML = '';

        // Create outer strip container
        const stripContainer = document.createElement('div');
        stripContainer.className = 'photo-strip-3d relative border border-border-light shadow-scrapbook w-full max-w-[380px] mx-auto polaroid-frame transition-transform cursor-pointer';

        // Inner wrapper (sharp corners for brutalist display)
        const innerContainer = document.createElement('div');
        innerContainer.className = 'w-full relative overflow-hidden bg-white';

        // Container for fabric canvas
        const canvasContainer = document.createElement('div');
        canvasContainer.id = 'canvasContainer';
        canvasContainer.className = 'w-full relative overflow-hidden';

        // We will create a visible canvas for Fabric to attach to
        const fabricCanvasEl = document.createElement('canvas');
        fabricCanvasEl.id = 'fabricCanvas';
        canvasContainer.appendChild(fabricCanvasEl);

        let params = {
            photoWidth: 600,
            photoHeight: 750,
            paddingTop: 48,
            paddingSide: 48,
            paddingBottom: 48,
            gap: 24,
            footerHeight: 120
        };

        let canvasWidth = 0;
        let canvasHeight = 0;

        // Calculate dimensions based on layout
        if (layoutData.layout === 'strip3') {
            canvasWidth = (params.paddingSide * 2) + params.photoWidth;
            canvasHeight = params.paddingTop + (params.photoHeight * 3) + (params.gap * 2) + params.footerHeight + params.paddingBottom;
        } else if (layoutData.layout === 'strip4') {
            canvasWidth = (params.paddingSide * 2) + params.photoWidth;
            canvasHeight = params.paddingTop + (params.photoHeight * 4) + (params.gap * 3) + params.footerHeight + params.paddingBottom;
        } else if (layoutData.layout === 'grid2x2') {
            params.photoWidth = 600;
            params.photoHeight = 600;
            canvasWidth = (params.paddingSide * 2) + (params.photoWidth * 2) + params.gap;
            canvasHeight = params.paddingTop + (params.photoHeight * 2) + params.gap + params.footerHeight + params.paddingBottom;
            stripContainer.style.maxWidth = '600px';
        } else if (layoutData.layout === 'row3') {
            canvasWidth = (params.paddingSide * 2) + (params.photoWidth * 3) + (params.gap * 2);
            canvasHeight = params.paddingTop + params.photoHeight + params.footerHeight + params.paddingBottom;
            stripContainer.style.maxWidth = '800px';
        }

        innerContainer.appendChild(canvasContainer);

        // Add to DOM temporarily to init Fabric
        stripContainer.appendChild(innerContainer);
        container.appendChild(stripContainer);

        // Initialize Fabric Canvas with Background Color!
        const fCanvas = new fabric.Canvas('fabricCanvas', {
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: stripColor,
            selection: false, // Disable group selection
            preserveObjectStacking: true
        });

        // Make Fabric canvas fully fluid responsive via CSS
        const fbContainer = fCanvas.wrapperEl;
        if (fbContainer) {
            fbContainer.style.width = '100%';
            fbContainer.style.height = 'auto';
            fbContainer.style.aspectRatio = `${canvasWidth} / ${canvasHeight}`;

            const lowerCanvas = fCanvas.lowerCanvasEl;
            const upperCanvas = fCanvas.upperCanvasEl;
            if (lowerCanvas) {
                lowerCanvas.style.width = '100%';
                lowerCanvas.style.height = '100%';
            }
            if (upperCanvas) {
                upperCanvas.style.width = '100%';
                upperCanvas.style.height = '100%';
            }
        }

        // Store canvas reference globally for easy access
        window.fabricCanvas = fCanvas;

        // Add photos to fabric canvas
        let loadedCount = 0;
        const totalPhotos = capturedPhotos.length;

        // Footer elements
        const drawFooter = () => {
            const footerYStart = canvasHeight - params.paddingBottom - params.footerHeight;

            // Separator Line
            const line = new fabric.Line([
                params.paddingSide,
                footerYStart + 30,
                canvasWidth - params.paddingSide,
                footerYStart + 30
            ], {
                stroke: 'rgba(0,0,0,0.15)',
                strokeWidth: 3,
                selectable: false,
                evented: false
            });
            fCanvas.add(line);

            // Text vertical center in footer area
            const textY = footerYStart + 70;

            // Date
            const dateStr = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '.');
            const dateText = new fabric.Text(dateStr, {
                left: params.paddingSide + 10,
                top: textY,
                fontSize: 28,
                fontFamily: 'Courier Prime, monospace',
                fontWeight: 700,
                fill: '#2c2825',
                selectable: false,
                evented: false,
                originY: 'center'
            });
            fCanvas.add(dateText);

            // Branding
            const brandText = new fabric.Text('PixBooth', {
                left: canvasWidth - params.paddingSide - 10,
                top: textY,
                fontSize: 48,
                fontWeight: 700,
                fontFamily: 'Caveat, cursive',
                fill: '#e76f51', // primary color match
                originX: 'right',
                originY: 'center',
                selectable: false,
                evented: false
            });
            fCanvas.add(brandText);
        };

        const addImagesToCanvas = () => {
            capturedPhotos.forEach((photo, index) => {
                fabric.Image.fromURL(photo.placeholder, (img) => {
                    let x = 0, y = 0, w = params.photoWidth, h = params.photoHeight;

                    if (layoutData.layout === 'strip3' || layoutData.layout === 'strip4') {
                        x = params.paddingSide;
                        y = params.paddingTop + (index * (h + params.gap));
                    } else if (layoutData.layout === 'grid2x2') {
                        const col = index % 2;
                        const row = Math.floor(index / 2);
                        x = params.paddingSide + (col * (w + params.gap));
                        y = params.paddingTop + (row * (h + params.gap));
                    } else if (layoutData.layout === 'row3') {
                        x = params.paddingSide + (index * (w + params.gap));
                        y = params.paddingTop;
                    }

                    // Setup Image properties
                    img.set({
                        left: x,
                        top: y,
                        strokeWidth: 0,
                        selectable: false,
                        evented: false,
                        crossOrigin: 'anonymous'
                    });

                    // Scale image to cover area (object-fit: cover equivalent in fabric)
                    const scaleX = w / img.width;
                    const scaleY = h / img.height;
                    const scale = Math.max(scaleX, scaleY);
                    img.scale(scale);

                    // Center crop
                    img.set({
                        left: x + (w - img.getScaledWidth()) / 2,
                        top: y + (h - img.getScaledHeight()) / 2
                    });

                    // Hard edges instead of rounded crop for brutalist look
                    const clipPath = new fabric.Rect({
                        left: x,
                        top: y,
                        width: w,
                        height: h,
                        absolutePositioned: true
                    });

                    img.clipPath = clipPath;

                    // Apply filters (basic CSS equivalent via fabric filters)
                    if (currentFilters.brightness !== 0) {
                        img.filters.push(new fabric.Image.filters.Brightness({
                            brightness: currentFilters.brightness / 100
                        }));
                    }
                    if (currentFilters.contrast !== 0) {
                        img.filters.push(new fabric.Image.filters.Contrast({
                            contrast: currentFilters.contrast / 100
                        }));
                    }
                    if (currentFilters.saturation !== 0) {
                        img.filters.push(new fabric.Image.filters.Saturation({
                            saturation: currentFilters.saturation / 100
                        }));
                    }

                    img.applyFilters();
                    fCanvas.add(img);

                    // Send to back to ensure emojis are on top
                    img.sendToBack();

                    loadedCount++;
                    if (loadedCount === totalPhotos) {
                        drawFooter();
                        fCanvas.renderAll();
                    }
                }, { crossOrigin: 'anonymous' });
            });
        };

        addImagesToCanvas();

        // Setup fabric canvas events (for deleting, modifying objects)
        fCanvas.on('selection:created', (e) => {
            selectedEmojiForEdit = e.selected[0];
            showEmojiEditControls();
        });

        fCanvas.on('selection:cleared', () => {
            selectedEmojiForEdit = null;
            hideEmojiEditControls();
        });

        fCanvas.on('selection:updated', (e) => {
            selectedEmojiForEdit = e.selected[0];
            showEmojiEditControls();
        });

        // Emojis array handling
        emojis.forEach(emojiParams => {
            addFabricEmoji(emojiParams);
        });

        // Handle canvas clicks for emoji placement mode and deselection
        fCanvas.on('mouse:down', function (options) {
            // First, if clicking empty canvas, clear selection
            if (!options.target) {
                fCanvas.discardActiveObject();
                fCanvas.renderAll();
            }

            // Then handle emoji placement if mode is active
            if (emojiPlacementMode && selectedEmoji && (!options.target || !options.target.selectable)) {
                const pointer = fCanvas.getPointer(options.e);

                const newEmojiParams = {
                    id: Date.now(),
                    emoji: selectedEmoji,
                    x: pointer.x,
                    y: pointer.y,
                    size: 48,
                    scaleX: 1,
                    scaleY: 1,
                    angle: 0
                };

                emojis.push(newEmojiParams);
                const fabricObj = addFabricEmoji(newEmojiParams);

                if (fabricObj) {
                    selectedEmojiForEdit = fabricObj;
                    fCanvas.setActiveObject(fabricObj);
                }

                emojiPlacementMode = false;
                emojiModal.classList.add('hidden');
                document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('bg-primary/20'));
            }
        });

        // Add to DOM
        innerContainer.appendChild(canvasContainer);
        stripContainer.appendChild(innerContainer);
        container.appendChild(stripContainer);

        // 3D Tilt Effect
        setupTiltEffect(stripContainer);
    }

    function setupTiltEffect(element) {
        let isHovered = false;

        const handleMouseMove = (e) => {
            if (!isHovered) return;
            
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Calculate rotation (softer vintage tilt max 5 degrees)
            const rotateX = ((y - centerY) / centerY) * -5;
            const rotateY = ((x - centerX) / centerX) * 5;
            
            element.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        };

        const handleMouseEnter = () => {
            isHovered = true;
            element.style.transition = 'transform 0.1s ease-out';
        };

        const handleMouseLeave = () => {
            isHovered = false;
            element.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            element.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        };

        element.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);
        
        // Touch support
        element.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                isHovered = true;
                const touch = e.touches[0];
                handleMouseMove(touch);
            }
        });
        element.addEventListener('touchend', handleMouseLeave);
    }

    // Custom delete control icon
    const deleteIcon = "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'%3E%3Csvg version='1.1' id='Ebene_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='595.275px' height='595.275px' viewBox='200 215 230 470' xml:space='preserve'%3E%3Ccircle style='fill:%23F44336;' cx='299.76' cy='439.067' r='218.516'/%3E%3Cg%3E%3Crect x='267.162' y='307.978' transform='matrix(0.7071 -0.7071 0.7071 0.7071 -222.6202 340.6915)' style='fill:white;' width='65.545' height='262.18'/%3E%3Crect x='266.988' y='308.153' transform='matrix(0.7071 0.7071 -0.7071 0.7071 398.3889 -83.3116)' style='fill:white;' width='65.544' height='262.179'/%3E%3C/g%3E%3C/svg%3E";
    const deleteImg = document.createElement('img');
    deleteImg.src = deleteIcon;

    function renderIcon(ctx, left, top, styleOverride, fabricObject) {
        const size = this.cornerSize;
        ctx.save();
        ctx.translate(left, top);
        ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
        ctx.drawImage(deleteImg, -size / 2, -size / 2, size, size);
        ctx.restore();
    }

    function deleteObject(eventData, transform) {
        const target = transform.target;
        const canvas = target.canvas;
        canvas.remove(target);
        canvas.requestRenderAll();
        return true;
    }

    fabric.Object.prototype.controls.deleteControl = new fabric.Control({
        x: 0.5,
        y: -0.5,
        offsetY: -5,
        offsetX: 5,
        cursorStyle: 'pointer',
        mouseUpHandler: deleteObject,
        render: renderIcon,
        cornerSize: 24
    });

    // Add a new emoji to the fabric canvas
    function addFabricEmoji(params) {
        if (!window.fabricCanvas) return null;

        const text = new fabric.Text(params.emoji, {
            left: params.x,
            top: params.y,
            fontSize: params.size || 48,
            scaleX: params.scaleX || 1,
            scaleY: params.scaleY || 1,
            angle: params.angle || 0,
            originX: 'center',
            originY: 'center',
            transparentCorners: false,
            cornerColor: '#7C3AED',
            cornerStrokeColor: '#FFFFFF',
            borderColor: '#7C3AED',
            cornerSize: 12,
            padding: 10,
            cornerStyle: 'circle',
            id: params.id || Date.now()
        });

        text.setControlsVisibility({
            mb: false, mt: false, ml: false, mr: false, bl: false, br: false
        });

        // Add custom rotate control to visually override standard corner
        const rotateIcon = "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'%3E%3Csvg version='1.1' id='Layer_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' viewBox='0 0 512 512' style='enable-background:new 0 0 512 512;' xml:space='preserve'%3E%3Ccircle style='fill:%234CAF50;' cx='256' cy='256' r='256'/%3E%3Cpath style='fill:%23FFFFFF;' d='M374.2,256c0,65.2-52.9,118.2-118.2,118.2c-29.6,0-56.7-10.9-77.4-28.9l20.4-20.4 c15.2,12.2,34.8,19.4,56.9,19.4c48.8,0,88.4-39.6,88.4-88.4c0-48.8-39.6-88.4-88.4-88.4c-20.9,0-39.9,7.2-55.1,19.2l20.6,20.6H137.9 v-83.6l23.5,23.5C186.2,160.3,219.1,146,256,146C321.3,146,374.2,199,374.2,256z'/%3E%3C/svg%3E";
        const rotateImg = document.createElement('img');
        rotateImg.src = rotateIcon;

        function renderRotateIcon(ctx, left, top, styleOverride, fabricObject) {
            const size = this.cornerSize;
            ctx.save();
            ctx.translate(left, top);
            ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
            ctx.drawImage(rotateImg, -size / 2, -size / 2, size, size);
            ctx.restore();
        }

        // Add it directly as mtr substitute if needed, or another custom corner
        text.controls.mtr = new fabric.Control({
            x: 0.5,
            y: 0.5,
            offsetY: 5,
            offsetX: 5,
            actionHandler: fabric.controlsUtils.rotationWithSnapping,
            cursorStyle: 'crosshair',
            actionName: 'rotate',
            render: renderRotateIcon,
            cornerSize: 24
        });

        // Add a scale control
        const scaleIcon = "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'%3E%3Csvg version='1.1' id='Layer_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' viewBox='0 0 512 512' style='enable-background:new 0 0 512 512;' xml:space='preserve'%3E%3Ccircle style='fill:%232196F3;' cx='256' cy='256' r='256'/%3E%3Cpath style='fill:%23FFFFFF;' d='M351.5,160.5v104.2h-29.8v-53.3L209.6,323.5v-53.3h-29.8v104.2h104.2v-29.8h-53.3L342.8,232.5v53.3h29.8 V160.5H351.5z'/%3E%3C/svg%3E";
        const scaleImg = document.createElement('img');
        scaleImg.src = scaleIcon;

        function renderScaleIcon(ctx, left, top, styleOverride, fabricObject) {
            const size = this.cornerSize;
            ctx.save();
            ctx.translate(left, top);
            ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
            ctx.drawImage(scaleImg, -size / 2, -size / 2, size, size);
            ctx.restore();
        }

        text.controls.bl = new fabric.Control({
            x: -0.5,
            y: 0.5,
            offsetY: 5,
            offsetX: -5,
            actionHandler: fabric.controlsUtils.scalingEqually,
            cursorStyle: 'nwse-resize',
            actionName: 'scale',
            render: renderScaleIcon,
            cornerSize: 24
        });

        window.fabricCanvas.add(text);
        window.fabricCanvas.renderAll();
        return text;
    }

    // Filter application via Fabric logic instead of CSS string
    function applyFiltersToAllPhotos() {
        if (!window.fabricCanvas) return;

        window.fabricCanvas.getObjects().forEach(obj => {
            if (obj.type === 'image') {
                obj.filters = [];
                if (currentFilters.brightness !== 0) {
                    obj.filters.push(new fabric.Image.filters.Brightness({ brightness: currentFilters.brightness / 100 }));
                }
                if (currentFilters.contrast !== 0) {
                    obj.filters.push(new fabric.Image.filters.Contrast({ contrast: currentFilters.contrast / 100 }));
                }
                if (currentFilters.saturation !== 0) {
                    obj.filters.push(new fabric.Image.filters.Saturation({ saturation: currentFilters.saturation / 100 }));
                }
                // Handle presets if any (e.g. sepia)
                if (currentFilters.preset === 'sepia') {
                    obj.filters.push(new fabric.Image.filters.Sepia());
                } else if (currentFilters.preset === 'noir') {
                    obj.filters.push(new fabric.Image.filters.Grayscale());
                } else if (currentFilters.preset === 'vintage') {
                    obj.filters.push(new fabric.Image.filters.Sepia());
                    obj.filters.push(new fabric.Image.filters.Contrast({ contrast: -0.2 }));
                } else if (currentFilters.preset === 'vivid') {
                    obj.filters.push(new fabric.Image.filters.Saturation({ saturation: 0.5 }));
                    obj.filters.push(new fabric.Image.filters.Contrast({ contrast: 0.2 }));
                }

                obj.applyFilters();
            }
        });
        window.fabricCanvas.renderAll();
    }

    // Get frame classes - simple spacing only
    function getFrameClass() {
        return 'flex items-center justify-center mb-2';
    }

    // Get filter string from current settings
    function getFilterString() {
        let filter = '';

        // Apply preset
        switch (currentFilters.preset) {
            case 'sepia':
                filter += 'sepia(0.8) ';
                break;
            case 'noir':
                filter += 'grayscale(1) ';
                break;
            case 'vivid':
                filter += 'saturate(1.5) contrast(1.2) ';
                break;
            case 'vintage':
                filter += 'sepia(0.5) contrast(0.8) ';
                break;
        }

        // Apply manual adjustments
        const brightness = 1 + (currentFilters.brightness / 100);
        const contrast = 1 + (currentFilters.contrast / 100);
        const saturation = 1 + (currentFilters.saturation / 100);

        filter += `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;

        return filter;
    }

    // Initial render
    renderPhotoStrip();

    // Color selection
    const colorOptions = document.querySelectorAll('.color-option');

    // Mark the first swatch (white) as initially selected
    if (colorOptions.length > 0) {
        colorOptions[0].classList.add('selected');
    }

    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove active state from all
            colorOptions.forEach(opt => {
                opt.classList.remove('border-primary', 'selected');
                opt.classList.add('border-transparent');
            });

            // Add active state to selected
            option.classList.remove('border-transparent');
            option.classList.add('border-primary', 'selected');

            stripColor = option.dataset.color;
            renderPhotoStrip();
        });
    });

    // Emoji modal controls
    const emojiModal = document.getElementById('emojiModal');
    const addEmojiBtn = document.getElementById('addEmojiBtn');
    const closeEmojiModalBtn = document.getElementById('closeEmojiModalBtn');
    const doneEmojiBtn = document.getElementById('doneEmojiBtn');
    const clearEmojisBtn = document.getElementById('clearEmojisBtn');
    const emojiButtons = document.querySelectorAll('.emoji-btn');

    // Open emoji modal
    addEmojiBtn.addEventListener('click', () => {
        emojiModal.classList.remove('hidden');
    });

    // Close emoji modal
    closeEmojiModalBtn.addEventListener('click', () => {
        emojiModal.classList.add('hidden');
        emojiPlacementMode = false;
        selectedEmoji = null;
        renderPhotoStrip();
    });

    doneEmojiBtn.addEventListener('click', () => {
        emojiModal.classList.add('hidden');
        emojiPlacementMode = false;
        selectedEmoji = null;
        renderPhotoStrip();
    });

    emojiModal.addEventListener('click', (e) => {
        if (e.target === emojiModal) {
            emojiModal.classList.add('hidden');
            emojiPlacementMode = false;
            selectedEmoji = null;
            renderPhotoStrip();
        }
    });

    // Emoji selection
    emojiButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            selectedEmoji = btn.dataset.emoji;
            emojiPlacementMode = true;

            // Visual feedback
            emojiButtons.forEach(b => b.classList.remove('bg-primary/20'));
            btn.classList.add('bg-primary/20');

            // Close modal and allow placement
            emojiModal.classList.add('hidden');
            renderPhotoStrip();

            // Show instruction
            const instruction = document.createElement('div');
            instruction.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-full z-50';
            instruction.textContent = 'Click on the photo strip to place emoji. Double-click emoji to remove.';
            document.body.appendChild(instruction);

            setTimeout(() => {
                instruction.remove();
            }, 3000);
        });
    });

    // Clear all emojis
    clearEmojisBtn.addEventListener('click', () => {
        emojis = [];
        selectedEmojiForEdit = null;
        if (window.fabricCanvas) {
            const objects = window.fabricCanvas.getObjects();
            objects.forEach(obj => {
                if (obj.type === 'text') {
                    window.fabricCanvas.remove(obj);
                }
            });
            window.fabricCanvas.renderAll();
        }
    });

    // Helper to hide controls when deselected
    function hideEmojiEditControls() {
        if (window.fabricCanvas) {
            window.fabricCanvas.discardActiveObject();
            window.fabricCanvas.renderAll();
        }
    }

    // Filter modal controls
    const filterModal = document.getElementById('filterModal');
    const editFiltersBtn = document.getElementById('editFiltersBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');

    const modalBrightnessSlider = document.getElementById('modalBrightnessSlider');
    const modalContrastSlider = document.getElementById('modalContrastSlider');
    const modalSaturationSlider = document.getElementById('modalSaturationSlider');

    const modalBrightnessValue = document.getElementById('modalBrightnessValue');
    const modalContrastValue = document.getElementById('modalContrastValue');
    const modalSaturationValue = document.getElementById('modalSaturationValue');

    const filterPresets = document.querySelectorAll('.filter-preset');

    // Open modal
    editFiltersBtn.addEventListener('click', () => {
        filterModal.classList.remove('hidden');

        // Set current values
        modalBrightnessSlider.value = currentFilters.brightness;
        modalContrastSlider.value = currentFilters.contrast;
        modalSaturationSlider.value = currentFilters.saturation;

        modalBrightnessValue.textContent = currentFilters.brightness;
        modalContrastValue.textContent = currentFilters.contrast;
        modalSaturationValue.textContent = currentFilters.saturation;

        // Update preset selection
        filterPresets.forEach(preset => {
            const div = preset.querySelector('div');
            if (preset.dataset.filter === currentFilters.preset) {
                div.classList.add('border-primary');
                div.classList.remove('border-transparent');
            } else {
                div.classList.remove('border-primary');
                div.classList.add('border-transparent');
            }
        });
    });

    // Close modal
    closeModalBtn.addEventListener('click', () => {
        filterModal.classList.add('hidden');
    });

    filterModal.addEventListener('click', (e) => {
        if (e.target === filterModal) {
            filterModal.classList.add('hidden');
        }
    });

    // Keyboard: Escape closes all modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!filterModal.classList.contains('hidden')) {
                filterModal.classList.add('hidden');
            }
            if (!emojiModal.classList.contains('hidden')) {
                emojiModal.classList.add('hidden');
                emojiPlacementMode = false;
                selectedEmoji = null;
                renderPhotoStrip();
            }
            if (selectedEmojiForEdit) {
                selectedEmojiForEdit = null;
                hideEmojiEditControls();
                renderPhotoStrip();
            }
        }
    });

    // Slider updates
    modalBrightnessSlider.addEventListener('input', (e) => {
        modalBrightnessValue.textContent = e.target.value;
    });

    modalContrastSlider.addEventListener('input', (e) => {
        modalContrastValue.textContent = e.target.value;
    });

    modalSaturationSlider.addEventListener('input', (e) => {
        modalSaturationValue.textContent = e.target.value;
    });

    // Preset selection
    filterPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            filterPresets.forEach(p => {
                p.querySelector('div').classList.remove('border-primary');
                p.querySelector('div').classList.add('border-transparent');
            });

            preset.querySelector('div').classList.remove('border-transparent');
            preset.querySelector('div').classList.add('border-primary');
        });
    });

    // Apply filters
    applyFiltersBtn.addEventListener('click', () => {
        currentFilters.brightness = parseInt(modalBrightnessSlider.value);
        currentFilters.contrast = parseInt(modalContrastSlider.value);
        currentFilters.saturation = parseInt(modalSaturationSlider.value);

        // Get selected preset
        const selectedPreset = document.querySelector('.filter-preset div.border-primary');
        if (selectedPreset) {
            currentFilters.preset = selectedPreset.parentElement.dataset.filter;
        }

        applyFiltersToAllPhotos();
        filterModal.classList.add('hidden');
    });

    // Reset filters
    resetFiltersBtn.addEventListener('click', () => {
        currentFilters = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            preset: 'none'
        };

        modalBrightnessSlider.value = 0;
        modalContrastSlider.value = 0;
        modalSaturationSlider.value = 0;

        modalBrightnessValue.textContent = '0';
        modalContrastValue.textContent = '0';
        filterPresets.forEach(p => {
            p.querySelector('div').classList.remove('border-primary');
            p.querySelector('div').classList.add('border-transparent');
        });
        document.querySelector('[data-filter="none"] div').classList.add('border-primary');

        applyFiltersToAllPhotos();
    });

    // Download functionality
    const downloadBtn = document.getElementById('downloadBtn');
    const formatSelect = document.getElementById('formatSelect');
    // Render final canvas helper
    // Render final canvas helper
    function renderFinalCanvas() {
        return new Promise((resolve, reject) => {
            try {
                if (!window.fabricCanvas) {
                    reject(new Error('Canvas not initialized'));
                    return;
                }

                // Deselect any active objects before export
                window.fabricCanvas.discardActiveObject();
                window.fabricCanvas.renderAll();

                // Generate full resolution data URL by ignoring CSS scale limits
                const multiplier = window.fabricCanvas.width / (window.fabricCanvas.getWidth() / window.fabricCanvas.getZoom());

                const dataURL = window.fabricCanvas.toDataURL({
                    format: 'jpeg',
                    quality: 0.95,
                    multiplier: multiplier
                });

                // Create a temporary standard image/canvas from the dataURL to return it in the format the rest of the code expects
                const tempCanvas = document.createElement('canvas');
                const ctx = tempCanvas.getContext('2d');
                const img = new Image();

                img.onload = () => {
                    tempCanvas.width = img.width;
                    tempCanvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    resolve(tempCanvas);
                };

                img.onerror = () => reject(new Error('Failed to render final canvas format'));
                img.src = dataURL;

            } catch (error) {
                reject(error);
            }
        });
    }

    // Download functionality
    downloadBtn.addEventListener('click', async () => {
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<span class="material-symbols-outlined dl-icon text-gray-900 animate-spin">sync</span><span class="truncate">Processing...</span>';

        try {
            const tempCanvas = await renderFinalCanvas();
            const selectedFormat = (formatSelect && formatSelect.value) ? formatSelect.value : 'jpeg';
            const filenameExt = selectedFormat === 'png' ? 'png' : 'jpg';
            const dataURL = selectedFormat === 'png' ? tempCanvas.toDataURL('image/png') : tempCanvas.toDataURL('image/jpeg', 0.95);

            const link = document.createElement('a');
            link.download = `photo-booth-${Date.now()}.${filenameExt}`;
            link.href = dataURL;
            link.click();
        } catch (error) {
            console.error('Download error:', error);
            alert('Error downloading image. Please try again.');
        } finally {
            downloadBtn.innerHTML = originalText;
        }
    });

    // Share functionality
    const shareBtn = document.getElementById('shareBtn');
    if (navigator.canShare || navigator.share) {
        shareBtn.classList.remove('hidden');
        shareBtn.addEventListener('click', async () => {
            const originalText = shareBtn.innerHTML;
            shareBtn.innerHTML = '<span class="material-symbols-outlined text-gray-900 animate-spin">sync</span><span class="truncate">Processing...</span>';

            try {
                const tempCanvas = await renderFinalCanvas();
                const selectedFormat = (formatSelect && formatSelect.value) ? formatSelect.value : 'jpeg';
                const filenameExt = selectedFormat === 'png' ? 'png' : 'jpg';
                const mimeType = selectedFormat === 'png' ? 'image/png' : 'image/jpeg';

                tempCanvas.toBlob(async (blob) => {
                    const file = new File([blob], `photo-booth-${Date.now()}.${filenameExt}`, { type: mimeType });

                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        try {
                            await navigator.share({
                                title: 'My PixBooth Photo',
                                text: 'Check out my awesome photo strip from PixBooth!',
                                files: [file]
                            });
                        } catch (error) {
                            if (error.name !== 'AbortError') {
                                console.error('Share error:', error);
                                alert('Failed to share.');
                            }
                        }
                    } else {
                        alert('Native sharing of files is not supported on this browser/device.');
                    }
                    shareBtn.innerHTML = originalText;
                }, mimeType, 0.95);
            } catch (error) {
                console.error('Share generation error:', error);
                alert('Error generating image for sharing.');
                shareBtn.innerHTML = originalText;
            }
        });
    }

    // Save to Gallery functionality
    const saveGalleryBtn = document.getElementById('saveGalleryBtn');
    if (saveGalleryBtn) {
        saveGalleryBtn.addEventListener('click', async () => {
            const originalText = saveGalleryBtn.innerHTML;
            saveGalleryBtn.innerHTML = '<span class="material-symbols-outlined text-white animate-spin">sync</span><span class="truncate">Saving...</span>';

            try {
                const tempCanvas = await renderFinalCanvas();
                const dataURL = tempCanvas.toDataURL('image/jpeg', 0.95);

                const stripEntry = {
                    id: Date.now(),
                    timestamp: Date.now(),
                    data: dataURL,
                    layout: layoutData ? layoutData.layout : 'unknown'
                };

                await PhotoDB.saveStrip(stripEntry);

                saveGalleryBtn.innerHTML = '<span class="material-symbols-outlined text-white">check_circle</span><span class="truncate">Saved!</span>';
                setTimeout(() => {
                    window.location.href = 'gallery.html';
                }, 1000);

            } catch (error) {
                console.error('Gallery save error:', error);
                alert('Error saving to gallery.');
                saveGalleryBtn.innerHTML = originalText;
            }
        });
    }

} // end initPage

// Boot the page
loadPhotos();
