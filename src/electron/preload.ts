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
});
