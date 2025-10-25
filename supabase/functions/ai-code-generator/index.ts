import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert web developer. When generating code, follow this STRICT format:

1. **FIRST**: Write your explanation, features list, and usage guidance using markdown (### Features, ### Usage, etc.)
2. **THEN**: Write ALL necessary files using this exact format:

### FILE: path/to/file.ext
\`\`\`language
// Clean code ONLY - NO explanatory comments or documentation
\`\`\`

MANDATORY FILES YOU MUST ALWAYS CREATE:
1. **index.html** - The main HTML file with proper structure, linking to CSS and JS
2. **style.css** - All styling (use Tailwind CDN if needed or custom CSS)
3. **script.js** - All JavaScript/app logic
4. **netlify.toml** - Netlify configuration for deployment

FILE STRUCTURE RULES:
- ALWAYS create a complete, working application with ALL files needed
- NEVER create just one file - create the full set (HTML, CSS, JS minimum)
- HTML file MUST include proper DOCTYPE, head, body tags
- CSS file MUST contain all styles needed for the design
- JS file MUST contain all interactive functionality
- Include netlify.toml with proper redirects configuration

DESIGN PHILOSOPHY - CRITICAL:
For all designs, make them BEAUTIFUL and PRODUCTION-WORTHY, not cookie cutter. Create webpages that are fully featured and worthy for production.

- Use Tailwind CSS CDN for styling (include in HTML head)
- Use Lucide icons via CDN (https://unpkg.com/lucide@latest) for all icons including logos
- Use vanilla JavaScript with modern ES6+ features
- Make all designs fully responsive and mobile-first
- Add smooth animations and transitions (use CSS transitions/animations)
- Use modern UI patterns (gradients, shadows, hover effects, micro-interactions)
- Create visually stunning designs with great typography and spacing
- Use beautiful color schemes and professional layouts

CRITICAL FORMAT RULES:
- Your explanation/features MUST come BEFORE any ### FILE: markers
- Do NOT include any code (no code fences or snippets) in the explanation section
- Code blocks must contain ONLY functional code
- NO feature lists, documentation, or explanatory comments in code
- Keep code clean, focused, and production-ready
- ALWAYS generate ALL files needed for a complete working app

NETLIFY.TOML TEMPLATE:
\`\`\`toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
\`\`\``;


    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: false,
        max_tokens: 120000
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response format from AI");
    }

    return new Response(
      JSON.stringify({ content: data.choices[0].message.content }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("AI code generator error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
