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

    // A4 dimensions in pixels at 300 DPI
    const A4_WIDTH = 2480;
    const A4_HEIGHT = 3508;
    
    const MARGIN = 60;
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

    // Dynamic photo dimensions (will be updated based on selection)
    let PHOTO_WIDTH = mmToPixels(35);   // Default 35mm at 300 DPI
    let PHOTO_HEIGHT = mmToPixels(45);  // Default 45mm at 300 DPI

    let uploadedImages = []; // Array to store multiple images

    // DOM elements
    const photoUpload = document.getElementById('photoUpload');
    const photoSizeSelect = document.getElementById('photoSize');
    const customSizeInputs = document.getElementById('customSizeInputs');
    const customWidth = document.getElementById('customWidth');
    const customHeight = document.getElementById('customHeight');
    const photoSpacingSelect = document.getElementById('photoSpacingSelect');
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
                // Add new image to array with default count of 8
                uploadedImages.push({
                    image: img,
                    name: file.name,
                    count: 8
                });
                
                renderPreview();
                updateImageList();
                generateBtn.disabled = false;
                
                // Reset file input to allow same file upload again
                photoUpload.value = '';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
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
            return;
        }

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
        // Calculate scaling to fit entire image within the box (contain mode)
        const imgAspect = img.width / img.height;
        const boxAspect = width / height;

        let drawWidth, drawHeight, offsetX, offsetY;

        // Scale to fit the entire image without cropping
        if (imgAspect > boxAspect) {
            // Image is wider - fit by width
            drawWidth = width;
            drawHeight = width / imgAspect;
            offsetX = 0;
            offsetY = (height - drawHeight) / 2;
        } else {
            // Image is taller - fit by height
            drawHeight = height;
            drawWidth = height * imgAspect;
            offsetX = (width - drawWidth) / 2;
            offsetY = 0;
        }

        // Fill background with white in case image doesn't fill the box
        ctx.fillStyle = 'white';
        ctx.fillRect(x, y, width, height);

        // Draw the entire image without clipping - no zoom, no crop
        ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);

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