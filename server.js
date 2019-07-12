const https = require('https');
const fs = require('fs');

const server = https.createServer({
  key: fs.readFileSync(__dirname + '/server.key'),
  cert: fs.readFileSync(__dirname + '/server.crt'),
  ca: fs.readFileSync(__dirname + '/ca.crt'),
  requestCert: false,
  rejectUnauthorized: false,
  secureProtocol: 'TLSv1_2_method' // renegotiation not supported in TLSv1.3
});

server.on('request', (req, res) => {
  console.log('< incoming request at: ' + req.url);
  const result = req.connection.renegotiate({
    // update this to ask for client certificates or reject unauthorized request
    requestCert: false,
    rejectUnauthorized: false
  }, (err) => {
    if (err) {
      console.log('< renegotiate error: ', err);
      res.writeHead(500);
      res.write("-- Renegotiation Failed --\n");
      res.end(err.message);
      return;
    }
    console.log('< renegotiated peer certificate: ', req.connection.getPeerCertificate());
    res.writeHead(200);
    res.end("-- Renegotiated --");
  });
  console.log('< renegotiating: ', result)
});

const request = function (port, cb) {
  !cb && (cb = function () { /* (ಠ_ಠ) */ });

  https
    .request({
      host: 'localhost',
      port: port,
      path: '/',
      method: 'GET',
      rejectUnauthorized: false
    }, function (res) {
      console.log('  > request status: ' + res.statusCode);
      res.on('data', function (chunk) {
        console.log('  > response chunk: ' + chunk);
      });
    })
    .on('socket', (socket) => {
      socket
        .on('connect', () => {
          console.log('  > request socket connect');
        })
        .on('secureConnect', () => {
          console.log('  > request socket secureConnect');
          console.log('  > request socket authorized', socket.authorized);
          console.log('  > request socket authorizationError', socket.authorizationError);
          console.log('  > request socket protocol: ' + socket.getProtocol());
          console.log('  > request socket cipher: ' + JSON.stringify(socket.getCipher()));
        })
        .on('error', (error) => {
          console.log('  > request socket error: ', error);
        })
        .on('_tlsError', (error) => {
          console.log('  > request socket _tlsError: ', error);
        });
    })
    .on('error', function (e) {
      console.log('  > request error: ' + e.message);
    })
    .on('close', cb)
    .end();
};

module.exports = {
  server: server,
  request: request
};

!module.parent && server.listen(5050, (err) => {
  if (err) {
    return console.log('< server error: ', err);
  }

  console.log('< server listening at: https://localhost:5050');

  console.log('\nTEST: https.request - Node.js')
  request(5050);
});