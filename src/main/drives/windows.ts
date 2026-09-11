import { exec } from 'child_process';
import { promisify } from 'util';
import { UsbDrive } from '../../shared/types';

const execAsync = promisify(exec);

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export async function detectWindowsDrives(): Promise<UsbDrive[]> {
  try {
    // PowerShell command query: Enumerate disks, specifically inspecting BusType, MediaType, and Partitions
    const psScript = `
      Get-CimInstance Win32_DiskDrive | ForEach-Object {
        $disk = $_
        $partitions = Get-CimAssociatedInstance -InputObject $disk -ResultClassName Win32_DiskPartition -ErrorAction SilentlyContinue
        $letters = @()
        $isSystem = $false

        foreach ($part in $partitions) {
          if ($part.BootPartition -or $part.PrimaryPartition) {
            # Inspect logical disks
            $logical = Get-CimAssociatedInstance -InputObject $part -ResultClassName Win32_LogicalDisk -ErrorAction SilentlyContinue
            foreach ($ld in $logical) {
              if ($ld.DeviceID) { $letters += $ld.DeviceID }
              if ($ld.DeviceID -eq "C:" -or $ld.DeviceID -eq "c:") { $isSystem = $true }
            }
          }
        }

        # Check bus type from MSFT_Disk if possible, otherwise use InterfaceType
        $busType = $disk.InterfaceType
        $isUsb = ($busType -eq "USB") -or ($disk.PNPDeviceID -match "USBSTOR") -or ($disk.MediaType -match "Removable")

        [PSCustomObject]@{
          DeviceID = $disk.DeviceID
          Model = $disk.Model
          Caption = $disk.Caption
          Size = [int64]$disk.Size
          InterfaceType = $disk.InterfaceType
          IsUSB = [bool]$isUsb
          IsSystem = [bool]$isSystem
          MountPoints = ($letters -join ",")
          PNPDeviceID = $disk.PNPDeviceID
        }
      } | ConvertTo-Json -Compress
    `;

    const command = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\r?\n/g, ' ')}"`;
    const { stdout } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });

    if (!stdout || !stdout.trim()) {
      return [];
    }

    let parsed: any;
    try {
      parsed = JSON.parse(stdout.trim());
    } catch {
      return [];
    }

    const items = Array.isArray(parsed) ? parsed : [parsed];
    const drives: UsbDrive[] = [];

    for (const item of items) {
      if (!item || !item.DeviceID) continue;

      const sizeBytes = Number(item.Size) || 0;
      const isUsb = Boolean(item.IsUSB);
      const isSystem = Boolean(item.IsSystem);
      const mountpoints = item.MountPoints ? item.MountPoints.split(',').filter(Boolean) : [];

      // Physical drive index from DeviceID e.g. \\.\PHYSICALDRIVE1
      const driveId = item.DeviceID;

      drives.push({
        id: driveId,
        devicePath: driveId,
        name: `${item.Caption || item.Model || 'USB Disk'} (${mountpoints.length > 0 ? mountpoints.join(', ') : 'Unassigned'})`,
        model: item.Model || 'Generic USB',
        vendor: (item.Caption || '').split(' ')[0] || 'USB',
        sizeBytes,
        sizeFormatted: formatBytes(sizeBytes),
        busType: item.InterfaceType || (isUsb ? 'USB' : 'Internal'),
        isRemovable: isUsb,
        isSystemDrive: isSystem || driveId.toUpperCase() === '\\\\.\\PHYSICALDRIVE0' && mountpoints.some((m: string) => m.toUpperCase().includes('C:')),
        mountpoints,
      });
    }

    return drives;
  } catch (err) {
    console.error('Failed to detect Windows drives via PowerShell:', err);
    return [];
  }
}
