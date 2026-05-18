/*
 * <license header>
 */

import React from 'react';
import { Text } from '@adobe/react-spectrum';
import { register } from '@adobe/uix-guest';
import { extensionId } from './Constants';

function ExtensionRegistration() {
  const init = async () => {
    const guestConnection = await register({
      id: extensionId,
      methods: {
        detailSidePanel: {
          getPanels() {
            // YOUR SIDE PANELS CODE SHOULD BE HERE
            return [
              {
                'id': 'joshs-side-panel',
                'tooltip': 'Workfront Details Panel',
                'icon': 'FileWorkflow',
                'title': 'Workfront Details Panel',
                'contentUrl': '/#joshs-side-panel',
                'reloadOnThemeChange': 'true',
              },
            ];
          },
        },
        actionBar: {
          async getActions({ context, resourceSelection }) {
            // YOUR ACTION BAR ACTIONS CODE SHOULD BE HERE
            return [
              {
                'id': 'sendtoworkfront',
                'icon': 'Airplane',
                'label': 'Send to Workfront',
                'onClick': async () => {
                  // openDialog: ({ title, contentUrl, type, size, payload }) => {},
                  guestConnection.host.modal.openDialog({
                    title: 'Send to Workfront',
                    contentUrl: '/#modal-sendtoworkfront',
                    type: 'modal',
                    size: 'L',
                    payload: resourceSelection
                  });
                },
              },
            ];
          },
          async getHiddenBuiltInActions({ context, resourceSelection }) {
            return [];
          },
          async overrideBuiltInAction({ actionId, context, resourceSelection }) {
            // perform some custom tasks
            // override built-in action by return true;
            // return true;
            // or return false to continue with built-in action
            return false;
          },
        },
        quickActions: {
          async getHiddenBuiltInActions({ context, resource }) {
            return [];
          },
          async overrideBuiltInAction({ actionId, context, resource }) {
            // perform some custom tasks
            // override built-in action by return true;
            // return true;
            // or return false to continue with built-in action
            return false;
          },
        },
      },
    });
  };
  init().catch(console.error);

  return <Text>IFrame for integration with Host (AEM Assets View)...</Text>;
}

export default ExtensionRegistration;
