import isEqual from 'react-fast-compare';
import { Rest } from '@firecamp/cloud-apis';
import {
  IRequestFolder,
  IGraphQLPlayground,
  TId,
  ERequestTypes,
} from '@firecamp/types';
import { getOperationNames } from '../../services/GraphQLservice';
import { TStoreSlice } from '../store.type';
import { TreeDataProvider } from '../../components/sidebar-panel/tabs/collection-tree/TreeDataProvider';

interface ICollection {
  isProgressing?: boolean;
  tdpInstance?: any;
  items?: Partial<IGraphQLPlayground & { __ref: { isItem?: boolean } }>[];
  folders?: Partial<IRequestFolder & { __ref: { isFolder?: boolean } }>[];
  /**
   * incase the number on each action/event happens within collection
   * react component will not re-render when tdpInstance will change in store, at that time update __manualUpdates to re-render the compoenent
   */
  __manualUpdates?: number;
}

interface ICollectionSlice {
  collection: ICollection;
  getCollection: () => ICollection;
  isCollectionEmpty: () => boolean;
  toggleColProgressBar: (flag?: boolean) => void;
  registerTDP: () => void;
  unRegisterTDP: () => void;

  initialiseCollection: (collection: ICollection) => void;

  /** delete playground */
  deleteItem: (id: TId) => Promise<any>;

  /** add/save playground */
  addItem: (name: string) => Promise<any>;

  /** update playground */
  updateItem: (name?: string) => Promise<any>;
}

