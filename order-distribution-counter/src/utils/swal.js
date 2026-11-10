import Swal from 'sweetalert2'

// Shared SweetAlert2 instance. All colours come from CSS variables
// (see the `.equi-modal` block in index.css), so light/dark mode just works.
const themed = Swal.mixin({
  buttonsStyling: false,
  reverseButtons: true,
  customClass: {
    popup: 'equi-modal',
    title: 'equi-modal-title',
    htmlContainer: 'equi-modal-text',
    actions: 'equi-modal-actions',
    confirmButton: 'equi-btn equi-btn-primary',
    cancelButton: 'equi-btn equi-btn-secondary',
  },
})

export function showToast(message, isError = false) {
  themed.fire({
    toast: true,
    position: 'top-end',
    icon: isError ? 'error' : 'success',
    title: message,
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    reverseButtons: false,
    customClass: { popup: isError ? 'equi-toast equi-toast-error' : 'equi-toast' },
  })
}

export function showAlert({ title, text, icon = 'info', confirmButtonText = 'OK' }) {
  return themed.fire({ title, text, icon, confirmButtonText })
}

export function confirmDestructiveAction({ title, text, confirmButtonText }) {
  return themed
    .fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      focusCancel: true,
      confirmButtonText,
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'equi-modal',
        title: 'equi-modal-title',
        htmlContainer: 'equi-modal-text',
        actions: 'equi-modal-actions',
        confirmButton: 'equi-btn equi-btn-danger',
        cancelButton: 'equi-btn equi-btn-secondary',
      },
    })
    .then((result) => result.isConfirmed)
}
