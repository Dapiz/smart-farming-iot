# 🌱 PROJECT CONTEXT — Smart Farming IoT

> **Dokumen ini adalah konteks lengkap proyek untuk AI assistant.**
> Paste dokumen ini di awal percakapan baru agar AI memahami struktur,
> arsitektur, dan status proyek tanpa perlu penjelasan ulang.
>
> **Versi**: 1.0 | **Terakhir diupdate**: 4 November 2026

---

## 1. RINGKASAN PROYEK

**Nama**: Smart Farming IoT — Multi-Device Monitoring System
**Tujuan**: Sistem monitoring & kontrol penyiraman tanaman otomatis berbasis ESP32
**Tipe**: Full-stack IoT (Frontend + Backend + Database + Firmware)
**Status**: ✅ Berfungsi penuh (development lokal), siap deploy

**Fitur utama:**
- Multi-user (register/login JWT, isolasi data antar user)
- Multi-device (satu user bisa punya banyak ESP32)
- Monitoring real-time via Socket.IO
- Grafik histori sensor (1 jam / 24 jam / 7 hari / 30 hari)
- Kontrol pompa manual (dengan ACK confirmation) & otomatis (hysteresis)
- Provisioning WiFi via captive portal (WiFiManager)
- Device pairing dengan token rahasia (bcrypt hash)
- Safety: pompa auto-off jika > 10 menit menyala
- Offline detection & auto-expire command

---

## 2. TECH STACK

### Frontend
- **React 18** + **Vite**
- **Tailwind CSS** (custom theme hijau `primary-*`)
- **React Router** v6
- **Axios** (dengan interceptors untuk JWT)
- **Chart.js** + **react-chartjs-2** (grafik sensor)
- **Socket.IO Client** (real-time updates)
- **Lucide React** (ikon)

### Backend
- **Node.js** ≥ 18 + **Express**
- **MySQL 8 / MariaDB** (via `mysql2/promise` pool)
- **JWT** (access token 7 hari + refresh token 30 hari)
- **bcryptjs** (hash password & device token)
- **Socket.IO** (emit ke room `user:<id>`)
- **express-rate-limit** (auth & command rate limit)
- **dotenv**, **helmet**, **morgan**, **cors**

### ESP32
- **Arduino IDE** — board **ESP32 Dev Module**
- **WiFiManager** (tzapu) — captive portal provisioning
- **DHT sensor library** (Adafruit) + **Adafruit Unified Sensor**
- **LiquidCrystal I2C** (Frank de Brabander)
- **ArduinoJson** (versi **6.x**, bukan 7)
- **HTTPClient** (built-in ESP32)

### Hardware ESP32
- ESP32 DevKit
- DHT22 (suhu & kelembapan udara) — pin GPIO4
- Soil Moisture Sensor analog — pin GPIO34 (ADC)
- Relay aktif **LOW** — pin GPIO26
- LCD I2C 16x2 (alamat 0x27) — SDA GPIO21, SCL GPIO22
- Tombol BOOT (GPIO0) untuk reset WiFi

---

## 2. Struktur Folder Proyek

