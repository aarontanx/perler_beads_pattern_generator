        /* --- ADVANCED COLOR MATH HELPERS --- */
        function hexToRgb(hex) {
            let r = parseInt(hex.substring(1, 3), 16);
            let g = parseInt(hex.substring(3, 5), 16);
            let b = parseInt(hex.substring(5, 7), 16);
            return { r, g, b };
        }
        function rgbToXyz(r, g, b) {
            let _r = (r / 255), _g = (g / 255), _b = (b / 255);
            _r = _r > 0.04045 ? Math.pow((_r + 0.055) / 1.055, 2.4) : _r / 12.92;
            _g = _g > 0.04045 ? Math.pow((_g + 0.055) / 1.055, 2.4) : _g / 12.92;
            _b = _b > 0.04045 ? Math.pow((_b + 0.055) / 1.055, 2.4) : _b / 12.92;
            return { x: _r * 41.24 + _g * 35.76 + _b * 18.05, y: _r * 21.26 + _g * 71.52 + _b * 7.22, z: _r * 1.93 + _g * 11.92 + _b * 95.05 };
        }
        function xyzToLab(x, y, z) {
            let _x = x / 95.047, _y = y / 100.0, _z = z / 108.883;
            _x = _x > 0.008856 ? Math.pow(_x, 1/3) : (7.787 * _x) + (16 / 116);
            _y = _y > 0.008856 ? Math.pow(_y, 1/3) : (7.787 * _y) + (16 / 116);
            _z = _z > 0.008856 ? Math.pow(_z, 1/3) : (7.787 * _z) + (16 / 116);
            return { l: (116 * _y) - 16, a: 500 * (_x - _y), b: 200 * (_y - _z) };
        }
        function rgbToLab(r, g, b) { const xyz = rgbToXyz(r, g, b); return xyzToLab(xyz.x, xyz.y, xyz.z); }

        /* CIEDE2000 - the modern, industry-standard perceptual color difference formula.
           More accurate than CIE76, especially for blues/greens and near-neutral colors. */
        function deltaE2000(lab1, lab2) {
            const kL = 1, kC = 1, kH = 1;
            const L1 = lab1.l, a1 = lab1.a, b1 = lab1.b;
            const L2 = lab2.l, a2 = lab2.a, b2 = lab2.b;

            const C1 = Math.sqrt(a1*a1 + b1*b1), C2 = Math.sqrt(a2*a2 + b2*b2);
            const Cbar = (C1 + C2) / 2;
            const Cbar7 = Math.pow(Cbar, 7);
            const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));

            const a1p = a1 * (1 + G), a2p = a2 * (1 + G);
            const C1p = Math.sqrt(a1p*a1p + b1*b1), C2p = Math.sqrt(a2p*a2p + b2*b2);

            let h1p = Math.atan2(b1, a1p) * 180 / Math.PI; if (h1p < 0) h1p += 360;
            let h2p = Math.atan2(b2, a2p) * 180 / Math.PI; if (h2p < 0) h2p += 360;

            const dLp = L2 - L1;
            const dCp = C2p - C1p;

            let dhp = 0;
            if (C1p * C2p !== 0) {
                dhp = h2p - h1p;
                if (dhp > 180) dhp -= 360;
                else if (dhp < -180) dhp += 360;
            }
            const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI / 180) / 2);

            const Lbarp = (L1 + L2) / 2;
            const Cbarp = (C1p + C2p) / 2;

            let hbarp = h1p + h2p;
            if (C1p * C2p !== 0) {
                if (Math.abs(h1p - h2p) > 180) hbarp += (h1p + h2p < 360) ? 360 : -360;
                hbarp /= 2;
            } else {
                hbarp = h1p + h2p;
            }

            const T = 1 - 0.17*Math.cos((hbarp-30)*Math.PI/180) + 0.24*Math.cos((2*hbarp)*Math.PI/180)
                        + 0.32*Math.cos((3*hbarp+6)*Math.PI/180) - 0.20*Math.cos((4*hbarp-63)*Math.PI/180);

            const dTheta = 30 * Math.exp(-Math.pow((hbarp-275)/25, 2));
            const Cbarp7 = Math.pow(Cbarp, 7);
            const Rc = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + Math.pow(25, 7)));
            const Sl = 1 + (0.015 * Math.pow(Lbarp-50, 2)) / Math.sqrt(20 + Math.pow(Lbarp-50, 2));
            const Sc = 1 + 0.045 * Cbarp;
            const Sh = 1 + 0.015 * Cbarp * T;
            const Rt = -Math.sin(2 * dTheta * Math.PI/180) * Rc;

            return Math.sqrt(
                Math.pow(dLp/(kL*Sl), 2) + Math.pow(dCp/(kC*Sc), 2) + Math.pow(dHp/(kH*Sh), 2) +
                Rt * (dCp/(kC*Sc)) * (dHp/(kH*Sh))
            );
        }

