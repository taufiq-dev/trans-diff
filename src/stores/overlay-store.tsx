import { createStore, type EventObject } from '@xstate/store';

type OnAddFunction = (key: string, value: string | object) => void;

type OverlayStoreContext = {
  isAddKeyDialogOpen: boolean;
  onAdd: OnAddFunction;
  parentPath?: string;
};

type OpenAddKeyDialogEvent = { onAdd: OnAddFunction; parentPath?: string };
type CloseAddKeyDialogEvent = {};

type OverlayEvents = {
  openAddKeyDialog: OpenAddKeyDialogEvent;
  closeAddKeyDialog: CloseAddKeyDialogEvent;
};

export const overlayStore = createStore<
  OverlayStoreContext,
  OverlayEvents,
  {
    // TTypes (optional)
    emitted?: EventObject;
  }
>({
  // Initial context
  context: {
    isAddKeyDialogOpen: false,
    onAdd: (key: string, value: string | object) => {},
  },
  // Transitions
  on: {
    openAddKeyDialog: (
      _,
      { onAdd, parentPath }: OpenAddKeyDialogEvent,
    ) => ({
      isAddKeyDialogOpen: true,
      onAdd,
      parentPath,
    }),
    closeAddKeyDialog: (_) => ({
      isAddKeyDialogOpen: false,
      onAdd: (key: string, value: string | object) => {},
      parentPath: '',
    }),
  },
});
