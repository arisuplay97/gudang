/**
 * Geo Districts Utility for Kabupaten Lombok Tengah
 * Memetakan koordinat GPS lapangan ke 12 Kecamatan administratif
 * dan memvalidasi kesesuaian wilayah kerja cabang secara otomatis (Anti-Fraud).
 */
export const LOMBOK_TENGAH_DISTRICTS = [
    {
        id: "praya",
        name: "Kecamatan Praya",
        lat: -8.7063000,
        lon: 116.2704000,
        aliases: ["praya", "cabang praya", "cbg-pry"]
    },
    {
        id: "praya_tengah",
        name: "Kecamatan Praya Tengah",
        lat: -8.7120000,
        lon: 116.3010000,
        aliases: ["praya tengah", "cabang praya tengah", "cbg-prt"]
    },
    {
        id: "praya_barat",
        name: "Kecamatan Praya Barat",
        lat: -8.7512000,
        lon: 116.2084000,
        aliases: ["praya barat", "cabang praya barat", "cbg-prb"]
    },
    {
        id: "praya_barat_daya",
        name: "Kecamatan Praya Barat Daya",
        lat: -8.7750000,
        lon: 116.1750000,
        aliases: ["praya barat daya", "cabang praya barat daya", "cbg-pbd"]
    },
    {
        id: "praya_timur",
        name: "Kecamatan Praya Timur",
        lat: -8.7200000,
        lon: 116.3400000,
        aliases: ["praya timur", "cabang praya timur", "cbg-prm"]
    },
    {
        id: "pujut",
        name: "Kecamatan Pujut",
        lat: -8.8475000,
        lon: 116.2818000,
        aliases: ["pujut", "cabang pujut", "cbg-pjt"]
    },
    {
        id: "jonggat",
        name: "Kecamatan Jonggat",
        lat: -8.6720000,
        lon: 116.2165000,
        aliases: ["jonggat", "cabang jonggat", "cbg-jgt"]
    },
    {
        id: "kopang",
        name: "Kecamatan Kopang",
        lat: -8.6416000,
        lon: 116.3262000,
        aliases: ["kopang", "cabang kopang", "cbg-kpg"]
    },
    {
        id: "janapria",
        name: "Kecamatan Janapria",
        lat: -8.6850000,
        lon: 116.3750000,
        aliases: ["janapria", "cabang janapria", "cbg-jnp"]
    },
    {
        id: "pringgarata",
        name: "Kecamatan Pringgarata",
        lat: -8.6015000,
        lon: 116.2230000,
        aliases: ["pringgarata", "cabang pringgarata", "cbg-pga"]
    },
    {
        id: "batukliang",
        name: "Kecamatan Batukliang",
        lat: -8.6180000,
        lon: 116.2870000,
        aliases: ["batukliang", "cabang batukliang", "cbg-bkl"]
    },
    {
        id: "batukliang_utara",
        name: "Kecamatan Batukliang Utara",
        lat: -8.5700000,
        lon: 116.3050000,
        aliases: ["batukliang utara", "cabang batukliang utara", "cbg-bku"]
    }
];
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
/**
 * Mencari kecamatan terdekat berdasarkan koordinat GPS
 */
export function resolveDistrictFromCoordinates(lat, lon) {
    let closestDistrict = LOMBOK_TENGAH_DISTRICTS[0];
    let minDistance = Infinity;
    for (const d of LOMBOK_TENGAH_DISTRICTS) {
        const dist = haversineDistanceKm(lat, lon, d.lat, d.lon);
        if (dist < minDistance) {
            minDistance = dist;
            closestDistrict = d;
        }
    }
    return {
        district: closestDistrict,
        distanceKm: Math.round(minDistance * 10) / 10
    };
}
/**
 * Menemukan target kecamatan resmi dari nama cabang
 */
export function findTargetDistrictForBranch(branchName) {
    if (!branchName)
        return null;
    const lower = branchName.toLowerCase().trim();
    for (const d of LOMBOK_TENGAH_DISTRICTS) {
        if (d.aliases.some(alias => lower.includes(alias) || lower === alias)) {
            return d;
        }
    }
    return null;
}
/**
 * Memvalidasi apakah koordinat foto cocok dengan wilayah kerja cabang asal
 */
export function auditCrossDistrictEvidence(branchName, lat, lon) {
    const resolved = resolveDistrictFromCoordinates(lat, lon);
    const detectedDistrictName = resolved.district.name;
    const target = findTargetDistrictForBranch(branchName);
    const targetDistrictName = target ? target.name : `Wilayah ${branchName}`;
    // Hitung jarak ke pusat kecamatan cabang asal
    let distanceToTargetKm = 0;
    if (target) {
        distanceToTargetKm = haversineDistanceKm(lat, lon, target.lat, target.lon);
        distanceToTargetKm = Math.round(distanceToTargetKm * 10) / 10;
    }
    // Periksa apakah kecamatan terdekat berbeda dengan kecamatan cabang
    const isCrossDistrict = Boolean(target && resolved.district.id !== target.id);
    let notes = "";
    if (isCrossDistrict) {
        notes = `Anomali Wilayah: Material milik ${branchName} (${targetDistrictName}), namun koordinat foto terdeteksi berada di ${detectedDistrictName} (~${distanceToTargetKm} km dari pusat ${targetDistrictName}).`;
    }
    else {
        notes = `Sesuai Wilayah Kerja: Berada di ${detectedDistrictName}.`;
    }
    return {
        detectedDistrict: detectedDistrictName,
        targetDistrict: targetDistrictName,
        isCrossDistrict,
        distanceToTargetKm,
        notes
    };
}
