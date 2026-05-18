/*
* <license header>
*/

/**
 * This is a sample action showcasing how to access an external API
 *
 * Note:
 * You might want to disable authentication and authorization checks against Adobe Identity Management System for a generic action. In that case:
 *   - Remove the require-adobe-auth annotation for this action in the manifest.yml of your application
 *   - Remove the Authorization header from the array passed in checkMissingRequestInputs
 *   - The two steps above imply that every client knowing the URL to this deployed action will be able to invoke it without any authentication and authorization checks against Adobe Identity Management System
 *   - Make sure to validate these changes against your security requirements before deploying the action
 */


const fetch = require('node-fetch')
const { Core } = require('@adobe/aio-sdk')
const { errorResponse, getBearerToken, stringParameters, checkMissingRequestInputs } = require('../utils/utils.js')

// main function that will be executed by Adobe I/O Runtime
async function main(params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    // 'info' is the default level if not set
    logger.info('Calling the main action')

    // log parameters, only if params.LOG_LEVEL === 'debug'
    logger.debug(stringParameters(params))

    // check for missing request input parameters and headers
    const requiredParams = ['wfHostname', 'refObjID', 'assetID', 'assetPath']
    const requiredHeaders = ['Authorization']
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
    if (errorMessage) {
      // return and log client errors
      return errorResponse(400, errorMessage, logger)
    }

    // extract the user Bearer token from the Authorization header
    const token = getBearerToken(params)
    const headers = {
      'Authorization': `Bearer ${token}`,
      'content-type': 'application/json'
    };
    const wfApiUri = `${params.wfHostname}/attask/api/unsupported`;
    const docCfgID = '685b05a90000d4ee2f002df953393c78'; //GenStudio Solution Tech Enablement Lab

    function getFileNameWithoutExtension(fullPath) {
      // 1. Get the base file name (with extension)
      const lastSlashIndex = fullPath.lastIndexOf('/');
      const lastBackslashIndex = fullPath.lastIndexOf('\\');
      const lastSeparatorIndex = Math.max(lastSlashIndex, lastBackslashIndex);

      let fileNameWithExtension = fullPath;
      if (lastSeparatorIndex !== -1) {
        fileNameWithExtension = fullPath.substring(lastSeparatorIndex + 1);
      }

      // 2. Remove the extension
      const lastDotIndex = fileNameWithExtension.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        return fileNameWithExtension.substring(0, lastDotIndex);
      } else {
        // No extension found, return the full file name
        return fileNameWithExtension;
      }
    }

    function getFileExtension(filePath) {
      const lastDotIndex = filePath.lastIndexOf('.');
      // Handle cases where there's no dot or the dot is at the beginning (e.g., ".gitignore")
      if (lastDotIndex === -1 || lastDotIndex === 0) {
        return ''; // No extension or hidden file without a clear extension
      }

      const lastSlashIndex = filePath.lastIndexOf('/');
      const lastBackslashIndex = filePath.lastIndexOf('\\');

      // Ensure the dot is part of the filename, not a directory name
      if (lastDotIndex < lastSlashIndex || lastDotIndex < lastBackslashIndex) {
        return ''; // Dot is in a directory name, not the file extension
      }

      return filePath.substring(lastDotIndex + 1);
    }

    async function getWfSession() {
      const apiEndpoint = new URL(`https://${wfApiUri}/session`);
      const fetchConfig = {
        method: 'GET',
        headers: headers
      };
      const res = await fetch(apiEndpoint, fetchConfig);
      const content = await res.json();
      return content;
    }

    async function getDocProvider(userID) {
      const apiEndpoint = new URL(`https://${wfApiUri}/docpro/search`);
      const parameters = {
        'docProviderConfigID': docCfgID,
        'ownerID': userID,
        'fields': '*,owner:name'
      };
      for (const [key, value] of Object.entries(parameters)) {
        apiEndpoint.searchParams.append(key, value);
      }
      const fetchConfig = {
        method: 'GET',
        headers: headers
      };
      const res = await fetch(apiEndpoint, fetchConfig);
      const content = await res.json();
      return content;
    }

    async function sendToWorkfront(docProID) {
      const apiEndpoint = new URL(`https://${wfApiUri}/EXTDOC`);
      const parameters = {
        'action': 'linkExternalDocumentObjects'
      };
      for (const [key, value] of Object.entries(parameters)) {
        apiEndpoint.searchParams.append(key, value);
      }
      const objects = {
        [`urn:workfront:documents:aem:author-p142461-e1463136.adobeaemcloud.com:${encodeURIComponent(params.assetID)}`]: {
          "ID": `urn:workfront:documents:aem:author-p142461-e1463136.adobeaemcloud.com:${encodeURIComponent(params.assetID)}`,
          "name": getFileNameWithoutExtension(params.assetPath),
          "ext": getFileExtension(params.assetPath),
          "isFolder": false
        }
      };
      const body = {
        "documentProviderID": docProID,
        "providerType": "AEM",
        "refObjCode": "PROJ",
        "refObjID": params.refObjID,
        "objects": JSON.stringify(objects)
      };
      const fetchConfig = {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(body)
      };
      const res = await fetch(apiEndpoint, fetchConfig);
      return res;
    };
    
    const wfSession = await getWfSession();
    const docProvider = await getDocProvider(wfSession.data.userID);
    const sendtoWf = await sendToWorkfront(docProvider.data[0].ID);
    if (!sendtoWf.ok) {
      null;
      throw new Error('request to ' + apiEndpoint + ' failed with status code ' + sendtoWf.status)
    }
    const content = await sendtoWf.json();    

    const response = {
      statusCode: 200,
      statusText: 'ok',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(content.data)
    };

    // log the response status code
    logger.info(`${response.statusCode}: successful request`)
    logger.info(JSON.stringify(response))
    return response
  } catch (error) {
    // log any server errors
    logger.error(error)
    // return with 500
    return errorResponse(500, 'server error', logger)
  }
}

exports.main = main
