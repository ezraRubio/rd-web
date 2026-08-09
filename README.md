# Fort RC Web Viewer

A session-only RustDesk web client managed by Fort. The viewer has no home screen or peer list — it opens in a popup, handshakes with the parent window, and connects to a remote machine over WebSocket relay.

## Architecture

The client is split into two layers that communicate through a JavaScript bridge:

| Layer                              | Role                                                                                                                                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Flutter UI** (`lib/`)            | Reuses the desktop remote-desktop and file-manager screens. On web, native Rust FFI is replaced by `lib/web/bridge.dart`, which calls `window.setByName` / `window.getByName`.                       |
| **JS protocol engine** (`js/src/`) | Implements rendezvous punch-hole, relay connection, NaCl box encryption, VP9 video decode (ogv.js), audio, and the file-transfer protocol. Protobuf messages are generated from the RustDesk schema. |

Sessions are registered in `js/src/connections/sessions.ts`. Remote desktop (`RdConnection`) and file transfer (`FtConnection`) sessions can run concurrently — each keyed by a UUID that Flutter assigns and passes on every bridge call.

## User flow

1. Fort opens the viewer in a popup. `document.referrer` becomes `window.__parentOrigin`.
2. On load, `web/index.html` generates an ECDH keypair and sends `VIEWER_READY` to the opener with a base64 SPKI public key.
3. The viewer shows a waiting screen until the parent receives a running remote session from the server.
4. Fort sends `REMOTE_SESSION_READY` with the peer ID, rendezvous server, licence key, session UUID, and an encrypted password token.
5. `js/src/bridge/init.js` decrypts the token, waits for Flutter to register `window.connect`, then starts the session.
6. Flutter pushes `RemotePage`, which calls `FFI.start` → `session_add_sync` → `session_start`. The JS layer punches a hole, connects through relay, logs in, and begins streaming.
7. The viewer ACKs success or failure to Fort. Fatal errors are also reported via `VIEWER_ERROR`.

## Remote desktop (RD) sessions

- **Connection class:** `js/src/connections/rd_connection.ts` (`kind: "remote-desktop"`)
- **Rendezvous type:** `ConnType.DEFAULT_CONN`
- **UI:** `lib/desktop/pages/remote_page.dart`
- **Video:** VP9 frames decoded by ogv.js, drawn to canvas via `js/src/helpers/video_draw.js`, pushed to Flutter as RGBA through `onRgba`.
- **Input:** Keyboard and mouse events from Flutter are forwarded through bridge handlers (`set_rd.js`) to the peer.
- **Features:** Clipboard sync, cursor rendering, display options, image quality, privacy mode, and audio (Opus worker).

Password prompts and most error dialogs on web are forwarded to the parent (`VIEWER_ERROR`) rather than shown inline, since the viewer is not meant for standalone use.

## File transfer (FT) sessions

- **Connection class:** `js/src/connections/ft_connection.ts` (`kind: "file-transfer"`)
- **Rendezvous type:** `ConnType.FILE_TRANSFER`
- **UI:** `lib/desktop/pages/file_manager_page.dart` (dual-pane local / remote browser)
- **Protocol:** `js/src/connections/ft/ft_protocol.ts` — read dir, send/receive files, create/rename/delete, folder zip upload.
- **Browser I/O:** `js/src/connections/ft/ft_browser_io.ts` — native file picker, folder upload (`webkitdirectory`), and download save targets.
- **Jobs:** `js/src/connections/ft/ft_jobs.ts` manages upload/download progress and block transfers.

FT sessions are typically opened from the **File transfer** button on the remote-desktop toolbar while an RD session is active. This creates a second concurrent session reusing the established `connToken` (password credentials). If the FT session ends or errors while RD is still open, only the file-manager route is closed — the remote desktop keeps running.

## Fort ↔ viewer protocol

Defined in `js/src/helpers/viewer-crypto.js`:

| Message                | Direction     | Payload                                                                  |
| ---------------------- | ------------- | ------------------------------------------------------------------------ |
| `VIEWER_READY`         | Viewer → Fort | `{ version: 1, publicKey }`                                              |
| `REMOTE_SESSION_READY` | Fort → Viewer | `{ version: 1, remoteSessionId, clientId, server, key, encryptedToken }` |
| `ACK`                  | Viewer → Fort | `{ result, error? }`                                                     |
| `VIEWER_ERROR`         | Viewer → Fort | `{ title, message, msgboxType }`                                         |

The encrypted token is a JWT envelope (`alg: none`) whose payload holds AES-GCM ciphertext of the password, an IV, and the parent's ephemeral ECDH public key. Key derivation: ECDH shared secret → HKDF-SHA256 (info: `fort-rc-token-v1`) → AES-256-GCM.

Origin checks: the viewer only accepts `REMOTE_SESSION_READY` from `window.opener` at `window.__parentOrigin`.

## Key directories

```
flutter/
├── lib/web/           # Dart ↔ JS bridge (bridge.dart, web_model.dart)
├── lib/desktop/pages/ # RemotePage, FileManagerPage (shared with desktop)
├── js/src/
│   ├── bridge/        # setByName/getByName dispatch, init, session handlers
│   ├── connections/   # rd_connection, ft_connection, websock, session_connect
│   ├── connections/ft/  # FT protocol, jobs, browser file I/O
│   ├── helpers/       # crypto, video, audio, viewer-crypto, push_event
│   └── proto/         # Generated protobuf types
└── web/               # index.html (viewer bootstrap), ogv.js, built js/dist/
```

## Build

```bash
# 1. Build the JS protocol layer
cd js && yarn install && yarn build:release

# 2. Build Flutter web
cd .. && flutter pub get && flutter build web --release --pwa-strategy=none --no-web-resources-cdn
```

Output is in `build/web/`. The CI workflow in `.github/workflows/release.yml` runs these steps and publishes a tarball.
