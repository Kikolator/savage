import 'package:cloud_functions/cloud_functions.dart';
import 'package:referral/app/app.locator.dart';
import 'package:referral/app/app.logger.dart';
import 'package:referral/app/app.router.dart';
import 'package:referral/services/context_service.dart';
import 'package:referral/services/referral_service.dart';
import 'package:stacked/stacked.dart';
import 'package:stacked_services/stacked_services.dart';

class SignUpViewModel extends BaseViewModel {
  final _logger = getLogger('SignUpViewModel');
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
    _contextService.getReferralContext();
    _memberId = _contextService.memberId;
    _companyId = _contextService.companyId;
    _token = _contextService.token;

    if (_memberId == null || _companyId == null || _token == null) {
      throw Exception('Invalid member id, company id or token');
    }
  }

  void signUp() async {
    setBusy(true);
    try {
      if (_memberId == null || _companyId == null || _token == null) {
        throw Exception('Invalid member id, company id or token');
      }
      final referralCode = await _referralService.createReferralCode(
        _memberId!,
        _companyId,
        _token!,
      );
      await _routerService
          .replaceWith(HomeViewRoute(referralCode: referralCode));
    } catch (e) {
      // TODO add error handlers
      // case already exists, case invalid argument, case user referral is not enabled, case unknown error

      _logger.d('error type: ${e.runtimeType}');
      _logger.d(
          'e is FirebaseFunctionsException: ${e is FirebaseFunctionsException}');
      if (e is FirebaseFunctionsException) {
        if (e.code == 'already-exists') {
          setError('Referral code already exists. Contact support.');
        } else if (e.code == 'permission-denied') {
          setError(
              'You do not have permission to create a referral code. Contact support.');
        } else {
          setError('Error creating referral code. Contact support.');
        }
      } else {
        setError('Error creating referral code. Contact support.');
      }
    } finally {
      setBusy(false);
    }
  }
}
