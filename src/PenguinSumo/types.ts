import * as THREE from 'three';

export type Phase = 'splash' | 'playing' | 'gameover';

export interface Stick {
  active: boolean;
  x: number; // -1..1
  y: number; // -1..1
}

export interface BabyPenguin {
  id: number;
  position: THREE.Vector3;
  colorType: number; // 0..7
  vy: number; // for drop-from-sky bounce
}

export interface BodySegment {
  id: number;
  position: THREE.Vector3;
  rotation: number;
  colorType: number;
}

export interface Iceberg {
  id: string;
  position: THREE.Vector3;
}

export interface Seal {
  id: number;
  position: THREE.Vector3;
  rotation: number;
}

export interface AssetMap {
  texPenguinFace?: THREE.Texture;
  texPenguinBody?: THREE.Texture;
  texSkuaFace?: THREE.Texture;
  texSkuaBody?: THREE.Texture;
  texGround?: THREE.Texture;
  texStartBg?: string;
}
