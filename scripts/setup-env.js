/**
 * Environment Variable Setup Script
 * 
 * This script helps set up environment variables safely for development and production.
 * It creates a .env.local file from .env.example if it doesn't exist.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const rootDir = path.resolve(__dirname, '..');
const exampleEnvPath = path.join(rootDir, '.env.example');
const localEnvPath = path.join(rootDir, '.env.local');

// Check if .env.example exists
if (!fs.existsSync(exampleEnvPath)) {
    console.error('Error: .env.example file not found!');
    process.exit(1);
}

// Check if .env.local already exists
if (fs.existsSync(localEnvPath)) {
    console.log('.env.local file already exists.');
    rl.question('Do you want to overwrite it? (y/N): ', (answer) => {
        if (answer.toLowerCase() !== 'y') {
            console.log('Setup cancelled. Your .env.local file remains unchanged.');
            rl.close();
            process.exit(0);
        } else {
            createEnvFile();
        }
    });
} else {
    createEnvFile();
}

function createEnvFile() {
    // Read the example env file
    const exampleEnv = fs.readFileSync(exampleEnvPath, 'utf8');
    const envVars = exampleEnv.split('\n').filter(line => {
        // Filter out comments and empty lines for processing
        return line.trim() !== '' && !line.startsWith('#');
    });

    let newEnvContent = '';
    let currentVarIndex = 0;

    function processNextVar() {
        if (currentVarIndex >= envVars.length) {
            // All variables processed, write the file
            fs.writeFileSync(localEnvPath, newEnvContent);
            console.log(`\n.env.local file created successfully at ${localEnvPath}`);
            console.log('Remember to never commit this file to your repository!');
            rl.close();
            return;
        }

        const line = envVars[currentVarIndex];
        if (line.includes('=')) {
            const [key, defaultValue] = line.split('=');
            const isPlaceholder = defaultValue.includes('your_') || defaultValue.includes('placeholder');

            if (isPlaceholder) {
                rl.question(`Enter value for ${key} (required): `, (value) => {
                    if (!value.trim()) {
                        console.log('This value is required. Please enter a valid value.');
                        // Ask again for the same variable
                        return processNextVar();
                    }
                    newEnvContent += `${key}=${value}\n`;
                    currentVarIndex++;
                    processNextVar();
                });
            } else {
                // Use the default value from example
                newEnvContent += `${line}\n`;
                currentVarIndex++;
                processNextVar();
            }
        } else {
            // Add comments and empty lines as is
            newEnvContent += `${line}\n`;
            currentVarIndex++;
            processNextVar();
        }
    }

    // Add the comments from the example file
    exampleEnv.split('\n').forEach(line => {
        if (line.startsWith('#') || line.trim() === '') {
            newEnvContent += `${line}\n`;
        }
    });

    console.log('Setting up your environment variables...');
    processNextVar();
} 