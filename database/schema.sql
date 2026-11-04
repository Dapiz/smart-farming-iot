-- =====================================================
-- SMART FARMING IoT - DATABASE SCHEMA
-- Database: smart_farming_iot
-- =====================================================

USE smart_farming_iot;

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. USERS
-- =====================================================
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)    NOT NULL,
  email         VARCHAR(150)    NOT NULL,
  password      VARCHAR(255)    NOT NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. DEVICES
-- =====================================================
DROP TABLE IF EXISTS devices;
CREATE TABLE devices (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id            BIGINT UNSIGNED NOT NULL,
  device_name        VARCHAR(100)    NOT NULL,
  description        TEXT            NULL,
  location           VARCHAR(150)    NULL,
  device_uid         VARCHAR(64)     NOT NULL,               -- identifier unik dari ESP32 (MAC/chip id)
  device_token_hash  VARCHAR(255)    NULL,                    -- bcrypt hash, null sebelum pairing
  paired_at          DATETIME        NULL,
  status             ENUM('online','offline') NOT NULL DEFAULT 'offline',
  last_seen          DATETIME        NULL,
  created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_devices_uid (device_uid),
  KEY idx_devices_user (user_id),
  KEY idx_devices_status (status),
  CONSTRAINT fk_devices_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. SENSOR_READINGS
-- =====================================================
DROP TABLE IF EXISTS sensor_readings;
CREATE TABLE sensor_readings (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  device_id      BIGINT UNSIGNED NOT NULL,
  temperature    DECIMAL(5,2)    NULL,
  humidity       DECIMAL(5,2)    NULL,
  soil_moisture  DECIMAL(5,2)    NULL,
  soil_adc       INT             NULL,
  pump_status    TINYINT(1)      NOT NULL DEFAULT 0,
  mode           ENUM('AUTO','MANUAL') NOT NULL DEFAULT 'AUTO',
  recorded_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sr_device_time (device_id, recorded_at),
  KEY idx_sr_recorded (recorded_at),
  CONSTRAINT fk_sr_device FOREIGN KEY (device_id)
    REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. DEVICE_SETTINGS
-- =====================================================
DROP TABLE IF EXISTS device_settings;
CREATE TABLE device_settings (
  id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  device_id              BIGINT UNSIGNED NOT NULL,
  minimum_soil_moisture  DECIMAL(5,2) NOT NULL DEFAULT 40.00,
  maximum_soil_moisture  DECIMAL(5,2) NOT NULL DEFAULT 45.00,
  operating_mode         ENUM('AUTO','MANUAL') NOT NULL DEFAULT 'AUTO',
  updated_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_settings_device (device_id),
  CONSTRAINT fk_settings_device FOREIGN KEY (device_id)
    REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. PUMP_COMMANDS
-- =====================================================
DROP TABLE IF EXISTS pump_commands;
CREATE TABLE pump_commands (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  device_id    BIGINT UNSIGNED NOT NULL,
  command      ENUM('ON','OFF') NOT NULL,
  status       ENUM('PENDING','EXECUTED','FAILED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  created_by   BIGINT UNSIGNED NULL,                         -- user yang memicu (null = otomatis)
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  executed_at  DATETIME        NULL,
  PRIMARY KEY (id),
  KEY idx_pc_device_status (device_id, status),
  KEY idx_pc_created (created_at),
  CONSTRAINT fk_pc_device FOREIGN KEY (device_id)
    REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_pc_user FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. PASSWORD_RESET_TOKENS (untuk fitur lupa password)
-- =====================================================
DROP TABLE IF EXISTS password_reset_tokens;
CREATE TABLE password_reset_tokens (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255)    NOT NULL,
  expires_at  DATETIME        NOT NULL,
  used_at     DATETIME        NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_prt_user (user_id),
  KEY idx_prt_expires (expires_at),
  CONSTRAINT fk_prt_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- SELESAI
-- =====================================================