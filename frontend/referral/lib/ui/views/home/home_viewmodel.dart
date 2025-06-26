import 'package:referral/app/app.dialogs.dart';
import 'package:referral/app/app.locator.dart';
import 'package:referral/data/referral_code.dart';
import 'package:stacked/stacked.dart';
import 'package:stacked_services/stacked_services.dart';

class HomeViewModel extends BaseViewModel {
  final _dialogService = locator<DialogService>();

  late ReferralCode _referralCode;
  late Uri _referralCodeUri;
  ReferralCode get referralCode => _referralCode;

  void initialise(ReferralCode? referralCode) {
    try {
      setBusy(true);
      if (referralCode == null) {
        throw Exception('Referral code is null');
      }
      _referralCode = referralCode;
      _referralCodeUri =
          Uri.parse('https://savage-coworking.com/go/${_referralCode.code}');
    } catch (error) {
      setError(error.toString());
    } finally {
      setBusy(false);
    }
  }

  /// Opens a dialog to choose a sharing method.
  void shareReferralCode() async {
    await _dialogService.showCustomDialog(
        variant: DialogType.showQr, data: _referralCodeUri);
  }
}
