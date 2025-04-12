# Environment Variable Security Guide

This guide explains how to handle environment variables securely in the Fintola application.

## Why Environment Variables Need Protection

Environment variables often contain sensitive information such as:
- API keys
- Authentication tokens
- Database credentials
- Secret keys

If these variables are exposed (e.g., by committing them to a public repository), they can be misused by malicious actors, potentially leading to:
- Unauthorized access to your services
- Data breaches
- Financial losses (if payment API keys are exposed)
- Identity theft

## How to Handle Environment Variables Securely

### Local Development

1. **Never commit `.env` files to Git**
   - Our `.gitignore` file is configured to exclude all `.env*` files except for `.env.example`
   - If you accidentally committed these files before, follow the instructions below to remove them

2. **Use the setup script**
   - Run `npm run setup-env` to create your `.env.local` file
   - This script will prompt you for the required values
   - Your actual keys will only be stored locally

3. **Keep your `.env.local` file secure**
   - Don't share it with others
   - Don't include it in screenshots or logs

### Deployment

1. **Set environment variables in your hosting platform**
   - For Vercel: Use the Environment Variables section in the project settings
   - For other platforms: Follow their specific instructions for setting environment variables

2. **Use the deployment script**
   - Our `deploy.js` script helps create the necessary environment files for deployment
   - It's configured to run automatically during the build process

## What to Do If You've Exposed API Keys

If you've accidentally committed API keys or other sensitive information to a public repository:

1. **Revoke the exposed keys immediately**
   - Go to the service provider (e.g., Clerk) and generate new keys
   - Deactivate the old keys

2. **Remove the keys from Git history**
   - This is challenging and may require force-pushing changes
   - Consider using tools like `git-filter-repo` or `BFG Repo Cleaner`
   - Example command: `git filter-branch --force --index-filter "git rm --cached --ignore-unmatch .env" --prune-empty --tag-name-filter cat -- --all`

3. **Update your local and deployed applications with the new keys**

## Environment Files in This Project

- `.env.example`: Template file showing required variables (safe to commit)
- `.env.local`: Local development variables (DO NOT COMMIT)
- `.env`: Used by some tools, but should not be committed
- `.env.production`: Production environment variables (DO NOT COMMIT)

## Using the Environment Setup Script

We've created a script to help you set up your environment variables safely:

```bash
npm run setup-env
```

This script will:
1. Create a `.env.local` file based on `.env.example`
2. Prompt you for values for each required variable
3. Save the file locally without committing it to Git

## Additional Resources

- [Next.js Environment Variables Documentation](https://nextjs.org/docs/basic-features/environment-variables)
- [Clerk Environment Variables Guide](https://clerk.com/docs/references/nextjs/environment-variables)
- [Git - Removing Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) 