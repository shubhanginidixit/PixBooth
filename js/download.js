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

        // Create outer strip container with selected color and white border
        const stripContainer = document.createElement('div');
        stripContainer.className = 'bg-white p-4 rounded-2xl shadow-2xl';
        stripContainer.style.maxWidth = '380px';

        // Inner colored background
        const innerContainer = document.createElement('div');
        innerContainer.className = 'p-6 rounded-xl';
        innerContainer.style.backgroundColor = stripColor;

        // Create wrapper for positioning emojis
        const stripWrapper = document.createElement('div');
        stripWrapper.className = 'relative';
        stripWrapper.id = 'stripWrapper';

        if (layoutData.layout === 'strip3' || layoutData.layout === 'strip4') {
            // Vertical strip layout
            stripWrapper.className = 'relative flex flex-col gap-3';
            capturedPhotos.forEach((photo, index) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'relative group ' + getFrameClass();

                const img = document.createElement('img');
                img.src = photo.placeholder;
                img.className = 'w-full aspect-square object-cover rounded-xl object-top';
                img.style.filter = getFilterString();
                img.style.objectPosition = 'center 20%';

                wrapper.appendChild(img);
                wrapper.appendChild(createReorderOverlay(index, capturedPhotos.length, 'vertical'));
                stripWrapper.appendChild(wrapper);
            });

            // Add footer with date and branding
            const footer = document.createElement('div');
            footer.className = 'mt-4 pt-4 border-t-2 border-white/30 flex justify-between items-center text-sm';
            footer.style.color = 'rgba(0,0,0,0.6)';

            const date = new Date();
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            footer.innerHTML = `
                <span class="font-medium">${dateStr}</span>
                <span class="font-bold">PixBooth</span>
            `;
            stripWrapper.appendChild(footer);
        } else if (layoutData.layout === 'grid2x2') {
            // 2x2 Grid layout
            const gridDiv = document.createElement('div');
            gridDiv.className = 'grid grid-cols-2 gap-3 ' + getFrameClass();

            capturedPhotos.forEach((photo, index) => {
                const cell = document.createElement('div');
                cell.className = 'relative group';
                const img = document.createElement('img');
                img.src = photo.placeholder;
                img.className = 'w-full aspect-square object-cover rounded-xl';
                img.style.filter = getFilterString();
                cell.appendChild(img);
                cell.appendChild(createReorderOverlay(index, capturedPhotos.length, 'vertical'));
                gridDiv.appendChild(cell);
            });

            stripWrapper.appendChild(gridDiv);

            // Add footer
            const gridFooter = document.createElement('div');
            gridFooter.className = 'mt-4 pt-4 border-t-2 border-white/30 flex justify-between items-center text-sm';
            gridFooter.style.color = 'rgba(0,0,0,0.6)';
            const gridDate = new Date();
            const gridDateStr = gridDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            gridFooter.innerHTML = `
                <span class="font-medium">${gridDateStr}</span>
                <span class="font-bold">PixBooth</span>
            `;
            stripWrapper.appendChild(gridFooter);
        } else if (layoutData.layout === 'row3') {
            // Horizontal row layout - adjust for horizontal display
            stripContainer.style.maxWidth = '650px';
            const rowDiv = document.createElement('div');
            rowDiv.className = 'flex gap-2 ' + getFrameClass();

            capturedPhotos.forEach((photo, index) => {
                const cell = document.createElement('div');
                cell.className = 'relative group flex-1';
                const img = document.createElement('img');
                img.src = photo.placeholder;
                img.className = 'w-full aspect-square object-cover rounded-xl';
                img.style.filter = getFilterString();
                cell.appendChild(img);
                cell.appendChild(createReorderOverlay(index, capturedPhotos.length, 'horizontal'));
                rowDiv.appendChild(cell);
            });

            stripWrapper.appendChild(rowDiv);

            // Add footer
            const rowFooter = document.createElement('div');
            rowFooter.className = 'mt-4 pt-4 border-t-2 border-white/30 flex justify-between items-center text-sm';
            rowFooter.style.color = 'rgba(0,0,0,0.6)';
            const rowDate = new Date();
            const rowDateStr = rowDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            rowFooter.innerHTML = `
                <span class="font-medium">${rowDateStr}</span>
                <span class="font-bold">PixBooth</span>
            `;
            stripWrapper.appendChild(rowFooter);
        }

        // Attach reorder button handlers
        stripWrapper.querySelectorAll('.reorder-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                swapPhotos(parseInt(btn.dataset.from), parseInt(btn.dataset.to));
            });
        });

        // Add emojis
        emojis.forEach(emoji => {
            const emojiEl = document.createElement('div');
            const size = emoji.size || 48;
            emojiEl.className = 'absolute cursor-move select-none hover:ring-2 hover:ring-primary rounded';
            emojiEl.style.left = emoji.x + 'px';
            emojiEl.style.top = emoji.y + 'px';
            emojiEl.style.fontSize = size + 'px';
            emojiEl.style.transition = 'none';
            emojiEl.style.willChange = 'left, top';
            emojiEl.textContent = emoji.emoji;
            emojiEl.draggable = false;
            emojiEl.dataset.emojiId = emoji.id;

            // Highlight if selected
            if (selectedEmojiForEdit && selectedEmojiForEdit.id === emoji.id) {
                emojiEl.classList.add('ring-2', 'ring-primary');
            }

            // Make emoji draggable with smooth drag events
            let currentDrag = null;

            emojiEl.addEventListener('pointerdown', (e) => {
                const rect = stripWrapper.getBoundingClientRect();
                currentDrag = {
                    emoji: emoji,
                    element: emojiEl,
                    startX: e.clientX,
                    startY: e.clientY,
                    offsetX: e.clientX - rect.left - emoji.x,
                    offsetY: e.clientY - rect.top - emoji.y,
                    moved: false
                };
                emojiEl.style.zIndex = '1000';
                emojiEl.style.cursor = 'grabbing';
                emojiEl.style.touchAction = 'none';
                emojiEl.setPointerCapture(e.pointerId);
                document.body.style.userSelect = 'none';
                e.preventDefault();
                e.stopPropagation();
            });

            const handlePointerMove = (e) => {
                if (currentDrag && currentDrag.emoji.id === emoji.id) {
                    const rect = stripWrapper.getBoundingClientRect();
                    const newX = e.clientX - rect.left - currentDrag.offsetX;
                    const newY = e.clientY - rect.top - currentDrag.offsetY;

                    currentDrag.emoji.x = newX;
                    currentDrag.emoji.y = newY;
                    currentDrag.element.style.left = newX + 'px';
                    currentDrag.element.style.top = newY + 'px';

                    const movedDistance = Math.sqrt(
                        Math.pow(e.clientX - currentDrag.startX, 2) +
                        Math.pow(e.clientY - currentDrag.startY, 2)
                    );
                    if (movedDistance > 5) {
                        currentDrag.moved = true;
                    }
                }
            };

            const handlePointerUp = (e) => {
                if (currentDrag && currentDrag.emoji.id === emoji.id) {
                    currentDrag.element.style.zIndex = 'auto';
                    currentDrag.element.style.cursor = 'move';
                    document.body.style.userSelect = '';

                    // If moved less than 5 pixels, treat as click
                    if (!currentDrag.moved) {
                        selectedEmojiForEdit = emoji;
                        showEmojiEditControls();
                        renderPhotoStrip();
                    }

                    currentDrag = null;
                }
            };

            document.addEventListener('pointermove', handlePointerMove, { passive: true });
            document.addEventListener('pointerup', handlePointerUp);

            // Double click to remove emoji
            emojiEl.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                emojis = emojis.filter(e => e.id !== emoji.id);
                selectedEmojiForEdit = null;
                hideEmojiEditControls();
                renderPhotoStrip();
            });

            stripWrapper.appendChild(emojiEl);
        });

        innerContainer.appendChild(stripWrapper);
        stripContainer.appendChild(innerContainer);
        container.appendChild(stripContainer);

        // Add click handler for emoji placement
        if (emojiPlacementMode && selectedEmoji) {
            stripWrapper.style.cursor = 'crosshair';
            stripWrapper.addEventListener('click', handleEmojiPlacement);
        }

    }

    // Handle emoji placement
    function handleEmojiPlacement(e) {
        if (!selectedEmoji) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left - 20; // Center emoji on click
        const y = e.clientY - rect.top - 20;

        emojis.push({
            id: Date.now() + Math.random(),
            emoji: selectedEmoji,
            x: x,
            y: y,
            size: 48
        });

        renderPhotoStrip();
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

    // Update page title with layout name
    const titleElement = document.querySelector('h1');
    if (titleElement) {
        titleElement.textContent = `Your ${layoutData.name} Photo Strip`;
    }

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
        hideEmojiEditControls();
        renderPhotoStrip();
    });

    // Emoji edit controls
    const emojiEditControls = document.getElementById('emojiEditControls');
    const emojiSizeSlider = document.getElementById('emojiSizeSlider');
    const emojiSizeValue = document.getElementById('emojiSizeValue');
    const changeEmojiBtn = document.getElementById('changeEmojiBtn');
    const deleteEmojiBtn = document.getElementById('deleteEmojiBtn');
    const doneEditingBtn = document.getElementById('doneEditingBtn');

    function showEmojiEditControls() {
        if (selectedEmojiForEdit) {
            emojiEditControls.classList.remove('hidden');
            emojiSizeSlider.value = selectedEmojiForEdit.size || 48;
            emojiSizeValue.textContent = (selectedEmojiForEdit.size || 48) + 'px';
        }
    }

    function hideEmojiEditControls() {
        emojiEditControls.classList.add('hidden');
    }

    // Size slider
    emojiSizeSlider.addEventListener('input', (e) => {
        const newSize = parseInt(e.target.value);
        emojiSizeValue.textContent = newSize + 'px';
        if (selectedEmojiForEdit) {
            selectedEmojiForEdit.size = newSize;
            renderPhotoStrip();
        }
    });

    // Change emoji type
    changeEmojiBtn.addEventListener('click', () => {
        emojiModal.classList.remove('hidden');
        emojiPlacementMode = false;
    });

    // Update emoji selection to change existing emoji if one is selected
    emojiButtons.forEach(btn => {
        const originalHandler = btn.onclick;
        btn.onclick = null;
    });

    emojiButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const newEmoji = btn.dataset.emoji;

            // If editing an existing emoji, change its type
            if (selectedEmojiForEdit) {
                selectedEmojiForEdit.emoji = newEmoji;
                emojiModal.classList.add('hidden');
                renderPhotoStrip();
                return;
            }

            // Otherwise, normal placement mode
            selectedEmoji = newEmoji;
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
            instruction.textContent = 'Click on the photo strip to place emoji. Click emoji to edit.';
            document.body.appendChild(instruction);

            setTimeout(() => {
                instruction.remove();
            }, 3000);
        });
    });

    // Delete emoji
    deleteEmojiBtn.addEventListener('click', () => {
        if (selectedEmojiForEdit) {
            emojis = emojis.filter(e => e.id !== selectedEmojiForEdit.id);
            selectedEmojiForEdit = null;
            hideEmojiEditControls();
            renderPhotoStrip();
        }
    });

    // Done editing
    doneEditingBtn.addEventListener('click', () => {
        selectedEmojiForEdit = null;
        hideEmojiEditControls();
        renderPhotoStrip();
    });

    // Click outside to deselect
    document.addEventListener('click', (e) => {
        if (!emojiEditControls.contains(e.target) &&
            !e.target.closest('[data-emoji-id]') &&
            !e.target.closest('#emojiModal')) {
            selectedEmojiForEdit = null;
            hideEmojiEditControls();
            renderPhotoStrip();
        }
    });

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

        renderPhotoStrip();
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
        modalSaturationValue.textContent = '0';

        filterPresets.forEach(p => {
            p.querySelector('div').classList.remove('border-primary');
            p.querySelector('div').classList.add('border-transparent');
        });
        document.querySelector('[data-filter="none"] div').classList.add('border-primary');
    });

    // Helper function to draw rounded rectangle (polyfill for roundRect)
    function drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    // Download functionality
    const downloadBtn = document.getElementById('downloadBtn');
    const formatSelect = document.getElementById('formatSelect');
    // Render final canvas helper
    function renderFinalCanvas() {
        return new Promise((resolve, reject) => {
            try {
                const stripWrapper = document.getElementById('stripWrapper');
                const tempCanvas = document.createElement('canvas');
                const ctx = tempCanvas.getContext('2d');

                const outerPadding = 32;
                const innerPadding = 48;
                const footerHeight = 60;
                const cornerRadius = 16;

                let innerWidth, innerHeight;

                if (layoutData.layout === 'strip3') {
                    innerWidth = 350;
                    innerHeight = (350 * 3) + 16 + footerHeight;
                } else if (layoutData.layout === 'strip4') {
                    innerWidth = 350;
                    innerHeight = (350 * 4) + 24 + footerHeight;
                } else if (layoutData.layout === 'grid2x2') {
                    innerWidth = 700 + 8;
                    innerHeight = 700 + 8 + footerHeight;
                } else if (layoutData.layout === 'row3') {
                    innerWidth = (350 * 3) + 16;
                    innerHeight = 350 + footerHeight;
                }

                tempCanvas.width = innerWidth + (outerPadding * 2) + (innerPadding * 2);
                tempCanvas.height = innerHeight + (outerPadding * 2) + (innerPadding * 2);

                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

                ctx.fillStyle = stripColor;
                ctx.fillRect(outerPadding, outerPadding, innerWidth + (innerPadding * 2), innerHeight + (innerPadding * 2));

                const images = container.querySelectorAll('img');
                let imagesLoaded = 0;
                const totalImages = images.length;

                if (totalImages === 0) {
                    resolve(tempCanvas);
                    return;
                }

                images.forEach((img, index) => {
                    const tempImg = new Image();
                    tempImg.crossOrigin = 'anonymous';
                    tempImg.src = img.src;

                    tempImg.onload = () => {
                        ctx.filter = getFilterString();

                        const totalPadding = outerPadding + innerPadding;
                        const photoAreaWidth = innerWidth;
                        const photoAreaHeight = innerHeight - footerHeight;

                        if (layoutData.layout === 'strip3' || layoutData.layout === 'strip4') {
                            const gap = 12;
                            const photoSize = (photoAreaHeight - (gap * (totalImages - 1))) / totalImages;
                            const x = totalPadding;
                            const y = totalPadding + ((photoSize + gap) * index);
                            const w = photoAreaWidth;
                            const h = photoSize;

                            ctx.save();
                            drawRoundedRect(ctx, x, y, w, h, cornerRadius);
                            ctx.clip();
                            ctx.drawImage(tempImg, x, y, w, h);
                            ctx.restore();
                        } else if (layoutData.layout === 'grid2x2') {
                            const col = index % 2;
                            const row = Math.floor(index / 2);
                            const gap = 12;
                            const x = totalPadding + (col * (photoAreaWidth / 2)) + (col * gap);
                            const y = totalPadding + (row * (photoAreaHeight / 2)) + (row * gap);
                            const w = (photoAreaWidth / 2) - gap;
                            const h = (photoAreaHeight / 2) - gap;

                            ctx.save();
                            drawRoundedRect(ctx, x, y, w, h, cornerRadius);
                            ctx.clip();
                            ctx.drawImage(tempImg, x, y, w, h);
                            ctx.restore();
                        } else if (layoutData.layout === 'row3') {
                            const photoWidth = photoAreaWidth / totalImages;
                            const gap = 12;
                            const x = totalPadding + (photoWidth * index) + (gap * index);
                            const y = totalPadding;
                            const w = photoWidth - gap;
                            const h = photoAreaHeight;

                            ctx.save();
                            drawRoundedRect(ctx, x, y, w, h, cornerRadius);
                            ctx.clip();
                            ctx.drawImage(tempImg, x, y, w, h);
                            ctx.restore();
                        }

                        imagesLoaded++;

                        if (imagesLoaded === totalImages) {
                            ctx.filter = 'none';

                            const stripRect = stripWrapper.getBoundingClientRect();
                            const scaleX = photoAreaWidth / (stripRect.width || innerWidth);
                            const scaleY = photoAreaHeight / ((stripRect.height || innerHeight) - footerHeight);

                            emojis.forEach(emoji => {
                                const emojiSize = (emoji.size || 48) * Math.min(scaleX, scaleY);
                                ctx.font = `${emojiSize}px Arial`;
                                ctx.fillText(emoji.emoji, totalPadding + (emoji.x * scaleX), totalPadding + (emoji.y * scaleY) + (emojiSize * 0.8));
                            });

                            const footerY = totalPadding + photoAreaHeight + 20;

                            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.moveTo(totalPadding, footerY - 10);
                            ctx.lineTo(totalPadding + photoAreaWidth, footerY - 10);
                            ctx.stroke();

                            const date = new Date();
                            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                            ctx.font = '18px Inter, sans-serif';
                            ctx.textAlign = 'left';
                            ctx.fillText(dateStr, totalPadding, footerY + 15);

                            ctx.font = 'bold 18px Inter, sans-serif';
                            ctx.textAlign = 'right';
                            ctx.fillText('PixBooth', totalPadding + photoAreaWidth, footerY + 15);

                            ctx.textAlign = 'left';
                            resolve(tempCanvas);
                        }
                    };
                    tempImg.onerror = () => reject(new Error('Failed to load image'));
                });
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
