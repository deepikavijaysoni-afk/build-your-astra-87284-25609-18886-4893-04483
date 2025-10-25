import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { ZipWriter, BlobWriter } from "npm:@zip.js/zip.js@2.7.34";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { htmlContent, siteName } = await req.json();

    if (!htmlContent) {
      throw new Error("HTML content is required");
    }

    console.log("Deploying to Netlify:", { siteName });

    const netlifyToken = Deno.env.get("NETLIFY_ACCESS_TOKEN");
    if (!netlifyToken) {
      throw new Error("Netlify access token not configured. Please add your Netlify token to the environment variables.");
    }

    // Create ZIP file using zip.js
    const blobWriter = new BlobWriter("application/zip");
    const zipWriter = new ZipWriter(blobWriter);
    
    // Add index.html to the ZIP
    await zipWriter.add(
      "index.html",
      new Response(htmlContent).body!.getReader()
    );
    
    // Close the ZIP writer and get the blob
    await zipWriter.close();
    const zipBlob = await blobWriter.getData();
    const zipArrayBuffer = await zipBlob.arrayBuffer();

    console.log("ZIP file created, size:", zipArrayBuffer.byteLength);

    // Step 1: Create a new site on Netlify
    const createSiteResponse = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${netlifyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: siteName || `astra-app-${Date.now()}`,
      }),
    });

    if (!createSiteResponse.ok) {
      const errorText = await createSiteResponse.text();
      console.error("Failed to create site:", errorText);
      throw new Error(`Failed to create site: ${createSiteResponse.status} ${errorText}`);
    }

    const siteData = await createSiteResponse.json();
    const siteId = siteData.id;
    console.log("Site created:", siteId);

    // Step 2: Deploy the ZIP file to the site
    const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${netlifyToken}`,
        "Content-Type": "application/zip",
      },
      body: zipArrayBuffer,
    });

    if (!deployResponse.ok) {
      const errorText = await deployResponse.text();
      console.error("Failed to deploy:", errorText);
      throw new Error(`Failed to deploy: ${deployResponse.status} ${errorText}`);
    }

    const deployData = await deployResponse.json();
    console.log("Deploy initiated:", deployData.id);

    // Step 3: Wait for deployment to be ready
    let attempts = 0;
    const maxAttempts = 30;
    let deployStatus = deployData.state;

    while (attempts < maxAttempts && deployStatus !== "ready") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.netlify.com/api/v1/sites/${siteId}/deploys/${deployData.id}`,
        {
          headers: {
            "Authorization": `Bearer ${netlifyToken}`,
          },
        }
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        deployStatus = statusData.state;
        console.log("Deploy status:", deployStatus);

        if (deployStatus === "error") {
          throw new Error("Deployment failed on Netlify");
        }

        if (deployStatus === "ready") {
          break;
        }
      }

      attempts++;
    }

    if (deployStatus !== "ready") {
      throw new Error("Deployment timeout - site may still be deploying");
    }

    const siteUrl = siteData.ssl_url || siteData.url;
    console.log("Deployment successful:", siteUrl);

    return new Response(
      JSON.stringify({
        success: true,
        url: siteUrl,
        siteId: siteData.id,
        siteName: siteData.name,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in deploy-to-netlify function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
