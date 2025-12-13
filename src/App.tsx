import { useRef } from "react"

import Homepage from "@/components/Homepage"
import Experiment from "@/components/Experiment"

import "./App.css"

function App() {
  const eventSource = useRef<HTMLDivElement>(null!)

  return (
    <main ref={eventSource} data-theme="light">
      <Homepage />
      <Experiment eventSource={eventSource} />
    </main>
  )
}

export default App
