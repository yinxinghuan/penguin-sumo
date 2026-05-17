import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameRef } from '../hooks/useGameLoop';

// In-scene snowfall. ~220 white points drift down, wrapping back to the top
// when they land. They're anchored to the camera target (head position) so
// the snow always covers the visible playfield, no matter where the player
// roams. Cheap: one BufferGeometry, one Points mesh.
const COUNT = 220;
const FIELD = 50;      // half-side of the snow volume (xz)
const TOP_Y = 14;      // top of the volume
const BOTTOM_Y = -1;   // a touch below ground so flakes "land" out of sight

export function Snow({ state }: { state: React.MutableRefObject<GameRef> }) {
  const ref = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 2); // [vy, vx-drift]
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * FIELD * 2;
      positions[i * 3 + 1] = Math.random() * (TOP_Y - BOTTOM_Y) + BOTTOM_Y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * FIELD * 2;
      velocities[i * 2 + 0] = 1.4 + Math.random() * 1.2;   // fall speed
      velocities[i * 2 + 1] = (Math.random() - 0.5) * 0.6; // x drift
    }
    return { positions, velocities };
  }, []);

  useFrame((_, delta) => {
    const points = ref.current;
    if (!points) return;
    const arr = points.geometry.attributes.position.array as Float32Array;
    const headX = state.current.headPos.x;
    const headZ = state.current.headPos.z;
    const c = Math.min(delta, 0.05);

    for (let i = 0; i < COUNT; i++) {
      const yIdx = i * 3 + 1;
      const xIdx = i * 3 + 0;
      const zIdx = i * 3 + 2;

      arr[yIdx] -= velocities[i * 2 + 0] * c;
      arr[xIdx] += velocities[i * 2 + 1] * c;

      // wrap once flake is below or once it drifts too far from the player
      if (arr[yIdx] < BOTTOM_Y) {
        arr[yIdx] = TOP_Y;
        arr[xIdx] = headX + (Math.random() - 0.5) * FIELD * 2;
        arr[zIdx] = headZ + (Math.random() - 0.5) * FIELD * 2;
      }
      // also wrap if it drifts off the side of the visible field
      if (Math.abs(arr[xIdx] - headX) > FIELD) {
        arr[xIdx] = headX + (Math.random() - 0.5) * FIELD * 2;
      }
      if (Math.abs(arr[zIdx] - headZ) > FIELD) {
        arr[zIdx] = headZ + (Math.random() - 0.5) * FIELD * 2;
      }
    }
    points.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={COUNT}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.3}
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
}
