/** 舊鍵 → 正式鍵 */
export const LEGACY_FEATURE_KEY_MAP = Object.freeze({
	access_security: "intercom"
});

/**
 * BA central 白名單 18 鍵（與 BA FEATURE_KEYS_CENTRAL 完全一致）
 * unit：devices=台數；points=點數（wire 仍用 maxDevices）；both=elevator
 */
export const FEATURE_META = Object.freeze({
	people_counting: { label: "門禁管理", unit: "devices" },
	roll_call: { label: "時段簽到", unit: "devices" },
	elevator: { label: "電梯管理", unit: "both" },
	lighting: { label: "照明系統", unit: "points" },
	hvac: { label: "空調系統", unit: "points" },
	air_circulation: { label: "空氣循環", unit: "points" },
	drainage: { label: "排水系統", unit: "points" },
	power: { label: "電力系統", unit: "points" },
	energy: { label: "能源管理系統", unit: "points" },
	fire: { label: "消防系統", unit: "points" },
	emergency_rescue: { label: "緊急求救", unit: "points" },
	smoke_alarm: { label: "煙霧警報", unit: "points" },
	environment: { label: "環境品質", unit: "points" },
	surveillance: { label: "影像監控", unit: "devices" },
	vehicle_access: { label: "車輛進出", unit: "devices" },
	multimedia: { label: "多媒體資訊牆席次", unit: "devices" },
	intercom: { label: "對講系統", unit: "devices" },
	security: { label: "保全系統", unit: "points" }
});

export const FEATURE_LABELS = Object.freeze({
	...Object.fromEntries(Object.entries(FEATURE_META).map(([k, v]) => [k, v.label])),
	access_security: "對講系統",
	visitor: "訪客系統"
});

export const CENTRAL_FEATURES = Object.freeze(Object.keys(FEATURE_META));

export const CONSTRUCTION_FEATURES = Object.freeze([
	"people_counting",
	"environment",
	"surveillance",
	"vehicle_access",
	"roll_call"
]);

/** Mongoose enum：正式鍵＋舊鍵 */
export const LICENSE_FEATURE_ENUM = Object.freeze([...CENTRAL_FEATURES, "access_security", "visitor"]);

export const normalizeFeatureKey = (featureKey) => {
	if (typeof featureKey !== "string") return featureKey;
	return LEGACY_FEATURE_KEY_MAP[featureKey] || featureKey;
};

export const getFeatureUnit = (featureKey) => {
	const key = normalizeFeatureKey(featureKey);
	return FEATURE_META[key]?.unit || "devices";
};

export const getFeatureLabel = (featureKey) => {
	const key = normalizeFeatureKey(featureKey);
	return FEATURE_LABELS[key] || FEATURE_LABELS[featureKey] || featureKey;
};

/** UI／Email／PDF：依單位格式化（台／點） */
export const formatQuotaDisplay = (featureKey, quota) => {
	const unit = getFeatureUnit(featureKey);
	if (quota == null || typeof quota !== "object" || Array.isArray(quota)) return "不限";

	const fmt = (n, suffix) => {
		if (n === undefined || n === null || n === "") return null;
		return `${n} ${suffix}`;
	};

	if (unit === "both") {
		const devices = fmt(quota.maxDevices, "台");
		const points = fmt(quota.maxPoints, "點");
		if (!devices && !points) return "不限";
		if (devices && points) return `${devices}／${points}`;
		return devices || points;
	}
	if (unit === "points") return fmt(quota.maxDevices, "點") || "不限";
	return fmt(quota.maxDevices, "台") || "不限";
};
