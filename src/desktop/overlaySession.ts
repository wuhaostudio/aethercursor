import type { CursorStatus } from "../cursor/stateMachine";

export interface OverlaySessionSnapshot {
  readonly hasContext: boolean;
  readonly hasResult: boolean;
  readonly hasPendingAction: boolean;
  readonly moreAgentsOpen: boolean;
  readonly nativeCapturePath: string | null;
  readonly nativeCapturePending: boolean;
}

export function shouldResetOverlaySession(status: CursorStatus, session: OverlaySessionSnapshot): boolean {
  if (status !== "normal") {
    return false;
  }

  return (
    session.hasContext ||
    session.hasResult ||
    session.hasPendingAction ||
    session.moreAgentsOpen ||
    session.nativeCapturePath !== null ||
    session.nativeCapturePending
  );
}
