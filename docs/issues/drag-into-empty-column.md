# Dragging a card into an empty column sometimes does nothing

|            |                                                        |
| ---------- | ------------------------------------------------------ |
| Status     | Open. Cause not established.                           |
| Found      | 3 October 2026, in an automated browser test           |
| Area       | `apps/web`, the task board (`src/features/board/`)     |
| Seen by a person? | Not yet. So far only the automated test has hit it. |

## Symptom

A card is dragged from one column and dropped on another, empty column. The card stays where it was. Nothing is shown to the user and nothing is logged in the browser console.

## What was observed

The test drove headless Microsoft Edge with `playwright-core`: one browser context, two tabs open on the same board, viewport 1280×800. Tasks were served by the mock (`VITE_MOCK_TASKS=true`).

State of the board when the failing drag ran:

- To do: `Beta`, `Alpha edited` (just reordered by an earlier drag)
- In progress: `Gamma`
- Done: empty

The failing step dragged `Beta` from To do and dropped it at the centre of the Done column, in the first tab (the second tab had been opened after it). The test then waited 5 seconds for `Beta` to show up in Done, and it did not.

Six full runs of the two-tab test:

| Run | Board code                                   | Pause before each drag | Result |
| --- | -------------------------------------------- | ---------------------- | ------ |
| 1   | default drop animation                       | none                   | pass   |
| 2   | `dropAnimation={null}`                       | none                   | fail   |
| 3   | `dropAnimation={null}`                       | 400 ms                 | pass   |
| 4   | `dropAnimation={null}`                       | 400 ms                 | fail   |
| 5   | `dropAnimation={null}`                       | 400 ms                 | pass   |
| 6   | after the code was simplified (same day)     | 400 ms                 | fail   |

Run 6 was the only full run after the board's data code was simplified, so it is not known whether that change made the failure more or less frequent. Every other step of run 6 passed.

In all three failing runs:

- the drag before it (a reorder inside To do) and the drag after it (a card dropped onto `Gamma` in In progress) worked
- there were no console errors and no page errors
- `Beta` was not in In progress either, so it most likely stayed in To do. This is inferred from the next step's check; the To do column was not inspected at the moment of failure.

A separate single-tab test repeated the same kind of drag 14 times, alternating To do → Done and Done → To do, and all 14 worked. A temporary log in `handleDragEnd` showed the drop target was the expected column every time. That test differed from the failing one in several ways, listed below.

## What is not known

- What dnd-kit reported as the drop target in a failing drop. The run that would have logged it was stopped before it caught a failure.
- Whether it can happen to a person dragging in a normal, focused browser window.
- Whether `dropAnimation={null}` plays a part. Only one run was made before that change, so it cannot be ruled out.

## Differences between the failing test and the passing one

Any of these could be the trigger:

| | Failing (two tabs) | Passing (single tab, 14 of 14) |
| --- | --- | --- |
| Tabs open on the board | 2 | 1 |
| Card in In progress, on the pointer's path | yes (`Gamma`) | no |
| Drop point | centre of the empty column | near the bottom edge of the column |
| Drag just before it | a reorder inside the same column | a drag between columns |

## A guess, not verified

Browsers slow down timers in tabs that are not in the foreground. If the first tab was in the background after the second one opened, dnd-kit may not have finished measuring the drop targets by the time the mouse was released, leaving no drop target. That would make this a problem of the test, not of the app.

One observation speaks against it, without settling it. In one later run the dragging tab logged `document.visibilityState` as `visible` and `document.hasFocus()` as `true` at the start of all three drags. That run was cut off before it printed which steps had failed, so it is not known whether the drop failed in it.

## How to pick this up

1. **Try it by hand first.** Run `npm run dev`, open a board in one normal browser window, and drag a card into an empty column 20 times. If it never fails, the test is the more likely culprit.
2. **Log the drop.** In `handleDragEnd` in `apps/web/src/features/board/Board.tsx`, log `active.id`, `over?.id` and `over?.data.current`, then reproduce:
   - `over` is `null` or not the column: the problem is in finding the drop target. Look at `collisionDetection` in the same file (`pointerWithin`, falling back to `closestCorners`).
   - `over` is the right column but the card does not move: look at `resolveDrop` in `position.ts`, then at `useUpdateTask` in `queries.ts` (it writes the change into the cached list, sends it, and reloads the list when the request finishes).
3. **Test the guess.** In the automated test, call `page.bringToFront()` on the tab before each drag. If the failures stop, it was the background tab.

How the test performed a drag, in case it needs to be rebuilt: mouse down on the centre of the card, move 8 px to pass the 5 px activation distance, move to the target in 25 steps, wait 150 ms, mouse up.

The test scripts were kept in a temporary folder and are not in the repository.
