<script setup>
import { onMounted, ref } from "vue";
import { useHubApi } from "@/composables/useHubApi";

const hub = useHubApi();
const query = ref("");
const products = ref([]);
const loading = ref(false);
const error = ref("");
const downloadMessage = ref("");

const productName = (product) => product?.name?.TW || product?.name?.EN || product?.code || "";

const documentUrls = (product) => {
	const byLang = [...(product?.documentsByLang?.TW || []), ...(product?.documentsByLang?.EN || [])];
	const legacy = product?.documents || [];
	return [...new Set([...byLang, ...legacy].filter(Boolean))];
};

const fileLabel = (documentUrl) => {
	const parts = String(documentUrl).split("/");
	return parts[parts.length - 1] || "規格書.pdf";
};

const handleSearch = async () => {
	loading.value = true;
	error.value = "";
	try {
		products.value = await hub.searchProducts(query.value.trim());
	} catch (err) {
		error.value = err?.response?.data?.message || err?.message || "搜尋失敗";
		products.value = [];
	} finally {
		loading.value = false;
	}
};

const handleDownload = async (product, documentUrl) => {
	downloadMessage.value = "";
	error.value = "";
	try {
		const url = await hub.buildPublicDocumentUrl({
			productId: product._id,
			documentUrl
		});
		window.open(url, "_blank", "noopener,noreferrer");
		downloadMessage.value = "已開啟下載連結";
	} catch (err) {
		error.value = err?.response?.data?.message || err?.message || "無法取得下載連結";
	}
};

onMounted(() => {
	handleSearch();
});
</script>

<template>
	<div class="space-y-4">
		<section>
			<h1 class="text-xl font-semibold">規格查詢</h1>
			<p class="mt-1 text-sm text-slate-600">免登入即可搜尋與下載規格書。</p>
		</section>

		<form class="flex gap-2" @submit.prevent="handleSearch">
			<input
				v-model="query"
				type="search"
				placeholder="例如 YS-AC-08"
				class="flex-1 rounded-md border border-slate-300 px-3 py-2"
				aria-label="搜尋產品"
			/>
			<button
				type="submit"
				class="rounded-md bg-[#06C755] px-4 py-2 text-white disabled:opacity-60"
				:disabled="loading"
				aria-label="搜尋"
			>
				搜尋
			</button>
		</form>

		<p v-if="loading" class="text-sm text-slate-500">搜尋中…</p>
		<p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
		<p v-if="downloadMessage" class="text-sm text-emerald-700">{{ downloadMessage }}</p>

		<ul class="space-y-3" aria-label="產品搜尋結果">
			<li
				v-for="product in products"
				:key="product._id"
				class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
			>
				<p class="font-medium">{{ product.code }}</p>
				<p class="text-sm text-slate-600">{{ productName(product) }}</p>
				<div v-if="documentUrls(product).length" class="mt-3 space-y-2">
					<button
						v-for="doc in documentUrls(product)"
						:key="doc"
						type="button"
						class="block w-full rounded-md border border-slate-200 px-3 py-2 text-left text-sm hover:border-[#06C755]"
						:aria-label="`下載 ${fileLabel(doc)}`"
						tabindex="0"
						@click="handleDownload(product, doc)"
					>
						下載 {{ fileLabel(doc) }}
					</button>
				</div>
				<p v-else class="mt-2 text-xs text-slate-400">此產品尚無已上傳規格書</p>
			</li>
		</ul>
		<p v-if="!loading && products.length === 0" class="text-sm text-slate-500">沒有符合的產品</p>
	</div>
</template>
