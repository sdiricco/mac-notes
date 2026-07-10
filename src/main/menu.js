import { Menu, app, shell } from 'electron'

export function buildMenu(mainWindow) {
  const isMac = process.platform === 'darwin'

  const send = (channel) => mainWindow.webContents.send(channel)

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              {
                label: 'Impostazioni…',
                accelerator: 'CmdOrCtrl+,',
                click: () => send('menu:settings')
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Nuova Nota',
          accelerator: 'CmdOrCtrl+N',
          click: () => send('menu:new-note')
        },
        {
          label: 'Nuova Cartella',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => send('menu:new-folder')
        },
        {
          label: 'Duplica Nota',
          accelerator: 'CmdOrCtrl+D',
          click: () => send('menu:duplicate-note')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Modifica',
      submenu: [
        { role: 'undo', label: 'Annulla' },
        { role: 'redo', label: 'Ripeti' },
        { type: 'separator' },
        { role: 'cut', label: 'Taglia' },
        { role: 'copy', label: 'Copia' },
        { role: 'paste', label: 'Incolla' },
        { role: 'selectAll', label: 'Seleziona Tutto' },
        { type: 'separator' },
        {
          label: 'Cerca',
          accelerator: 'CmdOrCtrl+F',
          click: () => send('menu:focus-search')
        }
      ]
    },
    {
      label: 'Vista',
      submenu: [
        {
          label: 'Mostra/Nascondi Sidebar',
          accelerator: 'CmdOrCtrl+/',
          click: () => send('menu:toggle-sidebar')
        },
        {
          label: 'Scorciatoie da tastiera',
          click: () => send('menu:shortcuts')
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Finestra',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }])
      ]
    },
    {
      label: 'Aiuto',
      submenu: [
        {
          label: 'Repository su GitHub',
          click: async () => {
            await shell.openExternal('https://github.com')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
