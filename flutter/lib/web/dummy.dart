import 'package:uuid/uuid.dart';

Future<void> webselectFiles(
    {required UuidValue sessionId, required bool is_folder}) async {
  throw UnimplementedError("webselectFiles");
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
  throw UnimplementedError("webSendLocalFiles");
}

Future<void> webSendFolderUpload(
    {required UuidValue sessionId,
    required int actId,
    required String to,
    required bool includeHidden}) {
  throw UnimplementedError("webSendFolderUpload");
}
