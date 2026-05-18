# AEM Assets Extension Deployment Guide

## Prerequisites
- Developer or System Admin role in your Adobe organization
- Extension fully tested in your development environment
- Access to Adobe Developer Console

## Deployment Steps

### 1. Switch to Production Workspace
```bash
aio app use -w Production
```

This ensures you're deploying to the Production workspace, which makes the extension available across all AEM as a Cloud Service environments in your Adobe Org.

### 2. Build and Deploy
```bash
aio app deploy
```

This command will:
- Build your frontend and backend code
- Deploy actions to Adobe I/O Runtime
- Deploy the web UI to CDN
- Register the extension with Adobe

### 3. Submit for Approval
After deployment completes:
1. Go to [Adobe Developer Console](https://developer.adobe.com/console)
2. Navigate to your project
3. Find your deployed extension
4. Click "Submit for approval"
5. Fill out the approval request form with:
   - Extension name and description
   - Business justification
   - Contact information

### 4. Approval Process
- A deployment manager or business owner in your organization will receive a notification
- They can review and approve in Adobe Exchange under "Manage > Apps pending review"
- Once approved, the extension is **immediately active** across all AEM as a Cloud Service Author services

### 5. Verify Deployment
Once approved:
- Log into AEM Assets as any user
- Navigate to the Assets Details view
- The Workfront Details Panel icon should appear in the right sidebar for all users

## Important Notes

- **Automatic Distribution**: Extensions deployed to Production are automatically added to ALL AEM as a Cloud Service Author services in your Adobe Org
- **No Per-Environment Control**: You cannot limit the extension to specific AEM environments (dev/stage/prod) unless you add conditional logic checking the AEM hostname
- **Multiple Extensions**: You can have multiple extensions deployed simultaneously

## Updating Your Extension

To update an existing extension:
1. Make your code changes
2. Test thoroughly in development
3. **Revoke** the existing deployment in Adobe Developer Console
4. Run `aio app deploy` again from Production workspace
5. Submit for approval again (if required by your org)

## Troubleshooting

### Extension not appearing after approval?
- Clear browser cache
- Log out and log back into AEM Assets
- Verify the extension is approved in Adobe Exchange

### Deployment fails?
- Check you have the correct permissions
- Verify you're in the Production workspace: `aio app use -w Production`
- Check for any linting errors: `npm run lint`
- Review logs: `aio app logs`

### Need to rollback?
- Go to Adobe Developer Console
- Revoke the current deployment
- Deploy a previous version

## Support
Contact your Adobe account team or Adobe Support if you encounter issues during deployment.
