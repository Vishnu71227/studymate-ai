
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

const API_URL = "http://127.0.0.1:5000";

function App() {
  // Authentication States
  const [authUser, setAuthUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Chat States
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isPdfUploaded, setIsPdfUploaded] = useState(false);

  // Share Chat States
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState("");

  // Shared Conversation States
  const [sharedChat, setSharedChat] = useState(null);
  const [isLoadingSharedChat, setIsLoadingSharedChat] = useState(false);
  const [sharedChatError, setSharedChatError] = useState("");

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! 👋 I'm your AI Study Assistant. Upload a PDF and ask me anything about its content.",
    },
  ]);

  // References
  const chatAreaRef = useRef(null);
  const inputRef = useRef(null);

  // Check Flask Session on App Load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(`${API_URL}/api/me`, {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setAuthUser(data.user);
        } else {
          setAuthUser(null);
        }
      } catch (error) {
        console.error("Session Check Error:", error);
        setAuthUser(null);
      } finally {
        setAuthChecked(true);
      }
    };

    checkSession();
  }, []);

  // Automatically scroll to latest message
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTo({
        top: chatAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Load Shared Conversation from URL
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/shared\/([a-f0-9]{32})$/);

    if (!match) return;

    const shareId = match[1];

    const fetchSharedChat = async () => {
      try {
        setIsLoadingSharedChat(true);
        setSharedChatError("");

        const response = await fetch(
          `${API_URL}/api/share/${shareId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Shared conversation not found"
          );
        }

        setSharedChat(data.messages);
      } catch (error) {
        console.error("Shared Chat Error:", error);
        setSharedChatError(error.message);
      } finally {
        setIsLoadingSharedChat(false);
      }
    };

    fetchSharedChat();
  }, []);

  // Authentication: Login
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!authEmail.trim() || !authPassword) {
      setAuthMessage("Please enter your email and password.");
      return;
    }

    try {
      setAuthLoading(true);
      setAuthMessage("");

      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: authEmail.trim().toLowerCase(),
          password: authPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Login failed.");
      }

      setAuthUser(data.user);
      setAuthPassword("");
      setAuthMessage("");
    } catch (error) {
      setAuthMessage(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Authentication: Signup
  const handleSignup = async (e) => {
    e.preventDefault();

    if (authPassword.length < 8) {
      setAuthMessage("Password must contain at least 8 characters.");
      return;
    }

    if (authPassword !== confirmPassword) {
      setAuthMessage("Passwords do not match.");
      return;
    }

    try {
      setAuthLoading(true);
      setAuthMessage("");

      const response = await fetch(`${API_URL}/api/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: authName.trim(),
          email: authEmail.trim().toLowerCase(),
          password: authPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Signup failed.");
      }

      setAuthMode("login");
      setAuthPassword("");
      setConfirmPassword("");
      setAuthMessage(
        "Account created successfully! Please log in."
      );
    } catch (error) {
      setAuthMessage(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout - Clear Flask Session
  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout Error:", error);
    } finally {
      setAuthUser(null);

      setAuthMode("login");
      setAuthEmail("");
      setAuthPassword("");
      setConfirmPassword("");
      setAuthMessage("");

      setMessages([
        {
          role: "assistant",
          content:
            "Hello! 👋 I'm your AI Study Assistant. Upload a PDF and ask me anything about its content.",
        },
      ]);

      setSelectedFile(null);
      setUploadStatus("");
      setIsPdfUploaded(false);
      setShareStatus("");
    }
  };

  // Focus input
  const focusInput = () => {
    inputRef.current?.focus();
  };

  // Handle PDF Selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      alert("Please select a valid PDF file!");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setIsPdfUploaded(false);
    setUploadStatus("");
  };

  // Upload PDF to Flask Backend
  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a PDF first!");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setIsUploading(true);
      setIsPdfUploaded(false);
      setUploadStatus("Uploading and processing PDF...");

      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "PDF upload failed");
      }

      setIsPdfUploaded(true);

      setUploadStatus(
        `Successfully uploaded! ${data.total_pages} pages and ${data.total_chunks} chunks processed.`
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Your PDF "${data.filename}" has been successfully processed! It contains ${data.total_pages} pages and ${data.total_chunks} text chunks. You can now ask questions about this document.`,
        },
      ]);

      focusInput();
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle SSE Chat Streaming
  const handleSend = async () => {
    if (!message.trim() || isThinking) return;

    const question = message.trim();

    setMessage("");
    focusInput();

    if (!isPdfUploaded) {
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: question,
        },
        {
          role: "assistant",
          content:
            "Please upload and process a PDF before asking questions.",
        },
      ]);

      return;
    }

    setIsThinking(true);

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: question,
      },
      {
        role: "assistant",
        content: "",
      },
    ]);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Something went wrong");
      }

      if (!response.body) {
        throw new Error("Streaming is not supported by this browser.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let buffer = "";

      // Process each SSE event
      const processEvent = (event) => {
        const dataLine = event
          .split(/\r?\n/)
          .find((line) => line.startsWith("data:"));

        if (!dataLine) return;

        const jsonData = JSON.parse(dataLine.slice(5).trim());

        if (jsonData.error) {
          throw new Error(jsonData.error);
        }

        if (jsonData.chunk) {
          setMessages((prev) => {
            const updatedMessages = [...prev];
            const lastIndex = updatedMessages.length - 1;

            updatedMessages[lastIndex] = {
              ...updatedMessages[lastIndex],
              content:
                updatedMessages[lastIndex].content +
                jsonData.chunk,
            };

            return updatedMessages;
          });
        }
      };

      // Read incoming stream
      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, {
          stream: true,
        });

        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || "";

        for (const event of events) {
          processEvent(event);
        }
      }

      buffer += decoder.decode();

      if (buffer.trim()) {
        processEvent(buffer);
      }
    } catch (error) {
      console.error("Streaming error:", error);

      setMessages((prev) => {
        const updatedMessages = [...prev];
        const lastIndex = updatedMessages.length - 1;

        updatedMessages[lastIndex] = {
          ...updatedMessages[lastIndex],
          content: `Sorry, something went wrong: ${error.message}`,
        };

        return updatedMessages;
      });
    } finally {
      setIsThinking(false);
      focusInput();
    }
  };

  // Share Current Chat
  const handleShareChat = async () => {
    if (isSharing || isThinking) return;

    if (messages.length <= 1) {
      setShareStatus("Start a conversation before sharing.");
      return;
    }

    try {
      setIsSharing(true);
      setShareStatus("Creating share link...");

      const response = await fetch(`${API_URL}/api/share`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create share link");
      }

      const shareUrl = `${window.location.origin}${data.share_url}`;

      await navigator.clipboard.writeText(shareUrl);

      setShareStatus("Share link copied successfully!");
    } catch (error) {
      console.error("Share Chat Error:", error);
      setShareStatus(`Sharing failed: ${error.message}`);
    } finally {
      setIsSharing(false);
    }
  };

  // Start New Chat
  const handleNewChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Hello! 👋 I'm your AI Study Assistant. Upload a PDF and ask me anything about its content.",
      },
    ]);

    setMessage("");
    setShareStatus("");
    setSelectedFile(null);
    setUploadStatus("");
    setIsPdfUploaded(false);
    focusInput();
  };

  // Shared Conversation Page
  if (window.location.pathname.startsWith("/shared/")) {
    return (
      <div className="app-container">
        <main className="main-content">
          <header className="topbar">
            <div>
              <h3>StudyMate AI</h3>
              <p>Shared Conversation</p>
            </div>

            <div className="status">
              <span className="status-dot"></span>
              Read Only
            </div>
          </header>

          <section className="chat-area">
            <div className="welcome-section">
              <div className="welcome-icon">✦</div>
              <h1>Shared Study Conversation</h1>
              <p>
                Someone shared this AI study conversation with you.
              </p>
            </div>

            {isLoadingSharedChat && (
              <p style={{ textAlign: "center" }}>
                Loading conversation...
              </p>
            )}

            {sharedChatError && (
              <p style={{ textAlign: "center", color: "red" }}>
                {sharedChatError}
              </p>
            )}

            {sharedChat && (
              <div className="messages">
                {sharedChat.map((msg, index) => (
                  <div
                    key={index}
                    className={`message-row ${msg.role}`}
                  >
                    <div className="message-avatar">
                      {msg.role === "assistant" ? "✦" : "V"}
                    </div>

                    <div className="message-content">
                      <span>
                        {msg.role === "assistant"
                          ? "StudyMate AI"
                          : "User"}
                      </span>

                      <div className="markdown-content">
                        {msg.role === "assistant" ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          <p>{msg.content}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <footer className="input-section">
            <p className="input-disclaimer">
              This is a read-only shared conversation.
            </p>
          </footer>
        </main>
      </div>
    );
  }

  // Wait until Flask session is checked
  if (!authChecked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f5ff",
          color: "#7045d6",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Checking login session...
      </div>
    );
  }

  // Login and Signup Page
  if (!authUser) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "25px",
          background: "#f7f5ff",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "430px",
            background: "#ffffff",
            padding: "38px",
            borderRadius: "18px",
            boxShadow: "0 12px 45px rgba(80, 50, 150, 0.10)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div
              style={{
                width: "55px",
                height: "55px",
                borderRadius: "15px",
                background: "#7045d6",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "30px",
                margin: "0 auto 14px",
              }}
            >
              ✦
            </div>

            <h1
              style={{
                fontSize: "27px",
                color: "#29213d",
                margin: "0 0 9px",
              }}
            >
              StudyMate AI
            </h1>

            <p style={{ color: "#77718a", fontSize: "14px", margin: 0 }}>
              Your personal AI-powered PDF study assistant
            </p>
          </div>

          <div
            style={{
              display: "flex",
              background: "#f3efff",
              borderRadius: "10px",
              padding: "5px",
              marginBottom: "25px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthMessage("");
              }}
              style={{
                flex: 1,
                padding: "11px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                background:
                  authMode === "login" ? "#7045d6" : "transparent",
                color: authMode === "login" ? "#fff" : "#665b80",
              }}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setAuthMessage("");
              }}
              style={{
                flex: 1,
                padding: "11px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                background:
                  authMode === "signup" ? "#7045d6" : "transparent",
                color: authMode === "signup" ? "#fff" : "#665b80",
              }}
            >
              Sign Up
            </button>
          </div>

          <h2
            style={{
              fontSize: "21px",
              color: "#302747",
              marginBottom: "7px",
            }}
          >
            {authMode === "login" ? "Welcome back!" : "Create your account"}
          </h2>

          <p
            style={{
              color: "#888196",
              fontSize: "13px",
              marginBottom: "23px",
            }}
          >
            {authMode === "login"
              ? "Login to continue learning with StudyMate AI."
              : "Sign up to get started with StudyMate AI."}
          </p>

          <form
            onSubmit={
              authMode === "login" ? handleLogin : handleSignup
            }
          >
            {authMode === "signup" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={authLabelStyle}>Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  required
                  maxLength={100}
                  style={authInputStyle}
                />
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label style={authLabelStyle}>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
                style={authInputStyle}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={authLabelStyle}>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                minLength={8}
                style={authInputStyle}
              />
            </div>

            {authMode === "signup" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={authLabelStyle}>Confirm Password</label>
                <input
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  style={authInputStyle}
                />
              </div>
            )}

            {authMessage && (
              <p
                style={{
                  color: authMessage.toLowerCase().includes("success")
                    ? "#16834a"
                    : "#d33b48",
                  background: authMessage.toLowerCase().includes("success")
                    ? "#eaf8ef"
                    : "#fff0f0",
                  padding: "11px",
                  borderRadius: "7px",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                {authMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              style={{
                width: "100%",
                padding: "13px",
                background: "#7045d6",
                color: "#ffffff",
                border: "none",
                borderRadius: "9px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: authLoading ? "not-allowed" : "pointer",
                opacity: authLoading ? 0.7 : 1,
                marginTop: "5px",
              }}
            >
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                  ? "Login to StudyMate AI"
                  : "Create Account"}
            </button>
          </form>

          <p
            style={{
              textAlign: "center",
              color: "#91899f",
              fontSize: "12px",
              marginTop: "24px",
              marginBottom: 0,
            }}
          >
            AI-powered learning made easier ✦
          </p>
        </div>
      </div>
    );
  }

  // Original Chat Assistant Page
  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">✦</div>
          <h2>StudyMate AI</h2>
        </div>

        <button className="new-chat" onClick={handleNewChat}>
          + New Chat
        </button>

        <div className="sidebar-section">
          <p className="section-title">YOUR WORKSPACE</p>

          <button className="sidebar-item active">
            <span>💬</span> Chat Assistant
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">
              {authUser.name?.charAt(0).toUpperCase() || "U"}
            </div>

            <div>
              <h4>{authUser.name}</h4>
              <p>My Workspace</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              marginTop: "12px",
              padding: "9px",
              border: "1px solid #e3dcef",
              borderRadius: "8px",
              background: "#fff",
              color: "#7045d6",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="main-content">
        {/* Header */}
        <header className="topbar">
          <div>
            <h3>Chat Assistant</h3>
            <p>Ask questions from your study documents</p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
            }}
          >
            {/* Share Chat Button */}
            <button
              onClick={handleShareChat}
              disabled={isSharing || isThinking}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                cursor:
                  isSharing || isThinking ? "not-allowed" : "pointer",
                opacity: isSharing || isThinking ? 0.6 : 1,
              }}
            >
              {isSharing ? "Sharing..." : "↗ Share Chat"}
            </button>

            <div className="status">
              <span className="status-dot"></span>
              AI Assistant
            </div>
          </div>
        </header>

        {/* Share Status */}
        {shareStatus && (
          <p
            style={{
              fontSize: "12px",
              textAlign: "right",
              paddingRight: "20px",
              margin: "5px 0",
            }}
          >
            {shareStatus}
          </p>
        )}

        {/* Chat Area */}
        <section className="chat-area" ref={chatAreaRef}>
          <div className="welcome-section">
            <div className="welcome-icon">✦</div>
            <h1>What would you like to learn today?</h1>
            <p>
              Upload your PDF, ask questions, and understand
              complex topics with AI.
            </p>
          </div>

          {/* Messages */}
          <div className="messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message-row ${msg.role}`}
              >
                <div className="message-avatar">
                  {msg.role === "assistant" ? "✦" : "V"}
                </div>

                <div className="message-content">
                  <span>
                    {msg.role === "assistant"
                      ? "StudyMate AI"
                      : "You"}
                  </span>

                  <div className="markdown-content">
                    {msg.role === "assistant" ? (
                      msg.content ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <p>Thinking...</p>
                      )
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Input Area */}
        <footer className="input-section">
          <div className="chat-input-box">
            {/* PDF Upload */}
            <label className="upload-button" title="Upload PDF">
              📎
              <input
                type="file"
                accept=".pdf,application/pdf"
                hidden
                onChange={handleFileChange}
              />
            </label>

            {/* Message Input */}
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask anything about your PDF..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            {/* Send Button */}
            <button
              className="send-button"
              onClick={handleSend}
              disabled={isThinking || !message.trim()}
            >
              {isThinking ? "..." : "↑"}
            </button>
          </div>

          {/* Selected PDF */}
          {selectedFile && (
            <div className="selected-file">
              <p>📄 Selected: {selectedFile.name}</p>

              <button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? "Uploading..." : "Upload PDF"}
              </button>
            </div>
          )}

          {/* Upload Status */}
          {uploadStatus && (
            <p style={{ fontSize: "12px", marginTop: "8px" }}>
              {uploadStatus}
            </p>
          )}

          <p className="input-disclaimer">
            AI can make mistakes. Verify important information
            from your source document.
          </p>
        </footer>
      </main>
    </div>
  );
}

// Login and Signup input styles
const authLabelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "600",
  color: "#403751",
  marginBottom: "8px",
};

const authInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  border: "1px solid #e2ddec",
  borderRadius: "8px",
  outline: "none",
  fontSize: "14px",
  color: "#302747",
  background: "#ffffff",
};

export default App;
