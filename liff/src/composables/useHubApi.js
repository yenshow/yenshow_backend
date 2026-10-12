import axios from "axios";
import { useHubStore } from "@/stores/hubStore";

const apiBase = () => import.meta.env.VITE_API_BASE_URL || "";
const fileBase = () => (import.meta.env.VITE_FILE_SERVICE_BASE_URL || apiBase()).replace(/\/$/, "");

const api = axios.create();
const apiAuth = axios.create();

api.interceptors.request.use((config) => {
	config.baseURL = apiBase();
	return config;
});

apiAuth.interceptors.request.use((config) => {
	config.baseURL = apiBase();
	const hubStore = useHubStore();
	if (hubStore.token) {
		config.headers.Authorization = `Bearer ${hubStore.token}`;
	}
	return config;
});

export const useHubApi = () => {
	const hubStore = useHubStore();

	const applySession = (data) => {
		const result = data?.result || data;
		if (result?.token) {
			hubStore.setSession({ token: result.token, profile: result.profile || null });
		}
		return result;
	};

	const loginWithLine = async (idToken) => {
		const { data } = await api.post("/api/hub/auth/line", { idToken });
		return applySession(data);
	};

	const verifyOrder = async ({ idToken, orderNo, taxId }) => {
		const { data } = await api.post("/api/hub/verify-order", { idToken, orderNo, taxId });
		return applySession(data);
	};

	const getMe = async () => {
		const { data } = await apiAuth.get("/api/hub/me");
		const profile = data?.result || data;
		hubStore.profile = profile;
		return profile;
	};

	const unbind = async () => {
		const { data } = await apiAuth.delete("/api/hub/bind");
		hubStore.clearSession();
		return data;
	};

	const searchProducts = async (q) => {
		const { data } = await api.get("/api/products/search", {
			params: { keyword: q || undefined, limit: 20 }
		});
		const result = data?.result || data;
		return result?.productsList || result?.products || [];
	};

	const buildPublicDocumentUrl = async ({ productId, documentUrl }) => {
		const { data } = await api.get("/api/documents/specifications/public-url", {
			params: { productId, documentUrl }
		});
		const { storagePath, token } = data?.result || {};
		if (!storagePath || !token) throw new Error("無法取得下載連結");
		return `${fileBase()}/storage/${storagePath}?dl=${encodeURIComponent(token)}`;
	};

	const listOrders = async () => {
		const { data } = await apiAuth.get("/api/hub/orders");
		return data?.result?.orders || [];
	};

	const getOrder = async (orderId) => {
		const { data } = await apiAuth.get(`/api/hub/orders/${encodeURIComponent(orderId)}`);
		return data?.result?.order;
	};

	const listTickets = async () => {
		const { data } = await apiAuth.get("/api/hub/service-tickets");
		return data?.result?.tickets || [];
	};

	const createTicket = async (payload) => {
		const { data } = await apiAuth.post("/api/hub/service-tickets", payload);
		return data?.result?.ticket;
	};

	return {
		loginWithLine,
		verifyOrder,
		getMe,
		unbind,
		searchProducts,
		buildPublicDocumentUrl,
		listOrders,
		getOrder,
		listTickets,
		createTicket
	};
};
