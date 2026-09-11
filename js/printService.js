/**
 * Parichiti Studios - Simple Browser Photo Print Service
 * 
 * Implements a clean, driver-aware image preparation pipeline for direct photo printing:
 * - Standard Quality: 150 DPI web density, medium smoothing
 * - High Quality: 300 DPI photo density, high bicubic smoothing
 * - Best Photo Quality: Full original master resolution, lossless PNG buffer, micro-contrast enhancement
 */

(function() {
    'use strict';

    // DOM Elements
    const printDropzone = document.getElementById('printDropzone');
    const printPhotoInput = document.getElementById('printPhotoInput');
    const printPhotoContent = document.getElementById('printPhotoContent');
    const previewImageElement = document.getElementById('previewImageElement');
    const changePhotoBtn = document.getElementById('changePhotoBtn');
    const photoDimensionText = document.getElementById('photoDimensionText');
    const photoQualityRenderText = document.getElementById('photoQualityRenderText');
    const startPrintBtn = document.getElementById('startPrintBtn');
    const printTarget = document.getElementById('printTarget');
    const printTargetImage = document.getElementById('printTargetImage');
    const qualityCards = document.querySelectorAll('.quality-option-card');
    const qualityRadios = document.querySelectorAll('input[name="printQualityChoice"]');
    const themeToggle = document.getElementById('themeToggle');

    // State
    let loadedImage = null;
    let selectedQuality = 'high'; // 'standard', 'high', 'best'

    // Dark Mode Support
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeToggle) themeToggle.querySelector('.theme-icon').textContent = '☀️';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeToggle.querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
        });
    }

    // Windows Desktop App Integration
    if (window.electronAPI && window.electronAPI.isElectron) {
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
                                const img = new Image();
                                img.onload = () => handlePhotoLoaded(img);
                                img.src = fileInfo.dataUrl;
                            }
                        });
                    } else if (printPhotoInput) {
                        printPhotoInput.click();
                    }
                } else if (action === 'print-sheet') {
                    if (startPrintBtn) startPrintBtn.click();
                }
            });
        }
    }

    // Dropzone & File Input Listeners
    if (printDropzone && printPhotoInput) {
        printDropzone.addEventListener('click', (e) => {
            if (e.target !== printPhotoInput) {
                printPhotoInput.click();
            }
        });

        printDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            printDropzone.classList.add('dragover');
        });

        printDropzone.addEventListener('dragleave', () => {
            printDropzone.classList.remove('dragover');
        });

        printDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            printDropzone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processPhotoFile(e.dataTransfer.files[0]);
            }
        });

        printPhotoInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                processPhotoFile(e.target.files[0]);
            }
        });
    }

    if (changePhotoBtn && printPhotoInput) {
        changePhotoBtn.addEventListener('click', () => printPhotoInput.click());
    }

    // Process uploaded photo
    function processPhotoFile(file) {
        if (!file) return;

        const isImageMime = file.type && file.type.startsWith('image/');
        const isImageExt = /\.(jpe?g|png|webp|bmp|gif|avif|tiff?)$/i.test(file.name || '');
        if (!isImageMime && !isImageExt) {
            alert('Please select a valid image file (JPG, PNG, WebP).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                loadedImage = img;
                previewImageElement.src = e.target.result;
                printPhotoContent.style.display = 'block';
                printDropzone.style.display = 'none';

                updateMetaBadges();
                printPhotoInput.value = '';
            };
            img.onerror = () => {
                alert('Could not decode the selected image file. Please choose another image.');
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            alert('Could not read the selected file.');
        };
        reader.readAsDataURL(file);
    }

    // Quality Option Change Listeners
    qualityRadios.forEach((radio) => {
        radio.addEventListener('change', (e) => {
            selectedQuality = e.target.value;

            qualityCards.forEach((card) => {
                const cardRadio = card.querySelector('input[type="radio"]');
                if (cardRadio && cardRadio.checked) {
                    card.classList.add('active');
                } else {
                    card.classList.remove('active');
                }
            });

            updateMetaBadges();
        });
    });

    // Update image resolution & DPI badge
    function updateMetaBadges() {
        if (!loadedImage) return;
        const w = loadedImage.naturalWidth || loadedImage.width;
        const h = loadedImage.naturalHeight || loadedImage.height;

        photoDimensionText.textContent = `Original Resolution: ${w} × ${h} px`;

        if (selectedQuality === 'standard') {
            photoQualityRenderText.textContent = `Render Mode: Standard Density (150 DPI Proofing)`;
        } else if (selectedQuality === 'high') {
            photoQualityRenderText.textContent = `Render Mode: High Density (300 DPI Photo)`;
        } else if (selectedQuality === 'best') {
            photoQualityRenderText.textContent = `Render Mode: Best Photo Quality (${w}×${h} Full Lossless Master)`;
        }
    }

    // Prepare Optimized Raster for Print
    function preparePrintRaster(image, quality) {
        const srcW = image.naturalWidth || image.width;
        const srcH = image.naturalHeight || image.height;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (quality === 'standard') {
            // Standard Quality: 150 DPI Target (max bounds ~1600px)
            const maxDim = 1600;
            let targetW = srcW;
            let targetH = srcH;
            if (srcW > maxDim || srcH > maxDim) {
                if (srcW > srcH) {
                    targetW = maxDim;
                    targetH = Math.round(srcH * (maxDim / srcW));
                } else {
                    targetH = maxDim;
                    targetW = Math.round(srcW * (maxDim / srcH));
                }
            }
            canvas.width = targetW;
            canvas.height = targetH;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'medium';
            ctx.drawImage(image, 0, 0, targetW, targetH);
            return {
                dataUrl: canvas.toDataURL('image/jpeg', 0.88),
                renderClass: 'print-render-standard'
            };
        } else if (quality === 'high') {
            // High Quality: 300 DPI Target (max bounds ~3200px)
            const maxDim = 3200;
            let targetW = srcW;
            let targetH = srcH;
            if (srcW > maxDim || srcH > maxDim) {
                if (srcW > srcH) {
                    targetW = maxDim;
                    targetH = Math.round(srcH * (maxDim / srcW));
                } else {
                    targetH = maxDim;
                    targetW = Math.round(srcW * (maxDim / srcH));
                }
            }
            canvas.width = targetW;
            canvas.height = targetH;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(image, 0, 0, targetW, targetH);
            return {
                dataUrl: canvas.toDataURL('image/png'),
                renderClass: 'print-render-high'
            };
        } else {
            // Best Photo Quality: Full Original Master Resolution, Lossless, Micro-Contrast
            canvas.width = srcW;
            canvas.height = srcH;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Subtle color saturation & contrast calibration for photographic print
            ctx.filter = 'contrast(101%) saturate(102%)';
            ctx.drawImage(image, 0, 0, srcW, srcH);
            ctx.filter = 'none';

            return {
                dataUrl: canvas.toDataURL('image/png'),
                renderClass: 'print-render-best'
            };
        }
    }

    // Print Button Action
    if (startPrintBtn) {
        startPrintBtn.addEventListener('click', () => {
            if (!loadedImage) {
                alert('Please choose a photo to print.');
                return;
            }

            startPrintBtn.disabled = true;
            startPrintBtn.innerHTML = '<span>⏳ Preparing Print Data...</span>';

            setTimeout(() => {
                try {
                    const { dataUrl, renderClass } = preparePrintRaster(loadedImage, selectedQuality);

                    printTargetImage.src = dataUrl;
                    printTargetImage.className = renderClass;

                    // Allow browser rendering to settle before opening print dialog
                    printTargetImage.onload = () => {
                        startPrintBtn.disabled = false;
                        startPrintBtn.innerHTML = '<span>🖨️ Print Photo</span>';

                        // Invoke browser print dialog
                        window.print();
                    };

                    // Fallback in case onload is instantaneous
                    setTimeout(() => {
                        if (startPrintBtn.disabled) {
                            startPrintBtn.disabled = false;
                            startPrintBtn.innerHTML = '<span>🖨️ Print Photo</span>';
                            window.print();
                        }
                    }, 300);
                } catch (err) {
                    console.error('Print preparation error:', err);
                    alert('Could not prepare photo for print: ' + (err.message || err));
                    startPrintBtn.disabled = false;
                    startPrintBtn.innerHTML = '<span>🖨️ Print Photo</span>';
                }
            }, 100);
        });
    }

})();
