import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();
const port = process.env.PORT ?? 3000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
