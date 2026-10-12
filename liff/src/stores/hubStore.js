import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useHubStore = defineStore(
	"hub",
	() => {
		const token = ref("");
		const profile = ref(null);

		const isBound = computed(() => Boolean(token.value));

		const setSession = ({ token: nextToken, profile: nextProfile }) => {
			token.value = nextToken || "";
			profile.value = nextProfile || null;
		};

		const clearSession = () => {
			token.value = "";
			profile.value = null;
		};

		return {
			token,
			profile,
			isBound,
			setSession,
			clearSession
		};
	},
	{
		persist: {
			key: "yenshow-liff-hub",
			paths: ["token", "profile"]
		}
	}
);
