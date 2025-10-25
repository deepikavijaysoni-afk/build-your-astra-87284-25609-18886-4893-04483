export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

class OpenRouterService {
  private apiKey = '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';
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private model = 'z-ai/glm-4.5-air:free';

  async generateCode(prompt: string): Promise<string> {
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: `You are an expert web developer. When generating code, follow this STRICT format:

1. **FIRST**: Write your explanation, features list, and usage guidance using markdown (### Features, ### Usage, etc.)
2. **THEN**: Write the code files using this exact format:

### FILE: path/to/file.ext
\`\`\`language
// Clean code ONLY - NO explanatory comments or documentation
\`\`\`

Design Guidelines:
For all designs you create, make them beautiful and production-worthy, not cookie cutter. This template supports JSX syntax with Tailwind CSS classes, React hooks, and Lucide React for icons. Do not install other packages for UI themes, icons, etc unless absolutely necessary.

CRITICAL FORMAT RULES:
- Your explanation/features MUST come BEFORE any ### FILE: markers
- Do NOT include any code (no code fences or snippets) in the explanation section
- Code blocks must contain ONLY functional code
- NO feature lists, documentation, or explanatory comments in code
- Keep code clean, focused, and production-ready
- Use proper error handling and modern practices
- Use Tailwind CSS for styling and Lucide React icons
- Make all designs responsive and beautiful`
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    return this.chat(messages);
  }

  async chat(messages: OpenRouterMessage[]): Promise<string> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'ASTRA.DEV'
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          max_tokens: 120000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenRouter API error:', response.status, errorData);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw new Error('Failed to communicate with AI service. Please try again.');
    }
  }
}

export const openRouterService = new OpenRouterService();
