use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::SystemTime;
use tokio::net::UdpSocket;
use tokio::sync::broadcast;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PxeConfig {
    pub iso_path: PathBuf,
    pub bind_ip: String,
    pub tftp_port: u16,
    pub http_port: u16,
    pub dhcp_proxy: bool,
    pub bootloader_file: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PxeStatus {
    pub running: bool,
    pub bind_ip: Option<String>,
    pub tftp_port: Option<u16>,
    pub http_port: Option<u16>,
    pub active_clients: u64,
    pub served_requests: u64,
    pub uptime_seconds: u64,
}

pub struct EmbeddedPxeServer {
    config: PxeConfig,
    is_running: Arc<AtomicBool>,
    served_requests: Arc<AtomicU64>,
    active_clients: Arc<AtomicU64>,
    start_time: Arc<std::sync::Mutex<Option<SystemTime>>>,
    shutdown_sender: Option<broadcast::Sender<()>>,
}

impl EmbeddedPxeServer {
    pub fn new(config: PxeConfig) -> Self {
        Self {
            config,
            is_running: Arc::new(AtomicBool::new(false)),
            served_requests: Arc::new(AtomicU64::new(0)),
            active_clients: Arc::new(AtomicU64::new(0)),
            start_time: Arc::new(std::sync::Mutex::new(None)),
            shutdown_sender: None,
        }
    }

    pub fn status(&self) -> PxeStatus {
        let running = self.is_running.load(Ordering::SeqCst);
        let uptime = if running {
            if let Ok(guard) = self.start_time.lock() {
                guard
                    .and_then(|t| t.elapsed().ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0)
            } else {
                0
            }
        } else {
            0
        };

        PxeStatus {
            running,
            bind_ip: if running {
                Some(self.config.bind_ip.clone())
            } else {
                None
            },
            tftp_port: if running {
                Some(self.config.tftp_port)
            } else {
                None
            },
            http_port: if running {
                Some(self.config.http_port)
            } else {
                None
            },
            active_clients: self.active_clients.load(Ordering::SeqCst),
            served_requests: self.served_requests.load(Ordering::SeqCst),
            uptime_seconds: uptime,
        }
    }

    pub async fn start(&mut self) -> anyhow::Result<()> {
        if self.is_running.load(Ordering::SeqCst) {
            return Ok(());
        }

        let (shutdown_tx, _) = broadcast::channel(1);
        self.shutdown_sender = Some(shutdown_tx.clone());
        self.is_running.store(true, Ordering::SeqCst);
        if let Ok(mut guard) = self.start_time.lock() {
            *guard = Some(SystemTime::now());
        }

        let bind_addr = format!("{}:{}", self.config.bind_ip, self.config.tftp_port);
        let running_flag = self.is_running.clone();
        let requests_counter = self.served_requests.clone();
        let bootloader_name = self.config.bootloader_file.clone();
        let mut shutdown_rx = shutdown_tx.subscribe();

        // Spawn lightweight TFTP handler task
        tokio::spawn(async move {
            let socket = match UdpSocket::bind(&bind_addr).await {
                Ok(s) => s,
                Err(err) => {
                    tracing::error!("Failed to bind TFTP socket: {}", err);
                    running_flag.store(false, Ordering::SeqCst);
                    return;
                }
            };

            let mut buf = [0u8; 1024];
            loop {
                tokio::select! {
                    _ = shutdown_rx.recv() => {
                        break;
                    }
                    recv_res = socket.recv_from(&mut buf) => {
                        if let Ok((len, peer_addr)) = recv_res {
                            if len >= 2 && buf[0] == 0 && buf[1] == 1 {
                                // TFTP Read Request (RRQ)
                                requests_counter.fetch_add(1, Ordering::SeqCst);
                                let req_str = String::from_utf8_lossy(&buf[2..len]);
                                tracing::info!("TFTP RRQ from {}: requested {}", peer_addr, req_str);

                                // Craft TFTP ACK or data packet response
                                let mut ack = vec![0, 3, 0, 1]; // Opcode 3 (DATA), Block 1
                                ack.extend_from_slice(format!("# RitualDev Bootloader - {}\n", bootloader_name).as_bytes());
                                let _ = socket.send_to(&ack, peer_addr).await;
                            }
                        }
                    }
                }
            }
        });

        Ok(())
    }

    pub fn stop(&mut self) {
        if let Some(tx) = self.shutdown_sender.take() {
            let _ = tx.send(());
        }
        self.is_running.store(false, Ordering::SeqCst);
        if let Ok(mut guard) = self.start_time.lock() {
            *guard = None;
        }
    }
}
