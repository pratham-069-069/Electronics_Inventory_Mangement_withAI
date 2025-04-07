"use client";

import { useState, useEffect, useRef } from "react"; // Added useEffect and useRef
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { FiMessageSquare, FiX } from "react-icons/fi"; // Added FiX for close button

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null); // Ref for scrolling

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
    const currentInput = input; // Capture input before clearing
    setLoading(true);

    const userMessage = { text: currentInput, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setInput(""); // Clear input immediately

    try {
      // ✅ *** UPDATED URL HERE ***
      const response = await fetch("http://localhost:5000/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Consider sending userId if you have it, otherwise backend handles undefined
        body: JSON.stringify({ message: currentInput }),
      });

      if (!response.ok) { // Check for non-2xx responses
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let botMessageText = data.reply || "Sorry, I couldn't get a response."; // Default message on empty reply

      // Optional: Remove potential internal markers if your backend/AI includes them
      botMessageText = botMessageText.replace(/<think>.*?<\/think>/gs, "").trim();

      const botMessage = { text: botMessageText, sender: "bot" };
      setMessages((prev) => [...prev, botMessage]);

    } catch (error) {
      console.error("Error fetching chatbot response:", error);
      setMessages((prev) => [...prev, { text: "Sorry, an error occurred.", sender: "bot" }]); // More user-friendly error
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
         variant="outline" // Changed variant for potentially better styling
         className="fixed bottom-4 right-4 rounded-full p-3 shadow-lg z-50" // Adjusted padding/shadow
         onClick={() => setIsOpen(!isOpen)}
         aria-label={isOpen ? "Close Chatbot" : "Open Chatbot"} // Accessibility
        >
         {isOpen ? <FiX className="h-6 w-6" /> : <FiMessageSquare className="h-6 w-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-20 right-4 w-80 max-w-[90vw] h-[50vh] flex flex-col shadow-xl z-40 border"> {/* Added flex/height */}
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b"> {/* Added border */}
            <CardTitle className="text-lg">Chatbot Assistant</CardTitle>
             {/* Optional: Add a close button inside the header as well */}
             <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} aria-label="Close Chatbot">
                 <FiX className="h-5 w-5" />
             </Button>
          </CardHeader>

          {/* Messages Area */}
          <CardContent className="flex-grow overflow-y-auto p-4 space-y-3"> {/* Added flex-grow/padding/space */}
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                <span
                  className={`inline-block rounded-lg px-3 py-2 max-w-[80%] break-words ${ // Added max-width/break-words
                    message.sender === "user"
                      ? "bg-blue-600 text-white" // Slightly darker blue
                      : "bg-gray-200 text-gray-900" // Darker text for contrast
                  }`}
                >
                  {/* Render newlines if your bot sends them */}
                  {message.text.split('\n').map((line, i) => <p key={i} className="m-0">{line}</p>)}
                </span>
              </div>
            ))}
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
            {loading && (
                <div className="flex justify-start">
                    <span className="inline-block rounded-lg px-3 py-2 bg-gray-200 text-gray-600 text-sm italic">
                        Typing...
                    </span>
                </div>
            )}
          </CardContent>

          {/* Input Area */}
          <CardFooter className="p-3 border-t"> {/* Added border */}
            <div className="flex w-full items-center space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={handleKeyPress} // Use updated handler
                disabled={loading}
                className="flex-grow"
                aria-label="Chat input" // Accessibility
              />
              <Button onClick={handleSend} disabled={loading || !input.trim()} aria-label="Send message">
                {/* Optional: Use an icon for send button */}
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