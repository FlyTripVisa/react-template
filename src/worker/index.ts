import { Hono } from "hono";

type Bindings = {
	AI: Ai;
};

type ChatMessage = {
	role: "system" | "user" | "assistant";
	content: string;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * Health check
 */
app.get("/api/health", (c) => {
	return c.json({
		ok: true,
		service: "FLYTRIPVISA AI",
		status: "online",
		time: new Date().toISOString(),
	});
});

/**
 * Basic API test
 */
app.get("/api/", (c) => {
	return c.json({
		name: "FLYTRIPVISA AI",
		status: "online",
	});
});

/**
 * AI Chat API
 *
 * POST /api/chat
 *
 * Body:
 * {
 *   "messages": [
 *     {
 *       "role": "user",
 *       "content": "Hello"
 *     }
 *   ]
 * }
 */
app.post("/api/chat", async (c) => {
	try {
		const body = await c.req.json<{
			messages?: ChatMessage[];
		}>();

		if (!body.messages || !Array.isArray(body.messages)) {
			return c.json(
				{
					error: "messages array is required",
				},
				400,
			);
		}

		const messages = body.messages
			.filter(
				(message) =>
					message &&
					["system", "user", "assistant"].includes(message.role) &&
					typeof message.content === "string",
			)
			.map((message) => ({
				role: message.role,
				content: message.content.trim(),
			}))
			.filter((message) => message.content.length > 0);

		if (messages.length === 0) {
			return c.json(
				{
					error: "At least one valid message is required",
				},
				400,
			);
		}

		/**
		 * System instruction for FLYTRIPVISA AI
		 */
		const systemMessage: ChatMessage = {
			role: "system",
			content: `
You are FLYTRIPVISA AI, a helpful travel and visa assistant.

Your responsibilities:
- Help users with travel and visa-related questions.
- Explain visa requirements clearly.
- Help users understand travel documents and application processes.
- Provide flight, hotel, destination and travel-planning guidance.
- Be concise, friendly and professional.
- Never claim that a visa is guaranteed.
- If information may have changed, clearly tell the user that they should verify the latest official requirements.
- Do not invent government requirements, fees, processing times or immigration rules.

Always answer in the same language as the user's latest message when practical.
			`.trim(),
		};

		/**
		 * Prevent duplicate system messages.
		 */
		const modelMessages: ChatMessage[] = [
			systemMessage,
			...messages.filter((message) => message.role !== "system"),
		];

		/**
		 * Workers AI model.
		 *
		 * You can change this model later without changing
		 * the frontend API.
		 */
		const model = "@cf/meta/llama-3.1-8b-instruct";

		/**
		 * Streaming Workers AI response.
		 */
		const result = await c.env.AI.run(model, {
			messages: modelMessages,
			stream: true,
		});

		return new Response(result as ReadableStream, {
			headers: {
				"Content-Type": "text/event-stream; charset=utf-8",
				"Cache-Control": "no-cache, no-transform",
				"Connection": "keep-alive",
				"X-Accel-Buffering": "no",
			},
		});
	} catch (error) {
		console.error("AI chat error:", error);

		return c.json(
			{
				error: "Unable to process the AI request",
				message:
					error instanceof Error
						? error.message
						: "Unknown error",
			},
			500,
		);
	}
});

/**
 * CORS
 */
app.options("*", (c) => {
	return new Response(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
});

export default app;