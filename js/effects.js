        // === Fun Effects Engine ===

        // Effect button selection
        const effectBtns = document.querySelectorAll('.effect-btn');
        effectBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update visual selection
                effectBtns.forEach(b => {
                    b.querySelector('.effect-box').classList.remove('border-primary');
                    b.querySelector('.effect-box').classList.add('border-transparent');
                });
                btn.querySelector('.effect-box').classList.remove('border-transparent');
                btn.querySelector('.effect-box').classList.add('border-primary');

                activeEffect = btn.dataset.effect;

                // Lazy-load face detection only when specs is selected
                if (activeEffect === 'specs' && !faceDetectionReady) {
                    initFaceDetection();
                }

                if (activeEffect === 'none') {
                    effectsCanvas.style.display = 'none';
                    videoElement.style.opacity = '1'; // Show raw video again
                    if (effectAnimId) cancelAnimationFrame(effectAnimId);
                    effectAnimId = null;
                } else {
                    effectsCanvas.style.display = 'block';
                    videoElement.style.opacity = '0'; // Hide raw video, effects canvas takes over
                    glitterParticles = []; // Reset particles on effect change
                    if (!effectAnimId) renderEffectsLoop();
                }
            });
        });

        // Main render loop for effects — runs at ~30fps
        function renderEffectsLoop() {
            if (activeEffect === 'none') {
                effectAnimId = null;
                return;
            }

            // Match canvas resolution to video
            const vw = videoElement.videoWidth || 640;
            const vh = videoElement.videoHeight || 480;
            if (effectsCanvas.width !== vw) effectsCanvas.width = vw;
            if (effectsCanvas.height !== vh) effectsCanvas.height = vh;

            effectsCtx.clearRect(0, 0, vw, vh);

            // Apply the CSS color filter before drawing the base video
            effectsCtx.filter = videoElement.style.filter || 'none';

            switch (activeEffect) {
                case 'glitter': renderGlitter(vw, vh); break;
                case 'mirror': renderMirror(vw, vh); break;
                case 'kaleidoscope': renderKaleidoscope(vw, vh); break;
                case 'vhs': renderVHS(vw, vh); break;
                case 'rgbsplit': renderRGBSplit(vw, vh); break;
                case 'pixelate': renderPixelate(vw, vh); break;
                case 'lightleak': renderLightLeak(vw, vh); break;
                case 'specs': renderSpecs(vw, vh); break;
            }

            effectsCtx.filter = 'none';

            // Use pure rAF for smooth rendering
            effectAnimId = requestAnimationFrame(renderEffectsLoop);
        }

        // === Effect Implementations ===

        // Glitter: sparkle particles floating over the video
        function renderGlitter(w, h) {
            effectsCtx.drawImage(videoElement, 0, 0, w, h);
            effectsCtx.filter = 'none';

            // Spawn new particles
            if (glitterParticles.length < 60) {
                glitterParticles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    size: Math.random() * 4 + 2,
                    opacity: Math.random(),
                    speed: Math.random() * 1.5 + 0.5,
                    hue: Math.random() * 60 + 30 // gold/yellow range
                });
            }

            // Draw & update particles
            glitterParticles.forEach((p, i) => {
                p.y -= p.speed;
                p.opacity = 0.5 + 0.5 * Math.sin(Date.now() * 0.005 + i);
                if (p.y < -10) {
                    p.y = h + 10;
                    p.x = Math.random() * w;
                }

                effectsCtx.save();
                effectsCtx.globalAlpha = p.opacity;
                effectsCtx.fillStyle = `hsl(${p.hue}, 100%, 80%)`;
                effectsCtx.shadowColor = `hsl(${p.hue}, 100%, 70%)`;
                effectsCtx.shadowBlur = 8;

                // Draw a 4-pointed star
                const cx = p.x, cy = p.y, s = p.size;
                effectsCtx.beginPath();
                for (let j = 0; j < 4; j++) {
                    const angle = (j * Math.PI) / 2;
                    effectsCtx.moveTo(cx, cy);
                    effectsCtx.lineTo(cx + Math.cos(angle) * s, cy + Math.sin(angle) * s);
                }
                effectsCtx.stroke();
                effectsCtx.fillRect(cx - 1, cy - 1, 2, 2);
                effectsCtx.restore();
            });
        }

        // Mirror: left half duplicated to right
        function renderMirror(w, h) {
            // Draw left half normally
            effectsCtx.drawImage(videoElement, 0, 0, w / 2, h, 0, 0, w / 2, h);
            // Draw left half flipped to right
            effectsCtx.save();
            effectsCtx.translate(w, 0);
            effectsCtx.scale(-1, 1);
            effectsCtx.drawImage(videoElement, 0, 0, w / 2, h, 0, 0, w / 2, h);
            effectsCtx.restore();
        }

        // Kaleidoscope: 4-way mirrored pattern
        function renderKaleidoscope(w, h) {
            const halfW = w / 2, halfH = h / 2;
            // Top-left: normal
            effectsCtx.drawImage(videoElement, 0, 0, halfW, halfH, 0, 0, halfW, halfH);
            // Top-right: flipped horizontally
            effectsCtx.save();
            effectsCtx.translate(w, 0);
            effectsCtx.scale(-1, 1);
            effectsCtx.drawImage(videoElement, 0, 0, halfW, halfH, 0, 0, halfW, halfH);
            effectsCtx.restore();
            // Bottom-left: flipped vertically
            effectsCtx.save();
            effectsCtx.translate(0, h);
            effectsCtx.scale(1, -1);
            effectsCtx.drawImage(videoElement, 0, 0, halfW, halfH, 0, 0, halfW, halfH);
            effectsCtx.restore();
            // Bottom-right: flipped both
            effectsCtx.save();
            effectsCtx.translate(w, h);
            effectsCtx.scale(-1, -1);
            effectsCtx.drawImage(videoElement, 0, 0, halfW, halfH, 0, 0, halfW, halfH);
            effectsCtx.restore();
        }

        // VHS: scanlines + color offset + noise
        function renderVHS(w, h) {
            // Draw with slight vertical jitter
            const jitter = Math.random() * 4 - 2;
            effectsCtx.drawImage(videoElement, 0, jitter, w, h);
            effectsCtx.filter = 'none';

            // Scanlines
            effectsCtx.fillStyle = 'rgba(0,0,0,0.08)';
            for (let y = 0; y < h; y += 3) {
                effectsCtx.fillRect(0, y, w, 1);
            }

            // Random noise blocks
            for (let i = 0; i < 8; i++) {
                const ny = Math.random() * h;
                const nw = Math.random() * w * 0.3 + 20;
                effectsCtx.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
                effectsCtx.fillRect(Math.random() * w, ny, nw, 2);
            }

            // Color tint overlay
            effectsCtx.globalCompositeOperation = 'overlay';
            effectsCtx.fillStyle = 'rgba(255, 100, 50, 0.08)';
            effectsCtx.fillRect(0, 0, w, h);
            effectsCtx.globalCompositeOperation = 'source-over';
        }

        // RGB Split: offset red and blue channels
        function renderRGBSplit(w, h) {
            const offset = 6;
            // Draw red channel shifted left
            effectsCtx.globalCompositeOperation = 'source-over';
            effectsCtx.drawImage(videoElement, 0, 0, w, h);

            effectsCtx.globalCompositeOperation = 'multiply';
            effectsCtx.fillStyle = 'cyan';
            effectsCtx.fillRect(0, 0, w, h);

            effectsCtx.globalCompositeOperation = 'lighter';
            effectsCtx.filter = videoElement.style.filter || 'none';
            effectsCtx.drawImage(videoElement, offset, 0, w, h);
            effectsCtx.globalCompositeOperation = 'multiply';
            effectsCtx.fillStyle = 'red';
            effectsCtx.fillRect(0, 0, w, h);

            effectsCtx.globalCompositeOperation = 'lighter';
            effectsCtx.filter = videoElement.style.filter || 'none';
            effectsCtx.drawImage(videoElement, -offset, 0, w, h);
            effectsCtx.globalCompositeOperation = 'multiply';
            effectsCtx.fillStyle = 'blue';
            effectsCtx.fillRect(0, 0, w, h);

            effectsCtx.globalCompositeOperation = 'source-over';
            effectsCtx.filter = 'none';
        }

        // Pixelate: mosaic block effect
        function renderPixelate(w, h) {
            const blockSize = 12;
            // Draw small then scale up for pixelation
            const smallW = Math.ceil(w / blockSize);
            const smallH = Math.ceil(h / blockSize);
            effectsCtx.imageSmoothingEnabled = false;
            effectsCtx.drawImage(videoElement, 0, 0, smallW, smallH);
            effectsCtx.drawImage(effectsCanvas, 0, 0, smallW, smallH, 0, 0, w, h);
            effectsCtx.imageSmoothingEnabled = true;
        }

        // Light Leak: warm gradient overlay
        function renderLightLeak(w, h) {
            effectsCtx.drawImage(videoElement, 0, 0, w, h);
            effectsCtx.filter = 'none';

            // Animated gradient position
            const t = Date.now() * 0.001;
            const x1 = w * (0.3 + 0.2 * Math.sin(t * 0.5));
            const y1 = h * (0.2 + 0.2 * Math.cos(t * 0.3));

            const grad = effectsCtx.createRadialGradient(x1, y1, 0, x1, y1, w * 0.7);
            grad.addColorStop(0, 'rgba(255, 180, 80, 0.35)');
            grad.addColorStop(0.4, 'rgba(255, 100, 120, 0.15)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            effectsCtx.globalCompositeOperation = 'screen';
            effectsCtx.fillStyle = grad;
            effectsCtx.fillRect(0, 0, w, h);
            effectsCtx.globalCompositeOperation = 'source-over';
        }
        // === AR Face Detection for Specs ===
        // Lazy-load face-api.js only when specs effect is selected
        let faceApiLoaded = false;
        function loadFaceApiScript() {
            return new Promise((resolve, reject) => {
                if (typeof faceapi !== 'undefined') { resolve(); return; }
                if (faceApiLoaded) { resolve(); return; }
                faceApiLoaded = true;
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        async function initFaceDetection() {
            try {
                await loadFaceApiScript();
                if (typeof faceapi === 'undefined') return;
                const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
                await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
                faceDetectionReady = true;
                console.log('Face detection models loaded!');
            } catch (err) {
                console.warn('Face detection models failed to load:', err);
            }
        }

        // Async face detection loop — runs independently from render loop
        async function faceDetectLoop() {
            if (!faceDetectLoopRunning || activeEffect !== 'specs') {
                faceDetectLoopRunning = false;
                return;
            }
            if (faceDetectionReady && videoElement.readyState >= 2) {
                try {
                    const detection = await faceapi
                        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
                        .withFaceLandmarks(true); // true = use tiny model
                    if (detection) {
                        lastFaceLandmarks = detection.landmarks;
                    }
                } catch (e) { /* silently ignore detection errors */ }
            }
            // Run detection at ~12fps (separate from render)
            setTimeout(faceDetectLoop, 80);
        }

        // Helper: get center of a set of landmark points
        function getLandmarkCenter(points) {
            let sx = 0, sy = 0;
            for (const p of points) { sx += p.x; sy += p.y; }
            return { x: sx / points.length, y: sy / points.length };
        }

        // Helper: smooth interpolation for fluid movement
        function lerp(prev, target, factor) {
            if (!prev) return target;
            return { x: prev.x + (target.x - prev.x) * factor, y: prev.y + (target.y - prev.y) * factor };
        }

        // Specs: AR sunglasses that track face landmarks
        function renderSpecs(w, h) {
            effectsCtx.drawImage(videoElement, 0, 0, w, h);
            effectsCtx.filter = 'none';

            // Start face detection loop if not running
            if (!faceDetectLoopRunning) {
                faceDetectLoopRunning = true;
                faceDetectLoop();
            }

            let leftEyeCenter, rightEyeCenter, eyeDist;

            if (lastFaceLandmarks) {
                // face-api landmark indices: left eye = points 36-41, right eye = 42-47
                const leftEyePts = lastFaceLandmarks.getLeftEye();
                const rightEyePts = lastFaceLandmarks.getRightEye();

                const rawLeft = getLandmarkCenter(leftEyePts);
                const rawRight = getLandmarkCenter(rightEyePts);

                // Smooth positions for fluid movement (lerp factor 0.35)
                smoothedLeftEye = lerp(smoothedLeftEye, rawLeft, 0.35);
                smoothedRightEye = lerp(smoothedRightEye, rawRight, 0.35);

                leftEyeCenter = smoothedLeftEye;
                rightEyeCenter = smoothedRightEye;
                eyeDist = Math.sqrt(Math.pow(rightEyeCenter.x - leftEyeCenter.x, 2) + Math.pow(rightEyeCenter.y - leftEyeCenter.y, 2));
            } else {
                // Fallback: centered position while face loads
                leftEyeCenter = { x: w * 0.4, y: h * 0.38 };
                rightEyeCenter = { x: w * 0.6, y: h * 0.38 };
                eyeDist = w * 0.2;
            }

            // Calculate glasses dimensions from eye distance
            const scale = eyeDist / 130;
            const cx = (leftEyeCenter.x + rightEyeCenter.x) / 2;
            const cy = (leftEyeCenter.y + rightEyeCenter.y) / 2;
            const angle = Math.atan2(rightEyeCenter.y - leftEyeCenter.y, rightEyeCenter.x - leftEyeCenter.x);

            const lensW = 72 * scale;
            const lensH = 55 * scale;
            const gap = 16 * scale;
            const r = 16 * scale;
            const frameW = Math.max(3, 5 * scale);
            const armLen = 85 * scale;

            effectsCtx.save();
            effectsCtx.translate(cx, cy);
            effectsCtx.rotate(angle); // Tilt glasses with head rotation

            effectsCtx.strokeStyle = '#1a1a1a';
            effectsCtx.lineWidth = frameW;
            effectsCtx.lineCap = 'round';
            effectsCtx.lineJoin = 'round';

            // Left lens (centered at -eyeDist/2)
            const lx = -gap / 2 - lensW;
            const ly = -lensH / 2;
            effectsCtx.beginPath();
            effectsCtx.roundRect(lx, ly, lensW, lensH, r);
            effectsCtx.fillStyle = 'rgba(30, 30, 30, 0.5)';
            effectsCtx.fill();
            effectsCtx.stroke();

            // Right lens
            const rx = gap / 2;
            effectsCtx.beginPath();
            effectsCtx.roundRect(rx, ly, lensW, lensH, r);
            effectsCtx.fill();
            effectsCtx.stroke();

            // Bridge
            effectsCtx.beginPath();
            effectsCtx.moveTo(-gap / 2, -4 * scale);
            effectsCtx.quadraticCurveTo(0, -14 * scale, gap / 2, -4 * scale);
            effectsCtx.stroke();

            // Left temple arm
            effectsCtx.beginPath();
            effectsCtx.moveTo(lx, 0);
            effectsCtx.lineTo(lx - armLen, 8 * scale);
            effectsCtx.stroke();

            // Right temple arm
            effectsCtx.beginPath();
            effectsCtx.moveTo(rx + lensW, 0);
            effectsCtx.lineTo(rx + lensW + armLen, 8 * scale);
            effectsCtx.stroke();

            // Lens shine
            effectsCtx.globalAlpha = 0.18;
            effectsCtx.fillStyle = '#ffffff';
            effectsCtx.beginPath();
            effectsCtx.ellipse(lx + lensW * 0.3, ly + lensH * 0.3, 10 * scale, 6 * scale, -0.4, 0, Math.PI * 2);
            effectsCtx.fill();
            effectsCtx.beginPath();
            effectsCtx.ellipse(rx + lensW * 0.3, ly + lensH * 0.3, 10 * scale, 6 * scale, -0.4, 0, Math.PI * 2);
            effectsCtx.fill();

            effectsCtx.restore();
        }

