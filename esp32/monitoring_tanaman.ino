/*
 * =====================================================
 * SMART FARMING IoT — Firmware ESP32
 * =====================================================
 * Fitur:
 *  - WiFi auto-reconnect
 *  - Kirim telemetry tiap 10 detik (HTTP POST)
 *  - Polling command tiap 5 detik (HTTP GET)
 *  - ACK setelah command dieksekusi
 *  - Kontrol otomatis (AUTO) dengan hysteresis LOKAL
 *  - Safety: pompa mati otomatis jika > 10 menit menyala
 *  - LCD 16x2 I2C: tampilkan suhu, kelembapan, tanah, pompa
 *
 * Library yang perlu diinstall (Arduino IDE Library Manager):
 *  - DHT sensor library by Adafruit
 *  - Adafruit Unified Sensor
 *  - LiquidCrystal I2C by Frank de Brabander
 *  - ArduinoJson by Benoit Blanchon (versi 6.x)
 * =====================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

// =====================================================
// KONFIGURASI — GANTI DENGAN DATA ANDA
// =====================================================
const char* WIFI_SSID     = "Panitia Kiamat bos";
const char* WIFI_PASSWORD = "kelompok2";

// Backend
const char* API_BASE      = "http://192.168.1.100:5000/api";  // ⚠️ IP komputer backend (bukan localhost)
const char* DEVICE_UID    = "ESP-XXXXXX";                     // Dari halaman Add Device
const char* DEVICE_TOKEN  = "xxxxxxxxxxxxxxxxxxxxxxxxxxxx";   // Token rahasia hasil pairing

// Pin
#define DHT_PIN     4
#define DHT_TYPE    DHT22
#define SOIL_PIN    34
#define RELAY_PIN   26

// Kalibrasi soil
const int NILAI_KERING = 4095;
const int NILAI_BASAH  = 1500;

// Hysteresis default (bisa dioverride dari server)
float batasPompaNyala = 40.0;
float batasPompaMati  = 45.0;

// Interval
const unsigned long TELEMETRY_INTERVAL = 10000;  // 10 detik
const unsigned long COMMAND_INTERVAL   = 5000;   // 5 detik
const unsigned long SAFETY_MAX_ON_MS   = 10UL * 60UL * 1000UL; // 10 menit safety

// =====================================================
// OBJEK
// =====================================================
DHT dht(DHT_PIN, DHT_TYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);

// =====================================================
// STATE
// =====================================================
float suhu = 0, kelembapanUdara = 0;
int   kelembapanTanah = 0, nilaiSoil = 0;
bool  pompaNyala = false;
String mode = "AUTO";

unsigned long lastTelemetry = 0;
unsigned long lastCommand   = 0;
unsigned long pumpOnSince   = 0;

// =====================================================
// RELAY
// =====================================================
void setPompa(bool nyala) {
  if (nyala && !pompaNyala) pumpOnSince = millis();
  if (!nyala) pumpOnSince = 0;
  pompaNyala = nyala;
  digitalWrite(RELAY_PIN, nyala ? LOW : HIGH);  // aktif LOW
}

// =====================================================
// WIFI
// =====================================================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("Menghubungkan WiFi");
  lcd.clear(); lcd.setCursor(0, 0); lcd.print("Connecting WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500); Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi OK, IP: "); Serial.println(WiFi.localIP());
    lcd.clear(); lcd.setCursor(0, 0); lcd.print("WiFi OK");
    lcd.setCursor(0, 1); lcd.print(WiFi.localIP());
    delay(1500); lcd.clear();
  } else {
    Serial.println("WiFi GAGAL");
    lcd.clear(); lcd.setCursor(0, 0); lcd.print("WiFi GAGAL");
    delay(2000); lcd.clear();
  }
}

// =====================================================
// SENSOR
// =====================================================
void readSensors() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) { suhu = t; kelembapanUdara = h; }

  nilaiSoil = analogRead(SOIL_PIN);
  int pct = map(nilaiSoil, NILAI_KERING, NILAI_BASAH, 0, 100);
  kelembapanTanah = constrain(pct, 0, 100);
}

// =====================================================
// KONTROL OTOMATIS (LOKAL) dengan hysteresis
// =====================================================
void kontrolOtomatis() {
  if (mode != "AUTO") return;  // di mode manual, server yang kendalikan

  if (kelembapanTanah < batasPompaNyala) setPompa(true);
  else if (kelembapanTanah >= batasPompaMati) setPompa(false);

  // Safety: kalau pompa nyala lebih dari batas, paksa mati
  if (pompaNyala && pumpOnSince > 0 && (millis() - pumpOnSince) > SAFETY_MAX_ON_MS) {
    Serial.println("⚠️ Safety: pompa dipaksa mati");
    setPompa(false);
  }
}

// =====================================================
// HTTP: TELEMETRY
// =====================================================
void sendTelemetry() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(API_BASE) + "/device/telemetry";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-UID",   DEVICE_UID);
  http.addHeader("X-Device-Token", DEVICE_TOKEN);

  StaticJsonDocument<256> doc;
  doc["temperature"]  = suhu;
  doc["humidity"]     = kelembapanUdara;
  doc["soilMoisture"] = kelembapanTanah;
  doc["soilADC"]      = nilaiSoil;
  doc["pumpStatus"]   = pompaNyala;
  doc["mode"]         = mode;

  String body; serializeJson(doc, body);
  int code = http.POST(body);

  if (code == 200) {
    // Sinkronkan batas dari server (jika user ubah di dashboard)
    String resp = http.getString();
    StaticJsonDocument<512> r;
    if (!deserializeJson(r, resp)) {
      JsonObject settings = r["data"]["settings"];
      if (!settings.isNull()) {
        if (settings.containsKey("minimum_soil_moisture"))
          batasPompaNyala = settings["minimum_soil_moisture"].as<float>();
        if (settings.containsKey("maximum_soil_moisture"))
          batasPompaMati = settings["maximum_soil_moisture"].as<float>();
        if (settings.containsKey("operating_mode")) {
          String newMode = settings["operating_mode"].as<String>();
          if (newMode != mode) {
            mode = newMode;
            Serial.printf("Mode diubah server → %s\n", mode.c_str());
          }
        }
      }
    }
    Serial.printf("📤 Telemetry OK (T=%.1f H=%.1f S=%d%%)\n", suhu, kelembapanUdara, kelembapanTanah);
  } else {
    Serial.printf("❌ Telemetry gagal: HTTP %d\n", code);
  }
  http.end();
}

// =====================================================
// HTTP: POLLING COMMAND
// =====================================================
void pollCommand() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(API_BASE) + "/device/commands";
  http.begin(url);
  http.addHeader("X-Device-UID",   DEVICE_UID);
  http.addHeader("X-Device-Token", DEVICE_TOKEN);

  int code = http.GET();
  if (code != 200) { http.end(); return; }

  String resp = http.getString();
  http.end();

  StaticJsonDocument<512> doc;
  if (deserializeJson(doc, resp)) return;

  JsonObject cmd = doc["data"]["command"];
  if (cmd.isNull()) return;  // tidak ada command

  int  cmdId      = cmd["id"];
  String cmdText  = cmd["command"].as<String>();  // "ON" / "OFF"
  Serial.printf("📥 Command masuk: %s (id=%d)\n", cmdText.c_str(), cmdId);

  bool success = false;
  if (mode == "MANUAL") {  // hanya eksekusi di mode MANUAL
    if (cmdText == "ON")  { setPompa(true);  success = true; }
    if (cmdText == "OFF") { setPompa(false); success = true; }
  } else {
    Serial.println("⚠️ Mode AUTO — command diabaikan");
  }

  // ACK ke server
  HTTPClient http2;
  String ackUrl = String(API_BASE) + "/device/commands/ack";
  http2.begin(ackUrl);
  http2.addHeader("Content-Type", "application/json");
  http2.addHeader("X-Device-UID",   DEVICE_UID);
  http2.addHeader("X-Device-Token", DEVICE_TOKEN);

  StaticJsonDocument<128> ack;
  ack["commandId"]  = cmdId;
  ack["success"]    = success;
  ack["pumpStatus"] = pompaNyala;

  String ackBody; serializeJson(ack, ackBody);
  int ackCode = http2.POST(ackBody);
  Serial.printf("📤 ACK: HTTP %d\n", ackCode);
  http2.end();
}

// =====================================================
// LCD
// =====================================================
void updateLCD() {
  lcd.setCursor(0, 0);
  lcd.print("S:");
  lcd.print(suhu, 1);
  lcd.print((char)223);
  lcd.print("C ");
  lcd.print("U:");
  lcd.print(kelembapanUdara, 0);
  lcd.print("% ");

  lcd.setCursor(0, 1);
  lcd.print("T:");
  lcd.print(kelembapanTanah);
  lcd.print("% ");
  lcd.print(pompaNyala ? "P:ON " : "P:OFF");
  lcd.print(mode == "AUTO" ? " A" : " M");
}

// =====================================================
// SETUP
// =====================================================
void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);  // relay OFF (aktif LOW)
  pompaNyala = false;

  dht.begin();
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0); lcd.print("Smart Farming");
  lcd.setCursor(0, 1); lcd.print("IoT v1.0");
  delay(1500);
  lcd.clear();

  connectWiFi();
}

// =====================================================
// LOOP
// =====================================================
void loop() {
  // Pastikan WiFi
  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  unsigned long now = millis();

  // Baca sensor tiap 2 detik (sampling)
  static unsigned long lastRead = 0;
  if (now - lastRead > 2000) {
    lastRead = now;
    readSensors();
    kontrolOtomatis();  // hysteresis lokal
    updateLCD();
  }

  // Telemetry
  if (now - lastTelemetry > TELEMETRY_INTERVAL) {
    lastTelemetry = now;
    sendTelemetry();
  }

  // Polling command
  if (now - lastCommand > COMMAND_INTERVAL) {
    lastCommand = now;
    pollCommand();
  }

  delay(50);
}