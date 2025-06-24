// GENERATED CODE - DO NOT MODIFY BY HAND

// **************************************************************************
// StackedRouterGenerator
// **************************************************************************

// ignore_for_file: no_leading_underscores_for_library_prefixes
import 'package:flutter/material.dart' as _i7;
import 'package:stacked/stacked.dart' as _i6;
import 'package:stacked_services/stacked_services.dart' as _i5;

import '../data/referral_code.dart' as _i8;
import '../ui/views/home/home_view.dart' as _i2;
import '../ui/views/sign_up/sign_up_view.dart' as _i3;
import '../ui/views/startup/startup_view.dart' as _i1;
import '../ui/views/unknown/unknown_view.dart' as _i4;

final stackedRouter =
    StackedRouterWeb(navigatorKey: _i5.StackedService.navigatorKey);

class StackedRouterWeb extends _i6.RootStackRouter {
  StackedRouterWeb({_i7.GlobalKey<_i7.NavigatorState>? navigatorKey})
      : super(navigatorKey);

  @override
  final Map<String, _i6.PageFactory> pagesMap = {
    StartupViewRoute.name: (routeData) {
      return _i6.CustomPage<dynamic>(
        routeData: routeData,
        child: const _i1.StartupView(),
        opaque: true,
        barrierDismissible: false,
      );
    },
    HomeViewRoute.name: (routeData) {
      final args = routeData.argsAs<HomeViewArgs>();
      return _i6.CustomPage<dynamic>(
        routeData: routeData,
        child: _i2.HomeView(
          referralCode: args.referralCode,
          key: args.key,
        ),
        opaque: true,
        barrierDismissible: false,
      );
    },
    SignUpViewRoute.name: (routeData) {
      return _i6.CustomPage<dynamic>(
        routeData: routeData,
        child: const _i3.SignUpView(),
        opaque: true,
        barrierDismissible: false,
      );
    },
    UnknownViewRoute.name: (routeData) {
      return _i6.CustomPage<dynamic>(
        routeData: routeData,
        child: const _i4.UnknownView(),
        opaque: true,
        barrierDismissible: false,
      );
    },
  };

  @override
  List<_i6.RouteConfig> get routes => [
        _i6.RouteConfig(
          StartupViewRoute.name,
          path: '/',
        ),
        _i6.RouteConfig(
          HomeViewRoute.name,
          path: '/home-view',
        ),
        _i6.RouteConfig(
          SignUpViewRoute.name,
          path: '/sign-up-view',
        ),
        _i6.RouteConfig(
          UnknownViewRoute.name,
          path: '/404',
        ),
        _i6.RouteConfig(
          '*#redirect',
          path: '*',
          redirectTo: '/404',
          fullMatch: true,
        ),
      ];
}

/// generated route for
/// [_i1.StartupView]
class StartupViewRoute extends _i6.PageRouteInfo<void> {
  const StartupViewRoute()
      : super(
          StartupViewRoute.name,
          path: '/',
        );

  static const String name = 'StartupView';
}

/// generated route for
/// [_i2.HomeView]
class HomeViewRoute extends _i6.PageRouteInfo<HomeViewArgs> {
  HomeViewRoute({
    required _i8.ReferralCode referralCode,
    _i7.Key? key,
  }) : super(
          HomeViewRoute.name,
          path: '/home-view',
          args: HomeViewArgs(
            referralCode: referralCode,
            key: key,
          ),
        );

  static const String name = 'HomeView';
}

class HomeViewArgs {
  const HomeViewArgs({
    required this.referralCode,
    this.key,
  });

  final _i8.ReferralCode referralCode;

  final _i7.Key? key;

  @override
  String toString() {
    return 'HomeViewArgs{referralCode: $referralCode, key: $key}';
  }
}

/// generated route for
/// [_i3.SignUpView]
class SignUpViewRoute extends _i6.PageRouteInfo<void> {
  const SignUpViewRoute()
      : super(
          SignUpViewRoute.name,
          path: '/sign-up-view',
        );

  static const String name = 'SignUpView';
}

/// generated route for
/// [_i4.UnknownView]
class UnknownViewRoute extends _i6.PageRouteInfo<void> {
  const UnknownViewRoute()
      : super(
          UnknownViewRoute.name,
          path: '/404',
        );

  static const String name = 'UnknownView';
}

extension RouterStateExtension on _i5.RouterService {
  Future<dynamic> navigateToStartupView(
      {void Function(_i6.NavigationFailure)? onFailure}) async {
    return navigateTo(
      const StartupViewRoute(),
      onFailure: onFailure,
    );
  }

  Future<dynamic> navigateToHomeView({
    required _i8.ReferralCode referralCode,
    _i7.Key? key,
    void Function(_i6.NavigationFailure)? onFailure,
  }) async {
    return navigateTo(
      HomeViewRoute(
        referralCode: referralCode,
        key: key,
      ),
      onFailure: onFailure,
    );
  }

  Future<dynamic> navigateToSignUpView(
      {void Function(_i6.NavigationFailure)? onFailure}) async {
    return navigateTo(
      const SignUpViewRoute(),
      onFailure: onFailure,
    );
  }

  Future<dynamic> navigateToUnknownView(
      {void Function(_i6.NavigationFailure)? onFailure}) async {
    return navigateTo(
      const UnknownViewRoute(),
      onFailure: onFailure,
    );
  }

  Future<dynamic> replaceWithStartupView(
      {void Function(_i6.NavigationFailure)? onFailure}) async {
    return replaceWith(
      const StartupViewRoute(),
      onFailure: onFailure,
    );
  }

  Future<dynamic> replaceWithHomeView({
    required _i8.ReferralCode referralCode,
    _i7.Key? key,
    void Function(_i6.NavigationFailure)? onFailure,
  }) async {
    return replaceWith(
      HomeViewRoute(
        referralCode: referralCode,
        key: key,
      ),
      onFailure: onFailure,
    );
  }

  Future<dynamic> replaceWithSignUpView(
      {void Function(_i6.NavigationFailure)? onFailure}) async {
    return replaceWith(
      const SignUpViewRoute(),
      onFailure: onFailure,
    );
  }

  Future<dynamic> replaceWithUnknownView(
      {void Function(_i6.NavigationFailure)? onFailure}) async {
    return replaceWith(
      const UnknownViewRoute(),
      onFailure: onFailure,
    );
  }
}
