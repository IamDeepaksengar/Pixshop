/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// This is a Netlify serverless function that acts as a proxy to the Claid.ai API.
// It solves the browser's CORS issue by making the API request from the server-side.
// It also provides a secure place to store the API key, instead of exposing it in the browser.

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import fetch from 'node-fetch';
import FormData from 'form-data';
import { Buffer } from 'buffer';

// WARNING: DO NOT USE HARDCODED API KEYS IN PRODUCTION
// This key is stored on the server-side, which is much more secure than the browser.
// For production, this should be moved to Netlify's environment variables.
const CLAID_API_KEY = 'b075a8d36b374209ac11df342fe68a73';
const CLAID_API_BASE_URL = 'https://api.claid.ai/v1/image-processing';

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { imageBase64, instructions } = JSON.parse(event.body || '{}');

    if (!imageBase64 || !instructions) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing imageBase64 or instructions in request body' }),
      };
    }

    // Convert the Base64 data URL back to a Buffer that can be sent as a file
    const base64Data = imageBase64.split(';base64,').pop();
    if (!base64Data) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid Base64 data' }) };
    }
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Create a FormData object to send to the Claid.ai API
    const formData = new FormData();
    formData.append('source_image', imageBuffer, { filename: 'upload.png', contentType: 'image/png' });
    formData.append('instructions', JSON.stringify(instructions));

    // Make the actual API call to Claid.ai from the server
    const response = await fetch(CLAID_API_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Claid-API-Key ${CLAID_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Claid.ai API Error:', { status: response.status, body: errorBody });
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Claid.ai API failed: ${errorBody}` }),
      };
    }

    // Get the resulting image as a buffer
    const resultBuffer = await response.buffer();
    const resultMimeType = response.headers.get('content-type') || 'image/png';

    // Convert the result image buffer to a Base64 data URL to send back to the browser
    const resultBase64 = `data:${resultMimeType};base64,${resultBuffer.toString('base64')}`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: resultBase64 }),
    };

  } catch (error) {
    console.error('Proxy Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An internal error occurred in the proxy function.' }),
    };
  }
};

export { handler };