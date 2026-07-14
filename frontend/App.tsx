// Main App.tsx - Optimized for iOS & Android
// Compatible with NativeWind (Tailwind CSS)

import React, { useState } from 'react';
import { 
    StyleSheet, Text, View, ScrollView, TouchableOpacity, 
    SafeAreaView, ActivityIndicator, Alert, StatusBar 
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const API_ENDPOINT = "https://airfitme-frms-server.onrender.com/api/v1";

export default function App() {
    const [fatigueScore, setFatigueScore] = useState(48);
    const [telemetry, setTelemetry] = useState({
        hrv: 55, rr: 14, temp: 36.8, sleep: "6h 15m", spo2: 98
    });
    const [loading, setLoading] = useState(false);

    const checkDeviceSync = async () => {
        try {
            setLoading(true);
            const response = await fetch(API_ENDPOINT + "/frms/crew-status");
            const data = await response.json();
            if (data && data.length > 0) {
                const myStatus = data[0];
                setTelemetry({
                    hrv: parseFloat(myStatus.hrv_ms) || 55,
                    rr: parseInt(myStatus.respiratory_rate) || 14,
                    temp: parseFloat(myStatus.skin_temperature) || 36.8,
                    spo2: parseInt(myStatus.spo2_percent) || 98,
                    sleep: "6h 15m"
                });
            }
        } catch (error) {
            Alert.alert("Sync Error", "Could not synchronize with Render Cloud server.");
        } finally {
            setLoading(false);
        }
    };

    const triggerSOSAlert = () => {
        Alert.alert(
            "Emergency SOS Command Active",
            "This will broadcast distress pings to the GCS portal. Proceed?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "YES, BROADCAST", onPress: () => {}, style: "destructive" }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <View>
                    <Text style={styles.brand}>AIRFITME</Text>
                    <Text style={styles.title}>PILOT DASHBOARD</Text>
                </View>
                <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>LIVE RISK: MEDIUM</Text>
                </View>
            </View>

            <ScrollView style={styles.mainScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.gaugeCard}>
                    <Text style={styles.gaugeHeading}>FATIGUE RISK SCORE</Text>
                    <View style={styles.gaugeCenter}>
                        <Svg width="180" height="180" viewBox="0 0 100 100">
                            <Circle cx="50" cy="50" r="40" stroke="#0f2735" strokeWidth="8" fill="none" />
                            <Circle cx="50" cy="50" r="40" stroke="#f59e0b" strokeWidth="8" 
                                    strokeDasharray="251.2" strokeDashoffset="125" fill="none" strokeLinecap="round" />
                        </Svg>
                        <View style={styles.gaugeContent}>
                            <Text style={styles.scoreNumber}>{fatigueScore}</Text>
                            <Text style={styles.scoreLevel}>ELEVATED</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.gridContainer}>
                    <View style={styles.gridCard}>
                        <Text style={styles.cardLabel}>HEART RATE VARIABILITY (HRV)</Text>
                        <Text style={styles.cardValue}>{telemetry.hrv} ms</Text>
                    </View>
                    <View style={styles.gridCard}>
                        <Text style={styles.cardLabel}>RESPIRATORY RATE (RR)</Text>
                        <Text style={styles.cardValue}>{telemetry.rr} bpm</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.sosButton} onPress={triggerSOSAlert}>
                    <Text style={styles.sosButtonText}>TRIGGER DISTRESS SOS PING</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#091a24' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#0f2735' },
    brand: { fontSize: 18, fontWeight: '900', color: '#38bdf8' },
    title: { fontSize: 12, color: '#94a3b8' },
    badgeContainer: { backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    badgeText: { color: '#f59e0b', fontSize: 10, fontWeight: 'bold' },
    mainScroll: { padding: 16 },
    gaugeCard: { backgroundColor: '#0f2735', borderRadius: 24, padding: 20, alignItems: 'center', marginBottom: 16 },
    gaugeHeading: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', marginBottom: 16 },
    gaugeCenter: { position: 'relative', width: 180, height: 180, justifyContent: 'center', alignItems: 'center' },
    gaugeContent: { position: 'absolute', alignItems: 'center' },
    scoreNumber: { fontSize: 48, fontWeight: '900', color: '#fff' },
    scoreLevel: { fontSize: 14, fontWeight: 'bold', color: '#f59e0b' },
    gridContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    gridCard: { backgroundColor: '#0f2735', width: '48%', borderRadius: 16, padding: 14 },
    cardLabel: { fontSize: 9, color: '#94a3b8', fontWeight: 'bold' },
    cardValue: { fontSize: 18, color: '#fff', fontWeight: 'bold', marginVertical: 4 },
    sosButton: { backgroundColor: '#ef4444', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 30 },
    sosButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});
