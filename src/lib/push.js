import { base44 } from '@/api/base44Client';

const SW_URL = '/push-sw.js';

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

function urlB64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export const registerSW = () => navigator.serviceWorker.register(SW_URL, { scope: '/' });

export async function getCurrentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration('/');
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function fetchPublicKey() {
  const res = await base44.functions.invoke('getPushPublicKey', {});
  return res.data.publicKey;
}

export const saveSubscription = (sub) =>
  base44.functions.invoke('savePushSubscription', { subscription: sub.toJSON(), user_agent: navigator.userAgent });

// Must be called directly from a click. publicKey must be preloaded.
export async function enablePush(publicKey) {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('ההרשאה לא אושרה');
  const reg = await registerSW();
  await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(publicKey) });
  await saveSubscription(sub);
  return sub;
}

export async function disablePush() {
  const sub = await getCurrentSubscription();
  if (!sub) return;
  await base44.functions.invoke('deletePushSubscription', { endpoint: sub.endpoint });
  await sub.unsubscribe();
}

// On load (staff screens only): re-register SW and re-sync an existing subscription.
export async function syncPush() {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  await registerSW();
  const sub = await getCurrentSubscription();
  if (sub) await saveSubscription(sub);
}