"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

const COLOURS = [
  "#ea5b47", "#f2a64b", "#f7d34a", "#9bc95a", "#3bbca8", "#4b92e2",
  "#7765d8", "#b669cb", "#e05e96", "#8a6a53", "#68778b", "#26394f",
];

type Team = { id: number; name: string; colour: string };
type TimerMode = "up" | "down";

function Icon({ name }: { name: string }) {
  return <i className={`fa-solid ${name}`} aria-hidden="true" />;
}

function formatTime(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export default function Home() {
  const [teams, setTeams] = useState<Team[]>([
    { id: 1, name: "Team 1", colour: COLOURS[0] },
    { id: 2, name: "Team 2", colour: COLOURS[5] },
    { id: 3, name: "Team 3", colour: COLOURS[3] },
    { id: 4, name: "Team 4", colour: COLOURS[6] },
  ]);
  const [claims, setClaims] = useState<Record<number, number>>({});
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(1);
  const [tileAction, setTileAction] = useState<"assign" | "reset">("assign");
  const [isUpdatingTile, setIsUpdatingTile] = useState(false);
  const [mode, setMode] = useState<TimerMode>("up");
  const [duration, setDuration] = useState(300);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [smartboard, setSmartboard] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [teamsHidden, setTeamsHidden] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnNumber, setDrawnNumber] = useState<number | null>(null);
  const [drawFromAllSquares, setDrawFromAllSquares] = useState(false);
  const [timerPosition, setTimerPosition] = useState({ x: 0, y: 0 });
  const [drawPosition, setDrawPosition] = useState({ x: 0, y: 0 });
  const [gridSize, setGridSize] = useState<number | null>(null);
  const [gridTextScale, setGridTextScale] = useState(100);
  const drag = useRef<{ kind: "timer" | "draw"; x: number; y: number; startX: number; startY: number } | null>(null);

  const remainingSquares = 100 - Object.keys(claims).length;
  const displaySeconds = mode === "down" ? duration - seconds : seconds;
  const drawnTeam = drawnNumber ? teams.find((team) => team.id === claims[drawnNumber]) : undefined;
  const winner = useMemo(() => {
    if (!Object.keys(claims).length) return null;
    const scores = teams.map((team) => ({ team, count: Object.values(claims).filter((id) => id === team.id).length }));
    return scores.sort((a, b) => b.count - a.count)[0];
  }, [claims, teams]);

  useEffect(() => {
    if (!running) return;
    if (mode === "down" && seconds >= duration) {
      setRunning(false);
      setFinishOpen(true);
      return;
    }
    const interval = window.setInterval(() => setSeconds((time) => time + 1), 1000);
    return () => window.clearInterval(interval);
  }, [running, mode, seconds, duration]);

  useEffect(() => {
    if (!smartboard) {
      setGridSize(null);
      return;
    }

    const fitGridToViewport = () => {
      const compact = window.innerWidth <= 760;
      const sideSpace = compact ? 28 : teamsHidden ? 100 : 380;
      const topSpace = headerHidden ? 91 : 155;
      setGridSize(Math.max(260, Math.floor(Math.min(window.innerHeight - topSpace, window.innerWidth - sideSpace))));
    };

    fitGridToViewport();
    window.addEventListener("resize", fitGridToViewport);
    document.addEventListener("fullscreenchange", fitGridToViewport);
    return () => {
      window.removeEventListener("resize", fitGridToViewport);
      document.removeEventListener("fullscreenchange", fitGridToViewport);
    };
  }, [smartboard, headerHidden, teamsHidden]);

  function openClaim(square: number) {
    setSelectedSquare(square);
    if (claims[square]) {
      setTileAction("reset");
      setSelectedTeam(claims[square]);
    } else {
      setTileAction("assign");
      setSelectedTeam(teams[0]?.id ?? null);
    }
  }

  function confirmClaim() {
    if (selectedSquare === null || selectedTeam === null) return;
    setIsUpdatingTile(true);
    window.setTimeout(() => {
      setClaims((current) => ({ ...current, [selectedSquare]: selectedTeam }));
      setIsUpdatingTile(false);
      setSelectedSquare(null);
    }, 280);
  }

  function resetClaim() {
    if (selectedSquare === null) return;
    setIsUpdatingTile(true);
    window.setTimeout(() => {
      setClaims((current) => {
        const next = { ...current };
        delete next[selectedSquare];
        return next;
      });
      setIsUpdatingTile(false);
      setSelectedSquare(null);
    }, 280);
  }

  function resetTimer() {
    setRunning(false);
    setSeconds(0);
  }

  function addTeam() {
    if (teams.length >= 12) return;
    const next = teams.length + 1;
    setTeams((current) => [...current, { id: Date.now(), name: `Team ${next}`, colour: COLOURS[current.length] }]);
  }

  function updateTeam(id: number, key: "name" | "colour", value: string) {
    setTeams((current) => current.map((team) => team.id === id ? { ...team, [key]: value } : team));
  }

  function removeTeam(id: number) {
    if (teams.length <= 1) return;
    setTeams((current) => current.filter((team) => team.id !== id));
    setClaims((current) => Object.fromEntries(Object.entries(current).filter(([, teamId]) => teamId !== id)));
  }

  function drawSquare() {
    setIsDrawing(true);
    setDrawnNumber(null);
    const claimedSquares = Object.keys(claims).map(Number);
    const eligibleSquares = drawFromAllSquares || !claimedSquares.length
      ? Array.from({ length: 100 }, (_, index) => index + 1)
      : claimedSquares;
    const pickEligibleSquare = () => eligibleSquares[Math.floor(Math.random() * eligibleSquares.length)];
    let frame = 0;
    const animation = window.setInterval(() => {
      setDrawnNumber(pickEligibleSquare());
      frame += 1;
      if (frame === 14) {
        window.clearInterval(animation);
        const entropy = new Uint32Array(1);
        window.crypto.getRandomValues(entropy);
        setDrawnNumber(eligibleSquares[entropy[0] % eligibleSquares.length]);
        setIsDrawing(false);
      }
    }, 75);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Some managed smartboards disable browser fullscreen; the dedicated view still works.
    }
  }

  function toggleSmartboardMode() {
    if (!smartboard) {
      setTimerPosition({ x: Math.max(18, window.innerWidth - 258), y: 82 });
      setDrawPosition({ x: Math.max(18, window.innerWidth - 262), y: 326 });
      setHeaderHidden(false);
      setTeamsHidden(false);
    }
    setSmartboard((value) => !value);
  }

  function beginDrag(kind: "timer" | "draw", event: React.PointerEvent<HTMLButtonElement>) {
    const current = kind === "timer" ? timerPosition : drawPosition;
    drag.current = { kind, x: current.x, y: current.y, startX: event.clientX, startY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    const { kind, x, y, startX, startY } = drag.current;
    const popout = event.currentTarget.closest(".draggable-popout");
    const maxX = Math.max(8, window.innerWidth - (popout?.clientWidth ?? 0) - 8);
    const maxY = Math.max(72, window.innerHeight - (popout?.clientHeight ?? 0) - 8);
    const position = {
      x: Math.min(maxX, Math.max(8, x + event.clientX - startX)),
      y: Math.min(maxY, Math.max(72, y + event.clientY - startY)),
    };
    if (kind === "timer") setTimerPosition(position);
    else setDrawPosition(position);
  }

  function endDrag(event: React.PointerEvent<HTMLButtonElement>) {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function submitDuration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetTimer();
    setSettingsOpen(false);
  }

  return (
    <main className={` ${smartboard ? "smartboard" : ""}${headerHidden ? " header-hidden" : ""}${teamsHidden ? " teams-hidden" : ""}`}>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">100</span><span>Hundred Squares</span></div>
        <div className="top-actions">
          <button className="view-button" onClick={toggleSmartboardMode} aria-pressed={smartboard}>{smartboard ? "Exit smartboard" : "Smartboard view"} <Icon name="fa-table-cells-large" /></button>
          <button className="text-button" onClick={() => setSettingsOpen(true)}>Game settings <Icon name="fa-gear" /></button>
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">CLASSROOM GAMEBOARD</p>
          <h1>Claim your square.</h1>
          <p className="subtitle">Choose a team, tap an open square, and watch your class build the board together.</p>
        </div>
        <aside className="timer-card" aria-label="Game timer">
          <div className="timer-head"><span className="pulse" /> GAME TIMER <button onClick={resetTimer} aria-label="Reset timer"><Icon name="fa-arrow-rotate-left" /></button></div>
          <div className="timer-value">{formatTime(displaySeconds)}</div>
          <div className="timer-controls">
            <button className="icon-button" onClick={resetTimer} aria-label="Reset timer"><Icon name="fa-arrow-rotate-left" /></button>
            <button className="play-button" onClick={() => setRunning((value) => !value)}><Icon name={running ? "fa-pause" : "fa-play"} /> {running ? "Pause" : "Start"}</button>
          </div>
          <button className="timer-type" onClick={() => { setMode(mode === "up" ? "down" : "up"); resetTimer(); }}>
            {mode === "up" ? "Counting up" : `Countdown · ${formatTime(duration)}`} <Icon name="fa-chevron-down" />
          </button>
        </aside>
      </section>

      <section className="game-layout">
        <aside className="team-panel">
          <div className="section-heading"><div><p className="eyebrow">PLAYERS</p><h2>Teams</h2></div><span>{teams.length} / 12</span></div>
          <div className="team-list">
            {teams.map((team) => {
              const score = Object.values(claims).filter((id) => id === team.id).length;
              return <div className="team-row" key={team.id}><span className="team-dot" style={{ background: team.colour }} /><span>{team.name}</span><strong>{score}</strong></div>;
            })}
          </div>
          <button className="outline-button" onClick={() => setSettingsOpen(true)}>Manage teams</button>
          <div className="leader-note"><Icon name="fa-star" /><p>{winner ? <><b>{winner.team.name}</b> is in the lead with {winner.count}.</> : <>The board is waiting.<br />Who will be first?</>}</p></div>
        </aside>

        <section className="board-area">
          <div className="board-header"><div><p className="eyebrow">{smartboard ? "SMARTBOARD MODE" : "THE BOARD"}</p><h2>100 squares <span>· {remainingSquares} open</span></h2></div><div className="board-actions">{smartboard && <button className="fullscreen-button" onClick={toggleFullscreen}><Icon name="fa-expand" /> Full screen</button>}<p>Tap an open square to assign it</p>{!smartboard && <button className="draw-button" onClick={() => { setRunning(false); setFinishOpen(true); }}>Finish &amp; draw <Icon name="fa-wand-magic-sparkles" /></button>}</div></div>
          <div className="grid" style={{ ...(smartboard && gridSize ? { width: gridSize } : {}), "--grid-text-scale": gridTextScale / 100 } as React.CSSProperties} aria-label="100 square game board">
            {Array.from({ length: 100 }, (_, index) => {
              const square = index + 1;
              const team = teams.find((item) => item.id === claims[square]);
              return <button key={square} onClick={() => openClaim(square)} className={`square ${team ? "claimed" : ""}`} style={team ? { background: team.colour } : undefined} aria-label={team ? `Square ${square}, ${team.name}` : `Claim square ${square}`}>
                <span>{square}</span>{team && <em>{team.name.replace("Team ", "T")}</em>}
              </button>;
            })}
          </div>
        </section>
      </section>

      {smartboard && <>
        <aside className="draggable-popout timer-popout" style={{ left: timerPosition.x, top: timerPosition.y }}>
          <div className="popout-bar"><button className="drag-handle" onPointerDown={(event) => beginDrag("timer", event)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} aria-label="Drag timer panel"><Icon name="fa-grip-lines" /> Move timer</button></div>
          <div className="timer-card" aria-label="Game timer">
            <div className="timer-head"><span className="pulse" /> GAME TIMER <button onClick={resetTimer} aria-label="Reset timer"><Icon name="fa-arrow-rotate-left" /></button></div>
            <div className="timer-value">{formatTime(displaySeconds)}</div>
            <div className="timer-controls"><button className="icon-button" onClick={resetTimer} aria-label="Reset timer"><Icon name="fa-arrow-rotate-left" /></button><button className="play-button" onClick={() => setRunning((value) => !value)}><Icon name={running ? "fa-pause" : "fa-play"} /> {running ? "Pause" : "Start"}</button></div>
            <button className="timer-type" onClick={() => { setMode(mode === "up" ? "down" : "up"); resetTimer(); }}>{mode === "up" ? "Counting up" : `Countdown · ${formatTime(duration)}`} <Icon name="fa-chevron-down" /></button>
          </div>
        </aside>
        <aside className="draggable-popout draw-popout" style={{ left: drawPosition.x, top: drawPosition.y }}>
          <div className="popout-bar"><button className="drag-handle" onPointerDown={(event) => beginDrag("draw", event)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} aria-label="Drag random draw control"><Icon name="fa-grip-lines" /> Move draw</button></div>
          <div><p>LUCKY SQUARE</p><button onClick={() => { setRunning(false); setFinishOpen(true); }}>Finish &amp; draw <Icon name="fa-wand-magic-sparkles" /></button><div className="view-toggles"><button onClick={() => setHeaderHidden((value) => !value)} aria-pressed={headerHidden}>{headerHidden ? "Show header" : "Hide header"}</button><button onClick={() => setTeamsHidden((value) => !value)} aria-pressed={teamsHidden}>{teamsHidden ? "Show teams" : "Hide teams"}</button></div></div>
        </aside>
      </>}

      {selectedSquare !== null && <div className="modal-backdrop" role="presentation" onMouseDown={() => !isUpdatingTile && setSelectedSquare(null)}>
        <section className="claim-modal" role="dialog" aria-modal="true" aria-labelledby="claim-title" onMouseDown={(event) => event.stopPropagation()}>
          <button className="close" onClick={() => setSelectedSquare(null)} disabled={isUpdatingTile} aria-label="Close"><Icon name="fa-xmark" /></button>
          <p className="eyebrow">SQUARE {selectedSquare}</p><h2 id="claim-title">{tileAction === "reset" ? "Reset this tile?" : "Who claimed this square?"}</h2>
          {tileAction === "reset" ? <p><b>{teams.find((team) => team.id === selectedTeam)?.name ?? "A team"}</b> currently owns this square. Resetting makes it available again.</p> : <><p>Choose a team, then confirm their colourful claim.</p><div className="team-picker">{teams.map((team) => <button key={team.id} onClick={() => setSelectedTeam(team.id)} className={selectedTeam === team.id ? "selected" : ""} style={{ "--team-colour": team.colour } as React.CSSProperties}><span style={{ background: team.colour }} />{team.name}<b>{selectedTeam === team.id && <Icon name="fa-check" />}</b></button>)}</div></>}
          <div className="modal-actions"><button className="cancel" onClick={() => setSelectedSquare(null)} disabled={isUpdatingTile}>{tileAction === "reset" ? "Keep tile" : "Cancel"}</button>{tileAction === "reset" ? <button className="reset-tile" onClick={resetClaim} disabled={isUpdatingTile}>{isUpdatingTile ? <><i className="button-spinner" />Resetting…</> : <>Reset tile <Icon name="fa-arrow-rotate-left" /></>}</button> : <button className="confirm" onClick={confirmClaim} disabled={selectedTeam === null || isUpdatingTile}>{isUpdatingTile ? <><i className="button-spinner" />Claiming…</> : <>Confirm claim <Icon name="fa-arrow-right" /></>}</button>}</div>
        </section>
      </div>}

      {settingsOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setSettingsOpen(false)}>
        <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
          <button className="close" onClick={() => setSettingsOpen(false)} aria-label="Close"><Icon name="fa-xmark" /></button>
          <p className="eyebrow">CUSTOMISE YOUR GAME</p><h2 id="settings-title">Game settings</h2>
          <div className="settings-block"><div className="settings-label"><span>Teams</span><small>Up to 12 teams</small></div>{teams.map((team) => <div className="team-editor" key={team.id}><input type="color" value={team.colour} onChange={(e) => updateTeam(team.id, "colour", e.target.value)} aria-label={`${team.name} colour`} /><input value={team.name} maxLength={14} onChange={(e) => updateTeam(team.id, "name", e.target.value)} aria-label="Team name" /><button onClick={() => removeTeam(team.id)} disabled={teams.length === 1} aria-label={`Remove ${team.name}`}><Icon name="fa-trash" /></button></div>)}<button className="add-team" onClick={addTeam} disabled={teams.length === 12}><Icon name="fa-plus" /> Add a team</button></div>
          <form className="settings-block timer-settings" onSubmit={submitDuration}><div className="settings-label"><span>Timer</span><small>Choose your pacing</small></div><div className="mode-buttons"><button type="button" className={mode === "up" ? "active" : ""} onClick={() => { setMode("up"); resetTimer(); }}>Count up</button><button type="button" className={mode === "down" ? "active" : ""} onClick={() => { setMode("down"); resetTimer(); }}>Count down</button></div>{mode === "down" && <label className="duration">Duration (minutes)<input type="number" min="1" max="180" value={Math.ceil(duration / 60)} onChange={(event) => setDuration(Math.max(60, Number(event.target.value) * 60 || 60))} /></label>}<button className="save-settings" type="submit">Save timer settings</button></form>
          <div className="settings-block grid-text-settings"><div className="settings-label"><span>Grid text size</span><small>{gridTextScale}%</small></div><p>Adjust the number and team text inside every square.</p><div className="text-size-control"><span>A</span><input type="range" min="80" max="150" step="5" value={gridTextScale} onChange={(event) => setGridTextScale(Number(event.target.value))} aria-label="Grid text size" /><strong>A</strong></div></div>
        </section>
      </div>}

      {finishOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => !isDrawing && setFinishOpen(false)}>
        <section className="draw-modal" role="dialog" aria-modal="true" aria-labelledby="draw-title" onMouseDown={(event) => event.stopPropagation()}>
          <button className="close" onClick={() => !isDrawing && setFinishOpen(false)} disabled={isDrawing} aria-label="Close"><Icon name="fa-xmark" /></button>
          <p className="eyebrow">{mode === "down" && seconds >= duration ? "TIME'S UP" : "FINISH THE GAME"}</p>
          <h2 id="draw-title">Draw a lucky square</h2>
          <p>{drawFromAllSquares ? "Any square can be drawn, whether it is claimed or not." : Object.keys(claims).length ? "Draw a claimed square to reveal the winning team." : "Claim a square first, or draw a random number from 1 to 100."}</p>
          <label className="draw-randomness-toggle"><input type="checkbox" checked={drawFromAllSquares} onChange={(event) => { setDrawFromAllSquares(event.target.checked); setDrawnNumber(null); }} disabled={isDrawing} /><span aria-hidden="true" /><span><b>Any square</b><small>Draw from all 100 squares</small></span></label>
          <div className={`number-orb ${isDrawing ? "drawing" : ""}`} aria-live="polite" aria-label={drawnNumber ? `Drawn number ${drawnNumber}` : "Ready to draw"}>
            <span>{drawnNumber ?? "?"}</span>{isDrawing && <i className="tiny-spinner" />}
          </div>
          {drawnNumber && !isDrawing && <p className="draw-result">{drawnTeam ? <><b>{drawnTeam.name}</b> wins with square <b>{drawnNumber}</b>!</> : <>Square <b>{drawnNumber}</b> is the draw.</>}</p>}
          <button className="draw-now" onClick={drawSquare} disabled={isDrawing}>{isDrawing ? <><i className="button-spinner" />Drawing…</> : drawnNumber ? "Draw again" : "Draw a number"}</button>
          {drawnNumber && !isDrawing && !drawnTeam && <button className="assign-drawn" onClick={() => { setFinishOpen(false); openClaim(drawnNumber); }}>Assign this square to a team <Icon name="fa-arrow-right" /></button>}
        </section>
      </div>}
    </main>
  );
}