```
smart-farming-iot/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── PublicOnlyRoute.jsx
│   │   │   ├── Toast.jsx
│   │   │   ├── ConfirmModal.jsx
│   │   │   └── SensorChart.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx         # JWT + socket connect
│   │   ├── hooks/
│   │   │   └── useDeviceSocket.js      # subscribe event socket
│   │   ├── layouts/
│   │   │   └── DashboardLayout.jsx     # sidebar + hamburger mobile
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── MyDevices.jsx
│   │   │   ├── AddDevice.jsx
│   │   │   ├── DeviceDetail.jsx
│   │   │   ├── Monitoring.jsx
│   │   │   ├── History.jsx
│   │   │   ├── Irrigation.jsx
│   │   │   ├── Settings.jsx
│   │   │   └── Profile.jsx
│   │   ├── services/
│   │   │   ├── api.js                  # axios instance + interceptors
│   │   │   ├── authService.js
│   │   │   ├── deviceService.js
│   │   │   ├── monitoringService.js
│   │   │   ├── userService.js
│   │   │   └── socket.js               # connectSocket(token)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css                   # Tailwind + custom classes
│   ├── .env.example
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/
│   ├── config/
│   │   └── database.js                 # mysql2 pool
│   ├── controllers/
│   │   ├── authController.js           # register/login/me/profile/password
│   │   ├── deviceController.js         # CRUD + settings
│   │   ├── deviceApiController.js      # telemetry/poll/ack (ESP32)
│   │   ├── monitoringController.js     # history + dashboard summary
│   │   └── pumpController.js           # control pump + latest command
│   ├── middleware/
│   │   ├── auth.js                     # JWT user
│   │   ├── deviceAuth.js               # X-Device-UID + X-Device-Token
│   │   ├── rateLimiter.js              # auth rate limit
│   │   └── commandRateLimit.js         # 10 detik per device
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── deviceRoutes.js
│   │   ├── deviceApiRoutes.js          # ESP32 endpoints
│   │   ├── dashboardRoutes.js
│   │   └── index.js
│   ├── services/
│   │   ├── devicePresence.js           # mark offline tiap 20s
│   │   └── commandExpiry.js            # expire PENDING > 5 menit
│   ├── sockets/
│   │   └── index.js                    # Socket.IO + auth + room per user
│   ├── utils/
│   │   ├── jwt.js
│   │   ├── response.js                 # ok/created/fail helper
│   │   ├── tokens.js                   # generateDeviceUid/Token
│   │   └── validators.js
│   ├── scripts/
│   │   └── seedReadings.js             # seeder data testing
│   ├── .env.example
│   ├── server.js
│   └── package.json
│
├── esp32/
│   └── monitoring_tanaman.ino          # firmware WiFiManager
│
├── database/
│   └── schema.sql                      # 6 tabel
│
├── docs/                               # (opsional)
│   └── DEPLOYMENT.md
│
├── .gitignore
├── README.md
└── PROJECT_CONTEXT.md                  # konteks untuk AI
```

## 4. DATABASE SCHEMA (6 TABEL)

Database: **`smart_farming_iot`**

### `users`
id BIGINT PK AUTO_INCREMENT
name VARCHAR(100)
email VARCHAR(150) UNIQUE
password VARCHAR(255) -- bcrypt hash
created_at, updated_at

text

### `devices`
id BIGINT PK
user_id BIGINT FK -> users.id ON DELETE CASCADE
device_name VARCHAR(100)
description TEXT NULL
location VARCHAR(150) NULL
device_uid VARCHAR(64) UNIQUE -- "ESP-XXXXXX" (publik)
device_token_hash VARCHAR(255) NULL -- bcrypt hash (rahasia)
paired_at DATETIME NULL
status ENUM('online','offline') DEFAULT 'offline'
last_seen DATETIME NULL
created_at, updated_at
INDEX (user_id), (status)

text

### `sensor_readings`
id BIGINT PK
device_id BIGINT FK -> devices.id ON DELETE CASCADE
temperature DECIMAL(5,2) NULL
humidity DECIMAL(5,2) NULL
soil_moisture DECIMAL(5,2) NULL
soil_adc INT NULL
pump_status TINYINT(1) DEFAULT 0
mode ENUM('AUTO','MANUAL') DEFAULT 'AUTO'
recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
INDEX (device_id, recorded_at), (recorded_at)

text

### `device_settings`
id BIGINT PK
device_id BIGINT FK UNIQUE -> devices.id ON DELETE CASCADE
minimum_soil_moisture DECIMAL(5,2) DEFAULT 40.00
maximum_soil_moisture DECIMAL(5,2) DEFAULT 45.00
operating_mode ENUM('AUTO','MANUAL') DEFAULT 'AUTO'
updated_at TIMESTAMP

text

