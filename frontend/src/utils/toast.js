export const toastEventName = 'rentsaas-toast';

export const showToast = (message = 'Settings saved successfully', type = 'success') => {
  window.dispatchEvent(new CustomEvent(toastEventName, { detail: { message, type } }));
};
