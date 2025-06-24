import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:referral/firebase_options.dart';
import 'package:referral/services/cloud_function_service.dart';
import 'package:referral/services/firestore_service.dart';
import 'package:responsive_builder/responsive_builder.dart';
import 'package:referral/app/app.bottomsheets.dart';
import 'package:referral/app/app.dialogs.dart';
import 'package:referral/app/app.locator.dart';
import 'package:referral/app/app.router.dart';
import 'package:url_strategy/url_strategy.dart';
import 'package:flutter_animate/flutter_animate.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  setPathUrlStrategy();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  await FirestoreService.initialize();
  await CloudFunctionService.initialize();
  await setupLocator(stackedRouter: stackedRouter);
  setupDialogUi();
  setupBottomSheetUi();
  runApp(const MainApp());
}

class MainApp extends StatelessWidget {
  const MainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveApp(
      builder: (_) => MaterialApp.router(
        routerDelegate: stackedRouter.delegate(),
        routeInformationParser: stackedRouter.defaultRouteParser(),
        theme: ThemeData.from(
            colorScheme:
                ColorScheme.fromSeed(seedColor: const Color(0xFF406835))),
      ),
    ).animate().fadeIn(
          delay: const Duration(milliseconds: 50),
          duration: const Duration(milliseconds: 400),
        );
  }
}
