const axios = require("axios");
const fetch = require('node-fetch')
//const { Core } = require('@adobe/aio-sdk')

class WorkfrontServiceClient {

  async request(requestObj) {
    if(requestObj.lib == 'axios') {
      console.log(axios);
      const axiosInstance = axios.create({
        baseURL: 'https://bilbroug.my.workfront.adobe.com/attask/api/v20.0',
        headers: requestObj.headers
      });
      const response = await axiosInstance.request({
        method: requestObj.method,
        url: '/EXTDOC?action=linkExternalDocumentObjects',
        body: "{\"refObjCode\":\"PROJ\",\"providerType\":\"AEM\",\"refObjID\":\"689e15d50009158d479a02be238178de\",\"documentProviderID\":\"6890f3c5000f43345dff99aacbfbe381\",\"objects\":\\\"{\\\"urn:workfront:documents:aem:author-p142461-e1463136.adobeaemcloud.com:urn%3Aaaid%3Aaem%3Ae14e56d3-0d4e-4dc6-acb8-da6f6af8ebb8\\\":{\\\"ID\\\":\\\"urn:workfront:documents:aem:author-p142461-e1463136.adobeaemcloud.com:urn%3Aaaid%3Aaem%3Ae14e56d3-0d4e-4dc6-acb8-da6f6af8ebb8\\\",\\\"name\\\":\\\"chevy-hd-nobackground\\\",\\\"ext\\\":\\\"psd\\\",\\\"isFolder\\\":false}}\\\"}",
      });
      console.log(response.data);
      return {
        statusCode: response.status,
        statusText: response.statusText,
        body: response.data
      };
    } else { 
      if(requestObj.method !== 'search') {
        const method = requestObj.method.toUpperCase();
        let url = new URL(`${requestObj.apiUrl}/${requestObj.objCode}${requestObj.ID ? `/${requestObj.ID}` : ''}`);
        const body = requestObj.body ? JSON.stringify(requestObj.body) : {};
        const parameters = requestObj.parameters ? requestObj.parameters : {};
        for (const [key, value] of Object.entries(parameters)) {
          url.searchParams.append(key, value);
        }

        const fetchConfig = {
          method: method,
          body: "{\"refObjCode\":\"PROJ\",\"providerType\":\"AEM\",\"refObjID\":\"689e15d50009158d479a02be238178de\",\"documentProviderID\":\"6890f3c5000f43345dff99aacbfbe381\",\"objects\":\"{\\\"urn:workfront:documents:aem:author-p142461-e1463136.adobeaemcloud.com:urn%3Aaaid%3Aaem%3Ae14e56d3-0d4e-4dc6-acb8-da6f6af8ebb8\\\":{\\\"ID\\\":\\\"urn:workfront:documents:aem:author-p142461-e1463136.adobeaemcloud.com:urn%3Aaaid%3Aaem%3Ae14e56d3-0d4e-4dc6-acb8-da6f6af8ebb8\\\",\\\"name\\\":\\\"chevy-hd-nobackground\\\",\\\"ext\\\":\\\"psd\\\",\\\"isFolder\\\":false}}\"}",
          headers: requestObj.headers
        };
        console.log(typeof fetchConfig.body);
        console.log({myString: fetchConfig.body});

        const resp = await fetch(url, fetchConfig);
        const data = await resp.json();
        return {
          statusCode: resp.status,
          statusText: resp.statusText,
          headers: {
            'Content-Type': resp.headers.get('Content-Type')
          },
          body: fetchConfig.body
        };
      } else if(requestObj.method == 'search') {
        const method = 'GET';
        const fetchConfig = {
          method: method,
          headers: requestObj.headers
        };
        const countUrlString = `${requestObj.apiUrl}/${requestObj.objCode}/count`;
        let countUrl = new URL(countUrlString);
        const searchUrlString = `${requestObj.apiUrl}/${requestObj.objCode}/search`;
        let searchUrl = new URL(searchUrlString);
        let parameters = requestObj.parameters ? requestObj.parameters : {};
        for (const [key, value] of Object.entries(parameters)) {
          countUrl.searchParams.append(key, value);
        }
        const countResponse = await fetch(countUrl, fetchConfig);
        const countData = await countResponse.json()
        let totalResponse = [];
        if(countData.data.count > 2000 && (parameters['$$LIMIT'] > 2000 || !parameters['$$LIMIT'])) {
          let maxResults = 0;
          if(countData.data.count > parameters['$$LIMIT']) {
            maxResults = parameters['$$LIMIT'];
          } else {
            maxResults = countData.data.count;
          }
          let retrieved = 0;
          while(retrieved < maxResults) {
            parameters['$$FIRST'] = retrieved;
            for (const [key, value] of Object.entries(parameters)) {
              searchUrl.searchParams.append(key, value);
            }
            if(!parameters['$$LIMIT']) {
              searchUrl.searchParams.append('$$LIMIT', 2000);
            }
            const paginatedResponse = await fetch(searchUrl, fetchConfig);
            const paginatedResponseData = await paginatedResponse.json();
            totalResponse = totalResponse.concat(paginatedResponseData.data);
            retrieved = totalResponse.length;
            if(retrieved >= maxResults) {
            return {
              status: paginatedResponse.status,
              statusText: paginatedResponse.statusText,
              headers: {
                'Content-Type': 'application/json'
              },
              body: totalResponse.slice(0, maxResults)
            };
            }
          }
        } else {
          for (const [key, value] of Object.entries(parameters)) {
              searchUrl.searchParams.append(key, value);
            }
          const resp = await fetch(searchUrl, fetchConfig);
          const data = await resp.json();
          return {
            status: resp.status,
            statusText: resp.statusText,
            headers: {
              'Content-Type': resp.headers.get('Content-Type')
            },
            body: data
          };
        }
        return totalResponse;
      }
    }
  }
}

module.exports = { WorkfrontServiceClient };