# Electron TLS Renegotiation

This demonstrate the issue with Electron v4 during [TLS renegotiation](https://tools.ietf.org/html/rfc5746).

## Electron v3 vs v4
**Electron v3**
- [electron/node](https://github.com/electron/node) ships with OpenSSL
- OpenSSL enables TLS renegotiation by default

**Electron v4**
- Both Node.js & Chromium uses [BoringSSL](https://boringssl.googlesource.com/boringssl/)
- Renegotiation is [disabled in BoringSSL](https://boringssl.googlesource.com/boringssl/+/HEAD/PORTING.md#tls-renegotiation) by default

However, Chromium [configured](https://github.com/chromium/chromium/blob/b0f4dc2fd8ae746df32f281a74fc05c16ead6e6a/net/socket/ssl_client_socket_impl.cc#L895) BoringSSL to allow renegotiations using:
```cpp
SSL_set_renegotiate_mode(ssl_.get(), ssl_renegotiate_freely);
```

But, its not patched in `electron/node` and there's no API to configure this on runtime as well.
Which means TLS renegotiation is disabled on the main process.

## Issues
- Open Issue: https://github.com/electron/electron/issues/18380
- On renegotiation, client request via main process fails because of `socket hang up`
- Local server running on the main process fails to initiate renegotiate request

## Setup
```console
$ git clone https://github.com/codenirvana/electron-tls-renegotiation.git

$ npm install           # install dependencies
```

## Test & Verify
```console
$ npm run test-v3       # test with Electron v3

$ npm run test-v4       # test with Electron v4

$ npm run server        # test and run a local server
```

### Tests
- renegotiation on Node.js
- renegotiation on Electron's main process (https.request)
- renegotiation on Electron's renderer process (BrowserWindow~loadUrl)

### Logs
<details><summary>Node.js</summary>

```
$ npm run server

< server listening at: https://localhost:5050

TEST: https.request - Node.js
  > request socket connect
  > request socket secureConnect
  > request socket authorized false
  > request socket authorizationError SELF_SIGNED_CERT_IN_CHAIN
  > request socket protocol: TLSv1.2
  > request socket cipher: {"name":"ECDHE-RSA-AES128-GCM-SHA256","version":"TLSv1/SSLv3"}
< incoming request at: /
< renegotiating:  true
  > request socket secureConnect
  > request socket authorized false
  > request socket authorizationError SELF_SIGNED_CERT_IN_CHAIN
  > request socket protocol: TLSv1.2
  > request socket cipher: {"name":"ECDHE-RSA-AES128-GCM-SHA256","version":"TLSv1/SSLv3"}
< renegotiated peer certificate:  {}
  > request status: 200
  > response chunk: -- Renegotiated --
```
</details>

<details><summary>Electron v3</summary>

```
$ npm run test-v3

TEST: https.request - main process
  > request socket connect
  > request socket secureConnect
  > request socket authorized false
  > request socket authorizationError SELF_SIGNED_CERT_IN_CHAIN
  > request socket protocol: TLSv1.2
  > request socket cipher: {"name":"ECDHE-RSA-AES128-GCM-SHA256","version":"TLSv1/SSLv3"}
< incoming request at: /
< renegotiating:  true
  > request socket secureConnect
  > request socket authorized false
  > request socket authorizationError SELF_SIGNED_CERT_IN_CHAIN
  > request socket protocol: TLSv1.2
  > request socket cipher: {"name":"ECDHE-RSA-AES128-GCM-SHA256","version":"TLSv1/SSLv3"}
< renegotiated peer certificate:  {}
  > request status: 200
  > response chunk: -- Renegotiated --


TEST: BrowserWindow~loadURL - renderer process
< incoming request at: /
< renegotiating:  true
< renegotiated peer certificate:  {}
```
</details>

<details><summary>Electron v4</summary>

```
$ npm run test-v4

TEST: https.request - main process
  > request socket connect
  > request socket secureConnect
  > request socket authorized false
  > request socket authorizationError SELF_SIGNED_CERT_IN_CHAIN
  > request socket protocol: TLSv1.2
  > request socket cipher: {"name":"ECDHE-RSA-AES128-GCM-SHA256","version":"TLSv1/SSLv3"}
< incoming request at: /
< renegotiating:  true
  > request error: socket hang up
  > request socket _tlsError:  [Error: 140400950314152:error:100000b6:SSL routines:OPENSSL_internal:NO_RENEGOTIATION:../../third_party/boringssl/src/ssl/ssl_lib.cc:966:
]
  > request error: 140400950314152:error:100000b6:SSL routines:OPENSSL_internal:NO_RENEGOTIATION:../../third_party/boringssl/src/ssl/ssl_lib.cc:966:

  > request socket error:  [Error: 140400950314152:error:100000b6:SSL routines:OPENSSL_internal:NO_RENEGOTIATION:../../third_party/boringssl/src/ssl/ssl_lib.cc:966:
]


TEST: BrowserWindow~loadURL - renderer process
< incoming request at: /
< renegotiating:  true
< renegotiated peer certificate:  {}
```
</details>

**Renderer Process:**
Renegotiation works on both v3 and v4.

<img width="412" alt="Screenshot" src="https://user-images.githubusercontent.com/4865836/61164289-8c757800-a531-11e9-80fe-1b5c9080e138.png">


**Main Process:**
`socket hang up` on v4, error log:
```
> request error: socket hang up
> request error: 140552750683976:error:100000b6:SSL routines:OPENSSL_internal:NO_RENEGOTIATION:../../third_party/boringssl/src/ssl/ssl_lib.cc:966:
```

## Summary
| Electron | Chromium  | Node.js   | Renegotiation (renderer) | Renegotiation (main) |
|----------|-----------|-----------|--------------------------|----------------------|
| v3       | BoringSSL |**OpenSSL**| ✅                       | ✅                   |
| v4       | BoringSSL | BoringSSL | ✅                       | ❌                   |
