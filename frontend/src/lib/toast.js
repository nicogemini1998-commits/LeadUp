import { sileo } from 'sileo'

export const toast = {
  success: (title, description) => sileo.success({ title, description }),
  error: (title, description) => sileo.error({ title, description }),
  warning: (title, description) => sileo.warning({ title, description }),
  info: (title, description) => sileo.info({ title, description }),
  loading: (title, description) => sileo.show({ title, description, type: 'loading', duration: null }),
  promise: (p, opts) => sileo.promise(p, opts),
  dismiss: (id) => sileo.dismiss(id),
}
