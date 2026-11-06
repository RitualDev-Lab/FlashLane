export interface UsbDrive {
  id: string;
  devicePath: string;
  name: string;
  model: string;
  vendor: string;
  sizeBytes: number;
  sizeFormatted: string;
  busType: string;
  isRemovable: boolean;
  isSystemDrive: boolean;
  mountpoints: string[];
  partitionTable?: string;
}

export type ImageBootType = 'hybrid_iso' | 'uefi_only' | 'bios_mbr' | 'raw_disk' | 'unknown';

export interface ImageMetadata {
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  imageType: 'iso' | 'img' | 'bin' | 'raw' | 'dmg' | 'zip' | 'xz' | 'unknown';
  isBootable: boolean;
  bootType: ImageBootType;
  osLabel: string;
  sha256?: string;
  sha1?: string;
  md5?: string;
}

export interface FlashOptions {
  imagePath: string;
  driveId: string;
  partitionScheme: 'MBR' | 'GPT';
  targetSystem: 'BIOS' | 'UEFI';
  fileSystem: 'FAT32' | 'NTFS' | 'exFAT' | 'RAW_DD';
  clusterSize: number;
  volumeLabel: string;
  verifyAfterWrite: boolean;
  quickFormat: boolean;
  isSimulation: boolean;
}

export type FlashPhase =
  | 'idle'
  | 'preparing'
  | 'unmounting'
  | 'formatting'
  | 'writing'
  | 'verifying'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface FlashProgress {
  phase: FlashPhase;
  bytesWritten: number;
  totalBytes: number;
  percentage: number;
  speedMBs: number;
  etaSeconds: number;
  currentTask: string;
  errorMsg?: string;
}

export interface FlashResult {
  success: boolean;
  durationSeconds: number;
  bytesWritten: number;
  averageSpeedMBs: number;
  checksumVerified: boolean;
  error?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface GpgVerificationResult {
  valid: boolean;
  algorithm: 'RSA' | 'Ed25519' | 'ECDSA' | 'unknown';
  keyId?: string;
  fingerprint?: string;
  signer?: string;
  timestamp?: string;
  error?: string;
}

export interface MultiDeviceFlashOptions {
  imagePath: string;
  driveIds: string[];
  partitionScheme: 'MBR' | 'GPT';
  targetSystem: 'BIOS' | 'UEFI';
  fileSystem: 'FAT32' | 'NTFS' | 'exFAT' | 'RAW_DD';
  verifyAfterWrite: boolean;
  expectedChecksum?: string;
  gpgSignaturePath?: string;
  gpgPublicKey?: string;
  isSimulation?: boolean;
}

export interface MultiDeviceProgress {
  overallPercentage: number;
  deviceProgress: Record<string, FlashProgress>;
  activeDrives: number;
  completedDrives: number;
  failedDrives: number;
  totalBytes: number;
  bytesWritten: number;
}

export interface PxeServerConfig {
  isoPath: string;
  bindAddress: string;
  tftpPort: number;
  httpPort: number;
  dhcpProxyEnabled: boolean;
  bootloaderFileName: string;
}

export interface PxeServerStatus {
  running: boolean;
  bindAddress?: string;
  tftpPort?: number;
  httpPort?: number;
  activeClients: number;
  servedRequests: number;
  startedAt?: string;
}
