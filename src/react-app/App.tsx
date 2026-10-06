import { useState } from "react";
import "./App.css";

type Message = {
	role: "user" | "assistant";
	content: string;
};

function App() {
	const [messages, setMessages] = useState<Message[]>([
		{
			role: "assistant",
			content:
				"Hello! 👋 How can I help you today?",
		},
	]);

	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const sendMessage = async () => {
		const message = input.trim();

		if (!message || isLoading) return;

		const userMessage: Message = {
			role: "user",
			content: message,
		};

		setMessages((current) => [...current, userMessage]);
		setInput("");
		setIsLoading(true);

		try {
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					messages: [...messages, userMessage],
				}),
			});

			if (!response.ok) {
				throw new Error("Request failed");
			}

			const data = await response.json();

			const assistantMessage: Message = {
				role: "assistant",
				content:
					data?.response ??
					data?.message ??
					data?.content ??
					"Sorry, I couldn't generate a response.",
			};

			setMessages((current) => [...current, assistantMessage]);
		} catch {
			setMessages((current) => [
				...current,
				{
					role: "assistant",
					content:
						"Sorry, something went wrong. Please try again.",
				},
			]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleKeyDown = (
		event: React.KeyboardEvent<HTMLTextAreaElement>,
	) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	};

	return (
		<div className="chat-app">
			<header className="chat-header">
				<div className="assistant-info">
					<div className="assistant-avatar">AI</div>

					<div>
						<h1>AI Assistant</h1>
						<span>
							<span className="online-dot" />
							Online
						</span>
					</div>
				</div>

				<button
					className="new-chat-button"
					type="button"
					onClick={() =>
						setMessages([
							{
								role: "assistant",
								content:
									"Hello! 👋 How can I help you today?",
							},
						])
					}
					aria-label="Start a new chat"
				>
					＋
				</button>
			</header>

			<main className="chat-container">
				<div className="messages">
					{messages.map((message, index) => (
						<div
							key={`${message.role}-${index}`}
							className={`message-row ${message.role}`}
						>
							<div className="message-bubble">
								{message.content}
							</div>
						</div>
					))}

					{isLoading && (
						<div className="message-row assistant">
							<div className="message-bubble typing">
								<span />
								<span />
								<span />
							</div>
						</div>
					)}
				</div>
			</main>

			<footer className="chat-input-area">
				<div className="input-wrapper">
					<textarea
						value={input}
						onChange={(event) => setInput(event.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Message AI Assistant..."
						rows={1}
						disabled={isLoading}
						aria-label="Message"
					/>

					<button
						type="button"
						className="send-button"
						onClick={sendMessage}
						disabled={!input.trim() || isLoading}
						aria-label="Send message"
					>
						➤
					</button>
				</div>

				<p className="input-hint">
					AI can make mistakes. Check important information.
				</p>
			</footer>
		</div>
	);
}

export default App;