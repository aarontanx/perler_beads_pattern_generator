// Deterministic k-means++ in CIE Lab (unchanged core math, kept from original)
function mulberry32(seed) {
    return function() {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function kMeansLab(points, k, iterations = 8) {
    const n = points.length;
    k = Math.max(1, Math.min(k, n));
    if (n === 0) return { assignments: [], centroids: [] };

    const rand = mulberry32(0xDEADBEEF); // fixed seed — stable palette across paint strokes
    const centroids = [{ ...points[Math.floor(rand() * n)] }];
    while (centroids.length < k) {
        const distances = points.map(p => {
            let minD = Infinity;
            for (const c of centroids) {
                const dl = p.l - c.l, da = p.a - c.a, db = p.b - c.b;
                const d = dl * dl + da * da + db * db;
                if (d < minD) minD = d;
            }
            return minD;
        });
        const sum = distances.reduce((a, b) => a + b, 0);
        if (sum === 0) { centroids.push({ ...points[Math.floor(rand() * n)] }); continue; }
        let r = rand() * sum, idx = 0;
        for (; idx < n; idx++) { r -= distances[idx]; if (r <= 0) break; }
        centroids.push({ ...points[Math.min(idx, n - 1)] });
    }

    let assignments = new Array(n).fill(0);
    for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < n; i++) {
            let bestD = Infinity, bestJ = 0;
            for (let j = 0; j < centroids.length; j++) {
                const c = centroids[j];
                const dl = points[i].l - c.l, da = points[i].a - c.a, db = points[i].b - c.b;
                const d = dl * dl + da * da + db * db;
                if (d < bestD) { bestD = d; bestJ = j; }
            }
            assignments[i] = bestJ;
        }
        const sums = centroids.map(() => ({ l: 0, a: 0, b: 0, count: 0 }));
        for (let i = 0; i < n; i++) {
            const s = sums[assignments[i]];
            s.l += points[i].l; s.a += points[i].a; s.b += points[i].b; s.count++;
        }
        for (let j = 0; j < centroids.length; j++) {
            if (sums[j].count > 0) centroids[j] = { l: sums[j].l / sums[j].count, a: sums[j].a / sums[j].count, b: sums[j].b / sums[j].count };
        }
    }
    return { assignments, centroids };
}
