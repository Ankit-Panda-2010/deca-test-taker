export function canRevealAnswer(mode: "practice" | "exam", attemptSubmitted: boolean, responseChecked: boolean) {
  return attemptSubmitted || (mode === "practice" && responseChecked);
}

export function canChangeAnswer(mode: "practice" | "exam", attemptSubmitted: boolean, responseChecked: boolean) {
  if (attemptSubmitted) return false;
  return mode === "exam" || !responseChecked;
}
