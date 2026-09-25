import React, { useState } from 'react';
import QuickExpenseButton from './QuickExpenseButton';
import AddCustomButtonModal from '../Expenses/AddCustomButtonModal';

export default function QuickActionSection({
  title,
  subtitle,
  bgColor = 'bg-rose-100',
  textColor = 'text-red-700',
  actions = [],
  onActionClick,
  onAddClick,
  onDeleteAction,
  onUpdateAction,
  type = 'expense'
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState(null);

  // Estados para el modal de configuración/creación
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState('VARIOS');
  const [selectedIcon, setSelectedIcon] = useState('');

  // Abrir modal para crear un botón nuevo
  const handleOpenAdd = () => {
    setEditingAction(null);
    setName('');
    setAmount('');
    setCat('VARIOS');
    setSelectedIcon('');
    setIsModalOpen(true);
    if (typeof onAddClick === 'function' && !isEditing) {
      // Si el padre maneja la apertura directa por prop
      // onAddClick(type);
    }
  };

  // Abrir modal para editar un botón existente (con cámara/archivos)
  const handleOpenEdit = (action) => {
    setEditingAction(action);
    setName(action.name || action.label || action.concept || '');
    setAmount(action.amount || '');
    setCat(action.category || 'VARIOS');
    setSelectedIcon(action.icon || action.image || '');
    setIsModalOpen(true);
  };

  const handleSubmitModal = (e) => {
    e.preventDefault();
    const actionData = {
      id: editingAction?.id || Date.now().toString(),
      name: name.toUpperCase(),
      label: name.toUpperCase(),
      concept: name.toUpperCase(),
      amount: Number(amount) || 0,
      category: cat.toUpperCase(),
      icon: selectedIcon,
      image: selectedIcon,
      type
    };

    if (editingAction && typeof onUpdateAction === 'function') {
      onUpdateAction(actionData);
    } else if (typeof onAddClick === 'function') {
      onAddClick(actionData, type);
    }
    setIsModalOpen(false);
  };

  return (
    <div className={`p-5 rounded-3xl border-4 border-black ${bgColor} mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-mono`}>
      {/* Encabezado del recuadro con el botón de edición contextual */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2 border-b-2 border-black/20 pb-2">
        <div>
          <h3 className={`font-black text-lg uppercase ${textColor} flex items-center gap-2 tracking-wide`}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px] font-black text-stone-600 uppercase tracking-tight">
              {subtitle}
            </p>
          )}
        </div>

        {/* Botón de Editar Botones en la esquina superior derecha */}
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className={`px-3 py-1.5 text-xs font-black rounded-xl border-2 border-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-105 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${
            isEditing
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-amber-400 text-black hover:bg-amber-300'
          }`}
        >
          {isEditing ? '✓ LISTO' : '🛠️ EDITAR BOTONES'}
        </button>
      </div>

      {/* Rejilla de Botones Rápidos + Botón + AÑADIR */}
      <div className="flex flex-wrap gap-5 items-center justify-start pt-1">
        {actions.map((action) => (
          <QuickExpenseButton
            key={action.id || action.name || action.concept}
            btnId={action.id}
            icon={action.icon || action.image}
            label={action.label || action.name || action.concept}
            defaultAmount={action.amount}
            category={action.category}
            isExpense={type === 'expense'}
            isEditMode={isEditing}
            onSave={(data) => {
              // Validación segura para evitar que truene si onActionClick no llega
              if (typeof onActionClick === 'function') {
                onActionClick(data, type);
              } else {
                console.error("onActionClick no está definido en el componente padre");
              }
            }}
            onDelete={(id) => {
              if (typeof onDeleteAction === 'function') {
                onDeleteAction(id, type);
              }
            }}
            onEdit={() => handleOpenEdit(action)}
          />
        ))}

        {/* Botón de + AÑADIR con estilo 3D coincidente */}
        <div className="flex flex-col items-center gap-1.5 select-none">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="w-28 h-28 rounded-full border-4 border-black bg-white flex flex-col items-center justify-center font-black text-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 active:translate-x-1.5 active:translate-y-1.5 active:shadow-none transition-all cursor-pointer"
            title="Añadir nuevo botón"
          >
            <span>+</span>
          </button>
          <span className="block text-[10px] font-black uppercase bg-white border-2 border-black px-2 py-0.5 rounded-lg text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            AÑADIR
          </span>
        </div>
      </div>

      {/* Modal integrado para cambiar imágenes con cámara, archivos o personajes */}
      {isModalOpen && (
        <AddCustomButtonModal
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmitModal}
          name={name}
          setName={setName}
          amount={amount}
          setAmount={setAmount}
          cat={cat}
          setCat={setCat}
          presetIcons={[
            '/charlie-market.png',
            '/snoopy-gas.png',
            '/woodstock.png',
            '/lucy-finance.png'
          ]}
          onSelectIcon={(iconUrl) => setSelectedIcon(iconUrl)}
        />
      )}
    </div>
  );
}