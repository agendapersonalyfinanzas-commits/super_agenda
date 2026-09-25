import { supabase } from '../lib/supabase'; // Ajusta la ruta a tu cliente de Supabase

// Solicitar permisos y registrar la suscripción Push en Supabase
export async function solicitarPermisoNotificaciones() {
  if (!('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones.');
    alert('Tu navegador no soporta notificaciones.');
    return false;
  }

  // 1. Pedir permiso nativo al navegador
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') {
    alert('Debes permitir las notificaciones en tu navegador.');
    return false;
  }

  try {
    // 2. Verificar Service Worker y obtener la suscripción Web Push
    const registration = await navigator.serviceWorker.ready;
    
    // Tu VAPID Public Key de producción
    const publicVapidKey = 'BEk-QIr5Jv2ShPVLb1xxn8fdJ8128n39tgfJZEF8f99jFlt41IBFgQS1JoMiRCdmJKhRvKeyLWDbZXiOi_Esr9Y';
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicVapidKey
    });

    // 3. Obtener el usuario actual logueado en Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Debes iniciar sesión para activar las alertas automáticas.');
      return false;
    }

    const subJson = subscription.toJSON();

    // 4. Guardar en tu base de datos (tabla push_subscriptions) para el Cron de las 5:00 AM
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth
    }, { onConflict: 'endpoint' });

    if (error) throw error;

    alert('¡Notificaciones activadas y programadas con éxito!');
    return true;

  } catch (error) {
    console.error('Error al registrar las push notifications:', error);
    alert('Hubo un error al registrar las notificaciones en el sistema.');
    return false;
  }
}

// Conservas tu función de alarmas locales si deseas usarla con setTimeout mientras la app está abierta:
export function programarAlarmaEvento(evento) {
  if (Notification.permission !== 'granted') return;

  let year, month, day;
  if (evento.fecha.includes('/')) {
    const parts = evento.fecha.split('/');
    day = Number(parts[0]);
    month = Number(parts[1]) - 1;
    year = Number(parts[2]);
  } else {
    const parts = evento.fecha.split('-');
    year = Number(parts[0]);
    month = Number(parts[1]) - 1;
    day = Number(parts[2]);
  }

  const [hours, minutes] = evento.hora.split(':').map(Number);
  const fechaEvento = new Date(year, month, day, hours, minutes);
  const ahora = new Date();

  const tiempoRestanteMs = fechaEvento.getTime() - ahora.getTime();

  if (tiempoRestanteMs > 0) {
    setTimeout(() => {
      lanzarNotificacion(evento);
    }, tiempoRestanteMs);
  }
}

function lanzarNotificacion(evento) {
  const titulo = `⏰ ${evento.titulo || 'RECORDATORIO'}`;
  const opciones = {
    body: `Evento programado a las ${evento.hora}`,
    icon: '/super-snoopy.png',
    badge: '/super-snoopy.png',
    vibrate: [300, 100, 300, 100, 300],
    tag: evento.id || String(Date.now()),
    renotify: true,
  };

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(titulo, opciones);
    });
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(titulo, opciones);
  }
}