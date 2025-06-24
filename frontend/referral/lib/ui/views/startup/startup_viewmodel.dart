import 'package:referral/services/context_service.dart';
import 'package:referral/services/referral_service.dart';
import 'package:stacked/stacked.dart';
import 'package:referral/app/app.locator.dart';
import 'package:referral/app/app.router.dart';
import 'package:stacked_services/stacked_services.dart';

class StartupViewModel extends BaseViewModel {
  final _routerService = locator<RouterService>();
  final _referralService = locator<ReferralService>();
  final _contextService = locator<ContextService>();

  // Place anything here that needs to happen before we get into the application
  Future runStartupLogic() async {
    try {
      // This is where you can make decisions on where your app should navigate when
      // you have custom startup logic
      final refCtx = _contextService.getReferralContext();

      // Query firestore for referral code ownerId and companyId.
      final referralCode = await _referralService.getReferralCode(
        refCtx.memberId!,
        refCtx.companyId,
      );
      // If does not exist, redirect to SignUpView.
      if (referralCode == null) {
        await _routerService.replaceWith(const SignUpViewRoute());
        return;
      } else {
        // Else redierct to HomeView.
        await _routerService
            .replaceWith(HomeViewRoute(referralCode: referralCode));
      }
    } catch (e) {
      setError(e.toString());
    }
  }
}
