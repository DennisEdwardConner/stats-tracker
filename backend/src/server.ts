import "dotenv/config";
import { app } from "./app.js";

app.listen(3000, () => console.log("listening on 3000"));