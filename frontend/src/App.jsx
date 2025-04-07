import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import Suppliers from "./pages/Suppliers.jsx";
import Sales from "./pages/Sales.jsx";
import InventoryAlerts from "./components/InventoryAlerts.jsx";
import Chatbot from "./components/Chatbot.jsx";
// import Reports from "./pages/Reports.jsx"; // <-- REMOVE
import PurchaseOrders from "./pages/PurchaseOrders.jsx";
import Users from "./pages/Users.jsx";
import Billing from "./pages/Billing.jsx"; // <-- ADD
import { useState } from "react";

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const handleLogin = (email, password) => {
         if (email === "admin@gmail.com" && password === "admin") {
             setIsAuthenticated(true);
         }
    };

    return (
        <Router>
            <Routes>
                <Route
                    path="/login"
                    element={isAuthenticated ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />}
                />
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
                                    {/* <Route path="/reports" element={<Reports />} /> */}{/* <-- REMOVE */}
                                    <Route path="/billing" element={<Billing />} /> {/* <-- ADD */}
                                    <Route path="/purchase-orders" element={<PurchaseOrders />} />
                                    <Route path="/users" element={<Users />} />
                                    <Route path="*" element={<div className="p-6"><h2>404 Page Not Found</h2></div>} />
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
    );
};

export default App;