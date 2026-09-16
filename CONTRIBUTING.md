# ?? Contributing to FlashLane

Thank you for your interest in contributing to **FlashLane**!  
FlashLane is an open-source, high-speed, cross-platform bootable USB flasher built with Electron, React, and TypeScript. Our goal is to provide Rufus-grade partition control on Windows, macOS, and Linux with 100% privacy and zero telemetry.

---

## ??? Development Setup

### Prerequisites
- **Node.js**: v20 or higher (v22/v24 recommended)
- **pnpm**: v9 or higher (install with `npm install -g pnpm` or `corepack enable`)
- **Git**

### 1. Clone & Install
```bash
git clone https://github.com/RitualDev-Lab/FlashLane.git
cd FlashLane
pnpm install
```

### 2. Start Live Development Server
```bash
pnpm dev
```
This launches Vite for the React frontend alongside the Electron main process with instant hot-module replacement (HMR).

### 3. Build & Package
```bash
# Type check & compile TypeScript + Vite
pnpm build

# Package native binary for your OS
pnpm run build:unpack
```

---

## ?? Testing Guidelines: Safety First!

Because FlashLane handles low-level disk I/O, **you must never risk destroying personal data during development**.

### 1. Always Use Simulation Mode First
FlashLane includes an in-memory virtual flasher:
1. When running `pnpm dev`, look at the top mode indicator badge.
2. By default, it operates in **`SIMULATION`** mode.
3. If no physical USB drive is inserted, FlashLane automatically exposes a `SanDisk Ultra USB 3.0 [VIRTUAL SIMULATOR] 32GB` target drive.
4. Select any `.iso` or `.img` file and run the full format, chunked write, speed calculation, and SHA-256 verification cycle completely in simulation.

### 2. Physical Hardware Testing
If you are modifying low-level platform disk adapters (`src/main/platform/`):
- Only use a dedicated, blank, spare USB drive.
- Never test on drives containing important data.
- Ensure the System Drive Safety Lock correctly blocks internal disks (`C:\`, `/dev/sda`, `disk0`).

---

## ??? Code Architecture

- **`src/main/`**: Node.js & Electron main process.
  - `index.ts`: Application lifecycle, window creation, frameless window controls.
  - `ipc/`: IPC handler registration and safety boundary checks.
  - `flasher/`: 4MB chunked streaming writer, speed monitoring, and SHA-256 hash calculation pipeline.
  - `platform/`: OS-specific disk enumeration and detection (`windows.ts`, `linux.ts`, `darwin.ts`).
- **`src/preload/`**: Secure context bridge exposing strictly typed IPC methods (`window.flashlane`) to the renderer with `contextIsolation: true`.
- **`src/renderer/`**: React 18 frontend.
  - `components/`: Drive selector, ISO inspector, partition scheme toggles (GPT/MBR, UEFI/BIOS), animated terminal log stream.
  - `styles/`: Tailwind CSS and custom skeuomorphic dark theme.

---

## ?? Pull Request Process

1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/my-enhancement
   ```
2. Make your changes adhering to existing TypeScript standards.
3. Verify that the build succeeds with zero type errors:
   ```bash
   pnpm build
   ```
4. Test the user flow thoroughly in **Simulation Mode**.
5. Push your branch and open a Pull Request against `main`.
6. Fill out the [Pull Request Template](.github/pull_request_template.md) completely.

---

## ?? Code of Conduct

All contributors are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful, constructive, and prioritize user system safety above all else.
