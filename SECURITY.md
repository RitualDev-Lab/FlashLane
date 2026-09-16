# Security Policy

The FlashLane engineering team treats system safety, disk integrity, and user data protection as paramount priorities. Because FlashLane interacts with raw disk devices and partition tables, our safety protocols are rigorous.

## Supported Versions

Security patches and updates are actively maintained for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

## Reporting a Security Vulnerability

If you discover a security vulnerability or critical safety flaw (such as a bypass of the system drive lockout, IPC privilege escalation, or unprompted disk writes):

1. **Do NOT open a public GitHub issue.** Public issues expose users and systems to risk before a defensive patch can be distributed.
2. **Use GitHub Private Vulnerability Reporting**:
   - Go to the **[Security tab](https://github.com/RitualDev-Lab/FlashLane/security)** on GitHub.
   - Click **"Report a vulnerability"** to open a private disclosure thread.
3. **Alternative Direct Email**:
   - If you cannot use GitHub private reporting, email our core security maintainers directly at:
     **`security@ritualdev.com`**
   - Please include:
     - Clear description of the vulnerability or safety bypass.
     - Operating system and version (Windows, Linux distro, or macOS version).
     - Reproduction steps or proof-of-concept (PoC).
     - Target drive types and physical mount configurations tested.

## Vulnerability Triage SLA

- **Initial Acknowledgment**: Within 24 hours.
- **Triage & Risk Assessment**: Within 48 hours.
- **Fix & Advisory Release**: Emergency patches for disk safety or privilege issues will be prioritized and published immediately.

---

## ??? Core Safety Guarantees & Safe Development

- **Mandatory System Disk Lock**: FlashLane source code permanently prohibits writing to `\\.\PhysicalDrive0`, `C:\`, `/`, or any drive flagged as containing the running OS or active swap/pagefile. Any code modifying these safety checks requires mandatory dual-maintainer review.
- **Safe Simulation Mode**: Contributors are strongly required to develop and test features using FlashLane's built-in **Simulation Mode** before attempting physical disk operations.
- **Zero Telemetry Guarantee**: FlashLane does not track user downloads, ISO names, disk identifiers, or telemetry. No external network requests are made during flashing.
