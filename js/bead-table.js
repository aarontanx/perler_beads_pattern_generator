        function generateBeadTable(beadCounts) {
            const container = document.getElementById('beadTableContent');
            const parent = document.getElementById('beadTableContainer');
            if (!container || !parent) return;
            if (Object.keys(beadCounts).length === 0) { parent.style.display = 'none'; return; }

            parent.style.display = 'block';
            let html = '<table><thead><tr><th>Code</th><th>Color Swatch</th><th>Beads Required</th></tr></thead><tbody>';
            Object.keys(beadCounts).sort((a,b) => beadCounts[b].count - beadCounts[a].count).forEach(code => {
                html += `<tr class="interactive-row" onclick="selectBrushFromTable('${code}')"><td><strong>${code}</strong></td><td><span class="color-swatch" style="background-color: ${beadCounts[code].hex}"></span> ${beadCounts[code].hex}</td><td>${beadCounts[code].count}</td></tr>`;
            });
            container.innerHTML = html + '</tbody></table>';
        }

