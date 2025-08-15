export const getAccessOptions = (req) => {
	const appContext = req.headers["x-app-context"]; // Read the custom header
	const userIsAdmin = req.user?.role === "admin"; // Assuming req.user is populated by auth middleware

	if (appContext === "admin" || userIsAdmin) {
		return { accessLevel: "admin", filterActive: false }; // Admin sees all
	}
	return { accessLevel: "public", filterActive: true }; // Public sees only active
};
