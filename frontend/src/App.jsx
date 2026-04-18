import { Route, Routes } from "react-router-dom"
import Home from "./components/Home"
import Register from "./components/Register"
import Login from "./components/Login"
import Navbar from "./components/Navbar"

function App() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar/>
      <Routes>
      <Route path="" element={<Home/>}/>
      <Route path="/register" element={<Register/>}/>
      <Route path="/login" element={<Login/>}/>
    </Routes>
    </div>
  )
}

export default App
