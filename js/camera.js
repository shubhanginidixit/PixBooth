        // Get selected layout from localStorage
        const layoutData = JSON.parse(localStorage.getItem('selectedLayout'));

        if (!layoutData) {
            window.location.href = 'index.html';
            throw new Error('No layout selected — redirecting.');
        }

        const totalPhotos = layoutData.rows * layoutData.cols;
        let capturedPhotos = [];

        // Camera and filter elements
        const videoElement = document.getElementById('videoElement');
        const captureCanvas = document.getElementById('captureCanvas');
        const countdownOverlay = document.getElementById('countdownOverlay');
        const countdownNumber = document.getElementById('countdownNumber');
        const progressText = document.getElementById('progressText');
        const captureBtn = document.getElementById('captureBtn');
        const uploadInput = document.getElementById('uploadInput');
        const finishBtn = document.getElementById('finishBtn');
        const flashOverlay = document.getElementById('flashOverlay');

        // Filter controls
        const brightnessSlider = document.getElementById('brightnessSlider');
        const contrastSlider = document.getElementById('contrastSlider');
        const saturationSlider = document.getElementById('saturationSlider');
        const intensitySlider = document.getElementById('intensitySlider');
        const resetBtn = document.getElementById('resetBtn');
        const filterPresets = document.querySelectorAll('[data-filter]');
        // Effects engine variables (declared early for use in reset handler)
        const effectsCanvas = document.getElementById('effectsCanvas');
        const effectsCtx = effectsCanvas.getContext('2d');
        let activeEffect = 'none';
        let effectAnimId = null;
        let glitterParticles = [];
        // Face detection state for AR specs
        let faceDetectionReady = false;
        let lastFaceLandmarks = null; // Stores latest detected face landmarks
        let faceDetectLoopRunning = false;
        // Smoothed positions for fluid glasses movement
        let smoothedLeftEye = null;
        let smoothedRightEye = null;



        // Filter values
        let filters = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            intensity: 100,
            preset: 'none',
            bw: false,
            invert: false
        };

        // Initialize camera
        let stream = null;
        async function initCamera() {
            const constraints = [
                { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } },
                { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } },
                { video: { facingMode: 'user' } },
                { video: true }
            ];
            for (const constraint of constraints) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraint);
                    videoElement.srcObject = stream;
                    return;
                } catch (error) {
                    console.warn('getUserMedia failed with constraint:', constraint, error);
                    if (error.name === 'NotAllowedError' || error.name === 'NotFoundError') {
                        break; // No point retrying with different constraints
                    }
                    // OverconstrainedError or other — try next fallback
                }
            }
            alert('Unable to access camera. Please grant camera permissions and ensure your device has a camera.');
        }

        // Apply filters to video
        function applyFilters() {
            let filterString = '';
            const intensity = filters.intensity / 100;

            switch (filters.preset) {
                case 'vintage':
                    filterString += `sepia(${0.35 * intensity}) contrast(${1 + 0.1 * intensity}) brightness(${1 + 0.05 * intensity}) saturate(${1 + 0.15 * intensity}) `;
                    break;
                case 'golden':
                    filterString += `brightness(${1 + 0.12 * intensity}) saturate(${1 + 0.3 * intensity}) sepia(${0.2 * intensity}) hue-rotate(${-10 * intensity}deg) `;
                    break;
                case 'film':
                    filterString += `contrast(${1 + 0.15 * intensity}) brightness(${1 - 0.05 * intensity}) saturate(${1 - 0.15 * intensity}) sepia(${0.15 * intensity}) `;
                    break;
                case 'dreamy':
                    filterString += `brightness(${1 + 0.15 * intensity}) contrast(${1 - 0.1 * intensity}) saturate(${1 + 0.1 * intensity}) `;
                    break;
                case 'noir':
                    filterString += `grayscale(${1 * intensity}) contrast(${1 + 0.25 * intensity}) brightness(${1 - 0.05 * intensity}) `;
                    break;
                case 'cyberpunk':
                    filterString += `contrast(${1 + 0.2 * intensity}) saturate(${1 + 0.5 * intensity}) hue-rotate(${270 * intensity}deg) brightness(${1 + 0.05 * intensity}) `;
                    break;
                case 'arctic':
                    filterString += `brightness(${1 + 0.1 * intensity}) saturate(${1 - 0.2 * intensity}) hue-rotate(${190 * intensity}deg) contrast(${1 + 0.05 * intensity}) `;
                    break;
                case 'fade':
                    filterString += `contrast(${1 - 0.15 * intensity}) brightness(${1 + 0.15 * intensity}) saturate(${1 - 0.3 * intensity}) sepia(${0.1 * intensity}) `;
                    break;
                case 'vibrant':
                    filterString += `saturate(${1 + 0.6 * intensity}) contrast(${1 + 0.15 * intensity}) brightness(${1 + 0.05 * intensity}) `;
                    break;
            }

            const brightness = 1 + (filters.brightness / 100);
            const contrast = 1 + (filters.contrast / 100);
            const saturation = 1 + (filters.saturation / 100);

            filterString += `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;

            if (filters.bw) filterString += ' grayscale(1)';
            if (filters.invert) filterString += ' invert(1)';

            videoElement.style.filter = filterString;
        }

        // Filter slider listeners
        brightnessSlider.addEventListener('input', (e) => {
            filters.brightness = parseInt(e.target.value);
            document.getElementById('brightnessValue').textContent = filters.brightness;
            applyFilters();
        });

        contrastSlider.addEventListener('input', (e) => {
            filters.contrast = parseInt(e.target.value);
            document.getElementById('contrastValue').textContent = filters.contrast;
            applyFilters();
        });

        saturationSlider.addEventListener('input', (e) => {
            filters.saturation = parseInt(e.target.value);
            document.getElementById('saturationValue').textContent = filters.saturation;
            applyFilters();
        });

        intensitySlider.addEventListener('input', (e) => {
            filters.intensity = parseInt(e.target.value);
            document.getElementById('intensityValue').textContent = filters.intensity + '%';
            applyFilters();
        });

        // Filter preset selection
        filterPresets.forEach(preset => {
            preset.addEventListener('click', () => {
                filterPresets.forEach(p => {
                    p.querySelector('div').classList.remove('border-primary');
                    p.querySelector('div').classList.add('border-transparent');
                });

                preset.querySelector('div').classList.remove('border-transparent');
                preset.querySelector('div').classList.add('border-primary');

                filters.preset = preset.dataset.filter;
                applyFilters();
            });
        });

        // Reset all filters
        resetBtn.addEventListener('click', () => {
            filters = {
                brightness: 0,
                contrast: 0,
                saturation: 0,
                intensity: 100,
                preset: 'none',
                bw: false,
                invert: false
            };

            brightnessSlider.value = 0;
            contrastSlider.value = 0;
            saturationSlider.value = 0;
            intensitySlider.value = 100;

            document.getElementById('brightnessValue').textContent = '0';
            document.getElementById('contrastValue').textContent = '0';
            document.getElementById('saturationValue').textContent = '0';
            document.getElementById('intensityValue').textContent = '100%';

            filterPresets.forEach(p => {
                p.querySelector('div').classList.remove('border-primary');
                p.querySelector('div').classList.add('border-transparent');
            });
            document.querySelector('[data-filter="none"] div').classList.add('border-primary');

            updateToggleVisual(document.getElementById('bwToggle'), false);
            updateToggleVisual(document.getElementById('invertToggle'), false);

            // Also reset fun effects
            activeEffect = 'none';
            effectsCanvas.style.display = 'none';
            videoElement.style.opacity = '1'; // Restore raw video visibility
            if (effectAnimId) { cancelAnimationFrame(effectAnimId); effectAnimId = null; }
            faceDetectLoopRunning = false;
            lastFaceLandmarks = null;
            smoothedLeftEye = null;
            smoothedRightEye = null;
            document.querySelectorAll('.effect-btn').forEach(b => {
                b.querySelector('.effect-box').classList.remove('border-primary');
                b.querySelector('.effect-box').classList.add('border-transparent');
            });
            document.querySelector('[data-effect="none"] .effect-box').classList.add('border-primary');

            applyFilters();
        });

        // === Camera Switch ===
        let facingMode = 'user';
        const cameraSwitchBtn = document.getElementById('cameraSwitchBtn');
        const cameraLabel = document.getElementById('cameraLabel');

        if (cameraSwitchBtn) {
            cameraSwitchBtn.addEventListener('click', async () => {
                facingMode = facingMode === 'user' ? 'environment' : 'user';
                cameraLabel.textContent = facingMode === 'user' ? 'Front Camera' : 'Back Camera';

                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }

                const switchConstraints = [
                    { video: { facingMode: { exact: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } } },
                    { video: { facingMode: { exact: facingMode }, width: { ideal: 640 }, height: { ideal: 480 } } },
                    { video: { facingMode: { exact: facingMode } } }
                ];
                let switched = false;
                for (const constraint of switchConstraints) {
                    try {
                        stream = await navigator.mediaDevices.getUserMedia(constraint);
                        videoElement.srcObject = stream;
                        switched = true;
                        break;
                    } catch (error) {
                        console.warn('Camera switch failed with constraint:', constraint, error);
                    }
                }
                if (!switched) {
                    facingMode = facingMode === 'user' ? 'environment' : 'user';
                    cameraLabel.textContent = facingMode === 'user' ? 'Front Camera' : 'Back Camera';
                    alert('Could not switch camera. This device may only have one camera.');
                }
            });
        }

        // === Toggle Filters Panel ===
        const toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
        const filterPanel = document.getElementById('filterPanel');
        const filterBackdrop = document.getElementById('filterBackdrop');

        function openFilterPanel() {
            filterPanel.classList.remove('hidden');
            filterPanel.classList.add('flex');
            if (filterBackdrop && window.innerWidth < 1024) {
                filterBackdrop.classList.remove('hidden');
            }
        }
        function closeFilterPanel() {
            if (window.innerWidth < 1024) {
                filterPanel.classList.add('hidden');
                filterPanel.classList.remove('flex');
            }
            if (filterBackdrop) filterBackdrop.classList.add('hidden');
        }

        if (toggleFiltersBtn && filterPanel) {
            toggleFiltersBtn.addEventListener('click', () => {
                if (filterPanel.classList.contains('hidden')) {
                    openFilterPanel();
                } else {
                    closeFilterPanel();
                }
            });
        }
        if (filterBackdrop) {
            filterBackdrop.addEventListener('click', closeFilterPanel);
        }
        const closeFilterPanelBtn = document.getElementById('closeFilterPanelBtn');
        if (closeFilterPanelBtn) {
            closeFilterPanelBtn.addEventListener('click', closeFilterPanel);
        }

        // === Random Filter Button ===
        const randomBtn = document.getElementById('randomBtn');
        if (randomBtn) {
            randomBtn.addEventListener('click', () => {
                const randomBrightness = Math.floor(Math.random() * 201) - 100;
                const randomContrast = Math.floor(Math.random() * 201) - 100;
                const randomSaturation = Math.floor(Math.random() * 201) - 100;

                const presetNames = ['none', 'vintage', 'golden', 'film', 'dreamy', 'noir', 'cyberpunk', 'arctic', 'fade', 'vibrant'];
                const randomPreset = presetNames[Math.floor(Math.random() * presetNames.length)];

                filters.brightness = randomBrightness;
                filters.contrast = randomContrast;
                filters.saturation = randomSaturation;
                filters.preset = randomPreset;

                brightnessSlider.value = randomBrightness;
                contrastSlider.value = randomContrast;
                saturationSlider.value = randomSaturation;

                document.getElementById('brightnessValue').textContent = randomBrightness;
                document.getElementById('contrastValue').textContent = randomContrast;
                document.getElementById('saturationValue').textContent = randomSaturation;

                filterPresets.forEach(p => {
                    p.querySelector('div').classList.remove('border-primary');
                    p.querySelector('div').classList.add('border-transparent');
                });
                const matchedPreset = document.querySelector(`[data-filter="${randomPreset}"] div`);
                if (matchedPreset) {
                    matchedPreset.classList.remove('border-transparent');
                    matchedPreset.classList.add('border-primary');
                }

                applyFilters();
            });
        }

        // === B&W and Invert Toggles ===
        function updateToggleVisual(btn, isOn) {
            if (!btn) return;
            btn.setAttribute('aria-checked', isOn ? 'true' : 'false');
            const knob = btn.querySelector('span');
            if (isOn) {
                btn.classList.remove('bg-gray-300');
                btn.classList.add('bg-primary');
                knob.classList.remove('translate-x-0');
                knob.classList.add('translate-x-5');
            } else {
                btn.classList.remove('bg-primary');
                btn.classList.add('bg-gray-300');
                knob.classList.remove('translate-x-5');
                knob.classList.add('translate-x-0');
            }
        }

        const bwToggle = document.getElementById('bwToggle');
        const invertToggle = document.getElementById('invertToggle');

        if (bwToggle) {
            bwToggle.addEventListener('click', () => {
                filters.bw = !filters.bw;
                updateToggleVisual(bwToggle, filters.bw);
                applyFilters();
            });
        }

        if (invertToggle) {
            invertToggle.addEventListener('click', () => {
                filters.invert = !filters.invert;
                updateToggleVisual(invertToggle, filters.invert);
                applyFilters();
            });
        }

        // Update progress text
        progressText.textContent = `Capturing: 0/${totalPhotos} photos`;

        // Generate thumbnail slots
        const thumbnailGrid = document.getElementById('thumbnailGrid');
        thumbnailGrid.className = `grid flex-1 grid-cols-${Math.min(totalPhotos, 4)} gap-2 sm:gap-3`;

        function renderThumbnails() {
            thumbnailGrid.innerHTML = '';
            for (let i = 0; i < totalPhotos; i++) {
                const slot = document.createElement('div');
                slot.id = `photo-slot-${i}`;

                if (i < capturedPhotos.length) {
                    slot.className = 'relative aspect-video overflow-hidden rounded-xl border-2 border-primary shadow-lg group';
                    slot.innerHTML = `
                        <img src="${capturedPhotos[i].placeholder}" class="h-full w-full object-cover" />
                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                            <button class="retake-btn p-1 rounded-full bg-white/90 hover:bg-white text-gray-800 transition-all hover:scale-110" data-index="${i}" title="Retake this photo">
                                <span class="material-symbols-outlined" style="font-size:16px;">refresh</span>
                            </button>
                            <button class="delete-btn p-1 rounded-full bg-red-400/90 hover:bg-red-500 text-white transition-all hover:scale-110" data-index="${i}" title="Delete this photo">
                                <span class="material-symbols-outlined" style="font-size:16px;">close</span>
                            </button>
                        </div>`;
                } else {
                    slot.className = 'ghost-slot relative flex aspect-video items-center justify-center rounded-xl border-2 border-dashed border-white/40 bg-white/10';
                    slot.innerHTML = '<span class="material-symbols-outlined text-3xl text-white/30">add_a_photo</span>';
                }
                thumbnailGrid.appendChild(slot);
            }

            // Retake handlers
            thumbnailGrid.querySelectorAll('.retake-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.index);
                    capturedPhotos.splice(idx, 1);
                    capturedPhotos.forEach((p, i) => p.id = i);
                    PhotoDB.saveAllPhotos(capturedPhotos).catch(err => console.warn('Retake save failed:', err));
                    renderThumbnails();
                });
            });

            // Delete handlers
            thumbnailGrid.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.index);
                    capturedPhotos.splice(idx, 1);
                    capturedPhotos.forEach((p, i) => p.id = i);
                    PhotoDB.saveAllPhotos(capturedPhotos).catch(err => console.warn('Delete save failed:', err));
                    renderThumbnails();
                });
            });

            // Update progress + finish button
            const filled = capturedPhotos.length;
            progressText.textContent = `Capturing: ${filled}/${totalPhotos} photos`;
            if (filled === totalPhotos) {
                finishBtn.disabled = false;
                finishBtn.classList.add('bg-primary/30');
            } else {
                finishBtn.disabled = true;
                finishBtn.classList.remove('bg-primary/30');
            }
        }

        renderThumbnails();

        // Flash effect helper
        function triggerFlash() {
            flashOverlay.classList.remove('hidden');
            flashOverlay.style.opacity = '0';
            flashOverlay.classList.add('flash-overlay');
            setTimeout(() => {
                flashOverlay.classList.remove('flash-overlay');
                flashOverlay.classList.add('hidden');
            }, 400);
        }

        // Countdown function
        function startCountdown(callback) {
            let count = 3;
            countdownOverlay.classList.remove('hidden');
            countdownOverlay.classList.add('flex');

            const interval = setInterval(() => {
                countdownNumber.textContent = count;
                // Re-trigger animation
                countdownNumber.classList.remove('countdown-animate');
                void countdownNumber.offsetWidth; // Force reflow
                countdownNumber.classList.add('countdown-animate');
                count--;

                if (count < 0) {
                    clearInterval(interval);
                    countdownOverlay.classList.add('hidden');
                    countdownOverlay.classList.remove('flex');
                    callback();
                }
            }, 1000);
        }

        // Capture photo from video
        function capturePhoto() {
            captureCanvas.width = videoElement.videoWidth;
            captureCanvas.height = videoElement.videoHeight;

            const ctx = captureCanvas.getContext('2d');
            ctx.filter = videoElement.style.filter;

            // If an effect is active, draw from the effects canvas
            if (activeEffect !== 'none' && effectsCanvas.style.display !== 'none') {
                ctx.drawImage(effectsCanvas, 0, 0, captureCanvas.width, captureCanvas.height);
            } else {
                ctx.drawImage(videoElement, 0, 0);
            }

            return captureCanvas.toDataURL('image/jpeg', 0.9);
        }

        // Capture button functionality
        captureBtn.addEventListener('click', () => {
            if (capturedPhotos.length < totalPhotos) {
                startCountdown(() => {
                    // Trigger flash effect
                    triggerFlash();

                    const photoData = {
                        id: capturedPhotos.length,
                        timestamp: Date.now(),
                        placeholder: capturePhoto(),
                        filters: { ...filters }
                    };

                    capturedPhotos.push(photoData);

                    // Save to IndexedDB incrementally (crash resilience)
                    PhotoDB.savePhoto(photoData).catch(err => console.warn('Auto-save failed:', err));

                    renderThumbnails();
                });
            }
        });

        // Upload image handler
        uploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && capturedPhotos.length < totalPhotos) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        captureCanvas.width = img.width;
                        captureCanvas.height = img.height;
                        const ctx = captureCanvas.getContext('2d');
                        ctx.filter = videoElement.style.filter;
                        ctx.drawImage(img, 0, 0);

                        const photoData = {
                            id: capturedPhotos.length,
                            timestamp: Date.now(),
                            placeholder: captureCanvas.toDataURL('image/jpeg', 0.9),
                            filters: { ...filters }
                        };

                        capturedPhotos.push(photoData);

                        // Save to IndexedDB incrementally
                        PhotoDB.savePhoto(photoData).catch(err => console.warn('Auto-save failed:', err));

                        renderThumbnails();

                        uploadInput.value = '';
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        // Finish button functionality
        finishBtn.addEventListener('click', async () => {
            if (capturedPhotos.length === totalPhotos) {
                try {
                    await PhotoDB.saveAllPhotos(capturedPhotos);
                } catch (err) {
                    console.error('Failed to save photos to IndexedDB:', err);
                }

                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }

                window.location.href = 'download.html';
            }
        });

        // Initialize camera on page load
        initCamera();
