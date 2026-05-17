import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Leaderboard, useGameScore } from '@shared/leaderboard';
import { Scene } from './components/Scene';
import { SplashScene } from './components/SplashScene';
import { createGameState } from './hooks/useGameLoop';
import type { SfxKey } from './hooks/useGameLoop';
import { useJoystick } from './hooks/useJoystick';
import { playSfx, startBgm, stopBgm, unlockAudio } from './utils/audio';
import { t } from './i18n';
import alteruSvg from './img/alteru.svg';
import './PenguinSumo.less';
import './SplashScene.less';

type Phase = 'splash' | 'playing' | 'gameover';

const HIGH_KEY = 'penguin_sumo_high';

export function PenguinSumo() {
  const [phase, setPhase] = useState<Phase>('splash');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [kos, setKos] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => Number(localStorage.getItem(HIGH_KEY) || 0));
  const [finalScore, setFinalScore] = useState(0);
  const [won, setWon] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  // Floating impact text + screen flash queue. Each event renders a brief
  // overlay with a CSS keyframe animation so the comic punch reads through.
  const [hits, setHits] = useState<{ key: number; label: string; big: boolean; ts: number }[]>([]);
  const [flashKey, setFlashKey] = useState(0);
  const [flashBig, setFlashBig] = useState(false);
  // Player's current charge magnitude, used to gate the joystick max-charge halo.
  const [chargeMag, setChargeMag] = useState(0);

  const stateRef = useRef(createGameState());
  const { stickRef, view } = useJoystick(phase === 'playing');

  const {
    isInAigram, submitScore, fetchGlobalLeaderboard, fetchFriendsLeaderboard,
  } = useGameScore('penguin-sumo');

  const haptic = useCallback((kind: 'light' | 'heavy') => {
    if (!('vibrate' in navigator)) return;
    navigator.vibrate(kind === 'heavy' ? 35 : 12);
  }, []);

  const onScore = useCallback((s: number) => setScore(Math.floor(s)), []);
  const onTime = useCallback((t: number) => setTimeLeft(Math.max(0, t)), []);
  const onKo = useCallback((n: number) => setKos(n), []);
  const onCharge = useCallback((c: number) => setChargeMag(c), []);

  const onImpact = useCallback((kind: 'bonk' | 'ko', power: number, _x: number, _z: number) => {
    if (power < 0.30 && kind === 'bonk') return; // skip tiny taps
    const label = kind === 'ko' ? 'K.O.!' : (power > 0.75 ? 'WHAM!' : power > 0.55 ? 'BONK!' : 'POW!');
    const big = kind === 'ko' || power > 0.75;
    const key = Date.now() + Math.random();
    setHits(h => [...h.filter(x => Date.now() - x.ts < 1200), { key, label, big, ts: Date.now() }]);
    setFlashKey(k => k + 1);
    setFlashBig(big);
    // Stronger haptic on big hits — 60ms patterned vibration
    if ('vibrate' in navigator) {
      navigator.vibrate(big ? [50, 30, 25] : [25]);
    }
    // Auto-cull stale hits
    setTimeout(() => setHits(h => h.filter(x => x.key !== key)), 1200);
  }, []);

  const onGameOver = useCallback((final: number, didWin: boolean) => {
    setFinalScore(final);
    setWon(didWin);
    setPhase('gameover');
    stopBgm();
    if (final > highScore) {
      localStorage.setItem(HIGH_KEY, String(final));
      setHighScore(final);
    }
    submitScore(final).catch(() => { /* silent */ });
  }, [highScore, submitScore]);

  const start = useCallback(async () => {
    await unlockAudio();
    stateRef.current = createGameState();
    setScore(0);
    setKos(0);
    setTimeLeft(60);
    setWon(false);
    setPhase('playing');
    startBgm(0.07);
  }, []);

  useEffect(() => () => { stopBgm(); }, []);

  const showCanvas = phase !== 'splash';
  const canvasFrameloop = phase === 'playing' ? 'always' : 'demand';

  return (
    <div className="ps">
      {showCanvas && (
        <div className="ps__canvas">
          <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }} frameloop={canvasFrameloop}>
            <Scene
              state={stateRef}
              playing={phase === 'playing'}
              stickRef={stickRef}
              onScore={onScore}
              onTime={onTime}
              onKo={onKo}
              onCharge={onCharge}
              onImpact={onImpact}
              onGameOver={onGameOver}
              playSfx={(k: SfxKey) => playSfx(k)}
              haptic={haptic}
            />
          </Canvas>
        </div>
      )}

      {showCanvas && (
        <div className="ps__hud">
          <div className="ps__topbar">
            <div className="ps__topbar-cell">
              <span className="ps__topbar-num">{String(score).padStart(3, '0')}</span>
              <span className="ps__topbar-caption">SCORE</span>
            </div>
            <div className="ps__topbar-mid">
              <div className="ps__ko-row">
                {[0, 1, 2].map(i => (
                  <span key={i} className={`ps__ko-dot ${i < kos ? 'ps__ko-dot--lit' : ''}`} />
                ))}
              </div>
              <span className="ps__topbar-caption">KO / 3</span>
            </div>
            <div className="ps__topbar-cell ps__topbar-cell--right">
              <span className="ps__topbar-num">{Math.ceil(timeLeft)}</span>
              <span className="ps__topbar-caption">SEC</span>
            </div>
          </div>
        </div>
      )}
      {showCanvas && <img className="ps__watermark" src={alteruSvg} alt="AlterU" />}

      {view.active && (
        <div className="ps__joystick" style={{ left: view.ox, top: view.oy }}>
          <div className={`ps__joystick__ring ${chargeMag >= 1 ? 'ps__joystick__ring--max' : ''}`}>
            <div className="ps__joystick__stick" style={{ transform: `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px))` }} />
            {chargeMag > 0 && (
              <div className="ps__joystick__charge" style={{ transform: `scale(${1 + chargeMag * 0.15})`, opacity: chargeMag * 0.7 }} />
            )}
          </div>
        </div>
      )}

      {/* Impact feedback overlays — screen-tinted flash + floating text */}
      {showCanvas && hits.map(h => (
        <div key={h.key} className={`ps__hit ${h.big ? 'ps__hit--big' : ''}`}>{h.label}</div>
      ))}
      {showCanvas && flashKey > 0 && (
        <div key={flashKey} className={`ps__flash ${flashBig ? 'ps__flash--big' : ''}`} />
      )}

      {phase === 'splash' && <SplashScene onStart={start} highScore={highScore} />}

      {phase === 'gameover' && (
        <div className="ps__gameover">
          <div className="ps__gameover-eyebrow">
            {finalScore > 0 && finalScore === highScore
              ? 'NEW RECORD'
              : (won ? 'YOKOZUNA!' : 'OUT OF THE RING')}
          </div>
          <div className="ps__final-score">{finalScore}</div>
          <div className="ps__final">
            {won ? `${kos} RIVAL${kos === 1 ? '' : 'S'} KO'D` : 'BETTER LUCK NEXT BOUT'}
          </div>
          <button className="ps__cta" onPointerDown={start}>
            {t('again')}
          </button>
          <button className="ps__leaderboard-btn" onPointerDown={() => setShowLeaderboard(true)}>
            {t('leaderboard')}
          </button>
        </div>
      )}

      {showLeaderboard && (
        <Leaderboard
          gameName={t('title')}
          isInAigram={isInAigram}
          onClose={() => setShowLeaderboard(false)}
          fetchGlobal={fetchGlobalLeaderboard}
          fetchFriends={fetchFriendsLeaderboard}
        />
      )}
    </div>
  );
}
