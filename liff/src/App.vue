<template>
	<div class="min-h-screen bg-slate-50 text-slate-900">
		<header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
			<div class="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
				<RouterLink
					to="/"
					class="text-base font-semibold tracking-wide text-[#06C755]"
					aria-label="我的遠岫首頁"
					tabindex="0"
				>
					我的遠岫
				</RouterLink>
				<nav class="flex items-center gap-3 text-sm text-slate-600" aria-label="LIFF 導覽">
					<RouterLink to="/products" class="hover:text-slate-900" tabindex="0">規格</RouterLink>
					<RouterLink to="/orders" class="hover:text-slate-900" tabindex="0">訂單</RouterLink>
					<RouterLink to="/service" class="hover:text-slate-900" tabindex="0">售後</RouterLink>
				</nav>
			</div>
		</header>
		<main class="mx-auto max-w-lg px-4 py-5">
			<RouterView />
		</main>
	</div>
</template>
