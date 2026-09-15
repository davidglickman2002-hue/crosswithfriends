import * as React from 'react';
import * as _ from 'lodash';
import clsx from 'clsx';
import {FaNoteSticky} from 'react-icons/fa6';

import {Ping, CellStyles, OtherSelection} from './types';
import './css/cell.css';
import {CellData, Cursor} from '../../shared/types';
import {getTranslucentColor, getContrastTextColor} from '../../lib/colors';

export interface EnhancedCellData extends CellData {
  r: number;
  c: number;

  // Player interactions
  cursors: Cursor[];
  otherSelections?: OtherSelection[];
  pings: Ping[];
  solvedByIconSize: number;

  // Cell states
  selected: boolean;
  highlighted: boolean;
  frozen: boolean;
  circled: boolean;
  shaded: string | boolean;
  image?: string;
  referenced: boolean;
  canFlipColor: boolean;

  // Styles
  attributionColor: string;
  cellStyle: CellStyles;
  myColor: string;
}

interface Props extends EnhancedCellData {
  // Callbacks
  onClick: (r: number, c: number) => void;
  onContextMenu: (r: number, c: number) => void;
  onFlipColor?: (r: number, c: number) => void;
}
/*
 * Summary of Cell component
 *
 * Props: { black, selected, highlighted, bad, good, helped,
 *          value, onClick, cursor }
 *
 * Children: []
 *
 * Potential parents:
 * - Grid
 * */
export default class Cell extends React.Component<Props> {
  private touchStart: {pageX: number; pageY: number} = {pageX: 0, pageY: 0};

  shouldComponentUpdate(nextProps: Props) {
    const pathsToOmit = ['cursors', 'pings', 'cellStyle', 'otherSelections'] as const;
    if (!_.isEqual(_.omit(nextProps, ...pathsToOmit), _.omit(this.props, pathsToOmit))) {
      return true;
    }
    if (_.some(pathsToOmit, (p) => JSON.stringify(nextProps[p]) !== JSON.stringify(this.props[p]))) {
      return true;
    }

    return false;
  }

  renderOtherSelection() {
    const {otherSelections, selected} = this.props;
    if (!otherSelections || otherSelections.length === 0 || selected) {
      return null;
    }

    const count = otherSelections.length;
    let style: React.CSSProperties;
    const names = otherSelections.map((s) => s.displayName || 'Player').join(', ');

    if (count === 1) {
      const tint = getTranslucentColor(otherSelections[0].color, 0.22);
      style = {backgroundColor: tint};
    } else {
      const step = 100 / count;
      const stops = otherSelections
        .map((sel, idx) => {
          const tint = getTranslucentColor(sel.color, 0.22);
          const start = (idx * step).toFixed(1);
          const end = ((idx + 1) * step).toFixed(1);
          return `${tint} ${start}%, ${tint} ${end}%`;
        })
        .join(', ');
      style = {backgroundImage: `linear-gradient(135deg, ${stops})`};
    }

    return <div className="cell--other-selection" style={style} title={`Selected by ${names}`} />;
  }

  renderCursorBadges() {
    const {cursors, r} = this.props;
    if (!cursors || cursors.length === 0) return null;

    const activeCursors = cursors.filter((c) => c.active !== false);
    if (activeCursors.length === 0) return null;

    const isTopRow = r === 0;

    return (
      <div className={clsx('cell--cursor-badges', {'top-row': isTopRow})}>
        {activeCursors.map(({id: cursorId, color, displayName}) => {
          const name = displayName || 'Player';
          const textColor = getContrastTextColor(color || '');
          return (
            <div
              key={cursorId}
              className="cell--cursor-badge"
              style={{
                backgroundColor: color || '#3b82f6',
                color: textColor,
              }}
              title={name}
            >
              {name}
            </div>
          );
        })}
      </div>
    );
  }

  renderCursors() {
    const {cursors} = this.props;
    if (!cursors || cursors.length === 0) return null;

    return (
      <div className="cell--cursors">
        {cursors.map(({id: cursorId, color, active}, i) => (
          <div
            key={cursorId}
            className={clsx('cell--cursor', {
              active,
              inactive: !active,
            })}
            style={{
              borderColor: color,
              zIndex: Math.min(2 + cursors.length - i, 9),
              inset: `${i * 2}px`,
            }}
          />
        ))}
        {this.renderCursorBadges()}
      </div>
    );
  }

  renderPings() {
    const {pings} = this.props;
    return (
      <div className="cell--pings">
        {pings.map(({id: pingId, color, active}, i) => (
          <div
            key={pingId}
            className={clsx('cell--ping', {
              active,
              inactive: !active,
            })}
            style={{
              borderColor: color,
              zIndex: Math.min(2 + pings.length - i, 9),
            }}
          />
        ))}
      </div>
    );
  }

  handleFlipClick: React.MouseEventHandler<SVGElement> = (e) => {
    e.stopPropagation();
    const {onFlipColor} = this.props;
    if (onFlipColor) onFlipColor(this.props.r, this.props.c);
  };

