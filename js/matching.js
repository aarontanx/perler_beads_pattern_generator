// Color-matching engine — CIEDE2000 + Redmean only.
// Neutral bias: near-grey source pixels prefer the H (true-neutral) family.
// Optional H7 outline snapping replaces the old gravity knob.

const NEUTRAL_CHROMA_THRESHOLD = 20;
const NEUTRAL_PENALTY_SCALE = { redmean: 2.0, ciede2000: 0.6 };
const H_FAMILY_BONUS = { redmean: 40, ciede2000: 12 };
const BLACK_BORDER_THRESHOLD = 40;

function isProtectedBlack(r, g, b) { return (r + g + b) / 3 < BLACK_BORDER_THRESHOLD; }

function colorDistance(r, g, b, targetLab, color, algorithm) {
    const dR = r - color.rgb.r, dG = g - color.rgb.g, dB = b - color.rgb.b;
    if (algorithm === 'ciede2000') return deltaE2000(targetLab, color.lab);
    const rMean = (r + color.rgb.r) / 2;
    return Math.sqrt((2 + rMean / 256) * dR * dR + 4 * dG * dG + (2 + (255 - rMean) / 256) * dB * dB);
}

/* opts: { algorithm, h7Outline:boolean, outlineStrength:0-100 } */
function findClosestColor(r, g, b, opts = {}, restrictToGrey = false) {
    const algorithm = opts.algorithm || 'ciede2000';
    let minDistance = Infinity;
    // Use owned-colors filtered palette when active, otherwise full paletteData
    const searchPalette = (typeof getActivePalette === 'function') ? getActivePalette() : paletteData;
    let closestColor = searchPalette[0] || paletteData[0];

    const targetLab = rgbToLab(r, g, b);
    const sourceChroma = Math.sqrt(targetLab.a * targetLab.a + targetLab.b * targetLab.b);
    // 1 = source perfectly neutral → bias toward H-family; fades out for colorful pixels
    const neutralWeight = Math.max(0, Math.min(1, 1 - sourceChroma / NEUTRAL_CHROMA_THRESHOLD));
    const penaltyScale = NEUTRAL_PENALTY_SCALE[algorithm] ?? 2.0;
    const hFamilyBonus = H_FAMILY_BONUS[algorithm] ?? 40;

    // Outline mode: pull dark/edge pixels toward pure H7 black.
    // Strength 0..100 maps to a bonus of 0..~1.2x typical inter-swatch distance.
    const strength = opts.h7Outline ? ((opts.outlineStrength ?? 60) / 100) : 0;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const darkness = restrictToGrey || isProtectedBlack(r, g, b)
        ? 1
        : Math.max(0, 1 - lum / BLACK_BORDER_THRESHOLD);
    const h7Bonus = strength * darkness * (algorithm === 'ciede2000' ? 14 : 55);

    const forceGreyOnly = restrictToGrey || isProtectedBlack(r, g, b);

    for (let i = 0; i < searchPalette.length; i++) {
        const color = searchPalette[i];
        if (forceGreyOnly && !color.code.startsWith('H')) continue;

        let distance = colorDistance(r, g, b, targetLab, color, algorithm);

        if (neutralWeight > 0) {
            distance += neutralWeight * color.chroma * penaltyScale;
            if (!color.code.startsWith('H')) distance += neutralWeight * hFamilyBonus;
        }
        if (h7Bonus > 0 && color.code === 'H7') distance -= h7Bonus;

        if (distance < minDistance) { minDistance = distance; closestColor = color; }
    }
    return closestColor;
}

function getContrastYIQ(r, g, b) { return (((r * 299) + (g * 587) + (b * 114)) / 1000) >= 128 ? '#000000' : '#FFFFFF'; }
