import { shaderMaterial } from "@react-three/drei"
import { extend } from "@react-three/fiber"
import { Vector2 } from "three"

export const RipplesMaterial = shaderMaterial(
  {
    uTexture: null,
    uDisplacement: null,
    uMouse: new Vector2(),
    uWinResolution: new Vector2(),
    uWaveStrength: 0.1,
  },
  // vertex shader
  /*glsl*/ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // fragment shader
  /*glsl*/ `

    uniform sampler2D uTexture;
    uniform sampler2D uDisplacement;
    uniform vec2 uMouse;
    uniform vec2 uWinResolution;
    uniform float uWaveStrength;
    
    varying vec2 vUv;

    #define PI 3.14159265

    void main() {
      vec2 scUv = gl_FragCoord.xy / uWinResolution.xy;

      vec4 displacement= texture2D(uDisplacement, scUv);

      float theta = displacement.r * 2. * PI;
      vec2 direction = vec2(sin(theta), cos(theta));
      vec2 newUv = vUv + direction * displacement.r * uWaveStrength;

      vec4 final= texture2D(uTexture, newUv);


      gl_FragColor = final;

    }

  `
)

extend({ RipplesMaterial })
