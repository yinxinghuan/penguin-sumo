import { useMemo } from 'react';

interface IcebergProps {
  id: string;
  position: [number, number, number];
  scale?: number;
}

// Procedural slight-variation iceberg: stacked cones for the chunky pixel-art feel.
export function Iceberg({ id, position, scale = 1 }: IcebergProps) {
  const v = useMemo(() => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return {
      h1: 0.9 + ((h % 100) / 100) * 0.6,
      r1: 1.0 + (((h >> 7) % 100) / 100) * 0.4,
      rot: ((h >> 13) % 360) * (Math.PI / 180),
      tilt: (((h >> 19) % 100) / 100 - 0.5) * 0.2,
    };
  }, [id]);

  return (
    <group position={position} rotation={[0, v.rot, v.tilt]} scale={scale}>
      {/* base wet rim — strong dark navy to pop against the white ice */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[v.r1 * 1.22, 18]} />
        <meshStandardMaterial color="#1f3d5a" roughness={0.9} />
      </mesh>
      {/* lower chunky cone — steel blue, far darker than the snowfield */}
      <mesh position={[0, v.h1 * 0.6, 0]} castShadow receiveShadow>
        <coneGeometry args={[v.r1, v.h1 * 1.2, 6]} />
        <meshStandardMaterial color="#6996b6" flatShading roughness={0.7} />
      </mesh>
      {/* upper bright peak — keeps the snowy tip, reads against the cone */}
      <mesh position={[0, v.h1 * 1.1, 0]} castShadow>
        <coneGeometry args={[v.r1 * 0.55, v.h1 * 0.55, 5]} />
        <meshStandardMaterial color="#f4fbff" flatShading roughness={0.4} />
      </mesh>
    </group>
  );
}
