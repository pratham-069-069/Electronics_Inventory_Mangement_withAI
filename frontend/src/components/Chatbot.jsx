"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { FiMessageSquare, FiX } from "react-icons/fi";

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Function to scroll to the bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to send message to backend
  const handleSend = async () => {
    if (!input.trim()) return;
    const currentInput = input;
    setLoading(true);

    const userMessage = { text: currentInput, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setInput(""); // Clear input immediately

    try {
      // Updated URL to match your backend endpoint
      const response = await fetch("http://localhost:5000/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Send userId if you have it, otherwise backend handles undefined
        body: JSON.stringify({ 
          message: currentInput,
          userId: "anonymous" // You can replace this with actual user ID if available
        }),
      });

      const data = await response.json();

      let botMessageText;
      let messageType = "bot"; // Default message type

      if (!response.ok) {
        // Handle error responses
        botMessageText = data.error || "Sorry, an error occurred.";
        messageType = "error";
      } else {
        // Handle successful responses - backend returns 'answer' property
        botMessageText = data.answer || "Sorry, I couldn't get a response.";
        
        // Optional: You can also display SQL query info if needed
        if (data.sql) {
          console.log("Generated SQL:", data.sql);
          console.log("Required tables:", data.tables);
          // Uncomment below if you want to show SQL info to user
          // botMessageText += `\n\nSQL Query: ${data.sql}`;
        }
      }

      // Clean up any potential internal markers
      botMessageText = botMessageText.replace(/<think>.*?<\/think>/gs, "").trim();

      const botMessage = { 
        text: botMessageText, 
        sender: messageType,
        sql: data.sql || null, // Store SQL for potential future use
        tables: data.tables || []
      };
      setMessages((prev) => [...prev, botMessage]);

    } catch (error) {
      console.error("Error fetching chatbot response:", error);
      setMessages((prev) => [...prev, { 
        text: "Sorry, I couldn't connect to the server. Please try again.", 
        sender: "error" 
      }]);
    }

    setLoading(false);
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading && input.trim()) {
      handleSend();
    }
  };

  return (
    <>
      {/* Chatbot Toggle Button */}
      <Button
        variant="outline"
        className="fixed bottom-4 right-4 rounded-full p-3 shadow-lg z-50"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close Chatbot" : "Open Chatbot"}
      >
        {isOpen ? <FiX className="h-6 w-6" /> : <FiMessageSquare className="h-6 w-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-20 right-4 w-80 max-w-[90vw] h-[50vh] flex flex-col shadow-xl z-40 border">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
            <CardTitle className="text-lg">SQL Chatbot Assistant</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} aria-label="Close Chatbot">
              <FiX className="h-5 w-5" />
            </Button>
          </CardHeader>

          {/* Messages Area */}
          <CardContent className="flex-grow overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                <span
                  className={`inline-block rounded-lg px-3 py-2 max-w-[80%] break-words ${
                    message.sender === "user"
                      ? "bg-blue-600 text-white"
                      : message.sender === "error"
                      ? "bg-red-100 text-red-800 border border-red-300"
                      : "bg-gray-200 text-gray-900"
                  }`}
                >
                  {/* Render newlines and preserve formatting */}
                  {message.text.split('\n').map((line, i) => (
                    <div key={i} className={i > 0 ? "mt-1" : ""}>
                      {line || "\u00A0"} {/* Non-breaking space for empty lines */}
                    </div>
                  ))}
                </span>
              </div>
            ))}
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
            {loading && (
              <div className="flex justify-start">
                <span className="inline-block rounded-lg px-3 py-2 bg-gray-200 text-gray-600 text-sm italic">
                  Generating SQL query...
                </span>
              </div>
            )}
          </CardContent>

          {/* Input Area */}
          <CardFooter className="p-3 border-t">
            <div className="flex w-full items-center space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your database..."
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="flex-grow"
                aria-label="Chat input"
              />
              <Button onClick={handleSend} disabled={loading || !input.trim()} aria-label="Send message">
                Send
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </>
  );
};

export default Chatbot;