### `pump_commands`
id BIGINT PK
device_id BIGINT FK -> devices.id ON DELETE CASCADE
command ENUM('ON','OFF')
status ENUM('PENDING','EXECUTED','FAILED','EXPIRED') DEFAULT 'PENDING'
created_by BIGINT FK NULL -> users.id ON DELETE SET NULL
created_at TIMESTAMP
executed_at DATETIME NULL
INDEX (device_id, status), (created_at)

text

### `password_reset_tokens`
id BIGINT PK
user_id BIGINT FK -> users.id ON DELETE CASCADE
token_hash VARCHAR(255)
expires_at DATETIME
used_at DATETIME NULL
created_at TIMESTAMP

text

---

## 5. API ENDPOINTS LENGKAP

**Base URL**: `http://localhost:5000/api`

### Auth (user)
POST /auth/register { name, email, password }
POST /auth/login { email, password } -> { accessToken, refreshToken, user }
POST /auth/logout [Bearer]
GET /auth/me [Bearer]
PUT /auth/profile [Bearer] { name }
PUT /auth/password [Bearer] { currentPassword, newPassword }
POST /auth/forgot-password { email }
POST /auth/reset-password { token, newPassword }

text

### Devices (user)
GET /devices [Bearer] -> list device + latest reading
POST /devices [Bearer] { device_name, description?, location? }
-> { device, device_token (SEKALI!), warning }
GET /devices/:id [Bearer]
PUT /devices/:id [Bearer] { device_name?, description?, location? }
DELETE /devices/:id [Bearer]
POST /devices/:id/regenerate-token [Bearer] -> { device_token (SEKALI!) }
PUT /devices/:id/settings [Bearer] { minimum_soil_moisture?, maximum_soil_moisture?, operating_mode? }
GET /devices/:id/history [Bearer] ?range=1h|24h|7d|30d
GET /devices/:id/pump/status [Bearer] -> latest command
POST /devices/:id/pump [Bearer] { command: 'ON'|'OFF' }
middleware: commandRateLimit (10 detik)

text

### Dashboard
GET /dashboard/summary [Bearer]

text

### Device API (ESP32 — WAJIB header X-Device-UID + X-Device-Token)
POST /device/telemetry { temperature, humidity, soilMoisture, soilADC, pumpStatus, mode }
-> { reading_id, settings (untuk sinkron), server_time }
GET /device/commands -> { command: { id, command, created_at } | null }
POST /device/commands/ack { commandId, success, pumpStatus }

text

### Health
GET /health

text

---

## 6. SOCKET.IO EVENTS

**Auth**: JWT via `socket.handshake.auth.token`
**Room**: Setiap user join `user:<userId>`

### Event dari server ke client:
device:update { device_id, temperature, humidity, soil_moisture,
soil_adc, pump_status, mode, settings, last_seen, ... }
device:offline { device_id, device_name }
pump:pending { device_id, command_id, command, created_at }
pump:ack { device_id, command_id, status (EXECUTED|FAILED|EXPIRED),
pump_status, executed_at, reason? }

text

---

## 7. ALUR KERJA SISTEM

### A. Registrasi & Login
User register -> bcrypt hash password -> simpan ke users
User login -> verify bcrypt -> generate JWT (access 7d, refresh 30d)
Frontend simpan token di localStorage -> axios interceptor
AuthContext connectSocket(token) setelah login

text

### B. Pairing ESP32
User klik "Tambah Perangkat" di dashboard

Backend generate:

device_uid: "ESP-XXXXXX" (6 hex random)

device_token: 64 char hex random

Simpan bcrypt hash token ke DB

Response: { device, device_token, warning }
⚠️ Token HANYA tampil SEKALI

User copy token ke firmware ESP32

User klik Regenerate kalau token hilang (token lama tidak berlaku)

text

