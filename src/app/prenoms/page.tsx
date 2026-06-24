'use client';

import { useState } from 'react';

type Gender = 'garcon' | 'fille';

const PRENOMS: Record<Gender, string[]> = {
  garcon: [
    'Gabriel', 'Léo', 'Raphaël', 'Louis', 'Arthur',
    'Lucas', 'Hugo', 'Noah', 'Liam', 'Adam',
    'Ethan', 'Nathan', 'Mathis', 'Tom', 'Axel',
    'Théo', 'Maxime', 'Antoine', 'Jules', 'Sacha',
    'Paul', 'Romain', 'Victor', 'Noa', 'Clément',
    'Malo', 'Luca', 'Enzo', 'Elias', 'Simon',
  ],
  fille: [
    'Emma', 'Jade', 'Louise', 'Alice', 'Chloé',
    'Léa', 'Inès', 'Lina', 'Camille', 'Zoé',
    'Mia', 'Manon', 'Lucie', 'Eva', 'Ambre',
    'Agathe', 'Clara', 'Juliette', 'Sarah', 'Lola',
    'Nora', 'Anaïs', 'Mathilde', 'Elena', 'Luna',
    'Sofia', 'Elisa', 'Margot', 'Rose', 'Lily',
  ],
};

const COLORS: Record<Gender, { bg: string; text: string; badge: string; border: string; button: string }> = {
  garcon: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    border: 'border-blue-200',
    button: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
  fille: {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    badge: 'bg-pink-100 text-pink-800 hover:bg-pink-200',
    border: 'border-pink-200',
    button: 'bg-pink-500 hover:bg-pink-600 text-white',
  },
};

export default function PrenomsPage() {
  const [gender, setGender] = useState<Gender | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const reset = () => {
    setGender(null);
    setSelected([]);
  };

  if (!gender) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-10 p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">👶</span>
          <h1 className="text-3xl font-bold">Choisir un prénom</h1>
          <p className="text-gray-500 text-sm">Prénoms les plus donnés en France en 2026</p>
        </div>

        <div className="flex gap-6">
          <button
            onClick={() => setGender('garcon')}
            className="flex flex-col items-center gap-3 px-10 py-8 rounded-2xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <span className="text-5xl">👦</span>
            <span className="text-xl font-semibold text-blue-700">Garçon</span>
          </button>

          <button
            onClick={() => setGender('fille')}
            className="flex flex-col items-center gap-3 px-10 py-8 rounded-2xl border-2 border-pink-200 bg-pink-50 hover:bg-pink-100 transition-colors cursor-pointer"
          >
            <span className="text-5xl">👧</span>
            <span className="text-xl font-semibold text-pink-700">Fille</span>
          </button>
        </div>
      </main>
    );
  }

  const colors = COLORS[gender];
  const names = PRENOMS[gender];
  const label = gender === 'garcon' ? 'Garçon' : 'Fille';

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 p-8 pt-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-4xl">{gender === 'garcon' ? '👦' : '👧'}</span>
        <h1 className="text-2xl font-bold">Prénoms {label.toLowerCase()}s populaires</h1>
        <p className="text-gray-500 text-sm">Cliquez sur un prénom pour le sélectionner</p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center max-w-2xl">
        {names.map((name) => {
          const isSelected = selected.includes(name);
          return (
            <button
              key={name}
              onClick={() => toggle(name)}
              className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all cursor-pointer ${
                isSelected
                  ? `${colors.button} border-transparent scale-105 shadow-md`
                  : `${colors.badge} ${colors.border}`
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className={`w-full max-w-2xl rounded-2xl border-2 ${colors.border} ${colors.bg} p-6 flex flex-col gap-3`}>
          <p className={`text-sm font-semibold ${colors.text}`}>
            {selected.length} prénom{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {selected.map((name) => (
              <span
                key={name}
                className={`px-3 py-1 rounded-full text-sm font-semibold ${colors.button}`}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={reset}
        className="text-sm text-gray-400 hover:text-gray-600 underline transition-colors cursor-pointer"
      >
        ← Changer de genre
      </button>
    </main>
  );
}
