import { AIChatAgent } from "@cloudflare/ai-chat";
import { routeAgentRequest } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import {
	streamText,
	convertToModelMessages,
	pruneMessages,
	tool,
	stepCountIs,
} from "ai";
import { z } from "zod";

export class ChatAgent extends AIChatAgent {
	async onChatMessage() {
		const workersai = createWorkersAI({
			binding: this.env.AI,
		});

		const result = streamText({
			model: workersai(
				"@cf/meta/llama-4-scout-17b-16e-instruct",
			),

			system: `
You are FLYTRIPVISA AI, an intelligent travel and visa assistant.

Your job is to help users with:
- Visa information
- Travel planning
- Flight information
- Hotel information
- Destinations
- Travel documents
- Visa application guidance
- General immigration and travel questions

Rules:
- Be helpful, professional and concise.
- Answer in the same language as the user whenever possible.
- Never guarantee visa approval.
- Never invent visa requirements, fees or government policies.
- If information may have changed, tell the user to verify it with the relevant official authority.
- Clearly distinguish general guidance from official immigration advice.
			`.trim(),

			messages: pruneMessages({
				messages: await convertToModelMessages(this.messages),
				toolCalls: "before-last-2-messages",
			}),

			tools: {
				getUserTimezone: tool({
					description:
						"Get the user's timezone and local time from their browser.",
					inputSchema: z.object({}),
				}),

				calculate: tool({
					description:
						"Perform a mathematical calculation.",
					inputSchema: z.object({
						a: z.coerce
							.number()
							.describe("First number"),

						b: z.coerce
							.number()
							.describe("Second number"),

						operator: z
							.enum(["+", "-", "*", "/", "%"])
							.describe("Arithmetic operator"),
					}),

					needsApproval: async ({ a, b }) =>
						Math.abs(a) > 1000 || Math.abs(b) > 1000,

					execute: async ({
						a,
						b,
						operator,
					}) => {
						if (operator === "/" && b === 0) {
							return {
								error: "Division by zero",
							};
						}

						const operations: Record<
							string,
							(x: number, y: number) => number
						> = {
							"+": (x, y) => x + y,
							"-": (x, y) => x - y,
							"*": (x, y) => x * y,
							"/": (x, y) => x / y,
							"%": (x, y) => x % y,
						};

						return {
							expression: `${a} ${operator} ${b}`,
							result: operations[operator](a, b),
						};
					},
				}),
			},

			stopWhen: stepCountIs(5),
		});

		return result.toUIMessageStreamResponse();
	}
}

export default {
	async fetch(request: Request, env: Env) {
		return (
			(await routeAgentRequest(request, env)) ||
			new Response("Not found", {
				status: 404,
			})
		);
	},
} satisfies ExportedHandler<Env>;