/*
 * <license header>
 */

import React, { useState, useEffect, useRef } from 'react';
import { attach, closeModal } from '@adobe/uix-guest';
import actionWebInvoke from '../utils/utils.js';
import allActions from '../config.json'

import {
  Flex,
  Provider,
  defaultTheme,
  Text,
  ComboBox,
  Item,
  ButtonGroup,
  Button,
  View,
  ProgressCircle,
  Heading,
  Divider,
  Content,
  IllustratedMessage
} from '@adobe/react-spectrum';
import Search from '@spectrum-icons/workflow/Search';
import FolderOpen from '@spectrum-icons/workflow/FolderOpen';

import { extensionId } from './Constants';

const fetch = require('node-fetch');

export default function ModalSendtoworkfront() {
  // Fields
  const [guestConnection, setGuestConnection] = useState();
  const [accessToken, setAccessToken] = useState('');
  const [imsOrgId, setImsOrgId] = useState('');
  const [colorScheme, setColorScheme] = useState('light');
  const [payload, setPayload] = useState();
  const [sendToState, setSendToState] = useState({});
  const [projectSearch, setProjectSearch] = useState('');
  const [projectSelection, setProjectSelection] = useState('');
  const [projectOptions, setProjectOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const projectSearchSeq = useRef(0);
  
  // ref to the ComboBox root so we can imperatively open it (workaround for async items)
  const comboRootRef = useRef(null);

  // prev options count to detect empty -> populated transition
  const prevOptionsCountRef = useRef(0);

  const openComboMenu = () => {
    const root = comboRootRef.current;
    if (!root) return;

    // Spectrum renders a combobox role / input inside the component
    const el = root.querySelector('[role="combobox"]') || root.querySelector('input');
    if (!el) return;

    // only open if input is focused
    if (document.activeElement !== el) return;

    // dispatch ArrowDown to force the menu open when items arrived async
    el.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        code: 'ArrowDown',
        keyCode: 40,
        which: 40,
        bubbles: true
      })
    );
  };


  const wfHostname = 'bilbroug.my.workfront.adobe.com';

  useEffect(() => {
    (async () => {
      const guestConnection = await attach({ id: extensionId });
      setGuestConnection(guestConnection);
      const { accessToken, imsOrg } = await guestConnection.host.auth.getIMSInfo();
      setAccessToken(accessToken);
      setImsOrgId(imsOrg);
      const { colorScheme } = await guestConnection.host.theme.getThemeInfo();
      setColorScheme(colorScheme);
      const payload = await guestConnection.host.modal.getPayload();
      setPayload(payload);
    })()
  }, []);

  useEffect(() => {
    if (sendToState.status == 'fail') {
      console.log(`This failed to send: ${sendToState.path}`)
    }
  }, [sendToState]);

  useEffect(() => {
    // Reset options and search state when search term changes
    if (projectSearch.length < 3) {
      setProjectOptions([]);
      setHasSearched(false);
      setProjectMenuOpen(false);
      return;
    }

    // Only search if we have 3+ characters
    if (projectSearch.length >= 3 && accessToken) {
      setIsSearching(true);

      // sequence guard so older responses don't win
      const mySeq = ++projectSearchSeq.current;

      const actionUrl = new URL(allActions['workfrontProjectSearch']);

      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");
      myHeaders.append("Authorization", `Bearer ${accessToken}`);
      myHeaders.append("x-gw-ims-org-id", imsOrgId);

      const body = JSON.stringify({
        wfHostname: wfHostname,
        searchTerm: projectSearch
      });

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body
      };

      fetch(actionUrl, requestOptions)
        .then(projectSearchResults => projectSearchResults.json())
        .then(projects => {
          // ignore stale responses
          if (mySeq !== projectSearchSeq.current) return;

          const items = (projects || []).map(project => ({
            ID: project.ID,
            name: project.name
          }));

          setProjectOptions(items);
          setHasSearched(true);

          // ✅ Open dropdown immediately when results arrive (if still searching 3+ chars)
          setProjectMenuOpen(items.length > 0 && projectSearch.length >= 3);
        })
        .catch(err => {
          if (mySeq !== projectSearchSeq.current) return;

          console.error(`Error fetching projects: ${err}`);
          setProjectOptions([]);
          setHasSearched(true);
          setProjectMenuOpen(false);
        })
        .finally(() => {
          // only stop loading for the latest request
          if (mySeq === projectSearchSeq.current) setIsSearching(false);
        });
    }
  }, [projectSearch, accessToken, imsOrgId]);

  // open the combobox imperatively when options transition from 0 -> >0
  useEffect(() => {
    const prev = prevOptionsCountRef.current;
    const next = projectOptions.length;

    if (prev === 0 && next > 0 && projectSearch.length >= 3 && !isSearching) {
      // let React/Spectrum render the new items, then trigger open
      setTimeout(() => openComboMenu(), 0);
    }

    prevOptionsCountRef.current = next;
  }, [projectOptions, projectSearch, isSearching]);

  function closeDialog() {
    guestConnection.host.modal.closeDialog();
  }

  function displayToast(variant, message) {
    guestConnection.host.toast.display({ variant, message });
  }

  function sendToWorkfront(resources, projectID, wfHostname) {
    setIsLoading(true);
    const actionUrl = new URL(allActions['aemDocsToWorkfront']);

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${accessToken}`);
    myHeaders.append("x-gw-ims-org-id", imsOrgId);

    Promise.all(resources.map(async (item) => {
      const body = JSON.stringify({
        "wfHostname": wfHostname,
        "refObjID": projectID,
        "assetID": item.id,
        "assetPath": item.path
      });

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: body
      };

      const res = await fetch(actionUrl, requestOptions);
      const text = await res.text()
      const content = JSON.parse(text);
      if (!res.ok) {
        console.error('Not ok');
        console.error(content);
        setSendToState({ 'path': item.path, 'status': 'fail' });
        //throw new Error('request to ' + apiEndpoint + ' failed with status code ' + res.status)
      }
      console.log(`Document ID: ${content.result.documents[0]}`);
    })
    ).then(() => {
      const isFailed = sendToState.status == 'fail';
      const message = isFailed ? `Failed to send to Workfront` : `Successfully sent to Workfront!`;
      const variant = isFailed ? 'negative' : 'positive';
      setIsLoading(false);
      closeDialog();
      displayToast(
        variant,
        message
      );
    });
  }

  return (
    <Provider theme={defaultTheme} colorScheme={colorScheme}>
      <View padding="size-400">
        {/* Header Section */}
        <View marginBottom="size-300">
          <Heading level={2} marginBottom="size-100">
            <Flex alignItems="center" gap="size-100">
              <FolderOpen size="M" />
              <Text>Send to Workfront Project</Text>
            </Flex>
          </Heading>
          <Divider size="S" />
        </View>

        {/* Instructions */}
        <View marginBottom="size-200">
          <Content>
            <Text>
              Select a Workfront project to link {payload?.resources?.length || 0} asset{payload?.resources?.length !== 1 ? 's' : ''}.
              Start typing to search for projects.
            </Text>
          </Content>
        </View>

        {/* Search and Selection Section */}
        <View marginBottom="size-200">
          <Flex direction="column" gap="size-200">
          <ComboBox
            ref={comboRootRef}
              label="Search Workfront Projects"
              placeholder="Type at least 3 characters to search..."
              description="Search by project name"
              inputValue={projectSearch}
              onInputChange={(value) => {
                setProjectSearch(value);

                // reset selection when typing less than 3 chars
                if (value.length < 3) {
                  setProjectSelection('');
                  setProjectMenuOpen(false);
                } else {
                  // keep it open while typing if we already have results
                  if (projectOptions.length > 0) setProjectMenuOpen(true);
                }
              }}
              onSelectionChange={(key) => {
                setProjectSelection(key);
                const selectedItem = projectOptions.find(o => o.ID === key);
                if (selectedItem) setProjectSearch(selectedItem.name);

                // close menu after selection (optional but typical)
                setProjectMenuOpen(false);
              }}
              isDisabled={isLoading}
              items={projectOptions}
              width="100%"
              menuTrigger="input"
              isOpen={projectMenuOpen}
              onOpenChange={setProjectMenuOpen}
            >
              {(item) => <Item key={item.ID}>{item.name}</Item>}
            </ComboBox>

            {/* Show character count hint */}
            {projectSearch.length > 0 && projectSearch.length < 3 && (
              <View>
                <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                  <Flex alignItems="center" gap="size-100">
                    <Search size="S" />
                    <Text>Type {3 - projectSearch.length} more character{3 - projectSearch.length !== 1 ? 's' : ''} to search</Text>
                  </Flex>
                </Text>
              </View>
            )}

            {/* Show searching indicator */}
            {isSearching && (
              <View>
                <Flex alignItems="center" gap="size-100">
                  <ProgressCircle aria-label="Searching..." isIndeterminate size="S" />
                  <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                    Searching for projects...
                  </Text>
                </Flex>
              </View>
            )}

            {/* Show no results message */}
            {hasSearched && projectSearch.length >= 3 && projectOptions.length === 0 && !isSearching && (
              <View 
                padding="size-200" 
                borderRadius="medium"
                UNSAFE_style={{ backgroundColor: 'var(--spectrum-global-color-gray-100)' }}
              >
                <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                  No projects found for "{projectSearch}". Try a different search term.
                </Text>
              </View>
            )}

            {/* Show selection confirmation */}
            {projectSelection && (
              <View 
                padding="size-200" 
                borderRadius="medium"
                UNSAFE_style={{ backgroundColor: 'var(--spectrum-global-color-green-100)' }}
              >
                <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-green-900)' }}>
                  ✓ Project selected: {projectOptions.find(o => o.ID === projectSelection)?.name}
                </Text>
              </View>
            )}
          </Flex>
        </View>

        {/* Asset List */}
        {payload?.resources && payload.resources.length > 0 && (
          <View marginBottom="size-200">
            <Heading level={4} marginBottom="size-150">Assets to Send:</Heading>
            <View 
              padding="size-200" 
              backgroundColor="gray-75"
              borderRadius="medium"
              maxHeight="size-2000"
              UNSAFE_style={{ overflowY: 'auto' }}
            >
              {payload.resources.map((resource, index) => (
                <View key={index} paddingY="size-75">
                  <Text UNSAFE_style={{ fontSize: '13px' }}>
                    • {resource.path?.split('/').pop() || resource.name || 'Unnamed asset'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Divider size="S" marginBottom="size-200" />

        {/* Action Buttons */}
        <Flex justifyContent="end" gap="size-200">
          {isLoading ? (
            <Flex alignItems="center" gap="size-200">
              <ProgressCircle aria-label="Sending to Workfront..." isIndeterminate size="S" />
              <Text>Sending to Workfront...</Text>
            </Flex>
          ) : (
            <ButtonGroup>
              <Button 
                variant="secondary" 
                onPress={() => closeDialog()}
              >
                Cancel
              </Button>
              <Button 
                variant="accent" 
                onPress={() => sendToWorkfront(payload.resources, projectSelection, wfHostname)} 
                isDisabled={!projectSelection || isLoading}
              >
                Send to Workfront
              </Button>
            </ButtonGroup>
          )}
        </Flex>
      </View>
    </Provider>
  );
}
