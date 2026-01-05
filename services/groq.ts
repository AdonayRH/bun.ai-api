import { Groq } from 'groq-sdk';
import type { AIService, ChatMessage } from '../types';
import { ATOMIC_DESIGN_PROMPT, POLICY } from './prompts';

const groq = new Groq();

export const groqService: AIService = {
    name: 'Groq',
    async chat(messages: ChatMessage[]) {
        const chatCompletion = await groq.chat.completions.create({
            messages: (function () {
                const systemInstructions = [ATOMIC_DESIGN_PROMPT, POLICY].join('\n\n');
                if (messages[0]?.role === 'system') {
                    return [
                        { role: 'system', content: systemInstructions + "\n\n" + messages[0].content },
                        ...messages.slice(1)
                    ];
                } else {
                    return [
                        { role: 'system', content: systemInstructions },
                        ...messages
                    ];
                }
            })(),
            "model": "moonshotai/kimi-k2-instruct-0905",
            "temperature": 0.6,
            "max_completion_tokens": 4096,
            "top_p": 1,
            "stream": true,
            "stop": null
        });
        return (async function* () {
            for await (const chunk of chatCompletion) {
                yield chunk.choices[0]?.delta?.content || '';
            }
        })()
    }
}

