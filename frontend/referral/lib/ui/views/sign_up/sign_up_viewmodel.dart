import 'package:referral/app/app.locator.dart';
import 'package:referral/app/app.router.dart';
import 'package:referral/services/context_service.dart';
import 'package:referral/services/referral_service.dart';
import 'package:stacked/stacked.dart';
import 'package:stacked_services/stacked_services.dart';

class SignUpViewModel extends BaseViewModel {
  final _routerService = locator<RouterService>();
  final _contextService = locator<ContextService>();
  final _referralService = locator<ReferralService>();

  String? _memberId;
  String? _companyId;
  String? _token;

  String? get memberId => _memberId;
  String? get companyId => _companyId;
  String? get token => _token;

  initialise() {
    _memberId = _contextService.memberId;
    _companyId = _contextService.companyId;
    _token = _contextService.token;
  }

  void signUp() async {
    setBusy(true);
    try {
      final referralCode = await _referralService.createReferralCode(
        _memberId!,
        _companyId,
        _token!,
      );
      await _routerService.replaceWith(const HomeViewRoute());
    } catch (e) {
      // TODO add error handlers
      // case already exists, case invalid argument, case unknown error
      setError(e);
    } finally {
      setBusy(false);
    }
  }
}
