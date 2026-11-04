# 🌱 Smart Farming IoT — Multi-Device Monitoring System

Sistem monitoring dan kontrol penyiraman tanaman otomatis berbasis ESP32,
mendukung multi-user & multi-device, dengan dashboard real-time.

## 🚀 Fitur

- ✅ Multi-user (registrasi, login JWT, isolasi data antar user)
- ✅ Multi-device (satu user bisa punya banyak ESP32)
- ✅ Monitoring real-time (Socket.IO)
- ✅ Grafik histori (1 jam / 24 jam / 7 hari / 30 hari)
- ✅ Kontrol pompa manual & otomatis (hysteresis)
- ✅ Provisioning WiFi via captive portal (WiFiManager)
- ✅ Device pairing dengan token rahasia (bcrypt)
- ✅ Safety: pompa auto-off jika > 10 menit menyala
- ✅ Offline detection & auto-expire command

## 🧰 Tech Stack

**Frontend**: React 18, Vite, Tailwind CSS, Chart.js, Socket.IO Client
**Backend**: Node.js, Express, MySQL, Socket.IO, JWT, bcrypt
**Device**: ESP32, DHT22, Soil Moisture, Relay, LCD I2C
**DB**: MySQL 8 / MariaDB (kompatibel Laragon)

## 📁 Struktur

\`\`\`
smart-farming-iot/
├── frontend/           # React + Vite
├── backend/            # Express + MySQL + Socket.IO
├── esp32/              # Firmware Arduino
├── database/           # schema.sql
├── .env.example
└── README.md
\`\`\`

## 🔧 Prasyarat

- Node.js ≥ 18
- MySQL / MariaDB (atau Laragon)
- Arduino IDE + ESP32 Board Package
- Akun WiFi 2.4 GHz (ESP32 tidak support 5 GHz)

## 📦 Setup Backend

\`\`\`bash
cd backend
npm install
copy .env.example .env
# Edit .env: DB, JWT_SECRET, CORS_ORIGIN
mysql -u root < ../database/schema.sql
npm run dev
\`\`\`

Backend berjalan di `http://localhost:5000`.

## 🎨 Setup Frontend

\`\`\`bash
cd frontend
npm install
copy .env.example .env
# Edit VITE_API_URL & VITE_SOCKET_URL
npm run dev
\`\`\`

Frontend berjalan di `http://localhost:5173`.

## 📡 Setup ESP32

1. Install library di Arduino IDE:
   - WiFiManager (tzapu)
   - DHT sensor library (Adafruit)
   - Adafruit Unified Sensor
   - LiquidCrystal I2C (Frank de Brabander)
   - ArduinoJson (6.x)

2. Buka `esp32/monitoring_tanaman.ino`, edit:
   - `API_BASE` = `http://<IP-LAN-laptop>:5000/api`
   - `DEVICE_UID` = dari dashboard Add Device
   - `DEVICE_TOKEN` = dari dashboard Add Device (hanya tampil sekali!)

3. Pilih board **ESP32 Dev Module**, upload.

4. **Provisioning WiFi:**
   - Nyalakan ESP32 → AP mode `SmartFarming-XXXX`
   - Sambung HP ke hotspot itu
   - Buka `http://192.168.4.1`
   - Pilih WiFi 2.4 GHz + password → Save
   - ESP32 restart & konek otomatis

5. Dashboard → device berubah **Online** dalam ≤ 10 detik.

## 🔐 Keamanan

- Password user di-hash bcrypt (10 rounds)
- Device token di-hash bcrypt, hanya tampil sekali
- JWT untuk user (7 hari), refresh token 30 hari
- Semua endpoint diproteksi middleware auth
- Isolasi data: user hanya bisa akses device miliknya
- Rate limiting auth (30 req/15 menit) & command (10 detik)

## 🧪 Testing

\`\`\`bash
# Seeder data sensor (untuk uji grafik sebelum ESP32 siap)
cd backend
node scripts/seedReadings.js <device_id>
\`\`\`

## 🚢 Deployment

Lihat `docs/DEPLOYMENT.md` untuk panduan deploy ke VPS (Nginx + PM2 + Let's Encrypt).

## 📄 License

MIT