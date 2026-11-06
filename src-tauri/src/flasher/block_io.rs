use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{File, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;

pub const SECTOR_SIZE: usize = 4096;
pub const BUFFER_SIZE: usize = 1024 * 1024; // 1 MB direct chunk buffer

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceWriteProgress {
    pub drive_id: String,
    pub bytes_written: u64,
    pub total_bytes: u64,
    pub percentage: f64,
    pub speed_mb_s: f64,
    pub completed: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiDeviceFlashReport {
    pub success: bool,
    pub duration_seconds: f64,
    pub total_bytes_written: u64,
    pub average_speed_mb_s: f64,
    pub device_reports: HashMap<String, DeviceWriteProgress>,
    pub error: Option<String>,
}

pub struct RawBlockDevice {
    path: PathBuf,
    is_simulation: bool,
}

impl RawBlockDevice {
    pub fn new(device_path: impl Into<PathBuf>, is_simulation: bool) -> Self {
        Self {
            path: device_path.into(),
            is_simulation,
        }
    }

    pub fn open_for_direct_write(&self) -> anyhow::Result<Box<dyn Write + Send>> {
        if self.is_simulation {
            let temp = tempfile::tempfile()?;
            return Ok(Box::new(temp));
        }

        #[cfg(target_os = "windows")]
        {
            // Open direct handle to physical drive "\\.\PhysicalDriveX"
            let file = OpenOptions::new()
                .read(true)
                .write(true)
                .open(&self.path)?;
            Ok(Box::new(file))
        }

        #[cfg(target_os = "linux")]
        {
            // Open Linux block device with direct/sync access
            let file = OpenOptions::new()
                .write(true)
                .open(&self.path)?;
            Ok(Box::new(file))
        }

        #[cfg(target_os = "macos")]
        {
            // Open macOS character raw device "/dev/rdiskX"
            let file = OpenOptions::new()
                .write(true)
                .open(&self.path)?;
            Ok(Box::new(file))
        }

        #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
        {
            let file = OpenOptions::new().write(true).open(&self.path)?;
            Ok(Box::new(file))
        }
    }
}

pub struct MultiDeviceFlasher {
    image_path: PathBuf,
    target_devices: Vec<String>,
    is_simulation: bool,
    cancelled: Arc<AtomicBool>,
}

impl MultiDeviceFlasher {
    pub fn new<P: AsRef<Path>>(
        image_path: P,
        target_devices: Vec<String>,
        is_simulation: bool,
    ) -> Self {
        Self {
            image_path: image_path.as_ref().to_path_buf(),
            target_devices,
            is_simulation,
            cancelled: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::SeqCst)
    }

    pub fn execute<F>(&self, mut progress_callback: F) -> anyhow::Result<MultiDeviceFlashReport>
    where
        F: FnMut(&HashMap<String, DeviceWriteProgress>, f64),
    {
        let start_time = Instant::now();
        let mut source_file = File::open(&self.image_path)?;
        let total_bytes = source_file.metadata()?.len();

        let mut outputs: Vec<(String, Box<dyn Write + Send>)> = Vec::new();
        let mut progresses: HashMap<String, DeviceWriteProgress> = HashMap::new();

        for drive_id in &self.target_devices {
            let device = RawBlockDevice::new(drive_id, self.is_simulation);
            let writer = device.open_for_direct_write()?;
            outputs.push((drive_id.clone(), writer));

            progresses.insert(
                drive_id.clone(),
                DeviceWriteProgress {
                    drive_id: drive_id.clone(),
                    bytes_written: 0,
                    total_bytes,
                    percentage: 0.0,
                    speed_mb_s: 0.0,
                    completed: false,
                    error: None,
                },
            );
        }

        let mut buffer = vec![0u8; BUFFER_SIZE];
        let mut total_written_all: u64 = 0;

        source_file.seek(SeekFrom::Start(0))?;

        while !self.is_cancelled() {
            let bytes_read = source_file.read(&mut buffer)?;
            if bytes_read == 0 {
                break;
            }

            let chunk = &buffer[..bytes_read];

            for (drive_id, writer) in outputs.iter_mut() {
                if let Err(e) = writer.write_all(chunk) {
                    if let Some(prog) = progresses.get_mut(drive_id) {
                        prog.error = Some(e.to_string());
                    }
                } else if let Some(prog) = progresses.get_mut(drive_id) {
                    prog.bytes_written += bytes_read as u64;
                    prog.percentage = (prog.bytes_written as f64 / total_bytes as f64) * 100.0;
                }
            }

            total_written_all += (bytes_read * outputs.len()) as u64;
            let elapsed_sec = start_time.elapsed().as_secs_f64().max(0.001);
            let current_speed = (total_written_all as f64 / (1024.0 * 1024.0)) / elapsed_sec;

            for prog in progresses.values_mut() {
                prog.speed_mb_s = current_speed / (outputs.len() as f64);
            }

            let overall_pct = (progresses.values().map(|p| p.percentage).sum::<f64>())
                / (outputs.len() as f64);

            progress_callback(&progresses, overall_pct);
        }

        let elapsed = start_time.elapsed().as_secs_f64().max(0.001);

        for (drive_id, writer) in outputs.iter_mut() {
            let _ = writer.flush();
            if let Some(prog) = progresses.get_mut(drive_id) {
                if prog.error.is_none() && !self.is_cancelled() {
                    prog.completed = true;
                    prog.percentage = 100.0;
                }
            }
        }

        let overall_success = !self.is_cancelled()
            && progresses.values().all(|p| p.completed && p.error.is_none());

        Ok(MultiDeviceFlashReport {
            success: overall_success,
            duration_seconds: elapsed,
            total_bytes_written: total_written_all,
            average_speed_mb_s: (total_written_all as f64 / (1024.0 * 1024.0)) / elapsed,
            device_reports: progresses,
            error: if self.is_cancelled() {
                Some("Flash operation cancelled by user".to_string())
            } else {
                None
            },
        })
    }
}
