import React, { useState } from 'react';
import { X, RotateCcw, Bot, Trophy, Sparkles } from 'lucide-react';
import { sound } from '../audio';
import { Language } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

type Cell = '🚀' | '👽' | null;

export const CosmicMiniGameModal: React.FC<Props> = ({ isOpen, onClose, lang }) => {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [isRocketTurn, setIsRocketTurn] = useState(true);
  const [winner, setWinner] = useState<Cell | 'TIE' | null>(null);
  const [scores, setScores] = useState({ rocket: 0, alien: 0 });

  if (!isOpen) return null;

  const checkWinner = (currentBoard: Cell[]): Cell | 'TIE' | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (const [a, b, c] of lines) {
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return currentBoard[a];
      }
    }
    if (currentBoard.every(cell => cell !== null)) return 'TIE';
    return null;
  };

  const handleCellClick = (index: number) => {
    if (board[index] || winner) return;

    sound.playClick();
    sound.triggerHaptic('light');

    const nextBoard = [...board];
    const playerSymbol: Cell = '🚀';
    nextBoard[index] = playerSymbol;

    const res = checkWinner(nextBoard);
    if (res) {
      setBoard(nextBoard);
      setWinner(res);
      if (res === '🚀') {
        sound.playCheerApplause();
        setScores(prev => ({ ...prev, rocket: prev.rocket + 1 }));
      }
      return;
    }

    // Bot's Turn (Alien 👽)
    setBoard(nextBoard);
    setIsRocketTurn(false);

    setTimeout(() => {
      const emptyIndices = nextBoard
        .map((val, idx) => (val === null ? idx : null))
        .filter((val): val is number => val !== null);

      if (emptyIndices.length > 0) {
        // Simple smart bot: pick winning move or random
        const botIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        const botBoard = [...nextBoard];
        botBoard[botIndex] = '👽';
        sound.playTone(320, 'sine', 0.08);

        const botRes = checkWinner(botBoard);
        setBoard(botBoard);
        setIsRocketTurn(true);

        if (botRes) {
          setWinner(botRes);
          if (botRes === '👽') {
            sound.playTone(200, 'sawtooth', 0.2);
            setScores(prev => ({ ...prev, alien: prev.alien + 1 }));
          }
        }
      }
    }, 400);
  };

  const resetGame = () => {
    sound.playClick();
    setBoard(Array(9).fill(null));
    setIsRocketTurn(true);
    setWinner(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-sky-500/40 p-6 shadow-2xl shadow-sky-500/20 text-center space-y-4">
        {/* Close Button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-4 end-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center gap-2 text-sky-400">
          <Sparkles className="w-5 h-5 animate-pulse" />
          <h3 className="text-lg font-black font-heading text-slate-100">
            {lang === 'ar' ? 'إكس-أو الفضائية (أثناء الانتظار)' : 'Cosmic Tic-Tac-Toe'}
          </h3>
        </div>

        {/* Score Board */}
        <div className="flex items-center justify-center gap-6 py-2 px-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold">
          <div className="flex items-center gap-1.5 text-sky-300">
            <span className="text-base">🚀</span>
            <span>{lang === 'ar' ? 'أنت' : 'You'}: {scores.rocket}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-purple-300">
            <span className="text-base">👽</span>
            <span>{lang === 'ar' ? 'بوت الفضاء' : 'Alien Bot'}: {scores.alien}</span>
          </div>
        </div>

        {/* Status / Turn text */}
        <div className="text-xs font-bold">
          {winner ? (
            winner === 'TIE' ? (
              <span className="text-amber-400">{lang === 'ar' ? 'تعادل بين الطرفين! 🤝' : 'Match Tied! 🤝'}</span>
            ) : winner === '🚀' ? (
              <span className="text-emerald-400 flex items-center justify-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'فزت بالمباراة! 🚀🎉' : 'You Won! 🚀🎉'}
              </span>
            ) : (
              <span className="text-rose-400">{lang === 'ar' ? 'فاز بوت الفضاء! 👽' : 'Alien Bot Won! 👽'}</span>
            )
          ) : (
            <span className="text-slate-400">
              {isRocketTurn
                ? lang === 'ar'
                  ? 'دورك: اختر مربعاً 🚀'
                  : 'Your turn: Pick a square 🚀'
                : lang === 'ar'
                ? 'تفكير بوت الفضاء 👽...'
                : 'Alien bot thinking 👽...'}
            </span>
          )}
        </div>

        {/* 3x3 Grid */}
        <div className="grid grid-cols-3 gap-2 w-60 h-60 mx-auto">
          {board.map((cell, idx) => (
            <button
              key={idx}
              onClick={() => handleCellClick(idx)}
              className={`rounded-2xl border flex items-center justify-center text-3xl font-black transition-all cursor-pointer ${
                cell
                  ? 'bg-slate-950/90 border-sky-400/50 shadow-inner'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-sky-500/40 active:scale-95'
              }`}
            >
              {cell}
            </button>
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={resetGame}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'جولة جديدة 🔄' : 'Play Again 🔄'}</span>
        </button>
      </div>
    </div>
  );
};
