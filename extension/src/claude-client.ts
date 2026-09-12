import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { Abstraction, AbstractionBlock, AbstractionRelationship } from './types/abstraction';
import { ParserOutput } from './types/ast';

/**
 * HTTP client for Claude API Messages endpoint.
 * Handles abstraction inference by sending AST to Claude.
 */
export class ClaudeClient {
	private apiKey: string;
	private apiBaseUrl = 'https://api.anthropic.com/v1';
	private model = 'claude-3-5-sonnet-20241022';

	constructor(apiKey: string) {
		if (!apiKey || apiKey.trim().length === 0) {
			throw new Error('Claude API key is required');
		}
		this.apiKey = apiKey;
	}

	/**
	 * Infers high-level abstraction from complex AST.
	 * Sends AST to Claude and receives simplified block-level representation.
	 * @param ast The parser output (AST) to simplify
	 * @returns Abstraction with high-level blocks and relationships
	 */
	async inferAbstraction(ast: ParserOutput): Promise<Abstraction> {
		const prompt = this.buildPrompt(ast);

		try {
			const response = await this.callClaudeAPI(prompt);
			const abstraction = this.parseClaudeResponse(response, ast);
			return abstraction;
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to infer abstraction: ${errorMsg}`);
		}
	}

	/**
	 * Builds the prompt to send to Claude for abstraction inference.
	 */
	private buildPrompt(ast: ParserOutput): string {
		const astJson = JSON.stringify(ast, null, 2);

		return `You are an expert hardware design analyst. I have a SystemVerilog hardware design that has been parsed into an AST (Abstract Syntax Tree). Your task is to analyze this complex logic and infer high-level abstraction blocks.

Analyze the following AST and identify:
1. High-level functional blocks (e.g., controller, datapath, state machine, FIFO)
2. The purpose/functionality of each block
3. How blocks interact with each other
4. Key inputs and outputs

Respond ONLY with a valid JSON object (no markdown, no explanation) matching this schema:
{
  "name": "Abstraction name",
  "description": "Overall description of what this logic does",
  "blocks": [
    {
      "id": "block_id",
      "label": "Block name",
      "blockType": "controller|datapath|state_machine|etc",
      "description": "What this block does",
      "inputs": ["signal1", "signal2"],
      "outputs": ["signal3"]
    }
  ],
  "relationships": [
    {
      "from": "block_id1",
      "to": "block_id2",
      "label": "signal_name",
      "type": "data|control|clock"
    }
  ],
  "confidence": 0.85,
  "reasoning": "Explain why you identified these blocks and relationships"
}

AST to analyze:
${astJson}`;
	}

	/**
	 * Makes HTTP POST request to Claude API.
	 */
	private async callClaudeAPI(prompt: string): Promise<string> {
		const url = `${this.apiBaseUrl}/messages`;

		const body = {
			model: this.model,
			max_tokens: 2048,
			messages: [
				{
					role: 'user',
					content: prompt,
				},
			],
		};

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': this.apiKey,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorData = await response.text();
			throw new Error(
				`Claude API error (${response.status}): ${errorData}`
			);
		}

		const data = await response.json() as { content: { type: string; text: string }[] };
		const textContent = data.content.find((c) => c.type === 'text');
		if (!textContent) {
			throw new Error('No text content in Claude response');
		}

		return textContent.text;
	}

	/**
	 * Parses Claude's JSON response into Abstraction object.
	 */
	private parseClaudeResponse(
		response: string,
		ast: ParserOutput
	): Abstraction {
		try {
			// Claude might wrap response in markdown code blocks, strip them
			const jsonStr = response
				.replace(/^```json\s*/i, '')
				.replace(/\s*```$/i, '')
				.trim();

			const parsed = JSON.parse(jsonStr) as Abstraction;

			// Validate required fields
			if (!parsed.name || !parsed.description || !Array.isArray(parsed.blocks)) {
				throw new Error('Invalid abstraction format from Claude');
			}

			// Ensure confidence is within 0-1
			if (typeof parsed.confidence !== 'number') {
				parsed.confidence = 0.75;
			}
			parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

			// Set source node IDs from AST
			const sourceNodeIds: string[] = [];
			if (ast.module) {
				ast.module.ports?.forEach((p) => sourceNodeIds.push(p.name));
				ast.module.signals?.forEach((s) => sourceNodeIds.push(s.name));
				ast.module.instances?.forEach((i) => sourceNodeIds.push(i.instanceName));
			}
			parsed.sourceNodeIds = sourceNodeIds;

			return parsed;
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			throw new Error(
				`Failed to parse Claude response as JSON: ${errorMsg}\n\nResponse: ${response}`
			);
		}
	}
}
