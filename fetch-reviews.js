// fetch-reviews.js
const https = require('https');
const fs = require('fs');

const apiKey = process.env.GOOGLE_API_KEY;
// *** IMPORTANT: Replace with YOUR business's Place ID ***
const placeId = 'ChIJAezuzocFdkgRgMEiXjxF2og'; // Yue Float's Place ID
const outputFile = 'reviews.json'; // This file will be served by GitHub Pages
const language = 'en'; // Optional: specify language for reviews

if (!apiKey) {
    console.error('GOOGLE_API_KEY is not set in environment variables.');
    process.exit(1);
}
if (!placeId) {
    console.error('PLACE_ID is not set.');
    process.exit(1);
}

const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,reviews&key=${apiKey}&reviews_sort=newest&language=${language}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const jsonData = JSON.parse(data);
            if (jsonData.status === "OK" && jsonData.result && jsonData.result.reviews) {
                fs.writeFileSync(outputFile, JSON.stringify(jsonData.result.reviews, null, 2));
                console.log(`Successfully fetched and wrote ${jsonData.result.reviews.length} reviews to ${outputFile}`);
            } else {
                console.error('Error fetching reviews from Google:', jsonData.error_message || jsonData.status);
                // To prevent overwriting good cache with an error, only write empty if file doesn't exist
                if (!fs.existsSync(outputFile)) fs.writeFileSync(outputFile, JSON.stringify([], null, 2)); // Write empty array on error if no cache
                process.exit(1); // Exit with error
            }
        } catch (e) {
            console.error('Error parsing JSON response or writing file:', e);
            if (!fs.existsSync(outputFile)) fs.writeFileSync(outputFile, JSON.stringify([], null, 2));
            process.exit(1);
        }
    });
}).on('error', (err) => {
    console.error('Error making HTTPS request:', err.message);
    if (!fs.existsSync(outputFile)) fs.writeFileSync(outputFile, JSON.stringify([], null, 2));
    process.exit(1);
});
