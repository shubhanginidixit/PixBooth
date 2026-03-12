tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#c15b3d", // Warm rust
                "primary-dark": "#a3492e",
                "accent": "#d6b88b", // Sand/tape color
                "background-light": "#f4f0ec", // Kraft paper base
                "background-dark": "#2c2a26",  // Used for text primarily now
                "surface-light": "#fdfcf9", // Polaroid white
                "surface-dark": "#e8e3d8", // Darker paper
                "text-light": "#f4f0ec",
                "text-dark": "#2c2a26", // Charcoal
                "border-light": "#e0d8c8",
                "border-dark": "#8c8273",
                "text-muted": "#8c8273"
            },
            fontFamily: {
                "display": ["'Courier Prime'", "monospace"],
                "handwritten": ["'Caveat'", "cursive"],
                "typewriter": ["'Special Elite'", "monospace"]
            },
            boxShadow: {
                'polaroid': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 0 4px rgba(0,0,0,0.02)',
                'scrapbook': '2px 4px 12px rgba(0,0,0,0.08), 1px 1px 3px rgba(0,0,0,0.1)'
            }
        },
    },
}
