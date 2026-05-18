/*
 * <license header>
 */

import React, { useState, useEffect } from 'react';
import { attach } from '@adobe/uix-guest';
import {
  Flex,
  Provider,
  defaultTheme,
  Text,
  View,
  ProgressCircle,
  Heading,
  Divider,
  Content,
  IllustratedMessage,
  ActionButton,
  TooltipTrigger,
  Tooltip
} from '@adobe/react-spectrum';
import NotFound from '@spectrum-icons/illustrations/NotFound';
import Folder from '@spectrum-icons/workflow/Folder';
import Document from '@spectrum-icons/workflow/Document';
import LinkOut from '@spectrum-icons/workflow/LinkOut';
import InfoOutline from '@spectrum-icons/workflow/InfoOutline';
import allActions from '../config.json';

import { extensionId } from './Constants';

export default function PanelJoshsSidePanel() {
  // Fields
  const [guestConnection, setGuestConnection] = useState();
  const [colorScheme, setColorScheme] = useState('light');
  const [assetId, setAssetId] = useState();
  const [assetPath, setAssetPath] = useState();
  const [accessToken, setAccessToken] = useState('');
  const [imsOrgId, setImsOrgId] = useState('');
  const [activeDocuments, setActiveDocuments] = useState([]);
  const [pastVersions, setPastVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const wfHostname = 'bilbroug.my.workfront.adobe.com';


  useEffect(() => {
    (async () => {
      const guestConnection = await attach({ id: extensionId });
      const { accessToken, imsOrg } = await guestConnection.host.auth.getIMSInfo();
      const { id, path } = await guestConnection.host.details.getCurrentResourceInfo();
      const { colorScheme } = await guestConnection.host.theme.getThemeInfo();
      setAccessToken(accessToken);
      setImsOrgId(imsOrg);
      setColorScheme(colorScheme);
      setGuestConnection(guestConnection);
      setAssetId(id);
      setAssetPath(path);
    })()
  }, []);

  useEffect(() => {
    (async () => {
      if (!accessToken || !assetId) return;
      console.log(assetId);
      const actionUrl = new URL(allActions['wfGetAssetUse']);
      const myHeaders = new Headers();
      myHeaders.append('Content-Type', 'application/json');
      myHeaders.append('Authorization', `Bearer ${accessToken}`);
      myHeaders.append('x-gw-ims-org-id', imsOrgId);
      const body = JSON.stringify({
        "wfHostname": wfHostname,
        "objCode": "DOCU",
        "parameters": {
          "currentVersion:externalStorageID": encodeURIComponent(assetId),
          "currentVersion:externalStorageID_Mod": "cicontains",
          "fields": "*,currentVersion:*,parameterValues:*,project:name"
        }
      });

      const fetchConfig = {
        method: 'POST',
        headers: myHeaders,
        body: body
      };

      const res = await fetch(actionUrl, fetchConfig);
      const text = await res.text();
      const content = JSON.parse(text);
      if(content.length == 0) {
        setActiveDocuments([]);
      }
      const activeDocumentsArray = [];
      Promise.all(content.map(async (document) => {
        const duplicate = activeDocumentsArray.find(activeDocument => activeDocument.projectID == document.projectID);
        console.log(`Duplicate: ${duplicate}`);
        if(!duplicate) {
          console.log(`Project ID: ${document.projectID}`);
          activeDocumentsArray.push(document);
        }
      })).then (() => {
        setActiveDocuments(activeDocumentsArray);
      })
    })()
  }, [assetId]);

  useEffect(() => {
    (async () => {
      if (!accessToken || !assetId) return;
      console.log(assetId);
      const actionUrl = new URL(allActions['wfGetAssetUse']);
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");
      myHeaders.append("Authorization", `Bearer ${accessToken}`);
      myHeaders.append('x-gw-ims-org-id', imsOrgId); 

      const body = JSON.stringify({
        "wfHostname": wfHostname,
        "objCode": "DOCV",
        "parameters": {
          "externalStorageID": encodeURIComponent(assetId),
          "externalStorageID_Mod": "cicontains",
          "fields": "*,document:project:name,document:*,document:parameterValues:*"
        }
      });

      const fetchConfig = {
        method: "POST",
        headers: myHeaders,
        body: body
      };

      const res = await fetch(actionUrl, fetchConfig);
      const text = await res.text()
      const content = JSON.parse(text);
      const pastVersionsArray = [];
      Promise.all(content.map(async (version) => {
        const inActive = activeDocuments.find(activeDocument => activeDocument.projectID === version.document.projectID);
        const duplicate = pastVersionsArray.find(pastVersion => pastVersion.document.projectID == version.document.projectID);
        if(!inActive && !duplicate) {
          console.log(`Project ID: ${version.document.projectID}`);
          //version['target'] = 'https://'+wfHostname+'/workfront/project/'+version.document.projectID;
          pastVersionsArray.push(version);
        }
      })).then(() => {
        setPastVersions(pastVersionsArray);
      })
      setIsLoading(false);
    })()
  }, [activeDocuments]);

  function displayToast(variant, message) {
    guestConnection.host.toast.display({ variant, message });
  }

  function objLink(document) {
    window.open(`https://${wfHostname}/project/${document.projectID}/documents`);
  }

  return (
    <Provider theme={defaultTheme} colorScheme={colorScheme} height={'100vh'}>
      <View backgroundColor="gray-50" height="100vh">
        {isLoading ? (
          <Flex 
            justifyContent="center" 
            alignItems="center" 
            height="100%"
            direction="column"
            gap="size-200"
          >
            <ProgressCircle aria-label="Loading Workfront projects..." isIndeterminate />
            <Text>Loading projects...</Text>
          </Flex>
        ) : (
          <View padding="size-300">
            {/* Current Version Projects Section */}
            <View marginBottom="size-400">
              <Flex alignItems="center" gap="size-100" marginBottom="size-150">
                <Folder size="S" />
                <Heading level={3} margin={0}>Current Version</Heading>
                <TooltipTrigger delay={0}>
                  <ActionButton isQuiet UNSAFE_style={{ minWidth: 'auto', padding: 0 }}>
                    <InfoOutline size="S" />
                  </ActionButton>
                  <Tooltip>
                    Current Version are Projects in Workfront in which this Asset is the current version of a Document.
                  </Tooltip>
                </TooltipTrigger>
              </Flex>
              <Divider size="S" marginBottom="size-200" />
              
              {activeDocuments.length === 0 ? (
                <View paddingY="size-300">
                  <IllustratedMessage>
                    <NotFound />
                    <Heading>No current versions</Heading>
                    <Content>This asset is not currently linked to any Workfront projects as the document current version.</Content>
                  </IllustratedMessage>
                </View>
              ) : (
                <Flex direction="column" gap="size-100">
                  {activeDocuments.map((activeDocument) => (
                    <ActionButton
                      key={'active-' + activeDocument.ID}
                      onPress={() => objLink(activeDocument)}
                      isQuiet
                      width="100%"
                      UNSAFE_style={{ cursor: 'pointer' }}
                    >
                      <Flex justifyContent="space-between" alignItems="flex-start" width="100%" gap="size-100">
                        <Flex alignItems="flex-start" gap="size-100" flex="1" minWidth={0}>
                          <View marginTop="size-25">
                            <Document size="S" />
                          </View>
                          <Text UNSAFE_style={{ wordBreak: 'break-word', overflowWrap: 'break-word', textAlign: 'left' }}>
                            {activeDocument.project.name}
                          </Text>
                        </Flex>
                        <View marginTop="size-25" flexShrink={0}>
                          <LinkOut size="S" />
                        </View>
                      </Flex>
                    </ActionButton>
                  ))}
                </Flex>
              )}
            </View>

            {/* Past Version Projects Section */}
            <View marginBottom="size-400">
              <Flex alignItems="center" gap="size-100" marginBottom="size-150">
                <Folder size="S" />
                <Heading level={3} margin={0}>Previous Version</Heading>
                <TooltipTrigger delay={0}>
                  <ActionButton isQuiet UNSAFE_style={{ minWidth: 'auto', padding: 0 }}>
                    <InfoOutline size="S" />
                  </ActionButton>
                  <Tooltip>
                    Previous Version are Projects in Workfront in which this asset is a previous version of a Document.
                  </Tooltip>
                </TooltipTrigger>
              </Flex>
              <Divider size="S" marginBottom="size-200" />
              
              {pastVersions.length === 0 ? (
                <View paddingY="size-300">
                  <IllustratedMessage>
                    <NotFound />
                    <Heading>No previous versions</Heading>
                    <Content>No past versions of this asset were found in other projects.</Content>
                  </IllustratedMessage>
                </View>
              ) : (
                <Flex direction="column" gap="size-100">
                  {pastVersions.map((pastVersion) => (
                    <ActionButton
                      key={'past-' + pastVersion.documentID}
                      onPress={() => objLink(pastVersion.document)}
                      isQuiet
                      width="100%"
                      UNSAFE_style={{ cursor: 'pointer' }}
                    >
                      <Flex justifyContent="space-between" alignItems="flex-start" width="100%" gap="size-100">
                        <Flex alignItems="flex-start" gap="size-100" flex="1" minWidth={0}>
                          <View marginTop="size-25">
                            <Document size="S" />
                          </View>
                          <Text UNSAFE_style={{ wordBreak: 'break-word', overflowWrap: 'break-word', textAlign: 'left' }}>
                            {pastVersion.document.project.name}
                          </Text>
                        </Flex>
                        <View marginTop="size-25" flexShrink={0}>
                          <LinkOut size="S" />
                        </View>
                      </Flex>
                    </ActionButton>
                  ))}
                </Flex>
              )}
            </View>

            {/* Asset Info Footer */}
            <Divider size="S" marginY="size-300" />
            <View>
              <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                Asset ID: {assetId}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Provider>
  );
}
