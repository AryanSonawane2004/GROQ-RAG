import Groq from "groq-sdk";

interface ChatRequestPayload {
  question: string;
  history?: Array<{ role: string; content: string }>;
  api_key: string;
  citations?: Array<{
    document_name: string;
    chunk_index: number;
    content: string;
  }>;
}

export const handler = async (event: any, context: any) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const body: ChatRequestPayload = JSON.parse(event.body || "{}");
    const { question, api_key, citations = [] } = body;

    if (!api_key) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Groq API key is required (BYOK architecture).",
        }),
      };
    }

    if (!question) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Question cannot be empty." }),
      };
    }

    const contextStr = citations
      .map(
        (c) =>
          `--- Document: ${c.document_name} (Chunk ${c.chunk_index}) ---\n${c.content}`
      )
      .join("\n\n");

    const systemPrompt = `You are an intelligent, articulate assistant answering questions using document context.
Instructions:
1. Answer the user's question directly, clearly, and conversationally.
2. Present key points, types, and comparisons using clear section headings (###) and clean bullet points (-).
3. Do NOT put multi-line bullet lists inside markdown tables.
4. Bold key terms for easy scanning.
5. If the context does not contain the answer, say: 'Based on the provided documents, I don't have enough information to answer that.'`;

    const userContent = contextStr
      ? `Context Excerpts:\n${contextStr}\n\nUser Question:\n${question}`
      : `User Question:\n${question}`;

    const groq = new Groq({ apiKey: api_key });

    const chatCompletion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    });

    const answer =
      chatCompletion.choices[0]?.message?.content?.trim() ||
      "No response generated.";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        answer,
        citations,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: `Groq execution error: ${err.message || String(err)}`,
      }),
    };
  }
};