  handleFlipKeyDown: React.KeyboardEventHandler<SVGElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
      const {onFlipColor} = this.props;
      if (onFlipColor) onFlipColor(this.props.r, this.props.c);
    }
  };

  renderFlipButton() {
    const {canFlipColor} = this.props;
    if (canFlipColor) {
      return (
        <FaNoteSticky
          className="cell--flip"
          role="button"
          tabIndex={0}
          onClick={this.handleFlipClick}
          onKeyDown={this.handleFlipKeyDown}
        />
      );
    }
    return null;
  }

  renderCircle() {
    const {circled} = this.props;
    if (circled) {
      return <div className="cell--circle" />;
    }
    return null;
  }

  renderShade() {
    const {shaded} = this.props;
    if (shaded) {
      const style = typeof shaded === 'string' ? {backgroundColor: shaded} : undefined;
      return <div className="cell--shade" style={style} />;
    }
    return null;
  }

  renderImage() {
    // Black cells still use a child element for images since they
    // don't go through getStyle(). Non-black cell images are rendered
    // as CSS background-image in getStyle() to avoid bleed from
    // border-collapse on the parent table.
    const {image} = this.props;
    if (image) {
      return <img src={image} alt="" className="cell--image--bg" draggable={false} />;
    }
    return null;
  }

  renderSolvedBy() {
    if (!this.props.solvedBy) return null;
    const divStyle: React.CSSProperties = {
      width: this.props.solvedByIconSize! * 2,
      height: this.props.solvedByIconSize! * 2,
      borderRadius: this.props.solvedByIconSize!,
      backgroundColor: this.props.solvedBy?.teamId === 1 ? '#FA8072' : 'purple',
      // transform: 'translateX(-0.5px)',
      position: 'absolute',
      right: 1,
    };
    return <div style={divStyle} />;
  }

  getStyle(): React.CSSProperties {
    const {attributionColor, cellStyle, selected, highlighted, frozen, image} = this.props;
    let style: React.CSSProperties;
    if (selected) {
      style = cellStyle.selected;
    } else if (highlighted) {
      style = frozen ? cellStyle.frozen : cellStyle.highlighted;
    } else {
      style = {backgroundColor: attributionColor};
    }
    if (image) {
      style = {
        ...style,
        backgroundImage: `url("${image}")`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      };
    }
    return style;
  }

  handleClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    this.props.onClick(this.props.r, this.props.c);
  };

  handleRightClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    this.props.onContextMenu(this.props.r, this.props.c);
  };

  handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.props.onClick(this.props.r, this.props.c);
    }
  };

  render() {
    const {
      black,
      isHidden,
      selected,
      highlighted,
      shaded,
      bad,
      good,
      revealed,
      pencil,
      value,
      myColor,
      number,
      referenced,
      frozen,
    } = this.props;
    if (black || isHidden) {
      const blackStyle: React.CSSProperties = {
        ...(selected ? {borderColor: myColor} : {}),
        ...(black && typeof shaded === 'string' ? {backgroundColor: shaded} : {}),
      };
      return (
        <div
          className={clsx('cell', {
            selected,
            black,
            hidden: isHidden,
          })}
          style={blackStyle}
          role="button"
          tabIndex={0}
          onClick={this.handleClick}
          onKeyDown={this.handleKeyDown}
          onContextMenu={this.handleRightClick}
        >
          {black && this.renderImage()}
          {this.renderPings()}
        </div>
      );
    }

    const val = value || '';

    const l = Math.max(1, val.length);

    const cursorNames = this.props.cursors.map((cursor) => cursor.displayName).filter(Boolean);
    const otherWordNames = (this.props.otherSelections || [])
      .filter((s) => !s.isActiveSquare)
      .map((s) => s.displayName)
      .filter(Boolean);
    const tooltipParts: string[] = [];
    if (cursorNames.length > 0) tooltipParts.push(`Cursor: ${cursorNames.join(', ')}`);
    if (otherWordNames.length > 0) tooltipParts.push(`Selecting: ${otherWordNames.join(', ')}`);
    const displayNames = tooltipParts.length > 0 ? tooltipParts.join(' | ') : undefined;

    const style = this.getStyle();

    return (
      <div
        title={displayNames}
        className={clsx('cell', {
          selected,
          highlighted,
          referenced,
          shaded,
          bad,
          good,
          revealed,
          pencil,
          frozen,
        })}
        style={style}
        role="button"
        tabIndex={0}
        onClick={this.handleClick}
        onKeyDown={this.handleKeyDown}
        onContextMenu={this.handleRightClick}
      >
        <div className="cell--wrapper">
          {this.renderOtherSelection()}
          <div
            className={clsx('cell--number', {
              nonempty: !!number,
            })}
          >
            {number}
          </div>
          {this.renderFlipButton()}
          {this.renderCircle()}
          {this.renderShade()}
          {this.renderSolvedBy()}
          {!this.props.isImage && (
            <div
              className="cell--value"
              style={{
                fontSize: `${350 / Math.sqrt(l)}%`,
                lineHeight: `${Math.sqrt(l) * 98}%`,
              }}
            >
              {val}
            </div>
          )}
        </div>
        {this.renderCursors()}
        {this.renderPings()}
      </div>
    );
  }
}
