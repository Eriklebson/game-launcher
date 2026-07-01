import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getGames: () => ipcRenderer.invoke('get-games'),
  saveGames: (games: any[]) => ipcRenderer.invoke('save-games', games),
  deleteGame: (gameId: string) => ipcRenderer.invoke('delete-game', gameId),
  scanGames: () => ipcRenderer.invoke('scan-games'),
  selectExe: () => ipcRenderer.invoke('select-exe'),
  selectImage: () => ipcRenderer.invoke('select-image'),
  launchGame: (gameId: string) => ipcRenderer.invoke('launch-game', gameId),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  getCachedAchievements: (gameId: string) => ipcRenderer.invoke('get-cached-achievements', gameId),
  getPlaySessions: (gameId: string) => ipcRenderer.invoke('get-play-sessions', gameId),
  getStats: () => ipcRenderer.invoke('get-stats'),
  getSteamStoreInfo: (steamAppId: string) => ipcRenderer.invoke('get-steam-store-info', steamAppId),
  hasStellarBladeSave: () => ipcRenderer.invoke('has-stellar-blade-save'),
  parseStellarBladeSave: () => ipcRenderer.invoke('parse-stellar-blade-save'),
  // Achievement Notification (system-level overlay)
  showAchievementNotification: (data: { name: string; description: string; gameName: string; icon?: string }) => ipcRenderer.send('show-achievement-notification', data),
  hideAchievementNotification: () => ipcRenderer.send('hide-achievement-notification'),
  onNotificationHidden: () => ipcRenderer.send('notification-hidden'),
  onShowAchievement: (callback: (data: any) => void) => ipcRenderer.on('show-achievement', (_event, data) => callback(data)),
  onHideAchievement: (callback: () => void) => ipcRenderer.on('hide-achievement', () => callback()),
  // Hardware Monitor
  openMonitor: () => ipcRenderer.send('open-monitor'),
  closeMonitor: () => ipcRenderer.send('close-monitor'),
  requestHardwareStats: () => ipcRenderer.send('request-hardware-stats'),
  onHardwareStats: (callback: (data: any) => void) => ipcRenderer.on('hardware-stats', (_event, data) => callback(data)),
  // FPS Monitoring (PresentMon)
  startFpsMonitor: (processName: string) => ipcRenderer.send('start-fps-monitor', processName),
  stopFpsMonitor: () => ipcRenderer.send('stop-fps-monitor'),
  checkFpsAvailability: () => ipcRenderer.sendSync('check-fps-availability'),
  // CPU temp elevation
  elevateCpuTemp: () => ipcRenderer.invoke('elevate-cpu-temp'),
});
