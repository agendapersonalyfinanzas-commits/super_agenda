import React from 'react';
import BaronRojoGame from './components/Games/BaronRojoGame';

export default function StandaloneGame() {
  return (
    <div className="min-h-screen bg-[#Fef8e7] flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-md">
        <BaronRojoGame onBack={() => alert('Regresando al hangar principal')} />
      </div>
    </div>
  );
}