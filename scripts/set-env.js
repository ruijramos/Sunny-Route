const fs = require('fs');
const path = require('path');

// Define the path to the environments directory
const envDirectory = path.join(__dirname, '../src/app/environments');

// Ensure the environments directory exists
if (!fs.existsSync(envDirectory)) {
    fs.mkdirSync(envDirectory, { recursive: true });
}

// Define the content for the environment files
// We use process.env to access environment variables injected by Netlify
const envConfigFile = `export const environment = {
  production: ${process.env.production === 'true'},
  geoapify_geocoder_autocomplete_key: '${process.env.geoapify_geocoder_autocomplete_key || ''}',
  nominatim_api_autocomplete_url: '${process.env.nominatim_api_autocomplete_url || ''}',
  openweathermap_api_key: '${process.env.openweathermap_api_key || ''}',
  openweathermap_api_url: '${process.env.openweathermap_api_url || ''}',
  osrm_api_url: '${process.env.osrm_api_url || ''}'
};
`;

// Write the content to environment.ts and environment.prod.ts
const targetPath = path.join(envDirectory, 'environment.ts');
const targetPathProd = path.join(envDirectory, 'environment.prod.ts');

fs.writeFile(targetPath, envConfigFile, function (err) {
    if (err) {
        console.log(err);
    }
    console.log(`Output generated at ${targetPath}`);
});

fs.writeFile(targetPathProd, envConfigFile, function (err) {
    if (err) {
        console.log(err);
    }
    console.log(`Output generated at ${targetPathProd}`);
});
