import { useMemo, useRef } from "react"
import { useTexture, useFBO } from "@react-three/drei"
import { useFrame, useThree, invalidate } from "@react-three/fiber"
import * as THREE from "three"
//@ts-ignore
import lerp from "@14islands/lerp"

import { RipplesMaterial } from "./RipplesMaterial"
import { IRipplesMaterial } from "./types"

import thumbnail from "./assets/thumbnail.jpg"
import ripplesBrush from "./assets/brush.png"

const MAX_WAVES = 80

const brushGeometry = new THREE.PlaneGeometry()
const brushMaterial = new THREE.MeshBasicMaterial({
  map: null,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthTest: false,
  depthWrite: false,
})

const setNewWave = (
  x: number,
  y: number,
  index: number,
  brushSize: number,
  meshes: THREE.Mesh[],
  startOpacity: number
) => {
  let mesh = meshes[index]
  mesh.visible = true
  mesh.position.x = x
  mesh.position.y = y
  mesh.scale.x = mesh.scale.y = brushSize
  //@ts-ignore
  mesh.material.opacity = startOpacity
}
let currentWave = 0

const prevMouse = new THREE.Vector2(0, 0)
const mouse = new THREE.Vector2(0, 0)
let lastWaveTimestamp = 0

const trackMousePos = (
  e: any,
  width: number,
  height: number,
  brushSize: number,
  meshes: THREE.Mesh[],
  startOpacity: number,
  minDistance = 0.1,
  minTime: number
) => {
  mouse.x = (e.pointer.x * width) / 2
  mouse.y = (e.pointer.y * height) / 2

  // const timeDelta = Date.now()
  const timeDelta = e.timeStamp - lastWaveTimestamp

  if (
    (Math.abs(mouse.x - prevMouse.x) < minDistance &&
      Math.abs(mouse.y - prevMouse.y) < minDistance) ||
    timeDelta * 0.01 < minTime
  ) {
    // nothing
  } else {
    setNewWave(mouse.x, mouse.y, currentWave, brushSize, meshes, startOpacity)
    currentWave = (currentWave + 1) % MAX_WAVES
    lastWaveTimestamp = e.timeStamp
  }
  prevMouse.x = mouse.x
  prevMouse.y = mouse.y
}

