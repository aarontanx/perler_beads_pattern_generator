        // Pixels darker than this (0-255 average) are treated as protected outline/border
        // pixels: they always snap straight to the nearest true-neutral (H-code) palette
        // color and are never touched by quantization or despeckle.
        const BLACK_BORDER_THRESHOLD = 40;

        function isProtectedBlack(r, g, b) {
            return (r + g + b) / 3 < BLACK_BORDER_THRESHOLD;
        }

        // How colorful a swatch needs to be avoided when matching a near-neutral source
        // pixel. Below this source chroma, the neutral-affinity bias below kicks in.
        const NEUTRAL_CHROMA_THRESHOLD = 20;
        // Per-algorithm penalty strength - tuned so it's meaningful relative to each
        // algorithm's own distance scale (CIEDE2000's dE values run much smaller than
        // raw-RGB metrics like Redmean/Euclidean).
        const NEUTRAL_PENALTY_SCALE = {
            redmean: 2.0, euclidean: 2.0, weighted_rgb: 2.0, luma: 2.2, manhattan: 2.5, ciede2000: 0.6
        };
        // Extra flat penalty for non-H-prefixed candidates when the source is near-neutral.
        // The H-series is this tool's dedicated true-neutral family; M-series entries can be
        // low-chroma too (e.g. a slate grey) and sometimes win on raw distance alone despite
        // being a different color family than the person actually wants for grey shading.
        const H_FAMILY_BONUS = {
            redmean: 40, euclidean: 40, weighted_rgb: 40, luma: 44, manhattan: 50, ciede2000: 12
        };

        function findClosestColor(r, g, b, algorithm, restrictToGrey = false, h7Gravity = 0) {
            let minDistance = Infinity;
            let closestColor = paletteData[0];

            // Always computed (not just for CIEDE2000) - needed for the neutral-affinity bias below.
            const targetLab = rgbToLab(r, g, b);
            const sourceChroma = Math.sqrt(targetLab.a*targetLab.a + targetLab.b*targetLab.b);
            // 1 = source is perfectly neutral (grey/black/white), 0 = source is already colorful
            // enough that no bias is needed.
            const neutralWeight = Math.max(0, Math.min(1, 1 - sourceChroma / NEUTRAL_CHROMA_THRESHOLD));
            const penaltyScale = NEUTRAL_PENALTY_SCALE[algorithm] ?? 2.0;
            const hFamilyBonus = H_FAMILY_BONUS[algorithm] ?? 40;

            // Protected black-border pixels always match against neutrals only,
            // using the most reliable metric (redmean), regardless of the selected algorithm.
            const forceGreyOnly = restrictToGrey || isProtectedBlack(r, g, b);

            for (let i = 0; i < paletteData.length; i++) {
                const color = paletteData[i];
                if (forceGreyOnly && !color.code.startsWith('H')) continue;

                const dR = r - color.rgb.r, dG = g - color.rgb.g, dB = b - color.rgb.b;
                let distance = 0;

                switch(algorithm) {
                    case 'euclidean': distance = Math.sqrt((dR*dR) + (dG*dG) + (dB*dB)); break;
                    case 'redmean':
                        const rMean = (r + color.rgb.r) / 2;
                        distance = Math.sqrt((2 + rMean/256)*(dR*dR) + 4*(dG*dG) + (2 + (255-rMean)/256)*(dB*dB));
                        break;
                    case 'weighted_rgb': distance = Math.sqrt(0.3*(dR*dR) + 0.59*(dG*dG) + 0.11*(dB*dB)); break;
                    case 'luma': distance = Math.sqrt(Math.pow(dR*0.299, 2) + Math.pow(dG*0.587, 2) + Math.pow(dB*0.114, 2)); break;
                    case 'manhattan': distance = Math.abs(dR) + Math.abs(dG) + Math.abs(dB); break;
                    case 'ciede2000': distance = deltaE2000(targetLab, color.lab); break;
                    default: distance = Math.sqrt((dR*dR) + (dG*dG) + (dB*dB));
                }

                // Penalize matching a near-neutral source pixel to a noticeably colorful
                // ("clay", "slate", etc.) swatch when a more neutral option is available,
                // even if that colorful swatch happens to be numerically a bit closer.
                // Also give a direct preference to the H-series (this tool's true-neutral
                // family) over M-series near-neutrals, which can win on raw lightness match
                // alone despite being a different color family than intended for grey areas.
                if (neutralWeight > 0) {
                    distance += neutralWeight * color.chroma * penaltyScale;
                    if (!color.code.startsWith('H')) distance += neutralWeight * hFamilyBonus;
                }

                if (color.code === 'H7' && h7Gravity > 0) distance -= (h7Gravity * 0.5);

                if (distance < minDistance) { minDistance = distance; closestColor = color; }
            }
            return closestColor;
        }

        function getContrastYIQ(r, g, b) { return (((r * 299) + (g * 587) + (b * 114)) / 1000) >= 128 ? '#000000' : '#FFFFFF'; }

