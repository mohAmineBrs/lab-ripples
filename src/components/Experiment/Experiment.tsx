import { Canvas } from "@react-three/fiber"

import Scene from "./Scene"

const Experiment = ({
  eventSource,
}: {
  eventSource: React.RefObject<HTMLDivElement>
}) => {
  return (
    <div className="canvas">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 10], fov: 45 }}
        eventSource={eventSource}
        eventPrefix="client"
      >
        <Scene />
      </Canvas>
    </div>
  )
}

export default Experiment
