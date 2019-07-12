# Electron TLS Renegotiation

## Introduction
This demonstrate the issue with [TLS renegotiation](https://tools.ietf.org/html/rfc5746) on Electron v4 (renderer vs main process).

Until v3, [electron/node](https://github.com/electron/node) ships with OpenSSL. But v4 uses [BoringSSL](https://boringssl.googlesource.com/boringssl/) in both Node.js & Chromium.
OpenSSL enables TLS renegotiation by default but, got [disabled in BoringSSL](https://boringssl.googlesource.com/boringssl/+/HEAD/PORTING.md#tls-renegotiation).

However, Chromium [configured](https://github.com/chromium/chromium/blob/b0f4dc2fd8ae746df32f281a74fc05c16ead6e6a/net/socket/ssl_client_socket_impl.cc#L895) BoringSSL to allow renegotiations using:
```cpp
SSL_set_renegotiate_mode(ssl_.get(), ssl_renegotiate_freely);
```

But, its not patched in electron/node and there's no programmatic API to configure this on runtime as well.
Which means TLS renegotiation is disabled on the main process.

## Issues
- Open Issue: https://github.com/electron/electron/issues/18380
- On renegotiation client request from the main process will be failed because of `socket hang up`.
- Local server running on the main process fails to initiate renegotiate request.

## Setup
```console
# clone this repository
$ git clone https://github.com/codenirvana/electron-tls-renegotiation.git

# install dependencies
$ npm install
```

## Test & Verify
```console
# test with Electron v3
$ npm run test-v3

# test with Electron v4
$ npm run test-v4

# test and run a local server
$ npm run server
```

**Tests:**
- renegotiation on Node.js
- renegotiation on main process
- renegotiation on renderer process

`npm run test-v4` fails with following error log:
```
> request error: socket hang up
> request error: 140552750683976:error:100000b6:SSL routines:OPENSSL_internal:NO_RENEGOTIATION:../../third_party/boringssl/src/ssl/ssl_lib.cc:966:
```

## Summary
| Electron | Chromium  | Node.js   | Renegotiation (renderer) | Renegotiation (main) |
|----------|-----------|-----------|--------------------------|----------------------|
| v3       | BoringSSL |**OpenSSL**| ✅                       | ✅                   |
| v4       | BoringSSL | BoringSSL | ✅                       | ❌                   |
