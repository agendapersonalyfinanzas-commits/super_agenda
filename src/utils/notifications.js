// Solicitar permisos de notificación al usuario
export async function solicitarPermisoNotificaciones() {
  if (!('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones.');
    return false;
  }

  const permiso = await Notification.requestPermission();
  return permiso === 'granted';
}

// Programar una alarma de evento
export function programarAlarmaEvento(evento) {
  if (Notification.permission !== 'granted') return;

  // evento.fecha -> "YYYY-MM-DD" o "DD/MM/YYYY"
  // evento.hora  -> "HH:MM" (formato 24h)
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

  // Solo si la fecha/hora es futura
  if (tiempoRestanteMs > 0) {
    setTimeout(() => {
      lanzarNotificacion(evento);
    }, tiempoRestanteMs);
  }
}

// Disparar la notificación a través del Service Worker
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