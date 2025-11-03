#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::{
  ffi::OsStr,
  fs,
  path::{PathBuf},
};
use tauri::Manager;
#[derive(Serialize)]
struct TrackInfo {
  name: String,
  relative_path: Vec<String>,
  path: String,
}

#[derive(Serialize)]
struct FolderScanResult {
  folder_name: String,
  folder_path: String,
  tracks: Vec<TrackInfo>,
}

#[derive(Serialize)]
struct TextFileInfo {
  path: String,
  name: String,
}

fn scan_folder_sync(root: PathBuf) -> Result<FolderScanResult, String> {
  if !root.is_dir() {
    return Err("Selected path is not a directory".to_string());
  }

  println!("[scan-folder] Starting scan: {}", root.display());
  let folder_path = root
    .to_str()
    .map(|s| s.to_string())
    .unwrap_or_else(|| root.to_string_lossy().to_string());
  let folder_name = root
    .file_name()
    .and_then(|s| s.to_str())
    .map(|s| s.to_string())
    .unwrap_or_else(|| folder_path.clone());

  let root_clone = root.clone();
  let mut stack = vec![root];
  let mut tracks = Vec::new();

  while let Some(dir) = stack.pop() {
    let dir_display = dir.to_string_lossy().to_string();
    println!("[scan-folder] Visiting directory: {}", dir_display);
    let entries = fs::read_dir(&dir)
      .map_err(|err| format!("Failed to read directory {}: {}", dir_display, err))?;

    for entry in entries {
      let entry = entry
        .map_err(|err| format!("Failed to read entry in {}: {}", dir_display, err))?;
      let path = entry.path();
      let name_os = entry.file_name();
      let name = name_os.to_string_lossy().to_string();

      if path.is_dir() {
        if name.starts_with('.') {
          println!("[scan-folder] Skipping hidden dir: {}", path.display());
          continue;
        }
        println!("[scan-folder] Queueing dir: {}", path.display());
        stack.push(path);
        continue;
      }

      let is_mp3 = path
        .extension()
        .and_then(OsStr::to_str)
        .map(|ext| ext.eq_ignore_ascii_case("mp3"))
        .unwrap_or(false);
      if !is_mp3 {
        println!("[scan-folder] Skipping non-mp3 file: {}", path.display());
        continue;
      }

      let relative = match path.strip_prefix(&root_clone) {
        Ok(rel) => rel.to_path_buf(),
        Err(_) => path.clone(),
      };
      let components: Vec<String> = relative
        .components()
        .map(|comp| comp.as_os_str().to_string_lossy().to_string())
        .collect();
      let mut relative_path = components.clone();
      if !relative_path.is_empty() {
        relative_path.pop();
      }

      tracks.push(TrackInfo {
        name,
        relative_path,
        path: path.to_string_lossy().to_string(),
      });
      println!("[scan-folder] Added track: {}", path.display());
    }
  }

  println!(
    "[scan-folder] Completed scan: {} tracks found in {}",
    tracks.len(),
    folder_path
  );
  Ok(FolderScanResult {
    folder_name,
    folder_path,
    tracks,
  })
}

#[tauri::command]
async fn pick_folder_and_scan() -> Result<Option<FolderScanResult>, String> {
  let picked = tauri::async_runtime::spawn_blocking(|| rfd::FileDialog::new().pick_folder())
    .await
    .map_err(|err| err.to_string())?;

  let Some(folder) = picked else {
    println!("[scan-folder] Folder picker cancelled");
    return Ok(None);
  };

  println!("[scan-folder] Picked folder: {}", folder.display());
  let result = tauri::async_runtime::spawn_blocking(move || scan_folder_sync(folder))
    .await
    .map_err(|err| err.to_string())??;

  Ok(Some(result))
}

#[tauri::command]
async fn rescan_folder(path: String) -> Result<FolderScanResult, String> {
  let folder = PathBuf::from(path);
  println!("[scan-folder] Rescanning folder: {}", folder.display());
  tauri::async_runtime::spawn_blocking(move || scan_folder_sync(folder))
    .await
    .map_err(|err| err.to_string())?
}

#[tauri::command]
async fn pick_text_file() -> Result<Option<TextFileInfo>, String> {
  let picked = tauri::async_runtime::spawn_blocking(|| {
    rfd::FileDialog::new()
      .set_title("Select text file for now playing export")
      .add_filter("Text File", &["txt"])
      .set_file_name("now-playing.txt")
      .save_file()
  })
  .await
  .map_err(|err| err.to_string())?;

  let Some(path) = picked else {
    println!("[text-file] save dialog cancelled");
    return Ok(None);
  };

  let display_name = path
    .file_name()
    .and_then(|n| n.to_str())
    .map(|s| s.to_string())
    .unwrap_or_else(|| path.to_string_lossy().to_string());

  println!("[text-file] selected {}", path.display());
  Ok(Some(TextFileInfo {
    path: path.to_string_lossy().to_string(),
    name: display_name,
  }))
}

#[tauri::command]
async fn write_text_file(path: String, content: String) -> Result<(), String> {
  tauri::async_runtime::spawn_blocking(move || std::fs::write(PathBuf::from(path), content))
    .await
    .map_err(|err| err.to_string())?
    .map_err(|err| err.to_string())
}

#[tauri::command]
fn log_message(message: String) {
  println!("[frontend-log] {}", message);
}

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      let resolver = app.path();
      if let Ok(app_dir) = resolver.app_data_dir() {
        println!("App data dir: {}", app_dir.display());
      }
      if let Ok(config_dir) = resolver.app_config_dir() {
        println!("Config dir: {}", config_dir.display());
      }
      if let Ok(local_dir) = resolver.app_local_data_dir() {
        println!("Local data dir: {}", local_dir.display());
      }
      if let Ok(cache_dir) = resolver.app_cache_dir() {
        println!("Cache dir: {}", cache_dir.display());
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      pick_folder_and_scan,
      rescan_folder,
      pick_text_file,
      write_text_file,
      log_message,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
