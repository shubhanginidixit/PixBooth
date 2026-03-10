# 📸 PixBooth

PixBooth is a modern, web-based photobooth application designed for fun, creativity, and nostalgia. It features real-time video processing, customizable layouts, and a beautifully crafted **Vintage Scrapbook / Lo-Fi** aesthetic directly in your browser.

## ✨ The Aesthetic: Vintage Scrapbook

The entire application has been redesigned from the ground up to evoke the feeling of analog photography and physical scrapbooking:
- **Warm, Tactile Feel:** A global soft kraft paper texture and multiplied grain overlay simulates the look and feel of real paper.
- **Polaroid Layouts:** Photos are framed in classic, uneven white borders with subtle drop shadows to mimic physical polaroids.
- **Handcrafted Details:** UI elements feature masking tape accents, hand-drawn viewfinder brackets, and marker-style countdowns.
- **Typography:** A combination of classic typewriter fonts (`Courier Prime`, `Special Elite`) for UI and handwritten markers (`Caveat`) for headings and annotations.
- **Organic Interactions:** The photo strip physically tilts in 3D space as you interact with it, avoiding stark digital animations.

## 🚀 Features

### 🎞️ Versatile Photo Layouts
Choose how you want to frame your memories before you begin:
- **Strip 3 & Strip 4:** Classic vertical photo strips.
- **2x2 Grid:** A clean 4-photo square arrangement.
- **Row 3:** A horizontal spread.

### 🎨 Live Editing & Filters
After capturing your photos, head to the interactive editing suite:
- **Vintage Presets:** Apply filters like Sepia, B&W (Noir), Vivid, or intense Vintage effects.
- **Manual Adjustments:** Fine-tune Brightness, Contrast, and Saturation with analog-style sliders.
- **Digital Stickers:** Pick from a collection of fun emojis and stamp them directly onto your photo strip exactly where you want them.

### 📷 The Camera Experience
- **Live Preview:** See exactly what you're capturing within the polaroid frame.
- **Hand-drawn Countdown:** A massive animated marker countdown prepares you for the shot.
- **Warm Flash:** A soft, warm-tinted screen flash simulates a vintage incandescent bulb.

### 🖼️ Live Gallery
- **Scattered Desk Aesthetic:** Your saved photos are dumped into an interactive, masonry-style gallery that looks like a pile of developed polaroids on a desk, each uniquely rotated.
- **Export & Share:** Instantly download high-quality JPGs of your customized photo strips to share with friends.

## 🛠️ Technology Stack

- **Frontend Core**: HTML5, Vanilla JavaScript (ES6+), Fabric.js (for canvas manipulation)
- **Styling**: Tailwind CSS (with custom scrapbook configuration) and Vanilla CSS animations.
- **Typography & Icons**: Google Fonts (`Courier Prime`, `Caveat`, `Special Elite`) & Google Material Symbols.
- **Storage**: IndexedDB for robust local storage of high-resolution photo data.

## 🚦 How to Run

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/DhanushPillay/PixBooth.git
    ```
2.  **Open the project**:
    Navigate to the project directory.
3.  **Launch**:
    You can run this project locally without a complex build step.
    - Open `index.html` in your web browser.
    - *Recommended*: Use a local development server (like VS Code's "Live Server" extension) so the browser can accurately handle camera permissions and cross-origin rendering for the canvas export.

## 📝 License

This project is open-source and available for personal and educational use.

---

*Redesigned and coded with ❤️ by Dhanush Pillay*
