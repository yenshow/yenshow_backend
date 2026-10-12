let initPromise = null;
let liffModule = null;

const loadLiff = async () => {
	if (liffModule) return liffModule;
	const mod = await import("@line/liff");
	liffModule = mod.default;
	return liffModule;
};

export const useLiff = () => {
	const ensureInit = async () => {
		if (!initPromise) {
			initPromise = (async () => {
				const liff = await loadLiff();
				const liffId = import.meta.env.VITE_LIFF_ID;
				if (!liffId) throw new Error("尚未設定 VITE_LIFF_ID");

				await liff.init({ liffId });
				if (!liff.isLoggedIn()) {
					liff.login({ redirectUri: window.location.href });
					return null;
				}
				return liff;
			})().catch((err) => {
				initPromise = null;
				throw err;
			});
		}
		return initPromise;
	};

	const getIdToken = async () => {
		const instance = await ensureInit();
		if (!instance) return null;
		const token = instance.getIDToken();
		if (!token) throw new Error("無法取得 LINE idToken");
		return token;
	};

	const getProfile = async () => {
		const instance = await ensureInit();
		if (!instance) return null;
		try {
			return await instance.getProfile();
		} catch {
			return null;
		}
	};

	return { ensureInit, getIdToken, getProfile };
};
