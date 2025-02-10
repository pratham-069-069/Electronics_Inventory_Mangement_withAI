import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom"
import Layout from "./components/Layout.jsx"
import Login from "./pages/Login.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import Products from "./pages/Products.jsx"
import Suppliers from "./pages/Suppliers.jsx"
import Sales from "./pages/Sales.jsx"
import InventoryAlerts from "./components/InventoryAlerts.jsx"
import Chatbot from "./components/Chatbot.jsx"

const App = () => {
  // You would typically check for authentication here
  const isAuthenticated = true

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/suppliers" element={<Suppliers />} />
                  <Route path="/sales" element={<Sales />} />
                  <Route path="/alerts" element={<InventoryAlerts />} />
                </Routes>
                <Chatbot />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  )
}

export default App

