<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Pilih tanggal' },
  min: { type: String, default: '' },
  max: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const today = new Date()
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())

const monthNames = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]
const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

const prevMonth = () => {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else viewMonth.value--
}
const nextMonth = () => {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else viewMonth.value++
}

const calendarDays = computed(() => {
  const firstDay = new Date(viewYear.value, viewMonth.value, 1).getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear.value, viewMonth.value, 0).getDate()
  const cells = []
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: daysInPrevMonth - i, currentMonth: false, date: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, currentMonth: true, date: dateStr })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) cells.push({ day: d, currentMonth: false, date: null })
  return cells
})

const isSelected = (dateStr) => dateStr && props.modelValue === dateStr
const isToday = (dateStr) => {
  if (!dateStr) return false
  const t = today
  return (
    dateStr ===
    `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  )
}
const isDisabled = (dateStr) => {
  if (!dateStr) return true
  if (props.min && dateStr < props.min) return true
  if (props.max && dateStr > props.max) return true
  return false
}

const selectDate = (dateStr) => {
  if (!dateStr || isDisabled(dateStr)) return
  emit('update:modelValue', dateStr)
  open.value = false
}

const clear = () => {
  emit('update:modelValue', '')
  open.value = false
}

const displayValue = computed(() => {
  if (!props.modelValue) return ''
  const d = new Date(props.modelValue + 'T00:00:00')
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
})

// --- Fixed positioning ---
const pickerRef = ref(null)
const dropdownStyle = ref({})

const updateDropdownPosition = () => {
  if (!pickerRef.value) return
  const rect = pickerRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const dropdownHeight = 340

  if (spaceBelow >= dropdownHeight) {
    dropdownStyle.value = {
      top: `${rect.bottom + 8}px`,
      left: `${rect.left}px`,
      width: `${Math.max(rect.width, 288)}px`,
    }
  } else {
    dropdownStyle.value = {
      top: `${rect.top - dropdownHeight - 8}px`,
      left: `${rect.left}px`,
      width: `${Math.max(rect.width, 288)}px`,
    }
  }
}

const toggleOpen = async () => {
  if (!open.value && props.modelValue) {
    const d = new Date(props.modelValue + 'T00:00:00')
    viewYear.value = d.getFullYear()
    viewMonth.value = d.getMonth()
  }
  open.value = !open.value
  if (open.value) {
    await nextTick()
    updateDropdownPosition()
  }
}

const pickerRef2 = ref(null) // dropdown ref for outside click
const onClickOutside = (e) => {
  const trigger = pickerRef.value
  const dropdown = pickerRef2.value
  if (trigger && !trigger.contains(e.target) && dropdown && !dropdown.contains(e.target)) {
    open.value = false
  }
}
watch(open, (val) => {
  if (val) document.addEventListener('mousedown', onClickOutside)
  else document.removeEventListener('mousedown', onClickOutside)
})
</script>

<template>
  <div ref="pickerRef" class="relative">
    <!-- Trigger -->
    <button
      type="button"
      @click="toggleOpen"
      class="w-full flex items-center gap-2.5 bg-slate-700/50 text-sm pl-3 pr-4 py-2.5 rounded-xl border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all text-left"
      :class="modelValue ? 'text-white' : 'text-slate-500'"
    >
      <svg
        class="w-4 h-4 text-slate-500 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <span class="flex-1">{{ displayValue || placeholder }}</span>
      <svg
        v-if="modelValue"
        @click.stop="clear"
        class="w-3.5 h-3.5 text-slate-500 hover:text-white transition-colors cursor-pointer"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
      <svg
        v-else
        class="w-3.5 h-3.5 text-slate-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown via Teleport to avoid overflow/z-index issues -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="open"
          ref="pickerRef2"
          :style="dropdownStyle"
          class="fixed z-[9999] bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/60 p-4"
        >
          <!-- Month nav -->
          <div class="flex items-center justify-between mb-4">
            <button
              @click="prevMonth"
              class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span class="text-white text-sm font-semibold"
              >{{ monthNames[viewMonth] }} {{ viewYear }}</span
            >
            <button
              @click="nextMonth"
              class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <!-- Day headers -->
          <div class="grid grid-cols-7 mb-2">
            <div
              v-for="day in dayNames"
              :key="day"
              class="text-center text-xs font-medium text-slate-500 py-1"
            >
              {{ day }}
            </div>
          </div>

          <!-- Day cells -->
          <div class="grid grid-cols-7 gap-y-1">
            <button
              v-for="(cell, i) in calendarDays"
              :key="i"
              type="button"
              :disabled="!cell.currentMonth || isDisabled(cell.date)"
              @click="selectDate(cell.date)"
              class="relative h-8 w-full flex items-center justify-center rounded-lg text-xs font-medium transition-all"
              :class="[
                !cell.currentMonth
                  ? 'text-slate-700 cursor-default'
                  : isDisabled(cell.date)
                    ? 'text-slate-600 cursor-not-allowed'
                    : isSelected(cell.date)
                      ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                      : isToday(cell.date)
                        ? 'text-violet-400 ring-1 ring-violet-500/50 hover:bg-violet-500/20'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white',
              ]"
            >
              {{ cell.day }}
            </button>
          </div>

          <!-- Footer -->
          <div class="mt-3 pt-3 border-t border-slate-700/50 flex justify-between items-center">
            <button
              @click="clear"
              class="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Hapus
            </button>
            <button
              @click="
                selectDate(
                  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
                )
              "
              class="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              Hari ini
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
