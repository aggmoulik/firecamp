import { TId, ERequestTypes } from '@firecamp/types';
import { ILog } from '@firecamp/socket.io-executor/dist/esm';
import { InitPlayground } from '../../constants';
import { ELogColors, ELogTypes } from '../../types';
import { TStoreSlice } from '../store.type';

const emptyLog = {
  title: '',
  message: {
    name: '',
    payload: InitPlayground,
    __ref: {
      id: '',
      collectionId: '',
      requestId: '',
      requestType: ERequestTypes.SocketIO,
    },
  },
  __meta: {
    event: '',
    timestamp: 0,
    type: ELogTypes.System,
    color: ELogColors.Success,
    ackRef: '',
  },
};

interface ILogs {
  [key: TId]: ILog[];
}

interface ILogsSlice {
  logs: ILogs;
  addLog: (log: ILog) => void;
  addErrorLog: (message: string) => void;
  clearLogs: () => void;
}

const createLogsSlice: TStoreSlice<ILogsSlice> = (set, get) => ({
  logs: {},

  addLog: (log: ILog) => {
    // console.log({ log });
    const state = get();
    const conId = state.getActiveConnectionId();
    const logs = state.logs;
    if (conId in logs) {
      const cLogs = logs[conId];
      set((s) => ({
        logs: {
          ...s.logs,
          [conId]: [...cLogs, { ...emptyLog, ...log }],
        },
      }));
    } else {
      set((s) => ({
        logs: {
          ...s.logs,
          [conId]: [log],
        },
      }));
    }
  },
  addErrorLog: (message: string) => {
    const state = get();
    const log = {
      ...emptyLog,
      title: message || '',
      __meta: {
        ...emptyLog.__meta,
        type: ELogTypes.System,
        color: ELogColors.Danger,
      },
    };
    state.addLog(log);
  },
  clearLogs: () => {
    const state = get();
    const conId = state.getActiveConnectionId();
    const logs = state.logs;
    if (conId in logs) {
      set((s) => ({
        logs: {
          ...s.logs,
          [conId]: [],
        },
      }));
    }
  },
});

export { emptyLog, ILogs, ILogsSlice, createLogsSlice };
