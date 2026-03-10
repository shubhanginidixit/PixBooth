/* ===========================
   PixBooth — Live Gallery Logic
   =========================== */

document.addEventListener('DOMContentLoaded', async () => {
    const galleryGrid = document.getElementById('galleryGrid');
    const emptyState = document.getElementById('emptyState');
    const imageModal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImg');
    const closeModalBtn = document.getElementById('closeModalBtn');

    // Function to render the gallery
    async function loadGallery() {
        try {
            const strips = await PhotoDB.getAllStrips();

            if (!strips || strips.length === 0) {
                galleryGrid.classList.add('hidden');
                emptyState.classList.remove('hidden');
                emptyState.classList.add('flex');
                return;
            }

            galleryGrid.classList.remove('hidden');
            emptyState.classList.add('hidden');
            emptyState.classList.remove('flex');

            // Clear existing
            galleryGrid.innerHTML = '';

            strips.forEach((strip, index) => {
                const item = document.createElement('div');
                // Random rotation between -3 and 3 degrees for a scattered look
                const rotation = (Math.random() * 6 - 3).toFixed(1);
                item.className = `gallery-item relative overflow-hidden shadow-polaroid cursor-pointer group bg-[#fdfbf7] p-3 pb-12 flex border border-border-light/20 rounded-sm mb-4`;
                item.style.transform = `rotate(${rotation}deg)`;

                // Staggered animation delay
                item.style.animationDelay = `${(index % 10) * 0.1}s`;

                const img = document.createElement('img');
                img.src = strip.data;
                img.loading = 'lazy';
                img.className = 'w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105';
                img.alt = `Photo Strip ${new Date(strip.timestamp).toLocaleString()}`;

                const overlay = document.createElement('div');
                overlay.className = 'gallery-overlay absolute inset-0 opacity-0 transition-opacity duration-300 flex flex-col justify-end p-4';

                const dateText = document.createElement('p');
                dateText.className = 'text-white text-xs font-typewriter font-bold';
                dateText.textContent = new Date(strip.timestamp).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });

                const actionDiv = document.createElement('div');
                actionDiv.className = 'flex justify-between items-center mt-2';

                const layoutBadge = document.createElement('span');
                layoutBadge.className = 'text-[10px] font-bold bg-primary text-white px-2 py-1 rounded-sm shadow-sm font-handwritten text-sm';
                layoutBadge.textContent = strip.layout;

                const interactDiv = document.createElement('div');
                interactDiv.className = 'flex gap-2';

                const expandBtn = document.createElement('button');
                expandBtn.className = 'w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center backdrop-blur-sm transition-colors text-white';
                expandBtn.innerHTML = '<span class="material-symbols-outlined text-sm">fullscreen</span>';

                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center backdrop-blur-sm transition-colors text-white';
                downloadBtn.innerHTML = '<span class="material-symbols-outlined text-sm">download</span>';

                downloadBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const a = document.createElement('a');
                    a.href = strip.data;
                    a.download = `pixbooth-${strip.timestamp}.jpg`;
                    a.click();
                });

                interactDiv.appendChild(expandBtn);
                interactDiv.appendChild(downloadBtn);

                actionDiv.appendChild(layoutBadge);
                actionDiv.appendChild(interactDiv);

                overlay.appendChild(dateText);
                overlay.appendChild(actionDiv);

                item.appendChild(img);
                item.appendChild(overlay);

                // Open modal on click
                item.addEventListener('click', () => {
                    modalImg.src = strip.data;
                    imageModal.classList.remove('hidden');
                    // Slight delay for animation
                    setTimeout(() => {
                        modalImg.classList.remove('scale-95');
                        modalImg.classList.add('scale-100');
                    }, 50);
                });

                galleryGrid.appendChild(item);
            });
        } catch (error) {
            console.error('Error loading gallery:', error);
        }
    }

    // Modal controls
    closeModalBtn.addEventListener('click', closeModal);
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !imageModal.classList.contains('hidden')) {
            closeModal();
        }
    });

    function closeModal() {
        modalImg.classList.remove('scale-100');
        modalImg.classList.add('scale-95');
        setTimeout(() => {
            imageModal.classList.add('hidden');
            modalImg.src = '';
        }, 300);
    }

    // Initial load
    loadGallery();

    // Setup polling for "Live" effect (every 10 seconds)
    setInterval(loadGallery, 10000);
});
