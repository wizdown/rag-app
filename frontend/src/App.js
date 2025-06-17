import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FiSend } from 'react-icons/fi';
import './App.css';

function App() {
  // State to hold the list of messages
  const [messages, setMessages] = useState([]);
  // State to hold the current user input
  const [input, setInput] = useState('');
  // State to track if the AI is thinking
  const [isLoading, setIsLoading] = useState(false);
  // Ref to the messages container for auto-scrolling
  const messagesEndRef = useRef(null);

  // The URL of your FastAPI backend
  const API_URL = 'http://localhost:8000/ask';

  // Function to scroll to the bottom of the messages list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // useEffect hook to scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to handle sending a message
  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    // Add user's message to the chat
    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Send the user's question to the backend
      const response = await axios.post(API_URL, {
        question: input,
      });

      // Add the AI's response to the chat
      const aiMessage = { sender: 'ai', text: response.data.answer };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      // Handle any errors from the API call
      const errorMessage = { sender: 'ai', text: 'Sorry, I ran into an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
      console.error("Error fetching AI response:", error);
    } finally {
      // Reset loading state
      setIsLoading(false);
    }
  };

  // Handle key press for sending with 'Enter'
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="app-container">
      <div className="chat-window">
        <div className="messages-list">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}>
              {msg.text}
            </div>
          ))}
          {/* Show loading indicator when AI is thinking */}
          {isLoading && <div className="message ai-message loading-indicator">Thinking...</div>}
          {/* Dummy div to help with auto-scrolling */}
          <div ref={messagesEndRef} />
        </div>
        <div className="input-form">
          <input
            type="text"
            className="input-field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about the Apollo program..."
            disabled={isLoading}
          />
          <button className="send-button" onClick={handleSend} disabled={isLoading}>
            <FiSend />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;