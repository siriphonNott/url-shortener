import { ref } from 'vue';

const toasts = ref([]);
let nextId = 0;

export function useToast() {
  const add = (message, type = 'success', duration = 3500) => {
    const id = ++nextId;
    toasts.value.push({ id, message, type });
    setTimeout(() => remove(id), duration);
  };

  const remove = (id) => {
    const idx = toasts.value.findIndex((t) => t.id === id);
    if (idx !== -1) toasts.value.splice(idx, 1);
  };

  return {
    toasts,
    success: (msg) => add(msg, 'success'),
    error: (msg) => add(msg, 'error'),
    info: (msg) => add(msg, 'info'),
    remove,
  };
}
