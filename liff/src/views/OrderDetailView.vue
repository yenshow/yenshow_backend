<script setup>
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useHubApi } from "@/composables/useHubApi";

const route = useRoute();
const hub = useHubApi();
const order = ref(null);
const loading = ref(true);
const error = ref("");

const handleLoad = async () => {
	loading.value = true;
	error.value = "";
	try {
		order.value = await hub.getOrder(route.params.id);
	} catch (err) {
		error.value = err?.response?.data?.message || err?.message || "找不到訂單";
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
		<RouterLink to="/orders" class="text-sm text-[#06C755]" tabindex="0">← 返回訂單列表</RouterLink>
		<p v-if="loading" class="text-sm text-slate-500">載入中…</p>
		<p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
		<article v-if="order" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<h1 class="text-xl font-semibold">{{ order.projectName || order.id }}</h1>
			<p class="mt-2 text-sm">狀態：{{ order.statusLabel || order.status }}</p>
			<p v-if="order.poNumber" class="text-sm text-slate-600">客戶 PO：{{ order.poNumber }}</p>
			<p v-if="order.nextDeliveryDate" class="text-sm text-slate-600">
				下一批預計交貨：{{ order.nextDeliveryDate }}
			</p>
			<ul class="mt-4 space-y-2" aria-label="訂購品項">
				<li
					v-for="(item, index) in order.items || []"
					:key="`${item.code}-${index}`"
					class="rounded-md bg-slate-50 px-3 py-2 text-sm"
				>
					<p class="font-medium">{{ item.code }} {{ item.name }}</p>
					<p class="text-slate-600">
						訂購 {{ item.orderedQty }}／已交 {{ item.shippedQty }}／待交 {{ item.pendingQty }}
					</p>
				</li>
			</ul>
		</article>
	</div>
</template>
