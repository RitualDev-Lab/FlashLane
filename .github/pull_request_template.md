## ?? Summary of Changes

<!-- Provide a concise explanation of the problem being solved or the feature being added -->

---

## ?? Type of Change

- [ ] ?? **Bug Fix** (non-breaking fix for an issue)
- [ ] ? **New Feature** (e.g. new filesystem option, image format support)
- [ ] ??? **Safety / Platform Hardware Guard** (disk discovery, partition safety)
- [ ] ?? **UI / UX Improvement** (aesthetic, terminal, progress indicators)
- [ ] ? **Performance Optimization** (chunked I/O speed, buffer handling)
- [ ] ?? **Documentation Update**

---

## ?? Platforms Tested

- [ ] **Windows 10 / 11**
- [ ] **Linux** (Ubuntu, Arch, Fedora, etc. — specify: _____________)
- [ ] **macOS** (Intel / Apple Silicon — specify: _____________)

---

## ??? Safety & Verification Checklist

- [ ] **Simulation Mode Verified**: Changes tested in non-destructive Simulation Mode with 0 errors.
- [ ] **Disk Lock Intact**: System drive lockout logic (`C:\`, root `/`, PhysicalDrive0) remains strictly uncompromised.
- [ ] **Type Safe**: `pnpm build` compiles cleanly with zero TypeScript errors.
- [ ] **Zero Telemetry**: No third-party network pings or telemetry code added.
- [ ] **Code Style**: Follows existing naming conventions and component hierarchy.

---

## ?? Screenshots / Video Demonstration (if applicable)

<!-- Attach screenshot of the UI or terminal log output -->
