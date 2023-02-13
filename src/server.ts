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
