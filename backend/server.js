import { createApp } from "./app.js";
const port = Number(process.env.PORT || 3000);
createApp().listen(port, () =>
  console.log(
    `Service Station: http://localhost:${port} (demo works without MySQL)`,
  ),
);
