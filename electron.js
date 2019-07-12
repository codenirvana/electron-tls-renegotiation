const { app, BrowserWindow } = require('electron');
const { request } = require('./server');

// allow self-signed certificates
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');

app.on('ready', function () {
  const window = new BrowserWindow({ width: 300, height: 200 });

  // with Electron v4 renegotiation fails on https request
  console.log('TEST: https.request - main process');
  request(5050, () => {
    // but, passes on browser window
    console.log('\nTEST: BrowserWindow~loadURL - renderer process');
    window.loadURL('https://localhost:5050');
  });
})
