// FILE: fetch-reviews.js
// LOCATION: Root of your GitHub repository

const https = require('https');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_PLACE_ID = 'ChIJAezuzocFdkgRgMEiXjxF2og'; // CORRECTED Yue Float's Place ID
const REVIEWS_LANGUAGE = 'en'; // Language for reviews
const TARGET_REVIEW_RATING = 5; // Fetch only 5-star reviews

// *** YOUR CUSTOMIZED TREATMENT FILTERS FOR YUE FLOAT ***
const treatmentFilters = {
  'float': [
    'float', 'floating', 'floatation tank', 'sensory deprivation',
    'isolation tank', 'float pod', 'float chamber'
  ],
  'infrared-sauna': [
    'infrared sauna', 'infrared', 'heat therapy', 'detoxification',
    'infrared heat', 'sweating', 'infrared session', 'infrared cabin'
  ],
  'sports-massage': [
    'sports massage', 'deep tissue', 'muscle recovery', 'injury prevention',
    'athletic massage', 'performance therapy', 'sports therapy'
  ],
  'swedish-massage': [
    'swedish massage', 'relaxation massage', 'gentle massage',
    'light pressure', 'soothing massage', 'classic massage'
  ],
  'emotional-release': [
    'emotional release', 'bodywork', 'somatic therapy', 'trauma release',
    'emotional healing', 'energy release', 'emotional bodywork'
  ],
  'ajna-light': [
    'ajna light', 'light therapy', 'pineal gland', 'third eye',
    'brainwave entrainment', 'meditative light', 'ajna session'
  ],
  'chair-massage': [
    'chair massage', 'seated massage', 'quick massage', 'on-site massage',
    'upper back massage', 'neck and shoulder massage'
  ],
  'combination-packs': [ // Note: Reviews might not explicitly mention "combination package"
    'combination package', 'multi-treatment', 'package deal', 'float and sauna', 'float and massage',
    'treatment bundle', 'combo session', 'combined therapies', 'loved both', 'did two'
  ],
  'staff': [ // For reviews praising staff, might overlap with treatments
    'staff', 'therapist', 'practitioner', 'team', 'service', 'customer service', 'reception',
    'professionalism', 'friendly staff', 'expertise', 'welcoming', 'helpful', 'amazing service'
  ],
  'general-positive': [] // Special category for 5-star reviews not matching other specific keywords
};
// ********************************************************************

const OUTPUT_DIRECTORY = '.'; // Save files in the current (root) directory

// --- SCRIPT LOGIC ---

function saveReviewsToFile(reviewsArray, filename) {
    const fullPath = path.join(OUTPUT_DIRECTORY, filename);
    try {
        fs.writeFileSync(fullPath, JSON.stringify(reviewsArray, null, 2));
        console.log(`Successfully wrote ${reviewsArray.length} reviews to ${filename}`);
    } catch (e) {
        console.error(`Error writing file ${filename}:`, e.message);
    }
}

async function main() {
    if (!GOOGLE_API_KEY) {
        console.error('Error: GOOGLE_API_KEY environment variable is not set.');
        process.exit(1);
    }
    if (!GOOGLE_PLACE_ID) {
        console.error('Error: GOOGLE_PLACE_ID is not configured in the script.');
        process.exit(1);
    }

    const googleApiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${GOOGLE_PLACE_ID}&fields=name,rating,reviews&key=${GOOGLE_API_KEY}&reviews_sort=newest&language=${REVIEWS_LANGUAGE}`;

    try {
        const responseText = await new Promise((resolve, reject) => {
            https.get(googleApiUrl, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`Google API request failed with status ${res.statusCode}: ${data}`));
                    }
                });
            }).on('error', (err) => {
                reject(new Error(`HTTPS request error to Google API: ${err.message}`));
            });
        });

        const jsonData = JSON.parse(responseText);

        if (jsonData.status !== "OK" || !jsonData.result || !jsonData.result.reviews) {
            console.error('Error in Google API response structure or status:', jsonData.error_message || jsonData.status);
            // Ensure empty files are created if API fails, so git add doesn't error
            saveReviewsToFile([], 'all_reviews.json');
            for (const filenamePrefix of Object.keys(treatmentFilters)) {
                saveReviewsToFile([], `${filenamePrefix}_reviews.json`);
            }
            process.exit(1);
        }

        const allFetchedReviews = jsonData.result.reviews;
        console.log(`Fetched ${allFetchedReviews.length} total reviews from Google.`);

        const highRatedReviews = allFetchedReviews.filter(review => review.rating === TARGET_REVIEW_RATING);
        console.log(`Found ${highRatedReviews.length} reviews with ${TARGET_REVIEW_RATING} stars.`);

        saveReviewsToFile(highRatedReviews, 'all_reviews.json'); // All 5-star reviews

        let assignedReviewTexts = new Set();

        for (const [filenamePrefix, keywords] of Object.entries(treatmentFilters)) {
            if (filenamePrefix === 'general_positive') continue;

            let categorySpecificReviews = [];
            if (keywords.length > 0) {
                categorySpecificReviews = highRatedReviews.filter(review => {
                    if (!review.text) return false;
                    const reviewTextLower = review.text.toLowerCase();
                    const matches = keywords.some(keyword => reviewTextLower.includes(keyword.toLowerCase()));
                    if (matches) {
                        assignedReviewTexts.add(review.text_original || review.text); // Use text_original if available
                    }
                    return matches;
                });
            }
            saveReviewsToFile(categorySpecificReviews, `${filenamePrefix}_reviews.json`);
        }

        if (treatmentFilters.hasOwnProperty('general_positive')) {
            const generalPositiveReviews = highRatedReviews.filter(review =>
                review.text && !assignedReviewTexts.has(review.text_original || review.text)
            );
            saveReviewsToFile(generalPositiveReviews, 'general_positive_reviews.json');
        }

    } catch (error) {
        console.error('Error during script execution:', error.message, error.stack);
        // Ensure empty files are created if script fails, so git add doesn't error
        saveReviewsToFile([], 'all_reviews.json');
        for (const filenamePrefix of Object.keys(treatmentFilters)) {
            saveReviewsToFile([], `${filenamePrefix}_reviews.json`);
        }
        process.exit(1);
    }
}

main();
