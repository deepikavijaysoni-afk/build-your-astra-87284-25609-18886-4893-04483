import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { htmlContent, siteName } = await req.json();

    if (!htmlContent) {
      throw new Error('HTML content is required');
    }

    console.log('Deploying to Netlify:', { siteName });

    const netlifyToken = Deno.env.get('NETLIFY_ACCESS_TOKEN');
    if (!netlifyToken) {
      throw new Error('Netlify access token not configured');
    }

    // Create form data with HTML file
    const formData = new FormData();
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    formData.append('index.html', htmlBlob, 'index.html');

    // Deploy to Netlify using their drag and drop API
    const response = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${netlifyToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Netlify API error:', errorText);
      throw new Error(`Netlify deployment failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    const siteUrl = result.ssl_url || result.url;

    console.log('Deployment successful:', siteUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: siteUrl,
        siteId: result.id,
        siteName: result.name
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in deploy-to-netlify function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
