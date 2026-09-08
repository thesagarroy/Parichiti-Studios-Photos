# 📸 Parichiti Studios - Passport Photo Suite

**Create professional passport photos instantly - 100% free, offline, and private!**

[![Version](https://img.shields.io/badge/Version-2.1.0-purple?style=for-the-badge)](https://github.com/thesagarroy/Parichiti-Studios-Photos)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-blue?style=for-the-badge)](#)

A modern biometric photo studio by **Parichiti Digital Services**, developed by **Sagar Roy**. Tailored for Indian Passport (35×45mm), PAN Card (25×35mm), Stamp Size (25×30mm), and OCI.

---

## ✨ Features

- **100% Free** - No costs, subscriptions, or watermarks
- **100% Private** - Photos never leave your device
- **Works Offline** - PWA with complete offline support
- **Desktop Apps** - Native apps for Mac, Windows, and Linux
- **No Sign-up Required** - Start instantly
- **300 DPI Quality** - Professional print-ready output
- **200+ Countries** - All passport photo sizes supported

### 🎨 Editing Tools

- Brightness adjustment
- Contrast control
- Saturation tuning
- Exposure settings
- Sharpness enhancement
- Blur effects
- One-click Auto Enhance

---

## 🇮🇳 Supported Indian Photo Sizes

| Photo Type | Size (mm) | Use For |
|------------|-----------|---------|
| Indian Passport | 35×45mm | Passport, Police Verification, SSC, Govt Exams |
| PAN Card | 25×35mm | NSDL, UTIITSL PAN Applications |
| Stamp Size | 25×30mm | Banks, Colleges, School Admissions |
| Mini Stamp Size | 20×25mm | Identity Cards, Service Books |
| USA Visa / OCI | 51×51mm (2×2") | OCI Card & US Visa |
| NEET Postcard | 102×152mm (4×6") | NEET Exam Postcard Photo |
| Custom Size | Any mm | Custom Requirements |

---

## 🚀 Quick Start

### Web Version

```bash
# Clone the repository
git clone https://github.com/thesagarroy/Parichiti-Studios-Photos.git

# Navigate to directory
cd passport-photo-generator

# Open in browser
open index.html
```

### Desktop App

**Download Pre-built Apps:**

Download the latest desktop app for your platform from the [Releases](https://github.com/thesagarroy/Parichiti-Studios-Photos/releases) page:

- **macOS**: `.dmg` or `.zip` (supports both Intel and Apple Silicon)
- **Windows**: `.exe` installer or portable `.exe` (32-bit and 64-bit)
- **Linux**: `.AppImage`, `.deb`, or `.snap`

All releases include SHA256 checksums for security verification.

**Build from Source:**

```bash
# Clone the repository
git clone https://github.com/thesagarroy/Parichiti-Studios-Photos.git

# Navigate to directory
cd passport-photo-generator

# Install dependencies
npm install

# Run the app
npm start

# Build for your platform
npm run dist

# Or build for all platforms
npm run dist:all
```

For detailed build instructions and release process, see [BUILD.md](BUILD.md) and [.github/RELEASE.md](.github/RELEASE.md).

### Usage

**Simple Mode (3 steps):**
1. Upload photo
2. Select country size
3. Download PDF

**Advanced Editor (full control):**
1. Upload photo
2. Crop precisely with Cropper.js
3. Apply adjustments (brightness, contrast, etc.)
4. Auto enhance
5. Select size and photo count
6. Generate A4 layout
7. Export as PDF or JPG

---

## 📐 Project Structure

```
passport-photo-generator/
├── index.html              # Simple mode
├── editor.html             # Advanced editor
├── manifest.json           # PWA config
├── service-worker.js       # Offline support
├── main.js                 # Electron main process
├── preload.js              # Electron preload script
├── package.json            # Node.js dependencies and build config
├── robots.txt              # SEO
├── sitemap.xml             # Sitemap
├── humans.txt              # Credits
├── assets/
│   ├── icon.svg           # App icon (SVG)
│   └── icon.png           # App icon (PNG)
├── css/
│   └── styles.css         # Main styles (1500+ lines)
└── js/
    ├── app.js             # Simple mode logic
    ├── editor.js          # Advanced editor
    ├── photoUpload.js     # File upload handler
    ├── canvasRenderer.js  # Canvas rendering (300 DPI)
    └── pdfGenerator.js    # PDF generation
```

---

## 🛠️ Technology Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| **Libraries** | Cropper.js v1.6.1, jsPDF v2.5.1 |
| **Desktop** | Electron (cross-platform desktop apps) |
| **Build Tools** | electron-builder (multi-platform packaging) |
| **Web APIs** | Canvas API, File API, Service Worker |
| **Features** | PWA, Offline Support, Responsive Design |

---

## 📱 Platform Support

### Web Browsers

| Browser | Version | PWA Support |
|---------|---------|-------------|
| Chrome | 80+ | ✅ Yes |
| Firefox | 75+ | ✅ Yes |
| Safari | 13+ | ✅ Yes |
| Edge | 80+ | ✅ Yes |
| Opera | 67+ | ✅ Yes |

### Desktop Apps

| Platform | Architectures | Formats |
|----------|--------------|---------|
| **macOS** | Intel (x64), Apple Silicon (arm64) | DMG, ZIP |
| **Windows** | 32-bit (ia32), 64-bit (x64) | NSIS Installer, Portable EXE |
| **Linux** | 64-bit (x64) | AppImage, DEB, Snap |

**Devices:** Windows, macOS, Linux, iOS 13+, Android 8+

---

## 🖨️ Print Guidelines

### Recommended Settings

```
Paper Size:     A4 (210×297mm)
Quality:        Best/High (300 DPI)
Color Mode:     Color
Paper Type:     Photo Paper (180-200 GSM)
Finish:         Glossy or Matte
Borderless:     Off
```

---

## 💰 Cost Comparison

| Option | Cost | Privacy | Speed |
|--------|------|---------|-------|
| This Tool | Free | 100% Private | Instant |
| Photo Studios | $10-20 | Stored | 30-60 min |
| Online Services | $5-10 | Uploaded | 5-10 min |
| Mobile Apps | $2-10 | Collected | Variable |

**Annual Savings:** $100-150 vs paid alternatives

---

## 🤝 Contributing

We welcome contributions! Here's how:

```bash
# 1. Fork and clone
git clone https://github.com/your-username/passport-photo-generator.git

# 2. Create feature branch
git checkout -b feature/amazing-feature

# 3. Make changes and test

# 4. Commit changes
git commit -m "Add amazing feature"

# 5. Push to branch
git push origin feature/amazing-feature

# 6. Open Pull Request
```

### Code Standards

- Use vanilla JavaScript (no frameworks)
- Follow existing code style
- Test on Chrome, Firefox, Safari, Edge
- Maintain responsive design
- Preserve PWA functionality

---

## 🗺️ Roadmap

### Version 2.0 (Completed)

- [x] Desktop apps for Mac, Windows, and Linux
- [x] Electron-based cross-platform support
- [x] Native application experience

### Version 2.1 (Planned)

- [ ] AI background removal
- [ ] Face detection and auto-crop
- [ ] Multi-language support
- [ ] Before/After comparison slider
- [ ] More filters and effects
- [ ] Batch processing
- [ ] Native mobile apps

---

## 📄 License

MIT License - Free to use, modify, and distribute.

```
Copyright (c) 2026 Parichiti Digital Services & Sagar Roy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish, and
distribute copies of the Software.
```

Full license text in [LICENSE](LICENSE) file.

---

## 👨‍💻 Developer & Company

**Developed with ❤️ by Sagar Roy**
**A product of Parichiti Digital Services**

- GitHub: [@thesagarroy](https://github.com/thesagarroy)
- Repository: [Parichiti-Studios-Photos](https://github.com/thesagarroy/Parichiti-Studios-Photos)

---

## 🙏 Acknowledgments

Special thanks to:
- [Cropper.js](https://fengyuanchen.github.io/cropperjs/) - Image cropping library
- [jsPDF](https://github.com/parallax/jsPDF) - PDF generation
- Open Source Community

---

## 📞 Support

- **Documentation:** This README
- **Issues:** [GitHub Issues](https://github.com/thesagarroy/Parichiti-Studios-Photos/issues)

---

## ⭐ Star History

If this tool helped you, please star it!

**Helping people create professional photos worldwide**

---

**© 2026 Parichiti Digital Services • Developed by Sagar Roy • MIT License**

*Built in India 🇮🇳 • Used Worldwide 🌍 • Free Forever 💯*
