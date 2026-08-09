import 'dart:async';
import 'dart:convert';
import 'dart:js' as js;

import 'package:uuid/uuid.dart';

Future<void> webselectFiles(
    {required UuidValue sessionId, required bool is_folder}) async {
  return Future(() => js.context.callMethod('setByName', [
        'select_files',
        is_folder.toString(),
        sessionId.toString(),
      ]));
}

Future<void> webSendLocalFiles(
    {required UuidValue sessionId,
    required int handleIndex,
    required int actId,
    required String path,
    required String to,
    required int fileNum,
    required bool includeHidden,
    required bool isRemote}) {
  return Future(() => js.context.callMethod('setByName', [
        'send_local_files',
        jsonEncode({
          'id': actId,
          'handle_index': handleIndex,
          'path': path,
          'to': to,
          'file_num': fileNum,
          'include_hidden': includeHidden,
          'is_remote': isRemote,
        }),
        sessionId.toString(),
      ]));
}

Future<void> webSendFolderUpload(
    {required UuidValue sessionId,
    required int actId,
    required String to,
    required bool includeHidden}) {
  return Future(() => js.context.callMethod('setByName', [
        'send_folder_upload',
        jsonEncode({
          'id': actId,
          'to': to,
          'include_hidden': includeHidden,
        }),
        sessionId.toString(),
      ]));
}
