import { ref } from 'vue';

const isDark = ref(false);

export function useTheme() {
  const apply = () => {
    document.documentElement.classList.toggle('dark', isDark.value);
  };

  const toggle = () => {
    isDark.value = !isDark.value;
    apply();
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
  };

  const init = () => {
    isDark.value = localStorage.getItem('theme') === 'dark';
    apply();
  };

  return { isDark, toggle, init };
}
