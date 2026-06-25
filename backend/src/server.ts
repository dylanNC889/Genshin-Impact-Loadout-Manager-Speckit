import { buildApp } from "./app";

const port = Number(process.env.PORT ?? 3000);
const app = buildApp();

app
  .listen({ port, host: "0.0.0.0" })
  .then((address) => {
    console.log(`Genshin loadout API listening on ${address}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
