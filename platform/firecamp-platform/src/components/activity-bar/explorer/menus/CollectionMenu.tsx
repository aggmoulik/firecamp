import { useState } from 'react';
import cx from 'classnames';
import { VscNewFile } from '@react-icons/all-files/vsc/VscNewFile';
import { VscNewFolder } from '@react-icons/all-files/vsc/VscNewFolder';
import { VscEdit } from '@react-icons/all-files/vsc/VscEdit';
import { VscSettingsGear } from '@react-icons/all-files/vsc/VscSettingsGear';
import { VscEllipsis } from '@react-icons/all-files/vsc/VscEllipsis';
import { VscTrash } from '@react-icons/all-files/vsc/VscTrash';
import { Dropdown } from '@firecamp/ui';
import { Regex } from '../../../../constants';
import platformContext from '../../../../services/platform-context';
import { useExplorerStore } from '../../../../store/explorer';

enum EMenuType {
  Collection = 'collection',
  Folder = 'folder',
  Request = 'request',
}

const CollectionMenu = ({
  collectionId,
  folderId,
  requestId,
  startRenaming,
  menuType,
}) => {
  const {
    openCollectionTab,
    openFolderTab,
    createFolder,
    deleteCollection,
    deleteFolder,
    deleteRequest,
  } = useExplorerStore.getState();
  let [isMenuOpened, toggleMenu] = useState(false);

  const renameMenu = {
    prefix: () => (
      <div className={cx('mr-1 text-lg')}>
        <VscEdit size={14} />
      </div>
    ),
    name: 'Rename',
    onClick: (e) => {
      startRenaming();
    },
  };

  const addFolderMenu = {
    prefix: () => (
      <div className={cx('mr-1 text-lg')}>
        <VscNewFolder size={14} />
      </div>
    ),
    name: 'Add Folder',
    onClick: () => {
      console.log(collectionId, folderId);
      if (!platformContext.app.user.isLoggedIn()) {
        return platformContext.app.modals.openSignIn();
      }
      platformContext.window
        .promptInput({
          header: 'Create New Folder',
          label: 'Folder Name',
          placeholder: 'type folder name',
          texts: { btnOking: 'Creating...' },
          value: '',
          validator: (val) => {
            if (!val || val.length < 3) {
              return {
                isValid: false,
                message: 'The folder name must have minimum 3 characters.',
              };
            }
            const isValid = Regex.FolderName.test(val);
            return {
              isValid,
              message:
                !isValid &&
                'The folder name must not contain special characters.',
            };
          },
          executor: (name) => {
            const _folder = {
              name,
              description: '',
              __ref: { collectionId, folderId },
            };
            return createFolder(_folder);
          },
          onError: (e) => {
            platformContext.app.notify.alert(
              e?.response?.data?.message || e.message
            );
          },
        })
        .then((res) => {
          // console.log(res);
        });
    },
  };

  const addRequestMenu = {
    prefix: () => (
      <div className={cx('mr-1 text-lg')}>
        <VscNewFile size={14} />
      </div>
    ),
    name: 'Add Request',
    onClick: () => {},
  };

  const openEnv = (env) => {};

  const viewDetailMenu = {
    prefix: () => (
      <div className={cx('mr-1 text-lg')}>
        <VscSettingsGear size={14} />
      </div>
    ),
    name: 'View Details',
    onClick: () => {
      if (menuType == EMenuType.Collection) {
        openCollectionTab(collectionId);
      } else if (menuType == EMenuType.Folder) {
        openFolderTab(folderId);
      }
    },
  };

  const deleteMenu = {
    prefix: () => (
      <div className={cx('mr-1 text-lg')}>
        <VscTrash size={14} />
      </div>
    ),
    name: 'Delete',
    onClick: () => {
      platformContext.window
        .confirm({
          title: `Are you sure to delete the ${menuType}?`,
          texts: {
            btnConfirm: 'Yes, delete it.',
          },
        })
        .then((isConfirmed) => {
          if (isConfirmed) {
            if (menuType == EMenuType.Collection) {
              deleteCollection(collectionId);
            } else if (menuType == EMenuType.Folder) {
              deleteFolder(folderId);
            } else if (menuType == EMenuType.Request) {
              deleteRequest(requestId);
            }
          }
        });
    },
  };

  const commonMenu = [
    viewDetailMenu,
    renameMenu,
    addFolderMenu,
    // addRequestMenu,
    // settingMenu,
    deleteMenu,
  ];
  const requestMenu = [renameMenu, deleteMenu];
  return (
    <>
      <Dropdown
        isOpen={isMenuOpened}
        detach={false}
        onToggle={(value) => toggleMenu(value)}
      >
        <Dropdown.Handler className="transparent without-border without-padding fc-button">
          <VscEllipsis />
        </Dropdown.Handler>
        <Dropdown.Options
          className="bg-main"
          options={menuType == EMenuType.Request ? requestMenu : commonMenu}
        />
      </Dropdown>
    </>
  );
};

export default CollectionMenu;
