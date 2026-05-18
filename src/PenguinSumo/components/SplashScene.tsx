// All-star roster poster. Penguin (player), Sheep, Wolf, Sheepdog facing the
// camera on a circular dohyō. No 3D Canvas — pure SVG so the splash is cheap
// to mount during preload.

import { useState } from 'react';
import { t } from '../i18n';

interface Snowflake {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
}

export function SplashScene({ onStart, highScore }: { onStart: () => void; highScore: number }) {
  const [snow] = useState<Snowflake[]>(() =>
    Array.from({ length: 36 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: -Math.random() * 10,
      duration: 7 + Math.random() * 9,
      size: 2 + Math.random() * 6,
    }))
  );

  return (
    <div className="ps-splash">
      <div className="ps-splash__sky" />
      <div className="ps-splash__aurora" />

      {/* Drifting snow */}
      <div className="ps-splash__snow">
        {snow.map(f => (
          <div
            key={f.id}
            className="ps-splash__flake"
            style={{
              left: `${f.x}%`,
              width: `${f.size}px`,
              height: `${f.size}px`,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Ice plane */}
      <div className="ps-splash__ice" />

      {/* Roster row — all four wrestlers in their mawashi, lined up on the dohyō.
          Drawn from a top-three-quarter angle so the bellies + bellsts read well. */}
      <div className="ps-splash__icebergs ps-splash__icebergs--front">
        <svg viewBox="0 0 800 260" preserveAspectRatio="xMidYMax meet" width="100%" height="100%">
          <defs>
            <radialGradient id="ps-dohyo" cx="50%" cy="50%" r="50%">
              <stop offset="0%"  stopColor="#f4fbff" />
              <stop offset="80%" stopColor="#bfd9ea" />
              <stop offset="100%" stopColor="#7ea2b8" />
            </radialGradient>
          </defs>

          {/* Dohyō — large ellipse at the bottom, big red border ring */}
          <ellipse cx="400" cy="220" rx="380" ry="58" fill="#d8453e" />
          <ellipse cx="400" cy="220" rx="362" ry="50" fill="url(#ps-dohyo)" />
          {/* Hinomaru center sun mark */}
          <circle cx="400" cy="220" r="14" fill="#d8453e" opacity="0.7" />

          {/* === PENGUIN (player, red mawashi, gold crown) === */}
          <g transform="translate(140,170)">
            <ellipse cx="0" cy="40" rx="46" ry="6" fill="#1c3650" opacity=".55" />
            {/* body */}
            <ellipse cx="0" cy="-10" rx="40" ry="42" fill="#1d2330" />
            {/* belly */}
            <ellipse cx="0" cy="6" rx="28" ry="34" fill="#f4ecd8" />
            {/* mawashi */}
            <rect x="-42" y="14" width="84" height="14" fill="#d8453e" />
            <rect x="-12" y="28" width="24" height="14" fill="#d8453e" />
            {/* face */}
            <ellipse cx="-10" cy="-25" r="4" fill="#0a0a0a" />
            <ellipse cx="10"  cy="-25" r="4" fill="#0a0a0a" />
            <circle cx="-9"  cy="-26" r="1.2" fill="#fff" />
            <circle cx="11"  cy="-26" r="1.2" fill="#fff" />
            <polygon points="-4,-15 4,-15 0,-7" fill="#f7b04a" />
            {/* topknot */}
            <circle cx="0" cy="-60" r="6" fill="#0a0a0e" />
            <ellipse cx="0" cy="-68" rx="3" ry="6" fill="#0a0a0e" />
            {/* gold halo crown */}
            <ellipse cx="0" cy="-58" rx="14" ry="3" fill="none" stroke="#ffd84a" strokeWidth="2.5" />
            {/* feet */}
            <rect x="-16" y="40" width="14" height="6" fill="#f7b04a" />
            <rect x="2"   y="40" width="14" height="6" fill="#f7b04a" />
            <text x="0" y="78" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fontWeight="700" fill="#0c1a28" letterSpacing="0.18em">YOU</text>
          </g>

          {/* === SHEEP (rookie, yellow mawashi) === */}
          <g transform="translate(320,180)">
            <ellipse cx="0" cy="34" rx="46" ry="6" fill="#1c3650" opacity=".55" />
            {/* cloud-of-bumps wool body */}
            <g fill="#f4ecd8">
              <ellipse cx="-22" cy="-15" rx="16" ry="14" />
              <ellipse cx="0"   cy="-22" rx="20" ry="16" />
              <ellipse cx="22"  cy="-15" rx="16" ry="14" />
              <ellipse cx="-12" cy="0"   rx="22" ry="16" />
              <ellipse cx="14"  cy="0"   rx="22" ry="16" />
            </g>
            {/* head — dark sphere poking forward */}
            <ellipse cx="0" cy="-12" rx="10" ry="11" fill="#2a1f1a" />
            {/* eyes + cheek dots */}
            <circle cx="-3" cy="-14" r="1.6" fill="#fff" />
            <circle cx="3"  cy="-14" r="1.6" fill="#fff" />
            {/* ears */}
            <polygon points="-15,-15 -22,-8 -8,-8" fill="#2a1f1a" />
            <polygon points="15,-15 22,-8 8,-8" fill="#2a1f1a" />
            {/* mawashi */}
            <rect x="-32" y="8" width="64" height="11" fill="#e8c54a" />
            <rect x="-10" y="19" width="20" height="11" fill="#e8c54a" />
            {/* topknot */}
            <circle cx="0" cy="-40" r="5" fill="#0a0a0e" />
            <ellipse cx="0" cy="-47" rx="2.5" ry="5" fill="#0a0a0e" />
            {/* hooves */}
            <rect x="-12" y="34" width="10" height="5" fill="#2a1f1a" />
            <rect x="2"   y="34" width="10" height="5" fill="#2a1f1a" />
            <text x="0" y="68" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fontWeight="700" fill="#0c1a28" letterSpacing="0.18em">ROOKIE</text>
          </g>

          {/* === WOLF (bruiser, green mawashi) === */}
          <g transform="translate(500,180)">
            <ellipse cx="0" cy="34" rx="44" ry="6" fill="#1c3650" opacity=".55" />
            {/* body — leaner */}
            <ellipse cx="0" cy="-5" rx="32" ry="36" fill="#5a5650" />
            {/* dark spine ridge */}
            <ellipse cx="0" cy="-12" rx="10" ry="30" fill="#2e2a25" />
            {/* belly band */}
            <ellipse cx="0" cy="8"  rx="18" ry="14" fill="#7a7570" />
            {/* head — boxy + long muzzle */}
            <ellipse cx="0" cy="-22" rx="12" ry="11" fill="#5a5650" />
            <ellipse cx="0" cy="-12" rx="6"  ry="6"  fill="#3a3631" />
            {/* nose */}
            <circle cx="0" cy="-8" r="2" fill="#0a0a0a" />
            {/* glowing yellow eyes */}
            <circle cx="-5" cy="-24" r="2" fill="#ffdc4a" />
            <circle cx="5"  cy="-24" r="2" fill="#ffdc4a" />
            {/* pointed ears */}
            <polygon points="-9,-32 -13,-22 -4,-22" fill="#3e3a35" />
            <polygon points="9,-32 13,-22 4,-22" fill="#3e3a35" />
            {/* mawashi */}
            <rect x="-30" y="14" width="60" height="11" fill="#22a04a" />
            <rect x="-10" y="25" width="20" height="11" fill="#22a04a" />
            {/* topknot */}
            <circle cx="0" cy="-48" r="5" fill="#0a0a0e" />
            <ellipse cx="0" cy="-55" rx="2.5" ry="5" fill="#0a0a0e" />
            {/* paws */}
            <rect x="-12" y="34" width="10" height="5" fill="#3a3631" />
            <rect x="2"   y="34" width="10" height="5" fill="#3a3631" />
            <text x="0" y="68" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fontWeight="700" fill="#0c1a28" letterSpacing="0.18em">BRUISER</text>
          </g>

          {/* === SHEEPDOG (sniper, blue mawashi) === */}
          <g transform="translate(670,180)">
            <ellipse cx="0" cy="34" rx="44" ry="6" fill="#1c3650" opacity=".55" />
            {/* body — black */}
            <ellipse cx="0" cy="-5" rx="34" ry="36" fill="#161616" />
            {/* white chest blaze */}
            <ellipse cx="0" cy="5"  rx="20" ry="26" fill="#f4ecd8" />
            {/* white back stripe */}
            <ellipse cx="0" cy="-15" rx="6" ry="26" fill="#f4ecd8" />
            {/* head — black */}
            <ellipse cx="0" cy="-22" rx="13" ry="12" fill="#161616" />
            {/* white muzzle */}
            <ellipse cx="0" cy="-15" rx="7" ry="6" fill="#f4ecd8" />
            <circle cx="0" cy="-11" r="1.8" fill="#0a0a0a" />
            {/* eyes */}
            <circle cx="-5" cy="-25" r="1.8" fill="#fff" />
            <circle cx="5"  cy="-25" r="1.8" fill="#fff" />
            <circle cx="-5" cy="-25" r="0.8" fill="#0a0a0a" />
            <circle cx="5"  cy="-25" r="0.8" fill="#0a0a0a" />
            {/* triangular ears pointing back */}
            <polygon points="-9,-33 -14,-25 -4,-22" fill="#161616" />
            <polygon points="9,-33 14,-25 4,-22" fill="#161616" />
            {/* mawashi */}
            <rect x="-30" y="14" width="60" height="11" fill="#5a8be0" />
            <rect x="-10" y="25" width="20" height="11" fill="#5a8be0" />
            {/* topknot */}
            <circle cx="0" cy="-48" r="5" fill="#0a0a0e" />
            <ellipse cx="0" cy="-55" rx="2.5" ry="5" fill="#0a0a0e" />
            {/* white paws */}
            <rect x="-12" y="34" width="10" height="5" fill="#f4ecd8" />
            <rect x="2"   y="34" width="10" height="5" fill="#f4ecd8" />
            <text x="0" y="68" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fontWeight="700" fill="#0c1a28" letterSpacing="0.18em">SNIPER</text>
          </g>

          {/* foreground sweat-drop / dust accents */}
          <g fill="#cfe0f0" opacity="0.55">
            <circle cx="240"  cy="200" r="1.4" />
            <circle cx="420"  cy="195" r="1.6" />
            <circle cx="580"  cy="200" r="1.4" />
            <circle cx="730"  cy="195" r="1.4" />
          </g>
        </svg>
      </div>

      {/* foreground content */}
      <div className="ps-splash__content">
        <h1 className="ps-splash__title">
          <span className="ps-splash__title-emph">All-Star</span>
          <span className="ps-splash__title-emph ps-splash__title-emph--accent">Sumo</span>
        </h1>
        <p className="ps-splash__subtitle">{t('subtitle')}</p>

        {/* How-to gesture diagram — drag-back slingshot, finger on left, dash on right. */}
        <div className="ps-splash__howto" aria-label="Drag back, release to dash">
          <svg viewBox="0 0 280 84" width="100%" height="84" aria-hidden>
            {/* drag-back dashed arrow (left half) */}
            <line x1="104" y1="40" x2="50" y2="40"
                  stroke="#ffd84a" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 5">
              <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1.2s" repeatCount="indefinite" />
            </line>
            <polyline points="60,30 50,40 60,50"
                      fill="none" stroke="#ffd84a" strokeWidth="3"
                      strokeLinecap="round" strokeLinejoin="round" />
            {/* finger touch indicator */}
            <circle cx="30" cy="40" r="13" fill="none" stroke="#ffd84a" strokeWidth="2" opacity="0.5">
              <animate attributeName="r" values="13;16;13" dur="1.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0.15;0.5" dur="1.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="30" cy="40" r="7" fill="#ffd84a" />

            {/* mini penguin in the middle */}
            <g>
              <ellipse cx="140" cy="40" rx="20" ry="22" fill="#1a1a1a" />
              <ellipse cx="140" cy="44" rx="12" ry="15" fill="#f4ecd8" />
              <rect x="120" y="48" width="40" height="6" rx="1" fill="#d8453e" />
              <circle cx="135" cy="32" r="2" fill="#0a0a0a" />
              <circle cx="145" cy="32" r="2" fill="#0a0a0a" />
              <polygon points="138,36 142,36 140,40" fill="#f7b04a" />
            </g>

            {/* forward dash arrow (right half) */}
            <line x1="178" y1="40" x2="252" y2="40"
                  stroke="#ff6b3a" strokeWidth="4.5" strokeLinecap="round" />
            <polyline points="240,30 252,40 240,50"
                      fill="none" stroke="#ff6b3a" strokeWidth="4.5"
                      strokeLinecap="round" strokeLinejoin="round" />

            {/* labels */}
            <text x="30" y="76" textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace" fontSize="9"
                  fontWeight="700" fill="#cfe0f0" letterSpacing="0.18em">{t('howto_drag')}</text>
            <text x="222" y="76" textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace" fontSize="9"
                  fontWeight="700" fill="#ff6b3a" letterSpacing="0.18em">{t('howto_dash')}</text>
          </svg>
        </div>

        {highScore > 0 && (
          <div className="ps-splash__best">
            <span className="ps-splash__best-label">BEST</span>
            <span className="ps-splash__best-value">{highScore}</span>
          </div>
        )}

        <button className="ps-splash__cta" onPointerDown={onStart}>
          <span className="ps-splash__cta-text">{t('tap_to_start')}</span>
          <span className="ps-splash__cta-pulse" aria-hidden />
        </button>
      </div>
    </div>
  );
}
