import _cleanDeep from 'clean-deep';
import _cloneDeep from 'lodash/cloneDeep';
import equal from 'react-fast-compare';
import { _array, _object } from '@firecamp/utils';
import { IRest } from '@firecamp/types';
import { normalizeRequest } from '../../services/request.service';
import {
  EReqChangeRootKeys,
  EReqChangeScriptsKeys,
  EReqChangeMetaKeys,
  EReqChangeUrlKeys,
} from '../../types';
import { TStoreSlice } from '../store.type';

interface IRequestChangeState {
  url?: EReqChangeUrlKeys[];
  scripts?: EReqChangeScriptsKeys[];
  __meta?: EReqChangeMetaKeys[];
  __root?: EReqChangeRootKeys[];
}

interface IRequestChangeStateSlice {
  requestChangeState?: IRequestChangeState;
  equalityChecker: (request: Partial<IRest>) => void;
  preparePayloadForSaveRequest: () => IRest;
  preparePayloadForUpdateRequest: () => Partial<IRest>;
}

const createRequestChangeStateSlice: TStoreSlice<IRequestChangeStateSlice> = (
  set,
  get
) => ({
  requestChangeState: {
    url: [],
    scripts: [],
    __meta: [],
    __root: [],
  },
  equalityChecker: (request: Partial<IRest>) => {
    const state = get();
    const {
      originalRequest: _request,
      requestChangeState: _rcs,
      runtime: { isRequestSaved },
    } = state;
    if (!isRequestSaved) return;

    for (let key in request) {
      switch (key) {
        case 'method':
        case 'config':
        case 'headers':
        case 'body':
        case 'auth':
          if (!equal(_request[key], request[key])) {
            if (!_rcs.__root.includes(key)) _rcs.__root.push(key);
          } else {
            _rcs.__root = _array.without(_rcs.__root, key);
          }
          break;
        case 'url':
        case 'scripts':
        case '__meta':
          Object.keys(request[key]).forEach((k) => {
            if (!equal(_request[key][k], request[key][k])) {
              if (!_rcs[key].includes(k)) _rcs[key].push(k);
            } else {
              _rcs[key] = _array.without(_rcs[key], k);
            }
          });
          break;
      }
    }
    console.log('_rcs', _rcs);
    const hasChange = !_object.isEmpty(_cleanDeep(_cloneDeep(_rcs)));
    // console.log(state.context.request, state.runtime.tabId, hasChange);
    state.context.tab.changeMeta(state.runtime.tabId, {
      hasChange,
    });
  },
  preparePayloadForSaveRequest: () => {
    const state = get();
    const _sr = normalizeRequest(state.request);
    console.log(_sr);
    return _sr;
  },
  preparePayloadForUpdateRequest: () => {
    const state = get();
    const { request, requestChangeState: _rcs } = state;
    const _request = normalizeRequest(request);
    let _ur: Partial<IRest> = {};

    for (let key in _rcs) {
      switch (key) {
        case '__root':
          _ur = { ..._ur, ..._object.pick(_request, _rcs[key]) };
          break;
        case 'url':
          //@ts-ignore url will have only updated key
          _ur.url = _object.pick(_request[key], _rcs[key]);
          break;
        case '__meta':
          //@ts-ignore TODO: manage types here
          _ur.__meta = _object.pick(_request[key], _rcs[key]);
          break;
      }
    }
    console.log(_ur);
    return _ur;
  },
});

export { createRequestChangeStateSlice, IRequestChangeStateSlice };
