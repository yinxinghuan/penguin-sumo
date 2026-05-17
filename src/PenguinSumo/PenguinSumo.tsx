import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Leaderboard, useGameScore } from '@shared/leaderboard';
import { Scene } from './components/Scene';
import { SplashScene } from './components/SplashScene';
import { createGameState } from './hooks/useGameLoop';
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
  const [highScore, setHighScore] = useState<number>(() => Number(localStorage.getItem(HIGH_KEY) || 0));
  const [finalScore, setFinalScore] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  // Floating "-N" indicator for seal hits. `key` forces React to remount the
  // node so the CSS animation replays even on consecutive hits.
  const [chainBroken, setChainBroken] = useState<{ key: number; count: number } | null>(null);

  const stateRef = useRef(createGameState());
  const { stickRef, view } = useJoystick(phase === 'playing');

  const {
    isInAigram, submitScore, fetchGlobalLeaderboard, fetchFriendsLeaderboard,
  } = useGameScore('penguin-sumo');

  const haptic = useCallback((kind: 'light' | 'heavy') => {
    if (!('vibrate' in navigator)) return;
    navigator.vibrate(kind === 'heavy' ? 35 : 12);
  }, []);

  const onScore = useCallback((s: number) => setScore(s), []);

  const onChainBroken = useCallback((lostCount: number) => {
    const key = Date.now();
    setChainBroken({ key, count: lostCount });
    // Clear after the longest animation finishes so the DOM stays clean.
    setTimeout(() => setChainBroken(cur => (cur && cur.key === key ? null : cur)), 1600);
  }, []);

  const onGameOver = useCallback((final: number) => {
    setFinalScore(final);
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
    setPhase('playing');
    startBgm(0.06);
  }, []);

  // stop bgm on unmount
  useEffect(() => () => { stopBgm(); }, []);

  // Preload safety: only mount the 3D Canvas once the user has started.
  // While 'splash' is showing, this whole component sits at zero GPU cost.
  // After game over the Canvas stays mounted so the frozen scene shows behind
  // the overlay, but useFrame is gated on `playing` so the loop is idle.
  const showCanvas = phase !== 'splash';
  const canvasFrameloop = phase === 'playing' ? 'always' : 'demand';

  return (
    <div className="pr">
      {showCanvas && (
        <div className="ps__canvas">
          <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }} frameloop={canvasFrameloop}>
            <Scene
              state={stateRef}
              playing={phase === 'playing'}
              stickRef={stickRef}
              onScore={onScore}
              onGameOver={onGameOver}
              onChainBroken={onChainBroken}
              playSfx={playSfx}
              haptic={haptic}
            />
          </Canvas>
        </div>
      )}

      {/* HUD — visible only when the 3D scene is up */}
      {showCanvas && (
        <div className="ps__hud">
          <div className="ps__score">
            <div className="ps__score-label">RESCUED</div>
            <div className="ps__score-value">{String(score).padStart(2, '0')}</div>
            {highScore > 0 && (
              <div className="ps__hi">
                <span>BEST</span>
                <span className="ps__hi-value">{highScore}</span>
              </div>
            )}
          </div>
          <img className="ps__watermark" src={alteruSvg} alt="AlterU" />
        </div>
      )}

      {/* Seal-hit feedback: full-screen red flash + floating "-N" near the score */}
      {chainBroken && (
        <div className="ps__chain-break" key={chainBroken.key}>
          <div className="ps__chain-break-flash" />
          <div className="ps__chain-break-pellet">
            <span className="ps__chain-break-minus">−</span>
            <span className="ps__chain-break-count">{chainBroken.count}</span>
          </div>
          <div className="ps__chain-break-label">CHAIN BROKEN</div>
        </div>
      )}

      {/* Joystick visual */}
      {view.active && (
        <div className="ps__joystick" style={{ left: view.ox, top: view.oy }}>
          <div className="ps__joystick__ring">
            <div className="ps__joystick__stick" style={{ transform: `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px))` }} />
          </div>
        </div>
      )}

      {/* Splash — pure CSS/SVG, no 3D */}
      {phase === 'splash' && <SplashScene onStart={start} highScore={highScore} />}

      {/* Game over */}
      {phase === 'gameover' && (
        <div className="ps__gameover">
          <div className="ps__gameover-eyebrow">
            {finalScore > 0 && finalScore === highScore ? 'NEW RECORD' : 'CAUGHT BY THE SKUA'}
          </div>
          <div className="ps__final-score">{finalScore}</div>
          <div className="ps__final">
            {finalScore === 1 ? '1 BABY RESCUED' : `${finalScore} BABIES RESCUED`}
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
