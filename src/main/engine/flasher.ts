import fs from 'fs';
import { FlashOptions, FlashProgress, FlashResult } from '../../shared/types';
import { FlashingSimulator } from './simulator';
import { PhysicalFlasher } from './physical-flasher';

export class DiskFlasher {
  private simulator = new FlashingSimulator();
  private physicalFlasher = new PhysicalFlasher();
  private isCancelled = false;

  public cancel() {
    this.isCancelled = true;
    this.simulator.cancel();
    this.physicalFlasher.cancel();
  }

  public async flash(
    options: FlashOptions,
    onProgress: (progress: FlashProgress) => void,
    onLog: (msg: string, level?: 'info' | 'warn' | 'error' | 'success') => void
  ): Promise<FlashResult> {
    this.isCancelled = false;

    // Strict safety check: If drive is physical drive 0 or system drive, abort immediately
    if (
      options.driveId.toUpperCase() === '\\\\.\\PHYSICALDRIVE0' ||
      options.driveId === '/dev/sda' ||
      options.driveId === '/dev/disk0'
    ) {
      const msg = 'CRITICAL SAFETY ABORT: Attempted to write to Primary System OS Disk!';
      onLog(msg, 'error');
      return {
        success: false,
        durationSeconds: 0,
        bytesWritten: 0,
        averageSpeedMBs: 0,
        checksumVerified: false,
        error: msg,
      };
    }

    // Measure file size
    let imageSize = 0;
    try {
      const stats = await fs.promises.stat(options.imagePath);
      imageSize = stats.size;
    } catch {
      imageSize = 2 * 1024 * 1024 * 1024; // fallback 2GB if testing
    }

    // If simulation mode or virtual drive, delegate to simulator
    if (options.isSimulation || options.driveId.includes('SIMULATED')) {
      onLog('⚡ Running in Simulation Mode [Dry Run]', 'info');
      return this.simulator.runSimulation(options, imageSize, onProgress, onLog);
    }

    // REAL HARDWARE WRITE:
    onLog('🔥 PHYSICAL HARDWARE WRITE INITIATED: Real byte/block write to USB hardware', 'warn');
    return await this.physicalFlasher.flash(options, imageSize, onProgress, onLog);
  }
}
