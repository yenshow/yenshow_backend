import { createRouter, createWebHistory } from "vue-router";
import { useHubStore } from "@/stores/hubStore";

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{ path: "/", name: "home", component: () => import("@/views/HomeView.vue") },
		{ path: "/verify", name: "verify", component: () => import("@/views/VerifyView.vue") },
		{ path: "/products", name: "products", component: () => import("@/views/ProductsView.vue") },
		{
			path: "/orders",
			name: "orders",
			component: () => import("@/views/OrdersView.vue"),
			meta: { requiresHub: true }
		},
		{
			path: "/orders/:id",
			name: "order-detail",
			component: () => import("@/views/OrderDetailView.vue"),
			meta: { requiresHub: true }
		},
		{
			path: "/service",
			name: "service",
			component: () => import("@/views/ServiceView.vue"),
			meta: { requiresHub: true }
		}
	]
});

router.beforeEach((to) => {
	if (!to.meta.requiresHub) return true;
	const hubStore = useHubStore();
	if (!hubStore.isBound) {
		return { name: "verify", query: { redirect: to.fullPath } };
	}
	return true;
});

export default router;
