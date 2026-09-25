import { supabase } from '../supabaseClient';

// Obtener los pilotos de la misma liga o escuadrón
export async function fetchSquadronPilots() {
  const { data, error } = await supabase
    .from('pilots')
    .select('*')
    .order('isf_score', { ascending: false });
  
  if (error) {
    console.error('Error cargando escuadrón:', error);
    return [];
  }
  return data;
}

// Actualizar las métricas de vuelo del usuario en la base de datos
export async function updateMyFlightMetrics(userId, newIsfScore) {
  const { error } = await supabase
    .from('pilots')
    .update({ isf_score: newIsfScore, updated_at: new Date() })
    .eq('id', userId);

  if (error) {
    console.error('Error actualizando métricas de vuelo:', error);
  }
}

// Suscribirse a cambios en tiempo real del escuadrón (Estilo Mario Kart)
export function subscribeToSquadronChanges(onPilotsUpdated) {
  return supabase
    .channel('public:pilots')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pilots' }, payload => {
      onPilotsUpdated(payload);
    })
    .subscribe();
}

// Retar a un usuario a un duelo 1 vs 1 (Prioridad 3)
export async function createPvPDuel(challengerId, opponentId, initialScore) {
  const { data, error } = await supabase
    .from('pvp_duels')
    .insert([
      { challenger_id: challengerId, opponent_id: opponentId, challenger_score: initialScore, status: 'active' }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creando duelo:', error);
  }
  return data;
}