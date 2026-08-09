// ignore_for_file: avoid_web_libraries_in_flutter

import 'dart:convert';
import 'dart:js_interop';
import 'dart:typed_data';
import 'dart:js';
import 'dart:html';
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hbb/models/state_model.dart';

import 'package:flutter_hbb/web/bridge.dart';
import 'package:flutter_hbb/common.dart';
import 'package:flutter_hbb/desktop/widgets/remote_toolbar.dart';
import 'package:flutter_hbb/desktop/pages/remote_page.dart' as desktop_remote;
import 'package:uuid/uuid.dart';

final List<StreamSubscription<MouseEvent>> mouseListeners = [];
final List<StreamSubscription<KeyboardEvent>> keyListeners = [];

typedef HandleEvent = Future<void> Function(Map<String, dynamic> evt);

class PlatformFFI {
  final _eventHandlers = <String, Map<String, HandleEvent>>{};
  final _sessionEventHandlers =
      <String, void Function(Map<String, dynamic>)>{};
  final _sessionRgbaHandlers =
      <String, void Function(int display, int width, int height, Uint8List data)>{};
  final RustdeskImpl _ffiBind = RustdeskImpl();
  final _navigatorReady = Completer<void>();

  static String getByName(String name, [String arg = '']) {
    return context.callMethod('getByName', [name, arg]);
  }

  static void setByName(String name, [String value = '']) {
    context.callMethod('setByName', [name, value]);
  }

  PlatformFFI._() {
    window.document.addEventListener(
        'visibilitychange',
        (event) => {
              stateGlobal.isWebVisible =
                  window.document.visibilityState == 'visible'
            });
  }

  static final PlatformFFI instance = PlatformFFI._();

  static get localeName => window.navigator.language;
  RustdeskImpl get ffiBind => _ffiBind;

  static Future<String> getVersion() async {
    throw UnimplementedError();
  }

  bool registerEventHandler(
      String eventName, String handlerName, HandleEvent handler) {
    var handlers = _eventHandlers[eventName];
    if (handlers == null) {
      _eventHandlers[eventName] = {handlerName: handler};
      return true;
    } else {
      if (handlers.containsKey(handlerName)) {
        return false;
      } else {
        handlers[handlerName] = handler;
        return true;
      }
    }
  }

  void unregisterEventHandler(String eventName, String handlerName) {
    var handlers = _eventHandlers[eventName];
    if (handlers != null) {
      handlers.remove(handlerName);
    }
  }

  Future<bool> tryHandle(Map<String, dynamic> evt) async {
    final name = evt['name'];
    if (name != null) {
      final handlers = _eventHandlers[name];
      if (handlers != null) {
        if (handlers.isNotEmpty) {
          for (var handler in handlers.values) {
            await handler(evt);
          }
          return true;
        }
      }
    }
    return false;
  }

  String translate(String name, String locale) =>
      _ffiBind.translate(name: name, locale: locale);

  Uint8List? getRgba(SessionID sessionId, int display, int bufSize) {
    throw UnimplementedError();
  }

  int getRgbaSize(SessionID sessionId, int display) =>
      _ffiBind.sessionGetRgbaSize(sessionId: sessionId, display: display);
  void nextRgba(SessionID sessionId, int display) =>
      _ffiBind.sessionNextRgba(sessionId: sessionId, display: display);
  void registerPixelbufferTexture(SessionID sessionId, int display, int ptr) =>
      _ffiBind.sessionRegisterPixelbufferTexture(
          sessionId: sessionId, display: display, ptr: ptr);
  void registerGpuTexture(SessionID sessionId, int display, int ptr) =>
      _ffiBind.sessionRegisterGpuTexture(
          sessionId: sessionId, display: display, ptr: ptr);

  Future<void> init(String appType) async {
    Completer completer = Completer();
    context["onInitFinished"] = () {
      completer.complete();
    };
    context.callMethod('init');
    version = getByName('version');
    window.onContextMenu.listen((event) {
      event.preventDefault();
    });

    context["onGlobalEvent"] = (String message) {
      try {
        Map<String, dynamic> event = json.decode(message);
        _dispatchGlobalEvent(event);
      } catch (e) {
        print('json.decode fail(): $e');
      }
    };

    context["onRgba"] = (String sessionId, int display, int width, int height,
        Uint8List? rgba) {
      if (rgba == null) return;
      final handler = _sessionRgbaHandlers[sessionId];
      handler?.call(display, width, height, rgba);
    };

    context['onRegisteredEvent'] = (String message) {
      try {
        Map<String, dynamic> event = json.decode(message);
        tryHandle(event);
      } catch (e) {
        print('json.decode fail(): $e');
      }
    };

    context['connect'] = (String id, String password, String session) async {
      if (!Uuid.isValidUUID(fromString: session)) return null;
      if (globalKey.currentState == null) {
        await _navigatorReady.future;
      }
      globalKey.currentState!.push(MaterialPageRoute(
        builder: (context) => desktop_remote.RemotePage(
          key: ValueKey(id),
          id: id,
          sessionId: UuidValue(session),
          toolbarState: ToolbarState(),
          password: password,
        ),
      ));
      stateGlobal.isInMainPage = false;
    };

    return completer.future;
  }

  void _dispatchGlobalEvent(Map<String, dynamic> event) {
    final sessionId = event['session_id']?.toString();
    if (sessionId != null && _sessionEventHandlers.containsKey(sessionId)) {
      _sessionEventHandlers[sessionId]!(event);
      return;
    }
    if (_sessionEventHandlers.length == 1) {
      _sessionEventHandlers.values.first(event);
    }
  }

  void registerSessionEventHandler(
      String sessionId, void Function(Map<String, dynamic>) handler) {
    _sessionEventHandlers[sessionId] = handler;
  }

  void unregisterSessionEventHandler(String sessionId) {
    _sessionEventHandlers.remove(sessionId);
  }

  void registerSessionRgbaHandler(String sessionId,
      void Function(int display, int width, int height, Uint8List data) handler) {
    _sessionRgbaHandlers[sessionId] = handler;
  }

  void unregisterSessionRgbaHandler(String sessionId) {
    _sessionRgbaHandlers.remove(sessionId);
  }

  void onNavigatorReady() {
    if (!_navigatorReady.isCompleted) _navigatorReady.complete();
  }

  void setEventCallback(void Function(Map<String, dynamic>) fun) {
    registerSessionEventHandler('legacy', fun);
  }

  void setRgbaCallback(void Function(int, int, int, Uint8List) fun) {
    registerSessionRgbaHandler('legacy', fun);
  }

  void startDesktopWebListener() {
    mouseListeners.add(
        window.document.onContextMenu.listen((evt) => evt.preventDefault()));
  }

  void stopDesktopWebListener() {
    for (var ml in mouseListeners) {
      ml.cancel();
    }
    mouseListeners.clear();
    for (var kl in keyListeners) {
      kl.cancel();
    }
    keyListeners.clear();
  }

  void setMethodCallHandler(FMethod callback) {}

  invokeMethod(String method, [dynamic arguments]) async {
    return true;
  }

  // just for compilation
  void syncAndroidServiceAppDirConfigPath() {}

  void setFullscreenCallback(void Function(bool) fun) {
    context["onFullscreenChanged"] = (bool v) {
      fun(v);
    };
  }
}