### C. Alur Telemetry (setiap 10 detik)
ESP32 -> POST /device/telemetry (X-Device-UID + X-Device-Token)
├─ Verifikasi deviceAuth (bcrypt.compare token)
├─ Insert sensor_readings
├─ Update devices: status='online', last_seen=NOW()
├─ ⚠️ JANGAN update operating_mode dari payload (BUG yang pernah terjadi)
├─ Fetch settings (min/max/mode)
├─ Socket emit ke user room: 'device:update'
└─ Response: { reading_id, settings, server_time }
ESP32 terima response -> sinkron batas & mode dari server

text

### D. Alur Command Manual
User klik "Nyalakan Pompa" di Irrigation
├─ Backend POST /devices/:id/pump
│ ├─ Cek device online (jika offline -> 409)
│ ├─ Cek mode MANUAL (jika AUTO -> 409)
│ ├─ Rate limit 10 detik per device
│ ├─ Insert pump_commands (status=PENDING)
│ └─ Socket emit 'pump:pending' ke user
│
ESP32 polling tiap 5 detik -> GET /device/commands
├─ Cek PENDING terbaru
├─ Kalau mode MANUAL -> eksekusi relay
├─ Kalau mode AUTO -> abaikan (safety)
└─ POST /device/commands/ack { commandId, success, pumpStatus }
├─ Update pump_commands.status = EXECUTED / FAILED
├─ Update devices.last_seen
└─ Socket emit 'pump:ack' ke user
Frontend terima 'pump:ack' -> update UI status command

text

### E. Auto Mode (hysteresis lokal di ESP32)
Setiap 2 detik baca sensor:
if (mode == "AUTO") {
if (soil < minimum) -> relay ON (mulai pompa)
if (soil >= maximum) -> relay OFF (matikan pompa)
}
Safety: jika pompa ON > 10 menit -> paksa OFF

text

### F. Offline Detection
Backend cron tiap 20 detik:
markStaleDevicesOffline()
├─ Cari device 'online' dengan last_seen > 60 detik lalu
├─ Set status='offline'
└─ Socket emit 'device:offline' ke user

text

### G. Command Expiry
Backend cron tiap 30 detik:
expireStaleCommands()
├─ Cari PENDING dengan created_at > 5 menit lalu
├─ Set status='EXPIRED'
└─ Socket emit 'pump:ack' status EXPIRED

text

### H. Provisioning WiFi (WiFiManager)
ESP32 boot -> cek NVS apakah ada config WiFi

Jika belum ada / gagal konek:

WiFiManager buka AP mode "SmartFarming-XXXX"

User konek ke hotspot -> captive portal otomatis

User pilih SSID 2.4GHz + password -> save

ESP32 simpan NVS -> restart -> konek WiFi

Jika sudah ada config:

Konek langsung

Reset WiFi: tahan tombol BOOT (GPIO0) 5 detik -> NVS terhapus -> AP mode lagi

text

---

## 8. KEAMANAN

### Password user
- bcrypt hash, 10 rounds
- Minimal 6 karakter

### JWT
- Access token: 7 hari, payload `{ id, email }`
- Refresh token: 30 hari, payload `{ id }`
- Secret di `.env`, **wajib** panjang ≥ 32 char random

### Device token (ESP32)
- 64 char hex random saat pairing/regenerate
- Disimpan bcrypt hash (bukan plaintext)
- **Hanya tampil SEKALI** di response create/regenerate
- Verifikasi via `bcrypt.compare` di middleware `deviceAuth`
- Header: `X-Device-UID` + `X-Device-Token`

### Isolasi data
- Semua endpoint user verify `user_id = req.user.id`
- Device tidak ditemukan user lain -> **404** (bukan 403, hindari bocor info)
- Socket.IO room per user -> `user:<id>`

### Rate limiting
- Auth: 30 request / 15 menit / IP
- Command pump: 10 detik per device

### Validasi input
- Email format, password min 6 char, name/device_name length
- `minimum_soil_moisture < maximum_soil_moisture`
- Enum: `operating_mode` (AUTO/MANUAL), `command` (ON/OFF), `status`
- Prepared statement (mysql2) → aman dari SQL injection

