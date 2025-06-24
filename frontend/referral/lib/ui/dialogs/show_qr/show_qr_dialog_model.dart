import 'package:share_plus/share_plus.dart';
import 'package:stacked/stacked.dart';

class ShowQrDialogModel extends BaseViewModel {
  void shareReferralCode(Uri uri) async {
    final params = ShareParams(
      text:
          '👋 Work next to me at Savage Coworking!\nUse this link to get started today and get a 10% discount on your first month \n➡️ $uri',
      subject: 'Join me at Savage Coworking 🌿',
      title: 'Savage Coworking',
    );
    final ShareResult status = await SharePlus.instance.share(params);
    if (status.status == ShareResultStatus.success) {
      // TODO add log to firestore.
    }
  }
}
