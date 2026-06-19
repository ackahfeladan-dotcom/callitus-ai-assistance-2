import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: 'You are an advanced, hyper-capable AI assistant specialized in solving complex problems step-by-step.',
      messages,
    });

    return Response.json({ text: result.text });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to process AI response' }, { status: 500 });
  }
}