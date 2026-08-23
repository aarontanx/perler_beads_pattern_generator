        // --- UNIFIED BULLETPROOF EXPORT ENGINE FOR IOS & DESKTOP ---
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        function getActiveCanvas() {
            const format = document.getElementById('dlType').value;
            if (format === 'base') return { canvas: baseCanvas, label: 'Base Grid' };
            if (format === 'fused') return { canvas: fusedCanvas, label: 'Fused Simulation' };
            return { canvas: outputCanvas, label: 'Blueprint Guide' };
        }

        function openIOSSaveModal() {
            const { canvas } = getActiveCanvas();
            const format = document.getElementById('dlType').value;
            
            let overlay = document.getElementById('ios-save-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'ios-save-overlay';
                overlay.style.cssText = `
                    position: fixed; inset: 0; background: rgba(10, 14, 22, 0.9); 
                    z-index: 99999; display: flex; align-items: center; 
                    justify-content: center; padding: 20px; box-sizing: border-box;
                `;
                overlay.innerHTML = `
                    <div style="background: var(--container-bg, #fff); color: var(--text-color, #1b1f2a); padding: 22px; border-radius: 16px; max-width: 90vw; width: 420px; text-align: center; box-shadow: var(--shadow-lg); display: flex; flex-direction: column; gap: 14px; align-items: center; border: 1px solid var(--border-color);">
                        <h3 style="margin: 0; font-family: var(--font-heading, sans-serif); font-size: 17px; font-weight:700; color: var(--accent-color);">Save Image Asset</h3>
                        <p style="margin: 0; font-size: 13px; color: var(--text-muted, #6b7280); line-height: 1.4;">
                            Apple restricts automated web downloads. <br>
                            <strong>Press and hold (long-press)</strong> the image below, then tap <strong>"Save to Photos"</strong>.
                        </p>
                        <div style="border: 1px solid var(--border-color); border-radius: 8px; overflow: auto; max-height: 45vh; width: 100%; display: flex; justify-content: center; background: #fff; padding: 10px; box-sizing: border-box;">
                            <img id="ios-exported-img" style="max-width: 100%; height: auto; object-fit: contain; border-radius: 4px;" alt="Perler Asset Preview" />
                        </div>
                        <button id="ios-close-overlay" style="background: var(--accent-color, #4f5ff0); color: #fff; border: none; padding: 11px; border-radius: 11px; font-weight: 600; cursor: pointer; width: 100%; font-size: 14px;">Close Preview</button>
                    </div>
                `;
                document.body.appendChild(overlay);
                
                document.getElementById('ios-close-overlay').addEventListener('click', () => {
                    overlay.style.display = 'none';
                });
            }

            const imgEl = document.getElementById('ios-exported-img');
            imgEl.src = canvas.toDataURL('image/png');
            overlay.style.display = 'flex';
        }

        downloadBtn.addEventListener('click', (e) => {
            if (isIOS) {
                e.preventDefault();
                openIOSSaveModal();
            } else {
                const { canvas } = getActiveCanvas();
                const format = document.getElementById('dlType').value;
                const a = document.createElement('a');
                a.download = `perler-pattern-${format}.png`; 
                a.href = canvas.toDataURL('image/png'); 
                a.click();
            }
        });
