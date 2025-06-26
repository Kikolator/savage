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
                child: Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Welcome to Savage Invite!',
                        style: Theme.of(context).textTheme.titleLarge,
                        textAlign: TextAlign.center,
                      ),
                      Text(
                        'Invite your friends to join Savage Coworking and earn up to 100% of your friends subscription plan as a discount or cashback.',
                        style: Theme.of(context).textTheme.bodyMedium,
                        textAlign: TextAlign.center,
                      ),
                      Text(
                        'Press the button below to get started.',
                        style: Theme.of(context).textTheme.bodyMedium,
                        textAlign: TextAlign.center,
                      ),
                      verticalSpaceMedium,
                      ElevatedButton(
                          onPressed: viewModel.signUp,
                          child: const Text('Sign Up')),
                      verticalSpaceSmall,
                      if (viewModel.modelError != null) ...[
                        Text(
                          viewModel.modelError,
                          style: Theme.of(context)
                              .textTheme
                              .bodyLarge
                              ?.copyWith(
                                  color: Theme.of(context).colorScheme.error),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ],
                  ),
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
