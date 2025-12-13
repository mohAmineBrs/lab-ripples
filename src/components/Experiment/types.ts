import { ShaderMaterial, Texture, Vector2 } from "three";

export interface IRipplesMaterial extends ShaderMaterial {
  uTexture: Texture;
  uDisplacement: Texture;
  uMouse: Vector2;
  uWinResolution: Vector2;
  uWaveStrength: 0.1;
}
