import React, { useState } from 'react';
import { X, Wallet, Plus, Minus, Check } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface CashModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCash: number;
  onUpdateCash: (newCash: number) => void;
}

export const CashModal: React.FC<CashModalProps> = ({
  isOpen,
  onClose,
  currentCash,
  onUpdateCash,
}) => {
  const [action, setAction] = useState<'ADD' | 'WITHDRAW'>('ADD');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parsedAmount = parseFloat(amount.replace(',', '.')) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (parsedAmount <= 0) {
      setError('Lütfen geçerli bir tutar girin.');
      return;
    }

    if (action === 'WITHDRAW' && parsedAmount > currentCash) {
      setError('Mevcut nakit bakiyenizden daha fazla tutar çekemezsiniz.');
      return;
    }

    const newBalance = action === 'ADD' ? currentCash + parsedAmount : currentCash - parsedAmount;
    onUpdateCash(Math.max(0, newBalance));
    setAmount('');
    onClose();
  };

  const handleQuickAdd = (val: number) => {
    setAmount(String(val));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Nakit Bakiye Yönetimi</h3>
              <p className="text-xs text-slate-400">Portföy nakit varlığınızı güncelleyin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block mb-1">Mevcut Nakit Bakiye:</span>
            <span className="text-2xl font-mono font-bold text-white">
              {formatCurrency(currentCash)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setAction('ADD')}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${
                action === 'ADD'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Nakit Ekle (+)
            </button>
            <button
              type="button"
              onClick={() => setAction('WITHDRAW')}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${
                action === 'WITHDRAW'
                  ? 'bg-rose-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Nakit Çek (-)
            </button>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {action === 'ADD' ? 'Eklenecek Tutar (₺)' : 'Çekilecek Tutar (₺)'}
            </label>
            <input
              type="text"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[1000, 5000, 10000, 50000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickAdd(val)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 hover:text-white transition-colors"
              >
                +₺{val.toLocaleString('tr-TR')}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20"
          >
            {action === 'ADD' ? 'Bakiyeyi Artır' : 'Bakiyeden Çek'}
          </button>
        </form>
      </div>
    </div>
  );
};
