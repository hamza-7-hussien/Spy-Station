import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, QrCode } from 'lucide-react';
import { sound } from '../audio';
import { Language } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  lang: Language;
}

export const QRCodeModal: React.FC<Props> = ({ isOpen, onClose, roomCode, lang }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !roomCode) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#030712',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(() => {});
  }, [isOpen, roomCode]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    sound.playClick();
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
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
          <QrCode className="w-6 h-6 animate-pulse" />
          <h3 className="text-lg font-black font-heading text-slate-100">
            {lang === 'ar' ? 'رمز الانضمام السريع' : 'Instant Room QR Code'}
          </h3>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {lang === 'ar'
            ? 'وجّه كاميرا هاتفك إلى الكود للانضمام إلى المحطة فوراً دون كتابة أي أرقام!'
            : 'Scan this code with any phone camera to instantly jump into the station!'}
        </p>

        {/* QR Code Container with futuristic frame */}
        <div className="p-3 bg-white rounded-2xl mx-auto inline-block shadow-inner border-2 border-sky-400/50">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Room QR Code" className="w-56 h-56 rounded-xl mx-auto" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs animate-pulse">
              Generating QR...
            </div>
          )}
        </div>

        {/* Room code display */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-xs text-slate-400">{lang === 'ar' ? 'تردد المحطة:' : 'Room Code:'}</span>
          <span className="font-mono text-base font-black tracking-widest text-sky-300">{roomCode}</span>
        </div>

        {/* Copy share link button */}
        <button
          onClick={handleCopyLink}
          className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-black text-sm tracking-wide transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-500/25"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? (lang === 'ar' ? 'تم نسخ الرابط!' : 'Link Copied!') : (lang === 'ar' ? 'نسخ رابط الدخول' : 'Copy Direct Link')}</span>
        </button>
      </div>
    </div>
  );
};
