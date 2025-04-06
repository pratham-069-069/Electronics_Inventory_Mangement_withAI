"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { FiMessageSquare } from "react-icons/fi";

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Function to send message to backend
  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);

    const userMessage = { text: input, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await fetch("http://localhost:5000/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();
      let botMessageText = data.reply || "I'm not sure.";

      botMessageText = botMessageText.replace(/<think>.*?<\/think>/gs, "").trim();

      const botMessage = { text: botMessageText, sender: "bot" };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error fetching chatbot response:", error);
      setMessages((prev) => [...prev, { text: "Error contacting chatbot.", sender: "bot" }]);
    }

    setLoading(false);
  };

  return (
    <>
      <Button className="fixed bottom-4 right-4 rounded-full p-4" onClick={() => setIsOpen(!isOpen)}>
        <FiMessageSquare className="h-6 w-6" />
      </Button>

      {isOpen && (
        <Card className="fixed bottom-20 right-4 w-80 shadow-lg">
          <CardHeader>
            <CardTitle>Chatbot Assistant</CardTitle>
          </CardHeader>

          <CardContent className="h-64 overflow-y-auto">
            {messages.map((message, index) => (
              <div key={index} className={`mb-2 ${message.sender === "user" ? "text-right" : "text-left"}`}>
                <span
                  className={`inline-block rounded-lg px-3 py-2 ${
                    message.sender === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {message.text}
                </span>
              </div>
            ))}
            {loading && <p className="text-gray-500 text-sm text-center">Typing...</p>}
          </CardContent>

          <CardFooter>
            <div className="flex w-full space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                disabled={loading}
              />
              <Button onClick={handleSend} disabled={loading || !input.trim()}>
                {loading ? "..." : "Send"}
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </>
  );
};

export default Chatbot;
