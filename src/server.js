// Production-Ready Node.js / Express Backend with PostgreSQL
// Configured for Instant Deployment on Render Cloud Service

const express = require('express');
const { Pool } = require('pg');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Express가 src/public 폴더 내의 정적 파일(index.html 등)을 루트 경로에서 자동으로 읽어가도록 설정
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json());

// 1. PostgreSQL Database Connection Pool 설정
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // AWS RDS 및 Render 외부 접속을 위한 필수 SSL 허용 처리
    }
});

let clients = [];
wss.on('connection', (ws) => {
    clients.push(ws);
    console.log('[WebSocket] Client Connected. Active clients count: ', clients.length);
    ws.on('close', () => {
        clients = clients.filter(c => c !== ws);
    });
});

// 연결된 모든 GCS 통제 화면 및 승무원 디바이스 화면에 웹소켓 브로드캐스트 발송
const broadcast = (data) => {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

// 2. API 엔드포인트 정의
// (1) 기내 승무원 현황 및 마지막 원격 로그 수집 쿼리
app.get('/api/v1/frms/crew-status', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT ON (c.id) 
                c.id as crew_id, c.name, c.rank, c.crew_id_tag, c.aircraft,
                t.heart_rate, t.hrv_ms, t.respiratory_rate, t.spo2_percent,
                t.tvoc_ppb, t.co2_ppm, t.ethanol_raw, t.gyro_angle_pitch, t.fall_detected,
                d.battery_level, t.recorded_at
            FROM crew_profiles c
            LEFT JOIN telemetry_logs t ON c.id = t.crew_id
            LEFT JOIN devices d ON c.id = d.paired_crew_id
            ORDER BY c.id, t.recorded_at DESC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error("데이터 조회 에러: ", err);
        res.status(500).json({ error: 'Database query execution failed' });
    }
});

// (2) 실시간 디바이스 Telemetry 데이터 주입 API
app.post('/api/v1/frms/telemetry', async (req, res) => {
    const { device_uid, crew_id, hr, hrv, rr, temp, spo2, tvoc, co2, h2, ethanol, gyro, fall } = req.body;
    try {
        const telemetryQuery = `
            INSERT INTO telemetry_logs 
                (device_uid, crew_id, heart_rate, hrv_ms, respiratory_rate, skin_temperature, spo2_percent, tvoc_ppb, co2_ppm, h2_raw, ethanol_raw, gyro_angle_pitch, fall_detected)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *;
        `;
        const values = [device_uid, crew_id, hr, hrv, rr, temp, spo2, tvoc, co2, h2, ethanol, gyro, fall];
        const telemetryResult = await pool.query(telemetryQuery, values);
        const loggedData = telemetryResult.rows[0];

        let alertTriggered = false;
        let alertType = null;
        let severity = 'WARNING';
        let triggerValueText = '';

        // 기기 측정 임계치 평가에 따른 안전 티켓 발급 처리
        if (fall === true) {
            alertTriggered = true;
            alertType = 'FALL_DETECTED';
            severity = 'DANGER';
            triggerValueText = "낙상 이벤트 확인. 자이로 각도: " + gyro + " 도";
        } else if (spo2 < 93) {
            alertTriggered = true;
            alertType = 'FATIGUE_CRITICAL';
            severity = 'CRITICAL';
            triggerValueText = "체내 극저산소 위험 상태 검출. SpO2: " + spo2 + "%";
        } else if (co2 > 1000) {
            alertTriggered = true;
            alertType = 'GAS_EXPOSURE';
            severity = 'WARNING';
            triggerValueText = "기내 피로 유발 이산화탄소 분압 가스 수치 한계 도달. eCO2: " + co2 + " ppm";
        }

        if (alertTriggered) {
            const alertQuery = `
                INSERT INTO safety_alerts (crew_id, alert_type, severity_level, trigger_value)
                VALUES ($1, $2, $3, $4)
                RETURNING *;
            `;
            const alertResult = await pool.query(alertQuery, [crew_id, alertType, severity, triggerValueText]);
            loggedData.active_alert = alertResult.rows[0];
        }

        // 수신된 데이터를 즉각 지상 통제실 및 관련 기기에 통보
        broadcast({ type: 'TELEMETRY_UPDATE', data: loggedData });
        res.status(201).json({ status: 'SUCCESS', data: loggedData });
    } catch (err) {
        console.error("원격 측정 로깅 에러: ", err);
        res.status(500).json({ error: 'Failed to record IoT telemetric packet' });
    }
});

// (3) 지상 관제사의 비상 조치 완료 리포트 API
app.post('/api/v1/frms/action-reports', async (req, res) => {
    const { alert_id, crew_id, action_description, handler_signature } = req.body;
    try {
        await pool.query('BEGIN'); // 안전한 처리를 위한 DB 트랜잭션 개시
        
        const reportQuery = `
            INSERT INTO action_reports (alert_id, crew_id, action_description, handler_signature)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const reportResult = await pool.query(reportQuery, [alert_id, crew_id, action_description, handler_signature]);

        if (alert_id) {
            await pool.query(`
                UPDATE safety_alerts 
                SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP 
                WHERE id = $1;
            `, [alert_id]);
        }

        await pool.query('COMMIT'); // 트랜잭션 정상 커밋
        
        const broadcastPayload = { type: 'ALERT_RESOLVED', alert_id, report: reportResult.rows[0] };
        broadcast(broadcastPayload);

        res.json({ status: 'RESOLVED', action: reportResult.rows[0] });
    } catch (err) {
        await pool.query('ROLLBACK'); // 에러 시 롤백 수행
        console.error("조치 내역 트랜잭션 롤백 처리: ", err);
        res.status(500).json({ error: 'Transaction aborted - unable to complete action logs' });
    }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log("[Render Hosting Active] FRMS Server listening on port " + PORT);
});
