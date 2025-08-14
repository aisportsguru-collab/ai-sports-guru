import * as Notifications from 'expo-notifications';

let handlerSet = false;

function ensureHandler() {
  if (!handlerSet) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    handlerSet = true;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  ensureHandler();
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
  const req = await Notifications.requestPermissionsAsync();
  return !!(req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL);
}

export async function scheduleGameStartNotification(opts: {
  id: string;
  title: string;
  body?: string;
  fireDate: Date;
}): Promise<string | null> {
  ensureHandler();
  const ok = await requestNotificationPermission();
  if (!ok) return null;
  if (opts.fireDate.getTime() <= Date.now()) return null;
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: opts.title,
      body: opts.body ?? 'Game starting soon',
      sound: null,
    },
    trigger: opts.fireDate,
  });
  return identifier;
}

export async function cancelScheduledNotification(identifier: string) {
  try { await Notifications.cancelScheduledNotificationAsync(identifier); } catch {}
}
