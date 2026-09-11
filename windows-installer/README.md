# Parichiti Studios - Windows Setup Installer

This directory contains the NSIS script and automated build scripts for compiling the standalone Windows setup installer (`PARICHITI-STUDIOS-Setup.exe`).

## Files
- `PARICHITI-STUDIOS-Installer.nsi`: Professional NSIS setup script with Photoshop/Studio style wizard, desktop shortcuts, and uninstaller.
- `build-new-exe.sh`: 1-click Linux/Bash compilation script that packages `app.asar` and builds the installer using NSIS.
- `icon.ico`: High-resolution Windows app icon (multi-size: 16x16 up to 256x256).

## Building the Installer
Run:
```bash
bash build-new-exe.sh
```

> **Note on GitHub Distribution**:
> The compiled installer `PARICHITI-STUDIOS-Setup.exe` is ~105 MB. GitHub enforces a strict 100 MB per-file limit on normal `git push`. To distribute the `.exe` to users, publish it under **GitHub Releases** (`https://github.com/thesagarroy/Parichiti-Studios-Photos/releases`).
