import React from 'react';

const NexusLogo = ({ className = "w-32 h-32", showText = true }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Logo Sembolü */}
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]"
      >
        {/* Dış Kalkan / Hexagon (Güven ve QA Temsili) */}
        <path
          d="M100 10L180 55V145L100 190L20 145V55L100 10Z"
          stroke="url(#paint0_linear)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-pulse"
        />
        
        {/* İç Ağ Yapısı (Yapay Zeka / Neural Network) */}
        <path
          d="M100 40V80"
          stroke="#60A5FA"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M100 80L135 100"
          stroke="#60A5FA"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M100 80L65 100"
          stroke="#60A5FA"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M65 100V140"
          stroke="#60A5FA"
          strokeWidth="3"
          strokeOpacity="0.6"
          strokeLinecap="round"
        />
        <path
          d="M135 100V140"
          stroke="#60A5FA"
          strokeWidth="3"
          strokeOpacity="0.6"
          strokeLinecap="round"
        />
        <path
          d="M65 140L100 160L135 140"
          stroke="#60A5FA"
          strokeWidth="3"
          strokeOpacity="0.6"
          strokeLinecap="round"
        />

        {/* Nöron Noktaları (Bağlantı Noktaları) */}
        <circle cx="100" cy="80" r="6" fill="#3B82F6" className="animate-ping" style={{animationDuration: '3s'}} />
        <circle cx="100" cy="80" r="4" fill="white" />
        
        <circle cx="65" cy="100" r="4" fill="#3B82F6" />
        <circle cx="135" cy="100" r="4" fill="#3B82F6" />
        <circle cx="100" cy="160" r="4" fill="#3B82F6" />

        {/* Merkez Çekirdek */}
        <circle cx="100" cy="120" r="15" stroke="#818CF8" strokeWidth="2" fill="url(#paint1_radial)" />

        {/* Renk Geçişleri (Gradients) */}
        <defs>
          <linearGradient id="paint0_linear" x1="100" y1="10" x2="100" y2="190" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3B82F6" />
            <stop offset="1" stopColor="#818CF8" stopOpacity="0.5" />
          </linearGradient>
          <radialGradient id="paint1_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(100 120) rotate(90) scale(15)">
            <stop stopColor="#3B82F6" stopOpacity="0.8"/>
            <stop offset="1" stopColor="#1E3A8A" stopOpacity="0"/>
          </radialGradient>
        </defs>
      </svg>

      {/* Marka İsmi (Opsiyonel) */}
      {showText && (
        <div className="mt-2 text-center">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 tracking-wider font-sans">
            NEXUS<span className="font-light text-white">QA</span>
          </h1>
          <p className="text-[0.6rem] text-slate-500 tracking-[0.2em] uppercase">AI Powered Automation</p>
        </div>
      )}
    </div>
  );
};

export default NexusLogo;