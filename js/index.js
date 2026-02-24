const layoutCards = document.querySelectorAll('.layout-card');
const beginBtn = document.getElementById('beginSessionBtn');
let selectedLayout = null;

// Remove entrance animation classes after they've played,
// so they won't replay when card-selected is toggled
setTimeout(() => {
    document.querySelectorAll('.animate-fade-in-up').forEach(el => {
        el.classList.remove('animate-fade-in-up', 'stagger-1', 'stagger-2', 'stagger-3', 'stagger-4', 'stagger-5');
    });
}, 1200);

// Load previously selected layout if exists
const savedLayout = localStorage.getItem('selectedLayout');
if (savedLayout) {
    const savedData = JSON.parse(savedLayout);
    const savedCard = document.querySelector(`[data-layout="${savedData.layout}"]`);
    if (savedCard) {
        selectLayout(savedCard);
    }
}

layoutCards.forEach(card => {
    card.addEventListener('click', () => {
        selectLayout(card);
    });
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectLayout(card);
        }
    });
});

function selectLayout(card) {
    // Remove selected state from all cards
    layoutCards.forEach(c => {
        c.classList.remove('border-primary', 'shadow-primary/30', 'card-selected');
        c.classList.add('border-transparent');
    });

    // Add selected state to clicked card
    card.classList.remove('border-transparent');
    card.classList.add('border-primary', 'shadow-primary/30', 'card-selected');

    // Store layout data
    selectedLayout = {
        layout: card.dataset.layout,
        rows: parseInt(card.dataset.rows),
        cols: parseInt(card.dataset.cols),
        name: card.dataset.name
    };

    // Enable begin button
    beginBtn.disabled = false;
}

beginBtn.addEventListener('click', () => {
    if (selectedLayout) {
        localStorage.setItem('selectedLayout', JSON.stringify(selectedLayout));
        window.location.href = 'camera.html';
    }
});
