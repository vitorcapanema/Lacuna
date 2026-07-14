import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

// Proxy do simulador para a API da Anthropic. A chave fica SÓ no servidor —
// o navegador nunca fala direto com api.anthropic.com.
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
const MAX_TOKENS_CAP = 2000;

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY não configurada no servidor.' },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const messages = body?.messages;
  const maxTokens = Math.min(
    Number.isInteger(body?.max_tokens) && body.max_tokens > 0
      ? body.max_tokens
      : 1000,
    MAX_TOKENS_CAP
  );

  const valid =
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.length <= 10 &&
    messages.every(
      (m: IncomingMessage) =>
        (m?.role === 'user' || m?.role === 'assistant') &&
        typeof m?.content === 'string' &&
        m.content.length <= 50_000
    );
  if (!valid) {
    return NextResponse.json(
      { error: 'messages inválido: array de {role, content} obrigatório.' },
      { status: 400 }
    );
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      messages: messages as IncomingMessage[],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    return NextResponse.json({ text });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: 'Limite de requisições atingido — aguarde um instante e tente de novo.' },
        { status: 429 }
      );
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: 'Chave da API inválida no servidor.' },
        { status: 500 }
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API da Anthropic retornou ${error.status}: ${error.message}` },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: 'Falha de rede ao chamar a API da Anthropic.' },
      { status: 502 }
    );
  }
}
