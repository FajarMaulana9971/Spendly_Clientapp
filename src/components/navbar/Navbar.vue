<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const mobileOpen = ref(false)

const links = [
  { to: '/', label: 'Beranda', icon: 'home' },
  { to: '/expenses', label: 'Pengeluaran', icon: 'expense' },
  { to: '/payments', label: 'Pembayaran', icon: 'payment' },
]

const isActive = (to) => {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

const closeMobile = () => {
  mobileOpen.value = false
}
</script>

<template>
  <!-- ── backdrop for mobile ── -->
  <Transition name="fade">
    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
      @click="closeMobile"
    />
  </Transition>

  <nav class="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl">
    <div
      class="relative flex items-center justify-between h-14 px-3 rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.07)]"
    >
      <!-- ── Logo ── -->
      <RouterLink to="/" class="flex items-center gap-2.5 pl-1 group" @click="closeMobile">
        <div class="relative">
          <img
            src="../../assets/Wallet_logo.png"
            class="h-15 w-auto drop-shadow-md transition-transform duration-300 group-hover:scale-110"
            alt="Spendly"
          />
          <!-- subtle glow behind logo -->
          <div
            class="absolute inset-0 blur-lg opacity-0 group-hover:opacity-40 bg-violet-400 transition-opacity duration-500 rounded-full scale-75"
          ></div>
        </div>
      </RouterLink>

      <!-- ── Desktop nav links ── -->
      <ul class="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
        <li v-for="link in links" :key="link.to">
          <RouterLink
            :to="link.to"
            class="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
            :class="
              isActive(link.to)
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            "
          >
            <!-- active pill background -->
            <span
              v-if="isActive(link.to)"
              class="absolute inset-0 rounded-xl bg-white/10 border border-white/15 shadow-inner"
            ></span>

            <!-- icons -->
            <svg
              v-if="link.icon === 'home'"
              class="relative w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <svg
              v-else-if="link.icon === 'expense'"
              class="relative w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <svg
              v-else-if="link.icon === 'payment'"
              class="relative w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>

            <span class="relative">{{ link.label }}</span>

            <!-- active dot indicator -->
            <span
              v-if="isActive(link.to)"
              class="relative ml-0.5 w-1 h-1 rounded-full bg-violet-400 shadow-[0_0_6px_2px_rgba(167,139,250,0.6)]"
            ></span>
          </RouterLink>
        </li>
      </ul>

      <!-- ── Right side: decorative status pill (desktop) ── -->
      <div class="hidden md:flex items-center gap-2 pr-1">
        <div
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="text-emerald-400 text-xs font-medium">Aktif</span>
        </div>
      </div>

      <!-- ── Mobile: hamburger ── -->
      <button
        class="md:hidden flex flex-col justify-center items-center w-9 h-9 rounded-xl hover:bg-white/5 transition-colors gap-1.5 mr-1"
        @click="mobileOpen = !mobileOpen"
        aria-label="Toggle menu"
      >
        <span
          class="block h-px w-5 bg-slate-300 transition-all duration-300 origin-center"
          :class="mobileOpen ? 'rotate-45 translate-y-[3px]' : ''"
        ></span>
        <span
          class="block h-px w-5 bg-slate-300 transition-all duration-300"
          :class="mobileOpen ? 'opacity-0 scale-x-0' : ''"
        ></span>
        <span
          class="block h-px w-5 bg-slate-300 transition-all duration-300 origin-center"
          :class="mobileOpen ? '-rotate-45 -translate-y-[9px]' : ''"
        ></span>
      </button>
    </div>

    <!-- ── Mobile dropdown menu ── -->
    <Transition name="slide-down">
      <div
        v-if="mobileOpen"
        class="md:hidden mt-2 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.7)] overflow-hidden"
      >
        <div class="p-2">
          <RouterLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150"
            :class="
              isActive(link.to)
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            "
            @click="closeMobile"
          >
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center"
              :class="
                isActive(link.to)
                  ? 'bg-violet-500/20 border border-violet-500/30'
                  : 'bg-slate-700/50'
              "
            >
              <svg
                v-if="link.icon === 'home'"
                class="w-4 h-4"
                :class="isActive(link.to) ? 'text-violet-400' : 'text-slate-500'"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <svg
                v-else-if="link.icon === 'expense'"
                class="w-4 h-4"
                :class="isActive(link.to) ? 'text-violet-400' : 'text-slate-500'"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <svg
                v-else-if="link.icon === 'payment'"
                class="w-4 h-4"
                :class="isActive(link.to) ? 'text-violet-400' : 'text-slate-500'"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <span>{{ link.label }}</span>
            <span
              v-if="isActive(link.to)"
              class="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_2px_rgba(167,139,250,0.5)]"
            ></span>
          </RouterLink>
        </div>

        <!-- bottom status bar in mobile menu -->
        <div
          class="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-slate-950/40"
        >
          <span class="text-slate-600 text-xs">spendly v1.0</span>
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-emerald-500 text-xs font-medium">Aktif</span>
          </div>
        </div>
      </div>
    </Transition>
  </nav>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-down-leave-active {
  transition: all 0.18s ease-in;
}
.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.99);
}

/* Active link underline shimmer */
a.router-link-exact-active {
  position: relative;
}
</style>
