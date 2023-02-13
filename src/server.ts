import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import path from "path";

const app = express();

app.use(cors());

const skurwiel = spawn(path.resolve("skurwiel"));

skurwiel.stdout.on("data", (data) => {
  console.log(`${data}`);
});

skurwiel.stderr.on("data", (data) => {
  console.log(`${data}`);
});

skurwiel.stdin.write("position startpos moves e4 e5 Nf3 Nc6 d4 d6 Bc4 Bg4 dxe5 dxe5 O-O Qxd1 Rxd1 Bxf3 gxf3 Nd4 Nc3 O-O-O Nd5 Nxc2 Rb1 Nb4 f4 exf4 Bxf4 Bd6 Bxd6 Rxd6 Nxb4 f6 f4 Rxd1+ Rxd1 Ne7 Be6+ Kb8 Rd7 Re8 Bf7 Rf8 Rxe7\n");
skurwiel.stdin.write("go\n");

app.get("/", (request, response) => {
  console.log(request.query);
  
  if (request.query.move) {

    console.log(request.query.move);
    skurwiel.stdin.write("#" + request.query.move + "\n");
  }

  // if (request.query.fen) {
  //   console.log(request.query.fen);
  //   skurwiel.stdin.write("position fen " + request.query.fen + "\n");
  //   skurwiel.stdin.write("go\n");
  // }

  response.send("ok");
});

app.listen(7777, () => {
  console.log("Listening on the port 7777...");
});
