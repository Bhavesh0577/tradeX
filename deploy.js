/**
 * Deployment Environment Setup Script
 * 
 * This script creates necessary environment files for deployment.
 * It prioritizes reading from existing environment files rather than hardcoding values.
 */

const fs = require('fs');
const path = require('path');

// Define required environment variables
const requiredEnvVars = [
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
    'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
    'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
    'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL',
];

// Default values for non-sensitive variables
const defaultValues = {
    'NEXT_PUBLIC_CLERK_SIGN_IN_URL': '/sign-in',
    'NEXT_PUBLIC_CLERK_SIGN_UP_URL': '/sign-up',
    'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL': '/dash',
    'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL': '/dash',
};

// Files to check for existing environment variables (in order of priority)
const sourceFiles = [
    '.env.local',
    '.env',
    '.env.example'
];

// Files to create for deployment
const targetFiles = [
    '.env',
    '.env.local',
    '.env.production',
    '.env.production.local',
    '.env.build',
];

// Read environment variables from existing files
function getEnvVars() {
    const envVars = {};

    // First, set default values for non-sensitive variables
    Object.entries(defaultValues).forEach(([key, value]) => {
        envVars[key] = value;
    });

    // Then, try to read from existing files
    for (const file of sourceFiles) {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
            console.log(`Reading environment variables from ${file}`);
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');

            for (const line of lines) {
                // Skip comments and empty lines
                if (line.trim() === '' || line.startsWith('#')) continue;

                // Parse key-value pairs
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const [, key, value] = match;
                    envVars[key.trim()] = value.trim();
                }
            }
        }
    }

    // Check if all required variables are set
    const missingVars = requiredEnvVars.filter(key => !envVars[key]);
    if (missingVars.length > 0) {
        console.error('Error: The following required environment variables are missing:');
        missingVars.forEach(key => console.error(`- ${key}`));
        console.error('\nPlease set these variables in .env.local or provide them as environment variables.');
        process.exit(1);
    }

    return envVars;
}

// Get environment variables
const envVars = getEnvVars();

// Create the content for the .env files
const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

// Write the content to each target file
targetFiles.forEach((file) => {
    fs.writeFileSync(path.join(process.cwd(), file), envContent);
    console.log(`Created ${file}`);
});

console.log('Environment variables set up for deployment'); 