# ⚡ FlashLane

> **Universal, high-speed bootable ISO/IMG USB writer for Windows, macOS, and Linux — with Rufus-grade partition control & non-destructive simulation.**

[![CI Build & Verify](https://github.com/RitualDev-Lab/FlashLane/actions/workflows/ci.yml/badge.svg)](https://github.com/RitualDev-Lab/FlashLane/actions)
[![Release Multi-Platform](https://github.com/RitualDev-Lab/FlashLane/actions/workflows/release.yml/badge.svg)](https://github.com/RitualDev-Lab/FlashLane/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## 🌟 Features

* **⚡ Ultra-High Speed Flashing Engine:**
  * 4MB chunked streaming I/O pipeline with real-time speed monitoring ($MB/s$) and accurate dynamic ETA calculation.
* **🛡️ Dual-Layer OS Disk Safety Guard:**
  * Auto-detects and permanently locks system drives (`C:\`, root mounts `/`, primary physical disks) so you can never accidentally wipe your operational operating system.
* **🧪 Built-In Simulation Mode:**
  * Dry-run full flashing lifecycles (unmount &rarr; format &rarr; chunked write &rarr; SHA-256 validation &rarr; safe ejection) without touching physical drives.
* **🎯 Rufus-Grade Partition & Target System Parity:**
  * **Partition Schemes:** `MBR` (Legacy BIOS & UEFI-CSM) and `GPT` (Modern UEFI non-CSM).
  * **Target Architectures:** `BIOS` and `UEFI`.
  * **Filesystems:** `FAT32`, `NTFS` (handles Windows `install.wim` > 4GB), `exFAT`, and `RAW DD Mode` (1:1 bitstream clone for hybrid Linux ISOs like Arch, Tails, Proxmox).
  * Custom cluster sizing (`4096B` up to `64KB`) and volume labeling.
* **🔍 Deep Image Inspection & Multi-Hash Verification:**
  * Header inspection for ISO 9660 (`CD001`), MBR (`0x55AA`), GPT (`EFI PART`), and hybrid boot headers.
  * Real-time checksum calculations (`SHA-256`, `SHA-1`, `MD5`) with progress reporting.
* **💻 Skeuomorphic High-Tech Interface:**
  * Custom dark desktop aesthetic inspired by hardware flashers, with frameless titlebars, animated striped progress meters, and an integrated real-time execution terminal.
* **🌐 True Cross-Platform:**
  * Native USB discovery adapters for **Windows** (PowerShell CIM/WMI), **Linux** (`lsblk`), and **macOS** (`diskutil`).

---

## 🧪 How to Test FlashLane

### 1. Interactive Development & UI Testing
Launch the desktop application with live reload:
```bash
pnpm dev
```

### 2. Testing with Built-In Simulation Mode (No USB Required!)
1. Open FlashLane in dev mode or as a built app.
2. In the top bar, ensure the mode badge says **`SIMULATION`** (amber badge).
3. If no physical USB is plugged in, the **Target Drive** dropdown will automatically offer `SanDisk Ultra USB 3.0 [VIRTUAL SIMULATOR] 32GB`.
4. Click **Select** and pick any `.iso` or `.img` file (e.g. Ubuntu, Windows, Arch, or even a test file).
5. Review the auto-detected OS label and boot scheme. Click **Verify Hash** to calculate streaming SHA-256.
6. Click **Start Flashing [Simulation Mode]**.
7. Confirm the Safety Modal.
8. Watch real-time 4MB streaming chunks, live write speed ($MB/s$), ETA, and the SHA-256 post-write verification pass with live logs.

### 3. Testing Physical Hardware Flashing
1. Insert a spare USB drive (e.g. 8GB - 64GB).
2. Click **Scan** in FlashLane to refresh connected drives.
3. Toggle the top bar switch to **`PHYSICAL WRITE`** (emerald badge).
4. Select your USB drive and ISO image.
5. Click **Start Writing Bootable USB**. FlashLane will show an explicit confirmation warning showing the target drive letter, capacity, and path before writing.

---

## 📦 Multi-Platform Releases (GitHub Actions)

FlashLane includes an automated CI/CD pipeline ([`.github/workflows/release.yml`](.github/workflows/release.yml)) that builds native binaries for all 3 major operating systems:

* **Windows**: NSIS Setup (`.exe`) + Standalone Portable (`.exe`)
* **Linux**: Universal AppImage (`.AppImage`) + Debian Package (`.deb`)
* **macOS**: Apple Disk Image (`.dmg`) + Compressed Archive (`.zip`)

### How to Trigger a Release:
Whenever you want to publish a new release:
```bash
# 1. Tag your commit
git tag v1.0.0

# 2. Push the tag to GitHub
git push origin v1.0.0
```
GitHub Actions will automatically run matrix jobs on Windows, Ubuntu, and macOS runners, compile the code, and publish all release assets directly to [GitHub Releases](https://github.com/RitualDev-Lab/FlashLane/releases).

---

## 🏬 Releasing on Microsoft Store

FlashLane supports building official Microsoft Store `.appx` / `.msix` packages:

### Step 1: Register on Microsoft Partner Center
1. Create a developer account at [partner.microsoft.com](https://partner.microsoft.com/dashboard).
2. Reserve your app name (e.g. `FlashLane`).
3. Under **Product management &rarr; Product Identity**, copy:
   - **Package/Identity Name**
   - **Publisher ID** (e.g. `CN=XXXXXXXX-XXXX-...`)
   - **Publisher display name**

### Step 2: Configure `electron-builder.json`
Update the `appx` section in `electron-builder.json` with your credentials:
```json
"appx": {
  "identityName": "RitualDevLab.FlashLane",
  "publisher": "CN=YOUR-PUBLISHER-ID-FROM-PARTNER-CENTER",
  "publisherDisplayName": "RitualDev Lab",
  "applicationId": "RitualDevLab.FlashLane"
}
```

### Step 3: Build the Store Package
Run the following command:
```bash
npx electron-builder --win appx
```
This generates `release/FlashLane 1.0.0.appx` ready for upload.

### Step 4: Validate & Submit
1. Test your package locally using the Windows App Certification Kit (WACK):
   ```bash
   appcert test -apptype desktop -packagepath "release\FlashLane 1.0.0.appx"
   ```
2. Upload the `.appx` file into your Microsoft Partner Center submission dashboard.
3. Fill in screenshots, description, and privacy policy, then click **Submit to the Store**.

---

## 📄 License
Released under the [MIT License](LICENSE). Built with pride by [RitualDev Lab](https://github.com/RitualDev-Lab).
