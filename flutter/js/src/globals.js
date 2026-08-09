/**
 * Thin entry surface for the Flutter web viewer bridge.
 * Side-effect imports wire bridge handlers and init.
 */
import "./helpers/mobile.js";

window.curConn = undefined;

import "./bridge/flutter_bridge.js";
import "./bridge/init.js";
