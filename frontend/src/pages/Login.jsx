import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button"; // Adjust paths if needed
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "../components/ui/Card";

// Assume onLogin expects email and password as separate arguments
const Login = ({ onLogin }) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");

        // Hardcoded Login Check
        if (email === "admin@gmail.com" && password === "admin") {
            console.log("Credentials match in Login.jsx, calling onLogin..."); // Add console log

            // ✅ *** Call onLogin with TWO arguments ***
            if (onLogin) {
                 onLogin(email, password); // Pass email and password separately
            } else {
                 console.warn("onLogin prop not provided to Login component");
            }

            navigate("/"); // Navigate after calling onLogin
        } else {
             console.log("Credentials mismatch in Login.jsx"); // Add console log
             // Provide hint for demo purposes
            setError("Invalid email or password (Hint: admin@gmail.com / admin)");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Login to Smart Inventory</CardTitle>
                    <CardDescription>Enter your credentials to access your account</CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="admin"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

                        <Button type="submit" className="w-full flex items-center justify-center">
                            Login
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default Login;