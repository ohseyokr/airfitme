-- SQL Schema Creation for PostgreSQL
-- Optimised for Deployment on PostgreSQL 14+ / Supabase / AWS RDS

CREATE TABLE IF NOT EXISTS crew_profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    crew_id_tag VARCHAR(20) UNIQUE NOT NULL,
    rank VARCHAR(20) NOT NULL,
    base_location VARCHAR(50) DEFAULT 'ICN',
    sleep_efficiency_avg NUMERIC(5,2) DEFAULT 88.00,
    emergency_contact VARCHAR(25) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    device_uid VARCHAR(50) UNIQUE NOT NULL,
    device_type VARCHAR(30) NOT NULL,
    firmware_version VARCHAR(15) DEFAULT '1.0.0',
    battery_level INT DEFAULT 100,
    status VARCHAR(15) DEFAULT 'ACTIVE',
    paired_crew_id INT REFERENCES crew_profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telemetry_logs (
    id BIGSERIAL PRIMARY KEY,
    device_uid VARCHAR(50) REFERENCES devices(device_uid) ON DELETE CASCADE,
    crew_id INT REFERENCES crew_profiles(id) ON DELETE CASCADE,
    heart_rate INT DEFAULT 72,
    hrv_ms NUMERIC(5,2) DEFAULT 55.0,
    respiratory_rate INT DEFAULT 14,
    skin_temperature NUMERIC(4,1) DEFAULT 36.8,
    spo2_percent INT DEFAULT 98,
    tvoc_ppb NUMERIC(6,2) DEFAULT 12.0,
    co2_ppm NUMERIC(6,2) DEFAULT 475.0,
    h2_raw NUMERIC(7,2) DEFAULT 13955.0,
    ethanol_raw NUMERIC(7,2) DEFAULT 19174.0,
    gyro_angle_pitch NUMERIC(5,2) DEFAULT 5.0,
    fall_detected BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS safety_alerts (
    id SERIAL PRIMARY KEY,
    crew_id INT REFERENCES crew_profiles(id) ON DELETE CASCADE,
    alert_type VARCHAR(30) NOT NULL,
    severity_level VARCHAR(15) NOT NULL,
    trigger_value VARCHAR(100) NOT NULL,
    status VARCHAR(15) DEFAULT 'ACTIVE',
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS action_reports (
    id SERIAL PRIMARY KEY,
    alert_id INT REFERENCES safety_alerts(id) ON DELETE SET NULL,
    crew_id INT REFERENCES crew_profiles(id) ON DELETE CASCADE,
    action_description TEXT NOT NULL,
    handler_signature VARCHAR(50) NOT NULL,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telemetry_recorded_at ON telemetry_logs(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_crew_id ON telemetry_logs(crew_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON safety_alerts(status);

INSERT INTO crew_profiles (name, crew_id_tag, rank, base_location, sleep_efficiency_avg, emergency_contact) VALUES
('김선수', 'CS65540', '사무장', 'ICN', 88.00, '+82-10-1234-5678'),
('이서진', 'CS65541', '부사무장', 'ICN', 72.00, '+82-10-2345-6789'),
('박지수', 'CS65542', 'CA승무원', 'ICN', 94.00, '+82-10-3456-7890');

INSERT INTO devices (device_uid, device_type, paired_crew_id) VALUES
('65540', 'SmartWatch', 1),
('65540_BELT', 'IoT_ChestBelt', 1),
('65541', 'SmartWatch', 2),
('65541_BELT', 'IoT_ChestBelt', 2);
