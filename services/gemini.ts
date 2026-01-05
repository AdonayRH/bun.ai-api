import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIService, ChatMessage } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel(
    { model: "gemini-1.5-flash" },
    { apiVersion: 'v1' }
);

export const geminiService: AIService = {
    name: 'gemini',
    async chat(messages: ChatMessage[]) {
        const contents = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const result = await model.generateContentStream({
            contents,
            generationConfig: {
                temperature: 0.6,
                topP: 0.95,
                maxOutputTokens: 8192,
            },
        });

        return (async function* () {
            for await (const chunk of result.stream) {
                yield chunk.text();
            }
        })();
    }
}