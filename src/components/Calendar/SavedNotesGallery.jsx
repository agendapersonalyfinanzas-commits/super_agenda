import React from 'react';
import { aMayusculas } from '../../utils/mayusculas.js';

export default function SavedNotesGallery({ savedNotes, handleDeleteNote, isAuditor, auditedUserName }) {
  if (savedNotes.filter(n => n.image || n.text).length === 0) return null;

  return (
    <div className="w-full space-y-4 pt-4">
      <div className="border-b-4 border-black pb-2 flex justify-between items-center flex-wrap gap-2">
        <h3 className="font-black text-lg uppercase text-black">✍️ NOTAS Y DIBUJOS S-PEN</h3>
        {isAuditor && auditedUserName && (
          <span className="bg-red-500 text-white border-2 border-black px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            🔍 Notas de: {auditedUserName}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {savedNotes.filter(note => note.image || note.text).map(note => (
          <div 
            key={note.id} 
            className="border-4 border-black bg-white p-4 rounded-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between relative"
          >
            {note.image ? (
              <div className="w-full bg-stone-50 border-2 border-black rounded-2xl overflow-hidden p-1">
                <img src={note.image} alt="Nota S-Pen" className="w-full h-auto object-contain bg-white rounded-xl" />
              </div>
            ) : (
              <div className="w-full bg-amber-50 border-2 border-black rounded-2xl p-4 min-h-30 flex items-center justify-center text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-black leading-relaxed">
                  "{note.text}"
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-dashed border-stone-200">
              <span className="text-[10px] font-black uppercase text-stone-600 bg-stone-100 border border-black px-2 py-0.5 rounded-md">
                {note.date}
              </span>
              <button 
                type="button"
                onClick={() => handleDeleteNote(note.id)} 
                className="text-xs font-black text-rose-600 uppercase hover:underline cursor-pointer"
              >
                {aMayusculas('Eliminar')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}