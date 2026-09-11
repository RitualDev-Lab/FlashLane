import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DriveSelector } from './components/DriveSelector';
import { ImageSelector } from './components/ImageSelector';
import { PartitionConfig } from './components/PartitionConfig';
import { FlashConsole } from './components/FlashConsole';
import { SafetyModal } from './components/SafetyModal';
import { HelpModal } from './components/HelpModal';
import { LogViewer } from './components/LogViewer';
import { UsbDrive, ImageMetadata, FlashOptions, FlashProgress, FlashResult, LogEntry } from '../shared/types';

export const App: React.FC = () => {
  const [drives, setDrives] = useState<UsbDrive[]>([]);
  const [selectedDriveId, setSelectedDriveId] = useState<string>('');
  const [isScanningDrives, setIsScanningDrives] = useState(false);

  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);

  const [isSimulation, setIsSimulation] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [progress, setProgress] = useState<FlashProgress | null>(null);
  const [lastResult, setLastResult] = useState<FlashResult | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const [options, setOptions] = useState<FlashOptions>({
    imagePath: '',
    driveId: '',
    partitionScheme: 'MBR',
    targetSystem: 'BIOS',
    fileSystem: 'FAT32',
    clusterSize: 4096,
    volumeLabel: 'BOOTABLE_USB',
    verifyAfterWrite: true,
    quickFormat: true,
    isSimulation: false,
  });

  // Keep options in sync with simulation toggle
  useEffect(() => {
    setOptions((prev) => ({ ...prev, isSimulation }));
  }, [isSimulation]);

  // Load USB Drives
  const refreshDrives = useCallback(async () => {
    setIsScanningDrives(true);
    try {
      const detected = await window.electronAPI?.listDrives();
      if (detected) {
        setDrives(detected);
        if (detected.length > 0) {
          // Keep current selection if still valid, otherwise pick first non-system drive
          const stillValid = detected.find((d) => d.id === selectedDriveId);
          if (!stillValid) {
            const firstUsb = detected.find((d) => !d.isSystemDrive) || detected[0];
            setSelectedDriveId(firstUsb.id);
            setOptions((prev) => ({ ...prev, driveId: firstUsb.id }));
          }
        } else {
          setSelectedDriveId('');
          setOptions((prev) => ({ ...prev, driveId: '' }));
        }
      }
    } catch (err) {
      console.error('Failed to enumerate drives:', err);
    } finally {
      setIsScanningDrives(false);
    }
  }, [selectedDriveId]);

  useEffect(() => {
    refreshDrives();

    // Listen to real-time progress & logs
    const cleanupProgress = window.electronAPI?.onProgress((prog) => {
      setProgress(prog);
      if (prog.phase === 'completed' || prog.phase === 'error' || prog.phase === 'cancelled') {
        setIsFlashing(false);
      }
    });

    const cleanupLog = window.electronAPI?.onLog((entry) => {
      setLogs((prev) => [...prev, entry]);
    });

    return () => {
      cleanupProgress?.();
      cleanupLog?.();
    };
  }, []);

  // Update drive in options when selection changes
  const handleSelectDrive = (driveId: string) => {
    setSelectedDriveId(driveId);
    setOptions((prev) => ({ ...prev, driveId }));
  };

  // Image Selection Handler
  const handleSelectImage = async () => {
    try {
      const filePath = await window.electronAPI?.selectImage();
      if (!filePath) return;

      const metadata = await window.electronAPI?.inspectImage(filePath);
      setImageMetadata(metadata);
      setOptions((prev) => {
        // Auto-configure recommended scheme based on detected image boot type
        const isGpt = metadata.bootType === 'uefi_only';
        const cleanName = metadata.fileName
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 16)
          .toUpperCase();

        return {
          ...prev,
          imagePath: metadata.filePath,
          volumeLabel: cleanName || 'BOOTABLE_USB',
          partitionScheme: isGpt ? 'GPT' : 'MBR',
          targetSystem: isGpt ? 'UEFI' : 'BIOS',
        };
      });

      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          message: `Loaded image: ${metadata.fileName} (${metadata.fileSizeFormatted}, OS: ${metadata.osLabel || 'Generic'})`,
        },
      ]);
    } catch (err: any) {
      console.error('Failed to inspect image:', err);
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `Failed to load image: ${err.message}`,
        },
      ]);
    }
  };

  const selectedDrive = drives.find((d) => d.id === selectedDriveId) || null;
  const canStart = Boolean(
    selectedDriveId &&
      imageMetadata &&
      selectedDrive &&
      !selectedDrive.isSystemDrive &&
      !isFlashing
  );

  // Trigger Confirmation Modal before starting
  const handleStartFlashRequest = () => {
    if (!canStart) return;
    setIsSafetyModalOpen(true);
  };

  // Actual flash execution
  const handleConfirmStartFlash = async () => {
    setIsSafetyModalOpen(false);
    setIsFlashing(true);
    setLastResult(null);

    try {
      const result = await window.electronAPI?.startFlash(options);
      setLastResult(result);
    } catch (err: any) {
      setLastResult({
        success: false,
        durationSeconds: 0,
        bytesWritten: 0,
        averageSpeedMBs: 0,
        checksumVerified: false,
        error: err.message,
      });
    } finally {
      setIsFlashing(false);
    }
  };

  // Abort flash
  const handleCancelFlash = async () => {
    try {
      await window.electronAPI?.cancelFlash();
    } catch (err) {
      console.error('Failed to cancel flash:', err);
    }
  };

  const handleReset = () => {
    setLastResult(null);
    setProgress(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090d16] text-slate-100 overflow-hidden">
      {/* Titlebar with Window Controls */}
      <Header
        isSimulation={isSimulation}
        setIsSimulation={setIsSimulation}
        isFlashing={isFlashing}
        onOpenHelp={() => setIsHelpModalOpen(true)}
      />

      {/* Main Configuration Panels */}
      <main className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <DriveSelector
          drives={drives}
          selectedDriveId={selectedDriveId}
          onSelectDrive={handleSelectDrive}
          onRefresh={refreshDrives}
          isLoading={isScanningDrives}
          disabled={isFlashing}
        />

        <ImageSelector
          imageMetadata={imageMetadata}
          onSelectImage={handleSelectImage}
          disabled={isFlashing}
        />

        <PartitionConfig
          options={options}
          setOptions={setOptions}
          disabled={isFlashing}
        />

        <FlashConsole
          isFlashing={isFlashing}
          progress={progress}
          lastResult={lastResult}
          canStart={canStart}
          isSimulation={isSimulation}
          onStartFlash={handleStartFlashRequest}
          onCancelFlash={handleCancelFlash}
          onReset={handleReset}
        />

        <LogViewer logs={logs} onClearLogs={() => setLogs([])} />
      </main>

      {/* Modals */}
      <SafetyModal
        isOpen={isSafetyModalOpen}
        drive={selectedDrive}
        image={imageMetadata}
        options={options}
        onConfirm={handleConfirmStartFlash}
        onClose={() => setIsSafetyModalOpen(false)}
      />

      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </div>
  );
};
