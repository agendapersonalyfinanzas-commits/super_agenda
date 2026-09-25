// src/utils/pushNotifications.js

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registrarNotificacionesPush(supabase) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Tu navegador no soporta notificaciones Push.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert('⚠️ Necesitas permitir las notificaciones para recibir alertas de tus pagos.');
      return;
    }

    const registration = await navigator.serviceWorker.ready;

    // Llave Pública VAPID configurada
    const publicVapidKey = 'BEk-QIr5Jv2ShPVLb1xxn8fdJ8128n39tgfJZEF8f99jFlt41IBFgQS1JoMiRCdmJKhRvKeyLWDbZXiOi_Esr9Y';

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      alert('Debes iniciar sesión para activar las alertas.');
      return;
    }

    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        subscription: subscription.toJSON()
      }, { onConflict: 'user_id' });

    if (dbError) throw dbError;

    alert('✨ ¡Alertas y recordatorios activados con éxito!');
  } catch (error) {
    console.error('Error al configurar las notificaciones Push:', error);
    alert('Hubo un error al activar las alertas. Revisa la consola.');
  }
}