<script setup>
import { onMounted, reactive, ref } from "vue";
import { useHubApi } from "@/composables/useHubApi";

const hub = useHubApi();
const tickets = ref([]);
const loading = ref(true);
const submitting = ref(false);
const error = ref("");
const success = ref("");

const form = reactive({
	productCode: "",
	serialNumber: "",
	issueType: "其他",
	description: ""
});

const issueTypes = ["無法開機", "網路異常", "人臉辨識", "門禁控制", "軟體問題", "其他"];

const handleLoad = async () => {
	loading.value = true;
	error.value = "";
	try {
		tickets.value = await hub.listTickets();
	} catch (err) {
		error.value = err?.response?.data?.message || err?.message || "無法載入案件";
	} finally {
		loading.value = false;
	}
};

const handleSubmit = async () => {
	success.value = "";
	error.value = "";
	submitting.value = true;
	try {
		const ticket = await hub.createTicket({ ...form });
		success.value = `案件已建立：${ticket?.id || ""}`;
		form.description = "";
		await handleLoad();
	} catch (err) {
		error.value = err?.response?.data?.message || err?.message || "建立失敗";
	} finally {
		submitting.value = false;
	}
};

onMounted(() => {
	handleLoad();
});
</script>

<template>
	<div class="space-y-6">
		<section>
			<h1 class="text-xl font-semibold">售後服務</h1>
			<p class="mt-1 text-sm text-slate-600">建立售後案件（寫入 CRM 適配層）。</p>
		</section>

		<form class="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" @submit.prevent="handleSubmit">
			<label class="block text-sm">
				<span class="mb-1 block">產品型號</span>
				<input v-model="form.productCode" type="text" class="w-full rounded-md border border-slate-300 px-3 py-2" aria-label="產品型號" />
			</label>
			<label class="block text-sm">
				<span class="mb-1 block">S/N</span>
				<input v-model="form.serialNumber" type="text" class="w-full rounded-md border border-slate-300 px-3 py-2" aria-label="序號" />
			</label>
			<label class="block text-sm">
				<span class="mb-1 block">問題類型</span>
				<select v-model="form.issueType" class="w-full rounded-md border border-slate-300 px-3 py-2" aria-label="問題類型">
					<option v-for="type in issueTypes" :key="type" :value="type">{{ type }}</option>
				</select>
			</label>
			<label class="block text-sm">
				<span class="mb-1 block">問題描述 *</span>
				<textarea v-model="form.description" required rows="4" class="w-full rounded-md border border-slate-300 px-3 py-2" aria-label="問題描述" />
			</label>
			<button
				type="submit"
				class="w-full rounded-md bg-[#06C755] px-3 py-2.5 font-medium text-white disabled:opacity-60"
				:disabled="submitting"
				aria-label="送出售後案件"
			>
				{{ submitting ? "送出中…" : "送出案件" }}
			</button>
		</form>

		<p v-if="success" class="text-sm text-emerald-700">{{ success }}</p>
		<p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>

		<section>
			<h2 class="mb-2 text-base font-medium">我的案件</h2>
			<p v-if="loading" class="text-sm text-slate-500">載入中…</p>
			<ul v-else class="space-y-3">
				<li
					v-for="ticket in tickets"
					:key="ticket.id"
					class="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
				>
					<p class="font-medium">{{ ticket.id }}</p>
					<p class="text-slate-600">{{ ticket.statusLabel || ticket.status }} · {{ ticket.issueType }}</p>
					<p class="mt-2 text-slate-700">{{ ticket.description }}</p>
				</li>
			</ul>
		</section>
	</div>
</template>
