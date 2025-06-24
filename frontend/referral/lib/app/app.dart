import 'package:referral/ui/bottom_sheets/notice/notice_sheet.dart';
import 'package:referral/ui/dialogs/info_alert/info_alert_dialog.dart';
import 'package:referral/ui/views/home/home_view.dart';
import 'package:referral/ui/views/startup/startup_view.dart';
import 'package:referral/ui/views/unknown/unknown_view.dart';
import 'package:stacked/stacked_annotations.dart';
import 'package:stacked_services/stacked_services.dart';
import 'package:referral/services/referral_service.dart';
import 'package:referral/services/firestore_service.dart';
import 'package:referral/ui/views/sign_up/sign_up_view.dart';
import 'package:referral/services/context_service.dart';
import 'package:referral/services/cloud_function_service.dart';
import 'package:referral/ui/dialogs/show_qr/show_qr_dialog.dart';
// @stacked-import

@StackedApp(
  routes: [
    CustomRoute(page: StartupView, initial: true),
    CustomRoute(page: HomeView),

    CustomRoute(page: SignUpView),
// @stacked-route
    CustomRoute(page: UnknownView, path: '/404'),

    /// When none of the above routes match, redirect to UnknownView
    RedirectRoute(path: '*', redirectTo: '/404'),
  ],
  dependencies: [
    LazySingleton(classType: BottomSheetService),
    LazySingleton(classType: DialogService),
    LazySingleton(classType: RouterService),
    LazySingleton(classType: ReferralService),
    LazySingleton(
        classType: FirestoreService,
        resolveUsing: FirestoreService.getInstance),
    LazySingleton(classType: ContextService),
    LazySingleton(
        classType: CloudFunctionService,
        resolveUsing: CloudFunctionService.getInstance),
// @stacked-service
  ],
  bottomsheets: [
    StackedBottomsheet(classType: NoticeSheet),
// @stacked-bottom-sheet
  ],
  dialogs: [
    StackedDialog(classType: InfoAlertDialog),
    StackedDialog(classType: ShowQrDialog),
// @stacked-dialog
  ],
  logger: StackedLogger(),
)
class App {}