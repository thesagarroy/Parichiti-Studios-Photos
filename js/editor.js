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

    // Constants
    const A4_WIDTH = 2480;
    const A4_HEIGHT = 3508;
    const DPI = 300;
    const MM_TO_INCH = 25.4;

    // Standard Photo Size Presets (dimensions in mm)
    const PHOTO_PRESETS = {
        '35x45': { width: 35, height: 45, label: 'India / UK / Schengen (35×45 mm)' },
        '51x51': { width: 51, height: 51, label: 'USA / India OCI 2×2" (51×51 mm)' },
        '50x70': { width: 50, height: 70, label: 'Canada Passport / PR (50×70 mm)' },
        '40x50': { width: 40, height: 50, label: 'Bangladesh Passport / Visa (40×50 mm)' },
        '35x50': { width: 35, height: 50, label: 'Malaysia / Singapore Visa (35×50 mm)' },
        '33x48': { width: 33, height: 48, label: 'China Passport / Visa (33×48 mm)' },
        '40x60': { width: 40, height: 60, label: 'UAE / Dubai / Saudi Visa (40×60 mm)' },
        '35x45_au': { width: 35, height: 45, label: 'Australia / New Zealand (35×45 mm)' },
        '35x45_jp': { width: 35, height: 45, label: 'Japan / South Korea (35×45 mm)' },
        '35x45_sg': { width: 35, height: 45, label: 'Singapore Passport (35×45 mm)' },
        '25x35': { width: 25, height: 35, label: 'India PAN Card / Exam (25×35 mm)' },
        '25x30': { width: 25, height: 30, label: 'Stamp Size - Standard (25×30 mm)' },
        '30.5x38': { width: 30.5, height: 38, label: 'Stamp Size - Classic (30.5×38 mm)' },
        '20x25': { width: 20, height: 25, label: 'Stamp Size - Mini (20×25 mm)' },
        '38x51': { width: 38.1, height: 50.8, label: '1.5 × 2 Inch (38.1×50.8 mm)' },
        '63.5x89': { width: 63.5, height: 88.9, label: '2R Wallet Size (63.5×89 mm)' },
        '89x127': { width: 88.9, height: 127, label: '3R Card Photo (89×127 mm)' },
        '101.6x152.4': { width: 101.6, height: 152.4, label: '4R Print Size (101.6×152.4 mm)' }
    };

    // State
    let originalImage = null;
    let cropper = null;
    let croppedCanvas = null;
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
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage = new Image();
            originalImage.onload = () => {
                initCropper();
            };
            originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
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
        showCard(borderCard);
        
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
        showCard(borderCard);
        
        renderPreview();
    });

    document.getElementById('backToCrop').addEventListener('click', () => {
        showSection(cropArea);
        showCard(cropToolsCard);
        hideCard(adjustmentsCard);
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
