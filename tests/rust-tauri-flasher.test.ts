import { describe, it, expect, beforeEach } from 'vitest';
import {
  tauriFlasher,
  isTauriEnvironment,
  verifyChecksumDigest,
  validateGpgSignatureArmored,
} from '../src/shared/tauri-bridge';
import type { MultiDeviceProgress } from '../src/shared/types';

describe('FlashLane Rust & Tauri Migration Engine', () => {
  describe('Environment & Runtime Detection', () => {
    it('gracefully detects environment outside browser/Tauri', () => {
      expect(isTauriEnvironment()).toBe(false);
    });

    it('detects available storage drives with fallback capability', async () => {
      const drives = await tauriFlasher.detectDrives();
      expect(Array.isArray(drives)).toBe(true);
      expect(drives.length).toBeGreaterThan(0);
      expect(drives[0].isRemovable).toBe(true);
      expect(drives[0].devicePath).toBeDefined();
    });
  });

  describe('Automated GPG & Cryptographic Checksum Verification', () => {
    it('matches exact lowercase and uppercase SHA-256 hashes', () => {
      const hash = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
      expect(verifyChecksumDigest(hash, hash)).toBe(true);
      expect(verifyChecksumDigest(hash, hash.toUpperCase())).toBe(true);
      expect(verifyChecksumDigest(hash, '0000000000000000000000000000000000000000000000000000000000000000')).toBe(false);
    });

    it('returns true when no expected checksum is specified', () => {
      expect(verifyChecksumDigest('some-hash', undefined)).toBe(true);
    });

    it('validates authentic ASCII-armored OpenPGP signature blocks', () => {
      const armoredSig = `
-----BEGIN PGP SIGNATURE-----
Version: GnuPG v2.4.0 (Linux)
Comment: RitualDev Lab Official Signing Key

iQIzBAABCAAdFiEE5IKzWn...
=aBcD
-----END PGP SIGNATURE-----
      `;

      const result = validateGpgSignatureArmored(armoredSig);
      expect(result.valid).toBe(true);
      expect(result.algorithm).toBe('RSA');
      expect(result.signer).toContain('RitualDev');
      expect(result.fingerprint).toBeDefined();
    });

    it('rejects malformed or truncated GPG signatures', () => {
      const badSig = '-----BEGIN PGP SIGNATURE-----\nCorrupted signature content with missing footer';
      const result = validateGpgSignatureArmored(badSig);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Malformed');
    });

    it('performs full image verification using verifyImage()', async () => {
      const fakeSha = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const result = await tauriFlasher.verifyImage(fakeSha, {
        expectedChecksum: fakeSha,
      });

      expect(result.isValid).toBe(true);
      expect(result.checksumMatches).toBe(true);
    });
  });

  describe('Simultaneous Multi-Device Block I/O Imaging', () => {
    it('broadcasts block chunks simultaneously to multiple target drives', async () => {
      const targetDrives = ['\\\\.\\PhysicalDrive1', '\\\\.\\PhysicalDrive2', '\\\\.\\PhysicalDrive3'];
      const progressSnapshots: MultiDeviceProgress[] = [];

      const result = await tauriFlasher.flashMultiDevice(
        {
          imagePath: '/tmp/test-ubuntu.iso',
          driveIds: targetDrives,
          partitionScheme: 'GPT',
          targetSystem: 'UEFI',
          fileSystem: 'RAW_DD',
          verifyAfterWrite: true,
          isSimulation: true,
        },
        (prog) => {
          progressSnapshots.push({ ...prog });
        }
      );

      expect(result.success).toBe(true);
      expect(result.totalBytesWritten).toBe(300 * 1024 * 1024); // 100MB * 3 drives
      expect(progressSnapshots.length).toBeGreaterThanOrEqual(4);

      // Verify that the final progress snapshot shows 100% completion across all drives
      const last = progressSnapshots[progressSnapshots.length - 1];
      expect(last.overallPercentage).toBe(100);
      expect(last.activeDrives).toBe(3);
      expect(last.completedDrives).toBe(3);
      expect(last.failedDrives).toBe(0);

      for (const driveId of targetDrives) {
        expect(last.deviceProgress[driveId].phase).toBe('completed');
        expect(last.deviceProgress[driveId].percentage).toBe(100);
      }
    });
  });

  describe('Embedded PXE / Network Boot Server Lifecycle', () => {
    beforeEach(async () => {
      await tauriFlasher.stopPxeServer();
    });

    it('initializes and starts the embedded PXE server with TFTP/HTTP ports', async () => {
      const status = await tauriFlasher.startPxeServer({
        isoPath: 'C:\\images\\ubuntu-live-server.iso',
        bindAddress: '0.0.0.0',
        tftpPort: 69,
        httpPort: 8080,
        dhcpProxyEnabled: true,
        bootloaderFileName: 'ipxe.efi',
      });

      expect(status.running).toBe(true);
      expect(status.bindAddress).toBe('0.0.0.0');
      expect(status.tftpPort).toBe(69);
      expect(status.httpPort).toBe(8080);

      const live = tauriFlasher.getPxeStatus();
      expect(live.running).toBe(true);
    });

    it('validates configuration and rejects invalid TFTP ports', async () => {
      await expect(
        tauriFlasher.startPxeServer({
          isoPath: 'C:\\images\\ubuntu.iso',
          bindAddress: '127.0.0.1',
          tftpPort: 99999, // Invalid port > 65535
          httpPort: 8080,
          dhcpProxyEnabled: false,
          bootloaderFileName: 'bootx64.efi',
        })
      ).rejects.toThrow('Invalid TFTP port');
    });

    it('cleanly stops running PXE server and resets status', async () => {
      await tauriFlasher.startPxeServer({
        isoPath: 'C:\\images\\fedora.iso',
        bindAddress: '192.168.1.100',
        tftpPort: 69,
        httpPort: 8080,
        dhcpProxyEnabled: true,
        bootloaderFileName: 'pxelinux.0',
      });

      const stopResult = await tauriFlasher.stopPxeServer();
      expect(stopResult.running).toBe(false);
      expect(tauriFlasher.getPxeStatus().running).toBe(false);
    });
  });
});
