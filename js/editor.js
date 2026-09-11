(function() {
    'use strict';

    // Loading Animation
    const appLoader = document.getElementById('appLoader');
    window.addEventListener('load', () => {
        setTimeout(() => {
            appLoader.classList.add('hidden');
        }, 1000);
    });

    // PWA Install Prompt
    let deferredPrompt;
    const installPrompt = document.getElementById('installPrompt');
    const installButton = document.getElementById('installButton');
    const installLater = document.getElementById('installLater');
    const installClose = document.getElementById('installClose');

    // Capture the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Don't show if already dismissed
        if (!localStorage.getItem('installPromptDismissed')) {
            setTimeout(() => {
                installPrompt.classList.add('show');
            }, 3000); // Show after 3 seconds
        }
    });

    // Install button click
    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Install prompt outcome: ${outcome}`);
        
        deferredPrompt = null;
        installPrompt.classList.remove('show');
    });

    // Later button click
    installLater.addEventListener('click', () => {
        installPrompt.classList.remove('show');
        localStorage.setItem('installPromptDismissed', 'true');
        // Clear after 7 days
        setTimeout(() => {
            localStorage.removeItem('installPromptDismissed');
        }, 7 * 24 * 60 * 60 * 1000);
    });

    // Close button click
    installClose.addEventListener('click', () => {
        installPrompt.classList.remove('show');
        localStorage.setItem('installPromptDismissed', 'true');
    });

    // Windows Desktop App Integration
    if (window.electronAPI && window.electronAPI.isElectron) {
        if (installPrompt) {
            installPrompt.style.display = 'none';
        }
        document.querySelectorAll('.status-pill').forEach(pill => {
            pill.title = 'Parichiti Studios Windows Desktop App (100% Offline)';
            const textSpan = pill.querySelector('span:last-child');
            if (textSpan) textSpan.textContent = 'Windows App • 100% Offline';
        });

        if (window.electronAPI.onMenuAction) {
            window.electronAPI.onMenuAction((action) => {
                if (action === 'open-file') {
                    if (window.electronAPI.openFileDialog) {
                        window.electronAPI.openFileDialog().then(fileInfo => {
                            if (fileInfo && fileInfo.dataUrl) {
                                loadImageFromDataUrl(fileInfo.dataUrl);
                            }
                        });
                    } else if (photoUpload) {
                        photoUpload.click();
                    }
                } else if (action === 'save-file') {
                    const downloadSingle = document.getElementById('downloadSingle');
                    const downloadJPG = document.getElementById('downloadJPG');
                    if (downloadSingle && downloadSingle.offsetParent !== null) {
                        downloadSingle.click();
                    } else if (downloadJPG && downloadJPG.offsetParent !== null) {
                        downloadJPG.click();
                    } else {
                        alert('Please upload and process a photo first!');
                    }
                } else if (action === 'print-sheet') {
                    window.location.href = 'print.html';
                } else if (action === 'export-pdf') {
                    const downloadPDF = document.getElementById('downloadPDF');
                    if (downloadPDF) downloadPDF.click();
                }
            });
        }
    }

    // Constants
    const A4_WIDTH = 2480;
    const A4_HEIGHT = 3508;
    const DPI = 300;
    const MM_TO_INCH = 25.4;

    // Standard Photo Size Presets for India (dimensions in mm)
    const PHOTO_PRESETS = {
        '35x45': { width: 35, height: 45, label: 'Indian Passport / Govt Exam (35×45 mm / 1.38×1.77 in)' },
        '25x35': { width: 25, height: 35, label: 'PAN Card - NSDL / UTIITSL (25×35 mm / 0.98×1.38 in)' },
        '30.5x38': { width: 30.5, height: 38, label: 'Classic Studio Stamp (30.5×38 mm / 1.2×1.5 in)' },
        '25x30': { width: 25, height: 30, label: 'Stamp Size - Standard (25×30 mm / 0.98×1.18 in)' },
        '20x25': { width: 20, height: 25, label: 'Stamp Size - Mini (20×25 mm / 0.79×0.98 in)' },
        '51x51': { width: 51, height: 51, label: 'USA Visa / OCI (51×51 mm / 2×2 in)' },
        '101.6x152.4': { width: 101.6, height: 152.4, label: 'NEET Postcard / 4R (102×152 mm / 4×6 in)' }
    };

    // State
    let originalImage = null;
    let cropper = null;
    let croppedCanvas = null;
    let rawCroppedCanvas = null;
    let editorBgTolerance = 35;
    let PHOTO_WIDTH = Math.round((35 / MM_TO_INCH) * DPI);
    let PHOTO_HEIGHT = Math.round((45 / MM_TO_INCH) * DPI);
    let adjustments = {
        brightness: 0,
        contrast: 100,
        saturation: 100,
        exposure: 0,
        sharpness: 0,
        blur: 0
    };
    let backgroundColor = '#ffffff';
    let borderSettings = {
        enabled: true,
        width: 3,
        color: '#000000'
    };
    let cutLineSettings = {
        enabled: true,
        style: 'dashed',
        color: '#333333'
    };

    // DOM Elements
    const photoUpload = document.getElementById('photoUpload');
    
    const uploadZone = document.getElementById('uploadZone');
    const cropArea = document.getElementById('cropArea');
    const cropImage = document.getElementById('cropImage');
    const previewArea = document.getElementById('previewArea');
    const previewCanvas = document.getElementById('previewCanvas');
    const a4Area = document.getElementById('a4Area');
    const a4Canvas = document.getElementById('a4Canvas');
    
    const cropToolsCard = document.getElementById('cropToolsCard');
    const adjustmentsCard = document.getElementById('adjustmentsCard');
    const bgColorCard = document.getElementById('bgColorCard');
    const editorBgColorPicker = document.getElementById('editorBgColorPicker');
    const editorBgHexDisplay = document.getElementById('editorBgHexDisplay');
    const sizeSelectionCard = document.getElementById('sizeSelectionCard');
    const editorPhotoSize = document.getElementById('editorPhotoSize');
    const editorPhotoSpacingSelect = document.getElementById('editorPhotoSpacingSelect');
    const customSizeInputs = document.getElementById('customSizeInputs');
    const customWidth = document.getElementById('customWidth');
    const customHeight = document.getElementById('customHeight');
    const cropAspectButtons = document.querySelectorAll('#cropAspectButtons .aspect-btn');
    
    const borderCard = document.getElementById('borderCard');
    const enableBorder = document.getElementById('enableBorder');
    const borderWidthSlider = document.getElementById('borderWidthSlider');
    const borderWidthValue = document.getElementById('borderWidthValue');
    const borderColorPicker = document.getElementById('borderColorPicker');
    const borderControls = document.getElementById('borderControls');
    
    const cutLinesCard = document.getElementById('cutLinesCard');
    const enableCutLines = document.getElementById('enableCutLines');
    const cutLineStyleSelect = document.getElementById('cutLineStyleSelect');
    const cutLineColorPicker = document.getElementById('cutLineColorPicker');
    const cutLinesControls = document.getElementById('cutLinesControls');
    
    // Background Remover Elements
    const editorAutoRemoveBgBtn = document.getElementById('editorAutoRemoveBgBtn');
    const editorResetBgBtn = document.getElementById('editorResetBgBtn');
    const editorBgToleranceBox = document.getElementById('editorBgToleranceBox');
    const editorBgToleranceSlider = document.getElementById('editorBgToleranceSlider');
    const editorBgToleranceVal = document.getElementById('editorBgToleranceVal');
    
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.querySelector('.theme-icon');

    // Dark Mode
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeIcon.textContent = '☀️';
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        themeIcon.textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    // Helper Functions
    function mmToPixels(mm) {
        return Math.round((mm / MM_TO_INCH) * DPI);
    }

    function showSection(section) {
        uploadZone.style.display = 'none';
        cropArea.style.display = 'none';
        previewArea.style.display = 'none';
        a4Area.style.display = 'none';
        
        section.style.display = 'block';
    }

    function showCard(card) {
        card.style.display = 'block';
    }

    function hideCard(card) {
        card.style.display = 'none';
    }

    // Photo Upload
    photoUpload.addEventListener('change', handleFileUpload);
    
    uploadZone.addEventListener('click', () => {
        photoUpload.click();
    });

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--accent-color)';
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = 'var(--border-color)';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--border-color)';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            loadImage(file);
        }
    });

    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (file) {
            loadImage(file);
        }
    }

    function loadImage(file) {
        if (!file) return;

        const isImageMime = file.type && file.type.startsWith('image/');
        const isImageExt = /\.(jpe?g|png|webp|bmp|gif|avif|tiff?)$/i.test(file.name || '');
        if (!isImageMime && !isImageExt) {
            alert('Please select a valid image file (JPG, PNG, WebP).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage = new Image();
            originalImage.onload = () => {
                initCropper();
                if (photoUpload) photoUpload.value = '';
            };
            originalImage.onerror = () => {
                alert('Could not decode the selected image file. Please try another.');
            };
            originalImage.src = e.target.result;
        };
        reader.onerror = () => {
            alert('Could not read the selected image file.');
        };
        reader.readAsDataURL(file);
    }

    function loadImageFromDataUrl(dataUrl) {
        originalImage = new Image();
        originalImage.onload = () => {
            initCropper();
            if (photoUpload) photoUpload.value = '';
        };
        originalImage.onerror = () => {
            alert('Could not decode the selected image file. Please try another.');
        };
        originalImage.src = dataUrl;
    }

    // Cropper Initialization
    function initCropper() {
        showSection(cropArea);
        showCard(cropToolsCard);
        
        cropImage.src = originalImage.src;
        
        if (cropper) {
            cropper.destroy();
        }
        
        const aspectRatio = PHOTO_WIDTH / PHOTO_HEIGHT;
        
        cropper = new Cropper(cropImage, {
            aspectRatio: aspectRatio,
            viewMode: 1,
            autoCropArea: 1,
            responsive: true,
            restore: false,
            guides: true,
            center: true,
            highlight: true,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
        });
    }

    // Crop Aspect Ratio Buttons
    if (cropAspectButtons) {
        cropAspectButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                cropAspectButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const ratioStr = btn.dataset.ratio;
                const ratio = ratioStr === 'NaN' || ratioStr === 'free' ? NaN : parseFloat(ratioStr);
                
                if (cropper) {
                    cropper.setAspectRatio(ratio);
                }
                
                const w = parseFloat(btn.dataset.w);
                const h = parseFloat(btn.dataset.h);
                if (w && h) {
                    PHOTO_WIDTH = mmToPixels(w);
                    PHOTO_HEIGHT = mmToPixels(h);
                    if (customWidth) customWidth.value = w;
                    if (customHeight) customHeight.value = h;
                    
                    if (editorPhotoSize) {
                        for (let opt of editorPhotoSize.options) {
                            const preset = PHOTO_PRESETS[opt.value];
                            if (preset && Math.abs(preset.width - w) < 0.1 && Math.abs(preset.height - h) < 0.1) {
                                editorPhotoSize.value = opt.value;
                                break;
                            }
                        }
                    }
                    updateSizeBadge(w, h);
                }
            });
        });
    }

    // Crop Tools
    document.getElementById('rotateLeft').addEventListener('click', () => {
        cropper.rotate(-90);
    });

    document.getElementById('rotateRight').addEventListener('click', () => {
        cropper.rotate(90);
    });

    document.getElementById('flipH').addEventListener('click', () => {
        const scaleX = cropper.getData().scaleX || 1;
        cropper.scaleX(-scaleX);
    });

    document.getElementById('flipV').addEventListener('click', () => {
        const scaleY = cropper.getData().scaleY || 1;
        cropper.scaleY(-scaleY);
    });

    document.getElementById('resetCrop').addEventListener('click', () => {
        cropper.reset();
    });

    document.getElementById('applyCrop').addEventListener('click', () => {
        croppedCanvas = cropper.getCroppedCanvas({
            width: PHOTO_WIDTH,
            height: PHOTO_HEIGHT,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });
        
        showSection(previewArea);
        hideCard(cropToolsCard);
        showCard(adjustmentsCard);
        showCard(bgColorCard);
        showCard(borderCard);
        
        // Cache unmasked crop for background removal & sensitivity adjustments
        rawCroppedCanvas = document.createElement('canvas');
        rawCroppedCanvas.width = croppedCanvas.width;
        rawCroppedCanvas.height = croppedCanvas.height;
        const rawCtx = rawCroppedCanvas.getContext('2d');
        rawCtx.drawImage(croppedCanvas, 0, 0);

        if (editorResetBgBtn) editorResetBgBtn.style.display = 'none';
        if (editorBgToleranceBox) editorBgToleranceBox.style.display = 'none';

        renderPreview();
    });

    document.getElementById('noCrop').addEventListener('click', () => {
        // Use the original image as-is, no cropping or resizing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalImage.width;
        tempCanvas.height = originalImage.height;
        
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(originalImage, 0, 0);
        
        croppedCanvas = tempCanvas;
        
        // Update PHOTO_WIDTH and PHOTO_HEIGHT to match original image dimensions
        PHOTO_WIDTH = originalImage.width;
        PHOTO_HEIGHT = originalImage.height;
        
        showSection(previewArea);
        hideCard(cropToolsCard);
        showCard(adjustmentsCard);
        showCard(bgColorCard);
        showCard(borderCard);
        
        // Cache unmasked crop for background removal & sensitivity adjustments
        rawCroppedCanvas = document.createElement('canvas');
        rawCroppedCanvas.width = croppedCanvas.width;
        rawCroppedCanvas.height = croppedCanvas.height;
        const rawCtx = rawCroppedCanvas.getContext('2d');
        rawCtx.drawImage(croppedCanvas, 0, 0);

        if (editorResetBgBtn) editorResetBgBtn.style.display = 'none';
        if (editorBgToleranceBox) editorBgToleranceBox.style.display = 'none';

        renderPreview();
    });

    document.getElementById('backToCrop').addEventListener('click', () => {
        showSection(cropArea);
        showCard(cropToolsCard);
        hideCard(adjustmentsCard);
        hideCard(bgColorCard);
        hideCard(borderCard);
        hideCard(cutLinesCard);
    });

    // Adjustments
    const brightnessSlider = document.getElementById('brightness');
    const contrastSlider = document.getElementById('contrast');
    const saturationSlider = document.getElementById('saturation');
    const exposureSlider = document.getElementById('exposure');
    const sharpnessSlider = document.getElementById('sharpness');
    const blurSlider = document.getElementById('blur');

    brightnessSlider.addEventListener('input', (e) => {
        adjustments.brightness = parseInt(e.target.value);
        document.getElementById('brightnessValue').textContent = e.target.value;
        if (croppedCanvas) renderPreview();
    });

    contrastSlider.addEventListener('input', (e) => {
        adjustments.contrast = parseInt(e.target.value);
        document.getElementById('contrastValue').textContent = e.target.value;
        if (croppedCanvas) renderPreview();
    });

    saturationSlider.addEventListener('input', (e) => {
        adjustments.saturation = parseInt(e.target.value);
        document.getElementById('saturationValue').textContent = e.target.value;
        if (croppedCanvas) renderPreview();
    });

    exposureSlider.addEventListener('input', (e) => {
        adjustments.exposure = parseInt(e.target.value);
        document.getElementById('exposureValue').textContent = e.target.value;
        if (croppedCanvas) renderPreview();
    });

    sharpnessSlider.addEventListener('input', (e) => {
        adjustments.sharpness = parseInt(e.target.value);
        document.getElementById('sharpnessValue').textContent = e.target.value;
        if (croppedCanvas) renderPreview();
    });

    blurSlider.addEventListener('input', (e) => {
        adjustments.blur = parseInt(e.target.value);
        document.getElementById('blurValue').textContent = e.target.value;
        if (croppedCanvas) renderPreview();
    });

    document.getElementById('autoEnhance').addEventListener('click', () => {
        adjustments = {
            brightness: 10,
            contrast: 110,
            saturation: 105,
            exposure: 5,
            sharpness: 15,
            blur: 0
        };
        
        brightnessSlider.value = 10;
        contrastSlider.value = 110;
        saturationSlider.value = 105;
        exposureSlider.value = 5;
        sharpnessSlider.value = 15;
        blurSlider.value = 0;
        
        document.getElementById('brightnessValue').textContent = 10;
        document.getElementById('contrastValue').textContent = 110;
        document.getElementById('saturationValue').textContent = 105;
        document.getElementById('exposureValue').textContent = 5;
        document.getElementById('sharpnessValue').textContent = 15;
        document.getElementById('blurValue').textContent = 0;
        
        renderPreview();
    });

    document.getElementById('resetAdjustments').addEventListener('click', () => {
        adjustments = {
            brightness: 0,
            contrast: 100,
            saturation: 100,
            exposure: 0,
            sharpness: 0,
            blur: 0
        };
        
        brightnessSlider.value = 0;
        contrastSlider.value = 100;
        saturationSlider.value = 100;
        exposureSlider.value = 0;
        sharpnessSlider.value = 0;
        blurSlider.value = 0;
        
        document.getElementById('brightnessValue').textContent = 0;
        document.getElementById('contrastValue').textContent = 100;
        document.getElementById('saturationValue').textContent = 100;
        document.getElementById('exposureValue').textContent = 0;
        document.getElementById('sharpnessValue').textContent = 0;
        document.getElementById('blurValue').textContent = 0;
        
        if (croppedCanvas) renderPreview();
    });

    // Smart Edge-Floodfill Background Removal (Client-side Canvas)
    function processBackgroundRemoval(sourceCanvas, tolerance) {
        const w = sourceCanvas.width;
        const h = sourceCanvas.height;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(sourceCanvas, 0, 0);

        const imgData = tempCtx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Sample corner & top-edge background color
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        const samplePoints = [
            [0, 0], [1, 0], [2, 0], [w - 1, 0], [w - 2, 0], [w - 3, 0],
            [0, 1], [w - 1, 1],
            [Math.floor(w * 0.25), 0], [Math.floor(w * 0.5), 0], [Math.floor(w * 0.75), 0]
        ];

        for (const [sx, sy] of samplePoints) {
            if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
                const idx = (sy * w + sx) * 4;
                rSum += data[idx];
                gSum += data[idx + 1];
                bSum += data[idx + 2];
                count++;
            }
        }

        const bgR = rSum / (count || 1);
        const bgG = gSum / (count || 1);
        const bgB = bSum / (count || 1);

        const tolSq = tolerance * tolerance;
        const featherStart = tolerance * 0.65;
        const featherStartSq = featherStart * featherStart;

        const visited = new Uint8Array(w * h);
        const queue = [];

        // Start flood-fill from top border and side borders
        for (let x = 0; x < w; x++) {
            queue.push(x, 0);
            visited[x] = 1;
        }
        const maxH = Math.floor(h * 0.9);
        for (let y = 1; y < maxH; y++) {
            queue.push(0, y);
            visited[y * w] = 1;
            queue.push(w - 1, y);
            visited[y * w + (w - 1)] = 1;
        }

        let head = 0;
        while (head < queue.length) {
            const cx = queue[head++];
            const cy = queue[head++];
            const cIdx = (cy * w + cx) * 4;

            const dr = data[cIdx] - bgR;
            const dg = data[cIdx + 1] - bgG;
            const db = data[cIdx + 2] - bgB;
            const distSq = dr * dr + dg * dg + db * db;

            if (distSq <= tolSq) {
                if (distSq <= featherStartSq) {
                    data[cIdx + 3] = 0;
                } else {
                    const dist = Math.sqrt(distSq);
                    const alpha = Math.floor(((dist - featherStart) / (tolerance - featherStart)) * 255);
                    data[cIdx + 3] = Math.min(data[cIdx + 3], alpha);
                }

                const neighbors = [
                    [cx + 1, cy], [cx - 1, cy],
                    [cx, cy + 1], [cx, cy - 1]
                ];

                for (const [nx, ny] of neighbors) {
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                        const nPos = ny * w + nx;
                        if (!visited[nPos]) {
                            visited[nPos] = 1;
                            queue.push(nx, ny);
                        }
                    }
                }
            }
        }

        tempCtx.putImageData(imgData, 0, 0);
        return tempCanvas;
    }

    // ==========================================================================
    // Studio AI Background Removal Engine & Live Controls for Pro Editor
    // ==========================================================================
    let editorChosenAiModel = 'fast'; // 'fast' (MediaPipe HD - Instant & 100% Offline) or 'ultra' (RMBG-1.4)
    let editorCachedFloatMask = null;
    let editorBgFeather = 16;
    let editorBgEdgeShift = -1;
    let editorBgDefringe = true;

    // Retouch Brush State
    let isBrushEnabled = false;
    let brushMode = 'erase'; // 'erase' or 'restore'
    let brushSize = 25;
    let isMouseDownOnCanvas = false;

    // DOM Elements
    const editorModelUltraChip = document.getElementById('editorModelUltraChip');
    const editorModelFastChip = document.getElementById('editorModelFastChip');
    const editorAiModelStatusBox = document.getElementById('editorAiModelStatusBox');
    const editorAiModelStatusText = document.getElementById('editorAiModelStatusText');
    const editorAiModelPercentText = document.getElementById('editorAiModelPercentText');
    const editorAiProgressBar = document.getElementById('editorAiProgressBar');

    const editorBgFeatherSlider = document.getElementById('editorBgFeatherSlider');
    const editorBgFeatherVal = document.getElementById('editorBgFeatherVal');
    const editorBgEdgeShiftSlider = document.getElementById('editorBgEdgeShiftSlider');
    const editorBgEdgeShiftVal = document.getElementById('editorBgEdgeShiftVal');
    const editorBgDefringeToggle = document.getElementById('editorBgDefringeToggle');

    const toggleTouchupBrushBtn = document.getElementById('toggleTouchupBrushBtn');
    const touchupBrushControls = document.getElementById('touchupBrushControls');
    const brushModeErase = document.getElementById('brushModeErase');
    const brushModeRestore = document.getElementById('brushModeRestore');
    const brushSizeSlider = document.getElementById('brushSizeSlider');
    const brushSizeVal = document.getElementById('brushSizeVal');

    // Model Selector switching
    if (editorModelUltraChip && editorModelFastChip) {
        editorModelUltraChip.addEventListener('click', () => {
            editorChosenAiModel = 'ultra';
            editorModelUltraChip.classList.add('active');
            editorModelFastChip.classList.remove('active');
            const r = editorModelUltraChip.querySelector('input[type="radio"]');
            if (r) r.checked = true;
            editorCachedFloatMask = null;
        });

        editorModelFastChip.addEventListener('click', () => {
            editorChosenAiModel = 'fast';
            editorModelFastChip.classList.add('active');
            editorModelUltraChip.classList.remove('active');
            const r = editorModelFastChip.querySelector('input[type="radio"]');
            if (r) r.checked = true;
            editorCachedFloatMask = null;
        });
    }

    // Instant real-time update using cached probability mask
    function updateEditorLiveMatte() {
        if (!rawCroppedCanvas || !editorCachedFloatMask) return;
        const matte = window.MattingEngine.processMatte(rawCroppedCanvas, editorCachedFloatMask, {
            tolerance: editorBgTolerance,
            feather: editorBgFeather,
            edgeShift: editorBgEdgeShift,
            defringe: editorBgDefringe,
            fillHoles: true,
            useGuidedFilter: true
        });
        croppedCanvas = matte.canvas;
        renderPreview();
        if (a4Area && a4Area.style.display !== 'none') {
            generateA4Layout();
        }
    }

    if (editorAutoRemoveBgBtn) {
        editorAutoRemoveBgBtn.addEventListener('click', async () => {
            if (!croppedCanvas) return;
            if (!rawCroppedCanvas) {
                rawCroppedCanvas = document.createElement('canvas');
                rawCroppedCanvas.width = croppedCanvas.width;
                rawCroppedCanvas.height = croppedCanvas.height;
                const rCtx = rawCroppedCanvas.getContext('2d');
                rCtx.drawImage(croppedCanvas, 0, 0);
            }

            editorAutoRemoveBgBtn.disabled = true;
            editorAutoRemoveBgBtn.innerHTML = '<span>⏳ Processing AI Cutout...</span>';
            if (editorAiModelStatusBox) {
                editorAiModelStatusBox.style.display = 'block';
                if (editorAiModelStatusText) editorAiModelStatusText.textContent = 'Initializing AI model...';
                if (editorAiProgressBar) editorAiProgressBar.style.width = '15%';
                if (editorAiModelPercentText) editorAiModelPercentText.textContent = '';
            }

            try {
                if (!editorCachedFloatMask) {
                    if (editorChosenAiModel === 'ultra' && window.MattingEngine?.extractMaskUltra) {
                        try {
                            const res = await window.MattingEngine.extractMaskUltra(rawCroppedCanvas, (prog) => {
                                if (!editorAiModelStatusBox) return;
                                if (prog.status === 'downloading' && prog.percent !== undefined) {
                                    if (editorAiModelStatusText) editorAiModelStatusText.textContent = 'Downloading Ultra AI weights...';
                                    if (editorAiProgressBar) editorAiProgressBar.style.width = `${prog.percent}%`;
                                    if (editorAiModelPercentText) editorAiModelPercentText.textContent = `${prog.percent}%`;
                                } else if (prog.status === 'processing') {
                                    if (editorAiModelStatusText) editorAiModelStatusText.textContent = 'Analyzing portrait contours...';
                                    if (editorAiProgressBar) editorAiProgressBar.style.width = '85%';
                                    if (editorAiModelPercentText) editorAiModelPercentText.textContent = '';
                                }
                            });
                            editorCachedFloatMask = res.floatMask;
                        } catch (ultraErr) {
                            console.warn('Ultra AI failed or offline, falling back to Fast AI:', ultraErr);
                            if (editorAiModelStatusText) editorAiModelStatusText.textContent = 'Switching to Fast Studio AI...';
                            const res = await window.MattingEngine.extractMaskFast(rawCroppedCanvas);
                            editorCachedFloatMask = res.floatMask;
                        }
                    } else {
                        if (editorAiModelStatusText) editorAiModelStatusText.textContent = 'Running Fast Studio AI...';
                        if (editorAiProgressBar) editorAiProgressBar.style.width = '55%';
                        const res = await window.MattingEngine.extractMaskFast(rawCroppedCanvas);
                        editorCachedFloatMask = res.floatMask;
                    }
                }

                if (editorAiModelStatusText) editorAiModelStatusText.textContent = 'Applying high-definition edge matting...';
                if (editorAiProgressBar) editorAiProgressBar.style.width = '100%';

                const matte = window.MattingEngine.processMatte(rawCroppedCanvas, editorCachedFloatMask, {
                    tolerance: editorBgTolerance,
                    feather: editorBgFeather,
                    edgeShift: editorBgEdgeShift,
                    defringe: editorBgDefringe,
                    fillHoles: true,
                    useGuidedFilter: true
                });

                croppedCanvas = matte.canvas;
                editorAutoRemoveBgBtn.innerHTML = '<span>✨ Background Removed</span>';
                if (editorResetBgBtn) editorResetBgBtn.style.display = 'inline-flex';
                if (editorBgToleranceBox) editorBgToleranceBox.style.display = 'block';
                if (bgColorCard) bgColorCard.style.display = 'block';
                renderPreview();
                if (a4Area && a4Area.style.display !== 'none') {
                    generateA4Layout();
                }

                setTimeout(() => {
                    if (editorAiModelStatusBox) editorAiModelStatusBox.style.display = 'none';
                }, 800);
            } catch (err) {
                console.error('Pro Editor AI segmentation failed:', err);
                alert('Background removal could not complete: ' + (err.message || err));
                editorAutoRemoveBgBtn.innerHTML = '<span>🪄 Remove Background</span>';
                if (editorAiModelStatusBox) editorAiModelStatusBox.style.display = 'none';
            } finally {
                editorAutoRemoveBgBtn.disabled = false;
            }
        });
    }

    if (editorResetBgBtn) {
        editorResetBgBtn.addEventListener('click', () => {
            if (!rawCroppedCanvas) return;
            croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = rawCroppedCanvas.width;
            croppedCanvas.height = rawCroppedCanvas.height;
            const rCtx = croppedCanvas.getContext('2d');
            rCtx.drawImage(rawCroppedCanvas, 0, 0);
            editorCachedFloatMask = null;
            editorResetBgBtn.style.display = 'none';
            if (editorBgToleranceBox) editorBgToleranceBox.style.display = 'none';
            if (editorAutoRemoveBgBtn) editorAutoRemoveBgBtn.innerHTML = '<span>🪄 Remove Background</span>';
            if (isBrushEnabled && toggleTouchupBrushBtn) toggleTouchupBrushBtn.click();
            renderPreview();
            if (a4Area && a4Area.style.display !== 'none') {
                generateA4Layout();
            }
        });
    }

    // Live Sliders for Editor
    if (editorBgToleranceSlider) {
        editorBgToleranceSlider.addEventListener('input', (e) => {
            editorBgTolerance = parseInt(e.target.value);
            if (editorBgToleranceVal) editorBgToleranceVal.textContent = editorBgTolerance;
            updateEditorLiveMatte();
        });
    }

    if (editorBgFeatherSlider) {
        editorBgFeatherSlider.addEventListener('input', (e) => {
            editorBgFeather = parseInt(e.target.value);
            if (editorBgFeatherVal) editorBgFeatherVal.textContent = `${editorBgFeather}px`;
            updateEditorLiveMatte();
        });
    }

    if (editorBgEdgeShiftSlider) {
        editorBgEdgeShiftSlider.addEventListener('input', (e) => {
            editorBgEdgeShift = parseInt(e.target.value);
            if (editorBgEdgeShiftVal) editorBgEdgeShiftVal.textContent = `${editorBgEdgeShift > 0 ? '+' : ''}${editorBgEdgeShift}px`;
            updateEditorLiveMatte();
        });
    }

    if (editorBgDefringeToggle) {
        editorBgDefringeToggle.addEventListener('change', (e) => {
            editorBgDefringe = e.target.checked;
            updateEditorLiveMatte();
        });
    }

    // Retouch Brush Functionality
    if (toggleTouchupBrushBtn) {
        toggleTouchupBrushBtn.addEventListener('click', () => {
            isBrushEnabled = !isBrushEnabled;
            if (isBrushEnabled) {
                toggleTouchupBrushBtn.classList.add('active');
                toggleTouchupBrushBtn.innerHTML = '<span>Disable Brush</span>';
                if (touchupBrushControls) touchupBrushControls.style.display = 'block';
                if (previewCanvas) previewCanvas.classList.add('canvas-brush-active');
            } else {
                toggleTouchupBrushBtn.classList.remove('active');
                toggleTouchupBrushBtn.innerHTML = '<span>Enable Brush</span>';
                if (touchupBrushControls) touchupBrushControls.style.display = 'none';
                if (previewCanvas) previewCanvas.classList.remove('canvas-brush-active');
            }
        });
    }

    if (brushModeErase && brushModeRestore) {
        brushModeErase.addEventListener('click', () => {
            brushMode = 'erase';
            brushModeErase.classList.add('active');
            brushModeRestore.classList.remove('active');
        });
        brushModeRestore.addEventListener('click', () => {
            brushMode = 'restore';
            brushModeRestore.classList.add('active');
            brushModeErase.classList.remove('active');
        });
    }

    if (brushSizeSlider) {
        brushSizeSlider.addEventListener('input', (e) => {
            brushSize = parseInt(e.target.value);
            if (brushSizeVal) brushSizeVal.textContent = `${brushSize}px`;
        });
    }

    function applyBrushStroke(e) {
        if (!isBrushEnabled || !editorCachedFloatMask || !previewCanvas || !rawCroppedCanvas) return;
        const rect = previewCanvas.getBoundingClientRect();
        const scaleX = rawCroppedCanvas.width / rect.width;
        const scaleY = rawCroppedCanvas.height / rect.height;

        const imgX = Math.round((e.clientX - rect.left) * scaleX);
        const imgY = Math.round((e.clientY - rect.top) * scaleY);
        const imgRadius = Math.round((brushSize / 2) * scaleX);

        const w = rawCroppedCanvas.width;
        const h = rawCroppedCanvas.height;
        const targetVal = brushMode === 'erase' ? 0.0 : 1.0;

        for (let dy = -imgRadius; dy <= imgRadius; dy++) {
            const py = imgY + dy;
            if (py < 0 || py >= h) continue;
            for (let dx = -imgRadius; dx <= imgRadius; dx++) {
                const px = imgX + dx;
                if (px < 0 || px >= w) continue;
                if (dx * dx + dy * dy <= imgRadius * imgRadius) {
                    editorCachedFloatMask[py * w + px] = targetVal;
                }
            }
        }
        updateEditorLiveMatte();
    }

    if (previewCanvas) {
        previewCanvas.addEventListener('mousedown', (e) => {
            if (!isBrushEnabled) return;
            isMouseDownOnCanvas = true;
            applyBrushStroke(e);
        });

        window.addEventListener('mousemove', (e) => {
            if (!isMouseDownOnCanvas || !isBrushEnabled) return;
            applyBrushStroke(e);
        });

        window.addEventListener('mouseup', () => {
            isMouseDownOnCanvas = false;
        });
    }

    // Render Preview
    function renderPreview() {
        if (!croppedCanvas) return;
        
        previewCanvas.width = PHOTO_WIDTH;
        previewCanvas.height = PHOTO_HEIGHT;
        
        const ctx = previewCanvas.getContext('2d');
        
        // Apply background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
        
        // Apply filters
        ctx.filter = `
            brightness(${100 + adjustments.brightness}%)
            contrast(${adjustments.contrast}%)
            saturate(${adjustments.saturation}%)
            blur(${adjustments.blur}px)
        `;
        
        // Draw image
        ctx.drawImage(croppedCanvas, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
        
        // Reset filter
        ctx.filter = 'none';
        
        // Apply exposure (additional brightness layer)
        if (adjustments.exposure !== 0) {
            ctx.globalAlpha = Math.abs(adjustments.exposure) / 200;
            ctx.fillStyle = adjustments.exposure > 0 ? 'white' : 'black';
            ctx.fillRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
            ctx.globalAlpha = 1;
        }

        // Draw black border around passport photo if enabled
        if (borderSettings.enabled) {
            ctx.save();
            ctx.strokeStyle = borderSettings.color || '#000000';
            ctx.lineWidth = borderSettings.width || 3;
            ctx.strokeRect(
                borderSettings.width / 2,
                borderSettings.width / 2,
                PHOTO_WIDTH - borderSettings.width,
                PHOTO_HEIGHT - borderSettings.width
            );
            ctx.restore();
        }
    }

    // Generate A4
    document.getElementById('generateA4').addEventListener('click', () => {
        showSection(a4Area);
        hideCard(adjustmentsCard);
        showCard(sizeSelectionCard);
        showCard(bgColorCard);
        showCard(borderCard);
        showCard(cutLinesCard);
        
        // Initialize photo count slider
        const maxPhotos = calculateMaxPhotos();
        photoCountSlider.max = maxPhotos;
        photoCountSlider.value = maxPhotos;
        photoCountValue.textContent = 'Maximum';
        
        generateA4Layout();
    });

    // Download Single Image
    document.getElementById('downloadSingle').addEventListener('click', () => {
        previewCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'passport-photo.jpg';
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/jpeg', 1.0);
    });

    function generateA4Layout() {
        a4Canvas.width = A4_WIDTH;
        a4Canvas.height = A4_HEIGHT;
        
        const ctx = a4Canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);
        
        const margin = 60;
        const spacing = getSpacing();
        
        const availableWidth = A4_WIDTH - (2 * margin);
        const availableHeight = A4_HEIGHT - (2 * margin);
        
        const photosPerRow = Math.max(1, Math.floor((availableWidth + spacing) / (PHOTO_WIDTH + spacing)));
        const photosPerCol = Math.max(1, Math.floor((availableHeight + spacing) / (PHOTO_HEIGHT + spacing)));
        
        const maxPhotos = photosPerRow * photosPerCol;
        const sliderValue = parseInt(photoCountSlider?.value || maxPhotos);
        const photosToRender = sliderValue >= maxPhotos ? maxPhotos : Math.max(1, sliderValue);
        
        let count = 0;
        
        for (let row = 0; row < photosPerCol && count < photosToRender; row++) {
            for (let col = 0; col < photosPerRow && count < photosToRender; col++) {
                const x = margin + col * (PHOTO_WIDTH + spacing);
                const y = margin + row * (PHOTO_HEIGHT + spacing);
                
                ctx.drawImage(previewCanvas, x, y, PHOTO_WIDTH, PHOTO_HEIGHT);
                count++;
            }
        }

        // Draw Scissor Cutting Guide Lines if enabled
        if (cutLineSettings.enabled && count > 0) {
            const colsUsed = Math.min(count, photosPerRow);
            const rowsUsed = Math.ceil(count / photosPerRow);
            drawCuttingGuides(ctx, {
                margin: margin,
                spacing: spacing,
                photoWidth: PHOTO_WIDTH,
                photoHeight: PHOTO_HEIGHT,
                colsUsed: colsUsed,
                rowsUsed: rowsUsed,
                style: cutLineSettings.style,
                color: cutLineSettings.color || '#333333',
                lineWidth: 2,
                showScissors: true,
                canvasWidth: A4_WIDTH,
                canvasHeight: A4_HEIGHT
            });
        }
    }

    function drawCuttingGuides(targetCtx, options) {
        const {
            margin,
            spacing,
            photoWidth,
            photoHeight,
            colsUsed,
            rowsUsed,
            style = 'dashed',
            color = '#333333',
            lineWidth = 2,
            showScissors = true,
            canvasWidth = A4_WIDTH,
            canvasHeight = A4_HEIGHT
        } = options;

        if (!colsUsed || !rowsUsed || colsUsed <= 0 || rowsUsed <= 0) return;

        targetCtx.save();
        targetCtx.strokeStyle = color;
        targetCtx.fillStyle = color;
        targetCtx.lineWidth = lineWidth;

        if (style === 'dashed') {
            targetCtx.setLineDash([12, 12]);
        } else if (style === 'dotted') {
            targetCtx.setLineDash([4, 6]);
        } else {
            targetCtx.setLineDash([]);
        }

        const gridLeft = margin;
        const gridRight = margin + colsUsed * photoWidth + (colsUsed - 1) * spacing;
        const gridTop = margin;
        const gridBottom = margin + rowsUsed * photoHeight + (rowsUsed - 1) * spacing;

        const extension = 35;
        const lineTop = Math.max(10, gridTop - extension);
        const lineBottom = Math.min(canvasHeight - 10, gridBottom + extension);
        const lineLeft = Math.max(10, gridLeft - extension);
        const lineRight = Math.min(canvasWidth - 10, gridRight + extension);

        // 1. Vertical Cut Lines
        const verticalXPositions = [];
        verticalXPositions.push(gridLeft - (spacing > 0 ? spacing / 2 : 0));
        for (let c = 0; c < colsUsed - 1; c++) {
            verticalXPositions.push(margin + (c + 1) * photoWidth + c * spacing + spacing / 2);
        }
        verticalXPositions.push(gridRight + (spacing > 0 ? spacing / 2 : 0));

        verticalXPositions.forEach(x => {
            targetCtx.beginPath();
            targetCtx.moveTo(x, lineTop);
            targetCtx.lineTo(x, lineBottom);
            targetCtx.stroke();

            if (showScissors && style === 'dashed') {
                targetCtx.save();
                targetCtx.setLineDash([]);
                targetCtx.font = 'bold 24px Arial, sans-serif';
                targetCtx.textAlign = 'center';
                targetCtx.textBaseline = 'bottom';
                targetCtx.fillText('✂', x, lineTop - 4);
                targetCtx.restore();
            }
        });

        // 2. Horizontal Cut Lines
        const horizontalYPositions = [];
        horizontalYPositions.push(gridTop - (spacing > 0 ? spacing / 2 : 0));
        for (let r = 0; r < rowsUsed - 1; r++) {
            horizontalYPositions.push(margin + (r + 1) * photoHeight + r * spacing + spacing / 2);
        }
        horizontalYPositions.push(gridBottom + (spacing > 0 ? spacing / 2 : 0));

        horizontalYPositions.forEach(y => {
            targetCtx.beginPath();
            targetCtx.moveTo(lineLeft, y);
            targetCtx.lineTo(lineRight, y);
            targetCtx.stroke();

            if (showScissors && style === 'dashed') {
                targetCtx.save();
                targetCtx.setLineDash([]);
                targetCtx.font = 'bold 24px Arial, sans-serif';
                targetCtx.textAlign = 'right';
                targetCtx.textBaseline = 'middle';
                targetCtx.fillText('✂', lineLeft - 6, y);
                targetCtx.restore();
            }
        });

        targetCtx.restore();
    }

    // Spacing helper
    function getSpacing() {
        return editorPhotoSpacingSelect ? parseInt(editorPhotoSpacingSelect.value) : 30;
    }

    // Update Size Information Badge
    function updateSizeBadge(widthMm, heightMm) {
        const widthInches = (widthMm / MM_TO_INCH).toFixed(2);
        const heightInches = (heightMm / MM_TO_INCH).toFixed(2);
        const widthPx = mmToPixels(widthMm);
        const heightPx = mmToPixels(heightMm);
        
        const spacing = getSpacing();
        const availableW = A4_WIDTH - (2 * 60);
        const availableH = A4_HEIGHT - (2 * 60);
        const perRow = Math.max(1, Math.floor((availableW + spacing) / (widthPx + spacing)));
        const perCol = Math.max(1, Math.floor((availableH + spacing) / (heightPx + spacing)));
        const capacity = perRow * perCol;
        
        const badgeDim = document.getElementById('badgeDimensions');
        const badgePx = document.getElementById('badgePixels');
        const badgeCap = document.getElementById('badgeCapacity');
        
        if (badgeDim) badgeDim.textContent = `${widthMm} × ${heightMm} mm (${widthInches} × ${heightInches} in)`;
        if (badgePx) badgePx.textContent = `${widthPx} × ${heightPx} px @ 300 DPI`;
        if (badgeCap) badgeCap.textContent = `Up to ${capacity} photos (${perRow} cols × ${perCol} rows)`;
    }

    // Photo Size Selection Handler
    if (editorPhotoSize) {
        editorPhotoSize.addEventListener('change', (e) => {
            const value = e.target.value;
            
            if (value === 'custom') {
                if (customSizeInputs) customSizeInputs.style.display = 'block';
                updatePhotoSizeFromCustom();
            } else {
                if (customSizeInputs) customSizeInputs.style.display = 'none';
                updatePhotoSizeFromPreset(value);
            }
            
            updateA4WithNewSize();
            updatePhotoCountSlider();
        });
    }

    if (editorPhotoSpacingSelect) {
        editorPhotoSpacingSelect.addEventListener('change', () => {
            const currentMmW = parseFloat(customWidth?.value) || 35;
            const currentMmH = parseFloat(customHeight?.value) || 45;
            updateSizeBadge(currentMmW, currentMmH);
            generateA4Layout();
            updatePhotoCountSlider();
        });
    }

    if (customWidth) {
        customWidth.addEventListener('input', () => {
            updatePhotoSizeFromCustom();
            updateA4WithNewSize();
            updatePhotoCountSlider();
        });
    }
    
    if (customHeight) {
        customHeight.addEventListener('input', () => {
            updatePhotoSizeFromCustom();
            updateA4WithNewSize();
            updatePhotoCountSlider();
        });
    }

    // Photo Count Slider
    const photoCountSlider = document.getElementById('photoCountSlider');
    const photoCountValue = document.getElementById('photoCountValue');
    let isAtMaximum = true; // Track if user wants maximum photos

    if (photoCountSlider) {
        photoCountSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            const maxPhotos = calculateMaxPhotos();
            
            // Ensure value is at least 1
            if (value < 1) {
                photoCountSlider.value = 1;
                photoCountValue.textContent = '1';
                isAtMaximum = false;
            } else if (value >= maxPhotos) {
                photoCountValue.textContent = 'Maximum';
                isAtMaximum = true;
            } else {
                photoCountValue.textContent = value;
                isAtMaximum = false;
            }
            
            generateA4Layout();
        });
    }

    function calculateMaxPhotos() {
        const margin = 60;
        const spacing = getSpacing();
        const availableWidth = A4_WIDTH - (2 * margin);
        const availableHeight = A4_HEIGHT - (2 * margin);
        const photosPerRow = Math.max(1, Math.floor((availableWidth + spacing) / (PHOTO_WIDTH + spacing)));
        const photosPerCol = Math.max(1, Math.floor((availableHeight + spacing) / (PHOTO_HEIGHT + spacing)));
        return photosPerRow * photosPerCol;
    }

    function updatePhotoCountSlider() {
        if (!photoCountSlider) return;
        const maxPhotos = calculateMaxPhotos();
        photoCountSlider.max = maxPhotos;
        
        // If user wants maximum or current value exceeds new max, set to new maximum
        if (isAtMaximum || parseInt(photoCountSlider.value) > maxPhotos) {
            photoCountSlider.value = maxPhotos;
            if (photoCountValue) photoCountValue.textContent = 'Maximum';
            isAtMaximum = true;
        }
    }

    function updatePhotoSizeFromPreset(preset) {
        const size = PHOTO_PRESETS[preset];
        if (size) {
            PHOTO_WIDTH = mmToPixels(size.width);
            PHOTO_HEIGHT = mmToPixels(size.height);
            if (customWidth) customWidth.value = size.width;
            if (customHeight) customHeight.value = size.height;
            updateSizeBadge(size.width, size.height);
        }
    }

    function updatePhotoSizeFromCustom() {
        const width = parseFloat(customWidth?.value) || 35;
        const height = parseFloat(customHeight?.value) || 45;
        PHOTO_WIDTH = mmToPixels(width);
        PHOTO_HEIGHT = mmToPixels(height);
        updateSizeBadge(width, height);
    }

    function updateA4WithNewSize() {
        if (!croppedCanvas) return;
        
        // Resize the preview canvas to new dimensions
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = PHOTO_WIDTH;
        tempCanvas.height = PHOTO_HEIGHT;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Apply background
        tempCtx.fillStyle = backgroundColor;
        tempCtx.fillRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
        
        // Apply filters and draw resized image
        tempCtx.filter = `
            brightness(${100 + adjustments.brightness}%)
            contrast(${adjustments.contrast}%)
            saturate(${adjustments.saturation}%)
            blur(${adjustments.blur}px)
        `;
        
        tempCtx.drawImage(croppedCanvas, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
        tempCtx.filter = 'none';
        
        // Apply exposure
        if (adjustments.exposure !== 0) {
            tempCtx.globalAlpha = Math.abs(adjustments.exposure) / 200;
            tempCtx.fillStyle = adjustments.exposure > 0 ? 'white' : 'black';
            tempCtx.fillRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
            tempCtx.globalAlpha = 1;
        }

        // Draw black border around passport photo if enabled
        if (borderSettings.enabled) {
            tempCtx.save();
            tempCtx.strokeStyle = borderSettings.color || '#000000';
            tempCtx.lineWidth = borderSettings.width || 3;
            tempCtx.strokeRect(
                borderSettings.width / 2,
                borderSettings.width / 2,
                PHOTO_WIDTH - borderSettings.width,
                PHOTO_HEIGHT - borderSettings.width
            );
            tempCtx.restore();
        }
        
        // Update preview canvas
        previewCanvas.width = PHOTO_WIDTH;
        previewCanvas.height = PHOTO_HEIGHT;
        const ctx = previewCanvas.getContext('2d');
        ctx.drawImage(tempCanvas, 0, 0);
        
        // Regenerate A4 layout
        generateA4Layout();
        
        // Update photo count slider
        updatePhotoCountSlider();
    }

    // Initialize size badge
    updateSizeBadge(35, 45);

    // Border Event Listeners
    if (enableBorder) {
        enableBorder.addEventListener('change', (e) => {
            borderSettings.enabled = e.target.checked;
            if (borderControls) {
                borderControls.style.display = borderSettings.enabled ? 'block' : 'none';
            }
            if (croppedCanvas) {
                renderPreview();
                if (a4Area && a4Area.style.display !== 'none') {
                    generateA4Layout();
                }
            }
        });
    }

    if (borderWidthSlider) {
        borderWidthSlider.addEventListener('input', (e) => {
            borderSettings.width = parseInt(e.target.value) || 3;
            if (borderWidthValue) {
                borderWidthValue.textContent = `${borderSettings.width}px`;
            }
            if (croppedCanvas) {
                renderPreview();
                if (a4Area && a4Area.style.display !== 'none') {
                    generateA4Layout();
                }
            }
        });
    }

    if (borderColorPicker) {
        borderColorPicker.addEventListener('input', (e) => {
            borderSettings.color = e.target.value || '#000000';
            if (croppedCanvas) {
                renderPreview();
                if (a4Area && a4Area.style.display !== 'none') {
                    generateA4Layout();
                }
            }
        });
    }

    // Cut Line Event Listeners
    if (enableCutLines) {
        enableCutLines.addEventListener('change', (e) => {
            cutLineSettings.enabled = e.target.checked;
            if (cutLinesControls) {
                cutLinesControls.style.display = cutLineSettings.enabled ? 'block' : 'none';
            }
            if (a4Area && a4Area.style.display !== 'none') {
                generateA4Layout();
            }
        });
    }

    if (cutLineStyleSelect) {
        cutLineStyleSelect.addEventListener('change', (e) => {
            cutLineSettings.style = e.target.value;
            if (a4Area && a4Area.style.display !== 'none') {
                generateA4Layout();
            }
        });
    }

    if (cutLineColorPicker) {
        cutLineColorPicker.addEventListener('input', (e) => {
            cutLineSettings.color = e.target.value || '#333333';
            if (a4Area && a4Area.style.display !== 'none') {
                generateA4Layout();
            }
        });
    }

    // Background Color Event Listeners
    function setEditorBgColor(color) {
        backgroundColor = color;
        if (editorBgColorPicker) editorBgColorPicker.value = color;
        if (editorBgHexDisplay) editorBgHexDisplay.textContent = color.toUpperCase();

        const presetBtns = document.querySelectorAll('#bgColorCard .bg-preset-btn');
        if (presetBtns) {
            presetBtns.forEach(btn => {
                const btnColor = btn.getAttribute('data-color');
                if (btnColor && btnColor.toLowerCase() === color.toLowerCase()) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        if (croppedCanvas) {
            renderPreview();
            if (a4Area && a4Area.style.display !== 'none') {
                generateA4Layout();
            }
        }
    }

    if (editorBgColorPicker) {
        editorBgColorPicker.addEventListener('input', (e) => {
            setEditorBgColor(e.target.value);
        });
    }

    const editorPresetBtns = document.querySelectorAll('#bgColorCard .bg-preset-btn');
    if (editorPresetBtns) {
        editorPresetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.getAttribute('data-color');
                if (color) setEditorBgColor(color);
            });
        });
    }

    // Professional High-Resolution Print Function
    function printCanvas(targetCanvas) {
        if (!targetCanvas) {
            alert('Please generate the A4 sheet first before printing!');
            return;
        }

        try {
            const dataUrl = targetCanvas.toDataURL('image/jpeg', 1.0);
            
            let printIframe = document.getElementById('printIframe');
            if (!printIframe) {
                printIframe = document.createElement('iframe');
                printIframe.id = 'printIframe';
                printIframe.style.position = 'fixed';
                printIframe.style.right = '0';
                printIframe.style.bottom = '0';
                printIframe.style.width = '0';
                printIframe.style.height = '0';
                printIframe.style.border = '0';
                document.body.appendChild(printIframe);
            }
            
            const printDoc = printIframe.contentDocument || printIframe.contentWindow.document;
            printDoc.open();
            printDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print Passport Photos</title>
                    <style>
                        @page {
                            size: A4 portrait;
                            margin: 0;
                        }
                        * {
                            box-sizing: border-box;
                            margin: 0;
                            padding: 0;
                        }
                        html, body {
                            width: 100%;
                            height: 100%;
                            background: #ffffff;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        img {
                            width: 100%;
                            max-width: 210mm;
                            height: auto;
                            max-height: 297mm;
                            display: block;
                            margin: 0 auto;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    </style>
                </head>
                <body>
                    <img id="printImg" src="${dataUrl}" alt="Passport Photos" />
                </body>
                </html>
            `);
            printDoc.close();
            
            const img = printDoc.getElementById('printImg');
            if (img) {
                img.onload = () => {
                    setTimeout(() => {
                        printIframe.contentWindow.focus();
                        printIframe.contentWindow.print();
                    }, 250);
                };
            }
        } catch (err) {
            console.warn('Iframe print fallback to window.print:', err);
            window.print();
        }
    }

    // Print
    const printA4Btn = document.getElementById('printA4');
    if (printA4Btn) {
        printA4Btn.addEventListener('click', () => {
            printCanvas(a4Canvas);
        });
    }

    // Download PDF
    document.getElementById('downloadPDF').addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const imgData = a4Canvas.toDataURL('image/jpeg', 1.0);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        pdf.save('passport-photos.pdf');
    });

    // Download JPG
    document.getElementById('downloadJPG').addEventListener('click', () => {
        a4Canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'passport-photos.jpg';
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/jpeg', 1.0);
    });

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    console.log('✅ Service Worker registered successfully:', registration.scope);
                })
                .catch(error => {
                    console.log('❌ Service Worker registration failed:', error);
                });
        });
    }

})();