### CORS
- `CORS_ORIGIN` di `.env` (comma-separated)
- Dev: `http://localhost:5173`
- Prod: `https://namadomain.com`

---

## 9. VARIABEL ENVIRONMENT

### `backend/.env`
```env
PORT=5000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=smart_farming_iot

JWT_SECRET=<random_64_char>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<random_64_char>
JWT_REFRESH_EXPIRES_IN=30d

CORS_ORIGIN=http://localhost:5173
DEVICE_OFFLINE_THRESHOLD=60
frontend/.env
env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
Firmware ESP32 (hardcode)
cpp
const char* API_BASE      = "http://192.168.1.100:5000/api";  // IP LAN laptop
const char* DEVICE_UID    = "ESP-XXXXXX";                     // dari dashboard
const char* DEVICE_TOKEN  = "<64-char-hex>";                  // dari dashboard
10. CARA MENJALANKAN
Prasyarat
Node.js ≥ 18

MySQL 8 / MariaDB (Laragon)

Arduino IDE + ESP32 Board Package + library Arduino

WiFi 2.4 GHz (ESP32 tidak support 5 GHz)

Setup Database
bash
mysql -u root smart_farming_iot < database/schema.sql
Setup Backend
bash
cd backend
npm install
copy .env.example .env
# Edit .env (JWT_SECRET, DB credentials)
npm run dev
# -> http://localhost:5000
Setup Frontend
bash
cd frontend
npm install
copy .env.example .env
npm run dev
# -> http://localhost:5173
Setup ESP32
Buka esp32/monitoring_tanaman.ino di Arduino IDE

Edit API_BASE, DEVICE_UID, DEVICE_TOKEN

Board: ESP32 Dev Module

Upload

Serial Monitor 115200 baud

Provisioning WiFi via captive portal (SSID SmartFarming-XXXX)

Seeder data (opsional, testing grafik)
bash
cd backend
node scripts/seedReadings.js <device_id>
11. CATATAN BUG YANG PERNAH TERJADI & FIX
⚠️ BUG #1: Mode AUTO tidak bisa diubah ke MANUAL
Gejala: User set MANUAL di Settings, tapi dalam 10 detik balik AUTO.
Command manual selalu gagal dengan 409 "Mode perangkat bukan MANUAL".

Root cause: deviceApiController.js bagian postTelemetry melakukan:

javascript
// ❌ BUG — hapus baris ini
await pool.query(
  'UPDATE device_settings SET operating_mode = ? WHERE device_id = ?',
  [modeSafe, deviceId]
);
Telemetry ESP32 mengirim mode: "AUTO" (karena belum dapat update) → backend menimpa DB ke AUTO → ESP32 dapat response AUTO → forever loop.

Fix: Hapus baris UPDATE operating_mode dari postTelemetry. Mode hanya boleh diubah dari endpoint PUT /devices/:id/settings (dari dashboard user).

⚠️ BUG #2: Socket.IO double connect di React StrictMode
Gejala: Console log 🔌 Socket connected: undefined + 🔌 Socket connected: <id>.

Impact: Ringan di production (StrictMode hanya dev), tapi bisa menyebabkan event handler duplikat.

Fix opsional: Guard di connectSocket() — sudah ada if (socket?.connected) return socket. Untuk development, bisa disable StrictMode di main.jsx.

⚠️ BUG #3: Request pump 409 berulang (spam klik)
Gejala: DevTools Network menampilkan 15+ request 409 berturut-turut.

Root cause: Mode AUTO → command langsung ditolak → isPending tidak pernah true → tombol tidak disabled → user klik berulang.

Fix: Setelah BUG #1 diperbaiki, command akan PENDING → isPending=true → tombol disabled selama 5 menit. Bug ini hilang sendiri.

12. STATUS PENGEMBANGAN
✅ Selesai & Teruji
☑ Auth (register/login/me/logout/profile/password)
☑ JWT middleware + rate limiter
☑ Multi-device CRUD
☑ Pairing device (UID + token hash)
☑ Dashboard real-time
☑ Monitoring per device + grafik Chart.js
☑ History + filter range + pagination
☑ Settings (min/max moisture, mode AUTO/MANUAL)
☑ Kontrol pompa manual (dengan ACK)
☑ Auto mode + hysteresis lokal
☑ Safety timeout 10 menit
☑ Offline detection cron (20 detik)
☑ Command expiry cron (30 detik)
☑ Rate limit command (10 detik)
☑ Provisioning WiFi via WiFiManager (captive portal)
☑ Sinkron settings server ↔ ESP32 via response telemetry
⏳ Belum Dikerjakan (Opsional)
□ Deploy VPS (Nginx + PM2 + SSL Let's Encrypt)
□ Notifikasi Telegram/Email saat tanah kering
□ QR code pairing di dashboard
□ PWA (installable frontend)
□ Multi-bahasa (ID/EN)
□ Export CSV histori
□ Role admin / multi-tenant
□ Partisi tabel sensor_readings per bulan
13. DEPLOYMENT (BELUM DILAKUKAN)
Rencana deploy ke VPS Ubuntu 22.04
Provider: DigitalOcean / Contabo / Biznet Gio (~$5/bulan)

Spec: 1 vCPU, 1 GB RAM, 25 GB SSD

Stack: Nginx (reverse proxy) + PM2 (process manager) + Let's Encrypt (SSL)

DNS: A record domain → IP VPS

Perubahan saat deploy
Backend .env:

NODE_ENV=production

CORS_ORIGIN=https://namadomain.com

JWT_SECRET & JWT_REFRESH_SECRET baru

Frontend .env:

VITE_API_URL=https://namadomain.com/api

VITE_SOCKET_URL=https://namadomain.com

Firmware ESP32:

API_BASE = "https://namadomain.com/api"

ESP32 bisa kirim dari WiFi manapun (tidak terikat LAN)

Nginx config ringkas
nginx
server {
    listen 80;
    server_name namadomain.com;
    root /var/www/smart-farming-iot/frontend/dist;
    index index.html;

    location / { try_files $uri $uri/ /index.html; }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
14. INSTRUKSI UNTUK AI ASSISTANT
Saat user membuka percakapan baru dan paste dokumen ini:

Jangan minta penjelasan ulang tentang struktur, tech stack, atau fitur — semuanya sudah ada di dokumen ini.

Selalu refer ke path file yang ada di bagian 3 (Struktur Folder).

Ingat BUG #1 — jangan pernah menambahkan UPDATE operating_mode dari telemetry. Mode hanya berubah via PUT /devices/:id/settings.

Ingat keamanan (bagian 8) — jangan sarankan yang melanggar (misal simpan device token plaintext, hilangkan rate limit, dll).

Ikuti konvensi — response helper ok/created/fail dari utils/response.js, JWT payload { id, email }.

Untuk fitur baru, cek dulu apakah melanggar prinsip isolasi multi-user (bagian 8).

Kalau user tanya debugging, minta dulu: (a) log Serial Monitor ESP32, (b) response API, (c) output query DB — supaya diagnosa akurat.

Jangan over-engineer — proyek ini sudah berfungsi, fokus ke perbaikan/penambahan incremental, bukan rewrite.

Pertanyaan diagnosa standar
Kalau user report masalah, tanyakan berurutan:

Device mana (id berapa)?

Status di DB? SELECT id, status, last_seen FROM devices WHERE id=X;

Mode di DB? SELECT operating_mode FROM device_settings WHERE device_id=X;

Log Serial Monitor ESP32 30 detik terakhir?

Response API dari DevTools Network?

Backend log — ada error?

15. KONTAK & LISENSI
Author: (isi nama Anda)
Repo: https://github.com/username/smart-farming-iot
License: MIT (opsional)

