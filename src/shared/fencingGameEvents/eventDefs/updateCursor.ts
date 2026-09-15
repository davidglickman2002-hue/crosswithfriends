import {CellCoords} from '../../types';
import {EventDef} from '../types/EventDef';

export interface UpdateCursorEvent {
  id: string;
  cell: CellCoords;
  timestamp?: number;
  direction?: 'across' | 'down';
}

const updateCursor: EventDef<UpdateCursorEvent> = {
  reducer(state, {id, cell, timestamp, direction}) {
    if (!state.users[id]) {
      return state; // illegal update if no user exists with id
    }
    return {
      ...state,
      users: {
        ...state.users,
        [id]: {
          ...state.users[id]!,
          cursor: {
            ...cell,
            direction,
            id,
            timestamp: timestamp!,
          },
        },
      },
    };
  },
};

export default updateCursor;
