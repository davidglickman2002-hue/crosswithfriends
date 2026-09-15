import React, {useCallback} from 'react';
import {ToolbarActions} from './useToolbarActions';

export const FencingToolbar: React.FC<{toolbarActions: ToolbarActions; title?: string}> = (props) => {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      props.toolbarActions.revealCell();
    },
    [props.toolbarActions]
  );

  return (
    <div className="fencing--toolbar">
      {props.title && <div className="fencing--puzzle-title">{props.title}</div>}
      <button className="btn btn--small btn--contained" onMouseDown={handleMouseDown}>
        Reveal Cell
      </button>
    </div>
  );
};
