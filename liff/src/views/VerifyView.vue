<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useLiff } from "@/composables/useLiff";
import { useHubApi } from "@/composables/useHubApi";
import { useHubStore } from "@/stores/hubStore";

const route = useRoute();
const router = useRouter();
const hubStore = useHubStore();
const { ensureInit, getIdToken } = useLiff();
const hub = useHubApi();

const orderNo = ref("");
const taxId = ref("");
const loading = ref(false);
const message = ref("");
const error = ref("");

const redirectTarget = computed(() =>
	typeof route.query.redirect === "string" ? route.query.redirect : "/"
);

const handleLoad = async () => {
	try {
		await ensureInit();
		if (hubStore.isBound) {
			await hub.getMe();
		}
	} catch (err) {
		error.value = err?.message || "無法初始化 LIFF";
	}
};

const handleVerify = async () => {
	error.value = "";
	message.value = "";
	loading.value = true;
	try {
		const idToken = await getIdToken();
		await hub.verifyOrder({
			idToken,
			orderNo: orderNo.value.trim(),
			taxId: taxId.value.trim()
		});
		message.value = "驗證成功";
		await router.replace(redirectTarget.value);
	} catch (err) {
		error.value = err?.response?.data?.message || err?.message || "驗證失敗";
	} finally {
		loading.value = false;
	}
};

const handleLineLogin = async () => {
	error.value = "";
	loading.value = true;
	try {
		const idToken = await getIdToken();
		await hub.loginWithLine(idToken);
		await router.replace(redirectTarget.value);
	} catch (err) {
		error.value = err?.response?.data?.message || err?.message || "尚未驗證，請輸入訂單與統編";
	} finally {
		loading.value = false;
	}
};

const handleUnbind = async () => {
	if (!confirm("確定解除綁定？之後需重新以訂單與統編驗證。")) return;
	loading.value = true;
	try {
		await hub.unbind();
		message.value = "已解除綁定";
	} catch (err) {
		error.value = err?.response?.data?.message || err?.message || "解除失敗";
	} finally {
		loading.value = false;
	}
};

onMounted(() => {
	handleLoad();
});
</script>

<template>
	<div class="space-y-5">
		<section>
			<h1 class="text-xl font-semibold">身分驗證</h1>
			<p class="mt-1 text-sm text-slate-600">
				第一次請輸入訂單編號與公司統一編號，對應 CRM 客戶後即可使用訂單與售後功能。
			</p>
		</section>

		<div
			v-if="hubStore.isBound"
			class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
			role="status"
		>
			<p>已綁定：{{ hubStore.profile?.companyName || hubStore.profile?.taxId }}</p>
			<p v-if="hubStore.profile?.verifiedOrderNo" class="mt-1 text-emerald-700">
				驗證訂單：{{ hubStore.profile.verifiedOrderNo }}
			</p>
			<button
				type="button"
				class="mt-3 rounded-md border border-emerald-300 bg-white px-3 py-2"
				:disabled="loading"
				aria-label="解除綁定"
				tabindex="0"
				@click="handleUnbind"
			>
				解除綁定
			</button>
		</div>

		<form v-else class="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" @submit.prevent="handleVerify">
			<label class="block text-sm">
				<span class="mb-1 block text-slate-700">訂單編號</span>
				<input
					v-model="orderNo"
					type="text"
					required
					class="w-full rounded-md border border-slate-300 px-3 py-2"
					placeholder="例如 S00997_PO26002116"
					aria-label="訂單編號"
				/>
			</label>
			<label class="block text-sm">
				<span class="mb-1 block text-slate-700">統一編號</span>
				<input
					v-model="taxId"
					type="text"
					required
					inputmode="numeric"
					class="w-full rounded-md border border-slate-300 px-3 py-2"
					placeholder="8 碼統編"
					aria-label="統一編號"
				/>
			</label>
			<button
				type="submit"
				class="w-full rounded-md bg-[#06C755] px-3 py-2.5 font-medium text-white disabled:opacity-60"
				:disabled="loading"
				aria-label="驗證並綁定"
			>
				{{ loading ? "處理中…" : "驗證並綁定" }}
			</button>
			<button
				type="button"
				class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
				:disabled="loading"
				aria-label="已綁定則直接登入"
				tabindex="0"
				@click="handleLineLogin"
			>
				已驗證過？直接用 LINE 登入
			</button>
		</form>

		<p v-if="message" class="text-sm text-emerald-700" role="status">{{ message }}</p>
		<p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
	</div>
</template>
