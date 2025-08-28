/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- Claid.ai API Integration via a Server-Side Proxy ---
// This service now sends requests to a Netlify serverless function
// which acts as a proxy to the Claid.ai API. This is necessary to
// avoid browser CORS (Cross-Origin Resource Sharing) errors.

const PROXY_ENDPOINT = '/.netlify/functions/claid-proxy';

// Helper function to convert a File object to a Base64 encoded string.
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};


/**
 * A helper function to call our server-side proxy which then calls the Claid.ai API.
 * @param imageFile The image to process.
 * @param payload The operation and parameters for the API call.
 * @returns A promise that resolves to the data URL of the processed image.
 */
const callClaidApiProxy = async (
    imageFile: File,
    payload: Record<string, any>
): Promise<string> => {
    
    const imageBase64 = await fileToBase64(imageFile);

    const response = await fetch(PROXY_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            // The proxy expects the image as a base64 string and the instructions.
            imageBase64,
            instructions: payload,
        }),
    });

    if (!response.ok) {
        let errorBody;
        try {
            errorBody = await response.json();
        } catch (e) {
            errorBody = await response.text();
        }
        console.error('API Proxy Error:', { status: response.status, body: errorBody });
        const errorMessage = typeof errorBody === 'object' && errorBody?.error
            ? errorBody.error
            : JSON.stringify(errorBody);
        
        throw new Error(`The AI service returned an error. ${errorMessage}`);
    }

    const result = await response.json();
    
    if (!result.imageData) {
         console.error('API Error: The proxy did not return valid image data.');
         throw new Error(`The API did not return a valid image. Please check the API key and prompt.`);
    }

    return result.imageData;
};

/**
 * Generates an edited image using Claid.ai based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    return callClaidApiProxy(originalImage, {
        operation: 'generative_edit',
        prompt: userPrompt,
        focus_point: hotspot,
    });
};

/**
 * Generates an image with a filter applied using Claid.ai.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    return callClaidApiProxy(originalImage, {
        operation: 'generative_filter',
        prompt: filterPrompt,
    });
};

/**
 * Generates an image with a global adjustment applied using Claid.ai.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    return callClaidApiProxy(originalImage, {
        operation: 'generative_adjustment',
        prompt: adjustmentPrompt,
    });
};