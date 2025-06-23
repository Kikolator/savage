import 'package:flutter/material.dart';
import 'package:responsive_builder/responsive_builder.dart';
import 'package:stacked/stacked.dart';

import 'sign_up_view.desktop.dart';
import 'sign_up_view.tablet.dart';
import 'sign_up_view.mobile.dart';
import 'sign_up_viewmodel.dart';

class SignUpView extends StackedView<SignUpViewModel> {
  const SignUpView({super.key});

  @override
  Widget builder(
    BuildContext context,
    SignUpViewModel viewModel,
    Widget? child,
  ) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextButton(
                onPressed: viewModel.signUp, child: const Text('Sign Up')),
            Text('Member ID: ${viewModel.memberId}'),
            Text('Company ID: ${viewModel.companyId}'),
            Text('Token: ${viewModel.token}'),
            if (viewModel.modelError != null) ...[
              Text('Error: ${viewModel.modelError}'),
            ]
          ],
        ),
      ),
    );
    // return ScreenTypeLayout.builder(
    //   mobile: (_) => const SignUpViewMobile(),
    //   tablet: (_) => const SignUpViewTablet(),
    //   desktop: (_) => const SignUpViewDesktop(),
    // );
  }

  @override
  void onViewModelReady(SignUpViewModel viewModel) {
    viewModel.initialise();
  }

  @override
  SignUpViewModel viewModelBuilder(
    BuildContext context,
  ) =>
      SignUpViewModel();
}
