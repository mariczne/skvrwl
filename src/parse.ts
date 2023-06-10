import { number, ord } from "fp-ts";
import { Either, left, right, toUnion } from "fp-ts/Either";
import { Option, none, some, match, fromNullable, isSome, compact, Some, toNullable } from "fp-ts/Option";
import { pipe } from "fp-ts/function";
import { filter, reduce, sort, map } from "fp-ts/Array";
import { head } from "fp-ts/NonEmptyArray";

type PV = {
  move: string;
  multipv: number;
};

export type CpScorePV = PV & { cp: number };
export type MateScorePV = PV & { mate: number };

export type MoveScore = Either<CpScorePV, MateScorePV>; // is Either the best way?

export function parseScoreLine(line: string): Option<MoveScore> {
  return pipe(
    fromNullable(line.match(/^.+multipv (\d+) score (?:cp|mate) (-?\d+).+pv ([a-z]\d[a-z]\d[a-z]?)/)),
    match(
      () => none,
      (matches) =>
        head(matches).includes("mate")
          ? some(
              right({
                move: matches[3],
                multipv: Number(matches[1]),
                mate: Number(matches[2]),
              })
            )
          : some(
              left({
                move: matches[3],
                multipv: Number(matches[1]),
                cp: Number(matches[2]),
              })
            )
    )
  );
}

export function parseScore(output: string, finalDepth: number) {
  return pipe(
    output.split("\n"),
    filter((line) => line.startsWith(`info depth ${finalDepth}`)),
    reduce([] as MoveScore[], (total, line) =>
      pipe(
        parseScoreLine(line),
        match(
          () => total,
          (parsed) => [...total, parsed]
        )
      )
    ),
    sort(
      pipe(
        number.Ord,
        ord.contramap((moveScore: MoveScore) => toUnion(moveScore).multipv)
      )
    )
  );
}

type MovePolicy = { move: string; policy: number };

export function parsePolicy(output: string) {
  return pipe(
    output.split("\n"),
    filter((line) => line.startsWith("info string") && !line.startsWith("info string node")),
    map((line) =>
      pipe(
        fromNullable(line.match(/^info string ([a-z]\d[a-z]\d[a-z]?).+P: ( ?\d?\d?\d.\d\d?)/)),
        match(
          () => none,
          (matches) =>
            some({
              move: matches[1],
              policy: Number(matches[2]),
            })
        )
      )
    ),
    filter(isSome),
    map(item => item.value), // Is this really the best way?
    sort(
      pipe(
        number.Ord,
        ord.contramap((movePolicy: MovePolicy) => movePolicy.policy)
      )
    )
  );
}
