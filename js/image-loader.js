        /* --- IMAGE FILE LOADER LOGIC --- */
        imageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                const img = new Image();
                img.onload = () => {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = img.width; tempCanvas.height = img.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(img, 0, 0);

                    if (autoCropInput.checked) {
                        const imgData = tempCtx.getImageData(0, 0, img.width, img.height);
                        let minX = img.width, maxX = 0, minY = img.height, maxY = 0, hasContent = false;
                        for (let y = 0; y < img.height; y++) {
                            for (let x = 0; x < img.width; x++) {
                                const idx = (y * img.width + x) * 4;
                                if (imgData.data[idx+3] > 20 && !(imgData.data[idx] > 240 && imgData.data[idx+1] > 240 && imgData.data[idx+2] > 240)) {
                                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                                    hasContent = true;
                                }
                            }
                        }
                        if (hasContent) {
                            baseCropCanvas = document.createElement('canvas');
                            baseCropCanvas.width = (maxX - minX) + 1; baseCropCanvas.height = (maxY - minY) + 1;
                            baseCropCanvas.getContext('2d').drawImage(img, minX, minY, baseCropCanvas.width, baseCropCanvas.height, 0, 0, baseCropCanvas.width, baseCropCanvas.height);
                        } else { baseCropCanvas = tempCanvas; }
                    } else { baseCropCanvas = tempCanvas; }

                    if (baseCropCanvas.width > baseCropCanvas.height) {
                        baseImageWidth = 30; baseImageHeight = Math.max(5, Math.round(30 * (baseCropCanvas.height / baseCropCanvas.width)));
                    } else {
                        baseImageHeight = 30; baseImageWidth = Math.max(5, Math.round(30 * (baseCropCanvas.width / baseCropCanvas.height)));
                    }

                    userOverrides = {};
                    scalePercentInput.value = 100;
                    updateGridDimensionsFromScale();
                    thumbPreview.src = baseCropCanvas.toDataURL();
                    document.getElementById('thumbPreviewContainer').style.display = 'block';
                    downloadBtn.disabled = false;
                    applyFlipState();
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
        });

