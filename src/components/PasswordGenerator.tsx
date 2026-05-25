import React, { useState, useEffect } from 'react';
import { Copy, Check, RefreshCw, Key } from 'lucide-react';

interface PasswordGeneratorProps {
  onApplyPassword?: (password: string) => void;
  className?: string;
}

export default function PasswordGenerator({
  onApplyPassword,
  className
}: PasswordGeneratorProps) {
  const [length, setLength] = useState(16);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [generatedPass, setGeneratedPass] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = () => {
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let allowed = '';
    if (uppercase) allowed += uppercaseChars;
    if (lowercase) allowed += lowercaseChars;
    if (numbers) allowed += numberChars;
    if (symbols) allowed += symbolChars;

    if (!allowed) {
      setGeneratedPass('');
      return;
    }

    let res = '';
    for (let i = 0; i < length; i++) {
      res += allowed.charAt(Math.floor(Math.random() * allowed.length));
    }
    setGeneratedPass(res);
    setCopied(false);
  };

  useEffect(() => {
    generate();
  }, [length, uppercase, lowercase, numbers, symbols]);

  const handleCopy = () => {
    if (!generatedPass) return;
    navigator.clipboard.writeText(generatedPass);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3.5 font-sans ${className || ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider flex items-center gap-1.5">
          <Key size={12} className="text-amber-600" /> Pembuat Sandi Acak
        </span>
        <button
          type="button"
          onClick={generate}
          className="p-1 text-stone-500 hover:text-stone-800 hover:bg-stone-200/50 rounded-lg transition-all"
          title="Acak Ulang"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 bg-white border border-stone-250 p-2.5 rounded-xl">
        <input
          type="text"
          readOnly
          value={generatedPass}
          className="flex-1 text-[11px] font-mono font-bold text-stone-850 outline-none select-all bg-transparent"
          placeholder="Sandi terbuat di sini"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="p-1 px-2 text-[9px] font-black bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-all flex items-center gap-1"
        >
          {copied ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
          {copied ? "Selesai" : "Salin"}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[9.5px] font-bold text-stone-500">Panjang Sandi: <span className="font-black text-amber-700 font-mono">{length}</span></span>
          <input
            type="range"
            min={8}
            max={32}
            value={length}
            onChange={(e) => setLength(parseInt(e.target.value))}
            className="w-1/2 accent-amber-600 h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-[9.5px] font-bold text-stone-600">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-stone-850">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={(e) => setUppercase(e.target.checked)}
              className="w-3 h-3 rounded text-amber-600 focus:ring-amber-500/10 cursor-pointer accent-amber-600 border-stone-300"
            />
            A-Z (Kapital)
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-stone-850">
            <input
              type="checkbox"
              checked={lowercase}
              onChange={(e) => setLowercase(e.target.checked)}
              className="w-3 h-3 rounded text-amber-600 focus:ring-amber-500/10 cursor-pointer accent-amber-600 border-stone-300"
            />
            a-z (Kecil)
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-stone-850">
            <input
              type="checkbox"
              checked={numbers}
              onChange={(e) => setNumbers(e.target.checked)}
              className="w-3 h-3 rounded text-amber-600 focus:ring-amber-500/10 cursor-pointer accent-amber-600 border-stone-300"
            />
            0-9 (Angka)
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-stone-850">
            <input
              type="checkbox"
              checked={symbols}
              onChange={(e) => setSymbols(e.target.checked)}
              className="w-3 h-3 rounded text-amber-600 focus:ring-amber-500/10 cursor-pointer accent-amber-600 border-stone-300"
            />
            !@#$ (Simbol)
          </label>
        </div>
      </div>

      {onApplyPassword && (
        <button
          type="button"
          onClick={() => onApplyPassword(generatedPass)}
          className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-97 text-center"
        >
          Pakai Sandi Ini
        </button>
      )}
    </div>
  );
}
