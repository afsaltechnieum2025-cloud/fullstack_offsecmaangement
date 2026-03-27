export const NOTIFY_EVENT = 'technieum:notify-refresh';

export function triggerNotifyRefresh() {
  window.dispatchEvent(new CustomEvent(NOTIFY_EVENT));
}