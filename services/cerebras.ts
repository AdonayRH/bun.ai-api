import Cerebras from '@cerebras/cerebras_cloud_sdk';
import type { AIService, ChatMessage, CerebrasStreamChunk } from '../types';
import { ATOMIC_DESIGN_PROMPT, POLICY } from './prompts';

const cerebras = new Cerebras({});

export const cerebrasService: AIService = {
    name: 'cerebras',
    async chat(messages: ChatMessage[]) {
        const stream = await cerebras.chat.completions.create({
            messages: (function () {
                const systemInstructions = [ATOMIC_DESIGN_PROMPT, POLICY].join('\n\n');
                if (messages[0]?.role === 'system') {
                    return [
                        { role: 'system', content: systemInstructions + "\n\n" + messages[0].content },
                        ...messages.slice(1).map((message) => ({
                            role: message.role,
                            content: message.content,
                        }))
                    ];
                } else {
                    return [
                        { role: 'system', content: systemInstructions },
                        ...messages.map((message) => ({
                            role: message.role,
                            content: message.content,
                        }))
                    ];
                }
            })(),
            model: 'zai-glm-4.6',
            stream: true,
            max_completion_tokens: 40960,
            temperature: 0.6,
            top_p: 0.95
        });

        return (async function* () {
            for await (const chunk of stream as AsyncIterable<CerebrasStreamChunk>) {
                yield chunk.choices[0]?.delta?.content || '';
            }
        })()
    }
}
