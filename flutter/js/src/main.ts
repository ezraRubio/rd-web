import "./globals";
import "./styles.css";
import { init } from "./app";
import { loadCustomConfig } from "./config";
import { initZstd } from "./common";
import { loadVp9 } from "./codec";

async function bootstrap() {
  await loadCustomConfig();
  loadVp9(() => {});
  await initZstd();
  init();
}

bootstrap();