const createCollectionSlice: TStoreSlice<ICollectionSlice> = (
  set,
  get,
  initialCollection?: ICollection
): ICollectionSlice => ({
  collection: initialCollection || {
    isProgressing: false,
    tdpInstance: null,
    items: [],
    folders: [],
    __manualUpdates: 0,
  },

  getCollection: () => {
    return get().collection;
  },
  isCollectionEmpty: () => {
    const { folders, items } = get().collection;
    return folders.length == 0 && items.length == 0;
  },
  // register TreeDatProvider instance
  registerTDP: () => {
    set((s) => {
      const instance = new TreeDataProvider(
        s.collection.folders,
        s.collection.items
      );
      return {
        collection: {
          ...s.collection,
          tdpInstance: instance,
          __manualUpdates: ++s.collection.__manualUpdates,
        },
      };
    });
  },

  // unregister TreeDatProvider instance
  unRegisterTDP: () => {
    set((s) => ({
      collection: {
        ...s.collection,
        tdpInstance: null,
        __manualUpdates: 0,
      },
    }));
  },

  // collection
  initialiseCollection: (collection: ICollection) => {
    console.log(collection?.items?.length, 'collection?.items?.length...');
    const state = get();
    set((s) => ({
      collection: {
        ...s.collection,
        ...collection,
        __manualUpdates: ++s.collection.__manualUpdates,
      },
      ui: {
        ...s.ui,
        playgrounds: collection?.items?.length,
      },
    }));
    state.collection.tdpInstance?.init(
      collection.folders || [],
      collection.items || []
    );
  },

  toggleColProgressBar: (flag?: boolean) => {
    set((s) => ({
      collection: {
        ...s.collection,
        isProgressing:
          typeof flag == 'boolean' ? flag : !s.collection.isProgressing,
      },
    }));
  },

  deleteItem: async (id: TId) => {
    const state = get();
    // console.log(state)
    if (!state.request?.__ref.id) return;
    state.toggleColProgressBar(true);
    const res = await Rest.request
      .deleteItem(state.request.__ref.id, id)
      .then((r) => {
        set((s) => {
          const items = s.collection.items.filter((i) => i.__ref.id != id);
          s.collection.tdpInstance?.deleteItem(id);
          return {
            collection: {
              ...s.collection,
              items,
              __manualUpdates: ++s.collection.__manualUpdates,
            },
            ui: { ...s.ui, playgrounds: items?.length },
          };
        });
        // return r;
      })
      .then((r) => {
        state.context.app.notify.success(
          'The playground has been deleted successfully'
        );
      })
      .catch((e) => {
        console.log(e);
        if (e.message == 'Network Error') {
          //TODO: show error notification
        }
        state.context.app.notify.alert(e.response?.data.message || e.message);
      })
      .finally(() => {
        state.toggleColProgressBar(false);
      });
    return res;
  },

  addItem: async (name: string) => {
    const state = get();
    // console.log(state)
    if (!name) return;
    if (!state.request?.__ref.id) return;
    const plg = state.playgrounds[state.runtime.activePlayground];

    const item = {
      name,
      value: plg.request.value,
      __meta: plg.request.__meta,
      __ref: {
        requestId: state.request.__ref.id,
        requestType: ERequestTypes.GraphQL,
        collectionId: state.request.__ref.collectionId,
      },
    };

    state.toggleColProgressBar(true);
    const res = await Rest.request
      .createItem(state.request.__ref.id, item)
      .then((r) => {
        const playgroundId = r.data.__ref.id;
        set((s) => {
          console.log(r.data);
          const newItem = { ...r.data, value: r.data.value };
          const items = [...s.collection.items, newItem];
          s.collection.tdpInstance?.addItem(newItem);
          return {
            collection: {
              ...s.collection,
              items,
              __manualUpdates: ++s.collection.__manualUpdates,
            },
            ui: { ...s.ui, playgrounds: items?.length },
            playgrounds: {
              ...s.playgrounds,
              [playgroundId]: {
                ...s.playgrounds[playgroundId],
                request: newItem,
                originalRequest: newItem,
              },
            },
            runtime: {
              ...s.runtime,
              activePlayground: playgroundId,
              playgroundTabs: s.runtime.playgroundTabs.map((t) =>
                t.id == s.runtime.activePlayground
                  ? { id: playgroundId, name: newItem.name }
                  : t
              ),
              playgroundsMeta: {
                ...s.runtime.playgroundsMeta,
                [playgroundId]: {
                  ...s.runtime.playgroundsMeta[playgroundId],
                  isSaved: true,
                  operationNames: getOperationNames(plg.request.value.query)
                    .names,
                },
              },
            },
          };
        });
        // return r;
      })
      .then((r) => {
        state.context.app.notify.success(
          'The playground has been saved successfully'
        );
      })
      .catch((e) => {
        console.log(e);
        if (e.message == 'Network Error') {
          //TODO: show error notification
        }
        state.context.app.notify.alert(e.response?.data.message || e.message);
      })
      .finally(() => {
        state.toggleColProgressBar(false);
      });
    return res;
  },

  updateItem: async (name?: string) => {
    const state = get();
    if (!state.request?.__ref.id) return;
    const playgroundId = state.runtime.activePlayground;
    const plg = state.playgrounds[playgroundId];

    const item: Partial<IGraphQLPlayground> = {
      __ref: {
        id: plg.request.__ref.id,
        requestId: state.request.__ref.id,
        requestType: ERequestTypes.GraphQL,
        collectionId: state.request.__ref.collectionId,
      },
    };

    const { originalRequest: _oRequest, request: _request } = plg;

    // @note: here name will be updated from rename prompt where other plg property will be updated by state value
    // that is why we're passing name as fn prop and handling other plg info from the state
    if (name && typeof name == 'string' && !isEqual(_oRequest.name, name)) {
      item.name = name;
    }
    if (!isEqual(_oRequest.value.query, _request.value.query)) {
      //@ts-ignore
      if (!item.value) item.value = { query: '' };
      item.value.query = _request.value.query;
    }
    if (
      typeof _request.value.variables == 'string' &&
      !isEqual(_oRequest.value.variables, _request.value.variables)
    ) {
      //@ts-ignore
      if (!item.value) item.value = { variables: '' };
      item.value.variables = _request.value.variables;
    }

    console.log(item, 'item...');
    state.toggleColProgressBar(true);
    const res = await Rest.request
      .updateItem(item.__ref.requestId, item.__ref.id, item)
      .then((r) => {
        const updatedPlg = r.data;
        set((s) => {
          const items = s.collection.items.map((i) => {
            if (i.__ref.id == updatedPlg.__ref.id)
              return { ...i, ...updatedPlg };
            return i;
          });
          s.collection.tdpInstance?.updateItem(updatedPlg);
          return {
            collection: {
              ...s.collection,
              items,
              __manualUpdates: ++s.collection.__manualUpdates,
            },
            playgrounds: {
              ...s.playgrounds,
              [playgroundId]: {
                ...s.playgrounds[playgroundId],
                request: { ...updatedPlg },
                originalRequest: { ...updatedPlg },
              },
            },
            runtime: {
              ...s.runtime,
              playgroundTabs: s.runtime.playgroundTabs.map((t) => {
                if (t.id == updatedPlg.__ref.id)
                  return { ...t, name: updatedPlg.name };
                return t;
              }),
              playgroundsMeta: {
                ...s.runtime.playgroundsMeta,
                [playgroundId]: {
                  ...s.runtime.playgroundsMeta[playgroundId],
                  hasChange: false,
                },
              },
            },
          };
        });
        return r;
      })
      .then((r) => {
        state.context.app.notify.success(
          'The playground has been updated successfully'
        );
      })
      .catch((e) => {
        console.log(e);
        if (e.message == 'Network Error') {
          //TODO: show error notification
        }
        state.context.app.notify.alert(e.response?.data.message || e.message);
      })
      .finally(() => {
        state.toggleColProgressBar(false);
      });
    return res;
  },
});

export { ICollection, ICollectionSlice, createCollectionSlice };
