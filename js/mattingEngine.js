/**
 * Parichiti Studios - Advanced Matting & Background Removal Engine
 * 
 * Capabilities:
 * 1. Dual AI Model Support:
 *    - Ultra Studio AI: State-of-the-art RMBG-1.4 (1024×1024 high-definition neural segmentation)
 *    - Fast Studio AI: High-speed local MediaPipe HD with offline capability
 * 2. Fast Guided Filter:
 *    - High-resolution edge snapping (aligns mask boundaries to hair strands, skin, clothing)
 * 3. Morphological Torso & Clothing Hole-Filling:
 *    - Eliminates false transparent gaps in dark suits, ties, and hair shadows
 * 4. Smart Color Decontamination (Anti-Halo / Defringing):
 *    - Removes wall color bleeding from edge pixels so cutouts on white/blue look seamless
 * 5. Real-Time Interactive Edge Refinement:
 *    - Instant tolerance, edge trim (erode/dilate), and softness tuning without re-inferencing
 */

(function(window) {
    'use strict';

    // --------------------------------------------------------------------------
    // 1. Fast Guided Filter (He & Sun, 2015)
    // --------------------------------------------------------------------------
    /**
     * Fast Guided Filter for edge-preserving mask refinement.
     * Aligns low-res or neural mask probabilities with high-resolution RGB edges.
     * 
     * @param {Uint8ClampedArray} guideRgba - Full-res RGBA image data
     * @param {Float32Array} maskP - Normalized mask values [0.0 - 1.0]
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} radius - Filter window radius (default ~8-12)
     * @param {number} eps - Regularization epsilon (default 0.01)
     * @param {number} subsample - Subsampling scale for speed (default 2)
     * @returns {Float32Array} Refined mask [0.0 - 1.0]
     */
    function fastGuidedFilter(guideRgba, maskP, width, height, radius = 8, eps = 0.005, subsample = 2) {
        const sw = Math.max(1, Math.floor(width / subsample));
        const sh = Math.max(1, Math.floor(height / subsample));
        const sRadius = Math.max(1, Math.round(radius / subsample));
        const sSize = sw * sh;

        // 1. Convert guidance to grayscale and subsample guide & mask
        const subGuide = new Float32Array(sSize);
        const subMask = new Float32Array(sSize);

        for (let sy = 0; sy < sh; sy++) {
            const gy = Math.min(height - 1, sy * subsample);
            const rowOffsetG = gy * width;
            const rowOffsetS = sy * sw;

            for (let sx = 0; sx < sw; sx++) {
                const gx = Math.min(width - 1, sx * subsample);
                const gIdx = (rowOffsetG + gx) * 4;
                // Luminance (0.0 - 1.0)
                subGuide[rowOffsetS + sx] = (guideRgba[gIdx] * 0.299 + guideRgba[gIdx + 1] * 0.587 + guideRgba[gIdx + 2] * 0.114) / 255.0;
                subMask[rowOffsetS + sx] = maskP[rowOffsetG + gx];
            }
        }

        // Helper: 2D Box Filter (O(N) using running window)
        function boxFilter(src, w, h, r) {
            const dst = new Float32Array(w * h);
            const temp = new Float32Array(w * h);

            // Horizontal pass
            for (let y = 0; y < h; y++) {
                const yOff = y * w;
                let sum = 0;
                for (let x = 0; x <= r; x++) {
                    sum += src[yOff + Math.min(w - 1, x)];
                }
                for (let x = 0; x < r; x++) {
                    sum += src[yOff + 0];
                }

                for (let x = 0; x < w; x++) {
                    const left = Math.max(0, x - r - 1);
                    const right = Math.min(w - 1, x + r);
                    if (x > 0) {
                        sum += src[yOff + right] - src[yOff + left];
                    }
                    const count = Math.min(w - 1, x + r) - Math.max(0, x - r) + 1;
                    temp[yOff + x] = sum / count;
                }
            }

            // Vertical pass
            for (let x = 0; x < w; x++) {
                let sum = 0;
                for (let y = 0; y <= r; y++) {
                    sum += temp[Math.min(h - 1, y) * w + x];
                }
                for (let y = 0; y < r; y++) {
                    sum += temp[0 + x];
                }

                for (let y = 0; y < h; y++) {
                    const top = Math.max(0, y - r - 1);
                    const btm = Math.min(h - 1, y + r);
                    if (y > 0) {
                        sum += temp[btm * w + x] - temp[top * w + x];
                    }
                    const count = Math.min(h - 1, y + r) - Math.max(0, y - r) + 1;
                    dst[y * w + x] = sum / count;
                }
            }

            return dst;
        }

        // 2. Mean matrices on subsampled grid
        const meanI = boxFilter(subGuide, sw, sh, sRadius);
        const meanP = boxFilter(subMask, sw, sh, sRadius);

        const subII = new Float32Array(sSize);
        const subIP = new Float32Array(sSize);
        for (let i = 0; i < sSize; i++) {
            subII[i] = subGuide[i] * subGuide[i];
            subIP[i] = subGuide[i] * subMask[i];
        }

        const corrI = boxFilter(subII, sw, sh, sRadius);
        const corrIP = boxFilter(subIP, sw, sh, sRadius);

        // 3. Covariance and linear coefficients a & b
        const a = new Float32Array(sSize);
        const b = new Float32Array(sSize);

        for (let i = 0; i < sSize; i++) {
            const varI = corrI[i] - meanI[i] * meanI[i];
            const covIP = corrIP[i] - meanI[i] * meanP[i];
            a[i] = covIP / (varI + eps);
            b[i] = meanP[i] - a[i] * meanI[i];
        }

        const meanA = boxFilter(a, sw, sh, sRadius);
        const meanB = boxFilter(b, sw, sh, sRadius);

        // 4. Upsample coefficients to full resolution and compute output q = meanA * I + meanB
        const refined = new Float32Array(width * height);

        for (let y = 0; y < height; y++) {
            const sy = Math.min(sh - 1, Math.floor(y / subsample));
            const yOffset = y * width;
            const syOffset = sy * sw;

            for (let x = 0; x < width; x++) {
                const sx = Math.min(sw - 1, Math.floor(x / subsample));
                const gIdx = (yOffset + x) * 4;
                const fullLuma = (guideRgba[gIdx] * 0.299 + guideRgba[gIdx + 1] * 0.587 + guideRgba[gIdx + 2] * 0.114) / 255.0;

                const ma = meanA[syOffset + sx];
                const mb = meanB[syOffset + sx];
                let q = ma * fullLuma + mb;
                if (q < 0) q = 0;
                if (q > 1) q = 1;
                refined[yOffset + x] = q;
            }
        }

        return refined;
    }

    // --------------------------------------------------------------------------
    // 2. Morphological Hole-Filling & Torso Continuity
    // --------------------------------------------------------------------------
    /**
     * Fills artificial internal holes in dark clothing (suits, ties, shadows)
     * by flood-filling outside background borders and preserving enclosed foreground.
     */
    function fillForegroundHoles(mask, width, height, bgThreshold = 0.25) {
        const size = width * height;
        const isExternalBg = new Uint8Array(size);
        const queueX = new Int32Array(size);
        const queueY = new Int32Array(size);
        let head = 0;
        let tail = 0;

        // Seed with the 4 image borders (which are almost always background)
        for (let x = 0; x < width; x++) {
            // Top border
            if (mask[x] < bgThreshold) {
                isExternalBg[x] = 1;
                queueX[tail] = x;
                queueY[tail] = 0;
                tail++;
            }
            // Bottom corners
            const bIdx = (height - 1) * width + x;
            if (mask[bIdx] < bgThreshold && (x < width * 0.2 || x > width * 0.8)) {
                isExternalBg[bIdx] = 1;
                queueX[tail] = x;
                queueY[tail] = height - 1;
                tail++;
            }
        }

        for (let y = 0; y < height; y++) {
            // Left & right border
            const lIdx = y * width;
            const rIdx = y * width + (width - 1);
            if (mask[lIdx] < bgThreshold) {
                isExternalBg[lIdx] = 1;
                queueX[tail] = 0;
                queueY[tail] = y;
                tail++;
            }
            if (mask[rIdx] < bgThreshold) {
                isExternalBg[rIdx] = 1;
                queueX[tail] = width - 1;
                queueY[tail] = y;
                tail++;
            }
        }

        // BFS flood fill external background
        while (head < tail) {
            const cx = queueX[head];
            const cy = queueY[head];
            head++;

            const neighbors = [
                cx - 1, cy,
                cx + 1, cy,
                cx, cy - 1,
                cx, cy + 1
            ];

            for (let n = 0; n < 8; n += 2) {
                const nx = neighbors[n];
                const ny = neighbors[n + 1];

                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nIdx = ny * width + nx;
                    if (!isExternalBg[nIdx] && mask[nIdx] < bgThreshold) {
                        isExternalBg[nIdx] = 1;
                        queueX[tail] = nx;
                        queueY[tail] = ny;
                        tail++;
                    }
                }
            }
        }

        // Any pixel that is NOT reachable from the external background and is inside
        // the core portrait area (e.g., lower torso/chest/hair) should have solid alpha
        const result = new Float32Array(size);
        result.set(mask);

        const centerY = height * 0.5;
        const centerX = width * 0.5;

        for (let y = 0; y < height; y++) {
            const yOff = y * width;
            for (let x = 0; x < width; x++) {
                const idx = yOff + x;
                // If it was NOT reached by the outer flood-fill, it is enclosed inside the body
                if (!isExternalBg[idx]) {
                    // Internal region: boost confidence to prevent see-through holes in dark jackets
                    if (result[idx] < 0.85) {
                        const distX = Math.abs(x - centerX) / width;
                        if (distX < 0.45 && y > height * 0.15) {
                            // Smoothly boost internal holes
                            result[idx] = Math.max(result[idx], 0.95);
                        }
                    }
                }
            }
        }

        return result;
    }

    // --------------------------------------------------------------------------
    // 3. Smart Color Decontamination (Anti-Halo / Defringing)
    // --------------------------------------------------------------------------
    /**
     * Eliminates wall color bleed from boundary pixels so the subject
     * looks seamlessly integrated when composited onto white or light-blue canvas.
     */
    function decontaminateFringe(pixels, alphaMap, width, height, defringeStrength = 0.8) {
        if (defringeStrength <= 0) return;

        // Sample background color from boundary pixels where alpha is close to zero
        let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
        const step = Math.max(1, Math.floor(width / 60));

        // Sample top, left, right, and corners
        for (let x = 0; x < width; x += step) {
            // Top border
            const iTop = x * 4;
            if (alphaMap[x] < 0.15) {
                bgR += pixels[iTop];
                bgG += pixels[iTop + 1];
                bgB += pixels[iTop + 2];
                bgCount++;
            }
            // Bottom border
            const bIdx = ((height - 1) * width + x);
            if (alphaMap[bIdx] < 0.15) {
                const iBtm = bIdx * 4;
                bgR += pixels[iBtm];
                bgG += pixels[iBtm + 1];
                bgB += pixels[iBtm + 2];
                bgCount++;
            }
        }

        for (let y = 0; y < height; y += step) {
            // Left border
            const lIdx = y * width;
            if (alphaMap[lIdx] < 0.15) {
                const iL = lIdx * 4;
                bgR += pixels[iL];
                bgG += pixels[iL + 1];
                bgB += pixels[iL + 2];
                bgCount++;
            }
            // Right border
            const rIdx = y * width + (width - 1);
            if (alphaMap[rIdx] < 0.15) {
                const iR = rIdx * 4;
                bgR += pixels[iR];
                bgG += pixels[iR + 1];
                bgB += pixels[iR + 2];
                bgCount++;
            }
        }

        if (bgCount > 0) {
            bgR /= bgCount;
            bgG /= bgCount;
            bgB /= bgCount;
        } else {
            // Fallback to top-left pixel
            bgR = pixels[0];
            bgG = pixels[1];
            bgB = pixels[2];
        }

        // Decontaminate edge pixels with intermediate alpha (0.04 - 0.94)
        const strength = Math.min(1.0, Math.max(0.1, defringeStrength));

        for (let i = 0; i < alphaMap.length; i++) {
            const alpha = alphaMap[i];
            if (alpha > 0.04 && alpha < 0.94) {
                const pxIdx = i * 4;
                const r = pixels[pxIdx];
                const g = pixels[pxIdx + 1];
                const b = pixels[pxIdx + 2];

                // Photoshop-style color recovery:
                // Subtract background color bleeding from hair/skin edges
                const factor = (1.0 - alpha) * strength;
                const cleanR = (r - factor * bgR) / Math.max(0.15, 1.0 - factor);
                const cleanG = (g - factor * bgG) / Math.max(0.15, 1.0 - factor);
                const cleanB = (b - factor * bgB) / Math.max(0.15, 1.0 - factor);

                pixels[pxIdx] = Math.min(255, Math.max(0, Math.round(cleanR)));
                pixels[pxIdx + 1] = Math.min(255, Math.max(0, Math.round(cleanG)));
                pixels[pxIdx + 2] = Math.min(255, Math.max(0, Math.round(cleanB)));
            }
        }
    }

    // --------------------------------------------------------------------------
    // 4. Edge Shift (Sub-pixel Trim / Erode / Dilate)
    // --------------------------------------------------------------------------
    function applyEdgeShift(mask, width, height, shiftPx) {
        if (!shiftPx || Math.abs(shiftPx) < 0.2) return mask;

        const radius = Math.round(Math.abs(shiftPx));
        const isErode = shiftPx < 0; // Negative = trim/contract inward
        const size = width * height;
        const temp = new Float32Array(size);
        const result = new Float32Array(size);

        // Horizontal 1D min/max filter
        for (let y = 0; y < height; y++) {
            const yOff = y * width;
            for (let x = 0; x < width; x++) {
                let val = mask[yOff + x];
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = Math.min(width - 1, Math.max(0, x + dx));
                    const nVal = mask[yOff + nx];
                    val = isErode ? Math.min(val, nVal) : Math.max(val, nVal);
                }
                temp[yOff + x] = val;
            }
        }

        // Vertical 1D min/max filter
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                let val = temp[y * width + x];
                for (let dy = -radius; dy <= radius; dy++) {
                    const ny = Math.min(height - 1, Math.max(0, y + dy));
                    const nVal = temp[ny * width + x];
                    val = isErode ? Math.min(val, nVal) : Math.max(val, nVal);
                }
                result[y * width + x] = val;
            }
        }

        return result;
    }

    // --------------------------------------------------------------------------
    // 5. Dual Neural Segmenters: Ultra AI (RMBG-1.4) & Fast AI (MediaPipe HD)
    // --------------------------------------------------------------------------
    let ultraPipeline = null;
    let ultraLoadingPromise = null;
    let mediaPipeSegmenter = null;

    /**
     * Loads the Ultra AI (RMBG-1.4 via @huggingface/transformers)
     */
    async function getUltraAiSegmenter(progressCallback) {
        if (ultraPipeline) return ultraPipeline;
        if (ultraLoadingPromise) return ultraLoadingPromise;

        ultraLoadingPromise = (async () => {
            try {
                // Dynamically load Hugging Face Transformers module from CDN
                const moduleUrl = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3';
                const { pipeline, env } = await import(/* webpackIgnore: true */ moduleUrl);

                // Configure cache & backend
                if (env) {
                    env.allowLocalModels = false;
                    if (env.backends && env.backends.onnx) {
                        env.backends.onnx.wasm = env.backends.onnx.wasm || {};
                        env.backends.onnx.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2);
                    }
                }

                if (progressCallback) progressCallback({ status: 'init', message: 'Connecting to Ultra AI neural model...' });

                const pipe = await pipeline('image-segmentation', 'briaai/RMBG-1.4', {
                    progress_callback: (prog) => {
                        if (progressCallback && prog) {
                            if (prog.status === 'progress' && prog.total) {
                                const pct = Math.round((prog.loaded / prog.total) * 100);
                                progressCallback({ status: 'downloading', percent: pct, file: prog.file });
                            } else if (prog.status === 'done') {
                                progressCallback({ status: 'ready', message: 'Ultra AI ready!' });
                            }
                        }
                    }
                });

                ultraPipeline = pipe;
                return pipe;
            } catch (err) {
                ultraLoadingPromise = null;
                throw err;
            }
        })();

        return ultraLoadingPromise;
    }

    /**
     * Loads the Fast AI (Google MediaPipe Selfie Segmentation)
     */
    function getFastAiSegmenter() {
        if (mediaPipeSegmenter) return Promise.resolve(mediaPipeSegmenter);
        if (typeof SelfieSegmentation === 'undefined') {
            return Promise.reject(new Error('MediaPipe SelfieSegmentation library not loaded'));
        }

        return new Promise((resolve, reject) => {
            try {
                const segmenter = new SelfieSegmentation({
                    locateFile: (file) => {
                        if (window.electronAPI || window.location.protocol !== 'file:') {
                            return `./lib/mediapipe/${file}`;
                        }
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
                    }
                });

                segmenter.setOptions({
                    modelSelection: 1 // High accuracy portrait mode
                });

                mediaPipeSegmenter = segmenter;
                resolve(segmenter);
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Extracts raw probability mask using Ultra AI (RMBG-1.4)
     */
    async function extractMaskUltra(sourceCanvasOrImg, progressCallback) {
        const pipe = await getUltraAiSegmenter(progressCallback);
        const w = sourceCanvasOrImg.naturalWidth || sourceCanvasOrImg.width;
        const h = sourceCanvasOrImg.naturalHeight || sourceCanvasOrImg.height;

        let inputSource = sourceCanvasOrImg;
        if (sourceCanvasOrImg instanceof HTMLCanvasElement) {
            inputSource = sourceCanvasOrImg.toDataURL('image/png');
        } else if (sourceCanvasOrImg instanceof HTMLImageElement && !sourceCanvasOrImg.src.startsWith('data:') && !sourceCanvasOrImg.src.startsWith('blob:')) {
            const tCanvas = document.createElement('canvas');
            tCanvas.width = w;
            tCanvas.height = h;
            tCanvas.getContext('2d').drawImage(sourceCanvasOrImg, 0, 0);
            inputSource = tCanvas.toDataURL('image/png');
        }

        if (progressCallback) progressCallback({ status: 'processing', message: 'Analyzing portrait contours...' });
        const result = await pipe(inputSource);
        const maskObj = Array.isArray(result) ? result[0] : result;
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = w;
        maskCanvas.height = h;
        const mCtx = maskCanvas.getContext('2d');

        if (maskObj && maskObj.mask) {
            if (typeof maskObj.mask.toCanvas === 'function') {
                const c = maskObj.mask.toCanvas();
                mCtx.drawImage(c, 0, 0, w, h);
            } else {
                mCtx.drawImage(maskObj.mask, 0, 0, w, h);
            }
        } else if (maskObj instanceof HTMLCanvasElement || maskObj instanceof Image) {
            mCtx.drawImage(maskObj, 0, 0, w, h);
        } else {
            throw new Error('Unexpected output format from Ultra AI model');
        }

        const imgData = mCtx.getImageData(0, 0, w, h);
        const floatMask = new Float32Array(w * h);
        for (let i = 0; i < floatMask.length; i++) {
            floatMask[i] = imgData.data[i * 4] / 255.0;
        }

        return { floatMask, width: w, height: h };
    }

    /**
     * Extracts raw probability mask using Fast AI (MediaPipe HD)
     */
    function extractMaskFast(sourceCanvasOrImg) {
        return new Promise(async (resolve, reject) => {
            try {
                const segmenter = await getFastAiSegmenter();
                const w = sourceCanvasOrImg.naturalWidth || sourceCanvasOrImg.width;
                const h = sourceCanvasOrImg.naturalHeight || sourceCanvasOrImg.height;

                let hasReturned = false;
                const timeoutId = setTimeout(() => {
                    if (!hasReturned) {
                        hasReturned = true;
                        reject(new Error('Fast AI segmentation timed out (15s)'));
                    }
                }, 15000);

                segmenter.onResults((results) => {
                    if (hasReturned) return;
                    hasReturned = true;
                    clearTimeout(timeoutId);

                    if (results && results.segmentationMask) {
                        const maskCanvas = document.createElement('canvas');
                        maskCanvas.width = w;
                        maskCanvas.height = h;
                        const mCtx = maskCanvas.getContext('2d');
                        mCtx.drawImage(results.segmentationMask, 0, 0, w, h);

                        const imgData = mCtx.getImageData(0, 0, w, h);
                        const floatMask = new Float32Array(w * h);
                        for (let i = 0; i < floatMask.length; i++) {
                            floatMask[i] = imgData.data[i * 4] / 255.0;
                        }

                        resolve({ floatMask, width: w, height: h });
                    } else {
                        reject(new Error('Invalid mask received from MediaPipe model'));
                    }
                });

                await segmenter.send({ image: sourceCanvasOrImg });
            } catch (err) {
                reject(err);
            }
        });
    }

    // --------------------------------------------------------------------------
    // 6. Complete End-to-End Matting Pipeline
    // --------------------------------------------------------------------------
    /**
     * Refines a raw neural mask using Fast Guided Filter, Hole-Filling,
     * Defringing, and User Parameters.
     * 
     * @param {HTMLImageElement|HTMLCanvasElement} sourceImage
     * @param {Float32Array} rawMask
     * @param {Object} options
     * @returns {HTMLCanvasElement} Transparent cutout canvas
     */
    function processMatte(sourceImage, rawMask, options = {}) {
        const {
            tolerance = 35,          // 10 to 80 (cutoff sensitivity)
            feather = 16,            // Softness of edges (px)
            edgeShift = -1,          // Edge trim in px (-5 to +5)
            defringe = true,         // Anti-halo color decontamination
            fillHoles = true,        // Solidify dark suits/hair
            useGuidedFilter = true   // High-res edge snapping
        } = options;

        const w = sourceImage.naturalWidth || sourceImage.width;
        const h = sourceImage.naturalHeight || sourceImage.height;

        // 1. Get original image data
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(sourceImage, 0, 0, w, h);
        const imgData = tempCtx.getImageData(0, 0, w, h);
        const pixels = imgData.data;

        // 2. High-resolution edge snapping with Fast Guided Filter
        let workingMask = rawMask;
        if (useGuidedFilter) {
            workingMask = fastGuidedFilter(pixels, rawMask, w, h, Math.max(6, Math.round(w / 120)), 0.005, 2);
        }

        // 3. Fill holes in dark suits, ties, and hair shadows
        if (fillHoles) {
            workingMask = fillForegroundHoles(workingMask, w, h, 0.3);
        }

        // 4. Edge shift (trimming residual halo)
        if (edgeShift !== 0) {
            workingMask = applyEdgeShift(workingMask, w, h, edgeShift);
        }

        // 5. Thresholding & smooth alpha blending
        const cutoff = tolerance / 100.0;
        const halfFeather = (feather / 255.0) / 2.0;
        const minVal = Math.max(0.0, cutoff - halfFeather);
        const maxVal = Math.min(1.0, cutoff + halfFeather);
        const range = maxVal - minVal || 0.001;

        const finalAlpha = new Float32Array(w * h);

        for (let i = 0; i < finalAlpha.length; i++) {
            const conf = workingMask[i];
            if (conf <= minVal) {
                finalAlpha[i] = 0.0;
            } else if (conf >= maxVal) {
                finalAlpha[i] = 1.0;
            } else {
                // Smooth cosine / hermite curve for silky hair borders
                const t = (conf - minVal) / range;
                finalAlpha[i] = t * t * (3 - 2 * t);
            }
        }

        // 6. Anti-halo color decontamination (removes wall tint from hair edges)
        if (defringe) {
            decontaminateFringe(pixels, finalAlpha, w, h, 0.75);
        }

        // 7. Apply alpha to pixel buffer
        for (let i = 0; i < finalAlpha.length; i++) {
            const a = finalAlpha[i];
            pixels[i * 4 + 3] = Math.round(pixels[i * 4 + 3] * a);
        }

        tempCtx.putImageData(imgData, 0, 0);
        return {
            canvas: tempCanvas,
            mask: workingMask,
            finalAlpha: finalAlpha
        };
    }

    // Export API
    window.MattingEngine = {
        extractMaskUltra,
        extractMaskFast,
        processMatte,
        fastGuidedFilter,
        fillForegroundHoles,
        decontaminateFringe,
        applyEdgeShift
    };

})(window);
