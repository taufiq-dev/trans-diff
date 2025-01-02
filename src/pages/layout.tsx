import { Outlet } from 'react-router';
import { useSelector } from '@xstate/store/react';
import { overlayStore } from '@/stores/overlay-store';
import Overlay from '@/components/overlay';
import AddKeyDialog from '@/components/add-key-dialog';

const Layout = () => {
  const isAddKeyDialogOpen = useSelector(
    overlayStore,
    (state) => state.context.isAddKeyDialogOpen,
  );
  return (
    <>
      <Outlet />
      {isAddKeyDialogOpen && (
        <Overlay>
          <AddKeyDialog />
        </Overlay>
      )}
    </>
  );
};

export default Layout;
