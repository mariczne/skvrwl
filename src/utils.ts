// export function getCurrentPOV(position: string) {
//   let initial: "white" | "black" = "white";
//   let movesCount = 0;

//   if (position.includes("startpos")) initial = "white";
//   if (position.includes("fen")) {
//     const [_, side] = position.match(/.+ ([w|b])/) || [];
//     if (side === "w") {
//       initial = "white";
//     } else {
//       initial = "black";
//     }
//   }

//   if (position.includes("moves")) {
//     const moves = position.match(/([a-z]\d[a-z]\d[a-z]?)/g) || [];
//     movesCount = moves.length;
//   }

//   return movesCount % 2 === 0 ? initial : initial === "black" ? "white" : "black";
// }

// export function getScoreFromPOV(whiteScore: number, pov: "white" | "black") {
//   if (pov === "white") return whiteScore;
//   return whiteScore * -1;
// }

export function Position(fen: string, ...moves: string[]) {
  let newPosition = fen;
  if (moves && !fen.includes("moves")) newPosition += " moves";
  for (const move of moves) {
    newPosition += ` ${move} `;
  }
  return newPosition;
}
