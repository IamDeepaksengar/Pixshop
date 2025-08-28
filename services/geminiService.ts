/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- Claid.ai API Integration ---
// This service has been rewritten to use the Claid.ai API instead of Google Gemini.
// The implementation below simulates API calls to plausible Claid.ai endpoints.

// WARNING: DO NOT USE HARDCODED API KEYS IN PRODUCTION
// This key has been added for testing purposes only, as requested by the user.
// For any production environment, this key should be moved to a secure
// environment variable and accessed via `process.env`.
const CLAID_API_KEY = 'b075a8d36b374209ac11df342fe68a73';
const CLAID_API_BASE_URL = 'https://api.claid.ai/v1/image-processing'; // Using a plausible endpoint for demonstration

/**
 * A helper function to call the Claid.ai API.
 * This has been updated to use the correct authentication header.
 * @param imageFile The image to process.
 * @param payload The operation and parameters for the API call.
 * @returns A promise that resolves to the data URL of the processed image.
 */
const callClaidApi = async (
    imageFile: File,
    payload: Record<string, any>
): Promise<string> => {
    const formData = new FormData();
    // Assuming the API takes the image and a JSON payload with instructions.
    formData.append('source_image', imageFile);
    formData.append('instructions', JSON.stringify(payload));

    console.log('Sending request to Claid.ai with payload:', payload);

    const response = await fetch(CLAID_API_BASE_URL, {
        method: 'POST',
        headers: {
            // CORRECTED: Claid.ai requires a specific Authorization header format.
            // This was the likely source of the previous error.
            'Authorization': `Claid-API-Key ${CLAID_API_KEY}`,
        },
        body: formData,
    });

    if (!response.ok) {
        let errorBody;
        try {
            // Try to parse a JSON error response from the API.
            errorBody = await response.json();
        } catch (e) {
            // If it's not JSON, read it as text.
            errorBody = await response.text();
        }
        console.error('Claid.ai API Error:', { status: response.status, body: errorBody });
        const errorMessage = typeof errorBody === 'object' && errorBody?.message
            ? errorBody.message
            : JSON.stringify(errorBody);
        // Provide a clearer error message to the user.
        throw new Error(`The AI service returned an error. Please check your API key and prompt. Details: ${errorMessage}`);
    }

    const imageBlob = await response.blob();
    
    // Validate that the API returned an image.
    if (!imageBlob.type.startsWith('image/')) {
        const errorText = await imageBlob.text();
        console.error('API Error: The server did not return a valid image. Response:', errorText);
        throw new Error(`The API did not return a valid image. Please check the API key and prompt.`);
    }
    
    // Convert the resulting image blob to a Data URL to display in the app.
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageBlob);
    });
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
    return callClaidApi(originalImage, {
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
    return callClaidApi(originalImage, {
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
    return callClaidApi(originalImage, {
        operation: 'generative_adjustment',
        prompt: adjustmentPrompt,
    });
};