const Scene = () => {
  const texture = useTexture(thumbnail)
  const materialRef = useRef<IRipplesMaterial>(null!)
  const isMeshEnteredRef = useRef(false) // true only when actively hovering
  const isMeshEnteredDelayed = useRef(false) // true while wave is alive after pointerLeave
  const timeoutID = useRef<any>(-1)

  const { viewport, size } = useThree()
  const dpr = useThree((s) => s.viewport.dpr)

  let uWaveStrength = 0.1
  let waveSize = 3
  let newWaveScale = 7
  let waveRotation = 0.05
  let waveVelocity = 0.05
  let startOpacity = 0.22
  let strengthLerp = 0.1
  let speedLerp = 0.1
  let minSpeed = 0
  let minDistance = 0.005
  let minTime = 0.1

  //@ts-ignore
  const downSample = 0.5 // reduce detail by 50% to gain fps
  const renderTarget = useFBO(
    (viewport.width / 0.01) * downSample * dpr,
    (viewport.height / 0.01) * downSample * dpr
  )

  const brush = useTexture(ripplesBrush) as THREE.Texture

  const brushSize = waveSize / Math.min(viewport.width, viewport.height)

  const { meshes, scene: waveScene } = useMemo(() => {
    const scene = new THREE.Scene()
    const meshes: THREE.Mesh[] = []

    for (let i = 0; i < MAX_WAVES; i++) {
      const mat = brushMaterial.clone()
      mat.map = brush
      const mesh = new THREE.Mesh(brushGeometry, mat)
      mesh.visible = false
      mesh.rotation.z = 2 * Math.PI * Math.random()
      scene.add(mesh)
      meshes.push(mesh)
    }
    return { scene, meshes }
  }, [brush])

  const handleTrackMousePos = (e: any) => {
    trackMousePos(
      e,
      viewport.width,
      viewport.height,
      brushSize,
      meshes,
      startOpacity,
      minDistance,
      minTime
    )
  }

  // Mouse Refs to calculate mous speed
  const prevMouseRef = useRef({ x: 0, y: 0 })
  const mouseRef = useRef({ x: 0, y: 0 })
  const mouseSpeed = useRef(0)

  useFrame(({ gl, camera, pointer }, delta) => {
    if (!materialRef.current || !prevMouseRef.current || !mouseRef.current)
      return

    // cap delta to reasonable fps after frameLoop as stopped
    delta = Math.min(delta, 1 / 30)

    let isWaveActive =
      isMeshEnteredDelayed.current &&
      meshes.filter((mesh) => mesh.visible).length

    if (isWaveActive) {
      // Render mouse speed calcs inside the condition to minimize perf costs
      mouseRef.current.x = (pointer.x * viewport.width) / 2
      mouseRef.current.y = (pointer.y * viewport.height) / 2

      const [lastX, lastY] = [prevMouseRef.current.x, prevMouseRef.current.y]
      const [currentX, currentY] = [mouseRef.current.x, mouseRef.current.y]

      const mouseDeltaX = currentX - lastX
      const mouseDeltaY = currentY - lastY
      const speed = Math.sqrt(mouseDeltaX ** 2 + mouseDeltaY ** 2)

      if (isMeshEnteredRef.current) {
        mouseSpeed.current = Math.max(
          minSpeed,
          lerp(mouseSpeed.current, speed, speedLerp, delta)
        )
      } else {
        mouseSpeed.current = lerp(mouseSpeed.current, 0, 0.005, delta)
      }

      prevMouseRef.current.x = mouseRef.current.x
      prevMouseRef.current.y = mouseRef.current.y

      // Wave creation + destruction logic

      meshes.forEach((mesh) => {
        if (mesh.visible) {
          mesh.rotation.z += delta * 2 * waveRotation

          // @ts-ignore
          mesh.material.opacity = lerp(
            // @ts-ignore
            mesh.material.opacity,
            0,
            waveVelocity,
            delta
          )

          mesh.scale.x += delta * newWaveScale
          mesh.scale.y = mesh.scale.x
          //@ts-ignore
          if (mesh.material.opacity < 0.002) {
            mesh.visible = false
          }
        }
      })

      gl.setRenderTarget(renderTarget)
      gl.render(waveScene, camera)
      materialRef.current.uDisplacement = renderTarget.texture
      gl.setRenderTarget(null)

      // global render happens automatically by r3f

      invalidate()
    }

    materialRef.current.uWaveStrength = lerp(
      materialRef.current.uWaveStrength,
      uWaveStrength * mouseSpeed.current * 5,
      strengthLerp,
      delta
    )

    materialRef.current.uWinResolution = new THREE.Vector2(
      size.width,
      size.height
    ).multiplyScalar(Math.min(window.devicePixelRatio, dpr))
  })

  return (
    <mesh
      onPointerMove={(e) => {
        handleTrackMousePos(e)
        invalidate()
        isMeshEnteredDelayed.current = true
        clearTimeout(timeoutID.current)
      }}
      onPointerEnter={() => {
        isMeshEnteredRef.current = true
        invalidate()
        clearTimeout(timeoutID.current)
      }}
      onPointerLeave={() => {
        timeoutID.current = setTimeout(() => {
          isMeshEnteredDelayed.current = false
        }, 2000)
        isMeshEnteredRef.current = false
      }}
    >
      <planeGeometry args={[viewport.width, viewport.height]} />
      {/* @ts-ignore */}
      <ripplesMaterial
        ref={materialRef}
        key={RipplesMaterial.key}
        uTexture={texture}
      />
    </mesh>
  )
}

export default Scene
