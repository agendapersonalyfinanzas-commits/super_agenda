import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { aMayusculas } from '../utils/mayusculas.js';
import { guardarEnStorage, obtenerDeStorage, KEYS } from '../utils/storage.js';

const isValidUUID = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function usePlayerManagement() {
  const [activeUser, setActiveUser] = useState(() => obtenerDeStorage(KEYS.ACTIVE_USER, 'LUIS RICARDO'));
  const [isEditMode, setIsEditMode] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showAddPlayerRow, setShowAddPlayerRow] = useState(false);

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const userId = session.user.id;
      let realName = 'LUIS RICARDO';

      // Fuente de verdad absoluta: consultar la tabla 'profiles' con el UUID autenticado
      if (isValidUUID(userId)) {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('nombre, apellido_paterno, apellido_materno')
          .eq('id', userId)
          .maybeSingle();

        if (!error && profileData && profileData.nombre) {
          const nameParts = [
            profileData.nombre,
            profileData.apellido_paterno,
            profileData.apellido_materno
          ].filter(Boolean);
          realName = aMayusculas(nameParts.join(' ').trim());
        }
      }

      setActiveUser(realName);
      guardarEnStorage(KEYS.ACTIVE_USER, realName);
    } catch (err) {
      console.error('Error al sincronizar el perfil de usuario:', err);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Funciones adaptadas para mantener la compatibilidad con componentes existentes sin crear perfiles falsos
  const handleAddNewPlayer = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setNewPlayerName('');
    setShowAddPlayerRow(false);
  };

  const handleDeletePlayer = () => {
    // Las cuentas son únicas y personales; no se eliminan perfiles internos
  };

  return {
    activeUser,
    setActiveUser,
    availableUsersList: [activeUser], // Única fuente de verdad: la identidad real del usuario
    newPlayerName,
    setNewPlayerName,
    showAddPlayerRow,
    setShowAddPlayerRow,
    isEditMode,
    setIsEditMode,
    handleAddNewPlayer,
    handleDeletePlayer,
    fetchUsersFromDatabase: fetchUserProfile
  };
}

export default usePlayerManagement;