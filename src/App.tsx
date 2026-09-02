import { useState } from "react";
import Lab from "./components/Lab";
import Welcome from "./components/Welcome";

export default function App() {
  const [entered, setEntered] = useState(false);
  return entered ? <Lab /> : <Welcome onEnter={() => setEntered(true)} />;
}
