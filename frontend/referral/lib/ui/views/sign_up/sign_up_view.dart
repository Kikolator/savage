import 'package:flutter/material.dart';
import 'package:referral/ui/common/ui_helpers.dart';
import 'package:stacked/stacked.dart';
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
        child: viewModel.isBusy
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Welcome to Savage Invite!'),
                    Text('Press the button below to sign up'),
                    verticalSpaceMedium,
                    TextButton(
                        onPressed: viewModel.signUp,
                        child: const Text('Sign Up')),
                    verticalSpaceSmall,
                    if (viewModel.modelError != null) ...[
                      Text('Error: ${viewModel.modelError}',
                          style: Theme.of(context)
                              .textTheme
                              .bodyLarge
                              ?.copyWith(
                                  color: Theme.of(context).colorScheme.error)),
                    ],
                    // TODO remove this
                  ],
                ),
              ),
      ),
    );
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
