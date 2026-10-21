/** 反覆 decode，消化重複 percent-encoding */
export const fullyDecodeUri = (value) => {
	let current = String(value ?? "");
	for (let i = 0; i < 5; i++) {
		try {
			const next = decodeURIComponent(current.replace(/\+/g, "%20"));
			if (next === current) break;
			current = next;
		} catch {
			break;
		}
	}
	return current;
};
