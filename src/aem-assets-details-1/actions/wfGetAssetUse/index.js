/*
* <license header>
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
    const requiredParams = ['wfHostname', 'objCode', 'parameters']
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
    const wfApiUri = `${params.wfHostname}/attask/api/v20.0`;

    async function search() {
      const apiEndpoint = new URL(`https://${wfApiUri}/${params.objCode}/search`);
      const parameters = params.parameters;
      for (const [key, value] of Object.entries(parameters)) {
        apiEndpoint.searchParams.append(key, value);
      }
      const fetchConfig = {
        method: 'GET',
        headers: headers
      };
      const res = await fetch(apiEndpoint, fetchConfig);
      return res;
    }

    const searchResults = await search();
    if (!searchResults.ok) {
      null;
      throw new Error('request to ' + apiEndpoint + ' failed with status code ' + searchResults.status)
    }
    const content = await searchResults.json();

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
