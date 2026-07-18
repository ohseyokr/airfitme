-- ======================================================
-- AIRFITME FRMS (Fatigue Risk Management System) 스키마
-- Optimized for AWS RDS / Supabase / Render PostgreSQL
-- 쿼리 실행 시 "전체 실행(Alt + X)"으로 수행해 주세요.
-- ======================================================

-- 기존 테이블이 존재할 경우 역순으로 깔끔하게 삭제하여 의존성 충돌 방지
DROP TABLE IF EXISTS action_reports CASCADE;
DROP TABLE IF EXISTS safety_alerts CASCADE;
DROP TABLE IF EXISTS telemetry_logs CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS crew_profiles CASCADE;

-- 1. 승무원 기본 프로필 테이블 생성
CREATE TABLE crew_profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    crew_id_tag VARCHAR(20) UNIQUE NOT NULL, -- 사번 식별자 (예: CS65540)
    rank VARCHAR(20) NOT NULL,              -- 직급 (사무장, 부사무장 등)
    base_location VARCHAR(50) DEFAULT 'ICN',
    aircraft VARCHAR(30) DEFAULT 'B777',     -- 탑승기종(항공기) 정보 컬럼 추가
    sleep_efficiency_avg NUMERIC(5,2) DEFAULT 88.00, -- 최근 평균 수면 효율 (%)
    emergency_contact VARCHAR(25) NOT NULL, -- 비상 연락처
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 스마트워치 및 ChestBelt 하드웨어 기기 테이블 생성
CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    device_uid VARCHAR(50) UNIQUE NOT NULL, -- 기기 Mac Address 또는 UUID
    device_type VARCHAR(30) NOT NULL,       -- SmartWatch / IoT_ChestBelt
    firmware_version VARCHAR(15) DEFAULT '1.0.0',
    battery_level INT DEFAULT 100,          -- 배터리 잔량 (%)
    status VARCHAR(15) DEFAULT 'ACTIVE',    -- ACTIVE / INACTIVE
    paired_crew_id INT REFERENCES crew_profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 실시간 바이오 & 가스 환경 모니터링 로그 테이블 생성
CREATE TABLE telemetry_logs (
    id BIGSERIAL PRIMARY KEY,
    device_uid VARCHAR(50) REFERENCES devices(device_uid) ON DELETE CASCADE,
    crew_id INT REFERENCES crew_profiles(id) ON DELETE CASCADE,
    heart_rate INT DEFAULT 72,              -- 심박수 (HR)
    hrv_ms NUMERIC(5,2) DEFAULT 55.0,        -- 심박 변이도 (HRV ms)
    respiratory_rate INT DEFAULT 14,        -- 호흡수 (RR)
    skin_temperature NUMERIC(4,1) DEFAULT 36.8, -- 피부 표면 온도
    spo2_percent INT DEFAULT 98,            -- 혈중 산소포화도 (%)
    tvoc_ppb NUMERIC(6,2) DEFAULT 12.0,     -- 휘발성 가스 총량 (TVOC)
    co2_ppm NUMERIC(6,2) DEFAULT 475.0,     -- 이산화탄소 농도 (eCO2)
    h2_raw NUMERIC(7,2) DEFAULT 13955.0,    -- 수소 가스 원시 데이터
    ethanol_raw NUMERIC(7,2) DEFAULT 19174.0, -- 에탄올 원시 데이터
    gyro_angle_pitch NUMERIC(5,2) DEFAULT 5.0, -- 자이로 Pitch 변위각
    fall_detected BOOLEAN DEFAULT FALSE,    -- 낙상 여부 감지
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 위험 수치 경보 대장 테이블 생성
CREATE TABLE safety_alerts (
    id SERIAL PRIMARY KEY,
    crew_id INT REFERENCES crew_profiles(id) ON DELETE CASCADE,
    alert_type VARCHAR(30) NOT NULL,        -- FALL_DETECTED / FATIGUE_CRITICAL / GAS_EXPOSURE
    severity_level VARCHAR(15) NOT NULL,    -- DANGER / WARNING
    trigger_value VARCHAR(100) NOT NULL,    -- 트리거 원인 상세
    status VARCHAR(15) DEFAULT 'ACTIVE',    -- ACTIVE / RESOLVED
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 5. 지상 관제실(GCS) 후속 조치 입력 리포트 테이블 생성
CREATE TABLE action_reports (
    id SERIAL PRIMARY KEY,
    alert_id INT REFERENCES safety_alerts(id) ON DELETE SET NULL,
    crew_id INT REFERENCES crew_profiles(id) ON DELETE CASCADE,
    action_description TEXT NOT NULL,       -- 조치 내역 상세 기술
    handler_signature VARCHAR(50) NOT NULL, -- 처리자 관제사 서명
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 고속 검색용 인덱싱 최적화 정의
CREATE INDEX IF NOT EXISTS idx_telemetry_recorded_at ON telemetry_logs(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_crew_id ON telemetry_logs(crew_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON safety_alerts(status);

-- ==========================================
-- 초기 마스터 데이터 및 기기 페어링 데이터 삽입
-- ==========================================

-- 1) 승무원 가상 데이터 추가
INSERT INTO crew_profiles (name, crew_id_tag, rank, base_location, aircraft, sleep_efficiency_avg, emergency_contact) VALUES
('김선수', 'CS65540', '사무장', 'ICN', 'B777', 88.00, '+82-10-1234-5678'),
('이서진', 'CS65541', '부사무장', 'ICN', 'A380', 72.00, '+82-10-2345-6789'),
('박지수', 'CS65542', 'CA승무원', 'ICN', 'A350', 94.00, '+82-10-3456-7890');

-- 2) 디바이스 정보 추가 (승무원 ID 매핑 정보와 동기화)
INSERT INTO devices (device_uid, device_type, battery_level, status, paired_crew_id) VALUES
('65540', 'SmartWatch', 95, 'ACTIVE', 1),
('65540_BELT', 'IoT_ChestBelt', 88, 'ACTIVE', 1),
('65541', 'SmartWatch', 90, 'ACTIVE', 2),
('65541_BELT', 'IoT_ChestBelt', 82, 'ACTIVE', 2);
