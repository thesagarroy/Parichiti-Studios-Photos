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
                                loadPhotoFromDataUrl(fileInfo.dataUrl, fileInfo.fileName);
                            }
                        });
                    } else if (photoUpload) {
                        photoUpload.click();
                    }
                } else if (action === 'save-file') {
                    if (generateBtn && !generateBtn.disabled) {
                        generatePDF();
                    } else {
                        alert('Please upload a photo first to generate your A4 sheet!');
                    }
                } else if (action === 'print-sheet') {
                    const printButton = document.getElementById('printBtn');
                    if (printButton && printButton.style.display !== 'none') {
                        printButton.click();
                    } else if (window.electronAPI.printSheet) {
                        window.electronAPI.printSheet();
                    }
                } else if (action === 'export-pdf') {
                    if (generateBtn && !generateBtn.disabled) {
                        generatePDF();
                    }
                }
            });
        }
    }

    // A4 dimensions in pixels at 300 DPI
    const A4_WIDTH = 2480;
    const A4_HEIGHT = 3508;
    
    const MARGIN = 60;
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

    // Dynamic photo dimensions (will be updated based on selection)
    let PHOTO_WIDTH = mmToPixels(35);   // Default 35mm at 300 DPI
    let PHOTO_HEIGHT = mmToPixels(45);  // Default 45mm at 300 DPI
    let photoBgColor = '#FFFFFF';       // Default studio photo background color (White)

    // Photo Framing & Size Adjustment State
    let photoFitMode = 'contain';       // 'contain' (fit full) or 'cover' (fill & center)
    let photoScale = 1.0;               // 0.6 to 1.6 scale multiplier
    let photoOffsetY = 0;               // vertical offset in percentage (-30% to +30%)
    let rawOriginalImage = null;        // original uploaded image for reset
    let bgTolerance = 35;               // background eraser sensitivity

    let uploadedImages = []; // Array to store multiple images

    // DOM elements
    const photoUpload = document.getElementById('photoUpload');
    const photoSizeSelect = document.getElementById('photoSize');
    const customSizeInputs = document.getElementById('customSizeInputs');
    const customWidth = document.getElementById('customWidth');
    const customHeight = document.getElementById('customHeight');
    const photoSpacingSelect = document.getElementById('photoSpacingSelect');
    const photoBgColorPicker = document.getElementById('photoBgColorPicker');
    const bgHexDisplay = document.getElementById('bgHexDisplay');
    const enableBorder = document.getElementById('enableBorder');
    const borderWidthSelect = document.getElementById('borderWidthSelect');
    const borderSubControls = document.getElementById('borderSubControls');
    const enableCutLines = document.getElementById('enableCutLines');
    const cutLineStyleSelect = document.getElementById('cutLineStyleSelect');
    const cutLinesSubControls = document.getElementById('cutLinesSubControls');
    const generateBtn = document.getElementById('generatePdf');
    const canvas = document.getElementById('photoCanvas');
    const ctx = canvas.getContext('2d');
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.querySelector('.theme-icon');
    const printBtn = document.getElementById('printBtn');

    // Photo Framing & Background Remover DOM elements
    const photoAdjustCard = document.getElementById('photoAdjustCard');
    const fitModeRadios = document.querySelectorAll('input[name="photoFitMode"]');
    const photoScaleSlider = document.getElementById('photoScaleSlider');
    const photoScaleVal = document.getElementById('photoScaleVal');
    const photoOffsetSlider = document.getElementById('photoOffsetSlider');
    const photoOffsetVal = document.getElementById('photoOffsetVal');
    const autoRemoveBgBtn = document.getElementById('autoRemoveBgBtn');
    const resetBgBtn = document.getElementById('resetBgBtn');
    const bgToleranceBox = document.getElementById('bgToleranceBox');
    const bgToleranceSlider = document.getElementById('bgToleranceSlider');
    const bgToleranceVal = document.getElementById('bgToleranceVal');

    // Stage Preview Size & Empty State DOM elements
    const canvasEmptyState = document.getElementById('canvasEmptyState');
    const paperStage = document.getElementById('paperStage');
    const previewSizeBtns = document.querySelectorAll('#previewSizeToggles .preview-size-btn');

    // Set canvas dimensions
    canvas.width = A4_WIDTH;
    canvas.height = A4_HEIGHT;

    // Dark Mode functionality
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

    // Preview Size Toggles (Fit View / Big View / Full Width)
    if (previewSizeBtns && paperStage) {
        previewSizeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                previewSizeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const size = btn.getAttribute('data-size');
                paperStage.classList.remove('view-fit', 'view-big', 'view-full');
                if (size === 'fit') {
                    paperStage.classList.add('view-fit');
                } else if (size === 'full') {
                    paperStage.classList.add('view-full');
                } else {
                    paperStage.classList.add('view-big');
                }
            });
        });
    }

    // Background Color Management
    function setPhotoBgColor(color) {
        photoBgColor = color;
        if (photoBgColorPicker) photoBgColorPicker.value = color;
        if (bgHexDisplay) bgHexDisplay.textContent = color.toUpperCase();
        
        document.querySelectorAll('.bg-preset-btn').forEach(btn => {
            const btnColor = btn.getAttribute('data-color');
            if (btnColor && btnColor.toLowerCase() === color.toLowerCase()) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        if (uploadedImages.length > 0) {
            renderPreview();
        }
    }

    if (photoBgColorPicker) {
        photoBgColorPicker.addEventListener('input', (e) => {
            setPhotoBgColor(e.target.value);
        });
    }

    document.querySelectorAll('.bg-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.getAttribute('data-color');
            if (color) setPhotoBgColor(color);
        });
    });

    // Photo Framing & Size Adjustment Listeners
    if (fitModeRadios) {
        fitModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                photoFitMode = e.target.value;
                if (uploadedImages.length > 0) renderPreview();
            });
        });
    }

    if (photoScaleSlider) {
        photoScaleSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            photoScale = val / 100;
            if (photoScaleVal) photoScaleVal.textContent = `${val}%`;
            if (uploadedImages.length > 0) renderPreview();
        });
    }

    if (photoOffsetSlider) {
        photoOffsetSlider.addEventListener('input', (e) => {
            photoOffsetY = parseInt(e.target.value);
            if (photoOffsetVal) {
                if (photoOffsetY === 0) photoOffsetVal.textContent = '0%';
                else if (photoOffsetY > 0) photoOffsetVal.textContent = `+${photoOffsetY}% (Down)`;
                else photoOffsetVal.textContent = `${photoOffsetY}% (Up)`;
            }
            if (uploadedImages.length > 0) renderPreview();
        });
    }

    // ==========================================================================
    // Studio AI Background Removal Engine & Live Controls
    // ==========================================================================
    let chosenAiModel = 'fast'; // 'fast' (MediaPipe HD - Instant & 100% Offline) or 'ultra' (RMBG-1.4)
    let cachedFloatMask = null;
    let bgFeather = 16;
    let bgEdgeShift = -1;
    let bgDefringe = true;

    // DOM Elements for AI Engine & Controls
    const modelUltraChip = document.getElementById('modelUltraChip');
    const modelFastChip = document.getElementById('modelFastChip');
    const aiModelStatusBox = document.getElementById('aiModelStatusBox');
    const aiModelStatusText = document.getElementById('aiModelStatusText');
    const aiModelPercentText = document.getElementById('aiModelPercentText');
    const aiProgressBar = document.getElementById('aiProgressBar');

    const bgFeatherSlider = document.getElementById('bgFeatherSlider');
    const bgFeatherVal = document.getElementById('bgFeatherVal');
    const bgEdgeShiftSlider = document.getElementById('bgEdgeShiftSlider');
    const bgEdgeShiftVal = document.getElementById('bgEdgeShiftVal');
    const bgDefringeToggle = document.getElementById('bgDefringeToggle');

    // Model Selector switcher
    if (modelUltraChip && modelFastChip) {
        modelUltraChip.addEventListener('click', () => {
            chosenAiModel = 'ultra';
            modelUltraChip.classList.add('active');
            modelFastChip.classList.remove('active');
            const r = modelUltraChip.querySelector('input[type="radio"]');
            if (r) r.checked = true;
            // Clear cache if user purposefully switches model
            cachedFloatMask = null;
        });

        modelFastChip.addEventListener('click', () => {
            chosenAiModel = 'fast';
            modelFastChip.classList.add('active');
            modelUltraChip.classList.remove('active');
            const r = modelFastChip.querySelector('input[type="radio"]');
            if (r) r.checked = true;
            // Clear cache if user purposefully switches model
            cachedFloatMask = null;
        });
    }

    // Instant real-time update using cached probability mask
    function updateLiveMatte() {
        if (!uploadedImages.length || !rawOriginalImage || !cachedFloatMask) return;
        const matte = window.MattingEngine.processMatte(rawOriginalImage, cachedFloatMask, {
            tolerance: bgTolerance,
            feather: bgFeather,
            edgeShift: bgEdgeShift,
            defringe: bgDefringe,
            fillHoles: true,
            useGuidedFilter: true
        });
        uploadedImages[0].image = matte.canvas;
        renderPreview();
        updateImageList();
    }

    if (autoRemoveBgBtn) {
        autoRemoveBgBtn.addEventListener('click', async () => {
            if (uploadedImages.length === 0) return;
            const target = uploadedImages[0];
            const sourceImg = rawOriginalImage || target.image;

            autoRemoveBgBtn.disabled = true;
            autoRemoveBgBtn.innerHTML = '<span>⏳ Processing AI Cutout...</span>';
            if (aiModelStatusBox) {
                aiModelStatusBox.style.display = 'block';
                if (aiModelStatusText) aiModelStatusText.textContent = 'Initializing AI model...';
                if (aiProgressBar) aiProgressBar.style.width = '15%';
                if (aiModelPercentText) aiModelPercentText.textContent = '';
            }

            try {
                if (!cachedFloatMask) {
                    if (chosenAiModel === 'ultra' && window.MattingEngine?.extractMaskUltra) {
                        try {
                            const res = await window.MattingEngine.extractMaskUltra(sourceImg, (prog) => {
                                if (!aiModelStatusBox) return;
                                if (prog.status === 'downloading' && prog.percent !== undefined) {
                                    if (aiModelStatusText) aiModelStatusText.textContent = 'Downloading Ultra AI weights...';
                                    if (aiProgressBar) aiProgressBar.style.width = `${prog.percent}%`;
                                    if (aiModelPercentText) aiModelPercentText.textContent = `${prog.percent}%`;
                                } else if (prog.status === 'processing') {
                                    if (aiModelStatusText) aiModelStatusText.textContent = 'Analyzing portrait contours...';
                                    if (aiProgressBar) aiProgressBar.style.width = '85%';
                                    if (aiModelPercentText) aiModelPercentText.textContent = '';
                                }
                            });
                            cachedFloatMask = res.floatMask;
                        } catch (ultraErr) {
                            console.warn('Ultra AI failed or offline, falling back to Fast AI:', ultraErr);
                            if (aiModelStatusText) aiModelStatusText.textContent = 'Switching to Fast Studio AI...';
                            const res = await window.MattingEngine.extractMaskFast(sourceImg);
                            cachedFloatMask = res.floatMask;
                        }
                    } else {
                        if (aiModelStatusText) aiModelStatusText.textContent = 'Running Fast Studio AI...';
                        if (aiProgressBar) aiProgressBar.style.width = '55%';
                        const res = await window.MattingEngine.extractMaskFast(sourceImg);
                        cachedFloatMask = res.floatMask;
                    }
                }

                if (aiModelStatusText) aiModelStatusText.textContent = 'Applying high-definition edge matting...';
                if (aiProgressBar) aiProgressBar.style.width = '100%';

                const matte = window.MattingEngine.processMatte(sourceImg, cachedFloatMask, {
                    tolerance: bgTolerance,
                    feather: bgFeather,
                    edgeShift: bgEdgeShift,
                    defringe: bgDefringe,
                    fillHoles: true,
                    useGuidedFilter: true
                });

                target.image = matte.canvas;
                autoRemoveBgBtn.innerHTML = '<span>✨ Background Removed</span>';
                if (resetBgBtn) resetBgBtn.style.display = 'inline-flex';
                if (bgToleranceBox) bgToleranceBox.style.display = 'block';
                renderPreview();
                updateImageList();

                setTimeout(() => {
                    if (aiModelStatusBox) aiModelStatusBox.style.display = 'none';
                }, 800);
            } catch (err) {
                console.error('AI background removal error:', err);
                alert('Background removal could not complete: ' + (err.message || err));
                autoRemoveBgBtn.innerHTML = '<span>🪄 Remove Background</span>';
                if (aiModelStatusBox) aiModelStatusBox.style.display = 'none';
            } finally {
                autoRemoveBgBtn.disabled = false;
            }
        });
    }

    if (resetBgBtn) {
        resetBgBtn.addEventListener('click', () => {
            if (uploadedImages.length === 0 || !rawOriginalImage) return;
            uploadedImages[0].image = rawOriginalImage;
            cachedFloatMask = null;
            resetBgBtn.style.display = 'none';
            if (bgToleranceBox) bgToleranceBox.style.display = 'none';
            if (autoRemoveBgBtn) autoRemoveBgBtn.innerHTML = '<span>🪄 Remove Background</span>';
            renderPreview();
            updateImageList();
        });
    }

    // Live Slider Events (Zero re-inference delay)
    if (bgToleranceSlider) {
        bgToleranceSlider.addEventListener('input', (e) => {
            bgTolerance = parseInt(e.target.value);
            if (bgToleranceVal) bgToleranceVal.textContent = bgTolerance;
            updateLiveMatte();
        });
    }

    if (bgFeatherSlider) {
        bgFeatherSlider.addEventListener('input', (e) => {
            bgFeather = parseInt(e.target.value);
            if (bgFeatherVal) bgFeatherVal.textContent = `${bgFeather}px`;
            updateLiveMatte();
        });
    }

    if (bgEdgeShiftSlider) {
        bgEdgeShiftSlider.addEventListener('input', (e) => {
            bgEdgeShift = parseInt(e.target.value);
            if (bgEdgeShiftVal) bgEdgeShiftVal.textContent = `${bgEdgeShift > 0 ? '+' : ''}${bgEdgeShift}px`;
            updateLiveMatte();
        });
    }

    if (bgDefringeToggle) {
        bgDefringeToggle.addEventListener('change', (e) => {
            bgDefringe = e.target.checked;
            updateLiveMatte();
        });
    }

    // Event listeners
    photoUpload.addEventListener('change', handleImageUpload);
    generateBtn.addEventListener('click', generatePDF);
    photoSizeSelect.addEventListener('change', handleSizeChange);
    customWidth.addEventListener('input', handleCustomSizeChange);
    customHeight.addEventListener('input', handleCustomSizeChange);
    if (photoSpacingSelect) {
        photoSpacingSelect.addEventListener('change', () => {
            const currentMmW = parseFloat(customWidth?.value) || 35;
            const currentMmH = parseFloat(customHeight?.value) || 45;
            updateSizeBadge(currentMmW, currentMmH);
            if (uploadedImages.length > 0) renderPreview();
        });
    }
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            printCanvas(canvas);
        });
    }

    // Professional High-Resolution Print Function
    function printCanvas(targetCanvas) {
        if (!targetCanvas || uploadedImages.length === 0) {
            alert('Please upload photos first before printing!');
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

    if (enableBorder) {
        enableBorder.addEventListener('change', () => {
            if (borderSubControls) {
                borderSubControls.style.display = enableBorder.checked ? 'block' : 'none';
            }
            if (uploadedImages.length > 0) {
                renderPreview();
            }
        });
    }

    if (borderWidthSelect) {
        borderWidthSelect.addEventListener('change', () => {
            if (uploadedImages.length > 0) {
                renderPreview();
            }
        });
    }

    if (enableCutLines) {
        enableCutLines.addEventListener('change', () => {
            if (cutLinesSubControls) {
                cutLinesSubControls.style.display = enableCutLines.checked ? 'block' : 'none';
            }
            if (uploadedImages.length > 0) {
                renderPreview();
            }
        });
    }

    if (cutLineStyleSelect) {
        cutLineStyleSelect.addEventListener('change', () => {
            if (uploadedImages.length > 0) {
                renderPreview();
            }
        });
    }

    // Helper function to convert mm to pixels
    function mmToPixels(mm) {
        return Math.round((mm / MM_TO_INCH) * DPI);
    }

    function getSpacing() {
        return photoSpacingSelect ? parseInt(photoSpacingSelect.value) : 30;
    }

    // Update Size Information Badge
    function updateSizeBadge(widthMm, heightMm) {
        const widthInches = (widthMm / MM_TO_INCH).toFixed(2);
        const heightInches = (heightMm / MM_TO_INCH).toFixed(2);
        const widthPx = mmToPixels(widthMm);
        const heightPx = mmToPixels(heightMm);
        
        const spacing = getSpacing();
        const availableW = A4_WIDTH - (2 * MARGIN);
        const availableH = A4_HEIGHT - (2 * MARGIN);
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

    // Handle photo size selection change
    function handleSizeChange() {
        const sizeValue = photoSizeSelect.value;
        
        if (sizeValue === 'custom') {
            customSizeInputs.style.display = 'block';
            handleCustomSizeChange();
        } else {
            customSizeInputs.style.display = 'none';
            
            const preset = PHOTO_PRESETS[sizeValue];
            if (preset) {
                PHOTO_WIDTH = mmToPixels(preset.width);
                PHOTO_HEIGHT = mmToPixels(preset.height);
                customWidth.value = preset.width;
                customHeight.value = preset.height;
                updateSizeBadge(preset.width, preset.height);
            }
            
            // Re-render preview if images exist
            if (uploadedImages.length > 0) {
                renderPreview();
            }
        }
    }

    // Handle custom size input changes
    function handleCustomSizeChange() {
        const width = parseFloat(customWidth.value) || 35;
        const height = parseFloat(customHeight.value) || 45;
        
        PHOTO_WIDTH = mmToPixels(width);
        PHOTO_HEIGHT = mmToPixels(height);
        
        updateSizeBadge(width, height);
        
        // Re-render preview if images exist
        if (uploadedImages.length > 0) {
            renderPreview();
        }
    }

    // Initialize badge on startup
    updateSizeBadge(35, 45);

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                rawOriginalImage = img;
                cachedFloatMask = null;
                if (resetBgBtn) resetBgBtn.style.display = 'none';
                if (bgToleranceBox) bgToleranceBox.style.display = 'none';
                if (autoRemoveBgBtn) autoRemoveBgBtn.innerHTML = '<span>🪄 Remove Background</span>';

                // Add new image to array with default count of 8
                uploadedImages.push({
                    image: img,
                    rawOriginal: img,
                    name: file.name,
                    count: 8
                });
                
                if (photoAdjustCard) photoAdjustCard.style.display = 'block';
                if (canvasEmptyState) canvasEmptyState.style.display = 'none';
                if (canvas) canvas.style.display = 'block';
                
                renderPreview();
                updateImageList();
                generateBtn.disabled = false;
                
                // Reset file input to allow same file upload again
                photoUpload.value = '';
            };
            img.onerror = function() {
                alert('Could not decode image. Please choose a valid image file.');
            };
            img.src = e.target.result;
        };
        reader.onerror = function() {
            alert('Failed to read selected image file.');
        };
        reader.readAsDataURL(file);
    }

    function loadPhotoFromDataUrl(dataUrl, fileName) {
        const img = new Image();
        img.onload = function() {
            rawOriginalImage = img;
            cachedFloatMask = null;
            if (resetBgBtn) resetBgBtn.style.display = 'none';
            if (bgToleranceBox) bgToleranceBox.style.display = 'none';
            if (autoRemoveBgBtn) autoRemoveBgBtn.innerHTML = '<span>🪄 Remove Background</span>';

            uploadedImages.push({
                image: img,
                rawOriginal: img,
                name: fileName || 'photo.jpg',
                count: 8
            });

            if (photoAdjustCard) photoAdjustCard.style.display = 'block';
            if (canvasEmptyState) canvasEmptyState.style.display = 'none';
            if (canvas) canvas.style.display = 'block';

            renderPreview();
            updateImageList();
            generateBtn.disabled = false;
        };
        img.onerror = function() {
            alert('Could not decode image from selected file.');
        };
        img.src = dataUrl;
    }

    function updateImageList() {
        let existingList = document.getElementById('imageList');
        if (!existingList) {
            existingList = document.createElement('div');
            existingList.id = 'imageList';
            existingList.className = 'image-list';
            document.querySelector('.upload-section').appendChild(existingList);
        }

        existingList.innerHTML = '<h4>Added Photos:</h4>';
        
        uploadedImages.forEach((item, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            
            // Create thumbnail canvas
            const thumbnail = document.createElement('canvas');
            thumbnail.className = 'image-thumbnail';
            thumbnail.width = 60;
            thumbnail.height = 60;
            const thumbCtx = thumbnail.getContext('2d');
            
            // Draw thumbnail
            const imgAspect = item.image.width / item.image.height;
            let thumbWidth, thumbHeight, offsetX = 0, offsetY = 0;
            
            if (imgAspect > 1) {
                thumbHeight = 60;
                thumbWidth = 60 * imgAspect;
                offsetX = -(thumbWidth - 60) / 2;
            } else {
                thumbWidth = 60;
                thumbHeight = 60 / imgAspect;
                offsetY = -(thumbHeight - 60) / 2;
            }
            
            thumbCtx.drawImage(item.image, offsetX, offsetY, thumbWidth, thumbHeight);
            
            imageItem.innerHTML = `
                <span class="image-name">${index + 1}. ${item.name}</span>
                <input type="number" class="image-count" data-index="${index}" value="${item.count}" min="1" max="30" />
                <button class="remove-btn" data-index="${index}">Remove</button>
            `;
            
            // Insert thumbnail at the beginning
            imageItem.insertBefore(thumbnail, imageItem.firstChild);
            
            existingList.appendChild(imageItem);
        });

        // Add event listeners to count inputs and remove buttons
        document.querySelectorAll('.image-count').forEach(input => {
            input.addEventListener('input', handleCountChange);
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', handleRemoveImage);
        });
    }

    function handleCountChange(event) {
        const index = parseInt(event.target.dataset.index);
        const newCount = parseInt(event.target.value) || 1;
        uploadedImages[index].count = newCount;
        renderPreview();
    }

    function handleRemoveImage(event) {
        const index = parseInt(event.target.dataset.index);
        uploadedImages.splice(index, 1);
        
        if (uploadedImages.length === 0) {
            generateBtn.disabled = true;
            generateBtn.style.display = 'none';
            printBtn.style.display = 'none';
            const imageList = document.getElementById('imageList');
            if (imageList) imageList.remove();
            if (photoAdjustCard) photoAdjustCard.style.display = 'none';
            if (canvasEmptyState) canvasEmptyState.style.display = 'block';
            if (canvas) canvas.style.display = 'none';
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);
        } else {
            updateImageList();
            renderPreview();
        }
    }

    function renderPreview() {
        if (uploadedImages.length === 0) {
            printBtn.style.display = 'none';
            generateBtn.style.display = 'none';
            if (canvasEmptyState) canvasEmptyState.style.display = 'block';
            if (canvas) canvas.style.display = 'none';
            return;
        }

        if (canvasEmptyState) canvasEmptyState.style.display = 'none';
        if (canvas) canvas.style.display = 'block';

        // Show print and generate buttons
        printBtn.style.display = 'inline-flex';
        generateBtn.style.display = 'inline-flex';

        // Clear canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

        const currentSpacing = getSpacing();

        // Calculate how many photos fit per row and column
        const availableWidth = A4_WIDTH - (2 * MARGIN);
        const availableHeight = A4_HEIGHT - (2 * MARGIN);
        
        const photosPerRow = Math.max(1, Math.floor((availableWidth + currentSpacing) / (PHOTO_WIDTH + currentSpacing)));
        const photosPerCol = Math.max(1, Math.floor((availableHeight + currentSpacing) / (PHOTO_HEIGHT + currentSpacing)));
        
        let currentImageIndex = 0;
        let currentImageCount = 0;
        let totalRendered = 0;

        for (let row = 0; row < photosPerCol; row++) {
            for (let col = 0; col < photosPerRow; col++) {
                if (currentImageIndex >= uploadedImages.length) break;

                const x = MARGIN + col * (PHOTO_WIDTH + currentSpacing);
                const y = MARGIN + row * (PHOTO_HEIGHT + currentSpacing);

                const currentItem = uploadedImages[currentImageIndex];

                // Draw photo without cropping or zooming - show entire original
                drawPhoto(currentItem.image, x, y, PHOTO_WIDTH, PHOTO_HEIGHT);

                currentImageCount++;
                totalRendered++;
                
                // Move to next image if current count is reached
                if (currentImageCount >= currentItem.count) {
                    currentImageIndex++;
                    currentImageCount = 0;
                }
            }
            if (currentImageIndex >= uploadedImages.length) break;
        }

        // Draw Scissor Cutting Guide Lines if enabled
        const hasCutLines = enableCutLines ? enableCutLines.checked : true;
        if (hasCutLines && totalRendered > 0) {
            const colsUsed = Math.min(totalRendered, photosPerRow);
            const rowsUsed = Math.ceil(totalRendered / photosPerRow);
            const cutStyle = cutLineStyleSelect ? cutLineStyleSelect.value : 'dashed';
            drawCuttingGuides(ctx, {
                margin: MARGIN,
                spacing: currentSpacing,
                photoWidth: PHOTO_WIDTH,
                photoHeight: PHOTO_HEIGHT,
                colsUsed: colsUsed,
                rowsUsed: rowsUsed,
                style: cutStyle,
                color: '#333333',
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

    function drawPhoto(img, x, y, width, height) {
        const imgAspect = img.width / img.height;
        const boxAspect = width / height;

        let baseWidth, baseHeight;
        if (photoFitMode === 'cover') {
            // Fill mode: fill the entire passport box
            if (imgAspect > boxAspect) {
                baseHeight = height;
                baseWidth = height * imgAspect;
            } else {
                baseWidth = width;
                baseHeight = width / imgAspect;
            }
        } else {
            // Contain mode: fit the entire original image inside box
            if (imgAspect > boxAspect) {
                baseWidth = width;
                baseHeight = width / imgAspect;
            } else {
                baseHeight = height;
                baseWidth = height * imgAspect;
            }
        }

        const scale = photoScale || 1.0;
        const drawWidth = baseWidth * scale;
        const drawHeight = baseHeight * scale;
        const offsetX = (width - drawWidth) / 2;
        const offsetY = (height - drawHeight) / 2 + (photoOffsetY || 0) * (height / 100);

        // Fill background with chosen background color (default White, Light Blue, or Sky Blue)
        ctx.fillStyle = photoBgColor || '#FFFFFF';
        ctx.fillRect(x, y, width, height);

        // Draw image clipped inside photo box so zoom/scale doesn't bleed outside
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();
        ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
        ctx.restore();

        // Draw black border around passport photo if enabled
        const hasBorder = enableBorder ? enableBorder.checked : true;
        if (hasBorder) {
            const bWidth = borderWidthSelect ? parseInt(borderWidthSelect.value) : 3;
            ctx.save();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = bWidth;
            ctx.strokeRect(x + bWidth / 2, y + bWidth / 2, width - bWidth, height - bWidth);
            ctx.restore();
        }
    }

    function generatePDF() {
        if (uploadedImages.length === 0) {
            alert('Please upload at least one photo!');
            return;
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Convert canvas to image
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        // Add image to PDF (A4 size: 210mm x 297mm)
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        
        // Save PDF
        const timestamp = new Date().toISOString().slice(0, 10);
        pdf.save(`passport-photos-${timestamp}.pdf`);
    }

    // Initial state
    generateBtn.disabled = true;

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