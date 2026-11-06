#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod flasher;
mod pxe;

use flasher::{ImageVerifier, MultiDeviceFlasher, MultiDeviceFlashReport, VerificationReport};
use pxe::{EmbeddedPxeServer, PxeConfig, PxeStatus};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

pub struct AppState {
    pub pxe_server: Arc<Mutex<Option<EmbeddedPxeServer>>>,
    pub current_flasher: Arc<Mutex<Option<Arc<MultiDeviceFlasher>>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriveInfo {
    pub id: String,
    pub device_path: String,
    pub name: String,
    pub model: String,
    pub vendor: String,
    pub size_bytes: u64,
    pub is_removable: bool,
    pub is_system_drive: bool,
}

#[tauri::command]
fn detect_drives() -> Result<Vec<DriveInfo>, String> {
    let mut drives = Vec::new();
    let sys = sysinfo::Disks::new_with_refreshed_list();

    for disk in sys.list() {
        let name = disk.name().to_string_lossy().to_string();
        let mount_point = disk.mount_point().to_string_lossy().to_string();
        let is_removable = disk.is_removable();

        drives.push(DriveInfo {
            id: mount_point.clone(),
            device_path: mount_point,
            name: if name.is_empty() { "Removable Storage".into() } else { name },
            model: "Generic Storage Device".into(),
            vendor: "Standard".into(),
            size_bytes: disk.total_space(),
            is_removable,
            is_system_drive: !is_removable,
        });
    }

    Ok(drives)
}

#[tauri::command]
fn verify_image_gpg_and_checksum(
    image_path: String,
    expected_checksum: Option<String>,
    sig_path: Option<String>,
) -> Result<VerificationReport, String> {
    ImageVerifier::verify_image_full(
        &image_path,
        expected_checksum.as_deref(),
        sig_path.as_deref(),
        None,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn flash_multi_device(
    app: AppHandle,
    state: State<'_, AppState>,
    image_path: String,
    drive_ids: Vec<String>,
    is_simulation: bool,
) -> Result<MultiDeviceFlashReport, String> {
    let flasher = Arc::new(MultiDeviceFlasher::new(
        image_path,
        drive_ids,
        is_simulation,
    ));

    {
        let mut guard = state.current_flasher.lock().map_err(|e| e.to_string())?;
        *guard = Some(flasher.clone());
    }

    let flasher_ref = flasher.clone();
    let app_handle = app.clone();

    let res = tokio::task::spawn_blocking(move || {
        flasher_ref.execute(|progresses, overall_pct| {
            let _ = app_handle.emit(
                "flash://progress",
                serde_json::json!({
                    "overallPercentage": overall_pct,
                    "devices": progresses
                }),
            );
        })
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string());

    {
        if let Ok(mut guard) = state.current_flasher.lock() {
            *guard = None;
        }
    }

    res
}

#[tauri::command]
fn cancel_flash(state: State<'_, AppState>) -> Result<(), String> {
    let guard = state.current_flasher.lock().map_err(|e| e.to_string())?;
    if let Some(ref flasher) = *guard {
        flasher.cancel();
    }
    Ok(())
}

#[tauri::command]
async fn start_pxe_server(
    state: State<'_, AppState>,
    config: PxeConfig,
) -> Result<PxeStatus, String> {
    let mut server = EmbeddedPxeServer::new(config);
    server.start().await.map_err(|e| e.to_string())?;
    let status = server.status();

    let mut guard = state.pxe_server.lock().map_err(|e| e.to_string())?;
    *guard = Some(server);

    Ok(status)
}

#[tauri::command]
fn stop_pxe_server(state: State<'_, AppState>) -> Result<(), String> {
    let mut guard = state.pxe_server.lock().map_err(|e| e.to_string())?;
    if let Some(mut server) = guard.take() {
        server.stop();
    }
    Ok(())
}

#[tauri::command]
fn get_pxe_server_status(state: State<'_, AppState>) -> Result<PxeStatus, String> {
    let guard = state.pxe_server.lock().map_err(|e| e.to_string())?;
    if let Some(ref server) = *guard {
        Ok(server.status())
    } else {
        Ok(PxeStatus {
            running: false,
            bind_ip: None,
            tftp_port: None,
            http_port: None,
            active_clients: 0,
            served_requests: 0,
            uptime_seconds: 0,
        })
    }
}

fn main() {
    let state = AppState {
        pxe_server: Arc::new(Mutex::new(None)),
        current_flasher: Arc::new(Mutex::new(None)),
    };

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            detect_drives,
            verify_image_gpg_and_checksum,
            flash_multi_device,
            cancel_flash,
            start_pxe_server,
            stop_pxe_server,
            get_pxe_server_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running FlashLane Tauri application");
}
