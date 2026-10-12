<script setup>
import { onMounted, ref } from "vue";
import { useHubApi } from "@/composables/useHubApi";

const hub = useHubApi();
const orders = ref([]);
const loading = ref(true);
const error = ref("");

const handleLoad = async () => {
	loading.value = true;
	error.value = "";
	try {
		orders.value = await hub.listOrders();
	} catch (err) {
		error.value = err?.response?.data?.message || err?.message || "無法載入訂單";
	} finally {
		loading.value = false;
	}
};

onMounted(() => {
	handleLoad();
});
</script>

<template>
	<div class="space-y-4">
		<section>
			<h1 class="text-xl font-semibold">訂單追蹤</h1>
			<p class="mt-1 text-sm text-slate-600">資料來自 CRM（未串接時為 Mock）。</p>
		</section>
		<p v-if="loading" class="text-sm text-slate-500">載入中…</p>
		<p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
		<ul v-else class="space-y-3" aria-label="訂單列表">
			<li v-for="order in orders" :key="order.id">
				<RouterLink
					:to="`/orders/${encodeURIComponent(order.id)}`"
					class="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#06C755]"
					tabindex="0"
				>
					<p class="font-medium">{{ order.projectName || order.id }}</p>
					<p class="mt-1 text-sm text-slate-600">{{ order.statusLabel || order.status }}</p>
					<p class="mt-1 text-xs text-slate-400">{{ order.id }}</p>
				</RouterLink>
			</li>
		</ul>
		<p v-if="!loading && !error && orders.length === 0" class="text-sm text-slate-500">目前沒有訂單</p>
	</div>
</template>
